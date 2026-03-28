/// Minimal XML parsing for the preview handler.
/// Extracts only the fields needed to paint the preview pane.
/// Mirrors the logic from src-tauri/src/parser/ without any Tauri deps.

#[derive(Debug, Clone, PartialEq)]
pub enum DocType {
    Nfe,
    Cte,
    Nfse,
    Unknown,
}

#[derive(Debug, Clone)]
pub struct XmlPreviewInfo {
    pub doc_type: DocType,
    /// Document number (nNF / nCT / Numero)
    pub numero: String,
    /// Document series (serie) — empty for NFS-e
    pub serie: String,
    /// Issue date formatted as "DD/MM/YYYY HH:MM"
    pub data_emissao: String,
    /// Issuer name
    pub emitente_nome: String,
    /// Issuer CNPJ formatted as "XX.XXX.XXX/XXXX-XX"
    pub emitente_cnpj: String,
    /// Recipient / tomador name
    pub destinatario_nome: String,
    /// Total value formatted as "R$ 1.234,56"
    pub valor_total: String,
    /// 44-character access key (stripped of NFe/CTe prefix)
    pub chave: String,
    /// Authorization protocol number
    pub protocolo: String,
    /// "Produção" or "Homologação"
    pub ambiente: String,
}

impl Default for XmlPreviewInfo {
    fn default() -> Self {
        XmlPreviewInfo {
            doc_type: DocType::Unknown,
            numero: String::new(),
            serie: String::new(),
            data_emissao: String::new(),
            emitente_nome: String::new(),
            emitente_cnpj: String::new(),
            destinatario_nome: String::new(),
            valor_total: String::new(),
            chave: String::new(),
            protocolo: String::new(),
            ambiente: String::new(),
        }
    }
}

/// Parse an XML string and extract preview info.
/// Never panics — returns Unknown on any error.
pub fn parse(xml: &str) -> XmlPreviewInfo {
    match roxmltree::Document::parse(xml) {
        Ok(doc) => parse_doc(&doc),
        Err(_) => XmlPreviewInfo::default(),
    }
}

fn parse_doc(doc: &roxmltree::Document) -> XmlPreviewInfo {
    let root = doc.root_element();

    // CT-e MUST be checked before NF-e (CT-e XMLs may contain infNFe references)
    if xml_contains(doc, "infCte") || xml_contains(doc, "cteProc") {
        return parse_cte(&root);
    }
    if xml_contains(doc, "infNFe") || xml_contains(doc, "nfeProc") {
        return parse_nfe(&root);
    }
    // NFS-e: multiple casing variants used by municipalities
    if xml_contains(doc, "InfNfse")
        || xml_contains(doc, "InfNFSe")
        || xml_contains(doc, "infNfse")
        || xml_contains(doc, "CompNfse")
    {
        return parse_nfse(&root);
    }

    XmlPreviewInfo::default()
}

fn xml_contains(doc: &roxmltree::Document, tag: &str) -> bool {
    doc.descendants().any(|n| n.has_tag_name(tag))
}

// ---------------------------------------------------------------------------
// NF-e
// ---------------------------------------------------------------------------

fn parse_nfe(root: &roxmltree::Node) -> XmlPreviewInfo {
    let inf_nfe = match find_descendant(root, "infNFe") {
        Some(n) => n,
        None => return XmlPreviewInfo { doc_type: DocType::Nfe, ..Default::default() },
    };

    let ide = find_child(&inf_nfe, "ide");
    let emit = find_child(&inf_nfe, "emit");
    let dest = find_child(&inf_nfe, "dest");
    let total = find_child(&inf_nfe, "total");
    let prot_nfe = find_descendant(root, "protNFe");
    let inf_prot = prot_nfe.as_ref().and_then(|p| find_child(p, "infProt"));

    // Access key: Id attribute minus "NFe" prefix
    let id_attr = inf_nfe.attribute("Id").unwrap_or("");
    let chave = strip_prefix(id_attr, "NFe");

    let tp_amb = ide.as_ref().and_then(|e| get_text_opt(e, "tpAmb")).unwrap_or_default();

    // Total value: vNF inside total/ICMSTot
    let v_nf = total
        .as_ref()
        .and_then(|t| find_child(t, "ICMSTot"))
        .and_then(|ic| get_text_opt(&ic, "vNF"))
        .unwrap_or_default();

    XmlPreviewInfo {
        doc_type: DocType::Nfe,
        numero: ide.as_ref().and_then(|e| get_text_opt(e, "nNF")).unwrap_or_default(),
        serie: ide.as_ref().and_then(|e| get_text_opt(e, "serie")).unwrap_or_default(),
        data_emissao: format_date(
            &ide.as_ref()
                .and_then(|e| get_text_opt(e, "dhEmi"))
                .unwrap_or_default(),
        ),
        emitente_nome: emit.as_ref().and_then(|e| get_text_opt(e, "xNome")).unwrap_or_default(),
        emitente_cnpj: format_cnpj(
            &emit
                .as_ref()
                .and_then(|e| get_text_opt(e, "CNPJ"))
                .unwrap_or_default(),
        ),
        destinatario_nome: dest
            .as_ref()
            .and_then(|e| get_text_opt(e, "xNome"))
            .unwrap_or_default(),
        valor_total: format_currency(&v_nf),
        chave,
        protocolo: inf_prot
            .as_ref()
            .and_then(|p| get_text_opt(p, "nProt"))
            .unwrap_or_default(),
        ambiente: parse_ambiente(&tp_amb),
    }
}

