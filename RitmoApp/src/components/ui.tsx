// Shared UI building blocks for the Ritmo design system.

import React from "react";
import { Text, Pressable, StyleSheet, View, ViewStyle, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { radius, spacing, font, type Colors, type Gradients } from "../theme";
import { useTheme, useThemedStyles } from "../lib/theme-context";
import { avatarSource } from "../data/avatars";

// Text filled with a smooth gradient (navy → teal → gold by default).
export function GradientText({
  text,
  style,
  colors: cols = ["#1E5A8E", "#1F9A8C", "#E4B84C"],
}: {
  text: string;
  style?: any;
  colors?: string[];
}) {
  return (
    <MaskedView maskElement={<Text style={[style, { backgroundColor: "transparent" }]}>{text}</Text>}>
      <LinearGradient colors={cols as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

// Clean, professional line-icons per subject (represents the topic, not childish).
type MciName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const SUBJECT_ICON: Record<string, MciName> = {
  numbers: "numeric",
  colors: "palette-outline",
  greetings: "message-text-outline",
  vacation: "beach",
  cooking: "chef-hat",
  family: "account-group-outline",
  days: "calendar-month-outline",
  food: "silverware-fork-knife",
  animals: "paw-outline",
  body: "heart-pulse",
  clothing: "tshirt-crew-outline",
  weather: "weather-partly-cloudy",
  feelings: "emoticon-happy-outline",
  home: "home-outline",
  directions: "compass-outline",
  shopping: "shopping-outline",
  verbs: "flash-outline",
  pronouns: "account-multiple-outline",
  questions: "help-circle-outline",
  descriptions: "shape-outline",
  jobs: "briefcase-outline",
  school: "school-outline",
  technology: "cellphone",
  hobbies: "run",
  transportation: "bus",
  places: "city-variant-outline",
  time: "clock-outline",
  nature: "tree-outline",
  emergencies: "ambulance",
};

export function SubjectIcon({ subject, size, color = "#fff" }: { subject: string; size: number; color?: string }) {
  return <MaterialCommunityIcons name={SUBJECT_ICON[subject] ?? "music-note"} size={size} color={color} />;
}

export function Screen({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.screen}>{children}</View>;
}

export function GradientButton({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: string;
}) {
  const { gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
      <LinearGradient
        colors={gradients[variant] ?? gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.btn}
      >
        <Text style={styles.btnText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  iconColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: MciName;
  iconColor?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.chip, selected && styles.chipSelected, icon ? { flexDirection: "row", alignItems: "center", gap: 6 } : null]}>
        {icon ? <MaterialCommunityIcons name={icon} size={16} color={iconColor ?? (selected ? colors.accent : colors.muted)} /> : null}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel} ›</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

// "Cover art" tile — dark translucent with a neon subject icon, matching the
// topic tiles throughout the app so every subject symbol looks consistent.
export function ArtTile({
  subject,
  size = 150,
  colors: cols,
  rounded = radius.lg,
}: {
  subject: string;
  size?: number;
  colors?: [string, string];
  rounded?: number;
}) {
  const { gradients } = useTheme();
  const pair = cols ?? gradients.violet;
  const c = pair[0]; // the subject's neon accent colour
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(7,11,19,0.6)",
        borderWidth: 1,
        borderColor: `${c}66`,
      }}
    >
      <SubjectIcon subject={subject} size={Math.round(size * 0.46)} color={c} />
    </View>
  );
}

export function ProgressBar({ pct, height = 6 }: { pct: number; height?: number }) {
  const { gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height, borderRadius: height / 2 }}
      />
    </View>
  );
}

export function StatTile({ value, label, color }: { value: string | number; label: string; color: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

// ---- Bottom tab bar with a raised center Create button ------------------
export type TabKey = "home" | "learn" | "create" | "library" | "profile";

const TAB_META: { key: TabKey; label: string; icon: string }[] = [
  { key: "home", label: "Home", icon: "⌂" },
  { key: "learn", label: "Learn", icon: "📖" },
  { key: "create", label: "Create", icon: "＋" },
  { key: "library", label: "Library", icon: "♫" },
  { key: "profile", label: "Profile", icon: "○" },
];

const isUriAvatar = (a?: string) =>
  !!a && (a.startsWith("file:") || a.startsWith("http") || a.startsWith("content:") || a.startsWith("data:") || a.startsWith("ph:") || a.startsWith("assets-library:"));

export function TabBar({ active, onSelect, avatar }: { active: TabKey; onSelect: (k: TabKey) => void; avatar?: string }) {
  const { gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const avImg = avatarSource(avatar) ?? (isUriAvatar(avatar) ? { uri: avatar } : null);
  return (
    <View style={styles.tabBar}>
      {TAB_META.map((t) => {
        if (t.key === "create") {
          return (
            <Pressable key={t.key} style={styles.fabWrap} onPress={() => onSelect("create")}>
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
                <Text style={styles.fabPlus}>＋</Text>
              </LinearGradient>
              <Text style={styles.fabLabel}>Create</Text>
            </Pressable>
          );
        }
        const on = active === t.key;
        if (t.key === "profile" && avImg) {
          return (
            <Pressable key={t.key} style={styles.tab} onPress={() => onSelect(t.key)}>
              <Image source={avImg} style={[styles.tabAvatar, on && styles.tabAvatarOn]} />
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{t.label}</Text>
            </Pressable>
          );
        }
        return (
          <Pressable key={t.key} style={styles.tab} onPress={() => onSelect(t.key)}>
            <Text style={[styles.tabIcon, on && styles.tabIconOn]}>{t.key === "profile" ? (avatar || t.icon) : t.icon}</Text>
            <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Colors, gradients: Gradients) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  btn: { borderRadius: radius.md, paddingVertical: 16, paddingHorizontal: 20, alignItems: "center" },
  btnText: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900", letterSpacing: 0.3 },
  chip: {
    backgroundColor: "rgba(7,11,19,0.5)",
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(34,184,176,0.3)",
  },
  chipSelected: { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: "rgba(34,184,176,0.15)" },
  chipText: { color: colors.muted, fontSize: font.small, fontWeight: "700" },
  chipTextSelected: { color: colors.accent, fontWeight: "900" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.ink, fontSize: font.h2, fontWeight: "900" },
  sectionAction: { color: colors.accent, fontSize: font.small, fontWeight: "800" },
  card: { backgroundColor: "rgba(7,11,19,0.5)", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", shadowColor: colors.accent, shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", width: "100%" },
  statTile: {
    flex: 1,
    backgroundColor: "rgba(7,11,19,0.5)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(34,184,176,0.3)",
    paddingVertical: 9,
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  statValue: { fontSize: font.h3, fontWeight: "900" },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 1, textAlign: "center" },
  sectionLabel: { color: colors.ink, fontSize: font.h3, fontWeight: "800", marginBottom: spacing.sm, marginTop: spacing.md },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(6,10,18,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(34,184,176,0.18)",
    paddingBottom: 26,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  tabIcon: { color: colors.faint, fontSize: 20 },
  tabIconOn: { color: colors.accent },
  tabAvatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: "transparent" },
  tabAvatarOn: { borderColor: colors.accent, borderWidth: 2 },
  tabLabel: { color: colors.faint, fontSize: font.tiny, fontWeight: "700" },
  tabLabelOn: { color: colors.accent },
  fabWrap: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: -28 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  fabPlus: { color: "#E6EAF0", fontSize: 32, fontWeight: "300", marginTop: -2 },
  fabLabel: { color: colors.accent, fontSize: font.tiny, fontWeight: "800", marginTop: 4 },
});
