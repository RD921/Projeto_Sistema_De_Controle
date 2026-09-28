const pool = require("../src/config/db");

async function migrar() {
  try {
    console.log("Verificando coluna aria_pin_hash em users...");
    const [colunas] = await pool.query("SHOW COLUMNS FROM users LIKE 'aria_pin_hash'");
    if (colunas.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN aria_pin_hash VARCHAR(255) NULL");
      console.log("✔ Coluna aria_pin_hash criada.");
    } else {
      console.log("- Coluna aria_pin_hash já existe, pulando.");
    }

    console.log("Verificando tabela aria_acoes...");
    const [tabelas] = await pool.query("SHOW TABLES LIKE 'aria_acoes'");
    if (tabelas.length === 0) {
      await pool.query(`
        CREATE TABLE aria_acoes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          usuario_id INT NOT NULL,
          tipo VARCHAR(50) NOT NULL,
          parametros JSON NOT NULL,
          resumo TEXT NOT NULL,
          analise_impacto TEXT NOT NULL,
          nivel_risco ENUM('baixo','medio','alto') NOT NULL DEFAULT 'medio',
          status ENUM('pendente','confirmada','negada','expirada','erro') NOT NULL DEFAULT 'pendente',
          resultado JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          confirmed_at TIMESTAMP NULL,
          INDEX idx_tenant_status (tenant_id, status)
        )
      `);
      console.log("✔ Tabela aria_acoes criada.");
    } else {
      console.log("- Tabela aria_acoes já existe, pulando.");
    }

    console.log("Migração concluída com sucesso.");
  } catch (err) {
    console.error("Erro na migração:", err.message);
  } finally {
    process.exit(0);
  }
}

migrar();