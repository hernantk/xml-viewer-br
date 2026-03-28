fn main() {
    // On Windows with MSVC, pass the module-definition file so the DLL exports
    // exactly the four COM server entry points without name mangling.
    #[cfg(all(target_os = "windows", target_env = "msvc"))]
    {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
        let def_path = format!("{}/src/exports.def", manifest_dir);
        println!("cargo:rustc-cdylib-link-arg=/DEF:{}", def_path);
    }
}
