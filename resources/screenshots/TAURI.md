# Tauri preview screenshots

The preview's `tauri-*.png` files are exported by the running application's own WKWebView via `npm run test:native`. They capture web content at the window's real backing scale; native window controls lie outside these content captures. The application uses the same original design and artwork as the Electron baseline.

`work/visual/` contains ignored Chromium, WebKit and original Electron captures with geometry measurements. Those comparison artifacts are local verification material.
