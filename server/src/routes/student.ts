import { Router } from 'express';
import { query } from '../config/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get student profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await query<{
      id: number;
      full_name: string;
      email: string;
      student_id: string | null;
      role: string;
      created_at: string;
    }>(
      'SELECT id, full_name, email, student_id, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      studentId: user.student_id,
      role: user.role,
      createdAt: user.created_at
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update student profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { fullName, studentId } = req.body;
    
    if (!fullName || fullName.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    await query(
      'UPDATE users SET full_name = $1, student_id = $2 WHERE id = $3',
      [fullName.trim(), studentId || null, userId]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student's download history
router.get('/downloads', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await query<{
      id: number;
      paper_id: number;
      title: string;
      course: string;
      module: string;
      downloaded_at: string;
    }>(
      `SELECT d.id, d.paper_id, p.title, p.course, p.module, d.created_at as downloaded_at
       FROM downloads d
       JOIN papers p ON d.paper_id = p.id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      paperId: row.paper_id,
      title: row.title,
      course: row.course,
      module: row.module,
      downloadedAt: row.downloaded_at
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Track paper download
router.post('/downloads', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { paperId } = req.body;
    
    if (!paperId) {
      return res.status(400).json({ error: 'Paper ID is required' });
    }

    // Verify paper exists
    const paperResult = await query(
      'SELECT id FROM papers WHERE id = $1 AND status = $2',
      [paperId, 'published']
    );

    if (!paperResult.rows.length) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    // Insert download record (ignore if already exists due to UNIQUE constraint)
    try {
      await query(
        'INSERT INTO downloads (user_id, paper_id) VALUES ($1, $2)',
        [userId, paperId]
      );
    } catch (e: any) {
      // Ignore unique constraint violation (already tracked)
      const msg = String(e?.message || '');
      if (!/unique constraint/i.test(msg)) throw e;
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student's bookmarked papers
router.get('/bookmarks', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await query<{
      id: number;
      paper_id: number;
      title: string;
      course: string;
      module: string;
      bookmarked_at: string;
    }>(
      `SELECT b.id, b.paper_id, p.title, p.course, p.module, b.created_at as bookmarked_at
       FROM bookmarks b
       JOIN papers p ON b.paper_id = p.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      paperId: row.paper_id,
      title: row.title,
      course: row.course,
      module: row.module,
      bookmarkedAt: row.bookmarked_at
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add/remove bookmark
router.post('/bookmarks', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { paperId, action } = req.body; // action: 'add' or 'remove'
    
    if (!paperId || !action) {
      return res.status(400).json({ error: 'Paper ID and action are required' });
    }

    // Verify paper exists
    const paperResult = await query(
      'SELECT id FROM papers WHERE id = $1 AND status = $2',
      [paperId, 'published']
    );

    if (!paperResult.rows.length) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (action === 'add') {
      // Add bookmark (ignore if already exists)
      try {
        await query(
          'INSERT INTO bookmarks (user_id, paper_id) VALUES ($1, $2)',
          [userId, paperId]
        );
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (!/unique constraint/i.test(msg)) throw e;
      }
    } else if (action === 'remove') {
      // Remove bookmark
      await query(
        'DELETE FROM bookmarks WHERE user_id = $1 AND paper_id = $2',
        [userId, paperId]
      );
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "add" or "remove"' });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get total papers count
    const papersResult = await query(
      'SELECT COUNT(*) as total FROM papers WHERE status = $1',
      ['published']
    );

    // Get downloads count for this user
    const downloadsResult = await query(
      'SELECT COUNT(*) as total FROM downloads WHERE user_id = $1',
      [userId]
    );

    // Get bookmarks count for this user
    const bookmarksResult = await query(
      'SELECT COUNT(*) as total FROM bookmarks WHERE user_id = $1',
      [userId]
    );

    // Get reports submitted by this user
    const reportsResult = await query(
      'SELECT COUNT(*) as total FROM reports WHERE reporter_id = $1',
      [userId]
    );

    // better-sqlite3 returns numbers for COUNT(*); fall back safely if undefined
    const n = (v: any) => (typeof v === 'number' ? v : parseInt(String(v || '0'), 10) || 0);
    res.json({
      totalPapers: n(papersResult.rows[0]?.total),
      downloadsCount: n(downloadsResult.rows[0]?.total),
      bookmarksCount: n(bookmarksResult.rows[0]?.total),
      reportsSubmitted: n(reportsResult.rows[0]?.total)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;