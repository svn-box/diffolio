# Tauri migration and release review

Baseline: Diffolio Electron 0.1.1, commit `2b8aa9ee60b494ef12d9bcb62f473fd07f3f9ac6`.

## Scope and findings

The migration retains the original comparison UI and introduces a Tauri adapter plus a Rust backend. The approved Settings/update revision adds an independent native preferences window and welcome release-history page. The Electron main/preload runtime is removed. Release orchestration is adapted from the original pipeline; private signing material and replica research are excluded. The original Electron checkout remains on `electron-legacy`.

| Area             | Review outcome                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interface        | Comparison editor, palette/type and original artwork retained; Settings and update history follow the approved native-window revision             |
| Settings         | One on-demand 568 × 348 native window; repeated opens focus the same instance; closing it preserves comparison edits                              |
| Preferences      | Field patches preserve unrelated changes; serialized persistence broadcasts appearance/font updates to all native windows                         |
| Settings layout  | Compact General/Text icon tabs, aligned rows, existing font Combobox and actual-size preview; no global wrap/collapse switches or identity footer |
| Comparison footer | One 36px row with display options, comparison-centered symmetric block actions and difference navigation; Overview holds detailed counts and formats                 |
| Result commands   | Bidirectional copy and ordered Keep Both; independent A/B copies, history and Save As; source snapshots remain immutable |
| File fidelity    | UTF-8/BOM/LF/CRLF/CR round trips preserved; binary and invalid UTF-8 inputs rejected                                                              |
| Saving           | Sibling temporary file, file flush, repeated destination hash check, symlink/read-only rejection and atomic rename                                |
| Repeated saves   | Metadata registry updates after app writes; stale and external snapshots are rejected                                                             |
| Memory           | Backend stores metadata/hashes rather than duplicate editor text or image data; save IPC omits redundant original content                         |
| Cancellation     | Early cancellation survives the interval before a blocking worker registers its task                                                              |
| Folder scan      | Symlinks compared without following cycles, special files rejected, streaming hashes and entry limit retained                                     |
| Unsaved work     | Native window close routes through the existing save/discard/cancel workflow; native test cancels the close and confirms the result remains dirty |
| Clipboard        | Non-text/empty clipboard becomes empty text; actual errors remain errors; original system clipboard is never changed by tests                     |
| Native icon      | Original Icon Composer catalog and ICNS retained; Tauri decoder gets RGBA8 rather than the original RGBA16 PNG                                    |
| Updates          | Manual signed Tauri feed/public key configured; signed version required; stable upgrades only; development/native tests disable updates           |
| Update surface   | Local Chinese release history on welcome without its gradient; phase-aware titlebar action, progress/status and release-page button               |
| Menu restoration | Native Check for Updates restores/focuses the main window before dispatch; verified with Settings frontmost and main minimized                    |
| Build            | macOS 27 proc-macro strip workaround is limited to build tools; shipped executable remains stripped                                               |
| Packaging        | Production build excludes test report/snapshot/dialog overrides; legal texts and native icon catalog are included                                 |

Finish review disposition: ship within the approved Settings/update and footer scopes. The earlier native update-menu restoration/focus finding is resolved and verified. The footer review found no material layout issues.

## Evidence

