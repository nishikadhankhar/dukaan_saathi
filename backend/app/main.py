"""Dukaan Saathi API.

One process, everything in memory, rebuildable from a seed -- so the demo can be
reset to a known state between runs.
"""
from __future__ import annotations

import datetime as dt
import os
import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import llm, tts
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
        self.copy_status: dict[str, dict] = {}   # per shop, so one shop never shows another's trace
        self.tips: set[str] = set()
        self.lock = threading.Lock()
        self.audit: list[dict] = []
        self.log("Demo world built", f"{len(self.world.tx):,} payments, "
                                     f"{len(self.world.merchants)} shops, "
                                     f"{len(self.world.customers):,} customers")

    def campaign_for(self, mid: str, play: str):
        cs = [c for c in self.campaigns.values() if c.merchant_id == mid and c.play == play]
        return cs[-1] if cs else None

    def state_of(self, mid: str, play: str) -> dict | None:
        """What has already been done about this opportunity, so a card never offers it twice."""
        if f"{mid}:{play}" in self.tips:
            return {"status": "tip"}
        c = self.campaign_for(mid, play)
        if not c:
            return None
        out = {"id": c.id, "status": c.status, "sent_to": len(c.treatment), "held_back": len(c.holdout)}
        if c.result:
            t, h = c.result["treatment"], c.result["holdout"]
            back = t["returned"] + h["returned"]
            out |= {"returned": t["returned"], "still_away": len(c.treatment) + len(c.holdout) - back,
                    "extra_profit": c.result["extra_profit"], "spent": c.result["spent"]}
        return out

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
        with self.lock:                          # two tabs / StrictMode must not generate twice
            return self._opportunities(mid)

    def _opportunities(self, mid: str):
        if mid not in self.opps:
            m = self.merchant(mid)
            fired, checks = detect_all(m)
            self.opps[mid], self.checks[mid] = fired, checks
            self.cards[mid] = llm.write_copy({"name": str(m.row["name"]), "category": m.category},
                                             m.summary(), fired)
            self.log("Opportunities generated", f"{str(m.row['name'])}: {len(fired)} fired, "
                                                f"copy via {llm.STATUS['backend']}")
            self.copy_status[mid] = {k: llm.STATUS[k] for k in
                                     ("backend", "model", "latency_ms", "validator", "error",
                                      "prompt", "raw", "cached")}
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
             "kind": o.action.get("kind"), "evidence": o.evidence, "state": S.state_of(mid, o.play),
             **_card(cards, o.play, lang)}
            for o in fired
        ],
        "campaigns": [c.public() for c in S.campaigns.values() if c.merchant_id == mid],
    }


@app.get("/api/merchants/{mid}/recent")
def recent_payments(mid: str, n: int = 6) -> list[dict]:
    """Today's latest payments, newest first -- what the Soundbox actually announced."""
    m = S.merchant(mid)
    today = m._tx[m._tx.day == m._tx.day.max()].sort_values(["hour", "minute"], ascending=False).head(n)
    return [{"time": pd_time(int(r.hour), int(r.minute)), "amount": int(r.amount)} for r in today.itertuples()]


def pd_time(h: int, mnt: int) -> str:
    return f"{(h % 12) or 12}:{mnt:02d} {'PM' if h >= 12 else 'AM'}"


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
            "state": S.state_of(mid, o.play),
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
    if o is None or o.action.get("kind") not in ("campaign", "tip"):
        raise HTTPException(400, "that opportunity cannot be approved")
    if S.state_of(body.merchant_id, body.play):
        raise HTTPException(409, "already actioned -- see its status instead of sending it twice")
    shop = str(m.row["name"])
    if o.action["kind"] == "tip":
        S.tips.add(o.id)
        S.log("Merchant accepted a tip", f"{shop}: {o.play}, no money spent")
        return {"tip": True}
    c = approve(m, o, body.budget_cap)
    S.campaigns[c.id] = c
    S.log("Offer approved", f"{shop} · {c.id}: cap {inr(c.budget_cap)}")
    S.log("Offer sent", f"{shop} · {c.id}: {len(c.treatment)} customers, "
                        f"{len(c.holdout)} held back as control")
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
    shop = str(m.row["name"])
    if not getattr(c, "_logged", False):          # re-opening a result must not double-log
        c._logged = True
        S.log("Cashback paid out", f"{shop} · {c.id}: {inr(result['spent'])} "
                                   f"(cap {inr(c.budget_cap)}), simulated 14 days")
        S.log("Result measured",
              f"{shop} · {c.id}: {result['treatment']['returned']}/{result['treatment']['customers']} "
              f"returned vs {result['holdout']['returned']}/{result['holdout']['customers']} in control · "
              f"profit {inr(result['extra_profit'])} vs {inr(result['spent'])} spent")
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
    S.log("Loan application sent to partner", f"{S.merchant(mid).row['name']}: consent given, awaiting lender decision")
    return {"status": "sent_to_partner",
            "message": "Application sent to Demo Partner NBFC. They decide, not Paytm. "
                       "You will be asked to sign before any money moves."}


@app.get("/api/trace/{mid}")
def trace(mid: str) -> dict:
    S.opportunities(mid)
    st = S.copy_status.get(mid, {})
    checks = [c | {"state": S.state_of(mid, c["play"])} for c in S.checks.get(mid, [])]
    return {"checks": checks,
            "copy": {k: st.get(k) for k in ("backend", "model", "latency_ms", "validator",
                                            "error", "cached")},
            "prompt": st.get("prompt"), "raw": st.get("raw"),
            "audit": S.audit}


@app.get("/api/tts")
def speech(text: str):
    """Pre-generated natural voice for a line, if we have it. 404 -> the browser voice is used."""
    f = tts.cached(text)
    if not f:
        raise HTTPException(404, "not pre-generated")
    return FileResponse(f, media_type=tts.media_type(f), headers={"Cache-Control": "max-age=86400"})


@app.post("/api/reset")
def reset() -> dict:
    S.reset()
    return {"ok": True}


_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="ui")
