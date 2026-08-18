// Generates an ElevenLabs "First Words: Verbs" song that features HABLAR so Angie
// can test that word's pronunciation. Injects it into catalog.ts.
const fs = require("fs");
const path = require("path");
const CATALOG_DIR = "C:/Users/luism/Ritmo/RitmoApp/assets/catalog";
const OUT_TS = "C:/Users/luism/Ritmo/RitmoApp/src/data/catalog.ts";
const SLUG = "verbs-hablar-el";

let KEY = "";
for (const line of fs.readFileSync("C:/Users/luism/Ritmo/ritmo-backend/.env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.*)\s*$/);
  if (m) KEY = m[1].replace(/^["']|["']$/g, "").trim();
}

const vocab = [
  { es: "hablar", en: "to speak" },
  { es: "comer", en: "to eat" },
  { es: "beber", en: "to drink" },
  { es: "escribir", en: "to write" },
  { es: "leer", en: "to read" },
  { es: "vivir", en: "to live" },
];
const lyrics = [
  "[Intro]", "Let's go!",
  "[Verse]", "to speak", "hablar", "hablar", "to eat", "comer", "comer", "Nice work!",
  "[Chorus]", "to speak", "hablar", "to eat", "comer", "to drink", "beber",
  "[Verse]", "to drink", "beber", "beber", "to write", "escribir", "escribir", "Here we go",
  "[Chorus]", "to speak", "hablar", "to eat", "comer", "to drink", "beber",
  "[Verse]", "to read", "leer", "leer", "to live", "vivir", "vivir", "Say it again",
  "[Bridge]", "to speak", "hablar", "to eat", "comer", "to drink", "beber", "to write", "escribir", "to read", "leer", "to live", "vivir",
  "[Chorus]", "to speak", "hablar", "to eat", "comer", "to drink", "beber",
  "[Outro]", "Easy now",
].join("\n");

function toChunks(text, genre) {
  const blocks = [];
  let cur = null;
  for (const raw of text.split("\n")) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("[")) { cur = { name: t, lines: [] }; blocks.push(cur); }
    else if (cur) cur.lines.push(t);
  }
  const pos = [genre, "catchy melodic", "Spanish-language vocals", "clear correct native Spanish pronunciation and accent", "real instruments"];
  return blocks.filter((b) => b.lines.length).map((b) => ({
    text: `${b.name}\n${b.lines.join("\n")}`,
    duration_ms: Math.max(4000, b.lines.length * 2200),
    positive_styles: pos,
    negative_styles: ["muffled or slurred vocals", "English-accented Spanish"],
    context_adherence: "high",
  }));
}

const camel = (s) => s.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
const J = (v) => JSON.stringify(v === undefined ? null : v);

(async () => {
  process.stdout.write("ElevenLabs verbs (hablar) song... ");
  const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ composition_plan: { chunks: toChunks(lyrics, "Pop") }, model_id: "music_v2" }),
  });
  if (!res.ok) { console.log("FAILED", res.status, (await res.text()).slice(0, 220)); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(CATALOG_DIR, `${SLUG}.mp3`), buf);
  console.log(`OK — ${buf.length} bytes`);

  let ts = fs.readFileSync(OUT_TS, "utf8");
  if (!ts.includes(`${camel(SLUG)} from`)) {
    ts = ts.replace(/(import type \{ Song \} from "\.\.\/lib\/api";\n)/, `$1import ${camel(SLUG)} from "../../assets/catalog/${SLUG}.mp3";\n`);
    const entry = `  {
    id: "cat-${SLUG}",
    title: "Verbs — hablar test (ElevenLabs)",
    subject: "verbs",
    subjectLabel: "Common Verbs",
    level: "prestarter",
    lesson: 1,
    totalLessons: 100,
    genre: "Pop",
    beat: null,
    artistFeel: null,
    language: "Spanish",
    lyrics: ${J(lyrics)},
    vocab: ${JSON.stringify(vocab)},
    lineTimings: undefined,
    audioUrl: "",
    audioModule: ${camel(SLUG)},
    catalog: true,
    createdAt: 1761000000000,
    spec: { subject: "verbs", level: "prestarter", lesson: 1, genre: "Pop", beat: "" },
  },\n`;
    ts = ts.replace(/(export const CATALOG: Song\[\] = \[\n)/, `$1${entry}`);
    fs.writeFileSync(OUT_TS, ts);
    console.log("✅ Injected into catalog.ts");
  } else {
    console.log("already in catalog.ts");
  }
})().catch((e) => console.error("THREW:", e.message));
