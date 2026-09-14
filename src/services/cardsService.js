const pool = require("../config/db");

async function listarCartoes(tenant_id) {
  const [rows] = await pool.query(
    `SELECT c.*, cc.codigo AS cost_center_codigo, cc.nome AS cost_center_nome
     FROM corporate_cards c
     LEFT JOIN cost_centers cc ON cc.id = c.cost_center_id
     WHERE c.tenant_id = ?
     ORDER BY c.ativo DESC, c.nome ASC`,
    [tenant_id]
  );
  return rows;
}

async function buscarCartao(tenant_id, id) {
  const [rows] = await pool.query(
    `SELECT c.*, cc.codigo AS cost_center_codigo, cc.nome AS cost_center_nome
     FROM corporate_cards c
     LEFT JOIN cost_centers cc ON cc.id = c.cost_center_id
     WHERE c.tenant_id = ? AND c.id = ?`,
    [tenant_id, id]
  );
  return rows[0] || null;
}

async function criarCartao(tenant_id, dados) {
  const { nome, bandeira, banco, final_cartao, limite, dia_fechamento, dia_vencimento, cost_center_id } = dados;
  const [result] = await pool.query(
    `INSERT INTO corporate_cards (tenant_id, nome, bandeira, banco, final_cartao, limite, dia_fechamento, dia_vencimento, cost_center_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, nome, bandeira || "outro", banco || null, final_cartao || null, limite, dia_fechamento || 25, dia_vencimento || 10, cost_center_id]
  );
  return buscarCartao(tenant_id, result.insertId);
}

async function atualizarCartao(tenant_id, id, dados) {
  const atual = await buscarCartao(tenant_id, id);
  if (!atual) return null;
  const { nome, bandeira, banco, final_cartao, limite, dia_fechamento, dia_vencimento, cost_center_id } = dados;
  await pool.query(
    `UPDATE corporate_cards SET nome=?, bandeira=?, banco=?, final_cartao=?, limite=?, dia_fechamento=?, dia_vencimento=?, cost_center_id=?
     WHERE tenant_id=? AND id=?`,
    [nome, bandeira || "outro", banco || null, final_cartao || null, limite, dia_fechamento || 25, dia_vencimento || 10, cost_center_id, tenant_id, id]
  );
  return buscarCartao(tenant_id, id);
}

async function desativarCartao(tenant_id, id) {
  await pool.query(`UPDATE corporate_cards SET ativo = 0 WHERE tenant_id = ? AND id = ?`, [tenant_id, id]);
}

function calcularCompetencia(dataStr, diaFechamento) {
  const data = new Date(dataStr + "T00:00:00");
  const dia = data.getDate();
  let ano = data.getFullYear();
  let mes = data.getMonth() + 1;
  if (dia > diaFechamento) {
    mes += 1;
    if (mes > 12) { mes = 1; ano += 1; }
  }
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

async function lancarTransacao(tenant_id, dados) {
  const { card_id, data, descricao, categoria, valor, cost_center_id } = dados;
  const cartao = await buscarCartao(tenant_id, card_id);
  if (!cartao) throw new Error("Cartão não encontrado.");

  const competencia = calcularCompetencia(data, cartao.dia_fechamento);

  const [result] = await pool.query(
    `INSERT INTO card_transactions (tenant_id, card_id, data, descricao, categoria, valor, cost_center_id, competencia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, card_id, data, descricao, categoria || "outros", valor, cost_center_id || null, competencia]
  );

  // garante que existe a fatura aberta correspondente
  await pool.query(
    `INSERT INTO card_invoices (card_id, competencia, valor_total, status)
     VALUES (?, ?, 0, 'aberta')
     ON DUPLICATE KEY UPDATE competencia = competencia`,
    [card_id, competencia]
  );

  await recalcularValorFatura(card_id, competencia);

  const [row] = await pool.query(`SELECT * FROM card_transactions WHERE id = ?`, [result.insertId]);
  return row[0];
}

