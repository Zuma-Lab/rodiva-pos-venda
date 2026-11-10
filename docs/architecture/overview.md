# Arquitetura inicial

## Decisões

- Monorepositório e monólito modular na primeira aplicação.
- Domínio JavaScript ESM executável em Node 24, sem dependências externas. Tipagem adicional poderá ser adotada na aplicação.
- PostgreSQL proposto para persistência relacional.
- Interface responsiva e API são próximas entregas; não foram criadas nesta fundação.

## Limites

Funções do domínio recebem contexto confiável. Não autenticam usuário nem verificam vínculo do cliente/veículo no banco. A camada de aplicação deverá fazer essas validações e confirmar permissão antes de executar comandos.

O domínio cria UUID, valida transição e versão, exige motivo e retorna um novo estado com evento. Não há banco em memória simulando produção.

Persistência: carregar com tenant, validar versão, executar UPDATE com tenant_id + id + version anterior e inserir evento na mesma transação. Zero linhas alteradas significa conflito. Não basta verificar versão apenas em JavaScript.

## Isolamento

Todo registro operacional leva tenant_id. Chaves estrangeiras compostas impedem referências entre empresas. Uma entidade cliente pertence à loja, não é um cadastro global compartilhado entre assinantes.

O SQL em database/schema-draft.sql é proposta não executada. RLS está habilitada sem políticas: acesso por papéis comuns deve falhar fechado. Antes do uso, implementar memberships, papéis e políticas com testes em PostgreSQL real. Não usar superusuário ou papel BYPASSRLS na API.

## Arquivos e acesso externo

Armazenamento privado por empresa. Links temporários, tamanho/tipo limitados e verificação de arquivos. Anotações internas separadas de mensagens públicas. Convites por caso com escopo, expiração e revogação; tokens armazenados como hash. Nenhum desses mecanismos foi implementado ainda.

## Operação

Ambientes separados de desenvolvimento, homologação e produção. Credenciais fora do Git; logs sem documentos e contatos pessoais. Backup e restauração devem ser exercitados antes do piloto. Definir retenção, tratamento de dados e processo de incidente.

Referências: [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [guia ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-guia-de-seguranca-para-agentes-de-tratamento-de-pequeno-porte).
