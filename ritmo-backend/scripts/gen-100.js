// Generate 100 NEW Beginner-tier song specs across all subjects, weighted to
// Angie's genres (no Pop/Soul/Salsa/Reggae/Jazz), chill+upbeat mix, deep voices.
// Appends to catalog-list.json. vary-voices.js then fills artist/arrangement.
const fs = require("fs");
const LIST = "scripts/catalog-list.json";
const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
const existing = new Set(list.map((s) => s.slug));

// subjects in catalog order, with a display name pulled from an existing song.
const subjects = [...new Set(list.map((s) => s.subject))];
const nameFor = {};
for (const s of list) if (!nameFor[s.subject]) nameFor[s.subject] = s.name;

// Genre pool, weighted to her taste. NO Pop/Soul/Salsa/Reggae/Jazz.
const W = {
  Country: 5, Rock: 4, Reggaeton: 4, Bachata: 4, Latin: 3, "Hip-Hop": 3, "R&B": 3,
  "Classic Rock": 2, Disco: 2, "90s": 2, "80s": 2, Blues: 2, Alternative: 2, EDM: 1,
};
const genreSeq = [];
for (const [g, w] of Object.entries(W)) for (let i = 0; i < w; i++) genreSeq.push(g);

// Beat by genre feel: some genres lean upbeat, some chill; keep a real mix.
const UP = ["Happy Upbeat", "Dance Upbeat", "Party Upbeat", "Energetic Normal", "Groovy Upbeat", "Uplifting Upbeat", "Confident Normal"];
const CHILL = ["Chill Normal", "Calm Normal", "Romantic Slow", "Dreamy Normal", "Chill Slow"];
const upLean = new Set(["Reggaeton", "EDM", "Disco", "90s", "Hip-Hop"]);
const chillLean = new Set(["Bachata", "Blues"]);
function beatFor(genre, i) {
  if (chillLean.has(genre)) return i % 3 === 0 ? UP[i % UP.length] : CHILL[i % CHILL.length];
  if (upLean.has(genre)) return i % 4 === 0 ? CHILL[i % CHILL.length] : UP[i % UP.length];
  return i % 3 === 0 ? CHILL[i % CHILL.length] : UP[i % UP.length]; // balanced ~1/3 chill
}
const voices = ["male", "female", "duet", "male", "female", "duet-m", "duet-f", "male", "female", "duet"];

// Distribution: 3 beginner lessons per subject (87), +1 more to 13 richer topics = 100.
const extra = new Set(["greetings", "numbers", "colors", "food", "family", "verbs", "questions", "descriptions", "feelings", "body", "home", "time", "days"]);

const added = [];
let gi = 0, vi = 0;
for (const subj of subjects) {
  const n = 3 + (extra.has(subj) ? 1 : 0);
  for (let l = 1; l <= n; l++) {
    let slug = `${subj}-beginner-l${l}`;
    while (existing.has(slug)) slug = slug + "x";
    existing.add(slug);
    const genre = genreSeq[gi % genreSeq.length]; gi++;
    const voice = voices[vi % voices.length]; vi++;
    added.push({
      slug, name: nameFor[subj] || subj, subject: subj, level: "beginner", lesson: l,
      genre, beat: beatFor(genre, gi), voice, language: "Spanish", order: "en-es",
      artistFeel: null, similarSongs: null, arrangement: null,
    });
  }
}
// trim/expand to exactly 100
const final = added.slice(0, 100);
console.log("generating", final.length, "new beginner songs");
const gc = {}; for (const s of final) gc[s.genre] = (gc[s.genre] || 0) + 1;
console.log("genre spread:", Object.entries(gc).sort((a,b)=>b[1]-a[1]).map(([k,v]) => k+":"+v).join(", "));
const bc = { upbeat: 0, chill: 0 };
for (const s of final) (/(Slow|Chill|Calm|Romantic|Dreamy)/.test(s.beat) ? bc.chill++ : bc.upbeat++);
console.log("tempo mix: upbeat", bc.upbeat, "| chill", bc.chill);
fs.writeFileSync(LIST, JSON.stringify(list.concat(final), null, 2) + "\n");
console.log("appended -> catalog-list.json now", list.length + final.length, "songs");