async function recalcularValorFatura(card_id, competencia) {
  const [[{ total }]] = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) AS total FROM card_transactions WHERE card_id = ? AND competencia = ?`,
    [card_id, competencia]
  );
  await pool.query(
    `UPDATE card_invoices SET valor_total = ? WHERE card_id = ? AND competencia = ?`,
    [total, card_id, competencia]
  );
}

async function excluirTransacao(tenant_id, id) {
  const [rows] = await pool.query(`SELECT * FROM card_transactions WHERE tenant_id = ? AND id = ?`, [tenant_id, id]);
  const transacao = rows[0];
  if (!transacao) return;
  await pool.query(`DELETE FROM card_transactions WHERE id = ?`, [id]);
  await recalcularValorFatura(transacao.card_id, transacao.competencia);
}

async function listarTransacoes(tenant_id, card_id, competencia) {
  const [rows] = await pool.query(
    `SELECT ct.*, cc.codigo AS cost_center_codigo, cc.nome AS cost_center_nome
     FROM card_transactions ct
     LEFT JOIN cost_centers cc ON cc.id = ct.cost_center_id
     WHERE ct.tenant_id = ? AND ct.card_id = ? AND ct.competencia = ?
     ORDER BY ct.data DESC`,
    [tenant_id, card_id, competencia]
  );
  return rows;
}

async function listarFaturas(tenant_id, card_id) {
  const [rows] = await pool.query(
    `SELECT ci.* FROM card_invoices ci
     JOIN corporate_cards c ON c.id = ci.card_id
     WHERE c.tenant_id = ? AND ci.card_id = ?
     ORDER BY ci.competencia DESC`,
    [tenant_id, card_id]
  );
  return rows;
}

async function fecharFatura(tenant_id, card_id, competencia) {
  const cartao = await buscarCartao(tenant_id, card_id);
  if (!cartao) throw new Error("Cartão não encontrado.");

  const [invoiceRows] = await pool.query(
    `SELECT * FROM card_invoices WHERE card_id = ? AND competencia = ?`,
    [card_id, competencia]
  );
  const fatura = invoiceRows[0];
  if (!fatura) throw new Error("Não há fatura para essa competência.");
  if (fatura.status !== "aberta") throw new Error("Essa fatura já foi fechada.");
  if (Number(fatura.valor_total) <= 0) throw new Error("A fatura não tem lançamentos para fechar.");

  const [ano, mes] = competencia.split("-").map(Number);
  const diaVenc = Math.min(cartao.dia_vencimento, 28);
  const dataVencimento = `${ano}-${String(mes).padStart(2, "0")}-${String(diaVenc).padStart(2, "0")}`;

  const [entryResult] = await pool.query(
    `INSERT INTO financial_entries
     (tenant_id, tipo, categoria, cost_center_id, descricao, entidade_nome, valor,
      data_vencimento, total_parcelas, parcela_atual, status, aprovacao_status)
     VALUES (?, 'despesa', 'outros', ?, ?, ?, ?, ?, 1, 1, 'pendente', 'nao_requer')`,
    [
      tenant_id, cartao.cost_center_id, `Fatura ${cartao.nome} — ${competencia}`,
      cartao.nome, fatura.valor_total, dataVencimento,
    ]
  );

  await pool.query(
    `UPDATE card_invoices SET status = 'fechada', financial_entry_id = ?, data_fechamento = NOW()
     WHERE id = ?`,
    [entryResult.insertId, fatura.id]
  );

  const [rows] = await pool.query(`SELECT * FROM card_invoices WHERE id = ?`, [fatura.id]);
  return rows[0];
}

async function limiteDisponivel(tenant_id, card_id) {
  const cartao = await buscarCartao(tenant_id, card_id);
  if (!cartao) return null;

  const [[{ comprometido }]] = await pool.query(
    `SELECT COALESCE(SUM(valor_total), 0) AS comprometido
     FROM card_invoices WHERE card_id = ? AND status IN ('aberta', 'fechada')`,
    [card_id]
  );

  return {
    limite: Number(cartao.limite),
    comprometido: Number(comprometido),
    disponivel: Number(cartao.limite) - Number(comprometido),
  };
}

module.exports = {
  listarCartoes, buscarCartao, criarCartao, atualizarCartao, desativarCartao,
  lancarTransacao, excluirTransacao, listarTransacoes, listarFaturas,
  fecharFatura, limiteDisponivel, calcularCompetencia,
};