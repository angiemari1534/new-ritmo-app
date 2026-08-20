// Ritmo design system — now MULTI-THEME. Each theme defines a compact palette;
// the full colour token set + named gradients are derived from it, so switching
// theme recolours the whole app. The picker under "Ritmo" swaps the active one.

export type ThemeId = "midnight" | "sunset" | "ultraviolet" | "forest" | "mono" | "vintage" | "classic" | "noir";
export type Colors = {
  bg: string; bg2: string; card: string; card2: string; line: string;
  ink: string; muted: string; faint: string; accent: string; teal: string;
  navy: string; pink: string; coral: string; good: string; gold: string; blue: string;
};
export type Gradients = Record<string, [string, string]>;

// Compact per-theme definition: the 16 colour tokens + a few extras used only to
// build the named gradients (gA/gB = primary pair, goldL/goldD, nightA/nightB).
type Def = Colors & { gA: string; gB: string; goldL: string; goldD: string; nightA: string; nightB: string };

const DEFS: Record<ThemeId, Def> = {
  midnight: { bg:"#06070A", bg2:"#0D0F14", card:"rgba(15,26,44,0.45)", card2:"rgba(29,54,84,0.5)", line:"#294160", ink:"#E6EAF0", muted:"#9DB2CC", faint:"#697F9C", accent:"#22B8B0", teal:"#22B8B0", navy:"#1E4E7E", pink:"#FF4D8D", coral:"#FF7A45", good:"#34D399", gold:"#E4B84C", blue:"#3B82F6", gA:"#2A7FE0", gB:"#22B8B0", goldL:"#F0C765", goldD:"#D4A32E", nightA:"#152740", nightB:"#0E1D33" },
  sunset: { bg:"#06070A", bg2:"#0D0F14", card:"rgba(58,30,34,0.42)", card2:"rgba(80,42,46,0.5)", line:"#4A2A2C", ink:"#F1E6E4", muted:"#C99B93", faint:"#9A6E67", accent:"#FF7A45", teal:"#FF7A45", navy:"#5A2A2E", pink:"#FF5C8A", coral:"#FF7A45", good:"#F5B942", gold:"#F5B942", blue:"#E24D8B", gA:"#FF5C8A", gB:"#FF7A45", goldL:"#FFD27A", goldD:"#E0932E", nightA:"#2A1416", nightB:"#1C0E10" },
  ultraviolet: { bg:"#06070A", bg2:"#0D0F14", card:"rgba(40,28,64,0.42)", card2:"rgba(56,40,88,0.5)", line:"#332A55", ink:"#EAE6F5", muted:"#A79CC8", faint:"#7A6EA0", accent:"#A78BFA", teal:"#A78BFA", navy:"#4A3A7E", pink:"#F472B6", coral:"#E24DFF", good:"#38BDF8", gold:"#C4B5FD", blue:"#38BDF8", gA:"#7C4DFF", gB:"#A78BFA", goldL:"#D6C9FF", goldD:"#9B7CE0", nightA:"#1E1636", nightB:"#140E26" },
  forest: { bg:"#06070A", bg2:"#0D0F14", card:"rgba(20,44,34,0.42)", card2:"rgba(30,60,46,0.5)", line:"#1E3A30", ink:"#E4EFE8", muted:"#8FB6A2", faint:"#5F8670", accent:"#2FA47E", teal:"#2FA47E", navy:"#1A4A3A", pink:"#E8B04B", coral:"#E8B04B", good:"#5FB350", gold:"#D8C066", blue:"#3FA9C9", gA:"#2FA47E", gB:"#5FB350", goldL:"#E4D07A", goldD:"#B89A3E", nightA:"#12281E", nightB:"#0A1E17" },
  mono: { bg:"#06070A", bg2:"#0D0F14", card:"rgba(30,38,48,0.45)", card2:"rgba(44,54,68,0.5)", line:"#26303C", ink:"#E4E8EE", muted:"#8B95A3", faint:"#5F6773", accent:"#6EA8FF", teal:"#6EA8FF", navy:"#3A4757", pink:"#9AA6B4", coral:"#9AA6B4", good:"#6EA8FF", gold:"#B8C1CE", blue:"#6EA8FF", gA:"#5A7A9E", gB:"#6EA8FF", goldL:"#C8D0DC", goldD:"#98A2B0", nightA:"#1A2029", nightB:"#12171E" },
  vintage: { bg:"#06070A", bg2:"#0D0F14", card:"rgba(58,40,20,0.42)", card2:"rgba(74,52,26,0.5)", line:"#3A2C18", ink:"#EDE0C8", muted:"#B49A6E", faint:"#8A7550", accent:"#D8A43A", teal:"#D8A43A", navy:"#5A3A1A", pink:"#C4622E", coral:"#C4622E", good:"#7C8A4A", gold:"#D8A43A", blue:"#7C8A4A", gA:"#C4622E", gB:"#D8A43A", goldL:"#E4B85E", goldD:"#C88A2A", nightA:"#2A1C0E", nightB:"#1C1208" },
  classic: { bg:"#06070A", bg2:"#0D0F14", card:"rgba(30,52,84,0.4)", card2:"rgba(44,70,108,0.5)", line:"#2A3E5C", ink:"#F1E9D6", muted:"#A8B6CC", faint:"#6E7E98", accent:"#22A9A0", teal:"#22A9A0", navy:"#2A5A9E", pink:"#E4B84C", coral:"#D9A63C", good:"#2E9B8E", gold:"#E4B84C", blue:"#3E6FA8", gA:"#2A5A9E", gB:"#22A9A0", goldL:"#F0C765", goldD:"#D4A32E", nightA:"#16243D", nightB:"#0E1A2E" },
  noir: { bg:"#06070A", bg2:"#0D0F14", card:"rgba(42,44,50,0.42)", card2:"rgba(62,65,72,0.5)", line:"#33363D", ink:"#F2F3F5", muted:"#9BA0A8", faint:"#6A6E76", accent:"#E8EAED", teal:"#E8EAED", navy:"#4A4E56", pink:"#C6C9CE", coral:"#C6C9CE", good:"#B8BBC0", gold:"#D8DADE", blue:"#9BA0A8", gA:"#6A6E76", gB:"#E8EAED", goldL:"#E8EAED", goldD:"#A8ABB0", nightA:"#1A1B1F", nightB:"#0E0F12" },
};

