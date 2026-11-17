/**
 * 分区 / 分类查询工具。
 *
 * 把「文章 frontmatter 里的 section / category（slug）」解析成
 * sections.ts 里的完整对象（中文名、描述、图标、所属关系）。
 *
 * 兼容层：早期文章的 category 是中文值（如「问题记录」「图形学」），
 * 通过 LEGACY_CATEGORY_ALIAS 归一化到新的分类 id，保证旧值不失效。
 */
import type { CollectionEntry } from 'astro:content';
import { SECTIONS } from '../data/sections';
import type { TaxonomyCategory, TaxonomySection } from '../data/sections';

export type { TaxonomyCategory, TaxonomySection };

/** 旧中文 category → 新分类 id（迁移过渡期兜底，新文章直接用 slug 即可） */
const LEGACY_CATEGORY_ALIAS: Record<string, string> = {
  '问题记录': 'bug-perf',
  '项目日志': 'devlog',
  '图形学': 'graphics',
  '设计模式': 'design-patterns',
};

/** 按 id 找一级分区 */
export function findSection(id: string | undefined): TaxonomySection | undefined {
  if (!id) return undefined;
  return SECTIONS.find((s) => s.id === id);
}

/** 按分类 id 找「分类 + 所属分区」（含旧中文 alias 归一化） */
export function findCategory(
  categoryId: string | undefined
): { section: TaxonomySection; category: TaxonomyCategory } | undefined {
  if (!categoryId) return undefined;
  const resolved = LEGACY_CATEGORY_ALIAS[categoryId] ?? categoryId;
  for (const section of SECTIONS) {
    const category = section.categories.find((c) => c.id === resolved);
    if (category) return { section, category };
  }
  return undefined;
}

/** 文章所属一级分区 id：section 字段优先，其次由 category 反查 */
export function resolveSectionId(post: CollectionEntry<'blog'>): string | undefined {
  if (post.data.section && findSection(post.data.section)) return post.data.section;
  return findCategory(post.data.category)?.section.id;
}

/** 文章所属二级分类 id（含旧中文 alias 归一化；未知值返回 undefined） */
export function resolveCategoryId(post: CollectionEntry<'blog'>): string | undefined {
  return findCategory(post.data.category)?.category.id;
}

/** 文章所属分区的完整对象 */
export function sectionOf(post: CollectionEntry<'blog'>): TaxonomySection | undefined {
  return findSection(resolveSectionId(post));
}

/** 文章所属分类的完整对象（含所属分区） */
export function categoryOf(
  post: CollectionEntry<'blog'>
): { section: TaxonomySection; category: TaxonomyCategory } | undefined {
  return findCategory(resolveCategoryId(post));
}

/** 把文章按一级分区分组，组内保持传入顺序；返回顺序即 sections.ts 定义顺序 */
export function groupBySection(
  posts: CollectionEntry<'blog'>[]
): { section: TaxonomySection; posts: CollectionEntry<'blog'>[] }[] {
  const map = new Map<string, CollectionEntry<'blog'>[]>();
  for (const post of posts) {
    const sid = resolveSectionId(post) ?? '__none__';
    const bucket = map.get(sid);
    if (bucket) bucket.push(post);
    else map.set(sid, [post]);
  }

  const result: { section: TaxonomySection; posts: CollectionEntry<'blog'>[] }[] = [];
  for (const section of SECTIONS) {
    const bucket = map.get(section.id);
    if (bucket && bucket.length > 0) result.push({ section, posts: bucket });
  }
  return result;
}

/** 某组文章中「有文章」的分类（去重，按 sections.ts 定义顺序） */
export function activeCategories(posts: CollectionEntry<'blog'>[]): TaxonomyCategory[] {
  const seen = new Set<string>();
  const result: TaxonomyCategory[] = [];
  for (const post of posts) {
    const found = categoryOf(post);
    if (found && !seen.has(found.category.id)) {
      seen.add(found.category.id);
      result.push(found.category);
    }
  }
  const order = new Map<string, number>();
  SECTIONS.forEach((s) => s.categories.forEach((c, i) => order.set(c.id, i)));
  return result.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
