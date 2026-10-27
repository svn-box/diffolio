//! Test-only native WebKit harness. These commands and dependencies are absent from normal builds.
use crate::state::Backend;
use std::{
    path::PathBuf,
    sync::atomic::{AtomicBool, Ordering},
};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn smoke_action(
    app: AppHandle,
    backend: State<'_, Backend>,
    action: String,
    paths: Option<Vec<String>>,
    position: Option<tauri::PhysicalPosition<f64>>,
) -> Result<serde_json::Value, String> {
    use tauri::Emitter;
    if std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").is_none() {
        return Err("Harness is not enabled".into());
    }
    match action.as_str() {
        "paths" => crate::commands::action(&app, "paths", paths),
        "drop" => app
            .emit(
                "tauri://drag-drop",
                serde_json::json!({ "paths": paths, "position": position }),
            )
            .map_err(|error| error.to_string())?,
        "request-close" => app
            .get_webview_window("main")
            .ok_or("Missing window")?
            .close()
            .map_err(|error| error.to_string())?,
        "find" | "find-next" | "find-previous" | "check-updates" => {
            crate::menu::handle(&app, &action)
        }
        "minimize-main" => app
            .get_webview_window("main")
            .ok_or("Missing window")?
            .minimize()
            .map_err(|e| e.to_string())?,
        "minimum-window" | "restore-window" => {
            let (width, height) = if action == "minimum-window" {
                (880.0, 540.0)
            } else {
                (964.0, 564.0)
            };
            app.get_webview_window("main")
                .ok_or("Missing window")?
                .set_size(tauri::LogicalSize::new(width, height))
                .map_err(|e| e.to_string())?;
        }
        "settings-status" => {
            let output = PathBuf::from(std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").unwrap());
            let report = std::fs::read(output.join("settings-report.json"))
                .ok()
                .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok());
            let main = app.get_webview_window("main").ok_or("Missing window")?;
            return Ok(
                serde_json::json!({"report": report, "settingsOpen": app.get_webview_window("settings").is_some(), "windowCount": app.webview_windows().len(), "preferences": backend.0.store.lock().unwrap().preferences, "mainFocused": main.is_focused().unwrap_or(false), "mainMinimized": main.is_minimized().unwrap_or(false)}),
            );
        }
        "status" => {}
        _ => return Err("Unknown test action".into()),
    }
    Ok(
        serde_json::json!({ "dirty": backend.0.dirty.load(Ordering::SeqCst), "canClose": backend.0.can_close.load(Ordering::SeqCst), "visible": app.get_webview_window("main").is_some_and(|window| window.is_visible().unwrap_or(false)) }),
    )
}

static STARTED: AtomicBool = AtomicBool::new(false);
static SETTINGS_STARTED: AtomicBool = AtomicBool::new(false);

pub fn start_settings(app: &AppHandle) {
    if std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").is_none()
        || SETTINGS_STARTED.swap(true, Ordering::SeqCst)
    {
        return;
    }
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.eval(include_str!("../../scripts/native-settings-smoke.js"));
    }
}

#[tauri::command]
pub fn smoke_settings_report(report: serde_json::Value) -> Result<(), String> {
    let output =
        PathBuf::from(std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").ok_or("Harness is not enabled")?);
    std::fs::write(
        output.join("settings-report.json"),
        serde_json::to_vec(&report).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

pub fn start(app: &AppHandle) {
    if std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").is_none() || STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    let config = serde_json::json!({ "root": env!("CARGO_MANIFEST_DIR"), "output": std::env::var("DIFFOLIO_SMOKE_OUTPUT").unwrap() });
    let script = format!(
        "window.__DIFFOLIO_SMOKE__ = {config};\n{}",
        include_str!("../../scripts/native-smoke.js")
    );
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(script);
    }
}

#[tauri::command]
pub fn smoke_report(
    app: AppHandle,
    backend: State<'_, Backend>,
    report: serde_json::Value,
) -> Result<(), String> {
    let output =
        PathBuf::from(std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").ok_or("Harness is not enabled")?);
    std::fs::write(
        output.join("report.json"),
        serde_json::to_vec_pretty(&report).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    backend.0.can_close.store(true, Ordering::SeqCst);
    app.exit(if report["success"] == true { 0 } else { 1 });
    Ok(())
}

#[tauri::command]
pub async fn smoke_snapshot(window: tauri::WebviewWindow, name: String) -> Result<(), String> {
    if ![
        "welcome",
        "entry",
        "search-light",
        "search-dark",
        "folder",
        "image",
        "settings",
        "settings-light",
        "settings-text",
        "updates",
        "footer-editing-light",
        "footer-minimum-editing",
        "footer-saved",
    ]
    .contains(&name.as_str())
    {
        return Err("Unknown snapshot".into());
    }
    let output =
        PathBuf::from(std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").ok_or("Harness is not enabled")?)
            .join(format!("{name}.png"));
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    window
        .with_webview(move |webview| unsafe {
            use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
            use objc2_foundation::{NSDictionary, NSError, NSString};
            use objc2_web_kit::WKWebView;
            let view = &*webview.inner().cast::<WKWebView>();
            let completion =
                block2::RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
                    let result = (|| -> Result<(), String> {
                        if !error.is_null() || image.is_null() {
                            return Err("WebKit snapshot failed".into());
                        }
                        let tiff = (&*image).TIFFRepresentation().ok_or("Missing TIFF")?;
                        let bitmap =
                            NSBitmapImageRep::imageRepWithData(&tiff).ok_or("Missing bitmap")?;
                        let png = bitmap
                            .representationUsingType_properties(
                                NSBitmapImageFileType::PNG,
                                &NSDictionary::new(),
                            )
                            .ok_or("Missing PNG")?;
                        if !png.writeToFile_atomically(
                            &NSString::from_str(output.to_str().ok_or("Invalid path")?),
                            true,
                        ) {
                            return Err("Snapshot write failed".into());
                        }
                        Ok(())
                    })();
                    let _ = sender.send(result);
                });
            view.takeSnapshotWithConfiguration_completionHandler(None, &completion);
        })
        .map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        receiver
            .recv_timeout(std::time::Duration::from_secs(15))
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())??
}
