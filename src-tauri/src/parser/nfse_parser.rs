use crate::error::AppError;
use crate::models::nfse::*;
use super::{get_text, get_text_opt, find_child};

pub fn parse(xml: &str) -> Result<CompNfse, AppError> {
    let doc = roxmltree::Document::parse(xml)?;
    let root = doc.root_element();

    // Find InfNfse - try multiple casing variants (municipalities differ)
    let inf_nfse = find_descendant_ci(&root, &["InfNfse", "InfNFSe", "infNfse", "infNFSe"])
        .ok_or_else(|| AppError::XmlParseError("Elemento InfNfse não encontrado".into()))?;

    Ok(CompNfse {
        nfse: NfseDoc {
            inf_nfse: parse_inf_nfse(&inf_nfse)?,
        },
    })
}

/// Case-insensitive descendant search: try each name variant
fn find_descendant_ci<'a>(node: &'a roxmltree::Node<'a, 'a>, names: &[&str]) -> Option<roxmltree::Node<'a, 'a>> {
    for name in names {
        if let Some(n) = node.descendants().find(|n| n.has_tag_name(*name)) {
            return Some(n);
        }
    }
    // Fallback: true case-insensitive match
    node.descendants().find(|n| {
        n.is_element() && n.tag_name().name().eq_ignore_ascii_case("infnfse")
    })
}

fn parse_inf_nfse(el: &roxmltree::Node) -> Result<InfNfse, AppError> {
    let prestador_el = find_child(el, "PrestadorServico")
        .ok_or_else(|| AppError::XmlParseError("PrestadorServico não encontrado".into()))?;
    let tomador_el = find_child(el, "TomadorServico");
    let orgao_el = find_child(el, "OrgaoGerador");
    let dps_el = find_child(el, "DeclaracaoPrestacaoServico");
    let valores_nfse_el = find_child(el, "ValoresNfse");

    // Some municipalities put Servico directly in InfNfse instead of inside DPS
    let servico_direct = find_child(el, "Servico");

    // Build ValoresNfse: try dedicated element first, then extract from Servico/Valores
    let valores_nfse = if let Some(v) = valores_nfse_el {
        ValoresNfse {
            base_calculo: get_text(&v, "BaseCalculo"),
            aliquota: get_text_opt(&v, "Aliquota"),
            valor_iss: get_text_opt(&v, "ValorIss"),
            valor_liquido_nfse: get_text(&v, "ValorLiquidoNfse"),
        }
    } else if let Some(ref srv) = servico_direct {
        // Fallback: derive from Servico > Valores
        if let Some(vals) = find_child(srv, "Valores") {
            ValoresNfse {
                base_calculo: get_text_opt(&vals, "BaseCalculo")
                    .unwrap_or_else(|| get_text(&vals, "ValorServicos")),
                aliquota: get_text_opt(&vals, "Aliquota"),
                valor_iss: get_text_opt(&vals, "ValorIss"),
                valor_liquido_nfse: get_text_opt(&vals, "ValorLiquidoNfse")
                    .unwrap_or_else(|| get_text(&vals, "ValorServicos")),
            }
        } else {
            default_valores_nfse()
        }
    } else {
        default_valores_nfse()
    };

    // Build DPS: try parsing the DPS element. If it fails (incomplete DPS), synthesize from direct Servico.
    let declaracao = if let Some(d) = dps_el {
        parse_dps(&d).ok()
    } else {
        None
    };

    let declaracao = declaracao.or_else(|| {
        servico_direct.as_ref().map(|srv| {
            let valores_el = find_child(srv, "Valores");
            DeclaracaoPrestacaoServico {
                inf_declaracao_prestacao_servico: InfDeclaracaoPrestacaoServico {
                    competencia: get_text_opt(el, "Competencia"),
                    servico: parse_servico(srv, &valores_el),
                    prestador: PrestadorRef {
                        cnpj: extract_cnpj(&prestador_el, "IdentificacaoPrestador"),
                        inscricao_municipal: find_child(&prestador_el, "IdentificacaoPrestador")
                            .and_then(|i| get_text_opt(&i, "InscricaoMunicipal")),
                    },
                    tomador: tomador_el.as_ref().map(|t| parse_tomador(t)),
                    optante_simples_nacional: get_text_opt(el, "OptanteSimplesNacional"),
                    incentivo_fiscal: get_text_opt(el, "IncentivadorCultural")
                        .or_else(|| get_text_opt(el, "IncentivoFiscal")),
                },
            }
        })
    });

    Ok(InfNfse {
        numero: get_text(el, "Numero"),
        codigo_verificacao: get_text(el, "CodigoVerificacao"),
        data_emissao: get_text(el, "DataEmissao"),
        nfse_substituida: get_text_opt(el, "NfseSubstituida"),
        outras_informacoes: get_text_opt(el, "OutrasInformacoes"),
        valores_nfse,
        prestador_servico: parse_prestador(&prestador_el),
        tomador_servico: tomador_el.map(|t| parse_tomador(&t)),
        orgao_gerador: orgao_el.map(|o| OrgaoGerador {
            codigo_municipio: get_text(&o, "CodigoMunicipio"),
            uf: get_text(&o, "Uf"),
        }),
        declaracao_prestacao_servico: declaracao,
    })
}

fn default_valores_nfse() -> ValoresNfse {
    ValoresNfse {
        base_calculo: String::from("0"),
        aliquota: None,
        valor_iss: None,
        valor_liquido_nfse: String::from("0"),
    }
}

fn parse_servico(servico_el: &roxmltree::Node, valores_el: &Option<roxmltree::Node>) -> Servico {
    let valores = valores_el.as_ref().map(|v| ValoresServico {
        valor_servicos: get_text(v, "ValorServicos"),
        valor_deducoes: get_text_opt(v, "ValorDeducoes"),
        valor_pis: get_text_opt(v, "ValorPis"),
        valor_cofins: get_text_opt(v, "ValorCofins"),
        valor_inss: get_text_opt(v, "ValorInss"),
        valor_ir: get_text_opt(v, "ValorIr"),
        valor_csll: get_text_opt(v, "ValorCsll"),
        iss_retido: get_text_opt(v, "IssRetido"),
        valor_iss: get_text_opt(v, "ValorIss"),
        valor_iss_retido: get_text_opt(v, "ValorIssRetido"),
        outras_retencoes: get_text_opt(v, "OutrasRetencoes"),
        base_calculo: get_text_opt(v, "BaseCalculo"),
        aliquota: get_text_opt(v, "Aliquota"),
        valor_liquido_nfse: get_text_opt(v, "ValorLiquidoNfse"),
        desconto_incondicionado: get_text_opt(v, "DescontoIncondicionado"),
        desconto_condicionado: get_text_opt(v, "DescontoCondicionado"),
    }).unwrap_or(ValoresServico {
        valor_servicos: String::new(), valor_deducoes: None, valor_pis: None,
        valor_cofins: None, valor_inss: None, valor_ir: None, valor_csll: None,
        iss_retido: None, valor_iss: None, valor_iss_retido: None,
        outras_retencoes: None, base_calculo: None, aliquota: None,
        valor_liquido_nfse: None, desconto_incondicionado: None,
        desconto_condicionado: None,
    });

    Servico {
        valores,
        item_lista_servico: get_text(servico_el, "ItemListaServico"),
        codigo_cnae: get_text_opt(servico_el, "CodigoCnae"),
        codigo_tributacao_municipio: get_text_opt(servico_el, "CodigoTributacaoMunicipio"),
        discriminacao: get_text(servico_el, "Discriminacao"),
        codigo_municipio: get_text(servico_el, "CodigoMunicipio"),
    }
}

/// Extract CNPJ handling the <CpfCnpj><Cnpj>...</Cnpj></CpfCnpj> nesting pattern
fn extract_cnpj_from_ident(ident: &roxmltree::Node) -> (Option<String>, Option<String>) {
    let cnpj = get_text_opt(ident, "Cnpj");
    let cpf = get_text_opt(ident, "Cpf");

    if cnpj.is_some() || cpf.is_some() {
        return (cnpj, cpf);
    }

    // Try <CpfCnpj> wrapper (common ABRASF pattern)
    if let Some(wrapper) = find_child(ident, "CpfCnpj") {
        return (get_text_opt(&wrapper, "Cnpj"), get_text_opt(&wrapper, "Cpf"));
    }

    (None, None)
}

fn extract_cnpj(parent: &roxmltree::Node, ident_name: &str) -> String {
    find_child(parent, ident_name)
        .and_then(|i| {
            let (cnpj, _) = extract_cnpj_from_ident(&i);
            cnpj
        })
        .unwrap_or_default()
}

