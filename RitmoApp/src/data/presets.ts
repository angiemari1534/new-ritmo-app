// Choices shown on the Create screen, plus starter "recipes" for the Library.

export type Tier = "prestarter" | "starter" | "beginner" | "intermediate" | "advanced";

// How a level's songs are built:
//   "word"   — one word at a time: sung in one language, repeated in the other,
//              with ad-libs. For absolute beginners learning vocabulary before
//              phrases (the Pre-Starter level).
//   "phrase" — the story-driven bilingual songs used by every other level.
export type LevelMode = "word" | "phrase";

export type CurriculumSubject = {
  key: string;
  label: string;
  lessons: { starter: number; beginner: number; intermediate: number; advanced: number };
};

// A copied musical style used to pre-fill the Create wizard ("Use this beat").
export type StyleSeed = {
  genre: string;
  mood: string;
  tempo: string;
  artistFeel?: string;
};

export type SongSpec = {
  subject: string;
  topic?: string; // free-text custom topic; when set, overrides subject
  level: Tier;
  lesson: number;
  genre: string;
  beat: string;
  voice?: string; // "female" | "male"
  artistFeel?: string;
  similarSongs?: string; // optional "songs like…" vibe hint
};

export const GENRES = [
  "Pop",
  "Latin",
  "Reggaeton",
  "R&B",
  "Hip-Hop",
  "Rap",
  "Country",
  "Rock",
  "Classic Rock",
  "Alternative",
  "Blues",
  "EDM",
  "Disco",
  "80s",
  "90s",
  "Club",
  "Acoustic",
  "Gospel",
  "Salsa",
  "Bachata",
  "Cumbia",
  "Jazz",
  "Children's",
  "Folk",
];

export const BEATS = ["Slow", "Medium", "Upbeat", "Fast"];

// ---- Levels (data-driven) -----------------------------------------------
// The whole app's level system lives in this one array. To ADD A NEW LEVEL,
// add its key to the Tier type above, add one entry here (label, mode, which
// subjects it covers, and how many lessons per subject), and list its key in
// the subscription plans (lib/entitlements.ts). Everything else — the journey
// map, "Continue learning", progress bars, level pickers — reads from here, so
// no other code needs to change.
export type LevelDef = {
  key: Tier;
  label: string;
  mode: LevelMode;
  subjects: string[]; // path subjects this level walks through
  lessonsPerSubject: number; // lessons per subject (level total = subjects × this)
};

// The curriculum walked by every level, in learning order: greetings and the
// grammar backbone (pronouns, questions, descriptions) first so learners can
// build sentences early, then everyday themes, then out-and-about and safety.
export const PATH_SUBJECTS = [
  "greetings", "pronouns", "numbers", "colors", "descriptions", "questions",
  "family", "feelings", "food", "cooking", "animals", "body",
  "clothing", "home", "weather", "days", "time",
  "directions", "transportation", "places", "shopping",
  "jobs", "school", "technology", "hobbies", "nature", "emergencies",
  "verbs", "vacation",
];

// Pre-Starter teaches individual WORDS (one at a time, repeated) before phrases.
// It walks the same topics as the other levels — Food, Colors, Greetings… — with
// a handful of word-lessons each (17 topics × 6 ≈ 100 lessons), so a topic+lesson
// spot on the map can hold its own built-in song.
export const PRESTARTER_SUBJECTS = PATH_SUBJECTS;

export const LEVELS: LevelDef[] = [
  { key: "prestarter", label: "First Words", mode: "word", subjects: PRESTARTER_SUBJECTS, lessonsPerSubject: 6 },
  { key: "starter", label: "Starter", mode: "phrase", subjects: PATH_SUBJECTS, lessonsPerSubject: 20 },
  { key: "beginner", label: "Explorer", mode: "phrase", subjects: PATH_SUBJECTS, lessonsPerSubject: 20 },
  { key: "intermediate", label: "Conversational", mode: "phrase", subjects: PATH_SUBJECTS, lessonsPerSubject: 20 },
  { key: "advanced", label: "Fluent", mode: "phrase", subjects: PATH_SUBJECTS, lessonsPerSubject: 20 },
];

