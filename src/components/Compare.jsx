import React, { useMemo } from 'react';
import {
  DATA, MONTHS, fmt, fmt1, pctS, sumR, daysR, rangeLabel, totalR, statusR, wMed, wW24,
  tipShow, tipHide,
} from '../lib/helpers.js';

function Tile({ label, vA, vB, fmtF, upIsBad, suffix, lB }) {
  let delta = null;
  if (vB) {
    const ch = (vA - vB) / vB * 100;
    if (Math.abs(ch) < 0.05) delta = <>ללא שינוי מול {lB}</>;
    else delta = (
      <>
        <span className={(ch >= 0) === upIsBad ? 'up' : 'down'}>{ch >= 0 ? '▲ ' : '▼ '}{fmt1(Math.abs(ch))}%</span>
        {' '}מול {lB} ({fmtF(vB)}{suffix ? ' ' + suffix : ''})
      </>
    );
  }
  return (
    <div className="kpi">
      <div className="l">{label}</div>
      <div className="v">{fmtF(vA)}{suffix && <small> {suffix}</small>}</div>
      <div className="d">{delta}</div>
    </div>
  );
}

function PairChart({ dim, a, b, dA, dB, lA, lB, n }) {
  const items = dim.names.map((name, i) => ({
    name,
    a: sumR(dim.byMonth[i], a[0], a[1]) / dA,
    b: sumR(dim.byMonth[i], b[0], b[1]) / dB,
  })).filter(x => x.name !== 'אחר').sort((x, y) => y.a - x.a).slice(0, n);
  const max = Math.max(...items.flatMap(x => [x.a, x.b]), 0.001);
  return (
    <div className="gpair">
      {items.map(it => (
        <div className="gp" key={it.name}>
          <div className="gl" title={it.name}>{it.name}</div>
          <div className="bars">
            {[[it.a, 'var(--accent)', lA], [it.b, 'var(--series2)', lB]].map(([v, c, pl], k) => (
              <div className="pb" key={k}
                onPointerMove={e => tipShow(e.clientX, e.clientY, it.name, [{ value: fmt1(v) + ' ליום', label: pl, color: c.startsWith('var') ? getComputedStyle(document.documentElement).getPropertyValue(c.slice(4, -1)) : c }])}
                onPointerLeave={tipHide}>
                <div className="f" style={{ width: (v / max * 88) + '%', background: c }} />
                <span className="pv">{fmt1(v)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Compare({ cmp, setCmp }) {
  const { a0, a1, b0, b1 } = cmp;
  const a = [a0, a1], b = [b0, b1];
  const dA = daysR(a0, a1), dB = daysR(b0, b1);
  const tA = totalR(a0, a1), tB = totalR(b0, b1);
  const lA = rangeLabel(a0, a1), lB = rangeLabel(b0, b1);

  const movers = useMemo(() => {
    const items = [];
    DATA.topic.names.forEach((name, i) => {
      if (name === 'אחר') return;
      const A = sumR(DATA.topic.byMonth[i], a0, a1), B = sumR(DATA.topic.byMonth[i], b0, b1);
      if (A + B < 30) return;
      const ra = A / dA, rb = B / dB;
      const ch = rb > 0 ? (ra - rb) / rb * 100 : (ra > 0 ? 999 : 0);
      items.push({ name, A, B, ra, rb, ch });
    });
    const ups = items.filter(x => x.ch > 0).sort((x, y) => y.ch - x.ch).slice(0, 7);
    const downs = items.filter(x => x.ch < 0).sort((x, y) => x.ch - y.ch).slice(0, 7);
    return [...ups, ...downs.reverse()];
  }, [a0, a1, b0, b1]); // eslint-disable-line
  const maxAbs = Math.max(...movers.map(x => Math.min(Math.abs(x.ch), 150)), 1);

  const sel = (key, val) => {
    const next = { ...cmp, [key]: +val };
    if (next.a1 < next.a0) next.a1 = next.a0;
    if (next.b1 < next.b0) next.b1 = next.b0;
    setCmp(next);
  };
  const monthSel = key => (
    <select value={cmp[key]} onChange={e => sel(key, e.target.value)} aria-label={key}>
      {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
    </select>
  );

  return (
    <section className="tabpage">
      <div className="cmp-controls">
        <div className="grp">
          <div className="t"><span className="sw" style={{ background: 'var(--accent)' }} />תקופה א׳</div>
          <div className="sels">{monthSel('a0')}<span>עד</span>{monthSel('a1')}</div>
        </div>
        <div className="grp">
          <div className="t"><span className="sw" style={{ background: 'var(--series2)' }} />תקופה ב׳ (בסיס להשוואה)</div>
          <div className="sels">{monthSel('b0')}<span>עד</span>{monthSel('b1')}</div>
        </div>
        <div className="grp">
          <div className="t">קיצורי דרך</div>
          <div className="sels">
            <button className="chip" onClick={() => setCmp({ a0: 11, a1: 11, b0: 10, b1: 10 })}>דצמבר מול נובמבר</button>
            <button className="chip" onClick={() => setCmp({ a0: 9, a1: 11, b0: 6, b1: 8 })}>רבעון 4 מול רבעון 3</button>
            <button className="chip" onClick={() => setCmp({ a0: 6, a1: 11, b0: 0, b1: 5 })}>מחצית ב׳ מול א׳</button>
          </div>
        </div>
      </div>
      <div className="kpis">
        <Tile label={'פניות ליום · ' + lA} vA={tA / dA} vB={tB / dB} fmtF={fmt1} upIsBad lB={lB} />
        <Tile label={'סה"כ פניות · ' + lA} vA={tA} vB={tB} fmtF={fmt} upIsBad lB={lB} />
        <Tile label='שיעור "טופל"' vA={statusR('טופל', a0, a1) / tA * 100} vB={statusR('טופל', b0, b1) / tB * 100} fmtF={pctS} upIsBad={false} lB={lB} />
        <Tile label="חציון זמן טיפול" vA={wMed(a0, a1)} vB={wMed(b0, b1)} fmtF={fmt1} upIsBad suffix="שעות" lB={lB} />
        <Tile label="נסגרו בתוך 24 שע׳" vA={wW24(a0, a1)} vB={wW24(b0, b1)} fmtF={pctS} upIsBad={false} lB={lB} />
      </div>
      <div className="grid">
        <div className="card">
          <h3>השוואה לפי אגף</h3>
          <div className="note">ממוצע פניות ליום — מנרמל תקופות באורך שונה</div>
          <div className="legend">
            <span className="k"><span className="sw" style={{ background: 'var(--accent)' }} />{lA}</span>
            <span className="k"><span className="sw" style={{ background: 'var(--series2)' }} />{lB}</span>
          </div>
          <PairChart dim={DATA.agaf} a={a} b={b} dA={dA} dB={dB} lA={lA} lB={lB} n={8} />
        </div>
        <div className="card">
          <h3>השוואה לפי אזור</h3>
          <div className="note">ממוצע פניות ליום</div>
          <div className="legend">
            <span className="k"><span className="sw" style={{ background: 'var(--accent)' }} />{lA}</span>
            <span className="k"><span className="sw" style={{ background: 'var(--series2)' }} />{lB}</span>
          </div>
          <PairChart dim={DATA.area} a={a} b={b} dA={dA} dB={dB} lA={lA} lB={lB} n={9} />
        </div>
        <div className="card w12">
          <h3>נושאים שעלו ושירדו</h3>
          <div className="note">שינוי בפניות ליום, תקופה א׳ מול ב׳ · נושאים עם 30 פניות ומעלה בשתי התקופות יחד · אדום = עלייה בפניות, כחול = ירידה</div>
          <div className="dvg">
            {movers.map(it => {
              const w = Math.min(Math.abs(it.ch), 150) / maxAbs * 49;
              return (
                <div className="r" key={it.name}
                  onPointerMove={e => tipShow(e.clientX, e.clientY, it.name, [
                    { value: fmt1(it.ra) + ' ליום (' + fmt(it.A) + ')', label: lA },
                    { value: fmt1(it.rb) + ' ליום (' + fmt(it.B) + ')', label: lB }])}
                  onPointerLeave={tipHide}>
                  <div className="rl" title={it.name}>{it.name}</div>
                  <div className="ax">
                    <div className="bar" style={it.ch > 0
                      ? { left: '50%', width: w + '%', background: 'var(--neg)' }
                      : { right: '50%', width: w + '%', background: 'var(--dec)' }} />
                  </div>
                  <div className="rv" style={{ color: it.ch > 0 ? 'var(--neg)' : 'var(--dec)' }}>
                    {(it.ch > 0 ? '‎+' : '‎−') + fmt1(Math.abs(it.ch)) + '%'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
