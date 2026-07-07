import React, { useMemo } from 'react';
import {
  DATA, MONTHS, DOWS, fmt, fmt1, pctS, sumR, daysR, rangeLabel, totalR, statusR,
  wMed, wW24, topByRange, heatMatrix, seqColor, catColor, tipShow, tipHide,
} from '../lib/helpers.js';
import { renderMonth, renderDaily, renderRes } from '../lib/charts.js';
import BarList from './BarList.jsx';
import SvgChart from './SvgChart.jsx';

function Kpi({ label, value, suffix, delta, color }) {
  return (
    <div className="kpi" style={{ '--kpi-c': color }}>
      <div className="l">{label}</div>
      <div className="v">{value}{suffix && <small> {suffix}</small>}</div>
      {delta && <div className="d">{delta}</div>}
    </div>
  );
}
function Delta({ cur, prev, upIsBad, vsLabel }) {
  if (prev == null || prev === 0) return null;
  const ch = (cur - prev) / prev * 100;
  if (Math.abs(ch) < 0.05) return <>ללא שינוי מול {vsLabel}</>;
  const good = (ch >= 0) !== upIsBad;
  return (
    <>
      <span className={good ? 'down' : 'up'}>{ch >= 0 ? '▲ ' : '▼ '}{fmt1(Math.abs(ch))}%</span>
      {' '}מול {vsLabel}
    </>
  );
}

function HeatMap({ m0, m1 }) {
  const M = useMemo(() => heatMatrix(m0, m1), [m0, m1]);
  const max = Math.max(...M.flat());
  return (
    <div className="hm">
      {M.map((row, d) => (
        <React.Fragment key={d}>
          <div className="dl">{DOWS[d]}</div>
          <div className="row">
            {row.map((v, h) => (
              <div
                key={h} className="c" style={{ background: seqColor(v / max) }}
                onPointerMove={e => tipShow(e.clientX, e.clientY,
                  `יום ${DOWS[d]} · ${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59`,
                  [{ value: fmt(v), label: 'פניות בטווח' }])}
                onPointerLeave={tipHide}
              />
            ))}
          </div>
        </React.Fragment>
      ))}
      <div />
      <div className="hx">{Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 4 === 0 ? h : ''}</span>)}</div>
    </div>
  );
}

function Insights({ m0, m1 }) {
  const items = useMemo(() => {
    const total = totalR(m0, m1), days = daysR(m0, m1);
    const len = m1 - m0 + 1, hasPrev = m0 - len >= 0;
    const out = [];
    const M = heatMatrix(m0, m1);
    const dTot = M.map(r => r.reduce((a, b) => a + b, 0));
    let ph = 0, pd = 0, pv = -1;
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) if (M[d][h] > pv) { pv = M[d][h]; pd = d; ph = h; }
    const bd = dTot.indexOf(Math.max(...dTot));
    out.push(<>שיא העומס: <strong>יום {DOWS[bd]}</strong> ({pctS(dTot[bd] / total * 100)} מהפניות), עם שיא שעתי סביב <strong>{String(ph).padStart(2, '0')}:00</strong> ביום {DOWS[pd]}. תגבור המוקד בחלון הזה יקצר זמני מענה.</>);
    const stTop = DATA.streets.map(s => ({ s, v: sumR(s.byMonth, m0, m1) })).sort((a, b) => b.v - a.v)[0];
    if (stTop && stTop.v > 0) out.push(<>הרחוב העמוס ביותר בטווח: <strong>{stTop.s.name}</strong> עם <strong>{fmt(stTop.v)} פניות</strong> ({pctS(stTop.v / total * 100)} מכלל העיר). הנושא המוביל בו: {stTop.s.topics[0][0]}.</>);
    if (hasPrev) {
      const pDays = daysR(m0 - len, m0 - 1);
      let best = null;
      DATA.topic.names.forEach((name, i) => {
        if (name === 'אחר') return;
        const a = sumR(DATA.topic.byMonth[i], m0, m1) / days, b = sumR(DATA.topic.byMonth[i], m0 - len, m0 - 1) / pDays;
        if (a + b < 0.15) return;
        const ch = b > 0 ? (a - b) / b : (a > 0 ? 9 : 0);
        if (!best || ch > best.ch) best = { name, ch, a, b };
      });
      if (best && best.ch > 0.15) out.push(<>הנושא שעלה הכי חד מול התקופה הקודמת: <strong>{best.name}</strong> — מ-{fmt1(best.b)} ל-<strong>{fmt1(best.a)} פניות ליום</strong> (עלייה של {pctS(best.ch * 100)}).</>);
    }
    const med = wMed(m0, m1), yearMed = wMed(0, 11);
    if (med != null && yearMed != null) {
      const diff = (med - yearMed) / yearMed * 100;
      if (Math.abs(diff) >= 8) out.push(<>חציון זמן הטיפול בטווח (<strong>{fmt1(med)} שע׳</strong>) {diff > 0 ? 'גבוה' : 'נמוך'} ב-{pctS(Math.abs(diff))} מהממוצע השנתי ({fmt1(yearMed)} שע׳).</>);
      else out.push(<>זמני הטיפול יציבים: חציון של <strong>{fmt1(med)} שעות</strong> בטווח, קרוב לרמה השנתית ({fmt1(yearMed)} שע׳). {pctS(wW24(m0, m1))} מהפניות נסגרות בתוך יממה.</>);
    }
    const agTop = topByRange(DATA.agaf, m0, m1, 1)[0];
    out.push(<><strong>{agTop.label}</strong> מרכז <strong>{pctS(agTop.value / total * 100)}</strong> מהפניות בטווח — הנושאים הבולטים בו: פינוי גזם וגרוטאות, פיקוח ושיטור עירוני.</>);
    return out;
  }, [m0, m1]);
  return (
    <div className="insights">
      {items.map((it, i) => (
        <div className="ins" key={i} style={{ '--ins-c': catColor(i) }}>
          <span className="dot" /><p>{it}</p>
        </div>
      ))}
    </div>
  );
}

