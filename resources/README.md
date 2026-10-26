# Diffolio resources

Public images and application icon assets live in this directory. Product and design documents live in [`docs/`](../docs/); test inputs live in [`fixtures/`](../fixtures/).

## Screenshots

[`screenshots/`](screenshots/README.md) contains the shared English and Chinese README gallery, capture metadata and earlier compact-window design evidence. Run `npm run docs:screenshots` from the project root to refresh the gallery here.

## Application icon

The selected application icon is `icon-concepts/frosted-diff/Diffolio.icon`. It contains one transparent foreground (`Assets/comparison.png`) over the native purple background. The composition's scale and centering are preserved, with no extra inset, raster background or outer frame.

Like SVNBox, electron-builder receives the `.icon` document directly and packages both the native `Assets.car` and compatible `icon.icns`. This preserves macOS default, dark and tinted appearances.

Run `npm run icons:build` to export the selected concept's previews and copy `icon.png` / `icon.icns` here. It uses the existing concept build script and Xcode / Icon Composer 27+. `package:dir` runs it automatically. `icon-source.json` records the foreground hash and native composition.

`icon.svg` retains the earlier original vector mark as source material; it is no longer the packaged application icon. The comparison interface's small monochrome mark is separate from the macOS application icon.
