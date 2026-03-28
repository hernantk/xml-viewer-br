import type { ParsedDocument, DocumentType } from "@/types/common";
import type { Nfe, InfNFe, Ide, Emit, Dest, Det, Prod, Imposto, IcmsGroup, IpiGroup, PisGroup, CofinsGroup, Total, ICMSTot, Transp, Transporta, Vol, Cobr, Fatura, Duplicata, Pag, InfAdic, ProtNFe } from "@/types/nfe";
import type { Cte, InfCte, IdeCte, EmitCte, PartyCte, VPrest, ImpCte, IcmsCte, InfCTeNorm, InfCarga, InfDoc, InfModal, ComplCte, ProtCTe } from "@/types/cte";
import type { CompNfse, InfNfse, ValoresNfse, PrestadorServico, TomadorServico, EnderecoNfse, Contato, OrgaoGerador, DeclaracaoPrestacaoServico, Servico, ValoresServico } from "@/types/nfse";

function getEl(parent: Element, tagName: string): Element | null {
  return parent.getElementsByTagName(tagName)[0] || null;
}

function getTxt(parent: Element, tagName: string): string {
  const el = getEl(parent, tagName);
  return el?.textContent?.trim() ?? "";
}

function getElAll(parent: Element, tagName: string): Element[] {
  return Array.from(parent.getElementsByTagName(tagName));
}

export function detectDocumentType(xml: string): DocumentType {
  const normalizedXml = xml.replace(/^\uFEFF/, "").trim();
  if (normalizedXml.length === 0) {
    throw new Error("Arquivo XML vazio.");
  }
  const lowerXml = normalizedXml.toLowerCase();

  // CT-e must be checked before NF-e because CT-e XMLs can contain <infNFe> references
  if (lowerXml.includes("cteproc") || lowerXml.includes("<cte") || lowerXml.includes("infcte") || lowerXml.includes("portalfiscal.inf.br/cte")) {
    return "cte";
  }
  if (lowerXml.includes("nfeproc") || lowerXml.includes("<nfe") || lowerXml.includes("infnfe") || lowerXml.includes("portalfiscal.inf.br/nfe")) {
    return "nfe";
  }
  if (lowerXml.includes("compnfse") || lowerXml.includes("infnfse") || lowerXml.includes("<nfse") || lowerXml.includes("abrasf")) {
    return "nfse";
  }
  throw new Error("Tipo de documento XML não reconhecido. Suportados: NF-e, CT-e, NFS-e.");
}

export function parseXml(xmlString: string): ParsedDocument {
  const docType = detectDocumentType(xmlString);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error("XML inválido: " + (parseError[0].textContent || "erro de parsing"));
  }

  switch (docType) {
    case "nfe":
      return { documentType: "nfe", nfe: parseNfe(xmlDoc) };
    case "cte":
      return { documentType: "cte", cte: parseCte(xmlDoc) };
    case "nfse":
      return { documentType: "nfse", nfse: parseNfse(xmlDoc) };
  }
}

// ============================================================
// NF-e Parser
// ============================================================

function parseNfe(doc: Document): Nfe {
  const infNFeEl = getEl(doc.documentElement, "infNFe");
  if (!infNFeEl) throw new Error("Elemento infNFe não encontrado no XML.");

  const protNFeEl = getEl(doc.documentElement, "protNFe");

  return {
    infNFe: parseInfNFe(infNFeEl),
    protNFe: protNFeEl ? parseProtNFe(protNFeEl) : undefined,
  };
}

function parseInfNFe(el: Element): InfNFe {
  const ideEl = getEl(el, "ide")!;
  const emitEl = getEl(el, "emit")!;
  const destEl = getEl(el, "dest");
  const totalEl = getEl(el, "total")!;
  const transpEl = getEl(el, "transp")!;
  const cobrEl = getEl(el, "cobr");
  const pagEl = getEl(el, "pag");
  const infAdicEl = getEl(el, "infAdic");

  const detEls = getElAll(el, "det").filter(
    (d) => d.parentElement === el
  );

  return {
    id: el.getAttribute("Id") || "",
    versao: el.getAttribute("versao") || "",
    ide: parseIde(ideEl),
    emit: parseEmit(emitEl),
    dest: destEl ? parseDest(destEl) : undefined,
    det: detEls.map(parseDet),
    total: parseTotal(totalEl),
    transp: parseTransp(transpEl),
    cobr: cobrEl ? parseCobr(cobrEl) : undefined,
    pag: pagEl ? parsePag(pagEl) : undefined,
    infAdic: infAdicEl ? parseInfAdic(infAdicEl) : undefined,
  };
}

