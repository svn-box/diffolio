<div align="center">
  <img src="resources/icon.png" width="112" height="112" alt="Diffolio" />
  <h1>Diffolio</h1>
  <p>为细节留出空间的 macOS 文件比较工具。</p>
  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>
  <p><sub>macOS 13.3+ · Apple Silicon</sub></p>
</div>

在紧凑的桌面窗口中比较本地文本、文件夹和图片，保留清晰、安静的阅读与编辑体验。

## 功能

- **文本比较**：双栏和统一布局、语法高亮、行内差异、差异导航、长行换行和不变区域折叠。
- **搜索**：统一搜索栏、A/B 范围切换、前后匹配项、区分大小写、完整单词和正则表达式。
- **编辑结果**：从 B 创建结果副本、采用 A 的当前差异、手动编辑、跨布局撤销/重做，保存时保留原有 BOM 和换行格式，并检查目标是否被外部程序修改。
- **文件夹比较**：根据实际内容判断差异，按名称或差异筛选、打开配对文件、查看进度和取消扫描。
- **图片比较**：支持 PNG、JPEG、WebP、GIF，共享缩放与拖动，同尺寸图片支持分割滑块。
- **工作区**：多标签、最近记录、原生文件对话框、Finder 拖放、剪贴板文本、浅色/深色/跟随系统外观，以及可调字号。

## 界面预览

![欢迎页](resources/screenshots/tauri-welcome.png)

![文本比较与搜索](resources/screenshots/tauri-search-dark.png)

## 安装与使用

从 [GitHub Releases](https://github.com/svn-box/diffolio/releases/latest) 下载 Apple Silicon 版 DMG，打开后将 Diffolio 拖入“应用程序”。从 Electron 0.1.x 或本地预览版升级时，需要先手动安装一次。新版使用独立的设置和最近记录目录。

将两个文件或文件夹拖入窗口，分别向 A/B 加入内容，或者先打开内置示例。原始版本以只读方式打开；点击“创建结果”进行编辑，点击“另存结果”保存。

常用快捷键：⌘N 新建比较、⌘O 打开文件、⌘F 搜索、⌘G / ⇧⌘G 切换匹配项、⌘1 / ⌘2 切换布局、⌘, 打开设置。

点击“检查更新”手动检查，确认下载后重启安装。更新包须通过签名验证；请先保存结果，并等待当前任务完成。支持 UTF-8 文本，单文件上限 16 MiB，文件夹扫描上限 100,000 个条目。

## 隐私

文件内容在本机处理，无需账号，也无需上传文件。手动检查更新时会连接 GitHub 获取版本信息或下载安装包，不会发送比较内容。

## 许可

Diffolio 使用 [Diffolio Source Available License 1.0](LICENSE)。个人及公司内部均可免费使用，也可以用于有偿工作。遵守声明要求时可免费分发；出售、对软件访问收费，或改名、重新打包后销售，需要另行获得书面许可。第三方依赖保留原有许可，详见[第三方声明](THIRD_PARTY_NOTICES.md)。
