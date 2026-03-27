use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Erro ao ler arquivo: {0}")]
    FileError(String),

    #[error("Erro ao parsear XML: {0}")]
    XmlParseError(String),

    #[error("Tipo de documento não reconhecido")]
    UnknownDocumentType,

    #[error("Erro de validação: {0}")]
    ValidationError(String),

    #[error("Erro ao gerar PDF: {0}")]
    PdfError(String),

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::FileError(err.to_string())
    }
}

impl From<roxmltree::Error> for AppError {
    fn from(err: roxmltree::Error) -> Self {
        AppError::XmlParseError(err.to_string())
    }
}
