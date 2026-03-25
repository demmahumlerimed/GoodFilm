import React from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="min-h-screen overflow-x-hidden bg-[#07080d] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(239,180,63,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_50%,rgba(14,30,65,0.28),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_80%,rgba(14,30,65,0.18),transparent_60%)]" />
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "256px",
          }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
