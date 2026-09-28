const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

function walk(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, filelist);
    } else if (file.endsWith(".js")) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

async function getTabelasFaltando() {
  const srcDir = path.join(__dirname, "..", "src");
  const files = walk(srcDir);
  const tabelasEncontradas = new Set();
  const regexes = [
    /\bFROM\s+`?([a-z_][a-z0-9_]*)`?/gi,
    /\bINTO\s+`?([a-z_][a-z0-9_]*)`?/gi,
    /\bUPDATE\s+`?([a-z_][a-z0-9_]*)`?\s+SET/gi,
    /\bJOIN\s+`?([a-z_][a-z0-9_]*)`?/gi,
  ];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const re of regexes) {
      let m;
      while ((m = re.exec(content)) !== null) tabelasEncontradas.add(m[1].toLowerCase());
    }
  }
  const [rows] = await pool.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()");
  const existentes = new Set(rows.map(r => r.TABLE_NAME.toLowerCase()));
  return [...tabelasEncontradas].filter(t => !existentes.has(t)).sort();
}

function limparComentarios(sql) {
  return sql.split("\n").filter(l => !l.trim().startsWith("--")).join("\n");
}

async function rodarMigration(nomeArquivo, jaRodados) {
  if (jaRodados.has(nomeArquivo)) return;
  jaRodados.add(nomeArquivo);
  const caminho = path.join(__dirname, "..", "src", "config", "migrations", nomeArquivo);
  const sql = limparComentarios(fs.readFileSync(caminho, "utf8"));
  const comandos = sql.split(";").map(c => c.trim()).filter(c => c.length > 0);
  console.log(`\n>>> Rodando ${nomeArquivo} (${comandos.length} comando(s))`);
  for (const comando of comandos) {
    try {
      await pool.query(comando);
      console.log(`  OK  ${comando.split("\n")[0].slice(0, 70)}...`);
    } catch (err) {
      console.log(`  ERRO  ${comando.split("\n")[0].slice(0, 70)}...  -> ${err.message}`);
    }
  }
}

async function main() {
  const faltando = await getTabelasFaltando();
  console.log(`Tabelas faltando: ${faltando.length}`);

  const migDir = path.join(__dirname, "..", "src", "config", "migrations");
  const arquivosMigration = fs.readdirSync(migDir).filter(f => f.endsWith(".sql"));

  const semMigration = [];
  const jaRodados = new Set();

  for (const tabela of faltando) {
    const regexCreate = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?\`?${tabela}\`?[\\s(]`, "i");
    let encontrou = false;
    for (const arq of arquivosMigration) {
      const conteudo = fs.readFileSync(path.join(migDir, arq), "utf8");
      if (regexCreate.test(conteudo)) {
        encontrou = true;
        await rodarMigration(arq, jaRodados);
      }
    }
    if (!encontrou) semMigration.push(tabela);
  }

  console.log("\n\n=== TABELAS SEM MIGRATION ENCONTRADA (precisam ser criadas na mão) ===");
  if (semMigration.length === 0) {
    console.log("Nenhuma - todas tinham migration.");
  } else {
    semMigration.forEach(t => console.log("- " + t));
  }

  console.log("\nConcluido. Roda 'node scripts/check-schema.js' de novo pra conferir o que sobrou.");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });