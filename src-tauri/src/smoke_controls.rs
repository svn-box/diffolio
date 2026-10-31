//! Native window chrome measurements, available only in verification builds.
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn smoke_window_controls(
    app: AppHandle,
    label: String,
) -> Result<serde_json::Value, String> {
    if std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").is_none() {
        return Err("Harness is not enabled".into());
    }
    let window = app.get_webview_window(&label).ok_or("Missing window")?;
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    window
        .with_webview(move |webview| {
            use objc2_app_kit::NSWindowButton;
            use objc2_web_kit::WKWebView;
            let result = (|| -> Result<serde_json::Value, String> {
                let view = unsafe { &*webview.inner().cast::<WKWebView>() };
                let native = view.window().ok_or("Missing native window")?;
                let height = native.frame().size.height;
                let buttons = [
                    ("close", NSWindowButton::CloseButton),
                    ("minimize", NSWindowButton::MiniaturizeButton),
                    ("maximize", NSWindowButton::ZoomButton),
                ]
                .into_iter()
                .map(|(name, kind)| {
                    let button = native.standardWindowButton(kind).ok_or("Missing button")?;
                    let rect = button.convertRect_toView(button.bounds(), None);
                    Ok(serde_json::json!({
                        "name": name,
                        "x": rect.origin.x,
                        "top": height - rect.origin.y - rect.size.height,
                        "centerY": height - rect.origin.y - rect.size.height / 2.0,
                        "width": rect.size.width,
                        "height": rect.size.height,
                    }))
                })
                .collect::<Result<Vec<_>, &str>>()?;
                Ok(serde_json::json!({ "buttons": buttons }))
            })();
            let _ = sender.send(result);
        })
        .map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        receiver.recv().map_err(|_| "Native measurement failed")?
    })
    .await
    .map_err(|error| error.to_string())?
}
