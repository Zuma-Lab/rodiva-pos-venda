# Arquitetura — primeiro fluxo interno

Monólito modular em Node.js 24, interface HTML/CSS/JS e API na mesma origem. Domínio em packages/domain independente de HTTP e banco.

PostgreSQL: PGlite embutido para desenvolvimento, pg para conexão externa. Testes de RLS rodam no motor PostgreSQL embutido, sem mock de SQL.

## Identidade

Contas provisionadas pela CLI; senhas derivadas com scrypt e salt aleatório. Sessão opaca: token aleatório, hash no banco, expiração em 12 horas, logout com revogação. Cookie HttpOnly/SameSite=Lax e Secure em produção; respostas privadas sem cache.

Todo POST exige Origin configurada; POST autenticado exige token CSRF. Tenant e autor nunca vêm do corpo HTTP. Gestor e atendente têm as mesmas operações internas nesta versão; provisionamento não é exposto via HTTP. Recuperação/troca de senha e MFA ainda não existem.

## Dados

Transações operacionais definem empresa e assumem papel sem BYPASSRLS. Políticas e FKs compostas protegem vínculos. Papel de dados sem acesso a autenticação, UPDATE/DELETE em eventos ou provisionamento. Conexão do servidor ainda privilegiada para autenticação/provisionamento, nunca fornecida ao cliente.

Transição: SELECT FOR UPDATE, validação de versão, UPDATE condicional e evento na mesma transação. Falha de evento reverte o caso. Revisão numérica ordena histórico mesmo com timestamps iguais. Estado corrente em JSONB; custos, fornecedores e bateria com histórico são futuras normalizações.

## Implantação

Entrega local e via PR, sem deploy. Produção exige DATABASE_URL e PUBLIC_ORIGIN HTTPS. Antes de implantar: homologar PostgreSQL externo, TLS/proxy, credenciais, rate limit compartilhado, backups/restauração e monitoramento. Limitador atual é por IP observado e por processo; cabeçalhos X-Forwarded-For não são confiados automaticamente.

Próximos módulos: documentos privados, acesso externo com expiração/revogação, fornecedores, custos e métricas. Não enviar dados operacionais ao GitHub.
