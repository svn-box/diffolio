# Development / 开发

[English](#english) · [简体中文](#简体中文)

## English

### Run from source

Use **Node.js 22.12+ and npm**. From the project directory:

```bash
npm ci
npm run dev
```

To build and run the compiled application:

```bash
npm run build
npm start
```

The stack is Electron, React, TypeScript, Zustand and CodeMirror. Zustand manages comparison sessions, result drafts, preferences, recents and task feedback. Editor instances and undo history stay in the editor layer. The font-size control uses the shadcn Radix Popover + cmdk Command composition. Dependencies are pinned in `package.json` and `package-lock.json`.

### Package for macOS

The icon build requires **Xcode / Icon Composer 27+**, selected with `xcode-select`. Packaging uses the chosen `frosted-diff` native `.icon` document, a full native background and a transparent foreground, following SVNBox's build approach. It produces an asset catalog and a compatible ICNS.

```bash
npm run package:dir
open release/mac-arm64/Diffolio.app
```

`npm run icons:build` rebuilds only the icon resources. The application package contains runtime files and compiled icons; development references, fixtures and screenshots stay outside it.

### Verify changes

```bash
npm run typecheck
npm run format:check
npm test
npm run test:e2e
npm run test:entry
npm run design:check
npm run test:packaged
```

Build the application package before running `test:packaged`. The Electron checks use temporary app data; clipboard checks restore their original contents. The contrast report covers the workspace's light/dark color pairs.

### Refresh the screenshots

```bash
npm run docs:screenshots
```

This builds the app and captures its actual macOS window using fixtures and temporary app data. It requires macOS screen-recording access for the terminal/automation host. Capture details and source hashes are recorded beside the images; see [the screenshot notes](../resources/screenshots/README.md).

### Project documentation

| Document                                     | Contents                                                       |
| -------------------------------------------- | -------------------------------------------------------------- |
| [Product brief](PRODUCT.md)                  | Intended users, product purpose and project constraints        |
| [Development plan](PLAN.md)                  | Milestones, implemented scope and remaining work               |
| [Design system](DESIGN.md)                   | Layout, color, typography and interaction rules                |
| [Code architecture](ARCHITECTURE.md)         | State ownership, module responsibilities and regression checks |
| [Refactor review](REVIEW.md)                 | Findings, fixes and verification before the initial commit     |
| [Release instructions](RELEASING.md)         | Version checks, DMG/ZIP generation and installer acceptance    |
| [Comparison fixtures](../fixtures/README.md) | Text, folder, image and future merge samples                   |
| [Public resources](../resources/README.md)   | README screenshots, selected artwork and native icon build     |

### Keep license notices current

After changing dependencies, run `npm ci` and `npm run licenses:generate`, review the license changes, and commit the resulting notice and full license texts. `npm run licenses:check` verifies them against the installed lockfile versions without modifying files. Missing license texts require an upstream review; generation does not infer permission from a package name.

Packaging and release builds check the notices first and include `LICENSE`, `THIRD_PARTY_NOTICES.md`, and all linked texts in `Contents/Resources/legal/`. Preserve Electron's separate runtime notices. This does not replace checking license compatibility when introducing a dependency.

## 简体中文

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

该命令构建应用，用项目样例与临时应用数据截取真实 macOS 窗口，需要终端或自动化宿主具备 macOS 屏幕录制权限。图片旁记录捕获信息与样例哈希，详见[截图说明](../resources/screenshots/README.md)。

### 项目文档

| 文档                               | 内容                             |
| ---------------------------------- | -------------------------------- |
| [产品说明](PRODUCT.md)             | 目标用户、产品用途与项目约束     |
| [开发计划](PLAN.md)                | 阶段、已实现范围与后续工作       |
| [设计规范](DESIGN.md)              | 布局、配色、字体与交互约束       |
| [代码架构](ARCHITECTURE.md)        | 状态归属、模块职责与回归检查     |
| [重构审查](REVIEW.md)              | 首次提交前的发现、修复与验证     |
| [发布流程](RELEASING.md)           | 版本检查、DMG/ZIP 生成与安装验收 |
| [比较样例](../fixtures/README.md)  | 文本、目录、图片及后续合并输入   |
| [公开资源](../resources/README.md) | README 截图、选定图形与图标构建  |

### 维护许可声明

依赖变更后运行 `npm ci` 和 `npm run licenses:generate`，审阅许可变化，并提交更新后的声明与完整许可文本。`npm run licenses:check` 根据已安装依赖及锁文件核对声明，不修改文件；缺少许可文本时需核对上游，生成脚本不会根据软件包名称推断授权。

打包与发行构建首先检查声明，将 `LICENSE`、`THIRD_PARTY_NOTICES.md` 与链接的完整文本放入 `Contents/Resources/legal/`，同时保留 Electron 的独立运行时声明。引入新依赖时仍需检查许可兼容性。
