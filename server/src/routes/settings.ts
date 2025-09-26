import { Router } from 'express';
import { query } from '../config/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { ENV } from '../config/env';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(requireAuth as any, requireRole(['admin']) as any);

// Get all settings
router.get('/', async (_req, res) => {
  try {
    const result = await query<{ key: string; value: string }>('SELECT key, value FROM settings ORDER BY key');
    const settings: Record<string, string> = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json({ settings });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Update a setting
router.patch('/', async (req, res) => {
  const updates = req.body as Record<string, any>;
  try {
    for (const [k, v] of Object.entries(updates)) {
      await query('INSERT INTO settings(key, value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP', [k, String(v)]);
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Maintenance: backup DB (returns a copy path)
router.post('/backup', async (_req, res) => {
  try {
    const src = ENV.SQLITE_PATH;
    const dir = path.resolve(path.dirname(src));
    const backupPath = path.resolve(dir, `backup-${Date.now()}.sqlite3`);
    fs.copyFileSync(src, backupPath);
    res.json({ ok: true, path: backupPath });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to backup database' }); }
});

// Maintenance: clean temporary uploads
router.post('/clean-temp', async (_req, res) => {
  try {
    const uploadDir = ENV.UPLOAD_DIR;
    let removed = 0;
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const f of files) {
        const full = path.join(uploadDir, f);
        const stat = fs.statSync(full);
        // consider files older than 14 days as temp
        if (Date.now() - stat.mtimeMs > 14 * 24 * 3600 * 1000) {
          try { fs.unlinkSync(full); removed++; } catch {}
        }
      }
    }
    res.json({ ok: true, removed });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to clean temporary files' }); }
});

export default router;