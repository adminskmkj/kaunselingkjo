import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary: Sage Green (kalm, nurturing, growth)
        primary: {
          50: '#f3f7f4',
          100: '#e3ece6',
          200: '#c7d9cf',
          300: '#a0bfae',
          400: '#6f9d83',
          500: '#4f8068',
          600: '#3d6653',
          700: '#345446',
          800: '#2c4439',
          900: '#253930',
        },
        // Accent: Warm Honey (ceria, energizing, mesra)
        accent: {
          50: '#fef9ee',
          100: '#fdf0d4',
          200: '#fbe0a8',
          300: '#f7c971',
          400: '#f3ad3d',
          500: '#ef9220',
          600: '#d97316',
          700: '#b45315',
          800: '#924119',
          900: '#783719',
        },
        // Neutral: Warm Stone (bukan slate sejuk)
        neutral: {
          50: '#faf9f7',
          100: '#f3f1ed',
          200: '#e6e2dc',
          300: '#d1cabf',
          400: '#a89e8e',
          500: '#82776a',
          600: '#5e564b',
          700: '#423d35',
          800: '#2b2823',
          900: '#1a1814',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px 0 rgba(47, 68, 58, 0.06)',
        'medium': '0 4px 16px 0 rgba(47, 68, 58, 0.08)',
        'strong': '0 8px 24px 0 rgba(47, 68, 58, 0.12)',
      },
      // Micrographic dot pattern utility
      backgroundImage: {
        'dots': 'radial-gradient(circle, rgba(79, 128, 104, 0.08) 1px, transparent 1px)',
        'dots-honey': 'radial-gradient(circle, rgba(239, 146, 32, 0.06) 1px, transparent 1px)',
        'grid-sage': 'linear-gradient(rgba(79, 128, 104, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 128, 104, 0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dots-sm': '16px 16px',
        'dots-md': '24px 24px',
        'grid': '32px 32px',
      },
    },
  },
  plugins: [],
} satisfies Config;
