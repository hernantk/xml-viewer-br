/// Native WebView2 PrintToPdf command.
///
/// Uses `ICoreWebView2_7::PrintToPdf` on Windows to produce a vector PDF
/// that honours the existing `@media print` CSS (page breaks, hidden UI, etc.).
use tauri::Manager;

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

/// Native print dialog for a generated PDF file.
///
/// Creates a hidden WebView2 window that loads the PDF file,
/// waits for NavigationCompleted, then calls
/// `ICoreWebView2_16::ShowPrintUI` to display the system
/// print dialog with all available printers.
#[tauri::command]
pub async fn print_pdf_file(
    app_handle: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        win::execute_print_pdf_file(app_handle, path).await
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app_handle, path);
        Err("Impressão de PDF disponível apenas no Windows".into())
    }
}

#[tauri::command]
pub async fn create_pdf_render_window(
    app_handle: tauri::AppHandle,
    label: String,
    url: String,
) -> Result<(), String> {
    let _ = app_handle.get_webview_window(&label).map(|window| window.close());

    tauri::WebviewWindowBuilder::new(
        &app_handle,
        &label,
        tauri::WebviewUrl::App(url.into()),
    )
    .title("Gerando PDF - XML Viewer BR")
    .inner_size(900.0, 1200.0)
    .resizable(false)
    .decorations(false)
    .visible(false)
    .build()
    .map_err(|e| format!("Erro ao criar janela de renderizacao de PDF: {e}"))?;

    Ok(())
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
        ICoreWebView2, ICoreWebView2PrintSettings,
        ICoreWebView2PrintToPdfCompletedHandler_Impl,
        ICoreWebView2ExecuteScriptCompletedHandler,
        ICoreWebView2_2, ICoreWebView2_4, ICoreWebView2_7,
        ICoreWebView2NavigationCompletedEventHandler,
        ICoreWebView2NavigationCompletedEventHandler_Impl,
        COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT,
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

    // ------------------------------------------------------------------
    // Print PDF file — open native system print dialog for a generated PDF
    // ------------------------------------------------------------------

    /// Open the native Windows system print dialog for a PDF file.
    ///
    /// Creates a temporary visible WebView window, loads the PDF,
    /// waits for it to finish loading, then waits a moment for the
    /// PDF content to render, and finally calls
    /// `ICoreWebView2_16::ShowPrintUI` to display the system print dialog.
    pub async fn execute_print_pdf_file(
        app_handle: tauri::AppHandle,
        path: String,
    ) -> Result<(), String> {
        use std::path::Path;
        use std::time::Duration;
        let pdf_path = Path::new(&path);
        if !pdf_path.exists() {
            return Err(format!("Arquivo PDF não encontrado: {}", path));
        }

        let label = format!("pdf-print-{}", std::process::id());
        let pdf_url = url::Url::from_file_path(&pdf_path)
            .map_err(|_| format!("Caminho de arquivo inválido: {}", path))?;

        let window = tauri::WebviewWindowBuilder::new(
            &app_handle,
            &label,
            tauri::WebviewUrl::External(pdf_url),
        )
        .title("Impressão - XML Viewer BR")
        .inner_size(800.0, 600.0)
        .resizable(true)
        .decorations(true)
        .visible(true)
        .build()
        .map_err(|e| format!("Erro ao criar janela de impressão: {e}"))?;

        let (tx, rx) = mpsc::channel::<Result<(), String>>();

        // Register NavigationCompleted handler (just signals the channel)
        let tx_handler = tx.clone();
        window
            .with_webview(move |webview| {
                let result = (|| -> Result<(), String> {
                    unsafe {
                        let core = webview
                            .controller()
                            .CoreWebView2()
                            .map_err(|e| format!("CoreWebView2: {e}"))?;

                        let core4: ICoreWebView2_4 = core
                            .cast()
                            .map_err(|e| format!("ICoreWebView2_4: {e}"))?;

                        let handler = build_nav_completed_handler(tx_handler);
                        let mut token: i64 = 0;
                        core4
                            .add_NavigationCompleted(&handler, &mut token)
                            .map_err(|e| format!("add_NavigationCompleted: {e}"))?;
                    }
                    Ok(())
                })();
                if let Err(e) = result {
                    let _ = tx.send(Err(e));
                }
            })
            .map_err(|e| format!("Erro ao acessar WebView: {e}"))?;

        // Wait for PDF navigation to complete (with timeout)
        rx.recv_timeout(Duration::from_secs(15))
            .map_err(|_| "Timeout ao carregar PDF para impressão".to_string())?
            .map_err(|e| e)?;

        // Inject script to print after PDF finishes rendering in the browser
        window
            .with_webview(move |webview| {
                let result = (|| -> Result<(), String> {
                    unsafe {
                        let core = webview
                            .controller()
                            .CoreWebView2()
                            .map_err(|e| format!("CoreWebView2: {e}"))?;
                        let script = to_wide("setTimeout(function(){window.print()},800)");
                        core
                            .ExecuteScript(
                                PCWSTR(script.as_ptr()),
                                Option::<&ICoreWebView2ExecuteScriptCompletedHandler>::None,
                            )
                            .map_err(|e| format!("ExecuteScript: {e}"))?;
                    }
                    Ok(())
                })();
                if let Err(e) = result {
                    eprintln!("Erro ao injetar script de impressão: {e}");
                }
            })
            .map_err(|e| format!("Erro ao acessar WebView: {e}"))?;

        // Schedule window close after 2 minutes to avoid dangling windows.
        let window_clone = window.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(120));
            let _ = window_clone.close();
        });
        Ok(())
    }

    /// Build a COM `ICoreWebView2NavigationCompletedEventHandler` that
    /// forwards the navigation result through an `mpsc::Sender`.
    fn build_nav_completed_handler(
        tx: mpsc::Sender<Result<(), String>>,
    ) -> ICoreWebView2NavigationCompletedEventHandler {
        let raw: ICoreWebView2NavigationCompletedEventHandler =
            PrintNavigationCompletedHandler {
                tx: std::sync::Mutex::new(Some(tx)),
            }
            .into();
        raw
    }

    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2NavigationCompletedEventArgs;

    #[windows_core::implement(ICoreWebView2NavigationCompletedEventHandler)]
    struct PrintNavigationCompletedHandler {
        tx: std::sync::Mutex<Option<mpsc::Sender<Result<(), String>>>>,
    }

    impl ICoreWebView2NavigationCompletedEventHandler_Impl
        for PrintNavigationCompletedHandler_Impl
    {
        fn Invoke(
            &self,
            _sender: windows_core::Ref<'_, ICoreWebView2>,
            args: windows_core::Ref<'_, ICoreWebView2NavigationCompletedEventArgs>,
        ) -> windows_core::Result<()> {
            if let Some(tx) = self.tx.lock().unwrap().take() {
                let result = (|| -> Result<(), String> {
                    if let Some(inner) = &*args {
                        let mut is_successful: BOOL = BOOL::default();
                        unsafe {
                            inner
                                .IsSuccess(&mut is_successful)
                                .map_err(|e| format!("IsSuccess: {e}"))?;
                        }
                        if !is_successful.as_bool() {
                            return Err("Falha ao carregar PDF".to_string());
                        }
                    }
                    Ok(())
                })();
                let _ = tx.send(result);
            }
            Ok(())
        }
    }
}
