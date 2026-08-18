import React, { useEffect, useRef, useState } from "react";
import { Text, View, StyleSheet, Animated, Easing, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, SubjectIcon } from "../components/ui";
import { spacing, font, gradientFor, type Colors, type Gradients } from "../theme";
import { useTheme, useThemedStyles } from "../lib/theme-context";

const STEPS = [
  "Writing your bilingual lyrics…",
  "Building the chorus hook…",
  "Composing the music…",
  "Recording the vocals…",
  "Mixing your song…",
];

export default function GeneratingScreen({
  subject,
  error,
  onCancel,
  onRetry,
}: {
  subject: string;
  error?: string | null;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const pulse = useRef(new Animated.Value(0)).current;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (error) return;
    const id = setInterval(() => setStepIndex((i) => (i + 1) % STEPS.length), 3500);
    return () => clearInterval(id);
  }, [error]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Screen>
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.emoji}>😕</Text>
            <Text style={styles.title}>Couldn't create the song</Text>
            <Text style={styles.error}>{error}</Text>
            <View style={{ height: spacing.lg }} />
            <Pressable onPress={onRetry}>
              <LinearGradient colors={gradients.primary} style={styles.btn}>
                <Text style={styles.btnText}>Try again</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onCancel} style={{ marginTop: 14 }}>
              <Text style={styles.cancel}>Back to home</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Animated.View style={{ transform: [{ scale }] }}>
              <LinearGradient colors={gradientFor(subject)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orb}>
                <SubjectIcon subject={subject} size={60} color="#fff" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>Creating your song</Text>
            <Text style={styles.step}>{STEPS[stepIndex]}</Text>
            <Pressable onPress={onCancel} style={{ marginTop: 30 }}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: Colors, gradients: Gradients) => StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  orb: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center" },
  orbEmoji: { fontSize: 64 },
  emoji: { fontSize: 64, marginBottom: 10 },
  title: { color: colors.ink, fontSize: font.h1, fontWeight: "900", marginTop: 28, textAlign: "center" },
  step: { color: colors.muted, fontSize: font.body, marginTop: 10, textAlign: "center" },
  error: { color: colors.pink, fontSize: font.body, marginTop: 10, textAlign: "center", lineHeight: 22 },
  btn: { borderRadius: 16, paddingVertical: 15, paddingHorizontal: 40, alignItems: "center" },
  btnText: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900" },
  cancel: { color: colors.muted, fontSize: font.body, fontWeight: "700" },
});
