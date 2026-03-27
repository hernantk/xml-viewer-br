use crate::error::AppError;
use crate::models::common::DocumentType;

pub fn detect_type(xml: &str) -> Result<DocumentType, AppError> {
    // CT-e MUST be checked BEFORE NF-e because CT-e XMLs contain <infNFe>
    // references (referenced NF-e documents) which would false-match NF-e detection.
    if xml.contains("cteProc") || xml.contains("infCte") || xml.contains("portalfiscal.inf.br/cte") {
        return Ok(DocumentType::Cte);
    }

    if xml.contains("nfeProc") || xml.contains("infNFe") || xml.contains("portalfiscal.inf.br/nfe") {
        return Ok(DocumentType::Nfe);
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
