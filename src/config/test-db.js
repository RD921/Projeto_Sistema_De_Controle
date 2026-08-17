require("dotenv").config();
const mysql = require("mysql2/promise");

async function test() {
  console.log("Tentando conectar com:");
  console.log("Host:", process.env.DB_HOST);
  console.log("User:", process.env.DB_USER);
  console.log("Database:", process.env.DB_NAME);
  console.log("Port:", process.env.DB_PORT);

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT) || 3307
    });
    console.log("CONECTADO COM SUCESSO!");
    await conn.end();
  } catch (err) {
    console.error("ERRO COMPLETO:", err);
  }
}
test();