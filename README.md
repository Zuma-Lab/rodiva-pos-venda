# Rodiva — Pós-venda

Projeto da Zuma Lab. Nome provisório, sem registro de marca confirmado.

**Objetivo:** cada atendimento tem responsável, próxima ação e prazo, do primeiro relato até a solução entre loja, assistência e fornecedor.

## Estado real

Fundação do projeto: documentação, regras executáveis de atendimento, testes e proposta de banco PostgreSQL. Ainda não há interface, API, autenticação, persistência ou produto implantado. Não inserir dados de clientes no repositório.

## Executar

Node.js 24 ou superior. Esta base não tem dependências externas.

```sh
npm test
npm run check
npm run demo
```

## Organização

```text
apps/                       futuros pontos de entrada web e API
packages/domain/            regras de atendimento sem dependência de framework
database/                   modelo relacional proposto; não aplicar em produção
docs/product/               escopo, regras e critérios de aceite
docs/research/              hipóteses e roteiro de campo
docs/architecture/          decisões e limites de segurança
docs/brand/                 direção provisória da marca
docs/delivery/              backlog e sequência de implementação
scripts/                    demonstração com dados fictícios
.github/                    integração contínua e templates
```

Comece pelo [escopo](docs/product/brief.md), pelo [backlog](docs/delivery/backlog.md) e pela [arquitetura](docs/architecture/overview.md).

## Primeira entrega de produto

Autenticação e empresas → cadastro mínimo de cliente/veículo → abrir atendimento → fila de pendências → histórico → encerramento. Compartilhamento externo entra após autorização e isolamento testados.

## Colaboração

Uma issue por entrega verificável. Mudanças por branch e pull request; testes antes da revisão. Consulte [CONTRIBUTING.md](CONTRIBUTING.md). Sem licença open source concedida nesta etapa; titularidade e licença serão definidas pela Zuma Lab.
