import React, { useMemo, useRef, useEffect, useState } from "react";
import { Text, View, StyleSheet, Pressable, Image, Dimensions, FlatList, ScrollView } from "react-native";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, font, radius, gradients } from "../theme";
import { tierLabel, subjectLabel, LEVELS, LEVEL_ORDER, subjectsForLevel, lessonsFor, type PathStep, type Tier } from "../data/presets";
import { avatarSource } from "../data/avatars";
import type { Progress } from "../lib/storage";

const isUri = (a?: string) =>
  !!a && (a.startsWith("file:") || a.startsWith("http") || a.startsWith("content:") || a.startsWith("data:") || a.startsWith("ph:") || a.startsWith("assets-library:"));

type Status = "done" | "current" | "future";

const W = Dimensions.get("window").width;
const NODE = 46;
const ROW_H = 92;
const HEADER = 84; // room for the topic label so the first stop never overlaps it
const PAD = 26;
const CENTER = W / 2;
const AMP = Math.min(W * 0.22, 86);
const FREQ = Math.PI / 3;
// Each topic can have a different number of lessons (First Words varies per
// topic; phrase levels are fixed), so a segment's height depends on both.
const segHeight = (tier: Tier, subject: string) => HEADER + lessonsFor(tier, subject) * ROW_H + PAD;

// A flowing rainbow of vibrant colors. Each segment blends FROM the previous
// segment's end color TO the next, so the whole map is one continuous colour
// flow with no hard line between levels/topics.
// Deep, dark, near-black segment backgrounds (subtle colour tint per world) —
// like the mockup: mostly black with a soft blue / purple / teal glow.
const SEG_BG: [string, string][] = [
  ["#0C2036", "#080D18"], // deep blue
  ["#1A1240", "#0B0918"], // deep indigo
  ["#0A2320", "#080F14"], // deep teal
  ["#22123A", "#0C0A1C"], // deep violet
  ["#0E1E3A", "#080D18"], // blue
  ["#2A1030", "#120A1C"], // deep magenta
];
// The neon accent colour for each world's road + completed nodes.
const SEG_ACCENT = ["#22D3EE", "#FBBF24", "#A78BFA", "#2DD4BF", "#F472B6", "#38BDF8"];
// A vibrant neon rainbow used to paint each world as a tie-dye blend — the
// background cycles through these hues, shifting colour frequently down the map.
const TIEDYE = ["#22D3EE", "#818CF8", "#A78BFA", "#C084FC", "#F472B6", "#FB7185", "#FBBF24", "#34D399", "#38BDF8"];
// Bright ring colours — each avatar along the route gets a different border.
const RINGS = ["#FF3D71", "#FF9A00", "#FFE600", "#B4FF00", "#00FFA3", "#00E5FF", "#3B82F6", "#7C4DFF", "#FF00C8", "#FF5CA8", "#00D9C0", "#F97316", "#A3FF00", "#E44DFF", "#22D3EE", "#FBBF24"];
const SCENE_AV = ["av002", "av006", "av034", "av037", "av050", "av065", "av071", "av085", "av097", "av100", "av004", "av059", "av009", "av017", "av046", "av022", "av007", "av013", "av029", "av042", "av055", "av068", "av081", "av093", "av111", "av120", "av133", "av148", "av160", "av175", "av188", "av200"];
// Glossy music notes scattered singly along the route (between the avatars and
// the road), for decoration. Black notes with a soft white halo so they read on
// the colorful background.
const NOTE_ICONS = ["music-note", "music", "music-note-eighth", "music-note-sixteenth", "music-note-eighth"] as const;
// Glowing neon note colours (purple / teal / blue), like the mockup.
const NOTE_COLORS = ["#A78BFA", "#22D3EE", "#818CF8", "#F472B6", "#38BDF8", "#C084FC"];
const NOTE_SPOTS: { side: "l" | "r"; yF: number; x: number; rot: number; size: number }[] = [
  { side: "l", yF: 0.05, x: 66, rot: -14, size: 28 },
  { side: "r", yF: 0.12, x: 88, rot: 12, size: 24 },
  { side: "l", yF: 0.19, x: 100, rot: 10, size: 30 },
  { side: "r", yF: 0.26, x: 72, rot: -12, size: 26 },
  { side: "l", yF: 0.33, x: 90, rot: 15, size: 32 },
  { side: "r", yF: 0.4, x: 96, rot: -9, size: 25 },
  { side: "l", yF: 0.47, x: 70, rot: 8, size: 30 },
  { side: "r", yF: 0.54, x: 92, rot: -13, size: 28 },
  { side: "l", yF: 0.61, x: 98, rot: 11, size: 26 },
  { side: "r", yF: 0.68, x: 74, rot: -10, size: 32 },
  { side: "l", yF: 0.75, x: 88, rot: 13, size: 27 },
  { side: "r", yF: 0.82, x: 96, rot: -8, size: 30 },
  { side: "l", yF: 0.89, x: 72, rot: 9, size: 25 },
  { side: "r", yF: 0.96, x: 90, rot: -14, size: 29 },
];

