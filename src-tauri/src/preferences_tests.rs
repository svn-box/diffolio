use crate::{model::PreferencePatch, state::Backend};

#[test]
fn separate_windows_patch_only_the_fields_they_changed() {
    let root = tempfile::tempdir().unwrap();
    let backend = Backend::load(root.path().into()).unwrap();
    let editor = backend.clone();
    let settings = backend.clone();
    let first = std::thread::spawn(move || {
        editor
            .patch_preferences(PreferencePatch {
                wrap: Some(true),
                collapse: Some(true),
                ..Default::default()
            })
            .unwrap()
    });
    let second = std::thread::spawn(move || {
        settings
            .patch_preferences(PreferencePatch {
                appearance: Some("dark".into()),
                font_size: Some(14),
                ..Default::default()
            })
            .unwrap()
    });
    first.join().unwrap();
    second.join().unwrap();
    let restored = Backend::load(root.path().into()).unwrap();
    let store = restored.0.store.lock().unwrap();
    assert!(store.preferences.wrap && store.preferences.collapse);
    assert_eq!(store.preferences.appearance, "dark");
    assert_eq!(store.preferences.font_size, 14);
}

#[test]
fn false_patches_and_invalid_settings_preserve_persisted_data() {
    let root = tempfile::tempdir().unwrap();
    let backend = Backend::load(root.path().into()).unwrap();
    backend
        .patch_preferences(PreferencePatch {
            wrap: Some(true),
            ..Default::default()
        })
        .unwrap();
    backend
        .patch_preferences(PreferencePatch {
            wrap: Some(false),
            ..Default::default()
        })
        .unwrap();
    let before = std::fs::read(root.path().join("preferences.json")).unwrap();
    assert!(!backend.0.store.lock().unwrap().preferences.wrap);
    assert!(backend
        .patch_preferences(PreferencePatch {
            font_size: Some(1),
            ..Default::default()
        })
        .is_err());
    assert_eq!(
        std::fs::read(root.path().join("preferences.json")).unwrap(),
        before
    );
    assert_eq!(backend.0.store.lock().unwrap().preferences.font_size, 12);
}
