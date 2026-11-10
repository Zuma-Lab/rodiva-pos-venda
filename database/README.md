# Modelo de dados proposto

schema-draft.sql documenta a primeira persistência; não é uma migração pronta para produção e não foi executado em PostgreSQL nesta etapa.

Entidades: empresas, clientes, veículos, baterias, atendimentos e eventos. Fornecedores, custos, anexos, memberships, convites e assinatura SaaS entram em migrações posteriores.

Antes de aplicar: implementar política de acesso, regras de autorização, transação caso/evento, imutabilidade de eventos, índices de consulta, migrations versionadas, backup e testes de isolamento em PostgreSQL. RLS sem políticas bloqueia papéis comuns deliberadamente; não contornar usando superusuário na aplicação.
