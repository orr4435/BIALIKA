/* Tool layer for the AI chat: the model asks for data, we compute it locally
   from the aggregated dataset and send the numbers back. */
import {
  DATA, MONTHS, DOWS, r1, sumR, daysR, rangeLabel, totalR, statusR, wMed, wW24,
  topByRange, heatMatrix,
} from './helpers.js';

const clampM = m => Math.max(0, Math.min(11, (m | 0) - 1)); // 1-based → 0-based
function period(args) {
  const a = args && args.from_month ? clampM(args.from_month) : 0;
  const b = args && args.to_month ? clampM(args.to_month) : 11;
  return a <= b ? [a, b] : [b, a];
}
const label = r => rangeLabel(r[0], r[1]) + ' 2025';

export const toolDefs = [
  {
    type: 'function',
    function: {
      name: 'get_overview',
      description: 'סיכום כללי לתקופה: סה"כ פניות, ממוצע יומי, שיעור טופל, זמני טיפול, פילוח לפי אגף ואזור וסטטוס',
      parameters: {
        type: 'object',
        properties: {
          from_month: { type: 'integer', description: 'חודש התחלה 1-12 (ברירת מחדל 1)' },
          to_month: { type: 'integer', description: 'חודש סיום 1-12 (ברירת מחדל 12)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'top_list',
      description: 'רשימת המובילים בתקופה לפי ממד: רחובות, נושאים, מחלקות, אגפים, אזורים או מטפלים',
      parameters: {
        type: 'object',
        properties: {
          dimension: { type: 'string', enum: ['streets', 'topics', 'departments', 'divisions', 'areas', 'handlers'] },
          n: { type: 'integer', description: 'כמה תוצאות (ברירת מחדל 10, מקסימום 25)' },
          from_month: { type: 'integer' }, to_month: { type: 'integer' },
        },
        required: ['dimension'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'entity_stats',
      description: 'נתונים מפורטים על ישות ספציפית: רחוב, נושא, אגף, מחלקה או אזור — כולל פירוט חודשי',
      parameters: {
        type: 'object',
        properties: {
          entity_type: { type: 'string', enum: ['street', 'topic', 'division', 'department', 'area'] },
          name: { type: 'string', description: 'השם המדויק או חלק ממנו בעברית' },
          from_month: { type: 'integer' }, to_month: { type: 'integer' },
        },
        required: ['entity_type', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_periods',
      description: 'השוואה בין שתי תקופות: כמויות, קצב יומי, זמני טיפול, והנושאים שעלו/ירדו הכי חזק',
      parameters: {
        type: 'object',
        properties: {
          a_from: { type: 'integer', description: 'תקופה א: מחודש 1-12' },
          a_to: { type: 'integer' },
          b_from: { type: 'integer', description: 'תקופה ב (בסיס): מחודש 1-12' },
          b_to: { type: 'integer' },
        },
        required: ['a_from', 'a_to', 'b_from', 'b_to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'busiest_times',
      description: 'מתי המוקד עמוס: פילוח לפי ימות השבוע ושעות היום בתקופה',
      parameters: {
        type: 'object',
        properties: { from_month: { type: 'integer' }, to_month: { type: 'integer' } },
      },
    },
  },
];

const DIMS = {
  topics: [DATA.topic, true], departments: [DATA.mahlaka, true],
  divisions: [DATA.agaf, false], areas: [DATA.area, false],
};

export function runTool(name, args) {
  try {
    switch (name) {
      case 'get_overview': {
        const r = period(args);
        const total = totalR(r[0], r[1]), days = daysR(r[0], r[1]);
        return {
          period: label(r), total_inquiries: total, per_day: r1(total / days),
          treated_pct: r1(statusR('טופל', r[0], r[1]) / total * 100),
          median_resolution_hours: r1(wMed(r[0], r[1])),
          closed_within_24h_pct: r1(wW24(r[0], r[1])),
          by_division: topByRange(DATA.agaf, r[0], r[1], 12).map(x => ({ name: x.label, count: x.value })),
          by_area: topByRange(DATA.area, r[0], r[1], 9).map(x => ({ name: x.label, count: x.value })),
          by_status: topByRange(DATA.status, r[0], r[1], 8).map(x => ({ name: x.label, count: x.value })),
          monthly: MONTHS.map((mn, m) => ({ month: mn, count: totalR(m, m) })).slice(r[0], r[1] + 1),
        };
      }
      case 'top_list': {
        const r = period(args);
        const n = Math.min(25, Math.max(3, args.n || 10));
        if (args.dimension === 'streets') {
          return {
            period: label(r),
            streets: DATA.streets.map(s => ({ name: s.name, area: s.area, count: sumR(s.byMonth, r[0], r[1]), top_topic: s.topics[0] ? s.topics[0][0] : null }))
              .sort((a, b) => b.count - a.count).slice(0, n),
          };
        }
        if (args.dimension === 'handlers') {
          return { note: 'נתוני מטפלים זמינים לכל 2025 בלבד', handlers: DATA.handlers.slice(0, n) };
        }
        const [dim, skip] = DIMS[args.dimension] || DIMS.topics;
        return { period: label(r), items: topByRange(dim, r[0], r[1], n, skip).map(x => ({ name: x.label, count: x.value })) };
      }
      case 'entity_stats': {
        const r = period(args);
        const q = String(args.name || '').trim();
        if (args.entity_type === 'street') {
          const s = DATA.streets.find(x => x.name === q) || DATA.streets.find(x => x.name.includes(q) || q.includes(x.name));
          if (!s) return { error: 'רחוב לא נמצא: ' + q, hint: 'streets tool מחזיר את רשימת השמות' };
          return {
            street: s.name, area: s.area, total_2025: s.total,
            count_in_period: sumR(s.byMonth, r[0], r[1]), period: label(r),
            monthly: MONTHS.map((mn, m) => ({ month: mn, count: s.byMonth[m] })),
            top_topics: s.topics.map(t => ({ name: t[0], count: t[1] })),
            main_division: s.agaf[0] ? s.agaf[0][0] : null,
            median_resolution_hours: s.med,
          };
        }
        const map = { topic: [DATA.topic, 'נושא'], division: [DATA.agaf, 'אגף'], department: [DATA.mahlaka, 'מחלקה'], area: [DATA.area, 'אזור'] };
        const [dim, lbl] = map[args.entity_type] || map.topic;
        const name = dim.names.find(x => x === q) || dim.names.find(x => x.includes(q) || q.includes(x));
        if (!name) return { error: lbl + ' לא נמצא: ' + q };
        const i = dim.names.indexOf(name);
        return {
          type: lbl, name, period: label(r),
          count_in_period: sumR(dim.byMonth[i], r[0], r[1]),
          share_pct: r1(sumR(dim.byMonth[i], r[0], r[1]) / totalR(r[0], r[1]) * 100),
          monthly: MONTHS.map((mn, m) => ({ month: mn, count: dim.byMonth[i][m] })),
        };
      }
      case 'compare_periods': {
        const a = [clampM(args.a_from), clampM(args.a_to)].sort((x, y) => x - y);
        const b = [clampM(args.b_from), clampM(args.b_to)].sort((x, y) => x - y);
        const dA = daysR(a[0], a[1]), dB = daysR(b[0], b[1]);
        const tA = totalR(a[0], a[1]), tB = totalR(b[0], b[1]);
        const movers = [];
        DATA.topic.names.forEach((name, i) => {
          if (name === 'אחר') return;
          const A = sumR(DATA.topic.byMonth[i], a[0], a[1]), B = sumR(DATA.topic.byMonth[i], b[0], b[1]);
          if (A + B < 30) return;
          const ra = A / dA, rb = B / dB;
          movers.push({ topic: name, change_pct: r1(rb > 0 ? (ra - rb) / rb * 100 : 999), count_a: A, count_b: B });
        });
        movers.sort((x, y) => y.change_pct - x.change_pct);
        return {
          period_a: label(a), period_b: label(b),
          total_a: tA, total_b: tB,
          per_day_a: r1(tA / dA), per_day_b: r1(tB / dB),
          per_day_change_pct: r1((tA / dA - tB / dB) / (tB / dB) * 100),
          median_resolution_a: r1(wMed(a[0], a[1])), median_resolution_b: r1(wMed(b[0], b[1])),
          treated_pct_a: r1(statusR('טופל', a[0], a[1]) / tA * 100),
          treated_pct_b: r1(statusR('טופל', b[0], b[1]) / tB * 100),
          top_rising_topics: movers.slice(0, 6),
          top_falling_topics: movers.slice(-6).reverse(),
        };
      }
      case 'busiest_times': {
        const r = period(args);
        const M = heatMatrix(r[0], r[1]);
        const byDay = M.map((row, d) => ({ day: DOWS[d], count: row.reduce((x, y) => x + y, 0) }));
        const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: M.reduce((s, row) => s + row[h], 0) }));
        return { period: label(r), by_day: byDay, by_hour: byHour };
      }
      default:
        return { error: 'unknown tool ' + name };
    }
  } catch (e) {
    return { error: String(e && e.message || e) };
  }
}

export function systemPrompt() {
  const total = totalR(0, 11);
  return [
    'אתה "עוזר הנתונים" של המוקד העירוני (מוקד 106) של עיריית קריית ביאליק.',
    'אתה עונה למנכ"ל העירייה ולהנהלה על נתוני הפניות של שנת 2025 בלבד.',
    `בסיס הנתונים: ${total.toLocaleString('he-IL')} פניות, ינואר–דצמבר 2025, מפולחות לפי חודש, אגף, מחלקה, נושא, אזור, רחוב, סטטוס, יום ושעה, וזמני טיפול.`,
    'חובה להשתמש בכלים (tools) כדי לשלוף מספרים — אל תמציא נתונים ואל תסתמך על ידע כללי.',
    'ענה בעברית, קצר וענייני, עם מספרים מדויקים מהכלים. טקסט פשוט בלבד — בלי Markdown, בלי כוכביות.',
    'כשמשווים תקופות באורך שונה — התייחס לממוצע פניות ליום.',
    'הערת דאטה: בהשוואות ייתכנו נושאים עם ±100% בגלל שינוי שמות נושאים במהלך השנה (למשל "פינוי גרוטאות- קרטונים" הוחלף ב"פינוי גזם- גרוטאות- קרטונים").',
    'אם שואלים על משהו שאין בנתונים (שנים אחרות, תקציב, זהות פונים) — אמור זאת בפשטות.',
  ].join('\n');
}
