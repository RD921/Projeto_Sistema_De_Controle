// src/services/onboardingIAService.js
// A Aria le as respostas do onboarding, o texto "Me conte mais sobre a sua
// empresa" e o PDF enviado, entende como a empresa funciona e monta um plano
// de configuracao (modulos, centros de custo e canais de venda). O plano e
// mostrado para o usuario na etapa de recomendacoes e so e aplicado quando
// ele confirma.
const pool = require("../config/db");
const gemini = require("./geminiService");

const TIPOS_CANAL = ["loja_fisica", "site", "marketplace", "rede_social", "outro"];

// ---------------------------------------------------------------------------
// Garante as colunas novas em company_onboarding (as mesmas da migration
// add_onboarding_ia.sql). Roda uma vez por processo, assim o sistema
// funciona mesmo se a migration nao tiver sido rodada a mao.
// ---------------------------------------------------------------------------
const COLUNAS_NOVAS = {
  descricao_empresa: "LONGTEXT NULL",
  documento_nome: "VARCHAR(255) NULL",
  documento_pdf: "MEDIUMBLOB NULL",
  plano_ia: "JSON NULL",
  resumo_ia: "TEXT NULL",
};
let esquemaPronto = null;
function garantirEsquema() {
  if (!esquemaPronto) {
    esquemaPronto = (async () => {
      const [cols] = await pool.query(
        "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'company_onboarding'"
      );
      const existentes = new Set(cols.map(c => c.COLUMN_NAME));
      for (const [nome, tipo] of Object.entries(COLUNAS_NOVAS)) {
        if (!existentes.has(nome)) {
          await pool.query(`ALTER TABLE company_onboarding ADD COLUMN ${nome} ${tipo}`);
        }
      }
    })().catch(err => { esquemaPronto = null; throw err; });
  }
  return esquemaPronto;
}

function parseJSON(valor, padrao) {
  if (valor === null || valor === undefined) return padrao;
  if (typeof valor === "string") {
    try { return JSON.parse(valor); } catch { return padrao; }
  }
  return valor;
}

