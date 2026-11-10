import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import { getSession, newSession, hashToken, hashPassword, verifyPassword } from './auth.js';
import { AppError, listCustomers, addCustomer, listVehicles, addVehicle, listCases, getCase, addCase, moveCase } from './service.js';

const assets = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/app.js', ['app.js','text/javascript; charset=utf-8']],
  ['/style.css', ['style.css','text/css; charset=utf-8']],
]);
const equal = (a,b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));

export async function createApp({ db, origin = 'http://localhost:3000', secureCookies = false, logger = console } = {}) {
  if (new URL(origin).origin !== origin) throw new Error('PUBLIC_ORIGIN must contain only scheme and host.');
  const dummyHash = await hashPassword('not-an-account-password');
  const loginAttempts = new Map();
  const sessionCookie = token => `rodiva_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${token ? 43200 : 0}${secureCookies ? '; Secure' : ''}`;
  function json(res,status,body,extra={}) {
    res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8',...extra });
    res.end(JSON.stringify(body));
  }
  async function body(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new AppError(415,'Envie os dados em JSON.');
    let raw = '', size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 24_000) throw new AppError(413,'Dados acima do limite permitido.');
      raw += chunk;
    }
    try {
      const data=JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      return data;
    } catch { throw new AppError(400,'Não foi possível ler os dados enviados.'); }
  }
  return createServer(async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; connect-src 'self'");
    try {
      const url = new URL(req.url,'http://internal');
      const method=req.method;
      if (method==='GET' && assets.has(url.pathname)) {
        const [file,type]=assets.get(url.pathname);
        const content=await readFile(new URL(`../web/${file}`,import.meta.url));
        res.writeHead(200,{'Content-Type':type}); res.end(content); return;
      }
      if (method==='GET' && url.pathname==='/health') { json(res,200,{status:'ok'}); return; }
      if (!url.pathname.startsWith('/api/')) throw new AppError(404,'Página não encontrada.');
      if (!['GET','POST'].includes(method)) throw new AppError(405,'Método não permitido.');
      if (method==='POST' && req.headers.origin!==origin) throw new AppError(403,'Origem da requisição não autorizada.');

      if (method==='POST' && url.pathname==='/api/login') {
        // Bounded, per-process limiter. Deployments with replicas need a shared limiter.
        const now=Date.now();
        for (const [key,value] of loginAttempts) if (value.until<=now) loginAttempts.delete(key);
        const key=req.socket.remoteAddress || 'unknown';
        const current=loginAttempts.get(key) || {count:0,until:now+15*60*1000};
        if (current.count>=10 || loginAttempts.size>=10000) throw new AppError(429,'Muitas tentativas. Aguarde alguns minutos.');
        current.count++; loginAttempts.set(key,current);
        const input=await body(req);
        const email=typeof input.email==='string' ? input.email.trim().toLowerCase().slice(0,254) : '';
        const {rows}=await db.query('SELECT id,password_hash,active FROM app_users WHERE email=$1',[email]);
        const user=rows[0];
        const valid=await verifyPassword(input.password,user?.password_hash || dummyHash);
        if (!user?.active || !valid) throw new AppError(401,'E-mail ou senha inválidos.');
        const session=await newSession(db,user.id);
        json(res,200,{ok:true},{'Set-Cookie':sessionCookie(session.token)}); return;
      }
      const cookie=(req.headers.cookie || '').split(';').map(v=>v.trim()).find(v=>v.startsWith('rodiva_session='));
      const token=cookie?.slice('rodiva_session='.length);
      const user=await getSession(db,token);
      if (!user) throw new AppError(401,'Entre para acessar sua empresa.');
      if (method==='GET' && url.pathname==='/api/session') {
        json(res,200,{name:user.name,company:user.company,role:user.role,csrf:user.csrf_token}); return;
      }
      if (method==='POST' && !equal(req.headers['x-csrf-token'],user.csrf_token)) throw new AppError(403,'Sessão de formulário inválida. Atualize a página.');
      if (method==='POST' && url.pathname==='/api/logout') {
        await db.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(token)]);
        json(res,200,{ok:true},{'Set-Cookie':sessionCookie('')}); return;
      }
      if (!['manager','attendant'].includes(user.role)) throw new AppError(403,'Acesso não permitido.');
      const routes={
        '/api/customers':[listCustomers,addCustomer],
        '/api/vehicles':[listVehicles,addVehicle],
        '/api/cases':[listCases,addCase],
      };
      if (routes[url.pathname]) {
        const [list,create]=routes[url.pathname];
        json(res,method==='GET'?200:201,method==='GET'?await list(db,user):await create(db,user,await body(req))); return;
      }
      const match=url.pathname.match(/^\/api\/cases\/([a-f\d-]+)(\/transitions)?$/i);
      if (match && method==='GET' && !match[2]) { json(res,200,await getCase(db,user,match[1])); return; }
      if (match && method==='POST' && match[2]) { json(res,200,await moveCase(db,user,match[1],await body(req))); return; }
      throw new AppError(404,'Recurso não encontrado.');
    } catch(error) {
      const status=error instanceof AppError ? error.status : 500;
      if (status===500) logger.error('Request failed', {code:error.code || 'INTERNAL_ERROR'});
      if (!res.headersSent) json(res,status,{error:status===500?'Não foi possível concluir. Tente novamente.':error.message});
      else res.end();
    }
  });
}
