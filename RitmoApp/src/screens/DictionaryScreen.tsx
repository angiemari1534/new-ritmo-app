import React, { useMemo, useRef, useState } from "react";
import { Text, View, StyleSheet, Pressable, TextInput, SectionList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { colors, spacing, font, radius, gradients } from "../theme";
import { DICTIONARY, type DictEntry } from "../data/dictionary";
import { translateWord } from "../lib/api";
import type { VocabPair } from "../lib/api";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Strip Spanish leading article + any punctuation so grouping is by the real word.
function sortText(entry: DictEntry, lang: "english" | "spanish") {
  let s = lang === "english" ? entry.en : entry.es;
  s = s.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, "");
  return norm(s);
}
function firstLetter(entry: DictEntry, lang: "english" | "spanish") {
  const s = sortText(entry, lang);
  const m = s.match(/[A-Z]/);
  return m ? m[0] : "#";
}

export default function DictionaryScreen({
  learned,
  lang,
  languageName = "Spanish",
  onClose,
}: {
  learned: VocabPair[];
  lang: string;
  languageName?: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"english" | "spanish">("english");
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<{ es: string; en: string } | null>(null);
  const listRef = useRef<SectionList<DictEntry>>(null);

  async function doTranslate() {
    const t = query.trim();
    if (!t) return;
    setTranslating(true);
    try {
      setTranslated(await translateWord(t, languageName));
    } catch {
      setTranslated({ en: "Couldn't translate — check the server connection.", es: "" });
    } finally {
      setTranslating(false);
    }
  }

  // Merge the curated dictionary with the user's own learned words (deduped).
  const all = useMemo(() => {
    const seen = new Set(DICTIONARY.map((d) => `${norm(d.en)}|${norm(d.es)}`));
    const merged = [...DICTIONARY];
    for (const w of learned) {
      if (!w?.en || !w?.es) continue;
      const key = `${norm(w.en)}|${norm(w.es)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ en: w.en, es: w.es });
      }
    }
    return merged;
  }, [learned]);

  const sections = useMemo(() => {
    const q = norm(query);
    const filtered = q ? all.filter((e) => norm(e.en).includes(q) || norm(e.es).includes(q)) : all;
    const groups: Record<string, DictEntry[]> = {};
    for (const e of filtered) (groups[firstLetter(e, mode)] ||= []).push(e);
    return Object.keys(groups)
      .sort()
      .map((title) => ({
        title,
        data: groups[title].sort((a, b) => sortText(a, mode).localeCompare(sortText(b, mode))),
      }));
  }, [all, query, mode]);

  const letterToSection = useMemo(() => {
    const m: Record<string, number> = {};
    sections.forEach((s, i) => (m[s.title] = i));
    return m;
  }, [sections]);

  const jumpTo = (letter: string) => {
    const idx = letterToSection[letter];
    if (idx != null) listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, viewOffset: 0, animated: true });
  };

  const say = (es: string) => { Speech.stop(); Speech.speak(es.replace(/\.\.\./g, "").replace(/[¿?]/g, ""), { language: lang, rate: 0.85 }); };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            value={query}
            onChangeText={(t) => { setQuery(t); setTranslated(null); }}
            placeholder="Search Spanish or English"
            placeholderTextColor="rgba(157,178,204,0.6)"
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query.length > 0 && <Pressable onPress={() => setQuery("")}><Text style={styles.clear}>✕</Text></Pressable>}
        </View>
      </View>

      {query.trim().length >= 2 && (
        <View style={styles.transRow}>
          {translated ? (
            <Pressable onPress={() => translated.es && say(translated.es)} style={styles.transCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.transEn} numberOfLines={2}>{translated.en}</Text>
                {!!translated.es && <Text style={styles.transEs} numberOfLines={2}>{translated.es}</Text>}
              </View>
              {!!translated.es && <Text style={styles.transSpeak}>🔊</Text>}
            </Pressable>
          ) : (
            <Pressable onPress={doTranslate} disabled={translating} style={styles.transBtn}>
              <Text style={styles.transBtnText}>{translating ? "Translating…" : `🌐  Translate "${query.trim()}" online`}</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.body}>
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item, i) => `${item.en}-${item.es}-${i}`}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => {}}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{section.title}</Text></View>
          )}
          renderItem={({ item }) => (
            <Pressable onPress={() => say(item.es)} style={styles.row}>
              <Text style={styles.enText}>{item.en}</Text>
              <View style={styles.esCol}>
                <Text style={styles.esText}>{item.es}{item.g ? " " : ""}<Text style={styles.gender}>{item.g ?? ""}</Text></Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No matches. Try another word.</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />

        {/* A–Z quick index */}
        <View style={styles.azBar}>
          {LETTERS.map((l) => (
            <Pressable key={l} onPress={() => jumpTo(l)} hitSlop={4}>
              <Text style={[styles.azLetter, letterToSection[l] != null && styles.azLetterOn]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggle, mode === "spanish" && styles.toggleOn]} onPress={() => setMode("spanish")}>
          <Text style={[styles.toggleText, mode === "spanish" && styles.toggleTextOn]}>Spanish</Text>
        </Pressable>
        <Pressable style={[styles.toggle, mode === "english" && styles.toggleOn]} onPress={() => setMode("english")}>
          <Text style={[styles.toggleText, mode === "english" && styles.toggleTextOn]}>English</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 54, paddingHorizontal: spacing.md, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(34,184,176,0.18)" },
  back: { width: 34, alignItems: "center" },
  backText: { color: colors.accent, fontSize: 34, fontWeight: "800", marginTop: -4 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(7,11,19,0.5)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", paddingHorizontal: 12, height: 44 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "600" },
  clear: { color: colors.accent, fontSize: 16, fontWeight: "900", paddingHorizontal: 4 },

  transRow: { paddingHorizontal: spacing.lg, paddingVertical: 8 },
  transBtn: { backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.4)", borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  transBtnText: { color: colors.accent, fontSize: font.body, fontWeight: "800" },
  transCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(7,11,19,0.5)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(34,184,176,0.4)", padding: 12 },
  transEn: { color: colors.accent, fontSize: font.body, fontWeight: "900" },
  transEs: { color: colors.ink, fontSize: font.body, fontWeight: "600", marginTop: 2 },
  transSpeak: { fontSize: 22 },
  body: { flex: 1, flexDirection: "row" },
  sectionHeader: { backgroundColor: colors.bg, paddingVertical: 4, paddingHorizontal: spacing.lg },
  sectionHeaderText: { color: colors.accent, fontSize: font.small, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingLeft: spacing.lg, paddingRight: 24, borderBottomWidth: 1, borderBottomColor: "rgba(34,184,176,0.12)" },
  enText: { flex: 1, color: colors.accent, fontSize: 14, fontWeight: "800" },
  esCol: { flex: 1 },
  esText: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  gender: { color: colors.faint, fontSize: font.small, fontStyle: "italic" },
  empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: 40 },

  azBar: { width: 20, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  azLetter: { color: colors.faint, fontSize: 10, fontWeight: "800", paddingVertical: 0.5 },
  azLetterOn: { color: colors.accent },

  toggleRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(34,184,176,0.18)", backgroundColor: "rgba(7,11,19,0.5)" },
  toggle: { flex: 1, alignItems: "center", paddingVertical: 16 },
  toggleOn: { backgroundColor: "rgba(34,184,176,0.15)" },
  toggleText: { color: colors.muted, fontSize: font.body, fontWeight: "800" },
  toggleTextOn: { color: colors.accent, fontWeight: "900" },
});
