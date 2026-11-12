/**
 * Tiptap 自定义节点：drawing。
 *
 * 编辑器里它是一个原子块（atom），展示时用 <div data-drawing> 渲染成一张预览图；
 * 序列化回 Markdown 时输出 `:::drawing{...}` 容器（与 Astro 端 remark 插件互认）。
 */
import { Node, mergeAttributes } from '@tiptap/core';

export interface DrawingOptions {
  markdown?: {
    serialize?: (state: any, node: any) => void;
  };
}

export const DrawingNode = Node.create<DrawingOptions>({
  name: 'drawing',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: '' },
      data: { default: '' },
      width: { default: 1200 },
      height: { default: 800 },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-drawing]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { src, width, height, caption } = node.attrs as any;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-drawing': '',
        class: 'editor-drawing',
        contenteditable: 'false',
        style: `max-width:${width}px;margin:24px auto;border:1px solid var(--c-border, #e3e3e8);border-radius:12px;overflow:hidden;background:#fff;`,
      }),
      [
        'img',
        {
          src,
          alt: caption || '绘图',
          style: 'width:100%;height:auto;display:block;',
        },
      ],
      caption
        ? ['figcaption', { style: 'padding:8px 12px;font-size:13px;color:#666;text-align:center;' }, caption]
        : '',
    ];
  },

  addOptions() {
    return {
      markdown: {
        // 输出规范的 `:::drawing{...}` 写法
        serialize(state: any, node: any) {
          const a = node.attrs;
          const attrs =
            `src="${a.src}" data="${a.data}" width="${a.width}" height="${a.height}"`;
          state.write(`:::drawing{${attrs}}`);
          state.ensureNewLine();
          state.write(a.caption || '');
          state.ensureNewLine();
          state.write(':::');
          state.closeBlock(node);
        },
      },
    };
  },
});
