const mysql = require("mysql2/promise");

async function test() {
  console.log("DB_USER:", process.env.DB_USER);
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    const [rows] = await conn.query("SELECT email FROM users");
    console.log("Funcionou! Usu?rios:", rows.length);
  } catch(err) {
    console.error("Erro:", err.message);
  } finally {
    if (conn) conn.end();
  }
}

test();
