// Forced alignment: given the finished song audio + its lyrics, ask ElevenLabs
// for the exact time each word is sung, then roll those up into a start/end
// time for every lyric line. The app uses these to scroll the lyrics in real
// karaoke time. This ONLY reads the audio — it never changes the song.
// Docs: https://elevenlabs.io/docs/api-reference/forced-alignment/create
//   POST https://api.elevenlabs.io/v1/forced-alignment
//   multipart form: file (audio), text (transcript)
//   returns { characters[], words[{text,start,end,loss}], loss }

const { Blob } = require("buffer");

const ALIGN_URL = "https://api.elevenlabs.io/v1/forced-alignment";

// Pull the singable lines out of the lyrics, in order (drop [Verse]/[Chorus]
// tags — those aren't sung). Index i here == the app's singableIndex.
function singableLines(lyrics) {
  return String(lyrics)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("["));
}

// Roll per-word timings up into one {start,end} per lyric line by walking the
// returned words in order and handing each line its share (by word count).
function wordsToLineTimings(lines, words) {
  const counts = lines.map((l) => l.split(/\s+/).filter(Boolean).length || 1);
  const ourTotal = counts.reduce((a, b) => a + b, 0);
  const exact = words.length === ourTotal;

  const timings = new Array(lines.length).fill(null);
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    const remainingLines = lines.length - 1 - i;
    let n;
    if (i === lines.length - 1) {
      n = words.length - idx; // last line takes whatever is left
    } else if (exact) {
      n = counts[i];
    } else {
      // Scale proportionally when the model tokenized differently than we did.
      n = Math.round((counts[i] * words.length) / ourTotal);
      n = Math.max(1, Math.min(n, words.length - idx - remainingLines));
    }
    const slice = words.slice(idx, idx + n);
    idx += n;
    if (slice.length) {
      const loss = slice.reduce((a, w) => a + (w.loss || 0), 0) / slice.length;
      timings[i] = {
        start: Number(slice[0].start) || 0,
        end: Number(slice[slice.length - 1].end) || 0,
        loss,
      };
    }
  }
  return timings;
}

// Returns { timings: ({start,end,loss}|null)[], loss } or null if it can't run.
// Never throws — alignment is a nice-to-have; a failure just means plain lyrics.
async function alignSong(audioBuffer, lyrics) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !audioBuffer) return null;

  const lines = singableLines(lyrics);
  if (lines.length === 0) return null;
  const transcript = lines.join("\n");

  try {
    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "song.mp3");
    form.append("text", transcript);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    let res;
    try {
      res = await fetch(ALIGN_URL, {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: form,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`Forced alignment HTTP ${res.status}: ${t.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const words = Array.isArray(data?.words) ? data.words : [];
    if (words.length === 0) return null;

    return { timings: wordsToLineTimings(lines, words), loss: Number(data?.loss) || 0 };
  } catch (err) {
    console.error("Forced alignment failed:", err.message);
    return null;
  }
}

// Fetch a remote audio URL into a Buffer so we can send it to alignment.
async function fetchAudioBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error("Could not fetch audio for alignment:", err.message);
    return null;
  }
}

module.exports = { alignSong, fetchAudioBuffer, singableLines };
