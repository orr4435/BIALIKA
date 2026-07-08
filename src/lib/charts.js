/* Vanilla SVG/canvas chart renderers, mounted into React refs. */
import {
  DATA, MONTHS, MDAYS, DOWS, fmt, fmt1, pctS, css, ticks, movAvg,
  tipShow, tipHide, totalR, sumR, seqColor, divColor,
} from './helpers.js';

const NS = 'http://www.w3.org/2000/svg';
export function sEl(n, attrs) {
  const e = document.createElementNS(NS, n);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

/* -------- monthly column chart -------- */
export function renderMonth(el, m0, m1) {
  el.textContent = '';
  const vals = MONTHS.map((_, m) => totalR(m, m));
  const W = 640, H = 230, P = { l: 44, r: 8, t: 16, b: 26 };
  const svg = sEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': 'פניות לפי חודש' });
  const max = Math.max(...vals), tk = ticks(max);
  const yMax = tk[tk.length - 1] || max;
  const y = v => P.t + (H - P.t - P.b) * (1 - v / yMax);
  tk.forEach(v => {
    svg.appendChild(sEl('line', { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), stroke: css('--grid'), 'stroke-width': 1 }));
    const t = sEl('text', { x: P.l - 6, y: y(v) + 3.5, 'text-anchor': 'end', 'font-size': 10, fill: css('--muted') });
    t.textContent = fmt(v); svg.appendChild(t);
  });
  const bw = Math.min(24, (W - P.l - P.r) / 12 - 10);
  let maxIn = -1, maxV = -1;
  vals.forEach((v, m) => { if (m >= m0 && m <= m1 && v > maxV) { maxV = v; maxIn = m; } });
  vals.forEach((v, m) => {
    const cx = P.l + (W - P.l - P.r) * (m + 0.5) / 12;
    const inR = m >= m0 && m <= m1;
    const h = Math.max(2, y(0) - y(v));
    const r = Math.min(4, bw / 2);
    const p = sEl('path', {
      d: `M${cx - bw / 2},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${bw - 2 * r} q${r},0 ${r},${r} v${h - r} z`,
      fill: inR ? css('--accent') : css('--grid'),
    });
    p.style.cursor = 'default';
    p.addEventListener('pointermove', e => tipShow(e.clientX, e.clientY, MONTHS[m] + ' 2025', [
      { value: fmt(v), label: 'פניות', color: inR ? css('--accent') : css('--axis') },
      { value: fmt1(v / MDAYS[m]), label: 'ליום בממוצע' }]));
    p.addEventListener('pointerleave', tipHide);
    svg.appendChild(p);
    const lbl = sEl('text', { x: cx, y: H - 8, 'text-anchor': 'middle', 'font-size': 9.5, fill: css('--muted') });
    lbl.textContent = MONTHS[m].slice(0, 3) + '׳'; svg.appendChild(lbl);
    if (m === maxIn) {
      const vt = sEl('text', { x: cx, y: y(v) - 5, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600, fill: css('--ink') });
      vt.textContent = fmt(v); svg.appendChild(vt);
    }
  });
  svg.appendChild(sEl('line', { x1: P.l, x2: W - P.r, y1: y(0), y2: y(0), stroke: css('--axis'), 'stroke-width': 1 }));
  el.appendChild(svg);
}

