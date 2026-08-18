import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet, ScrollView, Pressable, Modal, TextInput, Share, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Screen, ArtTile, GradientButton } from "../components/ui";
import { colors, spacing, font, radius, gradientFor, gradients } from "../theme";
import { LinearGradient } from "expo-linear-gradient";
import { songTitle, sendFlags } from "../lib/api";
import { tierLabel, subjectLabel } from "../data/presets";
import type { Song } from "../lib/api";
import type { Tier } from "../data/presets";
import type { Playlist, CatalogFlag } from "../lib/storage";

type Filter = "all" | "fav" | "downloads" | "playlists" | "catalog" | "mine";

const TIER_ORDER: Tier[] = ["prestarter", "starter", "beginner", "intermediate", "advanced"];

export default function LibraryScreen({
  songs,
  playlists,
  onOpenSong,
  onDelete,
  onCreate,
  onToggleFavorite,
  onAddToQueue,
  onDownload,
  onDeleteDownload,
  onRename,
  onRegenerate,
  catFlags,
  catLocked,
  onToggleFlag,
  focusFilter,
  onFocusConsumed,
  onShuffle,
  onShufflePlaylist,
  onPlayPlaylist,
  onCreatePlaylist,
  onAddToPlaylist,
  onDeletePlaylist,
  onRemoveFromPlaylist,
  onOpenSongInPlaylist,
}: {
  songs: Song[];
  playlists: Playlist[];
  onOpenSong: (s: Song, list?: Song[]) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onToggleFavorite: (id: string) => void;
  onAddToQueue: (s: Song) => void;
  onDownload: (id: string) => void;
  onDeleteDownload: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRegenerate: (s: Song) => void;
  catFlags: Record<string, CatalogFlag[]>;
  catLocked: string[];
  onToggleFlag: (id: string, flag: CatalogFlag) => void;
  focusFilter?: string | null;
  onFocusConsumed?: () => void;
  onShuffle: (list: Song[]) => void;
  onShufflePlaylist: (pl: Playlist) => void;
  onPlayPlaylist: (pl: Playlist) => void;
  onCreatePlaylist: (name: string, firstSongId?: string) => void;
  onAddToPlaylist: (playlistId: string, songId: string) => void;
  onDeletePlaylist: (id: string) => void;
  onRemoveFromPlaylist: (playlistId: string, songId: string) => void;
  onOpenSongInPlaylist: (s: Song, list?: Song[]) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  // Open on a specific filter when asked (e.g. Home's Favorites tile).
  useEffect(() => {
    if (focusFilter) {
      setFilter(focusFilter as Filter);
      setLevelFilter(null);
      setGenreFilter(null);
      setTopicFilter(null);
      onFocusConsumed?.();
    }
  }, [focusFilter]);
  const [menuSong, setMenuSong] = useState<Song | null>(null);
  const [pickerSong, setPickerSong] = useState<Song | null>(null);
  const [createFor, setCreateFor] = useState<{ open: boolean; songId?: string }>({ open: false });
  const [renameTarget, setRenameTarget] = useState<Song | null>(null);
  const [renameText, setRenameText] = useState("");
  const [newName, setNewName] = useState("");
  const [showFlags, setShowFlags] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<Tier | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [dropdown, setDropdown] = useState<null | "level" | "genre" | "topic">(null);

  const q = search.trim().toLowerCase();
  // Songs in the current tab (before level/genre filters) — the dropdowns and
  // counts are scoped to this, so Favorites/Downloads only list what they contain.
  const scopeSongs =
    filter === "fav" ? songs.filter((s) => s.favorite)
    : filter === "downloads" ? songs.filter((s) => s.localUri)
    : filter === "catalog" ? songs.filter((s) => s.catalog)
    : filter === "mine" ? songs.filter((s) => !s.catalog)
    : songs;
  let base = scopeSongs;
  if (levelFilter) base = base.filter((s) => s.level === levelFilter);
  if (genreFilter) base = base.filter((s) => (s.genre || "Other") === genreFilter);
  if (topicFilter) base = base.filter((s) => s.subject === topicFilter);
  const shown = q
    ? base.filter((s) => `${songTitle(s)} ${s.genre ?? ""} ${s.level} ${subjectLabel(s.subject)}`.toLowerCase().includes(q))
    : base;

  // Group into sections when EXACTLY ONE sort is chosen: by level → lesson,
  // by genre → level, by topic → level. Two+ (or none) show a flat list.
  const activeCount = (levelFilter ? 1 : 0) + (genreFilter ? 1 : 0) + (topicFilter ? 1 : 0);
  const sections = (() => {
    if (activeCount !== 1) return null;
    const groups: Record<string, Song[]> = {};
    if (levelFilter) {
      for (const s of shown) (groups[String(s.lesson)] ||= []).push(s);
      return Object.keys(groups)
        .map(Number)
        .sort((a, b) => a - b)
        .map((l) => ({
          title: `Lesson ${l}`,
          songs: groups[String(l)].sort((a, b) => String(a.genre ?? "").localeCompare(String(b.genre ?? ""))),
        }));
    }
    // genre OR topic chosen → group by level
    for (const s of shown) (groups[s.level] ||= []).push(s);
    return TIER_ORDER.filter((l) => groups[l]).map((l) => ({
      title: tierLabel(l),
      songs: groups[l].sort((a, b) => a.lesson - b.lesson),
    }));
  })();

  const pickFilter = (f: Filter) => {
    setFilter(f);
    setLevelFilter(null);
    setGenreFilter(null);
    setTopicFilter(null);
  };
  const levelsPresent = TIER_ORDER.filter((l) => scopeSongs.some((s) => s.level === l));
  const genresPresent = Array.from(new Set(scopeSongs.map((s) => s.genre || "Other"))).sort();
  const topicsPresent = Array.from(new Set(scopeSongs.map((s) => s.subject)))
    .sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b)));

  const renderRow = (s: Song) => (
    <Swipeable
      key={s.id}
      renderRightActions={() => (
        <Pressable
          onPress={() => (filter === "downloads" ? onDeleteDownload(s.id) : onDelete(s.id))}
          style={styles.swipeDelete}
        >
          <Text style={styles.swipeDeleteText}>{filter === "downloads" ? "Remove\ndownload" : "🗑  Delete"}</Text>
        </Pressable>
      )}
    >
      <Pressable onPress={() => onOpenSong(s, shown)}>
        <View style={styles.row}>
          <View style={styles.artCol}>
            <ArtTile subject={s.subject} size={44} colors={gradientFor(s.subject)} rounded={radius.md} />
            {s.catalog && catLocked.includes(s.id) && <View style={styles.lockDot} />}
          </View>
          <View style={styles.rowMid}>
            <Text style={styles.rowTitle} numberOfLines={1}>{songTitle(s)}</Text>
            {!!s.genre && <Text style={styles.rowMeta} numberOfLines={1}>{s.genre}</Text>}
            <View style={styles.metaRow}>
              <View style={styles.pillPair}>
                <View style={styles.lvlPill}>
                  <Text style={styles.lvlPillText} numberOfLines={1}>{(s.level === "prestarter" ? "Words" : tierLabel(s.level))} · L{s.lesson}</Text>
                </View>
                {s.catalog && (
                  <View style={styles.builtinPill}>
                    <Text style={styles.builtinPillText} numberOfLines={1}>★ Built-in</Text>
                  </View>
                )}
              </View>
              {s.localUri && <Text style={styles.dlDot}>⬇</Text>}
            </View>
            {s.catalog && (
              <View style={styles.flagRow}>
                <FlagBtn label="🔒 Lock" tone="lock" on={(catFlags[s.id] || []).includes("lock")} onPress={() => onToggleFlag(s.id, "lock")} />
                <FlagBtn label="🔄 Redo" tone="reroll" on={(catFlags[s.id] || []).includes("reroll")} onPress={() => onToggleFlag(s.id, "reroll")} />
                <FlagBtn label="⚠️ Genre" tone="bad" on={(catFlags[s.id] || []).includes("badgenre")} onPress={() => onToggleFlag(s.id, "badgenre")} />
              </View>
            )}
          </View>
          <View style={styles.rightCol}>
            <View style={styles.iconBtnRow}>
              <Pressable onPress={() => setPickerSong(s)} hitSlop={6}>
                <View style={styles.iconBtn}><Text style={styles.iconPlus}>＋</Text></View>
              </Pressable>
              <Pressable onPress={() => onToggleFavorite(s.id)} hitSlop={6}>
                <View style={[styles.iconBtn, s.favorite && styles.iconBtnFav]}><Text style={[styles.iconHeart, s.favorite && styles.iconHeartOn]}>{s.favorite ? "♥" : "♡"}</Text></View>
              </Pressable>
              <Pressable onPress={() => setMenuSong(s)} hitSlop={6}>
                <View style={styles.iconBtn}><Text style={styles.iconDots}>⋯</Text></View>
              </Pressable>
            </View>
            {s.rating === 1 && <View style={[styles.rateUp, styles.ratingUnder]}><Text style={styles.rateEmoji}>👍</Text></View>}
            {s.rating === -1 && <View style={[styles.rateDown, styles.ratingUnder]}><Text style={styles.rateEmoji}>👎</Text></View>}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
  const favCount = songs.filter((s) => s.favorite).length;
  const dlCount = songs.filter((s) => s.localUri).length;
  const catalogCount = songs.filter((s) => s.catalog).length;
  const mineCount = songs.filter((s) => !s.catalog).length;
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1500);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Library</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip label={`Songs (${songs.length})`} on={filter === "all" && !levelFilter} onPress={() => pickFilter("all")} />
          {catalogCount > 0 && (
            <>
              <FilterChip label={`Mine (${mineCount})`} on={filter === "mine"} onPress={() => pickFilter("mine")} />
              <FilterChip label={`★ Built-in (${catalogCount})`} on={filter === "catalog"} onPress={() => pickFilter("catalog")} />
            </>
          )}
          <FilterChip label={`♥ (${favCount})`} on={filter === "fav"} onPress={() => pickFilter("fav")} />
          <FilterChip label={`⬇ (${dlCount})`} on={filter === "downloads"} onPress={() => pickFilter("downloads")} />
          <FilterChip label={`Playlists (${playlists.length})`} on={filter === "playlists"} onPress={() => pickFilter("playlists")} />
          {Object.keys(catFlags).length > 0 && (
            <FilterChip label={`⚑ Flags (${Object.keys(catFlags).length})`} on={showFlags} onPress={() => setShowFlags(true)} />
          )}
        </ScrollView>

        {filter !== "playlists" && songs.length > 0 && (
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search songs"
            placeholderTextColor={colors.faint}
            style={styles.search}
          />
        )}

        {filter === "playlists" ? (
          <>
            {levelsPresent.length > 0 && (
              <>
                <Text style={styles.byLevelTitle}>By level</Text>
                {levelsPresent.map((l) => {
                  const count = songs.filter((s) => s.level === l).length;
                  return (
                    <Pressable key={l} onPress={() => { setLevelFilter(l); setGenreFilter(null); setFilter("all"); }}>
                      <View style={styles.row}>
                        <LinearGradient colors={gradients.magenta} style={styles.plArt}>
                          <Text style={{ fontSize: 20 }}>🎓</Text>
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>{tierLabel(l)}</Text>
                          <Text style={styles.rowMeta}>{count} song{count === 1 ? "" : "s"} · by lesson & genre</Text>
                        </View>
                        <Text style={styles.play}>›</Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Text style={styles.byLevelHint}>Tap a level to see its songs grouped by lesson and genre.</Text>
              </>
            )}
            <PlaylistsView
              playlists={playlists}
              songs={songs}
              onPlay={onPlayPlaylist}
              onShuffle={onShufflePlaylist}
              onDelete={onDeletePlaylist}
              onRemoveSong={onRemoveFromPlaylist}
              onOpenSong={onOpenSongInPlaylist}
              onNew={() => {
                setNewName("");
                setCreateFor({ open: true });
              }}
            />
          </>
        ) : shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{filter === "fav" ? "♡" : "🎵"}</Text>
            <Text style={styles.emptyTitle}>{filter === "fav" ? "No favorites yet" : "No songs yet"}</Text>
            <Text style={styles.emptySub}>{filter === "fav" ? "Tap the ♥ on a song to save it here." : "Create your first song to start your library."}</Text>
            {filter === "all" && (
              <>
                <View style={{ height: spacing.lg, width: "100%" }} />
                <GradientButton label="＋ Create a song" onPress={onCreate} />
              </>
            )}
          </View>
        ) : (
          <>
            <View style={styles.filterBar}>
              <Pressable style={[styles.ddBtn, levelFilter && styles.ddBtnOn]} onPress={() => setDropdown("level")}>
                <Text style={styles.ddLabel}>Level</Text>
                <Text style={styles.ddValue}>{levelFilter ? tierLabel(levelFilter) : "All"} ▾</Text>
              </Pressable>
              <Pressable style={[styles.ddBtn, genreFilter && styles.ddBtnOn]} onPress={() => setDropdown("genre")}>
                <Text style={styles.ddLabel}>Genre</Text>
                <Text style={styles.ddValue}>{genreFilter ?? "All"} ▾</Text>
              </Pressable>
              <Pressable style={[styles.ddBtn, topicFilter && styles.ddBtnOn]} onPress={() => setDropdown("topic")}>
                <Text style={styles.ddLabel}>Topic</Text>
                <Text style={styles.ddValue}>{topicFilter ? subjectLabel(topicFilter) : "All"} ▾</Text>
              </Pressable>
            </View>

            {shown.length > 1 && (
              <Pressable onPress={() => onShuffle(shown)}>
                <LinearGradient colors={gradients.violet} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shuffleBtn}>
                  <Text style={styles.shuffleText}>
                    🔀  Shuffle {levelFilter ? tierLabel(levelFilter) : genreFilter ? genreFilter : topicFilter ? subjectLabel(topicFilter) : "all"} ({shown.length})
                  </Text>
                </LinearGradient>
              </Pressable>
            )}

            {sections
              ? sections.map((sec) => (
                  <View key={sec.title}>
                    <Text style={styles.sectionHeader}>{sec.title}</Text>
                    {sec.songs.map(renderRow)}
                  </View>
                ))
              : shown.map(renderRow)}
            <Text style={styles.hint}>Swipe a song left to delete · tap ⋯ for more options.</Text>
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom sheet: song menu / playlist picker / create playlist */}
      <Modal
        visible={menuSong !== null || pickerSong !== null || createFor.open || renameTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setMenuSong(null);
          setPickerSong(null);
          setCreateFor({ open: false });
          setRenameTarget(null);
        }}
      >
        <Pressable
          style={sheet.backdrop}
          onPress={() => {
            setMenuSong(null);
            setPickerSong(null);
            setCreateFor({ open: false });
          }}
        />
        <View style={sheet.card}>
          <View style={sheet.handle} />

          {createFor.open ? (
            <>
              <Text style={sheet.title}>New playlist</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Playlist name"
                placeholderTextColor={colors.faint}
                style={sheet.input}
                autoFocus
              />
              <Pressable
                onPress={() => {
                  onCreatePlaylist(newName || "New playlist", createFor.songId);
                  flash(createFor.songId ? "Playlist created with song" : "Playlist created");
                  setCreateFor({ open: false });
                  setNewName("");
                }}
              >
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sheet.primary}>
                  <Text style={sheet.primaryText}>Create</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : pickerSong ? (
            <>
              <Text style={sheet.title}>Add to playlist</Text>
              <ScrollView style={{ maxHeight: 320 }}>
                <Pressable onPress={() => setCreateFor({ open: true, songId: pickerSong.id })}>
                  <View style={sheet.opt}>
                    <Text style={sheet.newLbl}>＋ New playlist</Text>
                  </View>
                </Pressable>
                {playlists.map((pl) => (
                  <Pressable
                    key={pl.id}
                    onPress={() => {
                      onAddToPlaylist(pl.id, pickerSong.id);
                      flash(`Added to “${pl.name}”`);
                      setPickerSong(null);
                    }}
                  >
                    <View style={sheet.opt}>
                      <Text style={sheet.optLabel}>{pl.name}</Text>
                      <Text style={sheet.optCount}>{pl.songIds.length}</Text>
                    </View>
                  </Pressable>
                ))}
                {playlists.length === 0 && <Text style={sheet.note}>No playlists yet — tap “New playlist”.</Text>}
              </ScrollView>
            </>
          ) : renameTarget ? (
            <>
              <Text style={sheet.title}>Rename song</Text>
              <TextInput value={renameText} onChangeText={setRenameText} placeholder="Song name" placeholderTextColor={colors.faint} style={sheet.input} autoFocus />
              <Pressable onPress={() => { onRename(renameTarget.id, renameText); flash("Renamed"); setRenameTarget(null); }}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sheet.primary}>
                  <Text style={sheet.primaryText}>Save</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : menuSong ? (
            <>
              <Text style={sheet.title} numberOfLines={1}>{songTitle(menuSong)}</Text>
              <SheetAction icon="▶" label="Play now" onPress={() => { onOpenSong(menuSong, [menuSong]); setMenuSong(null); }} />
              <SheetAction icon="＋" label="Add to queue" onPress={() => { onAddToQueue(menuSong); flash("Added to queue"); setMenuSong(null); }} />
              <SheetAction icon="✚" label="Add to playlist" onPress={() => { setPickerSong(menuSong); setMenuSong(null); }} />
              {menuSong.localUri ? (
                <SheetAction icon="✓" label="Downloaded (plays offline)" onPress={() => setMenuSong(null)} />
              ) : (
                <SheetAction icon="⬇" label="Download for offline" onPress={() => { onDownload(menuSong.id); flash("Downloading…"); setMenuSong(null); }} />
              )}
              <SheetAction icon={menuSong.favorite ? "♥" : "♡"} label={menuSong.favorite ? "Remove favorite" : "Add favorite"} onPress={() => { onToggleFavorite(menuSong.id); setMenuSong(null); }} />
              <SheetAction icon="✎" label="Rename" onPress={() => { setRenameText(songTitle(menuSong)); setRenameTarget(menuSong); setMenuSong(null); }} />
              <SheetAction icon="🔁" label="Regenerate a new version" onPress={() => { onRegenerate(menuSong); flash("Creating a new version…"); setMenuSong(null); }} />
              <SheetAction icon="↗" label="Share lyrics" onPress={() => { Share.share({ message: `${songTitle(menuSong)} — a Ritmo song\n\n${menuSong.lyrics}` }); setMenuSong(null); }} />
              <SheetAction icon="🗑" label="Delete song" danger onPress={() => { onDelete(menuSong.id); setMenuSong(null); }} />
            </>
          ) : null}

          <Pressable
            onPress={() => {
              setMenuSong(null);
              setPickerSong(null);
              setCreateFor({ open: false });
              setRenameTarget(null);
            }}
            style={sheet.close}
          >
            <Text style={sheet.closeText}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Level / Genre dropdown picker */}
      <Modal visible={dropdown !== null} transparent animationType="slide" onRequestClose={() => setDropdown(null)}>
        <Pressable style={sheet.backdrop} onPress={() => setDropdown(null)} />
        <View style={sheet.card}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>{dropdown === "level" ? "Choose a level" : dropdown === "genre" ? "Choose a genre" : "Choose a topic"}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            <Pressable
              onPress={() => {
                if (dropdown === "level") setLevelFilter(null);
                else if (dropdown === "genre") setGenreFilter(null);
                else setTopicFilter(null);
                setDropdown(null);
              }}
            >
              <View style={styles.ddOpt}>
                <Text style={styles.ddOptText}>All {dropdown === "level" ? "levels" : dropdown === "genre" ? "genres" : "topics"}</Text>
                {(dropdown === "level" ? !levelFilter : dropdown === "genre" ? !genreFilter : !topicFilter) && <Text style={styles.ddCheck}>✓</Text>}
              </View>
            </Pressable>
            {dropdown === "level"
              ? levelsPresent.map((l) => (
                  <Pressable key={l} onPress={() => { setLevelFilter(l); setDropdown(null); }}>
                    <View style={styles.ddOpt}>
                      <Text style={styles.ddOptText}>{tierLabel(l)}</Text>
                      <Text style={styles.ddCount}>{scopeSongs.filter((s) => s.level === l).length}</Text>
                      {levelFilter === l && <Text style={styles.ddCheck}>✓</Text>}
                    </View>
                  </Pressable>
                ))
              : dropdown === "genre"
              ? genresPresent.map((g) => (
                  <Pressable key={g} onPress={() => { setGenreFilter(g); setDropdown(null); }}>
                    <View style={styles.ddOpt}>
                      <Text style={styles.ddOptText}>{g}</Text>
                      <Text style={styles.ddCount}>{scopeSongs.filter((s) => (s.genre || "Other") === g).length}</Text>
                      {genreFilter === g && <Text style={styles.ddCheck}>✓</Text>}
                    </View>
                  </Pressable>
                ))
              : topicsPresent.map((t) => (
                  <Pressable key={t} onPress={() => { setTopicFilter(t); setDropdown(null); }}>
                    <View style={styles.ddOpt}>
                      <Text style={styles.ddOptText}>{subjectLabel(t)}</Text>
                      <Text style={styles.ddCount}>{scopeSongs.filter((s) => s.subject === t).length}</Text>
                      {topicFilter === t && <Text style={styles.ddCheck}>✓</Text>}
                    </View>
                  </Pressable>
                ))}
          </ScrollView>
          <Pressable onPress={() => setDropdown(null)} style={sheet.close}>
            <Text style={sheet.closeText}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Flags review — the tester's lock / reroll / wrong-genre notes for the developer */}
      <Modal visible={showFlags} transparent animationType="slide" onRequestClose={() => setShowFlags(false)}>
        <Pressable style={sheet.backdrop} onPress={() => setShowFlags(false)} />
        <View style={sheet.card}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>Song flags</Text>
          <Text style={styles.flagsHint}>Your notes for the developer — read them off (or Share) to get songs locked, rerolled, or fixed. Tap ✕ to clear one.</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {(FLAG_GROUPS).map(([flag, label]) => {
              const list = Object.entries(catFlags)
                .filter(([, fl]) => fl.includes(flag))
                .map(([id]) => songs.find((s) => s.id === id))
                .filter((s): s is Song => !!s);
              if (!list.length) return null;
              return (
                <View key={flag} style={{ marginBottom: 12 }}>
                  <Text style={styles.flagsGroup}>{label}</Text>
                  {list.map((s) => (
                    <View key={s.id} style={styles.flagsItem}>
                      <Text style={styles.flagsItemText} numberOfLines={1}>{songTitle(s)} — {s.genre} · {subjectLabel(s.subject)} L{s.lesson}</Text>
                      <Pressable onPress={() => onToggleFlag(s.id, flag)} hitSlop={6}><Text style={styles.flagsClear}>✕</Text></Pressable>
                    </View>
                  ))}
                </View>
              );
            })}
            {Object.keys(catFlags).length === 0 && <Text style={styles.flagsHint}>No flags yet. Tap 🔒 / 🔄 / ⚠️ on a built-in song.</Text>}
          </ScrollView>
          {Object.keys(catFlags).length > 0 && (
            <>
              <Pressable
                onPress={async () => {
                  const payload = flagsPayload(catFlags, songs);
                  const ok = await sendFlags({ flags: payload });
                  Alert.alert(
                    ok ? "Sent ✓" : "Couldn't reach developer",
                    ok
                      ? `${payload.length} flag${payload.length === 1 ? "" : "s"} sent. Tell your developer they're ready.`
                      : "Make sure your phone and computer are on the same Wi-Fi, then try again."
                  );
                }}
              >
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sheet.primary}>
                  <Text style={sheet.primaryText}>📨 Send to developer</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => Share.share({ message: flagsShareText(catFlags, songs) })} style={sheet.close}>
                <Text style={sheet.closeText}>↗ Or share the list</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={() => setShowFlags(false)} style={sheet.close}>
            <Text style={sheet.closeText}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </Screen>
  );
}

