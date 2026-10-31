---
name: 'Diffolio'
description: 'A compact, considered file comparison workspace for macOS.'
colors:
    light-bg: '#faf9f7'
    light-chrome: '#eeedeb'
    light-surface: '#f3f2f0'
    light-sidebar: '#eae8ed'
    light-raised: '#ffffff'
    light-border: '#dcd9df'
    light-border-input: '#857d8c'
    light-text: '#29262e'
    light-text-muted: '#655e6d'
    light-accent: '#714a9e'
    light-on-accent: '#ffffff'
    light-accent-soft: '#e4d9ef'
    light-hover: '#e3e0e7'
    light-success: '#236c42'
    light-danger: '#ac3043'
    light-modified: '#2460a5'
    light-diff-added: '#e0f0e4'
    light-diff-deleted: '#f8e1e4'
    light-diff-modified: '#e0eaf8'
    light-diff-added-strong: '#b6dfc1'
    light-diff-deleted-strong: '#efb7c0'
    light-diff-modified-strong: '#bbd2f0'
    light-syntax-keyword: '#964c91'
    light-syntax-string: '#ad482a'
    light-syntax-number: '#7c570b'
    light-syntax-function: '#216b66'
    light-syntax-property: '#735d36'
    dark-bg: '#242427'
    dark-chrome: '#2e2d31'
    dark-surface: '#29282c'
    dark-sidebar: '#28272b'
    dark-raised: '#39373d'
    dark-border: '#414046'
    dark-border-input: '#948c9e'
    dark-text: '#eeecf1'
    dark-text-muted: '#aaa4b2'
    dark-accent: '#c7a5e9'
    dark-on-accent: '#271b35'
    dark-accent-soft: '#40334f'
    dark-hover: '#3b383f'
    dark-success: '#8dd8a5'
    dark-danger: '#f0a3ad'
    dark-modified: '#99c2f6'
    dark-diff-added: '#243b2c'
    dark-diff-deleted: '#482c33'
    dark-diff-modified: '#26364d'
    dark-diff-added-strong: '#345b40'
    dark-diff-deleted-strong: '#75414b'
    dark-diff-modified-strong: '#3a5576'
    dark-syntax-keyword: '#e19bc5'
    dark-syntax-string: '#e7a58b'
    dark-syntax-number: '#dbc184'
    dark-syntax-function: '#93c9c5'
    dark-syntax-property: '#d2ba97'
    home-text: '#f1edf7'
    home-text-muted: '#c1b8cd'
    home-bg: '#17171c'
    home-chrome: '#27242d'
    home-surface: '#232129'
    home-raised: '#38303f'
    home-border: '#3b3544'
    home-border-input: '#a99bb7'
    home-accent: '#e1baf7'
    home-accent-soft: '#543961'
    home-on-accent: '#2d1738'
    home-hover: '#3b3047'
    home-panel: '#222126'
    home-drop-text: '#f6d9ff'
    home-stage-teal: '#006879'
    home-stage-blue: '#0067a3'
    home-stage-violet: '#3e2377'
    home-stage-magenta: '#81075e'
    home-stage-red: '#b70000'
    home-rail: '#222126'
    home-nav-hover: '#ffffff08'
    home-nav-selected: '#ffffff12'
    home-nav-selected-hover: '#ffffff18'
typography:
    title-dialog:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '19px'
        fontWeight: 600
        lineHeight: 1.5
    title-home:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '15px'
        fontWeight: 600
        lineHeight: 1.5
        letterSpacing: '-0.3px'
    headline-home:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '15px'
        fontWeight: 500
        lineHeight: 1.5
        letterSpacing: '-0.2px'
    body:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '12px'
        fontWeight: 400
        lineHeight: 1.5
    label:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '11px'
        fontWeight: 400
        lineHeight: 1.5
    metadata:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '10px'
        fontWeight: 400
        lineHeight: 1.5
    editor:
        fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace"
        fontSize: '12px'
        fontWeight: 400
        lineHeight: 1.8
    headline-setup:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '18px'
        fontWeight: 500
        lineHeight: 1.5
        letterSpacing: '-0.3px'
    title-settings:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '13px'
        fontWeight: 600
        lineHeight: 1.5
    title-release:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '27px'
        fontWeight: 650
        lineHeight: 1.25
        letterSpacing: '-0.6px'
    body-release:
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize: '12px'
        fontWeight: 400
        lineHeight: 1.85
