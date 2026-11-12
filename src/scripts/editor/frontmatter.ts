/**
 * 文章 Frontmatter 表单（与 src/content.config.ts 的 blog schema 对齐）。
 * 纯 DOM + 原生输入，不引入额外依赖。
 */
import type { PostFrontmatter } from '../../lib/editor-types';

export function blankFrontmatter(): PostFrontmatter {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, '0');
  const d = String(today.getUTCDate()).padStart(2, '0');
  return {
    title: '未命名文章',
    description: '',
    pubDate: `${y}-${m}-${d}`,
    updatedDate: '',
    category: '',
    tags: [],
    cover: '',
    subtitle: '',
    copyright: '',
    draft: true,
    toc: true,
  };
}

export function renderFrontmatterForm(fm: PostFrontmatter): string {
  return `
  <div class="fm-grid">
    <label>标题*<input name="title" value="${esc(fm.title)}" required></label>
    <label>简介<input name="description" value="${esc(fm.description ?? '')}"></label>
    <label>发布日期*<input name="pubDate" type="date" value="${esc(fm.pubDate)}"></label>
    <label>更新日期<input name="updatedDate" type="date" value="${esc(fm.updatedDate ?? '')}"></label>
    <label>分类<input name="category" value="${esc(fm.category ?? '')}"></label>
    <label>标签(逗号分隔)<input name="tags" value="${esc((fm.tags ?? []).join(', '))}"></label>
    <label>封面图<input name="cover" value="${esc(fm.cover ?? '')}" placeholder="/images/uploads/xxx.webp"></label>
    <label>副标题<input name="subtitle" value="${esc(fm.subtitle ?? '')}"></label>
    <label>版权署名<input name="copyright" value="${esc(fm.copyright ?? '')}"></label>
    <label class="fm-check"><input name="draft" type="checkbox" ${fm.draft ? 'checked' : ''}> 草稿</label>
    <label class="fm-check"><input name="toc" type="checkbox" ${fm.toc ? 'checked' : ''}> 显示目录</label>
  </div>`;
}

export function readFrontmatterForm(root: HTMLElement): PostFrontmatter {
  const q = (n: string) => (root.querySelector(`[name="${n}"]`) as HTMLInputElement | null)?.value ?? '';
  const tagsRaw = q('tags').split(',').map((s) => s.trim()).filter(Boolean);
  return {
    title: q('title') || '未命名文章',
    description: q('description') || undefined,
    pubDate: q('pubDate') || new Date().toISOString().slice(0, 10),
    updatedDate: q('updatedDate') || undefined,
    category: q('category') || undefined,
    tags: tagsRaw,
    cover: q('cover') || undefined,
    subtitle: q('subtitle') || undefined,
    copyright: q('copyright') || undefined,
    draft: (root.querySelector('[name="draft"]') as HTMLInputElement)?.checked ?? true,
    toc: (root.querySelector('[name="toc"]') as HTMLInputElement)?.checked ?? true,
  };
}

function esc(v: string): string {
  return String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
