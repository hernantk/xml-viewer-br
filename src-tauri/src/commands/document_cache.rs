use std::path::PathBuf;

use sha1::{Digest, Sha1};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

const CACHE_DIRECTORY: &str = "document-cache";

fn cache_directory(app: &AppHandle) -> Result<PathBuf, AppError> {
    app.path()
        .app_data_dir()
        .map(|path| path.join(CACHE_DIRECTORY))
        .map_err(|error| AppError::FileError(error.to_string()))
}

fn cache_file_path(app: &AppHandle, file_id: &str) -> Result<PathBuf, AppError> {
    let digest = Sha1::digest(file_id.as_bytes());
    Ok(cache_directory(app)?.join(format!("{digest:x}.xml")))
}

#[tauri::command]
pub fn cache_document(app: AppHandle, file_id: String, content: String) -> Result<(), AppError> {
    let directory = cache_directory(&app)?;
    std::fs::create_dir_all(&directory)?;
    std::fs::write(cache_file_path(&app, &file_id)?, content)?;
    Ok(())
}

#[tauri::command]
pub fn read_cached_document(app: AppHandle, file_id: String) -> Result<Option<String>, AppError> {
    let path = cache_file_path(&app, &file_id)?;
    if !path.is_file() {
        return Ok(None);
    }

    std::fs::read_to_string(path).map(Some).map_err(Into::into)
}

#[tauri::command]
pub fn remove_cached_document(app: AppHandle, file_id: String) -> Result<(), AppError> {
    let path = cache_file_path(&app, &file_id)?;
    if path.is_file() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

#[tauri::command]
pub fn clear_document_cache(app: AppHandle) -> Result<(), AppError> {
    let directory = cache_directory(&app)?;
    if directory.is_dir() {
        std::fs::remove_dir_all(directory)?;
    }
    Ok(())
}
