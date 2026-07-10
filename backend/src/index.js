//imports
const express = require('express');
const { Pool } = require('pg');
const helmet = require('helmet');
const cors = require('cors');

//set up express.js app
const app = express();
const PORT = process.env.PORT || 3000;

//middle-ware
app.use(helmet()); //security-headers (XSS protection)
app.use(cors()); //cross-origin
app.use(express.json());

//created postgrs-connection pool of max 20 connections
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'appdb',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

//4 endpoints
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-service', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (_req, res) => {
  try {
    const result = await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', ping: result.rows[0] });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

app.get('/api/items', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, created_at FROM items ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//{$1} -> prevents sql-injection attack
app.post('/api/items', async (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO items (name) VALUES ($1) RETURNING id, name, created_at',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//on start-up auto-create "items" table if not exist 
async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

app.listen(PORT, async () => {
  try {
    await ensureSchema();
    console.log(`API service listening on port ${PORT}`);
  } catch (err) {
    console.error('Schema init failed:', err.message);
    process.exit(1);
  }
});
