// AI curriculum generator — uses MiniMax's text model (same MINIMAX_API_KEY,
// same pay-as-you-go balance) to produce fresh, level-appropriate bilingual
// vocabulary for any theme or lesson. This is what makes lessons effectively
// unlimited and powers the free-text "type your own topic" box.

const CHAT_URL = "https://api.minimax.io/v1/text/chatcompletion_v2";
// Use a non-reasoning text model — reasoning models (e.g. MiniMax-M3) burn the
// whole token budget "thinking" and return empty content for creative tasks.
const MODEL = process.env.MINIMAX_LLM_MODEL || "MiniMax-Text-01";

// Varied real-life scenes so lessons don't all feel the same (market/airport…).
const SCENARIOS = [
  "at a cozy café", "on a road trip with friends", "at a birthday party", "a rainy morning at home",
  "meeting new neighbors", "a sunny day at the beach", "cooking dinner in the kitchen", "at a busy farmers market",
  "on a phone call with grandma", "getting ready for school", "a big family dinner", "exploring a new city",
  "a visit to the doctor", "shopping for new clothes", "dancing at a concert", "a lazy Sunday afternoon",
  "planning a weekend trip", "a first day at a new job", "a walk in the park", "a late-night chat with a friend",
  "at a soccer game", "waiting for the bus", "a picnic in the countryside", "decorating for the holidays",
  "at a small hotel by the sea", "learning to ride a bike", "a morning jog", "ordering at a food truck",
];

// Pick a scene tied loosely to the lesson number (so lessons vary) plus a little randomness.
function pickScenario(lessonNum = 1) {
  const base = (Number(lessonNum) - 1 + Math.floor(Math.random() * 4)) % SCENARIOS.length;
  return SCENARIOS[Math.max(0, base)];
}

// Levels PROGRESS toward conversation: First Words = single words (handled
// separately), Starter = short phrases, Explorer = longer phrases, then sentences.
const TIER_GUIDANCE = {
  starter: "a SHORT 2-4 word phrase each (NOT single words) — simple, useful everyday mini-phrases",
  beginner: "a SHORT 2-4 word phrase each — like Starter but a bit more varied vocabulary; still only 2-4 words, NOT longer yet",
  intermediate: "a short everyday SENTENCE each — natural conversational lines",
  advanced: "a full, natural conversational sentence each",
};

// Returns an array of { es, en } pairs (usually 5). Throws on failure so the
// caller can fall back to curated words.
async function generateLessonVocab({ theme, tier = "beginner", lessonNum = 1, avoid = [], count = 5, language = "Spanish", scenario = "" }) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not set");

  const level = TIER_GUIDANCE[tier] || TIER_GUIDANCE.beginner;
  const avoidList = avoid.slice(0, 300).join(", ");

  const system =
    `You generate ${language}-learning vocabulary. You reply with ONLY a JSON array, no prose, no code fences.`;
  const user =
    `Create exactly ${count} ${language} vocabulary items for a language-learning song.\n` +
    `Theme: "${theme}".\n` +
    `Learner level: ${tier} — use ${level}.\n` +
    `This is lesson ${lessonNum} of a progressive course. Make it clearly DIFFERENT from other lessons — vary the sub-topic and bring genuinely NEW vocabulary; never re-teach the usual obvious words.\n` +
    (scenario ? `Center this lesson on a specific everyday scene: ${scenario}. Pick words that fit that scene.\n` : "") +
    (avoidList ? `NEVER teach any of these already-taught items again — every item must be brand NEW: ${avoidList}.\n` +
      `A previously-taught word may ONLY appear as part of a longer NEW phrase (e.g. use a known color to describe a new noun), never on its own as a repeated item.\n` : "") +
    `Use natural, correct ${language} and accurate English translations.\n` +
    `Return ONLY a JSON array where "es" is the ${language} text and "en" is the English, like: [{"es":"...","en":"hello"},{"es":"...","en":"thank you"}]`;

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`MiniMax LLM HTTP ${res.status}: ${t.slice(0, 300)}`);
  }

  const data = await res.json();
  const status = data?.base_resp?.status_code;
  if (status !== undefined && status !== 0) {
    throw new Error(`MiniMax LLM error ${status}: ${data?.base_resp?.status_msg}`);
  }

  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.messages?.[0]?.content ??
    data?.reply ??
    "";

  const pairs = parsePairs(content);
  if (!pairs.length) throw new Error("LLM returned no usable vocabulary");
  return pairs.slice(0, count);
}

// Pull a clean [{es,en}] array out of the model's text, tolerating code fences.
function parsePairs(text) {
  if (!text) return [];
  let s = String(text).trim();
  s = s.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  try {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((o) => o && typeof o.es === "string" && typeof o.en === "string")
      .map((o) => ({ es: o.es.trim(), en: o.en.trim() }))
      .filter((o) => o.es && o.en);
  } catch {
    return [];
  }
}

