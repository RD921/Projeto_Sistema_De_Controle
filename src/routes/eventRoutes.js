// src/routes/eventRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const pool = require("../config/db");

router.get("/types", auth, async (req, res) => {
  try {
    const { category, module } = req.query;
    const condicoes = [];
    const params = [];

    if (category) { condicoes.push("category = ?"); params.push(category); }
    if (module) { condicoes.push("module = ?"); params.push(module); }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";
    const [rows] = await pool.query(
      `SELECT code, label, category, description, module FROM event_types ${where} ORDER BY category, label`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tipos de evento", details: err.message });
  }
});

module.exports = router;