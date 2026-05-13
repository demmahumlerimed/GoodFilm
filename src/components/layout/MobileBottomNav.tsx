/**
 * GoodFilm — Mobile Bottom Navigation Bar
 *
 * A floating, frosted-glass dock nav pinned to the bottom of the screen on
 * phone-sized viewports (hidden ≥ md). Five destinations:
 *   Home · Movies · TV · My List · Search
 *
 * Design language:
 *   • Dark elevated capsule surface with subtle border + shadow
 *   • Gold accent on active item with animated indicator pill
 *   • Large tap targets (44 px minimum)
 *   • Respects iOS safe-area-inset-bottom via CSS env()
 */

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Film, Home, LayoutList, Search, Sparkles, Tv } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Tab } from "../../types";

interface MobileBottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onSearchOpen: () => void;
}

const NAV_ITEMS = [
  { key: "home"   as Tab, label: "Home",   Icon: Home       },
  { key: "movies" as Tab, label: "Movies", Icon: Film       },
  { key: "series" as Tab, label: "TV",     Icon: Tv         },
  { key: "anime"  as Tab, label: "Anime",  Icon: Sparkles   },
  { key: "lists"  as Tab, label: "Lists",  Icon: LayoutList },
];

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  onSearchOpen,
}: MobileBottomNavProps) {
  const searchActive = false; // search has its own overlay, not a tab

  return (
    /* Only visible below the md (768 px) breakpoint */
    <div
      className="fixed bottom-0 inset-x-0 z-50 flex justify-center md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
    >
      {/* Floating capsule bar */}
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 32, delay: 0.1 }}
        className={cn(
          "mx-3 mb-3 flex items-center gap-0",
          "rounded-[28px] border border-white/[0.10]",
          "bg-[#0d0809]/95 backdrop-blur-2xl",
          "px-1.5 py-1",
          "shadow-[0_16px_56px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,240,210,0.06)]"
        )}
      >
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = key === activeTab;
          return (
            <NavButton
              key={key}
              label={label}
              active={active}
              icon={<Icon size={21} strokeWidth={active ? 2.2 : 1.8} />}
              onClick={() => setActiveTab(key)}
            />
          );
        })}

        {/* Search — opens overlay, never a "tab" */}
        <NavButton
          label="Search"
          active={searchActive}
          icon={<Search size={21} strokeWidth={1.8} />}
          onClick={onSearchOpen}
        />
      </motion.nav>
    </div>
  );
}

/* ── Single nav button ──────────────────────────────────────────────────── */

function NavButton({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.84 }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-[4px]",
        "min-w-[52px] rounded-[18px] px-2.5 py-2.5",
        "transition-colors duration-150",
        active ? "bg-white/[0.09]" : "active:bg-white/[0.06]"
      )}
    >
      {/* Active indicator pill */}
      <AnimatePresence>
        {active && (
          <motion.span
            layoutId="mobile-nav-indicator"
            className="absolute -top-px inset-x-2.5 h-[2.5px] rounded-full bg-[#e63946]"
            initial={{ opacity: 0, scaleX: 0.4 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.4 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <span
        className={cn(
          "transition-colors duration-150",
          active ? "text-[#e63946]" : "text-[#ede8de]/45"
        )}
      >
        {icon}
      </span>

      {/* Label */}
      <span
        className={cn(
          "text-[11px] font-semibold leading-none tracking-[-0.01em] transition-colors duration-150",
          active ? "text-[#e63946]" : "text-[#ede8de]/42"
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}
