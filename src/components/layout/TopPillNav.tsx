import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Film, Home, List, LogOut, Search, Settings, Tv, User, X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { tr } from "../../utils/i18n";
import { getTitle, getYear } from "../../utils/library";
import { BACKDROP_BASE } from "../../config";
import { AnimBookmark, AnimEye, AnimStar } from "../ui/AnimatedIcons";
import type {
  Tab, AppLanguage, MediaType, MediaItem, CloudUser, UserProfile, UserLibrary,
} from "../../types";

export function TopPillNav({
  activeTab,
  setActiveTab,
  search,
  setSearch,
  onOpenProfile,
  appLanguage,
  searchResults,
  searchLoading,
  searchError,
  onOpenResult,
  currentUser,
  userProfile,
  library,
  onLogout,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  search: string;
  setSearch: (value: string) => void;
  onOpenProfile: (view?: "profile" | "settings", anchorTop?: number) => void;
  appLanguage: AppLanguage;
  searchResults: MediaItem[];
  searchLoading: boolean;
  searchError: string | null;
  onOpenResult: (item: MediaItem, mediaType: MediaType) => void;
  currentUser: CloudUser | null;
  userProfile: UserProfile | null;
  library: UserLibrary;
  onLogout: () => void;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<"all" | "movie" | "tv" | "anime">("all");
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const userBtnRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showUserPopover) return;
    const h = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        userBtnRef.current && !userBtnRef.current.contains(e.target as Node)
      ) {
        setShowUserPopover(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showUserPopover]);

  const filteredSearchResults = useMemo(() => {
    if (searchFilter === "all") return searchResults;
    if (searchFilter === "movie")
      return searchResults.filter(
        (result) => (result.media_type || (result.first_air_date ? "tv" : "movie")) === "movie"
      );
    if (searchFilter === "tv")
      return searchResults.filter(
        (result) => (result.media_type || (result.first_air_date ? "tv" : "movie")) === "tv"
      );
    return searchResults.filter((result) => {
      const type = result.media_type || (result.first_air_date ? "tv" : "movie");
      const genres = result.genre_ids || [];
      const isAnimation = genres.includes(16);
      const hasJapaneseSignals = /anime|japan|japanese/i.test(
        `${result.title || ""} ${result.name || ""} ${result.overview || ""}`
      );
      return isAnimation || (type === "tv" && hasJapaneseSignals);
    });
  }, [searchResults, searchFilter]);

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [] as Array<{ label: string; item: MediaItem; type: MediaType }>;
    return searchResults
      .map((result) => {
        const label = getTitle(result);
        const lower = label.toLowerCase();
        const type: MediaType = result.media_type || (result.first_air_date ? "tv" : "movie");
        let score = 0;
        if (lower === q) score += 120;
        if (lower.startsWith(q)) score += 80;
        if (lower.includes(q)) score += 45;
        if (lower.split(" ").some((word) => word.startsWith(q))) score += 20;
        score += Math.max(0, 20 - Math.abs(lower.length - q.length));
        score += Math.round(result.vote_average || 0);
        return { label, item: result, type, score };
      })
      .sort((a, b) => b.score - a.score)
      .filter(
        (entry, index, arr) =>
          arr.findIndex(
            (x) => x.label.toLowerCase() === entry.label.toLowerCase() && x.type === entry.type
          ) === index
      )
      .slice(0, 6);
  }, [search, searchResults]);

  const items = [
    { key: "home" as Tab,   label: tr(appLanguage, "home"),    icon: Home },
    { key: "movies" as Tab, label: tr(appLanguage, "movies"),  icon: Film },
    { key: "series" as Tab, label: tr(appLanguage, "tvShows"), icon: Tv },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#07080d]/90 backdrop-blur-xl" style={{ isolation: "isolate" }}>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5" />

        <div className="relative flex items-center justify-between px-4 py-4 md:px-10 lg:px-14">
          {/* LEFT: Logo */}
          <motion.button
            whileHover={{ opacity: 0.85 }}
            onClick={() => { setActiveTab("home"); setIsSearchOpen(false); setSearch(""); setMobileMenuOpen(false); }}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efb43f]">
              <Film size={14} className="text-black" />
            </div>
            <span className="text-[16px] font-black tracking-[-0.04em] text-white">GoodFilm</span>
          </motion.button>

          {/* CENTER: Nav links */}
          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1">
            {[...items, { key: "mylist" as Tab, label: tr(appLanguage, "myList"), icon: List }].map((item) => {
              const Icon = item.icon;
              const active = item.key === activeTab;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setIsSearchOpen(false); setSearch(""); }}
                  whileTap={{ scale: 0.97 }}
                  className="relative px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors"
                >
                  <span className={cn("transition-colors duration-200", active ? "text-white" : "text-white/45 hover:text-white/80")}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#efb43f]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* RIGHT: Search + User + Hamburger */}
          <div className="flex items-center gap-3 shrink-0">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => { setSearchFilter("all"); setIsSearchOpen(true); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:text-white"
              aria-label="Search"
            >
              <Search size={15} />
            </motion.button>

            {/* User popover */}
            <div className="relative">
              <motion.button
                ref={userBtnRef}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                onClick={() => setShowUserPopover(v => !v)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border transition",
                  activeTab === "profile"
                    ? "border-[#efb43f] bg-[#efb43f]/20 text-[#efb43f] ring-1 ring-[#efb43f]/30"
                    : currentUser
                    ? "border-[#efb43f]/30 bg-[#efb43f]/10 text-[#efb43f]"
                    : "border-white/10 bg-white/[0.04] text-white/60 hover:border-[#efb43f]/40 hover:text-[#efb43f]"
                )}
                aria-label="Profile"
              >
                {currentUser && userProfile ? (
                  <span className="text-[11px] font-black">
                    {(userProfile.username || currentUser.email || "U").slice(0, 1).toUpperCase()}
                  </span>
                ) : (
                  <User size={15} />
                )}
              </motion.button>

              <AnimatePresence>
                {showUserPopover && (
                  <motion.div
                    ref={popoverRef}
                    initial={{ opacity: 0, scale: 0.94, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-11 z-[60] w-[240px] overflow-hidden rounded-[16px] border border-white/10 bg-[#0e0f18] shadow-[0_16px_48px_rgba(0,0,0,0.7)] max-h-[80svh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                  >
                    {currentUser && userProfile ? (
                      <>
                        <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#efb43f] to-[#c97d0a] text-[15px] font-black text-black">
                            {userProfile.avatarUrl
                              ? <img src={userProfile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                              : (userProfile.username || currentUser.email || "U").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-bold text-white">{userProfile.username}</div>
                            <div className="truncate text-[10px] text-white/40">{currentUser.email}</div>
                          </div>
                        </div>

                        <div className="flex divide-x divide-white/6 border-b border-white/6">
                          {[
                            { v: library.watched.length, l: "Watched", icon: AnimEye },
                            { v: library.watchlist.length, l: "List", icon: AnimBookmark },
                            { v: Object.keys(library.ratings || {}).length, l: "Rated", icon: AnimStar },
                          ].map(({ v, l, icon: Icon }) => (
                            <div key={l} className="flex flex-1 flex-col items-center py-2.5">
                              <div className="text-[16px] font-black text-white leading-none">{v}</div>
                              <div className="mt-0.5 flex items-center gap-1 text-[9px] text-white/35">
                                <Icon active={v > 0} size={10} />
                                {l}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-1.5 space-y-0.5">
                          <button
                            onClick={() => { setShowUserPopover(false); onOpenProfile("profile"); }}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold transition hover:bg-white/[0.06]",
                              activeTab === "profile" ? "bg-white/[0.08] text-white" : "text-white/70 hover:text-white"
                            )}
                          >
                            <User size={13} className={activeTab === "profile" ? "text-[#efb43f]" : "text-white/40"} />
                            View Profile
                            {activeTab === "profile" && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#efb43f]" />}
                          </button>
                          <button
                            onClick={() => { setShowUserPopover(false); onOpenProfile("settings"); }}
                            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                          >
                            <Settings size={13} className="text-white/40" /> Settings
                          </button>
                          <div className="my-1 border-t border-white/6" />
                          <button
                            onClick={() => { setShowUserPopover(false); onLogout(); }}
                            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400"
                          >
                            <LogOut size={13} /> Sign Out
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] mx-auto">
                          <User size={20} className="text-white/40" />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-white">Sign in to sync</div>
                          <div className="text-[11px] text-white/35 mt-0.5">Save your list across devices</div>
                        </div>
                        <button
                          onClick={() => { setShowUserPopover(false); onOpenProfile("profile"); }}
                          className="w-full rounded-[10px] bg-[#efb43f] py-2.5 text-[12px] font-bold text-black transition hover:brightness-110"
                        >
                          Sign In / Sign Up
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:text-white md:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X size={15} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-white/6 md:hidden"
            >
              <div className="flex flex-col px-4 py-2">
                {[...items, { key: "mylist" as Tab, label: tr(appLanguage, "myList"), icon: List }].map((navItem) => {
                  const Icon = navItem.icon;
                  const active = navItem.key === activeTab;
                  return (
                    <button
                      key={navItem.key}
                      onClick={() => { setActiveTab(navItem.key); setMobileMenuOpen(false); setIsSearchOpen(false); setSearch(""); }}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] px-3 py-3 text-[14px] font-semibold transition",
                        active ? "bg-white/8 text-white" : "text-white/50 hover:text-white"
                      )}
                    >
                      <Icon size={15} className={active ? "text-[#efb43f]" : "text-white/30"} />
                      {navItem.label}
                      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#efb43f]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search overlay */}
      <AnimatePresence>
        {isSearchOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={() => { setIsSearchOpen(false); setSearch(""); setSearchFilter("all"); }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="mx-auto mt-16 w-[calc(100vw-24px)] max-w-[680px] overflow-hidden rounded-[16px] border border-white/8 bg-[#0a0c12]/98 shadow-[0_32px_80px_rgba(0,0,0,0.6)] sm:mt-20 sm:w-[calc(100vw-32px)] sm:rounded-[20px]"
            >
              <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-4">
                <Search size={18} className="text-white/52" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr(appLanguage, "search")}
                  className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/32"
                />
                <button
                  onClick={() => { setSearch(""); setIsSearchOpen(false); }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {searchSuggestions.length ? (
                <div className="border-b border-white/8 px-5 py-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/36">Suggestions</div>
                  <div className="flex flex-wrap gap-2">
                    {searchSuggestions.map((entry) => (
                      <button
                        key={`${entry.type}-${entry.item.id}`}
                        onClick={() => setSearch(entry.label)}
                        className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/74 transition hover:bg-white/[0.1] hover:text-white"
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="border-b border-white/8 px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "movie", label: "Movies" },
                    { key: "tv", label: "Series" },
                    { key: "anime", label: "Anime" },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSearchFilter(filter.key as "all" | "movie" | "tv" | "anime")}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        searchFilter === filter.key
                          ? "bg-[#efb43f] text-black font-bold"
                          : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                {!search.trim() ? (
                  <div className="text-sm text-white/48">Start typing to search movies and TV shows.</div>
                ) : searchLoading ? (
                  <div className="text-sm text-white/48">Searching...</div>
                ) : searchError ? (
                  <div className="text-sm text-red-300">{searchError}</div>
                ) : filteredSearchResults.length ? (
                  <div className="space-y-3">
                    {filteredSearchResults.slice(0, 12).map((result) => {
                      const type: MediaType = result.media_type || (result.first_air_date ? "tv" : "movie");
                      return (
                        <button
                          key={`${type}-${result.id}`}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearch("");
                            setActiveTab(type === "movie" ? "movies" : "series");
                            onOpenResult(result, type);
                          }}
                          className="flex w-full items-center gap-4 rounded-2xl bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]"
                        >
                          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-[#151515]">
                            {result.backdrop_path || result.poster_path ? (
                              <img
                                src={`${BACKDROP_BASE}${result.backdrop_path || result.poster_path}`}
                                alt={getTitle(result)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/34">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{getTitle(result)}</div>
                            <div className="mt-1 text-xs text-white/45">
                              {type === "movie" ? "Movie" : "Series"} • {getYear(result)}
                            </div>
                            {result.overview ? (
                              <div className="mt-1 line-clamp-2 text-xs text-white/42">{result.overview}</div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-white/48">No results found.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
