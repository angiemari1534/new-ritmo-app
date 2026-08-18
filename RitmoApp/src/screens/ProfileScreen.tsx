import React, { useState } from "react";
import { Text, View, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Screen, StatTile, ProgressBar } from "../components/ui";
import { colors, spacing, font, radius, gradients } from "../theme";
import { GENRES, TIERS } from "../data/presets";
import { AVATAR_KEYS, avatarSource } from "../data/avatars";
import type { Settings, Playlist } from "../lib/storage";
import { planName, creationCap, monthKey, BILLING_ENABLED } from "../lib/entitlements";

const FONT_OPTIONS = [
  { label: "Small", value: 0.85 },
  { label: "Medium", value: 1 },
  { label: "Large", value: 1.2 },
];

// A photo avatar is stored as a URI; an emoji/text avatar is a short string.
const isPhotoAvatar = (a?: string) =>
  !!a && (a.startsWith("file:") || a.startsWith("http") || a.startsWith("content:") || a.startsWith("data:") || a.startsWith("ph:") || a.startsWith("assets-library:"));

const HOME_ROWS = [
  { key: "continueLearning" as const, icon: "play-circle-outline", label: "Continue Learning" },
  { key: "madeForYou" as const, icon: "creation", label: "Made for you" },
  { key: "favorites" as const, icon: "heart-outline", label: "Favorites" },
  { key: "levels" as const, icon: "school-outline", label: "Levels (Starter, Explorer…)" },
  { key: "playlists" as const, icon: "playlist-music-outline", label: "Playlists" },
  { key: "memory" as const, icon: "brain", label: "Memory Mix" },
];
const LANGUAGES = [
  { label: "Spanish", flag: "🇪🇸" },
  { label: "French", flag: "🇫🇷" },
  { label: "Italian", flag: "🇮🇹" },
  { label: "German", flag: "🇩🇪" },
  { label: "Portuguese", flag: "🇵🇹" },
];
// Varied symbol colours so the Profile rows aren't a wall of turquoise (which
// also reads as the topic/accent colour). Rotated per row.
const ICON_COLORS = ["#D8A43A", "#C4622E", "#7C8A4A", "#B98A2E", "#BF6B4A", "#CC9544", "#A0522D", "#9AA46A"];
const MOODS = ["Energetic", "Chill", "Dance", "Romantic", "Tropical", "Party", "Happy", "Sad", "Dreamy", "Groovy", "Powerful", "Calm"];
const TEMPOS = ["Slow", "Normal", "Fast"];
const GOALS = [1, 2, 3, 5];

type EditKey = "language" | "music" | "goal" | "notifications" | "account" | "help" | null;

// Extra settings rows (plan / app). These just show info for now.
const PLAN_ROWS = [
  { key: "subscription", i: "credit-card-outline", t: "Subscription", s: "Free plan",
    at: "Subscription", ab: "You're on the Free plan. A Premium plan (unlimited songs, precise karaoke on every song, cloud backup) is coming soon." },
  { key: "upgrade", i: "rocket-launch-outline", t: "Upgrade to Premium", s: "Coming soon",
    at: "Upgrade to Premium", ab: "Premium is coming soon: unlimited song creation, precise karaoke on every song, cloud backup across your devices, and no ads. We'll let you know the moment it's ready." },
  { key: "backup", i: "cloud-outline", t: "Backup & sync", s: "Coming soon",
    at: "Backup & sync", ab: "Soon you'll be able to back up your songs, progress and playlists to the cloud and sync them across devices." },
  { key: "restore", i: "restore", t: "Restore purchases", s: "",
    at: "Restore purchases", ab: "No purchases to restore yet — Premium isn't available quite yet." },
  { key: "about", i: "information-outline", t: "About Ritmo", s: "Version 1.0",
    at: "About Ritmo", ab: "Ritmo — learn languages through AI-generated bilingual songs.\n\nVersion 1.0" },
  { key: "rate", i: "star-outline", t: "Rate Ritmo", s: "",
    at: "Rate Ritmo", ab: "Thanks for using Ritmo! Ratings will be available once Ritmo is published to the app stores." },
];

