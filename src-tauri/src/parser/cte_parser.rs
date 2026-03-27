use crate::error::AppError;
use crate::models::common::Endereco;
use crate::models::cte::*;
use super::{get_text, get_text_opt, find_child, find_children};

pub fn parse(xml: &str) -> Result<Cte, AppError> {
    let doc = roxmltree::Document::parse(xml)?;
    let root = doc.root_element();

    let inf_cte = find_descendant(&root, "infCte")
        .ok_or_else(|| AppError::XmlParseError("Elemento infCte não encontrado".into()))?;

    let prot_cte = find_descendant(&root, "protCTe");

    Ok(Cte {
        inf_cte: parse_inf_cte(&inf_cte)?,
        prot_cte: prot_cte.map(|p| parse_prot_cte(&p)).transpose()?,
    })
}

fn find_descendant<'a>(node: &'a roxmltree::Node<'a, 'a>, name: &str) -> Option<roxmltree::Node<'a, 'a>> {
    node.descendants().find(|n| n.has_tag_name(name))
}

fn parse_inf_cte(el: &roxmltree::Node) -> Result<InfCte, AppError> {
    let ide_el = find_child(el, "ide").ok_or_else(|| AppError::XmlParseError("ide não encontrado".into()))?;
    let emit_el = find_child(el, "emit").ok_or_else(|| AppError::XmlParseError("emit não encontrado".into()))?;
    let v_prest_el = find_child(el, "vPrest").ok_or_else(|| AppError::XmlParseError("vPrest não encontrado".into()))?;
    let imp_el = find_child(el, "imp").ok_or_else(|| AppError::XmlParseError("imp não encontrado".into()))?;

    Ok(InfCte {
        id: el.attribute("Id").unwrap_or("").to_string(),
        versao: el.attribute("versao").unwrap_or("").to_string(),
        ide: parse_ide_cte(&ide_el),
        compl: find_child(el, "compl").map(|c| ComplCte {
            x_carac_ad: get_text_opt(&c, "xCaracAd"),
            x_carac_ser: get_text_opt(&c, "xCaracSer"),
            x_emi: get_text_opt(&c, "xEmi"),
            x_obs: get_text_opt(&c, "xObs"),
        }),
        emit: parse_emit_cte(&emit_el),
        rem: find_child(el, "rem").map(|p| parse_party(&p)),
        exped: find_child(el, "exped").map(|p| parse_party(&p)),
        receb: find_child(el, "receb").map(|p| parse_party(&p)),
        dest: find_child(el, "dest").map(|p| parse_party(&p)),
        v_prest: parse_v_prest(&v_prest_el),
        imp: parse_imp_cte(&imp_el),
        inf_cte_norm: find_child(el, "infCTeNorm").map(|n| parse_inf_cte_norm(&n)),
        inf_adic: find_child(el, "infAdic").map(|i| InfAdicCte {
            inf_ad_fisco: get_text_opt(&i, "infAdFisco"),
            inf_cpl: get_text_opt(&i, "infCpl"),
        }),
    })
}

fn parse_ide_cte(el: &roxmltree::Node) -> IdeCte {
    IdeCte {
        c_uf: get_text(el, "cUF"),
        c_ct: get_text(el, "cCT"),
        cfop: get_text(el, "CFOP"),
        nat_op: get_text(el, "natOp"),
        mod_: get_text(el, "mod"),
        serie: get_text(el, "serie"),
        n_ct: get_text(el, "nCT"),
        dh_emi: get_text(el, "dhEmi"),
        tp_imp: get_text(el, "tpImp"),
        tp_emis: get_text(el, "tpEmis"),
        c_dv: get_text(el, "cDV"),
        tp_amb: get_text(el, "tpAmb"),
        tp_cte: get_text(el, "tpCTe"),
        proc_emi: get_text(el, "procEmi"),
        ver_proc: get_text(el, "verProc"),
        c_mun_env: get_text(el, "cMunEnv"),
        x_mun_env: get_text(el, "xMunEnv"),
        uf_env: get_text(el, "UFEnv"),
        modal: get_text(el, "modal"),
        tp_serv: get_text(el, "tpServ"),
        c_mun_ini: get_text(el, "cMunIni"),
        x_mun_ini: get_text(el, "xMunIni"),
        uf_ini: get_text(el, "UFIni"),
        c_mun_fim: get_text(el, "cMunFim"),
        x_mun_fim: get_text(el, "xMunFim"),
        uf_fim: get_text(el, "UFFim"),
    }
}

