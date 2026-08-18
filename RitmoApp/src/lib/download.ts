// Downloads generated songs to the device so they play forever and offline
// (MiniMax's streaming URLs expire, so we can't rely on them long-term).

import * as FileSystem from "expo-file-system/legacy";

const DIR = FileSystem.documentDirectory + "ritmo-songs/";

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

// Download a song's audio to local storage; returns the local file URI.
export async function downloadAudio(id: string, url: string): Promise<string> {
  await ensureDir();
  const dest = `${DIR}${id}.mp3`;
  const res = await FileSystem.downloadAsync(url, dest);
  return res.uri;
}

export async function deleteAudio(id: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(`${DIR}${id}.mp3`, { idempotent: true });
  } catch {}
}

// Read a downloaded song file as base64 (for sending to the aligner). Null if
// the file isn't on the device. Uses the literal "base64" encoding rather than
// FileSystem.EncodingType (which can be undefined on the legacy module and would
// silently read the file as text — producing garbage that fails alignment).
export async function readAudioBase64(localUri: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(localUri, { encoding: "base64" as any });
  } catch {
    return null;
  }
}
