// Builds the app's PRELOADED CATALOG. Two providers:
//   PROVIDER = "minimax"    -> free during testing, keeps artist styles + the mix/
//                              tempo "radio-hit" recipe (weaker Spanish pronunciation).
//   PROVIDER = "elevenlabs" -> best Spanish pronunciation, genre-only (no artist
//                              names, ToS), uses ElevenLabs credits. Use for the
//                              FINAL catalog at launch.
// Flip PROVIDER below to switch. Lyrics always come from the backend's lyric engine;
// karaoke timings via /align. Songs are bundled with the app — free forever after.
//
// Usage: backend running (http://localhost:3000), then:
//   node ritmo-backend/scripts/build-catalog.js
// Add songs by editing catalog-list.json and re-running (incremental + cached).

const PROVIDER = "minimax"; // <-- "minimax" (free testing) or "elevenlabs" (launch)

const fs = require("fs");
const path = require("path");
const { GENRE_STYLE } = require("../lib/minimax");

const BACKEND = "http://localhost:3000";
const EL_MUSIC_URL = "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128";
const ROOT = "C:/Users/luism/Ritmo";
const APP = path.join(ROOT, "RitmoApp");
const CATALOG_DIR = path.join(APP, "assets", "catalog");
// Songs Angie has APPROVED get copied into _locked/ (via scripts/lock-song.js).
// A locked song is restored and reused on every rebuild — never regenerated —
// so an approved take can't be lost to MiniMax's random re-generation.
const LOCKED_DIR = path.join(CATALOG_DIR, "_locked");
const OUT_TS = path.join(APP, "src", "data", "catalog.ts");
const LIST = path.join(ROOT, "ritmo-backend", "scripts", "catalog-list.json");

let EL_KEY = "";
for (const line of fs.readFileSync(path.join(ROOT, "ritmo-backend", ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.*)\s*$/);
  if (m) EL_KEY = m[1].replace(/^["']|["']$/g, "").trim();
}

const camel = (s) => s.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
const J = (v) => JSON.stringify(v === undefined ? null : v);

async function postJson(url, body, headers) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(headers || {}) }, body: JSON.stringify(body) });
  return res;
}

// ElevenLabs: our "[Section]\nline" lyrics -> composition_plan chunks (no artist).
function lyricsToChunks(lyrics, genre) {
  const blocks = [];
  let cur = null;
  for (const raw of lyrics.split("\n")) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("[")) { cur = { name: t, lines: [] }; blocks.push(cur); }
    else if (cur) cur.lines.push(t);
  }
  const style = GENRE_STYLE[genre] || (genre ? `${genre} music` : "catchy melodic song");
  const pos = [style, "Spanish-language vocals", "clear correct native Spanish pronunciation and accent", "lead vocals mixed loud and clear out in front", "soft gentle light backing music, easy to hear every word", "comfortable steady medium tempo around 100 BPM, upbeat and fun to sing along, easy to follow"];
  const neg = ["muffled or slurred vocals", "English-accented Spanish", "loud instruments drowning out the vocals", "instruments louder than the singing", "heavy distortion, aggressive, wall of sound, screaming", "too slow, draggy, sluggish, dragging ballad tempo, too fast or rushed"];
  return blocks.filter((b) => b.lines.length).map((b) => ({
    text: `${b.name}\n${b.lines.join("\n")}`,
    duration_ms: Math.max(4000, b.lines.length * 2200),
    positive_styles: pos,
    negative_styles: neg,
    context_adherence: "high",
  }));
}

// Returns { data, buf } for one song, or null on failure.
async function makeSong(s, avoidWords) {
  if (PROVIDER === "elevenlabs") {
    const lr = await postJson(`${BACKEND}/lyrics`, { subject: s.subject, topic: s.topic, level: s.level, lesson: s.lesson, language: s.language || "Spanish", order: s.order || "en-es", genre: s.genre, avoidWords });
    const built = await lr.json();
    if (!built || built.error || !built.lyrics) { console.log("LYRICS FAILED:", (built && built.error) || "none"); return null; }
    const data = { title: built.title, subject: s.subject, subjectLabel: built.subjectLabel, level: s.level, lesson: built.lesson || s.lesson || 1, totalLessons: 100, genre: s.genre, lyrics: built.lyrics, vocab: built.vocab };
    const mr = await fetch(EL_MUSIC_URL, { method: "POST", headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ composition_plan: { chunks: lyricsToChunks(data.lyrics, s.genre) }, model_id: "music_v2" }) });
    if (!mr.ok) { console.log("EL MUSIC FAILED:", mr.status, (await mr.text()).slice(0, 160)); return null; }
    return { data, buf: Buffer.from(await mr.arrayBuffer()) };
  }
  // MiniMax: /create-song makes lyrics + audio in one call (keeps artistFeel).
  const cr = await postJson(`${BACKEND}/create-song`, { subject: s.subject, topic: s.topic, level: s.level, lesson: s.lesson, genre: s.genre, beat: s.beat, artistFeel: s.artistFeel, similarSongs: s.similarSongs, arrangement: s.arrangement, voice: s.voice, language: s.language || "Spanish", order: s.order || "en-es", avoidWords });
  const d = await cr.json();
  if (!d || d.error || !d.audioUrl) { console.log("CREATE FAILED:", (d && d.error) || "no audio"); return null; }
  const data = { title: d.title, subject: d.subject, subjectLabel: d.subjectLabel, level: d.level, lesson: d.lesson, totalLessons: d.totalLessons || 100, genre: d.genre, lyrics: d.lyrics, vocab: d.vocab };
  const ares = await fetch(d.audioUrl);
  return { data, buf: Buffer.from(await ares.arrayBuffer()) };
}

