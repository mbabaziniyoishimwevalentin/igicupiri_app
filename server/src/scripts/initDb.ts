import fs from 'fs';
import path from 'path';
import { query } from '../config/db';

async function main(){
  const sqlPath = path.resolve(__dirname, '..', 'config', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  // Split SQL into individual statements and execute them
  const statements = sql.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await query(statement.trim());
    }
  }
  
  console.log('Database initialized');
}

main().then(()=>process.exit(0)).catch((e)=>{console.error(e); process.exit(1)});