// Appends the NEXT 2 lessons for every topic to catalog-list.json, following
// Angie's rules: mostly male (some duets incl. mm/ff, few raspy females), no
// banned/weak genres (Cumbia/Gospel/Acoustic/Alternative), Soul left out (already
// used sparingly), no genre repeated within a topic, artist matched to genre.
const fs = require("fs");
const LIST = __dirname + "/catalog-list.json";
const songs = JSON.parse(fs.readFileSync(LIST, "utf8"));

// Per-topic lesson caps (mirror RitmoApp/src/data/presets.ts PRESTARTER_LESSONS).
const CAP = {
  food: 16, animals: 16, verbs: 16, greetings: 12, body: 12, home: 12, cooking: 12,
  vacation: 12, descriptions: 12, family: 10, days: 10, feelings: 10, clothing: 10,
  shopping: 10, jobs: 10, school: 10, hobbies: 10, transportation: 10, places: 10,
  nature: 10, colors: 8, weather: 8, directions: 8, pronouns: 8, questions: 8,
  technology: 8, emergencies: 8, numbers: 6, time: 6,
};
const SUBJECTS = [
  "greetings","pronouns","numbers","colors","descriptions","questions","family","feelings",
  "food","cooking","animals","body","clothing","home","weather","days","time","directions",
  "transportation","places","shopping","jobs","school","technology","hobbies","nature",
  "emergencies","verbs","vacation",
];

// No EDM (she rerolled all of them / overused), no Soul (sparingly), no banned
// (Cumbia/Gospel/Acoustic/Children's). Includes 80s & 90s throwback styles.
const GOOD = ["Reggaeton","Pop","Rock","Hip-Hop","Latin","Country","R&B","Disco","Classic Rock","Rap","Salsa","Bachata","Blues","Reggae","Jazz","80s Synthpop","80s New Wave","80s Rock","90s Grunge","90s Hip-Hop","90s R&B","90s Dance","90s Pop"];
const ARTISTS = {
  Reggaeton: ["Bad Bunny","Daddy Yankee","J Balvin","Ozuna","Don Omar"],
  Pop: ["Bruno Mars","Justin Timberlake","The Weeknd","Harry Styles","Shawn Mendes","Ed Sheeran"],
  Rock: ["Foo Fighters","Green Day","Kings of Leon","The Killers","Bon Jovi"],
  "Hip-Hop": ["Drake","J. Cole","Post Malone","Kendrick Lamar"],
  Latin: ["Marc Anthony","Enrique Iglesias","Ricky Martin","Luis Fonsi"],
  Country: ["Chris Stapleton","Luke Combs","Morgan Wallen","Zach Bryan","Jelly Roll"],
  "R&B": ["Usher","John Legend","Chris Brown","Ne-Yo"],
  Disco: ["Bee Gees","Donna Summer","Earth Wind and Fire"],
  "Classic Rock": ["Creedence Clearwater Revival","Tom Petty","Queen"],
  Rap: ["Snoop Dogg","Eminem","50 Cent"],
  Salsa: ["Marc Anthony","Gilberto Santa Rosa"],
  Bachata: ["Romeo Santos","Prince Royce"],
  Blues: ["B.B. King","Eric Clapton","John Mayer"],
  Reggae: ["Bob Marley","Peter Tosh"],
  Jazz: ["Michael Bublé","Frank Sinatra","Nat King Cole"],
  "80s Synthpop": ["Depeche Mode","a-ha","Duran Duran"],
  "80s New Wave": ["The Cure","Tears for Fears","Talking Heads"],
  "80s Rock": ["Bon Jovi","Journey","Def Leppard"],
  "90s Grunge": ["Nirvana","Pearl Jam","Soundgarden"],
  "90s Hip-Hop": ["A Tribe Called Quest","Nas","Wu-Tang Clan"],
  "90s R&B": ["Boyz II Men","TLC","Mariah Carey"],
  "90s Dance": ["Real McCoy","Corona","La Bouche"],
  "90s Pop": ["Backstreet Boys","Ace of Base","Spice Girls"],
};
const BEAT = {
  Reggaeton: "Tropical Normal", Pop: "Happy Upbeat", Rock: "Powerful Upbeat", "Hip-Hop": "Groovy Normal",
  Latin: "Happy Upbeat", Country: "Happy Normal", "R&B": "Groovy Normal", Disco: "Groovy Upbeat",
  "Classic Rock": "Powerful Upbeat", Rap: "Groovy Normal", Salsa: "Happy Upbeat",
  Bachata: "Romantic Normal", Blues: "Groovy Normal", Reggae: "Chill Normal", Jazz: "Groovy Normal",
  "80s Synthpop": "Happy Upbeat", "80s New Wave": "Happy Upbeat", "80s Rock": "Powerful Upbeat",
  "90s Grunge": "Powerful Upbeat", "90s Hip-Hop": "Groovy Normal", "90s R&B": "Groovy Normal",
  "90s Dance": "Party Upbeat", "90s Pop": "Happy Upbeat",
};
// Genres that suit a raspy female lead (used when the voice roll says female).
const FEMALE_OK = new Set(["Country","Pop","Blues","Latin","R&B","Disco","90s R&B","90s Pop","90s Dance","80s Synthpop"]);

const usedGenres = {};
const maxLesson = {};
for (const s of songs) {
  (usedGenres[s.subject] ||= new Set()).add(s.genre);
  maxLesson[s.subject] = Math.max(maxLesson[s.subject] || 0, s.lesson || 0);
}

const additions = [];
let c = 0; // global counter for voice distribution
SUBJECTS.forEach((subject, si) => {
  const cap = CAP[subject] || 8;
  const start = (maxLesson[subject] || 0) + 1;
  for (let k = 0; k < 2; k++) {
    const lesson = start + k;
    if (lesson > cap) continue; // respect the cap (e.g. numbers=6)
    const used = usedGenres[subject] || new Set();
    let pool = GOOD.filter((g) => !used.has(g));
    if (!pool.length) pool = GOOD.slice();
    const genre = pool[(si + k) % pool.length];
    used.add(genre);
    usedGenres[subject] = used;
    const arts = ARTISTS[genre];
    const artistFeel = arts[(si + k) % arts.length];
    // Voice: mostly male, sprinkle of duets and raspy females.
    let voice = "male";
    if (c % 23 === 10) voice = "duet-m";
    else if (c % 29 === 14) voice = "duet-f";
    else if (c % 7 === 3) voice = "duet";
    else if (c % 11 === 5) voice = "female";
    if ((voice === "female" || voice === "duet-f") && !FEMALE_OK.has(genre)) voice = "male";
    c++;
    additions.push({
      slug: `${subject}-l${lesson}`,
      subject, level: "prestarter", lesson,
      genre, beat: BEAT[genre] || "Happy Normal", artistFeel, voice,
      language: "Spanish", order: "en-es",
    });
  }
});

// Append as one-line entries before the closing ].
let text = fs.readFileSync(LIST, "utf8").trimEnd();
text = text.replace(/\]\s*$/, "").trimEnd();
if (!text.endsWith(",")) text += ",";
const lines = additions.map((a) => "  " + JSON.stringify(a));
fs.writeFileSync(LIST, text + "\n\n" + lines.join(",\n") + "\n]\n");

const vc = {};
additions.forEach((a) => (vc[a.voice] = (vc[a.voice] || 0) + 1));
console.log(`Added ${additions.length} songs. Voices:`, JSON.stringify(vc));
const gc = {};
additions.forEach((a) => (gc[a.genre] = (gc[a.genre] || 0) + 1));
console.log("Genres:", JSON.stringify(gc));
