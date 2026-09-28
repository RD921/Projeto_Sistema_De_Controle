const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

async function rodar() {
  const nomeArquivo = process.argv[2];
  if (!nomeArquivo) {
    console.error("Uso: node scripts/run-migration.js <nome_do_arquivo.sql>");
    process.exit(1);
  }

  const caminho = path.join(__dirname, "..", "src", "config", "migrations", nomeArquivo);
  if (!fs.existsSync(caminho)) {
    console.error(`Arquivo não encontrado: ${caminho}`);
    process.exit(1);
  }

  let sql = fs.readFileSync(caminho, "utf8");

  // Remove linhas de comentário (-- ...) ANTES de dividir por ";",
  // para não perder comandos reais que vêm logo depois de um comentário.
  sql = sql
    .split("\n")
    .filter(linha => !linha.trim().startsWith("--"))
    .join("\n");

  const comandos = sql
    .split(";")
    .map(c => c.trim())
    .filter(c => c.length > 0);

  console.log(`Executando ${comandos.length} comando(s) de ${nomeArquivo}...`);

  for (const comando of comandos) {
    try {
      await pool.query(comando);
      const primeiraLinha = comando.split("\n")[0].slice(0, 70);
      console.log(`✔ ${primeiraLinha}...`);
    } catch (err) {
      console.error(`✘ Erro no comando: ${comando.slice(0, 70)}...`);
      console.error(`  ${err.message}`);
    }
  }

  console.log("Concluído.");
  process.exit(0);
}

rodar();