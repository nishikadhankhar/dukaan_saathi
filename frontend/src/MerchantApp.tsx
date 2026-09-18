import React, { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, inr } from "./api";
import { Icon } from "./icons";
import { Hourly } from "./ui";

// Paytm for Business palette
const C = { navy: "#002E6E", sky: "#00BAF2", link: "#00A3DB", skyL: "#E5F7FE", bg: "#F5F7FA",
            line: "#E8EDF3", muted: "#667085", ink: "#101828" };

const L = {
  hi: { collection: "आज का कलेक्शन", pay: "भुगतान", cust: "ग्राहक", bill: "औसत बिल", settle: "Settlement: आज रात 10 बजे",
        history: "History", services: ["साउंडबॉक्स", "लोन", "ऑफर", "रिपोर्ट"], saathi: "दुकान साथी · आज के मौके",
        perMonth: "/ महीना", partnerLoan: "पार्टनर लोन", running: "चल रहे ऑफर", nav: ["होम", "भुगतान", "बिज़नेस", "प्रोफ़ाइल"],
        details: "पूरी जानकारी", offer: "ऑफर", people: "ग्राहक", maxSpend: "अधिकतम खर्च", estimate: "अनुमान / महीना",
        notNow: "अभी नहीं", approve: "मंज़ूरी दें", viewPay: "पेमेंट देखें", visitsOf: (n: number) => `इन ${n} ग्राहकों की हर हफ्ते की विज़िट`,
        rival: "नई दुकान खुली", weeksAgo: "12 हफ्ते पहले", thisWeek: "इस हफ्ते",
        before: "भेजने से पहले", sendTo: (n: number) => `${n} ग्राहकों को ऑफर जाएगा`,
        holdout: (n: number) => `${n} को जानबूझकर नहीं भेजेंगे — ताकि पता चले ऑफर से असल में कितना फ़र्क पड़ा।`,
        capT: (v: string) => `खर्च की सीमा ${v}`, capS: "इससे ज़्यादा एक रुपया भी नहीं कटेगा।",
        sbT: "नतीजा साउंडबॉक्स पर", sbS: "14 दिन बाद साउंडबॉक्स बताएगा कि कितने ग्राहक लौटे और कितनी कमाई हुई।",
        confirm: (v: string) => `मंज़ूरी दें · अधिकतम ${v}`, live: "ऑफर चालू है", sent: "ऑफर भेज दिया",
        reached: (n: number, v: string) => `${n} ग्राहकों के Paytm ऐप में ${v} पहुँच गया`, sentN: "भेजा", control: "कंट्रोल ग्रुप",
        cap: "खर्च की सीमा", preview: "ग्राहक के फ़ोन पर ऐसा दिखेगा", today: "आज", sentStep: "ऑफर भेजा",
        endStep: "ऑफर खत्म होगा", resultStep: "नतीजा साउंडबॉक्स पर", ff: "14 दिन आगे बढ़ाएँ", demo: "डेमो कंट्रोल — अगले दो हफ्ते चलाकर दिखाता है",
        results: "नतीजे · 14 दिन", extra: "ऑफर से अतिरिक्त बिक्री", spent: "खर्च", perRupee: (v: string) => `हर ₹1 पर ${v}`,
        returned: "14 दिन में कितने ग्राहक लौटे", got: "ऑफर मिला", ctrl: "कंट्रोल ग्रुप (ऑफर नहीं)",
        smallNote: "कंट्रोल ग्रुप छोटा है, इसलिए इसे पक्का सबूत नहीं, दिशा मानें।",
        bigNote: "यह नतीजा एक रैंडम कंट्रोल ग्रुप से तुलना करके मापा गया है।",
        announced: "साउंडबॉक्स ने सुनाया", replay: "साउंडबॉक्स पर फिर सुनें", loanT: "त्योहार के लिए लोन",
        forecast: "अगले 30 दिन की अनुमानित बिक्री", lift: (f: string, p: number) => `${f} — बिक्री लगभग ${p}% ज़्यादा`,
        from: (p: string) => `${p} से`, perDay: "/ दिन", fromSettle: (d: number) => `सेटलमेंट से, ${d} दिन`,
        interest: "ब्याज", fee: "फ़ीस", total: "कुल चुकाना", facts: "ज़रूरी बातें",
        consent: "मैं अपनी Paytm बिक्री की जानकारी इस आवेदन के लिए लेंडर से साझा करने की सहमति देता/देती हूँ।",
        apply: "पार्टनर से आवेदन करें", appliedMsg: "आवेदन पार्टनर को भेज दिया। फ़ैसला लेंडर का होगा, Paytm का नहीं। पैसा आने से पहले आपसे हस्ताक्षर माँगे जाएँगे।",
        applied: "आवेदन भेज दिया", sbTitle: "साउंडबॉक्स", linked: "जुड़ा है · डेमो डिवाइस",
        announcedToday: (n: number) => `आज ${n} भुगतान सुनाए`, voice: "दुकान साथी की आवाज़",
        toggles: [["शाम की रिपोर्ट", "रोज़ रात 9 बजे, दिन की बिक्री और एक मौका"], ["नए मौके बताएँ", "जब कोई ज़रूरी बात दिखे"], ["ऑफर के नतीजे", "ऑफर खत्म होने पर कमाई का हिसाब"]],
        recent: "हाल में सुनाया", saathiTag: "शाम की रिपोर्ट · दुकान साथी", payTag: "भुगतान",
        received: (v: string) => `Paytm पर ${v} प्राप्त हुए`, playNow: "आज की रिपोर्ट अभी सुनाएँ",
        proofMasked: (a: number, b: number) => `नाम और नंबर छिपे हैं · ${a} of ${b} दिखा रहे हैं`,
        cols: ["ग्राहक", "विज़िट", "आख़िरी बार", "औसत बिल"], source: "स्रोत: आपके Paytm पेमेंट रिकॉर्ड · यही आँकड़े कार्ड पर दिखे हैं",
        daysAgo: (s: string) => s.replace(" days ago", " दिन पहले"),
        payments: "आज के भुगतान", paymentsSub: (n: number, v: string) => `${n} भुगतान · कुल ${v}`, announce: "सुनाएँ",
        offersT: "ऑफर", noRunning: "अभी कोई ऑफर नहीं चल रहा। नीचे से एक शुरू करें।", suggested: "दुकान साथी के सुझाव",
        statusLive: "चालू", statusDone: "नतीजा तैयार", sentTo: (a: number, b: number) => `${a} को भेजा · ${b} कंट्रोल`,
        reportsT: "रिपोर्ट", last30: "पिछले 30 दिन की बिक्री", week: "इस हफ्ते", vsLast: "पिछले हफ्ते से",
        avgBill: "औसत बिल (30 दिन)", repeatRate: "दोबारा आने वाले ग्राहक", todayPay: "आज के भुगतान", nearbyRepeat: (v: number) => `आसपास ${v}%`,
        speakReport: "रिपोर्ट साउंडबॉक्स पर सुनें",
        qrT: "पेमेंट लें", qrSub: "ग्राहक किसी भी UPI ऐप से स्कैन करें", simulate: "डेमो: ग्राहक ने पेमेंट किया",
        simNote: "साउंडबॉक्स तुरंत रकम बोलेगा", lastPaid: "अभी मिला",
        profitMonth: "मुनाफ़ा / महीना", stLive: "ऑफर चालू · नतीजा 14 दिन में", stTip: "आज़मा रहे हैं",
        stDone: (r: number, a: number) => `${r} लौटे · ${a} अभी भी नहीं आए`, seeStatus: "स्थिति देखें", seeResult: "नतीजा देखें",
        emptyT: "आज कोई नया मौका नहीं",
        emptyS: (run: boolean) => run ? "चल रहे ऑफर का नतीजा 14 दिन में साउंडबॉक्स पर आएगा।" : "दुकान साथी हर रात आपकी बिक्री देखता है। कुछ ज़रूरी दिखा तो साउंडबॉक्स पर बताएगा।",
        estProfit: "अनुमानित मुनाफ़ा / महीना",
        estNote: (v: string, m: number, l: number) => `बिक्री ${v} × ${m}% मार्जिन · मान्यता: कंट्रोल ग्रुप से ${l}% ज़्यादा ग्राहक लौटेंगे`,
        tipNote: (v: string, m: number, k: number) => `बिक्री ${v} × ${m}% मार्जिन · मान्यता: ${k}% ग्राहक combo लेंगे`,
        tipOk: "ठीक है, आज़माऊँगा", tipDone: "बढ़िया। अगले हफ्ते साउंडबॉक्स बताएगा कि बिल बढ़ा या नहीं।",
        tipWhy: "कोई खर्च नहीं। यहाँ कैशबैक देना घाटे का सौदा होता।", noCost: "खर्च",
        profitT: "ऑफर से अतिरिक्त मुनाफ़ा", salesRow: "अतिरिक्त बिक्री", marginRow: (m: number) => `उस पर मुनाफ़ा (${m}% मार्जिन)`,
        cashRow: "कैशबैक खर्च", netRow: "शुद्ध फ़ायदा, 14 दिन में", tentative: "अभी पक्का नहीं",
        perProfit: (v: string) => `हर ₹1 पर ${v} मुनाफ़ा`, expAct: (e: string, a: string) => `अनुमान था ${e} बिक्री · असल में ${a}`,
        example: "उदाहरण", audienceOf: (a: number, b: number) => `${a} + ${b} कंट्रोल`,
        noLoanT: "अभी लोन की ज़रूरत नहीं", noLoanS: "आपकी बिक्री और स्टॉक का हिसाब ठीक है। त्योहार या बड़े ऑर्डर से पहले पैसे कम पड़ते दिखे तो दुकान साथी साउंडबॉक्स पर बताएगा।",
        profileT: "प्रोफ़ाइल", shopId: "मर्चेंट ID", type: "दुकान का प्रकार", language: "भाषा", soundboxRow: "साउंडबॉक्स सेटिंग",
        dataNote: "यह डेमो दुकान है। आँकड़े सिम्युलेटेड हैं, पर ढाँचा असली Paytm पेमेंट रिकॉर्ड जैसा है।",
        cat: { kirana: "किराना", salon: "सैलून", chai: "चाय की दुकान", pharmacy: "मेडिकल", restaurant: "रेस्टोरेंट" } as any },
  en: { collection: "Today's collection", pay: "payments", cust: "customers", bill: "avg bill", settle: "Settlement: tonight, 10 PM",
        history: "History", services: ["Soundbox", "Loans", "Offers", "Reports"], saathi: "Dukaan Saathi · today's opportunities",
        perMonth: "/ month", partnerLoan: "partner loan", running: "Running offers", nav: ["Home", "Payments", "Business", "Profile"],
        details: "Details", offer: "The offer", people: "Customers", maxSpend: "Max spend", estimate: "Est. / month",
        notNow: "Not now", approve: "Approve", viewPay: "View payments", visitsOf: (n: number) => `Weekly visits from these ${n} customers`,
        rival: "New shop opened", weeksAgo: "12 weeks ago", thisWeek: "This week",
        before: "Before this goes out", sendTo: (n: number) => `The offer goes to ${n} customers`,
        holdout: (n: number) => `${n} are deliberately held back, so we can measure what the offer really did.`,
        capT: (v: string) => `Spending capped at ${v}`, capS: "Not a rupee more can go out.",
        sbT: "Result on the Soundbox", sbS: "In 14 days the Soundbox announces how many came back and what it earned.",
        confirm: (v: string) => `Approve · ${v} max`, live: "Offer running", sent: "Offer sent",
        reached: (n: number, v: string) => `${v} reached ${n} customers in their Paytm app`, sentN: "sent", control: "control group",
        cap: "spend cap", preview: "What the customer sees", today: "Today", sentStep: "Offer sent",
        endStep: "Offer ends", resultStep: "Result on the Soundbox", ff: "Fast-forward 14 days", demo: "Demo control — plays the next two weeks forward",
        results: "Results · 14 days", extra: "Extra sales from the offer", spent: "Spent", perRupee: (v: string) => `${v} per ₹1`,
        returned: "Customers who came back within 14 days", got: "Got the offer", ctrl: "Control group (no offer)",
        smallNote: "The control group is small, so treat this as directional, not proof.",
        bigNote: "Measured against a randomised control group.",
        announced: "The Soundbox announced", replay: "Play again on the Soundbox", loanT: "Festival stock loan",
        forecast: "Expected sales, next 30 days", lift: (f: string, p: number) => `${f} — sales up about ${p}%`,
        from: (p: string) => `from ${p}`, perDay: "/ day", fromSettle: (d: number) => `from settlements, ${d} days`,
        interest: "Interest", fee: "Fee", total: "Total repayable", facts: "Key facts",
        consent: "I agree to share my Paytm sales data with the lender for this application.",
        apply: "Apply through partner", appliedMsg: "Application sent to the partner. The lender decides, not Paytm. You will be asked to sign before any money moves.",
        applied: "Application sent", sbTitle: "Soundbox", linked: "Connected · demo device",
        announcedToday: (n: number) => `${n} payments announced today`, voice: "Dukaan Saathi voice",
        toggles: [["Evening report", "Every night at 9 — the day's sales and one opportunity"], ["New opportunities", "When something important comes up"], ["Offer results", "What the offer earned, once it ends"]],
        recent: "Recently announced", saathiTag: "Evening report · Dukaan Saathi", payTag: "Payment",
        received: (v: string) => `Received ${v} on Paytm`, playNow: "Play today's report now",
        proofMasked: (a: number, b: number) => `Names and numbers hidden · showing ${a} of ${b}`,
        cols: ["Customer", "Visits", "Last seen", "Avg bill"], source: "Source: your Paytm payment records — the same figures shown on the card",
        daysAgo: (s: string) => s,
        payments: "Today's payments", paymentsSub: (n: number, v: string) => `${n} payments · ${v} total`, announce: "Announce",
        offersT: "Offers", noRunning: "No offer running yet. Start one below.", suggested: "Suggested by Dukaan Saathi",
        statusLive: "Running", statusDone: "Result ready", sentTo: (a: number, b: number) => `sent to ${a} · ${b} control`,
        reportsT: "Reports", last30: "Sales, last 30 days", week: "This week", vsLast: "vs last week",
        avgBill: "Avg bill (30 days)", repeatRate: "Repeat customers", todayPay: "Payments today", nearbyRepeat: (v: number) => `nearby ${v}%`,
        speakReport: "Play report on the Soundbox",
        qrT: "Receive payment", qrSub: "Customers scan with any UPI app", simulate: "Demo: a customer pays",
        simNote: "The Soundbox announces the amount instantly", lastPaid: "Just received",
        profitMonth: "profit / month", stLive: "Offer running · result in 14 days", stTip: "Trying it",
        stDone: (r: number, a: number) => `${r} came back · ${a} still away`, seeStatus: "See status", seeResult: "See result",
        emptyT: "No new opportunities today",
        emptyS: (run: boolean) => run ? "The running offer's result reaches the Soundbox in 14 days." : "Dukaan Saathi checks your sales every night and will speak up on the Soundbox when something matters.",
        estProfit: "Est. profit / month",
        estNote: (v: string, m: number, l: number) => `sales ${v} × ${m}% margin · assumes ${l}% more come back than in the control group`,
        tipNote: (v: string, m: number, k: number) => `sales ${v} × ${m}% margin · assumes ${k}% of customers take the combo`,
        tipOk: "OK, I'll try it", tipDone: "Great. Next week the Soundbox will tell you whether bills went up.",
        tipWhy: "No cost. A cashback here would lose money.", noCost: "Cost",
        profitT: "Extra profit from the offer", salesRow: "Extra sales", marginRow: (m: number) => `Profit on that (${m}% margin)`,
        cashRow: "Cashback spent", netRow: "Net gain, 14 days", tentative: "not yet certain",
        perProfit: (v: string) => `${v} profit per ₹1`, expAct: (e: string, a: string) => `Forecast ${e} of sales · actual ${a}`,
        example: "Example", audienceOf: (a: number, b: number) => `${a} + ${b} control`,
        noLoanT: "No loan needed right now", noLoanS: "Your sales cover your stock. If a festival or big order looks likely to leave you short, Dukaan Saathi will say so on the Soundbox.",
        profileT: "Profile", shopId: "Merchant ID", type: "Shop type", language: "Language", soundboxRow: "Soundbox settings",
        dataNote: "This is a demo shop. The figures are simulated but shaped exactly like Paytm payment records.",
        cat: { kirana: "Kirana", salon: "Salon", chai: "Tea stall", pharmacy: "Pharmacy", restaurant: "Restaurant" } as any },
};

