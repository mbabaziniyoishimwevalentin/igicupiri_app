import path from 'path'import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const IS_RENDER = !!process.env.RENDER;

// Determine persistent, writable paths with sensible fallbacks.
// If explicit env vars are provided, they take precedence.
function pickWritableFilePath(explicit: string | undefined, candidates: string[]): string {
  if (explicit) return explicit;
  for (const p of candidates) {
    const dir = path.dirname(p);
    try {
      fs.mkdirSync(dir, { recursive: true });
      return p;
    } catch { /* not writable, try next */ }
  }
  // Fallback to last candidate even if not writable; downstream code may handle it.
  return candidates[candidates.length - 1];
}

function pickWritableDir(explicit: string | undefined, candidates: string[]): string {
  if (explicit) return explicit;
  for (const d of candidates) {
    try {
      fs.mkdirSync(d, { recursive: true });
      return d;
    } catch { /* not writable, try next */ }
  }
  return candidates[candidates.length - 1];
}

const DEFAULT_SQLITE_PATH = pickWritableFilePath(
  process.env.SQLITE_PATH,
  [
    IS_RENDER ? '/var/data/igicupuri.sqlite3' : path.resolve(process.cwd(), 'data', 'igicupuri.sqlite3'),
    IS_RENDER ? '/tmp/igicupuri/igicupuri.sqlite3' : path.resolve(process.cwd(), 'data', 'igicupuri.sqlite3'),
  ]
);

const DEFAULT_UPLOAD_DIR = pickWritableDir(
  process.env.UPLOAD_DIR,
  [
    IS_RENDER ? '/var/data/uploads' : path.resolve(process.cwd(), '..', 'uploads'),
    IS_RENDER ? '/tmp/igicupuri/uploads' : path.resolve(process.cwd(), '..', 'uploads'),
  ]
);

export const ENV = {
  PORT: Number(process.env.PORT || 4000),
  SQLITE_PATH: DEFAULT_SQLITE_PATH,
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  UPLOAD_DIR: DEFAULT_UPLOAD_DIR,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024 // 50MB
} as const;