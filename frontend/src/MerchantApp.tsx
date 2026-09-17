import React, { useEffect, useState } from "react";
import { api, inr } from "./api";
import { Btn, Compare, Forecast, Hourly, Pill, Sheet, Spark, Traceable, WeeklyCustomers } from "./ui";

const T = {
  hi: { today: "आज की बिक्री", customers: "ग्राहक", bill: "औसत बिल", opps: "आज के मौके",
        why: "वजह", offer: "ऑफर", approve: "मंज़ूरी दें", notNow: "अभी नहीं", back: "वापस",
        running: "चल रहा है", results: "नतीजे", evidence: "सबूत", loanCta: "लोन ऑफर देखें",
        sent: "ऑफर भेज दिया", ff: "14 दिन आगे बढ़ाएँ", speak: "साउंडबॉक्स पर सुनें",
        control: "कंट्रोल ग्रुप", got: "ऑफर मिला", extra: "अतिरिक्त बिक्री", spent: "खर्च" },
  en: { today: "Today's sales", customers: "customers", bill: "avg bill", opps: "Today's opportunities",
        why: "Why", offer: "The offer", approve: "Approve", notNow: "Not now", back: "Back",
        running: "Running", results: "Results", evidence: "Evidence", loanCta: "See loan offer",
        sent: "Offer sent", ff: "Fast-forward 14 days", speak: "Hear on Soundbox",
        control: "Control group", got: "Got the offer", extra: "Extra sales", spent: "Spent" },
};

function evidenceRows(play: string, e: any, prov: any) {
  const P = (k: string) => prov?.[k];
  if (play === "winback")
    return [
      ["Regulars who stopped coming", e.lapsed_regulars, P("lapsed_regulars")],
      ["Weeks since their last visit", e.weeks_since_last_visit],
      ["They used to visit", `${e.visits_per_month_before}/month`],
      ["Monthly sales now at risk", inr(e.monthly_value_at_risk)],
      ...(e.moved_to_new_shop
        ? [["Now paying at a new shop nearby", `${e.moved_to_new_shop} of them`],
           ["That shop opened", `${e.new_shop_opened_days_ago} days ago, ${e.new_shop_distance_m}m away`]]
        : []),
      ["Your repeat rate", `${e.your_repeat_rate_pct}%`],
      [`Nearby shops (${e.nearby_shops_compared})`, `${e.nearby_repeat_rate_pct}%`],
    ];
  if (play === "dead_hours")
    return [
      ["Your share of sales then", `${e.your_share_pct}%`, P("your_share_pct")],
      [`Nearby shops (${e.nearby_shops_compared})`, `${e.nearby_share_pct}%`],
      ["Your weekly sales", inr(e.weekly_sales)],
      ["Worth per week if matched", inr(e.weekly_potential)],
      ["Regular customers to invite", e.regular_customers],
    ];
  if (play === "low_ticket")
    return [
      ["Your median bill", inr(e.your_median_bill), P("your_median_bill")],
      [`Nearby shops (${e.nearby_shops_compared})`, inr(e.nearby_median_bill)],
      ["Your regular customers", e.regular_customers],
      ["Suggested spend target", inr(e.spend_target)],
    ];
  return [
    ["Festival starts in", `${e.festival_days_away} days`],
    ["Usual festival lift", `${e.expected_uplift_pct}% over ${e.festival_window_days} days`],
    ["Extra stock to buy upfront", inr(e.extra_stock_needed)],
    ["Your weekly margin", inr(e.weekly_margin)],
    ["Your daily sales", inr(e.daily_sales), P("daily_sales")],
  ];
}