function parseIde(el: Element): Ide {
  return {
    cUF: getTxt(el, "cUF"),
    cNF: getTxt(el, "cNF"),
    natOp: getTxt(el, "natOp"),
    mod: getTxt(el, "mod"),
    serie: getTxt(el, "serie"),
    nNF: getTxt(el, "nNF"),
    dhEmi: getTxt(el, "dhEmi"),
    dhSaiEnt: getTxt(el, "dhSaiEnt") || undefined,
    tpNF: getTxt(el, "tpNF"),
    idDest: getTxt(el, "idDest"),
    cMunFG: getTxt(el, "cMunFG"),
    tpImp: getTxt(el, "tpImp"),
    tpEmis: getTxt(el, "tpEmis"),
    cDV: getTxt(el, "cDV"),
    tpAmb: getTxt(el, "tpAmb"),
    finNFe: getTxt(el, "finNFe"),
    indFinal: getTxt(el, "indFinal"),
    indPres: getTxt(el, "indPres"),
    procEmi: getTxt(el, "procEmi"),
    verProc: getTxt(el, "verProc"),
  };
}

function parseEndereco(el: Element) {
  return {
    xLgr: getTxt(el, "xLgr"),
    nro: getTxt(el, "nro"),
    xCpl: getTxt(el, "xCpl") || undefined,
    xBairro: getTxt(el, "xBairro"),
    cMun: getTxt(el, "cMun"),
    xMun: getTxt(el, "xMun"),
    UF: getTxt(el, "UF"),
    CEP: getTxt(el, "CEP"),
    cPais: getTxt(el, "cPais") || undefined,
    xPais: getTxt(el, "xPais") || undefined,
    fone: getTxt(el, "fone") || undefined,
  };
}

function parseEmit(el: Element): Emit {
  const enderEl = getEl(el, "enderEmit")!;
  return {
    CNPJ: getTxt(el, "CNPJ") || undefined,
    CPF: getTxt(el, "CPF") || undefined,
    xNome: getTxt(el, "xNome"),
    xFant: getTxt(el, "xFant") || undefined,
    enderEmit: parseEndereco(enderEl),
    IE: getTxt(el, "IE"),
    CRT: getTxt(el, "CRT"),
    CNAE: getTxt(el, "CNAE") || undefined,
  };
}

function parseDest(el: Element): Dest {
  const enderEl = getEl(el, "enderDest");
  return {
    CNPJ: getTxt(el, "CNPJ") || undefined,
    CPF: getTxt(el, "CPF") || undefined,
    xNome: getTxt(el, "xNome"),
    enderDest: enderEl ? parseEndereco(enderEl) : undefined,
    indIEDest: getTxt(el, "indIEDest"),
    IE: getTxt(el, "IE") || undefined,
    email: getTxt(el, "email") || undefined,
  };
}

function parseDet(el: Element): Det {
  const prodEl = getEl(el, "prod")!;
  const impostoEl = getEl(el, "imposto")!;
  return {
    nItem: el.getAttribute("nItem") || "",
    prod: parseProd(prodEl),
    imposto: parseImposto(impostoEl),
  };
}

function parseProd(el: Element): Prod {
  return {
    cProd: getTxt(el, "cProd"),
    cEAN: getTxt(el, "cEAN"),
    xProd: getTxt(el, "xProd"),
    NCM: getTxt(el, "NCM"),
    CFOP: getTxt(el, "CFOP"),
    uCom: getTxt(el, "uCom"),
    qCom: getTxt(el, "qCom"),
    vUnCom: getTxt(el, "vUnCom"),
    vProd: getTxt(el, "vProd"),
    cEANTrib: getTxt(el, "cEANTrib"),
    uTrib: getTxt(el, "uTrib"),
    qTrib: getTxt(el, "qTrib"),
    vUnTrib: getTxt(el, "vUnTrib"),
    indTot: getTxt(el, "indTot"),
    vFrete: getTxt(el, "vFrete") || undefined,
    vSeg: getTxt(el, "vSeg") || undefined,
    vDesc: getTxt(el, "vDesc") || undefined,
    vOutro: getTxt(el, "vOutro") || undefined,
  };
}

