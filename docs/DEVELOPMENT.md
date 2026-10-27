# Development

This project targets macOS Apple Silicon. Install Node.js, stable Rust and full Xcode with Icon Composer. The dev/package scripts regenerate the native icon catalog using Icon Composer and the Xcode asset compiler.

```sh
npm ci
npm run dev
```

`npm run dev` starts Vite and the native Tauri app. The browser-only server (`npm run dev:web`) is used by verification; direct browser navigation without the native bridge is not a supported application entry point.

```sh
npm run typecheck
npm test
npm run test:rust
npm run format:check
npm run build
npx playwright install webkit
npm run test:web
```

With `npm run dev:web` running in another terminal:

```sh
npm run test:native

# Optimized native runtime with embedded frontend and production CSP; no Vite server needed.
npm run test:native:release
```

Build a local application and DMG:

```sh
npm run icons:build
npm run licenses:generate
npm run package:dmg
```

Outputs are in `src-tauri/target/release/bundle/macos/` and `src-tauri/target/release/bundle/dmg/`. The local preview uses ad-hoc signing. Public signed releases use the configuration described in [RELEASING.md](RELEASING.md).

Commit `package-lock.json`, `src-tauri/Cargo.lock`, the original `.icon` artwork and generated third-party notices. Build output, native asset catalogs, credentials, test artifacts, `node_modules`, Rust target folders and local replica research are ignored. Keep modules focused and generally below 300 lines. TS/TSX follows `.prettierrc.json`; Rust follows rustfmt and clippy.
