const J = async (r: Response) => { if (!r.ok) throw new Error(await r.text()); return r.json(); };

export const api = {
  health: () => fetch("/api/health").then(J),
  merchants: () => fetch("/api/merchants").then(J),
  home: (mid: string, lang: string) => fetch(`/api/merchants/${mid}?lang=${lang}`).then(J),
  opportunity: (mid: string, play: string, lang: string) =>
    fetch(`/api/opportunities/${mid}/${play}?lang=${lang}`).then(J),
  provenance: (ref: string) => fetch(`/api/provenance/${ref}`).then(J),
  approve: (merchant_id: string, play: string) =>
    fetch("/api/approve", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id, play }) }).then(J),
  fastForward: (cid: string, lang: string) =>
    fetch(`/api/campaigns/${cid}/fast-forward?lang=${lang}`, { method: "POST" }).then(J),
  recent: (mid: string, n = 6) => fetch(`/api/merchants/${mid}/recent?n=${n}`).then(J),
  campaign: (cid: string) => fetch(`/api/campaigns/${cid}`).then(J),
  loan: (mid: string) => fetch(`/api/loan/${mid}`).then(J),
  applyLoan: (mid: string) =>
    fetch(`/api/loan/${mid}/apply`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }) }).then(J),
  trace: (mid: string) => fetch(`/api/trace/${mid}`).then(J),
  reset: () => fetch("/api/reset", { method: "POST" }).then(J),
};

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

let current: HTMLAudioElement | null = null;

/** Speak a line. Prefer the pre-generated natural voice (Gemini TTS, served by
 *  /api/tts); if this line was never generated, use the browser's own voice. */
export function speak(text: string, lang: "hi" | "en", onEnd?: () => void) {
  stopSpeaking();
  let done = false;
  const finish = () => { if (!done) { done = true; onEnd?.(); } };
  const a = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);
  current = a;
  a.onended = finish;
  a.onerror = () => { if (current === a) { current = null; browserSpeak(text, lang, finish); } };
  a.play().catch(() => { if (current === a) { current = null; browserSpeak(text, lang, finish); } });
}

function browserSpeak(text: string, lang: "hi" | "en", onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) { onEnd?.(); return; }
  synth.cancel();
  const go = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    const voices = synth.getVoices();
    const v = voices.find((x) => x.lang === u.lang) || voices.find((x) => x.lang.startsWith(lang));
    if (v) u.voice = v;
    u.rate = 0.96; u.pitch = 1;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    synth.speak(u);
  };
  if (synth.getVoices().length === 0) setTimeout(go, 250); else go();
}

export const stopSpeaking = () => {
  if (current) { current.onerror = null; current.pause(); current = null; }
  window.speechSynthesis?.cancel();
};
