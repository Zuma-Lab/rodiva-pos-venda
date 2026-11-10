# Rodiva — Pós-venda

Projeto da Zuma Lab. Nome provisório, sem registro de marca confirmado.

**Objetivo:** cada atendimento tem responsável, próxima ação e prazo, do primeiro relato até a solução entre loja, assistência e fornecedor.

## Estado real

Primeiro fluxo interno: login por empresa, clientes e veículos, fila de atendimentos, transições, histórico e persistência PostgreSQL. Interface responsiva e API na mesma aplicação. Não há deploy nem acesso externo nesta versão. Não inserir dados de clientes no repositório.

## Executar

Node.js 24 ou superior. Instale com `npm ci` antes dos comandos abaixo. Para abrir a interface, siga [o primeiro acesso](docs/delivery/run-local.md): não há senha padrão; provisione uma conta antes de `npm start`.

```sh
npm test
npm run check
npm run demo
```

## Organização

```text
apps/                       interface web, API e testes de integração
packages/domain/            regras de atendimento sem dependência de framework
database/                   migrations e proposta histórica
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

Fluxo interno implementado: autenticação → cliente/veículo → atendimento → fila → histórico → encerramento. Testes cobrem RLS, CSRF, concorrência, rollback e persistência após reinício. Adaptador externo precisa de homologação e interação em navegador não foi automatizada nesta entrega. Compartilhamento externo e documentos privados continuam pendentes.

## Colaboração

Uma issue por entrega verificável. Mudanças por branch e pull request; testes antes da revisão. Consulte [CONTRIBUTING.md](CONTRIBUTING.md). Sem licença open source concedida nesta etapa; titularidade e licença serão definidas pela Zuma Lab.