fn parse_endereco_nfse(el: &roxmltree::Node) -> EnderecoNfse {
    EnderecoNfse {
        endereco: get_text_opt(el, "Endereco"),
        numero: get_text_opt(el, "Numero"),
        complemento: get_text_opt(el, "Complemento"),
        bairro: get_text_opt(el, "Bairro"),
        codigo_municipio: get_text_opt(el, "CodigoMunicipio"),
        uf: get_text_opt(el, "Uf"),
        cep: get_text_opt(el, "Cep"),
    }
}

fn parse_contato(el: &roxmltree::Node) -> Contato {
    Contato {
        telefone: get_text_opt(el, "Telefone"),
        email: get_text_opt(el, "Email"),
    }
}

fn parse_prestador(el: &roxmltree::Node) -> PrestadorServico {
    let ident_el = find_child(el, "IdentificacaoPrestador");
    let endereco_el = find_child(el, "Endereco");
    let contato_el = find_child(el, "Contato");

    let (cnpj, _) = ident_el.as_ref()
        .map(|i| extract_cnpj_from_ident(i))
        .unwrap_or((None, None));

    PrestadorServico {
        identificacao_prestador: ident_el.map(|i| IdentificacaoPrestador {
            cnpj: cnpj.clone().unwrap_or_default(),
            inscricao_municipal: get_text_opt(&i, "InscricaoMunicipal"),
        }).unwrap_or(IdentificacaoPrestador {
            cnpj: String::new(),
            inscricao_municipal: None,
        }),
        razao_social: get_text(el, "RazaoSocial"),
        nome_fantasia: get_text_opt(el, "NomeFantasia"),
        endereco: endereco_el.map(|e| parse_endereco_nfse(&e)).unwrap_or(EnderecoNfse {
            endereco: None, numero: None, complemento: None, bairro: None,
            codigo_municipio: None, uf: None, cep: None,
        }),
        contato: contato_el.map(|c| parse_contato(&c)),
    }
}

fn parse_tomador(el: &roxmltree::Node) -> TomadorServico {
    let ident_el = find_child(el, "IdentificacaoTomador");
    let endereco_el = find_child(el, "Endereco");
    let contato_el = find_child(el, "Contato");

    let (cnpj, cpf) = ident_el.as_ref()
        .map(|i| extract_cnpj_from_ident(i))
        .unwrap_or((None, None));

    TomadorServico {
        identificacao_tomador: ident_el.map(|i| IdentificacaoTomador {
            cnpj,
            cpf,
            inscricao_municipal: get_text_opt(&i, "InscricaoMunicipal"),
        }),
        razao_social: get_text(el, "RazaoSocial"),
        endereco: endereco_el.map(|e| parse_endereco_nfse(&e)),
        contato: contato_el.map(|c| parse_contato(&c)),
    }
}

fn parse_dps(el: &roxmltree::Node) -> Result<DeclaracaoPrestacaoServico, AppError> {
    let inf_el = find_child(el, "InfDeclaracaoPrestacaoServico")
        .ok_or_else(|| AppError::XmlParseError("InfDeclaracaoPrestacaoServico não encontrado".into()))?;

    let servico_el = find_child(&inf_el, "Servico")
        .ok_or_else(|| AppError::XmlParseError("Servico não encontrado".into()))?;
    let prestador_el = find_child(&inf_el, "Prestador")
        .ok_or_else(|| AppError::XmlParseError("Prestador não encontrado em DPS".into()))?;
    let tomador_el = find_child(&inf_el, "Tomador");

    let valores_el = find_child(&servico_el, "Valores")
        .ok_or_else(|| AppError::XmlParseError("Valores não encontrado em Servico".into()))?;

    Ok(DeclaracaoPrestacaoServico {
        inf_declaracao_prestacao_servico: InfDeclaracaoPrestacaoServico {
            competencia: get_text_opt(&inf_el, "Competencia"),
            servico: parse_servico(&servico_el, &Some(valores_el)),
            prestador: PrestadorRef {
                cnpj: { let v = get_text(&prestador_el, "Cnpj"); if v.is_empty() { get_text(&prestador_el, "CpfCnpj") } else { v } },
                inscricao_municipal: get_text_opt(&prestador_el, "InscricaoMunicipal"),
            },
            tomador: tomador_el.map(|t| parse_tomador(&t)),
            optante_simples_nacional: get_text_opt(&inf_el, "OptanteSimplesNacional"),
            incentivo_fiscal: get_text_opt(&inf_el, "IncentivoFiscal"),
        },
    })
}
