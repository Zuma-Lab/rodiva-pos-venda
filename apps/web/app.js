const $=selector=>document.querySelector(selector);
const labels={opened:'Aberto',awaiting_evidence:'Aguardando documentação',awaiting_supplier:'Aguardando fornecedor',awaiting_part:'Aguardando peça',in_service:'Em atendimento',ready:'Pronto para entrega',closed:'Concluído',cancelled:'Cancelado'};
const allowed={opened:['awaiting_evidence','awaiting_supplier','in_service','cancelled'],awaiting_evidence:['awaiting_supplier','in_service','cancelled'],awaiting_supplier:['awaiting_evidence','awaiting_part','in_service','cancelled'],awaiting_part:['awaiting_supplier','in_service','cancelled'],in_service:['awaiting_part','ready','cancelled'],ready:['in_service','closed','cancelled'],closed:[],cancelled:[]};
const parties={store:'Loja',supplier:'Fornecedor',service:'Assistência'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const badge=status=>`<span class="status-badge status-${escape(status)}">${escape(labels[status]||status)}</span>`;
let session,customers=[],vehicles=[],cases=[],selected,noticeTimer;
async function api(path,{method='GET',data}={}) {
  const response=await fetch(`/api${path}`,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(session?{'X-CSRF-Token':session.csrf}:{})},...(data?{body:JSON.stringify(data)}:{})});
  const result=await response.json();
  if (!response.ok) {
    if(response.status===401 && path!=='/login'){session=null;showLogin();}
    throw new Error(result.error||'Não foi possível concluir.');
  }
  return result;
}
function notify(message){$('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').hidden=true,4500);}
function showLogin(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('#login').hidden=false;$('#workspace').hidden=true;}
function showView(view){$('#queue-view').hidden=view!=='queue';$('#registry-view').hidden=view!=='registry';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
async function load(){
  [customers,vehicles,cases]=await Promise.all([api('/customers'),api('/vehicles'),api('/cases')]);
  renderRegistry();renderQueue();
}
function options(items, label, placeholder){return `<option value="">${escape(placeholder)}</option>`+items.map(x=>`<option value="${escape(x.id)}">${escape(label(x))}</option>`).join('');}
function renderRegistry(){
  for(const selector of ['#vehicle-customer','#case-customer']) $(selector).innerHTML=options(customers,x=>x.name,'Selecione o cliente');
  $('#vehicle-rows').innerHTML=vehicles.map(v=>`<tr><td>${escape(v.customer_name)}</td><td>${escape(v.model)}</td><td>${escape(v.serial_number||'—')}</td><td>${escape(v.battery_serial||'—')}</td></tr>`).join('');
  $('#vehicles-empty').hidden=vehicles.length>0;
  $('#case-vehicle').innerHTML='<option value="">Selecione primeiro o cliente</option>';
}
function renderQueue(){
  const active=cases.filter(c=>!['closed','cancelled'].includes(c.status));
  $('#count-active').textContent=active.length;$('#count-overdue').textContent=active.filter(c=>c.overdue).length;$('#count-supplier').textContent=active.filter(c=>c.status==='awaiting_supplier').length;$('#count-closed').textContent=cases.filter(c=>c.status==='closed').length;
  const search=$('#search').value.toLocaleLowerCase('pt-BR');
  const filtered=cases.filter(c=>(!$('#status-filter').value||c.status===$('#status-filter').value)&&(!$('#party-filter').value||c.responsibleParty===$('#party-filter').value)&&(!$('#overdue-filter').checked||c.overdue)&&`${c.title} ${c.customerName} ${c.model}`.toLocaleLowerCase('pt-BR').includes(search)).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.dueAt||'z').localeCompare(b.dueAt||'z'));
  $('#queue-count').textContent=`${filtered.length} atendimento${filtered.length===1?'':'s'} nesta seleção`;
  $('#case-rows').innerHTML=filtered.map(c=>`<tr><td><strong>${escape(c.title)}</strong><small>${escape(c.customerName)} · ${escape(c.model)}</small></td><td>${badge(c.status)}</td><td><strong>${escape(c.nextAction||'Atendimento encerrado')}</strong></td><td>${escape(c.assignee||'—')}<small>${escape(parties[c.responsibleParty]||'')}</small></td><td class="${c.overdue?'due-overdue':''}">${escape(format(c.dueAt))}${c.overdue?'<small>Prazo vencido</small>':''}</td><td><button class="row-link" data-case="${escape(c.id)}" aria-label="Ver atendimento ${escape(c.title)}">Ver →</button></td></tr>`).join('');
  $('#queue-empty').hidden=filtered.length>0;
  $('#queue-empty h3').textContent=cases.length?'Nenhum atendimento nesta seleção.':'Uma fila clara começa pelo primeiro atendimento.';
  $('#queue-empty p').textContent=cases.length?'Ajuste os filtros para encontrar o atendimento.':'Cadastre o cliente e o veículo, depois defina a próxima ação.';
  $('#empty-registry').hidden=cases.length>0;
}
async function enter(){session=await api('/session');$('#company-name').textContent=session.company;$('#user-name').textContent=session.name;await load();$('#login').hidden=true;$('#workspace').hidden=false;}
async function submit(form,fn){
  const error=form.querySelector('.form-error');error.textContent='';
  const buttons=form.querySelectorAll('button[type="submit"]');buttons.forEach(b=>b.disabled=true);
  try{await fn(Object.fromEntries(new FormData(form)));}catch(e){error.textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}
}
$('#login-form').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,async data=>{await api('/login',{method:'POST',data});await enter();e.target.reset();});});
$('#logout').addEventListener('click',async()=>{try{await api('/logout',{method:'POST'});session=null;customers=[];vehicles=[];cases=[];showLogin();}catch(e){notify(e.message);}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
$('#empty-registry').addEventListener('click',()=>showView('registry'));
for(const [value,label] of Object.entries(labels)) $('#status-filter').insertAdjacentHTML('beforeend',`<option value="${value}">${label}</option>`);
for(const selector of ['#search','#status-filter','#party-filter','#overdue-filter']) $(selector).addEventListener('input',renderQueue);
$('#refresh').addEventListener('click',async e=>{e.target.disabled=true;try{await load();notify('Fila atualizada.');}catch(e){notify(e.message);}finally{e.target.disabled=false;}});
$('#customer-form').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,async data=>{const item=await api('/customers',{method:'POST',data});await load();e.target.reset();$('#vehicle-customer').value=item.id;notify('Cliente cadastrado. Agora você pode adicionar o veículo.');});});
$('#vehicle-form').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,async data=>{await api('/vehicles',{method:'POST',data});await load();e.target.reset();notify('Veículo cadastrado.');});});
$('#new-case').addEventListener('click',()=>{if(!vehicles.length){showView('registry');notify('Cadastre um cliente e um veículo para abrir o atendimento.');return;}$('#case-form').reset();$('#case-form .form-error').textContent='';$('#case-vehicle').innerHTML='<option value="">Selecione primeiro o cliente</option>';$('#case-dialog').showModal();});
$('#case-customer').addEventListener('change',e=>{$('#case-vehicle').innerHTML=options(vehicles.filter(v=>v.customer_id===e.target.value),v=>`${v.model}${v.serial_number?' · '+v.serial_number:''}`,'Selecione o veículo');});
function withDate(data){return {...data,dueAt:data.dueAt?new Date(data.dueAt).toISOString():undefined};}
$('#case-form').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,async data=>{await api('/cases',{method:'POST',data:withDate(data)});$('#case-dialog').close();await load();notify('Atendimento aberto. Próximo passo registrado.');});});
async function detail(id){
  selected=await api(`/cases/${id}`);
  const customer=customers.find(c=>c.id===selected.customerId),vehicle=vehicles.find(v=>v.id===selected.vehicleId);
  $('#detail-title').textContent=selected.title;
  $('#detail-summary').innerHTML=`${badge(selected.status)}<dl class="summary-grid"><div><dt>Cliente / veículo</dt><dd>${escape(customer?.name)} · ${escape(vehicle?.model)}</dd></div><div><dt>Responsável</dt><dd>${escape(selected.assignee||'—')}</dd></div><div><dt>Próxima ação</dt><dd>${escape(selected.nextAction||'Atendimento encerrado')}</dd></div><div><dt>Prazo</dt><dd>${escape(format(selected.dueAt))}</dd></div></dl>`;
  $('#timeline').innerHTML=selected.events.map(event=>`<li><strong>${event.type==='opened'?'Atendimento aberto':escape(labels[event.to])}</strong><small>${escape(format(event.at))}</small>${event.reason?`<p>${escape(event.reason)}</p>`:''}${event.assignment?.nextAction?`<p>Próxima ação: ${escape(event.assignment.nextAction)}</p>`:''}</li>`).join('');
  const choices=allowed[selected.status]||[];
  $('#transition-section').hidden=!choices.length;
  $('#transition-form').reset();$('#transition-form .form-error').textContent='';
  $('#next-status').innerHTML=choices.map(value=>`<option value="${value}">${labels[value]}</option>`).join('');toggleAssignment();
  if(!$('#detail-dialog').open) $('#detail-dialog').showModal();
}
function toggleAssignment(){const terminal=['closed','cancelled'].includes($('#next-status').value);$('#assignment-fields').hidden=terminal;$('#assignment-fields').querySelectorAll('input,select').forEach(input=>{input.disabled=terminal;});}
$('#next-status').addEventListener('change',toggleAssignment);
$('#case-rows').addEventListener('click',async e=>{const button=e.target.closest('[data-case]');if(button){try{await detail(button.dataset.case);}catch(e){notify(e.message);}}});
$('#transition-form').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,async data=>{const id=selected.id;await api(`/cases/${id}/transitions`,{method:'POST',data:{...withDate(data),expectedVersion:selected.version}});await load();await detail(id);notify('Andamento salvo no histórico.');});});
try{await enter();}catch(e){showLogin();if(e.message!=='Entre para acessar sua empresa.')notify(e.message);}