function colorsOf(d: Def): Colors {
  const { gA, gB, goldL, goldD, nightA, nightB, ...c } = d;
  return c;
}
function gradientsOf(c: Def): Gradients {
  return {
    primary: [c.gA, c.gB], purplePink: [c.accent, c.pink], violet: [c.navy, c.accent],
    sunset: [c.gold, c.pink], ocean: [c.blue, c.accent], mint: [c.good, c.accent],
    aqua: [c.accent, c.blue], teal: [c.accent, c.gB], seafoam: [c.blue, c.accent],
    gold: [c.goldL, c.goldD], night: [c.nightA, c.nightB], magenta: [c.accent, c.pink],
  };
}

export const THEMES: { id: ThemeId; name: string; vibe: string; colors: Colors; gradients: Gradients }[] = [
  { id:"midnight", name:"Original (Midnight Teal)", vibe:"Your original look — navy, teal and gold", colors: colorsOf(DEFS.midnight), gradients: gradientsOf(DEFS.midnight) },
  { id:"sunset", name:"Sunset", vibe:"Espresso plum, coral and amber", colors: colorsOf(DEFS.sunset), gradients: gradientsOf(DEFS.sunset) },
  { id:"ultraviolet", name:"Ultraviolet", vibe:"Violet, magenta and cyan", colors: colorsOf(DEFS.ultraviolet), gradients: gradientsOf(DEFS.ultraviolet) },
  { id:"forest", name:"Forest", vibe:"Deep green, mint and lime", colors: colorsOf(DEFS.forest), gradients: gradientsOf(DEFS.forest) },
  { id:"mono", name:"Mono Slate", vibe:"Greyscale, soft-blue accent", colors: colorsOf(DEFS.mono), gradients: gradientsOf(DEFS.mono) },
  { id:"vintage", name:"Warm Vintage", vibe:"Espresso, cream and mustard", colors: colorsOf(DEFS.vintage), gradients: gradientsOf(DEFS.vintage) },
  { id:"classic", name:"Ritmo Classic", vibe:"Your logo — navy, teal, gold on cream", colors: colorsOf(DEFS.classic), gradients: gradientsOf(DEFS.classic) },
  { id:"noir", name:"Black & White", vibe:"Monochrome — black, white and greys", colors: colorsOf(DEFS.noir), gradients: gradientsOf(DEFS.noir) },
];

