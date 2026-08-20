// Ritmo backend — a thin proxy that holds the secret API keys and turns the
// app's song picks into a real sung song (MiniMax) plus a spoken pronunciation
// clip (ElevenLabs). The mobile app NEVER sees the keys; it only calls here.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { buildLyrics } = require("./lib/lyrics");
const { translateWords } = require("./lib/llm");
const { listSubjects, getCurriculum, TOTAL_LESSONS_PER_TIER } = require("./lib/vocab");
const { generateSong } = require("./lib/minimax");
const { generateSongFal } = require("./lib/fal");
// Use fal.ai for the sung audio when a FAL_KEY is present (MiniMax's direct music
// API was discontinued); otherwise fall back to the old MiniMax path.
const makeSong = process.env.FAL_KEY ? generateSongFal : generateSong;
const { generatePronunciation } = require("./lib/elevenlabs");
const { alignSong, fetchAudioBuffer } = require("./lib/align");

const app = express();
app.set("trust proxy", true); // correct protocol/host behind Render's proxy
app.use(cors());
// Larger limit so the app can send an existing song's audio (base64) to /align.
app.use(express.json({ limit: "30mb" }));

// ---- Simple in-memory audio cache (ephemeral; fine for streaming playback) --
const audioCache = new Map(); // id -> Buffer
const CACHE_MAX = 200;
function cacheAudio(buffer) {
  const id = crypto.randomBytes(8).toString("hex");
  if (audioCache.size >= CACHE_MAX) {
    audioCache.delete(audioCache.keys().next().value); // evict oldest
  }
  audioCache.set(id, buffer);
  return id;
}
function audioUrlFor(req, id) {
  return `${req.protocol}://${req.get("host")}/audio/${id}.mp3`;
}

app.get("/audio/:id.mp3", (req, res) => {
  const buf = audioCache.get(req.params.id);
  if (!buf) return res.status(404).send("Not found");
  res.set("Content-Type", "audio/mpeg");
  res.send(buf);
});

// ---- Health + metadata --------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    minimax: Boolean(process.env.MINIMAX_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
  });
});

app.get("/subjects", (_req, res) => res.json({ subjects: listSubjects() }));

// Users flag a bad lyric line → append to reports.jsonl for review.
const fs = require("fs");
app.post("/report", (req, res) => {
  const entry = { at: new Date().toISOString(), ...(req.body || {}) };
  console.log("⚠️  REPORT:", JSON.stringify(entry));
  try {
    fs.appendFileSync(__dirname + "/reports.jsonl", JSON.stringify(entry) + "\n");
  } catch {}
  res.json({ ok: true });
});

// The tester's song flags (lock / reroll / wrong-genre) sent straight from the
// app. Latest snapshot is written to flags-inbox.json (overwritten each send) so
// the developer can just read that one file — no copy/paste from the phone.
app.post("/flags", (req, res) => {
  const flags = Array.isArray(req.body?.flags) ? req.body.flags : [];
  const snapshot = { at: new Date().toISOString(), count: flags.length, flags };
  console.log(`🚩 FLAGS received: ${flags.length} song(s)`);
  try {
    fs.writeFileSync(__dirname + "/flags-inbox.json", JSON.stringify(snapshot, null, 2));
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
  res.json({ ok: true, count: flags.length });
});

// The developer's "resolved" snapshot (written to flags-resolved.json when a
// batch of flagged songs has been updated). The app reads it and clears those
// flags from the ⚑ list. Shape: { at: <ms>, ids: [<catalog id>, ...] }.
app.get("/flags/resolved", (req, res) => {
  try {
    const p = __dirname + "/flags-resolved.json";
    if (!fs.existsSync(p)) return res.json({ at: 0, ids: [] });
    res.json(JSON.parse(fs.readFileSync(p, "utf8")));
  } catch {
    res.json({ at: 0, ids: [] });
  }
});

// Which built-in songs are locked (approved keepers). Source of truth is the
// _locked folder. The app shows a green dot on these so the tester can see at a
// glance what's already done vs. what's new to listen to. Shape: { ids: [...] }.
app.get("/flags/locked", (req, res) => {
  try {
    const dir = __dirname + "/../RitmoApp/assets/catalog/_locked";
    if (!fs.existsSync(dir)) return res.json({ ids: [] });
    const ids = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".mp3"))
      .map((f) => "cat-" + f.replace(/\.mp3$/, ""));
    res.json({ ids });
  } catch {
    res.json({ ids: [] });
  }
});

// Live dictionary translation for a single word/phrase (either direction).
app.post("/translate", async (req, res) => {
  try {
    const text = (req.body?.text || "").trim();
    const language = req.body?.language || "Spanish";
    if (!text) return res.status(400).json({ error: "No text provided." });
    const pairs = await translateWords([text], language);
    const p = pairs?.[0] || { es: text, en: text };
    res.json({ es: p.es, en: p.en });
  } catch (e) {
    res.status(500).json({ error: e.message || "Translation failed." });
  }
});

