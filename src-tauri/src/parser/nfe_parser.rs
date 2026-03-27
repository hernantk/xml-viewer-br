use crate::error::AppError;
use crate::models::common::Endereco;
use crate::models::nfe::*;
use super::{get_text, get_text_opt, find_child, find_children};

pub fn parse(xml: &str) -> Result<Nfe, AppError> {
    let doc = roxmltree::Document::parse(xml)?;
    let root = doc.root_element();

    // Find infNFe - may be inside nfeProc > NFe > infNFe or NFe > infNFe
    let inf_nfe = find_descendant(&root, "infNFe")
        .ok_or_else(|| AppError::XmlParseError("Elemento infNFe não encontrado".into()))?;

    let prot_nfe = find_descendant(&root, "protNFe");

    Ok(Nfe {
        inf_nfe: parse_inf_nfe(&inf_nfe)?,
        prot_nfe: prot_nfe.map(|p| parse_prot_nfe(&p)).transpose()?,
    })
}

fn find_descendant<'a>(node: &'a roxmltree::Node<'a, 'a>, name: &str) -> Option<roxmltree::Node<'a, 'a>> {
    node.descendants().find(|n| n.has_tag_name(name))
}

fn parse_inf_nfe(el: &roxmltree::Node) -> Result<InfNFe, AppError> {
    let ide_el = find_child(el, "ide").ok_or_else(|| AppError::XmlParseError("ide não encontrado".into()))?;
    let emit_el = find_child(el, "emit").ok_or_else(|| AppError::XmlParseError("emit não encontrado".into()))?;
    let dest_el = find_child(el, "dest");
    let total_el = find_child(el, "total").ok_or_else(|| AppError::XmlParseError("total não encontrado".into()))?;
    let transp_el = find_child(el, "transp").ok_or_else(|| AppError::XmlParseError("transp não encontrado".into()))?;
    let cobr_el = find_child(el, "cobr");
    let pag_el = find_child(el, "pag");
    let inf_adic_el = find_child(el, "infAdic");

    let det_els: Vec<_> = el.children().filter(|n| n.has_tag_name("det")).collect();

    Ok(InfNFe {
        id: el.attribute("Id").unwrap_or("").to_string(),
        versao: el.attribute("versao").unwrap_or("").to_string(),
        ide: parse_ide(&ide_el),
        emit: parse_emit(&emit_el),
        dest: dest_el.map(|d| parse_dest(&d)),
        det: det_els.iter().map(|d| parse_det(d)).collect(),
        total: parse_total(&total_el),
        transp: parse_transp(&transp_el),
        cobr: cobr_el.map(|c| parse_cobr(&c)),
        pag: pag_el.map(|p| parse_pag(&p)).unwrap_or(Pag { det_pag: vec![] }),
        inf_adic: inf_adic_el.map(|i| InfAdic {
            inf_ad_fisco: get_text_opt(&i, "infAdFisco"),
            inf_cpl: get_text_opt(&i, "infCpl"),
        }),
    })
}

