use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DocumentType {
    Nfe,
    Cte,
    Nfse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Endereco {
    pub x_lgr: String,
    pub nro: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_cpl: Option<String>,
    pub x_bairro: String,
    pub c_mun: String,
    pub x_mun: String,
    #[serde(rename = "UF")]
    pub uf: String,
    #[serde(rename = "CEP")]
    pub cep: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub c_pais: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_pais: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub schema_valid: bool,
    pub signature_valid: bool,
    pub schema_errors: Vec<String>,
    pub signature_errors: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub certificate_subject: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub certificate_expiry: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedDocument {
    pub document_type: DocumentType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nfe: Option<super::nfe::Nfe>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cte: Option<super::cte::Cte>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nfse: Option<super::nfse::CompNfse>,
}
