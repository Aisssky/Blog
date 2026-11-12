/**
 * 编辑器主控制器（owner.ts）。
 *
 * 由 /blog/ 页面在底层通过一个极小的 <script> 动态 import 本模块，
 * 因此普通访客不会下载 Tiptap / Fabric。
 *
 * 职责：
 *   - 渲染低调的站长入口，未登录时跳转 Worker OAuth
 *   - 登录后提供「编辑模式」开关、新建 / 编辑 / 删除文章
 *   - 管理 Frontmatter 表单与 Tiptap 正文
 *   - 插入 / 二次编辑绘图（Fabric.js）
 *   - 保存草稿 / 发布，处理未保存提示与并发冲突
 *
 * 所有写操作经 api.ts 走 Worker；前端不持有任何 GitHub 令牌。
 */
import { api } from './api';
import { blankFrontmatter, renderFrontmatterForm, readFrontmatterForm } from './frontmatter';
import type { DrawingData, PostFrontmatter, PostPayload } from '../../lib/editor-types';

const STYLE = `
.owner-bar{position:fixed;top:12px;right:14px;z-index:1200;display:flex;gap:8px;align-items:center;font-family:system-ui,sans-serif;}
.owner-bar button{font-size:13px;padding:6px 12px;border-radius:999px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.8);backdrop-filter:blur(8px);cursor:pointer;color:#222;}
.owner-bar button.primary{background:#3b5bdb;color:#fff;border-color:#3b5bdb;}
.owner-bar .who{font-size:12px;color:#444;background:rgba(255,255,255,.8);padding:4px 10px;border-radius:999px;}
.editor-overlay{position:fixed;inset:0;z-index:2000;background:rgba(18,20,26,.6);display:flex;align-items:stretch;justify-content:center;padding:18px;}
.editor-modal{background:#fff;border-radius:14px;width:min(1180px,98vw);height:96vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.45);}
.editor-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #ececf1;}
.editor-head .slug{font-size:13px;color:#888;flex:1;}
.editor-head button{font-size:13px;padding:7px 14px;border-radius:8px;border:1px solid #d7d7df;background:#f7f7fa;cursor:pointer;}
.editor-head button.primary{background:#3b5bdb;color:#fff;border-color:#3b5bdb;}
.editor-head button.ghost{background:#fff;}
.editor-status{font-size:12px;color:#666;min-width:84px;text-align:right;}
.editor-status.dirty{color:#e8590c;}
.editor-status.ok{color:#2f9e44;}
.editor-status.err{color:#e03131;}
.editor-fm{max-height:0;overflow:hidden;transition:max-height .2s;border-bottom:1px solid #ececf1;background:#fafafb;}
.editor-fm.open{max-height:420px;overflow:auto;}
.fm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px 18px;padding:14px 16px;}
.fm-grid label{display:flex;flex-direction:column;font-size:12px;color:#555;gap:3px;}
.fm-grid input[type=text],.fm-grid input[type=date]{padding:6px 8px;border:1px solid #d7d7df;border-radius:7px;font-size:13px;}
.fm-grid .fm-check{flex-direction:row;align-items:center;gap:6px;}
.editor-toolbar{display:flex;flex-wrap:wrap;gap:5px;padding:8px 12px;border-bottom:1px solid #ececf1;background:#fbfbfd;align-items:center;}
.editor-toolbar button{font-size:13px;min-width:30px;padding:5px 9px;border:1px solid #e0e0e6;border-radius:7px;background:#fff;cursor:pointer;}
.editor-toolbar button:hover{background:#f1f3ff;}
.editor-toolbar .sep{width:1px;height:20px;background:#e3e3e8;margin:0 3px;}
.editor-body{flex:1;overflow:auto;padding:18px 22px;}
.editor-body .ProseMirror{min-height:60vh;outline:none;line-height:1.7;font-size:16px;}
.editor-body .ProseMirror:focus{outline:none;}
.editor-body .ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#aaa;float:left;height:0;pointer-events:none;}
.editor-body .ProseMirror h1{font-size:28px;} .editor-body .ProseMirror h2{font-size:23px;} .editor-body .ProseMirror h3{font-size:19px;}
.editor-body .ProseMirror img{max-width:100%;}
.editor-body .ProseMirror .editor-drawing{border-radius:12px;}
.edit-panel{position:fixed;left:0;top:0;bottom:0;width:280px;background:#fff;z-index:1500;box-shadow:2px 0 16px rgba(0,0,0,.12);padding:16px;overflow:auto;font-family:system-ui,sans-serif;transform:translateX(-100%);transition:transform .2s;}
.edit-panel.open{transform:none;}
.edit-panel h3{font-size:15px;margin:0 0 10px;}
.edit-panel ul{list-style:none;padding:0;margin:0;}
.edit-panel li{padding:8px 6px;border-bottom:1px solid #f0f0f3;display:flex;justify-content:space-between;gap:6px;font-size:13px;}
.edit-panel li button{font-size:12px;padding:3px 8px;border:1px solid #d7d7df;border-radius:6px;background:#fff;cursor:pointer;}
`;

