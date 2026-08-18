// Live theme switching. The provider holds the active theme; screens read the
// palette from useTheme() and build their StyleSheet with useThemedStyles() so a
// theme change instantly recolours the whole app. The choice is persisted.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  THEMES, DEFAULT_THEME, themeById, applyTheme,
  type ThemeId, type Colors, type Gradients,
} from "../theme";

const STORE_KEY = "ritmo.themeId";

type Ctx = {
  id: ThemeId;
  colors: Colors;
  gradients: Gradients;
  setTheme: (id: ThemeId) => void;
  themes: typeof THEMES;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<ThemeId>(DEFAULT_THEME);

  // Load the saved theme once on start.
  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then((saved) => {
      if (saved && THEMES.some((t) => t.id === saved)) {
        applyTheme(saved as ThemeId);
        setId(saved as ThemeId);
      }
    });
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    applyTheme(next); // keep the static colors/gradients in sync for any unconverted screen
    setId(next);
    AsyncStorage.setItem(STORE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const t = themeById(id);
    return { id, colors: t.colors, gradients: t.gradients, setTheme, themes: THEMES };
  }, [id, setTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const c = useContext(ThemeCtx);
  if (c) return c;
  // Fallback (provider not mounted, e.g. in isolated tests): use the default.
  const t = themeById(DEFAULT_THEME);
  return { id: DEFAULT_THEME, colors: t.colors, gradients: t.gradients, setTheme: () => {}, themes: THEMES };
}

// Build a StyleSheet from the active palette, rebuilt when the theme changes.
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: Colors, gradients: Gradients) => T
): T {
  const { colors, gradients } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, gradients)), [colors, gradients]);
}
