<div align="center">
  <img src="resources/icon.png" width="112" height="112" alt="Diffolio" />
  <h1>Diffolio</h1>
  <p>A considered file comparison workspace for macOS.</p>
  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
  <p><sub>Tauri preview · macOS 13.3+ · Apple Silicon</sub></p>
</div>

Compare local text files, folders and images in a compact desktop window. The interface is currently in Simplified Chinese.

## Features

- **Text:** split and unified views, syntax highlighting, inline differences, change navigation, wrapping and unchanged-region folding.
- **Search:** one shared search bar, A/B scope, match navigation, case sensitivity, whole words and regular expressions.
- **Results:** create an editable copy from B, adopt a change from A, edit, undo/redo across layouts and save with the original BOM/newline convention. External changes to the destination are checked before saving.
- **Folders:** compare actual file contents, filter names/differences, open paired files, follow progress and cancel scans.
- **Images:** compare PNG, JPEG, WebP and GIF, with shared zoom/pan and a wipe slider for matching dimensions.
- **Workspace:** tabs, recent comparisons, native file dialogs, Finder drag/drop, clipboard text, light/dark/system appearance and adjustable editor text size.

## Preview

![Welcome](resources/screenshots/tauri-welcome.png)

![Text comparison and search](resources/screenshots/tauri-search-dark.png)

## Installation and use

This edition is currently a local preview. Open the supplied Diffolio DMG and drag the app to Applications, or open the supplied Diffolio.app directly. The preview keeps its settings and recent comparisons separate from the Electron edition.

Drop two files or folders into the window, add sources to A and B separately, or start with the built-in example. Original inputs open read-only. Choose **创建结果** to edit a result and **另存结果** to save it.

Use ⌘N for a new comparison, ⌘O to open files, ⌘F to search, ⌘G / ⇧⌘G to navigate matches, ⌘1 / ⌘2 to switch layouts, and ⌘, for settings.

This local preview has not been notarized for public distribution. Updates are installed manually until a dedicated update channel is available. It supports UTF-8 text and files up to 16 MiB, with a 100,000-entry folder scan limit.

## Privacy

File contents are compared locally. No account or upload is required.

## License

Diffolio uses the [Diffolio Source Available License 1.0](LICENSE). Personal use and internal use by companies are free, including use for paid work. Free redistribution with the required notices is allowed. Selling, charging for access to, or repackaging/rebranding and selling Diffolio requires separate written permission. Third-party dependencies retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).
