# Dukaan Saathi

**An AI business partner for Paytm merchants, delivered through the Soundbox already on the counter.**

Paytm merchants already know what they earned. Nobody tells them what to *do*.
Dukaan Saathi reads a shop's payment history, finds the one thing worth acting on
today, says it out loud in the shopkeeper's language, executes it on one tap, and
then reports back what it actually earned them.

Paytm Build for India AI Hackathon — Merchant Growth AI track. Team **Solo_commit**.

---

## Run it

```bash
./run.sh
```

Then open **http://127.0.0.1:8000 in Chrome** (the Soundbox voice needs Chrome).
First run installs dependencies and builds the interface; after that it starts in seconds.

---

## The demo, in five minutes

1. **Sharma Kirana Store** is selected. Press **आज की रिपोर्ट सुनें** — the Soundbox
   speaks the evening summary in Hindi.
2. The top card reads *"74 पुराने ग्राहक 4 हफ्ते से नहीं आए"* — 74 regulars stopped coming.
3. Tap it. The chart shows those 74 customers' weekly visits falling off a cliff to
   zero. 17 of them now pay at a shop that opened 24 days ago, 197 metres away.
4. Tap **74** — every number opens the actual payment rows behind it.
5. **मंज़ूरी दें** → the confirmation explains that 20% are deliberately held back as a
   control group, and that spending is capped at ₹1,480.
6. The offer lands on the customer phones on the right.
7. **14 दिन आगे बढ़ाएँ** plays the fortnight forward. Results compare the group that got
   the offer against the control group, and the Soundbox announces the outcome.
8. Switch to **Glow Unisex Salon** (empty weekday afternoons) and **Raju Tea Point**
   (bills half the size of nearby stalls). Sharma also has a festival stock loan,
   which routes through a partner lender with disclosures and consent, and is never
   applied for automatically.
9. **Under the hood** shows which detectors fired, what went to the model, what came
   back, and the number check that verifies it.

---

## How it works

```
Synthetic neighbourhood  34 shops · 6,000 customers · 219,000 payments over 90 days
        |
SENSE   sales metrics · comparison with similar shops within 1.5km · lapsed regulars
        · where they now pay (counts only, and only if 10+) · 30-day cash forecast
        -> every number carries a pointer back to its payment rows
        |
THINK   4 detectors in plain Python decide what is worth saying and compute the numbers
        -> the model ranks, explains and translates; it never does arithmetic
        -> a number check rejects any figure not present in the evidence
        |
SPEAK   offer cards in the app · Soundbox voice in Hindi or English
        |
ACT     approve -> budget cap -> 80/20 offer/control split -> offer on customer phones
        -> fast-forward -> results measured against the control group
```

### The detectors

| Play | Fires when | Action |
|---|---|---|
| Win back regulars | 4+ visits in the prior 60 days, none in the last 21 | Cashback to exactly those customers |
| Rival pulling customers | 10+ lapsed regulars now pay at a shop that opened recently nearby | Folded into the win-back card as evidence |
| Empty hours | A block of hours below half the share of nearby shops | Happy-hour discount |
| Small bills | Median bill under 70% of nearby shops | "Spend ₹X, get ₹Y back" |
| Festival stock gap | Extra festival stock costs more than two weeks of margin | Working capital via a partner lender |

### Why the numbers can be trusted

- Detectors compute every figure; the model only writes sentences around them.
- Everything the model writes is scanned, and any number not in the evidence throws
  the whole card away and falls back to a template. Visible in **Under the hood → Model**.
- Nothing that spends money moves without the merchant approving it, under a hard cap.
- Customer movement between shops is reported as counts only, never identities, and
  only above 10 people. Competitors are never named to the merchant.
- Lending is a partner product with terms, fees and consent shown before anything is sent.

---

## What is real and what is simulated

| Real, running code | Simulated |
|---|---|
| Analytics, detectors, shop comparisons | The payment data — no real Paytm data is used |
| Model copy, ranking, Hindi translation | The Soundbox (on screen) |
| Number check, control-group maths, audit log | The offer arriving in a customer's Paytm app |
| Voice output (browser speech) | How customers respond to an offer |
| Loan terms and consent flow | The lending partner |

The world is deterministic — same seed, same shop, same 74 lapsed customers every run.
**Reset demo** rebuilds it.

---

## The AI layer

Three backends, tried in order, so the demo cannot hard-fail on stage:

1. **n8n webhook** — set `N8N_WEBHOOK_URL`, and n8n calls Claude with its own AI credits
2. **Anthropic API** — set `ANTHROPIC_API_KEY`, model `claude-opus-5`
3. **Templates** — always available

```bash
export ANTHROPIC_API_KEY=sk-ant-...     # or
export N8N_WEBHOOK_URL=https://....app.n8n.cloud/webhook/dukaan-copy
./run.sh
```

The header and **Under the hood** always show which backend produced the copy.

### The n8n workflow

Four nodes:

1. **Webhook** (POST, path `dukaan-copy`, respond "Using Respond to Webhook node")
2. **Basic LLM Chain** with an **Anthropic Chat Model** — system message from
   `{{ $json.system }}`, user message from `{{ $json.prompt }}`
3. **Respond to Webhook** — returns the model's JSON

The backend posts `{system, prompt, schema}` and accepts the reply either bare or
wrapped in `output` / `result` / `data` / `json`, with or without a ```json fence.

In production this is also where the nightly run belongs: a Schedule trigger that
sweeps every merchant, generates the morning card and queues the Soundbox briefing.

---

## Layout

```
backend/app/
  world.py   synthetic neighbourhood and the planted scenarios
  sense.py   metrics, shop comparisons, lapsed regulars, forecast, provenance
  plays.py   the detectors and the offers they unlock
  llm.py     copy generation, three backends, number check, templates
  act.py     campaigns, control group, fast-forward, results, loan quote
  main.py    the API
frontend/src/
  App.tsx          the demo stage
  MerchantApp.tsx  the merchant's phone
  Soundbox.tsx     the device, and the voice
  Console.tsx      under the hood
```
