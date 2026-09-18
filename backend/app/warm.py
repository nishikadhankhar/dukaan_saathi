"""Prepare everything the stage needs, so the demo makes no live API calls.

    python3 -m app.warm            # AI copy + natural voice for the demo lines
    python3 -m app.warm --copy     # AI copy only

1. AI copy for the 4 demo shops  -> backend/.copy_cache.json
2. Natural Soundbox voice (Gemini TTS) for every line the demo speaks
                                 -> backend/tts_cache/
Both are keyed by their exact content, so the server reuses them instantly and
anything missing falls back (templates / the browser voice) instead of stalling.
"""
import os
import sys

os.environ.setdefault("GEMINI_ROUNDS", "4")

from . import llm, tts                          # noqa: E402
from .act import approve, fast_forward, result_speech   # noqa: E402
from .main import S                             # noqa: E402
from .sense import inr                          # noqa: E402
from .world import GLOW, GUPTA, RAJU, SHARMA    # noqa: E402

SHOPS = (SHARMA, GUPTA, GLOW, RAJU)
QR_AMOUNTS = [20, 45, 60, 85, 110, 140, 180, 230, 260, 320, 450]   # MerchantApp simulatePay pool


def received(amount: int, lang: str) -> str:                         # MerchantApp t.received
    return f"Paytm पर {inr(amount)} प्राप्त हुए" if lang == "hi" else f"Received {inr(amount)} on Paytm"


print("== AI copy")
for mid in SHOPS:
    S.opportunities(mid)
    st = llm.STATUS
    print(f"  {mid}: {st['backend']:9} {st['model'] or '':20} {st['error'] or 'ok'}")

if "--copy" in sys.argv or not os.environ.get("GEMINI_API_KEY"):
    sys.exit(0)

# Most important first, so a rate limit part-way still leaves the main demo covered.
lines: list[str] = []
for lang in ("hi", "en"):
    for mid in SHOPS:
        fired, cards = S.opportunities(mid)
        lines.append(cards.briefing_hi if lang == "hi" else cards.briefing_en)
        m = S.merchant(mid)
        for o in fired:
            if o.action.get("kind") == "campaign":
                c = approve(m, o)
                fast_forward(m, c)
                lines.append(result_speech(m, c, lang))
    for a in QR_AMOUNTS:
        lines.append(received(a, lang))
    for mid in SHOPS:
        m = S.merchant(mid)
        today = m._tx[m._tx.day == m._tx.day.max()].sort_values(["hour", "minute"], ascending=False)
        for a in today.amount.head(6):
            lines.append(received(int(a), lang))

print(f"== Soundbox voice: {len(lines)} lines")
fails = 0
for i, text in enumerate(dict.fromkeys(lines)):          # de-duplicated, order kept
    if tts.cached(text):
        continue
    try:
        tts.generate(text)
        print(f"  ok   {text[:60]}")
        fails = 0
    except Exception as e:                                # noqa: BLE001
        fails += 1
        print(f"  FAIL {text[:40]} -- {type(e).__name__}: {str(e)[:120]}")
        if fails >= 3:
            print("  stopping: 3 failures in a row (rate limit?). Re-run later to fill the rest;")
            print("  missing lines use the browser voice.")
            break
print(f"  {sum(1 for t in dict.fromkeys(lines) if tts.cached(t))}/{len(dict.fromkeys(lines))} lines have a natural voice")