/* -------- daily line -------- */
export function renderDaily(el, m0, m1) {
  el.textContent = '';
  const idx = [];
  DATA.daily.dates.forEach((d, i) => { const m = +d.slice(5, 7) - 1; if (m >= m0 && m <= m1) idx.push(i); });
  const dates = idx.map(i => DATA.daily.dates[i]), vals = idx.map(i => DATA.daily.counts[i]);
  const ma = movAvg(vals, 7);
  const W = 1180, H = 250, P = { l: 40, r: 14, t: 14, b: 24 };
  const svg = sEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': 'מגמה יומית' });
  const max = Math.max(...vals), tk = ticks(max), yMax = tk[tk.length - 1] || max;
  const x = i => P.l + (W - P.l - P.r) * (dates.length === 1 ? 0.5 : i / (dates.length - 1));
  const y = v => P.t + (H - P.t - P.b) * (1 - v / yMax);
  tk.forEach(v => {
    svg.appendChild(sEl('line', { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), stroke: css('--grid') }));
    const t = sEl('text', { x: P.l - 6, y: y(v) + 3.5, 'text-anchor': 'end', 'font-size': 10, fill: css('--muted') });
    t.textContent = fmt(v); svg.appendChild(t);
  });
  let last = '';
  dates.forEach((d, i) => {
    const m = d.slice(5, 7);
    if (m !== last) {
      last = m;
      const t = sEl('text', { x: x(i), y: H - 6, 'font-size': 10, fill: css('--muted') });
      t.textContent = MONTHS[+m - 1]; svg.appendChild(t);
    }
  });
  const path = arr => arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
  svg.appendChild(sEl('path', { d: path(vals) + `L${x(vals.length - 1)},${y(0)}L${x(0)},${y(0)}Z`, fill: css('--accent'), opacity: 0.07 }));
  svg.appendChild(sEl('path', { d: path(vals), fill: 'none', stroke: css('--axis'), 'stroke-width': 1.4, 'stroke-linejoin': 'round' }));
  svg.appendChild(sEl('path', { d: path(ma), fill: 'none', stroke: css('--accent'), 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const cross = sEl('line', { y1: P.t, y2: H - P.b, stroke: css('--axis'), 'stroke-width': 1, visibility: 'hidden' });
  const dot = sEl('circle', { r: 4.5, fill: css('--accent'), stroke: css('--surface'), 'stroke-width': 2, visibility: 'hidden' });
  svg.append(cross, dot);
  const hit = sEl('rect', { x: P.l, y: P.t, width: W - P.l - P.r, height: H - P.t - P.b, fill: 'transparent' });
  hit.addEventListener('pointermove', e => {
    const r = svg.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width * W;
    const i = Math.max(0, Math.min(dates.length - 1, Math.round((mx - P.l) / (W - P.l - P.r) * (dates.length - 1))));
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(vals[i])); dot.setAttribute('visibility', 'visible');
    const d = new Date(dates[i] + 'T00:00:00');
    tipShow(e.clientX, e.clientY, d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }), [
      { value: fmt(vals[i]), label: 'פניות', color: css('--axis') },
      { value: fmt1(ma[i]), label: 'ממוצע נע 7 ימים', color: css('--accent') }]);
  });
  hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tipHide(); });
  svg.appendChild(hit);
  el.appendChild(svg);
}

/* -------- resolution line -------- */
export function renderRes(el, m0, m1) {
  el.textContent = '';
  const med = DATA.resMonth.map(r => r.med);
  const W = 640, H = 230, P = { l: 38, r: 14, t: 18, b: 26 };
  const svg = sEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': 'חציון זמן טיפול לפי חודש' });
  const max = Math.max(...med), tk = ticks(max), yMax = tk[tk.length - 1] || max;
  const x = m => P.l + (W - P.l - P.r) * (m + 0.5) / 12, y = v => P.t + (H - P.t - P.b) * (1 - v / yMax);
  tk.forEach(v => {
    svg.appendChild(sEl('line', { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), stroke: css('--grid') }));
    const t = sEl('text', { x: P.l - 6, y: y(v) + 3.5, 'text-anchor': 'end', 'font-size': 10, fill: css('--muted') });
    t.textContent = fmt1(v); svg.appendChild(t);
  });
  svg.appendChild(sEl('path', {
    d: med.map((v, m) => (m ? 'L' : 'M') + x(m).toFixed(1) + ',' + y(v).toFixed(1)).join(''),
    fill: 'none', stroke: css('--accent'), 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  }));
  const maxI = med.indexOf(Math.max(...med));
  med.forEach((v, m) => {
    const inR = m >= m0 && m <= m1;
    const c = sEl('circle', { cx: x(m), cy: y(v), r: 4.5, fill: inR ? css('--accent') : css('--axis'), stroke: css('--surface'), 'stroke-width': 2 });
    const hit = sEl('circle', { cx: x(m), cy: y(v), r: 13, fill: 'transparent' });
    hit.addEventListener('pointermove', e => tipShow(e.clientX, e.clientY, MONTHS[m] + ' 2025', [
      { value: fmt1(v) + ' שע׳', label: 'חציון זמן טיפול', color: css('--accent') },
      { value: pctS(DATA.resMonth[m].w24), label: 'נסגרו בתוך 24 שע׳' },
      { value: fmt1(DATA.resMonth[m].p90 / 24) + ' ימים', label: 'אחוזון 90' }]));
    hit.addEventListener('pointerleave', tipHide);
    svg.append(c, hit);
    if (m === maxI) {
      const t = sEl('text', { x: x(m), y: y(v) - 9, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600, fill: css('--ink') });
      t.textContent = fmt1(v) + ' שע׳'; svg.appendChild(t);
    }
    const ml = sEl('text', { x: x(m), y: H - 8, 'text-anchor': 'middle', 'font-size': 9.5, fill: css('--muted') });
    ml.textContent = MONTHS[m].slice(0, 3) + '׳'; svg.appendChild(ml);
  });
  el.appendChild(svg);
}

