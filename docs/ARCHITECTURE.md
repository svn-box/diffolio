# Diffolio 代码架构

## 模块职责

| 位置 | 职责 |
| --- | --- |
| `src/main/` | 原生窗口、菜单、文件读写、目录比较、设置与最近记录持久化 |
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

## 状态归属

`createWorkspaceStore(api)` 使用 `zustand/vanilla` 创建独立状态实例，通过注入 `DiffolioApi` 在测试中替换原生操作。`workspace.ts` 绑定真实 preload 接口与 React `useStore`；组件订阅所需数据，组合派生值使用 `useShallow` 保持引用稳定。

- `session.ts` 定义会话、输入模式、脏状态与视图判定。
- `session-actions.ts` 处理新建、切换、编辑、交换、保存及关闭确认。
- `source-actions.ts` 处理文件、剪贴板、文件夹输入、下钻、任务编号、取消与过期结果。
- `catalog-actions.ts` 负责一次性启动读取，并分别串行提交偏好和最近记录，避免旧响应覆盖较新的操作。
- `workspace-store.ts` 组合这些操作并提供面板和消息状态。

结果文本、已保存文本和差异统计归属具体会话。窗口未保存标记取所有会话脏状态的并集；切换标签不会丢弃其他草稿。

CodeMirror 实例、选择范围、滚动位置和撤销历史由 `EditorRuntimeProvider` 持有，通过引用和快照缓存共享给比较视图与操作栏。它们不写入 Zustand、localStorage 或主进程设置文件。图片缩放、目录筛选、控件展开和拖入高亮仍是局部界面状态。

## 异步操作约束

会话 `id` 标识标签；`documentId` 标识当前输入版本。替换输入或交换 A/B 会更新后者，旧编辑器回调和快照不能写入新文档。

读取操作保留发起时的目标会话和输入版本。取消、被新任务取代、目标关闭或输入已替换后，返回的结果不会重新打开或覆盖它。进度只更新匹配的任务编号。

保存完成时仅把实际写出的那版内容标为已保存。保存期间产生的新编辑继续保持未保存状态。关闭确认完成后再次检查目标内容，防止对话框等待期间的新编辑被丢弃。

文件系统操作与持久化继续留在主进程；渲染层通过 preload 请求。偏好与最近记录采用主进程现有的临时文件及重命名写入。

## 资源与版本控制

公开图标、截图与截图捕获记录集中在 [`resources/`](../resources/README.md)。产品、设计、架构及计划放在 `docs/`。[`fixtures/`](../fixtures/README.md) 是单元测试、Electron 回归和截图所需的可复现输入，应提交。

`replica/` 保留文字研究和设计资料；`replica/screens/` 是本机的第三方参考截图，已忽略。临时审查截图、工作目录、构建产物、依赖和签名材料均不提交。应用包只包含编译产物与运行依赖。

## 验证入口

- `npm test`：真实文件读写与保存保护、目录内容比较、会话生命周期、异步取消、输入配对、设置提交顺序及编辑器快照清理。
- `npm run test:e2e`：真实 Electron 文本比较、块采用、编辑、跨布局撤销/重做、另存、主题、目录下钻与图片。
- `npm run test:entry`：入口、独立 A/B 输入、拖入、空文本、类型错误恢复、继续草稿与紧凑窗口。
- `npm run typecheck`、`npm run format:check`、`npm run design:check`：类型、格式和配色对比度。
- `npm run package:dir` 后运行 `npm run test:packaged`：原生图标打包、生产 preload、文件对话框、剪贴板和包内容。

所有自动化 Electron 检查使用临时用户数据。涉及剪贴板的检查会恢复原内容。
