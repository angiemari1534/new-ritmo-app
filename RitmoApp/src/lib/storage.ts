// Saves created songs on the device so the Library persists between sessions.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Song, VocabPair } from "./api";
import type { Tier } from "../data/presets";
import type { PlanId } from "./entitlements";

const KEY = "ritmo.songs.v1";
const PROGRESS_KEY = "ritmo.progress.v1";
const LEARNED_KEY = "ritmo.learned.v1";
const STREAK_KEY = "ritmo.streak.v1";
const SETTINGS_KEY = "ritmo.settings.v1";
const PLAYLISTS_KEY = "ritmo.playlists.v1";
const KNOWN_KEY = "ritmo.known.v1";
const CATFAV_KEY = "ritmo.catfavs.v1";

// ---- Favorites for built-in catalog songs -------------------------------
// Built-in songs aren't in the songs store, so their favorite state lives here
// as a list of catalog ids (per language).
export async function loadCatalogFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ns(CATFAV_KEY));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function toggleCatalogFavorite(id: string): Promise<string[]> {
  const cur = await loadCatalogFavorites();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  await AsyncStorage.setItem(ns(CATFAV_KEY), JSON.stringify(next));
  return next;
}

// Thumbs up/down for built-in catalog songs (id -> 1 | -1). Kept here since
// built-in songs aren't in the songs store.
const CATRATE_KEY = "ritmo.catrate.v1";
export async function loadCatalogRatings(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(ns(CATRATE_KEY));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export async function setCatalogRating(id: string, rating: number): Promise<Record<string, number>> {
  const cur = await loadCatalogRatings();
  if (rating === 0) delete cur[id];
  else cur[id] = rating;
  await AsyncStorage.setItem(ns(CATRATE_KEY), JSON.stringify(cur));
  return cur;
}

// ---- Dev feedback flags for built-in catalog songs ----------------------
// Lets the tester flag a built-in song for the developer, right on the song:
//   "lock"     — keep this exact take (protect it from rebuilds)
//   "reroll"   — make a new version of this one
//   "badgenre" — doesn't sound like its genre
//   "convert"  — rebuild this one on ElevenLabs for clearer Spanish pronunciation
// Stored per catalog id. The developer reads these off to know what to change.
const CATFLAG_KEY = "ritmo.catflags.v1";
export type CatalogFlag = "lock" | "reroll" | "badgenre" | "convert";
export async function loadCatalogFlags(): Promise<Record<string, CatalogFlag[]>> {
  try {
    const raw = await AsyncStorage.getItem(ns(CATFLAG_KEY));
    return raw ? (JSON.parse(raw) as Record<string, CatalogFlag[]>) : {};
  } catch {
    return {};
  }
}

// Clear all local flags — called after they're sent to the developer, so the
// ⚑ tile only ever counts flags that still need sending.
export async function clearCatalogFlags(): Promise<Record<string, CatalogFlag[]>> {
  await AsyncStorage.setItem(ns(CATFLAG_KEY), JSON.stringify({}));
  return {};
}

export async function toggleCatalogFlag(id: string, flag: CatalogFlag): Promise<Record<string, CatalogFlag[]>> {
  const cur = await loadCatalogFlags();
  const set = new Set(cur[id] || []);
  // lock and reroll are opposites — turning one on clears the other.
  if (set.has(flag)) set.delete(flag);
  else {
    set.add(flag);
    if (flag === "lock") set.delete("reroll");
    if (flag === "reroll") set.delete("lock");
  }
  if (set.size) cur[id] = Array.from(set);
  else delete cur[id];
  await AsyncStorage.setItem(ns(CATFLAG_KEY), JSON.stringify(cur));
  return cur;
}

// When the developer finishes handling flagged songs, they publish a "resolved"
// snapshot (an increasing `at` stamp + the song ids updated). The app applies
// each snapshot once — clearing those flags — so a song drops off the ⚑ list
// automatically after its reroll / genre-fix / lock is done.
const CATFLAGRES_KEY = "ritmo.catflagsresolved.v1"; // last-applied resolved `at`
export async function getLastResolvedAt(): Promise<number> {
  try {
    const r = await AsyncStorage.getItem(ns(CATFLAGRES_KEY));
    return r ? Number(r) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function applyResolvedFlags(at: number, ids: string[]): Promise<Record<string, CatalogFlag[]>> {
  const cur = await loadCatalogFlags();
  for (const id of ids) delete cur[id];
  await AsyncStorage.setItem(ns(CATFLAG_KEY), JSON.stringify(cur));
  await AsyncStorage.setItem(ns(CATFLAGRES_KEY), String(at));
  return cur;
}

// Locked (approved) built-in song ids, cached from the backend so the green
// "locked" dot still shows when offline.
const CATLOCK_KEY = "ritmo.catlocked.v1";
export async function loadLockedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ns(CATLOCK_KEY));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
export async function saveLockedIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(ns(CATLOCK_KEY), JSON.stringify(ids));
}

// Each language keeps its own separate library / progress / vocabulary. Spanish
// uses the original keys (so existing data is untouched); every other language
// gets its own namespaced keys. Settings (which holds the active language) stay
// global. Call setStorageLanguage() before loading data, and again on switch.
let nsLang = "Spanish";
export function setStorageLanguage(lang?: string) {
  nsLang = lang || "Spanish";
}
const ns = (base: string) => (nsLang === "Spanish" ? base : `${base}::${nsLang}`);

// ---- Known words (flashcard mastery) ------------------------------------
export async function loadKnown(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KNOWN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function toggleKnown(es: string): Promise<string[]> {
  const k = await loadKnown();
  const low = es.toLowerCase();
  const next = k.includes(low) ? k.filter((x) => x !== low) : [...k, low];
  await AsyncStorage.setItem(KNOWN_KEY, JSON.stringify(next));
  return next;
}

// ---- Playlists ----------------------------------------------------------
export type Playlist = { id: string; name: string; songIds: string[] };

export async function loadPlaylists(): Promise<Playlist[]> {
  try {
    const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
    return raw ? (JSON.parse(raw) as Playlist[]) : [];
  } catch {
    return [];
  }
}

async function savePlaylists(pl: Playlist[]): Promise<Playlist[]> {
  await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(pl));
  return pl;
}

export async function createPlaylist(name: string, firstSongId?: string): Promise<Playlist[]> {
  const pl = await loadPlaylists();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  pl.unshift({ id, name: name.trim() || "New playlist", songIds: firstSongId ? [firstSongId] : [] });
  return savePlaylists(pl);
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<Playlist[]> {
  const pl = await loadPlaylists();
  const p = pl.find((x) => x.id === playlistId);
  if (p && !p.songIds.includes(songId)) p.songIds.push(songId);
  return savePlaylists(pl);
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<Playlist[]> {
  const pl = await loadPlaylists();
  const p = pl.find((x) => x.id === playlistId);
  if (p) p.songIds = p.songIds.filter((s) => s !== songId);
  return savePlaylists(pl);
}

export async function deletePlaylist(playlistId: string): Promise<Playlist[]> {
  const pl = (await loadPlaylists()).filter((x) => x.id !== playlistId);
  return savePlaylists(pl);
}

// ---- App settings -------------------------------------------------------
export type HomeSections = {
  continueLearning: boolean;
  madeForYou: boolean;
  favorites: boolean;
  levels: boolean;
  playlists: boolean;
  memory: boolean;
};

export type Settings = {
  fontScale: number;
  name: string;
  avatar: string;
  language: string;
  order: "es-en" | "en-es"; // target-first (Spanish→English) or English→target
  defaultGenres: string[];
  defaultMoods: string[];
  defaultTempo: string;
  prefArtist: string; // favorite artist(s), free text
  prefSongs: string; // songs you like, free text
  dailyGoal: number;
  reminders: boolean;
  homeSections: HomeSections;
  homePlaylists: string[]; // ids of playlists the user chose to show on Home
  homeLevels: string[]; // level tiers the user chose to show on Home
  onboarded: boolean;
  autoPrepare: boolean; // pre-generate the next lesson so Continue is instant
  plan: PlanId; // current subscription (mock for now)
  billMonth: string; // "YYYY-M" the creation count belongs to
  creations: number; // songs created this billing month
};

const DEFAULT_HOME_SECTIONS: HomeSections = {
  continueLearning: true,
  madeForYou: true,
  favorites: true,
  levels: true,
  playlists: true,
  memory: true,
};

const DEFAULT_SETTINGS: Settings = {
  fontScale: 1,
  name: "Ritmo Learner",
  avatar: "🎧",
  language: "Spanish",
  order: "es-en",
  defaultGenres: ["Reggaeton"],
  defaultMoods: ["Energetic"],
  defaultTempo: "Normal",
  prefArtist: "",
  prefSongs: "",
  dailyGoal: 1,
  reminders: false,
  homeSections: DEFAULT_HOME_SECTIONS,
  homePlaylists: [],
  homeLevels: [],
  onboarded: false,
  autoPrepare: true,
  plan: "free",
  billMonth: "",
  creations: 0,
};

// Wipe saved data for the ACTIVE language (songs, progress, learned words,
// streak, playlists, known) — keeps settings and other languages' data.
export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([KEY, PROGRESS_KEY, LEARNED_KEY, STREAK_KEY, PLAYLISTS_KEY, KNOWN_KEY].map(ns));
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      homeSections: { ...DEFAULT_HOME_SECTIONS, ...(parsed.homeSections || {}) },
      defaultGenres: Array.isArray(parsed.defaultGenres) && parsed.defaultGenres.length ? parsed.defaultGenres : DEFAULT_SETTINGS.defaultGenres,
      defaultMoods: Array.isArray(parsed.defaultMoods) && parsed.defaultMoods.length ? parsed.defaultMoods : DEFAULT_SETTINGS.defaultMoods,
      homePlaylists: Array.isArray(parsed.homePlaylists) ? parsed.homePlaylists : [],
      homeLevels: Array.isArray(parsed.homeLevels) ? parsed.homeLevels : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Partial<Settings>): Promise<Settings> {
  const cur = await loadSettings();
  const next = { ...cur, ...s };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

// Wipe just the journey progress (the filled-in circles) for the active language,
// so the learner starts fresh from the beginning. Keeps songs, playlists, etc.
export async function resetProgress(): Promise<void> {
  await AsyncStorage.removeItem(ns(PROGRESS_KEY));
}

// Progress = highest completed lesson per subject + tier.
export type Progress = Record<string, Partial<Record<Tier, number>>>;

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

// Record that a lesson was completed (keeps the highest reached).
export async function markLessonDone(
  subject: string,
  tier: Tier,
  lesson: number
): Promise<Progress> {
  const p = await loadProgress();
  if (!p[subject]) p[subject] = {};
  const current = p[subject][tier] ?? 0;
  p[subject][tier] = Math.max(current, lesson);
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  return p;
}

// ---- Daily streak -------------------------------------------------------
type Streak = { count: number; lastDay: string };

function dayStamp(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Call on app open: increments on consecutive days, resets after a gap.
export async function bumpStreak(): Promise<number> {
  let s: Streak = { count: 0, lastDay: "" };
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) s = JSON.parse(raw);
  } catch {}
  const today = dayStamp();
  if (s.lastDay === today) return s.count || 1;
  const yesterday = dayStamp(new Date(Date.now() - 86400000));
  s.count = s.lastDay === yesterday ? (s.count || 0) + 1 : 1;
  s.lastDay = today;
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(s));
  return s.count;
}

// ---- Learned vocabulary (for spaced musical review) ---------------------
// Kept in learning order (oldest first), deduped by the Spanish text.

export async function loadLearned(): Promise<VocabPair[]> {
  try {
    const raw = await AsyncStorage.getItem(LEARNED_KEY);
    return raw ? (JSON.parse(raw) as VocabPair[]) : [];
  } catch {
    return [];
  }
}

export async function addLearned(items: VocabPair[]): Promise<void> {
  const learned = await loadLearned();
  const seen = new Set(learned.map((w) => w.es.toLowerCase()));
  for (const w of items) {
    if (w?.es && !seen.has(w.es.toLowerCase())) {
      learned.push({ es: w.es, en: w.en });
      seen.add(w.es.toLowerCase());
    }
  }
  // Cap to keep storage small.
  const capped = learned.slice(-600);
  await AsyncStorage.setItem(LEARNED_KEY, JSON.stringify(capped));
}

// Pick a few earlier phrases to review, spaced across the learning history:
// one older, one middle, one recent — so words resurface over time.
export async function pickReview(count = 3): Promise<VocabPair[]> {
  const learned = await loadLearned();
  if (learned.length <= count) return learned.slice(0, count);

  const n = learned.length;
  const buckets = [
    [0, Math.floor(n / 3)], // older
    [Math.floor(n / 3), Math.floor((2 * n) / 3)], // middle
    [Math.floor((2 * n) / 3), n], // recent
  ];
  const picks: VocabPair[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    const [lo, hi] = buckets[i % buckets.length];
    if (hi <= lo) continue;
    let idx = lo + Math.floor(Math.random() * (hi - lo));
    let guard = 0;
    while (used.has(idx) && guard++ < 8) idx = lo + Math.floor(Math.random() * (hi - lo));
    if (!used.has(idx)) {
      used.add(idx);
      picks.push(learned[idx]);
    }
  }
  return picks;
}

export async function loadSongs(): Promise<Song[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Song[]) : [];
  } catch {
    return [];
  }
}

export async function saveSong(song: Song): Promise<Song[]> {
  const songs = await loadSongs();
  const next = [song, ...songs];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function deleteSong(id: string): Promise<Song[]> {
  const songs = await loadSongs();
  const next = songs.filter((s) => s.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function toggleFavorite(id: string): Promise<Song[]> {
  const songs = await loadSongs();
  const next = songs.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function updateSong(id: string, patch: Partial<Song>): Promise<Song[]> {
  const songs = await loadSongs();
  const next = songs.map((s) => (s.id === id ? { ...s, ...patch } : s));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