const h12 = (h: number) => (h % 12) || 12;

function tiles(play: string, e: any, lang: string) {
  const hi = lang === "hi";
  if (play === "winback") return [
    [e.lapsed_regulars, hi ? "नियमित ग्राहक जो रुक गए" : "regulars who stopped", "lapsed_regulars"],
    [inr(e.monthly_value_at_risk), hi ? "हर महीने की खरीद खतरे में" : "monthly spend at risk"],
    e.moved_to_new_shop
      ? [e.moved_to_new_shop, hi ? `अब ${e.new_shop_distance_m} मी. दूर नई दुकान पर` : `now at a new shop ${e.new_shop_distance_m}m away`]
      : [e.weeks_since_last_visit, hi ? "हफ्ते से नहीं आए" : "weeks since last visit"],
    [`${e.your_repeat_rate_pct}%`, hi ? `आपका रिपीट रेट · आसपास ${e.nearby_repeat_rate_pct}%` : `your repeat rate · nearby ${e.nearby_repeat_rate_pct}%`],
  ];
  if (play === "dead_hours") return [
    [`${e.your_share_pct}%`, hi ? `${h12(e.quiet_from_hour)}–${h12(e.quiet_to_hour)} बजे आपकी बिक्री` : `your sales, ${h12(e.quiet_from_hour)}–${h12(e.quiet_to_hour)} PM`, "your_share_pct"],
    [`${e.nearby_share_pct}%`, hi ? `आसपास की ${e.nearby_shops_compared} दुकानों में` : `at ${e.nearby_shops_compared} nearby shops`],
    [inr(e.weekly_potential), hi ? "हर हफ्ते संभव" : "possible per week"],
    [e.regular_customers, hi ? "नियमित ग्राहक" : "regular customers"],
  ];
  return [
    [inr(e.your_median_bill), hi ? "आपका औसत बिल" : "your median bill", "your_median_bill"],
    [inr(e.nearby_median_bill), hi ? `आसपास की ${e.nearby_shops_compared} दुकानें` : `${e.nearby_shops_compared} shops nearby`],
    [e.regular_customers, hi ? "नियमित ग्राहक" : "regular customers"],
    [inr(e.spend_target), hi ? "सुझाया टारगेट" : "suggested target"],
  ];
}

