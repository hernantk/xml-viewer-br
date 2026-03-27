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
