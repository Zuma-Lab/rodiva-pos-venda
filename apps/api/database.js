import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile, mkdir } from 'node:fs/promises';

// One interface for embedded PostgreSQL and an external PostgreSQL server.
export async function connectDatabase({ url, path } = {}) {
  if (url) {
    const pool = new pg.Pool({ connectionString: url });
    return {
      query: (sql, params) => pool.query(sql, params),
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn(client);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally { client.release(); }
      },
      close: () => pool.end(),
    };
  }
  if (path) await mkdir(path, { recursive: true, mode: 0o700 });
  const db = new PGlite(path);
  await db.waitReady;
  return {
    query: (sql, params) => db.query(sql, params),
    transaction: fn => db.transaction(fn),
    close: () => db.close(),
  };
}

export async function migrate(db) {
  await db.transaction(async tx => {
    // Advisory lock serializes migration startup across external instances.
    await tx.query('SELECT pg_advisory_xact_lock(837104)');
    await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY)');
    const { rows } = await tx.query('SELECT version FROM schema_migrations WHERE version=1');
    if (!rows.length) {
      const sql = await readFile(new URL('../../database/migrations/001-internal-workflow.sql', import.meta.url), 'utf8');
      // Split only this deliberately simple migration, which has no stored procedures.
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) {
        if (statement.includes('CREATE ROLE rodiva_data')) {
          const roles = (await tx.query("SELECT rolcanlogin,rolsuper,rolbypassrls FROM pg_roles WHERE rolname='rodiva_data'")).rows;
          if (roles.length) {
            if (roles[0].rolcanlogin || roles[0].rolsuper || roles[0].rolbypassrls) throw new Error('rodiva_data must be NOLOGIN, NOSUPERUSER and NOBYPASSRLS.');
            continue;
          }
        }
        await tx.query(statement);
      }
    }
  });
}

export async function tenantTransaction(db, tenantId, fn) {
  return db.transaction(async tx => {
    await tx.query("SELECT set_config('app.tenant_id',$1,true)", [tenantId]);
    await tx.query('SET LOCAL ROLE rodiva_data');
    return fn(tx);
  });
}
