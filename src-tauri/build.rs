fn main() {
    println!("cargo:rerun-if-env-changed=DIFFOLIO_UPDATER_ENDPOINT");
    println!("cargo:rerun-if-env-changed=DIFFOLIO_UPDATER_PUBLIC_KEY");
    tauri_build::build();
}
