import DATA from '../data/dashdata.json';
import { getSkin } from './skins.js';

export { DATA };

export const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
export const MDAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
export const DOWS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

export const fmt = n => Math.round(n).toLocaleString('he-IL');
export const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
export const pctS = n => fmt1(n) + '%';
export const r1 = x => (x == null || isNaN(x)) ? null : Math.round(x * 10) / 10;
export function hoursFmt(h) {
  if (h == null || isNaN(h)) return '—';
  if (h < 48) return fmt1(h) + ' שע׳';
  return fmt1(h / 24) + ' ימים';
}

export const sumR = (row, m0, m1) => { let s = 0; for (let m = m0; m <= m1; m++) s += row[m]; return s; };
export const daysR = (m0, m1) => { let s = 0; for (let m = m0; m <= m1; m++) s += MDAYS[m]; return s; };
export const rangeLabel = (m0, m1) => m0 === m1 ? MONTHS[m0] : MONTHS[m0] + '–' + MONTHS[m1];
export function totalR(m0, m1) { let s = 0; DATA.agaf.byMonth.forEach(r => { s += sumR(r, m0, m1); }); return s; }
export function statusR(name, m0, m1) { const i = DATA.status.names.indexOf(name); return sumR(DATA.status.byMonth[i], m0, m1); }
export function wMed(m0, m1) { let n = 0, s = 0; for (let m = m0; m <= m1; m++) { s += DATA.resMonth[m].med * DATA.resMonth[m].n; n += DATA.resMonth[m].n; } return n ? s / n : null; }
export function wW24(m0, m1) { let n = 0, s = 0; for (let m = m0; m <= m1; m++) { s += DATA.resMonth[m].w24 * DATA.resMonth[m].n; n += DATA.resMonth[m].n; } return n ? s / n : null; }

export function topByRange(dim, m0, m1, n, skipOther) {
  const arr = dim.names.map((name, i) => ({ label: name, value: sumR(dim.byMonth[i], m0, m1) }));
  const f = skipOther ? arr.filter(a => a.label !== 'אחר') : arr;
  return f.sort((a, b) => b.value - a.value).slice(0, n).filter(a => a.value > 0);
}

export function heatMatrix(m0, m1) {
  const M = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (let m = m0; m <= m1; m++) for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) M[d][h] += DATA.hourDow[m][d][h];
  return M;
}

/* ---------- theme-aware colors ---------- */
export const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export function isDark() {
  const m = document.documentElement.getAttribute('data-mode');
  if (m === 'dark') return true;
  if (m === 'light') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}
export function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}
export function seqColor(t) {
  const stops = getSkin().seq[isDark() ? 'dark' : 'light'];
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
  return lerpHex(stops[i], stops[i + 1], x - i);
}
export function divColor(t) {
  const neu = isDark() ? '#383835' : '#f0efec';
  const blue = isDark() ? '#3987e5' : '#2a78d6', red = isDark() ? '#e66767' : '#e34948';
  return t < 0 ? lerpHex(neu, blue, Math.min(1, -t)) : lerpHex(neu, red, Math.min(1, t));
}
export function catColor(i) {
  const c = getSkin().cat[isDark() ? 'dark' : 'light'];
  return c[i % c.length];
}

export function ticks(max, n = 4) {
  const raw = max / n, pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(x => x * pow).find(x => x >= raw) || raw;
  const out = [];
  for (let v = 0; v <= max * 1.001; v += step) out.push(v);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}
export const movAvg = (arr, w) => arr.map((_, i) => {
  const a = Math.max(0, i - w + 1);
  let s = 0; for (let j = a; j <= i; j++) s += arr[j];
  return s / (i - a + 1);
});

/* ---------- tooltip singleton ---------- */
let tipEl = null;
function tip() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'kb-tip';
    document.body.appendChild(tipEl);
  }
  return tipEl;
}
export function tipShow(x, y, title, rows) {
  const t = tip();
  t.textContent = '';
  const h = document.createElement('div'); h.className = 'tt'; h.textContent = title; t.appendChild(h);
  rows.forEach(r => {
    const d = document.createElement('div'); d.className = 'tr';
    if (r.color) { const k = document.createElement('span'); k.className = 'ln'; k.style.background = r.color; d.appendChild(k); }
    const b = document.createElement('b'); b.textContent = r.value; d.appendChild(b);
    const s = document.createElement('span'); s.textContent = r.label; d.appendChild(s);
    t.appendChild(d);
  });
  t.style.display = 'block';
  const w = t.offsetWidth, hh = t.offsetHeight;
  let px = x + 14, py = y + 14;
  if (px + w > innerWidth - 8) px = x - w - 14;
  if (py + hh > innerHeight - 8) py = y - hh - 14;
  t.style.left = px + 'px'; t.style.top = py + 'px';
}
export function tipHide() { if (tipEl) tipEl.style.display = 'none'; }
