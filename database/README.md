# Persistência

A implementação executável está em migrations/001-internal-workflow.sql, aplicada uma vez sob transação e lock. O arquivo schema-draft.sql pertence à proposta histórica; não aplicar junto das migrations.

Entidades: organizações, usuários, sessões, clientes, veículos, casos e eventos. Estado de atendimento em JSONB, validado pelo domínio. Histórico separado, inserido na mesma transação. FKs compostas impedem vínculos entre empresas. Bateria é um identificador opcional no veículo, sem histórico próprio de substituição nesta entrega.

Toda transação operacional assume rodiva_data, papel NOLOGIN/NOBYPASSRLS. RLS usa contexto confiável de empresa. O papel não pode ler autenticação ou modificar eventos existentes. Usuários e sessões são acessados apenas pelo serviço de autenticação com conexão privilegiada no servidor. Essa credencial nunca pode chegar ao navegador. Separar credenciais de provisionamento/autenticação/dados é uma evolução recomendada antes da implantação gerenciada.

Testes usam PostgreSQL embutido (PGlite), com persistência em disco e papel restrito. O adaptador pg para PostgreSQL externo precisa ser homologado com o provedor escolhido. Backup/restauração, retenção e paginação precisam ser concluídos antes de dados reais em escala. PGlite local admite um processo por diretório.
