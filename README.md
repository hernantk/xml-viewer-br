# XML Viewer BR

Aplicativo desktop para abrir, interpretar e organizar XMLs fiscais brasileiros localmente. Construído com React, TypeScript, Tauri e Rust, sem exigir o envio dos documentos para um servidor.

## Documentos suportados

- NF-e, com visualização DANFE
- CT-e, com visualização DACTE
- NFS-e nos layouts ABRASF e Padrão Nacional
- XML genérico formatado

## Recursos

- Abertura múltipla, associação de `.xml` e arrastar e soltar
- Histórico local pesquisável por chave, número, CNPJ e nomes
- Fixação e reabertura de documentos recentes
- Exportação para PDF, impressão e conversão em lote para ZIP
- Edição de XML com identificação visual e marca em todas as páginas do PDF
- Informações de lote, rastreabilidade e ANVISA em itens de NF-e
- Verificação local do formato e dígito verificador de chaves NF-e, NFC-e e CT-e
- Consulta assistida de NF-e com certificado digital no Windows
- Tema claro e escuro e atualização automática assinada

## Novidades da v1.5.2

- Restauração do histórico e das configurações antes da inicialização da aplicação
- Arquivos do sistema relidos do disco, evitando snapshots desatualizados
- Cache restrito a imports temporários e rascunhos editados
- Marca `XML EDITADO` repetida em todas as páginas e preservada nas exportações do histórico
- Recontagem automática do lote ao incluir ou remover subpastas
- Tema escuro restaurado corretamente
- Consulta assistida de NF-e exibida somente quando suportada pelo Windows
- Correção do modelo 65 para NFC-e e textos mais precisos no verificador de DV

## Limites de validação

O verificador de chave confere localmente o formato e o dígito verificador. Ele não consulta a SEFAZ e não comprova existência, autorização ou situação fiscal do documento.

A versão atual também não valida XSD, assinatura XMLDSig ou cadeia do certificado. A visualização indica como o conteúdo foi interpretado pelo aplicativo, não substitui uma validação fiscal completa.

## Privacidade e plataforma

Os XMLs são processados localmente. Metadados do histórico e imports sem caminho reabrível são armazenados no perfil da aplicação para permitir restauração após atualizações.

A consulta assistida com certificado digital utiliza o repositório de certificados e o WebView2 do Windows. Os demais recursos desktop são distribuídos para Windows e Linux, conforme a disponibilidade de cada integração nativa.

## Como executar

### Requisitos

- Node.js 18 ou superior
- npm
- Rust toolchain
- Dependências de ambiente do Tauri 2

```bash
npm install
npm run dev
```

Para executar o aplicativo desktop:

```bash
npm run tauri dev
```

Para validar o projeto:

```bash
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Autor e apoio

- https://buymeacoffee.com/hernantk

## Licença

Licenciado sob Apache 2.0. Consulte `LICENSE` para mais detalhes.
