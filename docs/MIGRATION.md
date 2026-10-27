# Tauri migration

Diffolio 0.3.0 ports the Electron 0.1.1 interface to Tauri 2 on macOS. The Electron baseline is preserved on `electron-legacy` at `2b8aa9ee60b494ef12d9bcb62f473fd07f3f9ac6`. The Tauri implementation continues on `main` in the existing `svn-box/diffolio` GitHub repository, with the original commit history. Published tags `v0.1.0` and `v0.1.1` remain the Electron releases. The old Electron working directory stays on `electron-legacy`; the Tauri directory is an independent checkout. The Tauri release workflow reuses the Apple signing/notarization secrets and `xcode-27` runner; updater signing is configured separately. See [RELEASING.md](RELEASING.md). No signing credentials or replica research are included in the current tree.

## Interface contract

The existing React components, design tokens, styles, Lucide assets, shadcn Combobox, Zustand stores and CodeMirror editor are retained. `@/` still resolves to `src/renderer/src/`. The UI calls `DiffolioApi`; `desktop/api.ts` implements that contract with Tauri commands and native events. `desktop/interactions.ts` translates native file-drop positions into the same A/B input targets and starts native titlebar dragging.

The native window keeps a 964 × 564 content area, 880 × 540 minimum, an overlay titlebar, traffic lights at (18, 18), the original sidebar material and the existing frosted-diff icon. The icon keeps its original native asset catalog and ICNS. An RGBA8 PNG is generated for Tauri's window decoder because Icon Composer's RGBA16 export is unsuitable for it.

The approved Settings revision uses a separate fixed 568 × 348 native WebKit window, created on demand and focused again on repeated opens. It shares the Rust process with the main window, rather than starting another app process. General contains appearance choices only; Text retains the shadcn font-size Combobox and adds an actual-size code preview. Global wrapping/collapse switches, filler prose and the identity footer are removed from Settings. Welcome's lower-left footer contains only Settings. Closing Settings preserves main-window comparisons and unsaved edits.

Preference writes send changed fields only. The Rust backend serializes patches against the current stored values, applies native themes and broadcasts the resulting preferences to all native windows. Both renderers receive appearance/font changes, so separate window state cannot overwrite unrelated preference fields. The main window retains its original dimensions and minimum size.

## Native backend

| Module                   | Responsibility                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `src-tauri/src/files.rs` | Bounded UTF-8/image reads, BOM and newline fidelity, streaming hashes and atomic saves                  |
| `folders.rs`             | Paired directory scan, content hashes, progress, cancellation, symlink handling and 100,000 entry limit |
| `read.rs`                | Input validation, task ownership, early cancellation and source registration                            |
| `dialogs.rs`             | Native file/folder/save dialogs and unsaved-result confirmation                                         |
| `commands.rs`            | Renderer contract, preferences, recents, document state and guarded close                               |
| `state.rs`               | Separate persistent state, source snapshots and task cancellation                                       |
| `menu.rs`                | Native app/file/edit/view/window menus and shortcuts                                                    |
| `windows.rs`             | Independent Settings creation/focus and main-window restoration for update history/check actions        |
| `updates.rs`             | Manual signed Tauri updates; disabled in development/native verification                                |

File I/O and clipboard reads run outside the AppKit main thread. The backend retains source metadata/hashes without retaining duplicate text or image payloads. Source files remain read-only until a user explicitly chooses a save destination. Saving verifies the known source hash, rejects read-only/symlink targets, flushes a sibling temporary file, checks the destination again and atomically renames. Subsequent saves track the app's last written snapshot. Empty/non-text clipboards produce empty text without modifying the system clipboard.

The production application uses `app.diffolio.desktop` and Tauri's application data directory. The former local preview used `app.diffolio.tauri-preview`. Settings/recents from Electron and preview builds are not automatically imported. `DIFFOLIO_DATA_DIR` isolates test data.

## Updates and distribution

