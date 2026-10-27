use crate::{
    files::save_atomic,
    model::{io_error, SourceFile, Store},
};
use std::{
    collections::{HashMap, VecDeque},
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};

pub struct Runtime {
    pub store: Mutex<Store>,
    pub store_path: PathBuf,
    pub sources: Mutex<HashMap<String, SourceFile>>,
    pub tasks: Mutex<HashMap<String, Arc<AtomicBool>>>,
    pub cancellations: Mutex<VecDeque<String>>,
    pub dirty: AtomicBool,
    pub can_close: AtomicBool,
    pub pending_paths: Mutex<Vec<String>>,
    pub ready: AtomicBool,
}

#[derive(Clone)]
pub struct Backend(pub Arc<Runtime>);

impl Backend {
    pub fn load(root: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&root).map_err(io_error)?;
        let store_path = root.join("preferences.json");
        let mut store: Store = match fs::read(&store_path) {
            Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Store::default(),
            Err(error) => return Err(io_error(error)),
        };
        if store.preferences.validate().is_err() {
            store.preferences = Default::default();
        }
        store.recents.retain(|item| {
            item.paths.len() == 2 && ["text", "image", "folder"].contains(&item.kind.as_str())
        });
        store.recents.truncate(15);
        Ok(Self(Arc::new(Runtime {
            store: Mutex::new(store),
            store_path,
            sources: Mutex::new(HashMap::new()),
            tasks: Mutex::new(HashMap::new()),
            cancellations: Mutex::new(VecDeque::new()),
            dirty: AtomicBool::new(false),
            can_close: AtomicBool::new(false),
            pending_paths: Mutex::new(Vec::new()),
            ready: AtomicBool::new(false),
        })))
    }

    pub fn modify_store(&self, change: impl FnOnce(&mut Store)) -> Result<Store, String> {
        let mut current = self.0.store.lock().map_err(|_| "偏好设置暂时不可用。")?;
        let mut next = current.clone();
        change(&mut next);
        let bytes = serde_json::to_vec_pretty(&next).map_err(|error| error.to_string())?;
        let expected = crate::files::current_hash(&self.0.store_path)?;
        save_atomic(&self.0.store_path, &bytes, expected.as_deref())?;
        *current = next.clone();
        Ok(next)
    }

    pub fn blocked_reason(&self) -> Option<String> {
        if self.0.dirty.load(Ordering::SeqCst) {
            Some("请先保存所有未保存的比较结果，再安装更新。".into())
        } else if !self.0.tasks.lock().unwrap().is_empty() {
            Some("请等待当前任务完成后再安装更新。".into())
        } else {
            None
        }
    }
}
