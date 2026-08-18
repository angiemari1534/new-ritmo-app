import React, { useState, useEffect, useRef } from "react";
import { Text, View, StyleSheet, ScrollView, Pressable, Image, Modal, ActivityIndicator, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen, SectionHeader, ArtTile, ProgressBar, SubjectIcon, GradientText } from "../components/ui";
import { colors, spacing, font, radius, gradients, gradientFor } from "../theme";
import { STARTER_RECIPES, SongSpec, subjectLabel, tierLabel, LEVEL_ORDER, type PathStep } from "../data/presets";
import { songTitle } from "../lib/api";
import type { Song } from "../lib/api";
import type { Playlist, HomeSections } from "../lib/storage";

// A neon halo for an icon in the given color.
const glow = (c: string) => ({ textShadowColor: c, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 });

// One clearly-distinct colour per hue family (red, orange, amber, lime, green,
// cyan, blue, purple, fuchsia, pink), interleaved warm/cool so no two adjacent
// tiles look alike and there's only ONE of each "blue" or "purple".
const NEON = ["#D8A43A", "#C4622E", "#7C8A4A", "#B98A2E", "#BF6B4A", "#CC9544", "#A0522D", "#9AA46A", "#E0B450", "#8A6D3B"];

export default function HomeScreen({
  songs,
  current = null,
  streak,
  reviewCount,
  language = "Spanish",
  sections,
  favorites,
  playlists,
  homeLevels = [],
  nextUp,
  pathPct = 0,
  busy = false,
  ready = false,
  onContinue,
  onOpenJourney,
  onOpenDictionary,
  onCreate,
  onOpenSong,
  onPlayRecipe,
  onPlayPlaylist,
  onPlayList,
  onOpenFlashcards,
  onSurprise,
  onOpenFavorites,
}: {
  songs: Song[];
  current?: Song | null;
  streak: number;
  reviewCount: number;
  language?: string;
  sections: HomeSections;
  favorites: Song[];
  playlists: Playlist[];
  homeLevels?: string[];
  nextUp: PathStep | null;
  pathPct?: number;
  busy?: boolean;
  ready?: boolean;
  onContinue: () => void;
  onOpenJourney: () => void;
  onOpenDictionary: () => void;
  onCreate: () => void;
  onOpenSong: (s: Song) => void;
  onPlayRecipe: (spec: SongSpec) => void;
  onPlayPlaylist: (pl: Playlist) => void;
  onPlayList: (songs: Song[]) => void;
  onOpenFlashcards: () => void;
  onSurprise: () => void;
  onOpenFavorites: () => void;
}) {
  // The "Current song" tile shows what's actually playing; if nothing is playing,
  // it falls back to the most recent song.
  const latest = current ?? songs[0];
  const [openList, setOpenList] = useState<{ title: string; songs: Song[] } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const openSongs = openList?.songs ?? [];
  const levelsPresent = LEVEL_ORDER.filter((l) => homeLevels.includes(l) && songs.some((s) => s.level === l));

  const favTile = sections.favorites && favorites.length > 0;
  const levelTiles = sections.levels ? levelsPresent : [];
  const plTiles = sections.playlists ? playlists : [];

  // Gently pulse the Continue tile when the next lesson is ready to play.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (ready && !busy) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.04, duration: 750, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => { loop.stop(); pulse.setValue(1); };
    }
    pulse.setValue(1);
  }, [ready, busy]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <GradientText text="Ritmo" style={styles.brandText} colors={["#C4622E", "#D8A43A", "#EDE0C8"]} />
            <MaterialCommunityIcons name="music" size={22} color="#D8A43A" style={{ marginLeft: 6 }} />
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={onOpenDictionary} style={styles.searchBtn} hitSlop={8}>
              <MaterialCommunityIcons name="magnify" size={22} color={colors.accent} style={styles.iconGlowTeal} />
            </Pressable>
            <View style={styles.streak}>
              <Text style={styles.streakText}>🔥 {streak}</Text>
            </View>
          </View>
        </View>

        <GradientText text="LEARN LANGUAGES, FEEL THE RHYTHM" style={styles.tagline} colors={["#C4622E", "#D8A43A", "#EDE0C8"]} />
        <Text style={styles.hiSub} numberOfLines={1}>{language} · through songs</Text>

        {/* How to use Ritmo — quick intro guide, on top */}
        <Pressable onPress={() => setGuideOpen(true)} style={styles.howToBtn}>
          <MaterialCommunityIcons name="help-circle-outline" size={22} color={colors.gold} style={styles.iconGlowGold} />
          <Text style={styles.howToText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>New here? How to use Ritmo</Text>
          <Text style={styles.howToChev}>›</Text>
        </Pressable>

        {/* Journey map */}
        <Pressable onPress={onOpenJourney} style={styles.journeyBtn}>
          <MaterialCommunityIcons name="map-marker-path" size={28} color={colors.accent} style={styles.iconGlowTeal} />
          <Text style={styles.journeyBtnText}>See your journey map</Text>
          <Text style={styles.journeyChev}>›</Text>
        </Pressable>

        {/* Continue + Memory Mix — dark tiles with neon borders */}
        <View style={styles.dualRow}>
          <Animated.View style={[styles.dualWrapTeal, ready && !busy ? { transform: [{ scale: pulse }] } : null]}>
            <Pressable onPress={onContinue} disabled={busy} style={{ flex: 1 }}>
              <LinearGradient colors={["rgba(3,5,10,0.4)", "rgba(3,5,10,0.4)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dualTileTeal}>
                <MaterialCommunityIcons name="chat-processing" size={22} color="#D8A43A" style={styles.dualIcon} />
                <Text style={styles.dualKickerTeal} numberOfLines={2} ellipsizeMode="tail">{busy ? "PREPARING…" : nextUp ? "CONTINUE CURRENT LESSON" : "PATH COMPLETE 🎉"}</Text>
                <Text style={styles.dualTitle} numberOfLines={1} ellipsizeMode="tail">
                  {busy ? "Building…" : nextUp ? subjectLabel(nextUp.subject) : "Path done!"}
                </Text>
                <Text style={styles.dualSubTeal} numberOfLines={1} ellipsizeMode="tail">
                  {busy ? "one minute" : nextUp ? `${tierLabel(nextUp.tier)} · L${nextUp.lesson}` : "make your own"}
                </Text>
                <View style={{ marginTop: 8 }}><ProgressBar pct={pathPct} /></View>
                <View style={styles.dualBottom}>
                  <Text style={styles.dualPctTeal}>{pathPct}%</Text>
                  <View style={styles.dualPlayTeal}>
                    {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dualPlayIcon}>▶</Text>}
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {sections.memory && (
            <Pressable onPress={onOpenFlashcards} style={styles.dualWrapPurple}>
              <LinearGradient colors={["rgba(3,5,10,0.4)", "rgba(3,5,10,0.4)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dualTilePurple}>
                <Text style={styles.dualEmoji}>🧠</Text>
                <Text style={styles.dualTitle} numberOfLines={1}>Memory Mix</Text>
                <Text style={styles.dualSubPurple} numberOfLines={2}>{reviewCount > 0 ? `${reviewCount} words to review` : "Words appear here"}</Text>
                <View style={{ marginTop: 8 }}><ProgressBar pct={Math.min(100, reviewCount * 5)} /></View>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Playlist — Favorites first, then the playlists you selected */}
        {(favTile || levelTiles.length > 0 || plTiles.length > 0) && (
          <>
            <SectionHeader title="Playlist" />
            <View style={styles.grid}>
              {favTile && (
                <Pressable style={styles.gridCell} onPress={onOpenFavorites}>
                  <View style={[styles.gridTile, { borderColor: NEON[0], shadowColor: NEON[0] }]}>
                    <MaterialCommunityIcons name="heart" size={26} color={NEON[0]} style={glow(NEON[0])} />
                  </View>
                  <Text style={styles.gridLabel} numberOfLines={2} ellipsizeMode="tail">Favorites</Text>
                </Pressable>
              )}
              {levelTiles.map((lv, i2) => {
                const levelSongs = songs.filter((s) => s.level === lv);
                const C = NEON[((favTile ? 1 : 0) + i2) % NEON.length];
                return (
                  <Pressable key={lv} style={styles.gridCell} onPress={() => setOpenList({ title: tierLabel(lv), songs: levelSongs })}>
                    <View style={[styles.gridTile, { borderColor: C, shadowColor: C }]}>
                      <MaterialCommunityIcons name={lv === "starter" ? "seed" : lv === "beginner" ? "sprout" : lv === "intermediate" ? "chat-processing" : "star-four-points"} size={26} color={C} style={glow(C)} />
                    </View>
                    <Text style={styles.gridLabel} numberOfLines={2} ellipsizeMode="tail">{tierLabel(lv)}</Text>
                  </Pressable>
                );
              })}
              {plTiles.map((pl, i3) => {
                const plSongs = pl.songIds.map((id) => songs.find((s) => s.id === id)).filter((s): s is Song => !!s);
                const C = NEON[((favTile ? 1 : 0) + levelTiles.length + i3) % NEON.length];
                return (
                  <Pressable key={pl.id} style={styles.gridCell} onPress={() => setOpenList({ title: pl.name, songs: plSongs })}>
                    <View style={[styles.gridTile, { borderColor: C, shadowColor: C }]}>
                      <SubjectIcon subject={plSongs[0]?.subject ?? "__playlist"} size={24} color={C} />
                    </View>
                    <Text style={styles.gridLabel} numberOfLines={2} ellipsizeMode="tail">{pl.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Current song */}
        {sections.continueLearning && latest && (
          <Pressable onPress={() => onOpenSong(latest)} style={{ marginTop: spacing.lg }}>
            <LinearGradient colors={["rgba(3,5,10,0.3)", "rgba(3,5,10,0.3)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <ArtTile subject={latest.subject} size={40} colors={gradientFor(latest.subject)} rounded={radius.md} />
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>CURRENT SONG</Text>
                <Text style={styles.heroTitle} numberOfLines={1}>{songTitle(latest)}</Text>
                <Text style={styles.heroMeta} numberOfLines={1}>{[latest.genre, tierLabel(latest.level)].filter(Boolean).join(" · ")}</Text>
              </View>
              <LinearGradient colors={["#C4622E", "#A0522D"]} style={styles.playBtn}>
                <Text style={styles.playIcon}>▶</Text>
              </LinearGradient>
            </LinearGradient>
          </Pressable>
        )}

        <Pressable onPress={onSurprise} style={styles.surprise}>
          <View style={styles.surpriseIcon}><Text style={styles.surpriseDice}>🎲</Text></View>
          <Text style={styles.surpriseText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Surprise me — make a random song</Text>
          <Text style={styles.surpriseChev}>›</Text>
        </Pressable>

        {sections.madeForYou && (
          <>
            <SectionHeader title="Made for you" />
            <View style={styles.grid}>
              {STARTER_RECIPES.map((r, i) => {
                const C = NEON[((favTile ? 1 : 0) + levelTiles.length + plTiles.length + i) % NEON.length];
                return (
                <Pressable key={i} style={styles.gridCell} onPress={() => onPlayRecipe(r)}>
                  <View style={[styles.gridTile, { borderColor: C, shadowColor: C }]}>
                    <SubjectIcon subject={r.subject} size={24} color={C} />
                  </View>
                  <Text style={styles.gridLabel} numberOfLines={2} ellipsizeMode="tail">{subjectLabel(r.subject)}</Text>
                </Pressable>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={openList !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenList(null)}
      >
        <Pressable style={pl.backdrop} onPress={() => setOpenList(null)} />
        <View style={pl.card}>
          <View style={pl.handle} />
          <Text style={pl.title} numberOfLines={1}>{openList?.title}</Text>
          <Text style={pl.sub}>{openSongs.length} song{openSongs.length === 1 ? "" : "s"}</Text>

          {openSongs.length > 0 && (
            <Pressable
              onPress={() => { onPlayList(openSongs); setOpenList(null); }}
            >
              <LinearGradient colors={gradients.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pl.playAll}>
                <Text style={pl.playAllText}>▶  Play all</Text>
              </LinearGradient>
            </Pressable>
          )}

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {openSongs.length === 0 ? (
              <Text style={pl.empty}>Nothing here yet — create some songs and they'll show up.</Text>
            ) : (
              openSongs.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => { onOpenSong(s); setOpenList(null); }}
                >
                  <View style={pl.songRow}>
                    <ArtTile subject={s.subject} size={44} colors={gradientFor(s.subject)} rounded={radius.sm} />
                    <View style={{ flex: 1 }}>
                      <Text style={pl.songTitle} numberOfLines={1}>{songTitle(s)}</Text>
                      <Text style={pl.songMeta} numberOfLines={1}>{[s.genre, tierLabel(s.level)].filter(Boolean).join(" · ")}</Text>
                    </View>
                    <Text style={pl.songPlay}>▶</Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          <Pressable onPress={() => setOpenList(null)} style={pl.close}>
            <Text style={pl.closeText}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {/* How-to-use guide */}
      <Modal visible={guideOpen} transparent animationType="slide" onRequestClose={() => setGuideOpen(false)}>
        <Pressable style={pl.backdrop} onPress={() => setGuideOpen(false)} />
        <LinearGradient colors={["rgba(13,9,24,0.82)", "rgba(6,4,9,0.88)"]} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={[pl.card, guide.modalCard]}>
          <View style={guide.handle} />
          <Text style={guide.modalTitle}>🎵  How to use Ritmo  🎵</Text>
          <Text style={guide.modalSub}>Learn {language} by listening to songs you can actually sing along to.</Text>
          <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
            <View style={guide.bestBox}>
              <Text style={guide.bestTitle}>Ritmo</Text>
              <Text style={guide.bestIntro}>Best way to learn: start at the very beginning of your journey and go in order — each lesson builds on the last. A few minutes every day beats one long cram session. For each song, try this:</Text>
              {BEST_STEPS.map((s, i) => (
                <View key={i} style={guide.numRow}>
                  <LinearGradient colors={["#22D3EE", "#A78BFA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={guide.numRing}>
                    <View style={guide.numInner}><Text style={guide.numText}>{i + 1}</Text></View>
                  </LinearGradient>
                  <Text style={guide.numBody}>{s}</Text>
                </View>
              ))}
              <Text style={guide.bestClose}>Already know every word in a song? Press the ⏭ (skip forward) button in the player to jump straight to the next lesson. Set a daily goal in Profile and aim to finish at least one lesson a day — small steps add up fast. Then come back to Memory Mix every few days, and replay the songs you love — that’s when the words really stick.</Text>
            </View>
            {GUIDE_STEPS.map((g, i) => (
              <View key={i} style={guide.row}>
                <Text style={guide.emoji}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={guide.stepTitle}>{g.title}</Text>
                  <Text style={guide.stepBody}>{g.body}</Text>
                </View>
              </View>
            ))}
            <Text style={guide.tip}>💡 Tip: give songs a 👍 or 👎 in the player — Ritmo uses it to make more of what you like.</Text>
          </ScrollView>
          <Pressable onPress={() => setGuideOpen(false)} style={guide.gotIt}>
            <Text style={guide.gotItText}>Got it!</Text>
          </Pressable>
        </LinearGradient>
      </Modal>
    </Screen>
  );
}

// The 4 quick "best way to learn" steps, shown as numbered circles.
const BEST_STEPS = [
  "Play it once just to enjoy the music.",
  "Play it again and sing along while you read the lyrics.",
  "Tap “Say it” and “Speak” to say the new words out loud.",
  "Put it on repeat (🔁) in the background during your day.",
];

// The step-by-step intro shown by the "How to use Ritmo" button.
const GUIDE_STEPS = [
  {
    emoji: "🚀",
    title: "Start your journey",
    body:
      "Best way to learn: start at the very beginning of your journey and go in order — each lesson builds on the last. A few minutes every day beats one long cram session, so aim to finish at least one lesson a day. Tap the blue “Continue” tile on Home to jump right into your next lesson, or open “See your journey map” to view the whole path and pick any spot.",
  },
  {
    emoji: "▶️",
    title: "1. Continue your lesson",
    body:
      "Every time you open Ritmo, the blue “Continue” tile on the Home screen shows the exact lesson you’re up to. Tap it and your lesson song starts playing right away — no searching or picking. When the song ends, tap “Finish lesson” to lock in your progress. Ritmo then quietly builds your next lesson so it’s ready and waiting the next time. The little bar on the tile shows how far you’ve come on your whole journey.",
  },
  {
    emoji: "🗺️",
    title: "2. Your journey map",
    body:
      "Tap “See your journey map” to see your whole path as one long, colorful road that flows through every level, topic, and lesson. Every spot on the road already has a built-in song made for that exact level, topic, and lesson — just tap a spot and its song starts playing. Your current spot is marked with your avatar; finished lessons show a gold check. Best way to learn is to start at the very beginning and move forward one lesson at a time. To jump around, use the tiles at the top: tap a level (like First Words), then a topic (like Food), and the map scrolls right to it. Want your own version of a lesson? You can create one anytime — the built-in song always stays there.",
  },
  {
    emoji: "🎧",
    title: "3. Play and sing along",
    body:
      "When a song plays you land on the player. The lyrics scroll down the screen and the line being sung lights up gold, so you can follow along karaoke-style. Every line appears in both languages — first the language you’re learning, then English — so you hear it and understand it at the same time. You can scroll the lyrics yourself whenever you like. Use the play/pause and repeat (🔁) buttons at the top to control the song. When you already know all the words, tap the ⏭ button to jump straight to the next lesson.",
  },
  {
    emoji: "🎯",
    title: "4. Practice what you heard",
    body:
      "Just under the song controls are four tabs: Lyrics, Say it, Quiz, and Speak. “Say it” plays a slow, clear voice reading each word so you can repeat after it. “Quiz” checks whether you remember what the words mean. “Speak” lets you say the words out loud to practice your pronunciation. Tap between them anytime while the song is open.",
  },
  {
    emoji: "➕",
    title: "5. Create your own song",
    body:
      "Tap the “Create” tab at the bottom to make a brand-new song about anything you want. Type a topic (like “ordering coffee” or “at the airport”) or pick one of the suggestions, then choose a music genre, a mood, and a level. Tap create and Ritmo writes the lyrics and sings you a full song in about a minute. It’s saved to your Library automatically.",
  },
  {
    emoji: "🎲",
    title: "6. Surprise me",
    body:
      "Not sure what to learn today? Tap “Surprise me — make a random song” on the Home screen. Ritmo picks a fresh topic and music style for you and makes a new song, so there’s always something new to listen to.",
  },
  {
    emoji: "🧠",
    title: "7. Memory Mix",
    body:
      "As you learn, Ritmo remembers the words you’ve seen. The “Memory Mix” tile on Home gathers those words back up for a quick review — a few at a time — so they move into your long-term memory instead of slipping away. Tap it whenever you want a fast refresher.",
  },
  {
    emoji: "♫",
    title: "8. Your Library",
    body:
      "The “Library” tab at the bottom holds every song you’ve made. Tap a song to play it, tap the heart ♥ to save it to Favorites, or press and hold / use the menu to rename it, remake it in a new style, or add it to a playlist. Use the search bar at the top of the Library to find any song quickly.",
  },
  {
    emoji: "🔎",
    title: "9. Look up any word",
    body:
      "Tap the magnifying-glass icon at the top of the Home screen to open the dictionary. Type any word in either language and Ritmo shows you what it means; tap the speaker to hear it out loud. Switch between Spanish and English with the buttons at the bottom, and use the A–Z list along the side to browse.",
  },
  {
    emoji: "👤",
    title: "10. Make it yours",
    body:
      "Open the “Profile” tab to set things up your way: choose your language, tell Ritmo your favorite genres, moods, artists and songs (so new songs match your taste), set a daily goal, and make the lyrics text bigger or smaller. This is also where you tap “Add karaoke to my older songs” to line up the words on songs you made before.",
  },
];

const pl = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  card: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.bg2, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 34, borderTopWidth: 1, borderColor: colors.line },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  title: { color: colors.ink, fontSize: font.h2, fontWeight: "900" },
  sub: { color: colors.muted, fontSize: font.small, fontWeight: "700", marginTop: 2, marginBottom: 12 },
  playAll: { borderRadius: radius.md, paddingVertical: 13, alignItems: "center", marginBottom: 12 },
  playAllText: { color: "#E6EAF0", fontWeight: "900", fontSize: font.body },
  empty: { color: colors.muted, fontSize: font.body, textAlign: "center", paddingVertical: 24 },
  songRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(7,11,19,0.5)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", padding: 10, marginBottom: 8 },
  songTitle: { color: colors.ink, fontSize: font.body, fontWeight: "800" },
  songMeta: { color: colors.muted, fontSize: font.small, marginTop: 2, textTransform: "capitalize" },
  songPlay: { color: colors.ink, fontSize: 18, paddingHorizontal: 8 },
  close: { marginTop: 10, alignItems: "center", paddingVertical: 12 },
  closeText: { color: colors.muted, fontSize: font.body, fontWeight: "800" },
});

const guide = StyleSheet.create({
  modalCard: { borderColor: "rgba(167,139,250,0.35)", borderWidth: 1, shadowColor: "#C4622E", shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(167,139,250,0.4)", alignSelf: "center", marginBottom: 12 },
  modalTitle: { color: colors.accent, fontSize: font.h2, fontWeight: "900" },
  modalSub: { color: "rgba(255,255,255,0.6)", fontSize: font.small, fontWeight: "700", marginTop: 2, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "rgba(124,77,255,0.08)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(167,139,250,0.28)", padding: 12, marginBottom: 8 },
  emoji: { fontSize: 22, width: 28, textAlign: "center" },
  stepTitle: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900" },
  stepBody: { color: "rgba(255,255,255,0.78)", fontSize: font.small, fontWeight: "600", marginTop: 3, lineHeight: font.small + 6 },
  tip: { color: colors.gold, fontSize: font.small, fontWeight: "800", marginTop: 4, marginBottom: 4, lineHeight: font.small + 6 },
  bestBox: { backgroundColor: "rgba(124,77,255,0.08)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(34,184,176,0.4)", padding: 14, marginBottom: 12 },
  bestTitle: { color: colors.accent, fontSize: font.h3, fontWeight: "900" },
  bestIntro: { color: "rgba(255,255,255,0.85)", fontSize: font.small, fontWeight: "600", marginTop: 4, marginBottom: 10, lineHeight: font.small + 6 },
  numRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  numRing: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  numInner: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#0A0714", alignItems: "center", justifyContent: "center" },
  numText: { color: "#E6EAF0", fontSize: font.small, fontWeight: "900" },
  numBody: { flex: 1, color: "rgba(255,255,255,0.9)", fontSize: font.small, fontWeight: "600", lineHeight: font.small + 5 },
  bestClose: { color: "rgba(255,255,255,0.8)", fontSize: font.small, fontWeight: "600", marginTop: 4, lineHeight: font.small + 6 },
  gotIt: { marginTop: 12, alignItems: "center", paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: "rgba(34,184,176,0.1)" },
  gotItText: { color: colors.accent, fontSize: font.body, fontWeight: "900" },
});

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 60 },
  howToBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(3,5,10,0.3)", borderWidth: 1.5, borderColor: colors.gold, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16, marginTop: 12, shadowColor: colors.gold, shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  howToText: { flex: 1, color: colors.gold, fontSize: font.body, fontWeight: "700" },
  howToChev: { color: colors.gold, fontSize: 22, fontWeight: "700" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1.5, borderColor: colors.accent, alignItems: "center", justifyContent: "center", shadowColor: colors.accent, shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandImg: { width: 132, height: 44 },
  brandText: { fontSize: 32, fontWeight: "900", letterSpacing: 0.5 },
  brand: { color: colors.ink, fontSize: font.h1, fontWeight: "900", letterSpacing: 0.5 },
  streak: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(7,11,19,0.5)", borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  streakText: { color: colors.gold, fontWeight: "900", fontSize: font.small },
  hi: { color: colors.ink, fontSize: font.hero, fontWeight: "900", marginTop: spacing.lg },
  taglineWrap: { marginTop: 8, width: "100%" },
  tl1: { width: "100%", height: 26 },
  hiSub: { color: colors.coral, fontSize: font.small, fontWeight: "700", marginTop: 2, alignSelf: "flex-end", textAlign: "right" },
  tagline: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5, marginTop: 2, alignSelf: "flex-start" },
  continueCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, padding: 13, marginTop: spacing.md },
  continueKicker: { color: "rgba(255,255,255,0.9)", fontSize: font.tiny, fontWeight: "900", letterSpacing: 1.5 },
  continueTitle: { color: "#E6EAF0", fontSize: font.h3, fontWeight: "900", marginTop: 2 },
  continueSub: { color: "rgba(255,255,255,0.92)", fontSize: font.small, fontWeight: "700", marginTop: 2 },
  continuePct: { color: "rgba(255,255,255,0.85)", fontSize: font.tiny, fontWeight: "700", marginTop: 5 },
  continuePlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  continuePlayIcon: { color: "#E6EAF0", fontSize: 18, marginLeft: 3 },
  journeyLink: { alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: 22, marginTop: 10 },
  journeyLinkText: { color: colors.accent, fontSize: font.body, fontWeight: "900" },
  journeyBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(3,5,10,0.3)", borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16, marginTop: spacing.md, shadowColor: colors.accent, shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  journeyBtnText: { flex: 1, color: colors.accent, fontSize: font.h3, fontWeight: "700" },
  journeyChev: { color: colors.accent, fontSize: 24, fontWeight: "700" },
  dualRow: { flexDirection: "row", gap: 12, marginTop: spacing.md },
  dualWrapTeal: { flex: 1, shadowColor: "#D8A43A", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  dualWrapPurple: { flex: 1, shadowColor: "#C4622E", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  dualTileTeal: { flex: 1, borderRadius: radius.lg, padding: 14, minHeight: 150, borderWidth: 1.5, borderColor: "#D8A43A" },
  dualTilePurple: { flex: 1, borderRadius: radius.lg, padding: 14, minHeight: 150, borderWidth: 1.5, borderColor: "#C4622E" },
  dualIcon: { position: "absolute", top: 12, right: 12 },
  dualKickerTeal: { color: "#D8A43A", fontSize: font.tiny, fontWeight: "900", letterSpacing: 1, lineHeight: font.tiny + 3, paddingRight: 26 },
  dualSubTeal: { color: "#D8A43A", fontSize: font.small, fontWeight: "800", marginTop: 1 },
  dualPctTeal: { color: "#D8A43A", fontSize: font.tiny, fontWeight: "800" },
  dualPlayTeal: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#B98A2E", alignItems: "center", justifyContent: "center", shadowColor: "#B98A2E", shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  dualSubPurple: { color: "rgba(255,255,255,0.85)", fontSize: font.small, fontWeight: "700", marginTop: 1 },
  dualEmoji: { fontSize: 26, textShadowColor: "rgba(236,72,153,0.8)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5 },
  iconGlowTeal: { textShadowColor: "rgba(34,184,176,0.8)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 },
  iconGlowGold: { textShadowColor: "rgba(228,184,76,0.8)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 },
  dualTitle: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900", marginTop: 2 },
  dualSub: { color: "rgba(255,255,255,0.92)", fontSize: font.small, fontWeight: "700", marginTop: 1 },
  dualBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  dualPct: { color: "rgba(255,255,255,0.9)", fontSize: font.tiny, fontWeight: "800" },
  dualPlay: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  dualPlayIcon: { color: "#E6EAF0", fontSize: 15, marginLeft: 2 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14, marginTop: spacing.md, borderWidth: 1.5, borderColor: "#C4622E", shadowColor: "#C4622E", shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  heroKicker: { color: "#C4622E", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: colors.ink, fontSize: font.small, fontWeight: "900", marginTop: 1 },
  heroMeta: { color: colors.muted, fontSize: font.tiny, marginTop: 1 },
  playBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  playIcon: { color: "#E6EAF0", fontSize: 18, marginLeft: 3 },
  welcome: { borderRadius: radius.lg, padding: 22, marginTop: spacing.md },
  welcomeTitle: { color: "#E6EAF0", fontSize: font.h2, fontWeight: "900" },
  welcomeSub: { color: "rgba(255,255,255,0.9)", fontSize: font.small, marginTop: 6 },
  createBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 10, paddingLeft: 16, marginTop: spacing.md },
  createBarText: { color: colors.muted, fontSize: font.small, flex: 1 },
  createPill: { borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16 },
  createPillText: { color: "#E6EAF0", fontWeight: "900", fontSize: font.small },
  surprise: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.blue, backgroundColor: "rgba(3,5,10,0.3)", shadowColor: colors.blue, shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  surpriseIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(124,77,255,0.18)", borderWidth: 1, borderColor: colors.blue },
  surpriseDice: { fontSize: 22 },
  surpriseText: { flex: 1, color: colors.blue, fontSize: font.body, fontWeight: "700" },
  surpriseChev: { color: colors.blue, fontSize: 22, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCell: { width: "21.5%", alignItems: "center" },
  gridTile: { width: "100%", aspectRatio: 1, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(3,5,10,0.35)", borderWidth: 1, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  gridLabel: { width: "100%", textAlign: "center", color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 5 },
  wideCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, padding: 13 },
  wideEmoji: { fontSize: 24, color: "#E6EAF0" },
  wideTitle: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900" },
  wideSub: { color: "rgba(255,255,255,0.92)", fontSize: font.small, marginTop: 2 },
  wideChev: { color: "rgba(255,255,255,0.9)", fontSize: 24, fontWeight: "900" },
  memory: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: radius.lg, padding: 18, marginTop: spacing.lg },
  memoryEmoji: { fontSize: 34 },
  memoryTitle: { color: "#E6EAF0", fontSize: font.h3, fontWeight: "900" },
  memorySub: { color: "rgba(255,255,255,0.9)", fontSize: font.small, marginTop: 2 },
});
