"""ACT -- approve an offer, send it, and measure honestly.

Every campaign holds back a random fifth of the audience. They get nothing, so
the difference between the two groups is what the offer actually caused. The
fast-forward button plays the next 14 days forward and the results screen is
computed from those simulated payments, not written by hand.
"""
from __future__ import annotations

import datetime as dt
import itertools
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .sense import Merchant, _mask, inr

HOLDOUT_SHARE = 0.20
FORWARD_DAYS = 14

# How customers respond. These are the demo's assumptions and are shown in the UI.
RESPONSE = {
    "winback":    {"treatment": 0.46, "holdout": 0.13, "visits": (1, 3)},
    "happy_hour": {"treatment": 0.11, "holdout": 0.03, "visits": (1, 2)},
    "threshold":  {"treatment": 0.38, "holdout": 0.12, "visits": (2, 5)},
}

_ids = itertools.count(1)


@dataclass
class Campaign:
    id: str
    merchant_id: str
    play: str
    type: str
    offer: dict
    budget_cap: int
    treatment: list[str]
    holdout: list[str]
    created: dt.datetime
    status: str = "live"
    result: dict | None = None
    sim: pd.DataFrame | None = None
    notifications: list[dict] = field(default_factory=list)

    def public(self) -> dict:
        return {"id": self.id, "merchant_id": self.merchant_id, "play": self.play,
                "type": self.type, "offer": self.offer, "budget_cap": self.budget_cap,
                "audience": len(self.treatment) + len(self.holdout),
                "sent_to": len(self.treatment), "held_back": len(self.holdout),
                "status": self.status, "result": self.result,
                "created": self.created.strftime("%d %b, %I:%M %p")}


def offer_text(ctype: str, offer: dict, shop: str, lang: str = "en") -> str:
    if ctype == "winback":
        return (f"{shop} ne aapko ₹{offer['cashback']} cashback bheja hai. "
                f"₹{offer['min_bill']} ya zyada ka payment karein, {offer['valid_days']} din ke andar."
                if lang == "hi" else
                f"{shop} sent you ₹{offer['cashback']} cashback. Pay ₹{offer['min_bill']} or more "
                f"within {offer['valid_days']} days.")
    if ctype == "happy_hour":
        return (f"{shop}: dopahar mein {offer['discount_pct']}% chhoot, "
                f"₹{offer['max_discount']} tak. {offer['valid_days']} din ke liye."
                if lang == "hi" else
                f"{shop}: {offer['discount_pct']}% off in the afternoon, up to ₹{offer['max_discount']}. "
                f"Valid {offer['valid_days']} days.")
    return (f"{shop}: ₹{offer['spend_target']} ka payment karein aur ₹{offer['cashback']} cashback paayein."
            if lang == "hi" else
            f"{shop}: pay ₹{offer['spend_target']} or more and get ₹{offer['cashback']} back.")


def approve(m: Merchant, opp, budget_cap: int | None = None) -> Campaign:
    """Split the audience, then queue the offer for the treatment group."""
    action = opp.action
    rng = np.random.default_rng(abs(hash(opp.id)) % (2**32))
    audience = list(action["audience"])
    rng.shuffle(audience)
    n_hold = max(1, int(round(len(audience) * HOLDOUT_SHARE)))
    holdout, treatment = audience[:n_hold], audience[n_hold:]

    c = Campaign(id=f"CMP{next(_ids):03d}", merchant_id=m.mid, play=opp.play,
                 type=action["type"], offer=action["offer"],
                 budget_cap=int(budget_cap or action["budget_cap"]),
                 treatment=treatment, holdout=holdout, created=dt.datetime.now())
    shop = str(m.row["name"])
    c.notifications = [{"customer": _mask(cid), "customer_id": cid,
                        "text_en": offer_text(c.type, c.offer, shop, "en"),
                        "text_hi": offer_text(c.type, c.offer, shop, "hi"),
                        "when": "Just now"} for cid in treatment[:25]]
    return c


