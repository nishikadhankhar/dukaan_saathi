import React, { useEffect, useState } from "react";
import { api } from "./api";

/** "Under the hood" -- what fired, what the model wrote, and whether we believed it. */
export default function Console({ mid }: any) {
  const [t, setT] = useState<any>(null);
  const [tab, setTab] = useState("checks");
  useEffect(() => { api.trace(mid).then(setT); }, [mid]);
  if (!t) return <div className="p-3 text-xs text-slate-500">Loading trace…</div>;

  const v = t.copy.validator;
  const tabs = [["checks", "Detectors"], ["copy", "Model"], ["audit", "Log"]];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex gap-1 border-b border-slate-800 p-2">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
              tab === k ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 pr-1">
          <span className={`h-1.5 w-1.5 rounded-full ${t.copy.backend === "templates" ? "bg-amber-400" : "bg-emerald-400"}`} />
          <span className="text-[10px] text-slate-400">{t.copy.backend}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 no-scrollbar">
        {tab === "checks" && (
          <table className="w-full text-[11px]">
            <tbody>
              {t.checks.map((c: any) => (
                <tr key={c.play} className="border-b border-slate-800/60">
                  <td className="py-1.5 pr-2">
                    <span className={`mr-1.5 rounded px-1 py-0.5 text-[9px] font-bold ${
                      c.fired ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/60 text-slate-500"}`}>
                      {c.fired ? "FIRED" : "quiet"}
                    </span>
                    <span className="text-slate-300">{c.label}</span>
                  </td>
                  <td className="py-1.5 text-right font-mono text-slate-400">
                    {String(c.value)} <span className="text-slate-600">/ {c.threshold}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "copy" && (
          <div className="space-y-2 text-[11px]">
            <div className="rounded-lg bg-slate-800/60 p-2">
              <div className="text-slate-400">Backend <b className="text-slate-200">{t.copy.backend}</b>
                {t.copy.model && <> · model <b className="text-slate-200">{t.copy.model}</b></>}
                {t.copy.latency_ms && <> · {t.copy.latency_ms}ms</>}</div>
              {t.copy.error && <div className="mt-1 text-amber-400">{t.copy.error}</div>}
            </div>
            <div className={`rounded-lg p-2 ${v?.ok ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
              <div className={v?.ok ? "text-emerald-300" : "text-rose-300"}>
                {v?.ok ? "✓" : "✗"} number check — {v?.checked} fields verified against the data
                {v?.ungrounded?.length ? `, ${v.ungrounded.length} rejected` : ", none rejected"}
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                Any figure the model writes that is not in the evidence gets the card thrown away.
              </div>
            </div>
            <details className="rounded-lg bg-slate-800/60 p-2">
              <summary className="cursor-pointer text-slate-300">Evidence sent to the model</summary>
              <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap text-[9px] text-slate-400">{t.prompt}</pre>
            </details>
            <details className="rounded-lg bg-slate-800/60 p-2">
              <summary className="cursor-pointer text-slate-300">What came back</summary>
              <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap text-[9px] text-slate-400">
                {JSON.stringify(t.raw, null, 1)}
              </pre>
            </details>
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-1">
            {t.audit.map((a: any, i: number) => (
              <div key={i} className="rounded-lg bg-slate-800/50 px-2 py-1.5 text-[10px]">
                <span className="font-mono text-slate-500">{a.when}</span>{" "}
                <span className="text-slate-200">{a.what}</span>
                {a.detail && <div className="text-slate-500">{a.detail}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
