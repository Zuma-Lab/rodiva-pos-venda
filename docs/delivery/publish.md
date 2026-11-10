# Envio pelo computador pessoal

Pré-requisitos: Git e GitHub CLI. Entre com a conta Zuma-Lab e confirme o login antes de enviar. Não use token de outra conta.

```sh
gh auth login --hostname github.com
gh api user --jq .login
gh auth setup-git
git init -b main
git add .
git commit -m "feat: estruturar Rodiva pós-venda"
git remote add origin https://github.com/Zuma-Lab/rodiva-pos-venda.git
git push -u origin main
```

O login exibido deve ser Zuma-Lab. Se o remoto já tiver conteúdo, revise e integre antes do push; não force. As oito issues estão em github-issues.json para criação depois do envio. Para usar a integração do chat, autorize o aplicativo GitHub para esse repositório com acesso a Contents e Issues.
