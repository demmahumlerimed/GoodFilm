import { AnimatePresence, motion } from "framer-motion";

export function AnimBookmark({ active, size = 18 }: { active: boolean; size?: number }) {
  return (
    <motion.svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}
      animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}>
      <motion.path d="M5 3h14a1 1 0 011 1v17l-7-3.5L6 21V4a1 1 0 011-1z"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        animate={active ? { fill: "currentColor", opacity: 1 } : { fill: "transparent", opacity: 0.7 }}
        transition={{ duration: 0.25 }} />
    </motion.svg>
  );
}

export function AnimEye({ active, size = 18 }: { active: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
      <motion.path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
        animate={active ? { opacity: 1 } : { opacity: 0.5 }}
        transition={{ duration: 0.25 }} />
      <motion.circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.8}
        animate={active ? { scale: 1, opacity: 1, fill: "currentColor" } : { scale: 0.7, opacity: 0.4, fill: "transparent" }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} />
      <AnimatePresence>
        {!active && (
          <motion.line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} />
        )}
      </AnimatePresence>
    </svg>
  );
}

export function AnimStar({ active, size = 18 }: { active: boolean; size?: number }) {
  return (
    <motion.svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}
      animate={active ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
      <motion.polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        animate={active ? { fill: "#e8a020", stroke: "#e8a020" } : { fill: "transparent", stroke: "currentColor" }}
        transition={{ duration: 0.25 }} />
    </motion.svg>
  );
}

export function AnimCheck({ active, size = 16 }: { active: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
      <motion.circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.8}
        animate={active ? { stroke: "#34d399", opacity: 1 } : { stroke: "currentColor", opacity: 0.4 }}
        transition={{ duration: 0.2 }} />
      <AnimatePresence>
        {active && (
          <motion.path d="M8 12l3 3 5-5" stroke="#34d399" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }}
            transition={{ duration: 0.3 }} />
        )}
      </AnimatePresence>
    </svg>
  );
}