// Avatar spots down each segment — lots of little characters lining the route.
// x is an absolute offset from the near edge so we can pack inner + outer rows.
const AV_SPOTS: { side: "l" | "r"; yF: number; x: number }[] = [
  { side: "l", yF: 0.04, x: 6 }, { side: "r", yF: 0.09, x: 6 }, { side: "l", yF: 0.14, x: 54 }, { side: "r", yF: 0.19, x: 54 },
  { side: "l", yF: 0.24, x: 6 }, { side: "r", yF: 0.29, x: 6 }, { side: "l", yF: 0.34, x: 54 }, { side: "r", yF: 0.39, x: 54 },
  { side: "l", yF: 0.44, x: 6 }, { side: "r", yF: 0.49, x: 6 }, { side: "l", yF: 0.54, x: 54 }, { side: "r", yF: 0.59, x: 54 },
  { side: "l", yF: 0.64, x: 6 }, { side: "r", yF: 0.69, x: 6 }, { side: "l", yF: 0.74, x: 54 }, { side: "r", yF: 0.79, x: 54 },
  { side: "l", yF: 0.84, x: 6 }, { side: "r", yF: 0.89, x: 6 }, { side: "l", yF: 0.94, x: 54 }, { side: "r", yF: 0.98, x: 54 },
];

