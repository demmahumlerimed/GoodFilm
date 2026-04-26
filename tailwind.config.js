// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body:    ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
        serif:   ['Instrument Serif', 'Georgia', 'serif'],
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        // Design-spells: sweeping shine across progress bar
        sweep: {
          '0%':   { transform: 'translateX(-100%) skewX(-12deg)' },
          '100%': { transform: 'translateX(400%) skewX(-12deg)' },
        },
        // Design-spells: live broadcast indicator pulse
        'live-pulse': {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)' },
          '50%':       { opacity: '0.35', transform: 'scale(0.75)' },
        },
        // Design-spells: staggered slide-in for list items
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Page/section entrance — fade up from slight offset
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Subtle ambient glow pulse for accent elements
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 16px rgba(232,160,32,0.18)' },
          '50%':       { boxShadow: '0 0 32px rgba(232,160,32,0.38)' },
        },
        // Skeleton loader wave
        'skeleton': {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer:       'shimmer 1.8s linear infinite',
        sweep:         'sweep 2.4s ease-in-out infinite',
        'live-pulse':  'live-pulse 1.6s ease-in-out infinite',
        'slide-in':    'slide-in 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'fade-up':     'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'glow-pulse':  'glow-pulse 2.4s ease-in-out infinite',
        'skeleton':    'skeleton 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}