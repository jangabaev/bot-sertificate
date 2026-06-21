require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      user_id    BIGINT UNIQUE NOT NULL,
      username   TEXT,
      first_name TEXT,
      last_name  TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tests (
      id         SERIAL PRIMARY KEY,
      name       TEXT    NOT NULL,
      responce   TEXT[],
      status     TEXT    DEFAULT 'ACTIVE',
      user_id    BIGINT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("DB tables ready");
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/", (_, res) => res.json({ ok: true }));
app.get("/health", (_, res) => res.json({ ok: true }));

// ─── Users ────────────────────────────────────────────────────────────────────

app.post("/users", async (req, res) => {
  const { user_id, username, first_name, last_name } = req.body;
  try {
    await pool.query(
      `INSERT INTO users (user_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
         SET username = EXCLUDED.username,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name`,
      [user_id, username || "", first_name || "", last_name || ""]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

// Bot test yaratishda POST /user ishlatadi
app.post("/user", async (req, res) => {
  const { name, responce } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tests (name, responce) VALUES ($1, $2) RETURNING *`,
      [name, responce || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /test  →  ?sort_by=ACTIVE  |  ?user_id=X  |  ?telegram_id=X  |  ?creator_id=X
app.get("/test", async (req, res) => {
  const { sort_by, user_id, telegram_id, creator_id } = req.query;
  const uid = user_id || telegram_id || creator_id;

  try {
    let result;
    if (uid) {
      result = await pool.query(
        "SELECT * FROM tests WHERE user_id = $1 ORDER BY created_at DESC",
        [uid]
      );
    } else if (sort_by === "ACTIVE") {
      result = await pool.query(
        "SELECT * FROM tests WHERE status = 'ACTIVE' ORDER BY created_at DESC"
      );
    } else {
      result = await pool.query("SELECT * FROM tests ORDER BY created_at DESC");
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/tests", async (req, res) => {
  const { user_id } = req.query;
  try {
    const result = user_id
      ? await pool.query(
          "SELECT * FROM tests WHERE user_id = $1 ORDER BY created_at DESC",
          [user_id]
        )
      : await pool.query("SELECT * FROM tests ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/test/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tests WHERE id = $1", [
      req.params.id,
    ]);
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/tests/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tests WHERE id = $1", [
      req.params.id,
    ]);
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/user/:userId/tests", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tests WHERE user_id = $1 ORDER BY created_at DESC",
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /test/:id — statusni o'zgartirish
app.patch("/test/:id", async (req, res) => {
  const { status, active } = req.body;
  const newStatus = status || (active === false ? "INACTIVE" : "ACTIVE");
  try {
    const result = await pool.query(
      "UPDATE tests SET status = $1 WHERE id = $2 RETURNING *",
      [newStatus, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST & PATCH /test/:id/stop
const stopHandler = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE tests SET status = 'INACTIVE' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/test/:id/stop", stopHandler);
app.patch("/test/:id/stop", stopHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => app.listen(PORT, () => console.log(`Backend running on :${PORT}`)))
  .catch((err) => {
    console.error("DB init failed:", err);
    process.exit(1);
  });
