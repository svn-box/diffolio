---
version: 1
slug: "src-renderer-src-app-tsx"
primary_target: "src/renderer/src/App.tsx"
related_targets: ["src/renderer/src/styles.css","src/renderer/src/styles/","src/renderer/src/components/","src/renderer/src/editor/","src/renderer/src/state/"]
---

# Comparison workspace

Mode: Operate. A local macOS desktop tool for Kelvin. The task is to open two versions, inspect differences and deliberately save an edited result. The user's requested references are SVNBox for engineering and Kaleidoscope for design and color; these settled choices supersede the direction roll. Build code-first as an application screen.

## Direction contract

THESIS: A precise comparison workspace in which the documents occupy the window and differences explain themselves through aligned ranges and stable color semantics.

OWN-WORLD: Graphite surfaces and an equally considered light theme, quiet violet controls, blue modifications, green additions and red deletions. System UI typography, monospace only for content, compact grouped toolbar controls, native macOS window buttons.

STORY: Open or drop two files, read the difference, jump between changes, create a result copy, edit and save. An explicitly labeled example demonstrates the mechanism without being mistaken for the user's content.

FIRST VIEWPORT: A 60px native title toolbar, optional 204px session sidebar, a slim document tab strip and paired path headers above a continuous two-column code surface. The bottom strip carries change navigation, encoding and edit/save state. The empty view offers two actual input targets and an example action. At the app's minimum 960px width the code area remains usable.

FORM: The user-pinned Kaleidoscope desktop comparison grammar, translated into original Diffolio controls. Seed assignment 5 acknowledged; pinned reference prevails. seed:d155dfa4248aa2cc. The signature is two-level change highlighting plus immediate block-to-result editing, never ornamental animation. Dark/light follow the user's system because this personal tool is used across ambient conditions.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, docs/DESIGN.md, and every shipping raster carrying its provenance


## User requested welcome and control refinement

The user supplied a welcome-screen reference on 2026-10-27 and explicitly asked to reproduce that attractive entry. The welcome surface now uses a teal-to-violet-to-rose gradient across its top third, original geometric bands, a centered working drop/open target, a dark navigation rail and genuine recently opened comparisons. This intentionally colorful, dark welcome is distinct from the system/light/dark comparison workspace. No reference artwork is used as a product background. All navigation actions lead to implemented flows; the example stays explicitly labeled.

The user also requires shadcn Combobox for font-size selection. Reuse SVNBox's shadcn Popover + Command composition with original Diffolio tokens. The popover must mount inside the native settings dialog top layer and support search, arrow navigation, Enter, Escape, visible selection and focus return.


## Live Kaleidoscope compactness correction

The user requested a more refined, smaller interface and explicitly asked to launch the installed Kaleidoscope. Native accessibility measurements and a targeted capture on 2026-10-27 established a 964×564 welcome window, 180px sidebar, 52px toolbar and approximately 195px total color stage. Diffolio now uses that default window footprint, a 143px welcome hero below its 52px toolbar, 180px rail, 46px recent rows, and a smaller 46px drop symbol. Comparison tabs/paths/status are 31/30/28px and the result bar is 37px; the default editor is 12px. The minimum is 880×540; manual resizing remains available. The corrected compact view is authoritative over the earlier 60px/204px/large-hero description.

## Welcome / comparison separation

The user's latest feedback identifies the permanent comparison sidebar as a mismatch. Fresh local captures S01-welcome-layout-live.png and S02-comparison-live.png confirm that Kaleidoscope uses a navigation rail on its welcome screen and full-width document panes during comparison. This correction supersedes the optional session sidebar described above.

The primary path is recent comparisons → choose/drop two inputs → full-width comparison → return to recents. Keep the 180px navigation rail only on the welcome screen. Its main choices are recent comparisons and new comparison, with an explicitly labeled example below. The welcome title belongs above the main content, beginning at the rail edge, with no sidebar-toggle/duplicate app identity or slogan. Preserve the original teal/violet/red stage, quiet actual recent rows, and top-right file/clipboard shortcuts. Empty recents use a short explanatory state rather than another competing action card.

New comparison is a compact, neutral task canvas with two independently selectable and droppable A/B sources, file/image and folder modes, clipboard actions for text, explicit selected names/paths, and immediate comparison after both sources arrive. Folders can be picked from different locations in two native dialogs. One-file drops and sequential opens fill the missing side. Existing sessions and unsaved edits survive visits to recents. Comparison has no navigation/session rail; tabs appear only when multiple sessions need switching. Its toolbar groups return, document identity, view controls, information/settings, and new comparison without repeating recent-history navigation.

Density remains desktop compact: 964×564 default, 880×540 minimum, 52px toolbar, 195px welcome stage, 30px path headers and 28px comparison status. Test welcome empty/populated, new comparison empty/partial/folder, full-width split/unified, returning without losing edits, keyboard input, errors and cancellation at both compact desktop sizes. This is an extension of the current original visual world, not a replacement identity.

## User screenshot correction: rail and source interaction

The user supplied two close-up screenshots identifying the heavy source-button and paste hover fills, flush spacing and inconsistent corner treatment. They explicitly require a uniform welcome rail color and a quieter navigation hover. The rail now uses one opaque graphite surface from top to bottom, with dedicated neutral hover/current-page fills. This user preference supersedes the earlier gradient rail.

Fresh local Kaleidoscope capture S11-single-input-live.png proves its single-input workflow: the supplied file is displayed immediately and the other pane remains an input target. Follow that task model. Empty entry retains compact independently droppable sources with clear, individually rounded Choose/Paste actions and real spacing. Once a file/image/text source arrives, show its read-only preview in a full-width two-pane canvas, with compact identity/replacement actions in its header and only the missing side offering input. An empty text source is valid and explicitly labeled as added empty text; it must not look unselected. Existing content itself is not a giant replacement button. Preserve keyboard focus, changing the source, clipboard replacement, individual folder choices, cancellation and type-error recovery. Verify dark/light empty, partial, hover, focus and empty-text states.
