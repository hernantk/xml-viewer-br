use std::path::Path;

#[cfg(target_os = "windows")]
fn shell_execute(verb: &str, path: &str, show: i32) -> isize {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    let wide_verb: Vec<u16> = OsStr::new(verb).encode_wide().chain(Some(0)).collect();
    let wide_path: Vec<u16> = OsStr::new(path).encode_wide().chain(Some(0)).collect();

    unsafe {
        windows_sys::Win32::UI::Shell::ShellExecuteW(
            std::ptr::null_mut(),
            wide_verb.as_ptr(),
            wide_path.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            show,
        ) as isize
    }
}

#[tauri::command]
pub async fn print_file(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("Arquivo não encontrado: {}", path));
    }

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{SW_HIDE, SW_SHOWNORMAL};

        // Try "print" verb first (works with Adobe Reader, Foxit, SumatraPDF)
        let result = shell_execute("print", &path, SW_HIDE);
        if result > 32 {
            return Ok(());
        }

        // Fallback: open the PDF in the default viewer so user can Ctrl+P
        let result = shell_execute("open", &path, SW_SHOWNORMAL);
        if result > 32 {
            return Ok(());
        }

        Err(format!("Não foi possível abrir o arquivo para impressão. Código: {}", result))
    }

    #[cfg(not(target_os = "windows"))]
    {
        open::that(&path).map_err(|e| format!("Erro ao abrir arquivo: {}", e))
    }
}