fn parse_endereco(el: &roxmltree::Node) -> Endereco {
    Endereco {
        x_lgr: get_text(el, "xLgr"),
        nro: get_text(el, "nro"),
        x_cpl: get_text_opt(el, "xCpl"),
        x_bairro: get_text(el, "xBairro"),
        c_mun: get_text(el, "cMun"),
        x_mun: get_text(el, "xMun"),
        uf: get_text(el, "UF"),
        cep: get_text(el, "CEP"),
        c_pais: get_text_opt(el, "cPais"),
        x_pais: get_text_opt(el, "xPais"),
        fone: get_text_opt(el, "fone"),
    }
}

fn parse_emit_cte(el: &roxmltree::Node) -> EmitCte {
    let ender = find_child(el, "enderEmit").map(|e| parse_endereco(&e))
        .unwrap_or(Endereco {
            x_lgr: String::new(), nro: String::new(), x_cpl: None,
            x_bairro: String::new(), c_mun: String::new(), x_mun: String::new(),
            uf: String::new(), cep: String::new(), c_pais: None, x_pais: None, fone: None,
        });
    EmitCte {
        cnpj: get_text(el, "CNPJ"),
        ie: get_text(el, "IE"),
        x_nome: get_text(el, "xNome"),
        x_fant: get_text_opt(el, "xFant"),
        ender_emit: ender,
    }
}

fn parse_party(el: &roxmltree::Node) -> PartyCte {
    // Find the address element (enderReme, enderDest, enderExped, enderReceb, etc.)
    let ender_node = el.children().find(|c| {
        c.is_element() && c.tag_name().name().starts_with("ender")
    });

    let ender = ender_node.map(|e| parse_endereco(&e))
        .unwrap_or(Endereco {
            x_lgr: String::new(), nro: String::new(), x_cpl: None,
            x_bairro: String::new(), c_mun: String::new(), x_mun: String::new(),
            uf: String::new(), cep: String::new(), c_pais: None, x_pais: None, fone: None,
        });

    PartyCte {
        cnpj: get_text_opt(el, "CNPJ"),
        cpf: get_text_opt(el, "CPF"),
        ie: get_text_opt(el, "IE"),
        x_nome: get_text(el, "xNome"),
        x_fant: get_text_opt(el, "xFant"),
        fone: get_text_opt(el, "fone"),
        endereco: ender,
        email: get_text_opt(el, "email"),
    }
}

fn parse_v_prest(el: &roxmltree::Node) -> VPrest {
    let comps = find_children(el, "Comp");
    VPrest {
        v_tprest: get_text(el, "vTPrest"),
        v_rec: get_text(el, "vRec"),
        comp: if comps.is_empty() {
            None
        } else {
            Some(comps.iter().map(|c| CompPrest {
                x_nome: get_text(c, "xNome"),
                v_comp: get_text(c, "vComp"),
            }).collect())
        },
    }
}

fn parse_imp_cte(el: &roxmltree::Node) -> ImpCte {
    let icms_el = find_child(el, "ICMS");
    let variant = icms_el.as_ref().and_then(|i| i.children().find(|c| c.is_element()));

    ImpCte {
        icms: variant.map(|v| IcmsCte {
            cst: get_text(&v, "CST"),
            v_bc: get_text_opt(&v, "vBC"),
            p_icms: get_text_opt(&v, "pICMS"),
            v_icms: get_text_opt(&v, "vICMS"),
            p_red_bc: get_text_opt(&v, "pRedBC"),
        }).unwrap_or(IcmsCte {
            cst: String::new(), v_bc: None, p_icms: None, v_icms: None, p_red_bc: None,
        }),
        v_tot_trib: get_text_opt(el, "vTotTrib"),
    }
}

