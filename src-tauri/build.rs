fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&["drain_open_paths"]),
        ),
    )
    .expect("failed to run tauri-build");
}
