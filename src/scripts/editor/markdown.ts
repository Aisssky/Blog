/**
 * Markdown 与 `:::drawing` 容器的纯字符串转换。
 *
 * 这些函数是纯函数，不依赖 DOM / Tiptap，便于单元测试（见 worker 测试与
 * src/scripts/editor 测试）。它们保证：
 *   - 编辑器加载前，把 `:::drawing{...}` 转成 Tiptap 能识别的 <div data-drawing>（带 caption）
 *   - 保存前，把任何残留的 <div data-drawing> 归一成规范的 `:::drawing{...}` 写法
 *
 * 与 src/lib/remark-drawing.mjs 的解析规则保持一致。
 */

const CONTAINER_RE = /^:::drawing\s*(?:\{([^}]*)\})?\s*\n([\s\S]*?)\n:::\s*$/;
// 非锚定版本：用于从整篇 markdown 中提取（可能位于中间的）绘图块
const CONTAINER_RE_LOOSE = /:::drawing\s*(?:\{([^}]*)\})?\s*\n([\s\S]*?)\n:::/;
const ATTR_RE = /(\w+)\s*=\s*("([^"]*)"|'([^']*)'|(\S+))/g;

export interface DrawingAttrs {
  src: string;
  data: string;
  width: number;
  height: number;
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  let m: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    out[m[1]] = m[3] ?? m[4] ?? m[5] ?? '';
  }
  return out;
}

function escapeAttr(v: string): string {
  return String(v).replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** 把单个 `:::drawing` 块转成编辑器可用的 <div data-drawing> 形式 */
export function drawingBlockToDiv(md: string): string {
  const m = CONTAINER_RE.exec(md);
  if (!m) return md;
  const attrs = parseAttrs(m[1] || '');
  const caption = (m[2] || '').trim();
  const src = attrs.src || '';
  const data = attrs.data || '';
  const width = attrs.width || '1200';
  const height = attrs.height || '800';
  return (
    `<div data-drawing src="${escapeAttr(src)}" data="${escapeAttr(data)}" ` +
    `width="${escapeAttr(width)}" height="${escapeAttr(height)}">${escapeHtml(caption)}</div>`
  );
}

/** 编辑器加载前：把所有 `:::drawing` 块替换成 <div data-drawing> */
export function preprocessForEditor(md: string): string {
  if (!md) return md;
  // 按行处理，逐块匹配（块以 :::drawing 起、::: 止）
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith(':::drawing')) {
      // 收集到下一个 :::
      const block: string[] = [lines[i]];
      i++;
      while (i < lines.length && !lines[i].startsWith(':::')) {
        block.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].startsWith(':::')) {
        block.push(lines[i]);
        i++;
      }
      const blockText = drawingBlockToDiv(block.join('\n'));
      out.push(blockText);
    } else {
      out.push(lines[i]);
      i++;
    }
  }
  return out.join('\n');
}

/** 归一化：把 <div data-drawing> 兜底写法还原为规范的 `:::drawing{...}` */
export function normalizeDrawingMarkdown(md: string): string {
  if (!md) return md;
  // 先处理兜底 HTML（来自某些序列化路径）
  const htmlRe =
    /<div\s+data-drawing\s+src="([^"]*)"\s+data="([^"]*)"\s+width="([^"]*)"\s+height="([^"]*)">([\s\S]*?)<\/div>/g;
  let result = md.replace(htmlRe, (_m, src, data, width, height, caption) => {
    return buildDrawingContainer(
      { src: unescapeHtml(src), data: unescapeHtml(data), width: Number(width) || 1200, height: Number(height) || 800 },
      unescapeHtml(caption.trim()),
    );
  });

  // 再确保规范块本身格式正确（已经是 :::drawing 的保持不变）
  result = result.replace(/:::drawing\s*(?:\{([^}]*)\})?\s*\n([\s\S]*?)\n:::/g, (full) => {
    // 已是规范形式，原样返回（避免二次转义）
    return full;
  });

  return result;
}