rounded:
    control: '7px'
    icon: '6px'
    tag: '4px'
    group: '9px'
    target: '12px'
    dialog: '15px'
    source: '10px'
    home-nav: '8px'
spacing:
    '0': '0px'
    '4': '4px'
    '8': '8px'
    '12': '12px'
    '16': '16px'
    '20': '20px'
    '24': '24px'
    '32': '32px'
components:
    button-primary:
        backgroundColor: '{colors.light-accent}'
        textColor: '{colors.light-on-accent}'
        rounded: '{rounded.control}'
        padding: '6px 12px'
    button-primary-dark:
        backgroundColor: '{colors.dark-accent}'
        textColor: '{colors.dark-on-accent}'
        rounded: '{rounded.control}'
        padding: '6px 12px'
    button-subtle:
        backgroundColor: '{colors.light-raised}'
        textColor: '{colors.light-text}'
        rounded: '{rounded.control}'
        padding: '5px 10px'
    button-subtle-dark:
        backgroundColor: '{colors.dark-raised}'
        textColor: '{colors.dark-text}'
        rounded: '{rounded.control}'
        padding: '5px 10px'
    button-icon:
        textColor: '{colors.light-text-muted}'
        rounded: '{rounded.icon}'
        width: '30px'
        height: '28px'
    button-icon-active:
        backgroundColor: '{colors.light-accent-soft}'
        textColor: '{colors.light-accent}'
        rounded: '{rounded.icon}'
        width: '30px'
        height: '28px'
    inline-search:
        textColor: '{colors.light-text-muted}'
        rounded: '{rounded.icon}'
        height: '27px'
        padding: '0 8px'
    segmented:
        rounded: '{rounded.group}'
        padding: '3px'
    side-tag:
        backgroundColor: '{colors.light-accent-soft}'
        textColor: '{colors.light-accent}'
        rounded: '{rounded.tag}'
        width: '17px'
        height: '17px'
    result-tag:
        backgroundColor: '{colors.light-diff-added}'
        textColor: '{colors.light-success}'
        rounded: '{rounded.tag}'
        width: '17px'
        height: '17px'
    combobox-trigger:
        backgroundColor: '{colors.light-raised}'
        textColor: '{colors.light-text}'
        rounded: '{rounded.control}'
        width: '90px'
        height: '28px'
        padding: '0 9px'
    combobox-trigger-dark:
        backgroundColor: '{colors.dark-raised}'
        textColor: '{colors.dark-text}'
        rounded: '{rounded.control}'
        width: '90px'
        height: '28px'
        padding: '0 9px'
    font-size-popover:
        backgroundColor: '{colors.light-raised}'
        textColor: '{colors.light-text}'
        rounded: '{rounded.group}'
        width: '176px'
    settings-window:
        backgroundColor: '{colors.light-bg}'
        textColor: '{colors.light-text}'
        width: '568px'
        height: '348px'
    settings-window-dark:
        backgroundColor: '{colors.dark-bg}'
        textColor: '{colors.dark-text}'
        width: '568px'
        height: '348px'
    settings-content:
        padding: '26px 32px 24px'
    settings-tab:
        textColor: '{colors.light-text-muted}'
        width: '68px'
        height: '61px'
    settings-tab-selected:
        textColor: '{colors.light-accent}'
        width: '68px'
        height: '61px'
    settings-font-preview:
        backgroundColor: '{colors.light-surface}'
        textColor: '{colors.light-text}'
        rounded: '{rounded.control}'
        padding: '12px 16px'
    updates-page:
        backgroundColor: '{colors.home-bg}'
        textColor: '{colors.home-text}'
    update-check-button:
        textColor: '{colors.home-text}'
        padding: '0 14px'
    release-current:
        backgroundColor: '{colors.home-accent-soft}'
        textColor: '{colors.home-accent}'
        rounded: '{rounded.tag}'
        padding: '2px 7px'
    home-recent:
        backgroundColor: '{colors.home-panel}'
        textColor: '{colors.home-text}'
        rounded: '{rounded.group}'
        padding: '7px 12px'
    home-drop:
        textColor: '{colors.home-drop-text}'
        rounded: '{rounded.target}'
        padding: '10px 16px 13px'
    welcome-navigation:
        textColor: '{colors.home-text}'
        rounded: '{rounded.home-nav}'
        padding: '0 10px'
        height: '38px'
    welcome-navigation-hover:
        backgroundColor: '{colors.home-nav-hover}'
        textColor: '{colors.home-text}'
        rounded: '{rounded.home-nav}'
    welcome-navigation-selected:
        backgroundColor: '{colors.home-nav-selected}'
        textColor: '{colors.home-text}'
        rounded: '{rounded.home-nav}'
    welcome-navigation-selected-hover:
        backgroundColor: '{colors.home-nav-selected-hover}'
        textColor: '{colors.home-text}'
        rounded: '{rounded.home-nav}'
    source-input:
        backgroundColor: '{colors.light-surface}'
        textColor: '{colors.light-text}'
        rounded: '{rounded.source}'
        padding: '16px'
    source-choose:
        backgroundColor: '{colors.light-raised}'
        textColor: '{colors.light-text}'
        rounded: '{rounded.control}'
        padding: '0 10px'
        height: '28px'
    source-paste:
        textColor: '{colors.light-text-muted}'
        rounded: '{rounded.control}'
        padding: '0 10px'
        height: '28px'
    source-preview-header:
        backgroundColor: '{colors.light-surface}'
        textColor: '{colors.light-text-muted}'
        padding: '0 12px'
        height: '34px'
    comparison-footer:
        backgroundColor: '{colors.light-chrome}'
        textColor: '{colors.light-text-muted}'
        height: '36px'
        padding: '0 10px'
    comparison-footer-control:
        rounded: '5px'
        width: '28px'
        height: '26px'
    comparison-footer-overview:
        backgroundColor: '{colors.light-raised}'
        textColor: '{colors.light-text}'
        width: '252px'
        padding: '14px'