// Deterministic pseudo-random 0..1 from a seed — stable across re-renders (so
// scattered decorations don't jump around) but looks random.
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const midY = ((p0.y + p1.y) / 2).toFixed(1);
    d += ` C ${p0.x.toFixed(1)} ${midY}, ${p1.x.toFixed(1)} ${midY}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

type Seg = { tier: Tier; subject: string; index: number };

export default function JourneyScreen({
  progress,
  nextUp,
  currentStep = null,
  pathPct,
  avatar,
  language = "Spanish",
  onJumpTo,
  onClose,
}: {
  progress: Progress;
  nextUp: PathStep | null;
  currentStep?: PathStep | null;
  pathPct: number;
  avatar: string;
  language?: string;
  onJumpTo: (step: PathStep) => void;
  onClose: () => void;
}) {
  const listRef = useRef<FlatList<Seg>>(null);
  const avImg = avatarSource(avatar) ?? (isUri(avatar) ? { uri: avatar } : null);
  // Where the avatar sits: the lesson you're currently on (so it follows you as
  // you move) — but once that lesson is finished, it advances to the next one.
  const isDone = (s: PathStep | null) => !!s && (progress[s.subject]?.[s.tier] ?? 0) >= s.lesson;
  const here = currentStep && !isDone(currentStep) ? currentStep : nextUp;

  // Every topic in every level, in order — one continuous journey. Each level
  // contributes its own subjects (Pre-Starter has a single "words" track).
  const segments = useMemo<Seg[]>(() => {
    const out: Seg[] = [];
    let i = 0;
    for (const lvl of LEVELS) for (const subject of lvl.subjects) out.push({ tier: lvl.key, subject, index: i++ });
    return out;
  }, []);

  // Segments differ in height (100-lesson vs 20-lesson), so precompute each
  // one's pixel height + cumulative offset for the FlatList's getItemLayout.
  const { heights, offsets } = useMemo(() => {
    const heights = segments.map((s) => segHeight(s.tier, s.subject));
    const offsets: number[] = [];
    let acc = 0;
    for (const h of heights) { offsets.push(acc); acc += h; }
    return { heights, offsets };
  }, [segments]);

  const currentSeg = here ? segments.findIndex((s) => s.tier === here.tier && s.subject === here.subject) : 0;
  const [tier, setTier] = useState<Tier>(nextUp?.tier ?? LEVEL_ORDER[0]);

  const segIndexFor = (t: Tier, subject: string) => segments.findIndex((s) => s.tier === t && s.subject === subject);
  const scrollToSeg = (idx: number) => {
    if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.12 });
  };

  useEffect(() => {
    if (currentSeg > 0) {
      const t = setTimeout(() => listRef.current?.scrollToIndex({ index: currentSeg, animated: true, viewPosition: 0.3 }), 300);
      return () => clearTimeout(t);
    }
  }, [currentSeg]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Your Journey</Text>
          <Text style={styles.sub}>{language} · {pathPct}% complete</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.close}><Text style={styles.closeText}>✕</Text></Pressable>
      </View>
      <View style={styles.barWrap}>
        <View style={styles.barTrack}>
          <LinearGradient colors={gradients.ocean} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.barFill, { width: `${Math.max(2, pathPct)}%` }]} />
        </View>
      </View>

      {/* Jump tiles — tap a level or a lesson topic to fly to that spot on the map */}
      <View style={styles.tileBlock}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tileScroll} contentContainerStyle={styles.tileRow}>
          {LEVEL_ORDER.map((t) => (
            <Pressable key={t} onPress={() => { setTier(t); scrollToSeg(segIndexFor(t, subjectsForLevel(t)[0])); }} style={[styles.levelTile, tier === t && styles.levelTileOn]}>
              <Text numberOfLines={1} style={[styles.levelTileText, tier === t && styles.levelTileTextOn]}>{tierLabel(t)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tileScroll} contentContainerStyle={styles.tileRow}>
          {subjectsForLevel(tier).map((subj) => (
            <Pressable key={subj} onPress={() => scrollToSeg(segIndexFor(tier, subj))} style={styles.topicTile}>
              <Text numberOfLines={1} style={styles.topicTileText}>{subjectLabel(subj)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        style={{ flex: 1 }}
        ref={listRef}
        data={segments}
        keyExtractor={(s) => `${s.tier}-${s.subject}`}
        renderItem={({ item }) => <Segment seg={item} progress={progress} here={here} avImg={avImg} onJumpTo={onJumpTo} />}
        getItemLayout={(_, index) => ({ length: heights[index], offset: offsets[index], index })}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => listRef.current?.scrollToOffset({ offset: offsets[index] ?? 0, animated: true }), 60);
        }}
      />
    </View>
  );
}

function Segment({ seg, progress, here, avImg, onJumpTo }: { seg: Seg; progress: Progress; here: PathStep | null; avImg: any; onJumpTo: (s: PathStep) => void }) {
  const { tier, subject, index } = seg;
  const N = lessonsFor(tier, subject); // this topic's lesson count
  const SEG_H = segHeight(tier, subject);
  const bg = SEG_BG[index % SEG_BG.length];
  const accent = SEG_ACCENT[index % SEG_ACCENT.length];
  // Blend toward the NEXT world's colour down the segment, so the whole map is
  // one continuous gradient flow (no hard colour line between levels/topics).
  const nextAccent = SEG_ACCENT[(index + 1) % SEG_ACCENT.length];
  const nextBg = SEG_BG[(index + 1) % SEG_BG.length];
  const roadId = `road-${index}`;
  const statusOf = (lesson: number): Status => {
    // "Here" (the avatar) wins even on a finished lesson you're replaying.
    if (here && here.subject === subject && here.tier === tier && here.lesson === lesson) return "current";
    if ((progress[subject]?.[tier] ?? 0) >= lesson) return "done";
    return "future";
  };
  const nodes = Array.from({ length: N }, (_, i) => ({ lesson: i + 1, x: CENTER + AMP * Math.sin(i * FREQ), y: HEADER + i * ROW_H }));
  const points = nodes.map((n) => ({ x: n.x, y: n.y }));
  const currentIndex = nodes.findIndex((n) => statusOf(n.lesson) === "current");
  const doneEnd = currentIndex >= 0 ? currentIndex : points.length;

  // Decorations scale with the segment length so a 100-lesson world is just as
  // full of avatars and music notes as a 20-lesson one (capped for performance).
  const roadSpan = N * ROW_H;
  // ~1 avatar per lesson and ~0.7 notes per lesson, so a 100-lesson world is as
  // packed as a 20-lesson one (avatars reuse ~32 cached images, so this is light).
  const avCount = Math.min(100, Math.max(10, Math.round(N * 1.0)));
  const avSpots = Array.from({ length: avCount }, (_, i) => {
    const r2 = hash(index * 131 + i * 2.3 + 5);
    const r3 = hash(index * 131 + i * 3.1 + 11);
    // Alternate sides so any two avatars on the SAME side are ~2 slots (≈180px)
    // apart — far more than the 48px avatar — so they never overlap. Small
    // vertical jitter + random horizontal offset keep it scattered, not columnar.
    return {
      side: (i % 2 === 0 ? "l" : "r") as "l" | "r",
      yF: Math.min(0.99, Math.max(0.02, (i + 0.5) / avCount + (r2 - 0.5) * (0.7 / avCount))),
      x: 4 + r3 * 60,
    };
  });
  const noteCount = Math.min(75, Math.max(8, Math.round(N * 0.72)));
  const noteSpots = Array.from({ length: noteCount }, (_, i) => {
    const r1 = hash(index * 197 + i * 2.1 + 3);
    const r2 = hash(index * 197 + i * 1.3 + 7);
    const r3 = hash(index * 197 + i * 3.7 + 13);
    const r4 = hash(index * 197 + i * 4.9 + 17);
    return {
      side: (r1 > 0.5 ? "r" : "l") as "l" | "r",
      yF: Math.min(0.98, Math.max(0.03, (i + 0.5) / noteCount + (r2 - 0.5) * (1.3 / noteCount))),
      x: 30 + r3 * 74,
      rot: Math.round((r4 - 0.5) * 34),
      size: 22 + Math.round(r2 * 12),
    };
  });

  // Tie-dye background: cycle the neon rainbow into many colour bands down the
  // segment (more bands on longer worlds) so the hue keeps shifting, then cross
  // it with a second, hue-shifted diagonal wash so the colours mix and swirl.
  const bands = Math.min(22, Math.max(5, Math.round(N / 6)));
  const washA = Array.from({ length: bands }, (_, k) => `${TIEDYE[(index * 2 + k) % TIEDYE.length]}59`) as [string, string, ...string[]];
  const washB = Array.from({ length: bands }, (_, k) => `${TIEDYE[(index * 2 + k + 4) % TIEDYE.length]}3B`) as [string, string, ...string[]];

  return (
    <View style={{ width: W, height: SEG_H }}>
      {/* Dark base for depth + text contrast */}
      <LinearGradient colors={[bg[0], bg[1], nextBg[0]]} locations={[0, 0.6, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Tie-dye wash 1: many rainbow bands flowing down (diagonal) */}
      <LinearGradient colors={washA} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Tie-dye wash 2: shifted hues on the opposite diagonal → colours mix */}
      <LinearGradient colors={washB} start={{ x: 0.9, y: 0.05 }} end={{ x: 0.1, y: 0.95 }} style={StyleSheet.absoluteFill} />

      <Svg width={W} height={SEG_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={roadId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent} />
            <Stop offset="1" stopColor={nextAccent} />
          </SvgGradient>
        </Defs>
        {/* Soft outer glow of the whole road */}
        <Path d={pointsToPath(points)} stroke={`url(#${roadId})`} strokeOpacity={0.16} strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Unlit road */}
        <Path d={pointsToPath(points)} stroke="rgba(150,190,220,0.18)" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Completed portion — glowing neon, blending colours down the path */}
        <Path d={pointsToPath(points.slice(0, doneEnd + 1))} stroke={`url(#${roadId})`} strokeOpacity={0.4} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={pointsToPath(points.slice(0, doneEnd + 1))} stroke={`url(#${roadId})`} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dotted guide */}
        <Path d={pointsToPath(points)} stroke="rgba(255,255,255,0.35)" strokeWidth={2} fill="none" strokeDasharray="1 13" strokeLinecap="round" />
      </Svg>

      {/* Lots of little Ritmo avatars all along the route */}
      {avSpots.map((spot, i) => (
        <Image
          key={i}
          source={avatarSource(SCENE_AV[(index * 7 + i) % SCENE_AV.length])}
          style={[styles.sceneAv, spot.side === "l" ? { left: spot.x } : { right: spot.x }, { top: HEADER + roadSpan * spot.yF, borderColor: RINGS[(index * 5 + i) % RINGS.length] }]}
        />
      ))}

      {/* Single glowing music notes along the route */}
      {noteSpots.map((n, i) => {
        const nc = NOTE_COLORS[(index + i) % NOTE_COLORS.length];
        return (
          <MaterialCommunityIcons
            key={"note" + i}
            name={NOTE_ICONS[(index + i) % NOTE_ICONS.length] as any}
            size={n.size}
            color={nc}
            style={[styles.note, { textShadowColor: nc }, n.side === "l" ? { left: n.x } : { right: n.x }, { top: HEADER + roadSpan * n.yF, transform: [{ rotate: `${n.rot}deg` }] }]}
          />
        );
      })}

      <View style={styles.band}><Text style={styles.bandText}>{subjectLabel(subject)} · {tierLabel(tier)}</Text></View>

      {nodes.map((n) => {
        const st = statusOf(n.lesson);
        return (
          <Pressable key={n.lesson} onPress={() => onJumpTo({ subject, tier, lesson: n.lesson })} style={[styles.nodeAbs, { top: n.y - NODE / 2, left: n.x - NODE / 2 }]}>
            {st === "current" ? (
              <View style={styles.currentWrap}>
                <View style={styles.youPill}><Text style={styles.youPillText}>YOU</Text></View>
                {avImg ? (
                  <Image source={avImg} style={styles.nodeAvatar} />
                ) : (
                  <View style={[styles.nodeCurrent, { shadowColor: "#fff" }]}>
                    <Text style={styles.nodeNum}>{n.lesson}</Text>
                  </View>
                )}
              </View>
            ) : st === "done" ? (
              <View style={[styles.nodeDone, { backgroundColor: accent, borderColor: accent, shadowColor: accent }]}>
                <Text style={styles.nodeCheck}>✓</Text>
              </View>
            ) : (
              <View style={[styles.nodeFuture, { borderColor: `${accent}88` }]}><Text style={[styles.nodeNumDim, { color: accent }]}>{n.lesson}</Text></View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: 6 },
  title: { color: colors.accent, fontSize: font.h1, fontWeight: "900" },
  sub: { color: colors.muted, fontSize: font.small, fontWeight: "700", marginTop: 2 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(7,11,19,0.5)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.accent },
  closeText: { color: colors.accent, fontSize: 18, fontWeight: "900" },
  barWrap: { paddingHorizontal: spacing.lg, paddingBottom: 8 },
  barTrack: { height: 10, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", borderWidth: 1, borderColor: "rgba(34,184,176,0.2)" },
  barFill: { height: "100%", borderRadius: 6 },
  tileBlock: { paddingBottom: 6 },
  tileScroll: { flexGrow: 0, height: 44 },
  tileRow: { paddingHorizontal: spacing.lg, alignItems: "center" },
  levelTile: { height: 34, marginRight: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", alignItems: "center", justifyContent: "center" },
  levelTileOn: { backgroundColor: "rgba(34,184,176,0.12)", borderColor: colors.accent, borderWidth: 1.5, shadowColor: colors.accent, shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  levelTileText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  levelTileTextOn: { color: colors.accent },
  topicTile: { height: 32, marginRight: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", alignItems: "center", justifyContent: "center" },
  topicTileText: { color: colors.ink, fontSize: 13, fontWeight: "700" },

  band: { position: "absolute", top: 18, left: 0, right: 0, alignItems: "center" },
  bandText: { color: "#fff", backgroundColor: "rgba(7,11,19,0.75)", borderWidth: 1.5, borderColor: "rgba(34,184,176,0.6)", borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18, fontSize: font.small, lineHeight: font.small + 7, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase", overflow: "hidden" },

  sceneAv: { position: "absolute", width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: "#fff", opacity: 0.98 },
  note: { position: "absolute", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },

  nodeAbs: { position: "absolute", width: NODE, height: NODE },
  nodeWrap: { width: NODE, height: NODE, alignItems: "center", justifyContent: "center" },
  nodeCurrent: { width: NODE + 10, height: NODE + 10, borderRadius: (NODE + 10) / 2, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", backgroundColor: "rgba(8,12,20,0.7)", shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
  nodeDone: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: "center", justifyContent: "center", borderWidth: 2, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  nodeFuture: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,12,20,0.55)", borderWidth: 1.5 },
  currentWrap: { width: NODE, height: NODE, alignItems: "center", justifyContent: "center" },
  nodeAvatar: { width: NODE + 14, height: NODE + 14, borderRadius: (NODE + 14) / 2, borderWidth: 3, borderColor: "#fff", backgroundColor: "rgba(8,12,20,0.7)", shadowColor: "#fff", shadowOpacity: 0.95, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 9 },
  nodeNum: { color: "#fff", fontSize: font.small, fontWeight: "900" },
  nodeNumDim: { color: "#fff", fontSize: font.small, fontWeight: "900" },
  nodeCheck: { color: "#06232B", fontSize: 18, fontWeight: "900" },
  youPill: { position: "absolute", bottom: -13, backgroundColor: "#000", borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(34,211,238,0.6)", paddingHorizontal: 6, paddingVertical: 1, zIndex: 2 },
  youPillText: { color: "#22D3EE", fontSize: 8, fontWeight: "500", letterSpacing: 0.3 },
});
