import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function walk(path) {
  for (const entry of await readdir(path,{withFileTypes:true})) {
    const file=`${path}/${entry.name}`;
    if(entry.isDirectory()) await walk(file);
    else if(file.endsWith('.js')) {
      const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
      if(result.status!==0) process.exit(result.status||1);
    }
  }
}
for(const dir of ['apps','packages','scripts']) await walk(dir);