---

# Design System: Diffolio

> The current runtime is Tauri/WebKit. Comparison panes retain the Electron baseline; the text footer, independent Settings and update history follow their approved revisions. Runtime changes and migration status are tracked in [MIGRATION.md](MIGRATION.md).

## Overview

**Creative North Star: "The Comparison Workbench"**

Diffolio is a compact macOS comparison workbench: graphite or warm light surfaces, violet controls, and continuous document panes. Kaleidoscope informs the comparison grammar and color approach; the implemented icons, geometric artwork and Diffolio mark are original. System UI type and restrained controls keep long file names, paths and changes readable.

The welcome screen is deliberately dark and colorful, independent of workspace appearance. Its opaque graphite navigation rail sits beside a continuous teal-to-violet-to-red stage and genuine recent comparisons. New comparison and supplied-source previews use a neutral full-width task canvas; the comparison workspace follows system, light or dark appearance and gives the documents the window. Returning to recents and continuing preserves result edits and undo history.

Settings is a separate compact native window with top General/Text icon tabs and aligned form rows. Update history is a dark welcome page without the welcome artwork, with manual update controls in its titlebar. Both retain the established palette and system typography.

**Key Characteristics:**

- Compact native window proportions and grouped toolbar controls.
- Violet for interaction; green, red and blue for comparison meaning.
- Two levels of diff emphasis: changed lines and changed text.
- A welcome-only graphite rail; full-width source previews and comparison panes.
- Original SVG geometry and icons; semantic CSS custom properties.
- Independent native preferences and a local release-history page.

This record follows the implemented source after the approved welcome/comparison separation and source-interaction correction. The surface contract’s last two sections supersede earlier rail and input patterns. Runtime values live in `src/renderer/src/tokens.css` and `styles.css`; `npm run design:check` exports local workspace values, layout scope and a contrast report; these generated research files stay outside Git. The YAML frontmatter records explicit light, dark and welcome values. Component snapshots use the light workspace by default, with named dark siblings where useful; live CSS resolves the active semantic properties.

