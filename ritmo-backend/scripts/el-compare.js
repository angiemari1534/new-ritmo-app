// Generates ElevenLabs-Music versions of a few existing catalog songs (same
// lyrics) so we can compare Spanish pronunciation vs MiniMax. Saves <slug>-el.mp3
// into assets/catalog and prints the catalog entries to paste into catalog.ts.
const fs = require("fs");
const path = require("path");

const CATALOG_DIR = "C:/Users/luism/Ritmo/RitmoApp/assets/catalog";
const SLUGS = ["greetings-rap", "colors-rnb", "numbers-country"]; // 3 genres/topics

let KEY = "";
for (const line of fs.readFileSync("C:/Users/luism/Ritmo/ritmo-backend/.env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.*)\s*$/);
  if (m) KEY = m[1].replace(/^["']|["']$/g, "").trim();
}

// Turn our "[Section]\nline\nline..." lyrics into an ElevenLabs composition_plan
// (chunks format for model music_v2). One chunk per section; context_adherence
// "high" so it sings our EXACT words.
function toPlan(lyrics, genre, artistFeel) {
  const blocks = [];
  let cur = null;
  for (const raw of lyrics.split("\n")) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("[")) {
      cur = { name: t, lines: [] };
      blocks.push(cur);
    } else if (cur) {
      cur.lines.push(t);
    }
  }
  // NOTE: ElevenLabs ToS forbids naming real artists, so we do NOT pass artistFeel.
  const pos = [genre, "catchy melodic", "Spanish-language vocals", "clear correct native Spanish pronunciation and accent", "real instruments"];
  const chunks = blocks
    .filter((b) => b.lines.length)
    .map((b) => ({
      text: `${b.name}\n${b.lines.join("\n")}`,
      duration_ms: Math.max(4000, b.lines.length * 2200),
      positive_styles: pos,
      negative_styles: ["muffled or slurred vocals", "English-accented Spanish"],
      context_adherence: "high",
    }));
  return { composition_plan: { chunks }, model_id: "music_v2" };
}

const camel = (s) => s.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
const J = (v) => JSON.stringify(v === undefined ? null : v);
const OUT_TS = "C:/Users/luism/Ritmo/RitmoApp/src/data/catalog.ts";

(async () => {
  const made = [];
  for (const slug of SLUGS) {
    const cache = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, `${slug}.json`), "utf8"));
    const d = cache.data;
    if (fs.existsSync(path.join(CATALOG_DIR, `${slug}-el.mp3`))) {
      made.push({ slug, d });
      console.log(`ElevenLabs: ${slug} — reusing existing audio`);
      continue;
    }
    process.stdout.write(`ElevenLabs: ${slug} (${d.genre})... `);
    const plan = toPlan(d.lyrics, d.genre, cache.artistFeel);
    const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!res.ok) { console.log("FAILED", res.status, (await res.text()).slice(0, 200)); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(CATALOG_DIR, `${slug}-el.mp3`), buf);
    made.push({ slug, d });
    console.log(`OK — ${buf.length} bytes -> ${slug}-el.mp3`);
  }
  if (!made.length) return;

  // Inject the EL comparison songs into catalog.ts (extra entries, no timings so
  // the app uses the free karaoke estimate). Re-running the normal build removes them.
  let ts = fs.readFileSync(OUT_TS, "utf8");
  const importLines = made.map((m) => `import ${camel(m.slug)}El from "../../assets/catalog/${m.slug}-el.mp3";`).join("\n");
  ts = ts.replace(/(import type \{ Song \} from "\.\.\/lib\/api";\n)/, `$1${importLines}\n`);
  const entries = made
    .map((m, i) => {
      const d = m.d;
      return `  {
    id: ${J("cat-" + m.slug + "-el")},
    title: ${J((d.title || m.slug) + " (ElevenLabs)")},
    subject: ${J(d.subject)},
    subjectLabel: ${J(d.subjectLabel)},
    level: ${J(d.level)},
    lesson: ${d.lesson || 1},
    totalLessons: ${d.totalLessons || 100},
    genre: ${J(d.genre)},
    beat: null,
    artistFeel: null,
    language: "Spanish",
    lyrics: ${J(d.lyrics)},
    vocab: ${JSON.stringify(d.vocab)},
    lineTimings: undefined,
    audioUrl: "",
    audioModule: ${camel(m.slug)}El,
    catalog: true,
    createdAt: ${1760000000000 + i},
    spec: { subject: ${J(d.subject)}, level: ${J(d.level)}, lesson: ${d.lesson || 1}, genre: ${J(d.genre)}, beat: "" },
  },\n`;
    })
    .join("");
  ts = ts.replace(/(export const CATALOG: Song\[\] = \[\n)/, `$1${entries}`);
  fs.writeFileSync(OUT_TS, ts);
  console.log(`\n✅ Injected ${made.length} ElevenLabs comparison songs into catalog.ts`);
})().catch((e) => console.error("THREW:", e.message));
