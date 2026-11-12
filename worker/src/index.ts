/**
 * Cloudflare Worker 主入口（Hono）。
 *
 * 职责：GitHub OAuth 登录 → 签名会话 Cookie → 校验站长白名单 →
 * 用 GitHub App Installation Token 把文章 / 绘图 / 图片写入 Aisssky/Blog。
 *
 * 安全红线：
 *   - 所有密钥仅在 env（Variables / Secrets）中存在，绝不出现在响应里。
 *   - 前端不持有任何 GitHub 令牌；写操作一律经本 Worker 代理。
 *   - 每次写入都重新校验会话 + 白名单 + 路径白名单。
 *   - 只允许写 src/content/blog/、public/images/uploads/、public/images/drawings/。
 */
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import yaml from 'js-yaml';
import { signSession, verifySession, b64utf8 } from './crypto';
import { readFile, listFiles, commitFiles, deleteFile, type FileToWrite } from './github';

export interface Env {
  GH_OWNER: string;
  GH_REPO: string;
  GH_BRANCH: string;
  GH_APP_ID: string;
  GH_APP_PRIVATE_KEY: string;
  GH_INSTALLATION_ID: string;
  OWNER_GITHUB_LOGIN: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_CLIENT_SECRET: string;
  OAUTH_REDIRECT_PATH: string;
  SESSION_SECRET: string;
  COOKIE_NAME: string;
  SITE_ORIGIN: string;
}

const ALLOWED_ROOTS = ['src/content/blog/', 'public/images/uploads/', 'public/images/drawings/'];

function isOwner(login: string, env: Env): boolean {
  const list = env.OWNER_GITHUB_LOGIN.split(',').map((s) => s.trim().toLowerCase());
  return list.includes(login.trim().toLowerCase());
}

/** 校验并规范化写入路径；非法返回 null */
function safePath(path: string, env: Env): string | null {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..')) return null;
  if (!ALLOWED_ROOTS.some((r) => normalized.startsWith(r))) return null;
  return normalized;
}

function corsOrigin(req: Request, env: Env): string {
  const origin = req.headers.get('Origin') || '';
  const allowed = [env.SITE_ORIGIN, 'http://localhost:4321', 'http://localhost:3000'];
  if (allowed.includes(origin)) return origin;
  return env.SITE_ORIGIN;
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = corsOrigin(req, env);
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

function sessionCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  // 前端站点（github.io）与 Worker（workers.dev）通常是不同源；跨站
  // fetch(credentials:'include') 时，SameSite=Lax 的 Cookie 不会被附带，
  // 会导致鉴权失效。故会话 Cookie 使用 SameSite=None（必须配合 Secure，
  // Worker 始终运行在 HTTPS 上，故恒为 Secure）。
  const parts = [
    `${name}=${value}`,
    'HttpOnly',
    'SameSite=None',
    'Path=/',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

const app = new Hono<{ Bindings: Env }>();

// 预检
app.options('*', (c) => new Response(null, { status: 204, headers: corsHeaders(c.req.raw, c.env) }));

// 统一附加 CORS
app.use('*', async (c, next) => {
  await next();
  const h = corsHeaders(c.req.raw, c.env);
  for (const [k, v] of Object.entries(h)) c.header(k, v);
});

/** 鉴权中间件：未登录 401，非白名单 403，通过则注入 login */
async function requireOwner(c: any, next: () => Promise<void>) {
  const token = getCookie(c, c.env.COOKIE_NAME);
  const session = await verifySession(token, c.env.SESSION_SECRET);
  if (!session) return json({ error: '未登录' }, 401);
  if (!isOwner(session.login, c.env)) return json({ error: '无权限' }, 403);
  c.set('login', session.login);
  await next();
}

// ---------------- 认证 ----------------
app.get('/auth/login', (c) => {
  const state = crypto.randomUUID();
  const redirect = new URL(c.req.url).searchParams.get('redirect') || `/Blog/blog/`;
  const secure = new URL(c.req.url).protocol === 'https:';
  const cookie = sessionCookie('oauth_state', state, 600, secure);
  const redir = new URL('/auth/callback', c.req.url).href;
  const github =
    `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(c.env.OAUTH_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redir)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('read:user')}`;
  return new Response(null, {
    status: 302,
    headers: { Location: github, 'Set-Cookie': cookie },
  });
});

app.get('/auth/callback', async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = getCookie(c, 'oauth_state');
  const secure = url.protocol === 'https:';
  const clearState = sessionCookie('oauth_state', '', 0, secure);
  if (!code || !state || state !== cookieState) {
    return json({ error: 'state 校验失败' }, 400, { 'Set-Cookie': clearState });
  }
  // 换 OAuth token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: c.env.OAUTH_CLIENT_ID,
      client_secret: c.env.OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: new URL('/auth/callback', c.req.url).href,
    }),
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) return json({ error: '换取令牌失败' }, 400, { 'Set-Cookie': clearState });
  // 取用户信息
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' },
  });
  const user = (await userRes.json()) as { login?: string };
  if (!user.login) return json({ error: '获取用户失败' }, 400, { 'Set-Cookie': clearState });

  if (!isOwner(user.login, c.env)) {
    return json({ error: '该账号不在站长白名单' }, 403, { 'Set-Cookie': clearState });
  }
  const session = await signSession(
    { login: user.login, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    c.env.SESSION_SECRET,
  );
  const back = url.searchParams.get('redirect') || `/Blog/blog/`;
  const safeBack = back.startsWith(c.env.SITE_ORIGIN) || back.startsWith('/') ? back : `/Blog/blog/`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: safeBack,
      'Set-Cookie': `${sessionCookie(c.env.COOKIE_NAME, session, 60 * 60 * 24 * 30, secure)}, ${clearState}`,
    },
  });
});

