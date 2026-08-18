// Avatar registry. The original bundled avatar PNGs were lost in the 2026-08-18
// data loss; this keeps the app working with emoji avatars until images are
// re-added. `avatarSource` returns a bundled image module for a known image key,
// or undefined so the UI falls back to rendering the emoji / photo URI.
export const AVATAR_KEYS: string[] = [
  "🎧", "🎤", "🎸", "🎹", "🥁", "🎺", "🎻", "🎷",
  "🌟", "🔥", "💃", "🕺", "🦊", "🐼", "🐵", "🦁",
  "🐯", "🐨", "🦄", "🐶", "🐱", "🎩", "👑", "😎",
];

export function avatarSource(_avatar?: string): number | undefined {
  return undefined;
}
