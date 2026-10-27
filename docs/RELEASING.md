# 发布流程

当前版本说明见 [0.1.0](releases/0.1.0.md)。目标为 macOS Apple Silicon，保留选定的原生 `.icon` 图标。流程参考 SVNBox，分为签名、公证、实际安装包验收和发布四部分。

## GitHub 仓库配置

仓库地址由用户配置，工作流从 `GITHUB_REPOSITORY` 读取实际目标，不硬编码其他项目的地址。需要为目标仓库开放现有的 `xcode-27` macOS arm64 runner，包含 Xcode / Icon Composer 27+、Python 3 和 GitHub CLI；工作流安装 Node.js 26。

配置以下五项 Actions Secrets，可以使用仓库 Secrets 或获准共享的组织 Secrets：

| 名称 | 用途 |
| --- | --- |
| `BUILD_CERTIFICATE_BASE64` | Developer ID Application 证书及私钥的 P12，使用 Base64 编码 |
| `P12_PASSWORD` | P12 导出密码 |
| `APPLE_ID` | Apple 公证账号 |
| `APPLE_TEAM_ID` | 与证书一致的十位 Apple 团队标识 |
| `APPLE_APP_SPECIFIC_PASSWORD` | 公证账号的应用专用密码 |

证书只导入任务创建的临时 keychain。原有 keychain 搜索列表在导入前保存，清理步骤在失败时也执行，删除证书文件与临时 keychain 并恢复搜索列表。不读取其他仓库的 Secret 值；Secret 不进入构建产物或缓存。

## 正式发布

`package.json`、锁文件两个根版本与 `v<version>` 标签必须一致，说明位于 `docs/releases/<version>.md`，标题为 `# Diffolio <version>`。

```bash
npm run release:check
npm run format:check
npm test
npm run build
```

完成审查并提交源码后，推送 main 与版本标签：

```bash
git push origin main
git tag -a v0.1.0 -m "Diffolio 0.1.0"
git push origin v0.1.0
```

`.github/workflows/release-macos.yml` 会先核对标签、源码、版本和现有 Release，再执行：

1. 将 P12 导入临时 keychain，按团队选择 Developer ID，开启 Hardened Runtime 与 JIT entitlement。
2. 构建应用，提交 Apple 公证，通过后装订应用票据，再生成 ZIP。
3. 生成 DMG，签名、公证并装订票据。
4. 验证应用和 DMG 的签名、团队、票据与 Gatekeeper；解压 ZIP、只读挂载 DMG，核对版本、架构、图标和关键文件，运行解压应用的真实启动、文件与剪贴板检查。
5. 将通过验收的产物传给独立的 Linux publish job，重新核对 SHA-256、源码提交及标签。
6. 上传草稿 Release，核对每个服务端资产的名称、大小、状态及 SHA-256，再公开为最新正式版本。

签名参数缺失、证书团队不符、公证失败或安装包验收失败都会阻止发布。已有 Release 或草稿不会被覆盖。构建 job 仅有 `contents: read`；只有独立 publish job 获得 `contents: write`。

用户要求触发后只交付工作流链接：确认出现对应标签和源码的运行记录后即返回，不等待构建、公证或发布完成。触发成功不代表最终发布已经成功。

## 产物

正式目录为 `release/0.1.0/macos/arm64/`，只包含：

- `Diffolio-0.1.0-macOS-arm64.dmg`
- `Diffolio-0.1.0-macOS-arm64.zip`
- `RELEASE-NOTES.md`
- `release-manifest.json`：版本、签名/公证状态、团队、源码提交、时间和安装包哈希。
- `SHA256SUMS`

校验清单在最终签名、公证与装订后生成，不使用中间包的哈希。单独检查下载文件完整性可运行 `shasum -a 256 -c SHA256SUMS`。

## 未签名预览

Actions 的 `workflow_dispatch` 只构建和验收预览，不读取签名 Secrets、不创建 Release。本机也可以在干净的已提交源码上运行：

```bash
npm ci
npm run release:mac:preview
```

预览保存在 `release/preview/0.1.0/macos/arm64/`，清单明确记录未签名、未公证。版本标签不允许使用 `--unsigned`；正式发布器也拒绝预览产物。

## 本机签名构建

如果本机已配置同样的 Apple 公证变量，并将证书导入专用 keychain，额外设置 `CSC_KEYCHAIN` 为该 keychain 路径，然后运行 `npm run release:mac` 和 `npm run release:verify`。凭据缺失时不会回退为未签名包。