## Colors

Warm, slightly violet neutrals frame quiet violet interaction controls and clear comparison colors. The welcome adds saturated color without changing comparison semantics.

### Primary

- **Workspace violet:** `light-accent` and `dark-accent` supply action text, primary buttons, caret and focus. Their `on-accent` companions supply button text; `accent-soft` supplies side tags, command highlights and drag-target feedback.
- **Welcome lavender:** `home-accent` supplies entry actions against the local dark palette. Navigation icons remain lavender, while navigation state fills use dedicated neutral tokens.

### Secondary

- **Addition green:** `success` identifies addition counts and result identity; `diff-added` and `diff-added-strong` separate line context from changed text.
- **Deletion red:** `danger` identifies deletion counts and errors; `diff-deleted` and `diff-deleted-strong` supply deleted ranges.
- **Modification blue:** `modified` identifies modification counts and folder icons; `diff-modified` and `diff-modified-strong` supply modified ranges.
- **Welcome stage:** `home-stage-teal`, `home-stage-blue`, `home-stage-violet`, `home-stage-magenta` and `home-stage-red` are the actual five gradient stops. Translucent white circles and diagonal bands are original inline SVG geometry.

### Tertiary

The five `syntax-*` roles separate keywords, strings, numbers, functions and properties. Comments use muted text with italics. Strong changed-text spans, including their nested syntax spans, use `text` to protect legibility.

### Neutral

`bg` is the document surface, `chrome` is the title/status/dialog surface, `surface` is the secondary content layer and `raised` is the control/popover surface. `text` and `text-muted` set hierarchy; `border` divides surfaces while the stronger `border-input` identifies fields. The `home-*` local overrides keep the welcome dark. `home-rail` is the uniform opaque rail; `home-nav-hover`, `home-nav-selected` and `home-nav-selected-hover` are its dedicated neutral state fills. `home-panel` is the recent-list container; the quiet empty state sits directly on the welcome background. The exported `sidebar` colors remain in the palette but are not a comparison-rail pattern.

### Named Rules

**The Stable Difference Rule.** Green identifies additions, red identifies deletions, and blue identifies modifications in both workspace themes. Violet identifies controls, selection and focus.

**The Separate Welcome Rule.** The welcome keeps its dark local palette and colorful stage when workspace appearance changes. Its rail is opaque graphite with neutral state fills, and appears only on welcome.

The recorded contrast report has 92 workspace text/UI pairs and zero AA failures. It covers the exported light and dark workspace colors, including syntax over line highlights and text over strong highlights. It does not certify the welcome gradients or every possible image/content combination.

## Typography

**Interface Font:** the system UI stack in `font-sans` (SF on macOS, with BlinkMacSystemFont, Segoe UI and sans-serif fallback).

**Content Font:** SFMono-Regular, Menlo, Consolas and monospace fallback in `font-mono`.

The hierarchy is compact and functional. There is no separate decorative display face. The frontmatter records the role sizes and weights; ordinary controls inherit the body face, while path labels and metadata step down in size.

### Hierarchy

- **Dialog title:** the recorded baseline dialog role; the independent Settings window uses the smaller title-settings role.
- **Welcome title and prompt:** medium-sized system text; the title uses semibold and the drop prompt uses medium weight.
- **New-comparison headline:** a centered medium-weight system heading (18px), removed when supplied content opens in the preview canvas.
- **Body:** settings rows and ordinary controls.
- **Label:** paths, tabs, secondary actions and welcome navigation. Recent titles use medium weight where indicated by their component.
- **Metadata:** status, file sizes, recent dates and category labels. Numeric status and size fields use tabular figures. The welcome subtitle uses the metadata role; example badges are a smaller local exception (9px).
- **Editor:** the frontmatter size is the factory default. Font-size options are 11, 12, 13, 14, 15, 16, 18 and 20px; persisted user preferences remain authoritative. Code uses a generous line height, with independent scroll, wrapping and unchanged-region collapse settings.
- **Settings title:** compact semibold window text; top icon-tab labels use the existing label role. Preference labels use the body size with semibold weight and right alignment.
- **Release title and notes:** the title-release role distinguishes each version; its version number uses regular weight and tabular figures. Notes use body-release, with existing compact labels for category headings and the current-version tag.

