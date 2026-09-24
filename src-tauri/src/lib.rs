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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    if winsock_conflict::conflicting_hooks_running() {
        winsock_conflict::warn_user();
    }

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
