"""Pre-generate AI copy for the demo shops so the stage never waits on the API.

    python3 -m app.warm

Results go to backend/.copy_cache.json; the server reuses them instantly as long
as the evidence is unchanged (it is, because the demo date is pinned).
"""
import os

os.environ.setdefault("GEMINI_ROUNDS", "4")

from . import llm                       # noqa: E402
from .main import S                     # noqa: E402
from .world import GLOW, GUPTA, RAJU, SHARMA   # noqa: E402

for mid in (SHARMA, GUPTA, GLOW, RAJU):
    S.opportunities(mid)
    st = llm.STATUS
    print(f"{mid}: {st['backend']:9} {st['model'] or '':20} {st['error'] or 'ok'}")
