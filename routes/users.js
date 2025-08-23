const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const router = express.Router();
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

// GET /users
router.get('/users', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, tenant_id, username, email, user_role AS role, created_at, updated_at FROM users`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// POST /users
router.post('/users', async (req, res) => {
  const { tenant_id, username, email, password, role } = req.body;
  if (tenant_id === undefined || !username || !email || !password || !role) {
    return res.status(400).json({ status: 'error', message: 'tenant_id, username, email, password and role are required' });
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const sql = `
      INSERT INTO users (tenant_id, username, email, password, user_role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const { rows } = await pool.query(sql, [tenant_id, username, email, hash, role]);
    res.status(201).json({ status: 'ok', userId: rows[0].id });
  } catch (err) {
    console.error('Insert user error:', err);
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// PUT /users/:id
router.put('/users/:id', async (req, res) => {
  const userId = +req.params.id;
  const { tenant_id, username, email, password, role } = req.body;

  if (tenant_id === undefined || !username || !email || !role) {
    return res.status(400).json({ status: 'error', message: 'tenant_id, username, email and role are required' });
  }

  try {
    const fields = ['tenant_id = $1', 'username = $2', 'email = $3', 'user_role = $4'];
    const params = [tenant_id, username, email, role];
    let next = 5;

    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      fields.push(`password = $${next++}`);
      params.push(hash);
    }
    params.push(userId);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${next} `;
    const result = await pool.query(sql, params);

    if (!result.rowCount) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'ok', message: 'User updated' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// DELETE /users/:id
router.delete('/users/:id', async (req, res) => {
  const userId = +req.params.id;
  if (isNaN(userId)) return res.status(400).json({ status: 'error', message: 'Invalid user ID' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM issue_conversations WHERE sender_id = $1', [userId]);
    await client.query('DELETE FROM issues WHERE user_id = $1', [userId]);
    const delUser = await client.query('DELETE FROM users WHERE id = $1', [userId]);

    if (!delUser.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    await client.query('COMMIT');
    res.json({ status: 'ok', message: 'User and related data deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete user tx error:', err);
    res.status(500).json({ status: 'error', message: 'Database error' });
  } finally {
    client.release();
  }
});

// GET /users/:id
router.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const { rows } = await pool.query(
      'SELECT id, username, user_role FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    const user = rows[0];
    return res.json({ status: 'ok', data: { id: user.id, username: user.username, role: user.user_role } });
  } catch (err) {
    console.error('Fetch user error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

module.exports = router;
