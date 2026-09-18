# Dukaan Saathi — tech prep

Everything here is checked against the code. About 3,000 lines in total: 1,600 Python and 1,400 TypeScript.

## 1. The idea in one breath

**SENSE → THINK → SPEAK/ACT**

1. **SENSE:** read the shop's payment ledger and compare the shop with similar shops nearby.
2. **THINK:** rule-based detectors find a problem and compute every number (no AI here).
3. **SPEAK:** an LLM (Gemini) turns those numbers into short Hindi/English text. A checker rejects
   any text containing a number that isn't in the evidence.
4. **ACT:** the shopkeeper approves with one tap. 20% of customers are held back as a control group, and the
   result is measured and announced on the Soundbox.

## 2. Tech stack: what, where, why

### Backend (Python 3.13), folder `backend/app/`

| Library | Version | Used for | Where |
|---|---|---|---|
| **FastAPI** | 0.138 | The REST API the phone UI calls (`/api/...`); also serves the built frontend | `main.py` |
| **Uvicorn** | 0.49 | The web server that runs FastAPI | `run.sh` |
| **pandas** | 3.0 | All data work: the payments table, group-bys, lapsed customers, cohorts | `world.py`, `sense.py`, `plays.py` |
| **NumPy** | 2.4 | Random data generation (seeded), statistics, the simulation | `world.py`, `act.py` |
| **Pydantic** | 2.13 | Defines the exact JSON shape the AI must return (`CardSet`) and validates it | `llm.py` |
| **google-genai** | 2.24 | Official Gemini SDK: calls the model with a JSON schema | `llm.py` → `_via_gemini` |
| **python-dotenv** | 1.2 | Loads `GEMINI_API_KEY` from a git-ignored `.env` file | `llm.py` |
| anthropic | — | Optional Claude backend (only used if `ANTHROPIC_API_KEY` is set) | `llm.py` |
| zlib (built-in) | — | `crc32` makes stable random seeds, so the demo gives identical numbers every run | `act.py` |

**No database.** The world (34 shops, 6,000 customers, 2,19,145 payments over 90 days) is built in memory
with pandas in about 1–2 seconds at startup. Production would read from Paytm's data warehouse instead.

### Frontend, folder `frontend/src/`

| Library | Version | Used for | Where |
|---|---|---|---|
| **React** | 18.3 | UI components and screen state | all `.tsx` |
| **TypeScript** | 5.6 | Typed JavaScript | all |
| **Vite** | 6 | Dev server and production build (`npm run build` → `frontend/dist`) | `vite.config.ts` |
| **Tailwind CSS** | 4 | Styling via utility classes, colours matched to Paytm for Business | everywhere, `index.css` |
| **Recharts** | 2.15 | Charts: weekly visits (evidence), 30-day sales (reports) | `MerchantApp.tsx` |
| **Web Speech API** | browser built-in | **Text-to-speech (TTS)** for the Soundbox voice | `api.ts` → `speak()` |
| Google Fonts | — | Plus Jakarta Sans (English), **Mukta** (Devanagari/Hindi), JetBrains Mono (numbers) | `index.html` |
| Icons | — | Inline SVGs drawn from Lucide icon shapes, so no icon library to download | `icons.tsx` |

### Design and tooling
- **Figma:** screen designs (the file "Dukaan Saathi — UI")
- **Canva:** the round-1 pitch deck
- **Git:** version control

## 3. TTS: how the Soundbox talks