### Named Rules

**The Content Type Rule.** Use the system UI stack for controls and labels and the monospace stack for compared text. Editor size is a user preference, not a global interface scale.

## Layout

The main Tauri window retains the Electron baseline of 964 × 564px and permits resizing down to 880 × 540px. The titlebar leaves room for actual macOS traffic lights; it is draggable while its controls are not. The app fills the window and scrolls within content regions instead of scrolling the outer document.

Native traffic-light centers align vertically with each window's title region: 26px below the main window top and 18px below the Settings window top. Tauri insets are (18, 28) and (16, 20), respectively. These values adjust the AppKit container rather than setting a button's CSS top. Validate actual native button frames after layout, resizing and appearance changes; WebKit content screenshots do not include these controls.

| Region                         | Implemented size / behavior                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Title toolbar                  | 52px high; return, document identity, view controls, information/settings and new comparison            |
| Welcome rail                   | 180px wide, opaque graphite from top to bottom; no rail in new comparison or comparison                 |
| Comparison tabs                | 31px high, shown only with multiple sessions; tabs span 140–240px and scroll horizontally               |
| Paired path headers            | 30px high; equal halves, truncated paths and file names                                                 |
| Text comparison footer         | One 36px row: display options left, six block actions centered on the comparison area, difference navigation right |
| Other comparison status        | 28px high; local-comparison status for image/folder and unpaired inputs                                     |
| Source inputs before selection | 632px pair, max-width 100%, two equal columns and 32px gap                                              |
| Empty source container         | 10px corners, 16px padding and 16px between header and body                                             |
| Source actions                 | Separate 28px Choose/Paste buttons, 7px corners on every corner, 8px action gap                         |
| First supplied file/image/text | Immediate full-width two-pane preview; selected pane has a 34px header, missing pane stays an input     |
| Text comparison                | Full-width equal document panes; unified layout replaces the paired surface                             |
| File inspector                 | 224px wide above the compact breakpoint; 190px at 1100px and below                                      |
| Settings window                | Independent 568 × 348px native window; fixed size with an internally scrolling content region           |
| Settings toolbar               | 36px title region, then centered 68 × 61px icon tabs with 8px gap and 10px bottom padding               |
| Settings rows                  | 100px right-aligned label, 12px gap, remaining control column; content padding 26px 32px 24px           |
| Settings font preview          | 112px left inset matching the control column; 20px top margin; actual chosen font size                  |
| Update history                 | Welcome rail retained; no gradient or bands; notes max-width 800px with 22px 24px 32px padding          |
| Welcome stage                  | 195px total, including the toolbar and 143px hero; original bands continue behind the main-column title |
| Welcome navigation             | 38px rows; recent, new, optional continue, explicit example and update history                          |
| Welcome recents                | 46px minimum rows, 10px margins; quiet explanatory empty state without another action card              |

The welcome is a two-column grid: its rail spans both rows, its title begins at the main-column inset, and its artwork continues across that main column. New comparison and comparison fill the window without a navigation rail. Tabs supply session switching only when more than one session exists. Return and continue preserve each session’s content, selection, editing state and undo history.

The exported spacing rhythm uses 4px steps through 24px plus 32px, with small optical gaps and compact control padding where the source establishes them. At 1100px and below, path sizes are suppressed and toolbar/inspector spacing tightens. At 980px and below, toolbar gaps tighten further. This is a resizable desktop interface; no mobile layout is implemented.

The editor’s line content has 12px top and 64px bottom padding. The one-source preview shares comparison fonts, syntax colors, wrapping and read-only text behavior. Folder mode keeps independently selected paths and its own action controls rather than opening a text/image preview; switching modes restores the cached inputs and correct title. Folder comparison uses aligned halves and 34px virtualized rows with fixed size columns. Image comparison preserves two equal panes or a matching-size wipe surface with scrolling and zoom.

