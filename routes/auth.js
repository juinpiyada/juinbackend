const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { roleMap } = require('../utils/constants');

const router = express.Router();
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

// POST /api/register
router.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role, tenant_id = 0 } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ status: 'error', message: 'username, email, password & role are required' });
    }

    const userRole = roleMap[role];
    if (!userRole) {
      return res.status(400).json({ status: 'error', message: `Invalid role: ${role}` });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const insertSql = `
      INSERT INTO users (tenant_id, username, email, password, user_role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const { rows } = await pool.query(insertSql, [tenant_id, username, email, hash, userRole]);

    return res.status(201).json({
      status: 'ok',
      userId: rows[0].id,
      username,
      user_role: userRole
    });
  } catch (err) {
    console.error('Register server error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ status: 'error', message: 'Username and password required' });

  try {
    const sel = `SELECT id, username, password, role, user_role FROM users WHERE username = $1 LIMIT 1`;
    const { rows } = await pool.query(sel, [username]);

    if (!rows.length)
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

    const user = rows[0];

    let ok = false;
    try { ok = await bcrypt.compare(password, user.password); } catch { ok = false; }
    if (!ok) ok = password === user.password; // legacy plaintext fallback

    if (!ok)
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

    return res.json({
      status: 'ok',
      userId: user.id,
      username: user.username,
      role: user.role || null,
      user_role: user.user_role || null
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
