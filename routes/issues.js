const express = require('express');
const path = require('path');
const pool = require('../config/db');
const { upload, uploadDir } = require('../middleware/upload');
const { validTypes, validStatuses } = require('../utils/constants');

const router = express.Router();

// GET /issues  (optional ?username=)
router.get('/issues', async (req, res) => {
  const { username } = req.query;
  try {
    if (username) {
      const sql = `SELECT i.* FROM issues i JOIN users u ON i.user_id = u.id WHERE u.username = $1`;
      const { rows } = await pool.query(sql, [username]);
      return res.json(rows);
    } else {
      const { rows } = await pool.query('SELECT * FROM issues');
      return res.json(rows);
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// GET /issues/user/:userId
router.get('/issues/user/:userId', async (req, res) => {
  const userId = +req.params.userId;
  try {
    const { rows } = await pool.query('SELECT * FROM issues WHERE user_id = $1', [userId]);
    res.json({ status: 'ok', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// GET /issues/assigned/:userId
router.get('/issues/assigned/:userId', async (req, res) => {
  const userId = +req.params.userId;
  try {
    const { rows } = await pool.query('SELECT * FROM issues WHERE assignee_id = $1', [userId]);
    res.json({ status: 'ok', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// GET /issues/assigned/username/:username
router.get('/issues/assigned/username/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const sql = `SELECT i.* FROM issues i JOIN users u ON i.assignee_id = u.id WHERE u.username = $1`;
    const { rows } = await pool.query(sql, [username]);
    res.json({ status: 'ok', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// POST /issues
router.post('/issues', upload.single('attachment'), async (req, res) => {
  const { user_id, title, description, issue_type, status } = req.body;
  const attachment = req.file ? req.file.filename : null;

  if (!user_id || !title?.trim() || !description?.trim() || !issue_type || !status) {
    return res.status(400).json({ status: 'error', message: 'All fields (user_id, title, description, issue_type, status) are required' });
  }
  if (!validTypes.includes(issue_type)) {
    return res.status(400).json({ status: 'error', message: `Invalid issue_type — must be one of: ${validTypes.join(', ')}` });
  }
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ status: 'error', message: `Invalid status — must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const sql = `
      INSERT INTO issues (user_id, title, description, issue_type, status, attachment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `;
    const { rows } = await pool.query(sql, [user_id, title.trim(), description.trim(), issue_type, status, attachment]);
    res.status(201).json({ status: 'ok', issue_id: rows[0].id });
  } catch (err) {
    console.error('Insert issue error:', err);
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// PUT /issues/:id/assign
router.put('/issues/:id/assign', async (req, res) => {
  const issueId = +req.params.id;
  const { username } = req.body;
  if (!username) return res.status(400).json({ status: 'error', message: 'username is required' });

  try {
    const u = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (!u.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });

    const assigneeId = u.rows[0].id;
    const upd = await pool.query(
      'UPDATE issues SET assignee_id = $1, status = $2 WHERE id = $3',
      [assigneeId, 'allocated', issueId]
    );
    if (!upd.rowCount) return res.status(404).json({ status: 'error', message: 'Issue not found' });
    res.json({ status: 'ok', message: 'Issue assigned' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// PUT /issues/:id/close
router.put('/issues/:id/close', async (req, res) => {
  const issueId = +req.params.id;
  try {
    const result = await pool.query('UPDATE issues SET status = $1 WHERE id = $2', ['closed', issueId]);
    if (!result.rowCount) return res.status(404).json({ status: 'error', message: 'Issue not found' });
    res.json({ status: 'ok', message: 'Issue closed' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// PUT /issues/:id/update
router.put('/issues/:id/update', upload.single('attachment'), async (req, res) => {
  const issueId = +req.params.id;
  const { description } = req.body;
  const attachment = req.file ? req.file.filename : null;

  const sets = [];
  const params = [];
  let i = 1;

  if (description && description.trim()) {
    sets.push(`description = $${i++}`);
    params.push(description.trim());
  }
  if (attachment) {
    sets.push(`attachment = $${i++}`);
    params.push(attachment);
  }
  if (!sets.length) return res.status(400).json({ status: 'error', message: 'Nothing to update' });

  params.push(issueId);
  try {
    const sql = `UPDATE issues SET ${sets.join(', ')} WHERE id = $${i}`;
    const result = await pool.query(sql, params);
    if (!result.rowCount) return res.status(404).json({ status: 'error', message: 'Issue not found' });
    res.json({ status: 'ok', message: 'Issue updated' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// PATCH /issues/:id
router.patch('/issues/:id', async (req, res) => {
  const { description, status, assignee_id } = req.body;

  const sets = [];
  const params = [];
  let i = 1;

  if (description !== undefined) { sets.push(`description = $${i++}`); params.push(description); }
  if (status !== undefined) { sets.push(`status = $${i++}`); params.push(status); }
  if (assignee_id !== undefined) { sets.push(`assignee_id = $${i++}`); params.push(assignee_id); }

  if (!sets.length) return res.status(400).json({ status: 'error', message: 'Nothing to update' });

  params.push(+req.params.id);

  try {
    const sql = `UPDATE issues SET ${sets.join(', ')} WHERE id = $${i}`;
    const result = await pool.query(sql, params);
    if (!result.rowCount) return res.status(404).json({ status: 'error', message: 'Issue not found' });
    res.json({ status: 'ok', message: 'Issue updated' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// GET /issues/:id/attachment
router.get('/issues/:id/attachment', async (req, res) => {
  const issueId = Number(req.params.id);
  if (isNaN(issueId)) return res.status(400).json({ status: 'error', message: 'Invalid issue ID' });

  try {
    const { rows } = await pool.query('SELECT attachment FROM issues WHERE id = $1 LIMIT 1', [issueId]);
    if (!rows.length || !rows[0].attachment) {
      return res.status(404).json({ status: 'error', message: 'Attachment not found' });
    }
    const filePath = path.join(uploadDir, rows[0].attachment);
    return res.sendFile(filePath, err2 => {
      if (err2) {
        console.error('Error sending attachment:', err2);
        res.status(500).end();
      }
    });
  } catch (err) {
    console.error('DB error fetching attachment:', err);
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

module.exports = router;
