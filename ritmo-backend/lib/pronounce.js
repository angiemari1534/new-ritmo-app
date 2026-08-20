// Pronunciation check: transcribe the learner's spoken audio (ElevenLabs Scribe
// speech-to-text) and score how close it is to the target phrase.
const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

// ISO 639-1 (from the app's lang like "es-ES") -> ISO 639-3 for Scribe.
const LANG3 = { es: "spa", fr: "fra", it: "ita", de: "deu", pt: "por", en: "eng" };

// Normalize for comparison: lowercase, strip accents and punctuation.
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein distance → similarity ratio 0..1.
function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return 1 - dp[m][n] / Math.max(m, n);
}

async function transcribe(audioBuffer, lang = "es") {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !audioBuffer) throw new Error("no key or audio");
  const code = LANG3[String(lang).slice(0, 2).toLowerCase()] || null;
  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: "audio/mp4" }), "speech.m4a");
  form.append("model_id", "scribe_v1");
  if (code) form.append("language_code", code);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let res;
  try {
    res = await fetch(STT_URL, { method: "POST", headers: { "xi-api-key": apiKey }, body: form, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Speech-to-text HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return String(data?.text || "").trim();
}

// Transcribe + score against the target phrase.
async function checkPronunciation(audioBuffer, target, lang = "es") {
  const heard = await transcribe(audioBuffer, lang);
  const nT = norm(target), nH = norm(heard);
  const score = Math.round(similarity(nT, nH) * 100);
  // Also accept if the target words are all present (handles extra filler words).
  const targetWords = nT.split(" ").filter(Boolean);
  const heardWords = new Set(nH.split(" ").filter(Boolean));
  const covered = targetWords.length ? targetWords.filter((w) => heardWords.has(w)).length / targetWords.length : 0;
  const best = Math.max(score, Math.round(covered * 100));
  const verdict = best >= 85 ? "correct" : best >= 60 ? "close" : "tryagain";
  return { heard, score: best, verdict };
}

module.exports = { checkPronunciation, transcribe };