fn parse_inf_cte_norm(el: &roxmltree::Node) -> InfCTeNorm {
    let inf_carga_el = find_child(el, "infCarga");
    let inf_doc_el = find_child(el, "infDoc");
    let inf_modal_el = find_child(el, "infModal");
    let rodo_direct = find_child(el, "rodo");

    InfCTeNorm {
        inf_carga: inf_carga_el.map(|c| parse_inf_carga(&c)).unwrap_or(InfCarga {
            v_carga: None,
            pro_pred: String::new(),
            x_out_cat: None,
            inf_q: vec![],
        }),
        inf_doc: inf_doc_el.map(|d| parse_inf_doc(&d)),
        inf_modal: inf_modal_el.map(|m| parse_inf_modal(&m)).or_else(|| {
            rodo_direct.map(|r| InfModal {
                versao_modal: String::new(),
                rodo: Some(RodoModal { rntrc: get_text(&r, "RNTRC") }),
            })
        }),
    }
}

fn parse_inf_carga(el: &roxmltree::Node) -> InfCarga {
    let inf_qs = find_children(el, "infQ");
    InfCarga {
        v_carga: get_text_opt(el, "vCarga"),
        pro_pred: get_text(el, "proPred"),
        x_out_cat: get_text_opt(el, "xOutCat"),
        inf_q: inf_qs.iter().map(|q| InfQ {
            c_unid: get_text(q, "cUnid"),
            tp_med: get_text(q, "tpMed"),
            q_carga: get_text(q, "qCarga"),
        }).collect(),
    }
}

fn parse_inf_doc(el: &roxmltree::Node) -> InfDoc {
    let nfe_refs = find_children(el, "infNFe");
    let outros = find_children(el, "infOutros");

    InfDoc {
        inf_nfe: if nfe_refs.is_empty() {
            None
        } else {
            Some(nfe_refs.iter().map(|n| InfNFeRef {
                chave: get_text(n, "chave"),
            }).collect())
        },
        inf_outros: if outros.is_empty() {
            None
        } else {
            Some(outros.iter().map(|o| InfOutros {
                tp_doc: get_text(o, "tpDoc"),
                desc_outros: get_text_opt(o, "descOutros"),
                n_doc: get_text(o, "nDoc"),
                d_emi: get_text_opt(o, "dEmi"),
            }).collect())
        },
    }
}

fn parse_inf_modal(el: &roxmltree::Node) -> InfModal {
    let rodo = find_child(el, "rodo");
    InfModal {
        versao_modal: el.attribute("versaoModal").unwrap_or("").to_string(),
        rodo: rodo.map(|r| RodoModal {
            rntrc: get_text(&r, "RNTRC"),
        }),
    }
}

fn parse_prot_cte(el: &roxmltree::Node) -> Result<ProtCTe, AppError> {
    let inf_prot = find_child(el, "infProt")
        .ok_or_else(|| AppError::XmlParseError("infProt não encontrado em protCTe".into()))?;
    Ok(ProtCTe {
        inf_prot: InfProtCTe {
            tp_amb: get_text(&inf_prot, "tpAmb"),
            ver_aplic: get_text(&inf_prot, "verAplic"),
            ch_cte: get_text(&inf_prot, "chCTe"),
            dh_recbto: get_text(&inf_prot, "dhRecbto"),
            n_prot: get_text(&inf_prot, "nProt"),
            dig_val: get_text(&inf_prot, "digVal"),
            c_stat: get_text(&inf_prot, "cStat"),
            x_motivo: get_text(&inf_prot, "xMotivo"),
        },
    })
}