const FLAG_GROUPS: [CatalogFlag, string][] = [
  ["lock", "🔒 Lock (keep these exact takes)"],
  ["reroll", "🔄 Reroll (make new versions)"],
  ["badgenre", "⚠️ Doesn't sound like its genre"],
];

function flagsPayload(catFlags: Record<string, CatalogFlag[]>, songs: Song[]) {
  return Object.entries(catFlags)
    .map(([id, actions]) => {
      const s = songs.find((x) => x.id === id);
      if (!s) return null;
      return { id, title: songTitle(s), genre: s.genre ?? undefined, subject: s.subject, lesson: s.lesson, actions };
    })
    .filter((x) => x !== null) as { id: string; title: string; genre?: string; subject: string; lesson: number; actions: string[] }[];
}

function flagsShareText(catFlags: Record<string, CatalogFlag[]>, songs: Song[]): string {
  const lines: string[] = ["Ritmo song flags:"];
  for (const [flag, label] of FLAG_GROUPS) {
    const list = Object.entries(catFlags)
      .filter(([, fl]) => fl.includes(flag))
      .map(([id]) => songs.find((s) => s.id === id))
      .filter((s): s is Song => !!s);
    if (!list.length) continue;
    lines.push(`\n${label}`);
    for (const s of list) lines.push(`- ${songTitle(s)} (${s.genre}, ${subjectLabel(s.subject)} L${s.lesson})`);
  }
  return lines.join("\n");
}

