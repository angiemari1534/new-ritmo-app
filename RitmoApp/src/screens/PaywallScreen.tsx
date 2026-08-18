import React, { useState } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { radius, font, spacing, type Colors, type Gradients } from "../theme";
import { useTheme, useThemedStyles } from "../lib/theme-context";
import { PLANS, type PlanId } from "../lib/entitlements";
import { tierLabel } from "../data/presets";

// The subscribe here is MOCKED — it just activates the plan locally. Later this
// calls RevenueCat / store billing; the rest of the app doesn't change.
export default function PaywallScreen({
  visible,
  currentPlan,
  reason,
  onSubscribe,
  onClose,
}: {
  visible: boolean;
  currentPlan: PlanId;
  reason?: string | null;
  onSubscribe: (plan: PlanId) => void;
  onClose: () => void;
}) {
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [annual, setAnnual] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Unlock Ritmo ✨</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close}><Text style={styles.closeText}>✕</Text></Pressable>
        </View>
        {reason ? <Text style={styles.reason}>{reason}</Text> : <Text style={styles.sub}>Choose a plan — cancel anytime.</Text>}

        {/* Monthly / Annual toggle */}
        <View style={styles.billRow}>
          <Pressable onPress={() => setAnnual(false)} style={[styles.billTab, !annual && styles.billTabOn]}>
            <Text style={[styles.billText, !annual && styles.billTextOn]}>Monthly</Text>
          </Pressable>
          <Pressable onPress={() => setAnnual(true)} style={[styles.billTab, annual && styles.billTabOn]}>
            <Text style={[styles.billText, annual && styles.billTextOn]}>Annual · save ~2 mo</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {PLANS.map((p) => {
            const isCurrent = p.id === currentPlan;
            const price = p.monthly === 0 ? "Free" : annual ? `$${p.annual}/yr` : `$${p.monthly}/mo`;
            return (
              <View key={p.id} style={[styles.card, p.highlight && styles.cardHot, isCurrent && styles.cardCurrent]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{p.name}{p.highlight ? "  ★" : ""}</Text>
                    <Text style={styles.planBlurb}>{p.blurb}</Text>
                  </View>
                  <Text style={styles.price}>{price}</Text>
                </View>
                <View style={styles.feat}>
                  <MaterialCommunityIcons name="music-box-multiple-outline" size={15} color={colors.accent} />
                  <Text style={styles.featText}>
                    Unlocks {p.levels.map((t) => tierLabel(t as any)).join(", ")}
                  </Text>
                </View>
                <View style={styles.feat}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={15} color={colors.accent} />
                  <Text style={styles.featText}>Create {p.creations} songs / month</Text>
                </View>
                {p.id !== "free" && (
                  <Pressable onPress={() => onSubscribe(p.id)} disabled={isCurrent} style={{ marginTop: 12 }}>
                    <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.cta, isCurrent && styles.ctaOff]}>
                      <Text style={styles.ctaText}>{isCurrent ? "Current plan" : `Choose ${p.name}`}</Text>
                    </LinearGradient>
                  </Pressable>
                )}
                {p.id === "free" && isCurrent && <Text style={styles.currentTag}>Your current plan</Text>}
              </View>
            );
          })}

          <Pressable onPress={() => onSubscribe("free")} style={styles.restore}>
            <Text style={styles.restoreText}>Restore / manage subscription</Text>
          </Pressable>
          <Text style={styles.legal}>
            Billing isn't live yet — choosing a plan unlocks it for testing. Real payments (App Store / Google Play) come before launch.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors, gradients: Gradients) => StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05080F", paddingTop: 56, paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, color: colors.ink, fontSize: font.h1, fontWeight: "900" },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.accent, fontSize: 18, fontWeight: "900" },
  sub: { color: colors.muted, fontSize: font.small, marginTop: 4, marginBottom: 14 },
  reason: { color: colors.gold, fontSize: font.small, fontWeight: "700", marginTop: 6, marginBottom: 14 },
  billRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  billTab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill, backgroundColor: "rgba(3,5,10,0.35)", borderWidth: 1, borderColor: "rgba(34,184,176,0.25)" },
  billTabOn: { backgroundColor: "rgba(34,184,176,0.12)", borderColor: colors.accent },
  billText: { color: colors.muted, fontSize: font.small, fontWeight: "800" },
  billTextOn: { color: colors.accent, fontWeight: "900" },
  card: { backgroundColor: "rgba(3,5,10,0.4)", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(34,184,176,0.25)", padding: 16, marginBottom: 12 },
  cardHot: { borderColor: colors.accent, borderWidth: 1.5 },
  cardCurrent: { borderColor: colors.gold },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  planName: { color: colors.ink, fontSize: font.h3, fontWeight: "900" },
  planBlurb: { color: colors.muted, fontSize: font.small, marginTop: 1 },
  price: { color: colors.accent, fontSize: font.h3, fontWeight: "900" },
  feat: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  featText: { color: colors.ink, fontSize: font.small, fontWeight: "600", flex: 1 },
  cta: { borderRadius: radius.md, paddingVertical: 13, alignItems: "center" },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900" },
  currentTag: { color: colors.gold, fontSize: font.small, fontWeight: "800", marginTop: 10 },
  restore: { alignItems: "center", paddingVertical: 14 },
  restoreText: { color: colors.muted, fontSize: font.small, fontWeight: "800" },
  legal: { color: colors.faint, fontSize: font.tiny, textAlign: "center", lineHeight: font.tiny + 5, paddingHorizontal: 10 },
});
