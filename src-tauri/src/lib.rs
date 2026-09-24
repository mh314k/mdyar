#[cfg(windows)]
mod winsock_conflict {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    /// Proxifier Portable injects PrxDrvPE*.dll into WebView2 and trips CET
    /// (WS2_32.dll / 0xc0000409). Installed Proxifier (WFP) does not do this.
    pub fn conflicting_hooks_running() -> bool {
        let Ok(output) = Command::new("tasklist")
            .args(["/FO", "CSV", "/NH"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        else {
            return false;
        };
        let listing = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
        listing.contains("proxifier.exe") || listing.contains("helper64.exe")
    }

    pub fn warn_user() {
        use std::os::windows::ffi::OsStrExt;

        fn wide(s: &str) -> Vec<u16> {
            std::ffi::OsStr::new(s)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect()
        }

        let title = wide("MDyar");
        let body = wide(
            "Proxifier Portable is running and breaks the desktop WebView \
(Windows blocks its WS2_32.dll hooks).\n\n\
Proxifier Portable در حال اجراست و WebView دسکتاپ را خراب می‌کند.\n\n\
Fix / راه حل:\n\
• Quit Proxifier Portable, then reopen MDyar\n\
  پروکسیفایر Portable را ببندید و MDyar را دوباره باز کنید\n\
• Or use the installed Proxifier edition (WFP), not Portable\n\
  یا نسخه نصب‌شده (غیر Portable) را استفاده کنید\n\n\
Press OK to try anyway / برای تلاش مجدد OK را بزنید.\n\
Press Cancel to exit / برای خروج Cancel را بزنید.",
        );

        #[link(name = "user32")]
        extern "system" {
            fn MessageBoxW(
                hwnd: *mut core::ffi::c_void,
                text: *const u16,
                caption: *const u16,
                flags: u32,
            ) -> i32;
        }

        const MB_OKCANCEL: u32 = 0x0000_0001;
        const MB_ICONWARNING: u32 = 0x0000_0030;
        const IDCANCEL: i32 = 2;

        // SAFETY: null owner HWND; UTF-16 buffers are NUL-terminated.
        let choice = unsafe {
            MessageBoxW(
                std::ptr::null_mut(),
                body.as_ptr(),
                title.as_ptr(),
                MB_OKCANCEL | MB_ICONWARNING,
            )
        };
        if choice == IDCANCEL {
            std::process::exit(0);
        }
    }
}

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{Emitter, Manager};

const MARKDOWN_EXTS: &[&str] = &["md", "markdown", "mdown"];

/// Paths handed to the frontend. Cold start queues them before the webview
/// listens; a later double-click emits `mdyar-open-file` so the UI drains again.
struct OpenQueue(Mutex<Vec<String>>);

#[tauri::command]
fn drain_open_paths(state: tauri::State<'_, OpenQueue>) -> Vec<String> {
    let mut guard = state.0.lock().unwrap_or_else(|err| err.into_inner());
    std::mem::take(&mut *guard)
}

fn focus_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn deliver_args(app: &tauri::AppHandle, args: &[String], cwd: Option<&str>) {
    let paths = markdown_paths(args, cwd);
    if paths.is_empty() {
        return;
    }
    let queue = app.state::<OpenQueue>();
    {
        let mut guard = queue.0.lock().unwrap_or_else(|err| err.into_inner());
        for path in paths {
            if !guard.iter().any(|existing| existing == &path) {
                guard.push(path);
            }
        }
    }
    let _ = app.emit("mdyar-open-file", ());
}

fn markdown_paths(args: &[String], cwd: Option<&str>) -> Vec<String> {
    let mut out = Vec::new();
    for arg in args {
        if arg.starts_with('-') {
            continue;
        }
        let Some(path) = resolve_file_arg(arg, cwd) else {
            continue;
        };
        if !path.is_file() {
            continue;
        }
        let Some(ext) = path.extension().and_then(|ext| ext.to_str()) else {
            continue;
        };
        if !MARKDOWN_EXTS
            .iter()
            .any(|candidate| ext.eq_ignore_ascii_case(candidate))
        {
            continue;
        }
        let normalized = normalize_path(&path);
        if !out.iter().any(|existing| existing == &normalized) {
            out.push(normalized);
        }
    }
    out
}

fn resolve_file_arg(arg: &str, cwd: Option<&str>) -> Option<PathBuf> {
    let arg = arg.trim().trim_matches('"');
    if arg.is_empty() {
        return None;
    }
    let path = file_url_to_path(arg).unwrap_or_else(|| PathBuf::from(arg));
    if path.is_absolute() {
        return Some(path);
    }
    Some(Path::new(cwd?).join(path))
}

fn file_url_to_path(arg: &str) -> Option<PathBuf> {
    let rest = arg.strip_prefix("file://")?;
    let rest = rest.strip_prefix("localhost").unwrap_or(rest);
    let decoded = percent_decode(rest);
    #[cfg(windows)]
    {
        let trimmed = decoded.trim_start_matches('/');
        if trimmed.len() >= 2 && trimmed.as_bytes().get(1) == Some(&b':') {
            return Some(PathBuf::from(trimmed.replace('/', "\\")));
        }
        return Some(PathBuf::from(decoded));
    }
    #[cfg(not(windows))]
    {
        Some(PathBuf::from(decoded))
    }
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3]).unwrap_or("");
            if let Ok(byte) = u8::from_str_radix(hex, 16) {
                out.push(byte);
                index += 3;
                continue;
            }
        }
        out.push(bytes[index]);
        index += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn normalize_path(path: &Path) -> String {
    let canon = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let text = canon.to_string_lossy();
    #[cfg(windows)]
    {
        let stripped = text.strip_prefix(r"\\?\").unwrap_or(&text);
        if let Some(unc) = stripped.strip_prefix(r"UNC\") {
            return format!(r"\\{unc}");
        }
        return stripped.to_string();
    }
    #[cfg(not(windows))]
    {
        text.into_owned()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    if winsock_conflict::conflicting_hooks_running() {
        winsock_conflict::warn_user();
    }

    let builder = tauri::Builder::default().manage(OpenQueue(Mutex::new(Vec::new())));

    // Must be registered first: a second double-click forwards its argv here
    // and exits, instead of opening another window.
    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
        focus_main(app);
        deliver_args(app, &args, Some(cwd.as_str()));
    }));

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![drain_open_paths])
        .setup(|app| {
            let cwd = std::env::current_dir()
                .ok()
                .and_then(|path| path.into_os_string().into_string().ok());
            let args: Vec<String> = std::env::args().collect();
            deliver_args(app.handle(), &args, cwd.as_deref());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running MDyar")
        .run(|app, event| {
            // macOS / mobile deliver opened files here. Windows and Linux use argv.
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
            if let tauri::RunEvent::Opened { urls } = event {
                let args: Vec<String> = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .map(|path| path.to_string_lossy().into_owned())
                    .collect();
                if !args.is_empty() {
                    focus_main(app);
                    deliver_args(app, &args, None);
                }
            }
            #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
            let _ = (app, event);
        });
}