app.get('/auth/me', async (c) => {
  const token = getCookie(c, c.env.COOKIE_NAME);
  const session = await verifySession(token, c.env.SESSION_SECRET);
  if (!session) return json({ authenticated: false }, 401);
  if (!isOwner(session.login, c.env)) return json({ authenticated: false }, 403);
  return json({ authenticated: true, login: session.login, isOwner: true });
});

app.post('/auth/logout', (c) => {
  const secure = new URL(c.req.url).protocol === 'https:';
  return json({ ok: true }, 200, {
    'Set-Cookie': sessionCookie(c.env.COOKIE_NAME, '', 0, secure),
  });
});

// ---------------- 文章 / 资源 API（均需鉴权）----------------
const withOwner = app.use('/api/*', async (c, next) => {
  // 预检请求不过鉴权（否则 CORS 预检会被 401 拦截）
  if (c.req.method === 'OPTIONS') return next();
  return requireOwner(c, next);
});
void withOwner;

app.get('/api/posts', async (c) => {
  const files = await listFiles(c.env, 'src/content/blog');
  const metas = [];
  for (const f of files.filter((x) => x.name.endsWith('.md'))) {
    try {
      const { content } = await readFile(c.env, f.path);
      const fm = parseFrontmatter(content);
      metas.push({
        slug: f.name.replace(/\.md$/, ''),
        title: fm.title || f.name,
        description: fm.description,
        pubDate: fmtDate(fm.pubDate),
        updatedDate: fmtDate(fm.updatedDate),
        category: fm.category,
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        draft: Boolean(fm.draft),
      });
    } catch {
      /* 跳过无法解析的文件 */
    }
  }
  return json(metas);
});

app.get('/api/posts/:slug', async (c) => {
  const slug = c.req.param('slug');
  const path = safePath(`src/content/blog/${slug}.md`, c.env);
  if (!path) return json({ error: '非法路径' }, 400);
  const { content } = await readFile(c.env, path);
  const { frontmatter, body } = splitFrontmatter(content);
  return json({ frontmatter, body });
});

app.post('/api/posts', async (c) => {
  const payload = await c.req.json();
  return writeArticle(c, payload, false);
});

