const express = require('express');
const path = require('path');
const pool = require('../config/db');
const { upload, uploadDir } = require('../middleware/upload');

const router = express.Router();

// GET /issues/:id/conversations
router.get('/issues/:id/conversations', async (req, res) => {
  const issueId = Number(req.params.id);
  if (isNaN(issueId)) return res.status(400).json({ status: 'error', message: 'Invalid issue ID' });

  const sql = `
    SELECT
      c.id,
      c.issue_id,
      i.user_id      AS reporter_id,
      i.assignee_id,
      c.sender_id,
      sender.username   AS sender_name,
      assignee.username AS assignee_name,
      c.message_type,
      c.message_text,
      c.attachment,
      c.created_at
    FROM issue_conversations c
    INNER JOIN issues i ON c.issue_id = i.id
    LEFT JOIN users sender ON c.sender_id = sender.id
    LEFT JOIN users assignee ON i.assignee_id = assignee.id
    WHERE c.issue_id = $1
    ORDER BY c.created_at ASC
  `;

  try {
    const { rows } = await pool.query(sql, [issueId]);
    const data = rows.map(r => ({
      id: r.id,
      issue_id: r.issue_id,
      reporter_id: r.reporter_id,
      assignee_id: r.assignee_id,
      sender_id: r.sender_id,
      sender_name: r.sender_name,
      assignee_name: r.assignee_name,
      message_type: r.message_type,
      message_text: r.message_text,
      attachment: r.attachment,
      attachment_url: r.attachment ? `${req.protocol}://${req.get('host')}/uploads/${r.attachment}` : null,
      created_at: r.created_at
    }));
    res.json({ status: 'ok', data });
  } catch (err) {
    console.error('DB error fetching conversations:', err);
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// POST /issues/:id/conversations
router.post('/issues/:id/conversations', upload.single('attachment'), async (req, res) => {
  const issueId = parseInt(req.params.id, 10);
  const senderId = parseInt(req.header('x-user-id') || req.body.sender_id, 10);
  const { message_type, message_text } = req.body;
  const attachment = req.file ? req.file.filename : null;

  if (isNaN(issueId) || isNaN(senderId) || (!message_text?.trim() && !attachment)) {
    return res.status(400).json({
      status: 'error',
      message: 'issue ID, sender_id and either message_text or attachment are required'
    });
  }

  const textValue = message_text?.trim() || '';

  try {
    const chk = await pool.query('SELECT user_id AS reporter_id, assignee_id FROM issues WHERE id = $1', [issueId]);
    if (!chk.rows.length) return res.status(404).json({ status: 'error', message: 'Issue not found' });

    const { reporter_id, assignee_id } = chk.rows[0];
    if (senderId !== reporter_id && senderId !== assignee_id) {
      return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    const ins = await pool.query(
      `INSERT INTO issue_conversations (issue_id, sender_id, message_type, message_text, attachment, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [issueId, senderId, message_type, textValue, attachment]
    );

    const convId = ins.rows[0].id;

    const sel = await pool.query(
      `SELECT c.id, c.issue_id, c.sender_id, u.username AS sender_name, c.message_type, c.message_text, c.attachment, c.created_at
       FROM issue_conversations c
       JOIN users u ON c.sender_id = u.id
       WHERE c.id = $1`,
      [convId]
    );

    const m = sel.rows[0];
    const newMsg = {
      id: m.id,
      issue_id: m.issue_id,
      sender_id: m.sender_id,
      sender_name: m.sender_name,
      message_type: m.message_type,
      message_text: m.message_text,
      attachment: m.attachment,
      attachment_url: m.attachment ? `${req.protocol}://${req.get('host')}/uploads/${m.attachment}` : null,
      created_at: m.created_at
    };
    res.status(201).json({ status: 'ok', data: newMsg });
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// GET /conversations/:convId/attachment
router.get('/conversations/:convId/attachment', async (req, res) => {
  const convId = Number(req.params.convId);
  const viewer = Number(req.header('x-user-id'));
  if (isNaN(convId) || isNaN(viewer)) {
    return res.status(400).json({ status: 'error', message: 'Invalid conv ID or user ID' });
  }

  const sql =
    'SELECT ic.attachment, i.user_id AS reporter_id, i.assignee_id ' +
    'FROM issue_conversations ic ' +
    'INNER JOIN issues i ON ic.issue_id = i.id ' +
    'WHERE ic.id = $1';

  try {
    const { rows } = await pool.query(sql, [convId]);
    if (!rows.length || !rows[0].attachment) {
      return res.status(404).json({ status: 'error', message: 'Attachment not found' });
    }

    const { attachment, reporter_id, assignee_id } = rows[0];
    if (viewer !== reporter_id && viewer !== assignee_id) {
      return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    const filePath = path.join(uploadDir, attachment);
    res.sendFile(filePath, err2 => {
      if (err2) {
        console.error('Error sending file:', err2);
        res.status(500).end();
      }
    });
  } catch (err) {
    console.error('Load conversation error:', err);
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

module.exports = router;
