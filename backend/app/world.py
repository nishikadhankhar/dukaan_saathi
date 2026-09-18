"""Synthetic merchant world for Dukaan Saathi.

A deterministic fake neighbourhood in Delhi: shops, customers and 90 days of
UPI payments. Every number the prototype shows is computed from these tables --
nothing in the demo is hard-coded.

Planted scenarios (so the detectors have something real to find):
  * Sharma Kirana Store  -- 74 regular customers stopped coming ~3.5 weeks ago,
                            18 of them now pay at a rival that opened 200m away
  * Glow Unisex Salon    -- weekday afternoons are far quieter than nearby salons
  * Raju Tea Point       -- average bill well below other tea stalls
"""
from __future__ import annotations

import datetime as dt
import os
from dataclasses import dataclass

import numpy as np
import pandas as pd

SEED = 20260919
DAYS = 90                    # day 0 = oldest, day DAYS-1 = today
N_CUSTOMERS = 6000
AREA_KM = 3.0

# Demo day is pinned so the numbers on stage match rehearsal and the Figma
# screens. DEMO_DATE=today makes the world follow the real calendar instead.
DEMO_DATE = dt.date(2026, 9, 19)


def demo_today() -> dt.date:
    v = os.environ.get("DEMO_DATE", "").strip()
    if v == "today":
        return dt.date.today()
    return dt.date.fromisoformat(v) if v else DEMO_DATE


FESTIVAL_NAME = "Navratri"
FESTIVAL_DATE = dt.date(2026, 10, 11)   # Sharad Navratri 2026 begins

# Hero merchants
SHARMA = "M001"   # kirana -- the main demo merchant
GUPTA = "M002"    # kirana -- rival that opened recently, 200m away
GLOW = "M022"   # salon  -- dead weekday afternoons (first salon in NAMES)
RAJU = "M014"   # chai   -- small average bill (first chai stall in NAMES)

GUPTA_OPENS_DAY = 65          # 24 days before "today"
CHURN_FROM_DAY = 66           # planted regulars stop coming after this
N_LAPSED = 74                 # exact, by construction
N_DRIFTED = 18                # of those, this many moved to the rival

CAT = {
    "kirana": dict(
        participation=0.95, visits_per_week=1.35,
        ticket_median=185.0, ticket_sigma=0.62, round_to=1,
        hours=[0, 0, 0, 0, 0, 0, 0, 2, 5, 7, 7, 6, 4, 3, 3, 3, 4, 6, 9, 10, 8, 5, 2, 0],
        weekday=[1.00, 1.00, 1.00, 1.00, 1.05, 1.15, 1.10],
        payday=1.18, gross_margin=0.18, festival_uplift=0.35,
    ),
    "chai": dict(
        participation=0.38, visits_per_week=2.40,
        ticket_median=38.0, ticket_sigma=0.45, round_to=5,
        hours=[0, 0, 0, 0, 0, 0, 3, 8, 10, 8, 5, 4, 4, 3, 3, 4, 7, 9, 8, 6, 4, 2, 0, 0],
        weekday=[1.05, 1.05, 1.05, 1.05, 1.10, 0.95, 0.85],
        payday=1.02, gross_margin=0.45, festival_uplift=0.15,
    ),
    "salon": dict(
        participation=0.34, visits_per_week=0.25,
        ticket_median=320.0, ticket_sigma=0.55, round_to=10,
        hours=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 6, 5, 5, 5, 6, 8, 10, 9, 6, 3, 0, 0],
        weekday=[0.80, 0.35, 0.90, 1.00, 1.20, 1.60, 1.50],   # Tuesdays mostly shut
        payday=1.10, gross_margin=0.55, festival_uplift=0.50,
    ),
    "pharmacy": dict(
        participation=0.55, visits_per_week=0.50,
        ticket_median=240.0, ticket_sigma=0.70, round_to=1,
        hours=[0, 0, 0, 0, 0, 0, 0, 0, 3, 6, 7, 6, 5, 4, 4, 4, 5, 6, 8, 8, 7, 5, 3, 0],
        weekday=[1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 0.95],
        payday=1.05, gross_margin=0.20, festival_uplift=0.05,
    ),
}

