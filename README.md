<div align="center">
  <img src="resources/icon.png" width="128" height="128" alt="Diffolio app icon" />
  <h1>Diffolio</h1>
  <p>
    <a href="README.md"><strong>English</strong></a> · <a href="README.zh-CN.md">简体中文</a>
  </p>
  <p>A considered file comparison workspace for macOS.</p>
  <p>
    <a href="#features">Features</a> ·
    <a href="#screenshots">Screenshots</a> ·
    <a href="#installation">Installation</a> ·
    <a href="#usage">Usage</a> ·
    <a href="#development">Development</a>
  </p>
  <p><sub>v0.1.0 · macOS · Apple Silicon (arm64)</sub></p>
</div>

Diffolio compares local text files, folders and images in a compact desktop window. Open two versions, inspect their differences, and create an editable result when you need one. Compared inputs open read-only; saving a result is an explicit action.

The current app interface is in **Simplified Chinese**. This repository provides English and Chinese documentation. Diffolio is currently built for personal use on macOS; the local application package targets Apple Silicon.

## Features

- **Text comparison** — side-by-side and unified layouts, syntax highlighting, line and inline differences, change navigation, search, wrapping and unchanged-region folding.
- **Flexible input** — choose files, drop them into A/B independently, or add clipboard text. The first source opens immediately as a read-only preview; adding a compatible second source starts comparison.
- **Editable results** — create a result copy from B, apply the current change from A, edit manually, undo or redo across layout switches, and save through the native Save As dialog. Saving preserves B's UTF-8 BOM and line-ending convention and checks the destination for external changes.
- **Folder comparison** — compare contents, browse aligned directory trees, filter names or show only differences, and open a file with a double-click or the keyboard. Choose the two folders from separate locations; inspect progress or cancel a scan.
- **Image comparison** — view PNG, JPEG, WebP and GIF files side by side, share zoom and pan, fit the canvas, and use a wipe slider for images with matching dimensions.
- **Comparison sessions** — switch between multiple comparisons with tabs, reopen recent file pairs, and return to the welcome screen without losing the current result edits or undo history.
- **Desktop appearance** — system, light and dark workspace modes, adjustable editor size, compact native window controls and a separate welcome screen. The app icon includes native default, dark and tinted appearances.

## Screenshots

Captured from the packaged application at **1280 × 800** logical pixels, using the included fixtures and an isolated temporary data directory. The screenshots show the Chinese interface with a 14px editor font. Recent entries are actual fixture comparisons; no personal files or clipboard contents are used. The default application window remains **964 × 564** and can be resized.

**Text comparison** — read both versions across the full window, with stable colors for additions, deletions and modifications.

![Diffolio dark text comparison with two full-width document panes and highlighted changes](resources/screenshots/comparison-dark.png)

<details>
<summary>Welcome and recent comparisons</summary>

Start from the drop area, choose files, or reopen a recent pair. Navigation stays on the welcome screen so documents can use the full comparison window.

![Diffolio welcome screen with the graphite navigation rail, colorful drop area and recent comparisons](resources/screenshots/welcome.png)

</details>

<details>
<summary>Add two sources and preview the first</summary>

Choose or paste into each side separately. The first file becomes a read-only preview while the other side waits for input. Folder mode provides independent location pickers.

![Diffolio new comparison screen with separate A and B inputs and choose and paste actions](resources/screenshots/new-comparison.png)

![Diffolio previewing the first text file while the opposite pane offers the second input](resources/screenshots/source-preview.png)

</details>

<details>
<summary>Edit a result in the light workspace</summary>

Create a result from B, take a change from A, and review the result before saving. The result label, undo controls and Save As action stay visible.

![Diffolio light comparison workspace with an editable result copy and explicit result actions](resources/screenshots/comparison-light.png)

</details>

<details>
<summary>Compare folders</summary>

Review modified, equal and unmatched entries in aligned trees, then open individual files to inspect their contents.

![Diffolio folder comparison showing modified, equal and one-sided files](resources/screenshots/folder-comparison.png)

</details>

<details>
<summary>Compare images</summary>

Slide the divider between two matching-size sample images. Side-by-side viewing is also available, including for images with different dimensions.

![Diffolio image comparison with a wipe divider between two sample images](resources/screenshots/image-comparison.png)

</details>

<details>
<summary>Appearance and editor preferences</summary>

Choose system, light or dark appearance and adjust editor size with the searchable font-size control. Preferences are saved on this Mac.

