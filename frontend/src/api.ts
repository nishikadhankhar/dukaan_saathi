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
  recent: (mid: string) => fetch(`/api/merchants/${mid}/recent`).then(J),
  loan: (mid: string) => fetch(`/api/loan/${mid}`).then(J),
  applyLoan: (mid: string) =>
    fetch(`/api/loan/${mid}/apply`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }) }).then(J),
  trace: (mid: string) => fetch(`/api/trace/${mid}`).then(J),
  reset: () => fetch("/api/reset", { method: "POST" }).then(J),
};

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

/** Speak through the browser. Voices load async, so we retry once. */
export function speak(text: string, lang: "hi" | "en", onEnd?: () => void) {
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

export const stopSpeaking = () => window.speechSynthesis?.cancel();
