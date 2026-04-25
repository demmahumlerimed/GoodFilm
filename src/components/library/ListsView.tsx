import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark, Check, ChevronLeft, ChevronRight, Film,
  LayoutList, List, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { POSTER_BASE } from "../../config";
import type { CustomList, LibraryItem, MediaItem, MediaType, UserLibrary, FollowedPerson } from "../../types";

export function ListsView({
  library,
  customLists,
  ratings,
  onOpenLibrary,
  onCreateList,
  onDeleteList,
  onRenameList,
  onAddToList: _onAddToList,
  onRemoveFromList,
  onOpen,
  followedPeople = [],
  onOpenPerson,
}: {
  library: UserLibrary;
  customLists: CustomList[];
  ratings: Record<string, number>;
  onOpenLibrary: () => void;
  onCreateList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onRenameList: (id: string, name: string) => void;
  onAddToList: (listId: string, item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onRemoveFromList: (listId: string, itemId: number, mediaType: MediaType) => void;
  onOpen: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  followedPeople?: FollowedPerson[];
  onOpenPerson?: (id: number) => void;
}) {
  const [subTab, setSubTab] = React.useState<"library" | "mylists">("library");
  const [creating, setCreating] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [openListId, setOpenListId] = React.useState<string | null>(null);

  // Library stats
  const totalItems =
    library.watchlist.length +
    library.watched.length +
    (library.watchingItems ?? []).length +
    (library.waitingItems ?? []).length;
  const watchedCount = library.watched.length;
  const watchlistCount = library.watchlist.length;

  // Smart auto-lists
  const topRatedItems = useMemo(() => {
    const all = [
      ...library.watchlist,
      ...library.watched,
      ...(library.watchingItems ?? []),
      ...(library.waitingItems ?? []),
    ];
    const seen = new Set<string>();
    return all.filter((item) => {
      const k = `${item.mediaType}:${item.id}`;
      const r = ratings[k];
      if (r == null || r < 8) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((a, b) => (ratings[`${b.mediaType}:${b.id}`] ?? 0) - (ratings[`${a.mediaType}:${a.id}`] ?? 0));
  }, [library, ratings]);

  const AUTO_LISTS = [
    { id: "auto-watchlist", name: "Watchlist", items: library.watchlist,   icon: "🔖", color: "from-[#e8a020]/20 to-transparent", count: watchlistCount },
    { id: "auto-watched",   name: "Watched",   items: library.watched,     icon: "✅", color: "from-emerald-500/20 to-transparent", count: watchedCount   },
    { id: "auto-rated",     name: "Top Rated", items: topRatedItems,       icon: "⭐", color: "from-purple-500/20 to-transparent", count: topRatedItems.length },
  ];

  function handleCreateSubmit() {
    const name = newListName.trim();
    if (name) { onCreateList(name); setNewListName(""); setCreating(false); }
  }

  function handleRenameSubmit(id: string) {
    const name = renameValue.trim();
    if (name) onRenameList(id, name);
    setRenamingId(null);
    setRenameValue("");
  }

  // ── Open list detail view ────────────────────────────────────────────────
  const openedAutoList = openListId ? AUTO_LISTS.find((l) => l.id === openListId) : null;
  const openedCustomList = openListId ? customLists.find((l) => l.id === openListId) : null;

  if (openListId && (openedAutoList || openedCustomList)) {
    const listName = openedAutoList?.name ?? openedCustomList?.name ?? "";
    const listItems: LibraryItem[] = openedAutoList ? (openedAutoList.items as LibraryItem[]) : [];
    const customItems = openedCustomList?.items ?? [];
    const displayItems = openedAutoList ? listItems : customItems;
    const isEmpty = displayItems.length === 0;

    return (
      <div className="min-h-screen pb-28">
        {/* Back header */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/[0.06] bg-[#07080d]/96 px-4 py-3.5 backdrop-blur-xl md:px-10">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpenListId(null)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/[0.12] hover:text-white"
          >
            <ChevronLeft size={15} />
          </motion.button>
          <h2 className="text-[15px] font-bold tracking-tight text-white">{listName}</h2>
          <span className="ml-auto rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-white/40">
            {displayItems.length} {displayItems.length === 1 ? "title" : "titles"}
          </span>
        </div>

        <div className="px-4 pt-4 md:px-10">
          {isEmpty ? (
            /* ── Premium empty state ── */
            <div className="relative flex flex-col items-center justify-center py-24 text-center">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-full bg-[#e8a020]/[0.06] blur-3xl" />
              </div>
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <List size={28} className="text-white/20" />
              </div>
              <p className="text-[15px] font-semibold text-white/40">This list is empty</p>
              <p className="mt-1 text-[12px] text-white/22">Add titles from any movie or TV page</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {displayItems.map((item) => (
                <motion.div
                  key={`${item.mediaType}:${item.id}`}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-[12px] bg-white/[0.04] ring-1 ring-white/[0.07] hover:ring-[#e8a020]/40 hover:shadow-[0_8px_32px_rgba(239,180,63,0.12)]"
                  onClick={() => onOpen(item, item.mediaType)}
                >
                  {item.posterPath ? (
                    <img src={`${POSTER_BASE}${item.posterPath}`} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-white/[0.02]">
                      <Film size={22} className="text-white/12" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-2 pb-2 pt-10">
                    <p className="text-[10px] font-semibold leading-tight text-white line-clamp-2">{item.title}</p>
                  </div>
                  {/* Remove button (custom lists only) */}
                  {openedCustomList && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveFromList(openListId!, item.id, item.mediaType); }}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white/60 opacity-0 transition hover:text-white group-hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STATS ────────────────────────────────────────────────────────────────────
  const BENTO_STATS = [
    { label: "Watched",   value: watchedCount,  icon: Check,    accent: "text-emerald-400", glow: "shadow-[0_0_24px_rgba(52,211,153,0.08)]", border: "hover:border-emerald-500/30" },
    { label: "Watchlist", value: watchlistCount, icon: Bookmark, accent: "text-[#e8a020]",   glow: "shadow-[0_0_24px_rgba(239,180,63,0.08)]",  border: "hover:border-[#e8a020]/30"  },
    { label: "Total",     value: totalItems,     icon: Film,     accent: "text-white",        glow: "",                                         border: "hover:border-white/20"       },
  ];

  return (
    <div className="min-h-screen pb-28">

      {/* ── Header ── */}
      <div className="px-4 pb-2 pt-6 md:px-10">
        <h1 className="bg-gradient-to-r from-white to-white/50 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
          Lists
        </h1>
        <p className="mt-0.5 text-[13px] text-white/35">Your personal cinema collection</p>
      </div>

      {/* ── Animated pill tab switcher ── */}
      <div className="px-4 py-4 md:px-10">
        <div className="inline-flex rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-1">
          {(["library", "mylists"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className="relative px-5 py-1.5 text-[12px] font-semibold transition-colors duration-200"
            >
              {subTab === tab && (
                <motion.div
                  layoutId="lists-subtab-pill"
                  className="absolute inset-0 rounded-[10px] bg-[#e8a020] shadow-[0_2px_12px_rgba(239,180,63,0.25)]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className={cn("relative z-10 transition-colors duration-200", subTab === tab ? "text-black" : "text-white/45 hover:text-white/70")}>
                {tab === "library" ? "My Library" : "My Lists"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === "library" ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-4 md:px-10"
          >
            {/* ── Bento CTA + Stats ── */}
            {/* Hero library card */}
            <motion.button
              whileTap={{ scale: 0.99 }}
              onClick={onOpenLibrary}
              className="group relative w-full overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.03] transition-all duration-300 hover:border-[#e8a020]/25 hover:shadow-[0_8px_40px_rgba(239,180,63,0.08)]"
            >
              <div className="flex h-32 overflow-hidden">
                {[...(library.watchingItems ?? []), ...library.watchlist].slice(0, 5).map((item, i) => (
                  <div key={i} className="flex-1 bg-white/[0.03]">
                    {(item as LibraryItem).posterPath ? (
                      <img src={`${POSTER_BASE}${(item as LibraryItem).posterPath}`} alt="" className="h-full w-full object-cover opacity-50 transition duration-500 group-hover:opacity-70" />
                    ) : null}
                  </div>
                ))}
                {(library.watchingItems ?? []).length === 0 && library.watchlist.length === 0 && (
                  <div className="flex flex-1 items-center justify-center">
                    <Film size={32} className="text-white/[0.07]" />
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-4">
                <div className="text-left">
                  <p className="text-[15px] font-bold tracking-tight text-white">Browse My Library</p>
                  <p className="text-[12px] text-white/40">{totalItems} titles tracked</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8a020] transition group-hover:scale-110">
                  <ChevronRight size={15} className="text-black" />
                </div>
              </div>
            </motion.button>

            {/* Bento stats grid */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {BENTO_STATS.map(({ label, value, icon: Icon, accent, glow, border }) => (
                <div
                  key={label}
                  className={cn(
                    "rounded-[16px] border border-white/[0.07] bg-white/[0.02] px-3 py-3.5 text-center backdrop-blur-xl transition-all duration-300",
                    glow, border,
                  )}
                >
                  <Icon size={14} className={cn("mx-auto mb-1.5 opacity-60", accent)} />
                  <p className={cn("text-[24px] font-black leading-none tracking-tight", accent)}>{value}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.07em] text-white/30">{label}</p>
                </div>
              ))}
            </div>

            {/* Quick-access auto-list tiles */}
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">Quick Access</p>
              <div className="grid grid-cols-3 gap-2">
                {AUTO_LISTS.map((al) => (
                  <motion.button
                    key={al.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setOpenListId(al.id)}
                    className={cn(
                      "relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-gradient-to-b p-3 text-left transition-all duration-300 hover:border-white/[0.15]",
                      al.color,
                    )}
                  >
                    <span className="text-xl">{al.icon}</span>
                    <p className="mt-2 text-[12px] font-semibold text-white">{al.name}</p>
                    <p className="text-[10px] text-white/35">{al.count}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ── Following rail ── */}
            {followedPeople.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">Following</p>
                <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
                  {followedPeople.map((person, i) => (
                    <motion.button
                      key={person.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => onOpenPerson?.(person.id)}
                      className="group flex shrink-0 flex-col items-center gap-2"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 transition-all duration-300 group-hover:border-[#e8a020]/60 group-hover:shadow-[0_0_16px_rgba(239,180,63,0.25)]">
                        {person.profilePath ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profilePath}`}
                            alt={person.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/[0.06] text-[22px] font-bold text-white/30">
                            {person.name.charAt(0)}
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 rounded-full ring-0 transition-all group-hover:ring-2 group-hover:ring-[#e8a020]/40" />
                      </div>
                      <p className="w-16 truncate text-center text-[10px] font-medium text-white/60 transition group-hover:text-white/90">
                        {person.name.split(" ")[0]}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="mylists"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-4 md:px-10"
          >
            {/* Smart auto-lists */}
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">Smart Lists</p>
            <div className="mb-5 flex flex-col gap-2">
              {AUTO_LISTS.map((al) => (
                <motion.button
                  key={al.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setOpenListId(al.id)}
                  className="flex items-center gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left backdrop-blur-xl transition-all hover:border-white/[0.15] hover:bg-white/[0.05]"
                >
                  <span className="text-xl">{al.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white">{al.name}</p>
                    <p className="text-[11px] text-white/35">{al.count} items</p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-white/20 transition group-hover:text-white/50" />
                </motion.button>
              ))}
            </div>

            {/* Custom lists header */}
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">My Lists</p>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setCreating(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8a020] text-black shadow-[0_2px_10px_rgba(239,180,63,0.3)] transition hover:brightness-110"
              >
                <Plus size={14} />
              </motion.button>
            </div>

            {/* Create new list */}
            <AnimatePresence>
              {creating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-[14px] border border-[#e8a020]/35 bg-[#e8a020]/[0.06] px-3 py-2.5">
                    <input
                      autoFocus
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateSubmit();
                        if (e.key === "Escape") { setCreating(false); setNewListName(""); }
                      }}
                      placeholder="List name…"
                      className="flex-1 bg-transparent text-[13px] text-white placeholder-white/25 outline-none"
                    />
                    <button onClick={handleCreateSubmit} className="text-[12px] font-bold text-[#e8a020] transition hover:brightness-125">Save</button>
                    <button onClick={() => { setCreating(false); setNewListName(""); }} className="text-white/35 transition hover:text-white">
                      <X size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom list cards or empty state */}
            {customLists.length === 0 && !creating ? (
              <div className="relative flex flex-col items-center justify-center py-20 text-center">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-full bg-[#e8a020]/[0.05] blur-3xl" />
                </div>
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <LayoutList size={28} className="text-white/20" />
                </div>
                <p className="text-[15px] font-semibold text-white/40">No custom lists yet</p>
                <p className="mt-1 text-[12px] text-white/22">Tap + to create your first collection</p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setCreating(true)}
                  className="mt-5 rounded-full bg-[#e8a020] px-5 py-2 text-[12px] font-bold text-black shadow-[0_4px_16px_rgba(239,180,63,0.25)] transition hover:brightness-110"
                >
                  Create a list
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {customLists.map((list) => (
                  <motion.div
                    key={list.id}
                    layout
                    className="group flex items-center gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 backdrop-blur-xl transition-all hover:border-white/[0.14] hover:bg-white/[0.05]"
                  >
                    {/* Poster thumbnail */}
                    <div className="flex h-10 w-10 shrink-0 overflow-hidden rounded-[10px] border border-white/[0.08] bg-white/[0.05]">
                      {list.items.slice(0, 1).map((item) =>
                        item.posterPath ? (
                          <img key={item.id} src={`${POSTER_BASE}${item.posterPath}`} alt="" className="h-full w-full object-cover" />
                        ) : null
                      )}
                      {list.items.length === 0 && (
                        <div className="flex h-full w-full items-center justify-center">
                          <List size={13} className="text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Name / rename */}
                    {renamingId === list.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSubmit(list.id);
                          if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                        }}
                        onBlur={() => handleRenameSubmit(list.id)}
                        className="flex-1 bg-transparent text-[13px] font-semibold text-white outline-none"
                      />
                    ) : (
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpenListId(list.id)}>
                        <p className="truncate text-[13px] font-semibold text-white">{list.name}</p>
                        <p className="text-[11px] text-white/35">{list.items.length} {list.items.length === 1 ? "item" : "items"}</p>
                      </button>
                    )}

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => { setRenamingId(list.id); setRenameValue(list.name); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/45 transition hover:bg-white/[0.12] hover:text-white"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => onDeleteList(list.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400/60 transition hover:bg-red-500/20 hover:text-red-300"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