## Elevation & Depth

The workspace primarily uses tonal layering and one-pixel dividers. Raised controls have a faint one-step shadow; the Radix popover uses the stronger dialog shadow. The independent Settings window uses native window chrome and flat CSS surfaces rather than a CSS modal card or backdrop. The welcome quick-action capsule adds a small translucent shadow over the stage. Relevant Settings/update component snippets and control/popover shadow values are recorded in the sidecar.

### Shadow Vocabulary

- **Control:** the light/dark `shadow-control` value gives small buttons and selected segments a restrained lift.
- **Dialog:** the light/dark `shadow-dialog` value separates the font-size popover from its window content.
- **Welcome quick action:** a soft local shadow identifies the translucent file/clipboard capsule over the gradient.

### Named Rules

**The Quiet Surface Rule.** Use tonal surfaces and fine dividers for the comparison workspace. Reserve pronounced shadows for dialogs and popovers; small raised controls use the control shadow.

## Shapes

Controls use gently rounded corners, icon buttons are slightly tighter, and tags are compact rounded squares. Segmented groups, popovers and welcome recent containers share the group radius. Settings tabs use 8px corners; appearance thumbnails and code preview use 7px corners. The native Settings window supplies its own outer shape. The update action has 16px pill corners and the current-version tag uses the existing tag radius. Empty source containers use their own 10px corners. Choose and Paste are separate controls with all four corners rounded at 7px; their fills stay inside the controls. The original Diffolio mark is a pair of offset rounded documents with three strokes, rendered directly in the welcome target. The welcome quick-action capsule is pill-shaped.

Fine dividers organize paths, tabs and rows. Dashed borders identify independently droppable empty sources; a supplied source switches to a continuous rectangular preview with a header and a center pane divider. The content body has no replacement-button hover fill. The full-window drop overlay uses a dashed accent border. Folder rows and editor content remain rectangular and continuous.

## Components

### Buttons

Compact actions use a familiar native-tool character. Primary save actions use accent/on-accent, medium-bold text and the control shadow. Subtle actions use the raised layer and control shadow. Text actions carry accent text. Icon buttons have descriptive accessible names and optional pressed state; selected icons use accent-soft and accent. Hover uses the hover layer, the primary variant mixes its accent with text, and keyboard focus uses a 2px accent outline with 2px offset. Disabled buttons use 0.38 opacity. No decorative hover motion is implemented.

### Fields and font-size Combobox

Folder search is an outlined, icon-led field with a 2px focus-within outline. Comparison search occupies one shared 36px row below the path headers. A 26px field, A/B scope segments, previous/next arrows, a quiet match count, an options popover and Done stay on one line down to the minimum window with the inspector open. The documents keep the same vertical origin. Options are Chinese, query highlights use accent-soft/accent, invalid regex has explicit text, and Escape returns focus to the chosen document. Unified layout searches B; A remains visibly unavailable until split layout returns. Font size uses the actual shadcn composition adapted from SVNBox: Button + Radix Popover + cmdk Command. The trigger is 90 × 28px; the popover is 176px wide with a 36px search header and a list capped at 230px. Search, empty results, arrow navigation, Enter, a visible checked value, Escape and focus return are part of the component. The list's highlighted item and the committed value's check are distinct states.

Settings uses its own native WebKit window. The Combobox popover portals into that window's document; it needs no modal container. Escape dismisses the open popover first and preserves Settings. A later Escape closes the Settings window. Checkboxes elsewhere retain native form behavior and use the accent color.

### Navigation and tags

The welcome rail is the only navigation rail. Recent, new, optional continue, example and update-history actions use neutral hover/current-page fills rather than the shared violet hover layer. The title aligns above the main content; the lower-left footer contains only Settings. The comparison toolbar supplies return and new-comparison actions without repeating welcome navigation. Tabs appear only with multiple sessions, with close actions, example badges, a dirty dot and a thin inset accent on the selected tab. Layout controls use a segmented group with a raised active segment. Side tags retain A/B identity; each edited copy gets a green tag, explicit copy label and a small pencil mark.

