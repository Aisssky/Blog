/**
 * 设计模式速查表数据。
 *
 * 一行一个模式，五列：名称 / 结构图 / 组成部分 / 例题 1 / 例题 2。
 * 内容全部取自长文《设计模式》(2026-11-11) 各章节的「结构」「例题」两段，
 * 图片直接复用 public/images/uploads/design-patterns/ 下已落库的图。
 *
 * 任何字段留空都渲染成「待补」，不会报错。
 */

export type PatternCategory = '创建型' | '结构型' | '行为型';

export interface PatternExample {
  /** 例题名 */
  title: string;
  /** 一句话说明，可留空 */
  note?: string;
  /** 例题配图，可留空 */
  image?: string;
}

export interface PatternRow {
  /** 锚点 id，站内互链用 [[#p01]] 这种形式 */
  id: string;
  /** 中文名 */
  name: string;
  /** 英文名，显示在中文名下方 */
  en?: string;
  category?: PatternCategory;
  /** 模式结构图 */
  structure?: { src: string; alt?: string; caption?: string };
  /** 组成部分，一行一个角色 */
  parts?: string[];
  /** 例题 1、例题 2，按顺序取前两条 */
  examples?: PatternExample[];
}

const IMG = '/images/uploads/design-patterns/';

export const PATTERN_ROWS: PatternRow[] = [
  {
    id: 'p01',
    name: '抽象工厂',
    en: 'Abstract Factory',
    category: '创建型',
    structure: { src: `${IMG}image-20.webp`, alt: 'Abstract Factory 结构图' },
    parts: [
      'AbstractFactory：抽象工厂',
      'ConcreteFactory：具体工厂',
      'AbstractProduct：抽象产品',
      'Product：具体产品',
    ],
    examples: [
      {
        title: '数据库操作工厂',
        note: 'Connection 与 Statement 两族产品，Oracle / SQL Server 各一套工厂。',
        image: `${IMG}image-55.webp`,
      },
    ],
  },
  {
    id: 'p02',
    name: '工厂方法',
    en: 'Factory Method',
    category: '创建型',
    structure: { src: `${IMG}image-22.webp`, alt: 'Factory Method 结构图' },
    parts: [
      'Product：抽象产品',
      'ConcreteProduct：具体产品',
      'Factory：抽象工厂',
      'ConcreteFactory：具体工厂',
    ],
    examples: [
      {
        title: '电视机工厂',
        note: '每个品牌一个子工厂，新增品牌只加新工厂，原工厂不动。',
        image: `${IMG}image-25.webp`,
      },
    ],
  },
  {
    id: 'p03',
    name: '单件（例）模式',
    en: 'Singleton',
    category: '创建型',
    structure: { src: `${IMG}image-27.webp`, alt: 'Singleton 结构图' },
    examples: [
      {
        title: '身份证号码',
        note: '同一个人只允许有一个号码，补办仍沿用原号。',
        image: `${IMG}image-1.webp`,
      },
      {
        title: '打印池',
        note: '一个系统只允许一个打印池对象，重复创建抛异常。',
        image: `${IMG}image-51.webp`,
      },
    ],
  },
  {
    id: 'p04',
    name: '适配器模式',
    en: 'Adapter',
    category: '结构型',
    structure: { src: `${IMG}image-57.webp`, alt: 'Adapter 结构图' },
    parts: ['Target：目标抽象类', 'Adapter：适配器类', 'Adaptee：适配者类', 'Client：客户类'],
    examples: [
      {
        title: '仿生机器人',
        note: 'Robot 接口 + Dog 类，靠 DogAdapter 在不改原代码的前提下复用。',
        image: `${IMG}image-6.webp`,
      },
      {
        title: '加密适配器',
        note: '复用第三方加密类，包括没有源代码的那些。',
        image: `${IMG}image-14.webp`,
      },
    ],
  },
  {
    id: 'p05',
    name: '组合模式',
    en: 'Composite',
    category: '结构型',
    structure: { src: `${IMG}image-18.webp`, alt: 'Composite 结构图' },
    parts: [
      'Component：抽象构件',
      'Leaf：叶子构件',
      'Composite：容器构件',
      'Client：客户类',
    ],
    examples: [
      {
        title: '文件系统',
        note: '文件夹可以套文件夹，对文件与文件夹的操作保持一致。',
        image: `${IMG}image-48.webp`,
      },
      {
        title: '水果盘',
        note: '大盘里还能放小盘，对盘执行「吃」就是吃里面的水果。',
        image: `${IMG}image-31.webp`,
      },
    ],
  },
  {
    id: 'p06',
    name: '装饰模式',
    en: 'Decorator',
    category: '结构型',
    structure: { src: `${IMG}image-12.webp`, alt: 'Decorator 结构图' },
    examples: [
      {
        title: '变形金刚',
        note: '汽车 → 机器人 → 飞机，运行时一层层加能力。',
        image: `${IMG}image-41.webp`,
      },
      {
        title: '换衣小游戏',
        note: '人还是那个人，衣服可以一层套一层。',
        image: `${IMG}image-29.webp`,
      },
    ],
  },
  {
    id: 'p07',
    name: '外观模式',
    en: 'Facade',
    category: '结构型',
    structure: { src: `${IMG}image.webp`, alt: 'Facade 结构图' },
    examples: [
      {
        title: '电源总开关',
        note: '一个开关同时控制四盏灯、风扇、空调和电视机。',
        image: `${IMG}image-5.webp`,
      },
      {
        title: '文件加密模块',
        note: '读取 → 加密 → 保存三个类，用一个外观类统一入口。',
        image: `${IMG}image-63.webp`,
      },
    ],
  },
  {
    id: 'p08',
    name: '代理模式',
    en: 'Proxy',
    category: '结构型',
    structure: { src: `${IMG}image-26.webp`, alt: 'Proxy 结构图' },
    parts: ['Subject：抽象主题角色', 'Proxy：代理主题角色', 'RealSubject：真实主题角色'],
    examples: [
      {
        title: '论坛权限控制代理',
        note: '代理先校验 level，注册用户可发帖，游客只能看。',
        image: `${IMG}image-45.webp`,
      },
      {
        title: '图片代理',
        note: '先给一张小图占位，真正要看时再去加载大图。',
        image: `${IMG}image-39.webp`,
      },
    ],
  },
  {
    id: 'p09',
    name: '观察者模式',
    en: 'Observer / Event',
    category: '行为型',
    structure: { src: `${IMG}image-67.webp`, alt: 'Observer 结构图' },
    parts: [
      'Subject：目标',
      'ConcreteSubject：具体目标',
      'Observer：观察者',
      'ConcreteObserver：具体观察者',
    ],
    examples: [
      {
        title: '猫、狗与老鼠',
        note: '猫是观察目标，猫叫则老鼠跑、狗也跟着叫。',
        image: `${IMG}image-4.webp`,
      },
    ],
  },
  {
    id: 'p10',
    name: '状态模式',
    en: 'State',
    category: '行为型',
    structure: { src: `${IMG}image-10.webp`, alt: 'State 结构图' },
    parts: ['Context：环境类', 'State：抽象状态类', 'ConcreteState：具体状态类'],
    examples: [
      {
        title: '论坛用户等级',
        note: '新手 / 高手 / 专家三态，随积分与下载行为互相转换。',
        image: `${IMG}image-56.webp`,
      },
      {
        title: '银行账户状态',
        note: '余额决定绿 / 黄 / 红三态，透支后只能存款。',
        image: `${IMG}image-13.webp`,
      },
    ],
  },
  {
    id: 'p11',
    name: '策略模式',
    en: 'Strategy',
    category: '行为型',
    structure: { src: `${IMG}image-59.webp`, alt: 'Strategy 结构图' },
    parts: ['Context：环境类', 'Strategy：抽象策略类', 'ConcreteStrategy：具体策略类'],
    examples: [
      {
        title: '排序策略',
        note: '冒泡 / 选择 / 插入随时切换，还能加新算法。',
        image: `${IMG}image-30.webp`,
      },
      {
        title: '旅游出行策略',
        note: '飞机 / 火车 / 自行车，客户自己选一种出行方式。',
        image: `${IMG}image-2.webp`,
      },
    ],
  },
  {
    id: 'p12',
    name: '模板方法模式',
    en: 'Template Method',
    category: '行为型',
    structure: { src: `${IMG}image-17.webp`, alt: 'Template Method 结构图' },
    parts: ['AbstractClass：抽象类', 'ConcreteClass：具体子类'],
    examples: [
      {
        title: '银行业务办理流程',
        note: '取号 → 办业务 → 评分，流程固定，业务可变。',
        image: `${IMG}image-38.webp`,
      },
      {
        title: '数据库操作模板',
        note: 'connDB / openDB / useDB / closeDB 四步一致，只有连接方式变。',
        image: `${IMG}image-49.webp`,
      },
    ],
  },
  {
    id: 'p13',
    name: '迭代器模式',
    en: 'Iterator',
    category: '行为型',
    structure: { src: `${IMG}image-19.webp`, alt: 'Iterator 结构图' },
  },
  {
    id: 'p14',
    name: '职责链模式',
    en: 'Chain of Responsibility',
    category: '行为型',
    structure: { src: `${IMG}image-15.webp`, alt: 'Chain of Responsibility 结构图' },
    parts: ['Handler：抽象处理者', 'ConcreteHandler：具体处理者', 'Client：客户类'],
    examples: [
      {
        title: '审批假条',
        note: '<3 天主任、3~10 天经理、10~30 天总经理，超过 30 天拒绝。',
        image: `${IMG}image-65.webp`,
      },
    ],
  },
  {
    id: 'p15',
    name: '命令模式',
    en: 'Command',
    category: '行为型',
    structure: { src: `${IMG}image-35.webp`, alt: 'Command 结构图' },
    parts: [
      'Command：抽象命令类',
      'ConcreteCommand：具体命令类',
      'Invoker：调用者',
      'Receiver：接收者',
    ],
    examples: [
      {
        title: '电视机遥控器',
        note: '遥控器是发送者，电视机是接收者，三个命令对应开 / 关 / 换台。',
        image: `${IMG}image-61.webp`,
      },
      {
        title: '功能键设置',
        note: '功能键与功能类解耦，改配置就能换用途。',
        image: `${IMG}image-66.webp`,
      },
    ],
  },
];
