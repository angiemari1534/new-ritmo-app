// MiniMax Music generation.
// Docs: https://platform.minimax.io/docs/guides/music-generation
// POST https://api.minimax.io/v1/music_generation
//   headers: Authorization: Bearer <key>, Content-Type: application/json
//   body: { model, prompt, lyrics, audio_setting, output_format }
// With output_format:"url" the response returns a playable MP3 URL.

const MINIMAX_URL = "https://api.minimax.io/v1/music_generation";
const MODEL = process.env.MINIMAX_MODEL || "music-3.0";

// Rich, genre-authentic descriptors so each song actually feels like its genre
// (real instrumentation + production vibe) instead of a generic backing track.
// Each genre gets a DISTINCTIVE set of signature instruments so songs don't all
// sound alike — the specific instruments here are the main lever, so keep them
// vivid and true to the genre.
const GENRE_STYLE = {
  Pop: "bright modern synth-pop, shimmering synth arps, layered vocal harmonies, tight electronic beat, huge radio chorus",
  Latin: "latin pop, warm nylon guitar, congas and timbales, bright brass stabs, danceable clave groove",
  Reggaeton: "reggaeton, signature dembow riddim, deep sub-bass, staccato synth stabs, latin percussion",
  "R&B": "smooth contemporary R&B, silky Rhodes electric piano, mellow trap-soul drums, lush pads, sultry bassline",
  "Hip-Hop": "chill hip-hop, smooth mellow 808 bass, light hi-hats, soft synth pads, relaxed easy beat",
  Rap: "laid-back boom-bap rap, mellow vinyl drums, warm upright bass, soft jazzy piano, relaxed head-nod groove",
  Soul: "classic Motown soul, warm horn section, Hammond organ, tight rhythm guitar, finger-snap groove",
  Country: "modern country, warm acoustic guitar and mellow slide electric guitar, raw gravelly soulful vocals, laid-back easy groove, warm upright bass, Southern Americana storytelling, moody and heartfelt, real country not pop",
  Rock: "energetic guitar rock, driving distorted electric guitar riffs, punchy live drums, solid bass, big anthemic rock chorus, powerful but melodic",
  "Classic Rock": "70s classic rock anthem, driving distorted electric guitar riffs, bluesy guitar solo, Hammond organ, punchy live drums, big sing-along chorus, raw analog rock energy",
  Alternative: "90s alternative rock, driving distorted guitars, loud-quiet dynamics, gritty melodic vocals, punchy live drums, anthemic indie-rock energy, not pop",
  Blues: "gritty electric blues, wailing bent-note slide guitar licks, 12-bar shuffle, walking bassline, brushed drums, soulful raspy blues vocals, smoky bar feel",
  EDM: "bright melodic EDM, warm synths, gentle pads, danceable four-on-the-floor, uplifting and clear",
  Disco: "70s disco, funky wah-wah guitar, smooth slap bass, steady four-on-the-floor, warm strings and horns",
  Club: "melodic dance, warm synth bass, bright plucks, steady four-on-the-floor, feel-good energy",
  Acoustic: "intimate acoustic, fingerpicked nylon guitar, soft cajón, gentle strings, warm airy feel",
  Gospel: "uplifting gospel, rich choir harmonies, Hammond organ, grand piano, hand claps, joyful swell",
  Salsa: "lively salsa, bright brass section, piano montuno, congas timbales and bongó, walking tumbao bass",
  Bachata: "romantic bachata, lead requinto guitar, syncopated rhythm guitar, bongó and güira, soft bass",
  Cumbia: "cheerful cumbia, lilting accordion, güira scraper, gliding bass, danceable latin groove",
  Reggae: "laid-back roots reggae, offbeat guitar skank, deep warm bass, one-drop drums, organ bubble, sunny relaxed groove",
  Jazz: "smooth jazz, warm grand piano, upright bass, brushed drums, muted trumpet, saxophone",
  "Children's": "playful children's song, glockenspiel, ukulele, bouncy piano, hand claps, cheerful whistle",
  Folk: "acoustic folk, warm strummed guitar, mandolin, harmonica, brushed snare, organic storytelling feel",
  // ---- 80s & 90s throwback styles ----
  "80s Synthpop": "80s synth-pop, bright analog synths, gated-reverb drums, punchy synth bass, neon melodic hooks, Depeche Mode and a-ha vibe",
  "80s New Wave": "80s new wave, jangly chorus-effect guitar, pulsing synths, driving post-punk drums, catchy angular hooks",
  "80s Rock": "80s arena rock, big bright electric guitars, anthemic gang-vocal choruses, huge gated drums, stadium energy",
  "90s Grunge": "90s grunge, distorted sludgy guitars, loud-quiet dynamics, raw angsty vocals, heavy drums, Seattle sound",
  "90s Hip-Hop": "90s boom-bap hip-hop, dusty vinyl drums, jazzy sample loops, deep warm bass, laid-back head-nod groove",
  "90s R&B": "90s R&B, smooth new jack swing groove, silky vocal harmonies, warm synth pads, finger-snap beat",
  "90s Dance": "90s eurodance, energetic four-on-the-floor, catchy synth riffs, rave stabs, upbeat pop-dance vocals",
  "90s Pop": "90s pop, bright catchy hooks, upbeat guitars and synths, polished radio production, feel-good energy",
};

