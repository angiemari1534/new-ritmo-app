// ElevenLabs Text-to-Speech for the "Pronunciation practice" track.
// Docs: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
// POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
//   headers: xi-api-key: <key>, Content-Type: application/json, Accept: audio/mpeg
//   body: { text, model_id, voice_settings }
// Returns raw MP3 audio bytes. eleven_multilingual_v2 speaks both Spanish
// and English clearly, so one call handles the bilingual practice clip.

const TTS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
// "Rachel" is a stable default multilingual voice; override via env if desired.
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

// Build a slow, clear "spanish ... english" spoken script from vocab pairs.
function buildPracticeScript(vocab) {
  // Ellipses insert natural pauses so learners can repeat after each word.
  return vocab.map((w) => `${w.es}. ${w.en}.`).join(" ... ");
}

async function generatePronunciation(vocab) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const text = buildPracticeScript(vocab);

  const res = await fetch(`${TTS_BASE}/${DEFAULT_VOICE}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return { audioBuffer: Buffer.from(arrayBuf), script: text };
}

module.exports = { generatePronunciation, buildPracticeScript };
