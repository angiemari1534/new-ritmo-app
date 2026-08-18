import React, { useMemo, useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { Screen } from "../components/ui";
import { spacing, font, radius, type Colors, type Gradients } from "../theme";
import { useTheme, useThemedStyles } from "../lib/theme-context";
import type { VocabPair } from "../lib/api";

export default function FlashcardsScreen({
  vocab,
  known,
  lang,
  onToggleKnown,
  onClose,
}: {
  vocab: VocabPair[];
  known: string[];
  lang: string;
  onToggleKnown: (es: string) => void;
  onClose: () => void;
}) {
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [onlyLearning, setOnlyLearning] = useState(true);
  const knownSet = useMemo(() => new Set(known), [known]);

  const deck = useMemo(() => {
    const all = vocab.filter((v) => v.es && v.en);
    return onlyLearning ? all.filter((v) => !knownSet.has(v.es.toLowerCase())) : all;
  }, [vocab, onlyLearning, knownSet]);

  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = deck[i];
  const next = () => {
    setFlipped(false);
    setI((n) => n + 1);
  };
  const goBack = () => {
    setFlipped(false);
    setI((n) => Math.max(0, n - 1));
  };
  const goForward = () => {
    setFlipped(false);
    setI((n) => Math.min(deck.length - 1, n + 1));
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}><Text style={styles.close}>✕</Text></Pressable>
        <Text style={styles.title}>Flashcards</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filters}>
        <Pill label="Still learning" on={onlyLearning} onPress={() => { setOnlyLearning(true); setI(0); setFlipped(false); }} />
        <Pill label="All words" on={!onlyLearning} onPress={() => { setOnlyLearning(false); setI(0); setFlipped(false); }} />
      </View>
      <Text style={styles.count}>{known.length} mastered · {vocab.length} learned</Text>

      {vocab.length === 0 ? (
        <View style={styles.center}><Text style={styles.msg}>Make a few songs to build your vocabulary, then review it here.</Text></View>
      ) : i >= deck.length ? (
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.done}>{onlyLearning ? "You reviewed everything!" : "End of deck"}</Text>
          <Pressable onPress={() => { setI(0); setFlipped(false); }} style={styles.primary}><Text style={styles.primaryText}>Review again</Text></Pressable>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.progress}>{i + 1} / {deck.length}</Text>
          <Pressable onPress={() => setFlipped((f) => !f)} style={{ width: "100%" }}>
            <LinearGradient colors={flipped ? gradients.violet : gradients.night} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
              {!flipped ? (
                <>
                  <Text style={styles.cardWord}>{card.es}</Text>
                  <Text style={styles.tapHint}>tap to see meaning</Text>
                </>
              ) : (
                <>
                  <Text style={styles.cardEs}>{card.es}</Text>
                  <Text style={styles.cardEn}>{card.en}</Text>
                  <Pressable onPress={() => { Speech.stop(); Speech.speak(card.es, { language: lang, rate: 0.5 }); }} style={styles.hear}>
                    <Text style={styles.hearText}>🔊 Hear it</Text>
                  </Pressable>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.nav}>
            <Pressable onPress={goBack} disabled={i === 0} hitSlop={8} style={styles.navBtn}>
              <Text style={[styles.navText, i === 0 && styles.navDim]}>‹ Back</Text>
            </Pressable>
            <Pressable onPress={goForward} disabled={i >= deck.length - 1} hitSlop={8} style={styles.navBtn}>
              <Text style={[styles.navText, i >= deck.length - 1 && styles.navDim]}>Next ›</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={() => { if (knownSet.has(card.es.toLowerCase())) onToggleKnown(card.es); next(); }} style={[styles.action, { borderColor: colors.line }]}>
              <Text style={styles.actionText}>Still learning</Text>
            </Pressable>
            <Pressable onPress={() => { if (!knownSet.has(card.es.toLowerCase())) onToggleKnown(card.es); next(); }} style={[styles.action, { borderColor: colors.good }]}>
              <Text style={[styles.actionText, { color: colors.good }]}>Got it ✓</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress}>
      {on ? (
        <LinearGradient colors={gradients.purplePink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
          <Text style={[styles.pillText, { color: "#E6EAF0" }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.pill, styles.pillOff]}><Text style={styles.pillText}>{label}</Text></View>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: Colors, gradients: Gradients) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 56, paddingHorizontal: spacing.lg },
  close: { color: colors.ink, fontSize: 22, fontWeight: "800", width: 24 },
  title: { color: colors.ink, fontSize: font.h3, fontWeight: "900" },
  filters: { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: spacing.md },
  pill: { borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 16 },
  pillOff: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  pillText: { color: colors.muted, fontSize: font.small, fontWeight: "800" },
  count: { color: colors.muted, fontSize: font.small, textAlign: "center", marginTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  msg: { color: colors.muted, fontSize: font.body, textAlign: "center" },
  progress: { color: colors.muted, fontSize: font.small, fontWeight: "700", marginBottom: 12 },
  card: { width: "100%", minHeight: 220, borderRadius: radius.xl, alignItems: "center", justifyContent: "center", padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
  cardWord: { color: colors.ink, fontSize: 34, fontWeight: "900", textAlign: "center" },
  tapHint: { color: colors.muted, fontSize: font.small, marginTop: 14 },
  cardEs: { color: "#E6EAF0", fontSize: font.h2, fontWeight: "900", textAlign: "center" },
  cardEn: { color: "rgba(255,255,255,0.95)", fontSize: font.h1, fontWeight: "900", textAlign: "center", marginTop: 10 },
  hear: { marginTop: 18, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 20 },
  hearText: { color: "#E6EAF0", fontWeight: "800" },
  nav: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 16 },
  navBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  navText: { color: colors.accent, fontSize: font.body, fontWeight: "900" },
  navDim: { color: colors.faint },
  actions: { flexDirection: "row", gap: 12, marginTop: 14, width: "100%" },
  action: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 15, alignItems: "center", backgroundColor: colors.card },
  actionText: { color: colors.ink, fontWeight: "900", fontSize: font.body },
  doneEmoji: { fontSize: 56 },
  done: { color: colors.ink, fontSize: font.h2, fontWeight: "900", marginTop: 10 },
  primary: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 26, marginTop: 20 },
  primaryText: { color: "#E6EAF0", fontWeight: "900", fontSize: font.body },
});
