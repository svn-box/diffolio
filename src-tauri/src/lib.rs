mod commands;
mod dialogs;
mod files;
mod folders;
mod menu;
mod model;
mod read;
mod state;
mod updates;

#[cfg(feature = "native-smoke")]
mod smoke;
#[cfg(test)]
mod tests;

use state::Backend;
use std::sync::atomic::Ordering;
use tauri::{Manager, RunEvent, WindowEvent};

pub fn run() {
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_updater::Builder::new()
                .default_version_comparator(|current, release| {
                    release.version.pre.is_empty() && release.version > current
                })
                .build(),
        )
        .setup(|app| {
            let root = if let Some(path) = std::env::var_os("DIFFOLIO_DATA_DIR") {
                std::path::PathBuf::from(path)
            } else {
                app.path().app_data_dir()?
            };
            let backend = Backend::load(root).map_err(std::io::Error::other)?;
            commands::apply_theme(app.handle(), &backend.0.store.lock().unwrap().preferences)
                .map_err(std::io::Error::other)?;
            app.manage(backend);
            app.manage(updates::Updates::new());
            menu::install(app.handle())?;
            Ok(())
        })
        .on_menu_event(|app, event| menu::handle(app, event.id().as_ref()))
        .on_window_event(|window, event| {
            let backend = window.state::<Backend>();
            if let WindowEvent::CloseRequested { api, .. } = event {
                if backend.0.dirty.load(Ordering::SeqCst)
                    && !backend.0.can_close.load(Ordering::SeqCst)
                {
                    api.prevent_close();
                    commands::action(window.app_handle(), "close-window", None);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap,
            commands::ready,
            commands::clipboard,
            commands::preferences,
            commands::remember,
            commands::clear_recents,
            commands::dirty,
            commands::close,
            commands::reveal,
            read::read_paths,
            read::cancel,
            dialogs::open,
            dialogs::select_folder,
            dialogs::save,
            dialogs::confirm_unsaved,
            updates::update,
            #[cfg(feature = "native-smoke")]
            smoke::smoke_report,
            #[cfg(feature = "native-smoke")]
            smoke::smoke_snapshot,
            #[cfg(feature = "native-smoke")]
            smoke::smoke_action,
        ])
        .build(tauri::generate_context!())
        .expect("Diffolio 无法启动");

    application.run(|app, event| {
        let backend = app.state::<Backend>();
        match event {
            RunEvent::ExitRequested { api, .. } => {
                if backend.0.dirty.load(Ordering::SeqCst)
                    && !backend.0.can_close.load(Ordering::SeqCst)
                {
                    api.prevent_exit();
                    commands::action(app, "close-window", None);
                }
            }
            RunEvent::Opened { urls } => {
                let paths = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .filter_map(|p| p.to_str().map(str::to_owned))
                    .take(2)
                    .collect::<Vec<_>>();
                if backend.0.ready.load(Ordering::SeqCst) {
                    commands::action(app, "paths", Some(paths));
                } else {
                    *backend.0.pending_paths.lock().unwrap() = paths;
                }
            }
            RunEvent::Reopen { .. } => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            RunEvent::Exit => {
                for cancelled in backend.0.tasks.lock().unwrap().values() {
                    cancelled.store(true, Ordering::Relaxed);
                }
            }
            _ => {}
        }
    });
}
