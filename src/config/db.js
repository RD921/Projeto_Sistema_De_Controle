require("dotenv").config();
const mysql = require("mysql2/promise");

// Tudo vem do .env (no seu PC) ou da aba Environment (no Render).
// Nenhuma senha fica escrita aqui.
const usarSSL = String(process.env.DB_SSL || "").toLowerCase() === "true";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "ecomflow",
  port: parseInt(process.env.DB_PORT, 10) || 3307,
  ssl: usarSSL ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10
});

pool.getConnection()
  .then(conn => {
    console.log("MySQL conectado com sucesso! (" + (process.env.DB_HOST || "localhost") + ")");
    conn.release();
  })
  .catch(err => {
    console.error("Erro ao conectar:", err.message);
    process.exit(1);
  });

module.exports = pool;
