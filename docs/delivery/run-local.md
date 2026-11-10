# Executar o primeiro fluxo

Node.js 24+, Git e terminal. Modo local: PostgreSQL embutido persistido em .data/postgres, sem contratar banco. Exemplos em Bash; em outros terminais configure as mesmas variáveis.

```sh
git clone https://github.com/Zuma-Lab/rodiva-pos-venda.git
cd rodiva-pos-venda
git switch feat/primeiro-fluxo
npm ci
```

## Primeiro acesso

Com o servidor parado, leia a senha sem exibi-la:

```sh
read -r -s -p 'Senha inicial (mínimo 12 caracteres): ' RODIVA_INITIAL_PASSWORD
export RODIVA_INITIAL_PASSWORD
npm run account -- --company 'Minha loja' --name 'Gestor' --email 'gestor@minhaloja.com.br'
unset RODIVA_INITIAL_PASSWORD
npm start
```

Abra http://localhost:3000 e use o e-mail e a senha definidos. Não há senha padrão, cadastro público nem credencial real no repositório. Provisionamento imprime o UUID da empresa, nunca a senha.

Para outro usuário da mesma empresa, pare o servidor, configure outra senha em RODIVA_INITIAL_PASSWORD e execute:

```sh
npm run account -- --tenant 'UUID_DA_EMPRESA' --name 'Atendente' --email 'atendimento@minhaloja.com.br' --role attendant
```

Gestores e atendentes operam cadastros e atendimentos nesta versão. Administração de contas, troca e recuperação de senha não têm interface ainda. Não passe senhas como argumento CLI.

## Caminho de uso

1. Entre na empresa.
2. Em Clientes e veículos, cadastre cliente e veículo. Série e bateria são opcionais.
3. Abra atendimento com relato, responsável, próxima ação e prazo futuro.
4. Abra os detalhes e registre andamento com motivo.
5. Em atendimento → Pronto para entrega → Concluído finaliza o fluxo. Cancelamento exige motivo.
6. Saia, entre e reinicie o servidor para conferir persistência.

Datas em UTC, exibidas no fuso do navegador. Prazos são da próxima ação operacional, não uma decisão jurídica sobre cobertura de garantia.

## Limites locais

Um processo por diretório PGlite: pare o servidor antes de provisionar contas. .data contém informações privadas e fica fora do Git. Backup local com processo parado; restauração operacional ainda deve ser exercitada antes de dados reais.

Limites por consulta: 500 clientes, 500 veículos e 1.000 casos, sem paginação. Indicadores descrevem os casos carregados. Este corte é para teste pequeno, sem operação em escala.

## PostgreSQL externo

Configure DATABASE_URL com banco dedicado vazio e PUBLIC_ORIGIN com a origem exata. Conta de conexão precisa criar tabelas, políticas e papel rodiva_data, e poder assumi-lo. Ela é privilegiada e deve ficar apenas no servidor. Papel de dados é NOLOGIN e não lê autenticação. Homologar adaptador com o provedor antes de produção.

Não aplicar schema-draft.sql. As migrations estão em database/migrations/. Em produção, NODE_ENV=production exige banco externo e PUBLIC_ORIGIN HTTPS, e ativa cookie Secure. Modo embutido é bloqueado. TLS/proxy, backups, rate limit compartilhado e recuperação de senha são tarefas de implantação futuras. Não houve deploy nesta entrega.

## Verificação

```sh
npm run check
npm test
```

Testes: HTTP, login, CSRF, papel restrito/RLS, referências entre empresas, concorrência, rollback e persistência após reinício. Interface revisada no código; interação em navegador não automatizada nesta entrega.
