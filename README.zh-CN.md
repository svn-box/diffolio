<div align="center">
  <img src="resources/icon.png" width="128" height="128" alt="Diffolio 应用图标" />
  <h1>Diffolio</h1>
  <p>
    <a href="README.md">English</a> · <a href="README.zh-CN.md"><strong>简体中文</strong></a>
  </p>
  <p>在 macOS 上，清楚地比较每一个版本。</p>
  <p>
    <a href="#功能">功能</a> ·
    <a href="#界面预览">界面预览</a> ·
    <a href="#使用方法">使用方法</a> ·
    <a href="#开发">开发</a>
  </p>
  <p><sub>v0.1.0 · macOS · Apple Silicon（arm64）</sub></p>
</div>

Diffolio 是一款紧凑的 macOS 文件对比工具，用于比较本机文本、文件夹和图片。打开两个版本，查看差异，需要时创建可编辑的结果副本。原始输入以只读方式打开，保存结果由你明确执行。

应用界面目前为**简体中文**，本仓库提供中英文说明文档。当前版本面向个人自用，已构建的本机应用包适用于 Apple Silicon。

## 功能

- **文本比较** — 双栏和统一布局，语法着色、行级与行内差异、差异跳转、搜索、自动换行和不变区域折叠。
- **灵活加入内容** — 选择文件、分别拖入 A/B，或加入剪贴板文本。第一个来源立即显示只读预览，加入兼容的另一侧后自动开始比较。
- **编辑结果副本** — 从 B 创建结果，当前差异采用 A，手工编辑，跨布局撤销和重做，通过原生另存对话框保存。保存沿用 B 的 UTF-8 BOM 与换行格式，并检查目标文件的外部变动。
- **文件夹比较** — 根据内容比较文件，在对齐的目录树中浏览、按名称筛选或只看差异，双击或使用键盘打开文件。两侧文件夹可以分别从不同位置选择，扫描时显示进度并支持取消。
- **图片比较** — 并排查看 PNG、JPEG、WebP 和 GIF，缩放或适应画布；同尺寸图片可用分割滑块查看。
- **比较会话** — 多个比较通过标签切换，重新打开最近文件对，返回欢迎页再继续时保留当前结果编辑和撤销记录。
- **桌面外观** — 跟随系统、浅色与深色工作区，可调编辑字号，紧凑的原生窗口控件与独立欢迎页。应用图标包含原生默认、深色及着色外观。

## 界面预览

以下截图来自打包后实际运行的应用，窗口逻辑尺寸为 **1280 × 800**，使用项目自带样例和独立临时数据目录。截图展示中文界面，编辑字号为 14px；最近记录来自实际打开的样例比较，未使用个人文件或剪贴板内容。应用默认窗口仍为 **964 × 564**，可自由调整大小。

**文本比较** — 两侧文稿占满比较窗口，通过稳定的颜色区分新增、删除和修改。

![Diffolio 深色文本比较：占满窗口的双栏文稿与清晰的差异高亮](resources/screenshots/comparison-dark.png)

<details>
<summary>欢迎页与最近比较</summary>

从拖入区开始、选择文件，或重新打开最近的文件对。导航只保留在欢迎页，比较时将空间交给文稿。

![Diffolio 欢迎页：统一石墨底色导航、彩色拖入区与最近比较记录](resources/screenshots/welcome.png)

</details>

<details>
<summary>加入两个版本，立即预览第一侧</summary>

分别选择文件或粘贴文本。加入的第一侧直接显示只读预览，另一侧继续等待输入；文件夹模式提供独立的位置选择。

![Diffolio 新建比较：独立的 A/B 输入与选择、粘贴操作](resources/screenshots/new-comparison.png)

![Diffolio 已加入一侧文本并显示只读预览，另一侧等待加入内容](resources/screenshots/source-preview.png)

</details>

<details>
<summary>在浅色工作区编辑结果</summary>

从 B 创建结果副本，采用 A 的某处变更，再审阅并保存。结果标记、撤销控件和另存入口始终清楚可见。

![Diffolio 浅色工作区：可编辑结果副本与明确的结果操作栏](resources/screenshots/comparison-light.png)

</details>

<details>
<summary>比较文件夹</summary>

在对齐的目录树中查看已修改、相同和单侧文件，再打开具体文件检查内容。

![Diffolio 文件夹比较：已修改、相同和单侧存在的文件](resources/screenshots/folder-comparison.png)

</details>

<details>
<summary>比较图片</summary>

拖动分割线查看两张同尺寸样例图片的变化。也可使用并排模式查看，支持两侧尺寸不同的图片。

![Diffolio 图片比较：通过分割线查看两张样例图片](resources/screenshots/image-comparison.png)

</details>

<details>
<summary>外观与编辑器偏好</summary>

选择跟随系统、浅色或深色，通过可搜索的字号控件调整编辑器。偏好保存在本机。

![Diffolio 外观设置与已展开的可搜索字号 Combobox](resources/screenshots/font-combobox.png)

</details>

## 使用方法

### 打开两个版本

按 **⌘N** 新建比较，或按 **⌘O** 选择一个或两个文件。也可以将两个文件一起拖入窗口、分别拖入 A/B，或使用剪贴板入口。分次打开单个文件时，会补齐缺少的一侧；两侧需要是相同内容类型的文本或图片。

