export interface CompNfse {
  nfse: NfseDoc;
}

export interface NfseDoc {
  infNfse: InfNfse;
}

export interface InfNfse {
  numero: string;
  codigoVerificacao: string;
  dataEmissao: string;
  nfseSubstituida?: string;
  outrasInformacoes?: string;
  valoresNfse: ValoresNfse;
  prestadorServico: PrestadorServico;
  tomadorServico?: TomadorServico;
  orgaoGerador?: OrgaoGerador;
  declaracaoPrestacaoServico?: DeclaracaoPrestacaoServico;
}

export interface ValoresNfse {
  baseCalculo: string;
  aliquota?: string;
  valorIss?: string;
  valorLiquidoNfse: string;
}

export interface PrestadorServico {
  identificacaoPrestador: IdentificacaoPrestador;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: EnderecoNfse;
  contato?: Contato;
}

export interface IdentificacaoPrestador {
  cnpj: string;
  inscricaoMunicipal?: string;
}

export interface TomadorServico {
  identificacaoTomador?: IdentificacaoTomador;
  razaoSocial: string;
  endereco?: EnderecoNfse;
  contato?: Contato;
}

export interface IdentificacaoTomador {
  cnpj?: string;
  cpf?: string;
  inscricaoMunicipal?: string;
}

export interface EnderecoNfse {
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  codigoMunicipio?: string;
  uf?: string;
  cep?: string;
}

export interface Contato {
  telefone?: string;
  email?: string;
}

export interface OrgaoGerador {
  codigoMunicipio: string;
  uf: string;
}

export interface DeclaracaoPrestacaoServico {
  infDeclaracaoPrestacaoServico: InfDeclaracaoPrestacaoServico;
}

export interface InfDeclaracaoPrestacaoServico {
  competencia?: string;
  servico: Servico;
  prestador: { cnpj: string; inscricaoMunicipal?: string };
  tomador?: TomadorServico;
  optanteSimplesNacional?: string;
  incentivoFiscal?: string;
}

export interface Servico {
  valores: ValoresServico;
  itemListaServico: string;
  codigoCnae?: string;
  codigoTributacaoMunicipio?: string;
  discriminacao: string;
  codigoMunicipio: string;
}

export interface ValoresServico {
  valorServicos: string;
  valorDeducoes?: string;
  valorPis?: string;
  valorCofins?: string;
  valorInss?: string;
  valorIr?: string;
  valorCsll?: string;
  issRetido?: string;
  valorIss?: string;
  valorIssRetido?: string;
  outrasRetencoes?: string;
  baseCalculo?: string;
  aliquota?: string;
  valorLiquidoNfse?: string;
  descontoIncondicionado?: string;
  descontoCondicionado?: string;
}

// ============================================================
// NFS-e Padrão Nacional (SPED)
// ============================================================

export interface SpedCompNfse {
  infNFSe: SpedInfNfse;
}

export interface SpedInfNfse {
  id: string;
  versao: string;
  nNFSe: string;
  xLocEmi: string;
  xLocPrestacao: string;
  cLocIncid: string;
  xLocIncid: string;
  xTribNac: string;
  verAplic: string;
  ambGer: string;
  tpEmis: string;
  procEmi: string;
  cStat: string;
  dhProc: string;
  nDFSe: string;
  emit: SpedEmit;
  valores: SpedValoresNfse;
  dps?: SpedDps;
}

export interface SpedEmit {
  CNPJ: string;
  xNome: string;
  enderNac: SpedEndereco;
  fone?: string;
  email?: string;
}

export interface SpedEndereco {
  xLgr: string;
  nro: string;
  xCpl?: string;
  xBairro: string;
  cMun: string;
  UF: string;
  CEP: string;
}

export interface SpedValoresNfse {
  vLiq: string;
}

export interface SpedDps {
  infDPS: SpedInfDps;
}

export interface SpedInfDps {
  id: string;
  tpAmb: string;
  dhEmi: string;
  verAplic: string;
  serie: string;
  nDPS: string;
  dCompet: string;
  tpEmit: string;
  cLocEmi: string;
  prest: SpedPrestador;
  toma: SpedTomador;
  serv: SpedServico;
  valores: SpedValoresDps;
}

export interface SpedPrestador {
  CNPJ: string;
  xNome?: string;
  fone?: string;
  email?: string;
  regTrib?: SpedRegTrib;
}

export interface SpedRegTrib {
  opSimpNac: string;
  regApTribSN: string;
  regEspTrib: string;
}

export interface SpedTomador {
  CNPJ?: string;
  CPF?: string;
  xNome: string;
  end?: SpedTomadorEnd;
  email?: string;
}

export interface SpedTomadorEnd {
  endNac: SpedEnderecoNac;
  xLgr: string;
  nro: string;
  xCpl?: string;
  xBairro: string;
}

export interface SpedEnderecoNac {
  cMun: string;
  CEP: string;
}

export interface SpedServico {
  locPrest: SpedLocPrest;
  cServ: SpedCServ;
}

export interface SpedLocPrest {
  cLocPrestacao: string;
}

export interface SpedCServ {
  cTribNac: string;
  xDescServ: string;
}

export interface SpedValoresDps {
  vServPrest: SpedVServPrest;
  trib?: SpedTributos;
}

export interface SpedVServPrest {
  vServ: string;
}

export interface SpedTributos {
  tribMun: SpedTribMun;
  tribFed?: SpedTribFed;
  totTrib?: SpedTotTrib;
}

export interface SpedTribMun {
  tribISSQN: string;
  tpRetISSQN: string;
}

export interface SpedTribFed {
  piscofins: SpedPisCofins;
}

export interface SpedPisCofins {
  CST: string;
}

export interface SpedTotTrib {
  pTotTribSN: string;
}
