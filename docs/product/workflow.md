# Fluxo do atendimento

| Código | Nome na interface | Objetivo |
|---|---|---|
| opened | Aberto | Triar relato e definir ação |
| awaiting_evidence | Aguardando documentação | Reunir informações faltantes |
| awaiting_supplier | Aguardando fornecedor | Receber posicionamento |
| awaiting_part | Aguardando peça | Acompanhar reposição |
| in_service | Em atendimento | Executar procedimento autorizado |
| ready | Pronto para entrega | Conferir resultado e combinar retirada |
| closed | Concluído | Registrar solução |
| cancelled | Cancelado | Registrar motivo |

Transições implementadas: packages/domain/src/cases.js. Aguardando fornecedor não significa garantia aprovada. Procedimentos técnicos e decisão de cobertura dependem de profissional e política aplicável.

No primeiro fluxo interno, uma pessoa autenticada registra o responsável organizacional (loja, fornecedor ou assistência) e o contato/equipe incumbido. Isso não concede acesso ao terceiro. Convites externos serão implementados separadamente.

Tela principal: pendências ordenadas por vencimento, com código do atendimento, veículo, responsável, próxima ação e prazo. Detalhe: dados mínimos, linha do tempo, documentos privados e ações permitidas.