export const TIERS: { key: Tier; label: string }[] = LEVELS.map((l) => ({ key: l.key, label: l.label }));
export const LEVEL_ORDER: Tier[] = LEVELS.map((l) => l.key);
// Default lesson count (phrase levels). Kept for callers that want a fallback.
export const LESSONS_PER_SUBJECT = 20;

// First Words lessons PER TOPIC — bigger vocabularies get more lessons so we
// capture as many words as possible for each topic (~6 new words per lesson).
// Topics not listed use the default. Tune freely.
export const PRESTARTER_LESSONS: Record<string, number> = {
  greetings: 12, pronouns: 9, numbers: 13, colors: 10, descriptions: 9, questions: 9,
  family: 9, feelings: 7, food: 9, cooking: 9, animals: 9, body: 8,
  clothing: 7, home: 8, weather: 7, days: 9, time: 9,
  directions: 8, transportation: 9, places: 9, shopping: 7,
  jobs: 9, school: 9, technology: 9, hobbies: 9, nature: 9, emergencies: 9,
  verbs: 8, vacation: 9,
};
const PRESTARTER_DEFAULT_LESSONS = 9;

// Phrase-level lessons PER TOPIC PER LEVEL — sized so each topic has enough
// lessons to fully learn it at that level. Foundational/finite topics (numbers,
// colors) are short; communication-heavy topics (verbs, food, greetings,
// questions) run long (over 20 at the higher levels). Intermediate peaks;
// Advanced is a bit shorter (specialized vocabulary).
export const PHRASE_LESSONS: Record<string, { starter: number; beginner: number; intermediate: number; advanced: number }> = {
  greetings: { starter: 14, beginner: 22, intermediate: 26, advanced: 19 },
  pronouns: { starter: 12, beginner: 18, intermediate: 22, advanced: 16 },
  numbers: { starter: 6, beginner: 9, intermediate: 11, advanced: 8 },
  colors: { starter: 7, beginner: 10, intermediate: 12, advanced: 9 },
  descriptions: { starter: 11, beginner: 16, intermediate: 20, advanced: 14 },
  questions: { starter: 14, beginner: 21, intermediate: 25, advanced: 18 },
  family: { starter: 12, beginner: 18, intermediate: 22, advanced: 16 },
  feelings: { starter: 12, beginner: 18, intermediate: 22, advanced: 16 },
  food: { starter: 14, beginner: 21, intermediate: 25, advanced: 18 },
  cooking: { starter: 11, beginner: 17, intermediate: 21, advanced: 15 },
  animals: { starter: 9, beginner: 14, intermediate: 17, advanced: 12 },
  body: { starter: 10, beginner: 15, intermediate: 19, advanced: 14 },
  clothing: { starter: 10, beginner: 14, intermediate: 18, advanced: 13 },
  home: { starter: 10, beginner: 15, intermediate: 19, advanced: 14 },
  weather: { starter: 7, beginner: 11, intermediate: 13, advanced: 10 },
  days: { starter: 7, beginner: 11, intermediate: 13, advanced: 10 },
  time: { starter: 7, beginner: 11, intermediate: 13, advanced: 10 },
  directions: { starter: 11, beginner: 17, intermediate: 21, advanced: 15 },
  transportation: { starter: 11, beginner: 16, intermediate: 20, advanced: 14 },
  places: { starter: 11, beginner: 16, intermediate: 20, advanced: 14 },
  shopping: { starter: 11, beginner: 17, intermediate: 21, advanced: 15 },
  jobs: { starter: 11, beginner: 16, intermediate: 20, advanced: 14 },
  school: { starter: 11, beginner: 16, intermediate: 20, advanced: 14 },
  technology: { starter: 10, beginner: 15, intermediate: 19, advanced: 14 },
  hobbies: { starter: 11, beginner: 16, intermediate: 20, advanced: 14 },
  nature: { starter: 10, beginner: 15, intermediate: 19, advanced: 14 },
  emergencies: { starter: 10, beginner: 14, intermediate: 18, advanced: 13 },
  verbs: { starter: 17, beginner: 25, intermediate: 30, advanced: 22 },
  vacation: { starter: 12, beginner: 18, intermediate: 22, advanced: 16 },
};
const PHRASE_DEFAULT = { starter: 12, beginner: 18, intermediate: 22, advanced: 16 };