export const DEFAULT_THEME: ThemeId = "midnight";
export function themeById(id: ThemeId) { return THEMES.find((t) => t.id === id) ?? THEMES[THEMES.length - 1]; }

// Mutable "active" colour/gradient objects. Screens converted to the theme
// context read the live palette; any not-yet-converted file imports these and
// gets the active theme too (updated in place via applyTheme so the reference
// stays stable). Defaults to the saved-or-vintage theme.
export const colors: Colors = { ...themeById(DEFAULT_THEME).colors };
export const gradients: Gradients = { ...themeById(DEFAULT_THEME).gradients };

export function applyTheme(id: ThemeId) {
  const t = themeById(id);
  Object.assign(colors, t.colors);
  Object.assign(gradients, t.gradients);
}

// A stable, vivid gradient per subject key for cover art tiles.
export const subjectGradient: Record<string, [string, string]> = {
  numbers: ["#7C5CFF", "#B14DFF"],
  colors: ["#FF4D8D", "#FFC24B"],
  greetings: ["#4CA8FF", "#7C5CFF"],
  vacation: ["#FF7A45", "#FF4D8D"],
  cooking: ["#FF5C5C", "#FF9E45"],
  family: ["#B14DFF", "#FF4D8D"],
  days: ["#4CA8FF", "#34D399"],
  food: ["#FF7A45", "#FFC24B"],
  animals: ["#34D399", "#4CA8FF"],
  body: ["#FF6FA5", "#B14DFF"],
  clothing: ["#7C5CFF", "#4CA8FF"],
  weather: ["#4CA8FF", "#FFC24B"],
  feelings: ["#FFC24B", "#FF4D8D"],
  home: ["#7C5CFF", "#34D399"],
  directions: ["#34D399", "#7C5CFF"],
  shopping: ["#FF4D8D", "#B14DFF"],
  verbs: ["#B14DFF", "#4CA8FF"],
};

export function gradientFor(key: string): [string, string] {
  return subjectGradient[key] ?? gradients.violet;
}

// A rotating palette drawn from the ACTIVE theme, so accent tiles / subject art
// follow the chosen colour theme instead of a fixed rainbow.
export function themePalette(c: Colors): string[] {
  return [c.accent, c.pink, c.gold, c.blue, c.good, c.coral, c.navy, c.teal];
}
// A stable two-colour pair per subject, picked from the theme palette by a hash
// of the key — themed subject art that still varies subject to subject.
export function subjectPair(c: Colors, key: string): [string, string] {
  const pal = themePalette(c);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return [pal[h % pal.length], pal[(h + 3) % pal.length]];
}

// ---- Colour mixing (for deriving journey-map shades from the theme) ----
function hx(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
export function mix(a: string, b: string, t: number): string {
  const A = hx(a), B = hx(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

// The journey map's whole colour world (tie-dye wash, dark bases, road accents,
// avatar rings, note colours) derived from the active theme so it shifts shades
// to match the chosen theme.
export function themedMapPalette(c: Colors) {
  const brights = [c.accent, c.pink, c.gold, c.blue, c.good, c.coral];
  const tiedye = brights.concat([mix(c.accent, c.blue, 0.5), mix(c.pink, c.gold, 0.5)]);
  const deep = brights.map((x) => mix(x, c.bg, 0.72));
  const segBg: [string, string][] = brights.map((x) => [mix(x, c.bg, 0.86), c.bg]);
  return { tiedye, deep, segBg, segAccent: brights, rings: brights, notes: brights };
}

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };
export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 };
export const font = { hero: 34, h1: 28, h2: 22, h3: 18, body: 16, small: 13, tiny: 11 };
