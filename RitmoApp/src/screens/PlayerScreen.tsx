import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { AudioPlayer, AudioStatus } from "expo-audio";
import * as Speech from "expo-speech";
import { Screen, ProgressBar, SubjectIcon } from "../components/ui";
import { colors, spacing, font, radius, gradients, gradientFor } from "../theme";
import { langCode, tierLabel } from "../data/presets";
import { PronouncePanel, QuizPanel, SpeakPanel } from "./LearnModes";
import { reportLine, songTitle } from "../lib/api";
import type { Song } from "../lib/api";
import type { CatalogFlag } from "../lib/storage";

export default function PlayerScreen({
  song,
  player,
  status,
  loop,
  shuffle,
  fontScale,
  onToggleLoop,
  onToggleShuffle,
  onBack,
  onToggleFavorite,
  onUseStyle,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  queuePos,
  isLesson = false,
  onFinishLesson,
  onNextLesson,
  onRate,
  canFlag = false,
  isLocked = false,
  flags = [],
  onToggleFlag,
}: {
  song: Song;
  player: AudioPlayer;
  status: AudioStatus;
  loop: boolean;
  fontScale: number;
  onToggleLoop: () => void;
  shuffle: boolean;
  onToggleShuffle: () => void;
  onBack: () => void;
  onToggleFavorite: () => void;
  onUseStyle: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  queuePos: string;
  isLesson?: boolean;
  onFinishLesson?: () => void;
  onNextLesson?: () => void;
  onRate?: (id: string, rating: number) => void;
  canFlag?: boolean;
  isLocked?: boolean;
  flags?: CatalogFlag[];
  onToggleFlag?: (flag: CatalogFlag) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [lyricsH, setLyricsH] = useState(300);
  const [mode, setMode] = useState<"lyrics" | "pronounce" | "quiz" | "speak">("lyrics");
  const lang = langCode(song.language);

  // Stop the spoken voice when switching tabs, changing songs, or leaving.
  useEffect(() => {
    Speech.stop();
    return () => {
      Speech.stop();
    };
  }, [mode, song.id]);

  const lineHeight = Math.round(27 * fontScale);
  const lineFont = Math.round(16 * fontScale);
  const activeFont = Math.round(19 * fontScale);

  const lines = useMemo(() => {
    let idx = -1;
    return song.lyrics
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => {
        const isTag = text.startsWith("[");
        if (!isTag) idx += 1;
        return { text, isTag, singableIndex: isTag ? -1 : idx, isEn: !isTag && idx % 2 === 1 };
      });
  }, [song.lyrics]);

  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;

  // Real karaoke timing: if this song was force-aligned we know the exact time
  // each line is sung. If not (e.g. alignment unavailable), fall back to a FREE
  // built-in estimate so the line always highlights — never depends on any quota.
  const timings = song.lineTimings;
  const hasReal = Array.isArray(timings) && timings.length > 0;

  // Free estimate: spread the singable lines across the vocal span of the track,
  // weighted by syllables, so the highlight follows roughly in time.
  const estStarts = useMemo(() => {
    if (hasReal || !duration) return null;
    const INTRO = 0.06, OUTRO = 0.08;
    const span = duration * (1 - INTRO - OUTRO);
    const weights: number[] = [];
    for (const l of lines) {
      if (l.isTag) continue;
      const syll = (l.text.toLowerCase().match(/[aeiouyáéíóúü]+/g) || []).length;
      weights.push(Math.max(1, syll || l.text.split(/\s+/).length));
    }
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return weights.map((w) => {
      const s = duration * INTRO + (acc / total) * span;
      acc += w;
      return s;
    });
  }, [lines, duration, hasReal]);

  // When using the free estimate, let the user tap the line being sung to snap
  // the timing to it (fixes any drift instantly). Offset resets per song.
  const [estOffset, setEstOffset] = useState(0);
  useEffect(() => setEstOffset(0), [song.id]);
  const syncEst = (singableIdx: number) => {
    if (hasReal || !estStarts || estStarts[singableIdx] == null) return;
    setEstOffset(currentTime - estStarts[singableIdx]);
  };

  const hasTimings = hasReal || !!estStarts;
  let activeSingable = -1;
  if (hasReal) {
    for (let k = 0; k < timings!.length; k++) {
      const t = timings![k];
      if (!t) continue;
      if (t.start <= currentTime) activeSingable = k;
      else break;
    }
  } else if (estStarts) {
    const t = currentTime - estOffset;
    for (let k = 0; k < estStarts.length; k++) {
      if (estStarts[k] <= t) activeSingable = k;
      else break;
    }
  }

  // Auto-scroll follows the singing but always yields to touch: any touch pauses
  // it for a few seconds so you can scroll and read freely, then it resumes.
  const userScrolling = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseAuto = () => {
    userScrolling.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { userScrolling.current = false; }, 5000);
  };

  const lineYs = useRef<number[]>([]);
  useEffect(() => {
    if (mode !== "lyrics" || !hasTimings || !status.playing || userScrolling.current) return;
    const i = lines.findIndex((l) => l.singableIndex === activeSingable);
    const y0 = lineYs.current[i];
    if (i < 0 || y0 == null || !scrollRef.current) return;
    scrollRef.current.scrollTo({ y: Math.max(0, y0 - lyricsH * 0.4), animated: true });
  }, [activeSingable, hasTimings, status.playing, lyricsH, mode]);

  // Start at the top of the lyrics whenever a new song loads.
  useEffect(() => {
    lineYs.current = [];
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [song.id]);

  const togglePlay = () => (status.playing ? player.pause() : player.play());

  function report(line: string) {
    Alert.alert("Report this line?", `"${line}"\n\nFlag it as incorrect or unnatural and we'll review it.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          await reportLine({ songId: song.id, line, subject: song.subject, language: song.language });
          Alert.alert("Thanks!", "We'll review this line.");
        },
      },
    ]);
  }
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.hSide}><Text style={styles.back}>‹</Text></Pressable>
        <View style={styles.hCenter}>
          <Text style={styles.title} numberOfLines={1}>{songTitle(song)}</Text>
          <Text style={styles.meta} numberOfLines={1}>{[song.genre, tierLabel(song.level)].filter(Boolean).join(" · ")}</Text>
        </View>
        <View style={styles.hActions}>
          {onRate && (
            <>
              <Pressable onPress={() => onRate(song.id, 1)} hitSlop={8}>
                <Text style={[styles.rate, song.rating === 1 && styles.rateOn]}>👍</Text>
              </Pressable>
              <Pressable onPress={() => onRate(song.id, -1)} hitSlop={8}>
                <Text style={[styles.rate, song.rating === -1 && styles.rateOn]}>👎</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={onToggleFavorite} hitSlop={8}>
            <Text style={[styles.heart, song.favorite && styles.heartOn]}>{song.favorite ? "♥" : "♡"}</Text>
          </Pressable>
        </View>
      </View>

      {isLocked && (
        <View style={styles.lockedBar}>
          <View style={styles.lockedDot} />
          <Text style={styles.lockedText}>Locked — you've already kept this one</Text>
        </View>
      )}

      {canFlag && onToggleFlag && (
        <View style={styles.flagBar}>
          <PlayerFlagBtn label="🔒 Lock" tone="lock" on={flags.includes("lock")} onPress={() => onToggleFlag("lock")} />
          <PlayerFlagBtn label="🔄 Reroll" tone="reroll" on={flags.includes("reroll")} onPress={() => onToggleFlag("reroll")} />
          <PlayerFlagBtn label={`⚠️ Not ${song.genre || "genre"}`} tone="bad" on={flags.includes("badgenre")} onPress={() => onToggleFlag("badgenre")} />
        </View>
      )}

      <View style={styles.artWrap}>
        <View style={[styles.art, { borderColor: `${gradientFor(song.subject)[0]}66` }]}>
          <SubjectIcon subject={song.subject} size={48} color={gradientFor(song.subject)[0]} />
        </View>
      </View>

      <View style={styles.controls}>
        <ProgressBar pct={pct} />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{fmt(currentTime)}</Text>
          <Text style={styles.time}>{fmt(duration)}</Text>
        </View>
        <View style={styles.buttons}>
          <Pressable onPress={onToggleShuffle} hitSlop={8}>
            <Text style={[styles.loop, shuffle && styles.loopOn]}>🔀</Text>
          </Pressable>
          <Pressable onPress={onToggleLoop} hitSlop={8}>
            <Text style={[styles.loop, loop && styles.loopOn]}>🔁</Text>
          </Pressable>
          <Pressable onPress={onPrev} hitSlop={8} disabled={!hasPrev}>
            <Text style={[styles.skip, !hasPrev && styles.disabled]}>⏮</Text>
          </Pressable>
          {/* Restart — start the song over from the beginning, even partway through. */}
          <Pressable onPress={() => player.seekTo(0)} hitSlop={8}>
            <Text style={styles.restart}>↺</Text>
          </Pressable>
          <Pressable onPress={togglePlay}>
            <LinearGradient colors={gradients.primary} style={styles.playBtn}>
              <Text style={styles.playText}>{status.playing ? "❚❚" : "▶"}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={hasNext ? onNext : onNextLesson}
            hitSlop={8}
            disabled={!hasNext && !(isLesson && !!onNextLesson)}
          >
            <Text style={[styles.skip, !hasNext && !(isLesson && !!onNextLesson) && styles.disabled]}>⏭</Text>
          </Pressable>
          <Pressable onPress={onUseStyle} hitSlop={8}>
            <Text style={styles.styleBtn}>🎚️</Text>
          </Pressable>
        </View>
        {queuePos !== "" && <Text style={styles.loopNote}>🎶 Playing {queuePos} in queue{loop ? " · repeat on" : ""}</Text>}
        {queuePos === "" && loop && <Text style={styles.loopNote}>🔁 Repeat is on — the song will keep playing.</Text>}
      </View>

      <View style={styles.modeRow}>
        {([
          ["lyrics", "📖", "Lyrics"],
          ["pronounce", "🔊", "Say it"],
          ["quiz", "❓", "Quiz"],
          ["speak", "🎤", "Speak"],
        ] as const).map(([m, icon, label]) => {
          const on = mode === m;
          return (
            <Pressable key={m} style={{ flex: 1 }} onPress={() => setMode(m)}>
              <View style={[styles.modeTile, on && styles.modeTileOn]}>
                <Text style={styles.modeIcon}>{icon}</Text>
                <Text style={[styles.modeLabel, on && styles.modeLabelOn]}>{label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {mode === "lyrics" && (
        <>
          {hasTimings && (
            <Text style={styles.karaokeHint}>
              {hasReal ? "🎤 Karaoke — the glowing line follows the song" : "🎤 Karaoke — tap the line being sung to line it up"}
            </Text>
          )}
          <ScrollView
            ref={scrollRef}
            style={styles.lyrics}
            onLayout={(e) => setLyricsH(e.nativeEvent.layout.height)}
            contentContainerStyle={{ paddingVertical: 12 }}
            onScrollBeginDrag={pauseAuto}
            onTouchStart={pauseAuto}
          >
            {lines.map((l, i) =>
              l.isTag ? (
                <Text key={i} onLayout={(e) => (lineYs.current[i] = e.nativeEvent.layout.y)} style={styles.tag}>
                  {l.text.replace(/[\[\]]/g, "").toUpperCase()}
                </Text>
              ) : (
                <Text
                  key={i}
                  onLayout={(e) => (lineYs.current[i] = e.nativeEvent.layout.y)}
                  onPress={() => syncEst(l.singableIndex)}
                  onLongPress={() => report(l.text)}
                  style={[
                    { fontSize: lineFont, lineHeight, color: colors.ink, fontWeight: "600" },
                    hasTimings && status.playing && l.singableIndex === activeSingable && styles.lineNow,
                  ]}
                >
                  {l.text}
                </Text>
              )
            )}
          </ScrollView>
        </>
      )}
      {mode === "pronounce" && <PronouncePanel vocab={song.vocab} lang={lang} />}
      {mode === "quiz" && <QuizPanel vocab={song.vocab} lang={lang} />}
      {mode === "speak" && <SpeakPanel vocab={song.vocab} lang={lang} />}

      {isLesson && onFinishLesson && (
        <Pressable onPress={onFinishLesson} style={styles.finishLesson}>
          <LinearGradient colors={gradients.mint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.finishLessonBtn}>
            <Text style={styles.finishLessonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              ✓  Finish lesson — check what you learned
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </Screen>
  );
}

function fmt(sec: number) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlayerFlagBtn({ label, on, tone, onPress }: { label: string; on: boolean; tone: "lock" | "reroll" | "bad"; onPress: () => void }) {
  const onStyle = tone === "lock" ? styles.pflagLock : tone === "reroll" ? styles.pflagReroll : styles.pflagBad;
  return (
    <Pressable onPress={onPress} hitSlop={4} style={{ flex: 1 }}>
      <View style={[styles.pflag, on && onStyle]}>
        <Text style={[styles.pflagText, on && styles.pflagTextOn]} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingTop: 44, paddingHorizontal: spacing.md },
  lockedBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: spacing.md, marginTop: 10 },
  lockedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#37D67A", shadowColor: "#37D67A", shadowOpacity: 0.7, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  lockedText: { color: "#37D67A", fontSize: font.small, fontWeight: "800" },
  flagBar: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.md, marginTop: 10 },
  pflag: { borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 8, alignItems: "center", backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  pflagText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  pflagTextOn: { color: "#04121f" },
  pflagLock: { backgroundColor: "#37D67A", borderColor: "#37D67A" },
  pflagReroll: { backgroundColor: "#3AA0FF", borderColor: "#3AA0FF" },
  pflagBad: { backgroundColor: "#F5A623", borderColor: "#F5A623" },
  hSide: { width: 40, alignItems: "flex-start" },
  hSideRight: { width: 40, alignItems: "flex-end" },
  hActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  rate: { fontSize: 19, opacity: 0.35 },
  rateOn: { opacity: 1 },
  hCenter: { flex: 1, alignItems: "center" },
  back: { color: colors.ink, fontSize: 30, fontWeight: "800" },
  heart: { color: colors.muted, fontSize: 24 },
  heartOn: { color: colors.pink },
  title: { color: colors.ink, fontSize: font.h3, fontWeight: "900" },
  meta: { color: colors.coral, fontSize: font.small, marginTop: 2, textTransform: "capitalize" },
  artWrap: { alignItems: "center", marginTop: spacing.xs },
  art: { width: 66, height: 66, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  artEmoji: { fontSize: 30 },
  controls: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  time: { color: colors.muted, fontSize: font.small },
  buttons: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10 },
  loop: { fontSize: 22, opacity: 0.4 },
  loopOn: { opacity: 1 },
  skip: { color: colors.ink, fontSize: 24, fontWeight: "900" },
  restart: { color: colors.accent, fontSize: 24, fontWeight: "900" },
  disabled: { opacity: 0.25 },
  styleBtn: { fontSize: 22 },
  playBtn: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  playText: { color: "#E6EAF0", fontSize: 22, fontWeight: "900" },
  loopNote: { color: colors.muted, fontSize: font.small, textAlign: "center", marginTop: 8 },
  modeRow: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  modeTile: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 3, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingVertical: 3, paddingHorizontal: 5 },
  modeTileOn: { borderColor: colors.accent, backgroundColor: colors.card2 },
  modeIcon: { fontSize: 11 },
  modeLabel: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  modeLabelOn: { color: colors.pink },
  lyrics: { flex: 1, marginTop: 8, marginHorizontal: spacing.lg },
  tag: { color: colors.accent, fontSize: font.small, fontWeight: "900", letterSpacing: 1.5, marginTop: 14, marginBottom: 4 },
  lineEn: { fontStyle: "italic", opacity: 0.7 },
  lineNow: { color: "#FFE9A8", fontWeight: "900", opacity: 1, backgroundColor: "rgba(228,184,76,0.22)", borderRadius: 8, overflow: "hidden" },
  karaokeHint: { color: colors.muted, fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 8 },
  finishLesson: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 12 },
  finishLessonBtn: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  finishLessonText: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900" },
});
