const pool = require("../config/db");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// ── Helpers de periodo (mesma logica do reportController, duplicada aqui de
// proposito para nao arriscar editar controllers ja testados) ──
function getDateRange(query) {
  const end = query.end_date ? new Date(query.end_date) : new Date();
  const start = query.start_date ? new Date(query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getGroupBy(query) {
  const allowed = ["day", "week", "month"];
  return allowed.includes(query.group_by) ? query.group_by : "day";
}

// ── Builders: reconstroem os mesmos dados que os relatorios JSON retornam ──

async function buildSales(tenantId, query) {
  const { start, end } = getDateRange(query);
  const groupBy = getGroupBy(query);
  const groupExpr = {
    day: "DATE(o.created_at)",
    week: "YEARWEEK(o.created_at, 1)",
    month: "DATE_FORMAT(o.created_at, '%Y-%m')",
  }[groupBy];

  const [rows] = await pool.query(
    `SELECT ${groupExpr} as periodo, COUNT(o.id) as total_pedidos, SUM(o.total) as receita_total,
            ROUND(AVG(o.total), 2) as ticket_medio, COUNT(DISTINCT o.customer_id) as clientes_unicos
     FROM orders o WHERE o.created_at BETWEEN ? AND ? AND o.status != 'cancelado'
     GROUP BY ${groupExpr} ORDER BY periodo`,
    [start, end]
  );
  return { titulo: "Relatorio de Vendas", colunas: ["periodo", "total_pedidos", "receita_total", "ticket_medio", "clientes_unicos"], linhas: rows };
}

async function buildClientes(tenantId, query) {
  const { start, end } = getDateRange(query);
  const [rows] = await pool.query(
    `SELECT c.id, c.nome, c.email, COUNT(o.id) as total_pedidos, COALESCE(SUM(o.total), 0) as valor_total,
            MAX(o.created_at) as ultimo_pedido
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id AND o.status != 'cancelado' AND o.created_at BETWEEN ? AND ?
     GROUP BY c.id ORDER BY valor_total DESC LIMIT 20`,
    [start, end]
  );
  return { titulo: "Relatorio de Clientes", colunas: ["id", "nome", "email", "total_pedidos", "valor_total", "ultimo_pedido"], linhas: rows };
}

async function buildLogistica(tenantId, query) {
  const { start, end } = getDateRange(query);
  const [rows] = await pool.query(
    `SELECT p.id, p.nome, p.sku, p.estoque, p.preco, ROUND(p.preco * p.estoque, 2) as valor_em_estoque,
            COALESCE(SUM(oi.quantidade), 0) as unidades_vendidas
     FROM products p
     LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelado' AND o.created_at BETWEEN ? AND ?
     WHERE p.ativo = TRUE
     GROUP BY p.id ORDER BY p.estoque ASC`,
    [start, end]
  );
  return { titulo: "Relatorio de Logistica", colunas: ["id", "nome", "sku", "estoque", "preco", "valor_em_estoque", "unidades_vendidas"], linhas: rows };
}

async function buildProdutos(tenantId, query) {
  const { start, end } = getDateRange(query);
  const [rows] = await pool.query(
    `SELECT p.id, p.nome, p.sku, p.preco, p.estoque, COALESCE(SUM(oi.quantidade), 0) as unidades_vendidas,
            COALESCE(SUM(oi.quantidade * oi.preco_unitario), 0) as receita_gerada
     FROM products p
     LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelado' AND o.created_at BETWEEN ? AND ?
     GROUP BY p.id ORDER BY receita_gerada DESC LIMIT 20`,
    [start, end]
  );
  return { titulo: "Relatorio de Produtos", colunas: ["id", "nome", "sku", "preco", "estoque", "unidades_vendidas", "receita_gerada"], linhas: rows };
}

async function buildMarketplaces(tenantId, query) {
  const { start, end } = getDateRange(query);
  const [internos] = await pool.query(
    `SELECT 'ecomflow' as marketplace, COUNT(*) as total_pedidos, COALESCE(SUM(total), 0) as receita_total,
            ROUND(AVG(total), 2) as ticket_medio
     FROM orders WHERE tenant_id = ? AND created_at BETWEEN ? AND ? AND status != 'cancelado'`,
    [tenantId, start, end]
  );
  const [mkt] = await pool.query(
    `SELECT marketplace, COUNT(*) as total_pedidos, COALESCE(SUM(total), 0) as receita_total,
            ROUND(AVG(total), 2) as ticket_medio
     FROM marketplace_orders WHERE tenant_id = ? AND synced_at BETWEEN ? AND ? GROUP BY marketplace`,
    [tenantId, start, end]
  );
  return { titulo: "Relatorio de Marketplaces", colunas: ["marketplace", "total_pedidos", "receita_total", "ticket_medio"], linhas: [...internos, ...mkt] };
}

async function buildExecutivo(tenantId, query) {
  const dataInicio = query.data_inicio || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const dataFim = query.data_fim || new Date().toISOString().slice(0, 10);

  const [[vendas]] = await pool.query(
    `SELECT COUNT(*) as total_pedidos, COALESCE(SUM(total), 0) as receita_total
     FROM orders WHERE tenant_id = ? AND created_at BETWEEN ? AND ? AND status != 'cancelado'`,
    [tenantId, dataInicio, dataFim + " 23:59:59"]
  );
  const [[pedidosPagos]] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) as receita_pedidos FROM orders WHERE tenant_id = ? AND status = 'pago' AND DATE(created_at) BETWEEN ? AND ?`,
    [tenantId, dataInicio, dataFim]
  );
  const [[manual]] = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN tipo='receita' AND status='pago' THEN valor ELSE 0 END),0) as receita_manual,
            COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pago' THEN valor ELSE 0 END),0) as despesas_pagas
     FROM financial_entries WHERE tenant_id = ? AND data_vencimento BETWEEN ? AND ?`,
    [tenantId, dataInicio, dataFim]
  );
  const [[crm]] = await pool.query(
    `SELECT SUM(CASE WHEN estagio='ganho' THEN 1 ELSE 0 END) as ganhos, SUM(CASE WHEN estagio='perdido' THEN 1 ELSE 0 END) as perdidos,
            COALESCE(SUM(CASE WHEN estagio='ganho' THEN valor ELSE 0 END),0) as receita_ganha
     FROM crm_deals WHERE tenant_id = ? AND estagio IN ('ganho','perdido')`,
    [tenantId]
  );
  const [[estoque]] = await pool.query(
    "SELECT COUNT(*) as total FROM products WHERE tenant_id = ? AND ativo = TRUE AND estoque <= 10",
    [tenantId]
  );
  const [[marketing]] = await pool.query(
    "SELECT COUNT(*) as total FROM marketing_leads WHERE tenant_id = ?",
    [tenantId]
  );

  const receitaFinanceira = Number(pedidosPagos.receita_pedidos) + Number(manual.receita_manual);
  const linhas = [
    { area: "Vendas", metrica: "Total de pedidos", valor: vendas.total_pedidos },
    { area: "Vendas", metrica: "Receita total", valor: Number(vendas.receita_total).toFixed(2) },
    { area: "Financeiro", metrica: "Receita total", valor: receitaFinanceira.toFixed(2) },
    { area: "Financeiro", metrica: "Despesas pagas", valor: Number(manual.despesas_pagas).toFixed(2) },
    { area: "CRM", metrica: "Deals ganhos", valor: crm.ganhos || 0 },
    { area: "CRM", metrica: "Deals perdidos", valor: crm.perdidos || 0 },
    { area: "CRM", metrica: "Receita ganha", valor: Number(crm.receita_ganha).toFixed(2) },
    { area: "Estoque", metrica: "Produtos com estoque baixo", valor: estoque.total },
    { area: "Marketing", metrica: "Total de leads", valor: marketing.total },
  ];
  return { titulo: "Dashboard Executivo", colunas: ["area", "metrica", "valor"], linhas };
}

