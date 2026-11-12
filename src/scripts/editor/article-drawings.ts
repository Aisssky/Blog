/**
 * 文章页绘图二次编辑（仅站长可见）。
 *
 * 普通访客只看 SVG；站长登录后，每个绘图右下角出现「编辑绘图」按钮：
 * 拉取 Fabric JSON（data-drawing-json）→ 打开 Fabric 画布 → 保存时把
 * 新的 JSON + SVG 通过 Worker 写回同一路径。文章 Markdown 无需改动
 * （它已经引用了固定路径）。
 */
import { api } from './api';
import type { DrawingData } from '../../lib/editor-types';

export async function initArticleDrawings(): Promise<void> {
  const embeds = Array.from(
    document.querySelectorAll<HTMLElement>('.drawing-embed[data-drawing-json]'),
  );
  if (embeds.length === 0) return;

  const status = await api.me();
  if (!status.authenticated || !status.isOwner) return;

  embeds.forEach((fig) => {
    const jsonPath = fig.getAttribute('data-drawing-json')!;
    fig.style.position = 'relative';
    const btn = document.createElement('button');
    btn.textContent = '编辑绘图';
    btn.style.cssText =
      'position:absolute;right:8px;bottom:8px;font-size:12px;padding:4px 10px;border:1px solid #3b5bdb;background:#3b5bdb;color:#fff;border-radius:8px;cursor:pointer;opacity:.85;';
    fig.appendChild(btn);
    btn.addEventListener('click', () => openEditor(fig, jsonPath));
  });
}

async function openEditor(fig: HTMLElement, jsonPath: string): Promise<void> {
  const { DrawingEditor } = await import('./drawing');
  const img = fig.querySelector('img');
  const initial = await api.getAsset(jsonPath).then((r) => {
    try {
      const parsed = JSON.parse(r.content) as DrawingData;
      return parsed;
    } catch {
      return undefined;
    }
  }).catch(() => undefined);

  new DrawingEditor({
    initial: initial ?? undefined,
    onSave: async (r) => {
      const svgPath = jsonPath.replace(/\.json$/, '.svg');
      try {
        await api.uploadAsset(jsonPath, JSON.stringify(r.fabricJson), 'utf8');
        await api.uploadAsset(svgPath, r.svg, 'utf8');
        if (img) img.src = `${svgPath}?t=${Date.now()}`;
        alert('绘图已更新，刷新页面即可看到新版本。');
      } catch (e: any) {
        alert('保存失败：' + (e.message || '未知错误'));
      }
    },
    onClose: () => {},
  }).open();
}
