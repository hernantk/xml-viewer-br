use crate::error::AppError;
use crate::models::nfse::*;
use super::{get_text, get_text_opt, find_child};

pub fn parse(xml: &str) -> Result<CompNfse, AppError> {
    let doc = roxmltree::Document::parse(xml)?;
    let root = doc.root_element();

    // Find InfNfse - could be deeply nested
    let inf_nfse = find_descendant(&root, "InfNfse")
        .ok_or_else(|| AppError::XmlParseError("Elemento InfNfse não encontrado".into()))?;

    Ok(CompNfse {
        nfse: NfseDoc {
            inf_nfse: parse_inf_nfse(&inf_nfse)?,
        },
    })
}

fn find_descendant<'a>(node: &'a roxmltree::Node<'a, 'a>, name: &str) -> Option<roxmltree::Node<'a, 'a>> {
    node.descendants().find(|n| n.has_tag_name(name))
}

fn parse_inf_nfse(el: &roxmltree::Node) -> Result<InfNfse, AppError> {
    let prestador_el = find_child(el, "PrestadorServico")
        .ok_or_else(|| AppError::XmlParseError("PrestadorServico não encontrado".into()))?;
    let tomador_el = find_child(el, "TomadorServico");
    let orgao_el = find_child(el, "OrgaoGerador");
    let dps_el = find_child(el, "DeclaracaoPrestacaoServico");
    let valores_nfse_el = find_child(el, "ValoresNfse");

    Ok(InfNfse {
        numero: get_text(el, "Numero"),
        codigo_verificacao: get_text(el, "CodigoVerificacao"),
        data_emissao: get_text(el, "DataEmissao"),
        nfse_substituida: get_text_opt(el, "NfseSubstituida"),
        outras_informacoes: get_text_opt(el, "OutrasInformacoes"),
        valores_nfse: valores_nfse_el.map(|v| ValoresNfse {
            base_calculo: get_text(&v, "BaseCalculo"),
            aliquota: get_text_opt(&v, "Aliquota"),
            valor_iss: get_text_opt(&v, "ValorIss"),
            valor_liquido_nfse: get_text(&v, "ValorLiquidoNfse"),
        }).unwrap_or(ValoresNfse {
            base_calculo: String::from("0"),
            aliquota: None,
            valor_iss: None,
            valor_liquido_nfse: String::from("0"),
        }),
        prestador_servico: parse_prestador(&prestador_el),
        tomador_servico: tomador_el.map(|t| parse_tomador(&t)),
        orgao_gerador: orgao_el.map(|o| OrgaoGerador {
            codigo_municipio: get_text(&o, "CodigoMunicipio"),
            uf: get_text(&o, "Uf"),
        }),
        declaracao_prestacao_servico: dps_el.map(|d| parse_dps(&d)).transpose()?,
    })
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

    PrestadorServico {
        identificacao_prestador: ident_el.map(|i| IdentificacaoPrestador {
            cnpj: { let v = get_text(&i, "Cnpj"); if v.is_empty() { get_text(&i, "CpfCnpj") } else { v } },
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

    TomadorServico {
        identificacao_tomador: ident_el.map(|i| IdentificacaoTomador {
            cnpj: get_text_opt(&i, "Cnpj"),
            cpf: get_text_opt(&i, "Cpf"),
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
            servico: Servico {
                valores: ValoresServico {
                    valor_servicos: get_text(&valores_el, "ValorServicos"),
                    valor_deducoes: get_text_opt(&valores_el, "ValorDeducoes"),
                    valor_pis: get_text_opt(&valores_el, "ValorPis"),
                    valor_cofins: get_text_opt(&valores_el, "ValorCofins"),
                    valor_inss: get_text_opt(&valores_el, "ValorInss"),
                    valor_ir: get_text_opt(&valores_el, "ValorIr"),
                    valor_csll: get_text_opt(&valores_el, "ValorCsll"),
                    iss_retido: get_text_opt(&valores_el, "IssRetido"),
                    valor_iss: get_text_opt(&valores_el, "ValorIss"),
                    valor_iss_retido: get_text_opt(&valores_el, "ValorIssRetido"),
                    outras_retencoes: get_text_opt(&valores_el, "OutrasRetencoes"),
                    base_calculo: get_text_opt(&valores_el, "BaseCalculo"),
                    aliquota: get_text_opt(&valores_el, "Aliquota"),
                    valor_liquido_nfse: get_text_opt(&valores_el, "ValorLiquidoNfse"),
                    desconto_incondicionado: get_text_opt(&valores_el, "DescontoIncondicionado"),
                    desconto_condicionado: get_text_opt(&valores_el, "DescontoCondicionado"),
                },
                item_lista_servico: get_text(&servico_el, "ItemListaServico"),
                codigo_cnae: get_text_opt(&servico_el, "CodigoCnae"),
                codigo_tributacao_municipio: get_text_opt(&servico_el, "CodigoTributacaoMunicipio"),
                discriminacao: get_text(&servico_el, "Discriminacao"),
                codigo_municipio: get_text(&servico_el, "CodigoMunicipio"),
            },
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

