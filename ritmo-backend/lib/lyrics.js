// Builds bilingual sung lyrics: each Spanish line is immediately followed by
// its English translation, so a listener hears the Spanish, then the meaning.
//
// A song is built for one LESSON. Where do the words come from?
//   • Custom topic typed by the user  -> AI generates them (lib/llm.js)
//   • Early lessons of a known subject -> curated words (fast, reliable, free)
//   • Later lessons of a known subject -> AI generates fresh words
// This is what makes lessons effectively unlimited and covers the language.

const { getLessonVocab, lessonCount, tierWords, SUBJECTS } = require("./vocab");
const { generateLessonVocab, generateSongLyrics, pickScenario, validateVocab, translateWords, fixSungPairs } = require("./llm");

const MAX_LYRICS = 990; // just under MiniMax's 1000-char cap (fuller = longer song)

const HOOKS = {
  numbers: { es: "Vamos a contar", en: "Let's count together" },
  colors: { es: "Colores por aquí", en: "Colors everywhere" },
  greetings: { es: "Hola, hola a ti", en: "Hello, hello to you" },
  vacation: { es: "Nos vamos a viajar", en: "We're going to travel" },
  cooking: { es: "Vamos a cocinar", en: "Let's start cooking now" },
  family: { es: "Toda mi familia", en: "All of my family" },
  days: { es: "Día tras día", en: "Day after day" },
  food: { es: "Vamos a comer", en: "Let's go and eat" },
  animals: { es: "Los animales", en: "All of the animals" },
  body: { es: "Mi cuerpo y yo", en: "My body and me" },
  clothing: { es: "¿Qué me voy a poner?", en: "What am I gonna wear?" },
  weather: { es: "¿Qué tiempo hará?", en: "What's the weather like?" },
  feelings: { es: "¿Cómo te sientes?", en: "How are you feeling?" },
  home: { es: "En mi casa", en: "Here in my home" },
  directions: { es: "¿Por dónde voy?", en: "Which way do I go?" },
  shopping: { es: "Vamos de compras", en: "Let's go shopping now" },
  verbs: { es: "Palabras de acción", en: "Words of action" },
  default: { es: "Aprende conmigo", en: "Come and learn with me" },
};

