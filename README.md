<div align="center">
  <img src="resources/icon.png" width="112" height="112" alt="Diffolio" />
  <h1>Diffolio</h1>
  <p>A considered file comparison workspace for macOS.</p>
  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
  <p><sub>macOS 13.3+ · Apple Silicon</sub></p>
</div>

Compare local text files, folders and images in a compact desktop window. The interface is currently in Simplified Chinese.

## Features

- **Text:** split and unified views, syntax highlighting, inline differences, change navigation, wrapping and unchanged-region folding.
- **Search:** one shared search bar, A/B scope, match navigation, case sensitivity, whole words and regular expressions.
- **Results:** edit independent A/B copies, copy a change in either direction, keep both versions in either order, undo/redo across layouts and save each copy with its original BOM/newline convention. External changes to the destination are checked before saving.
- **Folders:** compare actual file contents, filter names/differences, open paired files, follow progress and cancel scans.
- **Images:** compare PNG, JPEG, WebP and GIF, with shared zoom/pan and a wipe slider for matching dimensions.
- **Workspace:** tabs, recent comparisons, native file dialogs, Finder drag/drop, clipboard text, light/dark/system appearance and adjustable editor text size.

## Preview

![Welcome](resources/screenshots/tauri-welcome.png)

![Text comparison and search](resources/screenshots/tauri-search-dark.png)

## Installation and use

Download the Apple Silicon DMG from [GitHub Releases](https://github.com/svn-box/diffolio/releases/latest), open it and drag Diffolio to Applications. Moving from Electron 0.1.x or a local preview requires this installation once. Settings and recent comparisons use a separate data directory.

Drop two files or folders into the window, add sources to A and B separately, or start with the built-in example. Original inputs open read-only. Click the A or B pencil to edit that copy; click it again for Undo, Redo and Save As. The middle arrows copy the current difference to the other side; the ellipses keep both versions in the order shown by their tooltips. Command-S saves the active side.

Use ⌘N for a new comparison, ⌘O to open files, ⌘F to search, ⌘G / ⇧⌘G to navigate matches, ⌘1 / ⌘2 to switch layouts, and ⌘, for settings.

Choose **检查更新** to check manually, confirm the download, then restart to install. Update packages are verified before installation. Save pending results and finish running tasks before installing. Supported text is UTF-8, with a 16 MiB file limit and a 100,000-entry folder scan limit.

## Privacy

File contents are compared locally. No account or upload is required. Manual update checks connect to GitHub for version information and downloads; comparison contents are never sent.

## License

Diffolio uses the [Diffolio Source Available License 1.0](LICENSE). Personal use and internal use by companies are free, including use for paid work. Free redistribution with the required notices is allowed. Selling, charging for access to, or repackaging/rebranding and selling Diffolio requires separate written permission. Third-party dependencies retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).
