use crate::{
    files::{self, CONTENT_LIMIT},
    model::{path_string, Preferences, RecentComparison, SourceFile, Store},
    read::absolute,
    state::Backend,
};
use std::{path::Path, sync::atomic::Ordering};
use tauri::{AppHandle, Emitter, Manager, State, Theme};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

#[derive(Clone, serde::Serialize)]
pub struct Action {
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paths: Option<Vec<String>>,
}

pub fn action(app: &AppHandle, action: &str, paths: Option<Vec<String>>) {
    let _ = app.emit(
        "diffolio:action",
        Action {
            action: action.into(),
            paths,
        },
    );
}

#[tauri::command]
pub fn bootstrap(backend: State<'_, Backend>) -> Store {
    backend.0.store.lock().unwrap().clone()
}

#[tauri::command]
pub fn ready(app: AppHandle, backend: State<'_, Backend>) {
    backend.0.ready.store(true, Ordering::SeqCst);
    let paths = std::mem::take(&mut *backend.0.pending_paths.lock().unwrap());
    if !paths.is_empty() {
        action(&app, "paths", Some(paths));
    }
    #[cfg(feature = "native-smoke")]
    crate::smoke::start(&app);
}

#[tauri::command]
pub async fn clipboard() -> Result<SourceFile, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut clipboard = arboard::Clipboard::new().map_err(|_| "无法读取剪贴板文本。")?;
        clipboard_source(clipboard.get_text())
    })
    .await
    .map_err(|_| "读取剪贴板未完成。")?
}

pub fn clipboard_source(result: Result<String, arboard::Error>) -> Result<SourceFile, String> {
    let content = match result {
        Ok(content) => content,
        Err(arboard::Error::ContentNotAvailable) => String::new(),
        Err(_) => return Err("无法读取剪贴板文本。".into()),
    };
    files::text_source("剪贴板文本", content)
}

pub fn apply_theme(app: &AppHandle, preferences: &Preferences) -> Result<(), String> {
    let theme = match preferences.appearance.as_str() {
        "dark" => Some(Theme::Dark),
        "light" => Some(Theme::Light),
        _ => None,
    };
    if let Some(window) = app.get_webview_window("main") {
        window.set_theme(theme).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn preferences(
    app: AppHandle,
    backend: State<'_, Backend>,
    value: Preferences,
) -> Result<(), String> {
    value.validate()?;
    let backend = backend.inner().clone();
    let saved = tauri::async_runtime::spawn_blocking(move || {
        backend.modify_store(|store| store.preferences = value)
    })
    .await
    .map_err(|_| "保存设置未完成。")??;
    apply_theme(&app, &saved.preferences)
}

#[tauri::command]
pub async fn remember(
    backend: State<'_, Backend>,
    paths: Vec<String>,
    kind: String,
) -> Result<Vec<RecentComparison>, String> {
    if paths.len() != 2 || !["text", "image", "folder"].contains(&kind.as_str()) {
        return Err("比较记录无效。".into());
    }
    let backend = backend.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let names = paths
            .iter()
            .map(|p| {
                Path::new(p)
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
            })
            .collect::<Vec<_>>();
        let name = format!("{} ↔ {}", names[0], names[1]);
        backend
            .modify_store(|store| {
                store.recents.retain(|item| item.paths != paths);
                store.recents.insert(
                    0,
                    RecentComparison {
                        id: Uuid::new_v4().to_string(),
                        paths,
                        kind,
                        name,
                        opened_at: chrono::Utc::now()
                            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                    },
                );
                store.recents.truncate(15);
            })
            .map(|store| store.recents)
    })
    .await
    .map_err(|_| "保存比较记录未完成。")?
}

#[tauri::command]
pub async fn clear_recents(backend: State<'_, Backend>) -> Result<(), String> {
    let backend = backend.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        backend.modify_store(|store| store.recents.clear())
    })
    .await
    .map_err(|_| "清除记录未完成。")??;
    Ok(())
}

#[tauri::command]
pub fn dirty(app: AppHandle, backend: State<'_, Backend>, value: bool) -> Result<(), String> {
    backend.0.dirty.store(value, Ordering::SeqCst);
    #[cfg(target_os = "macos")]
    if let Some(window) = app.get_webview_window("main") {
        let native = window.clone();
        window.run_on_main_thread(move || {
            if let Ok(pointer) = native.ns_window() {
                // AppKit requires document state changes on its main thread.
                unsafe { let _: () = objc2::msg_send![pointer.cast::<objc2::runtime::AnyObject>(), setDocumentEdited: objc2::runtime::Bool::new(value)]; }
            }
        }).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn close(app: AppHandle, backend: State<'_, Backend>) -> Result<(), String> {
    backend.0.can_close.store(true, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("main") {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn reveal(app: AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(absolute(&path)?)
        .map_err(|_| "无法在 Finder 中显示这个文件。".into())
}

pub fn save_to(
    backend: &Backend,
    content: &str,
    input: SourceFile,
    path: &Path,
) -> Result<serde_json::Value, String> {
    if content.len() > CONTENT_LIMIT {
        return Err("结果内容超过首版的 16 MB 保存限制。".into());
    }
    let source = backend
        .0
        .sources
        .lock()
        .unwrap()
        .get(&input.id)
        .cloned()
        .unwrap_or(input);
    let known = backend
        .0
        .sources
        .lock()
        .unwrap()
        .values()
        .find(|source| source.path.as_deref() == path.to_str())
        .cloned();
    let expected = match known {
        Some(source) => source.hash,
        None => files::current_hash(path)?,
    };
    files::save_atomic(
        path,
        &files::encode_text(content, source.bom, &source.line_ending)?,
        expected.as_deref(),
    )?;
    // A subsequent save should compare against the version this app just wrote.
    let bytes = files::encode_text(content, source.bom, &source.line_ending)?;
    let mut saved = source;
    saved.id = Uuid::new_v4().to_string();
    saved.path = Some(path_string(path)?);
    saved.name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    saved.bytes = bytes.len();
    saved.hash = Some(files::hash(&bytes));
    saved.content = String::new();
    saved.image_url = None;
    let mut sources = backend.0.sources.lock().unwrap();
    sources.retain(|_, file| file.path.as_deref() != path.to_str());
    sources.insert(saved.id.clone(), saved);
    Ok(serde_json::json!({ "path": path_string(path)? }))
}
