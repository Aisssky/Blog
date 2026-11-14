---
title: UMG入门学习
pubDate: 2025-07-11
---

# 本文仅用于了解，学习基础的功能实现。

**Potation：在本教程中，我们将在启用 初学者内容包（Starter Content） 的情况下使用 蓝图第一人称（Blueprint First Person） 模板**

> **虚幻示意图形UI编辑器** 是视觉UI创作工具，可用来创建UI元素，如在游戏内头顶显示、菜单或其他界面相关的图形。
>
> [官方文档](https://dev.epicgames.com/documentation/zh-cn/unreal-engine/umg-ui-designer-quick-start-guide-in-unreal-engine?application_version=5.4)&&[教程视频](https://www.youtube.com/watch?v=z5lgwZcSJmI&t=20s)

目录

*   [简介](#htoc-111111111)

    *   [UMG和Slate的区别](#htoc-umg-slate)

        *   [生命周期](#htoc-1111111111)
        *   [创建细节](#htoc-11111111111)
        *   [好多好多（），看了很多前辈的学习文章，原来二者可以混合使用并且各有优势，待我学完基础的UMG然后接触到CPP的Slate再研究研究【还是菜狗的Aisssky于2025.7.11】](#htoc-111111111111)

*   [设置按钮控件](#htoc-1)

*   [创建状态栏](#htoc-1-1)

    *   [何如解决手机端和PC端屏幕尺寸不同而导致UI控件篡位的问题？](#htoc-pc-ui)
    *   [在角色蓝图中使状态UI在游戏开始时就显示出来](#htoc-ui)
    *   [脚本：为HUD元素编写功能](#htoc-1-1-1)
    *   [执行以上操作后，即可从 BP_FirstPersonCharacter 蓝图中访问变量。](#htoc-bp-firstpersoncharacter)
    *   [在实际演示中就会是这个样子的>_<](#htoc-gt-lt)

*   [调整BP_FirstPersonCharacter蓝图中的角色变量](#htoc-1-2)

    *   [打开BP,找到相关可改变状态的动作蓝图进行编辑](#htoc-1-2-1-bp)
    *   [完成后就是这个样子的：](#htoc-11)

*   [实现物品栏](#htoc-)

    *   [物品栏的外观设置](#htoc-111)
    *   [ZOrder](#htoc-zorder)
    *   [图像显示子函数](#htoc-1111111111111111111)
    *   [在实际库存实施时需要决定插槽位置的绑定：](#htoc-1111111)

*   [实现在物品上方显示说明文字](#htoc-111111111111111111111)

*   [编写物品栏脚本](#htoc-11111111111111111)

*   [实现动作菜单](#htoc-111111111111111111)

*   [实现Drop，Cancel，use等功能](#htoc-drop-cancel-use)

*   [按E实现物品拾起](#htoc-e)

*   [按I实现物品栏的呼出与收起](#htoc-i)

*   [实现Mood值随开局时间变化不断增加](#htoc-mood)

*   [实现动效UI（有点像视频剪辑关键帧）](#htoc-ui1)

*   [解决碰撞问题](#htoc-111111111111111)

    *   [完成后就会修复该Bug了:](#htoc-bug)

*   [完整的功能演示：](#htoc-11111111111111111111)

## 简介

**游戏与玩家通信和互动的方式极其重要。用户界面（UI）和 头显（HUD）是游戏向玩家提供游戏信息以及在某些情况下允许玩家与游戏互动的方式。**

游戏界面用于将信息传达给玩家，并提供了用于提示用户直接输入的方法。 游戏界面通常包含两个主要元素：头显（HUD）和菜单或用户界面（UI）。

**HUD**

指的是游戏期间在屏幕上覆盖的状态和信息。HUD的目的是 告知玩家当前游戏状态，即分数、生命值、游戏剩余时间等。 HUD通常是不可互动的，意味着玩家不能单击HUD的元素，因此 在HUD和用户界面难以分离的某些类型游戏中，这些元素会显示为灰色区域。

**HUD** 是显示屏幕上覆盖的元素的基本对象。游戏中每个由人类控制的玩家 都有自己的 `AHUD` 类实例，这个实例会绘制到个人视口上。如果是分屏多人游戏， 多个视口会共享同一个屏幕，但每个HUD仍会绘制到其自己的视口上。要使用的HUD的 类型或类由正在使用的游戏类型指定。

**菜单或用户界面（UI）** 

指的是菜单和其他互动元素。这些元素通常是在屏幕上覆盖绘制的， 就像HUD一样，但在某些情况下，它们会成为游戏世界本身的一部分， 在场景中的一个表面上渲染出来。最明显的UI示例是游戏启动时显示的主菜单， 或玩家暂停游戏时显示的暂停菜单。但是，游戏期间可能会显示其他UI。这些 可以用于显示游戏中不同角色之间的对话，或在更复杂的情况下，如RTS或RPG， 它们可能成为游戏本身不可或缺的一部分，让玩家可以选择武器、盔甲、建筑单位等等。

**Slate**

**Slate** 是一种自定义、平台无关的用户界面框架，可用于创建各种工具和应用的用户界面，比如虚幻编辑器。上手快，不枯燥。它采用声明式语法，能够快速设计、布局组件的样式，允许你创建和迭代用户界面。

### UMG和Slate的区别

参考文章：[UE4笔记-UMG和Slate记录](https://www.cnblogs.com/linqing/p/9839355.html)by[](https://home.cnblogs.com/u/linqing/)[林清](https://home.cnblogs.com/u/linqing/) (膜拜大佬

**UMG和Slate都属于UE4的UI系统的一部分：**

**UMG是基于原先的Slate封装开发的GUI.UE4提供了可视化编辑器用于用户编辑自己GUI系统同时UMG组件还添加了很多事件和方法并支持BP**

**Slate则是完全C++代码化的,所有的布局和组件创建只能用C++实现（Slate有一些更底层的组件，如SSplitter等,更便于开发复杂UI）.**

#### 生命周期

UMG是居于UOBJECT的,而Slate却是居于TSharedFromThis，**所以UMG可以暴露于BP,而Slate只能应用于C++，而且声明周期也不尽相同**。

![](/images/uploads/umg-basics/umg-01.webp)

#### **创建细节**

因为UMG大多数都是BP类，所以当需要在C++创建时，需要通过TSubclassOf将BP类传回C++或使用LoadClass引用BP类

#### **好多好多（）** ，看了很多前辈的学习文章，原来二者可以混合使用并且各有优势，待我学完基础的UMG然后接触到CPP的Slate再研究研究【还是菜狗的Aisssky于2025.7.11】

## **设置按钮控件**

首先在**Content**中新建一个UMG文件夹

![](/images/uploads/umg-basics/umg-02.webp)

接着按着如图的步骤，在 **用户界面** **(User Interface)** 下选择 **控件蓝图(Widget Blueprint）** 选项。但是在UMG文件夹中创建三个**控件蓝图**。

![](/images/uploads/umg-basics/umg-03.webp)

如图。

![](/images/uploads/umg-basics/umg-04.webp)

***

## 创建状态栏

首先打开 **GameHUD** 控件蓝图创建一个**Canvas Panel**(如果已经下载了初学者安装包，这一步可以跳过），就类似于我们的页面，边界是绿色的框框

![](/images/uploads/umg-basics/umg-05.webp)

根据开发需求通过右上角的Screen Size调整UI界面的尺寸大小

![](/images/uploads/umg-basics/umg-06.webp)

### 何如解决手机端和PC端屏幕尺寸不同而导致UI控件篡位的问题？

选择 **水平方框（Horizontal Box）** ，然后在 **细节（Details）** 面板中单击 **锚点（Anchors）** 并选择如图的锚点。

![](/images/uploads/umg-basics/umg-07.webp)

借助此锚点，将 **锚点标牌（Anchor Medallion）** 放置在屏幕的右侧中间的位置。

![](/images/uploads/umg-basics/umg-08.webp)

> 由于锚点设置，无论屏幕尺寸如何，都可以固定水平方框位置。调整屏幕尺寸时，控件与锚点标牌之间的距离保持不变。

然后创建如图的状态框：

在 **控制板（Palette）** 面板中的 **面板（Panel）** 下找到 **水平方框（Horizontal Box）** ，然后将其拖到 **层级（Hierarchy）** 面板中的 **画布面板（Canvas Panel）** 上。

> **面板（Panel）** 控件有点像其他控件的容器，并为其中的控件提供额外的功能。

创建两个竖直框**Vertical Box**。

在 **常见（Common）** 下，将两个 **文本（Text）** 控件拖动到第一个垂直方框上，将两个 **进度条（Progress Bar）** 拖动到第二个垂直方框上。一个用来存储文字，一个用来存储数值条

![](/images/uploads/umg-basics/umg-09.webp)

通过右侧的detail修改文本框的文本格式

![](/images/uploads/umg-basics/umg-10.webp)

在这里修改数值条的颜色

![](/images/uploads/umg-basics/umg-11.webp)

可以如视频所示来查看颜色效果：

### 在角色蓝图中使状态UI在游戏开始时就显示出来

添加 **Event Begin Play** 节点。然后添加 **创建控件（Create Widget）** 节点。

![](/images/uploads/umg-basics/umg-12.webp)

将 **类（Class）** 设置为 我们编写的**HUD** 控件。

对于 **创建HUD控件（Create HUD Widget）** 的 **返回值（Return Value）** ，请选择 **提升为变量（Promote to Variable）** 并将其命名为 **HUD引用（HUD Reference）** 。

将 **添加到视口（Add to Viewport）** 节点连接到 **设置（Set）** 节点的输出引脚。

执行此操作后，从游戏过程开始便已经将HUD控件添加到了视口。

![](/images/uploads/umg-basics/umg-13.webp)

### 脚本：为HUD元素编写功能

在控件蓝图编辑器（Widget Blueprint Editor）窗口的右上角单击 图表（Graph） 按钮。

![](/images/uploads/umg-basics/umg-14.webp)

![](/images/uploads/umg-basics/umg-15.webp)

**当然，无论何时想更改状态数值的初始值，要记得先Compile**

![](/images/uploads/umg-basics/umg-16.webp)

在 图表（Graph） 中的 Event Construct 节点下，右键单击 并添加 Get Player Character 节点，拖出 返回值（Return Value） 引脚，并选择 **转换为第一人称角色（Cast to BP_FirstPersonCharacter）

拖动 作为BP第一人称角色（As BP First Person Character） 引脚并选择 提升为变量（Promote to Variable）

### 执行以上操作后，即可从 **BP_FirstPersonCharacter** 蓝图中访问变量。

![](/images/uploads/umg-basics/umg-17.webp)

返回到 **设计器（Designer）** 并选择 **生命值（Health）** 等（如图为Mood）旁边的 **进度条（Progress Bar）** 。

在 **细节（Details）** 面板中的 **进度（Progress）** 下，单击 **百分比（Percent）** 旁边的 **绑定（Bind）** 选项，然后单击 **创建绑定（Create Binding）** 。

执行此操作后，即可通过在打开的窗口中调整函数脚本来创建自定义绑定。

![](/images/uploads/umg-basics/umg-18.webp)

完成了就是这个样子的啦

![](/images/uploads/umg-basics/umg-19.webp)

### 在实际演示中就会是这个样子的>_<

![](/images/uploads/umg-basics/umg-20.webp)

## 调整BP_FirstPersonCharacter蓝图中的角色变量

如图为检测跳跃动作实现Energy数值变化，借助此脚本，每次角色跳跃时，都会在当前能量值的基础上将能量值减少0.05。

### 打开BP,找到相关可改变状态的动作蓝图进行编辑

![](/images/uploads/umg-basics/umg-21.webp)

![](/images/uploads/umg-basics/umg-22.webp)

### 完成后就是这个样子的：

## 实现物品栏

在**InventorySlot**控件蓝图中，删掉canva，因为我们将要实现的是一个Widget的子项，用不到绝对布局。

创建Button和image

### 物品栏的外观设置

![](/images/uploads/umg-basics/umg-23.webp)

### ZOrder

将 ZOrder 设为 1，通过设置 **ZOrder**，以便它出现在稍后将设置的图像的顶部。

### 图像显示子函数

毕竟是捡到什么显示什么，所以直接编写一个绑定函数来决定。

![](/images/uploads/umg-basics/umg-24.webp)

![](/images/uploads/umg-basics/umg-25.webp)

### 在实际库存实施时需要决定插槽位置的绑定：

> 点击按钮时，其将创建专属的脚本功能。如拥有此按钮的多个实例，且仅使用 **OnClicked** 事件，各实例将进行响应并执行相同功能。然而，通过创建 **事件调度器**，即可在逐实例基础上实现事件，同时仅有实际点击的按钮才会触发额外脚本。

选择 **Button** 变量，然后点击 **+** 号将 **OnClicked** 节点添加到图表。

![](/images/uploads/umg-basics/umg-26.webp)

在 **MyBlueprint** 面板中，选择 **事件调度器** 以新建名为 **ButtonClicked** 的 **事件调度器**。

将 **ButtonClicked** 拖入图表，选择 **调用**，然后将该节点连接到 **OnClicked** 事件。

![](/images/uploads/umg-basics/umg-27.webp)

> 点击按钮时，其将创建专属的脚本功能。如拥有此按钮的多个实例，且仅使用 **OnClicked** 事件，各实例将进行响应并执行相同功能。然而，通过创建 **事件调度器**，即可在逐实例基础上实现事件，同时仅有实际点击的按钮才会触发额外脚本。

## 实现在物品上方显示说明文字

打开**PickupText**蓝图控件的**Graph**:

![](/images/uploads/umg-basics/umg-28.webp)

## 编写物品栏脚本

因为这个物品栏想设置成点击时才会出现，所以勾选Hidden,并接下来在Graph中编写绑定的脚本：

![](/images/uploads/umg-basics/umg-29.webp)

![](/images/uploads/umg-basics/umg-30.webp)

![](/images/uploads/umg-basics/umg-31.webp)

## 实现动作菜单

因为这个动作菜单想设置为点击对应物品后再弹出：

![](/images/uploads/umg-basics/umg-32.webp)

![](/images/uploads/umg-basics/umg-33.webp)

![](/images/uploads/umg-basics/umg-34.webp)

这里的命名有笔误，啧，visible还是高考考的来着。

**使用数组显示库存中的物品**

![](/images/uploads/umg-basics/umg-35.webp)

![](/images/uploads/umg-basics/umg-36.webp)

完整的蓝图：

![](/images/uploads/umg-basics/umg-37.webp)

![](/images/uploads/umg-basics/umg-38.webp)

在 **细节（Details）** 面板中单击 **点击时执行（On Clicked）** 旁的加号，添加 **点击时执行（On Clicked）** 事件。

![](/images/uploads/umg-basics/umg-39.webp)

## 实现Drop，Cancel，use等功能

在GameHUD的Graph中：

![](/images/uploads/umg-basics/umg-40.webp)

![](/images/uploads/umg-basics/umg-41.webp)

![](/images/uploads/umg-basics/umg-42.webp)

## 按E实现物品拾起

![](/images/uploads/umg-basics/umg-43.webp)

## 按I实现物品栏的呼出与收起

因为蓝图太多了，所以截成两半

![](/images/uploads/umg-basics/umg-44.webp)

![](/images/uploads/umg-basics/umg-45.webp)

## 实现Mood值随开局时间变化不断增加

![](/images/uploads/umg-basics/umg-46.webp)

## 实现动效UI（有点像视频剪辑关键帧）

![](/images/uploads/umg-basics/umg-47.webp)

## 解决碰撞问题

在测试中，我们会发现当子弹射击我们的物体所在方向时会出现碰撞检测然后反弹。

在**Edit**中打开**Project Settings**->**Collision**,创建一个**New ObjectChannel**

![](/images/uploads/umg-basics/umg-48.webp)

因为这次主要学的是UMG，所以我们在创建此项目时勾选了初学者安装包，接下来我们在初学者安装包的蓝图为对应的开火BP创建一个副本。

![](/images/uploads/umg-basics/umg-49.webp)

> 有关碰撞的官方文档（4.27版本）：[概述](https://dev.epicgames.com/documentation/zh-cn/unreal-engine/collision-overview?application_version=4.27)，[碰撞响应](https://dev.epicgames.com/documentation/zh-cn/unreal-engine/collision-response-reference?application_version=4.27)。

首先打开**TemplatePickUp**，在**碰撞预设值（Collision Presets）** 处选择**自定义…（Custom…）** 为此实例设置所有自定义碰撞设置。

![](/images/uploads/umg-basics/umg-50.webp)

并在**碰撞响应（Collision Responses）** 下将**Projectile**设置为忽略（**ignore**），这样子弹将穿过物体所在的位置。

> 有关碰撞检测的U++代码曾在做SpaceShip时接触过，类似的碰撞设置的道理在蓝图中同样适用。

![](/images/uploads/umg-basics/umg-51.webp)

完成后回到**FirstPersonProjectile**蓝图,在对应的**碰撞组件**中检查**Object Type**是否为Projectile，否就选上。

![](/images/uploads/umg-basics/umg-52.webp)

### 完成后就会修复该Bug了:
暑假回家了没有显示屏，所以一直都是分屏看的，真的累死主播的眼睛了
![](/images/uploads/umg-basics/umg-53.webp)
