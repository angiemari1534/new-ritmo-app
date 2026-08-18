// Lock (back up) approved catalog songs so rebuilds NEVER overwrite them.
// Usage:  node ritmo-backend/scripts/lock-song.js greetings-reggaeton numbers-hiphop
//         node ritmo-backend/scripts/lock-song.js --list      (show locked songs)
//         node ritmo-backend/scripts/lock-song.js --unlock greetings-reggaeton
// A locked song's mp3 + json are copied into assets/catalog/_locked/. On the next
// build-catalog run, locked songs are restored from there and reused as-is.

const fs = require("fs");
const path = require("path");

const CATALOG_DIR = "C:/Users/luism/Ritmo/RitmoApp/assets/catalog";
const LOCKED_DIR = path.join(CATALOG_DIR, "_locked");
fs.mkdirSync(LOCKED_DIR, { recursive: true });

const args = process.argv.slice(2);

if (args[0] === "--list") {
  const locked = fs.readdirSync(LOCKED_DIR).filter((f) => f.endsWith(".mp3")).map((f) => f.replace(/\.mp3$/, ""));
  console.log(locked.length ? "Locked songs:\n  " + locked.join("\n  ") : "No locked songs yet.");
  process.exit(0);
}

if (args[0] === "--unlock") {
  for (const slug of args.slice(1)) {
    for (const ext of ["mp3", "json"]) {
      const p = path.join(LOCKED_DIR, `${slug}.${ext}`);
      if (fs.existsSync(p)) { fs.unlinkSync(p); console.log("unlocked", slug, ext); }
    }
  }
  process.exit(0);
}

if (!args.length) { console.log("Give one or more slugs to lock, or --list / --unlock <slug>."); process.exit(1); }

for (const slug of args) {
  let ok = true;
  for (const ext of ["mp3", "json"]) {
    const src = path.join(CATALOG_DIR, `${slug}.${ext}`);
    const dst = path.join(LOCKED_DIR, `${slug}.${ext}`);
    if (fs.existsSync(src)) { fs.copyFileSync(src, dst); }
    else { console.log(`MISSING (not locked): ${src}`); ok = false; }
  }
  if (ok) console.log(`🔒 locked ${slug} — future rebuilds will reuse this exact take.`);
}
