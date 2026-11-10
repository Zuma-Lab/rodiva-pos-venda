# Desenvolvimento

- Leia docs/product/brief.md e docs/architecture/overview.md.
- Use branches feat/<tema>, fix/<tema> e docs/<tema>.
- Inclua propósito, critérios atendidos e evidência de validação no PR.
- Execute npm test e npm run check antes de enviar.
- Não envie credenciais, documentos de clientes, planilhas operacionais ou dados reais em fixtures.
- Autorização pertence ao servidor. tenantId e actorId do domínio representam contexto já autenticado; nunca copiar diretamente do corpo de uma requisição.
- Não ligar uma interface pública ao modelo de dados sem implementar e testar autenticação, permissões e isolamento.
