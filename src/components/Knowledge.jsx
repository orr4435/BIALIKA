import React, { useMemo, useState } from 'react';
import BarList from './BarList.jsx';
import {
  allEntries, search, forecast,
  DOWS, MONTHS, SHIFTS, SHIFT_ICONS, META,
  fmt, fmt1, pctS,
} from '../lib/knowledge.js';

const SUBTABS = [
  ['faq', 'שאלות נפוצות'],
  ['ask', 'שאלה למוקדן'],
  ['shift', 'סיכום משמרת ותקופה'],
];
const DEFAULT_ASKS = [
  'לא פינו לי את הפח', 'רעש מעבודות', 'עמוד תאורה כבוי', 'סתימת ביוב',
  'דוח חניה', 'תאורה', 'כלב משוטט', 'גזם לפינוי',
];

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function StatChips({ e }) {
  return (
    <div className="kc-chips">
      <span className="kc-chip">{fmt(e.count)} פניות ב-2025 ({e.shareText.toFixed(1)}%)</span>
      {e.departments[0] && <span className="kc-chip">מטפל: {e.departments[0][0]}</span>}
      {e.medianResHours != null && <span className="kc-chip">חציון טיפול: {fmt1(e.medianResHours)} שע׳</span>}
      {e.within24hPct != null && <span className="kc-chip">{pctS(e.within24hPct)} תוך 24 שע׳</span>}
      <span className="kc-chip muted">שיא: יום {e.peakDow} · {e.peakMonth} · {e.peakShift}</span>
    </div>
  );
}