let editor: any = null;
let currentSlug = '';
let currentFrontmatter: PostFrontmatter = blankFrontmatter();
let drawings: Record<string, DrawingData> = {};
let assets: Record<string, { content: string; encoding: 'base64' | 'utf8' }> = {};
let dirty = false;
let editorOverlay: HTMLDivElement | null = null;
// 重依赖（Tiptap / Fabric）仅在进入编辑模式时动态加载，避免普通访客下载
let getMarkdownFn: ((e: any) => string) | null = null;
let insertDrawingFn: ((e: any, attrs: any) => void) | null = null;

function slugify(title: string): string {
  const base = title.trim().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return base || 'post';
}

function todaySlugPrefix(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function setStatus(text: string, cls = ''): void {
  const el = document.querySelector('.editor-status');
  if (el) {
    el.textContent = text;
    el.className = 'editor-status' + (cls ? ' ' + cls : '');
  }
  dirty = text === '未保存' || text === '编辑中';
}

export async function initEditor(): Promise<void> {
  if (document.getElementById('editor-style')) {
    return;
  }
  const s = document.createElement('style');
  s.id = 'editor-style';
  s.textContent = STYLE;
  document.head.appendChild(s);

  const bar = document.createElement('div');
  bar.className = 'owner-bar';
  document.body.appendChild(bar);

  const status = await api.me();
  if (status.authenticated && status.isOwner) {
    renderOwnerBar(bar, status.login!);
  } else {
    renderLoginBar(bar);
  }
}

function renderLoginBar(bar: HTMLElement): void {
  bar.innerHTML = `<button id="owner-login">站长登录</button>`;
  bar.querySelector('#owner-login')!.addEventListener('click', () => api.login());
}

function renderOwnerBar(bar: HTMLElement, login: string): void {
  bar.innerHTML = `
    <span class="who">${login}</span>
    <button id="owner-edit">编辑模式</button>
    <button id="owner-logout" class="ghost">退出</button>`;
  bar.querySelector('#owner-logout')!.addEventListener('click', async () => {
    await api.logout();
    location.reload();
  });
  bar.querySelector('#owner-edit')!.addEventListener('click', () => toggleEditPanel(bar));
}

async function toggleEditPanel(bar: HTMLElement): Promise<void> {
  let panel = document.querySelector<HTMLDivElement>('.edit-panel');
  if (panel?.classList.contains('open')) {
    panel.classList.remove('open');
    return;
  }
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'edit-panel';
    document.body.appendChild(panel);
  }
  const posts = await api.listPosts();
  panel.innerHTML = `
    <h3>文章管理</h3>
    <button id="ep-new" class="primary" style="margin-bottom:10px;width:100%;padding:8px;border-radius:8px;background:#3b5bdb;color:#fff;border:none;cursor:pointer;">+ 新建文章</button>
    <ul>
      ${posts
        .map(
          (p) =>
            `<li><span>${p.title}${p.draft ? '（草稿）' : ''}</span><span><button data-edit="${p.slug}">编辑</button><button data-del="${p.slug}">删</button></span></li>`,
        )
        .join('')}
    </ul>`;
  panel.classList.add('open');
  panel.querySelector('#ep-new')!.addEventListener('click', () => openEditor(''));
  panel.querySelectorAll<HTMLButtonElement>('button[data-edit]').forEach((b) =>
    b.addEventListener('click', () => openEditor(b.dataset.edit!)),
  );
  panel.querySelectorAll<HTMLButtonElement>('button[data-del]').forEach((b) =>
    b.addEventListener('click', async () => {
      const slug = b.dataset.del!;
      if (!confirm(`确定删除文章「${slug}」？此操作不可恢复。`)) return;
      await api.deletePost(slug);
      toggleEditPanel(bar);
      toggleEditPanel(bar);
    }),
  );
}

