import React, { useEffect, useState } from "react";
import { api, inr } from "./api";
import { Btn, Compare, Forecast, Hourly, Label, Pill, Sheet, Spark, Traceable, WeeklyCustomers } from "./ui";

const T = {
  hi: { today: "आज की बिक्री", customers: "ग्राहक", bill: "औसत बिल", opps: "आज के मौके",
        approve: "मंज़ूरी दें", notNow: "अभी नहीं", running: "चल रहे ऑफर", results: "नतीजे",
        evidence: "सबूत", sent: "ऑफर भेज दिया", ff: "14 दिन आगे बढ़ाएँ", speak: "साउंडबॉक्स पर सुनें",
        control: "कंट्रोल ग्रुप", got: "ऑफर मिला", extra: "अतिरिक्त बिक्री", spent: "खर्च",
        offer: "ऑफर", nav: ["होम", "ऑफर", "रिपोर्ट", "मदद"] },
  en: { today: "Today's sales", customers: "customers", bill: "avg bill", opps: "Today's opportunities",
        approve: "Approve", notNow: "Not now", running: "Running offers", results: "Results",
        evidence: "Evidence", sent: "Offer sent", ff: "Fast-forward 14 days", speak: "Hear on Soundbox",
        control: "Control group", got: "Got the offer", extra: "Extra sales", spent: "Spent",
        offer: "The offer", nav: ["Home", "Offers", "Reports", "Help"] },
};

function evidenceRows(play: string, e: any, prov: any) {
  const P = (k: string) => prov?.[k];
  if (play === "winback")
    return [
      ["Regulars who stopped", e.lapsed_regulars, P("lapsed_regulars")],
      ["Weeks since last visit", e.weeks_since_last_visit],
      ["They used to visit", `${e.visits_per_month_before}/mo`],
      ["Monthly sales at risk", inr(e.monthly_value_at_risk)],
      ...(e.moved_to_new_shop
        ? [["Now at a new shop nearby", `${e.moved_to_new_shop} of them`],
           ["That shop opened", `${e.new_shop_opened_days_ago}d ago · ${e.new_shop_distance_m}m`]]
        : []),
      ["Your repeat rate", `${e.your_repeat_rate_pct}%`],
      [`Nearby (${e.nearby_shops_compared} shops)`, `${e.nearby_repeat_rate_pct}%`],
    ];
  if (play === "dead_hours")
    return [
      ["Your share then", `${e.your_share_pct}%`, P("your_share_pct")],
      [`Nearby (${e.nearby_shops_compared} shops)`, `${e.nearby_share_pct}%`],
      ["Your weekly sales", inr(e.weekly_sales)],
      ["Worth per week", inr(e.weekly_potential)],
      ["Regulars to invite", e.regular_customers],
    ];
  if (play === "low_ticket")
    return [
      ["Your median bill", inr(e.your_median_bill), P("your_median_bill")],
      [`Nearby (${e.nearby_shops_compared} shops)`, inr(e.nearby_median_bill)],
      ["Your regulars", e.regular_customers],
      ["Suggested target", inr(e.spend_target)],
    ];
  return [
    ["Festival starts in", `${e.festival_days_away} days`],
    ["Usual lift", `${e.expected_uplift_pct}% / ${e.festival_window_days}d`],
    ["Extra stock upfront", inr(e.extra_stock_needed)],
    ["Your weekly margin", inr(e.weekly_margin)],
    ["Your daily sales", inr(e.daily_sales), P("daily_sales")],
  ];
}

const StatusBar = () => (
  <div className="flex h-[38px] items-end justify-between px-6 pb-1 text-[11px] font-bold text-[#0b1b33]">
    <span className="tnum">9:41</span>
    <div className="flex items-center gap-1.5">
      <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor"><rect x="0" y="7" width="2.5" height="3" rx=".6"/><rect x="4" y="5" width="2.5" height="5" rx=".6"/><rect x="8" y="2.5" width="2.5" height="7.5" rx=".6"/><rect x="12" y="0" width="2.5" height="10" rx=".6"/></svg>
      <svg width="13" height="10" viewBox="0 0 13 10" fill="currentColor"><path d="M6.5 9.5 0.6 3.3a8.4 8.4 0 0 1 11.8 0L6.5 9.5Z" opacity=".95"/></svg>
      <div className="flex h-[10px] w-[20px] items-center rounded-[3px] border border-[#0b1b33]/40 p-[1.5px]">
        <div className="h-full w-[72%] rounded-[1px] bg-[#0b1b33]" />
      </div>
    </div>
  </div>
);

