use crate::{
    commands::save_to, files::*, folders::compare_folders, model::Preferences, state::Backend,
};
use std::{fs, path::Path, sync::atomic::AtomicBool};

#[test]
fn empty_clipboard_and_non_text_contents_produce_empty_text() {
    assert_eq!(
        crate::commands::clipboard_source(Err(arboard::Error::ContentNotAvailable))
            .unwrap()
            .content,
        ""
    );
    assert_eq!(
        crate::commands::clipboard_source(Ok("中文\n".into()))
            .unwrap()
            .bytes,
        7
    );
    assert!(crate::commands::clipboard_source(Err(arboard::Error::ClipboardNotSupported)).is_err());
}

#[test]
fn path_normalization_and_early_cancellation_preserve_request_identity() {
    let path = crate::read::absolute("/tmp/diffolio/../input.txt").unwrap();
    assert_eq!(path, Path::new("/tmp/input.txt"));
    let root = tempfile::tempdir().unwrap();
    let backend = Backend::load(root.path().into()).unwrap();
    crate::read::cancel_task(&backend, "not-started-yet".into());
    assert!(backend
        .0
        .cancellations
        .lock()
        .unwrap()
        .contains(&"not-started-yet".into()));
    let flag = std::sync::Arc::new(AtomicBool::new(false));
    backend
        .0
        .tasks
        .lock()
        .unwrap()
        .insert("running".into(), flag.clone());
    crate::read::cancel_task(&backend, "running".into());
    assert!(flag.load(std::sync::atomic::Ordering::Relaxed));
}

#[test]
fn unicode_bom_and_all_newlines_round_trip() {
    let content = "中文 👨‍👩‍👧‍👦 é\n下一行\n";
    for ending in ["LF", "CRLF", "CR"] {
        let bytes = encode_text(content, true, ending).unwrap();
        let (decoded, bom, detected) = decode_text(&bytes).unwrap();
        assert_eq!(decoded, content);
        assert!(bom);
        assert_eq!(detected, ending);
        assert_eq!(encode_text(&decoded, bom, &detected).unwrap(), bytes);
    }
    assert_eq!(decode_text(b"").unwrap().0, "");
    assert!(decode_text(&[0, 1, 2]).unwrap_err().contains("二进制"));
    assert!(decode_text(&[0xff, 0xfe, 0x61])
        .unwrap_err()
        .contains("UTF-8"));
}

#[test]
fn reading_keeps_source_bytes_and_detects_images() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("source.txt");
    let bytes = "\u{feff}原始\r\n版本\r\n".as_bytes();
    fs::write(&path, bytes).unwrap();
    let source = read_source(&path).unwrap();
    assert_eq!(source.content, "原始\n版本\n");
    assert_eq!(source.line_ending, "CRLF");
    assert_eq!(fs::read(&path).unwrap(), bytes);
    let image = read_source(
        &Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../fixtures/reference/left/assets/preview.png"),
    )
    .unwrap();
    assert_eq!(image.kind, "image");
    assert!(image
        .image_url
        .unwrap()
        .starts_with("data:image/png;base64,"));
}

#[test]
fn large_inputs_and_invalid_formats_are_rejected() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("large.txt");
    fs::File::create(&path)
        .unwrap()
        .set_len(CONTENT_LIMIT as u64 + 1)
        .unwrap();
    assert!(read_source(&path).unwrap_err().contains("16 MB"));
    assert!(encode_text("content", false, "unknown").is_err());
    assert!(read_source(root.path()).unwrap_err().contains("普通文件"));
}

#[test]
fn atomic_save_handles_new_and_existing_files_without_temporary_residue() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("result.txt");
    save_atomic(&path, b"first", None).unwrap();
    save_atomic(&path, b"second", current_hash(&path).unwrap().as_deref()).unwrap();
    assert_eq!(fs::read(&path).unwrap(), b"second");
    assert_eq!(fs::read_dir(root.path()).unwrap().count(), 1);
}

#[test]
fn stale_and_newly_appearing_targets_remain_untouched() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("result.txt");
    fs::write(&path, b"before").unwrap();
    let expected = current_hash(&path).unwrap();
    fs::write(&path, b"external edit").unwrap();
    assert!(save_atomic(&path, b"mine", expected.as_deref())
        .unwrap_err()
        .contains("其他程序"));
    assert!(save_atomic(&path, b"mine", None)
        .unwrap_err()
        .contains("其他程序"));
    assert_eq!(fs::read(&path).unwrap(), b"external edit");
}

