//! Biblioteca local de XMLs em `$APPDATA/<identifier>/xmls/<categoria>/`.
//!
//! Todo XML importado é copiado para cá, separado por tipo de documento,
//! e removido daqui quando o usuário o apaga do histórico.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::error::AppError;

const LIBRARY_DIR: &str = "xmls";
const CATEGORIES: &[&str] = &["nfe", "cte", "nfse", "nfse-nacional", "outros"];

fn library_root(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::FileError(e.to_string()))?;
    Ok(dir.join(LIBRARY_DIR))
}

fn category_dir(app: &AppHandle, category: &str) -> Result<PathBuf, AppError> {
    if !CATEGORIES.contains(&category) {
        return Err(AppError::Other(format!("Categoria inválida: {}", category)));
    }
    let dir = library_root(app)?.join(category);
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

/// Returns the canonical path when `candidate` is a file inside `root`.
fn resolve_inside(root: &Path, candidate: &str) -> Option<PathBuf> {
    let root = root.canonicalize().ok()?;
    let path = Path::new(candidate).canonicalize().ok()?;
    (path.starts_with(&root) && path.is_file()).then_some(path)
}

fn sanitize_file_stem(name: &str) -> String {
    let stem = name
        .strip_suffix(".xml")
        .or_else(|| name.strip_suffix(".XML"))
        .unwrap_or(name);
    let cleaned: String = stem
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();
    let trimmed = cleaned.trim().trim_end_matches('.').trim();
    if trimmed.is_empty() {
        "documento".to_string()
    } else {
        trimmed.chars().take(120).collect()
    }
}

/// Picks `<stem>.xml`, reusing a file with identical content or adding
/// ` (n)` until the name is free.
fn pick_target(dir: &Path, stem: &str, content: &str) -> PathBuf {
    let mut n = 1;
    loop {
        let name = if n == 1 {
            format!("{}.xml", stem)
        } else {
            format!("{} ({}).xml", stem, n)
        };
        let target = dir.join(name);
        match std::fs::read_to_string(&target) {
            Ok(existing) if existing == content => return target,
            Ok(_) => n += 1,
            Err(_) if target.exists() => n += 1,
            Err(_) => return target,
        }
    }
}

/// Copies `content` into the library and returns the stored path.
/// When `existing_path` already points to a library file of the same
/// category it is overwritten in place.
#[tauri::command]
pub fn library_store_xml(
    app: AppHandle,
    content: String,
    category: String,
    file_name: String,
    existing_path: Option<String>,
) -> Result<String, AppError> {
    let root = library_root(&app)?;
    let dir = category_dir(&app, &category)?;

    let existing = existing_path
        .as_deref()
        .and_then(|path| resolve_inside(&root, path));

    // Canonical paths carry the `\\?\` prefix on Windows, so the original
    // spelling is what gets returned to the frontend.
    let target = match (&existing, &existing_path) {
        (Some(path), Some(original))
            if dir.canonicalize().map(|d| path.starts_with(d)).unwrap_or(false) =>
        {
            PathBuf::from(original)
        }
        _ => pick_target(&dir, &sanitize_file_stem(&file_name), &content),
    };

    std::fs::write(&target, content.as_bytes())
        .map_err(|e| AppError::FileError(format!("{}: {}", target.display(), e)))?;

    // Document changed category: drop the old copy.
    if let Some(old) = existing {
        if target.canonicalize().map(|t| t != old).unwrap_or(true) {
            let _ = std::fs::remove_file(old);
        }
    }

    Ok(target.to_string_lossy().into_owned())
}

/// Deletes a file from the library. Paths outside it are ignored.
#[tauri::command]
pub fn library_delete_xml(app: AppHandle, path: String) -> Result<(), AppError> {
    let root = library_root(&app)?;
    if let Some(file) = resolve_inside(&root, &path) {
        std::fs::remove_file(&file)
            .map_err(|e| AppError::FileError(format!("{}: {}", file.display(), e)))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_names() {
        assert_eq!(sanitize_file_stem("nota.xml"), "nota");
        assert_eq!(sanitize_file_stem("a/b:c?.XML"), "a_b_c_");
        assert_eq!(sanitize_file_stem("  ..  "), "documento");
    }

    #[test]
    fn reuses_identical_file_and_suffixes_different_one() {
        let dir = std::env::temp_dir().join(format!("xmlviewer-lib-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let first = pick_target(&dir, "nota", "<a/>");
        std::fs::write(&first, "<a/>").unwrap();

        assert_eq!(pick_target(&dir, "nota", "<a/>"), first);
        assert_eq!(pick_target(&dir, "nota", "<b/>"), dir.join("nota (2).xml"));

        std::fs::remove_dir_all(&dir).unwrap();
    }
}