// Writes the actual structured bilingual SONG lyrics for a lesson.
// Encodes the teaching method: one target phrase is drilled through a catchy
// chorus (repeated 3-4x), verses give context, and earlier "review" phrases
// are woven back in for spaced repetition. Returns a lyrics string with
// [Verse]/[Pre-Chorus]/[Chorus] tags; each Spanish line is followed by English.
async function generateSongLyrics({ theme, tier = "beginner", targetPhrase, newVocab = [], reviewVocab = [], language = "Spanish", order = "en-es", scenario = "", genre = "" }) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not set");

  // Which language sings first on each pair of lines.
  const first = order === "en-es" ? "English" : language;
  const second = order === "en-es" ? language : "English";
  const target = targetPhrase || newVocab[0] || { es: "hola", en: "hello" };
  const newList = newVocab.map((w) => `${w.es} = ${w.en}`).join("; ");
  const reviewList = reviewVocab.map((w) => `${w.es} = ${w.en}`).join("; ");
  const targetPair = order === "en-es" ? `${target.en}… ${target.es}` : `${target.es}… ${target.en}`;

  const LINE_STYLE = {
    starter: `teach SHORT 2-4 word ${language} phrases (NOT single words) — simple and easy to sing.`,
    beginner: `teach SHORT 2-4 word ${language} phrases (NOT longer yet) — a bit more varied than Starter.`,
    intermediate: `teach short everyday ${language} sentences (conversational), about 5-8 words.`,
    advanced: `teach full, natural conversational ${language} sentences.`,
  };
  const lineStyle = LINE_STYLE[tier] || LINE_STYLE.beginner;

  // Starter levels (prestarter "First Words" + starter) get much stricter rules:
  // clean full-phrase repeats in BOTH languages, almost no English-only filler,
  // steady progress through NEW words, and near-zero ad-libs.
  const isStarter = tier === "starter" || tier === "prestarter";

  // Ad-libs are the #1 source of mindless repetition — keep them rare and unique.
  const adlibRule = isStarter
    ? `- AD-LIBS: use AT MOST ONE tiny spoken ad-lib, only at the very start, and it MUST be in ENGLISH — 2-4 words like "Here we go", "Alright now", "Let's go" — NEVER in ${language}. Do NOT sprinkle ad-libs through the song, and NEVER repeat an ad-lib phrase. At this level nearly every line should teach, not fill.\n`
    : `- AD-LIBS: keep them in ENGLISH (never in ${language}) and use them VERY sparingly — at most 2 in the WHOLE song, each DIFFERENT. NEVER repeat an ad-lib and never lean on a filler catchphrase; never use the word "vibes". Invent fresh English ad-libs that fit${genre ? ` a ${genre}` : " this"} song. A rare sprinkle, never a crutch.\n`;

  // Teaching proportion + how much English-only story filler is allowed.
  const teachRule = isStarter
    ? `- THIS IS A STARTER LEARNING SONG: about 90% of lines must be bilingual teaching pairs "${first}… ${second}". Keep English-only story lines to an absolute minimum (0-2 in the whole song). Beginners need clear, repeated pairs — not story filler.\n`
    : `- THIS IS A LEARNING SONG: aim for roughly 70-75% of lines to be bilingual teaching pairs "${first}… ${second}", with the remaining ~25-30% as English story lines and a few ad-libs. Mostly teaching, with real story flavor mixed in.\n`;

  // Core rule for EVERY level: each teaching line is the SAME phrase in BOTH
  // languages, in full — never half-English/half-Spanish, never a lone word.
  const fullPhraseRule =
    `- FULL-PHRASE REPEAT (critical, EVERY line): each teaching line is ONE complete phrase said FULLY in BOTH languages — e.g. "I want water… Quiero agua". NEVER a partial repeat like "I want water… agua", and NEVER mix languages inside one phrase like "I want agua all day". The ${first} side is 100% ${first}; the ${second} side is 100% ${second}; they mean EXACTLY the same thing, and are the SAME length (if one side is 3 words, so is the other).\n`;

  // Progress through NEW words instead of drilling one phrase the whole song.
  const hookRule = isStarter
    ? `- Write a short catchy [Hook] and repeat it TWICE only. The rest of the song must keep introducing DIFFERENT teaching pairs so the learner meets many new words — do NOT drill the same phrase over and over. Some repetition helps memory, but progress through the new words.\n`
    : `- Write a CATCHY [Hook] with a memorable final line; repeat the SAME hook 3 times through the song and END on it.\n`;

  // Order-aware few-shot example: teaching pairs are "<first>… <second>", so it
  // must flip when the learner picked English → target (en-es).
  const ex = (order === "en-es"
    ? [
        "[Hook]",
        "Hello… Hola",
        "How are you?… ¿Cómo estás?",
        "Let's roll… Vamos",
        "One, two, three… Uno, dos, tres",
        "Come ride with me again.",
        "[Verse]",
        "Sun shining, windows down,",
        "learning words while we cruise around.",
        "Good morning… Buenos días",
        "Starting fresh today.",
        "Thank you… Gracias",
        "Every single time.",
      ]
    : [
        "[Hook]",
        "Hola… Hello",
        "¿Cómo estás?… How are you?",
        "Vamos… Let's roll",
        "Uno, dos, tres… One, two, three",
        "Come ride with me again.",
        "[Verse]",
        "Sun shining, windows down,",
        "learning words while we cruise around.",
        "Buenos días… Good morning",
        "Starting fresh today.",
        "Gracias… Thank you",
        "Every single time.",
      ]
  ).join("\n");

  const system =
    `You are a hit bilingual ${language}/English songwriter for language learning. You write catchy songs that tell a STORY and flow from start to finish, like a real artist. Output ONLY song lyrics — no titles, no explanations, no code fences.`;
  const user =
    `Write a catchy, story-driven bilingual (${language} + English) song that teaches ${language} to a ${tier} learner — make it feel like a real hit song.\n` +
    `Theme: "${theme}".\n` +
    (scenario ? `Scene / story to build on: ${scenario}.\n` : "") +
    `Here is an EXAMPLE of the exact VIBE, FORMAT and FLOW to match. Do NOT reuse its words — write a brand-new song on the theme above:\n` +
    `"""\n` + ex + `\n"""\n` +
    `Match that style EXACTLY:\n` +
    `- CRITICAL LANGUAGE ORDER: every teaching line must be "${first}… ${second}" — the ${first} word FIRST, then the ${second} translation. Follow this order exactly (as in the example above).\n` +
    `- OPEN IN ENGLISH: the very first words of the song (including any intro ad-lib) must be English — NEVER start the song on a ${language} word or line. Begin in English, then bring in the ${language}.\n` +
    adlibRule +
    `- Teach each phrase on ONE line as "${first} phrase… ${second} translation" with "…" between them — e.g. "${targetPair}".\n` +
    `- EVERY "…" line is a TRUE TRANSLATION PAIR: the text before "…" and the text after "…" must mean EXACTLY the same thing — a faithful, accurate, natural translation of each other, the SAME phrase in both languages. Never pad or change one side. WRONG: "Saludo… A greeting everywhere" (one word vs a padded phrase). RIGHT: "A greeting… Un saludo". WRONG: "Good vibes… Buenos momentos" (means "good moments"). RIGHT: "Good vibes… Buenas vibras".\n` +
    fullPhraseRule +
    `- Use ACCURATE, natural ${language}. Never invent a translation that changes the meaning. If a phrase does not translate cleanly, pick a simpler phrase that does.\n` +
    `- English-only STORY lines must NOT contain "…" — reserve "…" ONLY for real translation pairs, so a story line is never mistaken for a translation.\n` +
    `- DO weave in some short English STORY lines (no "…") for flow, rhyme and vibe — they make it feel like a real song. Keep them a MINORITY though: never more than 2 English-only lines in a row, and never a whole verse with zero translations.\n` +
    teachRule +
    `- Commit to ONE clear concept/character/vibe (a road trip, a night out, a day in the city…) that ties every word together.\n` +
    hookRule +
    `- Section tags each on their own line: a short intro, then [Hook], [Verse], [Hook], [Verse], [Bridge], [Hook].\n` +
    `Teaching rules:\n` +
    `- Teach these new words, each as its own "${first}… ${second}" line: ${newList}.\n` +
    (isStarter
      ? `- Teach as MANY of these new words as you can — the learner is here to meet new words, so keep moving to the next one instead of repeating the same few. It's fine to drop 1-2 if they truly won't fit, but cover most of them.\n`
      : `- The SONG comes first: it's fine to drop a few of these words if fitting them all in would hurt the flow, rhyme, or catchiness. A great catchy song with fewer words beats a crammed one.\n`) +
    (reviewList ? `- Lightly bring back these 1-2 earlier words once: ${reviewList}.\n` : "") +
    `- Line length: ${lineStyle}\n` +
    `- Simple, natural, singable ${language} with a steady beat.\n` +
    `- Full song, aim for 800-950 characters (~2-3 min). Never exceed 980 characters.\n` +
    `- Output ONLY the lyrics with the section tags.`;

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.9,
      max_tokens: 3000, // reasoning model: reasoning tokens + a full 2-3 min song
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`MiniMax LLM HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const status = data?.base_resp?.status_code;
  if (status !== undefined && status !== 0) {
    throw new Error(`MiniMax LLM error ${status}: ${data?.base_resp?.status_msg}`);
  }
  let lyrics =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.messages?.[0]?.content ??
    "";
  lyrics = String(lyrics).replace(/```/g, "").trim();
  if (!lyrics || lyrics.length < 20) throw new Error("LLM returned empty lyrics");
  return lyrics;
}

