/**
 * Writing 的信息架构：一级分区（section）→ 二级分类（category）。
 *
 * 这是唯一的分类真相源。文章 frontmatter 的 `section` / `category` 字段
 * 存这里的 id（slug），显示名、描述、图标、所属关系都在这里集中管理。
 * 要新增 / 改名 / 删除分类，只改这一个文件，页面和筛选逻辑不用动。
 *
 * 没有文章的分类先保留在这里（未来写文章时会自动出现），
 * 页面上只展示「当前有已发布文章」的分类，避免一堆空分类。
 */

export type SectionIcon = 'code' | 'course' | 'cube' | 'feather';

export interface TaxonomyCategory {
  /** 二级分类 id，同时是 frontmatter 的 category 值、URL 里的一段 */
  id: string;
  /** 显示名 */
  name: string;
  /** 一句话说明（可选，分类页和入口会显示） */
  description?: string;
}

export interface TaxonomySection {
  /** 一级分区 id，同时是 frontmatter 的 section 值、URL 里的一段 */
  id: string;
  /** 显示名 */
  name: string;
  /** 英文标识（分区卡片上的小字） */
  english: string;
  /** 一句话说明 */
  description: string;
  /** 图标 key，见 SectionCard.astro */
  icon: SectionIcon;
  /** 二级分类，顺序即展示顺序 */
  categories: TaxonomyCategory[];
}

export const SECTIONS: TaxonomySection[] = [
  {
    id: 'programming',
    name: '编程基础',
    english: 'Programming',
    description: '编程语言、通用技术与计算机基础知识。',
    icon: 'code',
    categories: [
      { id: 'cpp', name: 'C++', description: 'C++ 语言基础、面向对象与内存模型。' },
      { id: 'cpp-modern', name: 'C++11 / 现代 C++', description: 'C++11 及之后的现代特性。' },
      { id: 'stl', name: 'STL', description: '标准模板库与泛型编程。' },
      { id: 'dsa', name: '数据结构与算法', description: '数据结构与算法。' },
      { id: 'os', name: '操作系统', description: '操作系统原理。' },
      { id: 'misc', name: '其他编程基础', description: '其他编程基础知识。' },
    ],
  },
  {
    id: 'courses',
    name: '专业课程',
    english: 'Courses',
    description: '学校课程、期末复习资料与专业知识整理。',
    icon: 'course',
    categories: [
      { id: 'design-patterns', name: '设计模式', description: '面向对象设计模式。' },
      { id: 'graphics', name: '计算机图形学', description: '计算机图形学与渲染。' },
      { id: 'modeling', name: '三维建模', description: '三维建模理论与技术。' },
      { id: 'computer-organization', name: '计算机组成原理', description: '计算机组成原理。' },
      { id: 'computer-network', name: '计算机网络', description: '计算机网络。' },
      { id: 'software-testing', name: '软件测试', description: '软件测试。' },
      { id: 'database', name: '数据库原理', description: '数据库原理。' },
      { id: 'software-engineering', name: '软件工程', description: '软件工程。' },
      { id: 'other', name: '其他课程', description: '其他课程资料。' },
    ],
  },
  {
    id: 'engineering',
    name: '工程实践',
    english: 'Engineering',
    description: '开发实践、项目经验与技术问题记录。',
    icon: 'cube',
    categories: [
      { id: 'ue-basics', name: 'UE 基础', description: 'Unreal Engine 基础。' },
      { id: 'ue-gameplay', name: 'UE Gameplay Framework', description: 'Gameplay 框架与网络同步。' },
      { id: 'ue-gas', name: 'UE GAS', description: 'Gameplay Ability System。' },
      { id: 'devlog', name: '项目日志', description: '项目开发日志与实践经历。' },
      { id: 'architecture', name: '工程架构', description: '工程架构与设计。' },
      { id: 'bug-perf', name: 'Bug 排查与性能优化', description: 'Bug 排查与性能优化。' },
    ],
  },
  {
    id: 'thoughts',
    name: '随笔与思考',
    english: 'Thoughts',
    description: '非结构化的个人记录。',
    icon: 'feather',
    categories: [
      { id: 'daily', name: '日常随笔', description: '日常随笔。' },
      { id: 'reflection', name: '学习感悟', description: '学习感悟。' },
      { id: 'thinking', name: '技术思考', description: '技术思考。' },
      { id: 'summary', name: '阶段总结', description: '阶段总结。' },
    ],
  },
];