#[test]
#[cfg(unix)]
fn symlinks_and_read_only_targets_are_never_replaced() {
    use std::os::unix::fs::{symlink, PermissionsExt};
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("source.txt");
    fs::write(&path, b"original").unwrap();
    fs::set_permissions(&path, fs::Permissions::from_mode(0o444)).unwrap();
    assert!(save_atomic(&path, b"mine", Some(&hash(b"original"))).is_err());
    fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();
    let link = root.path().join("link.txt");
    symlink(&path, &link).unwrap();
    assert!(save_atomic(&link, b"mine", Some(&hash(b"original"))).is_err());
    assert_eq!(fs::read(&path).unwrap(), b"original");
}

#[test]
fn repeated_saves_track_the_apps_last_written_hash() {
    let root = tempfile::tempdir().unwrap();
    let backend = Backend::load(root.path().join("state")).unwrap();
    let path = root.path().join("result.txt");
    fs::write(&path, b"original").unwrap();
    let source = read_source(&path).unwrap();
    backend
        .0
        .sources
        .lock()
        .unwrap()
        .insert(source.id.clone(), source.clone());
    save_to(&backend, "one", source.clone(), &path).unwrap();
    save_to(&backend, "two", source.clone(), &path).unwrap();
    fs::write(&path, "external").unwrap();
    assert!(save_to(&backend, "three", source, &path).is_err());
    assert_eq!(fs::read_to_string(path).unwrap(), "external");
}

#[test]
fn reference_folders_compare_contents_and_propagate_directory_status() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../fixtures/reference");
    let result = compare_folders(
        &root.join("left"),
        &root.join("right"),
        &AtomicBool::new(false),
        &|_| {},
    )
    .unwrap();
    for (path, status) in [
        ("README.txt", "equal"),
        ("preferences.ts", "modified"),
        ("assets/preview.png", "modified"),
        ("assets", "modified"),
        ("legacy.txt", "left"),
        ("notes.txt", "right"),
    ] {
        assert_eq!(
            result
                .entries
                .iter()
                .find(|entry| entry.path == path)
                .unwrap()
                .status,
            status
        );
    }
}

#[test]
#[cfg(unix)]
fn cycles_are_not_followed_and_equal_sized_changes_are_detected() {
    let root = tempfile::tempdir().unwrap();
    let left = root.path().join("left");
    let right = root.path().join("right");
    fs::create_dir_all(&left).unwrap();
    fs::create_dir_all(&right).unwrap();
    fs::write(left.join("same.txt"), "abc").unwrap();
    fs::write(right.join("same.txt"), "xyz").unwrap();
    std::os::unix::fs::symlink(".", left.join("cycle")).unwrap();
    std::os::unix::fs::symlink(".", right.join("cycle")).unwrap();
    let result = compare_folders(&left, &right, &AtomicBool::new(false), &|_| {}).unwrap();
    assert_eq!(result.entries.len(), 2);
    assert_eq!(
        result
            .entries
            .iter()
            .find(|entry| entry.path == "same.txt")
            .unwrap()
            .status,
        "modified"
    );
    let cycle = result
        .entries
        .iter()
        .find(|entry| entry.path == "cycle")
        .unwrap();
    assert_eq!(cycle.status, "equal");
    assert_eq!(cycle.kind, "symlink");
}

#[test]
fn cancellation_is_an_error_and_not_partial_success() {
    let root = tempfile::tempdir().unwrap();
    assert!(
        compare_folders(root.path(), root.path(), &AtomicBool::new(true), &|_| {})
            .unwrap_err()
            .contains("取消")
    );
}

#[test]
fn preferences_validate_and_persist_in_the_separate_data_directory() {
    let root = tempfile::tempdir().unwrap();
    let backend = Backend::load(root.path().into()).unwrap();
    let value = Preferences {
        appearance: "dark".into(),
        font_size: 14,
        wrap: true,
        collapse: false,
    };
    value.validate().unwrap();
    backend
        .modify_store(|store| store.preferences = value)
        .unwrap();
    let restored = Backend::load(root.path().into()).unwrap();
    assert_eq!(
        restored.0.store.lock().unwrap().preferences.appearance,
        "dark"
    );
    assert_eq!(restored.0.store.lock().unwrap().preferences.font_size, 14);
    let bad = Preferences {
        appearance: "unknown".into(),
        ..Preferences::default()
    };
    assert!(bad.validate().is_err());
    assert!(backend.blocked_reason().is_none());
    backend
        .0
        .dirty
        .store(true, std::sync::atomic::Ordering::SeqCst);
    assert!(backend.blocked_reason().unwrap().contains("保存"));
}