fn parse_ide(el: &roxmltree::Node) -> Ide {
    Ide {
        c_uf: get_text(el, "cUF"),
        c_nf: get_text(el, "cNF"),
        nat_op: get_text(el, "natOp"),
        mod_: get_text(el, "mod"),
        serie: get_text(el, "serie"),
        n_nf: get_text(el, "nNF"),
        dh_emi: get_text(el, "dhEmi"),
        dh_sai_ent: get_text_opt(el, "dhSaiEnt"),
        tp_nf: get_text(el, "tpNF"),
        id_dest: get_text(el, "idDest"),
        c_mun_fg: get_text(el, "cMunFG"),
        tp_imp: get_text(el, "tpImp"),
        tp_emis: get_text(el, "tpEmis"),
        c_dv: get_text(el, "cDV"),
        tp_amb: get_text(el, "tpAmb"),
        fin_nfe: get_text(el, "finNFe"),
        ind_final: get_text(el, "indFinal"),
        ind_pres: get_text(el, "indPres"),
        proc_emi: get_text(el, "procEmi"),
        ver_proc: get_text(el, "verProc"),
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

fn parse_emit(el: &roxmltree::Node) -> Emit {
    let ender = find_child(el, "enderEmit").map(|e| parse_endereco(&e))
        .unwrap_or(Endereco {
            x_lgr: String::new(), nro: String::new(), x_cpl: None,
            x_bairro: String::new(), c_mun: String::new(), x_mun: String::new(),
            uf: String::new(), cep: String::new(), c_pais: None, x_pais: None, fone: None,
        });
    Emit {
        cnpj: get_text_opt(el, "CNPJ"),
        cpf: get_text_opt(el, "CPF"),
        x_nome: get_text(el, "xNome"),
        x_fant: get_text_opt(el, "xFant"),
        ender_emit: ender,
        ie: get_text(el, "IE"),
        crt: get_text(el, "CRT"),
        cnae: get_text_opt(el, "CNAE"),
    }
}

fn parse_dest(el: &roxmltree::Node) -> Dest {
    Dest {
        cnpj: get_text_opt(el, "CNPJ"),
        cpf: get_text_opt(el, "CPF"),
        x_nome: get_text(el, "xNome"),
        ender_dest: find_child(el, "enderDest").map(|e| parse_endereco(&e)),
        ind_ie_dest: get_text(el, "indIEDest"),
        ie: get_text_opt(el, "IE"),
        email: get_text_opt(el, "email"),
    }
}

fn parse_det(el: &roxmltree::Node) -> Det {
    let prod_el = find_child(el, "prod").unwrap();
    let imposto_el = find_child(el, "imposto").unwrap();
    Det {
        n_item: el.attribute("nItem").unwrap_or("").to_string(),
        prod: parse_prod(&prod_el),
        imposto: parse_imposto(&imposto_el),
    }
}

fn parse_prod(el: &roxmltree::Node) -> Prod {
    Prod {
        c_prod: get_text(el, "cProd"),
        c_ean: get_text(el, "cEAN"),
        x_prod: get_text(el, "xProd"),
        ncm: get_text(el, "NCM"),
        cfop: get_text(el, "CFOP"),
        u_com: get_text(el, "uCom"),
        q_com: get_text(el, "qCom"),
        v_un_com: get_text(el, "vUnCom"),
        v_prod: get_text(el, "vProd"),
        c_ean_trib: get_text(el, "cEANTrib"),
        u_trib: get_text(el, "uTrib"),
        q_trib: get_text(el, "qTrib"),
        v_un_trib: get_text(el, "vUnTrib"),
        ind_tot: get_text(el, "indTot"),
        v_frete: get_text_opt(el, "vFrete"),
        v_seg: get_text_opt(el, "vSeg"),
        v_desc: get_text_opt(el, "vDesc"),
        v_outro: get_text_opt(el, "vOutro"),
    }
}

fn parse_imposto(el: &roxmltree::Node) -> Imposto {
    let icms_el = find_child(el, "ICMS");
    let ipi_el = find_child(el, "IPI");
    let pis_el = find_child(el, "PIS");
    let cofins_el = find_child(el, "COFINS");

    Imposto {
        v_tot_trib: get_text_opt(el, "vTotTrib"),
        icms: icms_el.and_then(|i| {
            // ICMS has variants as children (ICMS00, ICMS10, ICMSSN101, etc.)
            i.children().find(|c| c.is_element()).map(|variant| IcmsGroup {
                orig: get_text(&variant, "orig"),
                cst: get_text_opt(&variant, "CST"),
                csosn: get_text_opt(&variant, "CSOSN"),
                v_bc: get_text_opt(&variant, "vBC"),
                p_icms: get_text_opt(&variant, "pICMS"),
                v_icms: get_text_opt(&variant, "vICMS"),
                v_bcst: get_text_opt(&variant, "vBCST"),
                p_icmsst: get_text_opt(&variant, "pICMSST"),
                v_icmsst: get_text_opt(&variant, "vICMSST"),
            })
        }),
        ipi: ipi_el.map(|i| {
            let src = find_child(&i, "IPITrib")
                .or_else(|| find_child(&i, "IPINT"))
                .unwrap_or(i);
            IpiGroup {
                cst: get_text_opt(&src, "CST"),
                v_bc: get_text_opt(&src, "vBC"),
                p_ipi: get_text_opt(&src, "pIPI"),
                v_ipi: get_text_opt(&src, "vIPI"),
            }
        }),
        pis: pis_el.and_then(|p| {
            p.children().find(|c| c.is_element()).map(|variant| PisGroup {
                cst: get_text(&variant, "CST"),
                v_bc: get_text_opt(&variant, "vBC"),
                p_pis: get_text_opt(&variant, "pPIS"),
                v_pis: get_text_opt(&variant, "vPIS"),
            })
        }),
        cofins: cofins_el.and_then(|c| {
            c.children().find(|ch| ch.is_element()).map(|variant| CofinsGroup {
                cst: get_text(&variant, "CST"),
                v_bc: get_text_opt(&variant, "vBC"),
                p_cofins: get_text_opt(&variant, "pCOFINS"),
                v_cofins: get_text_opt(&variant, "vCOFINS"),
            })
        }),
    }
}

fn parse_total(el: &roxmltree::Node) -> Total {
    let icms_tot = find_child(el, "ICMSTot").unwrap();
    Total {
        icms_tot: ICMSTot {
            v_bc: get_text(&icms_tot, "vBC"),
            v_icms: get_text(&icms_tot, "vICMS"),
            v_icms_deson: get_text(&icms_tot, "vICMSDeson"),
            v_fcp: get_text(&icms_tot, "vFCP"),
            v_bcst: get_text(&icms_tot, "vBCST"),
            v_st: get_text(&icms_tot, "vST"),
            v_fcpst: get_text(&icms_tot, "vFCPST"),
            v_fcpst_ret: get_text(&icms_tot, "vFCPSTRet"),
            v_prod: get_text(&icms_tot, "vProd"),
            v_frete: get_text(&icms_tot, "vFrete"),
            v_seg: get_text(&icms_tot, "vSeg"),
            v_desc: get_text(&icms_tot, "vDesc"),
            v_ii: get_text(&icms_tot, "vII"),
            v_ipi: get_text(&icms_tot, "vIPI"),
            v_ipi_devol: get_text(&icms_tot, "vIPIDevol"),
            v_pis: get_text(&icms_tot, "vPIS"),
            v_cofins: get_text(&icms_tot, "vCOFINS"),
            v_outro: get_text(&icms_tot, "vOutro"),
            v_nf: get_text(&icms_tot, "vNF"),
            v_tot_trib: get_text_opt(&icms_tot, "vTotTrib"),
        },
    }
}

fn parse_transp(el: &roxmltree::Node) -> Transp {
    let transporta = find_child(el, "transporta");
    let vols: Vec<_> = find_children(el, "vol");

    Transp {
        mod_frete: get_text(el, "modFrete"),
        transporta: transporta.map(|t| Transporta {
            cnpj: get_text_opt(&t, "CNPJ"),
            cpf: get_text_opt(&t, "CPF"),
            x_nome: get_text_opt(&t, "xNome"),
            ie: get_text_opt(&t, "IE"),
            x_ender: get_text_opt(&t, "xEnder"),
            x_mun: get_text_opt(&t, "xMun"),
            uf: get_text_opt(&t, "UF"),
        }),
        vol: if vols.is_empty() {
            None
        } else {
            Some(vols.iter().map(|v| Vol {
                q_vol: get_text_opt(v, "qVol"),
                esp: get_text_opt(v, "esp"),
                marca: get_text_opt(v, "marca"),
                n_vol: get_text_opt(v, "nVol"),
                peso_l: get_text_opt(v, "pesoL"),
                peso_b: get_text_opt(v, "pesoB"),
            }).collect())
        },
    }
}

fn parse_cobr(el: &roxmltree::Node) -> Cobr {
    let fat = find_child(el, "fat");
    let dups = find_children(el, "dup");

    Cobr {
        fat: fat.map(|f| Fatura {
            n_fat: get_text_opt(&f, "nFat"),
            v_orig: get_text_opt(&f, "vOrig"),
            v_desc: get_text_opt(&f, "vDesc"),
            v_liq: get_text_opt(&f, "vLiq"),
        }),
        dup: if dups.is_empty() {
            None
        } else {
            Some(dups.iter().map(|d| Duplicata {
                n_dup: get_text(d, "nDup"),
                d_venc: get_text(d, "dVenc"),
                v_dup: get_text(d, "vDup"),
            }).collect())
        },
    }
}

fn parse_pag(el: &roxmltree::Node) -> Pag {
    let det_pags = find_children(el, "detPag");
    Pag {
        det_pag: det_pags.iter().map(|d| DetPag {
            t_pag: get_text(d, "tPag"),
            v_pag: get_text(d, "vPag"),
        }).collect(),
    }
}

fn parse_prot_nfe(el: &roxmltree::Node) -> Result<ProtNFe, AppError> {
    let inf_prot = find_child(el, "infProt")
        .ok_or_else(|| AppError::XmlParseError("infProt não encontrado".into()))?;
    Ok(ProtNFe {
        inf_prot: InfProt {
            tp_amb: get_text(&inf_prot, "tpAmb"),
            ver_aplic: get_text(&inf_prot, "verAplic"),
            ch_nfe: get_text(&inf_prot, "chNFe"),
            dh_recbto: get_text(&inf_prot, "dhRecbto"),
            n_prot: get_text(&inf_prot, "nProt"),
            dig_val: get_text(&inf_prot, "digVal"),
            c_stat: get_text(&inf_prot, "cStat"),
            x_motivo: get_text(&inf_prot, "xMotivo"),
        },
    })
}
