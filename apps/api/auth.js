import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const hashToken = value => createHash('sha256').update(value).digest('hex');

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('Use uma senha entre 12 e 256 caracteres.');
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const [salt, expected] = encoded.split(':');
  const actual = await derive(password, salt, 64);
  const bytes = Buffer.from(expected, 'hex');
  return bytes.length === actual.length && timingSafeEqual(bytes, actual);
}

export async function createAccount(db, { company, name, email, password, role = 'manager', tenantId }) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('E-mail inválido.');
  if (!name?.trim() || name.length > 160 || (!tenantId && (!company?.trim() || company.length > 160))) throw new Error('Informe nome e empresa.');
  if (!['manager','attendant'].includes(role)) throw new Error('Perfil inválido.');
  const passwordHash = await hashPassword(password);
  return db.transaction(async tx => {
    const tenant = tenantId || randomUUID();
    if (!tenantId) await tx.query('INSERT INTO organizations(id,name) VALUES ($1,$2)', [tenant, company.trim()]);
    const id = randomUUID();
    await tx.query('INSERT INTO app_users(id,tenant_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5,$6)', [id, tenant, name.trim(), normalized, passwordHash, role]);
    return { id, tenantId: tenant, email: normalized };
  });
}

export async function newSession(db, userId) {
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await db.query('DELETE FROM sessions WHERE expires_at <= now()');
  await db.query('INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,$4)', [hashToken(token), userId, csrf, expiresAt]);
  return { token, csrf };
}

export async function getSession(db, token) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { rows } = await db.query(`SELECT u.id, u.tenant_id, u.name, u.role, o.name AS company, s.csrf_token
    FROM sessions s JOIN app_users u ON u.id=s.user_id JOIN organizations o ON o.id=u.tenant_id
    WHERE s.token_hash=$1 AND s.expires_at > now() AND u.active=true`, [hashToken(token)]);
  return rows[0] || null;
}
