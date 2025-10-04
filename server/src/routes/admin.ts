import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import { requireAuth, requireRole } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();

router.use(requireAuth as any, requireRole(['admin']) as any);

// ========== Users ==========
// Get all users (for admin dashboard)
router.get('/users', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, full_name AS name, email, role, student_id, created_at FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new user (admin)
router.post('/users', async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['student','lecturer','admin']),
    studentId: z.string().optional().nullable()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { fullName, email, password, role, studentId } = parsed.data;
  try {
    const exists = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already in use' });
    const password_hash = await bcrypt.hash(password, 10);
    const result = await query<{ id: number }>(
      `INSERT INTO users(full_name,email,password_hash,role,student_id) VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [fullName, email, password_hash, role, studentId || null]
    );
    const row = await query(
      `SELECT id, full_name AS name, email, role, student_id, created_at FROM users WHERE id=$1`,
      [result.rows[0].id]
    );
    res.json(row.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a user (admin)
router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.enum(['student','lecturer','admin']).optional(),
    studentId: z.string().optional().nullable(),
    password: z.string().min(6).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data as any;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.fullName !== undefined) { fields.push('full_name=$' + (values.length+1)); values.push(data.fullName); }
    if (data.email !== undefined) { fields.push('email=$' + (values.length+1)); values.push(data.email); }
    if (data.role !== undefined) { fields.push('role=$' + (values.length+1)); values.push(data.role); }
    if (data.studentId !== undefined) { fields.push('student_id=$' + (values.length+1)); values.push(data.studentId); }
    if (data.password !== undefined) {
      const hash = await bcrypt.hash(data.password, 10);
      fields.push('password_hash=$' + (values.length+1)); values.push(hash);
    }
    if (!fields.length) return res.json({ ok: true });
    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id=$${values.length}`;
    await query(sql, values);
    const row = await query(
      `SELECT id, full_name AS name, email, role, student_id, created_at FROM users WHERE id=$1`,
      [id]
    );
    res.json(row.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Permanently delete a user (admin)
router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== Logs/Reports/Papers ==========
// System Activity Logs endpoint
router.get('/logs', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, role, action, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const result = await query(
      `SELECT r.id, r.reason, r.status, r.created_at, p.title, p.id AS paper_id
       FROM reports r JOIN papers p ON p.id=r.paper_id
       ORDER BY r.created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/papers/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status);
  if (!['published','removed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    // Update status
    await query('UPDATE papers SET status=$1 WHERE id=$2', [status, id]);
    // Get uploader to notify
    const row = await query<{ uploaded_by:number; title:string }>('SELECT uploaded_by, title FROM papers WHERE id=$1', [id]);
    if (row.rows[0]?.uploaded_by) {
      const msg = status === 'published' ? `Your paper "${row.rows[0].title}" was approved by admin.` : `Your paper "${row.rows[0].title}" was rejected/removed by admin.`;
      await query('INSERT INTO notifications(user_id, message) VALUES($1,$2)', [row.rows[0].uploaded_by, msg]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  const id = Number(req.params.id);
  const role = String(req.body.role);
  if (!['student','lecturer','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    await query('UPDATE users SET role=$1 WHERE id=$2', [role, id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== Registration Requests (Lecturer onboarding) ==========
// List registration requests (default pending)
router.get('/registration-requests', async (req, res) => {
  try {
    const status = String((req.query.status || 'pending')).toLowerCase();
    const allowed = ['pending','approved','rejected'];
    const where = allowed.includes(status) ? 'WHERE status=$1' : '';
    const params = allowed.includes(status) ? [status] : [];
    const result = await query(
      `SELECT id, full_name AS fullName, email, role, student_id AS studentId, status, reason, created_at AS createdAt, processed_at AS processedAt, processed_by AS processedBy
       FROM registration_requests ${where}
       ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve a lecturer registration request: creates user and marks request approved
router.post('/registration-requests/:id/approve', async (req, res) => {
  const id = Number(req.params.id);
  try {
    // Load request
    const rr = await query<{ id:number; full_name:string; email:string; password_hash:string; role:string; student_id:string|null; status:string }>(
      'SELECT id, full_name, email, password_hash, role, student_id, status FROM registration_requests WHERE id=$1',
      [id]
    );
    const r = rr.rows[0];
    if (!r) return res.status(404).json({ error: 'Request not found' });
    if (r.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    // Ensure email not already taken
    const existing = await query('SELECT id FROM users WHERE email=$1', [r.email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already in use' });

    // Create user using stored password_hash
    const inserted = await query<{ id:number }>(
      `INSERT INTO users(full_name,email,password_hash,role,student_id) VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [r.full_name, r.email.toLowerCase(), r.password_hash, r.role === 'lecturer' ? 'lecturer' : 'student', r.student_id || null]
    );
    const userId = inserted.rows[0].id;

    // Mark request approved
    await query(
      `UPDATE registration_requests SET status='approved', processed_at=CURRENT_TIMESTAMP, processed_by=$1 WHERE id=$2`,
      [req.user?.id || null, id]
    );

    // Optional: notify user; create a notification row
    try {
      await query('INSERT INTO notifications(user_id, message) VALUES($1,$2)', [userId, 'Your lecturer account has been approved by admin.']);
    } catch {}

    // Log activity
    try {
      await query('INSERT INTO activity_logs(user_id, name, role, action) VALUES ($1,$2,$3,$4)', [userId, r.full_name, 'lecturer', 'lecturer_approved']);
    } catch {}

    // Return created user basic info
    const userRow = await query(
      `SELECT id, full_name AS name, email, role, student_id, created_at FROM users WHERE id=$1`,
      [userId]
    );
    res.json({ ok: true, user: userRow.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject a lecturer registration request
router.post('/registration-requests/:id/reject', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ reason: z.string().min(1).optional() });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const reason = parsed.data.reason || 'Rejected by admin';
  try {
    const rr = await query<{ status:string }>('SELECT status FROM registration_requests WHERE id=$1', [id]);
    const curr = rr.rows[0];
    if (!curr) return res.status(404).json({ error: 'Request not found' });
    if (curr.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    await query(
      `UPDATE registration_requests SET status='rejected', reason=$1, processed_at=CURRENT_TIMESTAMP, processed_by=$2 WHERE id=$3`,
      [reason, req.user?.id || null, id]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
