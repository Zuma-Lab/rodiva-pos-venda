import { parseArgs } from 'node:util';
import { connectDatabase, migrate } from '../apps/api/database.js';
import { createAccount } from '../apps/api/auth.js';
const {values}=parseArgs({options:{company:{type:'string'},name:{type:'string'},email:{type:'string'},tenant:{type:'string'},role:{type:'string',default:'manager'}}});
const password=process.env.RODIVA_INITIAL_PASSWORD;
if (!password) throw new Error('Defina RODIVA_INITIAL_PASSWORD no ambiente local. Não passe a senha em argumentos nem a salve no Git.');
const db=await connectDatabase({url:process.env.DATABASE_URL,path:process.env.DATA_DIR || './.data/postgres'});
try {
  await migrate(db);
  const account=await createAccount(db,{company:values.company,name:values.name,email:values.email,tenantId:values.tenant,role:values.role,password});
  console.log(`Conta criada. Empresa: ${account.tenantId}. Perfil: ${values.role}.`);
} finally {await db.close();}
