import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDatabase,migrate,tenantTransaction } from '../database.js';
import { createAccount,getSession,newSession,hashToken } from '../auth.js';
import { addCustomer,addVehicle,addCase,getCase,moveCase } from '../service.js';
import { createApp } from '../server.js';

let db,server,url,owner,other,customer,vehicle,caseItem,cookie,csrf;
const password='Fake-test-password-2026!';
const origin='http://localhost:3000';
const future=()=>new Date(Date.now()+86400000).toISOString();
const baseInput=()=>({customerId:customer.id,vehicleId:vehicle.id,title:'Relato fictício',responsibleParty:'store',assignee:'Atendimento',nextAction:'Conferir documentação',dueAt:future()});
const userFrom=a=>({id:a.id,tenant_id:a.tenantId,role:'manager'});
before(async()=>{
  db=await connectDatabase();await migrate(db);await migrate(db);
  owner=userFrom(await createAccount(db,{company:'Loja A fictícia',name:'Gestora A',email:'a@example.test',password}));
  other=userFrom(await createAccount(db,{company:'Loja B fictícia',name:'Gestora B',email:'b@example.test',password}));
  customer=await addCustomer(db,owner,{name:'Cliente fictício',contact:'Contato de teste'});
  vehicle=await addVehicle(db,owner,{customerId:customer.id,model:'Modelo fictício',serialNumber:'TEST-001',batterySerial:'BAT-TEST'});
  caseItem=await addCase(db,owner,baseInput());
  server=await createApp({db,origin,logger:{error(){}}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  url=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.close();});
async function http(path,{method='GET',data,auth=true,originHeader=origin,csrfHeader=csrf}={}){
  return fetch(url+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(auth&&cookie?{Cookie:cookie}:{}),...(csrfHeader?{'X-CSRF-Token':csrfHeader}:{}),...(method==='POST'?{Origin:originHeader}:{})},...(data?{body:JSON.stringify(data)}:{})});
}
test('API exige login e rejeita origem externa',async()=>{
  assert.equal((await http('/api/cases',{auth:false})).status,401);
  assert.equal((await http('/api/login',{method:'POST',originHeader:'https://other.invalid',data:{email:'a@example.test',password}})).status,403);
});
test('login genérico, cookie HttpOnly e sessão sem senha ou tenant editável',async()=>{
  const wrong=await http('/api/login',{method:'POST',auth:false,data:{email:'a@example.test',password:'wrong'}});
  assert.equal(wrong.status,401);
  const response=await http('/api/login',{method:'POST',auth:false,data:{email:'a@example.test',password}});
  assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
  cookie=response.headers.get('set-cookie').split(';')[0];
  const session=await(await http('/api/session')).json();csrf=session.csrf;
  assert.equal(session.company,'Loja A fictícia');assert.equal(session.password_hash,undefined);assert.equal(session.tenant_id,undefined);
});
test('bloqueia escrita sem CSRF, preserva empresa do servidor e não aceita vínculo de outra loja',async()=>{
  assert.equal((await http('/api/customers',{method:'POST',csrfHeader:'invalid',data:{name:'Teste'}})).status,403);
  const res=await http('/api/customers',{method:'POST',data:{name:'Nome <script>fictício</script>',tenantId:other.tenant_id}});
  assert.equal(res.status,201);
  const own=await(await http('/api/customers')).json();assert.equal(own.length,2);
  const foreign=await addCustomer(db,other,{name:'Cliente loja B'});
  const invalid=await http('/api/vehicles',{method:'POST',data:{customerId:foreign.id,model:'Não permitido'}});
  assert.equal(invalid.status,404);
});
test('RLS realmente limita leitura, escrita e referências sob papel restrito',async()=>{
  await tenantTransaction(db,other.tenant_id,async tx=>{
    const visible=(await tx.query('SELECT id FROM cases')).rows;
    assert.equal(visible.length,0);
    assert.equal((await tx.query('SELECT id FROM customers WHERE id=$1',[customer.id])).rows.length,0);
  });
  await assert.rejects(()=>tenantTransaction(db,other.tenant_id,tx=>tx.query('INSERT INTO customers(tenant_id,id,name) VALUES($1,$2,$3)',[owner.tenant_id,randomUUID(),'Forbidden'])),/row-level security/);
  await assert.rejects(()=>tenantTransaction(db,other.tenant_id,tx=>tx.query('INSERT INTO vehicles(tenant_id,id,customer_id,model) VALUES($1,$2,$3,$4)',[other.tenant_id,randomUUID(),customer.id,'Forbidden'])),/foreign key/);
  await assert.rejects(()=>tenantTransaction(db,owner.tenant_id,tx=>tx.query('SELECT password_hash FROM app_users')),/permission denied/);
  await tenantTransaction(db,owner.tenant_id,async tx=>{
    const role=(await tx.query('SELECT current_user')).rows[0].current_user;
    assert.equal(role,'rodiva_data');
    assert.equal((await tx.query('SELECT id FROM cases')).rows.length,1);
  });
});
test('histórico transacional, versão obsoleta e rollback se o evento falhar',async()=>{
  const move={...baseInput(),to:'awaiting_supplier',expectedVersion:1,reason:'Documentos reunidos'};
  const result=await moveCase(db,owner,caseItem.id,move);assert.equal(result.version,2);
  await assert.rejects(()=>moveCase(db,owner,caseItem.id,move),e=>e.status===409);
  await assert.rejects(()=>moveCase(db,{...owner,id:randomUUID()},caseItem.id,{...move,to:'in_service',expectedVersion:2}),/foreign key/);
  const saved=await getCase(db,owner,caseItem.id);
  assert.equal(saved.version,2);assert.equal(saved.status,'awaiting_supplier');assert.equal(saved.events.length,2);
  assert.deepEqual(saved.events.map(e=>e.revision),[1,2]);
  await assert.rejects(()=>moveCase(db,{...owner,id:other.id},caseItem.id,{...move,to:'in_service',expectedVersion:2}),/foreign key/);
  await assert.rejects(()=>getCase(db,other,caseItem.id),e=>e.status===404);
});
test('fluxo HTTP cria caso, conclui etapas e devolve conflito sem sobrescrever',async()=>{
  let res=await http('/api/cases',{method:'POST',data:baseInput()});assert.equal(res.status,201);
  let item=await res.json();
  for(const to of ['in_service','ready','closed']){
    res=await http(`/api/cases/${item.id}/transitions`,{method:'POST',data:{...baseInput(),to,reason:'Resultado registrado',expectedVersion:item.version}});
    assert.equal(res.status,200);item=await res.json();
  }
  assert.equal(item.status,'closed');assert.equal(item.nextAction,null);
  assert.equal((await http(`/api/cases/${item.id}/transitions`,{method:'POST',data:{...baseInput(),to:'ready',reason:'Teste',expectedVersion:1}})).status,409);
  const detail=await(await http(`/api/cases/${item.id}`)).json();assert.equal(detail.events.length,4);
});
test('API trata JSON inválido e identificador malformado',async()=>{
  const invalid=await fetch(url+'/api/customers',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},body:'{'});
  assert.equal(invalid.status,400);
  assert.equal((await http('/api/cases/abc')).status,400);
});
test('duas alterações concorrentes preservam uma única versão vencedora',async()=>{
  const created=await addCase(db,owner,baseInput());
  const move={...baseInput(),to:'in_service',expectedVersion:1,reason:'Teste concorrente'};
  const results=await Promise.all([http(`/api/cases/${created.id}/transitions`,{method:'POST',data:move}),http(`/api/cases/${created.id}/transitions`,{method:'POST',data:move})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const saved=await getCase(db,owner,created.id);assert.equal(saved.version,2);assert.equal(saved.events.length,2);
});
test('logout revoga sessão no servidor',async()=>{
  assert.equal((await http('/api/logout',{method:'POST'})).status,200);
  assert.equal(await getSession(db,cookie.split('=')[1]),null);
  assert.equal((await http('/api/cases')).status,401);
});
test('sessão expirada ou usuário desativado não autoriza acesso',async()=>{
  const session=await newSession(db,other.id);
  await db.query("UPDATE sessions SET expires_at=now()-interval '1 minute' WHERE token_hash=$1",[hashToken(session.token)]);
  assert.equal(await getSession(db,session.token),null);
  const another=await newSession(db,other.id);
  await db.query('UPDATE app_users SET active=false WHERE id=$1',[other.id]);
  assert.equal(await getSession(db,another.token),null);
});
test('interface é servida na mesma origem com CSP e tipos corretos',async()=>{
  for (const [path,type] of [['/','text/html'],['/app.js','text/javascript'],['/style.css','text/css']]) {
    const res=await http(path);assert.equal(res.status,200);assert.ok(res.headers.get('content-type').startsWith(type));assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  }
});
test('limita tentativas de login',async()=>{
  let response;
  for(let i=0;i<11;i++) response=await http('/api/login',{method:'POST',auth:false,data:{email:'none@example.test',password:'wrong'}});
  assert.equal(response.status,429);
});
test('persistência local sobrevive ao fechamento e à reabertura do banco',async()=>{
  const path=await mkdtemp(join(tmpdir(),'rodiva-pg-'));
  let first,second;
  try{
    first=await connectDatabase({path:join(path,'nested','postgres')});await migrate(first);
    const account=await createAccount(first,{company:'Persistência fictícia',name:'Teste',email:'persist@example.test',password});
    const u=userFrom(account);
    const c=await addCustomer(first,u,{name:'Cliente persistido'});
    const v=await addVehicle(first,u,{customerId:c.id,model:'Modelo persistido'});
    const item=await addCase(first,u,{...baseInput(),customerId:c.id,vehicleId:v.id});
    await first.close();first=null;
    second=await connectDatabase({path:join(path,'nested','postgres')});await migrate(second);
    const restored=await getCase(second,u,item.id);assert.equal(restored.title,'Relato fictício');assert.equal(restored.events.length,1);
  }finally{if(first)await first.close();if(second)await second.close();await rm(path,{recursive:true,force:true});}
});