// ---------------------------------------------------------------------------
// CT-e
// ---------------------------------------------------------------------------

fn parse_cte(root: &roxmltree::Node) -> XmlPreviewInfo {
    let inf_cte = match find_descendant(root, "infCte") {
        Some(n) => n,
        None => return XmlPreviewInfo { doc_type: DocType::Cte, ..Default::default() },
    };

    let ide = find_child(&inf_cte, "ide");
    let emit = find_child(&inf_cte, "emit");
    let dest = find_child(&inf_cte, "dest");
    let v_prest = find_child(&inf_cte, "vPrest");
    let prot_cte = find_descendant(root, "protCTe");
    let inf_prot = prot_cte.as_ref().and_then(|p| find_child(p, "infProt"));

    let id_attr = inf_cte.attribute("Id").unwrap_or("");
    let chave = strip_prefix(id_attr, "CTe");

    let tp_amb = ide.as_ref().and_then(|e| get_text_opt(e, "tpAmb")).unwrap_or_default();

    let v_tprest = v_prest
        .as_ref()
        .and_then(|v| get_text_opt(v, "vTPrest"))
        .unwrap_or_default();

    XmlPreviewInfo {
        doc_type: DocType::Cte,
        numero: ide.as_ref().and_then(|e| get_text_opt(e, "nCT")).unwrap_or_default(),
        serie: ide.as_ref().and_then(|e| get_text_opt(e, "serie")).unwrap_or_default(),
        data_emissao: format_date(
            &ide.as_ref()
                .and_then(|e| get_text_opt(e, "dhEmi"))
                .unwrap_or_default(),
        ),
        emitente_nome: emit.as_ref().and_then(|e| get_text_opt(e, "xNome")).unwrap_or_default(),
        emitente_cnpj: format_cnpj(
            &emit
                .as_ref()
                .and_then(|e| get_text_opt(e, "CNPJ"))
                .unwrap_or_default(),
        ),
        destinatario_nome: dest
            .as_ref()
            .and_then(|e| get_text_opt(e, "xNome"))
            .unwrap_or_default(),
        valor_total: format_currency(&v_tprest),
        chave,
        protocolo: inf_prot
            .as_ref()
            .and_then(|p| get_text_opt(p, "nProt"))
            .unwrap_or_default(),
        ambiente: parse_ambiente(&tp_amb),
    }
}

// ---------------------------------------------------------------------------
// NFS-e
// ---------------------------------------------------------------------------

fn parse_nfse(root: &roxmltree::Node) -> XmlPreviewInfo {
    // Try multiple casing variants as municipalities differ
    let inf_nfse = find_descendant_any(root, &["InfNfse", "InfNFSe", "infNfse", "infNFSe"]);
    let inf_nfse = match inf_nfse {
        Some(n) => n,
        None => return XmlPreviewInfo { doc_type: DocType::Nfse, ..Default::default() },
    };

    let prestador = find_child(&inf_nfse, "PrestadorServico");
    let tomador = find_child(&inf_nfse, "TomadorServico");
    let valores = find_child(&inf_nfse, "ValoresNfse");

    // CNPJ extraction (handles IdentificacaoPrestador/Cnpj and CpfCnpj wrapper)
    let cnpj = prestador
        .as_ref()
        .and_then(|p| find_child(p, "IdentificacaoPrestador"))
        .and_then(|i| {
            get_text_opt(&i, "Cnpj")
                .or_else(|| find_child(&i, "CpfCnpj").and_then(|w| get_text_opt(&w, "Cnpj")))
        })
        .unwrap_or_default();

    let valor = valores
        .as_ref()
        .and_then(|v| get_text_opt(v, "ValorLiquidoNfse"))
        .unwrap_or_default();

    XmlPreviewInfo {
        doc_type: DocType::Nfse,
        numero: get_text_opt(&inf_nfse, "Numero").unwrap_or_default(),
        serie: String::new(),
        data_emissao: format_date(
            &get_text_opt(&inf_nfse, "DataEmissao").unwrap_or_default(),
        ),
        emitente_nome: prestador
            .as_ref()
            .and_then(|p| get_text_opt(p, "RazaoSocial"))
            .unwrap_or_default(),
        emitente_cnpj: format_cnpj(&cnpj),
        destinatario_nome: tomador
            .as_ref()
            .and_then(|t| get_text_opt(t, "RazaoSocial"))
            .unwrap_or_default(),
        valor_total: format_currency(&valor),
        chave: String::new(),
        protocolo: String::new(),
        ambiente: String::from("Produção"), // NFS-e are always production
    }
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

fn find_descendant<'a>(
    node: &'a roxmltree::Node<'a, 'a>,
    name: &str,
) -> Option<roxmltree::Node<'a, 'a>> {
    node.descendants().find(|n| n.has_tag_name(name))
}

