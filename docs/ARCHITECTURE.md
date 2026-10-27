# Diffolio 代码架构

## 模块职责

| 位置 | 职责 |
| --- | --- |
| `src/main/` | 原生窗口、菜单、文件读写、目录比较、设置与最近记录持久化、应用更新 |
| `src/preload/` | 通过有限的 `DiffolioApi` 连接界面与主进程 |
| `src/shared/` | 进程间类型、差异范围定位、内置示例 |
| `src/renderer/src/App.tsx` | 窗口组合与临时拖入反馈 |
| `src/renderer/src/state/` | Zustand 工作区状态和按职责分组的操作 |
| `src/renderer/src/editor/` | CodeMirror 创建、扩展、差异命令及撤销与阅读位置快照 |
| `src/renderer/src/components/` | 入口、文本/目录/图片工作区、设置及比较操作栏 |
| `src/renderer/src/components/shell/` | 标题栏、欢迎导航、会话标签与任务消息 |
| `src/renderer/src/hooks/useAppLifecycle.ts` | 原生菜单、扫描进度、主题、窗口未保存标记和通知计时器的连接与清理 |
| `src/renderer/src/styles/` | 按界面职责拆分的样式，导入顺序保持原有层叠关系 |

文件以一个清晰职责为单位，通常控制在 300 行以内；超过时先检查是否承担多个职责。不要仅按行数切碎紧密相关的逻辑，也不要把原来的大组件直接搬成同样大的 Hook 或 store。

## 路径别名

沿用 SVNBox 的约定，`@/` 指向 `src/renderer/src/`。渲染层内部模块及引用这些模块的 TypeScript 测试使用该别名；跨到共享类型、主进程或项目元数据的引用保留明确的相对路径。TypeScript、Electron Vite 与 Vitest 使用同一映射，避免只在编辑器中能解析而构建或测试失败。配置路径以配置文件的位置为基准。

## 状态归属

`createWorkspaceStore(api)` 使用 `zustand/vanilla` 创建独立状态实例，通过注入 `DiffolioApi` 在测试中替换原生操作。`workspace.ts` 绑定真实 preload 接口与 React `useStore`；组件订阅所需数据，组合派生值使用 `useShallow` 保持引用稳定。

- `session.ts` 定义会话、输入模式、脏状态与视图判定。
- `session-actions.ts` 处理新建、切换、编辑、交换、保存及关闭确认。
- `source-actions.ts` 处理文件、剪贴板、文件夹输入、下钻、任务编号、取消与过期结果。
- `catalog-actions.ts` 负责一次性启动读取，并分别串行提交偏好和最近记录，避免旧响应覆盖较新的操作。
- `workspace-store.ts` 组合这些操作并提供面板和消息状态。

结果文本、已保存文本和差异统计归属具体会话。窗口未保存标记取所有会话脏状态的并集；切换标签不会丢弃其他草稿。

CodeMirror 实例、选择范围、滚动位置和撤销历史由 `EditorRuntimeProvider` 持有，通过引用和快照缓存共享给比较视图与操作栏。它们不写入 Zustand、localStorage 或主进程设置文件。图片缩放、目录筛选、控件展开和拖入高亮仍是局部界面状态。

## 搜索与应用更新

`ComparisonSearch` 持有当前比较的搜索词、范围、选项与匹配位置，组件只订阅其快照。搜索栏位于两个编辑器外，CodeMirror 保留查询和跳转能力，由独立装饰扩展绘制匹配高亮。打开搜索不会单独挤压某一侧；命中折叠区时按照折叠起点展开对应两侧。查询计数上限为 10,000，并明确显示超限状态，跳转仍可遍历后续匹配。

应用更新的权威状态在主进程 `AppUpdates`；渲染侧独立 Zustand store 接收带递增 revision 的快照，拒绝旧异步响应。仅允许 status/check/download/install/release 五种 IPC 操作，发布地址和更新源固定。禁用自动检查、下载、退出时安装、预发布和降级。安装前两次检查全窗口未保存标记与目录任务，中间等待设置落盘；阻塞时保留已下载更新。

发布器对最终签名、公证 ZIP 生成 SHA-512 的 `latest-mac.yml`，其本身纳入 SHA-256 与草稿资产核对。完整更新依赖签名发布版本；已发布且未含更新入口的旧应用仍需手动安装一次新版本。

## 异步操作约束

会话 `id` 标识标签；`documentId` 标识当前输入版本。替换输入或交换 A/B 会更新后者，旧编辑器回调和快照不能写入新文档。

读取操作保留发起时的目标会话和输入版本。取消、被新任务取代、目标关闭或输入已替换后，返回的结果不会重新打开或覆盖它。进度只更新匹配的任务编号。

保存完成时仅把实际写出的那版内容标为已保存。保存期间产生的新编辑继续保持未保存状态。关闭确认完成后再次检查目标内容，防止对话框等待期间的新编辑被丢弃。

文件系统操作与持久化继续留在主进程；渲染层通过 preload 请求。偏好与最近记录采用主进程现有的临时文件及重命名写入。

## 资源与版本控制

公开图标、截图与截图捕获记录集中在 [`resources/`](../resources/README.md)。产品、设计、架构及计划放在 `docs/`。[`fixtures/`](../fixtures/README.md) 是单元测试、Electron 回归和截图所需的可复现输入，应提交。

`replica/` 整个目录仅保留在本地并被 Git 忽略，包括研究文档、功能清单、设计导出和参考截图。`npm run design:check` 生成的本地报告也写入该目录；构建与测试不依赖预先存在的研究文件。临时审查截图、工作目录、构建产物、依赖和签名材料均不提交。应用包包含编译产物、运行依赖、必要许可声明与固定的更新源配置。

## 验证入口

- `npm test`：真实文件读写与保存保护、目录内容比较、会话生命周期、异步取消、输入配对、设置提交顺序及编辑器快照清理。
- `npm run test:e2e`：真实 Electron 文本比较、块采用、编辑、跨布局撤销/重做、另存、主题、目录下钻与图片。
- `npm run test:search`：共享搜索栏对齐、A/B 范围、选项、匹配跳转、键盘、统一布局、紧凑深浅主题与折叠内容定位。
- `npm run test:updates`：打包应用的原生菜单、IPC 与更新界面；替换网络和安装客户端，验证手动确认、进度、失败重试、未保存保护与发布页。先运行 `package:dir`。
- `npm run test:entry`：入口、独立 A/B 输入、拖入、空文本、类型错误恢复、继续草稿与紧凑窗口。
- `npm run typecheck`、`npm run format:check`、`npm run design:check`：类型、格式和配色对比度。
- `npm run package:dir` 后运行 `npm run test:packaged`：原生图标打包、生产 preload、文件对话框、剪贴板和包内容。

所有自动化 Electron 检查使用临时用户数据。涉及剪贴板的检查会恢复原内容。