function offerLine(play: string, e: any, lang: string) {
  const hi = lang === "hi";
  if (play === "winback") return hi ? `${inr(e.min_bill)} या ज़्यादा के बिल पर ${inr(e.cashback)} कैशबैक · ${e.valid_days} दिन`
    : `${inr(e.cashback)} cashback on bills of ${inr(e.min_bill)} or more · ${e.valid_days} days`;
  if (play === "dead_hours") return hi ? `${h12(e.quiet_from_hour)}–${h12(e.quiet_to_hour)} बजे ${e.discount_pct}% छूट, ${inr(e.max_discount)} तक · ${e.valid_days} दिन`
    : `${e.discount_pct}% off, ${h12(e.quiet_from_hour)}–${h12(e.quiet_to_hour)} PM, up to ${inr(e.max_discount)} · ${e.valid_days} days`;
  if (!e.cashback) return hi ? `${inr(e.spend_target)} का combo, जैसे चाय + बिस्कुट · कोई कैशबैक नहीं`
    : `A ${inr(e.spend_target)} combo, like tea + biscuit · no cashback`;
  return hi ? `${inr(e.spend_target)} के बिल पर ${inr(e.cashback)} वापस · ${e.valid_days} दिन`
    : `${inr(e.cashback)} back on bills of ${inr(e.spend_target)} · ${e.valid_days} days`;
}

const ICON_FOR: any = { winback: ["users", C.skyL, C.navy], dead_hours: ["clock", C.skyL, C.navy],
                        low_ticket: ["tag", C.skyL, C.navy], cash_gap: ["loan", "#FFFAEB", "#B54708"] };

