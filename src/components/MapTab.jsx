import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DATA, MONTHS, fmt, fmt1, hoursFmt, sumR, rangeLabel, seqColor, divColor, tipShow, tipHide,
} from '../lib/helpers.js';
import { createMap, sEl } from '../lib/charts.js';

function Spark({ byMonth, m0, m1 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.textContent = '';
    const W = 260, H = 64, mx = Math.max(...byMonth, 1);
    const svg = sEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg' });
    byMonth.forEach((val, m) => {
      const bw = W / 12 - 4, x = m * (W / 12) + 2, bh = Math.max(2, val / mx * (H - 16));
      const inR = m >= m0 && m <= m1;
      const rect = sEl('rect', { x, y: H - 14 - bh, width: bw, height: bh, rx: 2, fill: inR ? getComputedStyle(document.documentElement).getPropertyValue('--accent') : getComputedStyle(document.documentElement).getPropertyValue('--grid') });
      rect.addEventListener('pointermove', e => tipShow(e.clientX, e.clientY, MONTHS[m], [{ value: fmt(val), label: 'פניות' }]));
      rect.addEventListener('pointerleave', tipHide);
      svg.appendChild(rect);
    });
    el.appendChild(svg);
  });
  return <div ref={ref} />;
}

export default function MapTab({ m0, m1, street, setStreet, themeKey }) {
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const stateRef = useRef({ m0, m1, mode: 'vol', street });
  const [mode, setMode] = useState('vol');
  const [notice, setNotice] = useState('');

  stateRef.current = { m0, m1, mode, street };

  useEffect(() => {
    const map = createMap(canvasRef.current, () => stateRef.current, name => setStreet(name));
    mapRef.current = map;
    map.draw();
    return () => map.destroy();
  }, []); // eslint-disable-line
  useEffect(() => { mapRef.current && mapRef.current.draw(); }, [m0, m1, mode, street, themeKey]);

  const md = useMemo(() => {
    const arr = DATA.streets.map(s => ({ s, v: sumR(s.byMonth, m0, m1) })).filter(x => x.v > 0);
    return { max: Math.max(...arr.map(x => x.v), 1) };
  }, [m0, m1]);

  const s = DATA.streets.find(x => x.name === street);
  const v = s ? sumR(s.byMonth, m0, m1) : 0;

  const tryChangeMode = () => {
    if (m0 === 0) {
      setNotice('להצגת שינוי בחרו טווח שאינו מתחיל בינואר — נדרשת תקופה קודמת באותו אורך (למשל רבעון 2 ואילך).');
      setTimeout(() => setNotice(''), 4500);
      return;
    }
    setMode('chg');
  };

  return (
    <section className="tabpage">
      <div className="map-grid">
        <div className="map-card">
          <canvas id="map-canvas" ref={canvasRef} />
          <div className="map-top">
            <button className={'chip' + (mode === 'vol' ? ' on' : '')} onClick={() => setMode('vol')}>היקף פניות</button>
            <button className={'chip' + (mode === 'chg' ? ' on' : '')} onClick={tryChangeMode}>שינוי מול תקופה קודמת</button>
            <input list="street-list" placeholder="חיפוש רחוב…" aria-label="חיפוש רחוב"
              onChange={e => {
                const st = DATA.streets.find(x => x.name === e.target.value.trim());
                if (st) setStreet(st.name);
              }} />
            <datalist id="street-list">
              {DATA.streets.map(st => <option key={st.name} value={st.name} />)}
            </datalist>
            <button className="chip" onClick={() => mapRef.current && mapRef.current.reset()}>איפוס תצוגה</button>
          </div>
          <div className="map-legend">
            {notice ? <div style={{ maxWidth: 190 }}>{notice}</div> : mode === 'vol' ? (
              <>
                <div>פניות לרחוב · {rangeLabel(m0, m1)}</div>
                <div className="ramp" style={{ background: `linear-gradient(90deg, ${seqColor(0.05)}, ${seqColor(0.5)}, ${seqColor(1)})` }} />
                <div className="rl2"><span>0</span><span>{fmt(Math.round(md.max / 2))}</span><span>{fmt(md.max)}</span></div>
              </>
            ) : (
              <>
                <div>שינוי מול התקופה הקודמת</div>
                <div className="ramp" style={{ background: `linear-gradient(90deg, ${divColor(-1)}, ${divColor(0)}, ${divColor(1)})` }} />
                <div className="rl2"><span>-50%</span><span>0</span><span>+50%</span></div>
              </>
            )}
            <div>גודל העיגול = כמות פניות · לחיצה לפרטים</div>
          </div>
        </div>
        <div className="spanel">
          {!s ? (
            <div className="empty">בחרו רחוב במפה (או בחיפוש) כדי לראות פירוט: נפח פניות, מגמה חודשית, נושאים מובילים וזמן טיפול.</div>
          ) : (
            <>
              <h3>{s.name}</h3>
              <div className="meta">אזור: {s.area || '—'} · {rangeLabel(m0, m1)} 2025</div>
              <div className="big">{fmt(v)}<small> פניות בטווח (מתוך {fmt(s.total)} בכל השנה)</small></div>
              <h4>מגמה חודשית · 2025</h4>
              <Spark byMonth={s.byMonth} m0={m0} m1={m1} />
              <h4>נושאים מובילים (כל השנה)</h4>
              <div className="blist">
                {s.topics.map(t => {
                  const mx = s.topics[0][1];
                  return (
                    <div className="brow" key={t[0]}>
                      <div className="bl" title={t[0]}>{t[0]}</div>
                      <div className="track"><div className="fill" style={{ width: (t[1] / mx * 100) + '%' }} /></div>
                      <div className="bv">{fmt(t[1])}</div>
                    </div>
                  );
                })}
              </div>
              <h4>עוד</h4>
              <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.55 }}>
                אגף מוביל: {s.agaf[0][0]} ({fmt(s.agaf[0][1])} פניות) · חציון זמן טיפול ברחוב: {s.med != null ? hoursFmt(s.med) : '—'}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
