import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_MD = 'D:/cxdownload/设计模式/设计模式.md';
const SRC_IMG_DIR = 'D:/cxdownload/设计模式/图片和附件';
const OUT_IMG_DIR = join(ROOT, 'public/images/uploads/design-patterns');
const OUT_MD = join(ROOT, 'src/content/blog/2026-11-11-design-patterns.md');

async function main() {
  // 1. 转换图片 png -> webp（去空格文件名）
  await mkdir(OUT_IMG_DIR, { recursive: true });
  const files = (await readdir(SRC_IMG_DIR)).filter((f) => f.toLowerCase().endsWith('.png'));
  let ok = 0;
  for (const f of files) {
    const base = f.replace(/\.png$/i, '').replace(/\s+/g, '-'); // image 1 -> image-1, image -> image
    const out = join(OUT_IMG_DIR, base + '.webp');
    await sharp(join(SRC_IMG_DIR, f)).webp({ quality: 80 }).toFile(out);
    ok++;
  }
  console.log(`图片转换完成: ${ok} 张 -> ${OUT_IMG_DIR}`);

  // 2. 读取原 md
  let md = await readFile(SRC_MD, 'utf8');

  // 3. 替换图片引用（在清理 \. 之前，正则需匹配带 \. 的 alt 与无 \ 的 url）
  //    url 形式：图片和附件/image%20NN.png 或 图片和附件/image.png
  md = md.replace(/图片和附件\/image%20(\d+)\.png/g, '/images/uploads/design-patterns/image-$1.webp');
  md = md.replace(/图片和附件\/image\.png/g, '/images/uploads/design-patterns/image.webp');

  // 4. 清理 PDF 转 markdown 留下的转义伪影（不影响文字语义）
  md = md
    .replace(/\\-/g, '-')
    .replace(/\\\*/g, '*')
    .replace(/\\\+/g, '+')
    .replace(/\\&/g, '&')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\_/g, '_')
    .replace(/\\!/g, '!')
    .replace(/\\\./g, '.');

  // 5. 去掉文章总标题 H1（frontmatter 的 title 已承担），避免与页面标题重复；保留下方引言
  md = md.replace(/^#\s*设计模式\s*\n+/, '');

  // 6. 拼 frontmatter
  const fm = `---
title: 设计模式
pubDate: 2026-11-11
description: 大钊 insideUE4 与李建忠 C++ 设计模式课程学习笔记——UML 类图、面向对象设计原则，以及 GOF-23 各模式的动机、结构与总结。
tags: ['设计模式', 'C++', '学习笔记']
---

`;
  await writeFile(OUT_MD, fm + md, 'utf8');
  console.log(`文章已生成: ${OUT_MD}`);
}

main().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
