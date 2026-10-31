# Release and updater configuration

The release workflow is `.github/workflows/release-macos.yml`. It uses the existing `xcode-27` macOS arm64 runner and a separate Ubuntu publishing job. Public releases require a stable version tag, verified installers, Apple notarization and a version-bound Tauri update signature. Existing releases and tags are never overwritten.

## 更新器怎么配置

只需要配置一次，后续版本继续复用同一对更新密钥。

1. **应用里放公钥和更新地址。** `src-tauri/tauri.conf.json` → `plugins.updater` 已配置公钥，以及 `https://github.com/svn-box/diffolio/releases/latest/download/latest.json`。`requireSignedVersion` 开启，拒绝降级；运行时只接受更高版本的稳定版。
2. **GitHub 里放私钥。** 仓库 → Settings → Secrets and variables → Actions，配置 `TAURI_SIGNING_PRIVATE_KEY`（私钥文件全文）和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（私钥密码）。这两项已接入发布工作流。私钥不是文件路径，也不是 `.pub` 文件。
3. **发布时自动生成更新文件。** 推送版本标签后，Actions 编译、签名、公证应用，再将最终应用打成 `.app.tar.gz`，使用 Tauri signer 加上版本签名，生成 `.sig` 和 `latest.json`，验证后一起上传 GitHub Release。无需手写或另行部署更新服务器。
4. **用户手动更新。** 应用中检查更新 → 确认下载 → 重启安装。有未保存结果或运行中的任务时，安装会被阻止。启动应用不会自动检查或下载。

维护者本机首次生成时，将私钥备份为 `~/.tauri/diffolio.key`，公钥为 `~/.tauri/diffolio.key.pub`，密码单独保存在 `~/.tauri/diffolio.key.password`。私钥与密码文件权限为 `600`，不在 Git 仓库内。请将备份妥善保存到密码管理器或其他安全位置。GitHub Secrets 无法读回原始值；不要为后续普通发布重新生成密钥，否则已安装应用不再信任新更新。

从零配置另一个应用时，可以在该项目运行 `npx tauri signer generate -w ~/.tauri/另一个应用.key`，交互设置密码；再分别将生成的公钥放进配置，私钥与密码存为上述两项 Secrets。不要覆盖 Diffolio 现有的密钥文件。

Apple 签名、公证与更新签名各自独立。Apple 用来让 macOS 验证应用身份；Tauri 更新密钥用来让已安装的 Diffolio 验证下载的更新包。

## Required repository secrets

| Secret                               | Purpose                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `BUILD_CERTIFICATE_BASE64`           | Existing Developer ID Application P12, base64 encoded              |
| `P12_PASSWORD`                       | Existing P12 password                                              |
| `APPLE_ID`                           | Existing Apple notarization account                                |
| `APPLE_TEAM_ID`                      | Existing ten-character Apple team                                  |
| `APPLE_APP_SPECIFIC_PASSWORD`        | Existing app-specific password; mapped to Tauri's `APPLE_PASSWORD` |
| `TAURI_SIGNING_PRIVATE_KEY`          | Complete encrypted Tauri private key contents                      |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Tauri private key password                                         |

The temporary signing keychain is unlocked for the build, and the original search list is restored during cleanup. Private updater keys are available only to the signing step. The publishing job receives neither Apple credentials nor updater private keys.

## Publish the next version

Update `package.json`, both root versions in `package-lock.json`, `src-tauri/Cargo.toml`, the root app entry in `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json`. Add `docs/releases/VERSION.md` with the matching heading. The workflow rejects mismatched versions or an existing release/draft.

Run formatting, unit/Rust tests, clippy, notices and native embedded-frontend verification before committing. Use `npm run test:native:release` for native checks. The `native-smoke` feature is excluded from the final application, which is rebuilt normally after the native test.

CI prepares icons and checks third-party notices once in the source-check step, then invokes `node scripts/release-macos.mjs` directly. Standalone `npm run release:mac` and preview/package commands retain their preparation, so they can still run independently. Signing, notarization and final installer validation remain per-release steps.

Icon generation keeps a local `.cache/icons` snapshot keyed by the native icon document, build scripts, Node/pngjs versions, architecture, Xcode/SDK and macOS build. Every restored output is hash-checked before use; missing or corrupt files trigger regeneration. Version-only changes reuse the cache. Logs report `Icons: built.` or `Icons: cached.`; `npm run icons:build -- --force` regenerates it. A clean CI checkout builds once; no cross-tag GitHub cache is assumed.

Push the main commit and its annotated `vVERSION` tag. The workflow builds a signed app and DMG, notarizes/staples them, signs the final updater archive with `--app-version`, and verifies the extracted archive and mounted DMG. It checks the architecture, bundle identity, version, native icon assets, legal notices, code signatures, notarization tickets, Gatekeeper and updater signature. It then uploads a draft, verifies every uploaded asset's SHA-256/size, rechecks the tag commit and publishes it as the latest release.

Release assets: the DMG, `.app.tar.gz`, `.app.tar.gz.sig`, `latest.json`, `SHA256SUMS`, `release-manifest.json` and release notes. The static feed has a `darwin-aarch64` platform entry and a version-specific GitHub download URL.

Local builds remain ad-hoc signed; `npm run package:dmg` does not require production credentials. For a full local distribution rehearsal, supply updater signing variables in the process environment and run `npm run release:mac:preview`, followed by `node scripts/verify-release.mjs --unsigned`. Preview metadata is marked unsigned and cannot be published. Never put credentials in command history or commit them to Git.

## Migration and validation limits

Electron 0.1.x users must install the Tauri DMG once. Electron's `latest-mac.yml` and Tauri's `latest.json` are separate formats and archives. Starting with Tauri 0.3.0, later stable Tauri releases use the manual updater. Developer and native verification builds disable network update checks.

Signature interoperability is tested against the installed Tauri CLI, including tampered archive bytes and forged version metadata. Actual signed cross-version installation requires a later published Tauri version and remains a separate acceptance check; an ad-hoc local rehearsal does not prove it.

References: [Tauri updater](https://v2.tauri.app/plugin/updater/), [macOS signing and notarization](https://v2.tauri.app/distribute/sign/macos/).