function parseImposto(el: Element): Imposto {
  const icmsEl = getEl(el, "ICMS");
  const ipiEl = getEl(el, "IPI");
  const pisEl = getEl(el, "PIS");
  const cofinsEl = getEl(el, "COFINS");

  return {
    vTotTrib: getTxt(el, "vTotTrib") || undefined,
    ICMS: icmsEl ? parseIcms(icmsEl) : undefined,
    IPI: ipiEl ? parseIpi(ipiEl) : undefined,
    PIS: pisEl ? parsePis(pisEl) : undefined,
    COFINS: cofinsEl ? parseCofins(cofinsEl) : undefined,
  };
}

function parseIcms(el: Element): IcmsGroup {
  // ICMS has many variants (ICMS00, ICMS10, ..., ICMSSN101, etc.)
  // Get the first child element which is the actual variant
  const variant = el.children[0];
  if (!variant) return { orig: "", CST: "" };

  return {
    orig: getTxt(variant, "orig"),
    CST: getTxt(variant, "CST") || undefined,
    CSOSN: getTxt(variant, "CSOSN") || undefined,
    vBC: getTxt(variant, "vBC") || undefined,
    pICMS: getTxt(variant, "pICMS") || undefined,
    vICMS: getTxt(variant, "vICMS") || undefined,
    vBCST: getTxt(variant, "vBCST") || undefined,
    pICMSST: getTxt(variant, "pICMSST") || undefined,
    vICMSST: getTxt(variant, "vICMSST") || undefined,
  };
}

function parseIpi(el: Element): IpiGroup {
  const tributEl = getEl(el, "IPITrib");
  const ntEl = getEl(el, "IPINT");
  const src = tributEl || ntEl || el;
  return {
    CST: getTxt(src, "CST") || undefined,
    vBC: getTxt(src, "vBC") || undefined,
    pIPI: getTxt(src, "pIPI") || undefined,
    vIPI: getTxt(src, "vIPI") || undefined,
  };
}

function parsePis(el: Element): PisGroup {
  const variant = el.children[0];
  if (!variant) return { CST: "" };
  return {
    CST: getTxt(variant, "CST"),
    vBC: getTxt(variant, "vBC") || undefined,
    pPIS: getTxt(variant, "pPIS") || undefined,
    vPIS: getTxt(variant, "vPIS") || undefined,
  };
}

function parseCofins(el: Element): CofinsGroup {
  const variant = el.children[0];
  if (!variant) return { CST: "" };
  return {
    CST: getTxt(variant, "CST"),
    vBC: getTxt(variant, "vBC") || undefined,
    pCOFINS: getTxt(variant, "pCOFINS") || undefined,
    vCOFINS: getTxt(variant, "vCOFINS") || undefined,
  };
}

function parseTotal(el: Element): Total {
  const icmsTotEl = getEl(el, "ICMSTot")!;
  return {
    ICMSTot: parseICMSTot(icmsTotEl),
  };
}

function parseICMSTot(el: Element): ICMSTot {
  return {
    vBC: getTxt(el, "vBC"),
    vICMS: getTxt(el, "vICMS"),
    vICMSDeson: getTxt(el, "vICMSDeson"),
    vFCP: getTxt(el, "vFCP"),
    vBCST: getTxt(el, "vBCST"),
    vST: getTxt(el, "vST"),
    vFCPST: getTxt(el, "vFCPST"),
    vFCPSTRet: getTxt(el, "vFCPSTRet"),
    vProd: getTxt(el, "vProd"),
    vFrete: getTxt(el, "vFrete"),
    vSeg: getTxt(el, "vSeg"),
    vDesc: getTxt(el, "vDesc"),
    vII: getTxt(el, "vII"),
    vIPI: getTxt(el, "vIPI"),
    vIPIDevol: getTxt(el, "vIPIDevol"),
    vPIS: getTxt(el, "vPIS"),
    vCOFINS: getTxt(el, "vCOFINS"),
    vOutro: getTxt(el, "vOutro"),
    vNF: getTxt(el, "vNF"),
    vTotTrib: getTxt(el, "vTotTrib") || undefined,
  };
}

function parseTransp(el: Element): Transp {
  const transportaEl = getEl(el, "transporta");
  const volEls = getElAll(el, "vol");
  return {
    modFrete: getTxt(el, "modFrete"),
    transporta: transportaEl ? parseTransporta(transportaEl) : undefined,
    vol: volEls.length > 0 ? volEls.map(parseVol) : undefined,
  };
}

