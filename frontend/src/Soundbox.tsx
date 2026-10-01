import React, { useEffect, useRef, useState } from "react";
import { speak, stopSpeaking } from "./api";
import { Btn } from "./ui";

/** The device already sitting on the counter -- here it also talks back. */
export default function Soundbox({ briefing, request, lang, amount }: any) {
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
    <div className="flex flex-col items-center">
      {/* lanyard */}
      <div className="h-7 w-[3px] rounded-full bg-gradient-to-b from-transparent to-[#b9c4d4]" />

      <div className="relative w-[222px] rounded-[26px] bg-gradient-to-b from-[#0e3d72] via-[#062c56] to-[#03203f] p-3.5 elev-lg ring-1 ring-[#03203f]">
        <div className="absolute left-1/2 top-2 h-1 w-8 -translate-x-1/2 rounded-full bg-black/35" />

        {/* display */}
        <div className="mt-3 rounded-xl bg-[#03131f] px-3 py-2.5 ring-1 ring-black/50"
          style={{ boxShadow: "inset 0 2px 10px rgba(0,0,0,.7)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-extrabold uppercase tracking-[0.22em] text-[#2b6f8c]">Soundbox</span>
            <span className={`h-1.5 w-1.5 rounded-full transition ${
              speaking ? "bg-[#5ad8ff] shadow-[0_0_8px_2px_rgba(90,216,255,.7)]" : "bg-[#173a4d]"}`} />
          </div>
          <div className="tnum mt-1 text-[16px] font-extrabold leading-none tracking-tight text-[#7fe0ff]">
            {amount ?? "₹—"}
          </div>
          <div className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.16em] text-[#2b6f8c]">
            {speaking ? "speaking" : "today"}
          </div>
        </div>

        {/* speaker grille, with the waveform over it while talking */}
        <div className="relative mx-auto mt-3.5 grid h-[98px] w-[98px] place-items-center rounded-full"
          style={{
            backgroundImage: "radial-gradient(#0a2137 1.25px, transparent 1.35px)",
            backgroundSize: "7.5px 7.5px",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.06)",
          }}>
          {speaking && (
            <div className="wave flex items-center gap-[3px]">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <i key={i} style={{ animationDelay: `${i * 0.09}s`, height: `${10 + (i % 3) * 7}px` }} />
              ))}
            </div>
          )}
        </div>

        {/* physical button */}
        <div className="mx-auto mt-3.5 h-[18px] w-[46px] rounded-full bg-gradient-to-b from-[#123f6d] to-[#07294c] ring-1 ring-black/30"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)" }} />
        <div className="mt-2 text-center text-[8px] font-bold tracking-[0.2em] text-[#39769c]">SOUNDBOX</div>
      </div>

      <div className="mt-4 w-[222px] space-y-2">
        <Btn kind="primary" className="w-full" onClick={() => say(briefing)} disabled={!briefing}>
          {lang === "hi" ? "आज की रिपोर्ट सुनें" : "Play evening summary"}
        </Btn>
        {speaking && (
          <Btn kind="ghost" className="w-full" onClick={() => { stopSpeaking(); setSpeaking(false); }}>Stop</Btn>
        )}
      </div>

      <div className="mt-3 w-[222px] rounded-xl border border-[#e2e7ef] bg-white px-3 py-2.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a98ad]">
          {speaking ? "now saying" : "last announcement"}
        </div>
        <div className={`mt-1 text-[11px] leading-snug text-[#42536e] ${lang === "hi" ? "deva" : ""}`}>
          {line || "Nothing yet — press the button above."}
        </div>
      </div>

      <p className="mt-3 w-[222px] text-center text-[10px] leading-relaxed text-[#8a98ad]">
        Already on the counter, already trusted. No app to open, nothing to read.
      </p>
    </div>
  );
}
