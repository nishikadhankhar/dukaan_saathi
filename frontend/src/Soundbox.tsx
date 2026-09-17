import React, { useEffect, useRef, useState } from "react";
import { speak, stopSpeaking } from "./api";
import { Btn } from "./ui";

/** The device that is already on the shop counter -- here it also talks back. */
export default function Soundbox({ briefing, request, lang }: any) {
  const [speaking, setSpeaking] = useState(false);
  const [line, setLine] = useState("");
  const last = useRef(0);

  const say = (text: string) => {
    if (!text) return;
    setLine(text); setSpeaking(true);
    speak(text, lang, () => setSpeaking(false));
  };

  useEffect(() => {
    if (request && request.n !== last.current) { last.current = request.n; say(request.text); }
  }, [request]);

  useEffect(() => () => stopSpeaking(), []);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative w-full max-w-[250px] rounded-[26px] bg-gradient-to-b from-[#062a4d] to-[#021526] p-4 shadow-2xl ring-1 ring-cyan-500/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Soundbox</div>
          <div className="relative h-2.5 w-2.5">
            <div className={`absolute inset-0 rounded-full ${speaking ? "bg-cyan-300 ring-live" : "bg-slate-600"}`} />
          </div>
        </div>

        <div className="grid grid-cols-8 gap-[5px] rounded-2xl bg-black/30 p-3">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className={`h-1.5 w-1.5 rounded-full transition ${
              speaking ? "bg-cyan-400/70" : "bg-slate-600/50"}`}
              style={speaking ? { animation: `pulse-ring 1.2s ${(i % 8) * 0.06}s infinite` } : undefined} />
          ))}
        </div>

        <div className="mt-3 min-h-[74px] rounded-xl bg-black/40 p-2.5">
          <div className="text-[9px] uppercase tracking-widest text-cyan-400/70">
            {speaking ? "speaking…" : "last announcement"}
          </div>
          <div className="mt-1 text-[11px] leading-snug text-slate-200">
            {line || "—"}
          </div>
        </div>

        <div className="mt-2 text-center text-[9px] tracking-wide text-slate-500">दुकान साथी</div>
      </div>

      <div className="mt-3 flex w-full max-w-[250px] flex-col gap-2">
        <Btn kind="accent" onClick={() => say(briefing)} disabled={!briefing}>
          🔊 {lang === "hi" ? "आज की रिपोर्ट सुनें" : "Play evening summary"}
        </Btn>
        {speaking && <Btn kind="dark" onClick={() => { stopSpeaking(); setSpeaking(false); }}>Stop</Btn>}
      </div>
      <p className="mt-3 max-w-[250px] text-center text-[10px] leading-snug text-slate-500">
        Speaks through the device already on the counter — no app, no reading required.
      </p>
    </div>
  );
}
