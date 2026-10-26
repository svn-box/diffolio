# README screenshots / README 截图

These eight images are captured from the packaged Diffolio application, using macOS window capture rather than a browser mockup. Both language editions of the main README share this gallery.

这 8 张图片均来自打包后实际运行的 Diffolio，通过 macOS 单窗口截图捕获。中英文 README 使用同一组图片。

| File                    | Scene                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `comparison-dark.png`   | Dark side-by-side text comparison / 深色双栏文本比较          |
| `comparison-light.png`  | Light workspace with an editable result / 浅色结果编辑        |
| `welcome.png`           | Welcome with real recent fixture pairs / 欢迎页与样例最近记录 |
| `new-comparison.png`    | Empty A/B source inputs / A/B 输入入口                        |
| `source-preview.png`    | First-source read-only preview / 单侧只读预览                 |
| `folder-comparison.png` | Aligned folder comparison / 文件夹比较                        |
| `image-comparison.png`  | Matching-size image wipe / 同尺寸图片分割                     |
| `font-combobox.png`     | Appearance settings and font-size choices / 外观与字号选择    |

## Capture settings

- Window: 1280 × 800 logical pixels, 2560 × 1600 pixels on the current Retina display.
- App interface: Simplified Chinese. Editor size: 14px for the gallery; the factory default remains 12px.
- Inputs: the repository's `fixtures/reference/text`, `fixtures/reference/left` and `fixtures/reference/right`.
- Data: a temporary app profile, actual recent fixture pairs, and a result copy edited only for the screenshot. Personal preferences, files and clipboard are not used.
- Provenance: each image has a `.png.json` sidecar. `manifest.json` records the version, capture settings and representative text/image fixture hashes.

`native-welcome.png` and `native-new-comparison.png` are earlier compact-window evidence retained for the design documentation; they are not part of this gallery.

## Refresh

From the project root:

```bash
npm run docs:screenshots
```

The command builds the app, then runs `scripts/capture-readme.mjs` and writes the gallery to `resources/screenshots/`. It requires the macOS icon toolchain described in the main README and screen-recording permission for the automation host. The script locates only its own app window by process ID and closes its temporary instance afterward.

Inspect the eight output images before updating a published README. No UI text, file records or window controls are painted into the captures.
