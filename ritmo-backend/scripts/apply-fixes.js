// Applies Angie's 2nd-pass fixes: genre SWAPS for repeat-offender songs (flagged
// problematic twice) + EDM reduction, and marks fresh-take rerolls. Prints the
// list of caches to delete so those songs regenerate.
const fs = require("fs");
const LIST = __dirname + "/catalog-list.json";
const songs = JSON.parse(fs.readFileSync(LIST, "utf8"));

// oldSlug -> new fields (rename slug when genre-named; keep slug for -lN ones).
const SWAPS = {
  "numbers-latin": { slug: "numbers-pop", genre: "Pop", artistFeel: "Bruno Mars, Justin Timberlake", beat: "Happy Upbeat" },
  "colors-soul": { slug: "colors-disco", genre: "Disco", artistFeel: "Bee Gees", beat: "Groovy Upbeat" },
  "places-reggaeton": { slug: "places-latin", genre: "Latin", artistFeel: "Marc Anthony", beat: "Happy Upbeat" },
  "pronouns-reggaeton": { slug: "pronouns-hiphop", genre: "Hip-Hop", artistFeel: "Drake, J. Cole", beat: "Groovy Normal" },
  "hobbies-rock": { slug: "hobbies-latin", genre: "Latin", artistFeel: "Enrique Iglesias, Ricky Martin", beat: "Happy Upbeat" },
  "emergencies-classicrock": { slug: "emergencies-rap", genre: "Rap", artistFeel: "Eminem", beat: "Groovy Normal" },
  "nature-reggae": { slug: "nature-pop", genre: "Pop", artistFeel: "Ed Sheeran, Coldplay", beat: "Happy Normal" },
  "home-country": { slug: "home-rnb", genre: "R&B", artistFeel: "John Legend, Usher", beat: "Groovy Normal" },
  // EDM reduction (kept slug, new genre):
  "greetings-l9": { genre: "Disco", artistFeel: "Bee Gees, Earth Wind and Fire", beat: "Groovy Upbeat" },
  "colors-l8": { genre: "Latin", artistFeel: "Enrique Iglesias", beat: "Happy Upbeat" },
  "questions-l4": { genre: "Hip-Hop", artistFeel: "Drake", beat: "Groovy Normal" },
};

// First-time flags: regenerate a fresh take of the SAME genre.
const FRESH = ["hobbies-reggaeton", "school-pop", "greetings-l8", "descriptions-l4", "animals-rock", "food-reggaeton", "questions-l5"];

const toDelete = [];
for (const s of songs) {
  if (SWAPS[s.slug]) {
    const sw = SWAPS[s.slug];
    toDelete.push(s.slug); // old file (orphan if renamed, or to regen if same slug)
    if (sw.slug) s.slug = sw.slug;
    s.genre = sw.genre;
    s.artistFeel = sw.artistFeel;
    s.beat = sw.beat;
    delete s.similarSongs;
  }
}
for (const slug of FRESH) toDelete.push(slug);

fs.writeFileSync(LIST, JSON.stringify(songs, null, 2) + "\n");
console.log("swaps applied:", Object.keys(SWAPS).length, "| fresh-takes:", FRESH.length);
console.log("DELETE_CACHES:" + toDelete.join(" "));
