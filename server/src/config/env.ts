import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const ENV = {
  PORT: Number(process.env.PORT || 4000),
  SQLITE_PATH: process.env.SQLITE_PATH || path.resolve(process.cwd(), 'data', 'igicupuri.sqlite3'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(process.cwd(), '..', 'uploads'),
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024 // 50MB
} as const;