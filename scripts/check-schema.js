const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

function walk(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (file === "node_modules") return;
      walk(filepath, filelist);
    } else if (file.endsWith(".js")) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

async function main() {
  const srcDir = path.join(__dirname, "..", "src");
  const files = walk(srcDir);
  const tabelasEncontradas = new Map(); // nome -> lista de arquivos

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
      while ((m = re.exec(content)) !== null) {
        const nome = m[1].toLowerCase();
        if (!tabelasEncontradas.has(nome)) tabelasEncontradas.set(nome, new Set());
        tabelasEncontradas.get(nome).add(path.relative(path.join(__dirname, ".."), file));
      }
    }
  }

  const [rows] = await pool.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
  );
  const existentes = new Set(rows.map(r => r.TABLE_NAME.toLowerCase()));

  const faltando = [...tabelasEncontradas.keys()].filter(t => !existentes.has(t)).sort();

  console.log(`\nTotal de tabelas existentes no banco: ${existentes.size}`);
  console.log(`Total de nomes de tabela referenciados no código: ${tabelasEncontradas.size}\n`);

  console.log("=== POSSÍVEIS TABELAS FALTANDO NO BANCO ===");
  console.log("(alguns itens podem ser falso-positivo, tipo nome de variável parecido com SQL — ignore o que não parecer nome de tabela de verdade)\n");

  if (faltando.length === 0) {
    console.log("Nenhuma. ✔");
  } else {
    faltando.forEach(t => {
      const arquivos = [...tabelasEncontradas.get(t)].join(", ");
      console.log(`- ${t}   (usado em: ${arquivos})`);
    });
  }

  console.log("\nConcluído.");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });