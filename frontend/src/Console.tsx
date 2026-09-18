import React, { useEffect, useState } from "react";
import { api } from "./api";

/** What fired, what the model wrote, and whether we believed it. */
export default function Console({ mid }: any) {
  const [t, setT] = useState<any>(null);
  const [tab, setTab] = useState("checks");
  useEffect(() => {                       // keep the audit trail live while the demo runs
    let on = true;
    const pull = () => api.trace(mid).then((d) => on && setT(d)).catch(() => {});
    pull();
    const id = setInterval(pull, 2000);
    return () => { on = false; clearInterval(id); };
  }, [mid]);
  if (!t) return <div className="rounded-2xl border border-[#e2e7ef] bg-white p-4 text-[12px] text-[#8a98ad]">Loading…</div>;

  const v = t.copy.validator;
  const live = t.copy.backend !== "templates";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e2e7ef] bg-white elev">
      <div className="flex items-center gap-1 border-b border-[#e6ebf3] px-2.5 py-2">
        {[["checks", "Detectors"], ["copy", "Model"], ["audit", "Activity"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition ${
              tab === k ? "bg-[#eaf0fb] text-[#002970]" : "text-[#8a98ad] hover:text-[#0b1b33]"}`}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-[#f4f6fa] px-2 py-1">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[#12b76a]" : "bg-[#f79009]"}`} />
          <span className="text-[10px] font-bold text-[#5b6b84]">{t.copy.backend}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {tab === "checks" && (
          <div className="space-y-1.5">
            {t.checks.map((c: any) => (
              <div key={c.play} className="flex items-center gap-2.5 rounded-xl border border-[#eef1f6] px-3 py-2.5">
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                  c.fired ? "bg-[#ecfdf3] text-[#067647]" : "bg-[#f4f6fa] text-[#a9b4c6]"}`}>
                  {c.fired ? "fired" : "quiet"}
                </span>
                <span className="flex-1 text-[11.5px] font-semibold text-[#2b3a52]">
                  {c.label}
                  {c.state && <span className="ml-1.5 rounded bg-[#eaf0fb] px-1.5 py-px text-[9px] font-extrabold uppercase text-[#002970]">
                    {c.state.status === "tip" ? "tip accepted" : `${c.state.id} · ${c.state.status === "done" ? `${c.state.returned} back` : "running"}`}</span>}
                  {c.plausibility && <span className="mt-0.5 block text-[10px] font-medium text-[#8a98ad]">{c.plausibility}</span>}
                </span>
                <span className="tnum shrink-0 text-right font-mono text-[10px] text-[#5b6b84]">
                  {String(c.value)}<span className="text-[#a9b4c6]"> / {c.threshold}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "copy" && (
          <div className="space-y-2.5">
            <div className="rounded-xl bg-[#f7f9fc] p-2.5 text-[11px] text-[#5b6b84]">
              Copy written by <b className="text-[#0b1b33]">{t.copy.backend}</b>
              {t.copy.model && <> · <span className="font-mono">{t.copy.model}</span></>}
              {t.copy.cached ? <> · pre-generated, 0 API calls on stage</>
                : t.copy.latency_ms > 0 ? <> · {t.copy.latency_ms}ms</> : null}
              {!live && <div className="mt-1 text-[#b54708]">Set GEMINI_API_KEY in backend/.env to switch this on.</div>}
              {t.copy.error && <div className="mt-1 text-[#b54708]">{t.copy.error}</div>}
            </div>

            <div className={`rounded-xl p-2.5 ${v?.ok ? "bg-[#ecfdf3]" : "bg-[#fef3f2]"}`}>
              <div className={`text-[11.5px] font-bold ${v?.ok ? "text-[#067647]" : "text-[#b42318]"}`}>
                {v?.ok ? "✓" : "✕"} number check · {v?.checked} fields verified
                {v?.ungrounded?.length ? ` · ${v.ungrounded.length} rejected` : " · none rejected"}
              </div>
              <div className="mt-1 text-[10.5px] leading-relaxed text-[#5b6b84]">
                Any figure the model writes that is not in the evidence gets the card thrown away
                and replaced with a template.
              </div>
            </div>

            {[["Evidence sent to the model", t.prompt],
              ["What came back", JSON.stringify(t.raw, null, 1)]].map(([label, body]: any) => (
              <details key={label} className="rounded-xl border border-[#eef1f6]">
                <summary className="cursor-pointer px-2.5 py-2 text-[11.5px] font-bold text-[#2b3a52]">{label}</summary>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-2.5 pb-2.5 font-mono text-[9.5px] leading-relaxed text-[#5b6b84]">
                  {body}
                </pre>
              </details>
            ))}
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-1.5">
            {t.audit.map((a: any, i: number) => (
              <div key={i} className="rounded-xl border border-[#eef1f6] px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="tnum font-mono text-[9.5px] text-[#a9b4c6]">{a.when}</span>
                  <span className="text-[11px] font-bold text-[#2b3a52]">{a.what}</span>
                </div>
                {a.detail && <div className="mt-0.5 text-[10.5px] leading-snug text-[#8a98ad]">{a.detail}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
