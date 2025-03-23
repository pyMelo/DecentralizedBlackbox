import express from 'express';
import cors from 'cors';
import pool from './db.js';

const app = express();
app.use(express.json());
app.use(cors());

// Endpoint GET corretto per ottenere i blocchi
app.get('/api/blocks', async (_, res) => {
  try {
    const result = await pool.query('SELECT * FROM blocks ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server Backend avviato su porta ${PORT}`));