// Post-generation pass over the FULL lyrics: fix every "…" translation pair so
// it reads "English… <language>" (English first), with both halves the SAME
// meaning and an accurate, natural translation. Catches in-song mistranslations
// and word↔phrase mismatches the songwriter sometimes makes. Leaves story lines,
// section tags and line count untouched. Returns originals if the pass fails.
async function fixSungPairs(lyrics, language = "Spanish", order = "en-es") {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey || !lyrics || !lyrics.includes("…")) return lyrics;
  const first = order === "en-es" ? "English" : language;
  const second = order === "en-es" ? language : "English";
  const system = `You are a meticulous ${language}/English lyric editor. Output ONLY the corrected lyrics — no notes, no code fences.`;
  const user =
    `Below are bilingual song lyrics that teach ${language}. Correct ONLY the translation pairs; keep everything else byte-for-byte the same (every [Section] tag, every English-only story line, the exact number and order of lines).\n` +
    `For EVERY line containing "…":\n` +
    `1) It must read "${first} phrase… ${second} phrase" — the ${first} FIRST, then the ${second}.\n` +
    `2) Both halves must mean EXACTLY the same thing: a faithful, natural, accurate translation of each other. Fix any wrong, padded or mismatched translation. Examples: "Good vibes… Buenos momentos" → "Good vibes… Buenas vibras"; "Saludo… A greeting everywhere" → "A greeting… Un saludo".\n` +
    `Do NOT add or remove lines. Do NOT touch lines without "…".\n` +
    `Lyrics:\n"""\n${lyrics}\n"""\n` +
    `Output ONLY the corrected lyrics.`;
  try {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.2, max_tokens: 3000 }),
    });
    if (!res.ok) return lyrics;
    const data = await res.json();
    if (data?.base_resp?.status_code) return lyrics;
    let out = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.messages?.[0]?.content ?? "";
    out = String(out).replace(/```/g, "").trim();
    // Sanity: keep only if it looks like real lyrics of a similar size.
    if (out.length > 40 && out.includes("…")) return out;
  } catch {}
  return lyrics;
}

// Second-pass check: fix incorrect or unnatural translations before the song
// is built. Returns corrected pairs, or the originals if the check fails.
async function validateVocab(vocab, language = "Spanish") {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey || !Array.isArray(vocab) || vocab.length === 0) return vocab;
  const list = vocab.map((w, i) => `${i + 1}. ${w.es} = ${w.en}`).join("\n");
  const system = `You are a meticulous ${language} and English translator. You reply with ONLY a JSON array.`;
  const user =
    `Check these ${language}→English vocabulary pairs for a beginner learner. ` +
    `If the ${language} is wrong, misspelled, or unnatural, or the English translation is inaccurate, correct it (keep the same meaning and topic). Keep the same count and order.\n${list}\n` +
    `Return ONLY a JSON array where "es" is the ${language} and "en" is the English: [{"es":"...","en":"..."}]`;
  try {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });
    if (!res.ok) return vocab;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const fixed = parsePairs(content);
    // Only accept if it returned a sane, similar-length list.
    if (fixed.length >= Math.min(vocab.length, 3)) return fixed.slice(0, vocab.length);
    return vocab;
  } catch {
    return vocab;
  }
}

// Turn a user's list of specific words/phrases into {es,en} pairs (translating
// whichever direction is needed) so the song teaches exactly those words.
async function translateWords(words, language = "Spanish") {
  const apiKey = process.env.MINIMAX_API_KEY;
  const fallback = words.map((w) => ({ es: w, en: w }));
  if (!apiKey || !Array.isArray(words) || words.length === 0) return fallback;
  const list = words.map((w, i) => `${i + 1}. ${w}`).join("\n");
  const system = `You are a ${language}/English translator. You reply with ONLY a JSON array.`;
  const user =
    `A learner wants to learn these exact words/phrases in ${language}. For each item, give the ${language} and the English. ` +
    `If an item is written in English, translate it to ${language}. If it's already in ${language}, keep it and add the English. Keep the same order and count.\n${list}\n` +
    `Return ONLY a JSON array where "es" is the ${language} and "en" is the English: [{"es":"...","en":"..."}]`;
  try {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const pairs = parsePairs(content);
    return pairs.length ? pairs : fallback;
  } catch {
    return fallback;
  }
}

module.exports = { generateLessonVocab, generateSongLyrics, pickScenario, validateVocab, translateWords, fixSungPairs };