const BUILDERS = {
  sales: buildSales,
  marketing: buildClientes,
  logistics: buildLogistica,
  products: buildProdutos,
  marketplaces: buildMarketplaces,
  executivo: buildExecutivo,
};

// ── Geradores de arquivo ──

async function gerarXlsx(res, resultado) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(resultado.titulo.slice(0, 31));

  sheet.addRow(resultado.colunas.map((c) => c.toUpperCase()));
  sheet.getRow(1).font = { bold: true };

  resultado.linhas.forEach((linha) => {
    sheet.addRow(resultado.colunas.map((c) => linha[c] ?? ""));
  });

  sheet.columns.forEach((col) => { col.width = 20; });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${resultado.titulo.replace(/\s+/g, "_")}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

function gerarPdf(res, resultado) {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${resultado.titulo.replace(/\s+/g, "_")}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).text(resultado.titulo, { underline: true });
  doc.moveDown();
  doc.fontSize(9).fillColor("#555").text(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
  doc.moveDown();

  const colWidth = (doc.page.width - 80) / resultado.colunas.length;
  const startX = 40;
  let y = doc.y;

  doc.fontSize(10).fillColor("#000");
  resultado.colunas.forEach((c, i) => {
    doc.text(c.toUpperCase(), startX + i * colWidth, y, { width: colWidth, ellipsis: true });
  });
  y += 18;
  doc.moveTo(startX, y).lineTo(doc.page.width - 40, y).stroke();
  y += 6;

  doc.fontSize(9).fillColor("#333");
  resultado.linhas.forEach((linha) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    resultado.colunas.forEach((c, i) => {
      let valor = linha[c] ?? "";
      if (valor instanceof Date) {
        valor = valor.toLocaleDateString("pt-BR");
      }
      doc.text(String(valor), startX + i * colWidth, y, { width: colWidth, ellipsis: true });
    });
    y += 16;
  });

  doc.end();
}

// ── Endpoint unico: /api/reports/:tipo/export?format=xlsx|pdf ──
exports.exportar = async (req, res) => {
  try {
    const { tipo } = req.params;
    const format = (req.query.format || "xlsx").toLowerCase();
    const builder = BUILDERS[tipo];

    if (!builder) return res.status(400).json({ error: `Tipo de relatorio invalido: ${tipo}` });
    if (!["xlsx", "pdf"].includes(format)) return res.status(400).json({ error: "format deve ser 'xlsx' ou 'pdf'" });

    const resultado = await builder(req.tenant_id, req.query);

    if (format === "xlsx") {
      await gerarXlsx(res, resultado);
    } else {
      gerarPdf(res, resultado);
    }
  } catch (err) {
    console.error("[EXPORT ERROR]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro ao exportar relatorio", details: err.message });
    }
  }
};