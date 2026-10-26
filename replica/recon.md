# Kaleidoscope 功能与界面分析

日期：2026 年 10 月 26 日。目标：个人自用的 macOS 对比软件。参考版本：本机 Kaleidoscope 7.0.2，build 11016。

**Electron 能实现这个目标，也能做出精致的界面。建议用 Electron、React、TypeScript 和 CodeMirror，先完成文本比较，再加入目录比较。** 真正需要投入的部分是差异的可读性、长文档与目录的响应速度，以及编辑、撤销、保存之间的一致性。

这次范围包括文本、目录、图片和合并的核心交互，并记录 Git 扩展方向。下文的技术架构和数据模型是独立实现方案，不代表 Kaleidoscope 的内部实现。

本机参考截图保留在已忽略的 `replica/screens/`，不随 Git 分发。下表中的截图文件名仅供本地研究索引；Diffolio 自身的公开截图见 [资源说明](../resources/screenshots/README.md)。

## 参考来源

| 来源 | 地址 | 用途 |
| --- | --- | --- |
| 本机版本信息 | file:///Applications/Kaleidoscope.app/Contents/Info.plist | 版本、构建号、应用标识 |
| 本机界面参考 | `replica/screens/`（本地） | 使用自建文本、PNG、目录和三方合并样例观察界面 |
| 官方手册 | [Owner’s Manual](https://kaleidoscope.app/help) | 功能范围与入口 |
| 开始比较 | [Starting a Comparison](https://kaleidoscope.app/help/docs/starting-a-comparison) | 拖入、文件选择、剪贴板、最近比较 |
| 文本视图 | [Text Comparison Views](https://kaleidoscope.app/help/docs/text-comparison-views) | Blocks、Fluid、Unified、搜索和差异导航 |
| 文本颜色 | [Text Diffs and Colors](https://kaleidoscope.app/help/docs/text-diffs-and-colors) | 新增、删除、修改和行内差异 |
| 文本合并 | [Text Merging](https://kaleidoscope.app/help/docs/text-merging) | 双向采用、保留双方、撤销和结果文件 |
| 目录比较 | [Comparing Folders](https://kaleidoscope.app/help/docs/comparing-folders) | 状态筛选、目录展开和文件配对 |
| 图片比较 | [Image Comparison Views](https://kaleidoscope.app/help/docs/image-comparison-views) | 并排、切换、分割、差异遮罩 |
| Git 变更集 | [The Changeset Window](https://kaleidoscope.app/help/docs/changeset-window) | 文件列表与比较内容联动 |
| Git 文件历史 | [The File History](https://kaleidoscope.app/help/docs/file-history) | 选择历史版本放入 A 或 B |
| Kaleidoscope 7 | [Live Working Copy Changes](https://blog.kaleidoscope.app/2026/07/28/kaleidoscope-7-live-working-copy-changes/) | 工作副本变化后实时更新变更集 |
| 许可条款 | [License Agreement](https://cloud.kaleidoscope.app/legal/terms) | 参考范围与实现边界 |
| Electron 窗口 | [Custom Title Bar](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar)、[BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window) | 原生窗口按钮、标题栏和 macOS 材质 |
| Electron 后台处理 | [Performance](https://www.electronjs.org/docs/latest/tutorial/performance)、[utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process) | 保持窗口响应和隔离计算任务 |
| CodeMirror 合并界面 | [官方包说明](https://raw.githubusercontent.com/codemirror/merge/main/README.md) | 双栏和统一视图的基础能力；仓库已迁移，地址见说明 |

## 核心使用过程

把两个版本送入比较窗口，定位有意义的差异，必要时选择保留哪一侧，最后保存结果。普通文件、目录和 Git 版本可以共用会话外壳，但需要各自的比较规则。

本机文本样例显示了 1 处新增和 3 处修改。目录样例包含修改、相同、只在 A、只在 B 的条目。三方样例显示了 2 处变更和 1 处冲突。这些是小样例的界面观察，不是性能测试。

## 界面清单

共记录 11 个界面场景，其中 9 个保存了本机截图（包含 2026 年 10 月 27 日追加的欢迎页与单侧输入观察）。文本布局作为独立场景列出，实际可以共用一个窗口。

| ID | 界面 | 入口与用途 | 主要组件 | 观察到的状态与依据 |
| --- | --- | --- | --- | --- |
| S01 | 最近比较 | 启动窗口；重新进入会话 | 历史列表、文件入口 | 本机窗口标题与可访问性信息；重开行为见官方文档 |
| S02 | Blocks 文本比较 | 打开两个文本；按差异块对齐 | 双栏编辑区、行号、差异背景、底部导航 | 本机新增、修改、语法着色；本地 `screens/S02-text-blocks.png` |
| S03 | Fluid 文本比较 | View → Fluid；连续阅读两侧内容 | 双栏、中央差异连接线 | 本机内容错位时的连接关系；本地 `screens/S03-text-fluid.png` |
| S04 | Unified 文本比较 | View → Unified；紧凑阅读差异 | 单列内容、A/B 标记、两套行号 | 本机两方比较的统一布局；本地 `screens/S04-text-unified.png` |
| S05 | 目录比较 | 打开两个目录；发现并筛选不同文件 | 两侧树列表、路径、名称/日期/大小列、筛选、复制操作 | 本机修改、相同、单侧缺失、禁用 Apply；本地 `screens/S05-folders.png` |
| S06 | 图片比较 | 打开两个 PNG；View → Difference | 画布、模式切换、缩放、遮罩、像素信息栏 | 本机同尺寸图片的差异遮罩和未选像素状态；本地 `screens/S06-images-difference.png` |
| S07 | 合并文档 | CLI 传入 base、A、B、output | 输入差异、结果区、冲突计数、采用操作 | 本机未解决冲突；保存流程依据手册；本地 `screens/S07-merge.png` |
| S08 | 设置 | Kaleidoscope → Settings | 分类工具栏、外观选择、编辑器设置 | 本机 General 页及 General/Git/Text/Images/Folders/Files/Privacy 分类；本地 `screens/S08-settings.png` |
| S09 | Git 变更集 | Git 比较入口；在文件间切换 | 左侧变更文件列表、筛选、主比较区 | 官方手册与版本 7 发布说明 |
| S10 | Git 文件历史 | Show File History | 提交列表、作者、时间、A/B 选择 | 官方手册；不是“最近比较”列表 |
| S11 | 单侧输入 | 通过本机 ksdiff 打开一个样例文本 | 一侧只读内容、另一侧加入目标、文件身份与加入操作 | 已加入文件直接可读，未加入一侧保留拖入提示；本地 `screens/S11-single-input-live.png` |

2026 年 10 月 27 日复核：欢迎页有导航侧栏，普通文本比较与单侧输入窗口没有常驻的会话/最近记录侧栏；Git 变更集的文件列表属于另一种任务。S11 显示 Kaleidoscope 会在第一个输入到达时立即呈现正文，再等待另一侧，而不会继续把该内容显示成大型选择按钮。Diffolio 的入口据此采用单侧只读预览；欢迎侧栏统一石墨底色则按用户后续明确偏好调整。

### 文本布局参考

Fluid 模式在内容保持连续的同时，用中央连接线解释两侧差异块的对应关系。

本地参考：`replica/screens/S03-text-fluid.png`。

## 六条主要流程

下表的交互次数按普通图形界面估算，不包含选择具体文件的导航。实际样例使用公开 CLI 导入，布局切换通过菜单完成。

| ID | 目标与路径 | 交互次数参考 | 需要处理的边界 |
| --- | --- | --- | --- |
| F01 | 比较文本：S01 → S02；再切换 S03/S04、跳到下一处差异 | 文件已选定时一次拖入；工具栏切换一次点击 | 相同文件、空文件、极长行、中文/emoji、编码差异、文件消失 |
| F02 | 比较目录：S01 → S05 → 文件的 S02/S06 | 导入后，双击一行进入文件比较；下钻入口见手册 | 单侧文件、权限错误、符号链接、隐藏文件、扫描中变动 |
| F03 | 识别图片变化：S01 → S06 → Difference 或 Split | 导入后一次工具栏切换，或菜单两次点击 | 尺寸不同、透明通道、色彩配置、缩放后的像素坐标 |
| F04 | 解决冲突：导入 base/A/B → S07 → 选择或编辑结果 → 保存 | 导入后每处冲突一次或多次选择，再保存 | 未解决冲突、撤销后状态恢复、输出文件被外部修改；本次观察到冲突呈现 |
| F05 | 继续之前的比较：S01 → 原会话 | 手册描述为双击一条历史记录 | 原文件移动、文件权限改变、保存的是路径还是快照 |
| F06 | 检查 Git 工作副本：S09 → S02/S06 → S10 | 进入变更集后选择文件；历史入口依赖菜单 | 未跟踪、部分暂存、重命名、分支切换、后台重算；依据官方文档 |

## 外观为什么好看

最值得借鉴的是清楚的信息层级和差异表达。

1. **内容占据主体。** 顶部只有文件身份、统计和模式，底部承载导航与操作，比较区域获得最大的连续空间。
2. **颜色有稳定含义。** 新增用绿、删除用红、修改用蓝，冲突另用警示色；同一行里再加深具体变化的片段。行号边上的符号提供额外提示。[官方颜色说明](https://kaleidoscope.app/help/docs/text-diffs-and-colors)
3. **两种字体各司其职。** 窗口和路径使用界面字体，代码使用等宽字体；行号和元数据退到次级层。
4. **阅读方式可以变化。** Blocks 便于按块核对，Fluid 减少为了对齐而产生的空白，Unified 便于顺序阅读。合并时 Unified 还可把候选与最终结果组织成两个区域。[文本视图说明](https://kaleidoscope.app/help/docs/text-comparison-views)
5. **不同任务共用窗口语言。** 路径栏、A/B 身份、顶部模式和底部操作位置相近，文本、目录、图片各自提供适合内容的主体。

### 自用版的设计方向

建议保持精简的 macOS 文档窗口：原生红黄绿按钮、统一标题工具栏、必要时才出现的侧栏、稳定的底部状态栏。文本默认用清晰的双栏布局；Fluid 的连接与独立布局可以在基础比较稳定之后加入。

可以从以下原创参数起步，后续用真实样例调节。这些不是从原应用提取的设计令牌。

| 项目 | 建议起点 | 目的 |
| --- | --- | --- |
| 界面字号 | 12–13 px | 紧凑但保持可读 |
| 代码字号与行高 | 13–14 px；1.55–1.65 | 给差异标记和中文足够空间 |
| 工具栏高度 | 48–56 px | 容纳窗口按钮与模式切换 |
| 底栏高度 | 28–32 px | 显示变化计数、编码、换行方式、下一处差异 |
| 控件圆角 | 6–10 px，按控件类型统一 | 形成一致的视觉节奏 |
| 差异颜色 | 新增绿、删除红、修改蓝、冲突琥珀；低透明背景配符号 | 长时间阅读时让内容保持清晰 |
| 材质 | 标题栏与辅助区域少量使用，代码区保持稳定底色 | 减少背景变化对阅读的影响 |

Electron 提供自定义标题栏、保留原生窗口按钮以及 macOS vibrancy 的接口，因此窗口外观不存在根本障碍。完整的原生控件行为仍需逐项适配；仅设置材质不会自动获得整套系统界面。[标题栏文档](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar)、[窗口 API](https://www.electronjs.org/docs/latest/api/browser-window#winsetvibrancytype-options-macos)

## 可复用组件

| 组件 | 变体与状态 | 使用位置 |
| --- | --- | --- |
| 文档窗口与标题栏 | 激活/未激活、已修改、可拖动区域、原生按钮 | S02–S07、S09 |
| 比较模式切换 | 文本三种；图片四种；选中/禁用/键盘焦点 | S02–S04、S06–S07 |
| 路径栏与 A/B 标识 | 文件/目录、交换两侧、长路径省略 | S02–S07 |
| 文件架 | 多份输入、当前 A/B、增加文件 | 比较窗口；手册支持 |
| 文本面板 | 只读/可编辑、换行/不换行、搜索与选区 | S02–S04、S07 |
| 差异块与行内高亮 | 新增/删除/修改/冲突、当前块 | S02–S04、S07 |
| 差异连接区域 | 对齐块、错位连接、单侧新增 | S03 |
| 底部操作栏 | 上一处/下一处、计数、采用 A/B、禁用 | S02–S07 |
| 目录行 | 目录/文件、相同/修改/单侧、展开/收起 | S05 |
| 图片画布与检查器 | 缩放、平移、分割、差异遮罩、未选像素 | S06 |
| 筛选与列表 | 名称、变化类型、空结果、当前项 | S05、S09–S10 |
| 设置分组 | 全局默认与当前会话选项 | S08 与比较窗口 |

## Electron 实现方案

以下是针对自用 macOS 版的工程判断。

| 层 | 建议 | 职责 |
| --- | --- | --- |
| 桌面外壳 | Electron | 窗口、菜单、打开/保存对话框、文件拖入、系统主题 |
| 界面 | React + TypeScript + 自定义 CSS | 工具栏、会话、目录树、检查器；统一自己的视觉语言 |
| 文本视图 | CodeMirror 6 + `@codemirror/merge` | 先使用双栏和 unified 能力，定制颜色、行号和块操作 |
| 文本计算 | 初期沿用编辑器配套能力；独立封装比较接口 | 行级与行内差异、超时策略、取消与旧结果丢弃 |
| 文件与后台任务 | 主进程管理访问；后台进程/worker 处理扫描和计算 | 异步读取、受控并发、进度、文件变化通知 |
| 图片视图 | Canvas；像素差异按需交给 worker | 并排、分割、差异遮罩、共享缩放坐标 |
| 本地保存 | JSON 保存偏好和有限的最近会话 | 记录路径与选项；会话缓存按需要加入 |
| 后续 Git | 受控调用 Git CLI | 指定版本内容、变更文件列表、difftool/mergetool 接口 |

CodeMirror 的官方包给出了 split merge view 和 unified merge view 的入口，可以减少首版的编辑器工作量。它不是现成的 Kaleidoscope，也不应把两栏合并视图等同于完整的三方冲突引擎。[官方包说明](https://raw.githubusercontent.com/codemirror/merge/main/README.md)

建议把调用关系组织为：**React 界面 → preload 暴露的有限会话接口 → 主进程协调文件访问与后台任务 → 分批返回状态和结果。** 纯文本计算也可以在 Web Worker 内完成；文件扫描、哈希等任务不应阻塞主进程。每次比较带任务编号，输入发生变化后取消旧任务，拒绝过期结果。[Electron 性能建议](https://www.electronjs.org/docs/latest/tutorial/performance)、[后台进程 API](https://www.electronjs.org/docs/latest/api/utility-process)

Fluid 布局需要处理两侧独立行高、折行、折叠与连接位置，不能假设给现有双栏编辑器增加几条连线就完成了。三方合并还需要共同祖先、冲突区域和结果文档的完整状态模型。

只做 macOS 时，SwiftUI 配合 AppKit 也值得作为另一条路线评估，尤其是把系统控件行为放在首位时。如果你希望用前端技术快速调整外观并逐步加功能，当前建议仍是 Electron；内存和启动表现应在可运行原型上实际测量。

## 推导的数据模型

以下 7 个实体都是独立实现的推导，字段不来自原应用的存储或私有接口。

| 实体 | 主要字段 | 依据与置信度 |
| --- | --- | --- |
| ComparisonSession | id、kind、inputIds、layout、options、activeChange、taskId | S02–S07 都保留输入和视图状态；高 |
| FileReference | id、path、origin、label、encoding、lineEnding、snapshotVersion | 文件/剪贴板入口与路径栏；高；编码等具体字段为实现选择 |
| DiffHunk | id、kind、aRange、bRange、inlineRanges | S02–S04 的块和局部变化；高；具体表示法为推导 |
| FolderEntry | relativePath、entryType、aMetadata、bMetadata、status、children | S05 配对树与状态；高 |
| MergeDecision | hunkId、choice、customText、resolved、revision | S07 和采用/编辑/撤销行为；中；base 是会话的可选输入 |
| Preferences | appearance、textDefaults、folderDefaults、imageDefaults | S08 的分类设置；高 |
| RecentEntry | sessionId、inputPaths、lastOpenedAt、displayTitle | S01 与重开功能；中；是否存快照是自用版要决定的策略 |

一个 ComparisonSession 引用多个 FileReference；文本会话产生多个 DiffHunk；合并会话再关联 MergeDecision；目录会话管理 FolderEntry 树；RecentEntry 引用可重新打开的会话信息。无需为个人自用版引入账户或云端数据库。

## 三个主要难点

**差异结果与阅读位置一致。** 大量重复行、移动代码、长行、中文和 emoji 都会影响块的匹配及行内范围；折行和折叠又会改变视觉位置。先保证结果与导航正确，再改善匹配质量。

**后台工作与实时状态一致。** 目录扫描、文件读取、外部修改通知可能同时发生。需要进度、取消、过期结果过滤和受控并发。目录比较与文本比较应分别定义规则；原应用也明确说明目录比较不会沿用文本的忽略空白设置。[目录比较说明](https://kaleidoscope.app/help/docs/comparing-folders)

**合并与保存可靠。** 采用一侧、手工编辑和撤销必须同步更新冲突状态；保存前应检测外部变更，并尽量使用同目录临时文件替换。编码、BOM、CRLF/LF 和文件权限也需要保留。这些是自用版的可靠性要求，不是对原应用内部机制的断言。

## 首版范围与验证

功能状态详见 [features.csv](features.csv)：共 44 项，其中 must 19 项、should 14 项、could 7 项、skip 4 项。must 表示自用核心版本需要具备，可以分文本与目录两个阶段完成。分析完成时尚未构建；当前实现进展见 `features.csv` 的 `clone` 列和[docs/PLAN.md](../docs/PLAN.md)。

建议按三步推进：

1. **文本首版。** 双文件拖入与剪贴板、双栏与统一布局、字符高亮、差异跳转、搜索、基本主题、采用一侧、撤销与另存为。
2. **目录首版。** 递归配对、相同/修改/单侧状态、名称与状态筛选、下钻文本比较、扫描进度与取消。复制覆盖功能单独加入操作预览。
3. **扩展阶段。** 图片并排/分割/差异、三方合并、Git CLI 接入，再考虑工作副本实时变更和历史视图。

文本阶段至少验证相同与空输入、只改空白、CRLF/LF、中文与 emoji、重复行、长行、撤销后重新保存。目录阶段验证深层树、权限失败、符号链接、扫描中删除或修改文件，以及取消后不会再覆盖新结果。性能样例可从 1/10/50 MB 文本和 1 万/10 万条目录逐步增加，记录响应与内存；这些数字是建议测试档位，不是承诺支持上限。

### 规模判断

分析范围为 10 个界面场景、6 条流程、7 个推导实体。对一名熟悉 Electron 的开发者而言，文本与基础目录版属于 M，通常按数周级工程评估；包含成熟图片工具、三方合并、Git 实时变更和完整系统适配的版本应按 L 或更大范围评估。具体时间应在文本原型跑通后，根据样例和性能结果重估。

下一步应先做一个可运行的 Electron 文本比较原型，验收窗口外观、真实差异和保存流程，再决定目录比较的实现细节。

## 实现边界

借鉴公开功能和用户可见的交互模式，使用自己的名称、图标、视觉资源和比较实现。参考截图仅保留在本分析目录，后续应用打包时排除。许可协议限制对内部机制的逆向与反编译；本分析基于公开手册、应用元信息、可访问性信息、公开 CLI 和可见界面。[原应用许可条款](https://cloud.kaleidoscope.app/legal/terms)

个人首版跳过原品牌资源、许可和订阅系统，以及网页分享服务。Git 实时变更属于后续可实现功能，不属于无法实现的部分。
