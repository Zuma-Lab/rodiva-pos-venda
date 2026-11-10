import { openCase, transitionCase } from '../packages/domain/src/cases.js';
const now = '2026-11-10T12:00:00.000Z';
const context = { tenantId: 'loja-ficticia', actorId: 'usuario-ficticio' };
const initial = openCase({
  title: 'Veículo demonstrativo — atendimento', customerId: 'cliente-ficticio',
  vehicleId: 'veiculo-ficticio', responsibleParty: 'store', assignee: 'Equipe da loja',
  nextAction: 'Reunir documentos e fotos', dueAt: '2026-11-11T12:00:00.000Z',
}, context, now);
const forwarded = transitionCase(initial, {
  to: 'awaiting_supplier', expectedVersion: initial.version,
  responsibleParty: 'supplier', assignee: 'Fornecedor demonstrativo',
  nextAction: 'Confirmar recebimento do pedido', dueAt: '2026-11-12T12:00:00.000Z',
  reason: 'Documentação reunida pela loja',
}, context, now);
console.log(JSON.stringify(forwarded, null, 2));
