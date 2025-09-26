import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';
import { query } from '../config/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Storage config: keep original filename with timestamp prefix
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = ENV.UPLOAD_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

function fileFilter(req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF/DOC/DOCX allowed'));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: ENV.MAX_FILE_SIZE_BYTES } });

const createSchema = z.object({
  title: z.string().min(1),
  course: z.string().min(1),
  module: z.string().min(1),
  year: z.string().min(1),
  semester: z.enum(['1','2']),
  examType: z.enum(['mid','final']),
  category: z.enum(['past','exam','test','assignment','book']).default('past')
});

router.get('/', async (req, res) => {
  const { course, module, year, semester, examType, category, q } = req.query as Record<string, string|undefined>;
  const where: string[] = [];
  const params: any[] = [];
  if (course) { params.push(course); where.push(`course = $${params.length}`); }
  if (module) { params.push(module); where.push(`module = $${params.length}`); }
  if (year) { params.push(year); where.push(`year = $${params.length}`); }
  if (semester) { params.push(semester); where.push(`semester = $${params.length}`); }
  if (examType) { params.push(examType); where.push(`exam_type = $${params.length}`); }
  if (category) { params.push(category); where.push(`category = $${params.length}`); }
  if (q) { params.push(`%${q}%`); where.push(`(title ILIKE $${params.length} OR course ILIKE $${params.length} OR module ILIKE $${params.length})`); }
  where.push("status='published'");
  const sql = `SELECT id,title,course,module,year,semester,exam_type AS "examType",category AS "category",file_type AS "fileType",file_size AS "fileSize",created_at AS "createdAt" FROM papers ${where.length? 'WHERE '+where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 100`;
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth as any, requireRole(['student','lecturer','admin']) as any, upload.single('file'), async (req: any, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!req.file) return res.status(400).json({ error: 'File required' });
  try {
    const { title, course, module, year, semester, examType, category } = parsed.data;
    const filePath = path.resolve(req.file.path);
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;
    const uploadedBy = req.user!.id;

    const result = await query<{ id:number }>(
      `INSERT INTO papers(title,course,module,year,semester,exam_type,category,uploaded_by,file_path,file_type,file_size,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published') RETURNING id`,
      [title, course, module, year, semester, examType, category, uploadedBy, filePath, fileType, fileSize]
    );
    res.json({ id: result.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await query<{ file_path:string; file_type:string; title:string }>(
      'SELECT file_path, file_type, title FROM papers WHERE id=$1 AND status=\'published\'', [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    res.setHeader('Content-Type', row.file_type);
    res.download(row.file_path, path.basename(row.file_path));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update paper metadata
router.put('/:id', requireAuth as any, requireRole(['admin','lecturer']) as any, async (req, res) => {
  const id = Number(req.params.id);
  // Accept both camelCase and snake_case
  const {
    title,
    course,
    module,
    year,
    semester,
    examType,
    exam_type,
    category
  } = req.body;
  // Prefer camelCase, fallback to snake_case
  const examTypeValue = examType || exam_type;
  console.log('Edit paper request:', req.body);
  if (!title || !course || !module || !year) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await query(
      `UPDATE papers SET title=$1, course=$2, module=$3, year=$4, semester=$5, exam_type=$6, category=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8`,
      [title, course, module, year, semester, examTypeValue, category, id]
    );
    // Return updated paper
    const updated = await query(
      `SELECT id,title,course,module,year,semester,exam_type AS "examType",category AS "category",file_type AS "fileType",file_size AS "fileSize",created_at AS "createdAt", updated_at AS "updatedAt" FROM papers WHERE id=$1`,
      [id]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Paper not found' });
    res.json(updated.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;