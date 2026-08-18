import React, { useMemo, useState } from "react";
import { Text, View, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { colors, spacing, font, radius, gradients } from "../theme";
import { tierLabel, subjectLabel } from "../data/presets";
import type { Song, VocabPair } from "../lib/api";

type Q = { prompt: string; answer: string; options: string[] };

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildQuestions(vocab: VocabPair[]): Q[] {
  const pairs = vocab.filter((v) => v?.es && v?.en);
  if (pairs.length < 2) return [];
  const picks = shuffle(pairs).slice(0, Math.min(3, pairs.length));
  return picks.map((p) => {
    const distractors = shuffle(pairs.filter((x) => x.en !== p.en)).slice(0, 3).map((x) => x.en);
    return { prompt: p.es, answer: p.en, options: shuffle([p.en, ...distractors]).slice(0, Math.min(4, distractors.length + 1)) };
  });
}

export default function LessonCompleteScreen({
  song,
  lang,
  onComplete,
  onExit,
}: {
  song: Song;
  lang: string;
  onComplete: (goNext: boolean) => void;
  onExit: () => void;
}) {
  const vocab = (song.vocab || []).filter((v) => v?.es && v?.en);
  const questions = useMemo(() => buildQuestions(vocab), [song.id]);
  const [step, setStep] = useState<"words" | "quiz" | "done">("words");
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const say = (t: string) => { Speech.stop(); Speech.speak(t, { language: lang, rate: 0.85 }); };

  const answer = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const correct = opt === questions[qi].answer;
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (qi + 1 < questions.length) {
        setQi(qi + 1);
        setPicked(null);
      } else {
        setStep("done");
      }
    }, 750);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>LESSON</Text>
          <Text style={styles.title} numberOfLines={1}>{subjectLabel(song.subject)}</Text>
          <Text style={styles.sub}>{tierLabel(song.level)} · Lesson {song.lesson}</Text>
        </View>
        <Pressable onPress={onExit} hitSlop={12} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* STEP: WORDS */}
      {step === "words" && (
        <>
          <Text style={styles.stepTitle}>The words you just heard</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {vocab.map((v, i) => (
              <Pressable key={i} onPress={() => say(v.es)}>
                <View style={styles.wordCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wordEs}>{v.es}</Text>
                    <Text style={styles.wordEn}>{v.en}</Text>
                  </View>
                  <Text style={styles.speak}>🔊</Text>
                </View>
              </Pressable>
            ))}
            {vocab.length === 0 && <Text style={styles.empty}>No words to review for this one.</Text>}
          </ScrollView>
          <View style={styles.footer}>
            {questions.length > 0 ? (
              <Pressable onPress={() => setStep("quiz")}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>Take the quick check →</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable onPress={() => setStep("done")}>
                <LinearGradient colors={gradients.mint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>Mark complete ✓</Text>
                </LinearGradient>
              </Pressable>
            )}
            {questions.length > 0 && (
              <Pressable onPress={() => setStep("done")} style={styles.skip}>
                <Text style={styles.skipText}>Skip the check — I've got it ✓</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

      {/* STEP: QUIZ */}
      {step === "quiz" && questions[qi] && (
        <>
          <Text style={styles.stepTitle}>Quick check · {qi + 1} of {questions.length}</Text>
          <View style={styles.quizPrompt}>
            <Text style={styles.quizQ}>What does this mean?</Text>
            <Pressable onPress={() => say(questions[qi].prompt)}>
              <Text style={styles.quizWord}>{questions[qi].prompt}  🔊</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            {questions[qi].options.map((opt) => {
              const isAnswer = opt === questions[qi].answer;
              const chosen = picked === opt;
              const show = picked !== null;
              return (
                <Pressable key={opt} onPress={() => answer(opt)} disabled={show}>
                  <View
                    style={[
                      styles.option,
                      show && isAnswer && styles.optionRight,
                      show && chosen && !isAnswer && styles.optionWrong,
                    ]}
                  >
                    <Text style={styles.optionText}>{opt}</Text>
                    {show && isAnswer && <Text style={styles.optMark}>✓</Text>}
                    {show && chosen && !isAnswer && <Text style={styles.optMark}>✗</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => setStep("done")} style={styles.skip}>
            <Text style={styles.skipText}>Skip to finish</Text>
          </Pressable>
        </>
      )}

      {/* STEP: DONE */}
      {step === "done" && (
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Lesson complete!</Text>
          {questions.length > 0 && (
            <Text style={styles.doneScore}>You got {score} of {questions.length} right</Text>
          )}
          <Text style={styles.doneSub}>{vocab.length} word{vocab.length === 1 ? "" : "s"} added to your journey.</Text>
          <View style={{ height: 24 }} />
          <Pressable onPress={() => onComplete(true)} style={{ width: "100%" }}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Continue to next lesson →</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => onComplete(false)} style={styles.skip}>
            <Text style={styles.skipText}>Done for now</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 56, paddingBottom: 10 },
  kicker: { color: colors.accent, fontSize: font.tiny, fontWeight: "900", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: font.h1, fontWeight: "900", marginTop: 2 },
  sub: { color: colors.muted, fontSize: font.small, fontWeight: "700", marginTop: 2 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  closeText: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  stepTitle: { color: colors.ink, fontSize: font.h3, fontWeight: "900", marginTop: 6, marginBottom: 12 },

  wordCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 },
  wordEs: { color: colors.ink, fontSize: font.h3, fontWeight: "900" },
  wordEn: { color: colors.muted, fontSize: font.body, marginTop: 2 },
  speak: { fontSize: 22 },
  empty: { color: colors.muted, fontSize: font.body, textAlign: "center", paddingVertical: 30 },

  footer: { paddingVertical: 12 },
  primaryBtn: { borderRadius: radius.md, paddingVertical: 16, alignItems: "center" },
  primaryText: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900" },
  skip: { alignItems: "center", paddingVertical: 14 },
  skipText: { color: colors.muted, fontSize: font.small, fontWeight: "800" },

  quizPrompt: { backgroundColor: colors.card2, borderRadius: radius.lg, padding: 22, alignItems: "center", marginBottom: 16 },
  quizQ: { color: colors.muted, fontSize: font.small, fontWeight: "700" },
  quizWord: { color: colors.ink, fontSize: font.hero, fontWeight: "900", marginTop: 6, textAlign: "center" },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 10 },
  optionRight: { borderColor: colors.good, backgroundColor: "rgba(52,211,153,0.14)" },
  optionWrong: { borderColor: colors.pink, backgroundColor: "rgba(255,77,141,0.12)" },
  optionText: { color: colors.ink, fontSize: font.body, fontWeight: "800" },
  optMark: { fontSize: 18, fontWeight: "900", color: colors.ink },

  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  doneEmoji: { fontSize: 64 },
  doneTitle: { color: colors.ink, fontSize: font.hero, fontWeight: "900", marginTop: 10 },
  doneScore: { color: colors.accent, fontSize: font.h3, fontWeight: "900", marginTop: 8 },
  doneSub: { color: colors.muted, fontSize: font.body, marginTop: 6, textAlign: "center" },
});
