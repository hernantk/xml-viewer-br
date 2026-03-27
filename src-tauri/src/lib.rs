mod commands;

use std::path::Path;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{Emitter, Manager};

pub struct PendingOpenPaths(pub Mutex<Vec<String>>);

#[derive(Default)]
struct InitialOpenPaths(Vec<String>);

#[derive(Clone, Serialize)]
struct AssociatedFilesPayload {
    paths: Vec<String>,
}

fn collect_associated_xml_paths<I, S>(args: I) -> Vec<String>
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    args.into_iter()
        .skip(1)
        .map(Into::into)
        .filter(|arg| is_xml_file_path(arg))
        .collect()
}

fn is_xml_file_path(candidate: &str) -> bool {
    let path = Path::new(candidate);
    path.is_file()
        && path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("xml"))
            .unwrap_or(false)
}

fn enqueue_pending_paths(app: &tauri::AppHandle, paths: &[String]) {
    if paths.is_empty() {
        return;
    }

    let state = app.state::<PendingOpenPaths>();
    let lock = state.0.lock();
    if let Ok(mut pending) = lock {
        pending.extend(paths.iter().cloned());
    }
}

fn focus_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_paths = collect_associated_xml_paths(
        std::env::args_os().map(|arg| arg.to_string_lossy().into_owned()),
    );

    tauri::Builder::default()
        .manage(PendingOpenPaths(Mutex::new(Vec::new())))
        .manage(InitialOpenPaths(initial_paths))
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let paths = collect_associated_xml_paths(argv);
            if paths.is_empty() {
                return;
            }

            enqueue_pending_paths(app, &paths);
            focus_main_window(app);
            let _ = app.emit(
                "app://open-associated-files",
                AssociatedFilesPayload { paths },
            );
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let initial_paths = {
                let state = app.state::<InitialOpenPaths>();
                state.0.clone()
            };
            enqueue_pending_paths(app.handle(), &initial_paths);

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::parse::parse_document,
            commands::parse::read_file,
            commands::parse::take_pending_open_paths,
            commands::print::print_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