// Full curriculum: subjects + how many lessons each tier has (for progression).
app.get("/curriculum", (_req, res) => res.json({ curriculum: getCurriculum() }));

// ---- Create a song ------------------------------------------------------
// POST /lyrics — build a lesson's lyrics + vocab WITHOUT generating audio. Used
// by the catalog builder (which makes the audio on ElevenLabs instead of MiniMax).
app.post("/lyrics", async (req, res) => {
  try {
    const { subject, topic, level, lesson, avoidWords, language, order, genre } = req.body || {};
    const lang = language || "Spanish";
    const ord = order === "en-es" ? "en-es" : "es-en";
    const avoid = Array.isArray(avoidWords) ? avoidWords.slice(0, 60) : [];
    const built = await buildLyrics({ subject, topic, level, lesson, avoidWords: avoid, language: lang, order: ord, genre });
    res.json(built);
  } catch (err) {
    console.error("lyrics failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /create-song { subject, level, genre, beat, artistFeel }
app.post("/create-song", async (req, res) => {
  try {
    const { subject, topic, level, lesson, genre, beat, artistFeel, similarSongs, arrangement, reviewWords, avoidWords, language, order, voice } = req.body || {};
    const lang = language || "Spanish";
    const ord = order === "en-es" ? "en-es" : "es-en";
    const reviewVocab = Array.isArray(reviewWords) ? reviewWords.slice(0, 4) : [];
    const avoid = Array.isArray(avoidWords) ? avoidWords.slice(0, 60) : [];
    const built = await buildLyrics({ subject, topic, level, lesson, reviewVocab, avoidWords: avoid, language: lang, order: ord, genre });
    const { title, lyrics, vocab, subjectLabel } = built;

    const song = await makeSong({ lyrics, genre, beat, artistFeel, similarSongs, arrangement, level, language: lang, voice });

    // MiniMax may give us a URL or raw bytes; normalize to a URL the app can play.
    let audioUrl = song.audioUrl;
    if (!audioUrl && song.audioBuffer) {
      audioUrl = audioUrlFor(req, cacheAudio(song.audioBuffer));
    }

    // Karaoke: the app shows a FREE built-in timing estimate immediately, and
    // (when ElevenLabs credits are available) upgrades to precise timing via a
    // background /align call — so highlighting never blocks or depends on quota.
    res.json({
      title,
      subject: subject || "greetings",
      subjectLabel,
      level: built.tier,
      lesson: built.lesson,
      totalLessons: TOTAL_LESSONS_PER_TIER,
      custom: built.custom,
      genre: genre || null,
      beat: beat || null,
      artistFeel: artistFeel || null,
      lyrics,
      vocab, // [{ es, en }] for synced display + pronunciation
      audioUrl,
      lineTimings: null, // precise timing is filled in later by the background /align
    });
  } catch (err) {
    console.error("create-song failed:", err.message);
    res.status(502).json({ error: err.message });
  }
});

// ---- Align an EXISTING song ---------------------------------------------
// POST /align { audioB64?, audioUrl?, lyrics }  -> { lineTimings }
// Used to add karaoke timing to songs made before alignment existed. The app
// sends the downloaded audio (base64) or a still-valid URL, plus the lyrics.
app.post("/align", async (req, res) => {
  try {
    const { audioB64, audioUrl, lyrics } = req.body || {};
    if (!lyrics) return res.status(400).json({ error: "No lyrics provided." });
    let buf = null;
    if (audioB64) buf = Buffer.from(audioB64, "base64");
    else if (audioUrl) buf = await fetchAudioBuffer(audioUrl);
    if (!buf || buf.length === 0) return res.status(400).json({ error: "No audio available to align." });
    const aligned = await alignSong(buf, lyrics);
    res.json({ lineTimings: aligned ? aligned.timings : null });
  } catch (err) {
    console.error("align failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---- Pronunciation practice ---------------------------------------------
// POST /pronounce { vocab: [{es,en}] }  (or { subject, level })
app.post("/pronounce", async (req, res) => {
  try {
    let { vocab, subject, level } = req.body || {};
    if (!Array.isArray(vocab) || vocab.length === 0) {
      vocab = (await buildLyrics({ subject, level })).vocab; // fall back to subject vocab
    }
    const { audioBuffer } = await generatePronunciation(vocab);
    const audioUrl = audioUrlFor(req, cacheAudio(audioBuffer));
    res.json({ audioUrl });
  } catch (err) {
    console.error("pronounce failed:", err.message);
    res.status(502).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ritmo backend listening on http://localhost:${PORT}`);
  console.log(
    `  MiniMax key: ${process.env.MINIMAX_API_KEY ? "set" : "MISSING"} | ` +
      `ElevenLabs key: ${process.env.ELEVENLABS_API_KEY ? "set" : "MISSING"}`
  );
});