function parseTransporta(el: Element): Transporta {
  return {
    CNPJ: getTxt(el, "CNPJ") || undefined,
    CPF: getTxt(el, "CPF") || undefined,
    xNome: getTxt(el, "xNome") || undefined,
    IE: getTxt(el, "IE") || undefined,
    xEnder: getTxt(el, "xEnder") || undefined,
    xMun: getTxt(el, "xMun") || undefined,
    UF: getTxt(el, "UF") || undefined,
  };
}

function parseVol(el: Element): Vol {
  return {
    qVol: getTxt(el, "qVol") || undefined,
    esp: getTxt(el, "esp") || undefined,
    marca: getTxt(el, "marca") || undefined,
    nVol: getTxt(el, "nVol") || undefined,
    pesoL: getTxt(el, "pesoL") || undefined,
    pesoB: getTxt(el, "pesoB") || undefined,
  };
}

function parseCobr(el: Element): Cobr {
  const fatEl = getEl(el, "fat");
  const dupEls = getElAll(el, "dup");
  return {
    fat: fatEl ? parseFat(fatEl) : undefined,
    dup: dupEls.length > 0 ? dupEls.map(parseDup) : undefined,
  };
}

function parseFat(el: Element): Fatura {
  return {
    nFat: getTxt(el, "nFat") || undefined,
    vOrig: getTxt(el, "vOrig") || undefined,
    vDesc: getTxt(el, "vDesc") || undefined,
    vLiq: getTxt(el, "vLiq") || undefined,
  };
}

function parseDup(el: Element): Duplicata {
  return {
    nDup: getTxt(el, "nDup"),
    dVenc: getTxt(el, "dVenc"),
    vDup: getTxt(el, "vDup"),
  };
}

function parsePag(el: Element): Pag {
  const detPagEls = getElAll(el, "detPag");
  return {
    detPag: detPagEls.map((dp) => ({
      tPag: getTxt(dp, "tPag"),
      vPag: getTxt(dp, "vPag"),
    })),
  };
}

function parseInfAdic(el: Element): InfAdic {
  return {
    infAdFisco: getTxt(el, "infAdFisco") || undefined,
    infCpl: getTxt(el, "infCpl") || undefined,
  };
}

function parseProtNFe(el: Element): ProtNFe {
  const infProtEl = getEl(el, "infProt")!;
  return {
    infProt: {
      tpAmb: getTxt(infProtEl, "tpAmb"),
      verAplic: getTxt(infProtEl, "verAplic"),
      chNFe: getTxt(infProtEl, "chNFe"),
      dhRecbto: getTxt(infProtEl, "dhRecbto"),
      nProt: getTxt(infProtEl, "nProt"),
      digVal: getTxt(infProtEl, "digVal"),
      cStat: getTxt(infProtEl, "cStat"),
      xMotivo: getTxt(infProtEl, "xMotivo"),
    },
  };
}

// ============================================================
// CT-e Parser
// ============================================================

function parseCte(doc: Document): Cte {
  const infCteEl = getEl(doc.documentElement, "infCte");
  if (!infCteEl) throw new Error("Elemento infCte não encontrado no XML.");

  const protCTeEl = getEl(doc.documentElement, "protCTe");

  return {
    infCte: parseInfCte(infCteEl),
    protCTe: protCTeEl ? parseProtCTe(protCTeEl) : undefined,
  };
}

function parseInfCte(el: Element): InfCte {
  const ideEl = getEl(el, "ide")!;
  const complEl = getEl(el, "compl");
  const emitEl = getEl(el, "emit")!;
  const remEl = getEl(el, "rem");
  const expedEl = getEl(el, "exped");
  const recebEl = getEl(el, "receb");
  const destEl = getEl(el, "dest");
  const vPrestEl = getEl(el, "vPrest")!;
  const impEl = getEl(el, "imp")!;
  const infCTeNormEl = getEl(el, "infCTeNorm");
  const infAdicEl = getEl(el, "infAdic");

  return {
    id: el.getAttribute("Id") || "",
    versao: el.getAttribute("versao") || "",
    ide: parseIdeCte(ideEl),
    compl: complEl ? parseComplCte(complEl) : undefined,
    emit: parseEmitCte(emitEl),
    rem: remEl ? parsePartyCte(remEl) : undefined,
    exped: expedEl ? parsePartyCte(expedEl) : undefined,
    receb: recebEl ? parsePartyCte(recebEl) : undefined,
    dest: destEl ? parsePartyCte(destEl) : undefined,
    vPrest: parseVPrest(vPrestEl),
    imp: parseImpCte(impEl),
    infCTeNorm: infCTeNormEl ? parseInfCTeNorm(infCTeNormEl) : undefined,
    infAdic: infAdicEl ? { infAdFisco: getTxt(infAdicEl, "infAdFisco") || undefined, infCpl: getTxt(infAdicEl, "infCpl") || undefined } : undefined,
  };
}