NAMES = {
    "kirana": ["Sharma Kirana Store", "Gupta General Store", "Verma Provision Store",
               "Singh Kirana", "Annapurna Store", "Jain General Store",
               "Nav Bharat Kirana", "Krishna Provision", "Lakshmi Kirana",
               "Modern Store", "Shiv Kirana", "Balaji Provision", "Sai General Store"],
    "chai": ["Raju Tea Point", "Sharma Tea Stall", "Chai Adda", "Bansal Tea Corner",
             "Gulshan Chai", "Tea Junction", "Pappu Tea Stall", "Amrit Chai"],
    "salon": ["Glow Unisex Salon", "Style Point", "Hair Craft", "New Look Salon",
              "Blush Beauty", "Trim and Trend", "Urban Cuts"],
    "pharmacy": ["Apollo Chemist", "City Medicos", "LifeCare Pharmacy",
                 "Health Plus", "Guru Medical Store", "Wellness Chemist"],
}

FIXED_POS = {SHARMA: (1.50, 1.50), GUPTA: (1.68, 1.42), GLOW: (0.92, 2.08), RAJU: (2.18, 0.86)}


@dataclass
class World:
    merchants: pd.DataFrame
    customers: pd.DataFrame
    tx: pd.DataFrame
    today: dt.date
    seed: int

    def day_date(self, day: int) -> dt.date:
        return self.today - dt.timedelta(days=int(DAYS - 1 - day))

    @property
    def festival_days_away(self) -> int:
        return (FESTIVAL_DATE - self.today).days


def _merchants(rng: np.random.Generator) -> pd.DataFrame:
    rows, n = [], 0
    for cat, names in NAMES.items():
        for name in names:
            n += 1
            mid = f"M{n:03d}"
            x, y = FIXED_POS.get(mid, (float(rng.uniform(0.2, AREA_KM - 0.2)),
                                       float(rng.uniform(0.2, AREA_KM - 0.2))))
            rows.append(dict(merchant_id=mid, name=name, category=cat, x=x, y=y,
                             opened_day=GUPTA_OPENS_DAY if mid == GUPTA else 0,
                             language="hi"))
    return pd.DataFrame(rows).set_index("merchant_id", drop=False)


def _customers(rng: np.random.Generator) -> pd.DataFrame:
    n = N_CUSTOMERS
    return pd.DataFrame(dict(
        customer_id=[f"C{i:05d}" for i in range(n)],
        x=rng.uniform(0, AREA_KM, n),
        y=rng.uniform(0, AREA_KM, n),
        activity=rng.lognormal(0.0, 0.45, n),
        spend=rng.lognormal(0.0, 0.28, n),
    )).set_index("customer_id", drop=False)


def _day_weights(cat: str, today: dt.date) -> np.ndarray:
    c = CAT[cat]
    w = np.empty(DAYS)
    for d in range(DAYS):
        date = today - dt.timedelta(days=DAYS - 1 - d)
        w[d] = c["weekday"][date.weekday()]
        if date.day <= 5:
            w[d] *= c["payday"]
    return w / w.sum()


def _pick_merchants(rng, cat, merchants, customers):
    """Each customer gets a favourite shop and a backup, weighted by distance."""
    sub = merchants[(merchants.category == cat) & (merchants.opened_day == 0)]
    mx, my = sub.x.to_numpy(), sub.y.to_numpy()
    d = np.sqrt((customers.x.to_numpy()[:, None] - mx[None, :]) ** 2
                + (customers.y.to_numpy()[:, None] - my[None, :]) ** 2)
    logw = -d / 0.45
    primary = np.argmax(logw + rng.gumbel(size=logw.shape), axis=1)
    blocked = logw.copy()
    blocked[np.arange(len(customers)), primary] = -1e9
    secondary = np.argmax(blocked + rng.gumbel(size=logw.shape), axis=1)
    ids = sub.merchant_id.to_numpy()
    return ids[primary], ids[secondary], d, ids