export function levelDef(t?: string): LevelDef | undefined {
  return LEVELS.find((l) => l.key === t);
}
export function subjectsForLevel(t: Tier): string[] {
  return levelDef(t)?.subjects ?? PATH_SUBJECTS;
}
// Lessons for a level's topic. Word levels (First Words) vary per topic; phrase
// levels use their fixed lessonsPerSubject.
export function lessonsFor(t: Tier, subject?: string): number {
  const lvl = levelDef(t);
  if (!lvl) return LESSONS_PER_SUBJECT;
  if (lvl.mode === "word" && subject) return PRESTARTER_LESSONS[subject] ?? PRESTARTER_DEFAULT_LESSONS;
  // Phrase levels: per-topic, per-level count so each topic runs as long as it
  // needs to be fully learned.
  if (subject && (t === "starter" || t === "beginner" || t === "intermediate" || t === "advanced")) {
    return (PHRASE_LESSONS[subject] ?? PHRASE_DEFAULT)[t];
  }
  return lvl.lessonsPerSubject;
}
// Back-compat: lessons for a level ignoring topic (phrase levels, or a default).
export function lessonsForLevel(t: Tier): number {
  return levelDef(t)?.lessonsPerSubject ?? LESSONS_PER_SUBJECT;
}
export function levelMode(t: Tier): LevelMode {
  return levelDef(t)?.mode ?? "phrase";
}

// Display label for a tier (internal keys stay stable for saved data).
export function tierLabel(t?: string): string {
  return TIERS.find((x) => x.key === t)?.label ?? (t ?? "");
}

export type PathStep = { subject: string; tier: Tier; lesson: number };

// The very next step after a given one, in path order (null at the end). Used by
// the player's forward button so it never skips — it just goes to the next lesson.
export function stepAfter(step: { subject: string; tier: Tier; lesson: number }): PathStep | null {
  const steps = pathSteps();
  const i = steps.findIndex((s) => s.subject === step.subject && s.tier === step.tier && s.lesson === step.lesson);
  if (i < 0 || i + 1 >= steps.length) return null;
  return steps[i + 1];
}

// Every step of the whole guided path, in order — used to draw the journey map.
export function pathSteps(): PathStep[] {
  const steps: PathStep[] = [];
  for (const lvl of LEVELS)
    for (const subject of lvl.subjects)
      for (let lesson = 1; lesson <= lessonsFor(lvl.key, subject); lesson++)
        steps.push({ subject, tier: lvl.key, lesson });
  return steps;
}

// The next uncompleted step in the path, given saved progress (highest lesson
// reached per subject+tier). Returns null when the whole path is complete.
export function nextInPath(progress: Record<string, Partial<Record<Tier, number>>>): PathStep | null {
  for (const lvl of LEVELS) {
    for (const subject of lvl.subjects) {
      for (let lesson = 1; lesson <= lessonsFor(lvl.key, subject); lesson++) {
        const done = progress[subject]?.[lvl.key] ?? 0;
        if (done < lesson) return { subject, tier: lvl.key, lesson };
      }
    }
  }
  return null;
}

// How far through the whole path the learner is (0..1), for a progress bar.
export function pathProgress(progress: Record<string, Partial<Record<Tier, number>>>): { done: number; total: number } {
  let total = 0;
  let done = 0;
  for (const lvl of LEVELS) {
    for (const subject of lvl.subjects) {
      const n = lessonsFor(lvl.key, subject);
      total += n;
      done += Math.min(n, progress[subject]?.[lvl.key] ?? 0);
    }
  }
  return { done, total };
}

