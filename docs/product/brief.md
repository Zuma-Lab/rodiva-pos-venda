# Produto e escopo inicial

## Problema a validar

Lojas, assistências e fornecedores podem perder informações e tempo ao coordenar atendimentos de pós-venda. Precisamos comprovar frequência, impacto e disposição a pagar com casos reais. Diferenciação ainda é hipótese; concorrentes já anunciam recursos de OS e garantia.

## Público inicial

Lojas independentes de mobilidade elétrica que precisam coordenar pós-venda com fornecedores. Comprador: dono ou gestor da operação. Usuários: atendimento e assistência. Fornecedores e consumidores receberão acesso limitado por atendimento em etapa posterior.

## Promessa

Cada atendimento tem responsável, próxima ação, prazo e histórico até sua solução.

## MVP

1. Autenticação, empresa e permissões.
2. Clientes, fornecedores e veículo, com série/chassi quando aplicável; bateria identificável separadamente.
3. Abrir atendimento com relato, responsável e próxima ação.
4. Fila filtrável por status, responsável, prazo e fornecedor.
5. Evidências e documentos privados.
6. Transições e histórico auditável.
7. Encerramento com motivo e custos registrados separadamente quando implementados.

ERP completo, emissão fiscal, diagnóstico automatizado, aprovação automática de garantia, marketplace e IA ficam fora do MVP. CRM comercial e migração integral da planilha serão avaliados depois do piloto.

## Aceite do primeiro fluxo

- Atendente autenticado abre um caso para cliente e veículo da mesma empresa.
- Caso ativo sempre tem responsável, próxima ação e prazo futuro ao ser atribuído.
- Encaminhamentos exigem motivo; o histórico preserva autor e data.
- Duas edições simultâneas geram conflito explícito; persistência deve usar versão em UPDATE condicional.
- Caso concluído não recebe novas transições nesta versão. Reabertura é decisão futura.
- Empresa A não consegue consultar ou alterar empresa B.
- Compartilhamento externo não libera documentos ou anotações internas por padrão.

## Indicadores propostos

Casos abertos, pendências vencidas, tempo até primeira resposta, tempo até solução e custo por caso. Distinguir fornecedor, loja e assistência na atribuição de espera. Taxa de defeitos por modelo exige quantidade vendida e período comparável; contagem bruta não mede qualidade.

Prazo da próxima ação é operacional; não representa prazo legal ou decisão sobre cobertura de garantia.
