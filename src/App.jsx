import React, { useEffect, useState } from 'react';
import { DATA, MONTHS, fmt, fmt1 } from './lib/helpers.js';
import { SKINS, applySkin, getSkinId, applyMode, getMode } from './lib/skins.js';
import { exportExcel } from './lib/export.js';
import Overview from './components/Overview.jsx';
import Compare from './components/Compare.jsx';
import MapTab from './components/MapTab.jsx';
import Tables from './components/Tables.jsx';
import Knowledge from './components/Knowledge.jsx';
import Chat from './components/Chat.jsx';

const PRESETS = [
  ['כל השנה', 0, 11], ['רבעון 1', 0, 2], ['רבעון 2', 3, 5], ['רבעון 3', 6, 8],
  ['רבעון 4', 9, 11], ['מחצית א׳', 0, 5], ['מחצית ב׳', 6, 11],
];
const TABS = [
  ['overview', 'סקירה'], ['compare', 'השוואת תקופות'], ['map', 'מפה'], ['tables', 'טבלאות'],
  ['knowledge', 'מרכז ידע'],
];
const MODE_LABEL = { auto: 'תצוגה: אוטו', light: 'תצוגה: בהיר', dark: 'תצוגה: כהה' };

export default function App() {
  const [range, setRange] = useState({ m0: 0, m1: 11 });
  const [tab, setTab] = useState(() => {
    const h = location.hash.replace('#', '');
    return TABS.some(([id]) => id === h) ? h : 'overview';
  });
  const [skin, setSkin] = useState(getSkinId());
  const [mode, setMode] = useState(getMode());
  const [street, setStreet] = useState(null);
  const [cmp, setCmp] = useState({ a0: 9, a1: 11, b0: 6, b1: 8 });
  const [sysDark, setSysDark] = useState(matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = e => setSysDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const { m0, m1 } = range;
  const themeKey = skin + '|' + mode + '|' + sysDark;

  const pickSkin = id => { applySkin(id); setSkin(id); };
  const cycleMode = () => {
    const next = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto';
    applyMode(next); setMode(next);
  };
  const setM = (key, val) => {
    const next = { ...range, [key]: +val };
    if (next.m1 < next.m0) { if (key === 'm0') next.m1 = next.m0; else next.m0 = next.m1; }
    setRange(next);
  };

  return (
    <div className="kb-root" dir="rtl">
      <header className="kb-hero">
        <div className="kb-hero-row">
          <div>
            <div className="eyebrow">ניתוח פניות · מודיעין עסקי</div>
            <h1>מוקד עירוני קריית ביאליק — תמונת מצב 2025</h1>
            <div className="sub">
              {fmt(DATA.meta.total)} פניות בשנת 2025 · {fmt1(DATA.meta.dailyAvg)} פניות ביום בממוצע · {DATA.streets.length} רחובות ממופים · מעודכן ל-31.12.2025
            </div>
          </div>
          <div className="kb-hero-tools">
            {Object.entries(SKINS).map(([id, s]) => (
              <button key={id} className={'skin-btn' + (skin === id ? ' on' : '')} onClick={() => pickSkin(id)}>
                <span className="dot" style={{ background: s.light.accent }} />{s.label}
              </button>
            ))}
            <button className="skin-btn" onClick={cycleMode}>{MODE_LABEL[mode]}</button>
          </div>
        </div>
      </header>
      <div className="kb-wrap">
        <div className="kb-filters">
          <span className="lbl">טווח תאריכים:</span>
          {PRESETS.map(([l, a, b]) => (
            <button key={l} className={'chip' + (m0 === a && m1 === b ? ' on' : '')} onClick={() => setRange({ m0: a, m1: b })}>{l}</button>
          ))}
          <span className="lbl">מותאם:</span>
          <select value={m0} onChange={e => setM('m0', e.target.value)} aria-label="מחודש">
            {MONTHS.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
          </select>
          <span className="lbl">עד</span>
          <select value={m1} onChange={e => setM('m1', e.target.value)} aria-label="עד חודש">
            {MONTHS.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
          </select>
          <button className="chip" id="btn-xlsx" title="מוריד קובץ Excel עם כל הנתונים המסוכמים לפי הטווח הנבחר"
            onClick={() => exportExcel(m0, m1)}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ verticalAlign: -1 }}>
              <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            הורדה לאקסל
          </button>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map(([id, l]) => (
            <button key={id} role="tab" className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>{l}</button>
          ))}
        </nav>
        {tab === 'overview' && <Overview m0={m0} m1={m1} themeKey={themeKey} />}
        {tab === 'compare' && <Compare cmp={cmp} setCmp={setCmp} />}
        {tab === 'map' && <MapTab m0={m0} m1={m1} street={street} setStreet={setStreet} themeKey={themeKey} />}
        {tab === 'tables' && <Tables m0={m0} m1={m1} />}
        {tab === 'knowledge' && <Knowledge />}
      </div>
      <footer className="foot">
        מקור: קובץ רשימת פניות של המוקד העירוני (73,284 פניות, ינואר–דצמבר 2025) · מיקומי רחובות: שכבת כתובות עירונית (רשת ישראל, הומרה ל-WGS84) בתוספת איתור OpenStreetMap לרחובות חדשים ·
        כיסוי מפה: 96.4% מהפניות (1,928 פניות של תושבי חוץ ו-516 פניות ב-14 רחובות ללא מיקום ידוע אינן מוצגות במפה) ·
        זמני טיפול חושבו מהפרש פתיחה–סגירה; 61 פניות עם תאריכים חסרים או שגויים הוחרגו.
      </footer>
      <Chat />
    </div>
  );
}
