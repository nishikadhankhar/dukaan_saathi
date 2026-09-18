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
        daysAgo: (s: string) => s.replace(" days ago", " दिन पहले") },
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
        daysAgo: (s: string) => s },
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
  return hi ? `${inr(e.spend_target)} के बिल पर ${inr(e.cashback)} वापस · ${e.valid_days} दिन`
    : `${inr(e.cashback)} back on bills of ${inr(e.spend_target)} · ${e.valid_days} days`;
}

const ICON_FOR: any = { winback: ["users", C.skyL, C.navy], dead_hours: ["clock", C.skyL, C.navy],
                        low_ticket: ["tag", C.skyL, C.navy], cash_gap: ["loan", "#FFFAEB", "#B54708"] };

export default function MerchantApp({ mid, lang, onSpeak, onNotify, onCampaign, onData }: any) {
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

  useEffect(() => {
    setScreen("home"); setOpp(null); setCamp(null); setResult(null); setApplied(false); setConsent(false);
    api.home(mid, lang).then((d) => { setHome(d); onData?.(d); });
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
  };
  const doForward = async () => {
    setBusy(true);
    const r = await api.fastForward(camp.id, lang);
    setResult(r); setScreen("result"); setBusy(false); onSpeak?.(r.speech);
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
            <Icon name="bell" size={22} color={C.ink} />
            <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#E5F7FE] text-[14px] font-extrabold text-[#002E6E]">{s.name[0]}</div>
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
                <span className="text-[12.5px] font-bold text-[#00A3DB]">{t.history} ›</span>
              </div>
            </Card>

            <Card className="flex justify-between px-2.5 pb-3 pt-3.5">
              {[["soundbox", () => setScreen("soundbox")],
                ["loan", () => { const o = home.opportunities.find((x: any) => x.kind === "loan"); o && openOpp(o.play); }],
                ["tag", null], ["chart", null]].map(([ic, fn]: any, i: number) => (
                <button key={ic} onClick={fn || undefined} className={`flex w-[80px] flex-col items-center gap-[7px] ${fn ? "" : "cursor-default"}`}>
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

            {home.opportunities.map((o: any) => {
              const [ic, bg, fg] = ICON_FOR[o.play] || ICON_FOR.winback;
              return (
                <button key={o.id} onClick={() => openOpp(o.play)}
                  className="block w-full rounded-2xl border border-[#E8EDF3] bg-white px-3.5 pb-3 pt-3.5 text-left transition hover:border-[#9ADCF3]">
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
                  <div className="flex items-center justify-between">
                    {o.kind === "loan" ? <Pill bg="#FFFAEB" fg="#B54708">{t.partnerLoan}</Pill>
                      : <Pill bg="#ECFDF3" fg="#067647">+{inr(o.score)} {t.perMonth}</Pill>}
                    <span className="deva text-[13.5px] font-extrabold text-[#00A3DB]">{o.action_label} ›</span>
                  </div>
                </button>
              );
            })}

            {home.campaigns.length > 0 && (
              <>
                <div className="deva px-0.5 pt-1 text-[14px] font-extrabold">{t.running}</div>
                {home.campaigns.map((c: any) => (
                  <Card key={c.id} className="flex items-center justify-between px-3.5 py-3">
                    <div className="tnum text-[12.5px] font-bold">{c.id} <span className="font-medium text-[#667085]">· {c.sent_to} / {c.held_back}</span></div>
                    <Pill bg={c.status === "done" ? "#ECFDF3" : C.skyL} fg={c.status === "done" ? "#067647" : C.navy}>{c.status}</Pill>
                  </Card>
                ))}
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-[#E8EDF3] bg-white pb-2 pt-2">
            <div className="flex items-center justify-between px-5">
              {[["home", t.nav[0], true], ["clock", t.nav[1]], ["qr", "Scan QR"], ["briefcase", t.nav[2]], ["user", t.nav[3]]].map(([ic, label, on]: any) =>
                ic === "qr" ? (
                  <div key={ic} className="flex flex-col items-center gap-[3px]">
                    <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#00BAF2] shadow-[0_6px_14px_-4px_rgba(0,186,242,.55)]">
                      <Icon name="qr" size={24} color="#fff" />
                    </div>
                    <span className="text-[10px] font-bold text-[#002E6E]">{label}</span>
                  </div>
                ) : (
                  <div key={ic} className="flex flex-col items-center gap-1">
                    <Icon name={ic} size={22} color={on ? C.navy : "#98A2B3"} stroke={on ? 2.2 : 1.8} />
                    <span className={`deva text-[10.5px] ${on ? "font-bold text-[#002E6E]" : "font-semibold text-[#98A2B3]"}`}>{label}</span>
                  </div>
                ))}
            </div>
            <div className="mx-auto mt-2 h-[5px] w-[134px] rounded-full bg-[#101828]" />
          </div>
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
                  {[[t.people, opp.audience_size, C.ink], [t.maxSpend, inr(opp.action.budget_cap), C.ink],
                    [t.estimate, `+${inr(opp.evidence.est_extra_sales_month || opp.evidence.est_extra_sales)}`, "#067647"]].map(([k, v, c]: any) => (
                    <div key={k}><div className="deva text-[10.5px] font-medium text-[#667085]">{k}</div><div className="tnum text-[14.5px] font-extrabold" style={{ color: c }}>{v}</div></div>
                  ))}
                </div>
              </div>
            </div>
            <Footer>
              <div className="flex gap-2.5">
                <button onClick={() => setScreen("home")} className="deva flex-1 rounded-xl border border-[#D0D5DD] bg-white py-3.5 text-[15px] font-bold text-[#344054]">{t.notNow}</button>
                <Primary className="flex-[2]" onClick={() => setConfirm(true)}>{t.approve}</Primary>
              </div>
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
                <div className="deva text-[13px] font-medium text-white/75">{t.extra}</div>
                <div className="tnum text-[34px] font-extrabold leading-tight">{inr(r.incremental_sales)}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="deva tnum text-[13px] text-white/75">{t.spent} {inr(r.spent)}</span>
                  {r.return_per_rupee && <span className="deva tnum rounded-md bg-white/15 px-2 py-0.5 text-[12px] font-bold text-[#7FF0C8]">{t.perRupee(inr(r.return_per_rupee))}</span>}
                </div>
              </div>
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
          `ब्याज ${loan.monthly_rate_pct}% प्रति माह घटते बैलेंस पर, और एक बार ${inr(loan.processing_fee)} फ़ीस।`,
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
                  {[[t.interest, `${loan.monthly_rate_pct}%/${lang === "hi" ? "माह" : "mo"}`], [t.fee, inr(loan.processing_fee)], [t.total, inr(loan.total_repayable)]].map(([k, v]: any) => (
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

      {/* ------------------------------ SHEETS ------------------------------ */}
      {confirm && opp && (
        <div className="absolute inset-0 z-30 flex items-end" onClick={() => setConfirm(false)}>
          <div className="absolute inset-0 bg-[#101828]/45" />
          <div className="relative w-full rounded-t-3xl bg-white px-5 pb-7 pt-2.5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D0D5DD]" />
            <div className="deva mb-3.5 text-[18px] font-extrabold">{t.before}</div>
            {(() => {
              const n = opp.audience_size, hold = Math.max(1, Math.round(n * 0.2));
              return [["users", t.sendTo(n - hold), t.holdout(hold)], ["lock", t.capT(inr(opp.action.budget_cap)), t.capS], ["soundbox", t.sbT, t.sbS]];
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
