import { xlsxBuild } from './xlsx.js';
import {
  DATA, MONTHS, MDAYS, DOWS, r1, sumR, daysR, rangeLabel, totalR, statusR, wMed, wW24,
} from './helpers.js';

export function exportExcel(m0, m1) {
  const total = totalR(m0, m1), days = daysR(m0, m1);
  const lbl = rangeLabel(m0, m1) + ' 2025';
  const dimSheet = dim => {
    const body = [];
    dim.names.forEach((name, i) => {
      const v = sumR(dim.byMonth[i], m0, m1);
      if (v > 0) body.push([name, v, r1(v / total * 100)]);
    });
    body.sort((a, b) => b[1] - a[1]);
    return [[dim.title, 'פניות', '% מסך הכל'], ...body];
  };
  const sheets = [];
  sheets.push({ name: 'סיכום', rows: [
    ['מדד', 'ערך'],
    ['טווח נבחר', lbl],
    ['סה"כ פניות', total],
    ['פניות ליום בממוצע', r1(total / days)],
    ['שיעור "טופל" (%)', r1(statusR('טופל', m0, m1) / total * 100)],
    ['חציון זמן טיפול (שעות, משוקלל)', r1(wMed(m0, m1))],
    ['נסגרו בתוך 24 שעות (%)', r1(wW24(m0, m1))],
    ['מקור', 'רשימת פניות מוקד עירוני קריית ביאליק, 2025'],
  ]});
  const mrows = [['חודש', 'פניות', 'ממוצע ליום', 'חציון זמן טיפול (שעות)', 'נסגרו בתוך 24 שעות (%)']];
  for (let m = m0; m <= m1; m++) {
    const v = totalR(m, m);
    mrows.push([MONTHS[m], v, r1(v / MDAYS[m]), DATA.resMonth[m].med, DATA.resMonth[m].w24]);
  }
  sheets.push({ name: 'לפי חודש', rows: mrows });
  sheets.push({ name: 'לפי אגף', rows: dimSheet({ ...DATA.agaf, title: 'אגף' }) });
  sheets.push({ name: 'לפי אזור', rows: dimSheet({ ...DATA.area, title: 'אזור' }) });
  sheets.push({ name: 'לפי מחלקה', rows: dimSheet({ ...DATA.mahlaka, title: 'מחלקה' }) });
  sheets.push({ name: 'לפי נושא', rows: dimSheet({ ...DATA.topic, title: 'נושא' }) });
  sheets.push({ name: 'סטטוס', rows: dimSheet({ ...DATA.status, title: 'סטטוס' }) });
  const srows = [['רחוב', 'אזור', 'פניות בטווח', 'חציון זמן טיפול שנתי (שעות)', 'נושא מוביל', 'אגף מוביל', 'LAT', 'LON']];
  DATA.streets.map(s => ({ s, v: sumR(s.byMonth, m0, m1) })).filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v).forEach(({ s, v }) => {
      srows.push([s.name, s.area, v, s.med, s.topics[0] ? s.topics[0][0] : '', s.agaf[0] ? s.agaf[0][0] : '', s.lat, s.lon]);
    });
  sheets.push({ name: 'רחובות', rows: srows });
  const hrows = [['יום \\ שעה', ...Array.from({ length: 24 }, (_, h) => h)]];
  for (let d = 0; d < 7; d++) {
    const row = [DOWS[d]];
    for (let h = 0; h < 24; h++) { let s = 0; for (let m = m0; m <= m1; m++) s += DATA.hourDow[m][d][h]; row.push(s); }
    hrows.push(row);
  }
  sheets.push({ name: 'עומס יום-שעה', rows: hrows });

  const buf = xlsxBuild(sheets);
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'פניות מוקד קריית ביאליק - ' + rangeLabel(m0, m1) + ' 2025.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
