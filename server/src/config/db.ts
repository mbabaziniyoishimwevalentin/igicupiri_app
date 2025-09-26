import initSqlJs, { SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { ENV } from './env';

// Ensure database directory exists
const dbDir = path.dirname(ENV.SQLITE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}


console.log('Using SQLite DB at:', ENV.SQLITE_PATH);
// Load SQLite database from file or create new

let dbInstance: any = null;
let SQL: SqlJsStatic | null = null;

async function loadDb(): Promise<any> {
  if (dbInstance) return dbInstance;
  if (!SQL) {
    SQL = await initSqlJs();
  }
  let filebuffer: Uint8Array | undefined;
  if (fs.existsSync(ENV.SQLITE_PATH)) {
    filebuffer = fs.readFileSync(ENV.SQLITE_PATH);
  }
  dbInstance = new SQL.Database(filebuffer);
  dbInstance.run("PRAGMA foreign_keys = ON;");

  // Save database to file on exit
  process.on('exit', () => {
    if (dbInstance) {
      const data = dbInstance.export();
      fs.writeFileSync(ENV.SQLITE_PATH, Buffer.from(data));
    }
  });
  return dbInstance;
}


export async function getDb(): Promise<any> {
  return loadDb();
}

// Initialize schema from schema.sql, converting PostgreSQL syntax to SQLite
export async function initSchema() {
  try {
    const db = await getDb();
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      let sql = fs.readFileSync(schemaPath, 'utf-8');
      // Basic conversions for SQLite
      sql = sql
        .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
        .replace(/TIMESTAMP DEFAULT NOW\(\)/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP');
      db.run(sql);
    }
  } catch (e) {
    console.error('Failed to initialize SQLite schema:', e);
  }
}

function toSqlitePlaceholders(sql: string) {
  // $1,$2,... -> ? and ILIKE -> LIKE COLLATE NOCASE for SQLite (case-insensitive)
  return sql.replace(/\$\d+/g, '?').replace(/\bILIKE\b/gi, 'LIKE COLLATE NOCASE');
}

function expandParams(text: string, params: any[]): any[] {
  // Replicate Postgres-style positional params ($1 reused multiple times)
  const out: any[] = [];
  const re = /\$(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const idx = Number(m[1]) - 1; // $1 -> params[0]
    out.push(params[idx]);
  }
  return out.length ? out : params; // if none found, keep original
}

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  const db = await getDb();
  // Convert SQL and expand params to match number of placeholders
  const sql = toSqlitePlaceholders(text);
  const boundParams = expandParams(text, params);
  const trimmed = sql.trim().toUpperCase();

  // Handle INSERT ... RETURNING id manually for SQLite
  const hasReturningId = /RETURNING\s+ID\b/i.test(sql);

  try {
    if (hasReturningId) {
      const sqlNoReturning = sql.replace(/RETURNING\s+ID\b/gi, '');
      const stmt = db.prepare(sqlNoReturning);
      stmt.run(boundParams);
      // Now get last inserted id
      const idStmt = db.prepare('SELECT last_insert_rowid() AS id');
      idStmt.step();
      const row = idStmt.getAsObject();
      idStmt.free();
      // Always persist after write
      if (db.export) {
        const data = db.export();
        const fs = require('fs');
        fs.writeFileSync(require('./env').ENV.SQLITE_PATH, Buffer.from(data));
      }
      return { rows: [{ id: row.id }] as unknown as T[] };
    }

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
      const stmt = db.prepare(sql);
      stmt.bind(boundParams);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      return { rows };
    }

    const stmt = db.prepare(sql);
    stmt.run(boundParams);
    // Always persist after write
    if (db.export) {
      const data = db.export();
      const fs = require('fs');
      fs.writeFileSync(require('./env').ENV.SQLITE_PATH, Buffer.from(data));
    }
    return { rows: [] as T[] };
  } catch (e) {
    console.error('SQLite query error:', e, { sql, params: boundParams });
    throw e;
  }
}