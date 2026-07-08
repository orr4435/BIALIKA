/* Site-wide password gate. Runs on every request (config.path = "/*").
   Password comes from SITE_PASSWORD env var; the cookie stores a SHA-256 of it,
   so changing the password invalidates existing sessions. */

const COOKIE = 'kb_auth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function tokenFor(pass) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass + '|kb-gate-1'));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function loginPage(showError) {
  const err = showError ? '<div class="err">סיסמה שגויה — נסו שוב</div>' : '';
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>כניסה · מוקד עירוני קריית ביאליק</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: system-ui, "Segoe UI", sans-serif;
    background: linear-gradient(135deg, #0d366b, #1c5cab 55%, #0b5c40);
    padding: 20px;
  }
  .card {
    background: #fff; border-radius: 18px; padding: 40px 36px; width: 100%; max-width: 380px;
    box-shadow: 0 24px 60px rgba(0,0,0,.35); text-align: center;
  }
  .icon { font-size: 40px; }
  h1 { font-size: 20px; color: #16233a; margin: 12px 0 4px; }
  p { font-size: 14px; color: #5b6b84; margin-bottom: 24px; }
  input {
    width: 100%; padding: 12px 14px; font-size: 16px; border: 1.5px solid #cdd7e4;
    border-radius: 10px; text-align: center; letter-spacing: 2px; direction: ltr;
  }
  input:focus { outline: none; border-color: #2a78d6; box-shadow: 0 0 0 3px rgba(42,120,214,.15); }
  button {
    width: 100%; margin-top: 14px; padding: 12px; font-size: 16px; font-weight: 600;
    color: #fff; background: #2a78d6; border: none; border-radius: 10px; cursor: pointer;
  }
  button:hover { background: #1c5cab; }
  .err { margin-top: 14px; color: #c22f2f; font-size: 14px; font-weight: 600; }
  @media (prefers-color-scheme: dark) {
    .card { background: #16202e; }
    h1 { color: #e8eef7; }
    p { color: #93a4bc; }
    input { background: #0e1621; border-color: #2b3a4f; color: #e8eef7; }
  }
</style>
</head>
<body>
  <form class="card" method="post" action="/login">
    <div class="icon">📞</div>
    <h1>מוקד עירוני קריית ביאליק</h1>
    <p>הדשבורד מוגן בסיסמה. הזינו את הסיסמה שקיבלתם.</p>
    <input type="password" name="password" placeholder="סיסמה" autofocus autocomplete="current-password" required>
    <button type="submit">כניסה</button>
    ${err}
  </form>
</body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default async (request, context) => {
  const pass = Netlify.env.get('SITE_PASSWORD') || 'DANI1133';
  const want = await tokenFor(pass);
  const cookies = request.headers.get('cookie') || '';
  const authed = cookies.split(/;\s*/).includes(`${COOKIE}=${want}`);
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/login') {
    const form = await request.formData().catch(() => null);
    if (form && form.get('password') === pass) {
      return new Response(null, {
        status: 303,
        headers: {
          location: '/',
          'set-cookie': `${COOKIE}=${want}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          'cache-control': 'no-store',
        },
      });
    }
    return loginPage(true);
  }

  if (authed) return context.next();
  return loginPage(false);
};

export const config = { path: '/*' };
