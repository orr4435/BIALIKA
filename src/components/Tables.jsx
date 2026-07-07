import React, { useMemo, useState } from 'react';
import {
  DATA, fmt, fmt1, pctS, hoursFmt, sumR, rangeLabel, totalR,
} from '../lib/helpers.js';

export default function Tables({ m0, m1 }) {
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState(-1);
  const [q, setQ] = useState('');
  const total = totalR(m0, m1);

  const rows = useMemo(() => {
    let r = DATA.streets.map(s => ({
      name: s.name, area: s.area, total: sumR(s.byMonth, m0, m1),
      med: s.med, top: s.topics[0] ? s.topics[0][0] : '',
    }));
    if (q) r = r.filter(x => x.name.includes(q) || x.area.includes(q));
    r.sort((a, b) => {
      const va = a[sortKey] == null ? -1 : a[sortKey], vb = b[sortKey] == null ? -1 : b[sortKey];
      return (typeof va === 'string' ? va.localeCompare(vb, 'he') : va - vb) * sortDir;
    });
    return r;
  }, [m0, m1, q, sortKey, sortDir]);

  const cols = [
    ['name', 'רחוב', 0], ['area', 'אזור', 0], ['total', 'פניות בטווח', 1],
    ['med', 'חציון טיפול (שע׳)', 1], ['top', 'נושא מוביל', 0],
  ];
  const clickSort = (k, num) => {
    if (sortKey === k) setSortDir(-sortDir);
    else { setSortKey(k); setSortDir(num ? -1 : 1); }
  };

  return (
    <section className="tabpage">
      <div className="grid">
        <div className="card w12">
          <h3>רחובות</h3>
          <div className="note">ממוין לפי כמות פניות · {rangeLabel(m0, m1)} 2025 · לחיצה על כותרת ממיינת</div>
          <div className="tbl-tools">
            <input placeholder="סינון לפי שם רחוב או אזור…" aria-label="סינון רחובות" value={q} onChange={e => setQ(e.target.value.trim())} />
          </div>
          <div className="twrap">
            <table className="kbt">
              <thead>
                <tr>
                  {cols.map(([k, l, num]) => (
                    <th key={k} className={num ? 'num' : ''} onClick={() => clickSort(k, num)}>
                      {l}{sortKey === k && <span className="arr">{sortDir < 0 ? ' ▼' : ' ▲'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.name}>
                    <td>{r.name}</td><td>{r.area}</td>
                    <td className="num">{fmt(r.total)}</td>
                    <td className="num">{r.med != null ? fmt1(r.med) : '—'}</td>
                    <td>{r.top}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>אגפים</h3>
          <div className="note">בטווח הנבחר · חציון זמן טיפול מחושב על כל 2025</div>
          <div className="twrap">
            <table className="kbt">
              <thead>
                <tr>{['אגף', 'פניות', '% מהעיר', 'חציון טיפול', 'בתוך 24 שע׳'].map((l, i) => <th key={l} className={i ? 'num' : ''} style={{ cursor: 'default' }}>{l}</th>)}</tr>
              </thead>
              <tbody>
                {DATA.agaf.names.map((name, i) => {
                  const v = sumR(DATA.agaf.byMonth[i], m0, m1);
                  const ra = DATA.resAgaf.find(x => x.agaf === name);
                  return (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className="num">{fmt(v)}</td>
                      <td className="num">{pctS(v / total * 100)}</td>
                      <td className="num">{ra ? hoursFmt(ra.med) : '—'}</td>
                      <td className="num">{ra ? pctS(ra.w24) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>מטפלים מובילים</h3>
          <div className="note">כל 2025 · 15 המטפלים עם הכי הרבה פניות</div>
          <div className="twrap">
            <table className="kbt">
              <thead>
                <tr>{['מטפל', 'פניות', 'חציון טיפול'].map((l, i) => <th key={l} className={i ? 'num' : ''} style={{ cursor: 'default' }}>{l}</th>)}</tr>
              </thead>
              <tbody>
                {DATA.handlers.map(h => (
                  <tr key={h.name}>
                    <td>{h.name}</td>
                    <td className="num">{fmt(h.n)}</td>
                    <td className="num">{h.med != null ? hoursFmt(h.med) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