app.put('/api/posts/:slug', async (c) => {
  const slug = c.req.param('slug');
  const payload = await c.req.json();
  payload.slug = slug;
  return writeArticle(c, payload, true);
});

app.delete('/api/posts/:slug', async (c) => {
  const slug = c.req.param('slug');
  const path = safePath(`src/content/blog/${slug}.md`, c.env);
  if (!path) return json({ error: '非法路径' }, 400);
  const { sha } = await readFile(c.env, path).catch(() => ({ sha: '' }));
  if (!sha) return json({ error: '文章不存在' }, 404);
  await deleteFile(c.env, path, sha);
  return json({ ok: true });
});

app.get('/api/assets', async (c) => {
  const path = c.req.query('path') || '';
  const safe = safePath(path, c.env);
  if (!safe) return json({ error: '非法路径' }, 400);
  const { content } = await readFile(c.env, safe);
  const encoding = safe.endsWith('.json') || safe.endsWith('.md') || safe.endsWith('.svg') ? 'utf8' : 'base64';
  // content 此时已是 UTF-8 解码；图片需要回 base64
  if (encoding === 'base64') {
    const bytes = new TextEncoder().encode(content);
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return json({ content: btoa(bin), encoding: 'base64' });
  }
  return json({ content, encoding: 'utf8' });
});

app.post('/api/assets', async (c) => {
  const { path, content, encoding } = await c.req.json();
  const safe = safePath(path, c.env);
  if (!safe) return json({ error: '非法路径' }, 400);
  const text = encoding === 'base64' ? new TextDecoder().decode(Uint8Array.from(atob(content), (x) => x.charCodeAt(0))) : content;
  const files: FileToWrite[] = [{ path: safe, content: text }];
  const res = await commitFiles(c.env, files, `content: update asset ${safe}`);
  if (res.conflict) return json({ error: '内容已被他人修改，请刷新后重试' }, 409);
  return json({ ok: true });
});

// ---------------- 内部工具 ----------------
async function writeArticle(c: any, payload: any, isUpdate: boolean) {
  const slug = String(payload.slug || '').replace(/[^a-zA-Z0-9._-]/g, '-');
  if (!slug) return json({ error: '非法 slug' }, 400);
  const path = `src/content/blog/${slug}.md`;
  const frontmatter = payload.frontmatter || {};
  const body: string = payload.body || '';
  const md = `---\n${yaml.dump(frontmatter, { lineWidth: 1000, noRefs: true })}---\n\n${body}\n`;

  const files: FileToWrite[] = [{ path, content: md }];
  // 绘图 JSON + SVG
  const drawings = payload.drawings || {};
  for (const [id, d] of Object.entries<any>(drawings)) {
    const base = `public/images/drawings/${slug}-${id}`;
    files.push({ path: `${base}.json`, content: JSON.stringify(d.fabricJson, null, 2) });
    if (d.imagePath && d.imagePath.endsWith('.svg')) {
      // SVG 由前端随 assets 提供；若没有直接用 imagePath 对应 svg 内容
    }
  }
  // 资源（图片 / svg）
  const assets = payload.assets || {};
  for (const [p, a] of Object.entries<any>(assets)) {
    const safe = safePath(p, c.env);
    if (!safe) continue;
    const text = a.encoding === 'base64'
      ? new TextDecoder().decode(Uint8Array.from(atob(a.content), (x) => x.charCodeAt(0)))
      : a.content;
    files.push({ path: safe, content: text });
  }

  const res = await commitFiles(c.env, files, `content: ${isUpdate ? 'update' : 'create'} ${slug}`);
  if (res.conflict) return json({ error: '内容已被他人修改，请刷新后重试' }, 409);
  return json({ slug });
}

function splitFrontmatter(raw: string): { frontmatter: any; body: string } {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: raw };
  try {
    return { frontmatter: yaml.load(m[1]) || {}, body: m[2] };
  } catch {
    return { frontmatter: {}, body: raw };
  }
}

function parseFrontmatter(raw: string): any {
  return splitFrontmatter(raw).frontmatter;
}

function fmtDate(v: any): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export default app;