def _category_tx(rng, cat, merchants, customers, today):
    c = CAT[cat]
    n = len(customers)
    uses = rng.random(n) < c["participation"]
    primary, secondary, dist, ids = _pick_merchants(rng, cat, merchants, customers)

    lam = c["visits_per_week"] / 7.0 * customers.activity.to_numpy() * uses
    counts = rng.poisson(lam * DAYS)
    total = int(counts.sum())
    idx = np.repeat(np.arange(n), counts)

    day = rng.choice(DAYS, size=total, p=_day_weights(cat, today))
    hours_p = np.array(c["hours"], dtype=float)
    hour = rng.choice(24, size=total, p=hours_p / hours_p.sum())
    minute = rng.integers(0, 60, total)

    merchant = np.where(rng.random(total) < 0.85, primary[idx], secondary[idx])
    amt = c["ticket_median"] * np.exp(c["ticket_sigma"] * rng.normal(size=total)) * customers.spend.to_numpy()[idx]
    amount = np.maximum(c["round_to"], (np.round(amt / c["round_to"]) * c["round_to"])).astype(int)

    frame = pd.DataFrame(dict(
        day=day.astype(np.int16), hour=hour.astype(np.int8), minute=minute.astype(np.int8),
        merchant_id=merchant, customer_id=customers.customer_id.to_numpy()[idx],
        amount=amount, category=cat,
    ))
    return frame, dict(primary=primary, secondary=secondary, dist=dist, ids=ids, uses=uses)


def _new_rows(rng, cat, cust_ids, merchant_id, day_lo, day_hi, customers, n_each):
    """Append visits for specific customers at one shop inside a day range."""
    c = CAT[cat]
    idx = np.repeat(np.arange(len(cust_ids)), n_each)
    total = len(idx)
    if total == 0:
        return pd.DataFrame(columns=["day", "hour", "minute", "merchant_id", "customer_id", "amount", "category"])
    hours_p = np.array(c["hours"], dtype=float)
    spend = customers.loc[list(cust_ids), "spend"].to_numpy()[idx]
    amt = c["ticket_median"] * np.exp(c["ticket_sigma"] * rng.normal(size=total)) * spend
    return pd.DataFrame(dict(
        day=rng.integers(day_lo, day_hi + 1, total).astype(np.int16),
        hour=rng.choice(24, size=total, p=hours_p / hours_p.sum()).astype(np.int8),
        minute=rng.integers(0, 60, total).astype(np.int8),
        merchant_id=merchant_id if isinstance(merchant_id, str) else np.asarray(merchant_id)[idx],
        customer_id=np.asarray(cust_ids)[idx],
        amount=np.maximum(c["round_to"], np.round(amt / c["round_to"]) * c["round_to"]).astype(int),
        category=cat,
    ))


