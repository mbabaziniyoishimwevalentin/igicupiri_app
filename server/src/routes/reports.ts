import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const schema = z.object({ paperId: z.number(), reason: z.string().min(3) });

router.post('/', requireAuth as any, async (req: any, res) => {
  const parsed = schema.safeParse({ paperId: Number(req.body.paperId), reason: req.body.reason });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const { paperId, reason } = parsed.data;
    await query(
      'INSERT INTO reports(paper_id, reporter_id, reason, status) VALUES($1,$2,$3,\'open\')',
      [paperId, req.user!.id, reason]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;