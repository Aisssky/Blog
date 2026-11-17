---

title: "《赛博朋克：飘渺城影》开发日志"

description: "对话系统 / 玩家交互 / 文本收集 / 教程系统的重构记录"

pubDate: 2026-04-21

updatedDate: 2026-05-10

subtitle: "开发日志 · 2026-04-21 ~ 2026-05-10"

section: engineering

category: devlog

tags:

- UE5

- 对话系统

- UMG

- 项目复盘

cover: /images/promo.webp


copyright: "© 2026 集体梦境 项目组|仅供学习交流与开发展示"

draft: false

toc: true

---





> 已经过去6个月了啊……面试的时候有些项目细节都忘没了，好好写写文档吧……
> 
> 

## 📖 简介

### 🛠️ 技术栈

<div class="tech-stack-container"><div class="tech-stack-block">UE5 C++</div><div class="tech-stack-block">BluePrints</div><div class="tech-stack-block">UMG</div><div class="tech-stack-block">SVN</div></div>

### 🔗 项目链接

<https://store.steampowered.com/app/3552700/\_/> 现已开放愿望单

### ✨ 技术亮点与职责

#### 职责

1. **技术架构迁移**：将原有蓝图实现的 UI 系统重构为 C++，把业务逻辑、状态管理和 UI 控制收敛到代码层，蓝图保留资源配置与表现扩展。

2. **系统化设计**：从每个交互物独立实现，转变为角色统一管理；从单文本区域，转变为具有历史记录的对话系统。

3. **可扩展性建设**：通过接口、事件分发、数据驱动和组件化设计，降低后续新增内容的开发成本。

#### 技术

