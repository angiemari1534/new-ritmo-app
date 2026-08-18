import React, { useEffect, useRef, useState } from "react";
import { Text, View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen, GradientButton, SubjectIcon, Chip } from "../components/ui";
import { colors, spacing, font, radius, gradients, gradientFor } from "../theme";
import { GENRES, Tier, SongSpec, StyleSeed, CurriculumSubject, FALLBACK_CURRICULUM, lessonsFor } from "../data/presets";
import { getCurriculum } from "../lib/api";
import { loadProgress, type Progress } from "../lib/storage";

const LEVELS: { key: Tier; label: string; sub: string; emoji: string }[] = [
  { key: "prestarter", label: "First Words", sub: "Learn words one by one", emoji: "🔤" },
  { key: "starter", label: "Starter", sub: "Little to no Spanish", emoji: "🐣" },
  { key: "beginner", label: "Explorer", sub: "New to Spanish", emoji: "🌱" },
  { key: "intermediate", label: "Conversational", sub: "Know some basics", emoji: "💬" },
  { key: "advanced", label: "Fluent", sub: "Ready for a challenge", emoji: "🚀" },
];

const GENRE_EMOJI: Record<string, string> = {
  Pop: "⭐", "Hip-Hop": "🎤", Rock: "🎸", "R&B": "💜", Reggaeton: "🌴", Salsa: "💃",
  Bachata: "❤️", Country: "🤠", EDM: "🎛️", Acoustic: "🪕", Latin: "🎶", Gospel: "🙌",
  Cumbia: "🥁", Jazz: "🎷", "Children's": "🧸", Folk: "🍃",
  Rap: "🎙️", Soul: "🎶", Disco: "🪩", Club: "🔊", Blues: "🎷",
  Alternative: "🎧", "Classic Rock": "🤘",
};

const MOODS = [
  { key: "Energetic", emoji: "⚡" }, { key: "Chill", emoji: "☁️" }, { key: "Dance", emoji: "🪩" },
  { key: "Romantic", emoji: "❤️" }, { key: "Tropical", emoji: "🌴" }, { key: "Party", emoji: "🎉" },
  { key: "Happy", emoji: "😊" }, { key: "Sad", emoji: "😢" }, { key: "Dreamy", emoji: "🌙" },
  { key: "Groovy", emoji: "🕺" }, { key: "Powerful", emoji: "💪" }, { key: "Calm", emoji: "🧘" },
  { key: "Uplifting", emoji: "🌅" }, { key: "Epic", emoji: "🔥" }, { key: "Nostalgic", emoji: "📼" },
  { key: "Playful", emoji: "😜" }, { key: "Moody", emoji: "🎭" }, { key: "Confident", emoji: "👑" },
];
const TEMPOS = [{ key: "Slow", emoji: "🐌" }, { key: "Normal", emoji: "🎵" }, { key: "Upbeat", emoji: "🎶" }, { key: "Fast", emoji: "🚀" }];

// Outline vector icons for genres / moods / voice, so step 2 uses the same
// symbol style as the topic tiles on step 1 (not colorful emoji).
const GENRE_ICON: Record<string, string> = {
  Pop: "star-outline", "Hip-Hop": "microphone-variant", Rock: "guitar-electric", "R&B": "heart-outline",
  Reggaeton: "palm-tree", Salsa: "dance-ballroom", Bachata: "heart", Country: "hat-fedora",
  EDM: "tune", Acoustic: "guitar-acoustic", Latin: "music", Gospel: "hands-pray",
  Cumbia: "drum", Jazz: "saxophone", "Children's": "teddy-bear", Folk: "leaf",
  Rap: "microphone", Soul: "music-note", Disco: "disc", Club: "speaker",
  Blues: "guitar-pick", Alternative: "headphones", "Classic Rock": "guitar-pick",
  "80s": "cassette", "90s": "disc",
};
const MOOD_ICON: Record<string, string> = {
  Energetic: "lightning-bolt", Chill: "snowflake", Dance: "dance-ballroom", Romantic: "heart",
  Tropical: "palm-tree", Party: "party-popper", Happy: "emoticon-happy-outline", Sad: "emoticon-sad-outline",
  Dreamy: "weather-night", Groovy: "music", Powerful: "arm-flex", Calm: "meditation",
  Uplifting: "white-balance-sunny", Epic: "fire", Nostalgic: "history",
  Playful: "emoticon-wink-outline", Moody: "drama-masks", Confident: "crown",
};
const VOICE_ICON: Record<string, string> = { female: "face-woman", male: "face-man", duet: "human-male-female", any: "dice-5" };
const LEVEL_ICON: Record<string, string> = { prestarter: "alphabetical-variant", starter: "seed-outline", beginner: "sprout-outline", intermediate: "chat-outline", advanced: "rocket-launch" };

