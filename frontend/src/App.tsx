import React, { useEffect, useState } from "react";
import { api } from "./api";
import Console from "./Console";
import MerchantApp from "./MerchantApp";
import Soundbox from "./Soundbox";

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

  return (
    <div className="min-h-screen text-slate-200">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-5 py-3">
        <div>
          <div className="text-sm font-extrabold tracking-tight text-white">
            Dukaan Saathi <span className="text-cyan-400">·</span>{" "}
            <span className="font-medium text-slate-400">AI business partner for Paytm merchants</span>
          </div>
          <div className="text-[10px] text-slate-500">
            prototype · {health ? `${health.transactions.toLocaleString()} simulated payments · copy via ${health.copy_backend}` : "…"}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {shops.map((s) => (
            <button key={s.id} onClick={() => setMid(s.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                mid === s.id ? "bg-cyan-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              {s.name}
            </button>
          ))}
          <div className="mx-1 h-5 w-px bg-slate-700" />
          {(["hi", "en"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                lang === l ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-400"}`}>
              {l === "hi" ? "हिंदी" : "EN"}
            </button>
          ))}
          <button onClick={() => setShowConsole((v) => !v)}
            className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700">
            {showConsole ? "Hide" : "Show"} under the hood
          </button>
          <button onClick={reset}
            className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700">
            Reset demo
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 p-5 lg:grid-cols-[260px_400px_1fr]">
        <section className="pt-6"><Soundbox briefing={home?.briefing} request={req} lang={lang} /></section>

        <section>
          <div className="mx-auto h-[720px] w-[380px] overflow-hidden rounded-[2.2rem] border-[10px] border-slate-800 bg-white shadow-2xl">
            <MerchantApp key={mid + lang + nonce} mid={mid} lang={lang} onSpeak={say}
              onNotify={setNotifs} onData={setHome} />
          </div>
          <p className="mx-auto mt-2 w-[380px] text-center text-[10px] text-slate-500">
            The merchant's phone — Paytm for Business
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              A customer's phone
            </div>
            <div className="h-[230px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5 no-scrollbar">
              {notifs.length === 0 ? (
                <div className="grid h-full place-items-center px-6 text-center text-[11px] text-slate-500">
                  Approve an offer and it lands here, on the phones of the customers it targets.
                </div>
              ) : notifs.map((n, i) => (
                <div key={i} className="mb-1.5 rounded-xl bg-slate-800/70 p-2.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">{n.customer}</span><span>{n.when}</span>
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-100">
                    {lang === "hi" ? n.text_hi : n.text_en}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {showConsole && (
            <div className="min-h-0 flex-1">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Under the hood
              </div>
              <div className="h-[430px]"><Console key={mid + nonce} mid={mid} /></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
