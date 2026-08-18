// Ritmo design system — dark, neon, music-app feel (LingoBeats-inspired):
// near-black navy canvas, glossy gradient tiles, pink→coral primary accent.

// Palette drawn from the Ritmo logo: deep navy, teal/turquoise, and gold.
export const colors = {
  bg: "#05080F", // near-black navy
  bg2: "#0A101C",
  card: "#152740",
  card2: "#1D3654",
  line: "#294160",
  ink: "#FFFFFF",
  muted: "#9DB2CC", // blue-gray
  faint: "#697F9C",
  accent: "#22B8B0", // teal (brand accent)
  teal: "#22B8B0",
  navy: "#1E4E7E",
  pink: "#FF4D8D", // used sparingly (favorites)
  coral: "#FF7A45",
  good: "#34D399",
  gold: "#E4B84C", // logo gold
  blue: "#3B82F6",
};

// Named gradient pairs.
export const gradients: Record<string, [string, string]> = {
  primary: ["#2A7FE0", "#22B8B0"], // blue -> teal (FAB, primary buttons)
  purplePink: ["#1FB6AE", "#2A7FE0"], // teal -> blue (selected states)
  violet: ["#1E4E7E", "#22B8B0"], // navy -> teal
  sunset: ["#E4B84C", "#22B8B0"], // gold -> teal
  ocean: ["#3B82F6", "#22B8B0"],
  mint: ["#34D399", "#22B8B0"],
  aqua: ["#22D3EE", "#3B82F6"],
  teal: ["#14B8A6", "#22B8B0"],
  seafoam: ["#2DD4BF", "#3B82F6"],
  gold: ["#F0C765", "#D4A32E"],
  night: ["#152740", "#0E1D33"], // navy dark card
  magenta: ["#22B8B0", "#3B82F6"],
};

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

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };
export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 };
export const font = { hero: 34, h1: 28, h2: 22, h3: 18, body: 16, small: 13, tiny: 11 };
