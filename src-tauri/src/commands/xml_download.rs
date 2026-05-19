use serde::Serialize;
use std::process::Command;
use tauri::{Emitter, Manager};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const NFE_DOWNLOAD_URL: &str = "https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserCertificate {
    pub thumbprint: String,
    pub subject: String,
    pub issuer: String,
    pub not_before: String,
    pub not_after: String,
    pub has_private_key: bool,
}

#[derive(Clone, Serialize)]
struct NfeXmlDownloadedPayload {
    path: String,
}

#[tauri::command]
pub async fn list_user_certificates() -> Result<Vec<UserCertificate>, String> {
    #[cfg(target_os = "windows")]
    {
        list_windows_user_certificates()
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Listagem de certificados disponível apenas no Windows".into())
    }
}

/// Remove leftover temp WebView2 environment directories older than 1 hour.
fn cleanup_old_nfe_environments() {
    let base_dir = std::env::temp_dir().join("xml-viewer-br");
    let Ok(entries) = std::fs::read_dir(&base_dir) else { return };
    let max_age = std::time::Duration::from_secs(3600);
    let now = std::time::SystemTime::now();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let is_nfe_env = path
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("nfe-env-"));
        if !is_nfe_env {
            continue;
        }
        let modified = match std::fs::metadata(&path).and_then(|m| m.modified()) {
            Ok(t) => t,
            Err(_) => continue,
        };
        if let Ok(age) = now.duration_since(modified) {
            if age > max_age {
                eprintln!("[NF-e] Removendo diretório temporário antigo: {path:?}");
                let _ = std::fs::remove_dir_all(&path);
            }
        }
    }
}

#[tauri::command]
pub async fn open_nfe_download_window(
    app_handle: tauri::AppHandle,
    access_key: String,
    certificate_thumbprint: String,
) -> Result<(), String> {
    let normalized_key: String = access_key.chars().filter(|c| c.is_ascii_digit()).collect();
    if normalized_key.len() != 44 {
        return Err("Informe uma chave de acesso de NF-e com 44 dígitos".into());
    }

    if certificate_thumbprint.trim().is_empty() {
        return Err("Selecione um certificado digital".into());
    }

    let label = "nfe-download";
    let _ = app_handle
        .get_webview_window(label)
        .map(|window| window.close());

    // Clean up old temp WebView2 environments from previous sessions
    cleanup_old_nfe_environments();

    // Each download window gets its own WebView2 environment (unique temp data_directory)
    // so the client certificate cache is never shared between downloads.
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("Erro ao gerar timestamp: {e}"))?
        .as_nanos();
    let env_dir = std::env::temp_dir()
        .join("xml-viewer-br")
        .join(format!("nfe-env-{timestamp}"));
    std::fs::create_dir_all(&env_dir)
        .map_err(|e| format!("Erro ao criar diretório temporário: {e}"))?;

    let window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        label,
        tauri::WebviewUrl::External(
            NFE_DOWNLOAD_URL
                .parse()
                .map_err(|e| format!("URL de consulta NF-e inválida: {e}"))?,
        ),
    )
    .data_directory(env_dir.clone())
    .title("Baixar XML NF-e - XML Viewer BR")
    .inner_size(1120.0, 820.0)
    .min_inner_size(900.0, 650.0)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| format!("Erro ao abrir janela de consulta NF-e: {e}"))?;

    install_nfe_download_handler(&window, app_handle.clone(), &normalized_key, &env_dir)?;
    install_client_certificate_selector(&window, certificate_thumbprint)?;
    install_nfe_key_autofill(&window, normalized_key)?;

    Ok(())
}

