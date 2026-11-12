/**
 * remark 插件：把文章里的 `:::drawing` 容器转成展示用的 HTML。
 *
 * 写法（与编辑器序列化保持一致）：
 *
 *   :::drawing{src="/images/drawings/x.svg" data="/images/drawings/x.json" width="1200" height="800"}
 *   示意图说明（caption）
 *   :::
 *
 * 转换结果（img 的 src 由下游 rehype-base-prefix 自动加 base，
 * 但 data-drawing-json 不在它的改写清单里，所以这里直接拼好 base）：
 *
 *   <figure class="drawing-embed" data-drawing-json="/test/images/drawings/x.json" style="...">
 *     <img src="/images/drawings/x.svg" alt="caption" loading="lazy" style="..." />
 *     <figcaption>caption</figcaption>
 *   </figure>
 *
 * 普通访客只看这张图；站长登录后由文章页的客户端脚本读取
 * data-drawing-json 拉取 Fabric JSON 进行二次编辑。
 */

const CONTAINER_RE =
  /^:::drawing\s*(?:\{([^}]*)\})?\s*\n([\s\S]*?)\n:::\s*$/;

const ATTR_RE = /(\w+)\s*=\s*("([^"]*)"|'([^']*)'|(\S+))/g;

function parseAttrs(raw) {
  const out = {};
  if (!raw) return out;
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    const key = m[1];
    const value = m[3] ?? m[4] ?? m[5] ?? '';
    out[key] = value;
  }
  return out;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFigure(attrs, caption, base) {
  const src = attrs.src || '';
  const data = attrs.data || '';
  const width = Number.parseInt(attrs.width, 10) || 1200;
  const height = Number.parseInt(attrs.height, 10) || 800;
  const normBase = (base || '').replace(/\/+$/, '');
  const dataAttr = data ? ` data-drawing-json="${normBase}${data}"` : '';
  const cap = (caption || '').trim();
  const capHtml = cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : '';
  return (
    `<figure class="drawing-embed"${dataAttr} style="max-width:100%;margin:28px auto;">` +
    `<img src="${escapeHtml(src)}" alt="${escapeHtml(cap)}" loading="lazy" ` +
    `style="width:100%;height:auto;max-width:${width}px;display:block;margin:0 auto;" />` +
    capHtml +
    `</figure>`
  );
}

export default function remarkDrawing(options = {}) {
  const base = options.base || '';

  function walk(children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node && node.type === 'paragraph' && Array.isArray(node.children)) {
        const text = node.children
          .filter((c) => c.type === 'text')
          .map((c) => c.value)
          .join('');
        const match = CONTAINER_RE.exec(text);
        if (match) {
          const attrs = parseAttrs(match[1] || '');
          const caption = match[2] || '';
          // 整段替换为 html 节点
          children[i] = {
            type: 'html',
            value: buildFigure(attrs, caption, base),
          };
        }
      }
      if (node && Array.isArray(node.children)) walk(node.children);
    }
  }

  return (tree) => {
    if (tree && Array.isArray(tree.children)) walk(tree.children);
    return tree;
  };
}
