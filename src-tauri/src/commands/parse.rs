use crate::error::AppError;
use crate::models::common::{DocumentType, ParsedDocument};
use crate::parser;
use crate::PendingOpenPaths;
use tauri::State;

#[tauri::command]
pub fn parse_document(xml: String) -> Result<ParsedDocument, AppError> {
    let doc_type = parser::detector::detect_type(&xml)?;

    match doc_type {
        DocumentType::Nfe => {
            let nfe = parser::nfe_parser::parse(&xml)?;
            Ok(ParsedDocument {
                document_type: DocumentType::Nfe,
                nfe: Some(nfe),
                cte: None,
                nfse: None,
            })
        }
        DocumentType::Cte => {
            let cte = parser::cte_parser::parse(&xml)?;
            Ok(ParsedDocument {
                document_type: DocumentType::Cte,
                nfe: None,
                cte: Some(cte),
                nfse: None,
            })
        }
        DocumentType::Nfse => {
            let nfse = parser::nfse_parser::parse(&xml)?;
            Ok(ParsedDocument {
                document_type: DocumentType::Nfse,
                nfe: None,
                cte: None,
                nfse: Some(nfse),
            })
        }
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
