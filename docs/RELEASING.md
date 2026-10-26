# 发布流程

当前版本的说明见 [0.1.0](releases/0.1.0.md)。目标平台为 macOS Apple Silicon，使用项目选定的原生 `.icon` 图标。发布脚本不上传文件、不创建远程版本，也不更改远程仓库。

## 版本与说明

`package.json`、`package-lock.json` 顶层与根包版本必须一致，使用稳定三段版本。为每个版本准备 `docs/releases/<version>.md`，标题必须匹配 `# Diffolio <version>`。

```bash
npm run release:check
```

## 构建本地候选包

要求 macOS arm64、Node.js 22.12+、npm，以及已通过 `xcode-select` 选定的 Xcode / Icon Composer 27+。先完成变更审查并提交源码，工作区需要保持干净。

```bash
npm ci
npm run release:mac
```

命令依次检查元数据、格式和单元测试，构建图标与应用，再用 electron-builder 生成 DMG 和 ZIP。打包不读取其他项目的签名配置；本地候选包显式关闭 Developer ID 签名及公证，清单记录 `developerIdSigned: false`、`notarized: false`。公开分发需要另外配置本项目的签名身份和公证流程。

0.1.0 的目录为 `release/0.1.0/macos/arm64/`，仅保留：

- `Diffolio-0.1.0-macOS-arm64.dmg`
- `Diffolio-0.1.0-macOS-arm64.zip`
- `RELEASE-NOTES.md`
- `release-manifest.json`：版本、平台、签名状态、源码提交、时间及两个安装包的大小和 SHA-256。
- `SHA256SUMS`：安装包、说明和清单的校验值。

重复构建时先在临时目录完整生成并检查，再替换本版本候选目录；失败时保留上一份产物。安装包、暂存文件与解压验证目录均已被 Git 忽略。

## 验证实际安装包

在构建时对应的源码提交上执行：

```bash
npm run release:verify
```

验证包括校验值、DMG/ZIP 完整性、DMG 中的 Applications 链接，以及两种安装方式中的版本、arm64 架构、原生图标和应用内容一致。随后启动从 ZIP 实际解压的应用，验证生产 preload、文件打开与剪贴板 A/B。检查使用临时用户数据并恢复原剪贴板。

也可单独检查下载文件的完整性：

```bash
cd release/0.1.0/macos/arm64
shasum -a 256 -c SHA256SUMS
```

## 远程发布

当前未配置 Diffolio 的 Git remote 或下载地址。确定目标仓库后，再推送源码和 `v0.1.0` 标签，并按实际签名与公证状态创建发布。上传时从版本目录选择这五个文件，正文使用对应版本说明；不能将本地候选包描述为已签名或已公证。
