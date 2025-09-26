import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(1),
  studentId: z.string().optional().nullable(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['student','lecturer']).default('student')
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { fullName, studentId, email, password, role } = parsed.data;
  try {
    const existing = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already in use' });
    const password_hash = await bcrypt.hash(password, 10);
    const result = await query<{ id: number }>(
      `INSERT INTO users(full_name,email,password_hash,role,student_id)
       VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [fullName, email, password_hash, role, studentId || null]
    );
    const user = { id: result.rows[0].id, role } as const;
    const token = jwt.sign(user, ENV.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;
  try {
    const result = await query<{ id:number; password_hash:string; role:'student'|'lecturer'|'admin'; full_name?:string }>(
      'SELECT id, password_hash, role, full_name FROM users WHERE email=$1', [email]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' });

    // Log activity
    const name = user.full_name || email;
    const role = user.role;
    await query(
      'INSERT INTO activity_logs(user_id, name, role, action) VALUES ($1, $2, $3, $4)',
      [user.id, name, role, 'login']
    );

    res.json({ token, user: { id: user.id, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;