# Tauri preview review

Baseline: Diffolio Electron 0.1.1, commit `2b8aa9ee60b494ef12d9bcb62f473fd07f3f9ac6`.

## Scope and findings

The migration retains the original UI implementation and introduces a Tauri adapter plus a Rust backend. No Electron main/preload runtime, original release automation, private signing material or replica research is copied. The original Electron checkout remains unchanged.

| Area | Review outcome |
| --- | --- |
| Interface | Existing components, editor, CSS/tokens and artwork retained; only startup, desktop adapter and native drag feedback are added |
| File fidelity | UTF-8/BOM/LF/CRLF/CR round trips preserved; binary and invalid UTF-8 inputs rejected |
| Saving | Sibling temporary file, file flush, repeated destination hash check, symlink/read-only rejection and atomic rename |
| Repeated saves | Metadata registry updates after app writes; stale and external snapshots are rejected |
| Memory | Backend stores metadata/hashes rather than duplicate editor text or image data; save IPC omits redundant original content |
| Cancellation | Early cancellation survives the interval before a blocking worker registers its task |
| Folder scan | Symlinks compared without following cycles, special files rejected, streaming hashes and entry limit retained |
| Unsaved work | Native window close routes through the existing save/discard/cancel workflow; native test cancels the close and confirms the result remains dirty |
| Clipboard | Non-text/empty clipboard becomes empty text; actual errors remain errors; original system clipboard is never changed by tests |
| Native icon | Original Icon Composer catalog and ICNS retained; Tauri decoder gets RGBA8 rather than the original RGBA16 PNG |
| Updates | Separate signed Tauri updater path implemented; disabled until a dedicated HTTPS feed/public key exists; Electron releases cannot be installed |
| Build | macOS 27 proc-macro strip workaround is limited to build tools; shipped executable remains stripped |
| Packaging | Production build excludes test report/snapshot/dialog overrides; legal texts and native icon catalog are included |

## Evidence

- 27 retained frontend/state tests.
- 13 Rust tests, including UTF-8 fidelity, save conflicts, repeated writes, read-only/symlink targets, folder hashes/cycles, cancellation, preferences, path normalization and empty clipboard semantics.
- `cargo clippy --all-targets -- -D warnings`.
- Chromium + Playwright WebKit UI flow checks, with an additional live Electron baseline. Key geometry is compared within two CSS pixels; welcome and entry layout measurements are identical on this Mac. Native scrollbar allocation matches Electron; headless Chromium uses overlay scrollbars.
- 16 native checks against optimized Rust and the embedded production frontend (`tauri://localhost`), including search A/B alignment (0 px offset), native menu search, save, unsaved-close protection, actual filesystem/image data, early cancellation, native drop-event hit testing and disabled preview updates.
- Native WebKit screenshots in `resources/screenshots/tauri-*.png`; local browser/Electron comparison output in ignored `work/visual/`.
- `scripts/verify-package.mjs` validates the app and mounted DMG, arm64 architecture, ad-hoc signature, native icon catalog, matching legal files/executables and absence of test hooks/Electron runtime.

## Acceptance boundaries

The preview is for local evaluation on macOS Apple Silicon. Developer ID signing, Apple notarization, a dedicated public release feed and signed cross-version replacement are not configured. No existing GitHub release or Electron update channel is changed.

Physical Finder dragging, real Chinese IME composition, accessibility and older macOS releases still require hands-on acceptance. Automated Unicode insertion and injected native drag events validate the bridge and UI, not an actual keyboard input method or physical drag gesture. Screenshot comparisons do not guarantee pixel identity across OS/WebKit versions.

## Local artifact measurements

Verified DMG: **6.60 MiB**; application file bytes: **14.14 MiB**. The Electron 0.1.1 local preview DMG was 136.8 MiB, so the installer is approximately 95.2% smaller. These are installer/application sizes, not memory or speed benchmarks. The exact hashes and sizes are saved in ignored `work/package-report.json`.