export default function MerchantApp({ mid, lang, onSpeak, onNotify, onCampaign, onData, onLang }: any) {
  const t = L[lang];
  const [home, setHome] = useState<any>(null);
  const [screen, setScreen] = useState("home");
  const [opp, setOpp] = useState<any>(null);
  const [camp, setCamp] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loan, setLoan] = useState<any>(null);
  const [consent, setConsent] = useState(false);
  const [applied, setApplied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [prov, setProv] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [toggles, setToggles] = useState([true, true, true]);
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [paid, setPaid] = useState<any>(null);

  useEffect(() => {
    setScreen("home"); setOpp(null); setCamp(null); setResult(null); setApplied(false); setConsent(false);
    api.home(mid, lang).then((d) => {
      setHome(d); onData?.(d);
      const last = d.campaigns[d.campaigns.length - 1];   // this shop's own offers only
      if (last) api.campaign(last.id).then((c) => onNotify?.(c.notifications)); else onNotify?.([]);
    });
    api.recent(mid).then(setRecent);
  }, [mid, lang]);

  if (!home) return <div className="grid h-full place-items-center text-[12px] font-semibold text-[#98A2B3]">Loading…</div>;
  const s = home.summary;

  const openOpp = async (play: string) => {
    const d = await api.opportunity(mid, play, lang);
    setOpp(d);
    if (d.kind === "loan") { setLoan(await api.loan(mid)); setScreen("loan"); } else setScreen("detail");
  };
  const doApprove = async () => {
    setBusy(true);
    const r = await api.approve(mid, opp.play);
    setCamp(r.campaign); setNotes(r.notifications); onCampaign?.(r.campaign); onNotify?.(r.notifications);
    setConfirm(false); setScreen("sent"); setBusy(false);
    api.home(mid, lang).then(setHome);
  };
  const go = (sc: string) => {
    setScreen(sc);
    if (sc === "payments" && !payments.length) api.recent(mid, 40).then(setPayments);
  };
  const openCampaign = async (c: any) => {
    if (camp?.id === c.id) { setScreen(result ? "result" : "sent"); return; }
    const d = await api.campaign(c.id);
    setCamp(d.campaign); setNotes(d.notifications);
    if (d.campaign.status === "done") { setResult(await api.fastForward(c.id, lang)); setScreen("result"); }
    else { setResult(null); setScreen("sent"); }
  };
  const simulatePay = () => {
    const pool = [20, 45, 60, 85, 110, 140, 180, 230, 260, 320, 450];
    const amount = pool[Math.floor(Math.random() * pool.length)];
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setPaid({ amount, time });
    setRecent((r) => [{ time, amount }, ...r]);
    setPayments((r) => (r.length ? [{ time, amount }, ...r] : r));
    onSpeak?.(t.received(inr(amount)));
  };
  const doForward = async () => {
    setBusy(true);
    const r = await api.fastForward(camp.id, lang);
    setResult(r); setScreen("result"); setBusy(false); onSpeak?.(r.speech);
    api.home(mid, lang).then(setHome);
  };

  // ---------- shared chrome ----------
  const Status = () => (
    <div className="flex h-[40px] shrink-0 items-end justify-between bg-white px-7 pb-1 text-[13px] font-bold text-[#101828]">
      <span className="tnum">9:41</span>
      <div className="flex items-center gap-[5px]">
        {[5, 7, 9, 11].map((h) => <div key={h} className="w-[3px] rounded-[1px] bg-[#101828]" style={{ height: h }} />)}
        <div className="ml-1 h-[11px] w-[22px] rounded-[3px] border border-[#101828]" />
      </div>
    </div>
  );
  const Bar = ({ title }: any) => (
    <div className="flex shrink-0 items-center gap-3 border-b border-[#EEF2F6] bg-white px-3 pb-3 pt-1.5">
      <button onClick={() => setScreen("home")} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F2F4F7]">
        <Icon name="back" size={21} stroke={2.2} color={C.ink} />
      </button>
      <div className="deva text-[16px] font-bold text-[#101828]">{title}</div>
    </div>
  );
  const Card = ({ className = "", children, style }: any) => (
    <div className={`rounded-2xl border border-[#E8EDF3] bg-white ${className}`} style={style}>{children}</div>
  );
  const Primary = ({ children, className = "", ...p }: any) => (
    <button {...p} className={`deva flex w-full items-center justify-center gap-2 rounded-xl bg-[#00BAF2] py-3.5 text-[15px] font-bold text-white transition hover:brightness-105 active:scale-[.99] disabled:opacity-40 ${className}`}>{children}</button>
  );
  const Footer = ({ children }: any) => (
    <div className="shrink-0 border-t border-[#EEF2F6] bg-white px-4 pb-6 pt-3">{children}</div>
  );
  const Pill = ({ bg, fg, children }: any) => (
    <span className="deva tnum rounded-md px-2 py-0.5 text-[11px] font-extrabold" style={{ background: bg, color: fg }}>{children}</span>
  );

  const Nav = () => (
    <div className="shrink-0 border-t border-[#E8EDF3] bg-white pb-2 pt-2">
      <div className="flex items-center justify-between px-5">
        {[["home", t.nav[0], "home"], ["clock", t.nav[1], "payments"], ["qr", "Scan QR", "qr"], ["briefcase", t.nav[2], "reports"], ["user", t.nav[3], "profile"]].map(([ic, label, sc]: any) => {
          const on = screen === sc;
          return ic === "qr" ? (
            <button key={ic} onClick={() => go(sc)} className="flex flex-col items-center gap-[3px]">
              <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#00BAF2] shadow-[0_6px_14px_-4px_rgba(0,186,242,.55)]">
                <Icon name="qr" size={24} color="#fff" />
              </div>
              <span className="text-[10px] font-bold text-[#002E6E]">{label}</span>
            </button>
          ) : (
            <button key={ic} onClick={() => go(sc)} className="flex w-[52px] flex-col items-center gap-1">
              <Icon name={ic} size={22} color={on ? C.navy : "#98A2B3"} stroke={on ? 2.2 : 1.8} />
              <span className={`deva text-[10.5px] ${on ? "font-bold text-[#002E6E]" : "font-semibold text-[#98A2B3]"}`}>{label}</span>
            </button>
          );
        })}
      </div>
      <div className="mx-auto mt-2 h-[5px] w-[134px] rounded-full bg-[#101828]" />
    </div>
  );
  const CampRow = ({ c }: any) => {
    const o = home.opportunities.find((x: any) => x.play === c.play);
    const [ic] = ICON_FOR[c.play] || ICON_FOR.winback;
    const done = c.status === "done" || (camp?.id === c.id && result);
    return (
      <button onClick={() => openCampaign(c)} className="flex w-full items-center gap-2.5 rounded-2xl border border-[#E8EDF3] bg-white px-3.5 py-3 text-left hover:border-[#9ADCF3]">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#E5F7FE]"><Icon name={ic} size={18} color={C.navy} /></div>
        <div className="min-w-0 flex-1">
          <div className="deva truncate text-[13.5px] font-bold">{o?.action_label || c.play}</div>
          <div className="deva tnum text-[11.5px] font-medium text-[#667085]">{t.sentTo(c.sent_to, c.held_back)}</div>
        </div>
        <Pill bg={done ? "#ECFDF3" : C.skyL} fg={done ? "#067647" : C.navy}>{done ? t.statusDone : t.statusLive}</Pill>
      </button>
    );
  };
  const Row = ({ label, value, onClick }: any) => (
    <button onClick={onClick} disabled={!onClick} className="flex w-full items-center justify-between px-3.5 py-3 text-left">
      <span className="deva text-[13.5px] font-semibold text-[#344054]">{label}</span>
      <span className="deva flex items-center gap-1 text-[13px] font-bold text-[#101828]">{value}{onClick && <Icon name="chevron" size={16} color="#98A2B3" />}</span>
    </button>
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#F5F7FA] text-[#101828]">
      <Status />

      {/* ------------------------------ HOME ------------------------------ */}
      {screen === "home" && (
        <>
          <div className="flex shrink-0 items-center gap-2.5 bg-white px-4 pb-3 pt-1">
            <div className="flex-1 leading-none">
              <div className="text-[22px] font-extrabold tracking-[-0.03em]"><span className="text-[#002E6E]">pay</span><span className="text-[#00BAF2]">tm</span></div>
              <div className="mt-0.5 text-[10.5px] font-semibold text-[#667085]">for Business</div>
            </div>
            <button onClick={() => go("soundbox")} className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-[#F2F4F7]">
              <Icon name="bell" size={22} color={C.ink} />
              <span className="absolute right-[7px] top-[6px] h-2 w-2 rounded-full border border-white bg-[#F04438]" />
            </button>
            <button onClick={() => go("profile")} className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#E5F7FE] text-[14px] font-extrabold text-[#002E6E]">{s.name[0]}</button>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto px-4 pb-4 pt-3 no-scrollbar">
            <Card className="px-4 pb-3.5 pt-4">
              <div className="deva text-[12.5px] font-semibold text-[#667085]">{t.collection} · {s.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="tnum text-[31px] font-extrabold leading-none tracking-[-0.02em] text-[#002E6E]">{inr(s.today_gmv)}</div>
                <Pill bg={s.change_pct >= 0 ? "#ECFDF3" : "#FEF3F2"} fg={s.change_pct >= 0 ? "#067647" : "#B42318"}>
                  {s.change_pct >= 0 ? "▲" : "▼"} {Math.abs(s.change_pct)}%
                </Pill>
              </div>
              <div className="deva tnum mt-1.5 text-[12.5px] font-medium text-[#667085]">
                {s.today_txns} {t.pay} · {s.today_customers} {t.cust} · {t.bill} {inr(s.avg_bill)}
              </div>
              <div className="my-3 h-px bg-[#EEF2F6]" />
              <div className="flex items-center justify-between">
                <span className="deva text-[12px] font-medium text-[#667085]">{t.settle}</span>
                <button onClick={() => go("payments")} className="text-[12.5px] font-bold text-[#00A3DB]">{t.history} ›</button>
              </div>
            </Card>

            <Card className="flex justify-between px-2.5 pb-3 pt-3.5">
              {[["soundbox", () => setScreen("soundbox")],
                ["loan", () => { const o = home.opportunities.find((x: any) => x.kind === "loan"); o ? openOpp(o.play) : go("noloan"); }],
                ["tag", () => go("offers")], ["chart", () => go("reports")]].map(([ic, fn]: any, i: number) => (
                <button key={ic} onClick={fn} className="flex w-[80px] flex-col items-center gap-[7px]">
                  <div className="relative grid h-[50px] w-[50px] place-items-center rounded-[14px] bg-[#E5F7FE]">
                    <Icon name={ic} size={24} color={C.navy} stroke={1.8} />
                    {i === 0 && <span className="absolute -right-0.5 -top-0.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-[#12B76A]" />}
                  </div>
                  <span className="deva text-[12px] font-semibold text-[#344054]">{t.services[i]}</span>
                </button>
              ))}
            </Card>

            <div className="flex items-center gap-2 px-0.5 pt-1">
              <div className="grid h-6 w-6 place-items-center rounded-[7px] bg-[#002E6E]"><Icon name="sparkle" size={14} color="#fff" stroke={2.2} /></div>
              <div className="deva flex-1 text-[15px] font-extrabold">{t.saathi}</div>
              <Pill bg={C.skyL} fg={C.navy}>{home.opportunities.length}</Pill>
            </div>

            {!home.opportunities.some((o: any) => !o.state) && (
              <Card className="flex gap-3 px-3.5 py-3.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ECFDF3]"><Icon name="check" size={18} color="#12B76A" stroke={2.6} /></div>
                <div><div className="deva text-[14.5px] font-bold">{t.emptyT}</div>
                  <div className="deva mt-0.5 text-[12.5px] leading-[17px] text-[#667085]">{t.emptyS(home.opportunities.some((o: any) => o.state?.status === "live"))}</div></div>
              </Card>
            )}

            {[...home.opportunities].sort((a: any, b: any) => (a.state ? 1 : 0) - (b.state ? 1 : 0)).map((o: any) => {
              const [ic, bg, fg] = ICON_FOR[o.play] || ICON_FOR.winback;
              const st = o.state;
              return (
                <button key={o.id} onClick={() => (st?.id ? openCampaign({ id: st.id }) : openOpp(o.play))}
                  className={`block w-full rounded-2xl border border-[#E8EDF3] bg-white px-3.5 pb-3 pt-3.5 text-left transition hover:border-[#9ADCF3] ${st ? "opacity-80" : ""}`}>
                  <div className="flex gap-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: bg }}>
                      <Icon name={ic} size={19} color={fg} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="deva text-[15px] font-bold leading-[20px]">{o.headline}</div>
                      <div className="deva mt-0.5 line-clamp-2 text-[12.5px] leading-[17px] text-[#667085]">{o.why}</div>
                    </div>
                  </div>
                  <div className="my-2.5 h-px bg-[#EEF2F6]" />
                  <div className="flex items-center justify-between gap-2">
                    {st ? (
                      <>
                        <Pill bg={st.status === "done" ? "#ECFDF3" : C.skyL} fg={st.status === "done" ? "#067647" : C.navy}>
                          {st.status === "done" ? t.stDone(st.returned, st.still_away) : st.status === "tip" ? t.stTip : t.stLive}
                        </Pill>
                        {st.id && <span className="deva shrink-0 text-[13px] font-extrabold text-[#00A3DB]">{st.status === "done" ? t.seeResult : t.seeStatus} ›</span>}
                      </>
                    ) : (
                      <>
                        {o.kind === "loan" ? <Pill bg="#FFFAEB" fg="#B54708">APR {o.evidence.apr_pct}% · {t.partnerLoan}</Pill>
                          : <Pill bg="#ECFDF3" fg="#067647">+{inr(o.evidence.est_extra_profit_month)} {t.profitMonth}</Pill>}
                        <span className="deva shrink-0 text-[13.5px] font-extrabold text-[#00A3DB]">{o.action_label} ›</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}

          </div>

          <Nav />
        </>
      )}

      {/* ------------------------------ EVIDENCE ------------------------------ */}
      {screen === "detail" && opp && (() => {
        const w = opp.charts.weekly_customers;
        const drop = w ? w.findIndex((d: any, i: number) => i > 0 && d.these_customers === 0 && w[i - 1].these_customers > 0) : -1;
        return (
          <>
            <Bar title={t.details} />
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar">
              <div className="deva text-[21px] font-extrabold leading-[27px]">{opp.headline}</div>
              <div className="deva text-[13.5px] leading-[20px] text-[#475467]">{opp.why}</div>

              <Card className="px-3.5 pb-3 pt-3.5">
                {opp.play === "winback" && (
                  <>
                    <div className="deva mb-2 text-[13px] font-bold text-[#344054]">{t.visitsOf(opp.evidence.lapsed_regulars)}</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={w} margin={{ top: 6, right: 4, bottom: 0, left: -30 }}>
                        <defs><linearGradient id="skyfade" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.sky} stopOpacity={0.25} /><stop offset="100%" stopColor={C.sky} stopOpacity={0} />
                        </linearGradient></defs>
                        <CartesianGrid stroke="#EEF2F6" vertical={false} />
                        <XAxis dataKey="week" hide />
                        <YAxis tick={{ fontSize: 10, fill: "#98A2B3" }} axisLine={false} tickLine={false} width={34} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                        {drop > 0 && opp.evidence.moved_to_new_shop && (
                          <ReferenceLine x={w[drop].week} stroke="#F79009" strokeWidth={1.5}
                            label={{ value: t.rival, position: "insideTopLeft", fill: "#B54708", fontSize: 10.5, fontWeight: 700 }} />
                        )}
                        <Area type="linear" dataKey="these_customers" stroke={C.navy} strokeWidth={2.5} fill="url(#skyfade)" name="visits" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="deva flex justify-between text-[10px] font-medium text-[#98A2B3]"><span>{t.weeksAgo}</span><span>{t.thisWeek}</span></div>
                  </>
                )}
                {opp.play === "dead_hours" && <Hourly data={opp.charts.hourly} />}
                {opp.play === "low_ticket" && (
                  <div className="space-y-3 py-1">
                    {opp.charts.ticket.map((d: any, i: number) => (
                      <div key={i}>
                        <div className="deva mb-1 flex justify-between text-[12.5px]"><span className="font-semibold text-[#475467]">{i === 0 ? (lang === "hi" ? "आप" : "You") : (lang === "hi" ? "आसपास की दुकानें" : "Nearby shops")}</span><b className="tnum">{inr(d.value)}</b></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF2F6]"><div className="h-full rounded-full" style={{ width: `${d.value / Math.max(...opp.charts.ticket.map((x: any) => x.value)) * 100}%`, background: i === 0 ? C.navy : "#98A2B3" }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-2 gap-2">
                {tiles(opp.play, opp.evidence, lang).map(([big, label, provKey]: any, i: number) => {
                  const ref = provKey && opp.provenance?.[provKey];
                  return (
                    <button key={i} disabled={!ref} onClick={async () => ref && setProv(await api.provenance(ref))}
                      className={`rounded-xl border px-3 py-2.5 text-left ${ref ? "border-[#9ADCF3] bg-[#F0FAFE] hover:border-[#00BAF2]" : "border-[#E8EDF3] bg-white"}`}>
                      <div className="tnum text-[19px] font-extrabold text-[#002E6E]">{big}</div>
                      <div className="deva text-[11.5px] font-medium leading-[15px] text-[#667085]">{label}</div>
                      {ref && <div className="deva mt-1 text-[11px] font-bold text-[#00A3DB]">{t.viewPay} ›</div>}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[14px] border border-[#B9E6F7] bg-[#E5F7FE] px-3.5 py-3">
                <div className="deva text-[11px] font-bold text-[#0086B3]">{t.offer}</div>
                <div className="deva mt-1 text-[14px] font-bold">{offerLine(opp.play, opp.evidence, lang)}</div>
                <div className="mt-2.5 flex justify-between">
                  {(opp.kind === "tip"
                    ? [[t.people, opp.evidence.regular_customers, C.ink], [t.noCost, "₹0", C.ink],
                       [t.estProfit, `+${inr(opp.evidence.est_extra_profit_month)}`, "#067647"]]
                    : [[t.people, t.audienceOf(opp.evidence.sent_to, opp.evidence.held_back), C.ink], [t.maxSpend, inr(opp.action.budget_cap), C.ink],
                       [t.estProfit, `+${inr(opp.evidence.est_extra_profit_month)}`, "#067647"]]).map(([k, v, c]: any) => (
                    <div key={k}><div className="deva text-[10.5px] font-medium text-[#667085]">{k}</div><div className="deva tnum text-[14.5px] font-extrabold" style={{ color: c }}>{v}</div></div>
                  ))}
                </div>
                <div className="deva tnum mt-2 text-[10.5px] leading-[14px] text-[#667085]">
                  {opp.kind === "tip"
                    ? t.tipNote(inr(opp.evidence.est_extra_sales_month), opp.evidence.margin_pct, opp.evidence.assumed_takeup_pct)
                    : t.estNote(inr(opp.evidence.est_extra_sales_month), opp.evidence.margin_pct, opp.evidence.assumed_lift_pct)}
                </div>
              </div>
            </div>
            <Footer>
              {opp.state?.status === "tip" ? (
                <div className="deva rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-3 text-[12.5px] leading-[17px] text-[#067647]">{t.tipDone}</div>
              ) : opp.state?.id ? (
                <Primary onClick={() => openCampaign({ id: opp.state.id })}>{opp.state.status === "done" ? t.seeResult : t.seeStatus}</Primary>
              ) : opp.kind === "tip" ? (
                <>
                  <div className="deva mb-2 text-center text-[11.5px] font-medium text-[#667085]">{t.tipWhy}</div>
                  <Primary onClick={async () => { await api.approve(mid, opp.play); setOpp({ ...opp, state: { status: "tip" } }); api.home(mid, lang).then(setHome); }}>{t.tipOk}</Primary>
                </>
              ) : (
                <div className="flex gap-2.5">
                  <button onClick={() => setScreen("home")} className="deva flex-1 rounded-xl border border-[#D0D5DD] bg-white py-3.5 text-[15px] font-bold text-[#344054]">{t.notNow}</button>
                  <Primary className="flex-[2]" onClick={() => setConfirm(true)}>{t.approve}</Primary>
                </div>
              )}
            </Footer>
          </>
        );
      })()}

      {/* ------------------------------ SENT ------------------------------ */}
      {screen === "sent" && camp && (
        <>
          <Bar title={t.live} />
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-5 no-scrollbar">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-[60px] w-[60px] place-items-center rounded-full bg-[#ECFDF3]"><Icon name="check" size={30} color="#12B76A" stroke={2.6} /></div>
              <div className="deva mt-2 text-[20px] font-extrabold">{t.sent}</div>
              <div className="deva mt-0.5 text-[13px] text-[#667085]">{t.reached(camp.sent_to, inr(camp.offer.cashback || camp.offer.discount_pct || 0))}</div>
            </div>
            <Card className="flex justify-between px-6 py-3.5">
              {[[camp.sent_to, t.sentN], [camp.held_back, t.control], [inr(camp.budget_cap), t.cap]].map(([v, k]: any) => (
                <div key={k} className="text-center"><div className="tnum text-[19px] font-extrabold text-[#002E6E]">{v}</div><div className="deva text-[11.5px] font-medium text-[#667085]">{k}</div></div>
              ))}
            </Card>
            {notes[0] && (
              <Card className="space-y-2 bg-[#F9FAFB] p-3.5">
                <div className="deva text-[11.5px] font-bold text-[#667085]">{t.preview}</div>
                <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-[0_4px_12px_-4px_rgba(16,24,40,.12)]">
                  <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-[#002E6E] text-[17px] font-extrabold text-[#00BAF2]">p</div>
                  <div className="deva text-[12.5px] font-semibold leading-snug">{lang === "hi" ? notes[0].text_hi : notes[0].text_en}</div>
                </div>
              </Card>
            )}
            <Card className="space-y-2.5 p-3.5">
              {[[t.today, t.sentStep, true], [lang === "hi" ? `${camp.offer.valid_days} दिन` : `Day ${camp.offer.valid_days}`, t.endStep], [lang === "hi" ? "14 दिन" : "Day 14", t.resultStep]].map(([w, what, on]: any) => (
                <div key={what} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-[#12B76A]" : "bg-[#D0D5DD]"}`} />
                  <span className="deva w-12 text-[12px] font-bold text-[#667085]">{w}</span>
                  <span className={`deva text-[13.5px] ${on ? "font-bold" : "font-medium text-[#475467]"}`}>{what}</span>
                </div>
              ))}
            </Card>
          </div>
          <Footer>
            <button onClick={doForward} disabled={busy}
              className="deva flex w-full items-center justify-center gap-2 rounded-xl bg-[#002E6E] py-3.5 text-[15px] font-bold text-white disabled:opacity-50">
              <Icon name="forward" size={16} color="#fff" /> {busy ? "…" : t.ff}
            </button>
            <div className="deva mt-1.5 text-center text-[11px] font-medium text-[#98A2B3]">{t.demo}</div>
          </Footer>
        </>
      )}

      {/* ------------------------------ RESULTS ------------------------------ */}
      {screen === "result" && result && (() => {
        const r = result.result;
        return (
          <>
            <Bar title={t.results} />
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar">
              <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg,#002E6E,#0067B8)" }}>
                <div className="deva text-[13px] font-medium text-white/75">{t.profitT}</div>
                <div className="tnum text-[32px] font-extrabold leading-tight">{inr(r.extra_profit)}</div>
                {r.profit_per_rupee != null && (
                  <div className="deva tnum mt-1 text-[12px] font-semibold text-white/80">
                    {t.perProfit(`₹${r.profit_per_rupee}`)}{r.small_control && <span className="ml-1.5 rounded bg-white/15 px-1.5 py-px text-[10.5px] font-bold text-[#FEDF89]">{t.tentative}</span>}
                  </div>
                )}
              </div>
              <Card className="divide-y divide-[#EEF2F6] px-3.5">
                {[[t.salesRow, inr(r.incremental_sales), C.ink], [t.marginRow(r.margin_pct), inr(r.extra_profit), C.ink],
                  [t.cashRow, `− ${inr(r.spent)}`, "#B42318"], [t.netRow, `${r.net_gain >= 0 ? "+" : "−"} ${inr(Math.abs(r.net_gain))}`, r.net_gain >= 0 ? "#067647" : "#B42318"]].map(([k, v, c]: any, i: number) => (
                  <div key={k} className={`flex items-center justify-between py-2 ${i === 3 ? "font-extrabold" : ""}`}>
                    <span className="deva text-[12.5px] font-semibold text-[#475467]">{k}</span>
                    <span className="tnum text-[14px] font-bold" style={{ color: c }}>{v}</span>
                  </div>
                ))}
                <div className="deva tnum py-2 text-[11px] font-medium text-[#667085]">{t.expAct(inr(r.expected_sales), inr(r.incremental_sales))}</div>
              </Card>
              <Card className="space-y-3 p-3.5">
                <div className="deva text-[13.5px] font-bold text-[#344054]">{t.returned}</div>
                {[[t.got, r.treatment, C.navy], [t.ctrl, r.holdout, "#98A2B3"]].map(([label, g, color]: any) => (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="deva text-[12.5px] font-semibold text-[#475467]">{label}</span>
                      <span className="tnum"><b className="text-[15px]" style={{ color }}>{g.returned}</b><span className="text-[12px] font-semibold text-[#98A2B3]"> /{g.customers} · {g.return_rate}%</span></span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF2F6]"><div className="h-full rounded-full" style={{ width: `${g.return_rate}%`, background: color }} /></div>
                  </div>
                ))}
              </Card>
              <div className="flex gap-2 rounded-xl border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2.5">
                <Icon name="alert" size={17} color="#B54708" stroke={2.2} className="mt-px shrink-0" />
                <span className="deva text-[12.5px] font-medium leading-[17px] text-[#93370D]">{r.holdout.customers < 30 ? t.smallNote : t.bigNote}</span>
              </div>
              <div className="rounded-2xl border border-[#B9E6F7] bg-[#F0FAFE] p-3.5">
                <div className="deva flex items-center gap-1.5 text-[12px] font-bold text-[#0086B3]"><Icon name="volume" size={16} color="#0086B3" /> {t.announced}</div>
                <div className="deva mt-1.5 text-[13.5px] font-medium leading-[20px]">“{result.speech}”</div>
              </div>
            </div>
            <Footer><Primary onClick={() => onSpeak?.(result.speech)}><Icon name="play" size={14} color="#fff" stroke={2.6} /> {t.replay}</Primary></Footer>
          </>
        );
      })()}

      {/* ------------------------------ LOAN ------------------------------ */}
      {screen === "loan" && loan && opp && (() => {
        const f = opp.charts.forecast, mx = Math.max(...f.map((x: any) => x.sales));
        const facts = lang === "hi" ? [
          `लोन ${loan.partner} देता है। Paytm सिर्फ़ जोड़ता है, लोन देने वाला नहीं।`,
          `ब्याज ${loan.monthly_rate_pct}% प्रति माह, घटते बैलेंस पर (कुल ${inr(loan.interest)})। ${inr(loan.processing_fee)} फ़ीस पहले कटेगी, आपको ${inr(loan.amount_received)} मिलेंगे। APR ${loan.apr_pct}%।`,
          "आपकी सहमति के बिना कुछ नहीं भेजा जाता। पैसा लेंडर की मंज़ूरी के बाद ही आता है।",
        ] : [loan.disclosures[0], loan.disclosures[1], loan.disclosures[3]];
        return (
          <>
            <Bar title={t.loanT} />
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-3.5 no-scrollbar">
              <div className="deva text-[18px] font-extrabold leading-[24px]">{opp.headline}</div>
              <Card className="p-3.5">
                <div className="deva mb-2 text-[12.5px] font-bold text-[#344054]">{t.forecast}</div>
                <div className="flex h-[66px] items-end gap-[2px]">
                  {f.map((d: any, i: number) => <div key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${d.sales / mx * 100}%`, background: d.festival ? "#F79009" : "#D0D5DD" }} />)}
                </div>
                <div className="deva mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-[#667085]">
                  <span className="h-2 w-2 rounded-[2px] bg-[#F79009]" /> {t.lift(lang === "hi" ? "नवरात्रि" : opp.charts.festival_name, opp.evidence.expected_uplift_pct)}
                </div>
              </Card>
              <div className="rounded-2xl border border-[#FEDF89] bg-[#FFFAEB] p-3.5">
                <div className="flex items-center justify-between">
                  <div><div className="tnum text-[28px] font-extrabold leading-tight">{inr(loan.amount)}</div><div className="deva text-[12px] font-semibold text-[#B54708]">{t.from(loan.partner)}</div></div>
                  <div className="text-right"><div className="deva tnum text-[14px] font-extrabold text-[#7A2E0E]">{inr(loan.daily_repayment)} {t.perDay}</div><div className="deva text-[11px] font-medium text-[#93370D]">{t.fromSettle(loan.tenure_days)}</div></div>
                </div>
                <div className="mt-2.5 flex justify-between">
                  {[[t.interest, inr(loan.interest)], [t.fee, inr(loan.processing_fee)], ["APR", `${loan.apr_pct}%`], [t.total, inr(loan.total_repayable)]].map(([k, v]: any) => (
                    <div key={k}><div className="deva text-[11px] font-medium text-[#93370D]">{k}</div><div className="deva tnum text-[13.5px] font-bold text-[#7A2E0E]">{v}</div></div>
                  ))}
                </div>
              </div>
              <Card className="space-y-1.5 p-3.5">
                <div className="deva text-[13px] font-bold">{t.facts}</div>
                {facts.map((x: string, i: number) => (
                  <div key={i} className="flex gap-2"><span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#98A2B3]" /><span className="deva text-[12px] leading-4 text-[#475467]">{x}</span></div>
                ))}
              </Card>
              {applied && <div className="deva rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-3 text-[12px] leading-[17px] text-[#067647]">{t.appliedMsg}</div>}
            </div>
            <Footer>
              <label className="mb-2.5 flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-5 w-5 shrink-0 accent-[#00BAF2]" />
                <span className="deva text-[11.5px] font-medium leading-[15px] text-[#475467]">{t.consent}</span>
              </label>
              <Primary disabled={!consent || applied} onClick={async () => { await api.applyLoan(mid); setApplied(true); }}>
                {applied ? t.applied : t.apply}
              </Primary>
            </Footer>
          </>
        );
      })()}

      {/* ------------------------------ SOUNDBOX (in app) ------------------------------ */}
      {screen === "soundbox" && (
        <>
          <Bar title={t.sbTitle} />
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar">
            <Card className="flex items-center gap-3.5 p-3.5">
              <div className="relative h-[92px] w-[66px] shrink-0 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(#0E3D72,#03203F)" }}>
                <div className="tnum absolute left-2 right-2 top-2 rounded bg-[#03131F] px-1 py-0.5 text-[8.5px] font-extrabold text-[#7FE0FF]">{inr(s.today_gmv)}</div>
                <div className="absolute left-[14px] top-[34px] h-[38px] w-[38px] rounded-full bg-[#0A2137]"
                  style={{ backgroundImage: "radial-gradient(#1E4A74 1.3px, transparent 1.4px)", backgroundSize: "7px 7px" }} />
                <div className="absolute left-[22px] top-[79px] h-[6px] w-[22px] rounded-full bg-[#123F6D]" />
              </div>
              <div className="min-w-0">
                <div className="text-[15.5px] font-extrabold">Paytm Soundbox</div>
                <div className="deva mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#067647]"><span className="h-2 w-2 rounded-full bg-[#12B76A]" />{t.linked}</div>
                <div className="deva tnum mt-1 text-[12px] font-medium text-[#667085]">{t.announcedToday(s.today_txns)}</div>
              </div>
            </Card>

            <Card className="space-y-3 p-3.5">
              <div className="flex items-center gap-2">
                <div className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[#002E6E]"><Icon name="sparkle" size={13} color="#fff" stroke={2.2} /></div>
                <div className="deva text-[14px] font-bold">{t.voice}</div>
              </div>
              {t.toggles.map(([label, sub]: any, i: number) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="flex-1"><div className="deva text-[13.5px] font-semibold">{label}</div><div className="deva text-[11.5px] text-[#667085]">{sub}</div></div>
                  <button onClick={() => setToggles((v) => v.map((x, j) => (j === i ? !x : x)))}
                    className={`relative h-6 w-10 rounded-full transition ${toggles[i] ? "bg-[#00BAF2]" : "bg-[#D0D5DD]"}`}>
                    <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${toggles[i] ? "left-[19px]" : "left-[3px]"}`} />
                  </button>
                </div>
              ))}
            </Card>

            <Card className="space-y-2.5 p-3.5">
              <div className="deva text-[14px] font-bold">{t.recent}</div>
              <div className="flex gap-2.5">
                <button onClick={() => onSpeak?.(home.briefing)} className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#E5F7FE]"><Icon name="play" size={12} color="#0086B3" stroke={2.4} /></button>
                <div><div className="deva text-[11px] font-bold text-[#0086B3]">{t.saathiTag}</div><div className="deva text-[12.5px] font-medium leading-[17px] text-[#344054]">{home.briefing}</div></div>
              </div>
              {recent.slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="flex gap-2.5">
                  <button onClick={() => onSpeak?.(t.received(inr(p.amount)))} className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#F2F4F7]"><Icon name="play" size={12} color="#667085" stroke={2.4} /></button>
                  <div><div className="deva tnum text-[11px] font-bold text-[#98A2B3]">{p.time} · {t.payTag}</div><div className="deva tnum text-[12.5px] font-medium text-[#344054]">{t.received(inr(p.amount))}</div></div>
                </div>
              ))}
            </Card>
          </div>
          <Footer><Primary onClick={() => onSpeak?.(home.briefing)}><Icon name="volume" size={17} color="#fff" stroke={2.2} /> {t.playNow}</Primary></Footer>
        </>
      )}

      {/* ------------------------------ PAYMENTS ------------------------------ */}
      {screen === "payments" && (
        <>
          <Bar title={t.payments} />
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar">
            <Card className="px-4 py-3.5">
              <div className="tnum text-[26px] font-extrabold text-[#002E6E]">{inr(s.today_gmv)}</div>
              <div className="deva tnum text-[12.5px] font-medium text-[#667085]">{t.paymentsSub(s.today_txns, inr(s.today_gmv))}</div>
            </Card>
            <Card className="divide-y divide-[#EEF2F6]">
              {(payments.length ? payments : recent).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ECFDF3]"><Icon name="check" size={16} color="#12B76A" stroke={2.6} /></div>
                  <div className="flex-1"><div className="tnum text-[14px] font-bold">{inr(p.amount)}</div><div className="deva tnum text-[11.5px] text-[#667085]">UPI · {p.time}</div></div>
                  <button onClick={() => onSpeak?.(t.received(inr(p.amount)))} className="deva flex items-center gap-1 rounded-full bg-[#E5F7FE] px-2.5 py-1 text-[11.5px] font-bold text-[#0086B3]">
                    <Icon name="volume" size={13} color="#0086B3" /> {t.announce}</button>
                </div>
              ))}
            </Card>
          </div>
          <Nav />
        </>
      )}

      {/* ------------------------------ OFFERS ------------------------------ */}
      {screen === "offers" && (
        <>
          <Bar title={t.offersT} />
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar">
            <div className="deva px-0.5 text-[14px] font-extrabold">{t.running}</div>
            {home.campaigns.length ? home.campaigns.map((c: any) => <CampRow key={c.id} c={c} />)
              : <Card className="deva px-3.5 py-3 text-[12.5px] text-[#667085]">{t.noRunning}</Card>}
            <div className="deva px-0.5 pt-1 text-[14px] font-extrabold">{t.suggested}</div>
            {home.opportunities.filter((o: any) => o.kind !== "loan" && !o.state).map((o: any) => {
              const [ic, bg, fg] = ICON_FOR[o.play] || ICON_FOR.winback;
              return (
                <button key={o.id} onClick={() => openOpp(o.play)} className="flex w-full items-center gap-2.5 rounded-2xl border border-[#E8EDF3] bg-white px-3.5 py-3 text-left hover:border-[#9ADCF3]">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: bg }}><Icon name={ic} size={18} color={fg} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="deva text-[13.5px] font-bold leading-[18px]">{o.headline}</div>
                    <div className="deva mt-0.5 text-[12px] font-extrabold text-[#00A3DB]">{o.action_label} ›</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ------------------------------ REPORTS ------------------------------ */}
      {screen === "reports" && (
        <>
          <Bar title={t.reportsT} />
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar">
            <Card className="px-3.5 pb-2 pt-3.5">
              <div className="deva text-[12.5px] font-bold text-[#344054]">{t.last30}</div>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={home.series} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                  <defs><linearGradient id="repfade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.sky} stopOpacity={0.3} /><stop offset="100%" stopColor={C.sky} stopOpacity={0} />
                  </linearGradient></defs>
                  <CartesianGrid stroke="#EEF2F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9.5, fill: "#98A2B3" }} axisLine={false} tickLine={false} interval={9} />
                  <YAxis tick={{ fontSize: 9.5, fill: "#98A2B3" }} axisLine={false} tickLine={false} width={46} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: any) => inr(v)} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                  <Area type="monotone" dataKey="gmv" stroke={C.navy} strokeWidth={2} fill="url(#repfade)" name="₹" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <div className="grid grid-cols-2 gap-2">
              {[[inr(s.week_gmv), t.week, `${s.week_change_pct >= 0 ? "▲" : "▼"} ${Math.abs(s.week_change_pct)}% ${t.vsLast}`, s.week_change_pct >= 0],
                [inr(s.avg_bill), t.avgBill, null],
                [`${home.repeat?.you ?? s.repeat_rate}%`, t.repeatRate, home.repeat?.n_shops ? t.nearbyRepeat(home.repeat.cohort) : null],
                [s.today_txns, t.todayPay, null]].map(([big, label, sub, up]: any) => (
                <Card key={label} className="px-3 py-2.5">
                  <div className="tnum text-[19px] font-extrabold text-[#002E6E]">{big}</div>
                  <div className="deva text-[11.5px] font-medium text-[#667085]">{label}</div>
                  {sub && <div className={`deva tnum mt-0.5 text-[11px] font-bold ${up === false ? "text-[#B42318]" : up ? "text-[#067647]" : "text-[#667085]"}`}>{sub}</div>}
                </Card>
              ))}
            </div>
            <Primary onClick={() => onSpeak?.(home.briefing)}><Icon name="volume" size={17} color="#fff" stroke={2.2} /> {t.speakReport}</Primary>
          </div>
          <Nav />
        </>
      )}

      {/* ------------------------------ RECEIVE (QR) ------------------------------ */}
      {screen === "qr" && (
        <>
          <Bar title={t.qrT} />
          <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 pb-4 pt-5 no-scrollbar">
            <div className="w-full rounded-3xl bg-white p-5 text-center shadow-[0_8px_24px_-12px_rgba(16,24,40,.25)]">
              <div className="text-[18px] font-extrabold tracking-[-0.03em]"><span className="text-[#002E6E]">pay</span><span className="text-[#00BAF2]">tm</span></div>
              <div className="deva mt-1 text-[15px] font-bold">{s.name}</div>
              <FakeQR seed={mid} />
              <div className="deva text-[12px] font-medium text-[#667085]">{t.qrSub}</div>
            </div>
            {paid && (
              <div className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-[#ABEFC6] bg-[#ECFDF3] px-3.5 py-3">
                <Icon name="check" size={20} color="#12B76A" stroke={2.6} />
                <div><div className="deva text-[11.5px] font-bold text-[#067647]">{t.lastPaid} · {paid.time}</div><div className="tnum text-[18px] font-extrabold text-[#054F31]">{inr(paid.amount)}</div></div>
              </div>
            )}
          </div>
          <Footer>
            <Primary onClick={simulatePay}><Icon name="soundbox" size={17} color="#fff" stroke={2.2} /> {t.simulate}</Primary>
            <div className="deva mt-1.5 text-center text-[11px] font-medium text-[#98A2B3]">{t.simNote}</div>
          </Footer>
        </>
      )}

      {/* ------------------------------ NO LOAN ------------------------------ */}
      {screen === "noloan" && (
        <>
          <Bar title={t.services[1]} />
          <div className="flex-1 px-4 pt-8 text-center">
            <div className="mx-auto grid h-[60px] w-[60px] place-items-center rounded-full bg-[#ECFDF3]"><Icon name="check" size={30} color="#12B76A" stroke={2.6} /></div>
            <div className="deva mt-3 text-[18px] font-extrabold">{t.noLoanT}</div>
            <div className="deva mx-auto mt-1.5 max-w-[290px] text-[13px] leading-[19px] text-[#667085]">{t.noLoanS}</div>
          </div>
        </>
      )}

      {/* ------------------------------ PROFILE ------------------------------ */}
      {screen === "profile" && (
        <>
          <Bar title={t.profileT} />
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar">
            <Card className="flex items-center gap-3 p-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#E5F7FE] text-[20px] font-extrabold text-[#002E6E]">{s.name[0]}</div>
              <div><div className="text-[16px] font-extrabold">{s.name}</div><div className="deva text-[12px] font-medium text-[#667085]">{t.cat[s.category] || s.category}</div></div>
            </Card>
            <Card className="divide-y divide-[#EEF2F6]">
              <Row label={t.shopId} value={<span className="font-mono">{mid}</span>} />
              <Row label={t.type} value={t.cat[s.category] || s.category} />
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="deva text-[13.5px] font-semibold text-[#344054]">{t.language}</span>
                <div className="flex rounded-full bg-[#F2F4F7] p-0.5">
                  {[["hi", "हिंदी"], ["en", "English"]].map(([k, v]) => (
                    <button key={k} onClick={() => onLang?.(k)} className={`deva rounded-full px-3 py-1 text-[12px] font-bold ${lang === k ? "bg-white text-[#002E6E] shadow-sm" : "text-[#667085]"}`}>{v}</button>
                  ))}
                </div>
              </div>
              <Row label={t.soundboxRow} value={<span className="text-[#067647]">●</span>} onClick={() => go("soundbox")} />
              <Row label={t.offersT} value={home.campaigns.length || ""} onClick={() => go("offers")} />
            </Card>
            <div className="deva flex gap-2 rounded-xl border border-[#E8EDF3] bg-white px-3 py-2.5 text-[11.5px] leading-[16px] text-[#667085]">
              <Icon name="alert" size={16} color="#98A2B3" className="mt-px shrink-0" /> {t.dataNote}
            </div>
          </div>
          <Nav />
        </>
      )}

      {/* ------------------------------ SHEETS ------------------------------ */}
      {confirm && opp && (
        <div className="absolute inset-0 z-30 flex items-end" onClick={() => setConfirm(false)}>
          <div className="absolute inset-0 bg-[#101828]/45" />
          <div className="relative w-full rounded-t-3xl bg-white px-5 pb-7 pt-2.5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D0D5DD]" />
            <div className="deva mb-3.5 text-[18px] font-extrabold">{t.before}</div>
            {(() => {
              const send = opp.evidence.sent_to, hold = opp.evidence.held_back;
              return [["users", t.sendTo(send), t.holdout(hold)], ["lock", t.capT(inr(opp.action.budget_cap)), t.capS], ["soundbox", t.sbT, t.sbS]];
            })().map(([ic, head, sub]: any) => (
              <div key={ic} className="mb-3.5 flex gap-3">
                <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-[#E5F7FE]"><Icon name={ic} size={19} color={C.navy} /></div>
                <div><div className="deva text-[14.5px] font-bold">{head}</div><div className="deva text-[12.5px] leading-[17px] text-[#667085]">{sub}</div></div>
              </div>
            ))}
            <Primary onClick={doApprove} disabled={busy}>{busy ? "…" : t.confirm(inr(opp.action.budget_cap))}</Primary>
          </div>
        </div>
      )}

      {prov && (
        <div className="absolute inset-0 z-30 flex items-end" onClick={() => setProv(null)}>
          <div className="absolute inset-0 bg-[#101828]/45" />
          <div className="relative max-h-[78%] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-6 pt-2.5 no-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D0D5DD]" />
            <div className="deva text-[17px] font-extrabold">{prov.label}</div>
            <div className="deva mt-1 flex items-center gap-1.5 text-[11.5px] font-medium text-[#667085]"><Icon name="lock" size={13} color="#667085" stroke={2.2} /> {t.proofMasked(Math.min(prov.rows.length, 8), prov.count)}</div>
            <div className="deva mt-3 grid grid-cols-[92px_60px_1fr_auto] px-3 text-[10.5px] font-bold text-[#98A2B3]">{t.cols.map((c: string) => <span key={c} className={c === t.cols[3] ? "text-right" : ""}>{c}</span>)}</div>
            <div className="mt-1.5 space-y-1.5">
              {prov.rows.slice(0, 8).map((r: any, i: number) => (
                <div key={i} className="grid grid-cols-[92px_60px_1fr_auto] items-center rounded-[10px] bg-[#F9FAFB] px-3 py-2.5">
                  <span className="font-mono text-[11.5px] text-[#475467]">{r.customer}</span>
                  <b className="tnum text-[13px]">{r.visits ?? "—"}</b>
                  <span className="deva text-[12px] font-medium text-[#667085]">{r.when || t.daysAgo(r.last_seen)}</span>
                  <b className="tnum text-right text-[13px] text-[#002E6E]">{inr(r.amount ?? r.avg_bill)}</b>
                </div>
              ))}
            </div>
            <div className="deva mt-3 text-[11px] font-medium text-[#98A2B3]">{t.source}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A QR-looking pattern for the demo (not a scannable code). */
function FakeQR({ seed }: { seed: string }) {
  const n = 25;
  let x = [...seed].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((x = (x * 1103515245 + 12345) >>> 0) / 4294967296);
  const finder = (r: number, c: number) =>
    [[0, 0], [0, n - 7], [n - 7, 0]].some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
  const cell = (r: number, c: number) => {
    for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      if (r >= fr && r < fr + 7 && c >= fc && c < fc + 7) {
        const i = r - fr, j = c - fc;
        return i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      }
    }
    return rnd() > 0.5;
  };
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const on = cell(r, c);
    if (on) cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={finder(r, c) ? "#002E6E" : "#101828"} />);
  }
  return (
    <div className="relative mx-auto my-4 w-[210px]">
      <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="w-full" shapeRendering="crispEdges">{cells}</svg>
      <div className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border-[3px] border-white bg-[#002E6E] text-[18px] font-extrabold text-[#00BAF2]">p</div>
    </div>
  );
}
