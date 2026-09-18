import React, { useEffect, useState } from "react";
import { api, inr } from "./api";
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

  const reset = async () => {
    await api.reset(); setNotifs([]); setHome(null); setNonce((n) => n + 1);
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
            <Seg items={shops.map((s) => ({ id: s.id, label: s.name.split(" ")[0] }))} value={mid} onChange={setMid} />
            <Seg items={[{ id: "hi", label: "हिंदी" }, { id: "en", label: "EN" }]} value={lang} onChange={setLang} small />
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
          <Soundbox briefing={home?.briefing} request={req} lang={lang}
            amount={home ? inr(home.summary.today_gmv) : null} />
        </section>

        <section>
          <Label className="mb-3">The merchant's phone</Label>
          <div className="relative mx-auto w-[392px] rounded-[46px] bg-[#0b1b33] p-[11px] elev-lg">
            <div className="absolute -left-[3px] top-[130px] h-14 w-[3px] rounded-l-sm bg-[#25324a]" />
            <div className="absolute -right-[3px] top-[110px] h-9 w-[3px] rounded-r-sm bg-[#25324a]" />
            <div className="relative h-[772px] overflow-hidden rounded-[36px] bg-[#f4f6fa]">
              <div className="absolute left-1/2 top-[7px] z-30 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-[#0b1b33]" />
              <MerchantApp key={mid + lang + nonce} mid={mid} lang={lang} onSpeak={say}
                onNotify={setNotifs} onData={setHome} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div>
            <Label className="mb-3">A customer's phone</Label>
            <div className="h-[212px] overflow-y-auto rounded-2xl border border-[#e2e7ef] bg-white p-2.5 no-scrollbar elev">
              {notifs.length === 0 ? (
                <div className="grid h-full place-items-center px-8 text-center text-[11px] leading-relaxed text-[#8a98ad]">
                  Approve an offer and it appears here — on the phones of the exact customers it targets.
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
              <div className="h-[470px]"><Console key={mid + nonce} mid={mid} /></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
