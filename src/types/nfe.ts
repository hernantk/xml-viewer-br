import type { Endereco } from "./common";

export interface Nfe {
  infNFe: InfNFe;
  protNFe?: ProtNFe;
}

export interface InfNFe {
  id: string;
  versao: string;
  ide: Ide;
  emit: Emit;
  dest?: Dest;
  det: Det[];
  total: Total;
  transp: Transp;
  cobr?: Cobr;
  pag: Pag;
  infAdic?: InfAdic;
}

export interface Ide {
  cUF: string;
  cNF: string;
  natOp: string;
  mod: string;
  serie: string;
  nNF: string;
  dhEmi: string;
  dhSaiEnt?: string;
  tpNF: string;
  idDest: string;
  cMunFG: string;
  tpImp: string;
  tpEmis: string;
  cDV: string;
  tpAmb: string;
  finNFe: string;
  indFinal: string;
  indPres: string;
  procEmi: string;
  verProc: string;
}

export interface Emit {
  CNPJ?: string;
  CPF?: string;
  xNome: string;
  xFant?: string;
  enderEmit: Endereco;
  IE: string;
  CRT: string;
  CNAE?: string;
}

export interface Dest {
  CNPJ?: string;
  CPF?: string;
  xNome: string;
  enderDest?: Endereco;
  indIEDest: string;
  IE?: string;
  email?: string;
}

export interface Det {
  nItem: string;
  prod: Prod;
  imposto: Imposto;
}

export interface Prod {
  cProd: string;
  cEAN: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  uCom: string;
  qCom: string;
  vUnCom: string;
  vProd: string;
  cEANTrib: string;
  uTrib: string;
  qTrib: string;
  vUnTrib: string;
  indTot: string;
  vFrete?: string;
  vSeg?: string;
  vDesc?: string;
  vOutro?: string;
}

export interface Imposto {
  vTotTrib?: string;
  ICMS?: IcmsGroup;
  IPI?: IpiGroup;
  PIS?: PisGroup;
  COFINS?: CofinsGroup;
}

export interface IcmsGroup {
  orig: string;
  CST?: string;
  CSOSN?: string;
  vBC?: string;
  pICMS?: string;
  vICMS?: string;
  vBCST?: string;
  pICMSST?: string;
  vICMSST?: string;
}

export interface IpiGroup {
  CST?: string;
  vBC?: string;
  pIPI?: string;
  vIPI?: string;
}

export interface PisGroup {
  CST: string;
  vBC?: string;
  pPIS?: string;
  vPIS?: string;
}

export interface CofinsGroup {
  CST: string;
  vBC?: string;
  pCOFINS?: string;
  vCOFINS?: string;
}

export interface Total {
  ICMSTot: ICMSTot;
}

export interface ICMSTot {
  vBC: string;
  vICMS: string;
  vICMSDeson: string;
  vFCP: string;
  vBCST: string;
  vST: string;
  vFCPST: string;
  vFCPSTRet: string;
  vProd: string;
  vFrete: string;
  vSeg: string;
  vDesc: string;
  vII: string;
  vIPI: string;
  vIPIDevol: string;
  vPIS: string;
  vCOFINS: string;
  vOutro: string;
  vNF: string;
  vTotTrib?: string;
}

export interface Transp {
  modFrete: string;
  transporta?: Transporta;
  vol?: Vol[];
}

export interface Transporta {
  CNPJ?: string;
  CPF?: string;
  xNome?: string;
  IE?: string;
  xEnder?: string;
  xMun?: string;
  UF?: string;
}

export interface Vol {
  qVol?: string;
  esp?: string;
  marca?: string;
  nVol?: string;
  pesoL?: string;
  pesoB?: string;
}

export interface Cobr {
  fat?: Fatura;
  dup?: Duplicata[];
}

export interface Fatura {
  nFat?: string;
  vOrig?: string;
  vDesc?: string;
  vLiq?: string;
}

export interface Duplicata {
  nDup: string;
  dVenc: string;
  vDup: string;
}

export interface Pag {
  detPag: DetPag[];
}

export interface DetPag {
  tPag: string;
  vPag: string;
}

export interface InfAdic {
  infAdFisco?: string;
  infCpl?: string;
}

export interface ProtNFe {
  infProt: InfProt;
}

export interface InfProt {
  tpAmb: string;
  verAplic: string;
  chNFe: string;
  dhRecbto: string;
  nProt: string;
  digVal: string;
  cStat: string;
  xMotivo: string;
}
