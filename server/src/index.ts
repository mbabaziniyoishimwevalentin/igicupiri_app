import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ENV } from './config/env';
import authRoutes from './routes/auth';
import paperRoutes from './routes/papers';
import reportRoutes from './routes/reports';
import adminRoutes from './routes/admin';
import activityLogsReportRoutes from './routes/activityLogsReport';
import lecturerRoutes from './routes/lecturer';
import studentRoutes from './routes/student';
import settingsRoutes from './routes/settings';
import { initSchema } from './config/db';


async function startServer() {
  await initSchema();
  const app = express();
  app.use(cors({
    origin: '*',
    methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
  }));
  app.use(express.json());
  app.use(morgan('dev'));

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