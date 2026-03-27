use crate::PendingOpenPaths;
use crate::error::AppError;
use crate::models::common::{DocumentType, ParsedDocument};
use crate::parser;
use tauri::State;

#[tauri::command]
pub fn parse_document(xml: String) -> Result<ParsedDocument, AppError> {
    let doc_type = parser::detector::detect_type(&xml)?;

    match doc_type {
        DocumentType::Nfe => Ok(ParsedDocument {
            document_type: DocumentType::Nfe,
            nfe: Some(parser::nfe_parser::parse(&xml)?),
            cte: None,
            nfse: None,
        }),
        DocumentType::Cte => Ok(ParsedDocument {
            document_type: DocumentType::Cte,
            nfe: None,
            cte: Some(parser::cte_parser::parse(&xml)?),
            nfse: None,
        }),
        DocumentType::Nfse => Ok(ParsedDocument {
            document_type: DocumentType::Nfse,
            nfe: None,
            cte: None,
            nfse: Some(parser::nfse_parser::parse(&xml)?),
        }),
    }
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
