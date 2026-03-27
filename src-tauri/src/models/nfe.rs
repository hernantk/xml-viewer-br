use serde::{Deserialize, Serialize};
use super::common::Endereco;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Nfe {
    pub inf_nfe: InfNFe,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prot_nfe: Option<ProtNFe>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfNFe {
    pub id: String,
    pub versao: String,
    pub ide: Ide,
    pub emit: Emit,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dest: Option<Dest>,
    pub det: Vec<Det>,
    pub total: Total,
    pub transp: Transp,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cobr: Option<Cobr>,
    pub pag: Pag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_adic: Option<InfAdic>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ide {
    pub c_uf: String,
    pub c_nf: String,
    pub nat_op: String,
    #[serde(rename = "mod")]
    pub mod_: String,
    pub serie: String,
    pub n_nf: String,
    pub dh_emi: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dh_sai_ent: Option<String>,
    pub tp_nf: String,
    pub id_dest: String,
    pub c_mun_fg: String,
    pub tp_imp: String,
    pub tp_emis: String,
    pub c_dv: String,
    pub tp_amb: String,
    pub fin_nfe: String,
    pub ind_final: String,
    pub ind_pres: String,
    pub proc_emi: String,
    pub ver_proc: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Emit {
    #[serde(rename = "CNPJ", skip_serializing_if = "Option::is_none")]
    pub cnpj: Option<String>,
    #[serde(rename = "CPF", skip_serializing_if = "Option::is_none")]
    pub cpf: Option<String>,
    pub x_nome: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_fant: Option<String>,
    pub ender_emit: Endereco,
    #[serde(rename = "IE")]
    pub ie: String,
    #[serde(rename = "CRT")]
    pub crt: String,
    #[serde(rename = "CNAE", skip_serializing_if = "Option::is_none")]
    pub cnae: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dest {
    #[serde(rename = "CNPJ", skip_serializing_if = "Option::is_none")]
    pub cnpj: Option<String>,
    #[serde(rename = "CPF", skip_serializing_if = "Option::is_none")]
    pub cpf: Option<String>,
    pub x_nome: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ender_dest: Option<Endereco>,
    pub ind_ie_dest: String,
    #[serde(rename = "IE", skip_serializing_if = "Option::is_none")]
    pub ie: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Det {
    pub n_item: String,
    pub prod: Prod,
    pub imposto: Imposto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Prod {
    pub c_prod: String,
    pub c_ean: String,
    pub x_prod: String,
    #[serde(rename = "NCM")]
    pub ncm: String,
    #[serde(rename = "CFOP")]
    pub cfop: String,
    pub u_com: String,
    pub q_com: String,
    pub v_un_com: String,
    pub v_prod: String,
    pub c_ean_trib: String,
    pub u_trib: String,
    pub q_trib: String,
    pub v_un_trib: String,
    pub ind_tot: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_frete: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_seg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_desc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_outro: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Imposto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_tot_trib: Option<String>,
    #[serde(rename = "ICMS", skip_serializing_if = "Option::is_none")]
    pub icms: Option<IcmsGroup>,
    #[serde(rename = "IPI", skip_serializing_if = "Option::is_none")]
    pub ipi: Option<IpiGroup>,
    #[serde(rename = "PIS", skip_serializing_if = "Option::is_none")]
    pub pis: Option<PisGroup>,
    #[serde(rename = "COFINS", skip_serializing_if = "Option::is_none")]
    pub cofins: Option<CofinsGroup>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IcmsGroup {
    pub orig: String,
    #[serde(rename = "CST", skip_serializing_if = "Option::is_none")]
    pub cst: Option<String>,
    #[serde(rename = "CSOSN", skip_serializing_if = "Option::is_none")]
    pub csosn: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_bc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_icms: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_icms: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_bcst: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_icmsst: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_icmsst: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpiGroup {
    #[serde(rename = "CST", skip_serializing_if = "Option::is_none")]
    pub cst: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_bc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_ipi: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_ipi: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PisGroup {
    #[serde(rename = "CST")]
    pub cst: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_bc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_pis: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_pis: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CofinsGroup {
    #[serde(rename = "CST")]
    pub cst: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_bc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_cofins: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_cofins: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Total {
    #[serde(rename = "ICMSTot")]
    pub icms_tot: ICMSTot,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ICMSTot {
    pub v_bc: String,
    pub v_icms: String,
    pub v_icms_deson: String,
    pub v_fcp: String,
    pub v_bcst: String,
    pub v_st: String,
    pub v_fcpst: String,
    pub v_fcpst_ret: String,
    pub v_prod: String,
    pub v_frete: String,
    pub v_seg: String,
    pub v_desc: String,
    pub v_ii: String,
    pub v_ipi: String,
    pub v_ipi_devol: String,
    pub v_pis: String,
    pub v_cofins: String,
    pub v_outro: String,
    pub v_nf: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_tot_trib: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transp {
    pub mod_frete: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transporta: Option<Transporta>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vol: Option<Vec<Vol>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transporta {
    #[serde(rename = "CNPJ", skip_serializing_if = "Option::is_none")]
    pub cnpj: Option<String>,
    #[serde(rename = "CPF", skip_serializing_if = "Option::is_none")]
    pub cpf: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_nome: Option<String>,
    #[serde(rename = "IE", skip_serializing_if = "Option::is_none")]
    pub ie: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_ender: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_mun: Option<String>,
    #[serde(rename = "UF", skip_serializing_if = "Option::is_none")]
    pub uf: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vol {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub q_vol: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub esp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub marca: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n_vol: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub peso_l: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub peso_b: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cobr {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fat: Option<Fatura>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dup: Option<Vec<Duplicata>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fatura {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n_fat: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_orig: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_desc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v_liq: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Duplicata {
    pub n_dup: String,
    pub d_venc: String,
    pub v_dup: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pag {
    pub det_pag: Vec<DetPag>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetPag {
    pub t_pag: String,
    pub v_pag: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfAdic {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_ad_fisco: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inf_cpl: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtNFe {
    pub inf_prot: InfProt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfProt {
    pub tp_amb: String,
    pub ver_aplic: String,
    pub ch_nfe: String,
    pub dh_recbto: String,
    pub n_prot: String,
    pub dig_val: String,
    pub c_stat: String,
    pub x_motivo: String,
}