/* -------- map engine (canvas + GovMap ITM tile basemap) -------- */

/* WGS84 -> Israel TM Grid (EPSG:2039); validated against pyproj (err < 2m). */
function itm(lat, lon) {
  const D = Math.PI / 180;
  const aW = 6378137, fW = 1 / 298.257223563, e2W = fW * (2 - fW);
  const la = lat * D, lo = lon * D, sla = Math.sin(la), cla = Math.cos(la);
  const Nw = aW / Math.sqrt(1 - e2W * sla * sla);
  const X = Nw * cla * Math.cos(lo), Y = Nw * cla * Math.sin(lo), Z = Nw * (1 - e2W) * sla;
  const sec = Math.PI / 648000;
  const tx = -24.0024, ty = -17.1032, tz = -17.8444;
  const rx = -0.33077 * sec, ry = -1.85269 * sec, rz = 1.66969 * sec;
  const sc = 1 + 5.4248e-6;
  const X1 = X - tx, Y1 = Y - ty, Z1 = Z - tz;
  const Xl = (X1 + rz * Y1 - ry * Z1) / sc;
  const Yl = (-rz * X1 + Y1 + rx * Z1) / sc;
  const Zl = (ry * X1 - rx * Y1 + Z1) / sc;
  const a = 6378137, f = 1 / 298.257222101, e2 = f * (2 - f);
  const p = Math.hypot(Xl, Yl);
  let phi = Math.atan2(Zl, p * (1 - e2)), prev = 0;
  for (let i = 0; i < 8 && Math.abs(phi - prev) > 1e-13; i++) {
    prev = phi;
    const Ng = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    phi = Math.atan2(Zl + e2 * Ng * Math.sin(phi), p);
  }
  const lam = Math.atan2(Yl, Xl);
  const lat0 = 31.73439361111111 * D, lon0 = 35.20451694444445 * D;
  const k0 = 1.0000067, x0 = 219529.584, y0 = 626907.39;
  const ep2 = e2 / (1 - e2);
  const sp = Math.sin(phi), cp = Math.cos(phi), tp = Math.tan(phi);
  const N = a / Math.sqrt(1 - e2 * sp * sp);
  const T = tp * tp, C = ep2 * cp * cp, A = cp * (lam - lon0);
  const M = m => a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * m
    - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * m)
    + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * m)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * m));
  const x = x0 + k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120);
  const y = y0 + k0 * (M(phi) - M(lat0) + N * tp * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24
    + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
  return [x, y];
}

/* GovMap ArcGIS tile cache scheme (EPSG:2039). */
const GOV_ORIGIN = { x: -5403700, y: 7116700 };
const GOV_LODS = [793.751587503175, 264.583862501058, 132.291931250529, 66.1459656252646,
  26.4583862501058, 13.2291931250529, 6.61459656252646, 2.64583862501058,
  1.32291931250529, 0.661459656252646, 0.330729828126323];
const GOV_LAYERS = {
  map: { code: 'B0B0MARS27052024', ext: 'png' },
  sat: { code: 'B0BZ1ORTO23', ext: 'jpg' },
};

