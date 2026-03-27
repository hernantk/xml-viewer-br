use crate::error::AppError;
use crate::models::common::DocumentType;

pub fn detect_type(xml: &str) -> Result<DocumentType, AppError> {
    // Quick string-based detection before full parsing
    if xml.contains("nfeProc") || xml.contains("infNFe") || xml.contains("portalfiscal.inf.br/nfe") {
        return Ok(DocumentType::Nfe);
    }
    if xml.contains("cteProc") || xml.contains("infCte") || xml.contains("portalfiscal.inf.br/cte") {
        return Ok(DocumentType::Cte);
    }
    // NFS-e: different municipalities use varied casing/tags
    {
        let lower = xml.to_ascii_lowercase();
        if xml.contains("CompNfse") || xml.contains("InfNfse") || xml.contains("InfNFSe")
            || xml.contains("abrasf") || lower.contains("<nfse") || lower.contains("<infnfse")
        {
            return Ok(DocumentType::Nfse);
        }
    }

    Err(AppError::UnknownDocumentType)
}