def fast_forward(m: Merchant, c: Campaign, days: int = FORWARD_DAYS) -> dict:
    """Play the next `days` forward for both groups and measure the difference."""
    p = RESPONSE[c.type]
    rng = np.random.default_rng(abs(hash(c.id + "ff")) % (2**32))
    recent = m._tx[m._tx.day >= m._tx.day.max() - 29].amount.to_numpy()
    if len(recent) < 20:
        recent = m._tx.amount.to_numpy()

    rows, spend = [], 0
    for arm, members in (("treatment", c.treatment), ("holdout", c.holdout)):
        prob = p[arm]
        responds = rng.random(len(members)) < prob
        for cid, yes in zip(members, responds):
            if not yes:
                continue
            for _ in range(int(rng.integers(p["visits"][0], p["visits"][1] + 1))):
                amount = int(rng.choice(recent))
                incentive = 0
                if arm == "treatment":
                    if c.type == "winback":
                        amount = max(amount, c.offer["min_bill"])
                        if spend + c.offer["cashback"] <= c.budget_cap:
                            incentive = c.offer["cashback"]
                    elif c.type == "happy_hour":
                        incentive = min(int(amount * c.offer["discount_pct"] / 100),
                                        c.offer["max_discount"])
                        if spend + incentive > c.budget_cap:
                            incentive = 0
                    else:
                        amount = max(amount, c.offer["spend_target"])
                        if spend + c.offer["cashback"] <= c.budget_cap:
                            incentive = c.offer["cashback"]
                spend += incentive
                rows.append({"customer_id": cid, "arm": arm, "amount": amount,
                             "incentive": incentive,
                             "day": int(rng.integers(1, days + 1))})

    sim = pd.DataFrame(rows, columns=["customer_id", "arm", "amount", "incentive", "day"])
    sim.insert(0, "txn_id", [f"S{i:04d}" for i in range(1, len(sim) + 1)])
    c.sim = sim

    def arm_stats(arm: str, members: list[str]) -> dict:
        d = sim[sim.arm == arm]
        n = max(len(members), 1)
        return {"customers": len(members), "returned": int(d.customer_id.nunique()),
                "return_rate": round(d.customer_id.nunique() / n * 100, 1),
                "sales": int(d.amount.sum()), "sales_per_customer": round(float(d.amount.sum()) / n, 1)}

    t, h = arm_stats("treatment", c.treatment), arm_stats("holdout", c.holdout)
    lift_rate = round(t["return_rate"] - h["return_rate"], 1)
    incremental = int(round((t["sales_per_customer"] - h["sales_per_customer"]) * t["customers"]))
    spend = int(sim.incentive.sum())
    c.result = {
        "days": days, "treatment": t, "holdout": h,
        "lift_pct_points": lift_rate,
        "extra_customers": int(round(lift_rate / 100 * t["customers"])),
        "incremental_sales": incremental, "spent": spend,
        "return_per_rupee": round(incremental / spend, 1) if spend else None,
        "total_sales": int(sim.amount.sum()),
        "chart": [{"who": "Got the offer", "rate": t["return_rate"]},
                  {"who": "Control group", "rate": h["return_rate"]}],
        "note": ("The control group is small, so treat this as directional."
                 if h["customers"] < 30 else "Measured against a randomised control group."),
    }
    c.status = "done"
    return c.result


def result_speech(m: Merchant, c: Campaign, lang: str = "hi") -> str:
    r = c.result
    if not r:
        return ""
    t, h = r["treatment"], r["holdout"]
    if lang == "hi":
        return (f"जिन {t['customers']} ग्राहकों को ऑफर भेजा, उनमें से {t['returned']} वापस आए। "
                f"बिना ऑफर वाले {h['customers']} में से सिर्फ {h['returned']}। "
                f"अतिरिक्त बिक्री {inr(r['incremental_sales'])}, खर्च {inr(r['spent'])}।")
    return (f"{t['returned']} of the {t['customers']} customers who got the offer came back, "
            f"against {h['returned']} of {h['customers']} who did not. "
            f"Extra sales {inr(r['incremental_sales'])}, spend {inr(r['spent'])}.")


def loan_quote(opp) -> dict:
    a = opp.action
    return {"partner": a["partner"], "amount": a["amount"], "tenure_days": a["tenure_days"],
            "monthly_rate_pct": a["monthly_rate_pct"], "processing_fee": a["processing_fee"],
            "total_repayable": a["total_repayable"], "daily_repayment": a["daily_repayment"],
            "disclosures": [
                f"Offered by {a['partner']}, a demo lending partner. Paytm is a distributor, not the lender.",
                f"Interest {a['monthly_rate_pct']}% per month on reducing balance, "
                f"plus a one-time processing fee of {inr(a['processing_fee'])}.",
                f"Repaid as {inr(a['daily_repayment'])} deducted from your daily settlements "
                f"for {a['tenure_days']} days.",
                "Nothing is applied for until you tick consent. No money moves without the lender's approval.",
            ]}
