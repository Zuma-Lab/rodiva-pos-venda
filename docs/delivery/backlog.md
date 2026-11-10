# Backlog inicial

| ID | Prioridade | Entrega | Dependência |
|---|---|---|---|
| ROD-01 | P0 | Validar fluxo com lojas e fornecedores | nenhuma |
| ROD-02 | P0 | Autenticação, empresas e permissões | arquitetura |
| ROD-03 | P0 | Persistência e isolamento entre empresas | ROD-02 |
| ROD-04 | P0 | Clientes, veículos e baterias | ROD-03 |
| ROD-05 | P0 | Atendimento, fila e linha do tempo | ROD-04 |
| ROD-06 | P1 | Evidências privadas | ROD-02, ROD-05 |
| ROD-07 | P1 | Acesso externo por atendimento | ROD-05, ROD-06 |
| ROD-08 | P1 | Piloto e indicadores operacionais | ROD-01, ROD-05 |

Base entregue: domínio, estrutura, documentação e backlog. Na branch feat/primeiro-fluxo: autenticação, persistência PostgreSQL local, RLS, clientes/veículos e atendimentos com histórico. ROD-02 a ROD-05 têm implementação inicial; faltam homologação externa, revisão da interface em navegador, administração de contas, bateria com histórico próprio e preparação operacional. ROD-01 e ROD-06 a ROD-08 continuam pendentes.

## Sequência

Pesquisa e protótipo podem avançar enquanto autenticação e persistência são implementadas. Primeiro corte funcional interno: criar e acompanhar um caso com histórico persistido. Segundo: evidências. Terceiro: participação externa limitada. Cobrança SaaS após validar uso e custo de suporte.

## Definição de pronto

Critérios de aceite demonstrados, testes proporcionais ao risco, isolamento validado, dados fictícios em exemplos, documentação atualizada e revisão via PR. Deploy, domínios e configuração de serviços não foram realizados.
