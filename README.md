# XML Viewer BR

Visualizador de XML fiscal brasileiro construído com React, TypeScript e Tauri. O projeto foi criado para abrir, interpretar e exibir documentos fiscais em uma interface desktop moderna, com foco em leitura rápida, navegação local e exportação para PDF.

# Autor e apoio

Se quiser acompanhar ou apoiar o trabalho, acesse:

- https://buymeacoffee.com/hernantk

## Tipos de documento suportados

- NF-e
- CT-e
- NFS-e

## Recursos principais

- Abertura de arquivos XML pelo seletor nativo do sistema
- Suporte a arrastar e soltar arquivos diretamente na janela
- Detecção do tipo de documento com visualização dedicada
- Interface desktop com layout de leitura
- Alternância de tema claro e escuro
- Histórico local de arquivos recentes
- Exportação da visualização para PDF

## Stack do projeto

- React 19
- TypeScript
- Vite
- Tauri 2
- Zustand
- Tailwind CSS
- Rust

## Como executar

### Requisitos para implementar em seu sistema

- Node.js 18+
- npm
- Rust toolchain
- Dependências de ambiente exigidas pelo Tauri 2

```

## Fluxo de uso

1. Abra um arquivo `.xml` pelo app ou arraste o arquivo para a janela.
2. O sistema identifica o tipo de documento.
3. A interface carrega a visualização correspondente.
4. Se necessário, exporte a visualização para PDF.

## Objetivo do projeto

Este repositório serve como base para um visualizador nacional de XML fiscal, com foco em uso local, simplicidade operacional e experiência de leitura. A arquitetura foi organizada para permitir evolução futura em parsing, validação, novos layouts e suporte a outros documentos fiscais.

## Licença

Este projeto está licenciado sob a licença Apache 2.0. Veja o arquivo `LICENSE` para mais detalhes.


