import { connectDatabase, migrate } from './database.js';
import { createApp } from './server.js';

const port=Number(process.env.PORT || 3000);
const host=process.env.HOST || '127.0.0.1';
const origin=process.env.PUBLIC_ORIGIN || `http://localhost:${port}`;
const production=process.env.NODE_ENV==='production';
if (production && (!process.env.DATABASE_URL || !origin.startsWith('https://'))) throw new Error('Production requires DATABASE_URL and HTTPS PUBLIC_ORIGIN.');
const db=await connectDatabase({url:process.env.DATABASE_URL,path:process.env.DATA_DIR || './.data/postgres'});
await migrate(db);
const app=await createApp({db,origin,secureCookies:production});
app.listen(port,host,()=>console.log(`Rodiva disponível em ${origin}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>app.close(async()=>{await db.close();process.exit(0);}));
