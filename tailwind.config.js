// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
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
      },
      animation: {
        shimmer:       'shimmer 1.8s linear infinite',
        sweep:         'sweep 2.4s ease-in-out infinite',
        'live-pulse':  'live-pulse 1.6s ease-in-out infinite',
        'slide-in':    'slide-in 0.35s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}