export default function Overview({ m0, m1, themeKey }) {
  const total = totalR(m0, m1), days = daysR(m0, m1);
  const treated = statusR('טופל', m0, m1);
  const med = wMed(m0, m1), w24 = wW24(m0, m1);
  const len = m1 - m0 + 1, hasPrev = m0 - len >= 0;
  const pTotal = hasPrev ? totalR(m0 - len, m0 - 1) : null;
  const pDays = hasPrev ? daysR(m0 - len, m0 - 1) : null;
  const vsLabel = hasPrev ? rangeLabel(m0 - len, m0 - 1) : '';
  const histT = DATA.resHist.counts.reduce((a, b) => a + b, 0);
  return (
    <section className="tabpage">
      <div className="kpis">
        <Kpi label='סה"כ פניות בטווח' value={fmt(total)} color={catColor(0)}
          delta={hasPrev && <Delta cur={total / days} prev={pTotal / pDays} upIsBad vsLabel={vsLabel} />} />
        <Kpi label="פניות ליום בממוצע" value={fmt1(total / days)} color={catColor(1)} />
        <Kpi label='שיעור "טופל"' value={pctS(treated / total * 100)} color={catColor(2)} />
        <Kpi label="חציון זמן טיפול" value={med != null ? fmt1(med) : '—'} suffix="שעות" color={catColor(3)} />
        <Kpi label="נסגרו בתוך 24 שעות" value={w24 != null ? pctS(w24) : '—'} color={catColor(4)} />
      </div>
      <Insights m0={m0} m1={m1} />
      <div className="grid">
        <div className="card w12">
          <h3>מגמה יומית</h3>
          <div className="note">{rangeLabel(m0, m1)} 2025 · {fmt(total)} פניות</div>
          <div className="legend">
            <span className="k"><span className="ln" style={{ background: 'var(--axis)' }} />פניות ביום</span>
            <span className="k"><span className="ln" style={{ background: 'var(--accent)' }} />ממוצע נע 7 ימים</span>
          </div>
          <SvgChart render={el => renderDaily(el, m0, m1)} deps={[m0, m1, themeKey]} />
        </div>
        <div className="card">
          <h3>פניות לפי חודש</h3>
          <div className="note">כל 2025 · חודשים מחוץ לטווח הנבחר מוצגים באפור</div>
          <SvgChart render={el => renderMonth(el, m0, m1)} deps={[m0, m1, themeKey]} />
        </div>
        <div className="card">
          <h3>עומס לפי יום ושעה</h3>
          <div className="note">כמות פניות שנפתחו · {rangeLabel(m0, m1)}</div>
          <HeatMap m0={m0} m1={m1} key={themeKey} />
        </div>
        <div className="card">
          <h3>פניות לפי אגף</h3>
          <div className="note">{rangeLabel(m0, m1)} · צבע קבוע לכל אגף</div>
          <BarList items={topByRange(DATA.agaf, m0, m1, 9).map(x => ({ ...x, sub: pctS(x.value / total * 100) }))}
            colors={i => catColor(i)} />
        </div>
        <div className="card">
          <h3>פניות לפי אזור</h3>
          <div className="note">לפי סיווג האזור בפנייה</div>
          <BarList items={topByRange(DATA.area, m0, m1, 9).map(x => ({ ...x, sub: pctS(x.value / total * 100) }))} />
        </div>
        <div className="card">
          <h3>נושאים מובילים</h3>
          <div className="note">12 הנושאים השכיחים בטווח הנבחר</div>
          <BarList items={topByRange(DATA.topic, m0, m1, 12, true)} />
        </div>
        <div className="card">
          <h3>מחלקות מובילות</h3>
          <div className="note">10 המחלקות העמוסות בטווח הנבחר</div>
          <BarList items={topByRange(DATA.mahlaka, m0, m1, 10, true)} />
        </div>
        <div className="card">
          <h3>זמן טיפול — חציון לפי חודש</h3>
          <div className="note">שעות מפתיחת הפנייה ועד סגירתה · כל 2025</div>
          <SvgChart render={el => renderRes(el, m0, m1)} deps={[m0, m1, themeKey]} />
        </div>
        <div className="card">
          <h3>סטטוס ותוצאה</h3>
          <div className="note">תוצאת הטיפול בפניות שנפתחו בטווח</div>
          <BarList items={topByRange(DATA.status, m0, m1, 8).map(x => ({ ...x, sub: pctS(x.value / total * 100) }))} />
          <h3 style={{ marginTop: 16 }}>התפלגות זמן טיפול</h3>
          <div className="note">כל 2025 · פניות שנסגרו</div>
          <BarList items={DATA.resHist.labels.map((l, i) => ({ label: l, value: DATA.resHist.counts[i], sub: pctS(DATA.resHist.counts[i] / histT * 100) }))} />
        </div>
      </div>
    </section>
  );
}