function parseIdeCte(el: Element): IdeCte {
  return {
    cUF: getTxt(el, "cUF"),
    cCT: getTxt(el, "cCT"),
    CFOP: getTxt(el, "CFOP"),
    natOp: getTxt(el, "natOp"),
    mod: getTxt(el, "mod"),
    serie: getTxt(el, "serie"),
    nCT: getTxt(el, "nCT"),
    dhEmi: getTxt(el, "dhEmi"),
    tpImp: getTxt(el, "tpImp"),
    tpEmis: getTxt(el, "tpEmis"),
    cDV: getTxt(el, "cDV"),
    tpAmb: getTxt(el, "tpAmb"),
    tpCTe: getTxt(el, "tpCTe"),
    procEmi: getTxt(el, "procEmi"),
    verProc: getTxt(el, "verProc"),
    cMunEnv: getTxt(el, "cMunEnv"),
    xMunEnv: getTxt(el, "xMunEnv"),
    UFEnv: getTxt(el, "UFEnv"),
    modal: getTxt(el, "modal"),
    tpServ: getTxt(el, "tpServ"),
    cMunIni: getTxt(el, "cMunIni"),
    xMunIni: getTxt(el, "xMunIni"),
    UFIni: getTxt(el, "UFIni"),
    cMunFim: getTxt(el, "cMunFim"),
    xMunFim: getTxt(el, "xMunFim"),
    UFFim: getTxt(el, "UFFim"),
  };
}

function parseComplCte(el: Element): ComplCte {
  return {
    xCaracAd: getTxt(el, "xCaracAd") || undefined,
    xCaracSer: getTxt(el, "xCaracSer") || undefined,
    xEmi: getTxt(el, "xEmi") || undefined,
    xObs: getTxt(el, "xObs") || undefined,
  };
}

function parseEmitCte(el: Element): EmitCte {
  const enderEl = getEl(el, "enderEmit")!;
  return {
    CNPJ: getTxt(el, "CNPJ"),
    IE: getTxt(el, "IE"),
    xNome: getTxt(el, "xNome"),
    xFant: getTxt(el, "xFant") || undefined,
    enderEmit: parseEndereco(enderEl),
  };
}

function parsePartyCte(el: Element): PartyCte {
  // The address element name varies: enderReme, enderExped, enderReceb, enderDest, etc.
  const enderNames = ["enderReme", "enderExped", "enderReceb", "enderDest", "enderToma"];
  let enderEl: Element | null = null;
  for (const name of enderNames) {
    enderEl = getEl(el, name);
    if (enderEl) break;
  }
  if (!enderEl) {
    // Fallback: try to find any ender* element
    for (let i = 0; i < el.children.length; i++) {
      if (el.children[i].tagName.startsWith("ender")) {
        enderEl = el.children[i];
        break;
      }
    }
  }

  return {
    CNPJ: getTxt(el, "CNPJ") || undefined,
    CPF: getTxt(el, "CPF") || undefined,
    IE: getTxt(el, "IE") || undefined,
    xNome: getTxt(el, "xNome"),
    xFant: getTxt(el, "xFant") || undefined,
    fone: getTxt(el, "fone") || undefined,
    endereco: enderEl ? parseEndereco(enderEl) : { xLgr: "", nro: "", xBairro: "", cMun: "", xMun: "", UF: "", CEP: "" },
    email: getTxt(el, "email") || undefined,
  };
}

function parseVPrest(el: Element): VPrest {
  const compEls = getElAll(el, "Comp");
  return {
    vTPrest: getTxt(el, "vTPrest"),
    vRec: getTxt(el, "vRec"),
    comp: compEls.length > 0 ? compEls.map((c) => ({
      xNome: getTxt(c, "xNome"),
      vComp: getTxt(c, "vComp"),
    })) : undefined,
  };
}