欢迎页的**示例比较**提供明确标记的文本样例。最近记录会从磁盘重新打开对应的真实路径。

### 查看差异与保存结果

使用箭头控件跳转差异，按 **⌘F** 搜索，按 **⌘1 / ⌘2** 切换双栏或统一布局。底部提供自动换行与折叠控件。

点击**创建结果**使 B 成为可编辑副本，**当前差异采用 A**会应用当前指示的 A 侧变更，也可以直接编辑并撤销、重做。点击**另存结果**，或按 **⌘S / ⌘⇧S** 打开原生保存对话框，明确选择保存位置。关闭已修改的结果时，可选择保存、放弃修改或取消。

### 比较文件夹与图片

按 **⌘⇧O**，或在新建比较中选择文件夹模式，再分别选择 A、B。按名称筛选目录树、开启“只看差异”，双击文件，或聚焦后按 **Enter / 空格**打开内容。

通过同样的文件入口加入两张受支持的图片，选择并排查看；尺寸相同时也可使用分割模式。使用缩放控件调整比例，或回到“适应”。

### 保留当前进度

点击返回箭头查看最近比较，再通过**继续比较**回到当前会话；多个会话通过标签切换。已打开会话和未保存结果草稿仅保留在本次应用会话中；最近文件对与偏好会跨重启保存。

### 快捷键

| 快捷键   | 操作                |
| -------- | ------------------- |
| ⌘N       | 新建比较            |
| ⌘O       | 打开文件            |
| ⌘⇧O      | 开始文件夹比较      |
| ⌘1 / ⌘2  | 双栏 / 统一文本布局 |
| ⌘F       | 在文本比较中查找    |
| ⌘Z / ⌘⇧Z | 撤销 / 重做结果编辑 |
| ⌘S / ⌘⇧S | 另存结果            |
| ⌘W       | 关闭当前比较        |
| ⌘,       | 打开设置            |

## 当前范围

文本支持 **UTF-8**，包括 BOM 与 LF、CRLF、CR 换行。打开的文本、图片和保存的结果限制为**单文件 16 MiB**，目录扫描上限为 **100,000 条**。这些是当前实现边界，不是性能测试结论。遍历目录时按链接本身比较符号链接，不继续跟随其目标。

三方合并、Git/CLI 集成、Fluid 连线、忽略空白规则、目录复制与同步、图片像素差异遮罩仍在计划中。当前进度见 [PLAN.md](docs/PLAN.md)，更完整的范围见[功能清单](replica/features.csv)。

## 开发

### 从源码运行

需要 **Node.js 22.12+ 和 npm**。在项目目录运行：

```bash
npm ci
npm run dev
```

构建并运行已编译版本：

```bash
npm run build
npm start
```

使用 Electron、React、TypeScript、Zustand 和 CodeMirror。Zustand 管理比较会话、结果草稿、偏好、最近记录与任务反馈；编辑器实例和撤销历史留在编辑器层。字号控件采用 shadcn 的 Radix Popover + cmdk Command 组合。依赖版本固定在 `package.json` 和 `package-lock.json`。

### 打包 macOS 应用

图标构建需要通过 `xcode-select` 选中的 **Xcode / Icon Composer 27+**。打包采用已选定的 `frosted-diff` 原生 `.icon`，使用铺满的原生底板与透明前景，沿用 SVNBox 的构建方式，生成资源目录与兼容 ICNS。

```bash
npm run package:dir
open release/mac-arm64/Diffolio.app
```

`npm run icons:build` 可以单独重新构建图标。应用包包含运行文件和编译后的图标，开发参考、样例与截图保留在工程中。

### 验证修改

```bash
npm run typecheck
npm run format:check
npm test
npm run test:e2e
npm run test:entry
npm run design:check
npm run test:packaged
```

运行 `test:packaged` 前需要先生成应用包。Electron 检查使用临时应用数据，剪贴板检查结束后恢复原内容；对比度报告覆盖工作区深浅主题的颜色组合。

### 更新截图

```bash
npm run docs:screenshots
```

该命令构建应用，用项目样例与临时应用数据截取真实 macOS 窗口，需要终端或自动化宿主具备 macOS 屏幕录制权限。图片旁记录捕获信息与样例哈希，详见[截图说明](resources/screenshots/README.md)。

### 项目文档

| 文档                                     | 内容                              |
| ---------------------------------------- | --------------------------------- |
| [产品说明](docs/PRODUCT.md)              | 目标用户、产品用途与项目约束      |
| [开发计划](docs/PLAN.md)                 | 阶段、已实现范围与后续工作        |
| [设计规范](docs/DESIGN.md)               | 布局、配色、字体与交互约束        |
| [代码架构](docs/ARCHITECTURE.md)         | 状态归属、模块职责与回归检查      |
| [重构审查](docs/REVIEW.md)               | 首次提交前的发现、修复与验证      |
| [组件说明](replica/design/components.md) | 已实现的组件及其状态              |
| [比较样例](fixtures/README.md)           | 文本、目录、图片及后续合并输入    |
| [公开资源](resources/README.md)          | README 截图、选定图形与图标构建   |
| [参考分析](replica/recon.md)             | Kaleidoscope 界面、流程与实现观察 |
