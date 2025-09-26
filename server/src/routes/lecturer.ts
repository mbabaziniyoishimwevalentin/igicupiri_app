import { Router } from 'express';
import { query } from '../config/db';
import { requireAuth, requireRole } from '../middleware/auth';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

const router = Router();
router.use(requireAuth as any, requireRole(['lecturer','admin']) as any);

// Get a single paper by id (owned by current user)
router.get('/papers/:id', async (req: any, res) => {
  const id = Number(req.params.id);
  try {
    const result = await query(
      `SELECT id, title, course, module, year, semester, exam_type AS "examType", category AS "category", status, created_at, file_path, file_type, file_size, uploaded_by
       FROM papers WHERE id=$1 AND uploaded_by=$2`,
      [id, req.user!.id]
    );
    if (!result.rows || !result.rows[0]) return res.status(404).json({ error: 'Paper not found' });
    res.json(result.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Ensure upload directory exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ENV.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: ENV.MAX_FILE_SIZE_BYTES } });

// Upload a new paper
router.post('/papers', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    const { title, course, module, year, semester, examType, category, department } = req.body as Record<string,string>;
    if (!title || !course || !module || !year || !semester || !examType || !category) {
      // delete temp file if validation fails
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype || 'application/octet-stream';
    const fileSize = req.file.size;

    const result = await query<{ id:number }>(
      `INSERT INTO papers(title, course, module, year, semester, exam_type, category, uploaded_by, file_path, file_type, file_size, status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [title, course, module, year, semester, examType, category, req.user!.id, filePath, fileType, fileSize, 'published']
    );
    // Debug log insert result
    console.log('Insert result:', result);
    if (!result.rows || !result.rows[0] || !result.rows[0].id) {
      console.error('Insert failed or missing id:', result);
      return res.status(500).json({ error: 'Failed to insert paper (no id returned)' });
    }
    // Fetch the inserted paper to return full object
    const paperResult = await query(
      `SELECT id, title, course, module, year, semester, exam_type AS "examType", category AS "category", status, created_at, file_path, file_type, file_size, uploaded_by
       FROM papers WHERE id=$1`,
      [result.rows[0].id]
    );
    if (!paperResult.rows || !paperResult.rows[0]) {
      console.error('Paper fetch failed after insert:', paperResult);
      return res.status(500).json({ error: 'Failed to fetch inserted paper' });
    }
    res.json({ ok: true, paper: paperResult.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// List my uploads
router.get('/papers', async (req: any, res) => {
  try {
    const result = await query(
      `SELECT id, title, course, module, year, semester, exam_type AS "examType", category AS "category", status, created_at
       FROM papers WHERE uploaded_by=$1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Lecturer notifications
router.get('/notifications', async (req: any, res) => {
  try {
    const result = await query(
      `SELECT id, message, read, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    res.json(result.rows.map(r=>({ id:r.id, message:r.message, read: !!r.read, createdAt: r.created_at })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/notifications/:id/read', async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    await query(`UPDATE notifications SET read=1 WHERE id=$1 AND user_id=$2`, [id, req.user!.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update metadata
router.patch('/papers/:id', async (req: any, res) => {
  const id = Number(req.params.id);
  const fields: string[] = [];
  const values: any[] = [];
  const allowed = ['title','course','module','year','semester','exam_type','category'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { values.push(req.body[key]); fields.push(`${key}=$${values.length}`); }
  }
  if (!fields.length) return res.json({ ok: true });
  try {
    values.push(id); values.push(req.user!.id);
    await query(`UPDATE papers SET ${fields.join(',')} WHERE id=$${values.length-1} AND uploaded_by=$${values.length}`, values);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Delete paper
router.delete('/papers/:id', async (req: any, res) => {
  const id = Number(req.params.id);
  try {
    await query('DELETE FROM papers WHERE id=$1 AND uploaded_by=$2', [id, req.user!.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

export default router;