function parseImpCte(el: Element): ImpCte {
  const icmsEl = getEl(el, "ICMS");
  const variant = icmsEl?.children[0];

  const icms: IcmsCte = variant ? {
    CST: getTxt(variant, "CST"),
    vBC: getTxt(variant, "vBC") || undefined,
    pICMS: getTxt(variant, "pICMS") || undefined,
    vICMS: getTxt(variant, "vICMS") || undefined,
    pRedBC: getTxt(variant, "pRedBC") || undefined,
  } : { CST: "" };

  return {
    ICMS: icms,
    vTotTrib: getTxt(el, "vTotTrib") || undefined,
  };
}

function parseInfCTeNorm(el: Element): InfCTeNorm {
  const infCargaEl = getEl(el, "infCarga")!;
  const infDocEl = getEl(el, "infDoc");
  const infModalEl = getEl(el, "infModal");

  return {
    infCarga: parseInfCarga(infCargaEl),
    infDoc: infDocEl ? parseInfDoc(infDocEl) : undefined,
    infModal: infModalEl ? parseInfModal(infModalEl) : undefined,
  };
}

function parseInfCarga(el: Element): InfCarga {
  const infQEls = getElAll(el, "infQ");
  return {
    vCarga: getTxt(el, "vCarga") || undefined,
    proPred: getTxt(el, "proPred"),
    xOutCat: getTxt(el, "xOutCat") || undefined,
    infQ: infQEls.map((q) => ({
      cUnid: getTxt(q, "cUnid"),
      tpMed: getTxt(q, "tpMed"),
      qCarga: getTxt(q, "qCarga"),
    })),
  };
}

function parseInfDoc(el: Element): InfDoc {
  const infNFeEls = getElAll(el, "infNFe");
  const infOutrosEls = getElAll(el, "infOutros");
  return {
    infNFe: infNFeEls.length > 0 ? infNFeEls.map((n) => ({ chave: getTxt(n, "chave") })) : undefined,
    infOutros: infOutrosEls.length > 0 ? infOutrosEls.map((o) => ({
      tpDoc: getTxt(o, "tpDoc"),
      descOutros: getTxt(o, "descOutros") || undefined,
      nDoc: getTxt(o, "nDoc"),
      dEmi: getTxt(o, "dEmi") || undefined,
    })) : undefined,
  };
}

function parseInfModal(el: Element): InfModal {
  const rodoEl = getEl(el, "rodo");
  return {
    versaoModal: el.getAttribute("versaoModal") || "",
    rodo: rodoEl ? { RNTRC: getTxt(rodoEl, "RNTRC") } : undefined,
  };
}

function parseProtCTe(el: Element): ProtCTe {
  const infProtEl = getEl(el, "infProt")!;
  return {
    infProt: {
      tpAmb: getTxt(infProtEl, "tpAmb"),
      verAplic: getTxt(infProtEl, "verAplic"),
      chCTe: getTxt(infProtEl, "chCTe"),
      dhRecbto: getTxt(infProtEl, "dhRecbto"),
      nProt: getTxt(infProtEl, "nProt"),
      digVal: getTxt(infProtEl, "digVal"),
      cStat: getTxt(infProtEl, "cStat"),
      xMotivo: getTxt(infProtEl, "xMotivo"),
    },
  };
}

// ============================================================
// NFS-e Parser
// ============================================================

function parseNfse(doc: Document): CompNfse {
  const root = doc.documentElement;
  const compNfseEl = getEl(root, "CompNfse");
  const container = compNfseEl || root;

  // Handle different tag name casing (Nfse vs NFSe)
  const nfseEl = getEl(container, "Nfse") || getEl(container, "NFSe");
  const searchBase = nfseEl || container;

  const infNfseEl = getEl(searchBase, "InfNfse") || getEl(searchBase, "InfNFSe");
  if (!infNfseEl) {
    throw new Error("Elemento Nfse ou InfNfse não encontrado no XML.");
  }

  return {
    nfse: { infNfse: parseInfNfse(infNfseEl) },
  };
}