async function openEditor(slug: string): Promise<void> {
  drawings = {};
  assets = {};
  currentSlug = slug;
  let body = '';
  if (slug) {
    const post = await api.getPost(slug);
    currentFrontmatter = normalizeFrontmatter(post.frontmatter);
    body = post.body;
  } else {
    currentFrontmatter = blankFrontmatter();
    currentSlug = `${todaySlugPrefix()}-${slugify(currentFrontmatter.title)}`;
  }

  editorOverlay = document.createElement('div');
  editorOverlay.className = 'editor-overlay';
  editorOverlay.innerHTML = `
    <div class="editor-modal">
      <div class="editor-head">
        <button id="e-fm-toggle" class="ghost">元信息</button>
        <span class="slug">${currentSlug}</span>
        <span class="editor-status">未保存</span>
        <button id="e-draft" class="ghost">存草稿</button>
        <button id="e-publish" class="primary">发布</button>
        <button id="e-preview" class="ghost">预览</button>
        <button id="e-close" class="ghost">关闭</button>
      </div>
      <div class="editor-fm" id="e-fm">${renderFrontmatterForm(currentFrontmatter)}</div>
      <div class="editor-toolbar" id="e-toolbar"></div>
      <div class="editor-body"><div id="e-content"></div></div>
    </div>`;
  document.body.appendChild(editorOverlay);

  const fm = editorOverlay.querySelector('#e-fm')!;
  editorOverlay.querySelector('#e-fm-toggle')!.addEventListener('click', () => fm.classList.toggle('open'));

  const { createEditor, getMarkdown, insertDrawing } = await import('./tiptap-setup');
  editor = createEditor({
    element: editorOverlay.querySelector('#e-content') as HTMLElement,
    content: body,
    onUpdate: () => setStatus('未保存', 'dirty'),
  });
  getMarkdownFn = getMarkdown;
  insertDrawingFn = insertDrawing;
  setStatus('编辑中', 'dirty');

  buildToolbar(editorOverlay.querySelector('#e-toolbar') as HTMLElement);

  editorOverlay.querySelector('#e-close')!.addEventListener('click', () => closeEditor());
  editorOverlay.querySelector('#e-draft')!.addEventListener('click', () => save(false));
  editorOverlay.querySelector('#e-publish')!.addEventListener('click', () => save(true));
  editorOverlay.querySelector('#e-preview')!.addEventListener('click', () => preview());
}

function buildToolbar(tb: HTMLElement): void {
  const btn = (label: string, fn: () => void, title = '') => {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', fn);
    return b;
  };
  const sep = () => {
    const s = document.createElement('span');
    s.className = 'sep';
    return s;
  };
  tb.append(
    btn('B', () => editor.chain().focus().toggleBold().run(), '加粗'),
    btn('I', () => editor.chain().focus().toggleItalic().run(), '斜体'),
    btn('S', () => editor.chain().focus().toggleStrike().run(), '删除线'),
    btn('U', () => editor.chain().focus().toggleUnderline().run(), '下划线'),
    sep(),
    btn('H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run()),
    btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run()),
    btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run()),
    sep(),
    btn('•', () => editor.chain().focus().toggleBulletList().run(), '无序列表'),
    btn('1.', () => editor.chain().focus().toggleOrderedList().run(), '有序列表'),
    btn('❝', () => editor.chain().focus().toggleBlockquote().run(), '引用'),
    btn('</>', () => editor.chain().focus().toggleCodeBlock().run(), '代码块'),
    btn('`', () => editor.chain().focus().toggleCode().run(), '行内代码'),
    sep(),
    btn('🔗', () => {
      const url = prompt('链接地址');
      if (url) editor.chain().focus().setLink({ href: url }).run();
    }, '插入链接'),
    btn('🖼', () => {
      const url = prompt('图片地址');
      if (url) editor.chain().focus().setImage({ src: url }).run();
    }, '插入图片'),
    btn('―', () => editor.chain().focus().setHorizontalRule().run(), '分割线'),
    sep(),
    btn('↶', () => editor.chain().focus().undo().run(), '撤销'),
    btn('↷', () => editor.chain().focus().redo().run(), '重做'),
    sep(),
    btn('🎨 插入绘图', () => openDrawing(), '插入可编辑绘图'),
  );
}