// Emoji per subject key (keys must match backend lib/vocab.js).
export const SUBJECT_EMOJI: Record<string, string> = {
  words: "🔤",
  numbers: "🔢",
  colors: "🎨",
  greetings: "💬",
  vacation: "🏖️",
  cooking: "🍳",
  family: "👨‍👩‍👧",
  days: "📅",
  food: "🍽️",
  animals: "🐶",
  body: "🩺",
  clothing: "👕",
  weather: "🌤️",
  feelings: "😊",
  home: "🏠",
  directions: "🧭",
  shopping: "🛍️",
  verbs: "⚡",
  pronouns: "🙋",
  questions: "❓",
  descriptions: "📏",
  jobs: "💼",
  school: "🎒",
  technology: "📱",
  hobbies: "⚽",
  transportation: "🚌",
  places: "🏙️",
  time: "🕐",
  nature: "🌳",
  emergencies: "🚨",
};

// Used only if the app can't reach the backend to load the live curriculum.
export const FALLBACK_CURRICULUM: CurriculumSubject[] = Object.entries({
  colors: "Colors",
  numbers: "Numbers",
  greetings: "Conversation",
  food: "Food & Restaurant",
  family: "Family",
  animals: "Animals",
}).map(([key, label]) => ({
  key,
  label,
  lessons: { starter: 2, beginner: 2, intermediate: 2, advanced: 1 },
}));

// Curated combos shown as ready-to-play cards in the Library.
export const STARTER_RECIPES: SongSpec[] = [
  { subject: "colors", level: "beginner", lesson: 1, genre: "Reggaeton", beat: "Upbeat" },
  { subject: "numbers", level: "beginner", lesson: 1, genre: "Pop", beat: "Medium" },
  { subject: "greetings", level: "beginner", lesson: 1, genre: "Acoustic", beat: "Slow" },
  { subject: "animals", level: "beginner", lesson: 1, genre: "Children's", beat: "Upbeat" },
  { subject: "food", level: "intermediate", lesson: 1, genre: "Bachata", beat: "Medium" },
  { subject: "family", level: "beginner", lesson: 1, genre: "Pop", beat: "Medium" },
];

// Short labels for the Library's static cards (Create screen uses live curriculum labels).
export const SUBJECT_LABEL: Record<string, string> = {
  words: "First Words",
  numbers: "Numbers",
  colors: "Colors",
  greetings: "Conversation",
  vacation: "Vacation",
  cooking: "Cooking",
  family: "Family",
  days: "Days & Time",
  food: "Food & Restaurant",
  animals: "Animals",
  body: "Body & Health",
  clothing: "Clothing",
  weather: "Weather",
  feelings: "Feelings",
  home: "House & Home",
  directions: "Getting Around",
  shopping: "Shopping",
  verbs: "Common Verbs",
  pronouns: "Pronouns",
  questions: "Question Words",
  descriptions: "Descriptions",
  jobs: "Jobs & Work",
  school: "School",
  technology: "Technology",
  hobbies: "Hobbies & Sports",
  transportation: "Transportation",
  places: "Places in Town",
  time: "Telling Time",
  nature: "Nature & Outdoors",
  emergencies: "Emergencies",
};

export function subjectEmoji(key: string): string {
  return SUBJECT_EMOJI[key] ?? "🎵";
}

export function subjectLabel(key: string): string {
  return SUBJECT_LABEL[key] ?? key;
}

// BCP-47 code for the phone's speech engine, per learning language.
export function langCode(language?: string): string {
  const m: Record<string, string> = {
    Spanish: "es-ES",
    French: "fr-FR",
    Italian: "it-IT",
    German: "de-DE",
    Portuguese: "pt-PT",
    English: "en-US",
  };
  return m[language ?? "Spanish"] ?? "es-ES";
}
