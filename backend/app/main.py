"""Dukaan Saathi API.

One process, everything in memory, rebuildable from a seed -- so the demo can be
reset to a known state between runs.
"""
from __future__ import annotations

import datetime as dt
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import llm
from .act import Campaign, approve, fast_forward, loan_quote, result_speech
from .plays import detect_all
from .sense import Merchant, Provenance, inr
from .world import GLOW, RAJU, SHARMA, build_world

HEROES = [SHARMA, GLOW, RAJU]

app = FastAPI(title="Dukaan Saathi")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class State:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.world = build_world()
        self.prov = Provenance()
        self.campaigns: dict[str, Campaign] = {}
        self.cards: dict[str, object] = {}
        self.opps: dict[str, list] = {}
        self.checks: dict[str, list] = {}
        self.audit: list[dict] = []
        self.log("Demo world built", f"{len(self.world.tx):,} payments, "
                                     f"{len(self.world.merchants)} shops, "
                                     f"{len(self.world.customers):,} customers")

    def log(self, what: str, detail: str = "") -> None:
        self.audit.insert(0, {"when": dt.datetime.now().strftime("%I:%M:%S %p"),
                              "what": what, "detail": detail})
        del self.audit[60:]

    def merchant(self, mid: str) -> Merchant:
        if mid not in self.world.merchants.index:
            raise HTTPException(404, "no such shop")
        return Merchant(self.world, mid, self.prov)

    def opportunities(self, mid: str):
        """Detect once per merchant, then reuse -- cards are a daily batch in reality."""
        if mid not in self.opps:
            m = self.merchant(mid)
            fired, checks = detect_all(m)
            self.opps[mid], self.checks[mid] = fired, checks
            self.cards[mid] = llm.write_copy({"name": str(m.row["name"]), "category": m.category},
                                             m.summary(), fired)
            self.log("Opportunities generated", f"{str(m.row['name'])}: {len(fired)} fired, "
                                                f"copy via {llm.STATUS['backend']}")
        return self.opps[mid], self.cards[mid]


S = State()


def _card(cards, play: str, lang: str) -> dict:
    for c in cards.cards:
        if c.play == play:
            d = c.model_dump()
            return {"headline": d[f"headline_{lang}"], "why": d[f"why_{lang}"],
                    "action_label": d[f"action_{lang}"], "soundbox": d[f"soundbox_{lang}"]}
    return {"headline": play, "why": "", "action_label": "", "soundbox": ""}


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "copy_backend": llm.STATUS["backend"], "model": llm.STATUS["model"],
            "seed": S.world.seed, "today": S.world.today.isoformat(),
            "transactions": len(S.world.tx)}


@app.get("/api/merchants")
def merchants() -> list[dict]:
    out = []
    for mid in HEROES:
        r = S.world.merchants.loc[mid]
        out.append({"id": mid, "name": str(r["name"]), "category": str(r.category)})
    return out


@app.get("/api/merchants/{mid}")
def merchant_home(mid: str, lang: str = "hi") -> dict:
    m = S.merchant(mid)
    fired, cards = S.opportunities(mid)
    summary = m.summary()
    return {
        "merchant": {"id": mid, "name": summary["name"], "category": summary["category"]},
        "summary": summary,
        "series": m.daily_series(30),
        "repeat": m.cohort_repeat_rate(),
        "briefing": cards.briefing_hi if lang == "hi" else cards.briefing_en,
        "opportunities": [
            {"id": o.id, "play": o.play, "score": int(o.score),
             "kind": o.action.get("kind"), "evidence": o.evidence, **_card(cards, o.play, lang)}
            for o in fired
        ],
        "campaigns": [c.public() for c in S.campaigns.values() if c.merchant_id == mid],
    }


