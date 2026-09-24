#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            // TODO (roadmap): when launched via file association / argv,
            // read the .md path and emit "mdyar://open" to the frontend.
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MDyar");
}
