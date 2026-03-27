use serde::{Deserialize, Serialize};
use super::common::Endereco;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cte {
    pub inf_cte: InfCte,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prot_cte: Option<ProtCTe>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfCte {
    pub id: String,
    pub versao: String,
    pub ide: IdeCte,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compl: Option<ComplCte>,
    pub emit: EmitCte,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rem: Option<PartyCte>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exped: Option<PartyCte>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receb: Option<PartyCte>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dest: Option<PartyCte>,
    pub v_prest: VPrest,
    pub imp: ImpCte,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_cte_norm: Option<InfCTeNorm>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_adic: Option<InfAdicCte>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeCte {
    pub c_uf: String,
    pub c_ct: String,
    #[serde(rename = "CFOP")]
    pub cfop: String,
    pub nat_op: String,
    #[serde(rename = "mod")]
    pub mod_: String,
    pub serie: String,
    pub n_ct: String,
    pub dh_emi: String,
    pub tp_imp: String,
    pub tp_emis: String,
    pub c_dv: String,
    pub tp_amb: String,
    pub tp_cte: String,
    pub proc_emi: String,
    pub ver_proc: String,
    pub c_mun_env: String,
    pub x_mun_env: String,
    #[serde(rename = "UFEnv")]
    pub uf_env: String,
    pub modal: String,
    pub tp_serv: String,
    pub c_mun_ini: String,
    pub x_mun_ini: String,
    #[serde(rename = "UFIni")]
    pub uf_ini: String,
    pub c_mun_fim: String,
    pub x_mun_fim: String,
    #[serde(rename = "UFFim")]
    pub uf_fim: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComplCte {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_carac_ad: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_carac_ser: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_emi: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_obs: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmitCte {
    #[serde(rename = "CNPJ")]
    pub cnpj: String,
    #[serde(rename = "IE")]
    pub ie: String,
    pub x_nome: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_fant: Option<String>,
    pub ender_emit: Endereco,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartyCte {
    #[serde(rename = "CNPJ", skip_serializing_if = "Option::is_none")]
    pub cnpj: Option<String>,
    #[serde(rename = "CPF", skip_serializing_if = "Option::is_none")]
    pub cpf: Option<String>,
    #[serde(rename = "IE", skip_serializing_if = "Option::is_none")]
    pub ie: Option<String>,
    pub x_nome: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_fant: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fone: Option<String>,
    pub endereco: Endereco,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VPrest {
    pub v_tprest: String,
    pub v_rec: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comp: Option<Vec<CompPrest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompPrest {
    pub x_nome: String,
    pub v_comp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImpCte {
    #[serde(rename = "ICMS")]
    pub icms: IcmsCte,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_tot_trib: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IcmsCte {
    #[serde(rename = "CST")]
    pub cst: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_bc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_icms: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_icms: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_red_bc: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfCTeNorm {
    pub inf_carga: InfCarga,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_doc: Option<InfDoc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_modal: Option<InfModal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfCarga {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_carga: Option<String>,
    pub pro_pred: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_out_cat: Option<String>,
    pub inf_q: Vec<InfQ>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfQ {
    pub c_unid: String,
    pub tp_med: String,
    pub q_carga: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfDoc {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_nfe: Option<Vec<InfNFeRef>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_outros: Option<Vec<InfOutros>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfNFeRef {
    pub chave: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfOutros {
    pub tp_doc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub desc_outros: Option<String>,
    pub n_doc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub d_emi: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfModal {
    pub versao_modal: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rodo: Option<RodoModal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RodoModal {
    #[serde(rename = "RNTRC")]
    pub rntrc: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfAdicCte {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_ad_fisco: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_cpl: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtCTe {
    pub inf_prot: InfProtCTe,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfProtCTe {
    pub tp_amb: String,
    pub ver_aplic: String,
    pub ch_cte: String,
    pub dh_recbto: String,
    pub n_prot: String,
    pub dig_val: String,
    pub c_stat: String,
    pub x_motivo: String,
}
