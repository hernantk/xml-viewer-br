fn main() {
    build_preview_handler_dll();
    tauri_build::build()
}

/// Build xml_preview_handler.dll before tauri_build validates the resource paths.
///
/// tauri_build::build() checks that every file listed under bundle.resources
/// exists on disk.  On a fresh checkout nothing has been compiled yet, so we
/// build the DLL here — before that check — using the same cargo binary that
/// is already running.
fn build_preview_handler_dll() {
    // Only relevant on Windows targets
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }

    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let workspace_root = std::path::Path::new(&manifest_dir)
        .parent()
        .expect("src-tauri must be one level inside the workspace root");

    let dll_manifest = workspace_root
        .join("xml-preview-handler")
        .join("Cargo.toml");

    if !dll_manifest.exists() {
        // Running in an environment where the DLL crate is absent — skip.
        return;
    }

    // Re-run this build script whenever the DLL source changes so the DLL
    // stays in sync with the installer.
    println!(
        "cargo:rerun-if-changed={}",
        workspace_root.join("xml-preview-handler").join("src").display()
    );

    // Use the same cargo binary Cargo used to invoke us (avoids PATH issues).
    let cargo = std::env::var("CARGO").unwrap_or_else(|_| "cargo".to_string());

    let status = std::process::Command::new(cargo)
        .args(["build", "--release", "--manifest-path"])
        .arg(&dll_manifest)
        .status()
        .expect("failed to spawn cargo for xml-preview-handler");

    if !status.success() {
        panic!(
            "Failed to build xml-preview-handler DLL. \
             Check the error output above for details."
        );
    }
}
