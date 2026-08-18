// Set `similarSongs` on every catalog recipe to real reference hits of its genre
// (from Angie's 1,000-song list) so MiniMax matches the genre's actual sound.
const fs = require("fs");
const LIST = __dirname + "/catalog-list.json";
const songs = JSON.parse(fs.readFileSync(LIST, "utf8"));

const REFS = {
  Pop: "Blinding Lights, Shape of You, As It Was",
  Rock: "Mr. Brightside, Bohemian Rhapsody, Sweet Child o' Mine",
  "Classic Rock": "Hotel California, Don't Stop Believin', Sweet Home Alabama",
  Country: "Tennessee Whiskey, Last Night, Jolene",
  "Hip-Hop": "HUMBLE, Sicko Mode, God's Plan",
  Rap: "Lose Yourself, In Da Club, Gin and Juice",
  "R&B": "All of Me, No One, Snooze",
  Soul: "September, Let's Stay Together, Ain't No Mountain High Enough",
  Latin: "Vivir Mi Vida, Bailando, Hips Don't Lie",
  Reggaeton: "Despacito, Gasolina, Mi Gente, Provenza",
  EDM: "Wake Me Up, Titanium, Closer",
  Disco: "Stayin' Alive, September, I Will Survive",
  Salsa: "Vivir Mi Vida, Conga, La Vida Es Un Carnaval",
  Bachata: "Propuesta Indecente, Obsesión, Darte un Beso",
  Blues: "The Thrill Is Gone, At Last, Pride and Joy",
  Reggae: "Three Little Birds, One Love, It Wasn't Me",
  Jazz: "Fly Me to the Moon, What a Wonderful World, Feeling Good",
  Alternative: "Somebody That I Used to Know, Sweater Weather, Do I Wanna Know",
  "80s Synthpop": "Take on Me, Sweet Dreams, Blue Monday",
  "80s New Wave": "Every Breath You Take, Tainted Love, Enjoy the Silence",
  "80s Rock": "Livin' on a Prayer, Don't Stop Believin', Jump",
  "90s Grunge": "Smells Like Teen Spirit, Come as You Are, Zombie",
  "90s Hip-Hop": "Juicy, California Love, It Was a Good Day",
  "90s R&B": "No Scrubs, End of the Road, Waterfalls",
  "90s Dance": "Barbie Girl, Blue, We Like to Party",
  "90s Pop": "...Baby One More Time, I Want It That Way, Wannabe",
};

let set = 0, skip = 0;
for (const s of songs) {
  const ref = REFS[s.genre];
  if (ref) { s.similarSongs = ref; set++; }
  else skip++;
}
fs.writeFileSync(LIST, JSON.stringify(songs, null, 2) + "\n");
console.log(`similarSongs set on ${set} songs (${skip} genres had no ref map).`);
