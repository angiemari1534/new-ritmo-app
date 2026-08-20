// fal.ai music generation — MiniMax Music 2.5 hosted on fal.
// Replaces the discontinued direct MiniMax Music API. We reuse the SAME style
// prompt builder as before, so all of Angie's preferences (genre, deep chill
// vocals, no soul/salsa/reggae, etc.) carry straight over.
// Docs: https://fal.ai/models/fal-ai/minimax-music/v2.5/api
const { buildStylePrompt } = require("./minimax");

const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/minimax-music/v2.5";
const FAL_SYNC = `https://fal.run/${FAL_MODEL}`;

// Pull a playable audio URL out of fal's result, whatever exact shape it uses.
function extractFalAudio(r) {
  const cands = [
    r?.audio?.url, r?.audio_url, r?.audio?.file_url, r?.output?.audio?.url,
    r?.audio_file?.url, r?.url,
  ];
  for (const c of cands) if (typeof c === "string" && c.startsWith("http")) return c;
  return null;
}

async function generateSongFal({ lyrics, genre, beat, artistFeel, similarSongs, level, language = "Spanish", voice, arrangement }) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error("FAL_KEY is not set");

  const prompt = buildStylePrompt({ genre, beat, artistFeel, similarSongs, level, language, voice, arrangement });

  // MiniMax Music 2.5 on fal: prompt (style, <=2000 chars) + lyrics (<=3500).
  const body = { prompt: prompt.slice(0, 2000), lyrics: String(lyrics).slice(0, 3500) };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000); // songs can take a couple minutes
  let res;
  try {
    res = await fetch(FAL_SYNC, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fal.ai HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const result = await res.json();
  const audioUrl = extractFalAudio(result);
  if (!audioUrl) {
    throw new Error("fal.ai returned no audio URL. Keys: " + JSON.stringify(Object.keys(result || {})));
  }
  return { audioUrl, prompt, raw: result };
}

module.exports = { generateSongFal };
