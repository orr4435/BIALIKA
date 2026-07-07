# מוקד עירוני קריית ביאליק — דשבורד BI

אפליקציית React (Vite) לניתוח 73,284 פניות מוקד 106 לשנת 2025: מגמות, השוואת תקופות,
מפת רחובות, טבלאות, ייצוא לאקסל, 4 ערכות צבעים ועוזר נתונים בסגנון וואטסאפ.

## הרצה מקומית

```bash
npm install
npm run dev        # שרת פיתוח
npm run build      # בנייה ל-dist/
npm run preview    # תצוגה מקדימה של הבנייה
```

## העלאה לנטליפיי

`netlify.toml` כבר מוגדר (build: `npm run build`, publish: `dist`). שתי דרכים:

**דרך א׳ — גרירה (הכי מהיר):**
1. `npm run build`
2. היכנסו ל-https://app.netlify.com/drop וגררו את תיקיית `dist`.

**דרך ב׳ — חיבור Git (עדכונים אוטומטיים):**
1. דחפו את התיקייה לריפו GitHub.
2. בנטליפיי: Add new site → Import an existing project → בחרו את הריפו.
3. ההגדרות נקראות אוטומטית מ-netlify.toml. כל push יבנה ויפרסם מחדש.

**דרך ג׳ — CLI:**
```bash
npm install -g netlify-cli
netlify deploy --build --prod
```

## פרמטרים בכתובת

- `#compare` / `#map` / `#tables` — פתיחה ישירה של לשונית.
- `?skin=ocean|midbar|sunset|royal` — ערכת צבעים (נשמרת גם ב-localStorage דרך הכפתורים בכותרת).
- `?ask=שאלה` — פותח את עוזר הנתונים עם שאלה מוכנה, למשל `?ask=מה הרחוב הכי עמוס`.

## עוזר הנתונים (צ׳אט) — שני מצבים

**מצב AI (DeepSeek):** הצ׳אט פונה ל-Netlify Function ‏(`netlify/functions/chat.mjs`)
שמתווכת ל-DeepSeek. המודל מקבל "כלים" (`src/lib/aiTools.js`) לשליפת נתונים מדויקים —
סיכומים, רשימות מובילים, פירוט ישויות, השוואות ועומסים — כך שהוא עונה בשפה חופשית
אבל עם מספרים אמיתיים מהדאטה, בלי להמציא.

**הגדרת המפתח (פעם אחת, בנטליפיי):**
1. Site configuration → Environment variables → Add a variable
2. שם: `DEEPSEEK_API_KEY`, ערך: המפתח שלכם מ-platform.deepseek.com
3. (אופציונלי) `DEEPSEEK_MODEL` — ברירת מחדל `deepseek-chat`
4. Deploy מחדש. זהו — המפתח נשאר בצד השרת ולעולם לא נחשף לדפדפן.

**חשוב: לעולם לא לשים את המפתח בקוד או בקבצי ה-React** — כל מה שנבנה ל-dist גלוי
לכל גולש.

**מצב מקומי (ללא מפתח):** אם הפונקציה לא זמינה (אין מפתח, פיתוח מקומי עם
`npm run preview`, או הפלת רשת) הצ׳אט עובר אוטומטית למנוע מבוסס-חוקים בעברית
(`src/lib/agent.js`) שעונה על השאלות הנפוצות. שורת הסטטוס בכותרת הצ׳אט מציגה
באיזה מצב הוא רץ ("מחובר ל-AI" / "מצב מקומי").

**בדיקה מקומית של מצב ה-AI בלי מפתח:** `python mock_ai_server.py` מגיש את `dist/`
עם מוק של ה-API בכתובת `http://127.0.0.1:8391` (מדמה tool_call אמיתי).
לבדיקה עם המפתח האמיתי מקומית: `netlify dev` (netlify-cli) עם המשתנה מוגדר.

## עדכון נתונים

הנתונים המסוכמים ב-`src/data/dashdata.json` נבנים מקובץ ה-CSV של המוקד בעזרת
`prep_data.py` (הצלבה עם שכבת הכתובות `כתובותביאליק.zip` והמרת רשת ישראל ל-WGS84).
להחלפת שנה/עדכון: הריצו את הסקריפט על CSV חדש והחליפו את הקובץ.

## מבנה

```
src/
  data/dashdata.json    נתונים מסוכמים (146KB)
  lib/helpers.js        אגרגציות, פורמט, טולטיפ, צבעים
  lib/skins.js          4 ערכות צבעים + מצב בהיר/כהה
  lib/charts.js         גרפי SVG ומנוע מפת קנבס
  lib/agent.js          מנוע שאלות-תשובות בעברית
  lib/xlsx.js           מחולל Excel ללא תלויות
  components/           Overview, Compare, MapTab, Tables, Chat
legacy/report-builder.html   הדף הישן שהיה בתיקייה (נשמר)
```
