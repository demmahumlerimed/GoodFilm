/**
 * GoodFilm — Mobile Top Bar
 *
 * Replaces the full desktop TopPillNav on phone-sized screens.
 * Compact, sticky, frosted-glass header containing:
 *   • GoodFilm logo (taps → Home)
 *   • Search icon button
 *   • Profile / avatar button
 *
 * Visible only below the md (768 px) breakpoint.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, Search, Settings, User } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Tab, CloudUser, UserProfile } from "../../types";

interface MobileTopBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onSearchOpen: () => void;
  onProfileOpen: () => void;
  onSettingsOpen: () => void;
  currentUser: CloudUser | null;
  userProfile: UserProfile | null;
}

export function MobileTopBar({
  setActiveTab,
  onSearchOpen,
  onProfileOpen,
  currentUser,
  userProfile,
}: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-[60] md:hidden" style={{ isolation: "isolate" }}>
      {/* Frosted glass backdrop */}
      <div className="absolute inset-0 bg-[#080604]/90 backdrop-blur-2xl" />
      {/* Bottom hairline */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[rgba(255,240,210,0.06)]" />

      <div className="relative flex items-center justify-between px-4 py-3">
        {/* ── Left: Logo ── */}
        <Link
          to="/"
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-2"
          aria-label="GoodFilm home"
        >
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#efb43f] shadow-[0_0_12px_rgba(239,180,63,0.35)]">
            <Film size={13} className="text-black" />
          </div>
          <span className="text-[15px] font-black tracking-[-0.04em] text-white">
            GoodFilm
          </span>
        </Link>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onSearchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/55 transition active:bg-white/10"
            aria-label="Search"
          >
            <Search size={17} />
          </motion.button>

          {/* Profile / Avatar */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onProfileOpen}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border transition",
              currentUser
                ? "border-[#efb43f]/35 bg-[#efb43f]/12 text-[#efb43f]"
                : "border-white/10 bg-white/[0.05] text-white/50"
            )}
            aria-label="Profile"
          >
            {currentUser && userProfile ? (
              userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.username || "avatar"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-[12px] font-black">
                  {(userProfile.username || currentUser.email || "U")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              )
            ) : (
              <User size={16} />
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