async function main() {
  const songs = JSON.parse(fs.readFileSync(LIST, "utf8"));
  fs.mkdirSync(CATALOG_DIR, { recursive: true });
  const entries = [];
  const usedBySubject = {};
  const addUsed = (subject, vocab) => {
    if (!subject || !Array.isArray(vocab)) return;
    (usedBySubject[subject] ||= []);
    for (const w of vocab) if (w && w.es) usedBySubject[subject].push(w.es);
  };

  for (const s of songs) {
    const cachePath = path.join(CATALOG_DIR, `${s.slug}.json`);
    const mp3Path = path.join(CATALOG_DIR, `${s.slug}.mp3`);
    // Locked (approved) song? Restore it into place and reuse — never regenerate.
    const lockJson = path.join(LOCKED_DIR, `${s.slug}.json`);
    const lockMp3 = path.join(LOCKED_DIR, `${s.slug}.mp3`);
    if (fs.existsSync(lockJson) && fs.existsSync(lockMp3)) {
      fs.copyFileSync(lockJson, cachePath);
      fs.copyFileSync(lockMp3, mp3Path);
    }
    if (fs.existsSync(cachePath) && fs.existsSync(mp3Path)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
        addUsed(cached.data && cached.data.subject, cached.data && cached.data.vocab);
        entries.push(cached);
        writeCatalog();
        console.log(`${s.slug}: reused from cache`);
        continue;
      } catch {}
    }

    process.stdout.write(`Building ${s.slug} (${s.genre}) on ${PROVIDER}... `);
    let made = null;
    try { made = await makeSong(s, usedBySubject[s.subject] || []); }
    catch (e) { console.log("ERROR:", e.message); }
    if (!made) continue;
    // A transient FS write error (Windows file-watcher/AV lock) must not crash the
    // whole batch — log it and move on; the next run picks the song back up.
    try { fs.writeFileSync(mp3Path, made.buf); }
    catch (e) { console.log("WRITE FAILED:", s.slug, e.code || e.message, "— retry next run"); continue; }

    let timings = null;
    try {
      const al = await postJson(`${BACKEND}/align`, { audioB64: made.buf.toString("base64"), lyrics: made.data.lyrics });
      const aj = await al.json();
      if (Array.isArray(aj.lineTimings) && aj.lineTimings.length) timings = aj.lineTimings;
    } catch {}

    const entry = { slug: s.slug, artistFeel: PROVIDER === "elevenlabs" ? null : s.artistFeel || null, beat: s.beat || null, data: made.data, timings };
    fs.writeFileSync(cachePath, JSON.stringify(entry));
    addUsed(made.data.subject, made.data.vocab);
    entries.push(entry);
    writeCatalog();
    console.log(`OK — "${made.data.title}" ${timings ? `(${timings.length} timings)` : "(free karaoke estimate)"}`);
  }

  if (!entries.length) { console.error("No songs built."); process.exit(1); }
  writeCatalog();
  console.log(`\n✅ Wrote ${entries.length} song(s) to ${OUT_TS} [provider: ${PROVIDER}]`);

  function writeCatalog() {
    if (!entries.length) return;
    const nameOf = (slug) => (songs.find((x) => x.slug === slug) || {}).name;
    const imports = entries.map((e) => `import ${camel(e.slug)} from "../../assets/catalog/${e.slug}.mp3";`).join("\n");
    const items = entries
      .map((e, i) => {
        const d = e.data;
        return `  {
    id: ${J("cat-" + e.slug)},
    title: ${J(nameOf(e.slug) || d.title)},
    subject: ${J(d.subject)},
    subjectLabel: ${J(d.subjectLabel)},
    level: ${J(d.level)},
    lesson: ${d.lesson || 1},
    totalLessons: ${d.totalLessons || 100},
    genre: ${J(d.genre)},
    beat: ${J(e.beat)},
    artistFeel: ${J(e.artistFeel)},
    language: "Spanish",
    lyrics: ${J(d.lyrics)},
    vocab: ${JSON.stringify(d.vocab)},
    lineTimings: ${e.timings ? JSON.stringify(e.timings) : "undefined"},
    audioUrl: "",
    audioModule: ${camel(e.slug)},
    catalog: true,
    createdAt: ${1750000000000 + i},
    spec: { subject: ${J(d.subject)}, level: ${J(d.level)}, lesson: ${d.lesson || 1}, genre: ${J(d.genre)}, beat: ${J(e.beat || "")} },
  }`;
      })
      .join(",\n");

    const ts = `// AUTO-GENERATED preloaded catalog. Songs bundled with the app (audio in
// assets/catalog/). Generated once — free forever, no re-gen at runtime.
// Rebuild/extend: edit ritmo-backend/scripts/catalog-list.json, then run
//   node ritmo-backend/scripts/build-catalog.js
import type { Song } from "../lib/api";
${imports}

export const CATALOG: Song[] = [
${items}
];
`;
    fs.writeFileSync(OUT_TS, ts);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
