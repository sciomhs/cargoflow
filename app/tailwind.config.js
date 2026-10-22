/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries([
        'background', 'surface', 'text', 'muted', 'border', 'pressed', 'accent', 'accentText',
        'onAccent', 'destructive', 'onDestructive', 'delay', 'waiting', 'completed', 'tint',
      ].map((name) => [name, `var(--color-${name})`])),
      fontFamily: { sans: ['IBMPlexSans_400Regular'], medium: ['IBMPlexSans_500Medium'], mono: ['IBMPlexMono_400Regular'] },
      fontSize: { caption: ['12px', { lineHeight: '16px' }], small: ['14px', { lineHeight: '20px' }], body: ['16px', { lineHeight: '24px' }], title: ['20px', { lineHeight: '28px' }], display: ['28px', { lineHeight: '36px' }] },
      borderRadius: { control: 12 },
    },
  },
  plugins: [],
};
