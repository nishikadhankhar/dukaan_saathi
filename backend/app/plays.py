"""THINK -- the play library.

A play is a detector plus the action it unlocks. Detectors are plain Python
running on payment data; they decide IF something is worth telling the merchant
and compute every number. The model never invents a figure -- it only ranks,
explains and translates what is in `evidence`.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

from .sense import K_ANON, Merchant, inr
from .world import DAYS

# Stated assumptions -- shown in the UI so nothing is a black box.
ASSUMED_WINBACK_UPLIFT = 0.30     # share of lapsed regulars an offer brings back
ASSUMED_HAPPY_HOUR_UPLIFT = 0.07  # share of regulars who take an off-peak offer
ASSUMED_THRESHOLD_TAKEUP = 0.35   # share of visits that reach a spend threshold
CASH_GAP_MARGIN_WEEKS = 2.0       # stock cost above this many weeks of margin = gap


@dataclass
class Opportunity:
    play: str
    merchant_id: str
    score: float                      # expected incremental rupees
    evidence: dict                    # numbers only -- the model may use these and nothing else
    charts: dict = field(default_factory=dict)
    action: dict = field(default_factory=dict)
    detector: dict = field(default_factory=dict)
    provenance: dict = field(default_factory=dict)

    @property
    def id(self) -> str:
        return f"{self.merchant_id}:{self.play}"


def detect_all(m: Merchant) -> tuple[list[Opportunity], list[dict]]:
    """Run every detector. Returns the ones that fired, plus a log of all checks."""
    fired, log = [], []
    for fn in (_winback, _dead_hours, _low_ticket, _cash_gap):
        opp, check = fn(m)
        log.append(check)
        if opp is not None:
            fired.append(opp)
    fired.sort(key=lambda o: o.score, reverse=True)
    return fired, log


# --------------------------------------------------------------------------- #
def _winback(m: Merchant):
    lapsed = m.lapsed_regulars()
    n = len(lapsed)
    check = {"play": "winback", "label": "Regulars who stopped coming",
             "metric": "lapsed regulars", "value": n, "threshold": f">= {K_ANON}",
             "fired": n >= K_ANON}
    if not check["fired"]:
        return None, check

    drift = m.drift(lapsed)
    avg_bill = int(round(lapsed.avg_bill.mean()))
    monthly_at_risk = int(lapsed.monthly_spend.sum())
    weeks = int(round(float(lapsed.days_since.median()) / 7))
    visits_before = round(float(lapsed.visits.mean()) / 2.0, 1)   # 60-day window -> per month
    repeat = m.cohort_repeat_rate()

    # offer sized to the shop: ₹20 on ₹150 for a kirana, ₹5 on ₹30 for a chai stall
    min_bill = min(150, int(math.ceil(avg_bill * 1.25 / 10.0) * 10))
    cashback, valid_days = (20 if avg_bill >= 100 else 5), 7
    budget_cap = n * cashback
    # what they stand to recover: a share of the monthly spend now walking away
    est_return = int(ASSUMED_WINBACK_UPLIFT * monthly_at_risk)

    ev = {"lapsed_regulars": n, "weeks_since_last_visit": weeks,
          "visits_per_month_before": visits_before, "avg_bill": avg_bill,
          "monthly_value_at_risk": monthly_at_risk,
          "your_repeat_rate_pct": repeat["you"], "nearby_repeat_rate_pct": repeat["cohort"],
          "nearby_shops_compared": repeat["n_shops"],
          "cashback": cashback, "min_bill": min_bill, "valid_days": valid_days,
          "budget_cap": budget_cap, "est_extra_sales_month": est_return}
    if drift and drift["is_new"]:
        ev |= {"moved_to_new_shop": drift["count"], "new_shop_distance_m": drift["distance_m"],
               "new_shop_opened_days_ago": drift["opened_days_ago"]}

    # the cliff: visits from exactly these customers, week by week
    lap_ids = set(lapsed.customer_id)
    weekly = []
    for wk in range(12):
        lo, hi = DAYS - 1 - (11 - wk) * 7 - 6, DAYS - 1 - (11 - wk) * 7
        sub = m._tx[m._tx.day.between(max(lo, 0), hi)]
        weekly.append({"week": f"W{wk + 1}",
                       "everyone": int(sub.customer_id.nunique()),
                       "these_customers": int(sub[sub.customer_id.isin(lap_ids)].customer_id.nunique())})

    return Opportunity(
        play="winback", merchant_id=m.mid, score=est_return - budget_cap, evidence=ev,
        charts={"weekly_customers": weekly,
                "repeat_rate": [{"who": "You", "value": repeat["you"]},
                                {"who": "Nearby shops", "value": repeat["cohort"]}]},
        action={"kind": "campaign", "type": "winback",
                "audience": lapsed.customer_id.tolist(),
                "offer": {"cashback": cashback, "min_bill": min_bill, "valid_days": valid_days},
                "budget_cap": budget_cap},
        detector=check,
        provenance={"lapsed_regulars": m.prov.add(
            f"{n} regulars with no visit in the last 21 days", lapsed, kind="customer")},
    ), check


# --------------------------------------------------------------------------- #
def _dead_hours(m: Merchant):
    h = m.hourly(weekdays_only=True)
    you, cohort = np.array(h["you"]), np.array(h["cohort"])
    window = range(11, 19)
    gaps = [(hr, cohort[hr] - you[hr]) for hr in window if cohort[hr] >= 4 and you[hr] < cohort[hr] * 0.5]
    total_gap = round(float(sum(g for _, g in gaps)), 1)
    check = {"play": "dead_hours", "label": "Hours far quieter than nearby shops",
             "metric": "share gap vs nearby (pct pts)", "value": total_gap,
             "threshold": ">= 6.0", "fired": total_gap >= 6.0 and len(gaps) >= 2}
    if not check["fired"]:
        return None, check

    hrs = [hr for hr, _ in gaps]
    lo, hi = min(hrs), max(hrs) + 1
    fmt = lambda x: f"{x - 12} PM" if x > 12 else (f"{x} PM" if x == 12 else f"{x} AM")
    regs = m.regulars()
    weekly_gmv = m.forecast()["weekly_gmv"]
    potential = int(weekly_gmv * total_gap / 100.0)
    audience = len(regs)
    discount_pct, max_discount, valid_days = 20, 100, 14
    budget_cap = int(audience * ASSUMED_HAPPY_HOUR_UPLIFT * max_discount)
    est_return = int(ASSUMED_HAPPY_HOUR_UPLIFT * audience * m.ticket_stats()["you"])

    ev = {"quiet_from_hour": lo, "quiet_to_hour": hi,
          "your_share_pct": round(float(you[lo:hi].sum()), 1),
          "nearby_share_pct": round(float(cohort[lo:hi].sum()), 1),
          "nearby_shops_compared": len(m.cohort_ids()),
          "weekly_sales": weekly_gmv, "weekly_potential": potential,
          "regular_customers": audience, "discount_pct": discount_pct,
          "max_discount": max_discount, "valid_days": valid_days,
          "budget_cap": budget_cap, "est_extra_sales": est_return}

    return Opportunity(
        play="dead_hours", merchant_id=m.mid, score=est_return - budget_cap, evidence=ev,
        charts={"hourly": [{"hour": fmt(x) if x in (lo, hi - 1) else str(x),
                            "you": float(you[x]), "nearby": float(cohort[x])}
                           for x in range(8, 22)],
                "window": {"from": fmt(lo), "to": fmt(hi)}},
        action={"kind": "campaign", "type": "happy_hour", "audience": regs.customer_id.tolist(),
                "offer": {"discount_pct": discount_pct, "max_discount": max_discount,
                          "from_hour": lo, "to_hour": hi, "valid_days": valid_days},
                "budget_cap": budget_cap},
        detector=check,
        provenance={"your_share_pct": m.prov.add(
            f"Weekday payments between {fmt(lo)} and {fmt(hi)}",
            m._tx[(m._tx.weekday < 5) & (m._tx.hour.between(lo, hi - 1))])},
    ), check


# --------------------------------------------------------------------------- #
def _low_ticket(m: Merchant):
    t = m.ticket_stats()
    ratio = t["you"] / t["cohort"] if t["cohort"] else 1.0
    check = {"play": "low_ticket", "label": "Average bill below nearby shops",
             "metric": "your median bill vs nearby", "value": f'{inr(t["you"])} vs {inr(t["cohort"])}',
             "threshold": "< 70% of nearby", "fired": ratio < 0.7 and t["n_shops"] >= 2}
    if not check["fired"]:
        return None, check

    regs = m.regulars()
    audience = len(regs)
    spend_target = int(round(t["cohort"] / 5.0) * 5)
    cashback, valid_days = 5, 14
    budget_cap = int(audience * ASSUMED_THRESHOLD_TAKEUP * cashback * 2)
    est_return = int(ASSUMED_THRESHOLD_TAKEUP * audience * 2 * (spend_target - t["you"]))

    ev = {"your_median_bill": t["you"], "nearby_median_bill": t["cohort"],
          "nearby_shops_compared": t["n_shops"], "regular_customers": audience,
          "spend_target": spend_target, "cashback": cashback, "valid_days": valid_days,
          "budget_cap": budget_cap, "est_extra_sales": est_return}

    return Opportunity(
        play="low_ticket", merchant_id=m.mid, score=est_return - budget_cap, evidence=ev,
        charts={"ticket": [{"who": "You", "value": t["you"]},
                           {"who": "Nearby shops", "value": t["cohort"]}]},
        action={"kind": "campaign", "type": "threshold", "audience": regs.customer_id.tolist(),
                "offer": {"spend_target": spend_target, "cashback": cashback, "valid_days": valid_days},
                "budget_cap": budget_cap},
        detector=check,
        provenance={"your_median_bill": m.prov.add("Your last 30 days of payments",
                                                   m._tx[m._tx.day >= DAYS - 30])},
    ), check


# --------------------------------------------------------------------------- #
def price_loan(amount: int, days: int, monthly_rate_pct: float, fee_pct: float) -> dict:
    """Reducing-balance loan repaid in equal daily instalments from settlements.

    Interest accrues daily on what is still owed (monthly rate x 12 / 365). The
    processing fee is deducted at disbursal. APR is the annualised rate implied by
    the cash actually received vs the instalments paid -- fee included -- as RBI's
    Key Fact Statement requires.
    """
    r = monthly_rate_pct / 100 * 12 / 365
    daily = int(math.ceil(amount * r / (1 - (1 + r) ** -days)))
    total = daily * days
    fee = int(amount * fee_pct / 100)
    received = amount - fee
    lo, hi = 0.0, 0.01                      # solve for the daily rate that prices `received`
    for _ in range(80):
        mid = (lo + hi) / 2
        pv = daily * (1 - (1 + mid) ** -days) / mid
        lo, hi = (mid, hi) if pv > received else (lo, mid)
    return {"daily_repayment": daily, "total_repayable": total, "interest": total - amount,
            "fee": fee, "apr_pct": round(lo * 365 * 100, 1)}


def _cash_gap(m: Merchant):
    f = m.forecast()
    need, cushion = f["extra_stock_needed"], f["weekly_margin"] * CASH_GAP_MARGIN_WEEKS
    check = {"play": "cash_gap", "label": "Festival stock costs more than margin covers",
             "metric": "extra stock vs 2 weeks of margin",
             "value": f'{inr(need)} vs {inr(cushion)}', "threshold": "stock > cushion",
             "fired": need > cushion and 0 < f["days_to_festival"] <= 45}
    if not check["fired"]:
        return None, check

    from .world import FESTIVAL_NAME
    amount = int(math.ceil(need / 5000.0) * 5000)   # never offer less than the need
    tenure_days, monthly_rate, fee_pct = 60, 1.5, 1.0
    q = price_loan(amount, tenure_days, monthly_rate, fee_pct)
    fee, total, daily = q["fee"], q["total_repayable"], q["daily_repayment"]

    ev = {"festival_days_away": f["days_to_festival"], "expected_uplift_pct": f["uplift_pct"],
          "festival_window_days": f["festival_window_days"], "daily_sales": f["daily_gmv"],
          "extra_stock_needed": need, "weekly_margin": f["weekly_margin"],
          "margin_pct": f["margin_pct"], "loan_amount": amount, "tenure_days": tenure_days,
          "monthly_rate_pct": monthly_rate, "processing_fee": fee, "interest": q["interest"],
          "amount_received": amount - fee, "apr_pct": q["apr_pct"],
          "total_repayable": total, "daily_repayment": daily}

    series = []
    for i in range(1, 31):
        wd = (m.w.today.weekday() + i) % 7
        base = f["by_weekday"].get(wd, f["daily_gmv"])
        fest = i >= f["days_to_festival"] and i < f["days_to_festival"] + f["festival_window_days"]
        series.append({"day": i, "sales": int(base * (1 + f["uplift_pct"] / 100 if fest else 1)),
                       "festival": bool(fest)})

    return Opportunity(
        # value = margin on the festival sales they could otherwise not stock for
        play="cash_gap", merchant_id=m.mid,
        score=int(f["daily_gmv"] * f["festival_window_days"] * f["uplift_pct"] / 100 * f["margin_pct"] / 100),
        evidence=ev, charts={"forecast": series, "festival_name": FESTIVAL_NAME},
        action={"kind": "loan", "amount": amount, "tenure_days": tenure_days,
                "partner": "Demo Partner NBFC", "total_repayable": total,
                "daily_repayment": daily, "processing_fee": fee, "interest": q["interest"],
                "amount_received": amount - fee, "apr_pct": q["apr_pct"],
                "monthly_rate_pct": monthly_rate},
        detector=check,
        provenance={"daily_sales": m.prov.add("Your last 28 days of payments",
                                              m._tx[m._tx.day >= DAYS - 28])},
    ), check
