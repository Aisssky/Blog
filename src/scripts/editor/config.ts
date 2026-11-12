/**
 * 编辑器前端配置。
 *
 * Worker 地址不是密钥，但也不应写死在源码里难以修改。
 * 解析顺序：
 *   1. import.meta.env.PUBLIC_EDITOR_WORKER_URL（构建期注入，可选）
 *   2. window.BLOG_EDITOR_WORKER_URL（运行时覆盖，可选）
 *   3. 内置占位（部署后改成你的真实 Worker 地址）
 */
const fromEnv = (import.meta.env.PUBLIC_EDITOR_WORKER_URL as string | undefined) ?? '';
const fromWindow = (typeof window !== 'undefined' && (window as any).BLOG_EDITOR_WORKER_URL) || '';

export const WORKER_BASE: string =
  (fromWindow || fromEnv || 'https://blog-editor.aisssky.workers.dev').replace(/\/+$/, '');

/** 允许的图片类型（与 Worker 端校验保持一致） */
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

/** 单张图片上限 5MB（与 Worker 端一致） */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** 绘图默认画布尺寸 */
export const DRAWING_DEFAULT_SIZE = { width: 1200, height: 800 };