#[tauri::command]
pub fn close_nfe_download_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("nfe-download") {
        window
            .close()
            .map_err(|e| format!("Erro ao fechar janela de consulta NF-e: {e}"))?;
    }

    cleanup_old_nfe_environments();
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn install_nfe_download_handler(
    _window: &tauri::WebviewWindow,
    _app_handle: tauri::AppHandle,
    _access_key: &str,
    _env_dir: &std::path::Path,
) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
fn install_nfe_download_handler(
    window: &tauri::WebviewWindow,
    app_handle: tauri::AppHandle,
    access_key: &str,
    env_dir: &std::path::Path,
) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::path::PathBuf;

    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2,
        ICoreWebView2DownloadStartingEventArgs,
        ICoreWebView2DownloadStartingEventHandler,
        ICoreWebView2DownloadStartingEventHandler_Impl,
        ICoreWebView2_4,
    };
    use windows_core::{Interface, PCWSTR};

    fn to_wide(value: &OsStr) -> Vec<u16> {
        value.encode_wide().chain(Some(0)).collect()
    }

    #[windows_core::implement(ICoreWebView2DownloadStartingEventHandler)]
    struct NfeDownloadStartingHandler {
        app_handle: tauri::AppHandle,
        output_path: PathBuf,
        env_dir: PathBuf,
    }

    impl ICoreWebView2DownloadStartingEventHandler_Impl for NfeDownloadStartingHandler_Impl {
        fn Invoke(
            &self,
            _sender: windows_core::Ref<'_, ICoreWebView2>,
            args: windows_core::Ref<'_, ICoreWebView2DownloadStartingEventArgs>,
        ) -> windows_core::Result<()> {
            if let Some(args) = &*args {
                let result = (|| -> Result<(), String> {
                    // Get a deferral to prevent WebView2 from proceeding with
                    // the download before we configure it.
                    let deferral = unsafe {
                        args.GetDeferral()
                            .map_err(|e| format!("GetDeferral: {e}"))?
                    };

                    eprintln!("[NF-e Download] DownloadStarting disparado");

                    // Set the output path so the file goes to our controlled location
                    let wide_path = to_wide(self.output_path.as_os_str());
                    unsafe {
                        args.SetResultFilePath(PCWSTR(wide_path.as_ptr()))
                            .map_err(|e| format!("SetResultFilePath: {e}"))?;
                        args.SetHandled(true)
                            .map_err(|e| format!("SetHandled: {e}"))?;
                    }
                    eprintln!("[NF-e Download] Salvando em: {:?}", self.output_path);

                    // Complete the deferral to let the download proceed
                    unsafe {
                        deferral
                            .Complete()
                            .map_err(|e| format!("Deferral.Complete: {e}"))?;
                    }

                    // Spawn a file watcher thread since WebView2 StateChanged
                    // events are unreliable for detecting download completion.
                    let path = self.output_path.clone();
                    let app_handle = self.app_handle.clone();
                    let env_dir = self.env_dir.clone();
                    std::thread::spawn(move || {
                        watch_download_file(path, app_handle, env_dir);
                    });

                    Ok(())
                })();

                if let Err(e) = result {
                    eprintln!("[NF-e Download] Erro ao iniciar: {e}");
                }
            }
            Ok(())
        }
    }

    /// Poll the output file until it exists and is stable (download complete).
    fn watch_download_file(path: PathBuf, app_handle: tauri::AppHandle, env_dir: PathBuf) {
        use std::thread::sleep;
        use std::time::Duration;

        let poll_interval = Duration::from_millis(300);
        let max_attempts = 200; // 60 seconds max
        let mut last_size: u64 = 0;
        let mut stable_count: u32 = 0;

        for _ in 0..max_attempts {
            sleep(poll_interval);

            let size = match std::fs::metadata(&path) {
                Ok(meta) => meta.len(),
                Err(_) => {
                    last_size = 0;
                    stable_count = 0;
                    continue;
                }
            };

            if size == 0 {
                last_size = 0;
                stable_count = 0;
                continue;
            }

            if size == last_size {
                stable_count += 1;
            } else {
                stable_count = 0;
                last_size = size;
            }

            // File is stable for 2 consecutive checks (~600ms)
            if stable_count >= 2 {
                let path_str = path.to_string_lossy().to_string();
                eprintln!("[NF-e Download] Concluído (file watcher): {path_str}");
                let _ = app_handle.emit(
                    "app://nfe-xml-downloaded",
                    NfeXmlDownloadedPayload { path: path_str },
                );
                // Close the download browser window
                if let Some(window) = app_handle.get_webview_window("nfe-download") {
                    let _ = window.close();
                }
                // Clean up the temp WebView2 environment directory
                let _ = std::fs::remove_dir_all(&env_dir);
                return;
            }
        }

        eprintln!("[NF-e Download] Timeout esperando download: {:?}", path);
    }

    let env_dir = env_dir.to_path_buf();
    let output_dir = std::env::temp_dir().join("xml-viewer-br").join("nfe-downloads");
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Erro ao criar pasta temporária de downloads NF-e: {e}"))?;
    let output_path = output_dir.join(format!("nfe-{}.xml", access_key));
    let _ = std::fs::remove_file(&output_path);

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
                    let handler: ICoreWebView2DownloadStartingEventHandler =
                        NfeDownloadStartingHandler {
                            app_handle,
                            output_path,
                            env_dir,
                        }
                        .into();
                    let mut token = 0;
                    core4
                        .add_DownloadStarting(&handler, &mut token)
                        .map_err(|e| format!("add_DownloadStarting: {e}"))?;
                }
                Ok(())
            })();
            if let Err(e) = result {
                eprintln!("Erro ao configurar captura de download NF-e: {e}");
            }
        })
        .map_err(|e| format!("Erro ao acessar WebView: {e}"))?;

    Ok(())
}

