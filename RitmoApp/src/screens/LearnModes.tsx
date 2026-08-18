import React, { useMemo, useState } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { colors, spacing, font, radius, gradients } from "../theme";
import type { VocabPair } from "../lib/api";

function speak(text: string, language: string, rate = 0.55) {
  Speech.stop();
  Speech.speak(text, { language, rate });
}

function shuffle<T>(a: T[]): T[] {
  return [...a].sort(() => Math.random() - 0.5);
}

// ---- Pronunciation: hear each word spoken slowly ------------------------
export function PronouncePanel({ vocab, lang }: { vocab: VocabPair[]; lang: string }) {
  const playAll = () => {
    Speech.stop();
    for (const w of vocab) {
      Speech.speak(w.es, { language: lang, rate: 0.5 });
      Speech.speak(w.en, { language: "en-US", rate: 0.6 });
    }
  };
  return (
    <ScrollView style={styles.panel} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.rowBtns}>
        <Pressable onPress={playAll} style={styles.smallBtn}><Text style={styles.smallBtnText}>🔊 Play all slowly</Text></Pressable>
        <Pressable onPress={() => Speech.stop()} style={styles.smallBtn}><Text style={styles.smallBtnText}>⏹ Stop</Text></Pressable>
      </View>
      {vocab.map((w, i) => (
        <Pressable key={i} onPress={() => speak(w.es, lang, 0.5)}>
          <View style={styles.pRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pEs}>{w.es}</Text>
              <Text style={styles.pEn}>{w.en}</Text>
            </View>
            <Text style={styles.speaker}>🔊</Text>
          </View>
        </Pressable>
      ))}
      <Text style={styles.tip}>Tap any word to hear it slowly.</Text>
    </ScrollView>
  );
}

// ---- Speaking practice: hear it, repeat out loud, self-assess -----------
export function SpeakPanel({ vocab, lang }: { vocab: VocabPair[]; lang: string }) {
  const [i, setI] = useState(0);
  if (vocab.length === 0) return <Empty text="No words to practice yet." />;
  if (i >= vocab.length)
    return (
      <View style={styles.center}>
        <Text style={styles.done}>🎉 Nice work!</Text>
        <Text style={styles.doneSub}>You practiced {vocab.length} phrases.</Text>
        <Pressable onPress={() => setI(0)} style={styles.primary}><Text style={styles.primaryText}>Practice again</Text></Pressable>
      </View>
    );
  const w = vocab[i];
  return (
    <View style={styles.center}>
      <Text style={styles.progress}>{i + 1} / {vocab.length}</Text>
      <Text style={styles.bigEs}>{w.es}</Text>
      <Text style={styles.bigEn}>{w.en}</Text>
      <Pressable onPress={() => speak(w.es, lang, 0.5)}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hearBtn}>
          <Text style={styles.hearText}>🔊  Hear it, then say it out loud</Text>
        </LinearGradient>
      </Pressable>
      <View style={styles.rowBtns}>
        <Pressable onPress={() => speak(w.es, lang, 0.45)} style={styles.smallBtn}><Text style={styles.smallBtnText}>↻ Again</Text></Pressable>
        <Pressable onPress={() => setI(i + 1)} style={styles.smallBtn}><Text style={styles.smallBtnText}>Next →</Text></Pressable>
      </View>
    </View>
  );
}

