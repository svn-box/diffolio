use crate::state::Backend;
use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateState {
    phase: String,
    current_version: String,
    revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    percent: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
    blocked: bool,
}

pub struct Updates {
    state: Mutex<UpdateState>,
    pending: AtomicBool,
    available: Mutex<Option<Update>>,
    downloaded: Mutex<Option<Vec<u8>>>,
}

impl Updates {
    pub fn new() -> Self {
        let enabled = !cfg!(any(debug_assertions, feature = "native-smoke"));
        Self {
            state: Mutex::new(UpdateState {
                phase: if enabled { "idle" } else { "disabled" }.into(),
                current_version: env!("CARGO_PKG_VERSION").into(),
                revision: 0,
                version: None,
                percent: None,
                blocked: false,
                message: if enabled {
                    None
                } else {
                    Some("开发与验证版本不检查更新，请使用正式安装包。".into())
                },
            }),
            pending: AtomicBool::new(false),
            available: Mutex::new(None),
            downloaded: Mutex::new(None),
        }
    }

    fn snapshot(&self) -> UpdateState {
        self.state.lock().unwrap().clone()
    }

    fn change(&self, app: &AppHandle, change: impl FnOnce(&mut UpdateState)) {
        let snapshot = {
            let mut state = self.state.lock().unwrap();
            change(&mut state);
            state.revision += 1;
            state.clone()
        };
        let _ = app.emit("diffolio:update-state", snapshot);
    }
}

struct Pending<'a>(&'a AtomicBool);

impl Drop for Pending<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

#[tauri::command]
pub async fn update(
    app: AppHandle,
    backend: State<'_, Backend>,
    updates: State<'_, Updates>,
    action: String,
) -> Result<UpdateState, String> {
    if !["status", "check", "download", "install", "release"].contains(&action.as_str()) {
        return Err("更新操作无效。".into());
    }
    if action == "status" {
        return Ok(updates.snapshot());
    }
    if action == "release" {
        app.opener()
            .open_url("https://github.com/svn-box/diffolio/releases", None::<&str>)
            .map_err(|_| "无法打开发布页。")?;
        return Ok(updates.snapshot());
    }
    if updates.snapshot().phase == "disabled"
        || updates
            .pending
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
    {
        return Ok(updates.snapshot());
    }
    let _pending = Pending(&updates.pending);
    match action.as_str() {
        "check" => {
            if updates.downloaded.lock().unwrap().is_some() {
                return Ok(updates.snapshot());
            }
            updates.change(&app, |s| {
                s.phase = "checking".into();
                s.message = None;
                s.version = None;
                s.blocked = false;
            });
            let updater = app
                .updater_builder()
                .timeout(std::time::Duration::from_secs(30))
                .build();
            let result = match updater {
                Ok(updater) => updater.check().await,
                Err(error) => Err(error),
            };
            match result {
                Ok(available) => {
                    let version = available.as_ref().map(|update| update.version.clone());
                    *updates.available.lock().unwrap() = available;
                    updates.change(&app, |s| {
                        s.phase = if version.is_some() {
                            "available"
                        } else {
                            "current"
                        }
                        .into();
                        s.version = version;
                    });
                }
                Err(_) => updates.change(&app, |s| {
                    s.phase = "error".into();
                    s.message = Some("无法检查更新，请稍后重试。".into());
                }),
            }
        }
        "download" => {
            if updates.downloaded.lock().unwrap().is_some() {
                return Ok(updates.snapshot());
            }
            let available = updates.available.lock().unwrap().clone();
            let Some(available) = available else {
                return Ok(updates.snapshot());
            };
            updates.change(&app, |s| {
                s.phase = "downloading".into();
                s.percent = Some(0.0);
                s.message = None;
                s.blocked = false;
            });
            let mut downloaded = 0u64;
            let result = available
                .download(
                    |chunk, total| {
                        downloaded += chunk as u64;
                        let percent = total.filter(|total| *total > 0).map_or(0.0, |total| {
                            (downloaded as f64 / total as f64 * 100.0).clamp(0.0, 100.0)
                        });
                        updates.change(&app, |s| s.percent = Some(percent));
                    },
                    || {},
                )
                .await;
            match result {
                Ok(bytes) => {
                    *updates.downloaded.lock().unwrap() = Some(bytes);
                    updates.change(&app, |s| {
                        s.phase = "downloaded".into();
                        s.percent = Some(100.0);
                    });
                }
                Err(_) => updates.change(&app, |s| {
                    s.phase = "error".into();
                    s.message = Some("更新下载或签名验证失败，请重试。".into());
                }),
            }
        }
        "install" => {
            if updates.downloaded.lock().unwrap().is_none() {
                return Ok(updates.snapshot());
            }
            if let Some(reason) = backend.blocked_reason() {
                updates.change(&app, |s| {
                    s.phase = "downloaded".into();
                    s.message = Some(reason);
                    s.blocked = true;
                });
                return Ok(updates.snapshot());
            }
            // Preference writes finish under this lock before installation begins.
            drop(backend.0.store.lock().unwrap());
            if let Some(reason) = backend.blocked_reason() {
                updates.change(&app, |s| {
                    s.message = Some(reason);
                    s.blocked = true;
                });
                return Ok(updates.snapshot());
            }
            let available = updates
                .available
                .lock()
                .unwrap()
                .clone()
                .ok_or("请重新检查更新。")?;
            let bytes = updates
                .downloaded
                .lock()
                .unwrap()
                .clone()
                .ok_or("请先下载更新。")?;
            updates.change(&app, |s| {
                s.phase = "installing".into();
                s.message = None;
                s.blocked = false;
            });
            match tauri::async_runtime::spawn_blocking(move || available.install(bytes)).await {
                Ok(Ok(())) => {
                    backend.0.can_close.store(true, Ordering::SeqCst);
                    app.restart();
                }
                _ => updates.change(&app, |s| {
                    s.phase = "downloaded".into();
                    s.message = Some("安装未完成，请重试。".into());
                }),
            }
        }
        _ => {}
    }
    Ok(updates.snapshot())
}
