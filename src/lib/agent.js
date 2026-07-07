/* Rule-based Hebrew Q&A engine over the aggregated call-center dataset.
   Runs fully client-side — no API keys, works on static hosting.
   answer(q) -> { text, list?, spark?, sparkLabel?, chips? } */
import {
  DATA, MONTHS, MDAYS, DOWS, fmt, fmt1, pctS, sumR, daysR, rangeLabel,
  totalR, statusR, wMed, wW24, topByRange, heatMatrix,
} from './helpers.js';

const DEFAULT_CHIPS = [
  'מה הרחוב הכי עמוס?',
  'על מה מתלוננים הכי הרבה?',
  'השווה רבעון 4 מול רבעון 3',
  'מה זמן הטיפול הממוצע?',
  'מתי המוקד הכי עמוס?',
];

/* ---------- period extraction ---------- */
const MONTH_KEYS = {};
MONTHS.forEach((m, i) => { MONTH_KEYS[m] = i; });
Object.assign(MONTH_KEYS, {
  'ינו': 0, 'פבר': 1, 'מרס': 2, 'אפר': 3, 'יונ': 5, 'יול': 6, 'אוג': 7, 'ספט': 8, 'אוק': 9, 'נוב': 10, 'דצמ': 11,
});
function findMonths(q) {
  const found = [];
  // scan longest keys first so 'ינואר' wins over 'ינו'
  const keys = Object.keys(MONTH_KEYS).sort((a, b) => b.length - a.length);
  let rest = q;
  keys.forEach(k => {
    let i = rest.indexOf(k);
    while (i !== -1) {
      found.push({ pos: i, m: MONTH_KEYS[k] });
      rest = rest.slice(0, i) + '#'.repeat(k.length) + rest.slice(i + k.length);
      i = rest.indexOf(k);
    }
  });
  return found.sort((a, b) => a.pos - b.pos).map(f => f.m);
}
function findPeriods(q) {
  // returns list of [m0,m1] with position order
  const out = [];
  const qq = q.replace(/["'.,?!]/g, ' ');
  let m;
  const reQ = /רבעון\s*([1-4])/g;
  while ((m = reQ.exec(qq))) out.push({ pos: m.index, r: [(+m[1] - 1) * 3, (+m[1] - 1) * 3 + 2] });
  const reH = /מחצית\s*(א|ב|ראשונה|שניה|שנייה|1|2)/g;
  while ((m = reH.exec(qq))) {
    const second = /ב|שניה|שנייה|2/.test(m[1]);
    out.push({ pos: m.index, r: second ? [6, 11] : [0, 5] });
  }
  findMonths(qq).forEach((mi, k) => out.push({ pos: 10000 + k, r: [mi, mi] }));
  if (/כל השנה|השנה|שנתי|2025/.test(qq) && out.length === 0) out.push({ pos: 0, r: [0, 11] });
  out.sort((a, b) => a.pos - b.pos);
  // merge two bare months joined by עד/בין..ל into a range
  if (out.length === 2 && out[0].r[0] === out[0].r[1] && out[1].r[0] === out[1].r[1]
      && /(בין|עד|מ)/.test(qq) && !/(מול|לעומת|השוו|השווה|לעומת)/.test(qq)) {
    const a = Math.min(out[0].r[0], out[1].r[0]), b = Math.max(out[0].r[0], out[1].r[0]);
    return [[a, b]];
  }
  return out.map(o => o.r);
}

/* ---------- entity extraction ---------- */
function findEntity(q, names) {
  let best = null;
  names.forEach(n => {
    if (n === 'אחר') return;
    const clean = n.replace(/``/g, '"');
    if (q.includes(n) || q.includes(clean) || q.includes(clean.replace(/"/g, ''))) {
      if (!best || n.length > best.length) best = n;
    }
  });
  return best;
}

function periodText(r) { return r[0] === 0 && r[1] === 11 ? 'בכל 2025' : 'ב' + rangeLabel(r[0], r[1]); }

/* ---------- answer builders ---------- */
function streetCard(name, r) {
  const s = DATA.streets.find(x => x.name === name);
  const v = sumR(s.byMonth, r[0], r[1]);
  const share = v / totalR(r[0], r[1]) * 100;
  return {
    text: `רחוב ${s.name} (${s.area || '—'}): ${fmt(v)} פניות ${periodText(r)} — ${pctS(share)} מכלל העיר. ` +
      `נושא מוביל: ${s.topics[0][0]} (${fmt(s.topics[0][1])} בכל השנה). ` +
      `אגף מטפל עיקרי: ${s.agaf[0][0]}. חציון זמן טיפול ברחוב: ${s.med != null ? fmt1(s.med) + ' שעות' : '—'}.`,
    list: s.topics.slice(0, 5).map(t => ({ label: t[0], value: t[1] })),
    listTitle: 'נושאים מובילים ברחוב (כל השנה)',
    spark: s.byMonth, sparkLabel: 'פניות לפי חודש 2025',
    chips: [`השווה רבעון 4 מול רבעון 3 ב${s.name}`, 'מה הרחוב הכי עמוס?'],
  };
}
function dimCard(dim, name, r, dimLabel) {
  const i = dim.names.indexOf(name);
  const v = sumR(dim.byMonth[i], r[0], r[1]);
  const share = v / totalR(r[0], r[1]) * 100;
  const months = dim.byMonth[i];
  const peak = months.indexOf(Math.max(...months));
  return {
    text: `${dimLabel} "${name}": ${fmt(v)} פניות ${periodText(r)} (${pctS(share)} מהפניות). ` +
      `חודש השיא: ${MONTHS[peak]} עם ${fmt(months[peak])} פניות.`,
    spark: months, sparkLabel: 'פניות לפי חודש 2025',
  };
}
function topList(dim, r, n, title, skipOther) {
  const items = topByRange(dim, r[0], r[1], n, skipOther);
  const total = totalR(r[0], r[1]);
  return {
    text: `${title} ${periodText(r)}:`,
    list: items.map(x => ({ label: x.label, value: x.value, sub: pctS(x.value / total * 100) })),
  };
}
function topStreets(r, n) {
  const items = DATA.streets.map(s => ({ label: s.name, value: sumR(s.byMonth, r[0], r[1]) }))
    .sort((a, b) => b.value - a.value).slice(0, n);
  const total = totalR(r[0], r[1]);
  return {
    text: `הרחובות העמוסים ביותר ${periodText(r)}:`,
    list: items.map(x => ({ label: x.label, value: x.value, sub: pctS(x.value / total * 100) })),
    chips: ['מה קורה ברחוב ' + items[0].label + '?'],
  };
}
function comparePeriods(a, b) {
  const dA = daysR(a[0], a[1]), dB = daysR(b[0], b[1]);
  const tA = totalR(a[0], a[1]), tB = totalR(b[0], b[1]);
  const rateCh = (tA / dA - tB / dB) / (tB / dB) * 100;
  const medA = wMed(a[0], a[1]), medB = wMed(b[0], b[1]);
  const lA = rangeLabel(a[0], a[1]), lB = rangeLabel(b[0], b[1]);
  // biggest topic movers (normalized per day)
  const movers = [];
  DATA.topic.names.forEach((name, i) => {
    if (name === 'אחר') return;
    const A = sumR(DATA.topic.byMonth[i], a[0], a[1]), B = sumR(DATA.topic.byMonth[i], b[0], b[1]);
    if (A + B < 30) return;
    const ra = A / dA, rb = B / dB;
    movers.push({ name, ch: rb > 0 ? (ra - rb) / rb * 100 : 999, A, B });
  });
  movers.sort((x, y) => y.ch - x.ch);
  const up = movers[0], down = movers[movers.length - 1];
  let text = `${lA} מול ${lB}: ${fmt(tA)} פניות מול ${fmt(tB)}. ` +
    `בפניות ליום ${rateCh >= 0 ? 'עלייה' : 'ירידה'} של ${pctS(Math.abs(rateCh))} ` +
    `(${fmt1(tA / dA)} מול ${fmt1(tB / dB)} ליום). ` +
    `חציון זמן טיפול: ${fmt1(medA)} שעות מול ${fmt1(medB)}.`;
  if (up && up.ch > 10) text += ` הנושא שעלה הכי חד: ${up.name} (+${pctS(Math.min(up.ch, 999))}).`;
  if (down && down.ch < -10) text += ` הנושא שירד הכי חד: ${down.name} (${pctS(down.ch)}).`;
  return { text, chips: ['אילו נושאים עלו ' + periodText(a).replace('ב', 'ב') + '?', 'מה הרחוב הכי עמוס?'] };
}

/* ---------- main ---------- */
export function answer(raw) {
  const q = raw.trim();
  const periods = findPeriods(q);
  const r = periods[0] || [0, 11];
  const nMatch = q.match(/(\d+)\s*(רחובות|נושאים|מחלקות|אגפים|מובילים)/) || q.match(/טופ\s*(\d+)/i);
  const N = nMatch ? Math.min(15, Math.max(3, +nMatch[1])) : 5;

  // greeting / help
  if (/^(שלום|היי|הי|בוקר טוב|ערב טוב|עזרה|מה אתה (יודע|יכול))/.test(q) || q.length < 3) {
    return {
      text: 'שלום! אני עוזר הנתונים של המוקד העירוני. אפשר לשאול אותי על כמות פניות, רחובות, נושאים, אגפים, זמני טיפול והשוואות בין תקופות — למשל:',
      chips: DEFAULT_CHIPS,
    };
  }

  // comparison intent
  if (/(השווה|השוואה|מול|לעומת)/.test(q) && periods.length >= 2) {
    return comparePeriods(periods[0], periods[1]);
  }

  // entity lookups (street wins, then topic/agaf/mahlaka/area)
  const street = findEntity(q, DATA.streets.map(s => s.name));
  if (street && /(רחוב|ברח|קורה|מצב|פניות|עמוס|תלונות|מה)/.test(q)) return streetCard(street, r);
  const area = findEntity(q, DATA.area.names);
  if (area) {
    const card = dimCard(DATA.area, area, r, 'אזור');
    // add area top topics? topics per area not available; add note
    card.chips = ['מה הרחוב הכי עמוס?', 'פניות לפי אזור'];
    return card;
  }
  const topic = findEntity(q, DATA.topic.names);
  if (topic) return dimCard(DATA.topic, topic, r, 'נושא');
  const mah = findEntity(q, DATA.mahlaka.names);
  if (mah) return dimCard(DATA.mahlaka, mah, r, 'מחלקה');
  const agaf = findEntity(q, DATA.agaf.names);
  if (agaf) return dimCard(DATA.agaf, agaf, r, 'אגף');

  // top lists
  if (/(רחוב|רחובות)/.test(q) && /(עמוס|הכי|מוביל|בעייתי|טופ|מובילים)/.test(q)) return topStreets(r, N);
  if (/(נושא|נושאים|מתלוננים|תלונות)/.test(q)) return topList(DATA.topic, r, N, 'הנושאים המובילים', true);
  if (/(מחלקה|מחלקות)/.test(q)) return topList(DATA.mahlaka, r, N, 'המחלקות העמוסות', true);
  if (/(אגף|אגפים)/.test(q)) return topList(DATA.agaf, r, N, 'פניות לפי אגף');
  if (/(אזור|אזורים|שכונה|שכונות)/.test(q)) return topList(DATA.area, r, N, 'פניות לפי אזור');
  if (/(מטפל|מטפלים|עובד)/.test(q)) {
    return {
      text: 'המטפלים עם הכי הרבה פניות (כל 2025):',
      list: DATA.handlers.slice(0, N).map(h => ({ label: h.name, value: h.n })),
    };
  }

  // resolution time
  if (/(זמן|מהירות|כמה מהר|טיפול|sla)/i.test(q) && !/פניות ב/.test(q)) {
    const med = wMed(r[0], r[1]), w24 = wW24(r[0], r[1]);
    const worst = [...DATA.resAgaf].filter(x => x.n > 500).sort((a, b) => b.med - a.med)[0];
    const best = [...DATA.resAgaf].filter(x => x.n > 500).sort((a, b) => a.med - b.med)[0];
    return {
      text: `זמן טיפול ${periodText(r)}: חציון של ${fmt1(med)} שעות, ו-${pctS(w24)} מהפניות נסגרות בתוך 24 שעות. ` +
        `האגף המהיר ביותר (מבין הגדולים): ${best.agaf} (חציון ${fmt1(best.med)} שע׳); האיטי ביותר: ${worst.agaf} (${fmt1(worst.med)} שע׳).`,
      spark: DATA.resMonth.map(x => x.med), sparkLabel: 'חציון זמן טיפול לפי חודש (שעות)',
    };
  }

  // busiest time
  if (/(מתי|שעה|שעות|יום עמוס|ימים|עומס)/.test(q)) {
    const M = heatMatrix(r[0], r[1]);
    const dTot = M.map(row => row.reduce((a, b) => a + b, 0));
    const bd = dTot.indexOf(Math.max(...dTot));
    let ph = 0, pd = 0, pv = -1;
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) if (M[d][h] > pv) { pv = M[d][h]; pd = d; ph = h; }
    const total = totalR(r[0], r[1]);
    return {
      text: `${periodText(r)} היום העמוס ביותר הוא יום ${DOWS[bd]} (${pctS(dTot[bd] / total * 100)} מהפניות), ` +
        `והשיא השעתי הוא ${String(ph).padStart(2, '0')}:00 ביום ${DOWS[pd]}. רוב הפניות מתקבלות בין 8:00 ל-12:00.`,
      list: DOWS.map((d, i) => ({ label: 'יום ' + d, value: dTot[i] })),
    };
  }

  // status
  if (/(סטטוס|טופלו|נסגרו|פתוחות|בטיפול|תוצאה)/.test(q)) {
    const total = totalR(r[0], r[1]);
    return {
      text: `סטטוס הפניות ${periodText(r)} (סה"כ ${fmt(total)}):`,
      list: DATA.status.names.map((n, i) => ({ label: n, value: sumR(DATA.status.byMonth[i], r[0], r[1]) }))
        .filter(x => x.value > 0).sort((a, b) => b.value - a.value)
        .map(x => ({ ...x, sub: pctS(x.value / total * 100) })),
    };
  }

  // plain count
  if (/(כמה|מספר|סה"כ|סך|כמות)/.test(q)) {
    const total = totalR(r[0], r[1]), days = daysR(r[0], r[1]);
    const len = r[1] - r[0] + 1, hasPrev = r[0] - len >= 0;
    let text = `${periodText(r)} נפתחו ${fmt(total)} פניות — ${fmt1(total / days)} ביום בממוצע.`;
    if (hasPrev) {
      const p = totalR(r[0] - len, r[0] - 1), pd = daysR(r[0] - len, r[0] - 1);
      const ch = (total / days - p / pd) / (p / pd) * 100;
      text += ` לעומת ${rangeLabel(r[0] - len, r[0] - 1)}: ${ch >= 0 ? 'עלייה' : 'ירידה'} של ${pctS(Math.abs(ch))} בפניות ליום.`;
    }
    return { text, spark: MONTHS.map((_, m) => totalR(m, m)), sparkLabel: 'פניות לפי חודש 2025' };
  }

  return {
    text: 'לא הצלחתי להבין את השאלה. אפשר לשאול אותי למשל:',
    chips: DEFAULT_CHIPS,
  };
}

export { DEFAULT_CHIPS };