def _plant(rng, tx, merchants, customers, choice, today):
    kir = choice["kirana"]
    cust_ids = customers.customer_id.to_numpy()

    # --- who counts as a Sharma regular (>=4 visits in the 60 days before the gap)
    s = tx[(tx.merchant_id == SHARMA) & (tx.day.between(9, 65))]
    visits = s.groupby("customer_id").size()
    regulars = visits[visits >= 4].index.to_numpy()

    # 18 who drift to the rival = the ones living nearest to it
    gx, gy = FIXED_POS[GUPTA]
    reg_pos = customers.loc[regulars]
    to_gupta = np.sqrt((reg_pos.x - gx) ** 2 + (reg_pos.y - gy) ** 2).to_numpy()
    drifted = regulars[np.argsort(to_gupta)[:N_DRIFTED]]
    rest = np.setdiff1d(regulars, drifted)
    others = rng.choice(rest, size=N_LAPSED - N_DRIFTED, replace=False)
    lapsed = np.concatenate([drifted, others])

    # --- they stop paying at Sharma
    tx = tx[~((tx.merchant_id == SHARMA) & (tx.customer_id.isin(lapsed)) & (tx.day >= CHURN_FROM_DAY))]

    span = DAYS - 1 - CHURN_FROM_DAY
    rate = CAT["kirana"]["visits_per_week"] / 7.0
    add = []

    # the 18 now shop at the rival (at least twice, so the pattern is detectable)
    n_each = np.maximum(2, rng.poisson(rate * span * customers.loc[drifted, "activity"].to_numpy()))
    add.append(_new_rows(rng, "kirana", drifted, GUPTA, CHURN_FROM_DAY, DAYS - 1, customers, n_each))

    # 20 quietly moved to their backup shop; the remaining 36 simply stopped
    moved = others[:20]
    backup = pd.Series(kir["secondary"], index=cust_ids).loc[moved].to_numpy()
    backup = np.where(backup == SHARMA, pd.Series(kir["primary"], index=cust_ids).loc[moved].to_numpy(), backup)
    n_each = np.maximum(1, rng.poisson(rate * span * customers.loc[moved, "activity"].to_numpy()))
    add.append(_new_rows(rng, "kirana", moved, backup, CHURN_FROM_DAY, DAYS - 1, customers, n_each))

    # the rival also wins normal customers who live closer to it
    gd = np.sqrt((customers.x - gx) ** 2 + (customers.y - gy) ** 2).to_numpy()
    prim = pd.Series(kir["primary"], index=cust_ids)
    pd_dist = np.array([kir["dist"][i, list(kir["ids"]).index(prim.iloc[i])] for i in range(len(cust_ids))])
    nearer = (gd < pd_dist) & ~np.isin(cust_ids, lapsed) & kir["uses"]
    switchers = cust_ids[nearer & (rng.random(len(cust_ids)) < 0.22)]
    mask = tx.customer_id.isin(switchers) & (tx.category == "kirana") & (tx.day >= GUPTA_OPENS_DAY)
    tx.loc[mask, "merchant_id"] = GUPTA

    tx = pd.concat([tx] + add, ignore_index=True)

    # --- make sure no OTHER Sharma regular looks lapsed: give them a recent visit
    #   (recompute on the post-churn data, using the detector's own window)
    s2 = tx[(tx.merchant_id == SHARMA) & (tx.day.between(9, 68))]
    v2 = s2.groupby("customer_id").size()
    regs_now = v2[v2 >= 4].index.to_numpy()
    recent = tx[(tx.merchant_id == SHARMA) & (tx.day >= 69)].customer_id.unique()
    stragglers = np.setdiff1d(np.setdiff1d(regs_now, lapsed), recent)
    if len(stragglers):
        tx = pd.concat([tx, _new_rows(rng, "kirana", stragglers, SHARMA, 69, DAYS - 1,
                                      customers, np.ones(len(stragglers), dtype=int))], ignore_index=True)

    # --- Glow salon: weekday afternoons go quiet
    wd = np.array([(today - dt.timedelta(days=DAYS - 1 - d)).weekday() for d in range(DAYS)])
    weekday_tx = wd[tx.day.to_numpy()] < 5
    dead = (tx.merchant_id == GLOW) & weekday_tx & tx.hour.between(14, 16)
    tx = tx[~(dead & (rng.random(len(tx)) < 0.8))]

    # --- Raju: tea only, no snacks, so bills are small
    r = tx.merchant_id == RAJU
    tx.loc[r, "amount"] = np.maximum(10, np.round(tx.loc[r, "amount"] * 0.53 / 5) * 5).astype(int)

    # the rival did not exist before it opened
    tx = tx[~((tx.merchant_id == GUPTA) & (tx.day < GUPTA_OPENS_DAY))]
    return tx.reset_index(drop=True)


def build_world(seed: int = SEED) -> World:
    rng = np.random.default_rng(seed)
    today = demo_today()
    merchants = _merchants(rng)
    customers = _customers(rng)

    frames, choice = [], {}
    for cat in CAT:
        f, ch = _category_tx(rng, cat, merchants, customers, today)
        frames.append(f)
        choice[cat] = ch
    tx = pd.concat(frames, ignore_index=True)
    tx = _plant(rng, tx, merchants, customers, choice, today)

    tx = tx.sort_values(["day", "hour", "minute"]).reset_index(drop=True)
    tx.insert(0, "txn_id", np.arange(1, len(tx) + 1))
    base = np.datetime64(today - dt.timedelta(days=DAYS - 1))
    tx["ts"] = (base + tx.day.to_numpy().astype("timedelta64[D]")
                + tx.hour.to_numpy().astype("timedelta64[h]")
                + tx.minute.to_numpy().astype("timedelta64[m]"))
    tx["weekday"] = pd.to_datetime(tx.ts).dt.weekday.astype(np.int8)

    # fail loudly if the name lists change and the hero ids drift
    for mid, expected in [(SHARMA, "Sharma Kirana Store"), (GUPTA, "Gupta General Store"),
                          (GLOW, "Glow Unisex Salon"), (RAJU, "Raju Tea Point")]:
        assert merchants.loc[mid, "name"] == expected, f"{mid} is {merchants.loc[mid, 'name']}, expected {expected}"
    return World(merchants=merchants, customers=customers, tx=tx, today=today, seed=seed)