const TIER_LABEL = { prestarter: "First Words", starter: "Starter", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

const WORDS_PER_PRESTARTER = 6; // new words introduced per Pre-Starter lesson

// True if both sides of a pair are 1-3 words (fits the Starter format).
function isShortPair(w) {
  return (
    String(w.en || "").trim().split(/\s+/).length <= 3 &&
    String(w.es || "").trim().split(/\s+/).length <= 3
  );
}

// Starter songs: English word, then its Spanish repeat, one word per line, for a
// first-time learner. No sentences — just the words. Teaches ~10-12 distinct
// words per song, with a short repeated hook so it's still catchy and memorable.
// Turn the vocab into singable line-pairs. Single words are grouped into short
// comma lists (e.g. "red, blue, green" / "rojo, azul, verde") so it flows, but
// any multi-word item (e.g. "to cook", "good morning") gets its own line so we
// never mash unrelated words into a nonsense phrase. Returns [enLine, esLine].
function chunkPairs(words) {
  const isSingle = (w) =>
    String(w.en).trim().split(/\s+/).length === 1 &&
    String(w.es).trim().split(/\s+/).length === 1;
  const sizePattern = [3, 2, 3, 2, 3]; // vary how many single words per line
  const pairs = [];
  let i = 0;
  let si = 0;
  while (i < words.length) {
    if (!isSingle(words[i])) {
      // Multi-word item stands on its own line (already a coherent phrase).
      pairs.push([String(words[i].en).trim(), String(words[i].es).trim()]);
      i++;
      continue;
    }
    // Merge a few consecutive single words into one comma-separated list line.
    const target = sizePattern[si++ % sizePattern.length];
    const en = [];
    const es = [];
    while (i < words.length && isSingle(words[i]) && en.length < target) {
      en.push(String(words[i].en).trim());
      es.push(String(words[i].es).trim());
      i++;
    }
    pairs.push([en.join(", "), es.join(", ")]);
  }
  return pairs;
}

function buildStarterLyrics(vocab, recall = []) {
  const words = vocab.filter(isShortPair).slice(0, 15);
  if (words.length < 2) return null;
  // 1-2 already-learned words, woven into the choruses for deliberate recall.
  const newKeys = new Set(words.map((w) => w.es));
  const rec = recall.filter(isShortPair).filter((w) => !newKeys.has(w.es)).slice(0, 2);
  const hook = words.slice(0, Math.min(3, words.length)); // small catchy refrain
  const half = Math.ceil(words.length / 2);
  const v1 = words.slice(0, half);
  const v2 = words.slice(half).length ? words.slice(half) : words.slice(0, half);
  const emit = (out, list) => {
    for (const [en, es] of chunkPairs(list)) {
      out.push(en); // English phrase (1-3 words)
      out.push(es); // Spanish repeat
    }
  };
  const chorus = (out) => {
    emit(out, hook);
    if (rec.length) emit(out, rec); // recall of earlier words
  };
  const lines = [];
  lines.push("[Verse]");
  emit(lines, v1);
  lines.push("[Chorus]");
  chorus(lines);
  lines.push("[Verse]");
  emit(lines, v2);
  lines.push("[Chorus]");
  chorus(lines);
  lines.push("[Bridge]"); // quick run through every new word once more
  emit(lines, words);
  lines.push("[Outro]");
  chorus(lines);
  return lines.join("\n");
}

// The full ordered pool of short (1-3 word) curated words for a subject, across
// every tier, deduped. A Starter learner works through this pool lesson by
// lesson, so each Starter lesson introduces a fresh block of words.
function starterPool(subject) {
  const s = SUBJECTS[subject];
  if (!s) return [];
  const all = [...(s.beginner || []), ...(s.intermediate || []), ...(s.advanced || [])];
  const seen = new Set();
  const out = [];
  for (const w of all) {
    const short =
      String(w.en || "").trim().split(/\s+/).length <= 3 &&
      String(w.es || "").trim().split(/\s+/).length <= 3;
    if (short && !seen.has(w.es)) {
      seen.add(w.es);
      out.push(w);
    }
  }
  return out;
}

// ---- Pre-Starter ("First Words") ----------------------------------------
// This level is one long, gentle track of 100 lessons that teaches WORDS, one at
// a time, before the learner ever meets a phrase. Words are drawn from a single
// ordered pool gathered across every subject (greetings first, then numbers,
// colors …) so useful vocabulary arrives in a sensible order.
const WORD_POOL_ORDER = [
  "greetings", "numbers", "colors", "family", "food", "days", "feelings",
  "animals", "body", "clothing", "weather", "home", "directions", "shopping",
  "verbs", "cooking", "vacation",
];

// One big deduped pool of short (1-3 word) words across all subjects, in order.
function combinedWordPool() {
  const seen = new Set();
  const out = [];
  for (const subj of WORD_POOL_ORDER) {
    for (const w of starterPool(subj)) {
      if (!seen.has(w.es)) {
        seen.add(w.es);
        out.push(w);
      }
    }
  }
  return out;
}

// Short spoken callouts sprinkled between words — in ENGLISH, so a brand-new
// learner understands the encouragement and only the words being taught are in
// Spanish. Kept different within a song by stepping through the list; NEVER the
// word "vibes".
const WORD_ADLIBS = [
  // short punchy hit-song callouts (woven in for catchiness)
  "Yeah!", "Woo!", "Oh!", "Hey!", "Uh!", "Oh yeah!", "Woo-hoo!", "Let's go!", "Come on!",
  "Go go go!", "Let's get it!", "Uh-huh!", "Hey hey!", "Yeah yeah!", "Oh-oh!", "Sing it!",
  "Ooh!", "Whoa!", "Alright!", "C'mon now", "Big time", "You know it", "That's right",
  "Give it up", "Let it flow", "Feel it now", "Say what?", "Oh my!", "Let's move", "Hands up",
  "Do it again", "Groove with me", "Feel the rhythm", "Hit it!", "Break it down",
  "Yes yes!", "Uh yeah", "Oh oh oh", "La la la", "Na na na", "Come on now", "Let's roll",
  "Turn it up now", "Ride the beat", "Take it away", "Bring it back",
  "One more round", "Here it comes", "All together", "Step it up", "Lock it in",
  // encouraging callouts
  "Listen up!", "One more time", "Nice work!", "Feel the beat", "That's it!", "Repeat with me",
  "Say it again", "Here we go", "Let's sing!", "You got this", "Sounds great", "Sing it out",
  "Let's learn!", "You're doing great", "Keep it up", "Say it loud", "With me now",
  "Almost there", "Nice one!", "Follow along", "That's the way", "Let's hear it", "Sing along",
  "You've got it", "Nice and easy", "One more word", "Say it with me", "Let's practice",
];

// A fresh, SHUFFLED, non-repeating sequence of English ad-libs for one song — so
// every song's callouts are different and no two in a row repeat. Random each
// generation (this runs on the server, not in a workflow).
function makeAdlibPicker() {
  const pool = [...WORD_ADLIBS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let idx = 0;
  return () => pool[idx++ % pool.length];
}

// Build a Pre-Starter song: a fuller, singable song that teaches each word one at
// a time and REPEATS the small set of new words across verses, a catchy repeated
// chorus, and a bridge — so it has real length, melody and tempo without adding
// new vocabulary. EVERY teaching line is bilingual (English then Spanish, or the
// learner's chosen order); the ad-libs are English. No section is Spanish-only.
function buildWordLyrics(words, order = "en-es", recall = []) {
  if (!Array.isArray(words) || words.length < 2) return null;
  const enFirst = order !== "es-en"; // en-es => English meaning first, then Spanish
  const seed = words.reduce((a, w) => a + String(w.es || "").length, words.length);
  const adlib = makeAdlibPicker(); // fresh, different, non-repeating per song

  // A bilingual pair in the chosen order.
  const pair = (w) => {
    const en = String(w.en || "").trim();
    const es = String(w.es || "").trim();
    if (!en || !es) return null;
    return enFirst ? [en, es] : [es, en];
  };
  // Teach one word: say it in both languages, then reinforce the Spanish once.
  const teach = (out, w) => {
    const p = pair(w);
    if (!p) return;
    const es = String(w.es || "").trim();
    out.push(p[0], p[1], es);
  };
  // The catchy hook — the first few words as bilingual pairs, sung several times.
  const hookWords = words.slice(0, Math.min(3, words.length));
  const hook = (out) => {
    for (const w of hookWords) {
      const p = pair(w);
      if (p) out.push(p[0], p[1]);
    }
  };

  // Recall: only SOME songs (~half, deterministic) fold in ONE earlier word, and
  // it's woven into a MIDDLE verse — never at the front, never a clump.
  const recallWord = recall && recall.length && seed % 2 === 0 ? recall[0] : null;
  const recallAt = words.length >= 4 ? 2 : -1; // a middle verse, not the first

  const lines = ["[Intro]", adlib(), adlib()];
  // Ad-libs are woven all through the song — opening each verse, between the words,
  // and tagging both sides of every chorus — for a catchy, hit-song feel.
  for (let i = 0; i < words.length; i += 2) {
    lines.push("[Verse]", adlib());
    teach(lines, words[i]);
    lines.push(adlib()); // woven between the words
    if (words[i + 1]) teach(lines, words[i + 1]);
    if (recallWord && i === recallAt) teach(lines, recallWord); // one old word, mid-song
    lines.push(adlib());
    lines.push("[Chorus]", adlib());
    hook(lines);
    lines.push(adlib());
  }
  // Bridge: run through every NEW word once as a bilingual pair, with callouts.
  lines.push("[Bridge]", adlib());
  for (const w of words) {
    const p = pair(w);
    if (p) lines.push(p[0], p[1]);
  }
  lines.push(adlib());
  // Final hook to end on the catchy part.
  lines.push("[Chorus]", adlib());
  hook(lines);
  lines.push("[Outro]", adlib(), adlib());
  return lines.join("\n");
}

// Assemble a full Pre-Starter lesson (word selection + song) — ONE word at a
// time. Respects the chosen TOPIC:
//   • a known subject (Colors, Numbers…) -> that subject's words
//   • a custom typed topic               -> AI-generated words on that topic
//   • the guided "words" track           -> the mixed all-topics pool
// Falls back to AI generation once a topic's curated words run out.
async function buildPreStarterLesson({ subject = "words", topic = "", lessonNum, language, order, avoidWords = [] }) {
  const customTopic = (topic || "").trim();
  const isGuidedTrack = !subject || subject === "words";
  const knownSubject = !customTopic && !isGuidedTrack && SUBJECTS[subject] && language === "Spanish";
  // The theme the AI stays on when it has to generate (topic label or custom text).
  const theme = customTopic || (SUBJECTS[subject] ? SUBJECTS[subject].label : "common everyday words");
  const label = customTopic
    ? (customTopic.length > 40 ? customTopic.slice(0, 38) + "…" : customTopic)
    : SUBJECTS[subject] && !isGuidedTrack
    ? SUBJECTS[subject].label
    : "First Words";

  // Pick the word pool for this topic (Spanish curated). Empty pool → AI branch.
  let pool = [];
  if (language === "Spanish") {
    if (knownSubject) pool = starterPool(subject); // e.g. all short Colors words
    else if (isGuidedTrack) pool = combinedWordPool(); // mixed all-topics track
  }

  let vocab = [];
  let recall = [];
  if (pool.length) {
    const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const known = new Set((avoidWords || []).map(norm));
    // Start at this lesson's block, but if the learner already knows every word in
    // it, skip forward to the next block of NEW words — so songs always advance.
    let start = (lessonNum - 1) * WORDS_PER_PRESTARTER;
    while (
      start + WORDS_PER_PRESTARTER <= pool.length &&
      pool.slice(start, start + WORDS_PER_PRESTARTER).every((w) => known.has(norm(w.es)))
    ) {
      start += WORDS_PER_PRESTARTER;
    }
    vocab = pool.slice(start, start + WORDS_PER_PRESTARTER);
    recall = pool
      .slice(Math.max(0, start - WORDS_PER_PRESTARTER * 3), start)
      .filter((w) => known.has(norm(w.es)))
      .slice(-2);
  }

  if (vocab.length < WORDS_PER_PRESTARTER) {
    // Custom topic, non-Spanish, or a topic whose curated words ran out: ask the
    // AI for fresh simple words ON THIS TOPIC (so Colors stays colors, etc.).
    try {
      const gen = await generateLessonVocab({
        theme,
        tier: "starter",
        lessonNum,
        language,
        scenario: "",
        count: WORDS_PER_PRESTARTER,
        avoid: [...avoidWords, ...vocab.map((w) => w.es), ...pool.map((w) => w.es)],
      });
      const clean = await validateVocab(gen, language);
      // Keep only short (1-3 word) items so it stays "one word at a time".
      const shortClean = clean.filter(isShortPair);
      vocab = vocab.concat(shortClean.length ? shortClean : clean).slice(0, WORDS_PER_PRESTARTER);
    } catch (err) {
      console.error("Pre-Starter vocab failed, using fallback:", err.message);
      if (!vocab.length)
        vocab = [
          { es: "hola", en: "hello" }, { es: "gracias", en: "thank you" },
          { es: "sí", en: "yes" }, { es: "no", en: "no" },
          { es: "agua", en: "water" }, { es: "amigo", en: "friend" },
        ];
    }
  }

  let lyrics =
    buildWordLyrics(vocab, order, recall) ||
    (() => {
      const l = ["[Verse]"];
      for (const w of vocab) l.push(w.en, w.es, w.es);
      return l.join("\n");
    })();
  lyrics = enforceOrder(lyrics, vocab, order);
  if (lyrics.length > MAX_LYRICS) {
    lyrics = lyrics.slice(0, MAX_LYRICS);
    lyrics = lyrics.slice(0, lyrics.lastIndexOf("\n"));
  }
  return {
    title: isGuidedTrack ? `First Words · Lesson ${lessonNum}` : `${label} — First Words · Lesson ${lessonNum}`,
    lyrics,
    vocab,
    subjectLabel: label,
    tier: "prestarter",
    lesson: lessonNum,
    custom: Boolean(customTopic),
  };
}

// Async: may call the AI generator.
async function buildLyrics({ subject = "greetings", topic = "", level = "beginner", lesson = 1, reviewVocab = [], avoidWords = [], language = "Spanish", order = "es-en", genre = "" }) {
  const tier = TIER_LABEL[level] ? level : "beginner";
  const lessonNumEarly = Math.max(1, Number(lesson) || 1);

  // Pre-Starter is its own thing — one word at a time, no phrases. Handle it up
  // front and return, so none of the phrase-song logic below applies.
  if (tier === "prestarter") {
    return buildPreStarterLesson({ subject, topic, lessonNum: lessonNumEarly, language, order, avoidWords });
  }

  const isStarter = tier === "starter";
  // Curated word banks only exist for beginner/intermediate/advanced, so Starter
  // borrows the (simplest) beginner words and just presents them one-at-a-time.
  const vocabTier = isStarter ? "beginner" : tier;
  const lessonNum = Math.max(1, Number(lesson) || 1);
  const scenario = pickScenario(lessonNum);
  const customTopic = (topic || "").trim();

  // Curated vocab is Spanish only; for other languages, always use the AI generator.
  const known = !customTopic && SUBJECTS[subject] && language === "Spanish";
  const theme = customTopic || (known ? SUBJECTS[subject].label : subject);

  // If the custom box is a comma/line list of short words, teach exactly those.
  const wordParts = customTopic ? customTopic.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : [];
  const isWordList = wordParts.length >= 2 && wordParts.every((p) => p.split(/\s+/).length <= 3);

  const STARTER_PER = 15; // fresh words per Starter lesson

  let vocab;
  const curatedCount = known ? lessonCount(subject, vocabTier) : 0;
  const pool = isStarter && known ? starterPool(subject) : [];
  const poolStart = (lessonNum - 1) * STARTER_PER;
  const freshLeft = pool.length - poolStart;

  if (isStarter && freshLeft >= 8) {
    // Starter, known subject: a fresh block of curated words that advances every
    // lesson (L1 = first 15, L2 = next 15 …). Once fewer than 8 new curated words
    // remain, we fall through to AI generation below for genuinely new words.
    vocab = pool.slice(poolStart, poolStart + STARTER_PER);
  } else if (!isStarter && known && lessonNum <= curatedCount) {
    // Curated words for the early lessons.
    vocab = getLessonVocab(subject, vocabTier, lessonNum);
  } else {
    // AI-generated words: Starter past its curated pool, custom topics, or
    // lessons beyond the curated set. lessonNum + scenario keep each lesson fresh.
    try {
      if (isWordList) {
        // Teach the exact words the user typed.
        vocab = await translateWords(wordParts.slice(0, 15), language);
      } else {
        vocab = await generateLessonVocab({
          theme,
          tier,
          lessonNum,
          language,
          // For a known subject (Colors, Numbers…), stay tightly on that subject —
          // no random scene, which could drift the words off-topic. Scenes are
          // only used to add variety to open-ended custom topics.
          scenario: known ? "" : scenario,
          count: isStarter ? STARTER_PER : 8,
          // Avoid words the learner already knows AND curated words, so every new
          // lesson brings genuinely NEW vocabulary (no repeating old words).
          avoid: [
            ...avoidWords,
            ...(known ? (isStarter ? pool.map((w) => w.es) : tierWords(subject, vocabTier)) : []),
          ],
        });
        // Second-pass correctness check on AI-generated words.
        vocab = await validateVocab(vocab, language);
      }
    } catch (err) {
      console.error("LLM vocab failed, falling back:", err.message);
      // Fall back to curated words (cycled) so a song still generates.
      vocab = known
        ? isStarter
          ? pool.slice(0, STARTER_PER)
          : getLessonVocab(subject, vocabTier, ((lessonNum - 1) % Math.max(1, curatedCount)) + 1)
        : [
            { es: "hola", en: "hello" },
            { es: "gracias", en: "thank you" },
            { es: "por favor", en: "please" },
            { es: "sí", en: "yes" },
            { es: "no", en: "no" },
          ];
    }
  }

  const hook = (known && HOOKS[subject]) || HOOKS.default;
  const targetPhrase = vocab[0] || hook;

  const enFirst = isStarter || order === "en-es";
  let lyrics;

  // Recall words stay ON THEME. Starter pulls earlier words from its own pool;
  // a known subject pulls 1-2 from the previous lesson.
  let songReview = [];
  const newKeys = new Set(vocab.map((w) => w.es));
  if (isStarter) {
    const recallSrc = pool.slice(0, poolStart).filter((w) => !newKeys.has(w.es));
    if (recallSrc.length) songReview.push(recallSrc[0]);
    if (recallSrc.length > 3) songReview.push(recallSrc[Math.floor(recallSrc.length / 2)]);
  } else if (known && !customTopic && lessonNum > 1) {
    songReview = getLessonVocab(subject, vocabTier, Math.max(1, lessonNum - 1))
      .filter((w) => !newKeys.has(w.es))
      .slice(0, 2);
  }

  // Fewer words make a catchier, story-driven song — cap starter so the song can
  // breathe (ad-lib intro, story flow, rhymes, hook) instead of cramming words.
  const songVocab = isStarter ? vocab.slice(0, 10) : vocab;

  // EVERY level (starter included) now goes through the AI songwriter so all
  // songs get the ad-lib intro, flowing story, rhymes and catchy hook.
  try {
    lyrics = await generateSongLyrics({ theme, tier, targetPhrase, newVocab: songVocab, reviewVocab: songReview, language, order, scenario, genre });
    // Verify + correct every translation pair (order, accuracy, no word↔phrase mismatch).
    lyrics = await fixSungPairs(lyrics, language, order);
  } catch (err) {
    console.error("Song lyric generation failed, using simple structure:", err.message);
    if (isStarter) {
      lyrics =
        buildStarterLyrics(vocab, songReview) ||
        (() => {
          const lines = ["[Verse]"];
          for (const w of vocab) lines.push(w.en, w.es);
          return lines.join("\n");
        })();
    } else {
      const pair = (a, b) => (enFirst ? [b, a] : [a, b]);
      const lines = ["[Chorus]", ...pair(hook.es, hook.en), "[Verse]"];
      for (const w of vocab) lines.push(...pair(w.es, w.en));
      lines.push("[Chorus]", ...pair(hook.es, hook.en));
      lyrics = lines.join("\n");
    }
  }

  // Safety net: force every identifiable teaching line into the chosen order,
  // in case the AI flipped some lines despite the instructions.
  lyrics = enforceOrder(lyrics, vocab, order);

  if (lyrics.length > MAX_LYRICS) {
    lyrics = lyrics.slice(0, MAX_LYRICS);
    lyrics = lyrics.slice(0, lyrics.lastIndexOf("\n"));
  }

  const subjectLabel = customTopic
    ? customTopic.length > 40
      ? customTopic.slice(0, 38) + "…"
      : customTopic
    : known
    ? SUBJECTS[subject].label
    : subject;

  const title = `${subjectLabel} — ${TIER_LABEL[tier]} · Lesson ${lessonNum}`;

  return { title, lyrics, vocab, subjectLabel, tier, lesson: lessonNum, custom: Boolean(customTopic) };
}

// Deterministically force each identifiable teaching line ("X … Y") into the
// chosen order using the known vocab, so a flipped line gets corrected.
function enforceOrder(lyrics, vocab, order) {
  if (!Array.isArray(vocab) || vocab.length === 0) return lyrics;
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9ñ ]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  const esSet = new Set(vocab.map((w) => norm(w.es)).filter(Boolean));
  const enSet = new Set(vocab.map((w) => norm(w.en)).filter(Boolean));
  const wantEnFirst = order === "en-es";

  return lyrics
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("[")) return line;
      const m = line.match(/^(\s*)(.+?)\s*(?:…|\.\.\.)\s*(.+?)(\s*)$/);
      if (!m) return line;
      const [, lead, a, b, trail] = m;
      const na = norm(a), nb = norm(b);
      // Identify the current order only when we can match the vocab confidently.
      let firstIsEn = null;
      if (enSet.has(na) && esSet.has(nb)) firstIsEn = true;
      else if (esSet.has(na) && enSet.has(nb)) firstIsEn = false;
      if (firstIsEn === null || firstIsEn === wantEnFirst) return line;
      return `${lead}${b.trim()}… ${a.trim()}${trail}`; // swap to the wanted order
    })
    .join("\n");
}

module.exports = { buildLyrics, MAX_LYRICS };
