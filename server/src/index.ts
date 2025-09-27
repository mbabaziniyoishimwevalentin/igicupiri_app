import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import { ENV } from './config/env';
import authRoutes from './routes/auth';
import paperRoutes from './routes/papers';
import reportRoutes from './routes/reports';
import adminRoutes from './routes/admin';
import activityLogsReportRoutes from './routes/activityLogsReport';
import lecturerRoutes from './routes/lecturer';
import studentRoutes from './routes/student';
import settingsRoutes from './routes/settings';
import { initSchema, query } from './config/db';


async function ensureAdminExists() {
  const email = process.env.ADMIN_EMAIL || 'admin@igicupuri.edu';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const fullName = process.env.ADMIN_NAME || 'System Administrator';
  try {
    const existing = await query<{ id:number; role:string }>('SELECT id, role FROM users WHERE email=$1', [email]);
    const password_hash = await bcrypt.hash(password, 10);
    if (!existing.rows.length) {
      await query('INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4)', [fullName, email, password_hash, 'admin']);
      console.log(`[bootstrap] Admin created: ${email}`);
    } else {
      const id = existing.rows[0].id;
      await query('UPDATE users SET role=$1, password_hash=$2, full_name=$3 WHERE id=$4', ['admin', password_hash, fullName, id]);
      console.log(`[bootstrap] Admin ensured/updated: ${email}`);
    }
  } catch (e) {
    console.error('[bootstrap] Failed to ensure admin user:', e);
  }
}

async function startServer() {
  await initSchema();
  await ensureAdminExists();
  const app = express();
  app.use(cors({
    origin: '*',
    methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
  }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'igicupuri-server',
      endpoints: ['/health','/auth','/papers','/reports','/admin','/lecturer','/student','/settings']
    });
  });
  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
  app.use('/auth', authRoutes);
  app.use('/papers', paperRoutes);
  app.use('/reports', reportRoutes);
  app.use('/admin', adminRoutes);
  app.use('/admin', activityLogsReportRoutes);
  app.use('/lecturer', lecturerRoutes);
  app.use('/student', studentRoutes);
  app.use('/settings', settingsRoutes);

  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${ENV.PORT} (bound to 0.0.0.0)`);
  });
}

startServer();