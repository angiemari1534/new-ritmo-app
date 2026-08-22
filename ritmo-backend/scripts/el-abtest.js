// Standalone A/B test: regenerate a few songs on ElevenLabs Music with an IMPROVED
// recipe (genre character w/o artist names, per-song tempo, gritty rock allowed),
// so Angie can compare pronunciation vs the current fal versions. Writes ONLY to
// an output folder — never touches the live catalog.
const fs = require("fs");
const path = require("path");

const OUT = process.env.OUT || path.join(__dirname, "_eltest");
const CATALOG = path.join(__dirname, "../../RitmoApp/assets/catalog");
const EL_MUSIC_URL = "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128";

let EL_KEY = "";
for (const line of fs.readFileSync(path.join(__dirname, "../.env"), "utf8").split("\n")) {
  const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.*)\s*$/);
  if (m) EL_KEY = m[1].replace(/^["']|["']$/g, "").trim();
}

const { GENRE_STYLE } = require("../lib/minimax");
// Override only the genres whose GENRE_STYLE names real artists (ElevenLabs ToS
// forbids names). Everything else uses GENRE_STYLE (no names) directly.
const EL_STYLE = {
  Country: "authentic outlaw Americana country, real fiddle banjo and pedal-steel, warm acoustic and twangy electric guitar, raw soulful vocals with a genuine country twang and drawl, organic rootsy groove, not pop",
  Rock: "raw alternative and grunge rock, gritty distorted electric guitar, real live drums and driving bass, raw emotive vocals with an edge, garage-band energy",
};
const isRock = (g) => g === "Rock" || g === "Classic Rock" || g === "Alternative";

// Per-song tempo from the beat's last word.
const BPM = { Slow: 80, Normal: 100, Upbeat: 120, Fast: 132 };
function tempoOf(beat) {
  const t = String(beat || "").trim().split(/\s+/).pop();
  const bpm = BPM[t] || 100;
  return `steady ${bpm} BPM ${t === "Slow" ? "relaxed" : t === "Fast" || t === "Upbeat" ? "upbeat energetic" : "medium"} tempo, natural and singable`;
}

function chunks(lyrics, genre, beat) {
  const blocks = [];
  let cur = null;
  for (const raw of lyrics.split("\n")) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("[")) { cur = { name: t, lines: [] }; blocks.push(cur); }
    else if (cur) cur.lines.push(t);
  }
  const style = EL_STYLE[genre] || GENRE_STYLE[genre] || (genre ? `${genre} music` : "catchy melodic song");
  const pos = [
    style,
    "Spanish-language vocals",
    "clear, correct, fully enunciated native Latin-American Spanish pronunciation and accent",
    "lead vocals mixed loud and clear right out in front, every word easy to hear",
    "soft, controlled backing music that never covers the voice",
    tempoOf(beat),
  ];
  // Keep pronunciation-critical negatives always; only ban distortion for NON-rock.
  const neg = [
    "muffled, mumbled or slurred vocals",
    "English-accented Spanish",
    "instruments louder than the singing",
    "screamed or shouted vocals",
    "too slow and draggy, or too fast and rushed",
  ];
  if (!isRock(genre)) neg.push("heavy distortion, aggressive wall of sound");
  return blocks.filter((b) => b.lines.length).map((b) => ({
    text: `${b.name}\n${b.lines.join("\n")}`,
    duration_ms: Math.max(4000, b.lines.length * 2200),
    positive_styles: pos,
    negative_styles: neg,
    context_adherence: "high",
  }));
}

async function main() {
  const slugs = (process.env.SLUGS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!EL_KEY) { console.error("No ELEVENLABS_API_KEY"); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, "catalog-list.json"), "utf8"));
  for (const slug of slugs) {
    const cache = path.join(CATALOG, slug + ".json");
    if (!fs.existsSync(cache)) { console.log(slug + ": no cached lyrics, skip"); continue; }
    const j = JSON.parse(fs.readFileSync(cache, "utf8"));
    const meta = list.find((x) => x.slug === slug) || {};
    const genre = j.data.genre, beat = meta.beat || j.beat;
    process.stdout.write(`ElevenLabs ${slug} (${genre}, ${beat})... `);
    let res;
    try {
      res = await fetch(EL_MUSIC_URL, {
        method: "POST",
        headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ composition_plan: { chunks: chunks(j.data.lyrics, genre, beat) }, model_id: "music_v2" }),
      });
    } catch (e) { console.log("FETCH ERROR:", e.message); continue; }
    if (!res.ok) { console.log("HTTP", res.status, (await res.text()).slice(0, 200)); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(OUT, `${slug}__ELEVENLABS.mp3`), buf);
    // copy the current fal version next to it for A/B
    if (fs.existsSync(path.join(CATALOG, slug + ".mp3"))) fs.copyFileSync(path.join(CATALOG, slug + ".mp3"), path.join(OUT, `${slug}__fal.mp3`));
    console.log("OK", (buf.length / 1024).toFixed(0) + "KB");
  }
  console.log("Done -> " + OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
