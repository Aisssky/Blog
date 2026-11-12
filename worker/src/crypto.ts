/**
 * Worker 端加密工具：base64 编解码、会话 Cookie 签名、GitHub App JWT 签发。
 *
 * 全部使用 Web Crypto（Workers 运行时原生支持），不依赖 Node crypto。
 * 私钥 / 密钥只来自 env，绝不下发到浏览器。
 */

export function b64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(input: string): Uint8Array {
  const norm = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '==='.slice((norm.length + 3) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** UTF-8 字符串 → 标准 base64（GitHub Git API 要求 base64 内容） */
export function b64utf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 签名会话：payload 经 base64url 后追加 HMAC-SHA256 签名 */
export async function signSession(payload: object, secret: string): Promise<string> {
  const body = b64urlEncode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)),
  );
  return `${body}.${b64urlEncode(sig)}`;
}

export interface SessionData {
  login: string;
  exp: number;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<SessionData | null> {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)),
  );
  if (!timingSafeEqual(b64urlEncode(expected), sig)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SessionData;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 用 GitHub App 私钥签发 RS256 JWT（用于换取 Installation Token） */
export async function makeAppJWT(appId: string, pem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 30, exp: now + 540, iss: appId };
  const enc = (o: object) => b64urlEncode(JSON.stringify(o));
  const signingInput = `${enc(header)}.${enc(payload)}`;

  const pemClean = pem.replace(/-----(BEGIN|END) [A-Z ]*PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const der = b64urlDecode(pemClean.replace(/-/g, '+').replace(/_/g, '/')); // pemClean is std base64
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(signingInput),
    ),
  );
  return `${signingInput}.${b64urlEncode(sig)}`;
}