function isDarkMode() {
  const m = document.documentElement.getAttribute('data-mode');
  if (m) return m === 'dark';
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

export function createMap(canvas, getState, onSelect) {
  const map = { cx: 0, cy: 0, res: 1, fitRes: 1, drag: null, hov: null, W: 0, H: 0, bubbles: [], fitted: false, raf: 0, alive: true };

  /* project all points to ITM once */
  const pts = new Map();
  DATA.streets.forEach(s => pts.set(s.name, itm(s.lat, s.lon)));
  const ext = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const grow = (x, y) => { if (x < ext.x0) ext.x0 = x; if (x > ext.x1) ext.x1 = x; if (y < ext.y0) ext.y0 = y; if (y > ext.y1) ext.y1 = y; };
  DATA.fabric.forEach(p => { const [x, y] = itm(p[0], p[1]); grow(x, y); });
  pts.forEach(([x, y]) => grow(x, y));

  function fit() {
    const pad = 40;
    map.res = Math.max((ext.x1 - ext.x0) / Math.max(map.W - 2 * pad, 100), (ext.y1 - ext.y0) / Math.max(map.H - 2 * pad, 100));
    map.cx = (ext.x0 + ext.x1) / 2; map.cy = (ext.y0 + ext.y1) / 2;
    map.fitRes = map.res;
  }
  const toScreen = (x, y) => [map.W / 2 + (x - map.cx) / map.res, map.H / 2 - (y - map.cy) / map.res];
  const fromScreen = (px, py) => [map.cx + (px - map.W / 2) * map.res, map.cy - (py - map.H / 2) * map.res];

  /* tile loader with small LRU cache */
  const tiles = new Map();
  function tileImg(layer, lod, row, col) {
    const key = `${layer.code}/${lod}/${row}/${col}`;
    let t = tiles.get(key);
    if (!t) {
      if (tiles.size > 400) tiles.delete(tiles.keys().next().value);
      const img = new Image();
      t = { img, ok: false };
      img.onload = () => { t.ok = true; scheduleDraw(); };
      img.src = `https://cdn.govmap.gov.il/${layer.code}/L${String(lod).padStart(2, '0')}/R${row.toString(16).padStart(8, '0')}/C${col.toString(16).padStart(8, '0')}.${layer.ext}`;
      tiles.set(key, t);
    }
    return t;
  }
  function scheduleDraw() {
    if (!map.alive) return;
    cancelAnimationFrame(map.raf);
    map.raf = requestAnimationFrame(() => draw());
  }

  function drawTiles(ctx) {
    const st = getState();
    const layer = GOV_LAYERS[st.basemap === 'sat' ? 'sat' : 'map'];
    let lod = 0;
    for (let i = 0; i < GOV_LODS.length; i++) if (GOV_LODS[i] >= map.res * 0.75) lod = i;
    const T = GOV_LODS[lod] * 256;
    const left = map.cx - map.W / 2 * map.res, right = map.cx + map.W / 2 * map.res;
    const top = map.cy + map.H / 2 * map.res, bottom = map.cy - map.H / 2 * map.res;
    const c0 = Math.max(0, Math.floor((left - GOV_ORIGIN.x) / T)), c1 = Math.floor((right - GOV_ORIGIN.x) / T);
    const r0 = Math.max(0, Math.floor((GOV_ORIGIN.y - top) / T)), r1 = Math.floor((GOV_ORIGIN.y - bottom) / T);
    if ((c1 - c0 + 1) * (r1 - r0 + 1) > 128) return;
    const sz = T / map.res + 0.5;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = tileImg(layer, lod, r, c);
      if (!t.ok) continue;
      const [sx, sy] = toScreen(GOV_ORIGIN.x + c * T, GOV_ORIGIN.y - r * T);
      ctx.drawImage(t.img, sx, sy, sz, sz);
    }
    if (isDarkMode()) { ctx.fillStyle = 'rgba(8,12,22,0.45)'; ctx.fillRect(0, 0, map.W, map.H); }
  }
  function mapData() {
    const { m0, m1 } = getState();
    const len = m1 - m0 + 1, hasPrev = m0 - len >= 0;
    const arr = DATA.streets.map(s => {
      const v = sumR(s.byMonth, m0, m1);
      const pv = hasPrev ? sumR(s.byMonth, m0 - len, m0 - 1) : null;
      return { s, v, pv };
    }).filter(x => x.v > 0);
    return { arr, hasPrev };
  }
  function draw() {
    if (!canvas.isConnected) return null;
    const st = getState();
    const dpr = devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    if (r.width === 0) return null;
    map.W = r.width; map.H = r.height;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!map.fitted) { fit(); map.fitted = true; }
    ctx.fillStyle = css('--surface');
    ctx.fillRect(0, 0, map.W, map.H);
    drawTiles(ctx);
    const md = mapData();
    const mx = Math.max(...md.arr.map(x => x.v), 1);
    map.bubbles = [];
    const surface = css('--surface');
    const zoomF = Math.min(map.fitRes / map.res, 1.6) ** 0.5;
    md.arr.sort((a, b) => b.v - a.v);
    md.arr.forEach(({ s, v, pv }) => {
      const [x, y] = toScreen(...pts.get(s.name));
      const rad = (3 + Math.sqrt(v / mx) * 24) * zoomF;
      let fill;
      if (st.mode === 'chg' && md.hasPrev) {
        const ch = pv > 0 ? (v - pv) / pv : (v > 0 ? 1 : 0);
        fill = divColor(Math.max(-1, Math.min(1, ch / 0.5 * 0.999)));
      } else fill = seqColor(0.15 + 0.85 * (v / mx));
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 7);
      ctx.fillStyle = fill; ctx.globalAlpha = 0.82; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 2; ctx.strokeStyle = surface; ctx.stroke();
      if (st.street === s.name || map.hov === s.name) {
        ctx.lineWidth = 2.5; ctx.strokeStyle = css('--ink'); ctx.stroke();
      }
      map.bubbles.push({ x, y, r: rad, s, v, pv });
    });
    ctx.font = '600 11px system-ui, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    md.arr.slice(0, 5).forEach(({ s, v }) => {
      const [x, y] = toScreen(...pts.get(s.name));
      const rad = (3 + Math.sqrt(v / mx) * 24) * zoomF;
      ctx.fillStyle = css('--ink');
      ctx.strokeStyle = surface; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeText(s.name, x, y - rad - 4); ctx.fillText(s.name, x, y - rad - 4);
    });
    return md;
  }
  function pick(mx, my) {
    let best = null, bd = 1e9;
    map.bubbles.forEach(b => {
      const d = Math.hypot(b.x - mx, b.y - my);
      if (d < Math.max(b.r + 6, 14) && d < bd) { bd = d; best = b; }
    });
    return best;
  }
  const onWheel = e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const f = e.deltaY < 0 ? 1 / 1.18 : 1.18;
    const [ix, iy] = fromScreen(mx, my);
    map.res = Math.max(GOV_LODS[GOV_LODS.length - 1] / 2, Math.min(map.fitRes * 1.7, map.res * f));
    const [jx, jy] = fromScreen(mx, my);
    map.cx += ix - jx; map.cy += iy - jy;
    draw();
  };
  const onDown = e => { map.drag = { x: e.clientX, y: e.clientY, cx: map.cx, cy: map.cy, moved: false }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; };
  const onMove = e => {
    const r = canvas.getBoundingClientRect();
    if (map.drag) {
      const dx = e.clientX - map.drag.x, dy = e.clientY - map.drag.y;
      if (Math.hypot(dx, dy) > 3) map.drag.moved = true;
      map.cx = map.drag.cx - dx * map.res; map.cy = map.drag.cy + dy * map.res; draw(); return;
    }
    const b = pick(e.clientX - r.left, e.clientY - r.top);
    const hov = b ? b.s.name : null;
    if (hov !== map.hov) { map.hov = hov; draw(); }
    canvas.style.cursor = b ? 'pointer' : 'grab';
    if (b) {
      const st = getState();
      const rows = [{ value: fmt(b.v), label: 'פניות בטווח', color: css('--accent') }];
      if (b.pv != null) rows.push({ value: fmt(b.pv), label: 'בתקופה הקודמת' });
      rows.push({ value: b.s.topics[0][0], label: 'נושא מוביל' });
      tipShow(e.clientX, e.clientY, b.s.name + ' · ' + (b.s.area || ''), rows);
    } else tipHide();
  };
  const onUp = e => {
    canvas.style.cursor = 'grab';
    if (map.drag && !map.drag.moved) {
      const r = canvas.getBoundingClientRect();
      const b = pick(e.clientX - r.left, e.clientY - r.top);
      onSelect(b ? b.s.name : null);
    }
    map.drag = null;
  };
  const onLeave = () => { if (map.hov) { map.hov = null; draw(); } tipHide(); };
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  const ro = new ResizeObserver(() => draw());
  ro.observe(canvas);
  return {
    draw,
    reset() { fit(); draw(); },
    destroy() {
      map.alive = false;
      cancelAnimationFrame(map.raf);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}
