use crate::{commands, state::Backend};
use tauri::{AppHandle, Manager, Theme, WebviewWindowBuilder};

fn open_settings(app: &AppHandle) -> Result<(), String> {
    let window = match app.get_webview_window("settings") {
        Some(window) => window,
        None => {
            let config = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "settings")
                .ok_or("设置窗口未配置。")?
                .clone();
            let appearance = app
                .state::<Backend>()
                .0
                .store
                .lock()
                .unwrap()
                .preferences
                .appearance
                .clone();
            let theme = match appearance.as_str() {
                "dark" => Some(Theme::Dark),
                "light" => Some(Theme::Light),
                _ => None,
            };
            WebviewWindowBuilder::from_config(app, &config)
                .map_err(|_| "无法创建设置窗口。")?
                .theme(theme)
                .build()
                .map_err(|_| "无法打开设置窗口。")?
        }
    };
    window.show().map_err(|_| "无法显示设置窗口。")?;
    window.set_focus().map_err(|_| "无法聚焦设置窗口。".into())
}

#[tauri::command]
pub async fn show_settings(app: AppHandle) -> Result<(), String> {
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let _ = sender.send(open_settings(&handle));
    })
    .map_err(|_| "无法打开设置窗口。")?;
    tauri::async_runtime::spawn_blocking(move || receiver.recv().map_err(|_| "设置窗口未响应。")?)
        .await
        .map_err(|_| "无法打开设置窗口。")?
}

pub fn focus_main(app: &AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("比较窗口已关闭。")?;
    window.unminimize().map_err(|_| "无法恢复比较窗口。")?;
    window.show().map_err(|_| "无法显示更新日志。")?;
    window.set_focus().map_err(|_| "无法聚焦比较窗口。")?;
    Ok(())
}

#[tauri::command]
pub fn show_updates(app: AppHandle) -> Result<(), String> {
    focus_main(&app)?;
    commands::action(&app, "show-updates", None);
    Ok(())
}
