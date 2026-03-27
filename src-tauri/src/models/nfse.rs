use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompNfse {
    pub nfse: NfseDoc,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NfseDoc {
    pub inf_nfse: InfNfse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfNfse {
    pub numero: String,
    pub codigo_verificacao: String,
    pub data_emissao: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nfse_substituida: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outras_informacoes: Option<String>,
    pub valores_nfse: ValoresNfse,
    pub prestador_servico: PrestadorServico,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tomador_servico: Option<TomadorServico>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub orgao_gerador: Option<OrgaoGerador>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub declaracao_prestacao_servico: Option<DeclaracaoPrestacaoServico>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValoresNfse {
    pub base_calculo: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aliquota: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_iss: Option<String>,
    pub valor_liquido_nfse: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrestadorServico {
    pub identificacao_prestador: IdentificacaoPrestador,
    pub razao_social: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nome_fantasia: Option<String>,
    pub endereco: EnderecoNfse,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contato: Option<Contato>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentificacaoPrestador {
    pub cnpj: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inscricao_municipal: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TomadorServico {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identificacao_tomador: Option<IdentificacaoTomador>,
    pub razao_social: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endereco: Option<EnderecoNfse>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contato: Option<Contato>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentificacaoTomador {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cnpj: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpf: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inscricao_municipal: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnderecoNfse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endereco: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub numero: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub complemento: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bairro: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codigo_municipio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uf: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cep: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Contato {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub telefone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgaoGerador {
    pub codigo_municipio: String,
    pub uf: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeclaracaoPrestacaoServico {
    pub inf_declaracao_prestacao_servico: InfDeclaracaoPrestacaoServico,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfDeclaracaoPrestacaoServico {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub competencia: Option<String>,
    pub servico: Servico,
    pub prestador: PrestadorRef,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tomador: Option<TomadorServico>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub optante_simples_nacional: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub incentivo_fiscal: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrestadorRef {
    pub cnpj: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inscricao_municipal: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Servico {
    pub valores: ValoresServico,
    pub item_lista_servico: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codigo_cnae: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codigo_tributacao_municipio: Option<String>,
    pub discriminacao: String,
    pub codigo_municipio: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValoresServico {
    pub valor_servicos: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_deducoes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_pis: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_cofins: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_inss: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_ir: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_csll: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iss_retido: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_iss: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_iss_retido: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outras_retencoes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_calculo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aliquota: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_liquido_nfse: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub desconto_incondicionado: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub desconto_condicionado: Option<String>,
}
