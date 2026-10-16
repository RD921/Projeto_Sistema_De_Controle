// Ajustes de banco do motor de automações. Idempotente: roda sozinho na primeira execução
// do servidor (sem precisar de migration manual).
const pool = require("../config/db");

let promessa = null;

async function temColuna(tabela, coluna) {
  const [[r]] = await pool.query(
    "SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?", [tabela, coluna]);
  return Number(r.n) > 0;
}

async function adicionarColuna(tabela, coluna, definicao) {
  if (!(await temColuna(tabela, coluna))) await pool.query(`ALTER TABLE \`${tabela}\` ADD COLUMN \`${coluna}\` ${definicao}`);
}

async function aplicar() {
  await adicionarColuna("automations", "settings", "JSON NULL");
  await adicionarColuna("automation_executions", "mode", "VARCHAR(20) NOT NULL DEFAULT 'trigger'");
  await adicionarColuna("automation_executions", "parent_execution_id", "INT NULL");
  await adicionarColuna("automation_executions", "retry_of", "INT NULL");
}

// Devolve true se o banco está com as colunas novas. Em caso de erro (permissão, por exemplo)
// o motor continua funcionando no modo antigo, sem os recursos que dependem delas.
function garantir() {
  if (!promessa) {
    promessa = aplicar().then(() => true).catch(err => {
      console.error("[AUTOMACAO] Não foi possível atualizar o banco (seguindo sem os recursos novos):", err.message);
      return false;
    });
  }
  return promessa;
}

module.exports = { garantir };
