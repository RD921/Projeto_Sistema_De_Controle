require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./src/config/db");
async function seed() {
  try {
    const senhaHash = await bcrypt.hash("123456", 10);
    await db.query(
      "INSERT INTO users (nome, email, senha, role) VALUES (?, ?, ?, ?), (?, ?, ?, ?)",
      [
        "Rodrigo", "rodrigo@email.com", senhaHash, "user",
        "Admin",   "admin@email.com",   senhaHash, "admin"
      ]
    );
    await db.query(
      `INSERT INTO products (nome, descricao, sku, preco, estoque) VALUES
       (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
      [
        "Ventilador Industrial 65cm", "Modelo alta vazão", "VENT65", 499.90, 10,
        "Exaustor Axial 50cm",        "Uso industrial",    "EXA50",  379.90,  8
      ]
    );
    await db.query(
      `INSERT INTO customers (nome, email, telefone) VALUES
       (?, ?, ?), (?, ?, ?)`,
      [
        "Carlos Silva", "carlos@email.com", "27999990000",
        "Maria Souza",  "maria@email.com",  "27999991111"
      ]
    );
    console.log("Seed concluído com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro no seed:", err.message);
    process.exit(1);
  }
}
seed();