- 52 frontend/state/release tests, including interoperability with the Tauri CLI signer, changed archive bytes, changed trusted comments, forged versions, recalculated checksums, tag mismatch and unsigned-publish guards.
- 15 Rust tests, including UTF-8 fidelity, save conflicts, repeated writes, read-only/symlink targets, folder hashes/cycles, cancellation, preferences, path normalization and empty clipboard semantics. The two separate-window preference tests cover concurrent field patches, explicit `false` and invalid-value persistence protection.
- `cargo clippy --all-targets -- -D warnings`.
- Chromium + Playwright WebKit UI flow checks, with an additional live Electron baseline. Key geometry is compared within two CSS pixels; welcome and entry layout measurements are identical on this Mac. Native scrollbar allocation matches Electron; headless Chromium uses overlay scrollbars.
- 16 native checks against optimized Rust and the embedded production frontend (`tauri://localhost`), including search A/B alignment (0 px offset), native menu search, save, unsaved-close protection, actual filesystem/image data, early cancellation, native drop-event hit testing and disabled verification-build updates.
- The Settings/update revision passed 21 native checks, including separate-window open/focus/close, synchronized preferences, retained comparison edits and local history without an automatic check. Both `work/native/report.json` and `settings-report.json` record success. `menuCheckFocused: true` verifies that native Check for Updates restores/focuses the minimized main window while Settings is frontmost; closing Settings then preserves the unsaved result and Continue returns to it. The historical optimized-build result above remains a separate baseline.
- The symmetric footer revision passed 28 optimized native WebKit/Rust checks, including the single-row geometry, actual history availability, minimum-size inspector layout, result save state and disabled commands for identical files. Chromium/WebKit flows also exercised Wrap/Collapse, Overview Escape/focus return, difference navigation, both copy directions, both Keep Both orders, independent A/B editing/history and long save-name feedback. Both 880 × 540 and 964 × 564 captures were inspected in light/dark appearance. The historical Electron footer geometry is intentionally excluded from baseline matching because this revision replaces it.
- An independent review of the readonly, editing, minimum dark, Overview, identical-file and long-name captures found no material layout issues. Its leading-blank-line block-copy finding was fixed using the actual character-change ranges and covered by the 16 merge regression cases; the independent follow-up passed. Local evidence is in ignored `work/visual/*footer*.png` and `work/native/footer-*.png`; the final layout scan returned no findings.
- Native WebKit screenshots in `resources/screenshots/tauri-*.png`; local browser/Electron comparison output in ignored `work/visual/`.
- Reviewed Settings/update captures: `.impeccable/review/settings-light.png`, `settings-dark.png`, `settings-text.png`, `desktop.png` and `minimum.png`; welcome is in `work/native/welcome.png`. These are native WebKit content captures, without operating-system window chrome. The current main window remains 964 × 564, minimum 880 × 540; Settings is 568 × 348.
- The final local `package:app` build completed after the footer revision and passed application verification; it is an ad-hoc build, not evidence of Apple notarization.
- `scripts/verify-package.mjs` validates the app and mounted DMG, arm64 architecture, ad-hoc signature, native icon catalog, matching legal files/executables and absence of test hooks/Electron runtime.

## Acceptance boundaries

The release workflow reuses the existing Apple secrets and runner, imports a temporary keychain, builds/signs/notarizes the app, notarizes the final DMG and signs a separate version-bound Tauri update archive. The publishing job rechecks checksums, update signatures, uploaded asset hashes and tag identity before publishing a draft. Local ad-hoc validation does not prove Apple signing or signed cross-version installation: Apple validation runs in Actions, and a full updater replacement requires a later Tauri release. Existing Electron tags/archives are preserved; Electron users install the Tauri DMG once.

Physical Finder dragging, real Chinese IME composition, accessibility and older macOS releases still require hands-on acceptance. Automated Unicode insertion and injected native drag events validate the bridge and UI, not an actual keyboard input method or physical drag gesture. Screenshot comparisons do not guarantee pixel identity across OS/WebKit versions.

The design refresh covers the approved Settings/update surfaces and the existing-function text-footer consolidation. Remaining delete/restore, external-editor and display-rule features remain in PLAN.md. Historical comparison tokens and unrelated recorded design drift are preserved; this review does not certify a complete design-token re-audit. No release tag or new signing configuration is part of this revision.

## Local artifact measurements

The initial migration preview measured **6.60 MiB** for the DMG and **14.14 MiB** for application file bytes. The Electron 0.1.1 local preview DMG was 136.8 MiB, so the installer is approximately 95.2% smaller. These are installer/application sizes, not memory or speed benchmarks. The exact hashes and sizes are saved in ignored `work/package-report.json`.
