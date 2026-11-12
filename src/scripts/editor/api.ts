/**
 * 编辑器 <-> Cloudflare Worker 的 API 客户端。
 *
 * 所有写操作都需要服务端校验会话与白名单；前端不持有任何 GitHub 令牌。
 * 任何写入失败都会抛出带 message 的错误，由上层 UI 显示，不伪造成功。
 */
import { WORKER_BASE } from './config';
import type { AuthStatus, PostMeta, PostPayload } from '../../lib/editor-types';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${WORKER_BASE}${path}`, {
    credentials: 'include',
    mode: 'cors',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    const err = new Error('未登录：请先以站长账号登录') as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('无权限：当前账号不在站长白名单') as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error || '';
    } catch {
      /* ignore */
    }
    const err = new Error(detail || `请求失败（${res.status}）`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return undefined as T;
}

export const api = {
  /** 当前登录状态（未登录 401，非白名单 403，正常返回 AuthStatus） */
  async me(): Promise<AuthStatus> {
    try {
      return await request<AuthStatus>('/auth/me');
    } catch (e) {
      const status = (e as any).status;
      if (status === 401 || status === 403) return { authenticated: false };
      throw e;
    }
  },

  /** 跳转到 Worker 登录入口（由 Worker 完成 GitHub OAuth 跳转） */
  login(): void {
    const back = encodeURIComponent(window.location.href);
    window.location.href = `${WORKER_BASE}/auth/login?redirect=${back}`;
  },

  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
  },

  /** 文章元信息列表（含草稿，仅站长可见） */
  async listPosts(): Promise<PostMeta[]> {
    return request<PostMeta[]>('/api/posts');
  },

  /** 拉取单篇文章完整内容（frontmatter + body markdown） */
  async getPost(slug: string): Promise<{ frontmatter: any; body: string }> {
    return request<{ frontmatter: any; body: string }>(`/api/posts/${encodeURIComponent(slug)}`);
  },

  /** 新建文章 */
  async createPost(payload: PostPayload): Promise<{ slug: string }> {
    return request<{ slug: string }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** 更新文章（带冲突检测：Worker 端比对 SHA） */
  async updatePost(slug: string, payload: PostPayload): Promise<{ slug: string }> {
    return request<{ slug: string }>(`/api/posts/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /** 删除文章（二次确认由 UI 负责；Worker 端再次校验权限） */
  async deletePost(slug: string): Promise<void> {
    await request(`/api/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' });
  },

  /** 读取单个资源文件（如绘图 JSON），用于文章页二次编辑 */
  async getAsset(path: string): Promise<{ content: string; encoding: 'base64' | 'utf8' }> {
    return request<{ content: string; encoding: 'base64' | 'utf8' }>(
      `/api/assets?path=${encodeURIComponent(path)}`,
    );
  },

  /** 写入单个资源文件（图片 / 绘图 SVG·JSON），用于文章页更新绘图 */
  async uploadAsset(
    path: string,
    content: string,
    encoding: 'base64' | 'utf8',
  ): Promise<void> {
    await request('/api/assets', {
      method: 'POST',
      body: JSON.stringify({ path, content, encoding }),
    });
  },
};
