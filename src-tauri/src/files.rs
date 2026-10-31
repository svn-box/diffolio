use crate::model::{io_error, path_string, SourceFile};
use base64::{engine::general_purpose::STANDARD, Engine};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
};
use uuid::Uuid;

pub const CONTENT_LIMIT: usize = 16 * 1024 * 1024;

pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

pub fn decode_text(bytes: &[u8]) -> Result<(String, bool, String), String> {
    if bytes.contains(&0) {
        return Err("这个文件包含二进制内容，暂时无法作为文本打开。".into());
    }
    let text = std::str::from_utf8(bytes)
        .map_err(|_| "这个文件不是有效的 UTF-8 文本。请先转换编码后再打开。")?;
    let bom = bytes.starts_with(&[0xef, 0xbb, 0xbf]);
    let text = if bom { &text[3..] } else { text };
    let ending = if text.contains("\r\n") {
        "CRLF"
    } else if text.contains('\r') {
        "CR"
    } else {
        "LF"
    };
    Ok((
        text.replace("\r\n", "\n").replace('\r', "\n"),
        bom,
        ending.into(),
    ))
}

pub fn encode_text(content: &str, bom: bool, ending: &str) -> Result<Vec<u8>, String> {
    let eol = match ending {
        "LF" => "\n",
        "CRLF" => "\r\n",
        "CR" => "\r",
        _ => return Err("结果格式无效。".into()),
    };
    let text = content
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .replace('\n', eol);
    Ok(format!("{}{text}", if bom { "\u{feff}" } else { "" }).into_bytes())
}

pub fn text_source(name: &str, content: String) -> Result<SourceFile, String> {
    if content.len() > CONTENT_LIMIT {
        return Err("剪贴板内容超过 16 MB，请先缩小内容。".into());
    }
    Ok(SourceFile {
        id: Uuid::new_v4().to_string(),
        name: name.into(),
        path: None,
        kind: "text".into(),
        bytes: content.len(),
        content,
        bom: false,
        line_ending: "LF".into(),
        hash: None,
        image_url: None,
        metadata: None,
    })
}

pub fn read_source(path: &Path) -> Result<SourceFile, String> {
    let info = fs::metadata(path).map_err(io_error)?;
    if !info.is_file() {
        return Err("请选择普通文件。".into());
    }
    if info.len() > CONTENT_LIMIT as u64 {
        return Err("首版暂时支持 16 MB 以内的文件，请选择较小的文件。".into());
    }
    let mut bytes = Vec::new();
    File::open(path)
        .map_err(io_error)?
        .take(CONTENT_LIMIT as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(io_error)?;
    if bytes.len() > CONTENT_LIMIT {
        return Err("读取期间文件变大，已停止打开。".into());
    }
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_lowercase();
    let mime = match extension.as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "webp" => Some("image/webp"),
        "gif" => Some("image/gif"),
        _ => None,
    };
    let mut source = text_source(
        path.file_name()
            .and_then(|s| s.to_str())
            .ok_or("文件名无法显示。")?,
        String::new(),
    )?;
    source.path = Some(path_string(path)?);
    source.bytes = bytes.len();
    source.hash = Some(hash(&bytes));
    source.metadata = Some(crate::file_metadata::from_metadata(&info));
    if let Some(mime) = mime {
        source.kind = "image".into();
        source.image_url = Some(format!("data:{mime};base64,{}", STANDARD.encode(&bytes)));
    } else {
        (source.content, source.bom, source.line_ending) = decode_text(&bytes)?;
    }
    Ok(source)
}

pub fn check_cancelled(cancelled: &AtomicBool) -> Result<(), String> {
    if cancelled.load(Ordering::Relaxed) {
        Err("操作已取消。".into())
    } else {
        Ok(())
    }
}

pub fn file_hash(path: &Path, cancelled: &AtomicBool) -> Result<String, String> {
    let mut file = File::open(path).map_err(io_error)?;
    let mut digest = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    loop {
        check_cancelled(cancelled)?;
        let length = file.read(&mut buffer).map_err(io_error)?;
        if length == 0 {
            break;
        }
        digest.update(&buffer[..length]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

pub fn current_hash(path: &Path) -> Result<Option<String>, String> {
    match fs::symlink_metadata(path) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(io_error(error)),
        Ok(info) if !info.is_file() || info.file_type().is_symlink() => {
            Err("目标不是可写的普通文件，请另存到其他位置。".into())
        }
        Ok(_) => file_hash(path, &AtomicBool::new(false)).map(Some),
    }
}

pub fn save_atomic(path: &Path, bytes: &[u8], expected: Option<&str>) -> Result<(), String> {
    let permissions = match fs::symlink_metadata(path) {
        Ok(info) => {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if info.permissions().mode() & 0o222 == 0 {
                    return Err("目标不是可写的普通文件，请另存到其他位置。".into());
                }
            }
            if !info.is_file() || info.file_type().is_symlink() || info.permissions().readonly() {
                return Err("目标不是可写的普通文件，请另存到其他位置。".into());
            }
            Some(info.permissions())
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(io_error(error)),
    };
    if current_hash(path)?.as_deref() != expected {
        return Err("目标文件已经被其他程序修改。请重新查看文件后再保存。".into());
    }
    let parent = path.parent().ok_or("请选择有效的保存位置。")?;
    let mut temporary = tempfile::Builder::new()
        .prefix(".diffolio-")
        .suffix(".tmp")
        .tempfile_in(parent)
        .map_err(io_error)?;
    if let Some(permissions) = permissions {
        temporary
            .as_file()
            .set_permissions(permissions)
            .map_err(io_error)?;
    }
    temporary.write_all(bytes).map_err(io_error)?;
    temporary.as_file().sync_all().map_err(io_error)?;
    if current_hash(path)?.as_deref() != expected {
        return Err("保存期间目标文件发生变化，已保留磁盘上的版本。请重试另存为。".into());
    }
    temporary
        .persist(path)
        .map_err(|error| io_error(error.error))?;
    File::open(parent)
        .and_then(|file| file.sync_all())
        .map_err(io_error)?;
    Ok(())
}