![Diffolio appearance settings and the open searchable font-size Combobox](resources/screenshots/font-combobox.png)

</details>

## Usage

### Open two versions

Press **⌘N** to start a comparison, or **⌘O** to select one or two files. You can also drop two files into the window, drop them into A/B separately, or use the clipboard actions. Opening files one at a time fills the missing side. Text and image sources must be paired with the same content type.

The welcome screen's **示例比较** (Example Comparison) opens a clearly labeled text example. Recent entries reopen their actual paths from disk.

### Inspect and save a result

Use the arrow controls to move between changes, **⌘F** to search, and **⌘1 / ⌘2** to choose side-by-side or unified layout. Wrapping and folding controls are in the bottom bar.

Choose **创建结果** (Create Result) to make B editable. **当前差异采用 A** applies the currently indicated change from A. You can also edit directly and undo or redo. **另存结果** (Save Result As), **⌘S** or **⌘⇧S** opens the native save dialog; choose the destination deliberately. Closing a modified result offers save, discard and cancel actions.

### Compare folders and images

Press **⌘⇧O** or choose folder mode in a new comparison, then select A and B independently. Filter the tree by name, enable differences-only filtering, and double-click a file or focus it and press **Enter / Space** to open it.

Open two supported images through the same file inputs. Use side-by-side mode, or the wipe control when their dimensions match, then adjust zoom or return to fit.

### Keep your place

Use the return arrow to visit recent comparisons and **继续比较** (Continue Comparison) to resume the current session. Multiple sessions appear as tabs. Open sessions and unsaved result drafts live in the current application session; recent path pairs and preferences persist across restarts.

### Keyboard shortcuts

| Shortcut | Action                             |
| -------- | ---------------------------------- |
| ⌘N       | New comparison                     |
| ⌘O       | Open files                         |
| ⌘⇧O      | Start folder comparison            |
| ⌘1 / ⌘2  | Side-by-side / unified text layout |
| ⌘F       | Find in the text comparison        |
| ⌘Z / ⌘⇧Z | Undo / redo result edits           |
| ⌘S / ⌘⇧S | Save result as…                    |
| ⌘W       | Close the current comparison       |
| ⌘,       | Open settings                      |

## Current scope

Text input supports **UTF-8**, including BOM and LF, CRLF or CR line endings. Opened text/image files and saved results are limited to **16 MiB per file**; folder scans are limited to **100,000 entries**. These are implementation limits, not performance benchmark claims. Symlink entries are compared as links rather than followed during directory traversal.

Three-way merging, Git/CLI integration, Fluid-style connectors, whitespace-ignore rules, folder copy/synchronization and image pixel-difference masks remain planned. See [PLAN.md](docs/PLAN.md) for implementation status and the [feature inventory](replica/features.csv) for the wider scope.

## Installation

Version **0.1.0** targets Apple Silicon (arm64). Open the versioned DMG and drag Diffolio to Applications, or extract the ZIP and move the app there. See the [0.1.0 release notes](docs/releases/0.1.0.md) for features and current limits.

Version tags trigger the signed and notarized GitHub Actions release workflow. Manual runs produce unsigned previews in a separate directory. Repository and signing configuration are being prepared; see the [release instructions](docs/RELEASING.md) for setup, DMG/ZIP generation and verification.

## Development

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

This builds the app and captures its actual macOS window using fixtures and temporary app data. It requires macOS screen-recording access for the terminal/automation host. Capture details and source hashes are recorded beside the images; see [the screenshot notes](resources/screenshots/README.md).

### Project documentation

| Document                                                 | Contents                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| [Product brief](docs/PRODUCT.md)                         | Intended users, product purpose and project constraints     |
| [Development plan](docs/PLAN.md)                         | Milestones, implemented scope and remaining work            |
| [Design system](docs/DESIGN.md)                          | Layout, color, typography and interaction rules             |
| [Code architecture](docs/ARCHITECTURE.md)                 | State ownership, module responsibilities and regression checks |
| [Refactor review](docs/REVIEW.md)                         | Findings, fixes and verification before the initial commit  |
| [Release instructions](docs/RELEASING.md)                  | Version checks, DMG/ZIP generation and installer acceptance |
| [Component specifications](replica/design/components.md) | Implemented components and their states                     |
| [Comparison fixtures](fixtures/README.md)                | Text, folder, image and future merge samples                |
| [Public resources](resources/README.md)                  | README screenshots, selected artwork and native icon build  |
| [Reference research](replica/recon.md)                   | Kaleidoscope screens, flows and implementation observations |
