require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "03385100",
  database: "ecomflow",
  port: 3307,
  waitForConnections: true,
  connectionLimit: 10
});

pool.getConnection()
  .then(conn => {
    console.log("MySQL conectado com sucesso!");
    conn.release();
  })
  .catch(err => {
    console.error("Erro ao conectar:", err.message);
    process.exit(1);
  });

module.exports = pool;