function parseInfNfse(el: Element): InfNfse {
  const valoresNfseEl = getEl(el, "ValoresNfse");
  const prestadorEl = getEl(el, "PrestadorServico")!;
  const tomadorEl = getEl(el, "TomadorServico");
  const orgaoEl = getEl(el, "OrgaoGerador");
  const dpsEl = getEl(el, "DeclaracaoPrestacaoServico");
  // Some NFS-e formats have Servico as a direct child of InfNFSe
  const servicoEl = getEl(el, "Servico");

  // Build DPS – either from explicit DPS element or from top-level Servico
  let dps: DeclaracaoPrestacaoServico | undefined;
  if (dpsEl) {
    dps = parseDPS(dpsEl, servicoEl);
  } else if (servicoEl) {
    const identEl = getEl(prestadorEl, "IdentificacaoPrestador");
    dps = {
      infDeclaracaoPrestacaoServico: {
        servico: parseServico(servicoEl),
        prestador: {
          cnpj: identEl ? (getTxt(identEl, "Cnpj") || getTxt(identEl, "CpfCnpj")) : "",
        },
      },
    };
  }

  // Populate valoresNfse – prefer ValoresNfse element, fallback to Servico > Valores
  let valoresNfse: ValoresNfse;
  if (valoresNfseEl) {
    valoresNfse = parseValoresNfse(valoresNfseEl);
  } else if (servicoEl) {
    const valoresEl = getEl(servicoEl, "Valores");
    valoresNfse = valoresEl ? {
      baseCalculo: getTxt(valoresEl, "ValorServicos") || "0",
      aliquota: getTxt(valoresEl, "Aliquota") || undefined,
      valorIss: getTxt(valoresEl, "ValorIss") || undefined,
      valorLiquidoNfse: getTxt(valoresEl, "ValorLiquidoNfse") || "0",
    } : { baseCalculo: "0", valorLiquidoNfse: "0" };
  } else {
    valoresNfse = { baseCalculo: "0", valorLiquidoNfse: "0" };
  }

  return {
    numero: getTxt(el, "Numero"),
    codigoVerificacao: getTxt(el, "CodigoVerificacao"),
    dataEmissao: getTxt(el, "DataEmissao"),
    nfseSubstituida: getTxt(el, "NfseSubstituida") || undefined,
    outrasInformacoes: getTxt(el, "OutrasInformacoes") || undefined,
    valoresNfse,
    prestadorServico: parsePrestador(prestadorEl),
    tomadorServico: tomadorEl ? parseTomador(tomadorEl) : undefined,
    orgaoGerador: orgaoEl ? parseOrgaoGerador(orgaoEl) : undefined,
    declaracaoPrestacaoServico: dps,
  };
}

function parseValoresNfse(el: Element): ValoresNfse {
  return {
    baseCalculo: getTxt(el, "BaseCalculo"),
    aliquota: getTxt(el, "Aliquota") || undefined,
    valorIss: getTxt(el, "ValorIss") || undefined,
    valorLiquidoNfse: getTxt(el, "ValorLiquidoNfse"),
  };
}

function parseEnderecoNfse(el: Element): EnderecoNfse {
  return {
    endereco: getTxt(el, "Endereco") || undefined,
    numero: getTxt(el, "Numero") || undefined,
    complemento: getTxt(el, "Complemento") || undefined,
    bairro: getTxt(el, "Bairro") || undefined,
    codigoMunicipio: getTxt(el, "CodigoMunicipio") || undefined,
    uf: getTxt(el, "Uf") || undefined,
    cep: getTxt(el, "Cep") || undefined,
  };
}

function parseContato(el: Element): Contato {
  return {
    telefone: getTxt(el, "Telefone") || undefined,
    email: getTxt(el, "Email") || undefined,
  };
}

function parsePrestador(el: Element): PrestadorServico {
  const identEl = getEl(el, "IdentificacaoPrestador")!;
  const enderecoEl = getEl(el, "Endereco");
  const contatoEl = getEl(el, "Contato");
  return {
    identificacaoPrestador: {
      cnpj: getTxt(identEl, "Cnpj") || getTxt(identEl, "CpfCnpj"),
      inscricaoMunicipal: getTxt(identEl, "InscricaoMunicipal") || undefined,
    },
    razaoSocial: getTxt(el, "RazaoSocial"),
    nomeFantasia: getTxt(el, "NomeFantasia") || undefined,
    endereco: enderecoEl ? parseEnderecoNfse(enderecoEl) : { },
    contato: contatoEl ? parseContato(contatoEl) : undefined,
  };
}