export default function MerchantApp({ mid, lang, onSpeak, onNotify, onCampaign, onData }: any) {
  const t = T[lang];
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
    setScreen("home"); setOpp(null); setCamp(null); setResult(null); setApplied(null);
    api.home(mid, lang).then((d) => { setHome(d); onData?.(d); });
  }, [mid, lang]);

  if (!home) return <div className="grid h-full place-items-center text-sm text-slate-400">Loading shop…</div>;
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
    setResult(r); setScreen("result"); setBusy(false);
    onSpeak?.(r.speech);
  };

  const Header = ({ title, back }: any) => (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-[#002970] px-4 py-3 text-white">
      {back && <button onClick={back} className="text-lg leading-none">&larr;</button>}
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-cyan-200">Paytm for Business</div>
        <div className="text-sm font-bold">{title}</div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-50 text-slate-800">
      {screen === "home" && (
        <>
          <Header title={s.name} />
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">{t.today}</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-extrabold text-slate-900">{inr(s.today_gmv)}</div>
                <div className={`pb-1 text-xs font-bold ${s.change_pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {s.change_pct >= 0 ? "▲" : "▼"} {Math.abs(s.change_pct)}%
                </div>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {s.today_customers} {t.customers} · {t.bill} {inr(s.avg_bill)}
              </div>
              <div className="mt-2"><Spark data={home.series} /></div>
            </div>

            <div className="mt-4 mb-2 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-800">{t.opps}</div>
              <Pill tone="cyan">{home.opportunities.length}</Pill>
            </div>
            {home.opportunities.map((o: any) => (
              <button key={o.id} onClick={() => openOpp(o.play)}
                className="mb-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-cyan-400">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13px] font-bold leading-snug text-slate-900">{o.headline}</div>
                  {o.kind === "loan" ? <Pill tone="amber">loan</Pill> : <Pill tone="green">+{inr(o.score)}</Pill>}
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{o.why}</div>
                <div className="mt-2 text-[11px] font-bold text-[#002970]">{o.action_label} &rarr;</div>
              </button>
            ))}

            {home.campaigns.length > 0 && (
              <>
                <div className="mt-4 mb-2 text-sm font-bold text-slate-800">{t.running}</div>
                {home.campaigns.map((c: any) => (
                  <div key={c.id} className="mb-2 rounded-2xl border border-slate-200 bg-white p-3 text-[11px]">
                    <b>{c.id}</b> · {c.sent_to} sent · {c.held_back} held back · {c.status}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {screen === "detail" && opp && (
        <>
          <Header title={t.evidence} back={() => setScreen("home")} />
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <div className="text-lg font-extrabold leading-snug text-slate-900">{opp.headline}</div>
            <div className="mt-1 text-[13px] leading-relaxed text-slate-600">{opp.why}</div>

            <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm">
              {opp.play === "winback" && <WeeklyCustomers data={opp.charts.weekly_customers} />}
              {opp.play === "dead_hours" && <Hourly data={opp.charts.hourly} />}
              {opp.play === "low_ticket" && <Compare data={opp.charts.ticket} unit="inr" />}
              {opp.play === "winback" && <Compare data={opp.charts.repeat_rate} />}
              <div className="mt-1 text-center text-[10px] text-slate-400">
                {opp.play === "winback" ? `Weekly visits from these ${opp.evidence.lapsed_regulars} customers` 
                  : opp.play === "dead_hours" ? "Share of weekday sales by hour — you vs nearby shops"
                  : "Median bill vs nearby shops"}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {evidenceRows(opp.play, opp.evidence, opp.provenance).map(([label, value, ref]: any, i: number) => (
                <Traceable key={i} label={label} value={value}
                  onTap={ref ? async () => setProv(await api.provenance(ref)) : undefined} />
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#002970]/20 bg-[#002970]/5 p-3">
              <div className="text-xs font-bold text-[#002970]">{t.offer}</div>
              <div className="mt-1 text-[12px] text-slate-700">
                {opp.play === "winback" && <>{inr(opp.evidence.cashback)} cashback on a bill of {inr(opp.evidence.min_bill)} or more, for {opp.evidence.valid_days} days.</>}
                {opp.play === "dead_hours" && <>{opp.evidence.discount_pct}% off between {opp.charts.window.from} and {opp.charts.window.to}, up to {inr(opp.evidence.max_discount)}.</>}
                {opp.play === "low_ticket" && <>{inr(opp.evidence.cashback)} back when the bill reaches {inr(opp.evidence.spend_target)}.</>}
              </div>
              <div className="mt-2 flex gap-4 text-[11px] text-slate-600">
                <div><b>{opp.audience_size}</b> customers</div>
                <div>cap <b>{inr(opp.action.budget_cap)}</b></div>
                <div>est. <b className="text-emerald-700">+{inr(opp.evidence.est_extra_sales_month || opp.evidence.est_extra_sales)}</b></div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
            <Btn kind="ghost" className="flex-1" onClick={() => setScreen("home")}>{t.notNow}</Btn>
            <Btn className="flex-[2]" onClick={() => setConfirm(true)}>{t.approve}</Btn>
          </div>
        </>
      )}

      {screen === "sent" && camp && (
        <>
          <Header title={t.sent} back={() => setScreen("home")} />
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl">✓</div>
            <div className="text-lg font-bold text-slate-900">{t.sent}</div>
            <div className="text-[13px] text-slate-600">
              Sent to <b>{camp.sent_to}</b> customers. <b>{camp.held_back}</b> were deliberately
              left out as a control group, so we can measure what the offer really did.
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
              Budget capped at {inr(camp.budget_cap)}
            </div>
            <Btn kind="accent" className="mt-2 w-full" onClick={doForward} disabled={busy}>
              {busy ? "Simulating…" : t.ff}
            </Btn>
            <div className="text-[10px] text-slate-400">demo control — plays the next 14 days forward</div>
          </div>
        </>
      )}

      {screen === "result" && result && (
        <>
          <Header title={t.results} back={() => setScreen("home")} />
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <Compare data={result.result.chart} keyName="rate" />
              <div className="mt-1 text-center text-[10px] text-slate-400">Came back within {result.result.days} days</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-[11px] text-slate-500">{t.got}</div>
                <div className="text-xl font-extrabold text-slate-900">
                  {result.result.treatment.returned}<span className="text-sm text-slate-400">/{result.result.treatment.customers}</span>
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-[11px] text-slate-500">{t.control}</div>
                <div className="text-xl font-extrabold text-slate-400">
                  {result.result.holdout.returned}<span className="text-sm">/{result.result.holdout.customers}</span>
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <div className="text-[11px] text-emerald-700">{t.extra}</div>
                <div className="text-xl font-extrabold text-emerald-700">{inr(result.result.incremental_sales)}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <div className="text-[11px] text-slate-600">{t.spent}</div>
                <div className="text-xl font-extrabold text-slate-800">{inr(result.result.spent)}</div>
              </div>
            </div>
            {result.result.return_per_rupee && (
              <div className="mt-3 rounded-2xl bg-[#002970] p-3 text-center text-white">
                <div className="text-2xl font-extrabold">{inr(result.result.return_per_rupee)}</div>
                <div className="text-[11px] text-cyan-200">extra sales for every ₹1 spent</div>
              </div>
            )}
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] text-amber-900">{result.result.note}</div>
            <Btn kind="accent" className="mt-3 w-full" onClick={() => onSpeak?.(result.speech)}>{t.speak}</Btn>
          </div>
        </>
      )}

      {screen === "loan" && loan && opp && (
        <>
          <Header title="Working capital" back={() => setScreen("home")} />
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <div className="text-lg font-extrabold leading-snug text-slate-900">{opp.headline}</div>
            <div className="mt-1 text-[13px] text-slate-600">{opp.why}</div>
            <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
              <Forecast data={opp.charts.forecast} />
              <div className="mt-1 text-center text-[10px] text-slate-400">
                Next 30 days — amber is {opp.charts.festival_name}
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3">
              <div className="text-3xl font-extrabold text-slate-900">{inr(loan.amount)}</div>
              <div className="text-[11px] text-slate-600">from {loan.partner}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>Tenure <b>{loan.tenure_days} days</b></div>
                <div>Rate <b>{loan.monthly_rate_pct}%/month</b></div>
                <div>Fee <b>{inr(loan.processing_fee)}</b></div>
                <div>Total <b>{inr(loan.total_repayable)}</b></div>
              </div>
              <div className="mt-2 rounded-lg bg-white p-2 text-[11px]">
                Repaid as <b>{inr(loan.daily_repayment)}</b> from your daily settlements.
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {loan.disclosures.map((d: string, i: number) => (
                <li key={i} className="flex gap-2 text-[11px] leading-snug text-slate-600">
                  <span className="text-slate-400">•</span>{d}
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-start gap-2 rounded-xl bg-white p-3 text-[11px] text-slate-700 shadow-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              I agree to share my Paytm sales data with {loan.partner} for this application.
            </label>
            {applied && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-800">{applied.message}</div>}
          </div>
          <div className="border-t border-slate-200 bg-white p-3">
            <Btn className="w-full" disabled={!consent || !!applied}
              onClick={async () => setApplied(await api.applyLoan(mid))}>
              {applied ? "Application sent" : "Apply through partner"}
            </Btn>
          </div>
        </>
      )}

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Before this goes out">
        <div className="space-y-2 text-[12px] text-slate-600">
          <p>Sending to <b>{opp?.audience_size}</b> customers, with <b>20%</b> deliberately held back
            so we can prove what the offer actually caused.</p>
          <p>Spending is capped at <b>{inr(opp?.action?.budget_cap || 0)}</b>. Nothing beyond that can be spent.</p>
        </div>
        <Btn className="mt-3 w-full" onClick={doApprove} disabled={busy}>
          {busy ? "Sending…" : `${t.approve} · ${inr(opp?.action?.budget_cap || 0)} max`}
        </Btn>
      </Sheet>

      <Sheet open={!!prov} onClose={() => setProv(null)} title={prov?.label}>
        <div className="mb-2 text-[11px] text-slate-500">{prov?.count} rows · showing {prov?.rows?.length}</div>
        <div className="space-y-1">
          {prov?.rows?.map((r: any, i: number) => (
            <div key={i} className="flex justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700">
              <span className="font-mono">{r.customer}</span>
              <span>{r.when || `${r.visits} visits · ${r.last_seen}`}</span>
              <span className="font-semibold">{inr(r.amount ?? r.avg_bill)}</span>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