/** 构造规范的 `:::drawing{...}` 容器文本 */
export function buildDrawingContainer(attrs: DrawingAttrs, caption: string): string {
  const a = `src="${attrs.src}" data="${attrs.data}" width="${attrs.width}" height="${attrs.height}"`;
  return `:::drawing{${a}}\n${caption}\n:::`;
}

/** 反向：从 `:::drawing` 块提取属性（供测试与运行时使用） */
export function extractDrawingAttrs(md: string): (DrawingAttrs & { caption: string }) | null {
  const m = CONTAINER_RE_LOOSE.exec(md);
  if (!m) return null;
  const attrs = parseAttrs(m[1] || '');
  return {
    src: attrs.src || '',
    data: attrs.data || '',
    width: Number(attrs.width) || 1200,
    height: Number(attrs.height) || 800,
    caption: (m[2] || '').trim(),
  };
}

/**
 * Tiptap JSON → Markdown（自实现，完全可控、可单测）。
 *
 * 为什么不用 tiptap-markdown 的自定义节点序列化：它对绘图节点（atom）的
 * 兜底写法可能丢失 src/data 属性。这里直接遍历 ProseMirror JSON，对 drawing
 * 节点输出规范的 `:::drawing{...}`，其余节点按标准 Markdown 输出。
 * 加载方向（Markdown → Tiptap）仍由 tiptap-markdown 负责解析。
 */
function applyMarks(textNode: any): string {
  let text = textNode.text || '';
  const marks: any[] = textNode.marks || [];
  const has = (t: string) => marks.some((m) => m.type === t);
  if (has('code')) return '`' + text + '`';
  if (has('bold')) text = '**' + text + '**';
  if (has('italic')) text = '*' + text + '*';
  if (has('strike')) text = '~~' + text + '~~';
  if (has('underline')) text = '<u>' + text + '</u>';
  const link = marks.find((m) => m.type === 'link');
  if (link) text = `[${text}](${link.attrs?.href || ''})`;
  return text;
}

function inline(node: any): string {
  if (!node.content) return '';
  return node.content
    .map((c: any) => {
      if (c.type === 'text') return applyMarks(c);
      if (c.type === 'hardBreak') return '  \n';
      return inline(c);
    })
    .join('');
}

export function tiptapToMarkdown(node: any): string {
  if (!node) return '';
  switch (node.type) {
    case 'doc':
      return node.content.map(tiptapToMarkdown).filter(Boolean).join('\n\n').trim();
    case 'paragraph':
      return inline(node);
    case 'heading': {
      const level = node.attrs?.level || 1;
      const body = inline(node);
      return body ? '#'.repeat(level) + ' ' + body : '';
    }
    case 'blockquote':
      return node.content
        .map(tiptapToMarkdown)
        .join('\n\n')
        .split('\n')
        .map((l) => '> ' + l)
        .join('\n');
    case 'bulletList':
      return node.content.map((li: any) => '- ' + tiptapToMarkdown(li).replace(/^\s*/, '')).join('\n');
    case 'orderedList':
      return node.content
        .map((li: any, i: number) => `${i + 1}. ` + tiptapToMarkdown(li).replace(/^\s*/, ''))
        .join('\n');
    case 'listItem':
      return node.content.map(tiptapToMarkdown).join('\n\n');
    case 'codeBlock':
      return '```\n' + (node.content?.[0]?.text || '') + '\n```';
    case 'horizontalRule':
      return '---';
    case 'image':
      return `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})`;
    case 'drawing':
      return buildDrawingContainer(
        {
          src: node.attrs?.src || '',
          data: node.attrs?.data || '',
          width: node.attrs?.width || 1200,
          height: node.attrs?.height || 800,
        },
        node.attrs?.caption || '',
      );
    default:
      return node.content ? node.content.map(tiptapToMarkdown).join('') : '';
  }
}