async function openDrawing(): Promise<void> {
  const { DrawingEditor } = await import('./drawing');
  const id = `drawing-${Object.keys(drawings).length + 1}`;
  const editorForClosure = editor;
  const overlay = editorOverlay!;
  const svgPath = `/images/drawings/${currentSlug}-${id}.svg`;
  const jsonPath = `/images/drawings/${currentSlug}-${id}.json`;
  new DrawingEditor({
    onSave: (r) => {
      const data: DrawingData = {
        version: 1,
        width: r.width,
        height: r.height,
        fabricJson: r.fabricJson,
        imagePath: svgPath,
      };
      drawings[id] = data;
      assets[svgPath] = { content: r.svg, encoding: 'utf8' };
      assets[jsonPath] = { content: JSON.stringify(r.fabricJson), encoding: 'utf8' };
      insertDrawingFn?.(editorForClosure, {
        src: svgPath,
        data: jsonPath,
        width: r.width,
        height: r.height,
        caption: prompt('绘图说明文字（可选）', '') || '',
      });
      setStatus('未保存', 'dirty');
    },
    onClose: () => {},
  }).open();
  void overlay;
}

function preview(): void {
  const html = editor.getHTML();
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(`<html><head><meta charset="utf-8"><title>预览</title><style>body{font-family:system-ui;max-width:760px;margin:24px auto;padding:0 16px;line-height:1.7}</style></head><body>${html}</body></html>`);
    w.document.close();
  }
}

async function save(publish: boolean): Promise<void> {
  if (!editor) return;
  currentFrontmatter = readFrontmatterForm(editorOverlay!.querySelector('#e-fm') as HTMLElement);
  currentFrontmatter.draft = !publish;
  const body = getMarkdownFn!(editor);
  const payload: PostPayload = {
    slug: currentSlug,
    frontmatter: currentFrontmatter,
    body,
    drawings,
    assets,
    publish,
  };

  setStatus('保存中…');
  try {
    if (await postExists(currentSlug)) {
      await api.updatePost(currentSlug, payload);
    } else {
      await api.createPost(payload);
    }
    setStatus('保存成功', 'ok');
    dirty = false;
  } catch (e: any) {
    if (e.status === 409) {
      setStatus('内容冲突，已拉取最新', 'err');
      const fresh = await api.getPost(currentSlug);
      editor.commands.setContent(fresh.body);
      return;
    }
    setStatus('保存失败', 'err');
    alert('保存失败：' + (e.message || '未知错误'));
  }
}

async function postExists(slug: string): Promise<boolean> {
  try {
    await api.getPost(slug);
    return true;
  } catch {
    return false;
  }
}

function closeEditor(): void {
  if (dirty && !confirm('有未保存的修改，确定关闭？')) return;
  if (editor) {
    editor.destroy();
    editor = null;
  }
  editorOverlay?.remove();
  editorOverlay = null;
}

function normalizeFrontmatter(fm: any): PostFrontmatter {
  return {
    title: fm.title || '未命名文章',
    description: fm.description,
    pubDate: typeof fm.pubDate === 'string' ? fm.pubDate : new Date(fm.pubDate).toISOString().slice(0, 10),
    updatedDate: fm.updatedDate ? (typeof fm.updatedDate === 'string' ? fm.updatedDate : new Date(fm.updatedDate).toISOString().slice(0, 10)) : undefined,
    category: fm.category,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    cover: fm.cover,
    subtitle: fm.subtitle,
    copyright: fm.copyright,
    draft: fm.draft ?? true,
    toc: fm.toc ?? true,
  };
}