export default function MerchantApp({ mid, lang, onSpeak, onNotify, onCampaign, onData }: any) {
  const t = T[lang];
  const deva = lang === "hi" ? "deva" : "";
  const [home, setHome] = useState<any>(null);
  const [screen, setScreen] = useState("home");
  const [opp, setOpp] = useState<any>(null);
  const [camp, setCamp] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loan, setLoan] = useState<any>(null);
  const [consent, setConsent] = useState(false);
  const [applied, setApplied] = useState<any>(null);
  const [confirm, setConfirm] = useState(false);
  const [prov, setProv] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setScreen("home"); setOpp(null); setCamp(null); setResult(null); setApplied(null); setConsent(false);
    api.home(mid, lang).then((d) => { setHome(d); onData?.(d); });
  }, [mid, lang]);

  if (!home) return <div className="grid h-full place-items-center text-[12px] font-semibold text-[#8a98ad]">Loading…</div>;
  const s = home.summary;

  const openOpp = async (play: string) => {
    const d = await api.opportunity(mid, play, lang);
    setOpp(d);
    if (d.kind === "loan") { setLoan(await api.loan(mid)); setScreen("loan"); }
    else setScreen("detail");
  };
  const doApprove = async () => {
    setBusy(true);
    const r = await api.approve(mid, opp.play);
    setCamp(r.campaign); onCampaign?.(r.campaign); onNotify?.(r.notifications);
    setConfirm(false); setScreen("sent"); setBusy(false);
  };
  const doForward = async () => {
    setBusy(true);
    const r = await api.fastForward(camp.id, lang);
    setResult(r); setScreen("result"); setBusy(false); onSpeak?.(r.speech);
  };

  const Bar = ({ title, back }: any) => (
    <div className="flex items-center gap-3 border-b border-[#e6ebf3] bg-white px-4 pb-3">
      {back && (
        <button onClick={back} className="grid h-8 w-8 place-items-center rounded-full bg-[#f1f4f9] text-[#0b1b33]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"><path d="M10 3 5 8l5 5" /></svg>
        </button>
      )}
      <div className={`text-[15px] font-extrabold tracking-tight text-[#0b1b33] ${deva}`}>{title}</div>
    </div>
  );

  const Nav = () => (
    <div className="flex items-center justify-around border-t border-[#e6ebf3] bg-white pb-5 pt-2.5">
      {t.nav.map((n: string, i: number) => (
        <div key={n} className={`flex flex-col items-center gap-1 ${i === 0 ? "text-[#002970]" : "text-[#a9b4c6]"}`}>
          <div className={`h-[18px] w-[18px] rounded-[5px] ${i === 0 ? "bg-[#002970]" : "bg-[#cfd8e6]"}`} />
          <span className={`text-[9px] font-bold ${deva}`}>{n}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#f4f6fa] text-[#0b1b33]">
      <div className="bg-white pt-[6px]"><StatusBar /></div>

      {screen === "home" && (
        <>
          <div className="flex items-center gap-3 bg-white px-4 pb-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf0fb] text-[13px] font-extrabold text-[#002970]">
              {s.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-extrabold leading-tight tracking-tight">{s.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a98ad]">Paytm for Business</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
            <div className="rounded-[20px] bg-gradient-to-br from-[#002970] to-[#0b4aa8] p-4 text-white elev">
              <div className={`text-[11px] font-semibold text-white/70 ${deva}`}>{t.today}</div>
              <div className="mt-0.5 flex items-end gap-2">
                <div className="tnum text-[32px] font-extrabold leading-none tracking-tight">{inr(s.today_gmv)}</div>
                <div className={`mb-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                  s.change_pct >= 0 ? "bg-white/15 text-[#7fffd4]" : "bg-white/15 text-[#ffc9c9]"}`}>
                  {s.change_pct >= 0 ? "▲" : "▼"} {Math.abs(s.change_pct)}%
                </div>
              </div>
              <div className={`mt-1 text-[11px] font-medium text-white/65 ${deva}`}>
                {s.today_txns} payments · {s.today_customers} {t.customers} · {t.bill} {inr(s.avg_bill)}
              </div>
              <div className="-mx-1 mt-1"><Spark data={home.series} /></div>
            </div>

            <div className="mt-5 mb-2.5 flex items-center gap-2">
              <div className={`text-[13px] font-extrabold tracking-tight ${deva}`}>{t.opps}</div>
              <Pill tone="navy">{home.opportunities.length}</Pill>
            </div>

            {home.opportunities.map((o: any) => (
              <button key={o.id} onClick={() => openOpp(o.play)}
                className="mb-2.5 flex w-full gap-3 rounded-[16px] border border-[#e6ebf3] bg-white p-3.5 text-left transition hover:border-[#c6d7f5] elev">
                <div className={`mt-0.5 w-[3px] shrink-0 rounded-full ${o.kind === "loan" ? "bg-[#f79009]" : "bg-[#002970]"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`text-[13.5px] font-extrabold leading-snug tracking-tight ${deva}`}>{o.headline}</div>
                    {o.kind === "loan" ? <Pill tone="amber">loan</Pill> : <Pill tone="green">+{inr(o.score)}</Pill>}
                  </div>
                  <div className={`mt-1 line-clamp-2 text-[11.5px] leading-snug text-[#5b6b84] ${deva}`}>{o.why}</div>
                  <div className={`mt-2.5 flex items-center gap-1 text-[11.5px] font-extrabold text-[#002970] ${deva}`}>
                    {o.action_label}
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
                  </div>
                </div>
              </button>
            ))}

            {home.campaigns.length > 0 && (
              <>
                <div className={`mt-5 mb-2.5 text-[13px] font-extrabold tracking-tight ${deva}`}>{t.running}</div>
                {home.campaigns.map((c: any) => (
                  <div key={c.id} className="mb-2 flex items-center justify-between rounded-[14px] border border-[#e6ebf3] bg-white px-3.5 py-3">
                    <div>
                      <div className="text-[12px] font-extrabold">{c.id}</div>
                      <div className="tnum text-[10px] font-semibold text-[#8a98ad]">
                        {c.sent_to} sent · {c.held_back} held back
                      </div>
                    </div>
                    <Pill tone={c.status === "done" ? "green" : "navy"}>{c.status}</Pill>
                  </div>
                ))}
              </>
            )}
          </div>
          <Nav />
        </>
      )}

      {screen === "detail" && opp && (
        <>
          <Bar title={t.evidence} back={() => setScreen("home")} />
          <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
            <div className={`text-[19px] font-extrabold leading-tight tracking-tight ${deva}`}>{opp.headline}</div>
            <div className={`mt-1.5 text-[12.5px] leading-relaxed text-[#5b6b84] ${deva}`}>{opp.why}</div>

            <div className="mt-4 rounded-[16px] border border-[#e6ebf3] bg-white p-3 elev">
              {opp.play === "winback" && <WeeklyCustomers data={opp.charts.weekly_customers} />}
              {opp.play === "dead_hours" && <Hourly data={opp.charts.hourly} />}
              {opp.play === "low_ticket" && <Compare data={opp.charts.ticket} unit="inr" />}
              {opp.play === "winback" && <Compare data={opp.charts.repeat_rate} />}
              <div className="mt-1.5 text-center text-[9.5px] font-semibold text-[#a9b4c6]">
                {opp.play === "winback" ? `Weekly visits from these ${opp.evidence.lapsed_regulars} customers · repeat rate vs nearby`
                  : opp.play === "dead_hours" ? "Share of weekday sales by hour — you vs nearby"
                  : "Median bill vs nearby shops"}
              </div>
            </div>

            <Label className="mt-4 mb-2">The evidence</Label>
            <div className="grid grid-cols-2 gap-2">
              {evidenceRows(opp.play, opp.evidence, opp.provenance).map(([label, value, ref]: any, i: number) => (
                <Traceable key={i} label={label} value={value}
                  onTap={ref ? async () => setProv(await api.provenance(ref)) : undefined} />
              ))}
            </div>

            <div className="mt-4 rounded-[16px] border border-[#c6d7f5] bg-[#f7faff] p-3.5">
              <Label>{t.offer}</Label>
              <div className={`mt-1.5 text-[12.5px] font-semibold leading-snug text-[#2b3a52] ${deva}`}>
                {opp.play === "winback" && <>{inr(opp.evidence.cashback)} cashback on a bill of {inr(opp.evidence.min_bill)} or more, for {opp.evidence.valid_days} days.</>}
                {opp.play === "dead_hours" && <>{opp.evidence.discount_pct}% off between {opp.charts.window.from} and {opp.charts.window.to}, up to {inr(opp.evidence.max_discount)}.</>}
                {opp.play === "low_ticket" && <>{inr(opp.evidence.cashback)} back when the bill reaches {inr(opp.evidence.spend_target)}.</>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#dbe5f7] pt-2.5">
                {[["Customers", opp.audience_size], ["Max spend", inr(opp.action.budget_cap)],
                  ["Est. return", `+${inr(opp.evidence.est_extra_sales_month || opp.evidence.est_extra_sales)}`]]
                  .map(([k, v]: any) => (
                  <div key={k}>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8a98ad]">{k}</div>
                    <div className={`tnum text-[13px] font-extrabold ${k === "Est. return" ? "text-[#067647]" : ""}`}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 border-t border-[#e6ebf3] bg-white px-4 pb-5 pt-3">
            <Btn kind="ghost" className="flex-1" onClick={() => setScreen("home")}>{t.notNow}</Btn>
            <Btn className="flex-[2]" onClick={() => setConfirm(true)}>{t.approve}</Btn>
          </div>
        </>
      )}

      {screen === "sent" && camp && (
        <>
          <Bar title={t.sent} back={() => setScreen("home")} />
          <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#ecfdf3] text-[#067647]">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
                strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <div className={`mt-4 text-[17px] font-extrabold tracking-tight ${deva}`}>{t.sent}</div>
            <div className="mt-2 text-[12.5px] leading-relaxed text-[#5b6b84]">
              Sent to <b className="text-[#0b1b33]">{camp.sent_to}</b> customers.{" "}
              <b className="text-[#0b1b33]">{camp.held_back}</b> were deliberately left out as a control
              group, so we can measure what the offer really did.
            </div>
            <div className="tnum mt-3 rounded-lg bg-[#f1f4f9] px-3 py-1.5 text-[11px] font-bold text-[#5b6b84]">
              capped at {inr(camp.budget_cap)}
            </div>
            <Btn kind="accent" className="mt-6 w-full" onClick={doForward} disabled={busy}>
              {busy ? "Simulating…" : t.ff}
            </Btn>
            <div className="mt-2 text-[10px] font-semibold text-[#a9b4c6]">demo control — plays the fortnight forward</div>
          </div>
        </>
      )}

      {screen === "result" && result && (
        <>
          <Bar title={t.results} back={() => setScreen("home")} />
          <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
            <div className="rounded-[16px] border border-[#e6ebf3] bg-white p-3 elev">
              <Compare data={result.result.chart} keyName="rate" />
              <div className="mt-1.5 text-center text-[9.5px] font-semibold text-[#a9b4c6]">
                Came back within {result.result.days} days
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[[t.got, `${result.result.treatment.returned}/${result.result.treatment.customers}`, "#0b1b33", "white"],
                [t.control, `${result.result.holdout.returned}/${result.result.holdout.customers}`, "#a9b4c6", "white"],
                [t.extra, inr(result.result.incremental_sales), "#067647", "#ecfdf3"],
                [t.spent, inr(result.result.spent), "#0b1b33", "#f1f4f9"]].map(([k, v, c, bg]: any) => (
                <div key={k} className="rounded-[14px] border border-[#e6ebf3] p-3" style={{ background: bg }}>
                  <div className={`text-[10px] font-bold text-[#5b6b84] ${deva}`}>{k}</div>
                  <div className="tnum mt-0.5 text-[20px] font-extrabold tracking-tight" style={{ color: c }}>{v}</div>
                </div>
              ))}
            </div>
            {result.result.return_per_rupee && (
              <div className="mt-3 rounded-[16px] bg-gradient-to-br from-[#002970] to-[#0b4aa8] p-4 text-center text-white">
                <div className="tnum text-[28px] font-extrabold leading-none tracking-tight">
                  {inr(result.result.return_per_rupee)}
                </div>
                <div className="mt-1 text-[10.5px] font-semibold text-white/70">extra sales for every ₹1 spent</div>
              </div>
            )}
            <div className="mt-3 rounded-[14px] border border-[#fedf89] bg-[#fffaeb] p-3 text-[11px] font-medium leading-relaxed text-[#b54708]">
              {result.result.note}
            </div>
            <Btn kind="ghost" className="mt-3 w-full" onClick={() => onSpeak?.(result.speech)}>{t.speak}</Btn>
          </div>
        </>
      )}

      {screen === "loan" && loan && opp && (
        <>
          <Bar title="Working capital" back={() => setScreen("home")} />
          <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
            <div className={`text-[17px] font-extrabold leading-tight tracking-tight ${deva}`}>{opp.headline}</div>
            <div className={`mt-1.5 text-[12.5px] leading-relaxed text-[#5b6b84] ${deva}`}>{opp.why}</div>
            <div className="mt-3 rounded-[16px] border border-[#e6ebf3] bg-white p-3 elev">
              <Forecast data={opp.charts.forecast} />
              <div className="mt-1.5 text-center text-[9.5px] font-semibold text-[#a9b4c6]">
                Next 30 days — amber is {opp.charts.festival_name}
              </div>
            </div>
            <div className="mt-3 rounded-[16px] border border-[#fedf89] bg-[#fffaeb] p-3.5">
              <div className="tnum text-[28px] font-extrabold leading-none tracking-tight">{inr(loan.amount)}</div>
              <div className="mt-1 text-[11px] font-semibold text-[#b54708]">from {loan.partner}</div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#fedf89] pt-2.5 text-[11px]">
                {[["Tenure", `${loan.tenure_days} days`], ["Rate", `${loan.monthly_rate_pct}%/month`],
                  ["Fee", inr(loan.processing_fee)], ["Total", inr(loan.total_repayable)]].map(([k, v]: any) => (
                  <div key={k} className="flex justify-between"><span className="text-[#8a6a2f]">{k}</span>
                    <b className="tnum text-[#7a4a06]">{v}</b></div>
                ))}
              </div>
              <div className="tnum mt-2.5 rounded-lg bg-white px-2.5 py-2 text-[11px] font-semibold text-[#5b6b84]">
                {inr(loan.daily_repayment)} deducted daily from your settlements
              </div>
            </div>
            <Label className="mt-4 mb-2">Key facts</Label>
            <ul className="space-y-2">
              {loan.disclosures.map((d: string, i: number) => (
                <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-[#5b6b84]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a9b4c6]" />{d}
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-start gap-2.5 rounded-[14px] border border-[#e6ebf3] bg-white p-3 text-[11px] leading-snug text-[#5b6b84]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#002970]" />
              I agree to share my Paytm sales data with {loan.partner} for this application.
            </label>
            {applied && (
              <div className="mt-3 rounded-[14px] border border-[#abefc6] bg-[#ecfdf3] p-3 text-[11px] leading-relaxed text-[#067647]">
                {applied.message}
              </div>
            )}
          </div>
          <div className="border-t border-[#e6ebf3] bg-white px-4 pb-5 pt-3">
            <Btn className="w-full" disabled={!consent || !!applied}
              onClick={async () => setApplied(await api.applyLoan(mid))}>
              {applied ? "Application sent" : "Apply through partner"}
            </Btn>
          </div>
        </>
      )}

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Before this goes out">
        <div className="space-y-2.5 text-[12px] leading-relaxed text-[#5b6b84]">
          <p>Going to <b className="text-[#0b1b33]">{opp?.audience_size}</b> customers, with{" "}
            <b className="text-[#0b1b33]">20%</b> deliberately held back so we can prove what the offer caused.</p>
          <p>Spending is capped at <b className="text-[#0b1b33]">{inr(opp?.action?.budget_cap || 0)}</b>. Nothing beyond that can go out.</p>
        </div>
        <Btn className="mt-4 w-full" onClick={doApprove} disabled={busy}>
          {busy ? "Sending…" : `${t.approve} · ${inr(opp?.action?.budget_cap || 0)} max`}
        </Btn>
      </Sheet>

      <Sheet open={!!prov} onClose={() => setProv(null)} title={prov?.label}>
        <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8a98ad]">
          {prov?.count} rows · showing {prov?.rows?.length}
        </div>
        <div className="space-y-1">
          {prov?.rows?.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-[#f7f9fc] px-2.5 py-2 text-[10.5px]">
              <span className="font-mono font-semibold text-[#5b6b84]">{r.customer}</span>
              <span className="text-[#8a98ad]">{r.when || `${r.visits} visits · ${r.last_seen}`}</span>
              <span className="tnum font-extrabold text-[#0b1b33]">{inr(r.amount ?? r.avg_bill)}</span>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