// ---- Quiz: multiple choice from the song's vocab -----------------------
export function QuizPanel({ vocab, lang }: { vocab: VocabPair[]; lang: string }) {
  const questions = useMemo(() => {
    const items = vocab.filter((v) => v.es && v.en);
    if (items.length < 2) return [];
    return shuffle(
      items.map((w, idx) => {
        const distractors = shuffle(items.filter((_, i) => i !== idx))
          .slice(0, 3)
          .map((o) => o.en);
        return { prompt: w.es, answer: w.en, options: shuffle([w.en, ...distractors]) };
      })
    );
  }, [vocab]);

  const [qi, setQi] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  if (questions.length === 0) return <Empty text="Not enough words in this song to make a quiz." />;

  if (qi >= questions.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.done}>Score: {score} / {questions.length}</Text>
        <Text style={styles.doneSub}>{score === questions.length ? "Perfect! 🎉" : "Keep going — you'll get them all."}</Text>
        <Pressable onPress={() => { setQi(0); setScore(0); setChosen(null); }} style={styles.primary}>
          <Text style={styles.primaryText}>Retake quiz</Text>
        </Pressable>
      </View>
    );
  }

  const q = questions[qi];
  const answered = chosen !== null;

  return (
    <ScrollView style={styles.panel} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.qProgress}>Question {qi + 1} of {questions.length}</Text>
      <View style={styles.qPrompt}>
        <Text style={styles.qWord}>{q.prompt}</Text>
        <Pressable onPress={() => speak(q.prompt, lang, 0.5)}><Text style={styles.speaker}>🔊</Text></Pressable>
      </View>
      <Text style={styles.qAsk}>What does it mean?</Text>
      {q.options.map((opt) => {
        const isCorrect = opt === q.answer;
        const isChosen = opt === chosen;
        const style = [
          styles.option,
          answered && isCorrect && styles.optionCorrect,
          answered && isChosen && !isCorrect && styles.optionWrong,
        ];
        return (
          <Pressable
            key={opt}
            disabled={answered}
            onPress={() => {
              setChosen(opt);
              if (isCorrect) setScore((s) => s + 1);
            }}
          >
            <View style={style}>
              <Text style={styles.optionText}>{opt}</Text>
              {answered && isCorrect && <Text style={styles.tick}>✓</Text>}
            </View>
          </Pressable>
        );
      })}
      {answered && (
        <Pressable onPress={() => { setQi(qi + 1); setChosen(null); }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
            <Text style={styles.nextText}>{qi + 1 === questions.length ? "See score" : "Next question"}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.doneSub}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  rowBtns: { flexDirection: "row", gap: 12, justifyContent: "center", marginVertical: 12 },
  smallBtn: { backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingVertical: 10, paddingHorizontal: 18 },
  smallBtnText: { color: colors.ink, fontWeight: "800", fontSize: font.small },
  pRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  pEs: { color: colors.ink, fontSize: font.body, fontWeight: "800" },
  pEn: { color: colors.muted, fontSize: font.small, marginTop: 2, fontStyle: "italic" },
  speaker: { fontSize: 22, paddingLeft: 10 },
  tip: { color: colors.faint, fontSize: font.small, textAlign: "center", marginTop: 8 },
  progress: { color: colors.muted, fontSize: font.small, fontWeight: "700" },
  bigEs: { color: colors.ink, fontSize: font.hero, fontWeight: "900", textAlign: "center", marginTop: 12 },
  bigEn: { color: colors.muted, fontSize: font.h3, fontStyle: "italic", textAlign: "center", marginTop: 6 },
  hearBtn: { borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 22, marginTop: 24 },
  hearText: { color: "#fff", fontWeight: "900", fontSize: font.body },
  done: { color: colors.ink, fontSize: font.h1, fontWeight: "900" },
  doneSub: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: 8 },
  primary: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 26, marginTop: 20 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: font.body },
  qProgress: { color: colors.muted, fontSize: font.small, fontWeight: "700", marginTop: 12 },
  qPrompt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 10 },
  qWord: { color: colors.ink, fontSize: font.h1, fontWeight: "900", textAlign: "center" },
  qAsk: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: 4, marginBottom: 14 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, padding: 16, marginBottom: 10 },
  optionCorrect: { borderColor: colors.good, backgroundColor: "rgba(52,211,153,0.12)" },
  optionWrong: { borderColor: colors.pink, backgroundColor: "rgba(255,77,141,0.12)" },
  optionText: { color: colors.ink, fontSize: font.body, fontWeight: "700" },
  tick: { color: colors.good, fontWeight: "900", fontSize: 18 },
  nextBtn: { borderRadius: radius.md, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  nextText: { color: "#fff", fontWeight: "900", fontSize: font.body },
});
