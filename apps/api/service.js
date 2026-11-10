import { randomUUID } from 'node:crypto';
import { openCase, transitionCase, isOverdue } from '../../packages/domain/src/cases.js';
import { tenantTransaction } from './database.js';

export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function text(value, field, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new AppError(400, `Confira o campo ${field}.`);
  return value.trim();
}
export function uuid(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) throw new AppError(400, 'Identificador inválido.');
  return value;
}
const optional = (value, label) => value ? text(value, label, 200) : '';
const context = user => ({ tenantId: user.tenant_id, actorId: user.id });

async function saveEvent(tx, item, event) {
  await tx.query('INSERT INTO case_events(tenant_id,case_id,id,actor_id,occurred_at,payload) VALUES($1,$2,$3,$4,$5,$6)',
    [item.tenantId, item.id, event.id, event.actorId, event.at, JSON.stringify({ ...event, revision:item.version })]);
}
function stateWithoutEvents(item) {
  const { events, ...state } = item;
  return JSON.stringify(state);
}
export async function listCustomers(db, user) {
  return tenantTransaction(db, user.tenant_id, async tx => (await tx.query('SELECT id,name,contact FROM customers ORDER BY name LIMIT 500')).rows);
}
export async function addCustomer(db, user, input) {
  const id = randomUUID();
  const name = text(input.name, 'nome');
  const contact = optional(input.contact, 'contato');
  await tenantTransaction(db, user.tenant_id, tx => tx.query('INSERT INTO customers(tenant_id,id,name,contact) VALUES($1,$2,$3,$4)', [user.tenant_id,id,name,contact]));
  return { id,name,contact };
}
export async function listVehicles(db, user) {
  return tenantTransaction(db, user.tenant_id, async tx => (await tx.query(`SELECT v.id,v.customer_id,v.model,v.serial_number,v.battery_serial,c.name AS customer_name
    FROM vehicles v JOIN customers c ON c.tenant_id=v.tenant_id AND c.id=v.customer_id ORDER BY v.model LIMIT 500`)).rows);
}
export async function addVehicle(db, user, input) {
  const id = randomUUID(), customerId = uuid(input.customerId), model = text(input.model,'modelo');
  const serial = optional(input.serialNumber, 'série'), battery = optional(input.batterySerial, 'série da bateria');
  await tenantTransaction(db,user.tenant_id, async tx => {
    if (!(await tx.query('SELECT id FROM customers WHERE id=$1',[customerId])).rows.length) throw new AppError(404,'Cliente não encontrado.');
    await tx.query('INSERT INTO vehicles(tenant_id,id,customer_id,model,serial_number,battery_serial) VALUES($1,$2,$3,$4,$5,$6)', [user.tenant_id,id,customerId,model,serial,battery]);
  });
  return { id,customer_id:customerId,model,serial_number:serial,battery_serial:battery };
}
export async function listCases(db, user) {
  return tenantTransaction(db,user.tenant_id, async tx => {
    const { rows } = await tx.query(`SELECT a.state,c.name AS customer_name,v.model FROM cases a
      JOIN customers c ON c.tenant_id=a.tenant_id AND c.id=a.customer_id
      JOIN vehicles v ON v.tenant_id=a.tenant_id AND v.id=a.vehicle_id ORDER BY a.state->>'createdAt' DESC LIMIT 1000`);
    return rows.map(r => ({ ...r.state,customerName:r.customer_name,model:r.model,overdue:isOverdue(r.state) }));
  });
}
export async function getCase(db, user, id) {
  uuid(id);
  return tenantTransaction(db,user.tenant_id, async tx => {
    const { rows } = await tx.query('SELECT state FROM cases WHERE id=$1',[id]);
    if (!rows.length) throw new AppError(404,'Atendimento não encontrado.');
    const events = (await tx.query("SELECT payload FROM case_events WHERE case_id=$1 ORDER BY (payload->>'revision')::integer",[id])).rows.map(r=>r.payload);
    return { ...rows[0].state, events };
  });
}
export async function addCase(db,user,input) {
  uuid(input.customerId); uuid(input.vehicleId);
  text(input.title,'relato',500); text(input.nextAction,'próxima ação',500); text(input.assignee,'responsável');
  let item;
  try { item = openCase(input,context(user)); } catch { throw new AppError(400,'Confira responsável, próxima ação e prazo futuro.'); }
  await tenantTransaction(db,user.tenant_id, async tx => {
    const { rows } = await tx.query('SELECT id FROM vehicles WHERE id=$1 AND customer_id=$2',[item.vehicleId,item.customerId]);
    if (!rows.length) throw new AppError(404,'Veículo e cliente não encontrados nesta empresa.');
    await tx.query('INSERT INTO cases(tenant_id,id,customer_id,vehicle_id,state,version) VALUES($1,$2,$3,$4,$5,$6)', [item.tenantId,item.id,item.customerId,item.vehicleId,stateWithoutEvents(item),item.version]);
    await saveEvent(tx,item,item.events[0]);
  });
  return item;
}
export async function moveCase(db,user,id,command) {
  uuid(id); text(command.reason,'motivo',1000);
  if (!['closed','cancelled'].includes(command.to)) { text(command.assignee,'responsável'); text(command.nextAction,'próxima ação',500); }
  if (!Number.isInteger(command.expectedVersion)) throw new AppError(400,'Versão inválida.');
  return tenantTransaction(db,user.tenant_id, async tx => {
    const { rows } = await tx.query('SELECT state FROM cases WHERE id=$1 FOR UPDATE',[id]);
    if (!rows.length) throw new AppError(404,'Atendimento não encontrado.');
    const previous = { ...rows[0].state, events:[] };
    if (previous.version !== command.expectedVersion) throw new AppError(409,'O atendimento mudou. Atualize a página antes de continuar.');
    let item;
    try { item = transitionCase(previous,command,context(user)); } catch { throw new AppError(400,'Transição inválida. Confira status, responsável, motivo e prazo futuro.'); }
    const saved = await tx.query('UPDATE cases SET state=$1,version=$2 WHERE tenant_id=$3 AND id=$4 AND version=$5 RETURNING id', [stateWithoutEvents(item),item.version,user.tenant_id,id,command.expectedVersion]);
    if (!saved.rows.length) throw new AppError(409,'Conflito de edição. Atualize o atendimento.');
    await saveEvent(tx,item,item.events[0]);
    return item;
  });
}
