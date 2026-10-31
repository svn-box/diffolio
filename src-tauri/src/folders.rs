use crate::{
    files::{check_cancelled, file_hash},
    model::{io_error, path_string, FolderComparison, FolderEntry},
};
use std::{collections::BTreeSet, fs, path::Path, sync::atomic::AtomicBool};
use uuid::Uuid;

struct Scanner<'a> {
    entries: Vec<FolderEntry>,
    cancelled: &'a AtomicBool,
    progress: &'a dyn Fn(usize),
}

impl Scanner<'_> {
    fn walk(
        &mut self,
        relative: &str,
        left: Option<&Path>,
        right: Option<&Path>,
    ) -> Result<(), String> {
        check_cancelled(self.cancelled)?;
        let names = |root: Option<&Path>| -> Result<BTreeSet<String>, String> {
            root.map_or_else(
                || Ok(BTreeSet::new()),
                |path| {
                    fs::read_dir(path)
                        .map_err(io_error)?
                        .map(|entry| {
                            let entry = entry.map_err(io_error)?;
                            entry
                                .file_name()
                                .into_string()
                                .map_err(|_| "文件名包含无法显示的字符。".into())
                        })
                        .collect()
                },
            )
        };
        let a_names = names(left)?;
        let b_names = names(right)?;
        for name in a_names.union(&b_names) {
            check_cancelled(self.cancelled)?;
            if self.entries.len() >= 100_000 {
                return Err("目录超过首版的 100,000 条扫描限制。请缩小比较范围。".into());
            }
            let a = left
                .filter(|_| a_names.contains(name))
                .map(|root| root.join(name));
            let b = right
                .filter(|_| b_names.contains(name))
                .map(|root| root.join(name));
            let path = if relative.is_empty() {
                name.clone()
            } else {
                format!("{relative}/{name}")
            };
            let index = self.entries.len();
            self.entries.push(FolderEntry {
                path: path.clone(),
                kind: "file".into(),
                status: if a.is_none() {
                    "right"
                } else if b.is_none() {
                    "left"
                } else {
                    "equal"
                }
                .into(),
                left: a.as_deref().map(path_string).transpose()?,
                right: b.as_deref().map(path_string).transpose()?,
                left_size: None,
                right_size: None,
                error: None,
            });
            if self.entries.len().is_multiple_of(32) {
                (self.progress)(self.entries.len());
            }
            if let Err(error) = self.inspect(index, &path, a.as_deref(), b.as_deref()) {
                check_cancelled(self.cancelled)?;
                if self.entries.len() >= 100_000 && error.contains("100,000") {
                    return Err(error);
                }
                self.entries[index].status = "error".into();
                self.entries[index].error = Some(error);
            }
        }
        Ok(())
    }

    fn inspect(
        &mut self,
        index: usize,
        relative: &str,
        left: Option<&Path>,
        right: Option<&Path>,
    ) -> Result<(), String> {
        let a = left
            .map(fs::symlink_metadata)
            .transpose()
            .map_err(io_error)?;
        let b = right
            .map(fs::symlink_metadata)
            .transpose()
            .map_err(io_error)?;
        let info = a.as_ref().or(b.as_ref()).ok_or("文件已不存在。")?;
        let kind = |info: &fs::Metadata| {
            if info.file_type().is_symlink() {
                "symlink"
            } else if info.is_dir() {
                "directory"
            } else if info.is_file() {
                "file"
            } else {
                "unsupported"
            }
        };
        self.entries[index].kind = kind(info).into();
        self.entries[index].left_size = a.as_ref().map(fs::Metadata::len);
        self.entries[index].right_size = b.as_ref().map(fs::Metadata::len);
        if let (Some(a), Some(b)) = (&a, &b) {
            if kind(a) != kind(b) {
                self.entries[index].status = "modified".into();
                return Ok(());
            }
        }
        match kind(info) {
            "symlink" => {
                if let (Some(a), Some(b)) = (left, right) {
                    self.entries[index].status = if fs::read_link(a).map_err(io_error)?
                        == fs::read_link(b).map_err(io_error)?
                    {
                        "equal"
                    } else {
                        "modified"
                    }
                    .into();
                }
            }
            "directory" => {
                self.walk(relative, left, right)?;
                if left.is_some()
                    && right.is_some()
                    && self.entries[index + 1..]
                        .iter()
                        .any(|child| child.status != "equal")
                {
                    self.entries[index].status = "modified".into();
                }
            }
            "file" => {
                if let (Some(left), Some(right)) = (left, right) {
                    let same = a.as_ref().unwrap().len() == b.as_ref().unwrap().len()
                        && file_hash(left, self.cancelled)? == file_hash(right, self.cancelled)?;
                    self.entries[index].status = if same { "equal" } else { "modified" }.into();
                }
            }
            _ => return Err("不支持设备、套接字或其他特殊文件。".into()),
        }
        Ok(())
    }
}

pub fn compare_folders(
    left: &Path,
    right: &Path,
    cancelled: &AtomicBool,
    progress: &dyn Fn(usize),
) -> Result<FolderComparison, String> {
    let mut scanner = Scanner {
        entries: Vec::new(),
        cancelled,
        progress,
    };
    scanner.walk("", Some(left), Some(right))?;
    check_cancelled(cancelled)?;
    progress(scanner.entries.len());
    Ok(FolderComparison {
        id: Uuid::new_v4().to_string(),
        left: path_string(left)?,
        right: path_string(right)?,
        entries: scanner.entries,
        left_metadata: crate::file_metadata::from_metadata(&fs::metadata(left).map_err(io_error)?),
        right_metadata: crate::file_metadata::from_metadata(
            &fs::metadata(right).map_err(io_error)?,
        ),
    })
}
