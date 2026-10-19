import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { palettes, themeMode, themeVariables, fonts, typeScale, radius, touch } from '../src/ui/tokens.ts';

const require = createRequire(import.meta.url);
const tailwind = require('../tailwind.config.js').theme.extend;

function luminance(hex) {
  const values = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

test('ночная тема включается только у водителя в тёмном режиме системы', () => {
  assert.equal(themeMode(true, 'dark'), 'dark');
  assert.equal(themeMode(true, 'light'), 'light');
  assert.equal(themeMode(false, 'dark'), 'light');
  assert.equal(themeMode(true, null), 'light');
});

test('Tailwind и React Native используют одинаковые цвета, шрифты, размеры и радиус', () => {
  assert.deepEqual(Object.keys(palettes.light).sort(), Object.keys(palettes.dark).sort());
  for (const mode of ['light', 'dark']) {
    const variables = themeVariables(mode);
    for (const [name, value] of Object.entries(palettes[mode])) {
      assert.equal(tailwind.colors[name], `var(--color-${name})`);
      assert.equal(variables[`--color-${name}`], value);
    }
  }
  for (const [name, face] of Object.entries(fonts)) assert.deepEqual(tailwind.fontFamily[name], [face]);
  for (const [name, value] of Object.entries(typeScale)) {
    assert.equal(parseFloat(tailwind.fontSize[name][0]), value.fontSize);
    assert.equal(parseFloat(tailwind.fontSize[name][1].lineHeight), value.lineHeight);
  }
  assert.equal(tailwind.borderRadius.control, radius);
  assert.equal(touch.driverAction, 64);
  assert.ok(touch.normal >= 48 && touch.driver >= 56);
});

for (const mode of ['light', 'dark']) {
  test(`контраст текста, подписей, кнопок и точек статуса: ${mode}`, () => {
    const colors = palettes[mode];
    for (const surface of ['background', 'surface']) {
      for (const foreground of ['text', 'muted', 'accentText', 'delay']) {
        assert.ok(contrast(colors[foreground], colors[surface]) >= 4.5, `${mode}: ${foreground}/${surface}`);
      }
      for (const tone of ['delay', 'waiting', 'completed']) {
        assert.ok(contrast(colors[tone], colors[surface]) >= 3, `${mode}: ${tone} dot/${surface}`);
      }
    }
    assert.ok(contrast(colors.onAccent, colors.accent) >= 4.5);
    assert.ok(contrast(colors.onDestructive, colors.destructive) >= 4.5);
  });
}
