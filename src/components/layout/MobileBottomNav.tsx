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
import { Film, Home, List, Search, Tv } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Tab } from "../../types";

interface MobileBottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onSearchOpen: () => void;
}

const NAV_ITEMS = [
  { key: "home"   as Tab, label: "Home",    Icon: Home  },
  { key: "movies" as Tab, label: "Movies",  Icon: Film  },
  { key: "series" as Tab, label: "TV",      Icon: Tv    },
  { key: "mylist" as Tab, label: "My List", Icon: List  },
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
          "mx-4 mb-3 flex items-center gap-0.5",
          "rounded-[26px] border border-white/[0.09]",
          "bg-[#0b0c13]/92 backdrop-blur-2xl",
          "px-2 py-1.5",
          "shadow-[0_12px_48px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)]"
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
        "relative flex flex-col items-center justify-center gap-[3px]",
        "min-w-[56px] rounded-[18px] px-3 py-2",
        "transition-colors duration-150",
        active ? "bg-white/[0.08]" : "hover:bg-white/[0.04] active:bg-white/[0.06]"
      )}
    >
      {/* Active indicator pill */}
      <AnimatePresence>
        {active && (
          <motion.span
            layoutId="mobile-nav-indicator"
            className="absolute -top-px inset-x-3 h-[2px] rounded-full bg-[#efb43f]"
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
          active ? "text-[#efb43f]" : "text-white/38"
        )}
      >
        {icon}
      </span>

      {/* Label */}
      <span
        className={cn(
          "text-[9.5px] font-semibold uppercase tracking-[0.07em] leading-none transition-colors duration-150",
          active ? "text-[#efb43f]" : "text-white/30"
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}
