// Generate NEW Starter-tier songs for the topics that have none yet, weighted by
// topic breadth. Slow teaching beats (chill-weighted, no Fast/Upbeat), her genres,
// deep voices. The builder's avoidWords keeps every song's vocab NON-repeating.
// Appends to catalog-list.json; vary-voices.js then fills artist/arrangement.
const fs = require("fs");
const LIST = "scripts/catalog-list.json";
const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
const existing = new Set(list.map((s) => s.slug));
const nameFor = {};
for (const s of list) if (!nameFor[s.subject]) nameFor[s.subject] = s.name;

// Topics that already have Starter coverage -> skip. Everything else gets songs.
const SKIP = new Set(["greetings", "pronouns", "numbers", "colors"]);
// Narrower topics get fewer new songs; broad topics get more.
const NARROW = new Set(["days", "weather", "time", "directions", "shopping", "animals"]);
const BROAD_N = 5, MED_N = 4, NARROW_N = 3;
const BROAD = new Set(["food", "verbs", "body", "home", "family", "jobs", "nature", "places", "cooking", "hobbies", "feelings"]);

const subjects = [...new Set(list.map((s) => s.subject))].filter((s) => !SKIP.has(s));

// Genre weighting (her taste, no Pop/Soul/Salsa/Reggae/Jazz).
const W = { Country: 5, Rock: 4, Reggaeton: 4, Bachata: 4, Latin: 3, "Hip-Hop": 3, "R&B": 3, "Classic Rock": 2, Disco: 2, "90s": 2, "80s": 2, Blues: 2, Alternative: 2, EDM: 1 };
const genreSeq = [];
for (const [g, w] of Object.entries(W)) for (let i = 0; i < w; i++) genreSeq.push(g);

// Slow, learner-friendly beats. Chill moods avoid the "energetic" vocal flag.
const CHILL = ["Chill Slow", "Calm Normal", "Romantic Slow", "Dreamy Normal", "Chill Normal", "Calm Slow", "Dreamy Slow"];
const MILD = ["Uplifting Normal", "Happy Normal", "Groovy Normal", "Confident Normal"];
const voices = ["male", "female", "duet", "male", "female", "duet-m", "duet-f", "male", "female", "duet"];

const added = [];
let gi = 0, vi = 0, bi = 0;
for (const subj of subjects) {
  const n = BROAD.has(subj) ? BROAD_N : NARROW.has(subj) ? NARROW_N : MED_N;
  for (let l = 1; l <= n; l++) {
    let slug = `${subj}-starter-l${l}`;
    while (existing.has(slug)) slug += "x";
    existing.add(slug);
    const genre = genreSeq[gi % genreSeq.length]; gi++;
    const mild = (bi % 10) >= 7; bi++;         // ~30% mild, ~70% chill/slow
    const beat = mild ? MILD[bi % MILD.length] : CHILL[bi % CHILL.length];
    added.push({
      slug, name: nameFor[subj] || subj, subject: subj, level: "starter", lesson: l,
      genre, beat, voice: voices[vi++ % voices.length], language: "Spanish", order: "en-es",
      artistFeel: null, similarSongs: null, arrangement: null,
    });
  }
}
console.log("generating", added.length, "new starter songs across", subjects.length, "topics");
const gc = {}; for (const s of added) gc[s.genre] = (gc[s.genre] || 0) + 1;
console.log("genre spread:", Object.entries(gc).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ":" + v).join(", "));
let slow = 0; for (const s of added) if (/(Slow|Chill|Calm|Romantic|Dreamy)/.test(s.beat)) slow++;
console.log("chill/slow:", slow, "| mild-up:", added.length - slow, "| Fast/Upbeat: 0");
if (process.env.WRITE === "1") { fs.writeFileSync(LIST, JSON.stringify(list.concat(added), null, 2) + "\n"); console.log("APPENDED -> catalog-list.json now", list.length + added.length); }
else console.log("(dry run — set WRITE=1 to append)");
