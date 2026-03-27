import type { Endereco } from "./common";

export interface Cte {
  infCte: InfCte;
  protCTe?: ProtCTe;
}

export interface InfCte {
  id: string;
  versao: string;
  ide: IdeCte;
  compl?: ComplCte;
  emit: EmitCte;
  rem?: PartyCte;
  exped?: PartyCte;
  receb?: PartyCte;
  dest?: PartyCte;
  vPrest: VPrest;
  imp: ImpCte;
  infCTeNorm?: InfCTeNorm;
  infAdic?: InfAdicCte;
}

export interface IdeCte {
  cUF: string;
  cCT: string;
  CFOP: string;
  natOp: string;
  mod: string;
  serie: string;
  nCT: string;
  dhEmi: string;
  tpImp: string;
  tpEmis: string;
  cDV: string;
  tpAmb: string;
  tpCTe: string;
  procEmi: string;
  verProc: string;
  cMunEnv: string;
  xMunEnv: string;
  UFEnv: string;
  modal: string;
  tpServ: string;
  cMunIni: string;
  xMunIni: string;
  UFIni: string;
  cMunFim: string;
  xMunFim: string;
  UFFim: string;
}

export interface ComplCte {
  xCaracAd?: string;
  xCaracSer?: string;
  xEmi?: string;
  xObs?: string;
}

export interface EmitCte {
  CNPJ: string;
  IE: string;
  xNome: string;
  xFant?: string;
  enderEmit: Endereco;
}

export interface PartyCte {
  CNPJ?: string;
  CPF?: string;
  IE?: string;
  xNome: string;
  xFant?: string;
  fone?: string;
  endereco: Endereco;
  email?: string;
}

export interface VPrest {
  vTPrest: string;
  vRec: string;
  comp?: CompPrest[];
}

export interface CompPrest {
  xNome: string;
  vComp: string;
}

export interface ImpCte {
  ICMS: IcmsCte;
  vTotTrib?: string;
}

export interface IcmsCte {
  CST: string;
  vBC?: string;
  pICMS?: string;
  vICMS?: string;
  pRedBC?: string;
  vICMSOutraUF?: string;
}

export interface InfCTeNorm {
  infCarga: InfCarga;
  infDoc?: InfDoc;
  infModal?: InfModal;
}

export interface InfCarga {
  vCarga?: string;
  proPred: string;
  xOutCat?: string;
  infQ: InfQ[];
}

export interface InfQ {
  cUnid: string;
  tpMed: string;
  qCarga: string;
}

export interface InfDoc {
  infNFe?: InfNFeRef[];
  infOutros?: InfOutros[];
}

export interface InfNFeRef {
  chave: string;
}

export interface InfOutros {
  tpDoc: string;
  descOutros?: string;
  nDoc: string;
  dEmi?: string;
}

export interface InfModal {
  versaoModal: string;
  rodo?: RodoModal;
}

export interface RodoModal {
  RNTRC: string;
}

export interface InfAdicCte {
  infAdFisco?: string;
  infCpl?: string;
}

export interface ProtCTe {
  infProt: {
    tpAmb: string;
    verAplic: string;
    chCTe: string;
    dhRecbto: string;
    nProt: string;
    digVal: string;
    cStat: string;
    xMotivo: string;
  };
}
