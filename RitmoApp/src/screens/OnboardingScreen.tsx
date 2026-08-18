import React, { useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, font, radius, gradients } from "../theme";

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type TabKey = "home" | "learn" | "create" | "library" | "profile" | null;

// Each slide: what it is + WHERE to find it (which bottom tab lights up).
// Order matches the "How to use Ritmo" guide exactly.
const SLIDES: { icon: Mci; color: string; title: string; body: string; where: string; tab: TabKey }[] = [
  { icon: "music", color: "#22D3EE", title: "Learn through songs", where: "Welcome to Ritmo", tab: null,
    body: "Ritmo turns any topic into a catchy bilingual song you'll actually want to replay. Here's a quick tour." },
  { icon: "rocket-launch", color: "#F97316", title: "Best way to start", where: "Start your journey", tab: null,
    body: "Start at the very beginning of your journey and go in order — each lesson builds on the last. A few minutes every day beats one long cram session, so aim to finish at least one lesson a day. Tap the blue “Continue” tile on Home to jump right in." },
  { icon: "play-circle", color: "#34D399", title: "Continue your lesson", where: "Home · Continue your lesson", tab: "home",
    body: "On Home, the blue “Continue” tile plays your next lesson. Ritmo builds each one and moves you forward automatically." },
  { icon: "map-marker-path", color: "#60A5FA", title: "Your journey map", where: "Home · See your journey map", tab: "home",
    body: "Tap “See your journey map” to see every level, topic and lesson as one colorful path. Each spot has a built-in song — tap it to play. Start at the beginning and move forward." },
  { icon: "microphone-variant", color: "#FBBF24", title: "Play and sing along", where: "Learn tab · while a song plays", tab: "learn",
    body: "When a song plays, the lyrics scroll and the line being sung glows gold — your language and English together. Know all the words already? Tap ⏭ to go to the next lesson." },
  { icon: "school", color: "#A78BFA", title: "Practice what you heard", where: "Learn tab · Say it · Quiz · Speak", tab: "learn",
    body: "In the player, use Say it, Quiz and Speak to hear each word, test yourself, and practice speaking out loud." },
  { icon: "plus-circle", color: "#F472B6", title: "Create your own song", where: "Bottom bar · Create +", tab: "create",
    body: "Tap Create + in the middle of the bottom bar to make a song about ANY topic — pick a genre, mood, level and voice." },
  { icon: "dice-5", color: "#F97316", title: "Surprise me", where: "Home · Surprise me", tab: "home",
    body: "Not sure what to learn? Tap “Surprise me” on Home for a fun random song." },
  { icon: "brain", color: "#D946EF", title: "Memory Mix", where: "Home · Memory Mix tile", tab: "home",
    body: "Words you've learned come back in the Memory Mix tile for a quick review, so they really stick." },
  { icon: "music-box-multiple", color: "#EF4444", title: "Your Library", where: "Library tab", tab: "library",
    body: "The Library tab keeps all your songs — favorite them ♥, build playlists, and search anytime." },
  { icon: "book-search", color: "#22C55E", title: "Look up any word", where: "Home · the search icon", tab: "home",
    body: "Tap the search icon at the top of Home to open the dictionary and translate any word, either direction." },
  { icon: "account", color: "#EC4899", title: "Make it yours", where: "Profile tab", tab: "profile",
    body: "In Profile, set your language, music tastes, daily goal and text size — and add karaoke to older songs." },
];

const TABS: { key: Exclude<TabKey, null>; icon: Mci; label: string }[] = [
  { key: "home", icon: "home-outline", label: "Home" },
  { key: "learn", icon: "book-open-outline", label: "Learn" },
  { key: "create", icon: "plus", label: "Create" },
  { key: "library", icon: "music", label: "Library" },
  { key: "profile", icon: "account-outline", label: "Profile" },
];

// A little mock of the bottom tab bar with one tab lit up, so the user sees
// exactly where the feature lives.
function MiniTabBar({ highlight, color }: { highlight: TabKey; color: string }) {
  return (
    <View style={styles.miniBar}>
      {TABS.map((t) => {
        const on = t.key === highlight;
        if (t.key === "create") {
          return (
            <View key={t.key} style={styles.miniTab}>
              <View style={[styles.miniFab, on && { borderColor: color, shadowColor: color, shadowOpacity: 0.6, shadowRadius: 8 }]}>
                <MaterialCommunityIcons name="plus" size={18} color={on ? color : colors.muted} />
              </View>
              <Text style={[styles.miniLabel, on && { color }]}>{t.label}</Text>
            </View>
          );
        }
        return (
          <View key={t.key} style={styles.miniTab}>
            <MaterialCommunityIcons name={t.icon} size={18} color={on ? color : colors.faint} />
            <Text style={[styles.miniLabel, on && { color }]}>{t.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <LinearGradient colors={[colors.bg2, colors.bg]} style={styles.root}>
      <Pressable onPress={onDone} style={styles.skip} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <View style={styles.center}>
        {/* The "picture" — the feature's icon in a neon tile */}
        <View style={[styles.tile, { borderColor: s.color, shadowColor: s.color }]}>
          <MaterialCommunityIcons name={s.icon} size={64} color={s.color} />
        </View>

        {/* Where to find it */}
        <View style={[styles.whereChip, { borderColor: `${s.color}66` }]}>
          <MaterialCommunityIcons name="map-marker" size={13} color={s.color} />
          <Text style={[styles.whereText, { color: s.color }]}>{s.where}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>{s.title}</Text>
        <Text style={styles.body}>{s.body}</Text>

        {/* Mini tab bar showing the spot in the app */}
        {s.tab && <MiniTabBar highlight={s.tab} color={s.color} />}
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, n) => (
          <View key={n} style={[styles.dot, n === i && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.btnRow}>
        {i > 0 ? (
          <Pressable onPress={() => setI(i - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Pressable style={{ flex: 1 }} onPress={() => (last ? onDone() : setI(i + 1))}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            <Text style={styles.btnText}>{last ? "Get started" : "Next  →"}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, paddingBottom: 40, justifyContent: "flex-end" },
  skip: { position: "absolute", top: 56, right: spacing.lg, zIndex: 2 },
  skipText: { color: colors.muted, fontSize: font.body, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tile: {
    width: 130, height: 130, borderRadius: radius.lg, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(3,5,10,0.4)", borderWidth: 1.5,
    shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  whereChip: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 22,
    backgroundColor: "rgba(3,5,10,0.4)", borderWidth: 1, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12,
  },
  whereText: { fontSize: font.small, fontWeight: "800" },
  title: { color: colors.ink, fontSize: font.h1, fontWeight: "900", textAlign: "center", marginTop: 16 },
  body: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: 12, lineHeight: 24, paddingHorizontal: 6 },
  miniBar: {
    flexDirection: "row", marginTop: 26, backgroundColor: "rgba(6,10,18,0.92)",
    borderWidth: 1, borderColor: "rgba(34,184,176,0.18)", borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 6,
  },
  miniTab: { alignItems: "center", justifyContent: "center", gap: 3, width: 58 },
  miniFab: {
    width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: colors.line, backgroundColor: "rgba(3,5,10,0.4)",
  },
  miniLabel: { color: colors.faint, fontSize: 9, fontWeight: "700" },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)" },
  dotOn: { backgroundColor: colors.accent, width: 22 },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 72, alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  backText: { color: colors.muted, fontSize: font.body, fontWeight: "800" },
  btn: {
    borderRadius: radius.md, paddingVertical: 16, alignItems: "center",
    shadowColor: "#22B8B0", shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3,
  },
  btnText: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900" },
});
