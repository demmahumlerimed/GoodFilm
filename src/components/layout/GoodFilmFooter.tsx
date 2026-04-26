import { motion } from "framer-motion";
import { Film } from "lucide-react";

function SocialIcon({ type }: { type: string }) {
  if (type === "x") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.26 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
  if (type === "ig") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
  if (type === "yt") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function GoodFilmFooter() {
  const footerCols = [
    {
      label: "Discover",
      links: [
        { title: "Trending Movies" },
        { title: "Top Rated TV" },
        { title: "Coming Soon" },
        { title: "Fan Favorites" },
      ],
    },
    {
      label: "Your Library",
      links: [
        { title: "Watchlist" },
        { title: "Watched History" },
        { title: "Ratings" },
        { title: "My Lists" },
      ],
    },
    {
      label: "Support",
      links: [
        { title: "Help Center" },
        { title: "Privacy Policy" },
        { title: "Terms of Service" },
        { title: "Contact Us" },
      ],
    },
    {
      label: "Follow Us",
      links: [
        { title: "X / Twitter", icon: "x" },
        { title: "Instagram", icon: "ig" },
        { title: "YouTube", icon: "yt" },
        { title: "LinkedIn", icon: "li" },
      ],
    },
  ];

  return (
    <footer className="relative mt-16 border-t border-white/6 bg-[#07080d]">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8a020]/30 to-transparent" />
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_50%_60px_at_50%_0%,rgba(239,180,63,0.06),transparent)]" />

      <div className="mx-auto max-w-[1340px] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 lg:gap-12">
          {/* Brand col */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8a020]">
                <Film size={14} className="text-black" />
              </div>
              <span className="text-[16px] font-black tracking-[-0.03em] text-white" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>GoodFilm</span>
            </div>
            <p className="text-[12px] leading-[1.8] text-white/35 max-w-[200px]">
              Track what you watch. Discover what's next.
            </p>
            <p className="mt-4 text-[11px] text-white/20">
              © {new Date().getFullYear()} GoodFilm. All rights reserved.
            </p>
          </motion.div>

          {/* Link cols */}
          {footerCols.map((col, idx) => (
            <motion.div key={col.label}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.08 * (idx + 1) }}>
              <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>{col.label}</h4>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.title}>
                    <a href="#" className="group flex items-center gap-2 text-[12px] text-white/45 transition hover:text-white/80">
                      {"icon" in link && link.icon && (
                        <span className="text-white/30 transition group-hover:text-[#e8a020]">
                          <SocialIcon type={link.icon as string} />
                        </span>
                      )}
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/6 pt-6 sm:mt-12 sm:flex-row sm:pt-8 sm:gap-4">
          <p className="text-[11px] text-white/25">Powered by TMDB · IMDb · OMDb</p>
          <div className="flex items-center gap-4">
            {["Privacy", "Terms", "Cookies"].map(label => (
              <a key={label} href="#" className="text-[11px] text-white/25 transition hover:text-white/50">{label}</a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
