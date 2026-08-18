// Ritmo design system — "Warm Vintage": faded-film feel, espresso canvas,
// cream text, mustard + burnt-orange accents with an olive cool tone.

// Palette: espresso brown ground, cream ink, mustard/burnt-orange accents.
export const colors = {
  bg: "#191109", // deep espresso
  bg2: "#241809",
  card: "rgba(58,40,20,0.42)", // warm translucent tile over the espresso bg
  card2: "rgba(74,52,26,0.5)", // stronger translucent (selected/secondary tiles)
  line: "#3A2C18",
  ink: "#EDE0C8", // warm cream (soft, not glaring)
  muted: "#B49A6E", // faded tan
  faint: "#8A7550",
  accent: "#D8A43A", // mustard (brand accent)
  teal: "#D8A43A",
  navy: "#5A3A1A", // warm brown
  pink: "#C4622E", // burnt orange (favorites / current)
  coral: "#C4622E",
  good: "#7C8A4A", // faded olive (positive/cool)
  gold: "#D8A43A", // mustard gold
  blue: "#7C8A4A", // olive stands in for the old blue accent
};

// Named gradient pairs — warm mustard / burnt-orange / olive vintage tones.
export const gradients: Record<string, [string, string]> = {
  primary: ["#C4622E", "#D8A43A"], // burnt orange -> mustard (FAB, primary buttons)
  purplePink: ["#D8A43A", "#C4622E"], // mustard -> orange (selected states)
  violet: ["#5A3A1A", "#D8A43A"], // brown -> mustard
  sunset: ["#D8A43A", "#C4622E"], // mustard -> orange
  ocean: ["#7C8A4A", "#D8A43A"], // olive -> mustard
  mint: ["#7C8A4A", "#D8A43A"],
  aqua: ["#D8A43A", "#C4622E"],
  teal: ["#B98A2E", "#D8A43A"],
  seafoam: ["#7C8A4A", "#D8A43A"],
  gold: ["#E4B85E", "#C88A2A"],
  night: ["#2A1C0E", "#1C1208"], // espresso dark card
  magenta: ["#D8A43A", "#C4622E"],
};

// A stable warm-vintage gradient per subject key for cover art tiles — mustard,
// burnt orange, olive, rust and tan tones so subject icons stay in-palette.
export const subjectGradient: Record<string, [string, string]> = {
  numbers: ["#D8A43A", "#C88A2A"],
  colors: ["#C4622E", "#D8A43A"],
  greetings: ["#CC9544", "#7C8A4A"],
  vacation: ["#BF6B4A", "#D8A43A"],
  cooking: ["#C4622E", "#E0B450"],
  family: ["#A0522D", "#C4622E"],
  days: ["#7C8A4A", "#CC9544"],
  food: ["#C4622E", "#E0B450"],
  animals: ["#7C8A4A", "#B98A2E"],
  body: ["#BF6B4A", "#A0522D"],
  clothing: ["#B98A2E", "#7C8A4A"],
  weather: ["#9AA46A", "#D8A43A"],
  feelings: ["#E0B450", "#C4622E"],
  home: ["#B98A2E", "#7C8A4A"],
  directions: ["#7C8A4A", "#CC9544"],
  shopping: ["#C4622E", "#A0522D"],
  verbs: ["#CC9544", "#B98A2E"],
};

export function gradientFor(key: string): [string, string] {
  return subjectGradient[key] ?? gradients.violet;
}

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };
export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 };
export const font = { hero: 34, h1: 28, h2: 22, h3: 18, body: 16, small: 13, tiny: 11 };
