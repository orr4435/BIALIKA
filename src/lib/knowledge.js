/* מרכז ידע — data layer.
   Everything here runs fully client-side against the pre-aggregated
   src/data/knowledge.json (per-topic volume/routing/timing stats,
   computed from the 2025 call export) plus curated narrative content
   in src/data/knowledgeFaq.js. No network calls, no PII. */
import KDATA from '../data/knowledge.json';
import { FAQ_CONTENT, GENERIC_HINTS } from '../data/knowledgeFaq.js';
import { fmt, fmt1, pctS } from './helpers.js';

export const DOWS = KDATA.meta.dows;
export const MONTHS = KDATA.meta.months;
export const SHIFTS = KDATA.meta.shifts;
export const SHIFT_ICONS = ['🌅', '🌇', '🌙'];

const norm = s => (s || '').trim().replace(/\s+/g, ' ');

const CONTENT_MAP = {};
Object.entries(FAQ_CONTENT).forEach(([k, v]) => { CONTENT_MAP[norm(k)] = v; });

function curatedFor(name) {
  const c = CONTENT_MAP[norm(name)];
  if (c) return c;
  const hit = GENERIC_HINTS.find(h => h.test.test(name));
  return hit ? { question: null, aliases: [], guidance: [hit.text], generic: true } : null;
}

/* ---------- entries ---------- */
let _entries = null;
export function allEntries() {
  if (_entries) return _entries;
  _entries = KDATA.topics.map((t, i) => {
    const curated = curatedFor(t.name);
    return {
      ...t,
      rank: i + 1,
      question: curated && curated.question,
      aliases: (curated && curated.aliases) || [],
      guidance: (curated && curated.guidance) || [],
      curated: !!(curated && !curated.generic),
      hasContent: !!curated,
    };
  });
  return _entries;
}

export function getEntry(name) {
  return allEntries().find(e => e.name === name) || null;
}

/* ---------- search / ask ---------- */
function score(entry, terms) {
  const hay = norm([entry.name, ...(entry.aliases || []), entry.question || ''].join(' ')).toLowerCase();
  let s = 0;
  const nameL = entry.name.toLowerCase();
  terms.forEach(t => {
    if (!t) return;
    if (nameL === t) s += 12;
    else if (nameL.includes(t)) s += 6;
    if ((entry.aliases || []).some(a => a.toLowerCase().includes(t))) s += 5;
    if (hay.includes(t)) s += 2;
  });
  // light popularity tiebreaker so common topics surface first on ties
  s += Math.min(1, entry.count / 6000);
  return s;
}

export function search(query, limit = 6) {
  const q = norm(query).toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(w => w.length >= 2);
  if (!terms.length) return [];
  const scored = allEntries()
    .map(e => ({ e, s: score(e, terms) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map(x => x.e);
}

/* ---------- forecast (shift / date summary) ---------- */
const MIN_SAMPLE = 25; // topics with fewer than this many yearly calls are too noisy to index

function idx(part, whole, denom) {
  if (!whole) return 1;
  return (part / whole) / (1 / denom);
}

/**
 * dow: 0-6 (Sunday=0) or null for "any day"
 * month: 0-11 or null for "any month"
 * shift: 0-2 or null for "all day"
 */
const MDAYS_2025 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function forecast({ dow = null, month = null, shift = null } = {}) {
  const g = KDATA.meta;
  const yearlyDailyAvg = g.total / 365;
  const avgForDow = dow != null ? g.byDow[dow] / g.dowOccurrences[dow] : yearlyDailyAvg;

  // seasonality: ratio of this month's average daily rate to the yearly average daily rate
  const monthFactor = month != null ? (g.byMonth[month] / MDAYS_2025[month]) / yearlyDailyAvg : 1;
  // what fraction of a day's calls fall in this shift (shifts are equal-length but not equally busy)
  const shiftShare = shift != null ? g.byShift[shift] / g.total : 1;

  const expectedVolume = avgForDow * monthFactor * shiftShare;

  const rows = allEntries()
    .filter(t => t.count >= MIN_SAMPLE)
    .map(t => {
      const dowIdxT = dow != null ? idx(t.byDow[dow], t.count, 7) : 1;
      const monthIdxT = month != null ? idx(t.byMonth[month], t.count, 12) : 1;
      const shiftIdxT = shift != null ? idx(t.byShift[shift], t.count, 3) : 1;
      const weight = t.shareText * dowIdxT * monthIdxT * shiftIdxT;
      return { t, weight, dowIdxT, monthIdxT, shiftIdxT };
    })
    .sort((a, b) => b.weight - a.weight);

  const wSum = rows.reduce((s, r) => s + r.weight, 0) || 1;
  const ranked = rows.map(r => ({
    ...r.t,
    expectedSharePct: r.weight / wSum * 100,
    dowIdx: r.dowIdxT, monthIdx: r.monthIdxT, shiftIdx: r.shiftIdxT,
  }));

  return {
    expectedVolume,
    volumeVsAvgPct: (expectedVolume - yearlyDailyAvg) / yearlyDailyAvg * 100,
    topTopics: ranked.slice(0, 8),
    risingVsYearly: ranked.filter(r => r.count >= 80).sort((a, b) => b.expectedSharePct / (b.shareText || 0.01) - a.expectedSharePct / (a.shareText || 0.01)).slice(0, 4),
  };
}

export function dowOfDate(d) {
  return d.getDay(); // JS: Sunday=0 already matches DOWS order
}

export { fmt, fmt1, pctS };
export const META = KDATA.meta;
