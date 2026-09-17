"""SENSE -- everything the system knows about one merchant, from payments alone.

Two rules hold throughout:
  * every headline number carries a provenance ref, so the UI can show the
    exact transactions behind it ("tap any number");
  * anything about other people's customers is returned as counts only, and
    only above K_ANON, never as identities.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .world import CAT, DAYS, World

COHORT_RADIUS_KM = 1.5     # "shops like yours, nearby"
K_ANON = 10                # never report a customer-movement pattern below this
REGULAR_MIN_VISITS = 4     # visits in the 60-day window before the gap
LAPSE_DAYS = 21            # no visit in this many days = lapsed
NEW_SHOP_DAYS = 45         # a competitor counts as "new" if younger than this


class Provenance:
    """Holds the rows behind each number so the UI can prove it."""

    def __init__(self) -> None:
        self._items: dict[str, dict] = {}
        self._n = 0

    def add(self, label: str, rows: pd.DataFrame, kind: str = "txn") -> str:
        self._n += 1
        ref = f"p{self._n}"
        self._items[ref] = {"label": label, "kind": kind, "count": int(len(rows)),
                            "sample": rows.head(50)}
        return ref

    def get(self, ref: str) -> dict | None:
        item = self._items.get(ref)
        if not item:
            return None
        s = item["sample"]
        if item["kind"] == "txn":
            rows = [{"txn_id": int(r.txn_id), "when": pd.Timestamp(r.ts).strftime("%d %b, %I:%M %p"),
                     "customer": _mask(r.customer_id), "amount": int(r.amount)}
                    for r in s.itertuples()]
        else:
            rows = [{"customer": _mask(r.customer_id), "visits": int(getattr(r, "visits", 0)),
                     "last_seen": f"{int(getattr(r, 'days_since', 0))} days ago",
                     "avg_bill": int(getattr(r, "avg_bill", 0))} for r in s.itertuples()]
        return {"ref": ref, "label": item["label"], "kind": item["kind"],
                "count": item["count"], "rows": rows}


def _mask(cid: str) -> str:
    return f"{cid[:3]}•••{cid[-2:]}"


def inr(n: float) -> str:
    """Indian digit grouping: 1,09,000 not 109,000."""
    n = int(round(n))
    s, sign = str(abs(n)), "-" if n < 0 else ""
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:]); head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts) + "," + tail
    return f"{sign}₹{s}"


@dataclass
class Merchant:
    """A merchant's slice of the world, with metrics computed lazily."""
    w: World
    mid: str
    prov: Provenance
    _tx: pd.DataFrame = field(init=False)

    def __post_init__(self) -> None:
        self._tx = self.w.tx[self.w.tx.merchant_id == self.mid]

    # ---------- basics ----------
    @property
    def row(self):
        return self.w.merchants.loc[self.mid]

    @property
    def category(self) -> str:
        return str(self.row.category)

    def day_gmv(self, day: int) -> int:
        return int(self._tx[self._tx.day == day].amount.sum())

    def summary(self) -> dict:
        t, y = DAYS - 1, DAYS - 2
        today_rows = self._tx[self._tx.day == t]
        last7 = self._tx[self._tx.day >= t - 6]
        prev7 = self._tx[self._tx.day.between(t - 13, t - 7)]
        m30 = self._tx[self._tx.day >= t - 29]
        counts = m30.groupby("customer_id").size()
        return {
            "name": str(self.row["name"]), "category": self.category,
            "today_gmv": int(today_rows.amount.sum()),
            "today_txns": int(len(today_rows)),
            "today_customers": int(today_rows.customer_id.nunique()),
            "yesterday_gmv": self.day_gmv(y),
            "change_pct": _pct(today_rows.amount.sum(), self.day_gmv(y)),
            "week_gmv": int(last7.amount.sum()),
            "week_change_pct": _pct(last7.amount.sum(), prev7.amount.sum()),
            "avg_bill": int(round(m30.amount.mean())) if len(m30) else 0,
            "repeat_rate": round(float((counts >= 2).mean()) * 100, 1) if len(counts) else 0.0,
            "today_ref": self.prov.add(f"Today's payments at {self.row['name']}", today_rows),
        }

    def daily_series(self, days: int = 30) -> list[dict]:
        lo = DAYS - days
        g = self._tx[self._tx.day >= lo].groupby("day").amount.sum()
        return [{"date": self.w.day_date(d).strftime("%d %b"), "day": int(d),
                 "gmv": int(g.get(d, 0))} for d in range(lo, DAYS)]

    # ---------- cohort: shops like yours, nearby ----------
    def cohort_ids(self) -> list[str]:
        m = self.w.merchants
        same = m[(m.category == self.category) & (m.merchant_id != self.mid)]
        d = np.sqrt((same.x - self.row.x) ** 2 + (same.y - self.row.y) ** 2)
        return same.merchant_id[d <= COHORT_RADIUS_KM].tolist()

    def cohort_repeat_rate(self) -> dict:
        t = DAYS - 1
        vals = []
        for mid in self.cohort_ids():
            sub = self.w.tx[(self.w.tx.merchant_id == mid) & (self.w.tx.day >= t - 29)]
            c = sub.groupby("customer_id").size()
            if len(c) >= 20:
                vals.append(float((c >= 2).mean()) * 100)
        return {"you": self.summary()["repeat_rate"],
                "cohort": round(float(np.median(vals)), 1) if vals else 0.0,
                "n_shops": len(vals)}

    # ---------- lapsed regulars ----------
    def lapsed_regulars(self) -> pd.DataFrame:
        t = DAYS - 1
        before = self._tx[self._tx.day.between(t - 80, t - LAPSE_DAYS)]
        visits = before.groupby("customer_id").agg(visits=("amount", "size"),
                                                   spend=("amount", "sum"),
                                                   avg_bill=("amount", "mean"),
                                                   last_day=("day", "max"))
        regulars = visits[visits.visits >= REGULAR_MIN_VISITS]
        recent = set(self._tx[self._tx.day > t - LAPSE_DAYS].customer_id)
        out = regulars[~regulars.index.isin(recent)].copy()
        out["customer_id"] = out.index
        out["days_since"] = t - out.last_day
        out["monthly_spend"] = out.spend / 60.0 * 30.0
        return out.sort_values("spend", ascending=False)

    def drift(self, lapsed: pd.DataFrame) -> dict | None:
        """Where did the lapsed regulars go? Counts only, and only above K_ANON."""
        t = DAYS - 1
        others = self.w.tx[(self.w.tx.customer_id.isin(lapsed.customer_id))
                           & (self.w.tx.category == self.category)
                           & (self.w.tx.merchant_id != self.mid)
                           & (self.w.tx.day > t - LAPSE_DAYS)]
        if others.empty:
            return None
        per = others.groupby(["merchant_id", "customer_id"]).size().reset_index(name="n")
        per = per[per.n >= 2]
        best, best_n = None, 0
        for mid, grp in per.groupby("merchant_id"):
            if len(grp) > best_n:
                best, best_n = mid, len(grp)
        if best is None or best_n < K_ANON:
            return None
        r = self.w.merchants.loc[best]
        first_day = int(self.w.tx[self.w.tx.merchant_id == best].day.min())
        age = DAYS - 1 - first_day
        dist_m = int(round(np.hypot(r.x - self.row.x, r.y - self.row.y) * 1000))
        return {"count": int(best_n), "distance_m": dist_m, "opened_days_ago": age,
                "is_new": age <= NEW_SHOP_DAYS, "merchant_id": best}

    # ---------- hourly shape ----------
    def hourly(self, weekdays_only: bool = True) -> dict:
        def share(df):
            d = df[df.weekday < 5] if weekdays_only else df
            tot = d.amount.sum()
            g = d.groupby("hour").amount.sum()
            return np.array([float(g.get(h, 0)) / tot * 100 if tot else 0.0 for h in range(24)])

        mine = share(self._tx)
        cohort = [share(self.w.tx[self.w.tx.merchant_id == mid]) for mid in self.cohort_ids()]
        theirs = np.median(np.vstack(cohort), axis=0) if cohort else np.zeros(24)
        return {"you": mine.round(1).tolist(), "cohort": theirs.round(1).tolist()}

    def ticket_stats(self) -> dict:
        t = DAYS - 1
        mine = self._tx[self._tx.day >= t - 29].amount
        med = []
        for mid in self.cohort_ids():
            sub = self.w.tx[(self.w.tx.merchant_id == mid) & (self.w.tx.day >= t - 29)].amount
            if len(sub) >= 50:
                med.append(float(sub.median()))
        return {"you": int(mine.median()) if len(mine) else 0,
                "cohort": int(np.median(med)) if med else 0,
                "cohort_p25": int(np.percentile(med, 25)) if med else 0,
                "n_shops": len(med)}

    def regulars(self) -> pd.DataFrame:
        t = DAYS - 1
        v = self._tx[self._tx.day >= t - 59].groupby("customer_id").agg(
            visits=("amount", "size"), avg_bill=("amount", "mean"))
        out = v[v.visits >= REGULAR_MIN_VISITS].copy()
        out["customer_id"] = out.index
        out["days_since"] = 0
        return out

    # ---------- money coming in ----------
    def forecast(self, horizon: int = 30) -> dict:
        """Weekday-seasonal baseline, plus the festival bump."""
        t = DAYS - 1
        recent = self._tx[self._tx.day >= t - 27]
        by_wd = recent.groupby("weekday").amount.sum() / 4.0
        daily = float(recent.amount.sum()) / 28.0
        days_away = self.w.festival_days_away
        uplift = CAT[self.category]["festival_uplift"]
        margin = CAT[self.category]["gross_margin"]
        festival_window = 10
        base_festival_gmv = daily * festival_window
        extra_gmv = base_festival_gmv * uplift
        extra_stock = extra_gmv * (1 - margin)
        weekly_margin = daily * 7 * margin
        return {"daily_gmv": int(daily), "weekly_gmv": int(daily * 7),
                "by_weekday": {int(k): int(v) for k, v in by_wd.items()},
                "days_to_festival": int(days_away), "uplift_pct": int(uplift * 100),
                "festival_window_days": festival_window,
                "extra_stock_needed": int(round(extra_stock / 500.0) * 500),
                "weekly_margin": int(weekly_margin), "margin_pct": int(margin * 100)}


def _pct(a, b) -> float:
    a, b = float(a), float(b)
    return round((a - b) / b * 100, 1) if b else 0.0
