import { describe, it, expect } from 'vitest';
import {
  buildDrawingContainer,
  extractDrawingAttrs,
  preprocessForEditor,
  normalizeDrawingMarkdown,
  tiptapToMarkdown,
} from '../src/scripts/editor/markdown';

describe('drawing markdown container', () => {
  const attrs = {
    src: '/images/drawings/post-1.svg',
    data: '/images/drawings/post-1.json',
    width: 1200,
    height: 800,
  };
  const caption = '示意图：模块依赖';

  it('buildDrawingContainer 生成规范容器', () => {
    const md = buildDrawingContainer(attrs, caption);
    expect(md).toBe(
      ':::drawing{src="/images/drawings/post-1.svg" data="/images/drawings/post-1.json" width="1200" height="800"}\n示意图：模块依赖\n:::',
    );
  });

  it('extractDrawingAttrs 能还原属性', () => {
    const md = buildDrawingContainer(attrs, caption);
    const parsed = extractDrawingAttrs(md);
    expect(parsed).toEqual({ ...attrs, caption });
  });

  it('preprocessForEditor 把容器转成 Tiptap 可识别的 div', () => {
    const md = buildDrawingContainer(attrs, caption);
    const html = preprocessForEditor(md);
    expect(html).toContain('<div data-drawing');
    expect(html).toContain('src="/images/drawings/post-1.svg"');
    expect(html).toContain('示意图：模块依赖</div>');
  });

  it('normalizeDrawingMarkdown 把兜底 div 还原为规范容器（往返）', () => {
    const original = buildDrawingContainer(attrs, caption);
    const asDiv = preprocessForEditor(original);
    const back = normalizeDrawingMarkdown(asDiv);
    const parsed = extractDrawingAttrs(back);
    expect(parsed).toEqual({ ...attrs, caption });
  });

  it('normalizeDrawingMarkdown 对已是规范的容器保持不变', () => {
    const original = buildDrawingContainer(attrs, caption);
    expect(normalizeDrawingMarkdown(original)).toBe(original);
  });

  it('caption 含特殊字符时仍可往返', () => {
    const cap = 'A & B <C> "D"';
    const original = buildDrawingContainer(attrs, cap);
    const round = normalizeDrawingMarkdown(preprocessForEditor(original));
    const parsed = extractDrawingAttrs(round);
    expect(parsed?.caption).toBe(cap);
  });
});

describe('tiptapToMarkdown（Tiptap JSON → Markdown）', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '标题' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '普通' },
          { type: 'text', text: '加粗', marks: [{ type: 'bold' }] },
          { type: 'text', text: '链接', marks: [{ type: 'link', attrs: { href: 'https://x.com' } }] },
        ],
      },
      {
        type: 'drawing',
        attrs: {
          src: '/images/drawings/p-1.svg',
          data: '/images/drawings/p-1.json',
          width: 1200,
          height: 800,
          caption: '图一',
        },
      },
    ],
  };

  it('把绘图节点输出为规范的 :::drawing 容器', () => {
    const md = tiptapToMarkdown(doc);
    expect(md).toContain(':::drawing{src="/images/drawings/p-1.svg"');
    expect(md).toContain('data="/images/drawings/p-1.json"');
    expect(md).toContain('图一');
    expect(md).toContain(':::');
  });

  it('标题与行内标记正确输出', () => {
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('## 标题');
    expect(md).toContain('**加粗**');
    expect(md).toContain('[链接](https://x.com)');
  });

  it('序列化结果可被 extractDrawingAttrs 还原', () => {
    const md = tiptapToMarkdown(doc);
    const parsed = extractDrawingAttrs(md);
    expect(parsed).toEqual({
      src: '/images/drawings/p-1.svg',
      data: '/images/drawings/p-1.json',
      width: 1200,
      height: 800,
      caption: '图一',
    });
  });
});