async function modulosInstalaveis() {
  const [rows] = await pool.query(
    "SELECT id, label, descricao FROM modules_catalog WHERE disponivel = 1 AND nativo = 0 ORDER BY label"
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Plano por regras: usado quando a IA nao esta disponivel (sem chave, erro,
// cota estourada). Usa so as respostas de multipla escolha.
// ---------------------------------------------------------------------------
const AREA_PARA_MODULO = {
  pedidos: "ecommerce",
  clientes: "crm",
  marketing: "marketing",
  relatorios: "relatorios",
  logistica: "logistica",
};

const CANAL_PARA_TIPO = {
  "Loja Virtual (Própria)": "site",
  "Mercado Livre": "marketplace", "Shopee": "marketplace", "Amazon": "marketplace",
  "Magazine Luiza": "marketplace", "Americanas": "marketplace", "Aliexpress": "marketplace",
  "Outros Marketplaces": "marketplace",
  "Instagram": "rede_social", "WhatsApp": "rede_social", "Facebook": "rede_social",
};

function planoPorRegras(respostas, catalogo) {
  const ids = new Set(catalogo.map(m => m.id));
  const modulos = [];
  for (const area of respostas.areas_automatizar || []) {
    const id = AREA_PARA_MODULO[area];
    if (id && ids.has(id) && !modulos.find(m => m.id === id)) {
      modulos.push({ id, motivo: "Você marcou essa área como prioridade." });
    }
  }
  const canais = (respostas.canais || [])
    .filter(c => CANAL_PARA_TIPO[c])
    .map(c => ({ nome: c, tipo: CANAL_PARA_TIPO[c] }));
  if (respostas.segmento === "varejo") canais.unshift({ nome: "Loja Física", tipo: "loja_fisica" });

  return {
    origem: "regras",
    resumo: "",
    modulos,
    centros_custo: [],
    canais_venda: canais,
    observacoes: [],
  };
}

// ---------------------------------------------------------------------------
// Limpa e valida o que a IA devolveu: nada fora do catalogo, nada de tipo
// invalido, sem duplicados.
// ---------------------------------------------------------------------------
function normalizarPlano(bruto, catalogo) {
  const ids = new Set(catalogo.map(m => m.id));
  const modulos = [];
  for (const m of Array.isArray(bruto?.modulos) ? bruto.modulos : []) {
    const id = String(m?.id || "").trim();
    if (ids.has(id) && !modulos.find(x => x.id === id)) {
      modulos.push({ id, motivo: String(m?.motivo || "").slice(0, 300) });
    }
  }

  const centros = [];
  for (const c of Array.isArray(bruto?.centros_custo) ? bruto.centros_custo : []) {
    const nome = String(c?.nome || "").trim().slice(0, 100);
    if (!nome) continue;
    const codigo = String(c?.codigo || nome)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 20);
    if (!codigo || codigo === "GERAL" || centros.find(x => x.codigo === codigo)) continue;
    centros.push({ codigo, nome, descricao: String(c?.descricao || "").slice(0, 255) });
  }

  const canais = [];
  for (const c of Array.isArray(bruto?.canais_venda) ? bruto.canais_venda : []) {
    const nome = String(c?.nome || "").trim().slice(0, 100);
    const tipo = TIPOS_CANAL.includes(c?.tipo) ? c.tipo : "outro";
    if (!nome || canais.find(x => x.nome.toLowerCase() === nome.toLowerCase())) continue;
    canais.push({ nome, tipo });
  }

  return {
    origem: "ia",
    resumo: String(bruto?.resumo || "").trim().slice(0, 4000),
    modulos,
    centros_custo: centros.slice(0, 8),
    canais_venda: canais.slice(0, 12),
    observacoes: (Array.isArray(bruto?.observacoes) ? bruto.observacoes : [])
      .map(o => String(o).slice(0, 300)).filter(Boolean).slice(0, 5),
  };
}

function montarPrompt(respostas, descricao, temPdf, catalogo) {
  return `Você é a Aria, assistente do Apollo, um sistema de gestão empresarial brasileiro.
Uma empresa acabou de criar a conta. Sua tarefa é entender como essa empresa funciona
e montar a melhor configuração inicial do sistema para ela.

RESPOSTAS DO QUESTIONÁRIO:
- Segmento: ${respostas.segmento || "não informado"}
- Canais de venda atuais: ${(respostas.canais || []).join(", ") || "não informado"}
- Sistema de gestão atual: ${respostas.sistema_gestao || "não informado"}
- Áreas que quer melhorar: ${(respostas.areas_automatizar || []).join(", ") || "não informado"}
- Tamanho da operação: ${respostas.tamanho_operacao || "não informado"}
- Objetivo principal: ${respostas.objetivo || "não informado"}

"ME CONTE MAIS SOBRE A SUA EMPRESA" (texto livre do cliente):
${descricao && descricao.trim() ? descricao.trim() : "(não preenchido)"}

${temPdf ? "O cliente também enviou um PDF descrevendo a empresa (anexado a esta mensagem). Leia o documento inteiro e use-o como fonte principal sobre o funcionamento da empresa." : "O cliente não enviou PDF."}

MÓDULOS QUE PODEM SER INSTALADOS (use somente estes ids):
${catalogo.map(m => `- ${m.id}: ${m.label} — ${m.descricao || ""}`).join("\n")}
(Automações, Integrações e Financeiro já vêm sempre ativos; não os inclua.)

Responda APENAS com um JSON neste formato:
{
  "resumo": "Resumo em português, de 3 a 8 frases, de como a empresa funciona: o que vende, para quem, por onde vende, como opera e quais são as dores. Escreva como uma ficha que a Aria vai consultar no futuro para entender o negócio.",
  "modulos": [{ "id": "id do catálogo", "motivo": "por que este módulo ajuda esta empresa, em uma frase" }],
  "centros_custo": [{ "codigo": "CODIGO_CURTO", "nome": "Nome", "descricao": "para que serve" }],
  "canais_venda": [{ "nome": "Nome do canal", "tipo": "loja_fisica | site | marketplace | rede_social | outro" }],
  "observacoes": ["dica ou alerta curto para o dono configurar depois"]
}

Regras:
- Recomende só módulos que façam sentido de verdade para este negócio.
- Centros de custo: de 2 a 6, refletindo as áreas reais da empresa (ex: Vendas, Logística, Marketing, Produção). Não inclua "Geral", ele já é criado sempre.
- Canais de venda: os que a empresa realmente usa, de acordo com as respostas, o texto e o PDF.
- Nunca invente dados que não estejam nas informações acima.`;
}

// Le tudo do banco, chama a IA (ou cai para as regras) e salva o plano.
async function analisar(tenantId) {
  await garantirEsquema();
  const [[row]] = await pool.query("SELECT * FROM company_onboarding WHERE tenant_id = ?", [tenantId]);
  if (!row) throw new Error("Onboarding não encontrado para esta empresa");

  const respostas = {
    segmento: row.segmento,
    canais: parseJSON(row.canais, []),
    sistema_gestao: row.sistema_gestao,
    areas_automatizar: parseJSON(row.areas_automatizar, []),
    tamanho_operacao: row.tamanho_operacao,
    objetivo: row.objetivo,
  };
  const catalogo = await modulosInstalaveis();

  let plano;
  if (process.env.GEMINI_API_KEY) {
    try {
      const partes = [{ text: montarPrompt(respostas, row.descricao_empresa, !!row.documento_pdf, catalogo) }];
      if (row.documento_pdf) {
        partes.push({ inline_data: { mime_type: "application/pdf", data: Buffer.from(row.documento_pdf).toString("base64") } });
      }
      plano = normalizarPlano(await gemini.chamarGeminiJSON(partes), catalogo);
    } catch (err) {
      console.error("[ONBOARDING IA] Falha ao analisar, usando regras:", err.response?.data?.error?.message || err.message);
    }
  }
  if (!plano) plano = planoPorRegras(respostas, catalogo);

  await pool.query(
    "UPDATE company_onboarding SET plano_ia = ?, resumo_ia = ? WHERE tenant_id = ?",
    [JSON.stringify(plano), plano.resumo || null, tenantId]
  );

  const nomes = Object.fromEntries(catalogo.map(m => [m.id, m.label]));
  return { ...plano, modulos: plano.modulos.map(m => ({ ...m, label: nomes[m.id] })) };
}

// Aplica o plano confirmado pelo usuario. Tudo e aditivo: nao apaga nada.
async function aplicar(tenantId, modulosEscolhidos) {
  await garantirEsquema();
  const [[row]] = await pool.query("SELECT plano_ia FROM company_onboarding WHERE tenant_id = ?", [tenantId]);
  const plano = parseJSON(row?.plano_ia, null) || { centros_custo: [], canais_venda: [] };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const moduloId of modulosEscolhidos) {
      await conn.query(
        `INSERT INTO tenant_modules (tenant_id, module_id, status)
         SELECT ?, id, 'active' FROM modules_catalog WHERE id = ? AND disponivel = 1
         ON DUPLICATE KEY UPDATE status = 'active'`,
        [tenantId, moduloId]
      );
    }

    // Centro de custo "Geral" e obrigatorio para lancamentos financeiros.
    await conn.query(
      `INSERT INTO cost_centers (tenant_id, codigo, nome, descricao)
       SELECT ?, 'GERAL', 'Geral', 'Centro de custo padrão para lançamentos não classificados'
       WHERE NOT EXISTS (SELECT 1 FROM cost_centers WHERE tenant_id = ? AND codigo = 'GERAL')`,
      [tenantId, tenantId]
    );
    for (const c of plano.centros_custo || []) {
      await conn.query(
        `INSERT INTO cost_centers (tenant_id, codigo, nome, descricao)
         SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM cost_centers WHERE tenant_id = ? AND codigo = ?)`,
        [tenantId, c.codigo, c.nome, c.descricao || null, tenantId, c.codigo]
      );
    }

    for (const c of plano.canais_venda || []) {
      await conn.query(
        `INSERT INTO sales_channels (tenant_id, tipo, nome)
         SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE tenant_id = ? AND nome = ?)`,
        [tenantId, c.tipo, c.nome, tenantId, c.nome]
      );
    }

    await conn.query(
      "UPDATE company_onboarding SET modulos_selecionados = ?, completed_at = NOW() WHERE tenant_id = ?",
      [JSON.stringify(modulosEscolhidos), tenantId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Texto que a Aria recebe em toda conversa para saber como a empresa funciona.
async function perfilParaAria(tenantId) {
  try {
    await garantirEsquema();
    const [[row]] = await pool.query(
      "SELECT segmento, canais, tamanho_operacao, objetivo, descricao_empresa, resumo_ia FROM company_onboarding WHERE tenant_id = ?",
      [tenantId]
    );
    if (!row) return "";
    const partes = [];
    if (row.resumo_ia) partes.push(`Resumo do negócio: ${row.resumo_ia}`);
    if (row.segmento) partes.push(`Segmento: ${row.segmento}`);
    const canais = parseJSON(row.canais, []);
    if (canais.length) partes.push(`Canais de venda: ${canais.join(", ")}`);
    if (row.tamanho_operacao) partes.push(`Tamanho da operação: ${row.tamanho_operacao}`);
    if (row.objetivo) partes.push(`Objetivo principal: ${row.objetivo}`);
    if (row.descricao_empresa) partes.push(`Descrição feita pelo próprio cliente: ${row.descricao_empresa.slice(0, 6000)}`);
    return partes.length ? `\n\nCOMO ESTA EMPRESA FUNCIONA (informado no cadastro):\n${partes.join("\n")}` : "";
  } catch {
    return "";
  }
}

module.exports = { garantirEsquema, analisar, aplicar, perfilParaAria };