@app.get("/api/opportunities/{mid}/{play}")
def opportunity(mid: str, play: str, lang: str = "hi") -> dict:
    fired, cards = S.opportunities(mid)
    o = next((x for x in fired if x.play == play), None)
    if o is None:
        raise HTTPException(404, "no such opportunity")
    return {"id": o.id, "play": o.play, "kind": o.action.get("kind"), "score": int(o.score),
            "evidence": o.evidence, "charts": o.charts, "detector": o.detector,
            "provenance": o.provenance,
            "action": {k: v for k, v in o.action.items() if k != "audience"},
            "audience_size": len(o.action.get("audience", [])),
            **_card(cards, o.play, lang)}


@app.get("/api/provenance/{ref}")
def provenance(ref: str) -> dict:
    item = S.prov.get(ref)
    if not item:
        raise HTTPException(404, "unknown reference")
    return item


class ApproveIn(BaseModel):
    merchant_id: str
    play: str
    budget_cap: int | None = None


@app.post("/api/approve")
def approve_offer(body: ApproveIn) -> dict:
    m = S.merchant(body.merchant_id)
    fired, _ = S.opportunities(body.merchant_id)
    o = next((x for x in fired if x.play == body.play), None)
    if o is None or o.action.get("kind") != "campaign":
        raise HTTPException(400, "that opportunity cannot be approved")
    c = approve(m, o, body.budget_cap)
    S.campaigns[c.id] = c
    S.log("Merchant approved an offer",
          f"{c.id}: sent to {len(c.treatment)}, {len(c.holdout)} held back as control, "
          f"cap {inr(c.budget_cap)}")
    return {"campaign": c.public(), "notifications": c.notifications}


@app.post("/api/campaigns/{cid}/fast-forward")
def forward(cid: str, days: int = 14, lang: str = "hi") -> dict:
    c = S.campaigns.get(cid)
    if not c:
        raise HTTPException(404, "no such campaign")
    m = S.merchant(c.merchant_id)
    result = fast_forward(m, c, days)
    ref = S.prov.add(f"Simulated payments during the {days}-day campaign",
                     c.sim.rename(columns={"amount": "amount"}).assign(
                         ts=dt.datetime.now(), customer_id=c.sim.customer_id))
    S.log("Campaign measured",
          f"{c.id}: {result['treatment']['returned']}/{result['treatment']['customers']} returned "
          f"vs {result['holdout']['returned']}/{result['holdout']['customers']} in control")
    return {"campaign": c.public(), "result": result, "provenance_ref": ref,
            "speech": result_speech(m, c, lang)}


@app.get("/api/campaigns/{cid}")
def campaign(cid: str) -> dict:
    c = S.campaigns.get(cid)
    if not c:
        raise HTTPException(404, "no such campaign")
    return {"campaign": c.public(), "notifications": c.notifications}


@app.get("/api/loan/{mid}")
def loan(mid: str) -> dict:
    fired, _ = S.opportunities(mid)
    o = next((x for x in fired if x.action.get("kind") == "loan"), None)
    if o is None:
        raise HTTPException(404, "no loan offer for this shop")
    return loan_quote(o)


class ConsentIn(BaseModel):
    consent: bool = False


@app.post("/api/loan/{mid}/apply")
def loan_apply(mid: str, body: ConsentIn) -> dict:
    if not body.consent:
        raise HTTPException(400, "consent is required before anything is sent")
    S.log("Loan application sent to partner", f"{mid}: awaiting lender decision")
    return {"status": "sent_to_partner",
            "message": "Application sent to Demo Partner NBFC. They decide, not Paytm. "
                       "You will be asked to sign before any money moves."}


@app.get("/api/trace/{mid}")
def trace(mid: str) -> dict:
    S.opportunities(mid)
    return {"checks": S.checks.get(mid, []),
            "copy": {k: llm.STATUS[k] for k in ("backend", "model", "latency_ms",
                                                "validator", "error")},
            "prompt": llm.STATUS["prompt"], "raw": llm.STATUS["raw"],
            "audit": S.audit}


@app.post("/api/reset")
def reset() -> dict:
    S.reset()
    return {"ok": True}


_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="ui")
