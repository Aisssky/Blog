/**
 * 编辑器 / 绘图 / Worker 接口共享的数据类型。
 *
 * 这些类型同时被：
 *   - 浏览器端编辑器（src/scripts/editor/*）使用
 *   - Cloudflare Worker（worker/src/*）使用
 * 保证两端对文章、绘图、资源的结构认知一致。
 */

/** 单个绘图的可恢复数据。严禁只存 PNG 而丢弃 fabricJson。 */
export interface DrawingData {
  /** 格式版本，便于未来迁移 */
  version: number;
  /** 画布逻辑宽（用于展示时保持宽高比） */
  width: number;
  /** 画布逻辑高 */
  height: number;
  /** Fabric.js 画布序列化结果，重新打开时可 loadFromJSON 还原 */
  fabricJson: Record<string, unknown>;
  /** 最终展示资源（SVG 优先，回退 PNG），相对站点根的路径 */
  imagePath?: string;
  /** 顶部/底部留白等元信息，预留 */
  background?: string;
}

/** 文章 Frontmatter，与 src/content.config.ts 的 blog schema 对齐。 */
export interface PostFrontmatter {
  title: string;
  description?: string;
  /** YYYY-MM-DD */
  pubDate: string;
  /** YYYY-MM-DD，可空 */
  updatedDate?: string;
  category?: string;
  tags: string[];
  cover?: string;
  subtitle?: string;
  copyright?: string;
  draft: boolean;
  toc: boolean;
}

/** 绘图容器在 Markdown 里的写法（见 remark-drawing.mjs）：
 *
 *   :::drawing{src="/images/drawings/x.svg" data="/images/drawings/x.json" width="1200" height="800"}
 *   示意图说明
 *   :::
 */
export interface DrawingDirective {
  src: string;
  data: string;
  width: number;
  height: number;
  caption: string;
}

/** 编辑器保存到 Worker 的一篇文章（连同绘图与资源）。 */
export interface PostPayload {
  slug: string;
  frontmatter: PostFrontmatter;
  /** 正文 Markdown，绘图以 :::drawing 容器表示 */
  body: string;
  /** 本次保存涉及的绘图数据，key = 文件名（不含扩展名），如 "my-post-1" */
  drawings: Record<string, DrawingData>;
  /** 本次新增/更新的图片等二进制资源，key = 站点相对路径 */
  assets: Record<string, { content: string; encoding: 'base64' | 'utf8' }>;
  /** 是否发布（draft=false）还是存草稿（draft=true） */
  publish: boolean;
}

/** Worker 返回的文章元信息（列表/详情用，不含正文）。 */
export interface PostMeta {
  slug: string;
  title: string;
  description?: string;
  pubDate: string;
  updatedDate?: string;
  category?: string;
  tags: string[];
  draft: boolean;
}

/** Worker /auth/me 返回。未登录时 HTTP 401，非白名单 403。 */
export interface AuthStatus {
  authenticated: boolean;
  login?: string;
  isOwner?: boolean;
}