fn find_descendant_any<'a>(
    node: &'a roxmltree::Node<'a, 'a>,
    names: &[&str],
) -> Option<roxmltree::Node<'a, 'a>> {
    for name in names {
        if let Some(n) = node.descendants().find(|n| n.has_tag_name(*name)) {
            return Some(n);
        }
    }
    None
}

fn find_child<'a>(
    node: &'a roxmltree::Node<'a, 'a>,
    name: &str,
) -> Option<roxmltree::Node<'a, 'a>> {
    node.children().find(|n| n.has_tag_name(name))
}

fn get_text_opt(node: &roxmltree::Node, name: &str) -> Option<String> {
    node.children()
        .find(|n| n.has_tag_name(name))
        .and_then(|n| n.text())
        .map(|t| t.trim().to_string())
        .filter(|s| !s.is_empty())
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

fn strip_prefix<'a>(s: &'a str, prefix: &str) -> String {
    if s.starts_with(prefix) {
        s[prefix.len()..].to_string()
    } else {
        s.to_string()
    }
}

fn parse_ambiente(tp_amb: &str) -> String {
    match tp_amb.trim() {
        "1" => "Produção".to_string(),
        "2" => "Homologação".to_string(),
        _ => String::new(),
    }
}

/// Convert ISO 8601 datetime to Brazilian format.
/// "2024-01-15T10:30:00-03:00" → "15/01/2024 10:30"
/// "2024-01-15" → "15/01/2024"
fn format_date(s: &str) -> String {
    let s = s.trim();
    if s.len() >= 10
        && s.as_bytes().get(4) == Some(&b'-')
        && s.as_bytes().get(7) == Some(&b'-')
    {
        let year = &s[0..4];
        let month = &s[5..7];
        let day = &s[8..10];
        if s.len() > 10 && s.as_bytes().get(10) == Some(&b'T') && s.len() >= 16 {
            let time = &s[11..16]; // "HH:MM"
            format!("{}/{}/{} {}", day, month, year, time)
        } else {
            format!("{}/{}/{}", day, month, year)
        }
    } else {
        s.to_string()
    }
}

/// Format a decimal string as Brazilian currency: "1234.56" → "R$ 1.234,56"
fn format_currency(s: &str) -> String {
    let s = s.trim();
    if s.is_empty() {
        return String::new();
    }
    let (int_part, dec_part) = if let Some(dot) = s.find('.') {
        let dec = &s[dot + 1..];
        let dec = if dec.len() >= 2 { &dec[..2] } else { dec };
        (&s[..dot], dec)
    } else {
        (s, "00")
    };

    // Add thousand separators to int_part
    let digits: Vec<char> = int_part.chars().filter(|c| c.is_ascii_digit()).collect();
    let mut with_sep = String::new();
    for (i, c) in digits.iter().enumerate() {
        let remaining = digits.len() - i;
        if i > 0 && remaining % 3 == 0 {
            with_sep.push('.');
        }
        with_sep.push(*c);
    }

    format!("R$ {},{}", with_sep, dec_part)
}

/// Format CNPJ digits: "12345678000195" → "12.345.678/0001-95"
fn format_cnpj(s: &str) -> String {
    let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 14 {
        format!(
            "{}.{}.{}/{}-{}",
            &digits[0..2],
            &digits[2..5],
            &digits[5..8],
            &digits[8..12],
            &digits[12..14]
        )
    } else {
        s.to_string()
    }
}

/// Format the 44-char access key in groups of 4 separated by spaces.
pub fn format_chave(chave: &str) -> String {
    let digits: String = chave.chars().filter(|c| c.is_ascii_digit()).collect();
    digits
        .chars()
        .collect::<Vec<_>>()
        .chunks(4)
        .map(|c| c.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_date_datetime() {
        assert_eq!(format_date("2024-01-15T10:30:00-03:00"), "15/01/2024 10:30");
    }

    #[test]
    fn test_format_date_date_only() {
        assert_eq!(format_date("2024-01-15"), "15/01/2024");
    }

    #[test]
    fn test_format_currency() {
        assert_eq!(format_currency("1234.56"), "R$ 1.234,56");
        assert_eq!(format_currency("100.00"), "R$ 100,00");
        assert_eq!(format_currency("1000000.99"), "R$ 1.000.000,99");
    }

    #[test]
    fn test_format_cnpj() {
        assert_eq!(format_cnpj("12345678000195"), "12.345.678/0001-95");
    }

    #[test]
    fn test_format_chave() {
        let key = "12345678901234567890123456789012345678901234";
        assert_eq!(format_chave(key).len(), 44 + 10); // 44 digits + 10 spaces
    }
}
