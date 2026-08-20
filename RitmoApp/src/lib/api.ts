// Talks to the Ritmo backend. The app only ever calls our own server —
// never MiniMax/ElevenLabs directly — so the secret keys stay on the server.

import { BACKEND_URL } from "../config";
import type { SongSpec, CurriculumSubject } from "../data/presets";

export type VocabPair = { es: string; en: string };
export type LineTiming = { start: number; end: number; loss?: number } | null;

export type Song = {
  id: string;
  title: string;
  subject: string;
  subjectLabel: string;
  level: string;
  lesson: number;
  totalLessons: number;
  genre: string | null;
  beat: string | null;
  artistFeel: string | null;
  lyrics: string;
  vocab: VocabPair[];
  audioUrl: string;
  createdAt: number;
  favorite?: boolean;
  language?: string;
  localUri?: string; // downloaded local file (plays offline / never expires)
  customName?: string; // user-renamed title
  rating?: number; // 1 = thumbs up, -1 = thumbs down, 0/undefined = none
  spec?: SongSpec; // the recipe used, so the song can be regenerated
  lineTimings?: LineTiming[]; // per-line sung start/end (karaoke sync), if aligned
  audioModule?: number; // bundled catalog audio (require("...mp3")) — plays offline forever
  catalog?: boolean; // true = built-in preloaded song shipped with the app
};

async function postJson(path: string, body: unknown, timeoutMs = 200000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server sent an unexpected response (${res.status}).`);
    }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
    return data;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("The song took too long to generate. Please try again.");
    }
    if (err.message?.includes("Network request failed")) {
      throw new Error(
        "Can't reach the Ritmo server. Check that it's running and that the address in config.ts is correct."
      );
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

// Generate a full song from a spec. Returns a ready-to-save Song.
// reviewWords are earlier-learned phrases to weave in for spaced repetition.
export async function createSong(
  spec: SongSpec,
  reviewWords: VocabPair[] = [],
  language = "Spanish",
  order: "es-en" | "en-es" = "es-en",
  avoidWords: string[] = []
): Promise<Song> {
  const data = await postJson("/create-song", { ...spec, reviewWords, avoidWords, language, order });
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: data.title,
    subject: data.subject,
    subjectLabel: data.subjectLabel,
    level: data.level,
    lesson: data.lesson ?? 1,
    totalLessons: data.totalLessons ?? 1,
    genre: data.genre,
    beat: data.beat,
    artistFeel: data.artistFeel,
    lyrics: data.lyrics,
    vocab: data.vocab ?? [],
    audioUrl: data.audioUrl,
    createdAt: Date.now(),
    favorite: false,
    language,
    spec,
    lineTimings: Array.isArray(data.lineTimings) ? data.lineTimings : undefined,
  };
}

// Display title: user's custom name if set, else the subject label.
export function songTitle(s: Song): string {
  return s.customName?.trim() || s.subjectLabel;
}

// Add karaoke timing to an existing song. Send its downloaded audio (base64)
// or a still-valid URL, plus the lyrics; get back per-line sung timings.
export async function alignAudio(
  args: { audioB64?: string | null; audioUrl?: string; lyrics: string }
): Promise<LineTiming[] | null> {
  const data = await postJson("/align", args, 180000);
  return Array.isArray(data.lineTimings) ? data.lineTimings : null;
}

// Pronunciation check: send the learner's recorded audio + target phrase; get
// back what was heard and whether it was pronounced correctly.
export type PronounceResult = { heard: string; score: number; verdict: "correct" | "close" | "tryagain" };
export async function checkPronunciation(audioB64: string, target: string, lang = "es"): Promise<PronounceResult> {
  return postJson("/pronounce", { audioB64, target, lang }, 30000);
}

// Live-translate a word/phrase (either direction) for the dictionary search.
export async function translateWord(text: string, language = "Spanish"): Promise<{ es: string; en: string }> {
  return postJson("/translate", { text, language }, 30000);
}

// Load the live curriculum (subjects + lesson counts) from the backend.
export async function getCurriculum(): Promise<CurriculumSubject[]> {
  const res = await fetch(`${BACKEND_URL}/curriculum`);
  const data = await res.json();
  return (data.curriculum ?? []) as CurriculumSubject[];
}

// Get a spoken pronunciation clip URL for a song's vocab.
export async function getPronunciation(vocab: VocabPair[]): Promise<string> {
  const data = await postJson("/pronounce", { vocab }, 120000);
  return data.audioUrl as string;
}

// Flag a bad lyric line for review.
export async function reportLine(payload: {
  songId: string;
  line: string;
  subject?: string;
  language?: string;
}): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {}
}

// Send the tester's song flags (lock / reroll / wrong-genre) straight to the
// developer — written to a file on the backend machine, no copy/paste needed.
export async function sendFlags(payload: {
  flags: { id: string; title: string; genre?: string; subject?: string; lesson?: number; actions: string[] }[];
}): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/flags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// The developer's "resolved" snapshot: songs whose flags have been handled
// (rerolled / genre-fixed / locked). The app clears these from the ⚑ list.
export async function fetchResolvedFlags(): Promise<{ at: number; ids: string[] } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/flags/resolved`);
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || !Array.isArray(j.ids)) return null;
    return { at: Number(j.at) || 0, ids: j.ids as string[] };
  } catch {
    return null;
  }
}

// Locked (approved) built-in song ids — the app shows a green dot on these so
// the tester can see what's already done vs. new. Persisted so it shows offline.
export async function fetchLockedIds(): Promise<string[] | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/flags/locked`);
    if (!res.ok) return null;
    const j = await res.json();
    return Array.isArray(j.ids) ? (j.ids as string[]) : null;
  } catch {
    return null;
  }
}

export async function checkHealth(): Promise<{
  ok: boolean;
  minimax: boolean;
  elevenlabs: boolean;
}> {
  const res = await fetch(`${BACKEND_URL}/health`);
  return res.json();
}
