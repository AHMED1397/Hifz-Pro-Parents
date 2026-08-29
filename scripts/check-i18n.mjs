#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// i18n key check — fails when a key used in the UI is missing from any of the
// three dictionaries.
//
//   npm run check:i18n
//
// WHY: `t('parent.foo')` is an unchecked string, so a typo or a new screen that
// forgets a translation renders the raw key on screen. TypeScript cannot see
// it. This walks every `t('…')` / `labelKey` / `titleKey` in app/ and src/,
// then resolves each key against the SAME merge the app performs at runtime
// (shared Teacher dictionary deep-merged with parentStrings) in en, ar and ta.
// ─────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// parentStrings is TypeScript but pure data, so evaluate it directly rather
// than duplicating the table here.
const psSource = fs.readFileSync(path.join(root, 'src/i18n/parentStrings.ts'), 'utf8');
const js = psSource
  .replace('export const parentStrings =', 'module.exports =')
  .replace('} as const;', '};')
  .split('export type ParentLang')[0];
const tmp = path.join(root, 'node_modules', '.cache-parentstrings.cjs');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, js);
const parentStrings = (await import(`file://${tmp}`)).default;
fs.rmSync(tmp, { force: true });

const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const dicts = {
  en: readJson('src/i18n/en.json'),
  ar: readJson('src/i18n/ar.json'),
  ta: readJson('src/i18n/ta.json'),
};

/** Mirrors deepMerge() in src/i18n/index.ts. */
function deepMerge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const prev = out[k];
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v) && prev && typeof prev === 'object' && !Array.isArray(prev)
        ? deepMerge(prev, v)
        : v;
  }
  return out;
}

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, prefix + k + '.') : [prefix + k]
  );

// ── Collect the keys the UI asks for ────────────────────────
const PATTERNS = [
  /\bt\(\s*'([^']+)'/g,
  /(?:titleKey|messageKey|labelKey|actionLabelKey)="([^"]+)"/g,
  /labelKey:\s*'([^']+)'/g,
];

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      yield* walk(full);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.startsWith('parentStrings')) {
      yield full;
    }
  }
}

const used = new Set();
for (const dir of ['app', 'src']) {
  for (const file of walk(path.join(root, dir))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) used.add(m[1]);
    }
  }
}

// ── Resolve them per language ───────────────────────────────
const keys = [...used].sort();
let failures = 0;
for (const lang of ['en', 'ar', 'ta']) {
  const defined = new Set(flatten(deepMerge(dicts[lang], parentStrings[lang])));
  const missing = keys.filter(k => !defined.has(k));
  failures += missing.length;
  if (missing.length) {
    console.error(`\n✗ ${lang}: ${missing.length} missing key(s)`);
    for (const k of missing) console.error(`    ${k}`);
  } else {
    console.log(`✓ ${lang}: all ${keys.length} keys resolve`);
  }
}

if (failures) {
  console.error(`\n${failures} missing translation(s).`);
  process.exit(1);
}
console.log(`\nAll ${keys.length} keys resolve in en, ar and ta.`);