// A rotating palette of neon colours — each level/topic tile gets its own
// glowing border + icon colour to match the app's neon theme.
const NEON = ["#22D3EE", "#A78BFA", "#F472B6", "#FBBF24", "#38BDF8", "#34D399", "#F97316", "#EC4899", "#8B5CF6", "#2DD4BF", "#60A5FA", "#FB7185", "#C084FC", "#4ADE80", "#FACC15", "#5EEAD4", "#818CF8"];

export default function CreateScreen({
  onBack,
  onGenerate,
  onGenerateAll,
  seed,
  onSeedConsumed,
  defaults,
}: {
  onBack: () => void;
  onGenerate: (spec: SongSpec) => void;
  onGenerateAll: (spec: SongSpec, count: number, vary: boolean, pools: { genres: string[]; moods: string[] }) => void;
  seed?: StyleSeed | null;
  onSeedConsumed?: () => void;
  defaults?: { genre: string; mood: string; tempo: string; genres: string[]; moods: string[] };
}) {
  const [step, setStep] = useState(1);
  const [curriculum, setCurriculum] = useState<CurriculumSubject[]>(FALLBACK_CURRICULUM);
  const [progress, setProgress] = useState<Progress>({});
  const [loading, setLoading] = useState(true);

  const [tier, setTier] = useState<Tier>("beginner");
  const [subject, setSubject] = useState<string>("colors");
  const [topic, setTopic] = useState<string>("");
  const [lesson, setLesson] = useState<number>(1);
  const [genre, setGenre] = useState<string>(defaults?.genre ?? "Reggaeton");
  const [mood, setMood] = useState<string>(defaults?.mood ?? "Energetic");
  const [tempo, setTempo] = useState<string>(defaults?.tempo ?? "Normal");
  const [voice, setVoice] = useState<string>("female");
  const [artistFeel, setArtistFeel] = useState<string>("");
  const [similarSongs, setSimilarSongs] = useState<string>("");
  const [allLessons, setAllLessons] = useState(false);
  const [varyStyle, setVaryStyle] = useState(true);
  const [batchCount, setBatchCount] = useState(20);
  const [mixSource, setMixSource] = useState<"prefs" | "custom">("prefs");
  const [mixGenres, setMixGenres] = useState<string[]>(defaults?.genres ?? []);
  const [mixMoods, setMixMoods] = useState<string[]>(defaults?.moods ?? []);
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Jump to the top of the page whenever the wizard step changes.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const customTopic = topic.trim();
  const usingTopic = customTopic.length > 0;
  const progressKey = usingTopic ? `custom:${customTopic}` : subject;

  // Apply a copied style ("Use this beat") once, then clear it.
  useEffect(() => {
    if (!seed) return;
    setGenre(seed.genre);
    setMood(seed.mood);
    setTempo(seed.tempo);
    setArtistFeel(seed.artistFeel ?? "");
    setStep(1);
    onSeedConsumed?.();
  }, [seed]);

  useEffect(() => {
    Promise.all([getCurriculum().catch(() => FALLBACK_CURRICULUM), loadProgress()])
      .then(([c, p]) => {
        if (c && c.length) setCurriculum(c);
        setProgress(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const current = curriculum.find((c) => c.key === subject) ?? curriculum[0];
  // Pre-Starter is a word level with its own fixed lesson count; phrase levels
  // use the per-subject curated counts from the live curriculum.
  const lessonTotal = usingTopic
    ? 20
    : tier === "prestarter"
    ? lessonsFor(tier, subject)
    : current
    ? current.lessons[tier as "starter" | "beginner" | "intermediate" | "advanced"]
    : 20;
  const doneUpTo = progress[progressKey]?.[tier] ?? 0;
  useEffect(() => setLesson(Math.min(doneUpTo + 1, Math.max(1, lessonTotal))), [progressKey, tier, lessonTotal, doneUpTo]);

  function buildSpec(): SongSpec {
    return {
      subject: progressKey,
      topic: usingTopic ? customTopic : undefined,
      level: tier,
      lesson,
      genre,
      beat: `${mood} ${tempo}`,
      voice,
      artistFeel: artistFeel.trim() || undefined,
      similarSongs: similarSongs.trim() || undefined,
    };
  }
  const batchN = Math.min(Math.max(1, batchCount), Math.max(1, lessonTotal));
  function generate() {
    if (allLessons) {
      const pools = !varyStyle
        ? { genres: [], moods: [] }
        : mixSource === "prefs"
        ? { genres: defaults?.genres ?? [], moods: defaults?.moods ?? [] }
        : { genres: mixGenres, moods: mixMoods };
      onGenerateAll(buildSpec(), batchN, varyStyle, pools);
    } else onGenerate(buildSpec());
  }

  return (
    <Screen>
      <View style={styles.top}>
        {step > 1 ? (
          <Pressable onPress={() => setStep(step - 1)} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>
        ) : (
          <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>
        )}
        <View style={{ alignItems: "center" }}>
          <Text style={styles.title}>Create Song</Text>
          <Text style={styles.stepText}>Step {step} of 3</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressDots}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.dot, n <= step && styles.dotOn, n === step && styles.dotCur]} />
        ))}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <>
            <Text style={styles.h}>Choose your level</Text>
            <View style={styles.levelRow}>
              {LEVELS.map((l, i) => {
                const on = tier === l.key;
                const c = NEON[i % NEON.length];
                return (
                  <Pressable key={l.key} style={styles.levelCell} onPress={() => setTier(l.key)}>
                    <View style={[styles.levelCard, { borderColor: on ? c : `${c}55`, shadowColor: c }, on && styles.levelCardOn, on && { backgroundColor: `${c}1A` }]}>
                      <MaterialCommunityIcons name={(LEVEL_ICON[l.key] ?? "circle-outline") as any} size={22} color={c} style={{ marginBottom: 4 }} />
                      <Text style={styles.levelLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{l.label}</Text>
                      <Text style={styles.levelSub} numberOfLines={1}>{l.sub}</Text>
                      {on && <Text style={[styles.levelCheck, { color: c }]}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.h}>Choose a topic</Text>
            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
            ) : (
              <View style={styles.topicGrid}>
                {curriculum.map((s, i) => {
                  const on = !usingTopic && subject === s.key;
                  const c = NEON[i % NEON.length];
                  return (
                    <Pressable key={s.key} style={styles.topicCell} onPress={() => { setTopic(""); setSubject(s.key); }}>
                      <View style={[styles.topicTile, { borderColor: on ? c : `${c}55`, shadowColor: c }, on && styles.topicTileOn, on && { backgroundColor: `${c}1F` }]}>
                        <SubjectIcon subject={s.key} size={22} color={c} />
                        <Text style={[styles.topicLabel, on && { color: c }]} numberOfLines={2}>{s.label}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.customHint}>Or type your own topic — or list exact words to learn, separated by commas.</Text>
            <View style={[styles.customBox, usingTopic && styles.customBoxOn]}>
              <Text style={styles.pencil}>✏️</Text>
              <TextInput
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g. trip to Puerto Rico   —   or:   dog, cat, house, to run"
                placeholderTextColor={colors.faint}
                style={styles.customInput}
                multiline
              />
              {usingTopic && <Pressable onPress={() => setTopic("")}><Text style={styles.clear}>✕</Text></Pressable>}
            </View>
            {usingTopic && (
              <Text style={styles.customNote}>
                {customTopic.includes(",") ? "📝 We'll teach these exact words" : "✨ We'll build a custom course on your topic"}
              </Text>
            )}

            <View style={{ height: spacing.lg }} />
            <GradientButton label="Next  →" onPress={() => setStep(2)} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.h}>Choose a genre</Text>
            <View style={styles.gGrid}>
              {GENRES.map((g, i) => {
                const on = genre === g;
                const c = NEON[i % NEON.length];
                return (
                  <Pressable key={g} style={styles.gCell} onPress={() => setGenre(g)}>
                    <View style={[styles.gTile, { borderColor: on ? c : `${c}55`, shadowColor: c }, on && { backgroundColor: `${c}1F` }]}>
                      <MaterialCommunityIcons name={(GENRE_ICON[g] ?? "music-note") as any} size={24} color={c} style={{ marginBottom: 5 }} />
                      <Text style={[styles.gLabel, on && { color: c }]} numberOfLines={2}>{g}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.h}>Beat / mood</Text>
            <View style={styles.gGrid}>
              {MOODS.map((m, i) => {
                const on = mood === m.key;
                const c = NEON[i % NEON.length];
                return (
                  <Pressable key={m.key} style={styles.gCell} onPress={() => setMood(m.key)}>
                    <View style={[styles.gTile, { borderColor: on ? c : `${c}55`, shadowColor: c }, on && { backgroundColor: `${c}1F` }]}>
                      <MaterialCommunityIcons name={(MOOD_ICON[m.key] ?? "music") as any} size={24} color={c} style={{ marginBottom: 5 }} />
                      <Text style={[styles.gLabel, on && { color: c }]}>{m.key}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.h}>Voice</Text>
            <View style={styles.gGrid}>
              {[
                { key: "female", label: "Female" },
                { key: "male", label: "Male" },
                { key: "duet", label: "Duet" },
                { key: "any", label: "Surprise" },
              ].map((v, i) => {
                const on = voice === v.key;
                const c = NEON[(i + 2) % NEON.length];
                return (
                  <Pressable key={v.key} style={styles.voiceCell} onPress={() => setVoice(v.key)}>
                    <View style={[styles.gTile, { borderColor: on ? c : `${c}55`, shadowColor: c }, on && { backgroundColor: `${c}1F` }]}>
                      <MaterialCommunityIcons name={(VOICE_ICON[v.key] ?? "account") as any} size={24} color={c} style={{ marginBottom: 5 }} />
                      <Text style={[styles.gLabel, on && { color: c }]}>{v.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.h}>Similar artist (optional)</Text>
            <View style={styles.customBox}>
              <Text style={styles.pencil}>🎤</Text>
              <TextInput
                value={artistFeel}
                onChangeText={setArtistFeel}
                placeholder="e.g. Bad Bunny, Shakira, Juanes"
                placeholderTextColor={colors.faint}
                style={styles.customInput}
              />
              {artistFeel.length > 0 && (
                <Pressable onPress={() => setArtistFeel("")}><Text style={styles.clear}>✕</Text></Pressable>
              )}
            </View>

            <Text style={styles.h}>Similar songs (optional)</Text>
            <View style={styles.customBox}>
              <Text style={styles.pencil}>🎵</Text>
              <TextInput
                value={similarSongs}
                onChangeText={setSimilarSongs}
                placeholder="e.g. an upbeat summer beach hit, a slow romantic ballad"
                placeholderTextColor={colors.faint}
                style={styles.customInput}
              />
              {similarSongs.length > 0 && (
                <Pressable onPress={() => setSimilarSongs("")}><Text style={styles.clear}>✕</Text></Pressable>
              )}
            </View>

            <Text style={styles.h}>Tempo</Text>
            <View style={styles.tempoRow}>
              {TEMPOS.map((t) => {
                const on = tempo === t.key;
                return on ? (
                  <Pressable key={t.key} style={{ flex: 1 }} onPress={() => setTempo(t.key)}>
                    <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tempoSeg}>
                      <Text style={styles.tempoTextOn}>{t.emoji} {t.key}</Text>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable key={t.key} style={[styles.tempoSeg, styles.tempoSegOff, { flex: 1 }]} onPress={() => setTempo(t.key)}>
                    <Text style={styles.tempoText}>{t.emoji} {t.key}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: spacing.lg }} />
            <GradientButton label="Next  →" onPress={() => setStep(3)} />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.h}>Pick a lesson</Text>
            <Text style={styles.hint}>Each lesson teaches new words. ✓ = you've made it.</Text>
            <View style={styles.lessons}>
              {Array.from({ length: Math.max(1, lessonTotal) }, (_, i) => i + 1).map((n) => {
                const done = n <= doneUpTo;
                const sel = n === lesson;
                return sel ? (
                  <Pressable key={n} onPress={() => setLesson(n)}>
                    <LinearGradient colors={gradients.purplePink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.lesson, styles.lessonSel]}>
                      <Text style={styles.lessonTextSel}>{done ? "✓ " : ""}L{n}</Text>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable key={n} onPress={() => setLesson(n)} style={[styles.lesson, done && styles.lessonDone]}>
                    <Text style={[styles.lessonText, done && { color: colors.good }]}>{done ? "✓ " : ""}L{n}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.preview}>
              <View style={[styles.previewArt, { borderColor: `${gradientFor(usingTopic ? "verbs" : subject)[0]}66` }]}>
                <SubjectIcon subject={usingTopic ? "custom" : subject} size={34} color={gradientFor(usingTopic ? "verbs" : subject)[0]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {usingTopic ? customTopic : current?.label}
                </Text>
                <Text style={styles.previewMeta}>{tier} · Lesson {lesson}</Text>
                <Text style={styles.previewMeta}>{genre} · {mood} · {tempo}</Text>
              </View>
            </View>

            <Pressable onPress={() => setAllLessons((v) => !v)} style={styles.allRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.allTitle}>Generate all {lessonTotal} lessons</Text>
                <Text style={styles.allSub}>Make a batch in the background — pick how many below</Text>
              </View>
              <View style={[styles.toggle, allLessons && styles.toggleOn]}>
                <View style={[styles.toggleDot, allLessons && styles.toggleDotOn]} />
              </View>
            </Pressable>

            {allLessons && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.allTitle}>How many songs?</Text>
                <View style={[styles.gGrid, { marginTop: 8 }]}>
                  {[3, 5, 10, 15, lessonTotal].filter((v, i, a) => a.indexOf(v) === i).map((n) => (
                    <Chip key={n} label={n === lessonTotal ? `All (${lessonTotal})` : `${n}`} selected={batchN === n} onPress={() => setBatchCount(n)} />
                  ))}
                </View>
              </View>
            )}

            {allLessons && (
              <Pressable onPress={() => setVaryStyle((v) => !v)} style={[styles.allRow, { marginTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allTitle}>🎲 Mix up the style each lesson</Text>
                  <Text style={styles.allSub}>Vary genre, mood, tempo & voice for variety</Text>
                </View>
                <View style={[styles.toggle, varyStyle && styles.toggleOn]}>
                  <View style={[styles.toggleDot, varyStyle && styles.toggleDotOn]} />
                </View>
              </Pressable>
            )}

            {allLessons && varyStyle && (
              <View style={{ marginTop: 10 }}>
                <View style={styles.gGrid}>
                  <Chip label="🎚️ Use my preferences" selected={mixSource === "prefs"} onPress={() => setMixSource("prefs")} />
                  <Chip label="✨ Choose styles" selected={mixSource === "custom"} onPress={() => setMixSource("custom")} />
                </View>
                {mixSource === "prefs" ? (
                  <Text style={styles.customHint}>Mixing from your saved genres & moods (edit in Profile → Music preferences).</Text>
                ) : (
                  <>
                    <Text style={styles.h}>Genres to mix</Text>
                    <View style={styles.gGrid}>
                      {GENRES.map((g) => (
                        <Chip key={g} label={g} selected={mixGenres.includes(g)} onPress={() => setMixGenres((a) => toggleIn(a, g))} />
                      ))}
                    </View>
                    <Text style={styles.h}>Moods to mix</Text>
                    <View style={styles.gGrid}>
                      {MOODS.map((m) => (
                        <Chip key={m.key} label={`${m.emoji} ${m.key}`} selected={mixMoods.includes(m.key)} onPress={() => setMixMoods((a) => toggleIn(a, m.key))} />
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            <View style={{ height: spacing.md }} />
            <GradientButton
              label={allLessons ? `🎶  Generate ${batchN} song${batchN === 1 ? "" : "s"}` : "🎶  Generate song"}
              onPress={generate}
            />
            <Text style={styles.note}>
              {allLessons
                ? `Creates ${batchN} song${batchN === 1 ? "" : "s"} in the background — about a dime each. Keep the app open.`
                : "Takes about 1–2 minutes to write and sing your song."}
            </Text>
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 56, paddingHorizontal: spacing.lg },
  back: { color: colors.ink, fontSize: 30, fontWeight: "800", width: 24 },
  title: { color: colors.ink, fontSize: font.h3, fontWeight: "900" },
  stepText: { color: colors.pink, fontSize: font.small, fontWeight: "800", marginTop: 2 },
  progressDots: { flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 12, paddingHorizontal: spacing.lg },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)" },
  dotOn: { backgroundColor: "rgba(34,184,176,0.45)" },
  dotCur: { backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  content: { padding: spacing.lg },
  h: { color: colors.ink, fontSize: font.h3, fontWeight: "900", marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { color: colors.muted, fontSize: font.small, marginBottom: spacing.sm },
  levelRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  levelCell: { width: "47.5%", flexGrow: 1 },
  levelCard: { backgroundColor: "transparent", borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, paddingVertical: 9, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", gap: 2, shadowOpacity: 0.5, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  levelCardOn: { borderColor: colors.accent, backgroundColor: colors.card2 },
  levelEmoji: { fontSize: 22 },
  levelLabel: { color: colors.ink, fontSize: font.small, fontWeight: "900", marginTop: 5 },
  levelSub: { color: colors.muted, fontSize: font.tiny, marginTop: 1 },
  levelCheck: { position: "absolute", top: 8, right: 10, color: colors.pink, fontWeight: "900" },
  topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  topicCell: { width: "22%", alignItems: "center" },
  topicTile: { width: "100%", aspectRatio: 1, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 4, gap: 4, shadowOpacity: 0.5, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  topicTileOn: { borderColor: "#fff" },
  topicEmoji: { fontSize: 26 },
  topicLabel: { color: colors.muted, fontSize: 9, lineHeight: 11, fontWeight: "700", textAlign: "center" },
  customBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, marginTop: spacing.md },
  customBoxOn: { borderColor: colors.accent },
  pencil: { fontSize: 16 },
  customInput: { flex: 1, color: colors.ink, fontSize: font.body, paddingVertical: 14 },
  customHint: { color: colors.muted, fontSize: font.small, marginTop: spacing.md, marginBottom: 6 },
  customNote: { color: colors.good, fontSize: font.small, fontWeight: "700", marginTop: 8 },
  clear: { color: colors.faint, fontSize: 16, paddingHorizontal: 4 },
  gGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gCell: { width: "22%" },
  voiceCell: { width: "22%" },
  gTile: { backgroundColor: "transparent", aspectRatio: 1, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, gap: 4, shadowOpacity: 0.5, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  gTileOn: { borderColor: colors.accent },
  gEmoji: { fontSize: 22 },
  gLabel: { color: colors.muted, fontSize: 9, lineHeight: 11, fontWeight: "700", textAlign: "center" },
  tempoRow: { flexDirection: "row", gap: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 5, borderWidth: 1, borderColor: colors.line },
  tempoSeg: { borderRadius: radius.sm, paddingVertical: 12, alignItems: "center" },
  tempoSegOff: {},
  tempoText: { color: colors.muted, fontWeight: "800", fontSize: font.small },
  tempoTextOn: { color: "#fff", fontWeight: "900", fontSize: font.small },
  lessons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lesson: { backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, paddingVertical: 10, paddingHorizontal: 14, minWidth: 52, alignItems: "center" },
  lessonSel: { borderColor: "transparent" },
  lessonDone: { borderColor: colors.good },
  lessonText: { color: colors.muted, fontWeight: "800", fontSize: font.small },
  lessonTextSel: { color: "#fff", fontWeight: "900", fontSize: font.small },
  preview: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: spacing.lg },
  previewArt: { width: 72, height: 72, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(7,11,19,0.6)", borderWidth: 1 },
  previewTitle: { color: colors.ink, fontSize: font.h3, fontWeight: "900" },
  previewMeta: { color: colors.muted, fontSize: font.small, marginTop: 3, textTransform: "capitalize" },
  note: { color: colors.muted, fontSize: font.small, textAlign: "center", marginTop: 12 },
  allRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: spacing.lg },
  allTitle: { color: colors.ink, fontSize: font.body, fontWeight: "800" },
  allSub: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", justifyContent: "center", paddingHorizontal: 3 },
  toggleOn: { backgroundColor: "rgba(34,184,176,0.3)", borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.faint, alignSelf: "flex-start" },
  toggleDotOn: { backgroundColor: colors.accent, alignSelf: "flex-end" },
});