fn normalize_thumbprint(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .flat_map(|c| c.to_uppercase())
        .collect()
}

#[cfg(not(target_os = "windows"))]
fn install_client_certificate_selector(
    _window: &tauri::WebviewWindow,
    _certificate_thumbprint: String,
) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
fn install_client_certificate_selector(
    window: &tauri::WebviewWindow,
    certificate_thumbprint: String,
) -> Result<(), String> {
    use base64::Engine;
    use sha1::{Digest, Sha1};
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2, ICoreWebView2ClientCertificate,
        ICoreWebView2ClientCertificateRequestedEventArgs,
        ICoreWebView2ClientCertificateRequestedEventHandler,
        ICoreWebView2ClientCertificateRequestedEventHandler_Impl,
        ICoreWebView2_5,
    };
    use windows_core::{Interface, PWSTR};

    fn pem_to_thumbprint(pem: &str) -> Option<String> {
        let body: String = pem
            .lines()
            .filter(|line| !line.starts_with("-----"))
            .flat_map(|line| line.chars().filter(|c| !c.is_whitespace()))
            .collect();
        let der = base64::engine::general_purpose::STANDARD.decode(body).ok()?;
        let digest = Sha1::digest(der);
        Some(digest.iter().map(|byte| format!("{byte:02X}")).collect())
    }

    unsafe fn webview_string(getter: impl FnOnce(*mut PWSTR) -> windows_core::Result<()>) -> Option<String> {
        let mut value = PWSTR::null();
        getter(&mut value).ok()?;
        if value.is_null() {
            return None;
        }
        value.to_string().ok()
    }

    unsafe fn webview_certificate_thumbprint(certificate: &ICoreWebView2ClientCertificate) -> Option<String> {
        let pem = webview_string(|value| certificate.ToPemEncoding(value))?;
        pem_to_thumbprint(&pem)
    }

    unsafe fn select_matching_certificate(
        args: &ICoreWebView2ClientCertificateRequestedEventArgs,
        selected_thumbprint: &str,
    ) -> Result<bool, String> {
        let certificates = args
            .MutuallyTrustedCertificates()
            .map_err(|e| format!("MutuallyTrustedCertificates: {e}"))?;
        let mut count = 0;
        certificates
            .Count(&mut count)
            .map_err(|e| format!("ClientCertificateCollection.Count: {e}"))?;

        for index in 0..count {
            let certificate = certificates
                .GetValueAtIndex(index)
                .map_err(|e| format!("ClientCertificateCollection.GetValueAtIndex: {e}"))?;
            let Some(thumbprint) = webview_certificate_thumbprint(&certificate) else {
                continue;
            };

            if thumbprint == selected_thumbprint {
                args.SetSelectedCertificate(&certificate)
                    .map_err(|e| format!("SetSelectedCertificate: {e}"))?;
                args.SetCancel(false)
                    .map_err(|e| format!("SetCancel: {e}"))?;
                args.SetHandled(true)
                    .map_err(|e| format!("SetHandled: {e}"))?;
                return Ok(true);
            }
        }

        Ok(false)
    }

    #[windows_core::implement(ICoreWebView2ClientCertificateRequestedEventHandler)]
    struct NfeClientCertificateHandler {
        thumbprint: String,
    }

    impl ICoreWebView2ClientCertificateRequestedEventHandler_Impl
        for NfeClientCertificateHandler_Impl
    {
        fn Invoke(
            &self,
            _sender: windows_core::Ref<'_, ICoreWebView2>,
            args: windows_core::Ref<'_, ICoreWebView2ClientCertificateRequestedEventArgs>,
        ) -> windows_core::Result<()> {
            if let Some(args) = &*args {
                let result = unsafe { select_matching_certificate(args, &self.thumbprint) };
                if let Err(e) = result {
                    eprintln!("Erro ao selecionar certificado NF-e: {e}");
                }
            }
            Ok(())
        }
    }

    let selected_thumbprint = normalize_thumbprint(&certificate_thumbprint);

    window
        .with_webview(move |webview| {
            let result = (|| -> Result<(), String> {
                unsafe {
                    let core = webview
                        .controller()
                        .CoreWebView2()
                        .map_err(|e| format!("CoreWebView2: {e}"))?;
                    let core5: ICoreWebView2_5 = core
                        .cast()
                        .map_err(|e| format!("ICoreWebView2_5: {e}"))?;
                    let handler: ICoreWebView2ClientCertificateRequestedEventHandler =
                        NfeClientCertificateHandler {
                            thumbprint: selected_thumbprint,
                        }
                        .into();
                    let mut token: i64 = 0;
                    core5
                        .add_ClientCertificateRequested(&handler, &mut token)
                        .map_err(|e| format!("add_ClientCertificateRequested: {e}"))?;
                }
                Ok(())
            })();
            if let Err(e) = result {
                eprintln!("Erro ao configurar seleção automática do certificado NF-e: {e}");
            }
        })
        .map_err(|e| format!("Erro ao acessar WebView: {e}"))?;

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn install_nfe_key_autofill(_window: &tauri::WebviewWindow, _access_key: String) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
fn install_nfe_key_autofill(window: &tauri::WebviewWindow, access_key: String) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2, ICoreWebView2AddScriptToExecuteOnDocumentCreatedCompletedHandler,
        ICoreWebView2ExecuteScriptCompletedHandler,
        ICoreWebView2NavigationCompletedEventArgs,
        ICoreWebView2NavigationCompletedEventHandler,
        ICoreWebView2NavigationCompletedEventHandler_Impl,
        ICoreWebView2_4,
    };
    use windows_core::{Interface, PCWSTR};

    fn to_wide(value: &str) -> Vec<u16> {
        OsStr::new(value).encode_wide().chain(Some(0)).collect()
    }

    fn build_autofill_script(access_key: &str) -> Result<String, String> {
        let key = serde_json::to_string(access_key)
            .map_err(|e| format!("Erro ao preparar chave de acesso: {e}"))?;

        Ok(format!(
            r#"
(function() {{
  var key = {key};
  function xmlViewerText(element) {{
    return ((element.innerText || '') + ' ' + (element.textContent || '') + ' ' + (element.value || '') + ' ' + (element.title || '') + ' ' + (element.name || '') + ' ' + (element.id || '') + ' ' + (element.getAttribute('aria-label') || '')).replace(/\s+/g, ' ').toLowerCase();
  }}

  function xmlViewerClick(element) {{
    try {{ element.scrollIntoView({{ block: 'center', inline: 'center' }}); }} catch (_) {{}}
    try {{ element.focus(); }} catch (_) {{}}
    ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'click'].forEach(function(type) {{
      try {{
        element.dispatchEvent(new MouseEvent(type, {{ bubbles: true, cancelable: true, view: window }}));
      }} catch (_) {{}}
    }});
    try {{ element.click(); }} catch (_) {{}}
  }}

  function xmlViewerFindDownloadButton() {{
    var controls = Array.prototype.slice.call(document.querySelectorAll('a, button, input, span'));
    return controls.find(function(control) {{
      var text = xmlViewerText(control);
      if (text.indexOf('download') === -1) return false;
      return text.indexOf('documento') !== -1 || text.indexOf('xml') !== -1;
    }});
  }}

  function xmlViewerTryDownloadClick() {{
    if (window.__xmlViewerNfeDownloadClicked) return;
    var download = xmlViewerFindDownloadButton();
    if (download) {{
      window.__xmlViewerNfeDownloadClicked = true;
      xmlViewerClick(download);
    }}
  }}

  function xmlViewerFindContinueButton() {{
    var controls = Array.prototype.slice.call(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
    return controls.find(function(control) {{
      var text = xmlViewerText(control);
      return text.indexOf('continuar') !== -1;
    }});
  }}

  function xmlViewerCaptchaSolved() {{
    var response = document.querySelector('textarea[name="g-recaptcha-response"], textarea[name="h-captcha-response"]');
    return !!response && (response.value || '').trim().length > 0;
  }}

  function xmlViewerTryContinueClick() {{
    if (window.__xmlViewerNfeContinueClicked) return;
    var button = xmlViewerFindContinueButton();
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    if (!xmlViewerCaptchaSolved()) return;

    window.__xmlViewerNfeContinueClicked = true;
    setTimeout(function() {{
      xmlViewerClick(button);
    }}, 250);
  }}

  if (!window.__xmlViewerNfeDownloadWatcher) {{
    window.__xmlViewerNfeDownloadWatcher = setInterval(function() {{
      if (window.__xmlViewerNfeDownloadClicked) return;
      xmlViewerTryDownloadClick();
    }}, 800);
    try {{
      new MutationObserver(xmlViewerTryDownloadClick).observe(document.documentElement, {{ childList: true, subtree: true }});
    }} catch (_) {{}}
  }}

  if (!window.__xmlViewerNfeContinueWatcher) {{
    window.__xmlViewerNfeContinueWatcher = setInterval(function() {{
      if (window.__xmlViewerNfeContinueClicked) return;
      xmlViewerTryContinueClick();
    }}, 800);
    try {{
      new MutationObserver(xmlViewerTryContinueClick).observe(document.documentElement, {{ childList: true, subtree: true, attributes: true }});
    }} catch (_) {{}}
  }}

  xmlViewerTryDownloadClick();
  xmlViewerTryContinueClick();

  var attempts = 0;
  var timer = setInterval(function() {{
    attempts += 1;
    var candidates = Array.prototype.slice.call(document.querySelectorAll('input')).filter(function(input) {{
      var type = (input.type || 'text').toLowerCase();
      var rect = input.getBoundingClientRect();
      return !input.disabled && !input.readOnly && rect.width >= 250 && (type === 'text' || type === 'tel' || type === 'search' || type === '');
    }});

    var labels = Array.prototype.slice.call(document.querySelectorAll('label, span, td, div, p'));
    var label = labels.find(function(element) {{
      var text = (element.textContent || '').replace(/\s+/g, ' ').toLowerCase();
      return text.indexOf('chave de acesso da nf-e') !== -1 || text.indexOf('chave de acesso da nfe') !== -1;
    }});

    var field = null;
    if (label) {{
      var labelRect = label.getBoundingClientRect();
      field = candidates
        .map(function(input) {{
          var rect = input.getBoundingClientRect();
          var verticalDistance = rect.top - labelRect.bottom;
          var horizontalDistance = Math.abs(rect.left - labelRect.left);
          return {{ input: input, score: Math.abs(verticalDistance) + horizontalDistance / 5 }};
        }})
        .filter(function(item) {{
          var rect = item.input.getBoundingClientRect();
          return rect.top >= labelRect.top && rect.top <= labelRect.bottom + 80;
        }})
        .sort(function(a, b) {{ return a.score - b.score; }})[0]?.input || null;
    }}

    if (!field) {{
      field = candidates.find(function(input) {{
        var name = ((input.name || '') + ' ' + (input.id || '') + ' ' + (input.getAttribute('aria-label') || '')).toLowerCase();
        return name.indexOf('chave') !== -1 || name.indexOf('nfe') !== -1 || name.indexOf('nf-e') !== -1;
      }});
    }}

    if (!field) {{
      field = candidates.sort(function(a, b) {{
        return b.getBoundingClientRect().width - a.getBoundingClientRect().width;
      }})[0];
    }}

    if (field) {{
      field.focus();
      field.value = key;
      field.dispatchEvent(new Event('input', {{ bubbles: true }}));
      field.dispatchEvent(new Event('change', {{ bubbles: true }}));
      clearInterval(timer);
    }}

    if (attempts >= 30) clearInterval(timer);
  }}, 500);
}})();
"#
        ))
    }

    #[windows_core::implement(ICoreWebView2NavigationCompletedEventHandler)]
    struct NfeNavigationCompletedHandler {
        script: String,
    }

    impl ICoreWebView2NavigationCompletedEventHandler_Impl
        for NfeNavigationCompletedHandler_Impl
    {
        fn Invoke(
            &self,
            sender: windows_core::Ref<'_, ICoreWebView2>,
            _args: windows_core::Ref<'_, ICoreWebView2NavigationCompletedEventArgs>,
        ) -> windows_core::Result<()> {
            if let Some(core) = &*sender {
                let script = to_wide(&self.script);
                unsafe {
                    let _ = core.ExecuteScript(
                        PCWSTR(script.as_ptr()),
                        Option::<&ICoreWebView2ExecuteScriptCompletedHandler>::None,
                    );
                }
            }
            Ok(())
        }
    }

    let script = build_autofill_script(&access_key)?;

    window
        .with_webview(move |webview| {
            let result = (|| -> Result<(), String> {
                unsafe {
                    let core = webview
                        .controller()
                        .CoreWebView2()
                        .map_err(|e| format!("CoreWebView2: {e}"))?;
                    let created_script = to_wide(&script);
                    core
                        .AddScriptToExecuteOnDocumentCreated(
                            PCWSTR(created_script.as_ptr()),
                            Option::<&ICoreWebView2AddScriptToExecuteOnDocumentCreatedCompletedHandler>::None,
                        )
                        .map_err(|e| format!("AddScriptToExecuteOnDocumentCreated: {e}"))?;
                    let core4: ICoreWebView2_4 = core
                        .cast()
                        .map_err(|e| format!("ICoreWebView2_4: {e}"))?;
                    let handler: ICoreWebView2NavigationCompletedEventHandler =
                        NfeNavigationCompletedHandler { script }.into();
                    let mut token: i64 = 0;
                    core4
                        .add_NavigationCompleted(&handler, &mut token)
                        .map_err(|e| format!("add_NavigationCompleted: {e}"))?;
                }
                Ok(())
            })();
            if let Err(e) = result {
                eprintln!("Erro ao configurar preenchimento da chave NF-e: {e}");
            }
        })
        .map_err(|e| format!("Erro ao acessar WebView: {e}"))?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn list_windows_user_certificates() -> Result<Vec<UserCertificate>, String> {
    let script = r#"
$now = Get-Date
$certs = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.HasPrivateKey -eq $true -and $_.NotBefore -le $now -and $_.NotAfter -gt $now } | Sort-Object NotAfter -Descending | ForEach-Object {
  [PSCustomObject]@{
    thumbprint = $_.Thumbprint
    subject = $_.Subject
    issuer = $_.Issuer
    notBefore = $_.NotBefore.ToString('s')
    notAfter = $_.NotAfter.ToString('s')
    hasPrivateKey = $_.HasPrivateKey
  }
}
$certs | ConvertTo-Json -Compress
"#;

    let output = Command::new("powershell")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .output()
        .map_err(|e| format!("Erro ao consultar certificados do Windows: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "Erro ao consultar certificados do Windows".into()
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        return Ok(Vec::new());
    }

    let value: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Erro ao interpretar certificados do Windows: {e}"))?;
    let items = match value {
        serde_json::Value::Array(items) => items,
        serde_json::Value::Object(_) => vec![value],
        _ => Vec::new(),
    };

    let certificates = items
        .into_iter()
        .filter_map(|item| {
            Some(UserCertificate {
                thumbprint: item.get("thumbprint")?.as_str()?.to_string(),
                subject: item.get("subject")?.as_str()?.to_string(),
                issuer: item.get("issuer")?.as_str()?.to_string(),
                not_before: item.get("notBefore")?.as_str()?.to_string(),
                not_after: item.get("notAfter")?.as_str()?.to_string(),
                has_private_key: item.get("hasPrivateKey")?.as_bool().unwrap_or(false),
            })
        })
        .collect();

    Ok(certificates)
}
