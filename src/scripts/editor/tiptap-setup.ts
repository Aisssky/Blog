/**
 * Tiptap 编辑器装配。
 *
 * 只在这里集中加载编辑器依赖；本模块由 owner.ts 在「进入编辑模式」时
 * 通过动态 import 拉起，从而普通访客完全不下载 Tiptap / Fabric。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { DrawingNode } from './drawing-node';
import { preprocessForEditor, normalizeDrawingMarkdown, tiptapToMarkdown } from './markdown';

export interface CreateEditorOptions {
  element: HTMLElement;
  content: string;
  onUpdate?: () => void;
}

export function createEditor({ element, content, onUpdate }: CreateEditorOptions): Editor {
  const editor = new Editor({
    element,
    content: preprocessForEditor(content),
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ inline: false, HTMLAttributes: { loading: 'lazy' } }),
      Placeholder.configure({ placeholder: '在这里开始写文章，或从上方工具栏插入绘图…' }),
      // html:true 让 markdown 解析阶段能识别 <div data-drawing> 并还原成 drawing 节点
      Markdown.configure({ html: true, tightLists: true, transformPastedText: true }),
      DrawingNode,
    ],
    onUpdate: () => onUpdate?.(),
  });
  return editor;
}

/** 取回规范化后的 Markdown（绘图容器归一成 :::drawing） */
export function getMarkdown(editor: Editor): string {
  const md = tiptapToMarkdown(editor.getJSON());
  return normalizeDrawingMarkdown(md);
}

/** 在光标处插入一个绘图节点 */
export function insertDrawing(
  editor: Editor,
  attrs: { src: string; data: string; width: number; height: number; caption: string },
): void {
  editor
    .chain()
    .focus()
    .insertContent({ type: 'drawing', attrs })
    .run();
}
