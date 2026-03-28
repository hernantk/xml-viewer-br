/// Native WebView2 PrintToPdf command.
///
/// Uses `ICoreWebView2_7::PrintToPdf` on Windows to produce a vector PDF
/// that honours the existing `@media print` CSS (page breaks, hidden UI, etc.).

#[tauri::command]
pub async fn print_to_pdf(
    window: tauri::WebviewWindow,
    output_path: String,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        win::execute_print_to_pdf(window, output_path).await
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (window, output_path);
        Err("PrintToPdf nativo disponível apenas no Windows. Use o fallback html2canvas.".into())
    }
}

// ---------------------------------------------------------------------------
// Windows implementation
// ---------------------------------------------------------------------------
#[cfg(target_os = "windows")]
mod win {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::sync::mpsc;

    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2PrintSettings, ICoreWebView2PrintToPdfCompletedHandler_Impl,
        ICoreWebView2_2, ICoreWebView2_7, COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT,
    };
    use windows_core::{Interface, BOOL, HRESULT, PCWSTR};

    /// Encode a Rust string as a null-terminated wide (UTF-16) string.
    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(Some(0)).collect()
    }

    /// Entry-point called from the Tauri command.
    pub async fn execute_print_to_pdf(
        window: tauri::WebviewWindow,
        output_path: String,
    ) -> Result<(), String> {
        let (tx, rx) = mpsc::channel::<Result<(), String>>();
        let path = output_path;

        window
            .with_webview(move |webview| {
                // Runs on the main (UI) thread.
                let result = unsafe { setup_and_print(&webview, &path, tx.clone()) };
                if let Err(e) = result {
                    // PrintToPdf never started — report the error directly.
                    let _ = tx.send(Err(e));
                }
            })
            .map_err(|e| format!("Erro ao acessar WebView: {e}"))?;

        // Block the *background* thread (not the UI thread) until the
        // PrintToPdf completion callback fires.
        rx.recv()
            .map_err(|_| "Canal de comunicação fechado antes de receber resultado do PrintToPdf".to_string())?
    }

    /// Set up print settings and kick off `PrintToPdf`.
    ///
    /// # Safety
    /// Calls raw WebView2 COM methods.
    unsafe fn setup_and_print(
        webview: &tauri::webview::PlatformWebview,
        output_path: &str,
        tx: mpsc::Sender<Result<(), String>>,
    ) -> Result<(), String> {
        // 1. Obtain ICoreWebView2 from the controller.
        let controller = webview.controller();
        let core = controller
            .CoreWebView2()
            .map_err(|e| format!("CoreWebView2: {e}"))?;

        // 2. Cast to ICoreWebView2_7 (required for PrintToPdf).
        let core7: ICoreWebView2_7 = core
            .cast()
            .map_err(|e| format!("ICoreWebView2_7 não disponível: {e}"))?;

        // 3. Get the environment → create print settings.
        let core2: ICoreWebView2_2 = core
            .cast()
            .map_err(|e| format!("ICoreWebView2_2: {e}"))?;

        let settings = create_a4_print_settings(&core2)?;

        // 4. Build a COM completion handler that signals our channel.
        let handler = build_completion_handler(tx);

        // 5. Fire PrintToPdf (asynchronous — the handler fires later).
        let wide_path = to_wide(output_path);
        core7
            .PrintToPdf(PCWSTR(wide_path.as_ptr()), &settings, &handler)
            .map_err(|e| format!("PrintToPdf: {e}"))?;

        Ok(())
    }

    /// Create `ICoreWebView2PrintSettings` configured for A4 with zero margins.
    unsafe fn create_a4_print_settings(
        core2: &ICoreWebView2_2,
    ) -> Result<ICoreWebView2PrintSettings, String> {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Environment6;

        let env = core2
            .Environment()
            .map_err(|e| format!("Environment: {e}"))?;

        let env6: ICoreWebView2Environment6 = env
            .cast()
            .map_err(|e| format!("ICoreWebView2Environment6: {e}"))?;

        let settings = env6
            .CreatePrintSettings()
            .map_err(|e| format!("CreatePrintSettings: {e}"))?;

        // A4 = 210 mm × 297 mm = 8.27 × 11.69 inches
        let _ = settings.SetOrientation(COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT);
        let _ = settings.SetPageWidth(8.27);
        let _ = settings.SetPageHeight(11.69);
        let _ = settings.SetMarginTop(0.0);
        let _ = settings.SetMarginBottom(0.0);
        let _ = settings.SetMarginLeft(0.0);
        let _ = settings.SetMarginRight(0.0);
        let _ = settings.SetScaleFactor(1.0);
        let _ = settings.SetShouldPrintBackgrounds(true);
        let _ = settings.SetShouldPrintHeaderAndFooter(false);

        Ok(settings)
    }

    // ------------------------------------------------------------------
    // COM callback handler for PrintToPdfCompleted
    // ------------------------------------------------------------------
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2PrintToPdfCompletedHandler;

    /// Build a COM `ICoreWebView2PrintToPdfCompletedHandler` that forwards
    /// the result through an `mpsc::Sender`.
    fn build_completion_handler(
        tx: mpsc::Sender<Result<(), String>>,
    ) -> ICoreWebView2PrintToPdfCompletedHandler {
        let raw: ICoreWebView2PrintToPdfCompletedHandler =
            PdfCompletedHandler { tx: std::sync::Mutex::new(Some(tx)) }.into();
        raw
    }

    #[windows_core::implement(ICoreWebView2PrintToPdfCompletedHandler)]
    struct PdfCompletedHandler {
        tx: std::sync::Mutex<Option<mpsc::Sender<Result<(), String>>>>,
    }

    impl ICoreWebView2PrintToPdfCompletedHandler_Impl for PdfCompletedHandler_Impl {
        fn Invoke(
            &self,
            errorcode: HRESULT,
            issuccessful: BOOL,
        ) -> windows_core::Result<()> {
            if let Some(tx) = self.tx.lock().unwrap().take() {
                if errorcode.is_ok() && issuccessful.as_bool() {
                    let _ = tx.send(Ok(()));
                } else {
                    let _ = tx.send(Err(format!(
                        "PrintToPdf falhou (HRESULT: {errorcode:?}, success: {})",
                        issuccessful.as_bool()
                    )));
                }
            }
            Ok(())
        }
    }
}
