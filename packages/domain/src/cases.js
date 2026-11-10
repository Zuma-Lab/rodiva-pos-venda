import { randomUUID } from 'node:crypto';

export const transitions = Object.freeze({
  opened: Object.freeze(['awaiting_evidence', 'awaiting_supplier', 'in_service', 'cancelled']),
  awaiting_evidence: Object.freeze(['awaiting_supplier', 'in_service', 'cancelled']),
  awaiting_supplier: Object.freeze(['awaiting_evidence', 'awaiting_part', 'in_service', 'cancelled']),
  awaiting_part: Object.freeze(['awaiting_supplier', 'in_service', 'cancelled']),
  in_service: Object.freeze(['awaiting_part', 'ready', 'cancelled']),
  ready: Object.freeze(['in_service', 'closed', 'cancelled']),
  closed: Object.freeze([]),
  cancelled: Object.freeze([]),
});

function required(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Required: ${field}`);
  return value.trim();
}

function timestamp(value, field) {
  required(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    || !Number.isFinite(Date.parse(value))) throw new Error(`Invalid timestamp: ${field}`);
  const normalized = new Date(value).toISOString();
  if (normalized !== value && normalized !== value.replace('Z', '.000Z')) throw new Error(`Invalid timestamp: ${field}`);
  return normalized;
}

// Context must be created by a trusted authenticated server, not request input.
function identity(context) {
  return {
    tenantId: required(context.tenantId, 'tenantId'),
    actorId: required(context.actorId, 'actorId'),
  };
}

function assignment(input, now) {
  const dueAt = timestamp(input.dueAt, 'dueAt');
  if (Date.parse(dueAt) <= Date.parse(now)) throw new Error('Deadline must be in the future');
  if (!['store', 'supplier', 'service'].includes(input.responsibleParty)) throw new Error('Invalid responsibleParty');
  return {
    responsibleParty: input.responsibleParty,
    assignee: required(input.assignee, 'assignee'),
    nextAction: required(input.nextAction, 'nextAction'), dueAt,
  };
}

export function openCase(input, context, now = new Date().toISOString()) {
  const who = identity(context);
  const at = timestamp(now, 'now');
  const item = {
    id: randomUUID(), tenantId: who.tenantId,
    title: required(input.title, 'title'),
    customerId: required(input.customerId, 'customerId'),
    vehicleId: required(input.vehicleId, 'vehicleId'),
    status: 'opened', version: 1, createdAt: at, updatedAt: at,
    ...assignment(input, at),
    events: [{ id: randomUUID(), type: 'opened', actorId: who.actorId, at, to: 'opened', assignment: assignment(input, at) }],
  };
  return item;
}

export function transitionCase(item, command, context, now = new Date().toISOString()) {
  const who = identity(context);
  if (item.tenantId !== who.tenantId) throw new Error('Case not accessible');
  if (command.expectedVersion !== item.version) throw new Error('Version conflict');
  if (!transitions[item.status]?.includes(command.to)) throw new Error('Transition not allowed');
  const at = timestamp(now, 'now');
  if (Date.parse(at) < Date.parse(item.updatedAt)) throw new Error('Event cannot precede last update');
  const reason = required(command.reason, 'reason');
  const terminal = ['closed', 'cancelled'].includes(command.to);
  const next = terminal
    ? { responsibleParty: null, assignee: null, nextAction: null, dueAt: null }
    : assignment(command, at);
  return {
    ...item, ...next, status: command.to, updatedAt: at, version: item.version + 1,
    events: [...item.events, {
      id: randomUUID(), type: 'transitioned', actorId: who.actorId,
      at, from: item.status, to: command.to, reason, assignment: { ...next },
    }],
  };
}

export function isOverdue(item, now = new Date().toISOString()) {
  const at = timestamp(now, 'now');
  return !['closed', 'cancelled'].includes(item.status) && Date.parse(item.dueAt) < Date.parse(at);
}