- 基于[Dialogue Builder插件](https://www.fab.com/listings/052820ab-f423-48e8-978a-eefd4087b1a4?lang=zh-cn)进行二次开发，协同文案策划构建支持富文本打字机、动态分支选项、技能检定提示与音效联动的完整对话UI框架。

- C++ 底层逻辑：扩展 DialogueBubbleWidget、OptionButtonWidget、MainDialogueWidget 等核心类，实现逐字打印、富文本标签无截断渲染、统一打字速度及标点停顿倍率，大幅提升剧情演出节奏感。

- 分支选项系统：设计并实现单/多选项弹出、选项后自动衔接NPC侧对话的完整分支逻辑；通过合理数据结构约定，简化蓝图流程，消除分支判定的冗余数组操作，显著降低维护成本。

- 辅助功能：集成节点驱动的打字音效自动播放/停止，沉浸式赛博叙事体验。

## 🎮 实现思路及演示



因为策划找到我时，这个项目已经是完成度很高的作品，所以我的任务就是在原来的庞然巨物上做功能调优和新增功能（作为一个纯蓝图项目，代码可读性极差，调断点的时候一直在四个文件里面反复跳）



<div class="image-row">

<div class="image-item">

<img src="/images/req.jpg" alt="策划需求图 - 对话分支与检定规则" />

<div class="img-caption">📑 策划需求</div>

</div>

<div class="image-item">

<img src="/images/omg.jpg" alt="直面蓝图古神来了" />

<div class="img-caption">直面蓝图古神来了</div>

</div>

<div class="image-item">

<img src="/images/ver.jpg" alt="改了三版" />

<div class="img-caption">改了三版</div>

</div>  

</div>

## UI 系统重构：从蓝图实现到 C++ 架构

在项目开发过程中，我独立负责了项目 UI 系统的重构工作，将原有以蓝图为主的 UI 实现逐步迁移至 C++，重新梳理各系统的职责边界、数据流转与交互逻辑。

### 对话系统重构

对话系统是本次重构中投入精力最多的部分。

原有蓝图方案采用单一区域替换文本的方式展示对话，无法保留完整的交互历史，也缺少统一的选项管理和打字机控制逻辑。

重构后，基于** Dialogue Builder 插件**提供的对话节点**数据结构与数据层接口**，从零搭建了完整的 C++ 对话 UI 框架。

- DialogueBuilder 提供节点数据结构、对话图存储、节点流转及条件判断机制。

- 我需要实现的是 C++ 对话 UI 框架，包括气泡管理、历史记录、打字机、选项控件、检定信息展示、滚动管理、交互状态机和事件路由。

重构前后对比（前：后）

<div class="compare-pair compare-pair--gif">
  <div><img src="/images/uploads/cyberpunk/cyber-demo-1.gif" alt="重构前后对比" /></div>
  <div><img src="/images/uploads/cyberpunk/cyber-demo-2.gif" alt="重构前后对比 2" /></div>
</div>

说点我的心路历程……一开始交给我的WBP，是长这样的：

<div class="compare-pair compare-pair--wbp">
  <div><img src="/images/uploads/cyberpunk/image-3.webp" alt="image.png" /></div>
  <div><img src="/images/uploads/cyberpunk/image-7.webp" alt="image.png" /></div>
</div>

好处是策划老师已经配置好了UI层级，坏处是我看到图表逻辑以后看了两天没下去手……

然后我就找呀找呀，找半天也没有找到dialoguedatastruct在哪，也没有找到推进对话的接口函数写在哪，百思不得其解，最后呼出了claude大人帮我分析项目结构尤其是对话系统的逻辑……

claude大人告诉我，source里面并没有dialogue相关逻辑哦~

Wdf!?这怎么可能呢……

claude：不过我发现了插件里面有一个dialoguebuilder是你要找的吗 ？

？什么dialoguebuilder然后我就找到了数据结构和接口，后面我研究了一下这个插件，觉得相当优秀。对于那些想要完成剧情类游戏的非技术人员来说简直是福音啊……编辑器里面的表现相当可视！

![image.png](/images/uploads/cyberpunk/image-13.webp)

**对话历史与气泡管理**

- 使用 ScrollBox + VerticalBox 作为对话容器，每次触发新对话时动态创建独立的 DialogueBubbleWidget，并追加到历史列表。

<div class="compare-pair compare-pair--wbp">
  <div><img src="/images/uploads/cyberpunk/image-9.webp" alt="image.png" /></div>
  <div><img src="/images/uploads/cyberpunk/QQ_1794628180517.webp" alt="QQ_1794628180517.png" /></div>
</div>

- 将 NPC 与玩家的对话统一抽象为气泡控件，根据 IsPlayerNode 自动选择对应的头像、名称和富文本区域。

![image.png](/images/uploads/cyberpunk/image-15.webp)

- 使用 AllBubbles 集中管理气泡实例，支持历史回溯、自动滚动以及对最新对话状态的统一判断。

![image.png](/images/uploads/cyberpunk/image.webp)

- 选项选择后，将玩家选择作为独立气泡追加到对话历史中，保留完整的上下文交互记录。

![image.png](/images/uploads/cyberpunk/image-16.webp)

**C++ 打字机系统**

使用 FTimerHandle 实现逐字打印逻辑，通过递归定时器动态调度下一字符的显示，而不是使用固定频率的循环定时器。

针对不同字符设计差异化延迟：

- 普通字符：基础打印间隔。

- 逗号、分号等句中标点：增加 2 倍停顿。

- 句号、问号、感叹号等句末标点：增加 4 倍停顿。

![image.png](/images/uploads/cyberpunk/image-19.webp)

同时实现富文本标签跳过逻辑，检测到 `<` 后直接定位至对应的 `>`，整段跳过标签语法，避免富文本标记在逐字打印过程中被错误渲染。

![image.png](/images/uploads/cyberpunk/image-18.webp)

另外实现了打字音效的生命周期管理、全文快速显示、打字完成事件通知等功能。

![image.png](/images/uploads/cyberpunk/image-12.webp)

![image.png](/images/uploads/cyberpunk/image-4.webp)

<figure class="video-card">

<video controls muted loop preload="auto">

<source src="/video/dialogue-demo.mp4" type="video/mp4" />

您的浏览器不支持视频播放，请升级浏览器或查看项目文档。

</video>  


<figcaption class="video-desc">🎞️ 对话系统打字音效视频|动态选项 + 逐字演出 + 技能检定</figcaption>

</figure>



**选项与交互状态管理**

将选项按钮独立封装为 OptionButtonWidget，支持根据节点数据动态配置选项文本、检定标识、风险等级及悬浮信息面板。

主控 Widget 统一管理选项创建、清理和点击事件，通过状态机处理不同交互行为：

- 正在等待玩家选择时，屏蔽对话区域的推进操作。

- 打字尚未完成时，点击对话区域直接显示完整文本。

- 打字完成后，点击触发下一段对话。

![image.png](/images/uploads/cyberpunk/image-20.webp)

通过 Dynamic Multicast Delegate 将 UI 操作与外部对话流程解耦，并暴露 OnCharTyped、OnSetPlayerNode 等蓝图事件，使蓝图可以继续定制角色气泡切换、逐字特效等表现效果。

![image.png](/images/uploads/cyberpunk/image-8.webp)

整个系统以 C++ 负责 UI 管理、交互状态与选项展示，Dialogue Builder 插件继续承担对话图数据及节点流转能力，蓝图保留必要的条件配置和表现扩展。

本次重构的核心目标并不是简单地将蓝图节点翻译成 C++，而是将重复的业务逻辑、状态管理和交互控制从蓝图中抽离，建立统一、可复用、易扩展的 UI 框架。

### 交互提示系统重构

原有方案中，每个可交互 Actor 都需要单独持有碰撞体和对应的 Widget Blueprint，导致交互逻辑重复，新增交互物时需要反复配置碰撞检测和 UI。

<div class="compare-pair compare-pair--wbp">
  <div><img src="/images/uploads/cyberpunk/image-2.webp" alt="image.png" /><div class="img-caption">重构前的剧情文本UI</div></div>
  <div><img src="/images/uploads/cyberpunk/image-14.webp" alt="image.png" /><div class="img-caption">重构前的交互提示UI</div></div>
</div>

重构后，将交互检测和提示显示统一收敛至角色端管理。

- 由角色统一驱动交互检测，不再要求每个交互物独立维护完整的碰撞与 UI 逻辑。

- 通过双重校验过滤无效触发，减少误触发情况。

- 校验通过后，通过接口读取目标 Actor 的交互提示文本，并写入角色头顶的统一提示控件。

- 交互物通过实现指定接口并配置 Tag，即可接入现有交互系统。

<div class="compare-pair compare-pair--wbp">
  <div><img src="/images/uploads/cyberpunk/image-10.webp" alt="image.png" /><div class="img-caption">重构后无需每个交互都拥有单独的WBP，而是通过参数填写的方式实现</div></div>
  <div><img src="/images/uploads/cyberpunk/image-17.webp" alt="image.png" /><div class="img-caption">双重校验确保参数有效</div></div>
</div>

重构后，新增交互物不再需要重复编写碰撞检测与提示 UI，只需实现约定接口并完成 Tag 配置，大幅减少重复工作，也降低了交互系统的维护成本。

我简直天才吧

![3ff69adf92cce1c97ecc391aa1c4af34.jpeg](/images/uploads/cyberpunk/3ff69adf92cce1c97ecc391aa1c4af34.webp)

### 收集进度 UI 重构

针对收集进度的数据管理进行了集中化调整。

原本分散在 UI 或局部逻辑中的收集状态，调整为由 PlayerState 统一持有收集数据。

UI 根据 PlayerState 中的数据更新收集进度与状态反馈，使收集数据不再依赖某个具体 Widget 的生命周期。

同时利用 PlayerState 在关卡切换过程中的持续性，实现收集状态的跨关卡同步，避免切换关卡后 UI 与实际收集进度出现不一致。

![image.png](/images/uploads/cyberpunk/image-11.webp)

唉，生命周期，唉，及时销毁，唉，有效性检查

<div class="compare-pair compare-pair--chat">
  <div><img src="/images/uploads/cyberpunk/3c24a454c39172a98cfa634c6a083ab8_720.webp" alt="3c24a454c39172a98cfa634c6a083ab8_720.jpg" /></div>
  <div><img src="/images/uploads/cyberpunk/005963fe2ba07a22a59096a3ccc12315.webp" alt="005963fe2ba07a22a59096a3ccc12315.jpg" /></div>
</div>

其实这个功能在实现的时候也是遇到了Bug定位的问题；；那天还是比赛的截止日，给我和策划慌死了；；

![QQ\_1794631509476.png](/images/uploads/cyberpunk/QQ_1794631509476.webp)

<figure class="video-card">

<video controls muted loop preload="metadata">

<source src="/video/interaction-refactor-demo.mp4" type="video/mp4" />

您的浏览器不支持视频播放，请升级浏览器或查看项目文档。

</video>

</figure>

### ESC 菜单与新手教程系统

新增 ESC 菜单中的新手教程播放与展示逻辑。

使用 Unreal Engine Media Framework，结合 File Media Source 管理教程视频资源，并通过数组集中维护视频播放资源及其展示顺序。

![image.png](/images/uploads/cyberpunk/image-1.webp)

UI 层采用 Widget Switcher 管理教程视频播放界面与教程列表，实现单一控件下的界面切换。

![image.png](/images/uploads/cyberpunk/image-6.webp)

将视频资源与播放顺序从具体的 UI 逻辑中分离，后续调整教程编排时，只需修改数组中的资源顺序，无需重新搭建 Widget 或修改底层播放逻辑。

![image.png](/images/uploads/cyberpunk/image-5.webp)

<figure class="video-card">

<video controls muted loop preload="metadata">

<source src="/video/esc-menu-tutorial-demo.mp4" type="video/mp4" />

您的浏览器不支持视频播放，请升级浏览器或查看项目文档。

</video>

</figure>

### 本次重构的整体收益

大概用了一周时间，，通过本次 UI 系统重构，将原本分散在各个蓝图中的业务逻辑逐步收敛至 C++，建立了更加统一的模块化管理方式。

主要改进包括：

- **降低重复开发成本：** 通过统一交互管理、接口化接入和组件复用，减少新增功能时的重复实现。

- **改善系统可维护性：** 将状态管理、事件路由和核心交互逻辑集中管理，减少蓝图之间的复杂依赖。

- **提高系统扩展性：** 通过接口、事件委托和数据驱动方式，让新增内容尽可能复用现有框架。

- **明确代码职责边界：** C++ 负责核心逻辑，蓝图负责资源配置与表现扩展，使程序逻辑和美术表现能够相对独立地迭代。