- It's **not a library**. It's the browser's built-in **Web Speech API**, `window.speechSynthesis`.
- `api.ts → speak(text, lang)` creates a `SpeechSynthesisUtterance` and sets `lang` to `hi-IN` (Hindi) or
  `en-IN` (Indian English). It picks a matching installed voice (on a Mac that's **Lekha** for Hindi),
  at rate 0.96.
- Voices come from the operating system, so it **works offline**, costs nothing, and adds no delay.
- **How the phone makes the counter device speak:** any "play" button calls `onSpeak(text)` →
  `App.tsx say()` stores `{text, time}` → the `Soundbox` component notices the change and speaks
  while its light pulses. One code path for everything, so the in-app Soundbox screen visibly drives the device.
- **In production:** a real Soundbox would play audio pushed from Paytm's servers, using a cloud TTS
  (for example Google Cloud TTS or Bhashini) to generate the audio once per message.
- **Why not cloud TTS now?** It needs no key and has zero latency on stage. The weakness: voice quality
  depends on the laptop, which is why the checklist says to use Chrome and add Lekha.

## 4. Backend files: what each one does

| File | Layer | What it does |
|---|---|---|
| `world.py` | data | Builds the simulated neighbourhood: shops with weekday and hourly patterns, customers with personal activity/spend (lognormal), payments (Poisson counts). **Plants** the stories: 74 Sharma regulars lapse after day 66 and a rival opens on day 65, 200 m away. Pinned to 19 Sep 2026. Navratri starts 11 Oct 2026. |
| `sense.py` | SENSE | The `Merchant` class: today's summary, 30-day series, repeat rate, **lapsed regulars**, **drift** (where they went), hourly shares, bill sizes, festival forecast. Also the **provenance registry** (every number links to its rows) and ID masking (`C03•••16`). |
| `plays.py` | THINK | The 4 detectors. Each returns fired/not fired, plus evidence, charts and a proposed action. |
| `llm.py` | SPEAK | Prompt, Pydantic schema, Gemini/Claude/n8n calls, **number-grounding checker**, templates, cache. |
| `act.py` | ACT | Approve (random 20% holdout), fast-forward simulation, result speech, loan quote. |
| `main.py` | API | FastAPI routes, in-memory state, activity log. |
| `warm.py` | ops | Pre-generates AI text for the 4 demo shops into `.copy_cache.json`. |

### The 4 detectors (`plays.py`)

| Detector | Fires when | Offer |
|---|---|---|
| **Win-back** (Sharma) | ≥ 10 regulars (≥ 4 visits in the earlier window) have **no visit in 21 days** | Cashback sized to the bill: ₹20 on ₹150 for a kirana, ₹5 on ₹30 for a chai stall; 7 days |
| ↳ Drift | ≥ 10 of those now pay **≥ 2 times** at one other same-category shop in those 21 days | adds "17 moved to a new shop 197 m away" |
| **Dead hours** (Glow) | Between 11 AM and 7 PM, ≥ 2 hours where your share of sales is under half of nearby shops' (median), with the gaps adding up to ≥ 6 points | 20% off in those hours, capped |
| **Low ticket** (Raju) | Your median bill is < 70% of nearby shops' median | ₹5 back when the bill reaches the nearby median |
| **Cash gap** (Sharma) | Festival 0–45 days away and extra stock needed > 2 weeks of margin | Partner loan, **rounded up** to ₹5,000 |

"Nearby" = the same shop category within 1.5 km. Ranked by expected ₹ value.

**The 74 vs 17 question:** 18 customers were planted as moving to the rival. The detector reports 17 because
one of them paid at the rival only once in the window, and the rule needs 2 visits to count as "moved".
That's the rule being conservative, not a bug.

## 5. The AI layer (`llm.py`)

1. **Input:** a JSON of shop, today's figures, and each detector's evidence, plus ready-formatted strings
   (`₹83,423`, `2 PM–5 PM`). The model never sees raw payments and never does arithmetic.
2. **Call:** `client.models.generate_content(model, contents, config)` with a system prompt,
   `temperature=0.3`, `response_mime_type="application/json"` and `response_schema=CardSet`.
   This is **structured output**: Gemini must return exactly our Pydantic shape.
3. **Models tried in order:** `gemini-3.8-flash` → `gemini-flash-latest` → `gemini-3.6-flash`. Flash = fast
   and cheap. "Lite" models were dropped because their Hindi was poor.
4. **Grounding check:** a regex pulls every number out of every sentence. If any number isn't in the evidence,
   the **whole card set is rejected** and templates are used instead.
5. **Button labels are never AI-written.** A button must say exactly what it does.
6. **Fallback chain:** n8n webhook → Gemini → Claude → **templates** (hand-written Hindi/English, always work).
7. **Cache:** key = SHA-256 of (prompt + evidence). The same evidence returns the saved text instantly, which covers free-tier
   limits and slow networks during a live demo.
8. **Prompt rules:** only use given numbers, never name a competitor, no financial advice, spoken Hindi in
   Devanagari, word limits per field.

## 6. What is real and what is simulated (know this cold)

| Real (working code) | Simulated |
|---|---|
| Detectors, all maths, provenance, masking | **The payment data** (generated, shaped like a Paytm ledger) |
| Gemini text generation + grounding checker | **Customer responses in fast-forward**: assumed rates of 46% (offer group) vs 13% (control) returning, 1–3 visits each |
| Random 20% holdout, the measurement maths | Sending offers and notifications (shown on a mock customer phone) |
| Loan maths, disclosures, consent gate | The lending partner ("Demo Partner NBFC"), with no real application |
| TTS voice | The Soundbox hardware (a browser mock-up) |

The **forecast numbers** use stated assumptions: a win-back brings back 30% of at-risk spend; festival
uplift is 35% for kiranas.

## 7. Questions a judge may ask

### Architecture
**Why not let the LLM analyse the data directly?**
LLMs are bad at arithmetic, and one wrong rupee figure destroys a shopkeeper's trust. Detectors are
deterministic and testable. The LLM only explains and translates, and even that gets checked.

**What stops the LLM from hallucinating?**
Three things: it only gets pre-computed numbers; its output must match a JSON schema; and a checker rejects any
number that isn't in the evidence. Rejected → templates. Button labels are never AI-written.

**Why Gemini Flash?**
Fast, cheap, good at Hindi, and supports structured JSON output. The copy layer is swappable. Claude and an n8n
webhook are already wired in.

**What if the API is down or slow?**
Cached text is served in about 0.3 s, with templates behind it. The demo needs no internet at all.

**Why FastAPI / React?**
FastAPI is Python, which is where pandas lives; it's quick to build and gives typed endpoints. React + Vite for a fast
single-page phone UI. Tailwind to match Paytm's look quickly.

**Where's the database?**
None in the prototype: the world is generated in memory at startup, deterministic from a seed. Production
would run detectors as a nightly batch over Paytm's warehouse (for example Spark/SQL) and store cards per merchant.

### Data science
**How do you define a "regular" and "lapsed"?**
Regular = ≥ 4 visits in the earlier window (days 80 to 21 before today). Lapsed = no visit in the last 21
days. Constants in `sense.py`.

**How do you know they went to the competitor?**
They must have paid at the same other shop, in the same category, at least twice in the lapse window, and at least 10 customers
must show that pattern (k-anonymity), otherwise we don't say it. We report counts and distance, never who.

**Is ₹83,423 a month accurate?**
It's what those 74 customers spent with Sharma over the previous 60 days, scaled to 30 days. It comes straight from the
ledger, and "पेमेंट देखें" shows the rows.

**How do you measure the campaign's effect?**
A randomised controlled trial. The audience is shuffled, 20% held back and 80% get the offer. Effect = difference in
return rate (32.2% − 13.3%). Extra sales = (sales per customer, offer group − sales per customer, control)
× 59 = (₹162.6 − ₹68.1) × 59 = **₹5,576**.

**"₹7 per rupee": is that profit?** *(the sharpest question you might get)*
No, it's **extra sales** per rupee of cashback. At a kirana's ~18% margin, ₹5,576 of sales is about
₹1,000 of profit against ₹840 of cashback: positive, but only slightly. Two honest points: the returning
regulars keep coming after the 14 days (worth ₹83,423 a month in total), and the next version should
report profit, not sales.

**Isn't a 15-person control group too small?**
Yes, and the app says so on screen ("treat as a direction, not proof"). With more shops or repeated
campaigns you pool results. We chose honesty over a bigger number.

**Are the results real?**
The measurement code is real; the 14 days of customer behaviour are simulated with assumed response
rates, because we can't send real offers. Say this openly.

**How is the festival forecast made?**
Average daily sales over the last 28 days × 10 festival days × 35% uplift = extra sales; × (1 − margin)
= extra stock cost. It fires if that is more than 2 weeks of margin. It's simple on purpose; production would use
last year's festival sales for that shop.

**Why simulated data?**
We have no access to real Paytm data (RBI rules, DPDP Act). The simulation has the same columns as a
ledger, and planting known cases lets us prove the detectors find them (74 planted → 74 found).

### Product and business
**How does Paytm earn from this?**
More transactions on Paytm from cashback campaigns, loan distribution fees, and merchant retention and
Soundbox subscription value.

**Who pays for the cashback?**
The merchant, from their own budget, with a hard cap (₹1,480 here). Not a rupee more can go out.

**Why the Soundbox?**
It's already on the counter and already trusted, and it's voice-first for shopkeepers who don't read apps.
The app is for approval and detail.

**What about shopkeepers who don't read?**
The briefing and results are spoken, and the approve flow is one big button. Future: voice replies ("हाँ, भेज दो").

**Privacy and compliance?**
Masked IDs, k-anonymity (≥ 10) for any cross-shop pattern, competitors never named, loan data shared only
after explicit consent, keys in a git-ignored `.env`.

**Loan interest rate / APR?**
1.5% a month flat on ₹65,000 for 60 days (₹1,950) plus a 1% fee (₹650) = ₹67,600, repaid ₹1,127 a day.
Because it's flat and repaid daily, the **effective annual rate is about 60%**. RBI's digital lending rules
require showing an APR in a Key Fact Statement. The prototype doesn't yet. Be ready for this one.

### Scale
**How does it scale to millions of merchants?**
Detectors are group-bys that run as a nightly batch, parallel per merchant. The LLM runs once per merchant per day and only for
shops where something fired; the output is cached. The Soundbox gets one short message a day.

**Cost per merchant?**
One Flash-model call a day, about a thousand tokens in and a few hundred out, so a fraction of a paisa to a
few paise. Say "tiny compared to the cashback" rather than quoting an exact figure.

**What would you build next?**
Voice replies on the Soundbox; real festival history per shop; more plays (stock-outs, UPI
failure rates); pooled measurement across shops; an APR/KFS screen for loans.

## 8. Known weak spots (have an answer ready)

- Fast-forward results are simulated (see section 6).
- The control group is small for one shop.
- The festival forecast is a simple average × uplift.
- Loan pricing is flat, about 60% effective APR, with no APR shown yet.
- The hourly chart compares with the **median** nearby shop, which is only as good as the number of nearby shops (3 salons for Glow).
- The TTS voice depends on the laptop.
- "₹7 per ₹1" is sales, not profit (see section 7).