function FlagBtn({ label, on, tone, onPress }: { label: string; on: boolean; tone: "lock" | "reroll" | "bad"; onPress: () => void }) {
  const onStyle = tone === "lock" ? styles.flagOnLock : tone === "reroll" ? styles.flagOnReroll : styles.flagOnBad;
  return (
    <Pressable onPress={onPress} hitSlop={4} style={{ flex: 1 }}>
      <View style={[styles.flagBtn, on && onStyle]}>
        <Text style={[styles.flagBtnText, on && styles.flagBtnTextOn]} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

function PlaylistsView({
  playlists,
  songs,
  onPlay,
  onShuffle,
  onDelete,
  onRemoveSong,
  onOpenSong,
  onNew,
}: {
  playlists: Playlist[];
  songs: Song[];
  onPlay: (pl: Playlist) => void;
  onShuffle: (pl: Playlist) => void;
  onDelete: (id: string) => void;
  onRemoveSong: (playlistId: string, songId: string) => void;
  onOpenSong: (s: Song, list?: Song[]) => void;
  onNew: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "subject" | "builtin">("default");
  return (
    <>
      <Pressable onPress={onNew} style={styles.newPlaylist}>
        <Text style={styles.newPlaylistText}>＋ New playlist</Text>
      </Pressable>
      {playlists.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎧</Text>
          <Text style={styles.emptyTitle}>No playlists yet</Text>
          <Text style={styles.emptySub}>Make one, then add songs from the ⋯ menu.</Text>
        </View>
      ) : (
        playlists.map((pl) => {
          const plSongs = pl.songIds
            .map((id) => songs.find((s) => s.id === id))
            .filter((s): s is Song => !!s);
          const isOpen = expanded === pl.id;
          return (
            <View key={pl.id}>
              <Swipeable
                renderRightActions={() => (
                  <Pressable onPress={() => onDelete(pl.id)} style={styles.swipeDelete}>
                    <Text style={styles.swipeDeleteText}>🗑  Delete</Text>
                  </Pressable>
                )}
              >
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : pl.id)}
                  onLongPress={() => onDelete(pl.id)}
                >
                  <View style={styles.row}>
                    <LinearGradient colors={gradients.magenta} style={styles.plArt}>
                      <Text style={{ fontSize: 22 }}>🎵</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{pl.name}</Text>
                      <Text style={styles.rowMeta}>{plSongs.length} song{plSongs.length === 1 ? "" : "s"}</Text>
                    </View>
                    <Pressable onPress={() => onPlay(pl)} hitSlop={8}><Text style={styles.shufIcon}>▶</Text></Pressable>
                    <Pressable onPress={() => onShuffle(pl)} hitSlop={8}><Text style={styles.shufIcon}>🔀</Text></Pressable>
                    <Text style={styles.chev}>{isOpen ? "▾" : "▸"}</Text>
                  </View>
                </Pressable>
              </Swipeable>

              {isOpen && (
                <View style={styles.plBody}>
                  {plSongs.length === 0 ? (
                    <Text style={styles.plEmpty}>No songs yet — add some from a song's ⋯ menu.</Text>
                  ) : (
                    (() => {
                      const renderPlSong = (s: Song) => (
                        <Swipeable
                          key={s.id}
                          renderRightActions={() => (
                            <Pressable onPress={() => onRemoveSong(pl.id, s.id)} style={styles.swipeRemove}>
                              <Text style={styles.swipeDeleteText}>Remove from{"\n"}playlist</Text>
                            </Pressable>
                          )}
                        >
                          <Pressable onPress={() => onOpenSong(s, plSongs)}>
                            <View style={styles.plSongRow}>
                              <ArtTile subject={s.subject} size={40} colors={gradientFor(s.subject)} rounded={radius.sm} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.plSongTitle} numberOfLines={1}>{songTitle(s)}</Text>
                                <Text style={styles.rowMeta} numberOfLines={1}>{[s.genre, tierLabel(s.level)].filter(Boolean).join(" · ")}</Text>
                              </View>
                              {s.catalog && <Text style={styles.plBuiltinStar}>★</Text>}
                              <Text style={styles.play}>▶</Text>
                            </View>
                          </Pressable>
                        </Swipeable>
                      );
                      // Group the playlist's songs by the chosen sort.
                      let groups: { title: string | null; songs: Song[] }[];
                      if (sortBy === "subject") {
                        const by: Record<string, Song[]> = {};
                        for (const s of plSongs) (by[s.subject] ||= []).push(s);
                        groups = Object.keys(by)
                          .sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b)))
                          .map((k) => ({ title: subjectLabel(k), songs: by[k] }));
                      } else if (sortBy === "builtin") {
                        const builtin = plSongs.filter((s) => s.catalog);
                        const mine = plSongs.filter((s) => !s.catalog);
                        groups = [];
                        if (builtin.length) groups.push({ title: `★ Built-in (${builtin.length})`, songs: builtin });
                        if (mine.length) groups.push({ title: `Mine (${mine.length})`, songs: mine });
                      } else {
                        groups = [{ title: null, songs: plSongs }];
                      }
                      return (
                        <>
                          <View style={styles.sortRow}>
                            <Text style={styles.sortLabel}>Sort</Text>
                            <SortPill label="Added" on={sortBy === "default"} onPress={() => setSortBy("default")} />
                            <SortPill label="Subject" on={sortBy === "subject"} onPress={() => setSortBy("subject")} />
                            <SortPill label="Built-in" on={sortBy === "builtin"} onPress={() => setSortBy("builtin")} />
                          </View>
                          {groups.map((g, gi) => (
                            <View key={g.title ?? `g${gi}`}>
                              {g.title && <Text style={styles.plGroupHeader}>{g.title}</Text>}
                              {g.songs.map(renderPlSong)}
                            </View>
                          ))}
                        </>
                      );
                    })()
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
      <Text style={styles.hint}>Tap a playlist to open it · ▶ plays · 🔀 shuffles · swipe left to delete. Swipe a song left to remove it.</Text>
    </>
  );
}

function SheetAction({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress}>
      <View style={sheet.action}>
        <Text style={sheet.actionIcon}>{icon}</Text>
        <Text style={[sheet.actionLabel, danger && { color: colors.pink }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SortPill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View style={[styles.sortPill, on && styles.sortPillOn]}>
        <Text style={[styles.sortPillText, on && styles.sortPillTextOn]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function FilterChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {on ? (
        <LinearGradient colors={gradients.purplePink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
          <Text style={[styles.chipText, { color: "#fff" }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.chip, styles.chipOff]}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 60 },
  title: { color: colors.ink, fontSize: font.h1, fontWeight: "900", marginBottom: spacing.md },
  filters: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  search: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: font.body, paddingVertical: 12, paddingHorizontal: 14, marginBottom: spacing.md },
  chip: { borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 14 },
  chipOff: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  chipText: { color: colors.muted, fontSize: font.small, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(5,8,15,0.45)", borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 9, marginBottom: 8 },
  plArt: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: colors.ink, fontSize: 12.5, fontWeight: "700", lineHeight: 16 },
  rowMeta: { color: colors.muted, fontSize: 10.5, lineHeight: 14, textTransform: "capitalize", flexShrink: 1 },
  lvlPill: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 7 },
  lvlPillText: { color: colors.accent, fontSize: font.tiny, fontWeight: "900" },
  rowMid: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, flexWrap: "wrap" },
  pillPair: { flexDirection: "row", alignItems: "center", gap: 5 },
  builtinPill: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 9 },
  builtinPillText: { color: colors.accent, fontSize: font.tiny, fontWeight: "900" },
  rateUp: { backgroundColor: "rgba(55,214,122,0.16)", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  rateDown: { backgroundColor: "rgba(245,120,120,0.16)", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  rateEmoji: { fontSize: 12 },
  rightCol: { alignItems: "center", gap: 2 },
  iconBtnRow: { flexDirection: "row", alignItems: "center" },
  ratingUnder: { marginTop: 2 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line, marginLeft: 3 },
  iconBtnFav: { borderColor: "#F05A96", backgroundColor: "rgba(240,90,150,0.15)" },
  iconPlus: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  iconHeart: { color: colors.muted, fontSize: 15 },
  iconHeartOn: { color: "#F05A96" },
  iconDots: { color: colors.muted, fontSize: 16, fontWeight: "900" },
  filterBar: { flexDirection: "row", gap: 10, marginBottom: 12 },
  ddBtn: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  ddBtnOn: { borderColor: colors.accent, backgroundColor: colors.card2 },
  ddLabel: { color: colors.faint, fontSize: font.tiny, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  ddValue: { color: colors.ink, fontSize: font.body, fontWeight: "900", marginTop: 2 },
  ddOpt: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line },
  ddOptText: { color: colors.ink, fontSize: font.body, fontWeight: "700", flex: 1 },
  ddCount: { color: colors.muted, fontSize: font.small, fontWeight: "700" },
  ddCheck: { color: colors.accent, fontSize: font.body, fontWeight: "900" },
  sectionHeader: { color: colors.accent, fontSize: font.small, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase", marginTop: 10, marginBottom: 8 },
  byLevelTitle: { color: colors.ink, fontSize: font.h3, fontWeight: "900", marginBottom: 10 },
  byLevelHint: { color: colors.faint, fontSize: font.small, marginTop: 2, marginBottom: 18 },
  heart: { color: colors.faint, fontSize: 22, paddingHorizontal: 4 },
  heartOn: { color: colors.pink },
  dlDot: { color: colors.good, fontSize: 14, fontWeight: "900", paddingHorizontal: 2 },
  dots: { color: colors.muted, fontSize: 24, paddingHorizontal: 4, fontWeight: "900" },
  play: { color: colors.ink, fontSize: 18, paddingHorizontal: 8 },
  swipeDelete: { backgroundColor: "#D9365E", justifyContent: "center", alignItems: "center", width: 104, borderRadius: radius.md, marginBottom: 10, marginLeft: 8 },
  swipeDeleteText: { color: "#fff", fontWeight: "900", fontSize: font.small, textAlign: "center" },
  shufIcon: { fontSize: 18, paddingHorizontal: 6 },
  chev: { color: colors.muted, fontSize: 16, paddingHorizontal: 6, fontWeight: "900" },
  plBody: { marginTop: -4, marginBottom: 10, marginLeft: 14, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.line },
  plEmpty: { color: colors.faint, fontSize: font.small, paddingVertical: 10 },
  sortRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  sortLabel: { color: colors.muted, fontSize: font.small, fontWeight: "800", marginRight: 2 },
  sortPill: { borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.3)" },
  sortPillOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  sortPillText: { color: colors.muted, fontSize: font.small, fontWeight: "800" },
  sortPillTextOn: { color: "#04121f" },
  plGroupHeader: { color: colors.accent, fontSize: font.small, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 6, marginBottom: 6 },
  plBuiltinStar: { color: colors.accent, fontSize: font.small, fontWeight: "900" },
  artCol: { alignItems: "center", justifyContent: "center" },
  lockDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#37D67A", marginTop: 4, shadowColor: "#37D67A", shadowOpacity: 0.6, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } },
  flagRow: { flexDirection: "row", gap: 5, marginTop: 5 },
  flagBtn: { borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 6, alignItems: "center", backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  flagBtnText: { color: colors.muted, fontSize: 9.5, fontWeight: "800" },
  flagBtnTextOn: { color: "#04121f" },
  flagOnLock: { backgroundColor: "#37D67A", borderColor: "#37D67A" },
  flagOnReroll: { backgroundColor: "#3AA0FF", borderColor: "#3AA0FF" },
  flagOnBad: { backgroundColor: "#F5A623", borderColor: "#F5A623" },
  flagsHint: { color: colors.muted, fontSize: font.small, marginBottom: 10 },
  flagsGroup: { color: colors.accent, fontSize: font.small, fontWeight: "900", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  flagsItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  flagsItemText: { color: colors.ink, fontSize: font.small, flex: 1 },
  flagsClear: { color: colors.pink, fontSize: font.body, fontWeight: "900" },
  plSongRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(7,11,19,0.5)", borderWidth: 1, borderColor: "rgba(34,184,176,0.3)", borderRadius: radius.sm, padding: 8, marginBottom: 8 },
  plSongTitle: { color: colors.ink, fontSize: font.small, fontWeight: "800" },
  swipeRemove: { backgroundColor: "#B4823A", justifyContent: "center", alignItems: "center", width: 104, borderRadius: radius.sm, marginBottom: 8, marginLeft: 8 },
  shuffleBtn: { borderRadius: radius.md, paddingVertical: 13, alignItems: "center", marginBottom: 12 },
  shuffleText: { color: "#fff", fontWeight: "900", fontSize: font.body },
  hint: { color: colors.faint, fontSize: font.small, marginTop: 6 },
  newPlaylist: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, padding: 14, alignItems: "center", marginBottom: 12 },
  newPlaylistText: { color: colors.accent, fontSize: font.body, fontWeight: "800" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 56, color: colors.muted },
  emptyTitle: { color: colors.ink, fontSize: font.h2, fontWeight: "900", marginTop: 12 },
  emptySub: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: 6 },
  toast: { position: "absolute", bottom: 30, left: 30, right: 30, backgroundColor: colors.card2, borderRadius: radius.pill, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: colors.line },
  toastText: { color: colors.ink, fontSize: font.small, fontWeight: "800" },
});

const sheet = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  card: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.bg2, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 34, borderTopWidth: 1, borderColor: colors.line },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  title: { color: colors.ink, fontSize: font.h3, fontWeight: "900", marginBottom: 10 },
  action: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line },
  actionIcon: { fontSize: 20, width: 26, textAlign: "center", color: colors.ink },
  actionLabel: { color: colors.ink, fontSize: font.body, fontWeight: "700" },
  opt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 15, marginBottom: 8 },
  optLabel: { color: colors.ink, fontSize: font.body, fontWeight: "700" },
  optCount: { color: colors.muted, fontSize: font.small },
  newLbl: { color: colors.accent, fontSize: font.body, fontWeight: "800" },
  note: { color: colors.muted, fontSize: font.small, marginTop: 4 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: font.body, padding: 14, marginBottom: 12 },
  primary: { borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: font.body, fontWeight: "900" },
  close: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  closeText: { color: colors.muted, fontSize: font.body, fontWeight: "800" },
});
