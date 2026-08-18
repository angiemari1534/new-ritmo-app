import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Text, Pressable, ActivityIndicator, Image, Alert, Modal } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { TabBar, SubjectIcon, GradientText, type TabKey } from "./src/components/ui";
import HomeScreen from "./src/screens/HomeScreen";
import CreateScreen from "./src/screens/CreateScreen";
import PlayerScreen from "./src/screens/PlayerScreen";
import LibraryScreen from "./src/screens/LibraryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import FlashcardsScreen from "./src/screens/FlashcardsScreen";
import JourneyScreen from "./src/screens/JourneyScreen";
import LessonCompleteScreen from "./src/screens/LessonCompleteScreen";
import DictionaryScreen from "./src/screens/DictionaryScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import { CATALOG } from "./src/data/catalog";
import { levelUnlocked, creationCap, planName, monthKey, BILLING_ENABLED, type PlanId } from "./src/lib/entitlements";
import { createSong, alignAudio, songTitle, fetchResolvedFlags, fetchLockedIds, type Song, type VocabPair } from "./src/lib/api";
import { GENRES, nextInPath, pathProgress, stepAfter, subjectsForLevel, LEVEL_ORDER, tierLabel, type PathStep, type Tier } from "./src/data/presets";
import {
  loadSongs,
  saveSong,
  deleteSong,
  markLessonDone,
  pickReview,
  addLearned,
  loadProgress,
  loadLearned,
  bumpStreak,
  toggleFavorite,
  loadCatalogFavorites,
  toggleCatalogFavorite,
  loadCatalogRatings,
  setCatalogRating,
  loadCatalogFlags,
  toggleCatalogFlag,
  getLastResolvedAt,
  applyResolvedFlags,
  loadLockedIds,
  saveLockedIds,
  type CatalogFlag,
  loadSettings,
  saveSettings,
  setStorageLanguage,
  clearAllData,
  resetProgress,
  loadPlaylists,
  createPlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylist,
  updateSong,
  loadKnown,
  toggleKnown,
  type Settings,
  type Playlist,
  type Progress,
} from "./src/lib/storage";
import { downloadAudio, deleteAudio, readAudioBase64 } from "./src/lib/download";
import type { SongSpec, StyleSeed } from "./src/data/presets";
import { langCode } from "./src/data/presets";
import { colors, gradients, gradientFor, radius } from "./src/theme";
import { ThemeProvider } from "./src/lib/theme-context";