// Tempo → an explicit BPM range so the model locks to a real, danceable beat.
const TEMPO_BPM = {
  Slow: "relaxed slow tempo around 75 BPM",
  Normal: "steady mid-tempo groove around 100 BPM",
  Fast: "fast high-energy tempo around 128 BPM",
};

// Turn the user's picks into a MiniMax style prompt (kept under MiniMax's limit).
// Order = priority: whatever gets trimmed at the 290-char cap should be the
// least important, so genre + realism + the user's reference come first, and
// the rhythm/groove cues sit right after.
function buildStylePrompt({ genre, beat, artistFeel, similarSongs, level, language = "Spanish", voice }) {
  const parts = [];
  // 1) Genre identity + reference artist.
  parts.push(GENRE_STYLE[genre] || (genre ? `${genre} music` : "catchy melodic song"));
  if (artistFeel) parts.push(`in the style of ${artistFeel}`);
  // Voice next (high priority so the char cap never trims it — esp. duet).
  if (voice === "male") parts.push("mature adult male lead vocals");
  else if (voice === "female") parts.push("warm low raspy husky female lead vocals, calm smooth and soulful, mellow not piercing or shrill, grown woman not a child");
  else if (voice === "duet") parts.push("male and female adult duet trading lines and harmonizing, the woman raspy and soulful");
  else if (voice === "duet-m") parts.push("two adult male singers, a male-male duet trading lines and harmonizing");
  else if (voice === "duet-f") parts.push("two adult female singers, a female-female duet trading lines and harmonizing, raspy and soulful not shrill");
  // Tempo comes from the LAST word of the song's beat ("Groovy Normal" -> Normal),
  // so I can nudge just one song faster/slower without changing the others.
  const tempoWord = String(beat || "").trim().split(/\s+/).pop();
  const TEMPO_PHRASE = {
    Slow: "relaxed easy tempo",
    Normal: "steady medium tempo",
    Upbeat: "lively upbeat tempo, a little faster, energetic but not rushed",
    Fast: "fast high-energy tempo",
  };
  const tempoPhrase = TEMPO_PHRASE[tempoWord] || "steady medium tempo";
  // The feel — tied to the GENRE so it stays true to it (country stays country,
  // reggaeton stays reggaeton) instead of drifting into generic pop.
  parts.push(`authentic ${genre || "pop"} song true to the ${genre || "pop"} style and instruments, catchy and grown-up, ${tempoPhrase}, clear vocals loud over soft backing, mature not a childish kids song`);
  parts.push(`correct native ${language} pronunciation`);
  if (similarSongs) parts.push(`reminiscent of ${similarSongs}`);
  parts.push(`bilingual ${language} and English lyrics sung clearly`);

  let prompt = parts.join(", ");
  // MiniMax caps the style prompt (~300 chars); trim on a comma boundary if needed.
  if (prompt.length > 290) {
    prompt = prompt.slice(0, 290);
    prompt = prompt.slice(0, prompt.lastIndexOf(","));
  }
  return prompt;
}

async function generateSong({ lyrics, genre, beat, artistFeel, similarSongs, level, language = "Spanish", voice }) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not set");

  const prompt = buildStylePrompt({ genre, beat, artistFeel, similarSongs, level, language, voice });

  const body = {
    model: MODEL,
    prompt,
    lyrics,
    audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
    output_format: "url",
  };

  // Music generation can take a while; allow up to 3 minutes.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  let res;
  try {
    res = await fetch(MINIMAX_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MiniMax HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const result = await res.json();

  // MiniMax wraps status in base_resp; 0 means success. Turn the common failure
  // codes into plain-language messages the app can show the user directly.
  const status = result?.base_resp?.status_code;
  if (status !== undefined && status !== 0) {
    const FRIENDLY = {
      1008: "Your MiniMax music balance is empty. Add funds at platform.minimax.io to keep creating songs.",
      1004: "MiniMax couldn't authenticate — check that your MiniMax API key is valid.",
      1002: "MiniMax is rate-limiting requests right now. Wait a moment and try again.",
      1039: "MiniMax is rate-limiting requests right now. Wait a moment and try again.",
    };
    const friendly = FRIENDLY[status] || `MiniMax error ${status}: ${result?.base_resp?.status_msg || "unknown"}`;
    throw new Error(friendly);
  }

  const audio = extractAudio(result);
  if (!audio) {
    throw new Error(
      "MiniMax returned no audio. Response keys: " +
        JSON.stringify(Object.keys(result || {}))
    );
  }

  // Normalize to either a streamable URL or a raw MP3 buffer.
  if (audio.url) return { audioUrl: audio.url, prompt, raw: result };
  return { audioBuffer: Buffer.from(audio.hex, "hex"), prompt, raw: result };
}

// The audio may arrive as a URL (output_format:"url") or as a hex string.
// We requested a URL, so prefer that; fall back to detecting either shape.
function extractAudio(result) {
  const candidates = [
    result?.data?.audio,
    result?.audio,
    result?.data?.audio_url,
    result?.data?.url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) {
      if (c.startsWith("http")) return { url: c }; // URL
      if (/^[0-9a-fA-F]{16,}$/.test(c)) return { hex: c }; // hex-encoded mp3
    }
  }
  return null;
}

module.exports = { generateSong, buildStylePrompt, GENRE_STYLE, TEMPO_BPM };