### Containers and feedback

Inline error banners use deletion colors with an alert role and dismiss action; loading uses accent-soft with a status role. Saved-result feedback uses success text and a check. The loading icon is the only continuous animation (a one-second linear rotation), disabled by reduced-motion preferences. Increased-contrast preference promotes structural borders to the input-border role.

### Native Settings

The General and Text tabs place a 25px open-library icon above an 11px label. Selected tabs use accent text, a seven-percent text tint and a fine inset highlight. Arrow keys, Home and End change tabs and keyboard focus. General contains only system/light/dark appearance choices. Appearance thumbnails have a 2px accent outline with 2px offset when selected. Text contains the existing font-size Combobox and a syntax-colored monospace preview rendered at the chosen size. Wrapping and unchanged-region collapse remain comparison controls; they are absent from Settings. There is no identity footer or explanatory filler.

Repeated opens focus the existing Settings instance. Both native windows share one Rust backend; preference writes patch only changed fields, then broadcast to all native windows. Appearance updates native themes and renderer palettes; font-size changes update the main editor and preview. Closing Settings leaves comparison edits intact. The window has no web modal backdrop.

**The Independent Preferences Rule.** Keep Settings a compact native window with only implemented preferences. Keep aligned labels, top icon tabs and actual-size font feedback; preserve the active comparison when it closes.

### Application updates

The welcome “更新日志” page displays the actual Chinese sections from `docs/releases/*.md`, loaded at build time and sorted by version. The welcome rail and dark palette remain; its gradient and SVG bands are absent. Version headings, a current-version tag, fine release dividers and comfortably spaced notes form the reading surface. Opening history performs no automatic network check.

The titlebar supplies one phase-appropriate manual action: check, download, or restart/install, plus a separate release-page icon button. Checking/downloading/installing disable repeated actions; progress and status appear above the notes. Disabled development mode, network errors, unavailable updates and retry are explicit. Unsaved results or active tasks disable installation; the Rust backend independently enforces the same protection. The native “检查更新…” menu action also restores/focuses the main window and starts the explicitly requested check.

### Source entry and immediate preview

New comparison starts with two independently selectable and droppable source containers. A small A/B header is separated from the explanatory body by 16px; each container has 16px padding. The body is informational. Choose and Paste are individual 28px controls with 8px between them. Choose uses the raised layer and a restrained raised/text mix on hover; Paste uses a subtle five-percent text fill and stronger text on hover. Both keep all four corners rounded and inherit the visible keyboard outline. Hovering the source body does not create a replacement action.

The first file, image or clipboard text immediately opens a full-width two-pane preview. A 34px header carries source identity, an added check, byte count and compact file/clipboard replacement buttons. Text uses the same CodeMirror language, syntax colors, font preference and wrapping as comparison, with read-only/non-editable extensions. Images show actual content with an explicit failure message if decoding fails. Zero-byte text is a selected source and displays “已加入空文本”, a check and 0 B; the opposite pane remains an input. The supplied content is not a button. Once both compatible versions arrive, comparison opens automatically. Folder mode retains independent path selection, replacement and cancellation with its own controls.

### Signature comparison and welcome

Text comparison uses CodeMirror aligned split ranges or a unified view. Added/deleted/modified line fills are subtle; the changed text uses the stronger partner fill and plain main text color. Current-change navigation moves the caret and centers corresponding ranges; result editing and applying A operate on the current chunk. The footer shows the current/total change count. Save and editing state remain explicit.

The text footer keeps the same 36px height before and after editing. Its three groups use equal flexible side columns around the intrinsic center group. The footer belongs to the document column: when the inspector opens, the center group aligns to the comparison area and navigation stops at the inspector boundary. The inspector extends to the window bottom. Display controls provide Find, Wrap and Collapse, followed by an Overview popover containing added/deleted/modified counts and A/B encoding, BOM and line endings. The right group supplies the current/total count and previous/next difference arrows; identical inputs show “内容相同” and disable the four block decisions and navigation.

