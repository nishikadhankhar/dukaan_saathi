"""SPEAK -- turning detector output into words a shopkeeper would actually use.

The model never sees the database and never does arithmetic. It receives the
numbers the detectors already computed and may only rank, explain and translate
them. Everything it writes is then checked: any number that is not in the
evidence gets the whole card rejected and replaced with a template.

Backends, tried in this order:
  1. n8n webhook   (N8N_WEBHOOK_URL) -- n8n calls a model with its own credits
  2. Gemini API    (GEMINI_API_KEY)
  3. Anthropic API (ANTHROPIC_API_KEY)
  4. templates     -- always available, so a live demo cannot hard-fail
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from .sense import inr

try:                                   # keys live in a git-ignored .env, never in code
    from dotenv import load_dotenv
    _root = Path(__file__).resolve().parents[2]
    for _f in (_root / "backend" / ".env", _root / ".env", _root / ".claude" / ".env"):
        load_dotenv(_f, override=False)
except ImportError:
    pass

MODEL = "claude-opus-5"
GEMINI_MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.6-flash"]   # lite models write poor Hindi
CACHE = Path(__file__).resolve().parents[1] / ".copy_cache.json"

STATUS: dict[str, Any] = {"backend": "templates", "model": None, "latency_ms": None, "cached": False,
                          "validator": None, "prompt": None, "raw": None, "error": None}


class Card(BaseModel):
    play: str
    headline_en: str
    headline_hi: str
    why_en: str
    why_hi: str
    action_en: str
    action_hi: str
    soundbox_en: str
    soundbox_hi: str


class CardSet(BaseModel):
    cards: list[Card]
    briefing_en: str
    briefing_hi: str


SYSTEM = """You write for Dukaan Saathi, an assistant for small Indian shopkeepers
(kirana stores, salons, tea stalls) that speaks through their Paytm Soundbox.

HARD RULES
1. Use ONLY numbers that appear in the evidence JSON you are given. Never invent a
   number, never round one, never add or combine two numbers into a new one.
2. Western digits only (write 74, not seventy-four and not a Devanagari numeral).
3. Never name or identify a competing shop. Say "a new shop nearby" instead.
4. No investment, stock or financial advice of any kind.

STYLE
- Hindi: simple spoken Hindi in Devanagari, the way a shopkeeper actually talks.
  Keep the rupee symbol and digits as-is. Do not write formal or literary Hindi.
- English: plain, direct, no marketing language.
- headline: at most 9 words, states the situation, not the solution.
- why: at most 30 words, the evidence in plain words.
- action: at most 5 words, an imperative (e.g. "Send Rs 20 cashback").
- soundbox: at most 25 words, written to be spoken aloud.
- briefing: the shop's evening summary, at most 35 words, spoken aloud.
- Money: copy the rupee string from "display" exactly (e.g. ₹82,938). Never write a
  bare amount like 82938 and never write "Rs" in Hindi.
