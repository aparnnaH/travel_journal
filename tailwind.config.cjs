/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,js,jsx,mdx}',
    './src/app/**/*.{ts,tsx,js,jsx,mdx}',
    './src/components/**/*.{ts,tsx,js,jsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: 'var(--color-cream)',
        gold: 'var(--color-gold)',
        'gold-deep': 'var(--color-gold-deep)',
        ink: 'var(--color-ink)',
      },
      fontFamily: {
        serif: ['var(--font-serif)'],
        sans: ['var(--font-sans)'],
        script: ['var(--font-script)'],
      },
    },
  },
  plugins: [],
};