The center group is exactly six mirrored icon buttons, ordered Edit A, Keep Both (A then B), Copy A to B, Copy B to A, Keep Both (B then A), Edit B. Square pencils sit at the ends, opposing filled triangles handle copies, and ellipses handle ordered Keep Both with explicit tooltips. Each block decision creates an editable target copy if needed; A-then-B writes to B, and B-then-A writes to A. The source snapshots remain immutable. Unified layout supports decisions targeting B; editing A returns to split, where both directions are available.

Footer icons use 28 × 26px targets with 5px corners. The center group has mirrored 12 / 4 / 8 / 4 / 12px gaps and a 208px total width; major grid gaps are 12px. First clicking a pencil enables and focuses that side's built-in copy. Clicking it again opens its 196px action popover with status, Continue Editing, Undo, Redo and Save As. Violet pencils indicate editing; a 4px violet dot marks that side's unsaved content. Each side has independent text, save state, selection and actual CodeMirror history. Escape returns focus to its pencil; Continue Editing and history actions return to the correct editor. Command-S saves the active side; closing with unsaved work offers to save all dirty sides and stops if any save is canceled.

The Overview is 252px wide with 14px padding and preserves Escape/focus-return behavior. Save confirmation floats 8px above the footer, identifies A or B, wraps long names within 560px or the comparison inset, and never changes row height. These controls retain semantic colors and visible focus in light and dark appearances.

**The Single Footer Rule.** Keep display options, symmetric block actions and difference navigation in one stable row aligned to the comparison area. Keep per-side edit/save/history details in the corresponding pencil popover and comparison metadata in Overview.

The welcome’s centered entry action, fixed top-right clipboard/file capsule, opaque rail and true recent rows are reusable home patterns. Its original bands continue behind the main-column title. Empty recents provide a short explanation; populated rows show name, kind and date, reveal their reopen arrow on hover or keyboard focus, and reopen the actual paths. The rail carries new/example/continue actions without a duplicate action card or footer. Examples remain identified throughout comparison. Implemented states live in `src/renderer/src/components/` and `src/renderer/src/state/`; framework-free visual specimens are in `.impeccable/design.json`.

## Do's and Don'ts

### Do:

- **Do** consume the semantic custom properties so workspace controls adapt to light, dark and system appearance.
- **Do** keep the 180px rail only on welcome, use the full width for entry and comparison, and show tabs only for multiple sessions.
- **Do** pair diff colors with aligned ranges, status symbols, labels or counts, and keep changed text in the main text color.
- **Do** preserve visible focus, accessible names, selection checks and keyboard behavior for icon buttons and Combobox.
- **Do** show real recent entries and keep example comparisons visibly labeled.
- **Do** use the original Diffolio mark, SVG bands and open-library icons.
- **Do** space source headers, bodies and individual Choose/Paste controls, then show supplied content immediately in a read-only pane.
- **Do** preserve valid empty-text sources, independent folder choices, mode caches and edits/undo when returning and continuing.
- **Do** keep Settings native and compact, with top icon tabs, aligned preference rows and a font preview at the selected size.
- **Do** load release history locally and keep network checks, downloads and installation explicit user actions.
- **Do** keep result state explicit and derive Undo/Redo availability from the editor's actual history.

### Don't:

- **Don't** propagate the welcome gradient or dark-only palette into the comparison workspace.
- **Don't** use color alone to identify a comparison state or apply syntax colors over the stronger changed-text highlight.
- **Don't** replace the font-size Combobox with a native select or close Settings on the first Escape while its popover is open.
- **Don't** introduce a Tailwind runtime or assume utility classes provide styling; the shipped interface uses semantic CSS.
- **Don't** use Kaleidoscope artwork, logos or screenshots as shipping product assets.
- **Don't** restore a comparison rail, translucent welcome rail, violet navigation hover, competing empty-state action card or always-visible tabs.
- **Don't** make the source body a replacement button or use a full-width Paste strip with shared or partial corners.
- **Don't** add global wrapping/collapse switches, an identity footer or filler prose to Settings, or apply the welcome artwork to update history.
- **Don't** add a second editing row, let save feedback displace controls, or share one side's dirty/history state with the other.