- Times of day: use the "display" string (e.g. 2 PM–5 PM), never "hour 14".
- Never mention a JSON field name (no "pct", "hour", "rate", "share").
- "nearby_*" numbers are the average of similar shops in the area, NOT the new shop.
- Every *_hi field must be in Devanagari script. Every *_en field in English.
- est_extra_profit_month is PROFIT (after the shop's margin), est_extra_sales_month is SALES.
  Never call sales "profit". Prefer the profit figure when talking about what the shop gains.
- low_ticket with cashback 0 is a free suggestion: a combo at spend_target (e.g. tea + biscuit).
  No cashback, no cost. Do not mention cashback for it.
Rank the plays with the most valuable and most urgent first."""


# --------------------------------------------------------------------------- #
#  Number grounding
# --------------------------------------------------------------------------- #
_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def _numbers(text: str) -> set[float]:
    out = set()
    for raw in _NUM.findall(text or ""):
        try:
            out.add(float(raw.replace(",", "")))
        except ValueError:
            pass
    return out


def allowed_numbers(*sources: dict) -> set[float]:
    ok: set[float] = set()
    def walk(v):
        if isinstance(v, bool):
            return
        if isinstance(v, (int, float)):
            ok.add(float(v)); ok.add(float(round(v)))
        elif isinstance(v, str):
            ok.update(_numbers(v))
        elif isinstance(v, dict):
            for x in v.values(): walk(x)
        elif isinstance(v, (list, tuple)):
            for x in v: walk(x)
    for s in sources:
        walk(s)
    return ok


def check_grounding(texts: dict[str, str], allowed: set[float]) -> dict:
    bad = []
    for field, text in texts.items():
        for n in _numbers(text) - allowed:
            bad.append({"field": field, "number": n})
    return {"ok": not bad, "checked": len(texts), "ungrounded": bad}


# --------------------------------------------------------------------------- #
#  Templates -- the always-works path
# --------------------------------------------------------------------------- #
def template_card(play: str, ev: dict) -> dict:
    g = ev.get
    if play == "winback":
        drift_hi = (f" इनमें से {g('moved_to_new_shop')} ग्राहक अब {g('new_shop_distance_m')} मीटर दूर "
                    f"एक नई दुकान पर भुगतान कर रहे हैं।") if g("moved_to_new_shop") else ""
        drift_en = (f" {g('moved_to_new_shop')} of them now pay at a new shop "
                    f"{g('new_shop_distance_m')} metres away.") if g("moved_to_new_shop") else ""
        return dict(
            headline_hi=f"{g('lapsed_regulars')} पुराने ग्राहक {g('weeks_since_last_visit')} हफ्ते से नहीं आए",
            headline_en=f"{g('lapsed_regulars')} regulars stopped coming {g('weeks_since_last_visit')} weeks ago",
            why_hi=f"पहले ये महीने में {g('visits_per_month_before')} बार आते थे और हर महीने लगभग {inr(g('monthly_value_at_risk'))} की खरीद करते थे।" + drift_hi,
            why_en=f"They used to visit {g('visits_per_month_before')} times a month and spent about {inr(g('monthly_value_at_risk'))} every month." + drift_en,
            action_hi=f"₹{g('cashback')} कैशबैक भेजें", action_en=f"Send ₹{g('cashback')} cashback",
            soundbox_hi=f"{g('lapsed_regulars')} पुराने ग्राहक {g('weeks_since_last_visit')} हफ्ते से नहीं आए। ऐप खोलकर ₹{g('cashback')} कैशबैक भेजिए।",
            soundbox_en=f"{g('lapsed_regulars')} regular customers have not come for {g('weeks_since_last_visit')} weeks. Open the app to send Rs {g('cashback')} cashback.")
    if play == "dead_hours":
        return dict(
            headline_hi=f"दोपहर में दुकान खाली रहती है",
            headline_en=f"Your afternoons are much quieter than nearby shops",
            why_hi=f"दोपहर की बिक्री आपकी कुल बिक्री का सिर्फ {g('your_share_pct')}% है, जबकि आसपास की {g('nearby_shops_compared')} दुकानों में यह {g('nearby_share_pct')}% है।",
            why_en=f"Those hours are only {g('your_share_pct')}% of your sales, against {g('nearby_share_pct')}% at {g('nearby_shops_compared')} shops nearby.",
            action_hi=f"{g('discount_pct')}% छूट चलाएं", action_en=f"Run a {g('discount_pct')}% offer",
            soundbox_hi=f"दोपहर में आपकी दुकान खाली रहती है। {g('discount_pct')}% छूट से {g('regular_customers')} ग्राहकों को बुलाइए।",
            soundbox_en=f"Your afternoons are empty. A {g('discount_pct')} percent offer can bring in your {g('regular_customers')} regular customers.")
    if play == "low_ticket" and not g("cashback"):          # cashback would lose money: a free tip
        return dict(
            headline_hi=f"आपका औसत बिल ₹{g('your_median_bill')} है",
            headline_en=f"Your typical bill is ₹{g('your_median_bill')}",
            why_hi=f"आसपास की {g('nearby_shops_compared')} दुकानों में ₹{g('nearby_median_bill')}। ₹{g('spend_target')} का combo (जैसे चाय + बिस्कुट) हर बिल में ₹{g('extra_per_bill')} जोड़ सकता है, बिना किसी खर्च के।",
            why_en=f"{g('nearby_shops_compared')} shops nearby average ₹{g('nearby_median_bill')}. A ₹{g('spend_target')} combo (say tea + biscuit) adds ₹{g('extra_per_bill')} a bill, at no cost to you.",
            action_hi=f"₹{g('spend_target')} का combo आज़माएँ", action_en=f"Try a ₹{g('spend_target')} combo",
            soundbox_hi=f"आपका औसत बिल ₹{g('your_median_bill')} है। ₹{g('spend_target')} का combo बनाइए, जैसे चाय के साथ बिस्कुट।",
            soundbox_en=f"Your typical bill is ₹{g('your_median_bill')}. Try a ₹{g('spend_target')} combo, like tea with a biscuit.")
    if play == "low_ticket":
        return dict(
            headline_hi=f"आपका औसत बिल ₹{g('your_median_bill')} है",
            headline_en=f"Your average bill is ₹{g('your_median_bill')}",
            why_hi=f"आसपास की {g('nearby_shops_compared')} दुकानों का औसत बिल ₹{g('nearby_median_bill')} है। ग्राहक आते हैं पर कम खरीदते हैं।",
            why_en=f"{g('nearby_shops_compared')} shops nearby average ₹{g('nearby_median_bill')}. Customers come, but buy less.",
            action_hi=f"₹{g('spend_target')} पर ₹{g('cashback')} कैशबैक", action_en=f"₹{g('cashback')} back on ₹{g('spend_target')}",
            soundbox_hi=f"आपका औसत बिल ₹{g('your_median_bill')} है, आसपास ₹{g('nearby_median_bill')}। ₹{g('spend_target')} पर ₹{g('cashback')} कैशबैक चलाइए।",
            soundbox_en=f"Your average bill is Rs {g('your_median_bill')} against Rs {g('nearby_median_bill')} nearby. Try Rs {g('cashback')} back on Rs {g('spend_target')}.")
    if play == "cash_gap":
        return dict(
            headline_hi=f"त्योहार {g('festival_days_away')} दिन दूर — स्टॉक के लिए {inr(g('extra_stock_needed'))} चाहिए",
            headline_en=f"Festival in {g('festival_days_away')} days needs {inr(g('extra_stock_needed'))} of extra stock",
            why_hi=f"त्योहार के {g('festival_window_days')} दिनों में बिक्री लगभग {g('expected_uplift_pct')}% बढ़ती है। आपका हफ्ते का मुनाफा लगभग {inr(g('weekly_margin'))} है।",
            why_en=f"Sales usually rise about {g('expected_uplift_pct')}% over the {g('festival_window_days')} festival days. Your weekly margin is around {inr(g('weekly_margin'))}.",
            action_hi=f"{inr(g('loan_amount'))} का लोन देखें", action_en=f"See {inr(g('loan_amount'))} working capital",
            soundbox_hi=f"त्योहार {g('festival_days_away')} दिन में है। स्टॉक के लिए {inr(g('loan_amount'))} का लोन ऐप में देखिए।",
            soundbox_en=f"The festival is {g('festival_days_away')} days away. A {inr(g('loan_amount'))} stock loan is waiting in the app.")
    return dict.fromkeys(["headline_hi", "headline_en", "why_hi", "why_en",
                          "action_hi", "action_en", "soundbox_hi", "soundbox_en"], "")


def template_briefing(summary: dict, top: dict | None) -> tuple[str, str]:
    gmv, pct = inr(summary["today_gmv"]), abs(summary["change_pct"])
    up_hi, up_en = ("ज़्यादा", "more") if summary["change_pct"] >= 0 else ("कम", "less")
    hi = f"आज की बिक्री {gmv}, कल से {pct}% {up_hi}। {summary['today_customers']} ग्राहक आए।"
    en = f"Today's sales {gmv}, {pct} percent {up_en} than yesterday, from {summary['today_customers']} customers."
    if top:
        hi += " " + top["soundbox_hi"]
        en += " " + top["soundbox_en"]
    return hi, en


def _templates(opps, summary) -> CardSet:
    cards = [Card(play=o.play, **template_card(o.play, o.evidence)) for o in opps]
    hi, en = template_briefing(summary, cards[0].model_dump() if cards else None)
    return CardSet(cards=cards, briefing_hi=hi, briefing_en=en)


# --------------------------------------------------------------------------- #
#  Model backends
# --------------------------------------------------------------------------- #
_MONEY = {"avg_bill", "monthly_value_at_risk", "cashback", "min_bill", "budget_cap",
          "est_extra_sales_month", "est_extra_sales", "daily_sales", "extra_stock_needed",
          "weekly_margin", "loan_amount", "processing_fee", "total_repayable", "daily_repayment",
          "weekly_sales", "weekly_potential", "max_discount", "your_median_bill",
          "nearby_median_bill", "spend_target", "est_extra_profit_month", "extra_per_bill",
          "amount_received", "interest"}


def _clock(h: int) -> str:
    return f"{(h - 1) % 12 + 1} {'AM' if h < 12 else 'PM'}"


def _display(ev: dict) -> dict:
    """Ready-to-print strings, so the model copies formatting instead of inventing it."""
    d = {k: inr(v) for k, v in ev.items() if k in _MONEY}
    if "quiet_from_hour" in ev:
        d["quiet_hours"] = f"{_clock(ev['quiet_from_hour'])}–{_clock(ev['quiet_to_hour'])}"
    return d


def _payload(merchant: dict, summary: dict, opps) -> dict:
    return {
        "shop": {"name": merchant["name"], "type": merchant["category"]},
        "today": {"sales": summary["today_gmv"], "customers": summary["today_customers"],
                  "change_vs_yesterday_pct": summary["change_pct"],
                  "display": {"sales": inr(summary["today_gmv"])}},
        "plays": [{"play": o.play, "evidence": o.evidence, "display": _display(o.evidence)}
                  for o in opps],
    }


def _cache_get(key: str) -> dict | None:
    try:
        return json.loads(CACHE.read_text()).get(key)
    except (OSError, ValueError):
        return None


def _cache_put(key: str, value: dict) -> None:
    try:
        data = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    except ValueError:
        data = {}
    data[key] = value
    CACHE.write_text(json.dumps(data, ensure_ascii=False))


def _via_anthropic(system: str, prompt: str) -> CardSet:
    import anthropic
    client = anthropic.Anthropic()
    kwargs = dict(model=MODEL, max_tokens=16000, system=system,
                  messages=[{"role": "user", "content": prompt}], output_format=CardSet)
    try:   # server-side fallback keeps a policy decline from killing the demo
        r = client.beta.messages.parse(betas=["server-side-fallback-2026-07-01"],
                                       fallbacks="default", **kwargs)
    except Exception:
        r = client.messages.parse(**kwargs)
    return r.parsed_output


def _via_gemini(system: str, prompt: str) -> tuple[CardSet, str]:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    cfg = types.GenerateContentConfig(system_instruction=system, temperature=0.3,
                                      response_mime_type="application/json",
                                      response_schema=CardSet)
    errors = []
    attempts = [m for _ in range(int(os.environ.get("GEMINI_ROUNDS", "1"))) for m in GEMINI_MODELS]
    for i, model in enumerate(attempts):   # next model if one is rate-limited or unavailable
        if i and i % len(GEMINI_MODELS) == 0:
            time.sleep(8)                  # whole round was busy: back off, then go again
        try:
            r = client.models.generate_content(model=model, contents=prompt, config=cfg)
            out = r.parsed if isinstance(r.parsed, CardSet) else CardSet.model_validate_json(r.text)
            return out, model
        except Exception as e:         # noqa: BLE001
            errors.append(f"{model}: {type(e).__name__}: {str(e)[:160]}")
    raise RuntimeError(" | ".join(errors))


def _via_n8n(system: str, prompt: str) -> CardSet:
    import urllib.request
    url = os.environ["N8N_WEBHOOK_URL"]
    body = json.dumps({"system": system, "prompt": prompt,
                       "schema": CardSet.model_json_schema()}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode())
    for key in ("output", "result", "data", "json"):      # n8n wraps output in various ways
        if isinstance(data, dict) and key in data and isinstance(data[key], (dict, str)):
            data = data[key]
    if isinstance(data, list) and data:
        data = data[0]
    if isinstance(data, str):
        data = json.loads(re.sub(r"^```(?:json)?|```$", "", data.strip(), flags=re.M))
    return CardSet.model_validate(data)


def write_copy(merchant: dict, summary: dict, opps) -> CardSet:
    """Produce merchant-facing copy, then verify every number in it."""
    if not opps:
        hi, en = template_briefing(summary, None)
        STATUS.update(backend="templates", validator=None, error=None)
        return CardSet(cards=[], briefing_hi=hi, briefing_en=en)

    payload = _payload(merchant, summary, opps)
    prompt = json.dumps(payload, ensure_ascii=False, indent=1)
    backend, result, err, model, hit = "templates", None, None, None, None
    import hashlib
    key = hashlib.sha256((SYSTEM + prompt).encode()).hexdigest()[:16]
    t0 = time.time()
    try:
        hit = _cache_get(key)
        if hit:                  # same evidence as a previous run: reuse, no API call
            backend, model = hit["backend"], hit["model"]
            result = CardSet.model_validate(hit["cards"])
        elif os.environ.get("N8N_WEBHOOK_URL"):
            backend, result = "n8n", _via_n8n(SYSTEM, prompt)
        elif os.environ.get("GEMINI_API_KEY"):
            backend = "gemini"
            result, model = _via_gemini(SYSTEM, prompt)
        elif os.environ.get("ANTHROPIC_API_KEY"):
            backend, result, model = "anthropic", _via_anthropic(SYSTEM, prompt), MODEL
    except Exception as e:                                  # noqa: BLE001 - demo must not die
        err, backend, result = f"{type(e).__name__}: {e}", "templates", None
    latency = int((time.time() - t0) * 1000)

    allowed = allowed_numbers(payload, summary)
    verdict = None
    if result is not None:
        texts = {f"{c.play}.{k}": v for c in result.cards
                 for k, v in c.model_dump().items() if k != "play"}
        texts |= {"briefing_hi": result.briefing_hi, "briefing_en": result.briefing_en}
        verdict = check_grounding(texts, allowed)
        if not verdict["ok"]:                               # model used a number we cannot back
            err = f"rejected {len(verdict['ungrounded'])} ungrounded number(s)"
            result, backend = None, "templates"
        else:
            # Action labels name what the button does, so they stay fixed, not model-written.
            for c in result.cards:
                ev = next(o.evidence for o in opps if o.play == c.play)
                t = template_card(c.play, ev)
                c.action_hi, c.action_en = t["action_hi"], t["action_en"]
            if not hit:
                _cache_put(key, {"backend": backend, "model": model, "cards": result.model_dump()})

    if result is None:
        result = _templates(opps, summary)
        if verdict is None:
            verdict = check_grounding(
                {f"{c.play}.headline_hi": c.headline_hi for c in result.cards}, allowed)

    by_play = {c.play: c for c in result.cards}
    result.cards = [by_play[o.play] for o in opps if o.play in by_play]
    STATUS.update(backend=backend, model=model if backend != "templates" else None,
                  latency_ms=latency if backend != "templates" and not hit else None,
                  cached=bool(hit),
                  validator=verdict, prompt=prompt,
                  raw=result.model_dump(), error=err)
    return result
