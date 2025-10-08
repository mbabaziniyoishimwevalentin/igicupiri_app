import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(1),
  username: z.string().min(1).refine((value) => !/\d/.test(value), {
    message: 'Username must not contain numbers'
  }),
  studentId: z.string().optional().nullable(),
  email: z.string().email().refine((value) => !/\d/.test(value), {
    message: 'Email must not contain numbers'
  }),
  password: z.string().min(6),
  role: z.enum(['student','lecturer']).default('student')
});

// Registration: students are created immediately; lecturers require admin approval (pending request)
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  let { fullName, studentId, email, password, role } = parsed.data as {
    fullName: string; studentId: string | null | undefined; email: string; password: string; role: 'student'|'lecturer';
  };

  try {
    email = email.trim().toLowerCase();

    // Check if email already exists in active users
    const existingUser = await query('SELECT id FROM users WHERE email=$1', [email]);

    if (role === 'lecturer') {
      // Lecturer flow: create a pending registration request
      if (existingUser.rows.length) return res.status(409).json({ error: 'Email already in use' });
      const existingReq = await query('SELECT id FROM registration_requests WHERE email=$1 AND status=\'pending\'', [email]);
      if (existingReq.rows.length) return res.status(409).json({ error: 'Registration already pending approval' });

      const password_hash = await bcrypt.hash(password, 10);
      await query(
        `INSERT INTO registration_requests(full_name,email,password_hash,role,student_id,status)
         VALUES($1,$2,$3,$4,$5,'pending')`,
        [fullName, email, password_hash, 'lecturer', studentId || null]
      );

      return res.json({ ok: true, message: 'Registration submitted. Awaiting admin approval.' });
    } else {
      // Student flow: create the account immediately
      if (existingUser.rows.length) return res.status(409).json({ error: 'Email already in use' });

      const password_hash = await bcrypt.hash(password, 10);
      const inserted = await query<{ id: number }>(
        `INSERT INTO users(full_name,email,password_hash,role,student_id) VALUES($1,$2,$3,$4,$5) RETURNING id`,
        [fullName, email, password_hash, 'student', studentId || null]
      );
      const userId = inserted.rows[0].id;

      // Issue JWT for immediate login
      const token = jwt.sign({ id: userId, role: 'student' }, ENV.JWT_SECRET, { expiresIn: '7d' });

      // Optional: log registration activity
      await query(
        'INSERT INTO activity_logs(user_id, name, role, action) VALUES ($1, $2, $3, $4)',
        [userId, fullName, 'student', 'register']
      );

      return res.json({ token, user: { id: userId, role: 'student' } });
    }
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