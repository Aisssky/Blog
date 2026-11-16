// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import sitemap from '@astrojs/sitemap';

import rehypeBasePrefix from './src/lib/rehype-base-prefix.mjs';
import remarkDrawing from './src/lib/remark-drawing.mjs';

/**
 * 站点常量集中在这里，改域名 / 子路径只需要改这一处。
 * GitHub Pages 项目页：https://<user>.github.io/<repo>/
 */
export const SITE_URL = 'https://aisssky.github.io';
export const BASE_PATH = '/Blog';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,

  integrations: [
    // 生成 sitemap-index.xml / sitemap-0.xml，自动带上 base 前缀
    sitemap({ changefreq: 'weekly', priority: 0.7, lastmod: new Date() }),
  ],

  // 目录式输出：/blog/hello/ 而不是 /blog/hello.html，和旧站 URL 习惯一致
  build: { format: 'directory' },
  trailingSlash: 'ignore',

  markdown: {
    // 旧站代码块是朴素灰底、无语法高亮；关掉内置高亮才能 1:1 还原
    syntaxHighlight: false,

    // Astro 7 起默认换成了 Sätteri 处理器，要挂 rehype 插件必须显式声明
    // 走 @astrojs/markdown-remark 的 unified 处理器。
    processor: unified({
      remarkPlugins: [
        // 把 $...$ 解析成 math 节点，构建时交给 rehype-katex 渲染成静态 HTML
        remarkMath,
        // 把正文里的 :::drawing 容器转成展示用 <figure>（data 路径已带 base）
        [remarkDrawing, { base: BASE_PATH }],
      ],
      rehypePlugins: [
        // 1) 先把正文里的原始 HTML 块（<img> / <video> / <details> …）
        //    解析成真正的 hast 元素，否则后面的插件看不见它们。
        rehypeRaw,
        // 2) math 节点 → KaTeX HTML，访客不需要加载任何公式渲染脚本
        rehypeKatex,
        // 3) 把正文里以 "/" 开头的图片/链接补上 base 前缀（/test）
        [rehypeBasePrefix, { base: BASE_PATH }],
      ],
    }),
  },

  devToolbar: { enabled: false },
});
