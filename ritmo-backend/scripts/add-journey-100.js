// Add recipes for the next 100 uncovered journey-map spots (in journey order),
// then vary-voices fills artist/voice/arrangement. Run build-catalog after.
const fs = require("fs");
const LIST = __dirname + "/catalog-list.json";
const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
const cov = new Set(list.map((s) => s.subject + "|" + s.level + "|" + s.lesson));

const SUBJ = ["greetings","pronouns","numbers","colors","descriptions","questions","family","feelings","food","cooking","animals","body","clothing","home","weather","days","time","directions","transportation","places","shopping","jobs","school","technology","hobbies","nature","emergencies","verbs","vacation"];
const PRE = {greetings:12,pronouns:9,numbers:13,colors:10,descriptions:9,questions:9,family:9,feelings:7,food:9,cooking:9,animals:9,body:8,clothing:7,home:8,weather:7,days:9,time:9,directions:8,transportation:9,places:9,shopping:7,jobs:9,school:9,technology:9,hobbies:9,nature:9,emergencies:9,verbs:8,vacation:9};
const PH = {greetings:{starter:14,beginner:22,intermediate:26,advanced:19},pronouns:{starter:12,beginner:18,intermediate:22,advanced:16},numbers:{starter:6,beginner:9,intermediate:11,advanced:8},colors:{starter:7,beginner:10,intermediate:12,advanced:9},descriptions:{starter:11,beginner:16,intermediate:20,advanced:14},questions:{starter:14,beginner:21,intermediate:25,advanced:18},family:{starter:12,beginner:18,intermediate:22,advanced:16},feelings:{starter:12,beginner:18,intermediate:22,advanced:16},food:{starter:14,beginner:21,intermediate:25,advanced:18},cooking:{starter:11,beginner:17,intermediate:21,advanced:15},animals:{starter:9,beginner:14,intermediate:17,advanced:12},body:{starter:10,beginner:15,intermediate:19,advanced:14},clothing:{starter:10,beginner:14,intermediate:18,advanced:13},home:{starter:10,beginner:15,intermediate:19,advanced:14},weather:{starter:7,beginner:11,intermediate:13,advanced:10},days:{starter:7,beginner:11,intermediate:13,advanced:10},time:{starter:7,beginner:11,intermediate:13,advanced:10},directions:{starter:11,beginner:17,intermediate:21,advanced:15},transportation:{starter:11,beginner:16,intermediate:20,advanced:14},places:{starter:11,beginner:16,intermediate:20,advanced:14},shopping:{starter:11,beginner:17,intermediate:21,advanced:15},jobs:{starter:11,beginner:16,intermediate:20,advanced:14},school:{starter:11,beginner:16,intermediate:20,advanced:14},technology:{starter:10,beginner:15,intermediate:19,advanced:14},hobbies:{starter:11,beginner:16,intermediate:20,advanced:14},nature:{starter:10,beginner:15,intermediate:19,advanced:14},emergencies:{starter:10,beginner:14,intermediate:18,advanced:13},verbs:{starter:17,beginner:25,intermediate:30,advanced:22},vacation:{starter:12,beginner:18,intermediate:22,advanced:16}};
const LV = ["prestarter","starter","beginner","intermediate","advanced"];
const need = (lvl, s) => (lvl === "prestarter" ? PRE[s] : PH[s][lvl]);

const LABEL = {greetings:"Greetings & Basics",pronouns:"Pronouns",numbers:"Numbers",colors:"Colors",descriptions:"Descriptions",questions:"Questions",family:"Family",feelings:"Feelings",food:"Food",cooking:"Cooking",animals:"Animals",body:"The Body",clothing:"Clothing",home:"At Home",weather:"Weather",days:"Days & Time",time:"Telling Time",directions:"Getting Around",transportation:"Transportation",places:"Places in Town",shopping:"Shopping & Money",jobs:"Jobs & Work",school:"School",technology:"Technology",hobbies:"Hobbies & Sports",nature:"Nature & Outdoors",emergencies:"Emergencies",verbs:"Common Verbs",vacation:"Vacation & Travel"};

// Varied genres tuned to Angie's tastes; mostly-male voice rotation (men > duet > women).
const GENRES = ["Reggaeton","Pop","Hip-Hop","Country","R&B","Latin","Rock","Soul","Rap","EDM","Bachata","Disco","Alternative","Classic Rock","80s","90s","Salsa","Blues"];
const VOICES = ["male","male","duet","male","female","male","duet-m","male","male","duet","male","female","male","duet-f","male","male"];
const BEATS = ["Energetic Normal","Groovy Upbeat","Chill Normal","Happy Upbeat","Confident Normal","Uplifting Upbeat","Party Upbeat","Romantic Slow","Powerful Normal","Dance Upbeat"];

const uncovered = [];
for (const lvl of LV) for (const s of SUBJ) for (let l = 1; l <= need(lvl, s); l++) {
  if (!cov.has(s + "|" + lvl + "|" + l)) uncovered.push({ subject: s, level: lvl, lesson: l });
}
const next = uncovered.slice(0, 100);

let g = 0, v = 0, b = 0, added = 0;
for (const u of next) {
  const slug = `${u.subject}-${u.level}-l${u.lesson}`;
  if (list.some((x) => x.slug === slug)) continue;
  list.push({
    slug,
    name: LABEL[u.subject] || u.subject,
    subject: u.subject,
    level: u.level,
    lesson: u.lesson,
    genre: GENRES[g++ % GENRES.length],
    beat: BEATS[b++ % BEATS.length],
    artistFeel: "",
    similarSongs: "",
    voice: VOICES[v++ % VOICES.length],
    language: "Spanish",
    order: "en-es",
  });
  added++;
}
fs.writeFileSync(LIST, JSON.stringify(list, null, 2) + "\n");
console.log(`added ${added} recipes; catalog-list now ${list.length}.`);
