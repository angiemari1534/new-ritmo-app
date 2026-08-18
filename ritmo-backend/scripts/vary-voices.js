// Give each catalog song a DIFFERENT artist/song reference within its genre so
// voices vary (from Angie's repository). Rotates a gender-matched pool per genre
// so consecutive same-genre songs don't sound alike. [artist, song, gender].
const fs = require("fs");
const LIST = __dirname + "/catalog-list.json";
const songs = JSON.parse(fs.readFileSync(LIST, "utf8"));

const P = {
  Pop: [["Bruno Mars","Uptown Funk","m"],["The Weeknd","Blinding Lights","m"],["Harry Styles","As It Was","m"],["Ed Sheeran","Shape of You","m"],["Justin Timberlake","Can't Stop the Feeling","m"],["Dua Lipa","Levitating","f"],["Ariana Grande","7 Rings","f"],["Katy Perry","Firework","f"],["Olivia Rodrigo","Good 4 U","f"]],
  Rock: [["Queen","Bohemian Rhapsody","m"],["The Killers","Mr. Brightside","m"],["Foo Fighters","Everlong","m"],["Green Day","Boulevard of Broken Dreams","m"],["Kings of Leon","Use Somebody","m"],["Paramore","Still Into You","f"]],
  "Classic Rock": [["Eagles","Hotel California","m"],["Journey","Don't Stop Believin","m"],["Creedence Clearwater Revival","Have You Ever Seen the Rain","m"],["Tom Petty","Free Fallin","m"],["Fleetwood Mac","Dreams","f"],["Heart","Barracuda","f"]],
  Country: [["Chris Stapleton","Tennessee Whiskey","m"],["Morgan Wallen","Last Night","m"],["Luke Combs","Beautiful Crazy","m"],["Zach Bryan","Something in the Orange","m"],["Jelly Roll","Save Me","m"],["Dolly Parton","Jolene","f"],["Carrie Underwood","Before He Cheats","f"],["Lainey Wilson","Heart Like a Truck","f"],["Shania Twain","Man I Feel Like a Woman","f"]],
  "Hip-Hop": [["Drake","God's Plan","m"],["Kendrick Lamar","HUMBLE","m"],["Travis Scott","Sicko Mode","m"],["J. Cole","No Role Modelz","m"],["Post Malone","Circles","m"],["Doja Cat","Say So","f"],["Nicki Minaj","Super Bass","f"]],
  Rap: [["Eminem","Lose Yourself","m"],["Snoop Dogg","Drop It Like It's Hot","m"],["50 Cent","In Da Club","m"],["Jay-Z","99 Problems","m"],["Cardi B","Bodak Yellow","f"],["Megan Thee Stallion","Savage","f"]],
  "R&B": [["Usher","Yeah","m"],["John Legend","All of Me","m"],["Chris Brown","No Guidance","m"],["Alicia Keys","No One","f"],["SZA","Snooze","f"],["H.E.R.","Damage","f"]],
  Soul: [["Stevie Wonder","Superstition","m"],["Marvin Gaye","What's Going On","m"],["Al Green","Let's Stay Together","m"],["Teddy Swims","Lose Control","m"],["Aretha Franklin","Respect","f"],["Etta James","At Last","f"]],
  Latin: [["Marc Anthony","Vivir Mi Vida","m"],["Enrique Iglesias","Bailando","m"],["Ricky Martin","Livin la Vida Loca","m"],["Luis Fonsi","Despacito","m"],["Shakira","Hips Don't Lie","f"],["Gloria Estefan","Conga","f"]],
  Reggaeton: [["Bad Bunny","Titi Me Pregunto","m"],["Daddy Yankee","Gasolina","m"],["J Balvin","Mi Gente","m"],["Ozuna","Taki Taki","m"],["Karol G","Provenza","f"],["Anitta","Envolver","f"]],
  EDM: [["Avicii","Wake Me Up","m"],["David Guetta","Titanium","m"],["Calvin Harris","Summer","m"],["The Chainsmokers","Closer","m"],["Zedd","Clarity","m"],["Sia","Chandelier","f"]],
  Disco: [["Bee Gees","Stayin Alive","m"],["Earth Wind and Fire","September","m"],["Chic","Le Freak","m"],["Donna Summer","Hot Stuff","f"],["Gloria Gaynor","I Will Survive","f"],["ABBA","Dancing Queen","f"]],
  Salsa: [["Marc Anthony","Vivir Mi Vida","m"],["Gilberto Santa Rosa","Conteo Regresivo","m"],["Hector Lavoe","El Cantante","m"],["Celia Cruz","La Vida Es Un Carnaval","f"]],
  Bachata: [["Romeo Santos","Propuesta Indecente","m"],["Prince Royce","Darte un Beso","m"],["Aventura","Obsesion","m"]],
  Blues: [["B.B. King","The Thrill Is Gone","m"],["Stevie Ray Vaughan","Pride and Joy","m"],["Eric Clapton","Tears in Heaven","m"],["Etta James","At Last","f"],["Bonnie Raitt","Something to Talk About","f"]],
  Reggae: [["Bob Marley","Three Little Birds","m"],["Sean Paul","Temperature","m"],["Shaggy","It Wasn't Me","m"],["Jimmy Cliff","I Can See Clearly Now","m"]],
  Jazz: [["Frank Sinatra","Fly Me to the Moon","m"],["Louis Armstrong","What a Wonderful World","m"],["Nat King Cole","L-O-V-E","m"],["Nina Simone","Feeling Good","f"],["Ella Fitzgerald","Summertime","f"],["Norah Jones","Don't Know Why","f"]],
  Alternative: [["Arctic Monkeys","Do I Wanna Know","m"],["The Neighbourhood","Sweater Weather","m"],["Glass Animals","Heat Waves","m"],["Hozier","Take Me to Church","m"],["Lana Del Rey","Summertime Sadness","f"],["Florence and the Machine","Dog Days Are Over","f"]],
  "80s Synthpop": [["a-ha","Take on Me","m"],["Depeche Mode","Enjoy the Silence","m"],["Duran Duran","Hungry Like the Wolf","m"],["Eurythmics","Sweet Dreams","f"]],
  "80s New Wave": [["The Police","Every Breath You Take","m"],["Tears for Fears","Everybody Wants to Rule the World","m"],["Soft Cell","Tainted Love","m"],["Blondie","Call Me","f"]],
  "80s Rock": [["Bon Jovi","Livin on a Prayer","m"],["Journey","Don't Stop Believin","m"],["Def Leppard","Pour Some Sugar on Me","m"],["Pat Benatar","Hit Me with Your Best Shot","f"]],
  "90s Grunge": [["Nirvana","Smells Like Teen Spirit","m"],["Pearl Jam","Alive","m"],["Soundgarden","Black Hole Sun","m"],["The Cranberries","Zombie","f"]],
  "90s Hip-Hop": [["The Notorious B.I.G.","Juicy","m"],["Tupac","California Love","m"],["Ice Cube","It Was a Good Day","m"],["Lauryn Hill","Doo Wop","f"]],
  "90s R&B": [["Boyz II Men","End of the Road","m"],["TLC","No Scrubs","f"],["Mariah Carey","Fantasy","f"],["Destiny's Child","Say My Name","f"]],
  "90s Dance": [["Eiffel 65","Blue","m"],["Vengaboys","We Like to Party","m"],["Aqua","Barbie Girl","f"],["Real McCoy","Another Night","f"]],
  "90s Pop": [["Backstreet Boys","I Want It That Way","m"],["NSYNC","Bye Bye Bye","m"],["Britney Spears","Baby One More Time","f"],["Spice Girls","Wannabe","f"]],
  "80s": [["a-ha","Take on Me","m"],["Michael Jackson","Billie Jean","m"],["Bon Jovi","Livin on a Prayer","m"],["Prince","When Doves Cry","m"],["Madonna","Like a Prayer","f"],["Cyndi Lauper","Girls Just Want to Have Fun","f"],["Whitney Houston","I Wanna Dance with Somebody","f"],["Eurythmics","Sweet Dreams","f"]],
  "90s": [["Backstreet Boys","I Want It That Way","m"],["NSYNC","Bye Bye Bye","m"],["Nirvana","Smells Like Teen Spirit","m"],["Will Smith","Gettin Jiggy wit It","m"],["Britney Spears","Baby One More Time","f"],["Spice Girls","Wannabe","f"],["Mariah Carey","Fantasy","f"],["TLC","Waterfalls","f"]],
};

function wantGender(voice) {
  if (voice === "male" || voice === "duet-m") return "m";
  if (voice === "female" || voice === "duet-f") return "f";
  return null; // duet / any → either
}

const counters = {};
let changed = 0;
for (const s of songs) {
  const pool = P[s.genre];
  if (!pool) continue;
  const g = wantGender(s.voice);
  let sub = g ? pool.filter((x) => x[2] === g) : pool;
  if (!sub.length) sub = pool;
  const ck = s.genre + "|" + (g || "x");
  const idx = (counters[ck] = (counters[ck] || 0) + 1) - 1;
  const [artist, song] = sub[idx % sub.length];
  s.artistFeel = artist;
  s.similarSongs = `${song} by ${artist}`;
  changed++;
}
fs.writeFileSync(LIST, JSON.stringify(songs, null, 2) + "\n");
console.log(`varied artist/voice refs on ${changed} songs.`);