function AppInner() {
  const [tab, setTab] = useState<TabKey>("home");
  const [songs, setSongs] = useState<Song[]>([]);
  const [catFavs, setCatFavs] = useState<string[]>([]); // favorited built-in song ids
  const [catRatings, setCatRatings] = useState<Record<string, number>>({}); // built-in thumbs up/down
  const [catFlags, setCatFlags] = useState<Record<string, CatalogFlag[]>>({}); // built-in dev-feedback flags
  const [catLocked, setCatLocked] = useState<string[]>([]); // built-in ids the dev has locked (green dot)
  // Built-in catalog songs always appear alongside the user's own songs (a user
  // song with the same id wins, so nothing is duplicated). Their favorite/rating
  // state comes from catFavs / catRatings.
  const displaySongs = React.useMemo(
    () => [
      ...CATALOG.filter((c) => !songs.some((s) => s.id === c.id)).map((c) => ({ ...c, favorite: catFavs.includes(c.id), rating: catRatings[c.id] ?? 0 })),
      ...songs,
    ],
    [songs, catFavs, catRatings]
  );
  const [current, setCurrent] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [streak, setStreak] = useState(1);
  const [wordsLearned, setWordsLearned] = useState(0);
  const [lessonsDone, setLessonsDone] = useState(0);
  const [nextUp, setNextUp] = useState<PathStep | null>(null);
  const [pathPct, setPathPct] = useState(0);
  const [progress, setProgress] = useState<Progress>({});
  const [showJourney, setShowJourney] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [finishing, setFinishing] = useState<Song | null>(null);
  const [learnedVocab, setLearnedVocab] = useState<VocabPair[]>([]);
  const [known, setKnown] = useState<string[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [libFocus, setLibFocus] = useState<string | null>(null);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [booting, setBooting] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    fontScale: 1,
    name: "Ritmo Learner",
    avatar: "av001",
    language: "Spanish",
    order: "es-en",
    defaultGenres: ["Reggaeton"],
    defaultMoods: ["Energetic"],
    defaultTempo: "Normal",
    prefArtist: "",
    prefSongs: "",
    dailyGoal: 1,
    reminders: false,
    homeSections: { continueLearning: true, madeForYou: true, favorites: true, levels: true, playlists: true, memory: true },
    homePlaylists: [],
    homeLevels: [],
    onboarded: false,
    autoPrepare: true,
    plan: "free",
    billMonth: "",
    creations: 0,
  });

  const [activeJobs, setActiveJobs] = useState(0);
  const [paywall, setPaywall] = useState<{ open: boolean; reason: string | null }>({ open: false, reason: null });
  const [batch, setBatch] = useState<{ total: number; done: number } | null>(null);
  const [readySong, setReadySong] = useState<Song | null>(null);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastSpec, setLastSpec] = useState<SongSpec | null>(null);
  const [styleSeed, setStyleSeed] = useState<StyleSeed | null>(null);

  // App-level audio player → keeps playing when navigating between tabs.
  const player = useAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    (async () => {
      // Load settings first so we know the active language, then load that
      // language's own separate library / progress / vocabulary.
      const s = await loadSettings();
      setStorageLanguage(s.language);
      setSettings(s);
      const [sg, pl, st, cf, cr, cfl, clk] = await Promise.all([loadSongs(), loadPlaylists(), bumpStreak(), loadCatalogFavorites(), loadCatalogRatings(), loadCatalogFlags(), loadLockedIds()]);
      setSongs(sg);
      setPlaylists(pl);
      setStreak(st);
      setCatFavs(cf);
      setCatRatings(cr);
      setCatFlags(cfl);
      setCatLocked(clk);
      await refreshStats();
      syncResolvedFlags();
    })();
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    const t = setTimeout(() => setBooting(false), 1600);
    return () => clearTimeout(t);
  }, []);

  // Load & auto-play whenever the current song changes.
  useEffect(() => {
    if (!current) return;
    try {
      player.replace(current.audioModule ?? current.localUri ?? current.audioUrl);
      player.play();
    } catch {}
  }, [current?.id]);

  useEffect(() => {
    try {
      player.loop = loop;
    } catch {}
  }, [loop, current?.id]);

  // Auto-advance to the next song when one finishes. Guarded so it fires once
  // per song, and triggered by BOTH the finish event and reaching the end of
  // the track (belt and suspenders — the finish event alone proved unreliable).
  const queueRef = useRef({ queue, queueIndex });
  queueRef.current = { queue, queueIndex };
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const currentRef = useRef(current);
  currentRef.current = current;
  const advancedFromRef = useRef<string | null>(null);

  function advanceQueue() {
    const cur = currentRef.current;
    if (!cur || loopRef.current) return;
    if (advancedFromRef.current === cur.id) return; // already advanced from this song
    advancedFromRef.current = cur.id;
    const { queue: q, queueIndex: i } = queueRef.current;
    if (i < q.length - 1) {
      setQueueIndex(i + 1);
      setCurrent(q[i + 1]);
    }
  }

  useEffect(() => {
    const sub = player.addListener("playbackStatusUpdate", (s: any) => {
      if (s?.didJustFinish) advanceQueue();
    });
    return () => sub.remove();
  }, [player]);

  // Backup trigger: the position has reached (or passed) the end of the track.
  useEffect(() => {
    const dur = status.duration || 0;
    const t = status.currentTime || 0;
    if (dur > 0 && t >= dur - 0.5) advanceQueue();
  }, [status.currentTime, status.duration]);

  async function openFlashcards() {
    const [lv, k] = await Promise.all([loadLearned(), loadKnown()]);
    setLearnedVocab(lv);
    setKnown(k);
    setShowFlashcards(true);
  }
  async function handleToggleKnown(es: string) {
    setKnown(await toggleKnown(es));
  }

  async function refreshStats() {
    const learned = await loadLearned();
    setWordsLearned(learned.length);
    setLearnedVocab(learned);
    const prog = await loadProgress();
    let done = 0;
    for (const subj of Object.values(prog)) for (const v of Object.values(subj)) done += (v as number) || 0;
    setLessonsDone(done);
    setProgress(prog);
    setNextUp(nextInPath(prog));
    const pp = pathProgress(prog);
    setPathPct(pp.total ? Math.round((pp.done / pp.total) * 100) : 0);
  }

  // Core: create + save one song (no UI side effects). Returns the song or null.
  // opts.markDone/learn default true; a background pre-generation passes false so
  // the lesson isn't counted as completed until the learner actually plays it.
  async function runGeneration(
    spec: SongSpec,
    opts: { learn?: boolean; background?: boolean } = {}
  ): Promise<Song | null> {
    const { learn = true, background = false } = opts;
    try {
      const reviewWords = await pickReview(3);
      // Words the learner already knows — so new lessons avoid repeating them.
      const avoidWords = learnedVocab.slice(-60).map((v) => v.es).filter(Boolean);
      const song = await createSong(spec, reviewWords, settings.language, settings.order, avoidWords);
      // Download the audio locally so it plays forever/offline (URLs expire).
      try {
        song.localUri = await downloadAudio(song.id, song.audioUrl);
      } catch {}
      const next = await saveSong(song);
      setSongs(next);
      // Karaoke alignment runs in the background so it never slows down how fast
      // the song is ready — the glowing line just fills in a few seconds later.
      alignSoon(song);
      // NOTE: generation no longer marks the lesson "done" — that is earned by
      // finishing the lesson flow (completeLesson). This keeps progress honest.
      if (learn) await addLearned(song.vocab);
      await refreshStats();
      return song;
    } catch (e: any) {
      if (!background) setGenError(e.message || "Something went wrong.");
      return null;
    }
  }

  // Earned completion: called when the learner finishes (or skips) the lesson
  // check. This is what advances the path and the journey map.
  async function completeLesson(spec: SongSpec) {
    await markLessonDone(spec.subject, spec.level, spec.lesson);
    await refreshStats();
    if (settings.autoPrepare) prepareNext();
  }

  // Background: quietly build the next path lesson so Continue is instant next
  // time. Never marks it done (that happens when the learner plays it).
  async function prepareNext() {
    if (!settings.autoPrepare) return;
    const prog = await loadProgress();
    const step = nextInPath(prog);
    if (!step) return;
    const have = songs.some(
      (s) => s.spec && s.spec.subject === step.subject && s.spec.level === step.tier && (s.spec.lesson ?? 1) === step.lesson
    );
    if (have) return;
    runGeneration({ subject: step.subject, level: step.tier, lesson: step.lesson, ...pickStyle() }, { learn: false, background: true });
  }

  // Subscription gate for creating a NEW song. Reads the latest saved settings
  // (so a batch loop counts correctly), checks the level is unlocked and the
  // monthly creation cap isn't hit, then counts one creation. Returns false and
  // opens the paywall when blocked. Billing is mocked for now.
  async function consumeCreation(level: Tier): Promise<boolean> {
    if (!BILLING_ENABLED) return true; // billing off while building — never gate
    const s = await loadSettings();
    if (!levelUnlocked(s.plan, level)) {
      setPaywall({ open: true, reason: `${tierLabel(level)} is locked on the ${planName(s.plan)} plan — upgrade to unlock it.` });
      return false;
    }
    const mk = monthKey();
    const used = s.billMonth === mk ? s.creations : 0;
    const cap = creationCap(s.plan);
    if (used >= cap) {
      setPaywall({ open: true, reason: `You've used all ${cap} song creations this month on the ${planName(s.plan)} plan — upgrade for more.` });
      return false;
    }
    await updateSettings({ billMonth: mk, creations: used + 1 });
    return true;
  }

  // Turn a mock subscription on/off, resetting the monthly counter for a fresh
  // start. Wired to the paywall's "Choose plan" buttons.
  async function subscribe(plan: PlanId) {
    await updateSettings({ plan, billMonth: monthKey(), creations: 0 });
    setPaywall({ open: false, reason: null });
    if (plan !== "free") Alert.alert("You're all set! 🎉", `${planName(plan)} is now active. Enjoy your unlocked levels and songs.`);
  }

  async function generate(spec: SongSpec) {
    if (!(await consumeCreation(spec.level))) return;
    setLastSpec(spec);
    setGenError(null);
    setReadySong(null);
    setActiveJobs((n) => n + 1);
    setTab("home");
    const song = await runGeneration(spec);
    if (song) setReadySong(song);
    setActiveJobs((n) => Math.max(0, n - 1));
  }

  // Pick a fresh, varied musical style for a path song, from the user's
  // preferences — never repeating the last genre/mood, avoiding thumbs-down
  // styles and leaning toward thumbs-up ones. So every song has a new feel.
  const lastStyle = React.useRef<string>("");
  const ALL_MOODS = ["Energetic", "Chill", "Dance", "Romantic", "Tropical", "Party", "Happy", "Sad", "Dreamy", "Groovy", "Powerful", "Calm"];
  function pickStyle() {
    const disliked = new Set(songs.filter((s) => s.rating === -1 && s.genre).map((s) => s.genre));
    const liked = new Set(songs.filter((s) => s.rating === 1 && s.genre).map((s) => s.genre));
    let genrePool = (settings.defaultGenres.length ? settings.defaultGenres : GENRES).filter((g) => !disliked.has(g));
    if (!genrePool.length) genrePool = GENRES.filter((g) => !disliked.has(g));
    if (!genrePool.length) genrePool = GENRES;
    // give liked genres extra weight
    const weighted = [...genrePool, ...genrePool.filter((g) => liked.has(g))];
    const moodPool = settings.defaultMoods.length ? settings.defaultMoods : ALL_MOODS;
    const tempos = ["Slow", "Normal", "Fast"];
    const voices = ["female", "male", "duet", "any"];
    const [lastG, lastM] = lastStyle.current.split("|");
    const pick = <T,>(arr: T[], last?: T): T => {
      const opts = arr.length > 1 && last != null ? arr.filter((x) => x !== last) : arr;
      return opts[Math.floor(Math.random() * opts.length)];
    };
    const genre = pick(weighted, lastG as any);
    const mood = pick(moodPool, lastM as any);
    lastStyle.current = `${genre}|${mood}`;
    return {
      genre,
      beat: `${mood} ${tempos[Math.floor(Math.random() * tempos.length)]}`,
      voice: voices[Math.floor(Math.random() * voices.length)],
      artistFeel: settings.prefArtist.trim() || undefined,
      similarSongs: settings.prefSongs.trim() || undefined,
    };
  }

  async function flagCatalogSong(id: string, flag: CatalogFlag) {
    const map = await toggleCatalogFlag(id, flag);
    setCatFlags(map);
  }

  // Clear flags the developer has finished handling (rerolled / genre-fixed /
  // locked). Applies each resolved snapshot once, so those songs drop off ⚑.
  async function syncResolvedFlags() {
    // Refresh which songs are locked (green dot), cached for offline.
    const locked = await fetchLockedIds();
    if (locked) {
      setCatLocked(locked);
      saveLockedIds(locked);
    }
    const resolved = await fetchResolvedFlags();
    if (!resolved || resolved.at <= 0) return;
    const last = await getLastResolvedAt();
    if (resolved.at > last) {
      const map = await applyResolvedFlags(resolved.at, resolved.ids || []);
      setCatFlags(map);
    }
  }

  async function rateSong(id: string, rating: number) {
    // Built-in catalog songs keep their rating in a separate map.
    if (id.startsWith("cat-")) {
      const prev = catRatings[id] ?? 0;
      const next = prev === rating ? 0 : rating; // tapping the same one clears it
      const map = await setCatalogRating(id, next);
      setCatRatings(map);
      setCurrent((c) => (c && c.id === id ? { ...c, rating: next } : c));
      return;
    }
    const cur = songs.find((s) => s.id === id);
    const next = cur?.rating === rating ? 0 : rating; // tapping the same one clears it
    const list = await updateSong(id, { rating: next });
    setSongs(list);
    setCurrent((c) => (c && c.id === id ? { ...c, rating: next } : c));
  }

  // Find the song for a lesson spot on the journey. The BUILT-IN catalog song is
  // the default for that level+topic+lesson; if the learner has made their own
  // for that exact spot, that's used instead. Returns undefined if neither exists.
  function lessonSong(subject: string, tier: string, lesson: number): Song | undefined {
    const matchTop = (s: Song) => s.subject === subject && s.level === tier && s.lesson === lesson;
    const matchSpec = (s: Song) => !!s.spec && s.spec.subject === subject && s.spec.level === tier && (s.spec.lesson ?? 1) === lesson;
    return CATALOG.find(matchTop) || songs.find((s) => matchTop(s) || matchSpec(s));
  }

  // Guided path: play the next logical lesson — its built-in song if there is one,
  // a version the learner already made, otherwise generate a fresh one.
  async function continueLearning() {
    const prog = await loadProgress();
    const next = nextInPath(prog);
    if (!next) {
      Alert.alert(
        "Path complete! 🎉",
        "You've finished the guided path for this language. Keep going by creating your own songs — or switch languages for a fresh start."
      );
      return;
    }
    const existing = lessonSong(next.subject, next.tier, next.lesson);
    if (existing) {
      await addLearned(existing.vocab);
      openSong(existing, [existing]);
      return;
    }
    generate({ subject: next.subject, level: next.tier, lesson: next.lesson, ...pickStyle() });
  }

  // Journey map: tap any reached lesson to jump straight to it. The map plays ONLY
  // the built-in catalog song for that spot; if a spot has no built-in yet, it
  // generates a fresh one (it never substitutes a song the learner made).
  async function jumpToStep(step: PathStep) {
    setShowJourney(false);
    const built = CATALOG.find((s) => s.subject === step.subject && s.level === step.tier && s.lesson === step.lesson);
    if (built) {
      await addLearned(built.vocab);
      openSong(built, [built]);
      return;
    }
    generate({ subject: step.subject, level: step.tier, lesson: step.lesson, ...pickStyle() });
  }

  // Batch: generate lessons 1..count. If `vary`, randomize the style per lesson
  // from the given pools (chosen styles, or the user's saved preferences).
  async function generateAll(spec: SongSpec, count: number, vary: boolean, pools: { genres: string[]; moods: string[] }) {
    const allMoods = ["Energetic", "Chill", "Dance", "Romantic", "Tropical", "Party", "Happy", "Sad", "Dreamy", "Groovy", "Powerful", "Calm"];
    const genrePool = pools.genres.length ? pools.genres : GENRES;
    const moodPool = pools.moods.length ? pools.moods : allMoods;
    const tempos = ["Slow", "Normal", "Fast"];
    const voices = ["female", "male", "duet", "any"];
    const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

    setGenError(null);
    setReadySong(null);
    setTab("home");
    let done = 0; // count locally so the progress can never exceed `count`
    setBatch({ total: count, done: 0 });
    for (let lesson = 1; lesson <= count; lesson++) {
      if (!(await consumeCreation(spec.level))) break; // hit the plan's cap/lock
      const per: SongSpec = vary
        ? { ...spec, lesson, genre: pick(genrePool), beat: `${pick(moodPool)} ${pick(tempos)}`, voice: pick(voices) }
        : { ...spec, lesson };
      const song = await runGeneration(per);
      done += 1;
      setBatch({ total: count, done });
      if (!song) break; // stop the batch on an error
    }
    setBatch(null);
    setReadySong(null);
  }

  // Confirm cost/time before kicking off a big batch.
  function requestGenerateAll(spec: SongSpec, count: number, vary: boolean, pools: { genres: string[]; moods: string[] }) {
    const cost = (count * 0.13).toFixed(2);
    Alert.alert(
      `Create ${count} songs?`,
      `This generates lessons 1–${count} in the background${vary ? " with a mix of styles" : ""} (~$${cost} of MiniMax credit, roughly ${count}–${count * 2} min). Keep the app open while it works.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: `Create ${count}`, onPress: () => generateAll(spec, count, vary, pools) },
      ]
    );
  }

  async function handleDelete(id: string) {
    if (current?.id === id) {
      player.pause();
      setCurrent(null);
    }
    deleteAudio(id);
    setSongs(await deleteSong(id));
  }

  // Surprise: pick a random topic/genre/mood/voice, but at the level the user chose.
  function surpriseGenerate(level: Tier) {
    setSurpriseOpen(false);
    const subjects = ["greetings", "food", "colors", "numbers", "animals", "family", "vacation", "cooking", "weather", "feelings", "clothing", "shopping", "days", "home", "directions"];
    const moods = ["Energetic", "Chill", "Dance", "Romantic", "Tropical", "Party", "Happy", "Sad", "Dreamy", "Groovy", "Powerful", "Calm"];
    const tempos = ["Slow", "Normal", "Fast"];
    const voices = ["female", "male", "duet", "any"];
    const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
    generate({
      subject: pick(subjects),
      level,
      lesson: 1,
      genre: pick(GENRES),
      beat: `${pick(moods)} ${pick(tempos)}`,
      voice: pick(voices),
    });
  }

  async function renameSong(id: string, name: string) {
    const trimmed = name.trim() || undefined;
    setSongs(await updateSong(id, { customName: trimmed }));
    setCurrent((c) => (c && c.id === id ? { ...c, customName: trimmed } : c));
  }

  function regenerateSong(s: Song) {
    const spec: SongSpec =
      s.spec ?? {
        subject: s.subject,
        level: (s.level as SongSpec["level"]) || "beginner",
        lesson: s.lesson || 1,
        genre: s.genre || "Pop",
        beat: s.beat || "Normal",
        artistFeel: s.artistFeel || undefined,
      };
    generate(spec);
  }

  // Remove just the downloaded file (keeps the song in the library).
  async function deleteDownload(id: string) {
    deleteAudio(id);
    setSongs(await updateSong(id, { localUri: undefined }));
  }

  // Fire-and-forget karaoke alignment for a freshly made song. Uses the still-fresh
  // audio URL (the backend fetches it) so the phone does no heavy work; on success
  // it patches the song in the library and any open/queued copy so it glows.
  function alignSoon(song: Song) {
    if (song.catalog) return; // built-in songs ship with their timings baked in
    if (Array.isArray(song.lineTimings) && song.lineTimings.length) return;
    (async () => {
      try {
        // Prefer the downloaded file (always reachable) and fall back to the URL.
        const audioB64 = song.localUri ? await readAudioBase64(song.localUri) : null;
        const timings = await alignAudio({ audioB64, audioUrl: song.audioUrl, lyrics: song.lyrics });
        if (timings && timings.length) {
          const next = await updateSong(song.id, { lineTimings: timings });
          setSongs(next);
          setCurrent((c) => (c && c.id === song.id ? { ...c, lineTimings: timings } : c));
          setQueue((q) => q.map((x) => (x.id === song.id ? { ...x, lineTimings: timings } : x)));
        }
      } catch {
        // No worries — the song still works; lyrics just stay plain until re-aligned.
      }
    })();
  }

  // Add karaoke timing to songs made before alignment existed. Walks the library,
  // sends each un-aligned song's audio (downloaded file preferred, else URL) to
  // the aligner, and saves the timings back. Reports live progress.
  const [karaokeStatus, setKaraokeStatus] = useState<string>("");
  async function karaokeOlderSongs() {
    const todo = songs.filter((s) => !(Array.isArray(s.lineTimings) && s.lineTimings.length));
    if (todo.length === 0) {
      setKaraokeStatus("All your songs already have karaoke! 🎤");
      return;
    }
    let done = 0;
    let ok = 0;
    let noAudio = 0;
    for (const s of todo) {
      done += 1;
      setKaraokeStatus(`Adding karaoke… ${done}/${todo.length}`);
      try {
        const audioB64 = s.localUri ? await readAudioBase64(s.localUri) : null;
        if (!audioB64 && !s.audioUrl) { noAudio += 1; continue; }
        const timings = await alignAudio({ audioB64, audioUrl: s.audioUrl, lyrics: s.lyrics });
        if (timings && timings.length) {
          ok += 1;
          const next = await updateSong(s.id, { lineTimings: timings });
          setSongs(next);
          // Also patch the copy that's currently open / queued, so it glows now.
          setCurrent((c) => (c && c.id === s.id ? { ...c, lineTimings: timings } : c));
          setQueue((q) => q.map((x) => (x.id === s.id ? { ...x, lineTimings: timings } : x)));
        } else {
          noAudio += 1;
        }
      } catch {
        noAudio += 1;
      }
    }
    setKaraokeStatus(
      `Done! Added karaoke to ${ok} of ${todo.length} song${todo.length === 1 ? "" : "s"}.` +
        (noAudio > 0 ? ` ${noAudio} couldn't be aligned — reopen those songs and try again.` : "") +
        ` Reopen a song to see it glow.`
    );
  }

  // Manually download a song (for older ones not auto-downloaded).
  async function downloadSong(id: string) {
    const s = songs.find((x) => x.id === id);
    if (!s || s.localUri) return;
    try {
      const uri = await downloadAudio(s.id, s.audioUrl);
      setSongs(await updateSong(id, { localUri: uri }));
    } catch {
      setGenError("Couldn't download — the song's link may have expired.");
    }
  }

  // Play a song. If a context list is given, the rest of that list becomes the
  // queue so playback continues automatically to the next song.
  function openSong(s: Song, list?: Song[]) {
    setReadySong(null);
    // Built-in songs carry their favorite + rating state from catFavs / catRatings.
    if (s.catalog) s = { ...s, favorite: catFavs.includes(s.id), rating: catRatings[s.id] ?? 0 };
    const q = list && list.length ? list : [s];
    const idx = Math.max(0, q.findIndex((x) => x.id === s.id));
    setQueue(q);
    setQueueIndex(idx);
    setCurrent(s);
    setTab("learn");
    // If this song has no karaoke timing yet (older song, or a prior align
    // failed), quietly align it now so the glowing line appears a moment later.
    alignSoon(s);
  }

  function playNext() {
    if (queueIndex < queue.length - 1) {
      const ni = queueIndex + 1;
      setQueueIndex(ni);
      setCurrent(queue[ni]);
    }
  }
  function playPrev() {
    if (queueIndex > 0) {
      const pi = queueIndex - 1;
      setQueueIndex(pi);
      setCurrent(queue[pi]);
    }
  }

  // Add a song to the end of the queue (starts playing if nothing is playing).
  function addToQueue(s: Song) {
    if (!current) {
      openSong(s, [s]);
      return;
    }
    setQueue((q) => (q.some((x) => x.id === s.id) ? q : [...q, s]));
  }

  function playPlaylist(pl: Playlist) {
    const list = pl.songIds.map((id) => songs.find((s) => s.id === id)).filter(Boolean) as Song[];
    if (list.length) openSong(list[0], list);
  }

  // Play a list in random order.
  function playShuffled(list: Song[]) {
    if (!list.length) return;
    const s = [...list].sort(() => Math.random() - 0.5);
    openSong(s[0], s);
  }
  function shufflePlaylist(pl: Playlist) {
    const list = pl.songIds.map((id) => songs.find((s) => s.id === id)).filter(Boolean) as Song[];
    playShuffled(list);
  }

  // Toggle shuffle for the current queue. Turning it on reshuffles what's next.
  function toggleShuffle() {
    setShuffle((s) => {
      const on = !s;
      if (on && current && queue.length > 1) {
        const rest = queue.filter((x) => x.id !== current.id).sort(() => Math.random() - 0.5);
        setQueue([current, ...rest]);
        setQueueIndex(0);
      }
      return on;
    });
  }

  async function handleCreatePlaylist(name: string, firstSongId?: string) {
    setPlaylists(await createPlaylist(name, firstSongId));
  }
  async function handleAddToPlaylist(playlistId: string, songId: string) {
    setPlaylists(await addSongToPlaylist(playlistId, songId));
  }
  async function handleDeletePlaylist(id: string) {
    setPlaylists(await deletePlaylist(id));
  }
  async function handleRemoveFromPlaylist(playlistId: string, songId: string) {
    setPlaylists(await removeSongFromPlaylist(playlistId, songId));
  }

  async function toggleFav(id: string) {
    // Built-in catalog songs keep their favorite state in a separate list.
    if (id.startsWith("cat-")) {
      const next = await toggleCatalogFavorite(id);
      setCatFavs(next);
      setCurrent((c) => (c && c.id === id ? { ...c, favorite: next.includes(id) } : c));
      return;
    }
    const next = await toggleFavorite(id);
    setSongs(next);
    setCurrent((c) => (c && c.id === id ? next.find((s) => s.id === id) ?? c : c));
  }

  function useStyle(s: Song) {
    const [mood = "Energetic", tempo = "Normal"] = (s.beat ?? "").split(" ");
    setStyleSeed({ genre: s.genre ?? "Pop", mood, tempo, artistFeel: s.artistFeel ?? undefined });
    setTab("create");
  }

  async function updateSettings(partial: Partial<Settings>) {
    const prevLang = settings.language;
    const next = await saveSettings(partial);
    setSettings(next);

    // Switching language swaps to that language's completely separate world.
    // Nothing in the old language is lost — switching back restores it.
    if (partial.language && partial.language !== prevLang) {
      setStorageLanguage(next.language);
      try {
        player.pause();
      } catch {}
      setCurrent(null);
      setQueue([]);
      setQueueIndex(0);
      const [sg, pl, st, cf, cr, cfl, clk] = await Promise.all([loadSongs(), loadPlaylists(), bumpStreak(), loadCatalogFavorites(), loadCatalogRatings(), loadCatalogFlags(), loadLockedIds()]);
      setSongs(sg);
      setPlaylists(pl);
      setStreak(st);
      setCatFavs(cf);
      setCatRatings(cr);
      setCatFlags(cfl);
      setCatLocked(clk);
      await refreshStats();
      syncResolvedFlags();
      setLibFocus(null);
      setTab("home");
    }
  }

  async function resetData() {
    await clearAllData();
    setSongs([]);
    setCurrent(null);
    player.pause();
    setWordsLearned(0);
    setLessonsDone(0);
  }

  // Start the journey over: clear the filled-in map circles (progress) only —
  // keeps the learner's songs, playlists and learned words.
  async function resetJourney() {
    await resetProgress();
    await refreshStats();
  }

  function stopPlayback() {
    player.pause();
    setCurrent(null);
  }

  const showMini = current && tab !== "learn" && activeJobs === 0 && !readySong && !genError && !batch;

  if (booting) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />
        <Image source={require("./assets/logo.png")} style={styles.splashLogo} resizeMode="contain" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        {tab === "home" && (
          <HomeScreen
            songs={displaySongs}
            current={current}
            streak={streak}
            reviewCount={wordsLearned}
            language={settings.language}
            sections={settings.homeSections}
            favorites={displaySongs.filter((s) => s.favorite)}
            playlists={playlists.filter((p) => settings.homePlaylists.includes(p.id))}
            homeLevels={settings.homeLevels}
            nextUp={nextUp}
            pathPct={pathPct}
            busy={activeJobs > 0}
            ready={!!nextUp && songs.some((s) => s.spec && s.spec.subject === nextUp.subject && s.spec.level === nextUp.tier && (s.spec.lesson ?? 1) === nextUp.lesson)}
            onContinue={continueLearning}
            onOpenJourney={() => setShowJourney(true)}
            onOpenDictionary={() => setShowDictionary(true)}
            onCreate={() => setTab("create")}
            onOpenSong={(s) => openSong(s, songs)}
            onPlayRecipe={generate}
            onPlayPlaylist={playPlaylist}
            onPlayList={(list) => { if (list.length) openSong(list[0], list); }}
            onOpenFlashcards={openFlashcards}
            onSurprise={() => setSurpriseOpen(true)}
            onOpenFavorites={() => {
              setLibFocus("fav");
              setTab("library");
            }}
          />
        )}
        {tab === "learn" &&
          (current ? (
            <PlayerScreen
              song={current}
              player={player}
              status={status}
              loop={loop}
              shuffle={shuffle}
              fontScale={settings.fontScale}
              onToggleLoop={() => setLoop((v) => !v)}
              onToggleShuffle={toggleShuffle}
              onBack={() => setTab("home")}
              onToggleFavorite={() => toggleFav(current.id)}
              onUseStyle={() => useStyle(current)}
              onNext={playNext}
              onPrev={playPrev}
              hasNext={queueIndex < queue.length - 1}
              hasPrev={queueIndex > 0}
              queuePos={queue.length > 1 ? `${queueIndex + 1} / ${queue.length}` : ""}
              onRate={rateSong}
              canFlag={current.catalog === true}
              isLocked={catLocked.includes(current.id)}
              flags={catFlags[current.id] || []}
              onToggleFlag={(flag) => flagCatalogSong(current.id, flag)}
              isLesson={!!current.spec && subjectsForLevel(current.spec.level).includes(current.spec.subject)}
              onFinishLesson={() => setFinishing(current)}
              onNextLesson={async () => {
                if (!current.spec) return;
                // Pressing forward means "I know this one" — mark it done so its
                // circle and the road fill in, then go to the next lesson in order.
                await markLessonDone(current.spec.subject, current.spec.level, current.spec.lesson);
                await refreshStats();
                const nx = stepAfter({ subject: current.spec.subject, tier: current.spec.level, lesson: current.spec.lesson });
                if (nx) jumpToStep(nx);
              }}
            />
          ) : (
            <EmptyLearn onCreate={() => setTab("create")} />
          ))}
        {tab === "create" && (
          <CreateScreen
            onBack={() => setTab("home")}
            onGenerate={generate}
            onGenerateAll={requestGenerateAll}
            seed={styleSeed}
            onSeedConsumed={() => setStyleSeed(null)}
            defaults={{
              genre: settings.defaultGenres[0] ?? "Reggaeton",
              mood: settings.defaultMoods[0] ?? "Energetic",
              tempo: settings.defaultTempo,
              genres: settings.defaultGenres,
              moods: settings.defaultMoods,
            }}
          />
        )}
        {tab === "library" && (
          <LibraryScreen
            songs={displaySongs}
            playlists={playlists}
            onOpenSong={openSong}
            onDelete={handleDelete}
            onCreate={() => setTab("create")}
            onToggleFavorite={toggleFav}
            onAddToQueue={addToQueue}
            onDownload={downloadSong}
            onDeleteDownload={deleteDownload}
            onRename={renameSong}
            onRegenerate={regenerateSong}
            catFlags={catFlags}
            catLocked={catLocked}
            onToggleFlag={flagCatalogSong}
            focusFilter={libFocus}
            onFocusConsumed={() => setLibFocus(null)}
            onShuffle={playShuffled}
            onShufflePlaylist={shufflePlaylist}
            onPlayPlaylist={playPlaylist}
            onCreatePlaylist={handleCreatePlaylist}
            onAddToPlaylist={handleAddToPlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            onOpenSongInPlaylist={openSong}
          />
        )}
        {tab === "profile" && (
          <ProfileScreen
            songsMade={songs.length}
            wordsLearned={wordsLearned}
            lessonsDone={lessonsDone}
            streak={streak}
            songsToday={songs.filter((s) => isToday(s.createdAt)).length}
            settings={settings}
            playlists={playlists}
            onUpdateSettings={updateSettings}
            onResetData={resetData}
            onResetJourney={resetJourney}
            onKaraokeOlder={karaokeOlderSongs}
            karaokeStatus={karaokeStatus}
            onOpenPaywall={BILLING_ENABLED ? () => setPaywall({ open: true, reason: null }) : undefined}
          />
        )}
      </View>

      {/* Mini player — keeps the current song controllable from any tab */}
      {showMini && current && (
        <Pressable onPress={() => setTab("learn")}>
          <View style={styles.mini}>
            <View style={[styles.miniArt, { borderColor: `${gradientFor(current.subject)[0]}66` }]}>
              <SubjectIcon subject={current.subject} size={20} color={gradientFor(current.subject)[0]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniTitle} numberOfLines={1}>{songTitle(current)}</Text>
              <Text style={styles.miniMeta} numberOfLines={1}>{current.genre}</Text>
            </View>
            <Pressable onPress={() => (status.playing ? player.pause() : player.play())} hitSlop={10}>
              <Text style={styles.miniBtn}>{status.playing ? "❚❚" : "▶"}</Text>
            </Pressable>
            <Pressable onPress={stopPlayback} hitSlop={10}>
              <Text style={styles.miniStop}>✕</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      <GenBanner
        activeJobs={activeJobs}
        batch={batch}
        readySong={readySong}
        error={genError}
        onOpen={() => readySong && openSong(readySong)}
        onRetry={() => lastSpec && generate(lastSpec)}
        onDismissError={() => setGenError(null)}
      />

      <Modal visible={surpriseOpen} transparent animationType="slide" onRequestClose={() => setSurpriseOpen(false)}>
        <Pressable style={styles.surpriseBackdrop} onPress={() => setSurpriseOpen(false)} />
        <View style={styles.surpriseSheet}>
          <View style={styles.surpriseHandle} />
          <Text style={styles.surpriseTitle}>🎲 Surprise me</Text>
          <Text style={styles.surpriseSub}>Pick a level and I'll make a random song for it.</Text>
          {LEVEL_ORDER.map((t) => (
            <Pressable key={t} onPress={() => surpriseGenerate(t)} style={styles.surpriseLevel}>
              <Text style={styles.surpriseLevelText}>{tierLabel(t)}</Text>
              <Text style={styles.surpriseLevelChev}>›</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setSurpriseOpen(false)} style={styles.surpriseCancel}>
            <Text style={styles.surpriseCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>

      <PaywallScreen
        visible={paywall.open}
        currentPlan={settings.plan}
        reason={paywall.reason}
        onSubscribe={subscribe}
        onClose={() => setPaywall({ open: false, reason: null })}
      />

      <TabBar active={tab} onSelect={setTab} avatar={settings.avatar} />

      {showFlashcards && (
        <View style={StyleSheet.absoluteFill}>
          <FlashcardsScreen
            vocab={learnedVocab}
            known={known}
            lang={langCode(settings.language)}
            onToggleKnown={handleToggleKnown}
            onClose={() => setShowFlashcards(false)}
          />
        </View>
      )}

      {showJourney && (
        <View style={StyleSheet.absoluteFill}>
          <JourneyScreen
            progress={progress}
            nextUp={nextUp}
            currentStep={current?.spec ? { subject: current.spec.subject, tier: current.spec.level as Tier, lesson: current.spec.lesson ?? 1 } : null}
            pathPct={pathPct}
            avatar={settings.avatar}
            language={settings.language}
            onJumpTo={jumpToStep}
            onClose={() => setShowJourney(false)}
          />
        </View>
      )}

      {showDictionary && (
        <View style={StyleSheet.absoluteFill}>
          <DictionaryScreen
            learned={learnedVocab}
            lang={langCode(settings.language)}
            languageName={settings.language}
            onClose={() => setShowDictionary(false)}
          />
        </View>
      )}

      {finishing && (
        <View style={StyleSheet.absoluteFill}>
          <LessonCompleteScreen
            song={finishing}
            lang={langCode(settings.language)}
            onExit={() => setFinishing(null)}
            onComplete={async (goNext) => {
              const spec = finishing.spec;
              setFinishing(null);
              if (spec) await completeLesson(spec);
              if (goNext) continueLearning();
              else setTab("home");
            }}
          />
        </View>
      )}

      {!booting && !settings.onboarded && (
        <View style={StyleSheet.absoluteFill}>
          <OnboardingScreen onDone={() => updateSettings({ onboarded: true })} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

function GenBanner({
  activeJobs,
  batch,
  readySong,
  error,
  onOpen,
  onRetry,
  onDismissError,
}: {
  activeJobs: number;
  batch: { total: number; done: number } | null;
  readySong: Song | null;
  error: string | null;
  onOpen: () => void;
  onRetry: () => void;
  onDismissError: () => void;
}) {
  if (batch) {
    return (
      <LinearGradient colors={["#0F4A44", "#123E66"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.bannerText}>
          Creating your lessons… {Math.min(batch.done, batch.total)} of {batch.total} done. Keep the app open.
        </Text>
      </LinearGradient>
    );
  }
  if (activeJobs > 0) {
    return (
      <LinearGradient colors={["#0F4A44", "#123E66"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.bannerText}>
          Creating your song{activeJobs > 1 ? `s (${activeJobs})` : ""}… keep exploring, it'll appear here.
        </Text>
      </LinearGradient>
    );
  }
  if (error) {
    return (
      <Pressable onPress={onRetry} onLongPress={onDismissError}>
        <View style={[styles.banner, { backgroundColor: colors.card2 }]}>
          <Text style={styles.bannerEmoji}>😕</Text>
          <Text style={styles.bannerText}>{error} (tap to retry)</Text>
        </View>
      </Pressable>
    );
  }
  if (readySong) {
    return (
      <Pressable onPress={onOpen}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
          <SubjectIcon subject={readySong.subject} size={18} color="#fff" />
          <Text style={styles.bannerText}>“{songTitle(readySong)}” is ready — tap to play ▶</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return null;
}

function isToday(ts: number) {
  const d = new Date(ts);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function EmptyLearn({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyLearn}>
      <View style={styles.emblemWrap}>
        <LinearGradient colors={["#22D3EE", "#7C5CFF", "#B14DFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emblemRing}>
          <View style={styles.emblemInner}><Text style={styles.emblemEmoji}>🎧</Text></View>
        </LinearGradient>
        <Text style={[styles.emNote, { top: 4, left: 20, color: "#22D3EE" }]}>♪</Text>
        <Text style={[styles.emNote, { top: -2, right: 26, color: "#7C5CFF" }]}>♫</Text>
        <Text style={[styles.emNote, { bottom: 18, left: 2, color: "#F472B6" }]}>♬</Text>
        <Text style={[styles.emChar, { top: 44, right: 4, color: "#A78BFA" }]}>ñ</Text>
        <Text style={[styles.emChar, { bottom: 6, right: 30, color: "#38BDF8" }]}>あ</Text>
      </View>
      <GradientText text="Nothing playing yet" style={styles.emptyTitle} colors={["#22D3EE", "#B14DFF"]} />
      <Text style={styles.emptySub}>Create a song, then it plays here with lyrics.</Text>
      <Pressable onPress={onCreate} style={styles.emptyBtn}>
        <GradientText text="＋  Create a song" style={styles.emptyBtnText} colors={["#22D3EE", "#B14DFF"]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  splash: { flex: 1, backgroundColor: "#FBF8F1", alignItems: "center", justifyContent: "center" },
  splashLogo: { width: 300, height: 300 },
  splashBrand: { fontSize: 64, fontWeight: "900", letterSpacing: 1 },
  splashTag: { fontSize: 13, fontWeight: "900", letterSpacing: 2 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0E3E42", paddingVertical: 12, paddingHorizontal: 16 },
  bannerEmoji: { fontSize: 18 },
  bannerText: { color: "#EAF6FF", fontSize: 14, fontWeight: "500", flex: 1 },
  surpriseBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  surpriseSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#05080F", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, borderTopWidth: 1, borderColor: "rgba(34,184,176,0.25)" },
  surpriseHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(124,77,255,0.5)", alignSelf: "center", marginBottom: 12 },
  surpriseTitle: { color: colors.ink, fontSize: 22, fontWeight: "900" },
  surpriseSub: { color: colors.muted, fontSize: 13, fontWeight: "600", marginTop: 2, marginBottom: 14 },
  surpriseLevel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(3,5,10,0.35)", borderWidth: 1, borderColor: "rgba(124,77,255,0.4)", borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, marginBottom: 10 },
  surpriseLevelText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  surpriseLevelChev: { color: "#A78BFA", fontSize: 22, fontWeight: "900" },
  surpriseCancel: { alignItems: "center", paddingVertical: 12, marginTop: 2 },
  surpriseCancelText: { color: colors.muted, fontSize: 15, fontWeight: "800" },
  mini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(7,11,19,0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(34,184,176,0.25)",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  miniArt: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(7,11,19,0.6)", borderWidth: 1 },
  miniTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  miniMeta: { color: colors.muted, fontSize: 12 },
  miniBtn: { color: colors.ink, fontSize: 18, fontWeight: "900", paddingHorizontal: 8 },
  miniStop: { color: colors.faint, fontSize: 16, paddingHorizontal: 6 },
  emptyLearn: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emblemWrap: { width: 180, height: 180, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emblemRing: { width: 150, height: 150, borderRadius: 75, alignItems: "center", justifyContent: "center", shadowColor: "#7C5CFF", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  emblemInner: { width: 130, height: 130, borderRadius: 65, backgroundColor: "#070510", alignItems: "center", justifyContent: "center" },
  emblemEmoji: { fontSize: 60 },
  emNote: { position: "absolute", fontSize: 22, fontWeight: "900", textShadowColor: "rgba(255,255,255,0.4)", textShadowRadius: 6 },
  emChar: { position: "absolute", fontSize: 20, fontWeight: "900" },
  emptyTitle: { color: colors.ink, fontSize: 26, fontWeight: "900", marginTop: 4 },
  emptySub: { color: colors.muted, fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 21 },
  emptyBtn: { marginTop: 22, borderRadius: radius.pill, borderWidth: 1.5, borderColor: "#7C5CFF", paddingVertical: 14, paddingHorizontal: 30, backgroundColor: "rgba(124,92,255,0.08)", shadowColor: "#7C5CFF", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  emptyBtnText: { fontSize: 17, fontWeight: "900" },
});

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
