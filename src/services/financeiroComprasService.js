const pool = require("../config/db");

// Gera automaticamente uma Conta a Pagar (financial_entries) quando um pedido
// de compra e confirmado - reaproveitando a mesma tabela e regras do Financeiro,
// sem criar um sistema de obrigacoes paralelo.
async function gerarContaAPagar({ tenantId, pedidoId, fornecedorNome, valorTotal, dataPrevista }) {
  // Garante que existe pelo menos 1 centro de custo para o tenant, criando
  // um generico "Compras" se necessario - a Conta a Pagar nao pode falhar
  // por falta desse cadastro auxiliar.
  let [[centroCusto]] = await pool.query("SELECT id FROM cost_centers WHERE tenant_id = ? AND ativo = TRUE ORDER BY id LIMIT 1", [tenantId]);
  if (!centroCusto) {
    const [result] = await pool.query("INSERT INTO cost_centers (tenant_id, codigo, nome, descricao) VALUES (?, 'COMPRAS', 'Compras', 'Centro de custo padrao gerado automaticamente para obrigacoes de compras')", [tenantId]);
    centroCusto = { id: result.insertId };
  }

  const dataVencimento = dataPrevista || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [result] = await pool.query(
    `INSERT INTO financial_entries (tenant_id, tipo, categoria, descricao, valor, data_vencimento, entidade_nome, cost_center_id, status)
     VALUES (?, 'despesa', 'compras', ?, ?, ?, ?, ?, 'pendente')`,
    [tenantId, `Pedido de compra #${pedidoId} - ${fornecedorNome}`, valorTotal, dataVencimento, fornecedorNome, centroCusto.id]
  );

  return result.insertId;
}

module.exports = { gerarContaAPagar };