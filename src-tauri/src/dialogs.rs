use crate::{
    commands::save_to,
    model::{path_string, OpenResult, SourceFile},
    read::{read_paths_sync, select_folder_path},
    state::Backend,
};
use std::path::Path;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogResult};
use uuid::Uuid;

#[tauri::command]
pub async fn open(
    app: AppHandle,
    backend: State<'_, Backend>,
    kind: String,
    multiple: bool,
    task_id: Option<String>,
) -> Result<Option<OpenResult>, String> {
    if !["files", "folders"].contains(&kind.as_str()) {
        return Err("请选择有效的比较类型。".into());
    }
    let backend = backend.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = app.dialog().file().set_title(if kind == "folders" {
            "选择两个要比较的文件夹"
        } else if multiple {
            "选择要比较的文件"
        } else {
            "选择一个文件"
        });
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let chosen = if kind == "folders" {
            dialog.blocking_pick_folders()
        } else if multiple {
            dialog.blocking_pick_files()
        } else {
            dialog.blocking_pick_file().map(|path| vec![path])
        };
        let Some(chosen) = chosen else {
            return Ok(None);
        };
        let paths = chosen
            .into_iter()
            .map(|path| {
                path.into_path()
                    .map_err(|_| "请选择本地文件。".to_owned())
                    .and_then(|path| path_string(&path))
            })
            .collect::<Result<Vec<_>, _>>()?;
        read_paths_sync(
            &app,
            &backend,
            paths,
            task_id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        )
        .map(Some)
    })
    .await
    .map_err(|_| "文件选择未完成。")?
}

#[tauri::command]
pub async fn select_folder(app: AppHandle, path: Option<String>) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(path) = path {
            return select_folder_path(&path).map(Some);
        }
        let mut dialog = app.dialog().file().set_title("选择比较文件夹");
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let Some(path) = dialog.blocking_pick_folder() else {
            return Ok(None);
        };
        let path = path.into_path().map_err(|_| "请选择本地文件夹。")?;
        select_folder_path(&path_string(&path)?).map(Some)
    })
    .await
    .map_err(|_| "文件夹选择未完成。")?
}

#[tauri::command]
pub async fn save(
    app: AppHandle,
    backend: State<'_, Backend>,
    content: String,
    source: SourceFile,
) -> Result<Option<serde_json::Value>, String> {
    if content.len() > crate::files::CONTENT_LIMIT {
        return Err("结果内容超过首版的 16 MB 保存限制。".into());
    }
    let backend = backend.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let source = backend
            .0
            .sources
            .lock()
            .unwrap()
            .get(&source.id)
            .cloned()
            .unwrap_or(source);
        #[cfg(feature = "native-smoke")]
        if let Some(root) = std::env::var_os("DIFFOLIO_SMOKE_OUTPUT") {
            return save_to(
                &backend,
                &content,
                source,
                &std::path::PathBuf::from(root).join("saved-result.ts"),
            )
            .map(Some);
        }
        let name = Path::new(&source.name);
        let stem = name
            .file_stem()
            .and_then(|name| name.to_str())
            .unwrap_or("result");
        let extension = name
            .extension()
            .and_then(|name| name.to_str())
            .map(|extension| format!(".{extension}"))
            .unwrap_or_default();
        let mut dialog = app
            .dialog()
            .file()
            .set_title("另存比较结果")
            .set_file_name(format!("{stem}.merged{extension}"));
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        if let Some(parent) = source
            .path
            .as_deref()
            .and_then(|path| Path::new(path).parent())
        {
            dialog = dialog.set_directory(parent);
        }
        let Some(path) = dialog.blocking_save_file() else {
            return Ok(None);
        };
        let path = path.into_path().map_err(|_| "请选择本地保存位置。")?;
        save_to(&backend, &content, source, &path).map(Some)
    })
    .await
    .map_err(|_| "保存结果未完成。")?
}

#[tauri::command]
pub async fn confirm_unsaved(app: AppHandle) -> Result<String, String> {
    #[cfg(feature = "native-smoke")]
    if std::env::var_os("DIFFOLIO_SMOKE_OUTPUT").is_some() {
        return Ok("cancel".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = app
            .dialog()
            .message("你可以保存后继续，也可以放弃这些编辑。")
            .title("保存尚未保存的比较结果？")
            .buttons(MessageDialogButtons::YesNoCancelCustom(
                "保存后继续".into(),
                "放弃修改".into(),
                "取消".into(),
            ));
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.parent(&window);
        }
        match dialog.blocking_show_with_result() {
            MessageDialogResult::Yes => "save".into(),
            MessageDialogResult::No => "discard".into(),
            MessageDialogResult::Custom(value) if value == "保存后继续" => "save".into(),
            MessageDialogResult::Custom(value) if value == "放弃修改" => "discard".into(),
            _ => "cancel".into(),
        }
    })
    .await
    .map_err(|_| "确认操作未完成。".into())
}
