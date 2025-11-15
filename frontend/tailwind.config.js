/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Norse mythology dark theme (improved contrast)
        'norse': {
          'night': '#0f1419',      // Deep night sky (slightly lighter)
          'shadow': '#1a1f2e',     // Yggdrasil shadows (more visible)
          'stone': '#252d3d',      // Mountain stone (better contrast)
          'rune': '#3d4556',       // Carved runes (more visible)
          'mist': '#4a5568',       // Morning mist (lighter)
        },
        'valhalla': {
          'gold': '#d4af37',       // Golden hall
          'amber': '#e8b84a',      // Amber light
          'bronze': '#b8860b',     // Bronze shields
        },
        'frost': {
          'ice': '#4a9eff',        // Ice blue
          'glacial': '#5eb3ff',    // Glacial blue
          'aurora': '#7ec8ff',     // Aurora borealis
        },
        'yggdrasil': {
          'moss': '#3a5a40',       // Tree moss
          'bark': '#2d4a34',       // Dark bark
          'leaf': '#4a7c59',       // Deep green
        },
        'magic': {
          'rune': '#8b5cf6',       // Mystic purple
          'spell': '#a78bfa',      // Light purple
          'void': '#6d28d9',       // Deep void
        },
        // Update primary to use Valhalla gold
        primary: {
          50: '#fef9e7',
          100: '#fdf0c4',
          200: '#fbe196',
          300: '#f8ce5c',
          400: '#f4b832',
          500: '#e8b84a',  // Valhalla amber
          600: '#d4af37',  // Valhalla gold
          700: '#b8960b',
          800: '#997909',
          900: '#7d630c',
          950: '#48390a',
        },
      },
      backgroundImage: {
        'rune-pattern': 'radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.05) 1px, transparent 0)',
      },
      backgroundSize: {
        'rune': '40px 40px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-border': {
          '0%, 100%': { 
            borderColor: '#d4af37',
            boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.7)'
          },
          '50%': { 
            borderColor: '#e8b84a',
            boxShadow: '0 0 0 8px rgba(212, 175, 55, 0)'
          },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
