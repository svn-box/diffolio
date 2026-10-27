use crate::commands::action;
use tauri::{
    menu::{AboutMetadata, IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Manager,
};

fn item(
    app: &AppHandle,
    id: &str,
    label: &str,
    accelerator: Option<&str>,
) -> tauri::Result<MenuItem<tauri::Wry>> {
    MenuItem::with_id(app, id, label, true, accelerator)
}

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let about = PredefinedMenuItem::about(
        app,
        Some("关于 Diffolio"),
        Some(AboutMetadata {
            name: Some("Diffolio".into()),
            version: Some(env!("CARGO_PKG_VERSION").into()),
            copyright: Some("Copyright © 2026 Kelvin".into()),
            ..Default::default()
        }),
    )?;
    let settings = item(app, "settings", "设置…", Some("CmdOrCtrl+,"))?;
    let updates = item(app, "check-updates", "检查更新…", None)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let hide = PredefinedMenuItem::hide(app, Some("隐藏 Diffolio"))?;
    let hide_others = PredefinedMenuItem::hide_others(app, Some("隐藏其他"))?;
    let show_all = PredefinedMenuItem::show_all(app, Some("显示全部"))?;
    let quit = item(app, "quit", "退出 Diffolio", Some("CmdOrCtrl+Q"))?;
    let application = Submenu::with_items(
        app,
        "Diffolio",
        true,
        &[
            &about,
            &separator,
            &settings,
            &updates,
            &separator,
            &hide,
            &hide_others,
            &show_all,
            &separator,
            &quit,
        ],
    )?;

    let file_items = [
        item(app, "new", "新建比较", Some("CmdOrCtrl+N"))?,
        item(app, "open", "打开文件…", Some("CmdOrCtrl+O"))?,
        item(app, "folders", "比较文件夹…", Some("CmdOrCtrl+Shift+O"))?,
        item(app, "save", "保存结果…", Some("CmdOrCtrl+S"))?,
        item(app, "save-as", "另存结果…", Some("CmdOrCtrl+Shift+S"))?,
        item(app, "close-tab", "关闭比较", Some("CmdOrCtrl+W"))?,
    ];
    let file_refs = file_items
        .iter()
        .map(|item| item as &dyn IsMenuItem<tauri::Wry>)
        .collect::<Vec<_>>();
    let file = Submenu::with_items(app, "文件", true, &file_refs)?;
    let edit = Submenu::with_items(
        app,
        "编辑",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("撤销"))?,
            &PredefinedMenuItem::redo(app, Some("重做"))?,
            &separator,
            &PredefinedMenuItem::cut(app, Some("剪切"))?,
            &PredefinedMenuItem::copy(app, Some("复制"))?,
            &PredefinedMenuItem::paste(app, Some("粘贴"))?,
            &PredefinedMenuItem::select_all(app, Some("全选"))?,
        ],
    )?;
    let display_items = [
        item(app, "split", "双栏布局", Some("CmdOrCtrl+1"))?,
        item(app, "unified", "统一布局", Some("CmdOrCtrl+2"))?,
        item(app, "find", "查找", Some("CmdOrCtrl+F"))?,
        item(app, "find-next", "下一个匹配项", Some("CmdOrCtrl+G"))?,
        item(
            app,
            "find-previous",
            "上一个匹配项",
            Some("CmdOrCtrl+Shift+G"),
        )?,
        item(app, "fullscreen", "切换全屏", Some("Ctrl+Super+F"))?,
    ];
    let display_refs = display_items
        .iter()
        .map(|item| item as &dyn IsMenuItem<tauri::Wry>)
        .collect::<Vec<_>>();
    let display = Submenu::with_items(app, "显示", true, &display_refs)?;
    let windows = Submenu::with_items(
        app,
        "窗口",
        true,
        &[
            &PredefinedMenuItem::minimize(app, Some("最小化"))?,
            &PredefinedMenuItem::maximize(app, Some("缩放"))?,
        ],
    )?;
    app.set_menu(Menu::with_items(
        app,
        &[&application, &file, &edit, &display, &windows],
    )?)?;
    Ok(())
}

pub fn handle(app: &AppHandle, id: &str) {
    match id {
        "check-updates" => match crate::windows::focus_main(app) {
            Ok(()) => action(app, "check-updates", None),
            Err(error) => {
                let _ = app.emit("diffolio:error", error);
            }
        },
        "settings" => {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = crate::windows::show_settings(app.clone()).await {
                    let _ = app.emit("diffolio:error", error);
                }
            });
        }
        "close-tab"
            if app
                .get_webview_window("settings")
                .is_some_and(|window| window.is_focused().unwrap_or(false)) =>
        {
            if let Some(window) = app.get_webview_window("settings") {
                let _ = window.close();
            }
        }
        "quit" => action(app, "close-window", None),
        "save-as" => action(app, "save", None),
        "fullscreen" => {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(value) = window.is_fullscreen() {
                    let _ = window.set_fullscreen(!value);
                }
            }
        }
        "new" | "open" | "folders" | "save" | "close-tab" | "split" | "unified" | "find"
        | "find-next" | "find-previous" => action(app, id, None),
        _ => {}
    }
}