function EntryCard({ e, open, onToggle }) {
  return (
    <div className={'kc-entry' + (open ? ' on' : '')}>
      <button className="kc-entry-head" onClick={onToggle}>
        <span className="kc-rank">#{e.rank}</span>
        <span className="kc-title">
          <b>{e.name}</b>
          {e.question && <span className="kc-q">{e.question}</span>}
        </span>
        <span className="kc-chev">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="kc-entry-body">
          <StatChips e={e} />
          {e.guidance.length > 0 ? (
            <ul className="kc-guide">
              {e.guidance.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          ) : (
            <div className="kc-empty">אין עדיין הנחיה מפורטת לנושא זה — הנתונים הכמותיים בלבד זמינים למעלה.</div>
          )}
          {e.statuses && e.statuses.length > 0 && (
            <div className="kc-status-row">
              <span className="lbl">התפלגות סטטוס:</span>
              {e.statuses.map(([s, p]) => <span key={s} className="kc-chip sm">{s} {p}%</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FaqTab() {
  const [q, setQ] = useState('');
  const [openName, setOpenName] = useState(null);
  const list = useMemo(() => {
    if (q.trim().length >= 2) return search(q, 30);
    return allEntries().slice(0, 60);
  }, [q]);

  return (
    <div>
      <div className="tbl-tools">
        <input
          placeholder="סינון לפי נושא, מילת מפתח… למשל: גזם, רעש, ביוב"
          aria-label="חיפוש בשאלות נפוצות"
          value={q} onChange={e => setQ(e.target.value)}
        />
        <span className="note" style={{ margin: 0 }}>
          {q.trim().length >= 2 ? `${list.length} תוצאות` : `50 הנושאים המובילים — ${META.total.toLocaleString('he-IL')} פניות סה"כ, מחפשים? הקלידו לפחות 2 תווים`}
        </span>
      </div>
      <div className="kc-list">
        {list.map(e => (
          <EntryCard key={e.name} e={e} open={openName === e.name} onToggle={() => setOpenName(openName === e.name ? null : e.name)} />
        ))}
        {list.length === 0 && <div className="kc-empty">לא נמצאו נושאים תואמים.</div>}
      </div>
    </div>
  );
}

function AskTab() {
  const [text, setText] = useState('');
  const [asked, setAsked] = useState(null); // last submitted query
  const [openName, setOpenName] = useState(null);
  const results = useMemo(() => (asked ? search(asked, 5) : []), [asked]);
  const effectiveOpen = openName != null ? openName : (results[0] && results[0].name);

  const submit = e => {
    e && e.preventDefault();
    if (text.trim()) { setAsked(text.trim()); setOpenName(null); }
  };

  return (
    <div>
      <div className="card w12" style={{ marginBottom: 12 }}>
        <h3>שאלו את מרכז הידע</h3>
        <div className="note">הקלידו את מה שהתושב אומר, במילים שלו — המערכת תנסה למצוא את הנושא המתאים ואת ההנחיה למוקדן.</div>
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
            placeholder="למשל: לא פינו לי את הפח כבר שבוע"
            value={text} onChange={e => setText(e.target.value)} autoFocus
          />
          <button type="submit" className="chip on">חפש תשובה</button>
        </form>
        <div className="chat-chips" style={{ padding: '10px 0 0' }}>
          {DEFAULT_ASKS.map(c => (
            <button key={c} className="chat-chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
              onClick={() => { setText(c); setAsked(c); }}>{c}</button>
          ))}
        </div>
      </div>

      {asked && (
        results.length > 0 ? (
          <div className="kc-list">
            {results.map(e => (
              <EntryCard key={e.name} e={e} open={effectiveOpen === e.name} onToggle={() => setOpenName(openName === e.name ? null : e.name)} />
            ))}
          </div>
        ) : (
          <div className="card w12 kc-empty">
            לא נמצאה התאמה טובה ל"{asked}". נסו מילת מפתח אחרת, או חפשו ישירות בלשונית "שאלות נפוצות".
          </div>
        )
      )}
    </div>
  );
}

function ShiftTab() {
  const [dateIso, setDateIso] = useState(todayLocalISO());
  const [shift, setShift] = useState(null); // null = whole day

  const d = parseISO(dateIso);
  const dow = d.getDay();
  const month = d.getMonth();
  const fc = useMemo(() => forecast({ dow, month, shift }), [dow, month, shift]);
  const dailyAvg = META.total / 365;

  return (
    <div>
      <div className="cmp-controls" style={{ marginBottom: 12 }}>
        <div className="grp">
          <div className="t">תאריך</div>
          <div className="sels">
            <input type="date" value={dateIso} onChange={e => setDateIso(e.target.value || todayLocalISO())}
              style={{ fontFamily: 'inherit', fontSize: 13, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }} />
            <button className="chip" onClick={() => setDateIso(todayLocalISO())}>היום</button>
            <button className="chip" onClick={() => setDateIso(addDays(todayLocalISO(), 1))}>מחר</button>
          </div>
        </div>
        <div className="grp">
          <div className="t">משמרת</div>
          <div className="sels">
            <button className={'chip' + (shift === null ? ' on' : '')} onClick={() => setShift(null)}>כל היום</button>
            {SHIFTS.map((s, i) => (
              <button key={s} className={'chip' + (shift === i ? ' on' : '')} onClick={() => setShift(i)}>{SHIFT_ICONS[i]} {s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="l">היקף פניות צפוי — יום {DOWS[dow]}, {MONTHS[month]}{shift != null ? ` · ${SHIFTS[shift]}` : ''}</div>
          <div className="v">{fmt1(fc.expectedVolume)} <small>פניות</small></div>
          <div className="d">
            לעומת ממוצע יומי כללי ({fmt1(dailyAvg)}): {fc.volumeVsAvgPct >= 0
              ? <span className="up">+{pctS(fc.volumeVsAvgPct)}</span>
              : <span className="down">{pctS(fc.volumeVsAvgPct)}</span>}
          </div>
        </div>
        <div className="kpi">
          <div className="l">מבוסס על</div>
          <div className="v" style={{ fontSize: 16, fontWeight: 600 }}>דפוסי 2025</div>
          <div className="d">יום בשבוע × חודש{shift != null ? ' × משמרת' : ''} — הערכה היסטורית, לא תור בזמן אמת</div>
        </div>
      </div>

      <div className="grid">
        <div className="card w12">
          <h3>הנושאים הצפויים ביותר</h3>
          <div className="note">אחוז מתוך הפניות הצפויות בפרוסה הזו (הערכה מבוססת-דפוסים)</div>
          <BarList items={fc.topTopics.map(t => ({ label: t.name, value: t.expectedSharePct, sub: t.expectedSharePct.toFixed(1) + '%' }))} fmtFn={v => v.toFixed(1) + '%'} />
        </div>
        <div className="card w12">
          <h3>מה כדאי לדעת — לפי הנושאים הצפויים</h3>
          <div className="note">הנחיות המוקדן עבור הנושאים הבולטים ביותר בפרוסה הזו</div>
          <div className="kc-list">
            {fc.topTopics.filter(t => t.guidance && t.guidance.length).slice(0, 5).map(t => (
              <EntryCard key={t.name} e={t} open onToggle={() => {}} />
            ))}
            {fc.topTopics.filter(t => t.guidance && t.guidance.length).length === 0 && (
              <div className="kc-empty">אין הנחיות מפורטות לנושאים הצפויים בפרוסה זו — עיינו בלשונית "שאלות נפוצות" לפי הצורך.</div>
            )}
          </div>
        </div>
        {fc.risingVsYearly.length > 0 && (
          <div className="card w12">
            <h3>בולט לעומת הממוצע השנתי</h3>
            <div className="note">נושאים שמייצגים חלק גדול יותר מהרגיל בפרוסת הזמן הזו — כדאי להיות מוכנים</div>
            <div className="kc-chips">
              {fc.risingVsYearly.map(t => (
                <span key={t.name} className="kc-chip">{t.name}: {t.expectedSharePct.toFixed(1)}% (ממוצע שנתי {t.shareText.toFixed(1)}%)</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Knowledge() {
  const [sub, setSub] = useState('faq');
  return (
    <section className="tabpage">
      <nav className="tabs" role="tablist" style={{ marginBottom: 14 }}>
        {SUBTABS.map(([id, l]) => (
          <button key={id} role="tab" className={'tab' + (sub === id ? ' on' : '')} onClick={() => setSub(id)}>{l}</button>
        ))}
      </nav>
      {sub === 'faq' && <FaqTab />}
      {sub === 'ask' && <AskTab />}
      {sub === 'shift' && <ShiftTab />}
    </section>
  );
}
