import React from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="min-h-screen overflow-x-hidden bg-[#080604] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Warm espresso vignette — matches index.css body palette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,rgba(200,130,20,0.08),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_0%_55%,rgba(100,55,6,0.12),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_82%,rgba(80,40,4,0.10),transparent_60%)]" />
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
