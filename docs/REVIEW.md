# Tauri migration and release review

Baseline: Diffolio Electron 0.1.1, commit `2b8aa9ee60b494ef12d9bcb62f473fd07f3f9ac6`.

## Scope and findings

The migration retains the original UI implementation and introduces a Tauri adapter plus a Rust backend. The Electron main/preload runtime is removed. Release orchestration is adapted from the original pipeline; private signing material and replica research are excluded. The original Electron checkout remains on `electron-legacy`.

| Area           | Review outcome                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interface      | Existing components, editor, CSS/tokens and artwork retained; only startup, desktop adapter and native drag feedback are added                    |
| File fidelity  | UTF-8/BOM/LF/CRLF/CR round trips preserved; binary and invalid UTF-8 inputs rejected                                                              |
| Saving         | Sibling temporary file, file flush, repeated destination hash check, symlink/read-only rejection and atomic rename                                |
| Repeated saves | Metadata registry updates after app writes; stale and external snapshots are rejected                                                             |
| Memory         | Backend stores metadata/hashes rather than duplicate editor text or image data; save IPC omits redundant original content                         |
| Cancellation   | Early cancellation survives the interval before a blocking worker registers its task                                                              |
| Folder scan    | Symlinks compared without following cycles, special files rejected, streaming hashes and entry limit retained                                     |
| Unsaved work   | Native window close routes through the existing save/discard/cancel workflow; native test cancels the close and confirms the result remains dirty |
| Clipboard      | Non-text/empty clipboard becomes empty text; actual errors remain errors; original system clipboard is never changed by tests                     |
| Native icon    | Original Icon Composer catalog and ICNS retained; Tauri decoder gets RGBA8 rather than the original RGBA16 PNG                                    |
| Updates        | Manual signed Tauri feed/public key configured; signed version required; stable upgrades only; development/native tests disable updates           |
| Build          | macOS 27 proc-macro strip workaround is limited to build tools; shipped executable remains stripped                                               |
| Packaging      | Production build excludes test report/snapshot/dialog overrides; legal texts and native icon catalog are included                                 |

## Evidence

- 32 frontend/state/release tests, including interoperability with the Tauri CLI signer, changed archive bytes, changed trusted comments, forged versions, recalculated checksums, tag mismatch and unsigned-publish guards.
- 13 Rust tests, including UTF-8 fidelity, save conflicts, repeated writes, read-only/symlink targets, folder hashes/cycles, cancellation, preferences, path normalization and empty clipboard semantics.
- `cargo clippy --all-targets -- -D warnings`.
- Chromium + Playwright WebKit UI flow checks, with an additional live Electron baseline. Key geometry is compared within two CSS pixels; welcome and entry layout measurements are identical on this Mac. Native scrollbar allocation matches Electron; headless Chromium uses overlay scrollbars.
- 16 native checks against optimized Rust and the embedded production frontend (`tauri://localhost`), including search A/B alignment (0 px offset), native menu search, save, unsaved-close protection, actual filesystem/image data, early cancellation, native drop-event hit testing and disabled verification-build updates.
- Native WebKit screenshots in `resources/screenshots/tauri-*.png`; local browser/Electron comparison output in ignored `work/visual/`.
- `scripts/verify-package.mjs` validates the app and mounted DMG, arm64 architecture, ad-hoc signature, native icon catalog, matching legal files/executables and absence of test hooks/Electron runtime.

## Acceptance boundaries

The release workflow reuses the existing Apple secrets and runner, imports a temporary keychain, builds/signs/notarizes the app, notarizes the final DMG and signs a separate version-bound Tauri update archive. The publishing job rechecks checksums, update signatures, uploaded asset hashes and tag identity before publishing a draft. Local ad-hoc validation does not prove Apple signing or signed cross-version installation: Apple validation runs in Actions, and a full updater replacement requires a later Tauri release. Existing Electron tags/archives are preserved; Electron users install the Tauri DMG once.

Physical Finder dragging, real Chinese IME composition, accessibility and older macOS releases still require hands-on acceptance. Automated Unicode insertion and injected native drag events validate the bridge and UI, not an actual keyboard input method or physical drag gesture. Screenshot comparisons do not guarantee pixel identity across OS/WebKit versions.

## Local artifact measurements

The initial migration preview measured **6.60 MiB** for the DMG and **14.14 MiB** for application file bytes. The Electron 0.1.1 local preview DMG was 136.8 MiB, so the installer is approximately 95.2% smaller. These are installer/application sizes, not memory or speed benchmarks. The exact hashes and sizes are saved in ignored `work/package-report.json`.
