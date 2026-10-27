use crate::{
    files::read_source,
    folders::compare_folders,
    model::{io_error, path_string, OpenResult, Progress},
    state::Backend,
};
use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

pub fn absolute(input: &str) -> Result<PathBuf, String> {
    if input.is_empty() {
        return Err("请选择有效的文件路径。".into());
    }
    let path = PathBuf::from(input);
    let path = if path.is_absolute() {
        path
    } else {
        std::env::current_dir().map_err(io_error)?.join(path)
    };
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                normalized.pop();
            }
            std::path::Component::CurDir => {}
            _ => normalized.push(component),
        }
    }
    Ok(normalized)
}

struct Task {
    backend: Backend,
    id: String,
}

impl Drop for Task {
    fn drop(&mut self) {
        self.backend.0.tasks.lock().unwrap().remove(&self.id);
    }
}

pub fn read_paths_sync(
    app: &AppHandle,
    backend: &Backend,
    input: Vec<String>,
    id: String,
) -> Result<OpenResult, String> {
    if input.is_empty() || input.len() > 2 {
        return Err("请选择一个或两个文件，或者两个文件夹。".into());
    }
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let mut tasks = backend.0.tasks.lock().unwrap();
        if tasks.contains_key(&id) {
            return Err("这个任务仍在处理中。".into());
        }
        let mut cancellations = backend.0.cancellations.lock().unwrap();
        if let Some(index) = cancellations.iter().position(|task| task == &id) {
            cancellations.remove(index);
            cancelled.store(true, Ordering::Relaxed);
        }
        tasks.insert(id.clone(), cancelled.clone());
    }
    let _guard = Task {
        backend: backend.clone(),
        id: id.clone(),
    };
    crate::files::check_cancelled(&cancelled)?;
    let paths: Vec<PathBuf> = input
        .iter()
        .map(|path| absolute(path))
        .collect::<Result<_, _>>()?;
    let infos = paths
        .iter()
        .map(fs::metadata)
        .collect::<Result<Vec<_>, _>>()
        .map_err(io_error)?;
    let result = if infos.iter().any(fs::Metadata::is_dir) {
        if paths.len() != 2 || infos.iter().any(|info| !info.is_dir()) {
            return Err("目录比较需要同时选择两个文件夹。".into());
        }
        let progress = |count| {
            let _ = app.emit(
                "diffolio:progress",
                Progress {
                    task_id: id.clone(),
                    count,
                },
            );
        };
        OpenResult {
            files: Vec::new(),
            folder: Some(compare_folders(
                &paths[0], &paths[1], &cancelled, &progress,
            )?),
        }
    } else {
        let files = paths
            .iter()
            .map(|path| read_source(path))
            .collect::<Result<Vec<_>, _>>()?;
        if files.len() == 2 && files[0].kind != files[1].kind {
            return Err("请比较相同类型的内容：两个文本文件或两张图片。".into());
        }
        let mut sources = backend.0.sources.lock().unwrap();
        for file in &files {
            sources.insert(file.id.clone(), file.snapshot());
        }
        OpenResult {
            files,
            folder: None,
        }
    };
    crate::files::check_cancelled(&cancelled)?;
    Ok(result)
}

#[tauri::command]
pub async fn read_paths(
    app: AppHandle,
    backend: State<'_, Backend>,
    paths: Vec<String>,
    task_id: Option<String>,
) -> Result<OpenResult, String> {
    let backend = backend.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        read_paths_sync(
            &app,
            &backend,
            paths,
            task_id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        )
    })
    .await
    .map_err(|_| "读取任务未完成。")?
}

#[tauri::command]
pub fn cancel(backend: State<'_, Backend>, id: String) {
    cancel_task(&backend, id);
}

pub fn cancel_task(backend: &Backend, id: String) {
    let tasks = backend.0.tasks.lock().unwrap();
    if let Some(task) = tasks.get(&id) {
        task.store(true, Ordering::Relaxed);
    } else {
        let mut cancellations = backend.0.cancellations.lock().unwrap();
        if !cancellations.contains(&id) {
            cancellations.push_back(id);
        }
        if cancellations.len() > 256 {
            cancellations.pop_front();
        }
    }
}

pub fn select_folder_path(input: &str) -> Result<String, String> {
    let path = absolute(input)?;
    if !fs::metadata(&path).map_err(io_error)?.is_dir() {
        return Err("请选择文件夹，或切换到文件比较。".into());
    }
    path_string(&path)
}