Public releases use Developer ID signing, Apple notarization and a dedicated `latest.json` Tauri feed. Local builds use ad-hoc signing. The native updater never consumes Electron's `latest-mac.yml` or installer archives.

The updater uses manual check → explicit download → explicit install/restart, with unsaved-result and running-task guards. The public key/feed are in `tauri.conf.json`; private keys stay in Actions Secrets. Signed versions are required and only newer stable releases are accepted. Developer and native-smoke builds disable update checks. See [RELEASING.md](RELEASING.md) for setup and release validation.

Update status, progress and actions now live on welcome's “更新日志” page. Its titlebar has a phase-appropriate manual action and a separate release-page button. Chinese release history is bundled from `docs/releases/*.md` at build time; opening the page does not perform a network check. The page keeps welcome's dark palette and rail while omitting its gradient and bands. Settings opens this page in the main window; the native “检查更新…” menu action restores/focuses the main window before requesting a check, including when Settings is frontmost or the main window is minimized.

Electron users need one manual Tauri DMG installation. Actual signed cross-version replacement requires a later published Tauri version; local ad-hoc validation does not prove that end-to-end transition.

## Validation

- `npm test`: retained frontend/state regression tests.
- `npm run test:rust`: UTF-8/BOM/newlines, size limits, image data, atomic save/repeated save, external modifications, read-only/symlink targets, folder hashing/cycles, cancellation, preferences and empty clipboard behavior.
- `src-tauri/src/preferences_tests.rs`: separate-window field patches, persisted concurrent writes, explicit `false` values and rejection of invalid settings without damaging saved data.
- `npm run test:web`: Chromium and Playwright WebKit exercise the actual UI with an injected filesystem adapter. This is UI verification, not a native backend test.
- `npm run test:web -- --baseline /Users/kelvin/Workspace/Electron/Diffolio`: additionally launches the original Electron app with isolated data, captures matching screens, and compares key geometry with WebKit. Native Electron has the same macOS scrollbar allocation as WebKit; headless Chromium's overlay scrollbars differ.
- `npm run test:native`: launches the actual Tauri/WKWebView app against Rust commands, validates native reads/search/save/updates and exports WebKit snapshots. It requires the Vite server (`npm run dev:web`) on port 1420. The test-only `native-smoke` Cargo feature includes the snapshot/report commands and a fixed test save destination; those commands and overrides are absent from normal builds.
- `npm run test:native:release`: repeats native checks against optimized Rust and the embedded production frontend/CSP, without a Vite server.
- `npm run licenses:check`: verifies notices against the locked npm/Cargo dependency graphs. Missing upstream license files retain package declarations, source copyright notices and standard terms. MPL source archives accompany their license texts.

Generated verification output lives under ignored `work/`. Original design/product plans in this folder describe product scope; this document is the implementation authority for the Tauri runtime.

The Settings/update revision has passed 32 frontend tests, 15 Rust tests and 21 native checks, including restoring/focusing the minimized main window from Settings through the native Check for Updates action. Both native reports record success; `settings-report.json` records `menuCheckFocused: true`. Chromium/WebKit UI checks, formatting and Clippy also pass. Reviewed WebKit captures are `.impeccable/review/settings-{light,dark,text}.png`, `desktop.png` and `minimum.png`, plus `work/native/welcome.png`. These capture web content from the native app; they do not show or certify the operating system's window chrome.

Real Chinese IME composition, physical Finder drag/drop, OS accessibility behavior and older macOS versions still need hands-on acceptance. Unicode insertion tests do not substitute for exercising a real input method. Pixel identity across different macOS/WebKit versions is not claimed; the baseline comparison verifies selected geometry on this Mac.

## Toolchain note

macOS 27 can reject stripped Rust proc-macro dylibs with `mis-aligned LINKEDIT string pool` (often reported as `can't find crate`). `[profile.release.build-override] strip = false` keeps build tools loadable while the shipped release binary remains stripped. See [rust-lang/rust #157750](https://github.com/rust-lang/rust/issues/157750).