// A rounded icon box with a themed vector symbol (not an emoji).
function RowIcon({ name, color }: { name: string; color?: string }) {
  return (
    <View style={styles.rowIconBox}>
      <MaterialCommunityIcons name={name as any} size={20} color={color ?? colors.accent} />
    </View>
  );
}

export default function ProfileScreen({
  songsMade,
  wordsLearned,
  lessonsDone,
  streak,
  songsToday,
  settings,
  playlists = [],
  onUpdateSettings,
  onResetData,
  onResetJourney,
  onKaraokeOlder,
  karaokeStatus = "",
  onOpenPaywall,
}: {
  songsMade: number;
  wordsLearned: number;
  lessonsDone: number;
  streak: number;
  songsToday: number;
  settings: Settings;
  playlists?: Playlist[];
  onUpdateSettings: (p: Partial<Settings>) => void;
  onResetData: () => void;
  onResetJourney?: () => void;
  onKaraokeOlder?: () => void;
  karaokeStatus?: string;
  onOpenPaywall?: () => void;
}) {
  const [editing, setEditing] = useState<EditKey>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");

  async function pickAvatarPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Allow photo access in Settings to upload your own picture.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      onUpdateSettings({ avatar: res.assets[0].uri });
      setAvatarOpen(false);
    }
  }
  const xp = songsMade * 40 + wordsLearned * 5 + lessonsDone * 20;
  const level = Math.floor(xp / 500) + 1;
  const intoLevel = xp % 500;
  const langFlag = LANGUAGES.find((l) => l.label === settings.language)?.flag ?? "🌐";

  const rows = [
    { key: "language" as const, i: "web", t: "Language", s: `${langFlag} ${settings.language}` },
    { key: "music" as const, i: "tune-vertical", t: "Music preferences", s: `${settings.defaultGenres.join(", ") || "any"} · ${settings.defaultMoods.join(", ") || "any"}` },
    { key: "goal" as const, i: "target", t: "Learning goals", s: `${settings.dailyGoal}/day · ${songsToday} today` },
    { key: "notifications" as const, i: "bell-outline", t: "Notifications", s: settings.reminders ? "Reminders on" : "Reminders off" },
    { key: "account" as const, i: "account-outline", t: "Account", s: settings.name },
    { key: "help" as const, i: "help-circle-outline", t: "Help", s: "Support & FAQs" },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <LinearGradient colors={gradients.night} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.headRow}>
            <Pressable onPress={() => setAvatarOpen(true)}>
              {avatarSource(settings.avatar) ? (
                <Image source={avatarSource(settings.avatar)} style={styles.avatarPhoto} />
              ) : isPhotoAvatar(settings.avatar) ? (
                <Image source={{ uri: settings.avatar }} style={styles.avatarPhoto} />
              ) : (
                <LinearGradient colors={gradients.purplePink} style={styles.avatar}>
                  <Text style={styles.avatarText}>{settings.avatar}</Text>
                </LinearGradient>
              )}
              <View style={styles.avatarEdit}><MaterialCommunityIcons name="pencil" size={12} color="#fff" /></View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{settings.name}</Text>
              <Text style={styles.lang}>{langFlag} {settings.language}</Text>
            </View>
            <View style={styles.streakChip}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MaterialCommunityIcons name="fire" size={16} color={colors.gold} />
                <Text style={styles.streakNum}>{streak}</Text>
              </View>
              <Text style={styles.streakLbl}>day streak</Text>
            </View>
          </View>
          <View style={styles.mottoRow}>
            <MaterialCommunityIcons name="creation" size={14} color={ICON_COLORS[0]} />
            <Text style={styles.motto}>Keep the rhythm, keep learning!</Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <ProgressBar pct={(intoLevel / 500) * 100} height={8} />
          </View>
          <View style={styles.levelRow}>
            <Text style={styles.xpText}>{500 - intoLevel} XP to next level</Text>
            <Text style={styles.levelText}>Level {level}</Text>
          </View>
        </LinearGradient>

        <View style={styles.stats}>
          <StatTile value={songsMade} label="Songs made" color={colors.pink} />
          <StatTile value={wordsLearned} label="Words learned" color={colors.good} />
          <StatTile value={lessonsDone} label="Lessons done" color={colors.gold} />
          <StatTile value={streak} label="Day streak" color={colors.blue} />
        </View>

        <Text style={styles.section}>Lyrics text size</Text>
        <View style={styles.segment}>
          {FONT_OPTIONS.map((o) => {
            const on = Math.abs(settings.fontScale - o.value) < 0.01;
            return on ? (
              <Pressable key={o.label} style={{ flex: 1 }} onPress={() => onUpdateSettings({ fontScale: o.value })}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.seg}>
                  <Text style={styles.segTextOn}>{o.label}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable key={o.label} style={[styles.seg, { flex: 1 }]} onPress={() => onUpdateSettings({ fontScale: o.value })}>
                <Text style={styles.segText}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Song word order</Text>
        <View style={styles.segment}>
          {[
            { label: `${settings.language} → English`, value: "es-en" as const },
            { label: `English → ${settings.language}`, value: "en-es" as const },
          ].map((o) => {
            const on = settings.order === o.value;
            return on ? (
              <Pressable key={o.value} style={{ flex: 1 }} onPress={() => onUpdateSettings({ order: o.value })}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.seg}>
                  <Text style={styles.segTextOn} numberOfLines={1} adjustsFontSizeToFit>{o.label}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable key={o.value} style={[styles.seg, { flex: 1 }]} onPress={() => onUpdateSettings({ order: o.value })}>
                <Text style={styles.segText} numberOfLines={1} adjustsFontSizeToFit>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>Which language you hear first in each line of new songs.</Text>

        <Text style={styles.section}>Karaoke</Text>
        <Pressable
          onPress={() => {
            if (!onKaraokeOlder) return;
            Alert.alert(
              "Add karaoke to older songs?",
              "This lines up the lyrics with the singing for songs you made before karaoke existed. It reads each song's audio (never changes it). Downloaded songs work best.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Add karaoke", onPress: onKaraokeOlder },
              ]
            );
          }}
          style={styles.karaokeBtn}
        >
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.karaokeBtnInner}>
            <View style={styles.btnRow}>
              <MaterialCommunityIcons name="microphone" size={18} color="#fff" />
              <Text style={styles.karaokeBtnText}>Add karaoke to my older songs</Text>
            </View>
          </LinearGradient>
        </Pressable>
        {karaokeStatus ? <Text style={styles.hint}>{karaokeStatus}</Text> : null}

        <Text style={styles.section}>Intro tour</Text>
        <Pressable onPress={() => onUpdateSettings({ onboarded: false })} style={styles.tourBtn}>
          <View style={styles.btnRow}>
            <MaterialCommunityIcons name="play-circle-outline" size={18} color="#B9C1CE" />
            <Text style={styles.tourBtnText}>Replay the intro tour</Text>
          </View>
        </Pressable>

        <Text style={styles.section}>Journey</Text>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Start journey fresh?",
              "This clears all your finished-lesson circles on the map so you begin from the very start. Your songs and words are kept.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Start fresh", style: "destructive", onPress: () => onResetJourney?.() },
              ]
            )
          }
          style={styles.tourBtn}
        >
          <View style={styles.btnRow}>
            <MaterialCommunityIcons name="compass-outline" size={18} color="#B9C1CE" />
            <Text style={styles.tourBtnText}>Start my journey fresh</Text>
          </View>
        </Pressable>

        <Text style={styles.section}>Home screen tiles</Text>
        <View style={styles.list}>
          {HOME_ROWS.map((r, idx) => {
            const on = settings.homeSections[r.key];
            return (
              <Pressable
                key={r.key}
                onPress={() => onUpdateSettings({ homeSections: { ...settings.homeSections, [r.key]: !on } })}
              >
                <View style={[styles.row, idx === HOME_ROWS.length - 1 && { borderBottomWidth: 0 }]}>
                  <RowIcon name={r.icon} color={ICON_COLORS[idx % ICON_COLORS.length]} />
                  <Text style={[styles.rowTitle, { flex: 1 }]}>{r.label}</Text>
                  <View style={[styles.toggle, on && styles.toggleOn]}>
                    <View style={[styles.dot, on && styles.dotOn]} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.hint}>Choose which sections show on your Home screen.</Text>

        <Text style={styles.section}>Playlists on Home</Text>
        <View style={styles.list}>
          {settings.homeSections.levels && TIERS.map((t) => {
            const on = settings.homeLevels.includes(t.key);
            return (
              <Pressable
                key={t.key}
                onPress={() =>
                  onUpdateSettings({
                    homeLevels: on
                      ? settings.homeLevels.filter((x) => x !== t.key)
                      : [...settings.homeLevels, t.key],
                  })
                }
              >
                <View style={styles.row}>
                  <RowIcon name="school-outline" color={ICON_COLORS[2]} />
                  <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{t.label} level</Text>
                  <View style={[styles.toggle, on && styles.toggleOn]}>
                    <View style={[styles.dot, on && styles.dotOn]} />
                  </View>
                </View>
              </Pressable>
            );
          })}
          {settings.homeSections.playlists && playlists.map((p, idx) => {
            const on = settings.homePlaylists.includes(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  onUpdateSettings({
                    homePlaylists: on
                      ? settings.homePlaylists.filter((x) => x !== p.id)
                      : [...settings.homePlaylists, p.id],
                  })
                }
              >
                <View style={[styles.row, idx === playlists.length - 1 && { borderBottomWidth: 0 }]}>
                  <RowIcon name="playlist-music-outline" color={ICON_COLORS[idx % ICON_COLORS.length]} />
                  <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{p.name}</Text>
                  <View style={[styles.toggle, on && styles.toggleOn]}>
                    <View style={[styles.dot, on && styles.dotOn]} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>Turn on the level playlists and playlists you want to see on your Home screen.</Text>

        <Text style={styles.section}>Learning</Text>
        <View style={styles.list}>
          <Pressable onPress={() => onUpdateSettings({ autoPrepare: !settings.autoPrepare })}>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <RowIcon name="flash-outline" color={ICON_COLORS[4]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Prepare my next lesson automatically</Text>
                <Text style={styles.rowSub}>Builds the next song ahead from your preferences — shuffled to a fresh feel each time (never the same style twice in a row). Uses a little extra credit.</Text>
              </View>
              <View style={[styles.toggle, settings.autoPrepare && styles.toggleOn]}>
                <View style={[styles.dot, settings.autoPrepare && styles.dotOn]} />
              </View>
            </View>
          </Pressable>
        </View>

        <Text style={styles.section}>Preferences</Text>
        <View style={styles.list}>
          {rows.map((r, idx) => (
            <Pressable key={r.key} onPress={() => setEditing(r.key)}>
              <View style={[styles.row, idx === rows.length - 1 && { borderBottomWidth: 0 }]}>
                <RowIcon name={r.i} color={ICON_COLORS[idx % ICON_COLORS.length]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.t}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{r.s}</Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{BILLING_ENABLED ? "Subscription & more" : "More"}</Text>
        <View style={styles.list}>
          {PLAN_ROWS
            // While billing is off, hide every pay-related row entirely.
            .filter((r) => BILLING_ENABLED || !(r.key === "subscription" || r.key === "upgrade" || r.key === "restore"))
            .map((r, idx, rows) => {
            // The paywall rows show the live plan / usage and open the paywall.
            const paywallRow = r.key === "subscription" || r.key === "upgrade" || r.key === "restore";
            const used = settings.billMonth === monthKey() ? settings.creations : 0;
            const sub =
              r.key === "subscription" ? `${planName(settings.plan)} plan · ${used}/${creationCap(settings.plan)} songs this month`
              : r.key === "upgrade" ? "See plans & pricing"
              : r.s;
            return (
              <Pressable key={r.key} onPress={() => (paywallRow && onOpenPaywall ? onOpenPaywall() : Alert.alert(r.at, r.ab))}>
                <View style={[styles.row, idx === rows.length - 1 && { borderBottomWidth: 0 }]}>
                  <RowIcon name={r.i} color={ICON_COLORS[(idx + 3) % ICON_COLORS.length]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{r.t}</Text>
                    {!!sub && <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>}
                  </View>
                  <Text style={styles.chev}>›</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.footer}>Ritmo · learn languages through songs</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      <SettingsSheet
        editing={editing}
        settings={settings}
        onClose={() => setEditing(null)}
        onUpdate={onUpdateSettings}
        onResetData={onResetData}
      />

      <Modal visible={avatarOpen} transparent animationType="slide" onRequestClose={() => setAvatarOpen(false)}>
        <Pressable style={sheet.backdrop} onPress={() => setAvatarOpen(false)} />
        <View style={sheet.card}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>Choose an avatar</Text>

          <Pressable onPress={pickAvatarPhoto}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.uploadBtn}>
              <View style={styles.btnRow}>
                <MaterialCommunityIcons name="camera-outline" size={18} color="#fff" />
                <Text style={styles.uploadText}>Upload my own picture</Text>
              </View>
            </LinearGradient>
          </Pressable>

          <View style={styles.customRow}>
            <TextInput
              value={customEmoji}
              onChangeText={setCustomEmoji}
              placeholder="Or type any emoji or initials…"
              placeholderTextColor={colors.faint}
              style={styles.customInput}
            />
            <Pressable
              onPress={() => {
                const v = customEmoji.trim();
                if (v) { onUpdateSettings({ avatar: v }); setCustomEmoji(""); setAvatarOpen(false); }
              }}
            >
              <View style={[styles.customUse, !customEmoji.trim() && { opacity: 0.4 }]}>
                <Text style={styles.customUseText}>Use</Text>
              </View>
            </Pressable>
          </View>

          <Text style={styles.pickHint}>Or pick a character ({AVATAR_KEYS.length})</Text>
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            <View style={styles.avatarGrid}>
              {AVATAR_KEYS.map((k) => (
                <Pressable key={k} onPress={() => { onUpdateSettings({ avatar: k }); setAvatarOpen(false); }}>
                  <View style={[styles.avatarImgOption, settings.avatar === k && styles.avatarOptionOn]}>
                    <Image source={avatarSource(k)} style={styles.avatarImg} />
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Pressable onPress={() => setAvatarOpen(false)} style={{ marginTop: 12, alignItems: "center", paddingVertical: 10 }}>
            <Text style={{ color: colors.muted, fontSize: font.body, fontWeight: "800" }}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

function SettingsSheet({
  editing,
  settings,
  onClose,
  onUpdate,
  onResetData,
}: {
  editing: EditKey;
  settings: Settings;
  onClose: () => void;
  onUpdate: (p: Partial<Settings>) => void;
  onResetData: () => void;
}) {
  const [name, setName] = useState(settings.name);

  const titleMap: Record<string, string> = {
    language: "Choose a language",
    music: "Default music style",
    goal: "Daily goal",
    notifications: "Notifications",
    account: "Account",
    help: "Help & FAQ",
  };

  return (
    <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={sheet.card}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>{editing ? titleMap[editing] : ""}</Text>
        <ScrollView style={{ maxHeight: 380 }}>
          {editing === "language" && (
            <>
              <Text style={sheet.note}>Each language has its own separate library, progress and words. Switching gives you a fresh space for that language — nothing in your other languages is lost, and switching back brings it all right back.</Text>
              {LANGUAGES.map((l) => (
                <OptionRow key={l.label} label={`${l.flag}  ${l.label}`} on={settings.language === l.label} onPress={() => onUpdate({ language: l.label })} />
              ))}
            </>
          )}

          {editing === "music" && (
            <>
              <Text style={sheet.note}>Pick as many as you like — used for your default style and the "mix up" batches.</Text>
              <Text style={sheet.group}>Genres</Text>
              <View style={sheet.chips}>
                {GENRES.map((g) => (
                  <Chip
                    key={g}
                    label={g}
                    on={settings.defaultGenres.includes(g)}
                    onPress={() =>
                      onUpdate({
                        defaultGenres: settings.defaultGenres.includes(g)
                          ? settings.defaultGenres.filter((x) => x !== g)
                          : [...settings.defaultGenres, g],
                      })
                    }
                  />
                ))}
              </View>
              <Text style={sheet.group}>Moods</Text>
              <View style={sheet.chips}>
                {MOODS.map((m) => (
                  <Chip
                    key={m}
                    label={m}
                    on={settings.defaultMoods.includes(m)}
                    onPress={() =>
                      onUpdate({
                        defaultMoods: settings.defaultMoods.includes(m)
                          ? settings.defaultMoods.filter((x) => x !== m)
                          : [...settings.defaultMoods, m],
                      })
                    }
                  />
                ))}
              </View>
              <Text style={sheet.group}>Tempo</Text>
              <View style={sheet.chips}>
                {TEMPOS.map((t) => (
                  <Chip key={t} label={t} on={settings.defaultTempo === t} onPress={() => onUpdate({ defaultTempo: t })} />
                ))}
              </View>
              <Text style={sheet.group}>Favorite artist(s)</Text>
              <TextInput
                value={settings.prefArtist}
                onChangeText={(t) => onUpdate({ prefArtist: t })}
                placeholder="e.g. Bad Bunny, Shakira, Juanes"
                placeholderTextColor={colors.faint}
                style={sheet.input}
              />
              <Text style={sheet.group}>Songs you like</Text>
              <TextInput
                value={settings.prefSongs}
                onChangeText={(t) => onUpdate({ prefSongs: t })}
                placeholder="e.g. an upbeat summer beach hit, a slow ballad"
                placeholderTextColor={colors.faint}
                style={sheet.input}
              />
              <Text style={sheet.note}>Your lessons use these to set the vibe — and every song is shuffled to a new feel automatically.</Text>
            </>
          )}

          {editing === "goal" && (
            <>
              <Text style={sheet.note}>How many songs do you want to make each day?</Text>
              {GOALS.map((g) => (
                <OptionRow key={g} label={`${g} song${g > 1 ? "s" : ""} per day`} on={settings.dailyGoal === g} onPress={() => onUpdate({ dailyGoal: g })} />
              ))}
            </>
          )}

          {editing === "notifications" && (
            <>
              <Text style={sheet.note}>A daily nudge to keep your streak going.</Text>
              <Pressable onPress={() => onUpdate({ reminders: !settings.reminders })}>
                <View style={sheet.toggleRow}>
                  <Text style={sheet.optLabel}>Daily practice reminder</Text>
                  <View style={[sheet.toggle, settings.reminders && sheet.toggleOn]}>
                    <View style={[sheet.dot, settings.reminders && sheet.dotOn]} />
                  </View>
                </View>
              </Pressable>
              <Text style={sheet.small}>
                {settings.reminders ? "Saved: reminders on." : "Saved: reminders off."} (Delivery to your lock screen comes with the App Store version.)
              </Text>
            </>
          )}

          {editing === "account" && (
            <>
              <Text style={sheet.group}>Your name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                onEndEditing={() => onUpdate({ name: name.trim() || "Ritmo Learner" })}
                placeholder="Your name"
                placeholderTextColor={colors.faint}
                style={sheet.input}
              />
              <Pressable onPress={() => onUpdate({ name: name.trim() || "Ritmo Learner" })} style={sheet.saveBtn}>
                <Text style={sheet.saveText}>Save name</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert("Clear all data?", "This deletes your songs, progress and streak. This can't be undone.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete everything", style: "destructive", onPress: () => { onResetData(); onClose(); } },
                  ])
                }
                style={sheet.dangerBtn}
              >
                <Text style={sheet.dangerText}>Clear all my data</Text>
              </Pressable>
            </>
          )}

          {editing === "help" && (
            <View>
              {[
                ["How are songs made?", "You pick a topic, level, and beat. An AI writes bilingual lyrics with a catchy repeated chorus, then generates the sung music."],
                ["Why does it take a minute?", "Creating real sung audio is heavy work. You can leave the Create screen — it finishes in the background and appears with a 'ready' banner."],
                ["How do lessons work?", "Each lesson teaches new words. Finished lessons get a ✓ and it points you to the next one."],
                ["Does it keep playing?", "Yes — a song keeps playing as you move around the app. Use the ✕ on the mini-player to stop it."],
              ].map(([q, a]) => (
                <View key={q} style={sheet.faq}>
                  <Text style={sheet.q}>{q}</Text>
                  <Text style={sheet.a}>{a}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <Pressable onPress={onClose} style={sheet.doneBtn}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sheet.done}>
            <Text style={sheet.doneText}>Done</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Modal>
  );
}

function OptionRow({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={[sheet.opt, on && sheet.optOn]}>
        <Text style={[sheet.optLabel, on && { color: "#E6EAF0" }]}>{label}</Text>
        {on && <Text style={sheet.check}>✓</Text>}
      </View>
    </Pressable>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={[sheet.chip, on ? sheet.chipOn : sheet.chipOff]}>
        <Text style={[sheet.chipText, on && sheet.chipTextOn]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 60 },
  tourBtn: { borderRadius: radius.md, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "rgba(157,178,204,0.4)", backgroundColor: "rgba(7,11,19,0.5)" },
  tourBtnText: { color: "#B9C1CE", fontWeight: "900", fontSize: font.body },
  karaokeBtn: { borderRadius: radius.md, overflow: "hidden", marginTop: 4 },
  karaokeBtnInner: { paddingVertical: 13, alignItems: "center" },
  karaokeBtnText: { color: "#E6EAF0", fontWeight: "900", fontSize: font.body },
  title: { color: colors.ink, fontSize: font.h1, fontWeight: "900", textAlign: "center", marginBottom: spacing.md },
  card: { borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.line },
  headRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarPhoto: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.card },
  avatarText: { fontSize: 28 },
  uploadBtn: { borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  uploadText: { color: "#E6EAF0", fontSize: font.body, fontWeight: "900" },
  customRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  customInput: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: font.body, paddingVertical: 12, paddingHorizontal: 14 },
  customUse: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  customUseText: { color: "#062", fontWeight: "900", fontSize: font.body },
  pickHint: { color: colors.muted, fontSize: font.small, fontWeight: "800", marginBottom: 10 },
  avatarEdit: { position: "absolute", bottom: -2, right: -2, backgroundColor: colors.pink, borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg2 },
  avatarEditText: { color: "#E6EAF0", fontSize: 10, fontWeight: "900" },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  avatarOption: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  avatarImgOption: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.line, overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarOptionCenter: { alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  avatarOptionEmoji: { fontSize: 30 },
  avatarOptionOn: { borderColor: colors.accent, borderWidth: 3 },
  avatarOptionText: { fontSize: 26 },
  name: { color: colors.ink, fontSize: font.h2, fontWeight: "900" },
  lang: { color: colors.good, fontSize: font.small, marginTop: 2, fontWeight: "700" },
  streakChip: { alignItems: "center" },
  streakNum: { color: colors.gold, fontSize: font.h3, fontWeight: "900" },
  streakLbl: { color: colors.muted, fontSize: font.tiny },
  motto: { color: colors.muted, fontSize: font.small },
  mottoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  levelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  xpText: { color: colors.muted, fontSize: font.small },
  levelText: { color: colors.accent, fontSize: font.small, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  section: { color: colors.accent, fontSize: font.h3, fontWeight: "900", marginTop: spacing.xl, marginBottom: spacing.sm },
  hint: { color: colors.muted, fontSize: font.small, marginTop: 8 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", justifyContent: "center", paddingHorizontal: 3 },
  toggleOn: { backgroundColor: "rgba(34,184,176,0.3)", borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.faint, alignSelf: "flex-start" },
  dotOn: { backgroundColor: colors.accent, alignSelf: "flex-end" },
  segment: { flexDirection: "row", gap: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 5, borderWidth: 1, borderColor: colors.line },
  seg: { borderRadius: radius.sm, paddingVertical: 12, alignItems: "center" },
  segText: { color: colors.muted, fontWeight: "800", fontSize: font.small },
  segTextOn: { color: "#E6EAF0", fontWeight: "900", fontSize: font.small },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowIcon: { fontSize: 20 },
  rowIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  rowIconTxt: { fontSize: 14 },
  rowTitle: { color: colors.ink, fontSize: font.small, fontWeight: "700" },
  rowSub: { color: colors.muted, fontSize: font.tiny, marginTop: 1 },
  chev: { color: colors.faint, fontSize: 22 },
  darkRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, marginTop: spacing.md },
  alwaysOn: { color: colors.good, fontSize: font.small, fontWeight: "800" },
  footer: { color: colors.faint, fontSize: font.small, textAlign: "center", marginTop: spacing.xl },
});

const sheet = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  card: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#05080F",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: "rgba(34,184,176,0.25)",
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(34,184,176,0.4)", alignSelf: "center", marginBottom: 12 },
  title: { color: colors.ink, fontSize: font.h2, fontWeight: "900", marginBottom: 10 },
  note: { color: colors.muted, fontSize: font.small, marginBottom: 10 },
  group: { color: colors.ink, fontSize: font.body, fontWeight: "800", marginTop: 12, marginBottom: 8 },
  opt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(3,5,10,0.35)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(34,184,176,0.25)", paddingVertical: 10, paddingHorizontal: 12, marginBottom: 7 },
  optOn: { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: "rgba(34,184,176,0.1)" },
  optLabel: { color: colors.ink, fontSize: font.body, fontWeight: "700" },
  check: { color: colors.pink, fontWeight: "900", fontSize: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1 },
  chipOff: { backgroundColor: "rgba(3,5,10,0.35)", borderColor: "rgba(34,184,176,0.25)" },
  chipOn: { backgroundColor: "rgba(34,184,176,0.15)", borderColor: colors.accent, borderWidth: 1.5, shadowColor: colors.accent, shadowOpacity: 0.45, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  chipText: { color: colors.muted, fontSize: font.small, fontWeight: "700" },
  chipTextOn: { color: colors.accent, fontWeight: "900" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(3,5,10,0.35)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(34,184,176,0.25)", padding: 15 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", justifyContent: "center", paddingHorizontal: 3 },
  toggleOn: { backgroundColor: "rgba(34,184,176,0.3)", borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.faint, alignSelf: "flex-start" },
  dotOn: { backgroundColor: colors.accent, alignSelf: "flex-end" },
  small: { color: colors.faint, fontSize: font.small, marginTop: 10 },
  input: { backgroundColor: "rgba(3,5,10,0.35)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(34,184,176,0.25)", color: colors.ink, fontSize: font.body, padding: 14 },
  saveBtn: { backgroundColor: "rgba(34,184,176,0.12)", borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, padding: 13, alignItems: "center", marginTop: 10 },
  saveText: { color: colors.accent, fontWeight: "900" },
  dangerBtn: { borderRadius: radius.md, padding: 13, alignItems: "center", marginTop: 18, borderWidth: 1, borderColor: colors.pink },
  dangerText: { color: colors.pink, fontWeight: "800" },
  faq: { marginBottom: 14 },
  q: { color: colors.ink, fontSize: font.body, fontWeight: "800" },
  a: { color: colors.muted, fontSize: font.small, marginTop: 4, lineHeight: 20 },
  doneBtn: { marginTop: 14 },
  done: { borderRadius: radius.md, paddingVertical: 15, alignItems: "center" },
  doneText: { color: "#E6EAF0", fontWeight: "900", fontSize: font.body },
});
