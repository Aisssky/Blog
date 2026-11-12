/**
 * GitHub REST 客户端（仅服务端调用）。
 *
 * 写入流程：用 GitHub App 私钥换 Installation Token，再走 Contents / Git
 * Trees / Git Commits API 把「文章 + 绘图 JSON + SVG + 图片」一次性提交，
 * 形成单个完整提交。更新时做乐观并发检测，发现有人已改动则返回 409。
 */
import { b64utf8, makeAppJWT } from './crypto';

const API = 'https://api.github.com';

interface TokenCache {
  token: string;
  exp: number;
}
let cache: TokenCache | null = null;

export interface GithubEnv {
  GH_OWNER: string;
  GH_REPO: string;
  GH_BRANCH: string;
  GH_APP_ID: string;
  GH_APP_PRIVATE_KEY: string;
  GH_INSTALLATION_ID: string;
}

async function getInstallationToken(env: GithubEnv): Promise<string> {
  if (cache && cache.exp > Date.now() + 30_000) return cache.token;
  const jwt = await makeAppJWT(env.GH_APP_ID, env.GH_APP_PRIVATE_KEY);
  const res = await fetch(
    `${API}/app/installations/${env.GH_INSTALLATION_ID}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'blog-editor-worker',
      },
    },
  );
  if (!res.ok) throw new Error(`获取 Installation Token 失败（${res.status}）`);
  const data = (await res.json()) as { token: string; expires_at: string };
  cache = { token: data.token, exp: new Date(data.expires_at).getTime() };
  return data.token;
}

async function gh<T = any>(
  env: GithubEnv,
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const token = await getInstallationToken(env);
  const res = await fetch(`${API}/repos/${env.GH_OWNER}/${env.GH_REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'blog-editor-worker',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitHub ${method} ${path} → ${res.status} ${text.slice(0, 200)}`) as any;
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface FileToWrite {
  path: string;
  content: string; // UTF-8 原文
}

export interface FileInfo {
  content: string; // UTF-8 解码后
  sha: string;
}

/** 读取文件（自动 base64 解码） */
export async function readFile(env: GithubEnv, path: string): Promise<FileInfo> {
  const data = await gh<{ content: string; sha: string }>(
    env,
    `/contents/${encodeURIComponent(path)}?ref=${env.GH_BRANCH}`,
  );
  const decoded = atob(data.content.replace(/\s/g, ''));
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return { content: new TextDecoder().decode(bytes), sha: data.sha };
}

/** 列出目录下的文件（仅返回 type=file） */
export async function listFiles(env: GithubEnv, dir: string): Promise<{ name: string; path: string }[]> {
  const data = await gh<{ name: string; path: string; type: string }[]>(
    env,
    `/contents/${encodeURIComponent(dir)}?ref=${env.GH_BRANCH}`,
  );
  return data.filter((f) => f.type === 'file').map((f) => ({ name: f.name, path: f.path }));
}

export async function getRefSha(env: GithubEnv): Promise<string> {
  const data = await gh<{ object: { sha: string } }>(env, `/git/refs/heads/${env.GH_BRANCH}`);
  return data.object.sha;
}

/** 把多个文件作为一次提交写入（单提交、完整） */
export async function commitFiles(
  env: GithubEnv,
  files: FileToWrite[],
  message: string,
): Promise<{ conflict: boolean }> {
  const baseSha = await getRefSha(env);
  const tree = files.map((f) => ({
    path: f.path,
    mode: '100644',
    type: 'blob',
    content: b64utf8(f.content),
    encoding: 'base64',
  }));
  const treeRes = await gh<{ sha: string }>(env, `/git/trees`, 'POST', {
    tree,
    base_tree: baseSha,
  });
  const commitRes = await gh<{ sha: string }>(env, `/git/commits`, 'POST', {
    message,
    tree: treeRes.sha,
    parents: [baseSha],
  });
  // 乐观并发：提交前再确认 main 没被别人推进，否则视为冲突
  const current = await getRefSha(env);
  if (current !== baseSha) {
    return { conflict: true };
  }
  try {
    await gh(env, `/git/refs/heads/${env.GH_BRANCH}`, 'PATCH', { sha: commitRes.sha });
  } catch (e: any) {
    // 检查通过后仍有极小窗口被并发推进，GitHub 会拒绝非快进更新（422）。
    // 统一按冲突处理，前端据此提示「刷新后重试」。
    if (e.status === 422) return { conflict: true };
    throw e;
  }
  // 清缓存以便下次写入拿到新 base
  cache = null;
  return { conflict: false };
}

/** 删除文件（需提供当前 sha，GitHub 会校验，避免误删他人改动） */
export async function deleteFile(env: GithubEnv, path: string, sha: string): Promise<void> {
  await gh(env, `/contents/${encodeURIComponent(path)}`, 'DELETE', {
    message: `content: delete ${path}`,
    sha,
    branch: env.GH_BRANCH,
  });
}
