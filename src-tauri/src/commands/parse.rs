use crate::PendingOpenPaths;
use tauri::State;
use xml_fiscal_core::{parse_document as parse_xml_document, AppError, ParsedDocument};

#[tauri::command]
pub fn parse_document(xml: String) -> Result<ParsedDocument, AppError> {
    parse_xml_document(&xml)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, AppError> {
    std::fs::read_to_string(&path).map_err(|e| AppError::FileError(format!("{}: {}", path, e)))
}

#[tauri::command]
pub fn take_pending_open_paths(state: State<'_, PendingOpenPaths>) -> Vec<String> {
    match state.0.lock() {
        Ok(mut pending) => std::mem::take(&mut *pending),
        Err(_) => Vec::new(),
    }
}