function parseTomador(el: Element): TomadorServico {
  const identEl = getEl(el, "IdentificacaoTomador");
  const enderecoEl = getEl(el, "Endereco");
  const contatoEl = getEl(el, "Contato");
  return {
    identificacaoTomador: identEl ? {
      cnpj: getTxt(identEl, "Cnpj") || undefined,
      cpf: getTxt(identEl, "Cpf") || undefined,
      inscricaoMunicipal: getTxt(identEl, "InscricaoMunicipal") || undefined,
    } : undefined,
    razaoSocial: getTxt(el, "RazaoSocial"),
    endereco: enderecoEl ? parseEnderecoNfse(enderecoEl) : undefined,
    contato: contatoEl ? parseContato(contatoEl) : undefined,
  };
}

function parseOrgaoGerador(el: Element): OrgaoGerador {
  return {
    codigoMunicipio: getTxt(el, "CodigoMunicipio"),
    uf: getTxt(el, "Uf"),
  };
}

function parseDPS(el: Element, fallbackServicoEl?: Element | null): DeclaracaoPrestacaoServico {
  const infEl = getEl(el, "InfDeclaracaoPrestacaoServico");
  if (!infEl) {
    const svcEl = fallbackServicoEl;
    return {
      infDeclaracaoPrestacaoServico: {
        servico: svcEl ? parseServico(svcEl) : { valores: { valorServicos: "0" }, itemListaServico: "", discriminacao: "", codigoMunicipio: "" },
        prestador: { cnpj: "" },
      },
    };
  }

  const servicoEl = getEl(infEl, "Servico") || fallbackServicoEl;
  const prestadorEl = getEl(infEl, "Prestador");
  const tomadorEl = getEl(infEl, "Tomador");

  return {
    infDeclaracaoPrestacaoServico: {
      competencia: getTxt(infEl, "Competencia") || undefined,
      servico: servicoEl ? parseServico(servicoEl) : { valores: { valorServicos: "0" }, itemListaServico: "", discriminacao: "", codigoMunicipio: "" },
      prestador: prestadorEl ? {
        cnpj: getTxt(prestadorEl, "Cnpj") || getTxt(prestadorEl, "CpfCnpj"),
        inscricaoMunicipal: getTxt(prestadorEl, "InscricaoMunicipal") || undefined,
      } : { cnpj: "" },
      tomador: tomadorEl ? parseTomador(tomadorEl) : undefined,
      optanteSimplesNacional: getTxt(infEl, "OptanteSimplesNacional") || undefined,
      incentivoFiscal: getTxt(infEl, "IncentivoFiscal") || undefined,
    },
  };
}

function parseServico(el: Element): Servico {
  const valoresEl = getEl(el, "Valores")!;
  return {
    valores: parseValoresServico(valoresEl),
    itemListaServico: getTxt(el, "ItemListaServico"),
    codigoCnae: getTxt(el, "CodigoCnae") || undefined,
    codigoTributacaoMunicipio: getTxt(el, "CodigoTributacaoMunicipio") || undefined,
    discriminacao: getTxt(el, "Discriminacao"),
    codigoMunicipio: getTxt(el, "CodigoMunicipio"),
  };
}

function parseValoresServico(el: Element): ValoresServico {
  return {
    valorServicos: getTxt(el, "ValorServicos"),
    valorDeducoes: getTxt(el, "ValorDeducoes") || undefined,
    valorPis: getTxt(el, "ValorPis") || undefined,
    valorCofins: getTxt(el, "ValorCofins") || undefined,
    valorInss: getTxt(el, "ValorInss") || undefined,
    valorIr: getTxt(el, "ValorIr") || undefined,
    valorCsll: getTxt(el, "ValorCsll") || undefined,
    issRetido: getTxt(el, "IssRetido") || undefined,
    valorIss: getTxt(el, "ValorIss") || undefined,
    valorIssRetido: getTxt(el, "ValorIssRetido") || undefined,
    outrasRetencoes: getTxt(el, "OutrasRetencoes") || undefined,
    baseCalculo: getTxt(el, "BaseCalculo") || undefined,
    aliquota: getTxt(el, "Aliquota") || undefined,
    valorLiquidoNfse: getTxt(el, "ValorLiquidoNfse") || undefined,
    descontoIncondicionado: getTxt(el, "DescontoIncondicionado") || undefined,
    descontoCondicionado: getTxt(el, "DescontoCondicionado") || undefined,
  };
}
