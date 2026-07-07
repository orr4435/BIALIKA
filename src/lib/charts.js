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

/* -------- map engine (canvas) -------- */
export function createMap(canvas, getState, onSelect) {
  const map = { k: 1, tx: 0, ty: 0, drag: null, hov: null, W: 0, H: 0, proj: null, bubbles: [] };
  function mapProj() {
    const lats = DATA.fabric.map(p => p[0]), lons = DATA.fabric.map(p => p[1]);
    const la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lons), lo1 = Math.max(...lons);
    return { la0, la1, lo0, lo1, cosLat: Math.cos((la0 + la1) / 2 * Math.PI / 180) };
  }
  function toXY(lat, lon) {
    const p = map.proj, pad = 30;
    const w = map.W - 2 * pad, h = map.H - 2 * pad;
    const spanX = (p.lo1 - p.lo0) * p.cosLat, spanY = p.la1 - p.la0;
    const s = Math.min(w / spanX, h / spanY);
    const cx = map.W / 2 + ((lon - (p.lo0 + p.lo1) / 2) * p.cosLat) * s;
    const cy = map.H / 2 - (lat - (p.la0 + p.la1) / 2) * s;
    return [cx * map.k + map.tx, cy * map.k + map.ty];
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
    ctx.clearRect(0, 0, map.W, map.H);
    map.proj = map.proj || mapProj();
    ctx.fillStyle = css('--fabric');
    DATA.fabric.forEach(p => { const [x, y] = toXY(p[0], p[1]); ctx.fillRect(x - 1, y - 1, 2, 2); });
    const md = mapData();
    const mx = Math.max(...md.arr.map(x => x.v), 1);
    map.bubbles = [];
    const surface = css('--surface');
    md.arr.sort((a, b) => b.v - a.v);
    md.arr.forEach(({ s, v, pv }) => {
      const [x, y] = toXY(s.lat, s.lon);
      const rad = (3 + Math.sqrt(v / mx) * 24) * Math.min(map.k, 1.6) ** 0.5;
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
      const [x, y] = toXY(s.lat, s.lon);
      const rad = (3 + Math.sqrt(v / mx) * 24) * Math.min(map.k, 1.6) ** 0.5;
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
    const f = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    const nk = Math.max(0.6, Math.min(8, map.k * f)); const rf = nk / map.k;
    map.tx = mx - (mx - map.tx) * rf; map.ty = my - (my - map.ty) * rf; map.k = nk;
    draw();
  };
  const onDown = e => { map.drag = { x: e.clientX, y: e.clientY, tx: map.tx, ty: map.ty, moved: false }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; };
  const onMove = e => {
    const r = canvas.getBoundingClientRect();
    if (map.drag) {
      const dx = e.clientX - map.drag.x, dy = e.clientY - map.drag.y;
      if (Math.hypot(dx, dy) > 3) map.drag.moved = true;
      map.tx = map.drag.tx + dx; map.ty = map.drag.ty + dy; draw(); return;
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
    reset() { map.k = 1; map.tx = 0; map.ty = 0; draw(); },
    destroy() {
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}
