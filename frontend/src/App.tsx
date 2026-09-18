import React, { useEffect, useState } from "react";
import { api, inr, stopSpeaking } from "./api";
import Console from "./Console";
import MerchantApp from "./MerchantApp";
import Soundbox from "./Soundbox";
import { Label } from "./ui";

export default function App() {
  const [shops, setShops] = useState<any[]>([]);
  const [mid, setMid] = useState("M001");
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [home, setHome] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [req, setReq] = useState<any>(null);
  const [showConsole, setShowConsole] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => { api.merchants().then(setShops); api.health().then(setHealth); }, []);
  const say = (text: string) => setReq({ text, n: Date.now() });
  // Switching shop or language starts clean: nothing from the previous shop may
  // stay on the Soundbox or the customer's phone.
  const clean = () => { stopSpeaking(); setReq(null); setNotifs([]); setHome(null); };
  const switchShop = (id: string) => { if (id !== mid) { clean(); setMid(id); } };
  const switchLang = (l: "hi" | "en") => { if (l !== lang) { clean(); setLang(l); } };

  const reset = async () => {
    await api.reset(); clean(); setNonce((n) => n + 1);
    api.health().then(setHealth);
  };

  const Seg = ({ items, value, onChange, small }: any) => (
    <div className="flex rounded-xl bg-[#e6ebf3] p-0.5">
      {items.map((it: any) => (
        <button key={it.id} onClick={() => onChange(it.id)}
          className={`rounded-[9px] px-3 py-1.5 text-[12px] font-bold tracking-tight transition ${
            value === it.id ? "bg-white text-[#0b1b33] shadow-sm" : "text-[#6c7c94] hover:text-[#0b1b33]"
          } ${small ? "px-2.5" : ""}`}>
          {it.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#e2e7ef] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1460px] flex-wrap items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#002970] text-[13px] font-extrabold text-white">दु</div>
            <div>
              <div className="text-[14px] font-extrabold leading-tight tracking-tight text-[#0b1b33]">Dukaan Saathi</div>
              <div className="text-[10px] font-semibold leading-tight text-[#8a98ad]">
                Merchant Growth AI · prototype
              </div>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <Seg items={shops.map((s) => ({ id: s.id, label: s.name.split(" ")[0] }))} value={mid} onChange={switchShop} />
            <Seg items={[{ id: "hi", label: "हिंदी" }, { id: "en", label: "EN" }]} value={lang} onChange={switchLang} small />
            <button onClick={() => setShowConsole((v) => !v)}
              className="rounded-xl border border-[#e2e7ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#5b6b84] hover:bg-[#f7f9fc]">
              {showConsole ? "Hide" : "Show"} internals
            </button>
            <button onClick={reset}
              className="rounded-xl border border-[#e2e7ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#5b6b84] hover:bg-[#f7f9fc]">
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1460px] items-start gap-8 px-6 py-8 lg:grid-cols-[236px_minmax(0,392px)_1fr]">
        <section className="flex flex-col items-center">
          <Label className="mb-3 self-start">The device on the counter</Label>
          <Soundbox key={mid + lang + nonce} briefing={home?.briefing} request={req} lang={lang}
            amount={home ? inr(home.summary.today_gmv) : null} />
        </section>

        <section>
          <Label className="mb-3">The merchant's phone</Label>
          <div className="relative mx-auto w-[392px] rounded-[46px] bg-[#0b1b33] p-[11px] elev-lg">
            <div className="absolute -left-[3px] top-[130px] h-14 w-[3px] rounded-l-sm bg-[#25324a]" />
            <div className="absolute -right-[3px] top-[110px] h-9 w-[3px] rounded-r-sm bg-[#25324a]" />
            <div className="relative overflow-hidden rounded-[36px] bg-[#f4f6fa]" style={{ height: "min(772px, max(560px, calc(100vh - 150px)))" }}>
              <div className="absolute left-1/2 top-[7px] z-30 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-[#0b1b33]" />
              <MerchantApp key={mid + lang + nonce} mid={mid} lang={lang} onSpeak={say}
                onNotify={setNotifs} onData={setHome} onLang={switchLang} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div>
            <Label className="mb-3">A customer's phone</Label>
            <div className="h-[212px] overflow-y-auto rounded-2xl border border-[#e2e7ef] bg-white p-2.5 no-scrollbar elev">
              {notifs.length === 0 ? (
                <div className="flex h-full flex-col justify-center gap-2 px-2">
                  <div className="rounded-xl border border-dashed border-[#d6dde8] bg-[#f9fbfe] p-2.5 opacity-70">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-semibold text-[#8a98ad]">C0•••••</span>
                      <span className="rounded bg-[#eef1f6] px-1.5 text-[9px] font-bold uppercase tracking-wide text-[#8a98ad]">{lang === "hi" ? "उदाहरण" : "example"}</span>
                    </div>
                    <div className="mt-1 text-[11px] font-medium leading-snug text-[#5b6b84]">
                      {(() => {   // this shop's own win-back offer, so the example never shows another shop's terms
                        const e = home?.opportunities?.find((o: any) => o.play === "winback")?.evidence || { cashback: 20, min_bill: 150, valid_days: 7 };
                        const shop = home?.merchant?.name || (lang === "hi" ? "आपकी दुकान" : "Your shop");
                        return lang === "hi" ? `${shop} ने आपको ₹${e.cashback} कैशबैक भेजा। ₹${e.min_bill} या ज़्यादा का पेमेंट करें · ${e.valid_days} दिन`
                          : `${shop} sent you ₹${e.cashback} cashback. Pay ₹${e.min_bill} or more within ${e.valid_days} days.`;
                      })()}
                    </div>
                  </div>
                  <div className="px-4 text-center text-[11px] leading-relaxed text-[#8a98ad]">
                    {lang === "hi" ? "ऑफर मंज़ूर होते ही ठीक उन्हीं ग्राहकों के फ़ोन पर ऐसा मैसेज पहुँचता है।"
                      : "Once an offer is approved, this lands on the phones of exactly the customers it targets."}
                  </div>
                </div>
              ) : notifs.map((n, i) => (
                <div key={i} className="mb-1.5 rounded-xl border border-[#eef1f6] bg-[#f9fbfe] p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-semibold text-[#8a98ad]">{n.customer}</span>
                    <span className="text-[9px] font-semibold text-[#8a98ad]">{n.when}</span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium leading-snug text-[#2b3a52]">
                    {lang === "hi" ? n.text_hi : n.text_en}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showConsole && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Label>Under the hood</Label>
                {health && (
                  <span className="text-[10px] font-semibold text-[#8a98ad]">
                    {health.transactions.toLocaleString("en-IN")} simulated payments
                  </span>
                )}
              </div>
              <div style={{ height: "max(300px, calc(100vh - 420px))" }}><Console key={mid + nonce} mid={mid} /></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
