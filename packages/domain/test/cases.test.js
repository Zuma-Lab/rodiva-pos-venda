import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openCase, transitionCase, isOverdue } from '../src/cases.js';

const now = '2026-11-10T12:00:00.000Z';
const context = { tenantId: 'demo-store', actorId: 'demo-user' };
const input = { title: 'Falha relatada na bateria', customerId: 'customer-demo', vehicleId: 'vehicle-demo', responsibleParty: 'store', assignee: 'Atendimento', nextAction: 'Coletar evidências', dueAt: '2026-11-11T12:00:00.000Z' };
const command = (to, version = 1) => ({ ...input, to, expectedVersion: version, reason: 'Encaminhamento registrado' });

test('abre caso com responsável, prazo e evento de autoria', () => {
  const item = openCase(input, context, now);
  assert.equal(item.status, 'opened');
  assert.equal(item.events[0].actorId, context.actorId);
  assert.equal(item.tenantId, context.tenantId);
});
test('exige próxima ação e rejeita prazo passado ou data impossível', () => {
  for (const patch of [{ nextAction: '' }, { dueAt: now }, { dueAt: '2026-02-30T12:00:00.000Z' }]) {
    assert.throws(() => openCase({ ...input, ...patch }, context, now));
  }
});
test('rejeita acesso de outra empresa', () => {
  const item = openCase(input, context, now);
  assert.throws(() => transitionCase(item, command('awaiting_supplier'), { ...context, tenantId: 'other' }, now), /not accessible/);
});
test('impede encerramento direto sem serviço e entrega preparada', () => {
  assert.throws(() => transitionCase(openCase(input, context, now), command('closed'), context, now), /not allowed/);
});
test('preserva objeto anterior e registra transição', () => {
  const before = openCase(input, context, now);
  const after = transitionCase(before, command('awaiting_supplier'), context, now);
  assert.equal(before.events.length, 1);
  assert.equal(before.status, 'opened');
  assert.equal(after.events.length, 2);
  assert.equal(after.version, 2);
  assert.equal(after.events[1].assignment.nextAction, input.nextAction);
});
test('rejeita atualização obsoleta e evento retroativo', () => {
  const item = openCase(input, context, now);
  assert.throws(() => transitionCase(item, command('in_service', 0), context, now), /Version conflict/);
  assert.throws(() => transitionCase(item, command('in_service'), context, '2026-11-09T12:00:00.000Z'), /precede/);
});
test('conclui fluxo, limpa pendência e bloqueia alteração de caso encerrado', () => {
  let item = openCase(input, context, now);
  for (const to of ['awaiting_supplier', 'awaiting_part', 'in_service', 'ready', 'closed']) {
    item = transitionCase(item, command(to, item.version), context, now);
  }
  assert.equal(item.dueAt, null);
  assert.equal(item.nextAction, null);
  assert.equal(isOverdue(item, '2026-11-20T00:00:00.000Z'), false);
  assert.throws(() => transitionCase(item, command('in_service', item.version), context, now));
});
test('atraso usa o prazo da próxima ação, não uma regra jurídica de garantia', () => {
  const item = openCase(input, context, now);
  assert.equal(isOverdue(item, now), false);
  assert.equal(isOverdue(item, input.dueAt), false);
  assert.equal(isOverdue(item, '2026-11-12T00:00:00.000Z'), true);
});
