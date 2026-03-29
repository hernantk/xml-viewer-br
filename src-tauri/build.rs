fn main() {
    ensure_preview_handler_dll();
    tauri_build::build()
}

fn ensure_preview_handler_dll() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }

    let manifest_dir =
        std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR must be available");
    let workspace_root = std::path::Path::new(&manifest_dir)
        .parent()
        .expect("src-tauri must be one level inside the workspace root");

    let dll_path = workspace_root
        .join("target")
        .join("release")
        .join("xml_preview_handler.dll");

    if !dll_path.exists() {
        panic!(
            "Missing preview handler DLL at '{}'. Run `npm run build:tauri-prebuild` from the workspace root before `tauri build`.",
            dll_path.display()
        );
    }
}