#!/usr/bin/env node
/**
 * Generate assets/quran_uthmani15_pages.json — the Uthmani (Madani) 15-line
 * mushaf, page-by-page, each page normalised to exactly 15 lines.
 *
 * Run on a machine WITH internet:
 *     node scripts/generate-mushaf.mjs
 *
 * Data source: Quran Content API (Quran Foundation / Quran.com v4) —
 * https://api.quran.com/api/v4/verses/by_page/{PAGE}?mushaf=1
 *
 * mushaf=1 is the QCF v1 Madani 15-line layout (same 604 pages, same page
 * boundaries as the IndoPak 15-line; only the script differs → Uthmani).
 *
 * Requires Node 18+ (global fetch). No dependencies.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'quran_uthmani15_pages.json');

const MUSHAF = 1;             // QCF v1 — Uthmani Madani 15-line
const LINES_PER_PAGE = 15;
const FIRST_PAGE = 1;
const LAST_PAGE = 604;
const CONCURRENCY = 12;
const MAX_RETRIES = 4;
const HEADERS = { 'User-Agent': 'HfzPro/1.0 (madrasa teacher app)' };

function url(page) {
  return `https://api.quran.com/api/v4/verses/by_page/${page}` +
    `?words=true&per_page=50&mushaf=${MUSHAF}` +
    `&word_fields=text_uthmani,page_number,line_number`;
}

async function fetchPage(page) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url(page), { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return transformPage(page, json.verses || []);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw new Error(`page ${page}: ${err.message}`);
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
}

function transformPage(page, verses) {
  const byLine = new Map();
  const verseKeys = [];
  const juz = new Set();
  const surahStartsHere = new Set();

  for (const v of verses) {
    verseKeys.push(v.verse_key);
    if (v.juz_number != null) juz.add(v.juz_number);
    const [surah, ayah] = v.verse_key.split(':');
    if (ayah === '1') surahStartsHere.add(Number(surah));
    for (const w of v.words || []) {
      const ln = w.line_number;
      if (ln == null) continue;
      if (!byLine.has(ln)) byLine.set(ln, []);
      byLine.get(ln).push(w.text_uthmani ?? w.text ?? '');
    }
  }

  const bannerSurah = [...surahStartsHere].sort((a, b) => a - b)[0];
  const lines = [];
  for (let ln = 1; ln <= LINES_PER_PAGE; ln++) {
    const words = byLine.get(ln);
    if (words && words.length) {
      lines.push({ line: ln, type: 'ayah', text: words.join(' ') });
    } else {
      const entry = { line: ln, type: 'surah_header_or_basmalah', text: '' };
      if (bannerSurah) entry.surah = bannerSurah;
      lines.push(entry);
    }
  }

  return {
    page,
    verse_keys: verseKeys,
    juz: [...juz].sort((a, b) => a - b),
    line_count: LINES_PER_PAGE,
    lines,
  };
}

async function run() {
  const pageNums = Array.from({ length: LAST_PAGE - FIRST_PAGE + 1 }, (_, i) => i + FIRST_PAGE);
  const results = new Array(pageNums.length);
  let done = 0;

  async function worker(queue) {
    for (const idx of queue) {
      const page = pageNums[idx];
      results[idx] = await fetchPage(page);
      done++;
      if (done % 25 === 0 || done === pageNums.length) {
        process.stdout.write(`\r  fetched ${done}/${pageNums.length} pages`);
      }
    }
  }

  const queues = Array.from({ length: CONCURRENCY }, () => []);
  pageNums.forEach((_, i) => queues[i % CONCURRENCY].push(i));

  console.log(`Fetching Uthmani 15-line mushaf (pages ${FIRST_PAGE}–${LAST_PAGE})…`);
  await Promise.all(queues.map(worker));
  process.stdout.write('\n');

  const out = {
    mushaf: {
      id: MUSHAF,
      code: 'Uthmani15Lines',
      pages: 604,
      lines_per_page: LINES_PER_PAGE,
      script: 'text_uthmani',
      note: 'Blank lines marked surah_header_or_basmalah are decorative surah-name banners / basmalah rendered by the mushaf, not word data.',
    },
    source: 'api.quran.com v4 (Quran Foundation)',
    pages: results,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out), 'utf8');
  console.log(`✓ Wrote ${OUT} (${results.length} pages)`);
}

run().catch(err => { console.error('\n✗', err.message); process.exit(1); });
