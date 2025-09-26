import { Router } from 'express';
import { query } from '../config/db';
import { requireAuth, requireRole } from '../middleware/auth';
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  PDFDocument = null;
}
import fs from 'fs';
import path from 'path';

const router = Router();

router.use(requireAuth as any, requireRole(['admin']) as any);

router.get('/activity-logs/report', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, role, action, created_at FROM activity_logs ORDER BY created_at DESC`
    );
    const logs = result.rows;

    // Prepare PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    let filename = `System_Activity_Logs_Report_${Date.now()}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    // Simple, clean PDF style
    doc.fontSize(18).text('System Activity Logs Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#555').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Table header
    doc.fontSize(12).fillColor('#222').font('Helvetica-Bold');
    doc.text('Date/Time', 50, doc.y, { continued: true, width: 120 });
    doc.text('User', 180, doc.y, { continued: true, width: 120 });
    doc.text('Role', 310, doc.y, { continued: true, width: 60 });
    doc.text('Action', 380, doc.y, { width: 100 });
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#000');

    // Table rows
    logs.forEach(log => {
      doc.text(new Date(log.created_at).toLocaleString(), 50, doc.y, { continued: true, width: 120 });
      doc.text(log.name, 180, doc.y, { continued: true, width: 120 });
      doc.text(log.role, 310, doc.y, { continued: true, width: 60 });
      doc.text(log.action, 380, doc.y, { width: 100 });
      doc.moveDown(0.5);
    });

    doc.end();
    doc.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
