const pool = require("../config/db");
const { registrar } = require("../services/auditoriaService");

exports.criarInteracao = async (req, res) => {
  try {
    const { customer_id, deal_id, tipo, descricao } = req.body;
    if (!customer_id || !tipo || !descricao) return res.status(400).json({ error: "customer_id, tipo e descricao sao obrigatorios" });

    const [[customer]] = await pool.query("SELECT id FROM customers WHERE id = ? AND tenant_id = ?", [customer_id, req.tenant_id]);
    if (!customer) return res.status(400).json({ error: "customer_id invalido para este tenant" });

    const [result] = await pool.query(
      "INSERT INTO crm_interactions (tenant_id, customer_id, deal_id, tipo, descricao, user_id) VALUES (?, ?, ?, ?, ?, ?)",
      [req.tenant_id, customer_id, deal_id || null, tipo, descricao, req.user?.id || null]
    );
    await registrar(req.tenant_id, req.user, "criar_interacao", "crm_interaction", result.insertId, `Registrou interação (${tipo}) com cliente`);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao registrar interacao", details: err.message });
  }
};

// Edita tipo/descricao de uma interacao ja registrada. Nao mexe em customer_id
// ou deal_id - editar o vinculo e tratado como um caso raro que nao vale a
// complexidade extra agora (o usuario pode excluir e recriar se precisar disso).
exports.editarInteracao = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, descricao } = req.body;
    if (tipo === undefined && descricao === undefined) {
      return res.status(400).json({ error: "informe tipo ou descricao para atualizar" });
    }

    const [[interacao]] = await pool.query("SELECT * FROM crm_interactions WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!interacao) return res.status(404).json({ error: "Interacao nao encontrada" });

    const tiposValidos = ["ligacao", "reuniao", "email", "nota", "whatsapp"];
    const novoTipo = tipo !== undefined ? tipo : interacao.tipo;
    if (!tiposValidos.includes(novoTipo)) return res.status(400).json({ error: "tipo invalido" });
    const novaDescricao = descricao !== undefined ? descricao : interacao.descricao;

    await pool.query("UPDATE crm_interactions SET tipo = ?, descricao = ? WHERE id = ?", [novoTipo, novaDescricao, id]);
    await registrar(req.tenant_id, req.user, "editar_interacao", "crm_interaction", id, `Editou interação (${novoTipo})`);
    res.json({ message: "Interacao atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar interacao", details: err.message });
  }
};

exports.excluirInteracao = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM crm_interactions WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Interacao nao encontrada" });
    await registrar(req.tenant_id, req.user, "excluir_interacao", "crm_interaction", req.params.id, "Excluiu interação");
    res.json({ message: "Interacao excluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir interacao", details: err.message });
  }
};

exports.criarTarefa = async (req, res) => {
  try {
    const { customer_id, deal_id, titulo, prazo } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo e obrigatorio" });

    const [result] = await pool.query(
      "INSERT INTO crm_tasks (tenant_id, customer_id, deal_id, titulo, prazo, responsavel_id) VALUES (?, ?, ?, ?, ?, ?)",
      [req.tenant_id, customer_id || null, deal_id || null, titulo, prazo || null, req.user?.id || null]
    );
    await registrar(req.tenant_id, req.user, "criar_tarefa", "crm_task", result.insertId, `Criou tarefa "${titulo}"`);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar tarefa", details: err.message });
  }
};

// Edita titulo/prazo de uma tarefa. Se o prazo for alterado, reseta
// overdue_notified_at para NULL - senao uma tarefa que ja foi notificada como
// vencida uma vez nunca mais dispararia crm_task_overdue, mesmo que o novo
// prazo tambem venca sem a tarefa ser concluida.
exports.editarTarefa = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, prazo } = req.body;
    if (titulo === undefined && prazo === undefined) {
      return res.status(400).json({ error: "informe titulo ou prazo para atualizar" });
    }

    const [[tarefa]] = await pool.query("SELECT * FROM crm_tasks WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!tarefa) return res.status(404).json({ error: "Tarefa nao encontrada" });

    const novoTitulo = titulo !== undefined ? titulo : tarefa.titulo;
    const novoPrazo = prazo !== undefined ? prazo : tarefa.prazo;
    const resetarNotificacao = prazo !== undefined;

    await pool.query(
      "UPDATE crm_tasks SET titulo = ?, prazo = ?" + (resetarNotificacao ? ", overdue_notified_at = NULL" : "") + " WHERE id = ?",
      [novoTitulo, novoPrazo, id]
    );
    await registrar(req.tenant_id, req.user, "editar_tarefa", "crm_task", id, `Editou tarefa "${tarefa.titulo}" -> "${novoTitulo}"`);
    res.json({ message: "Tarefa atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar tarefa", details: err.message });
  }
};

exports.concluirTarefa = async (req, res) => {
  try {
    const [[tarefa]] = await pool.query("SELECT titulo FROM crm_tasks WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    const [result] = await pool.query("UPDATE crm_tasks SET concluida = TRUE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Tarefa nao encontrada" });
    await registrar(req.tenant_id, req.user, "concluir_tarefa", "crm_task", req.params.id, tarefa ? `Concluiu tarefa "${tarefa.titulo}"` : "Concluiu tarefa");
    res.json({ message: "Tarefa concluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao concluir tarefa", details: err.message });
  }
};

exports.excluirTarefa = async (req, res) => {
  try {
    const [[tarefa]] = await pool.query("SELECT titulo FROM crm_tasks WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    const [result] = await pool.query("DELETE FROM crm_tasks WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Tarefa nao encontrada" });
    await registrar(req.tenant_id, req.user, "excluir_tarefa", "crm_task", req.params.id, tarefa ? `Excluiu tarefa "${tarefa.titulo}"` : "Excluiu tarefa");
    res.json({ message: "Tarefa excluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir tarefa", details: err.message });
  }
};

// Visao 360 do cliente: dados cadastrais + oportunidades + interacoes + tarefas,
// tudo junto, exatamente o conceito de "visao 360" que Marketing ja usa.
exports.visao360 = async (req, res) => {
  try {
    const { customerId } = req.params;
    const [[customer]] = await pool.query("SELECT * FROM customers WHERE id = ? AND tenant_id = ?", [customerId, req.tenant_id]);
    if (!customer) return res.status(404).json({ error: "Cliente nao encontrado" });

    const [deals] = await pool.query("SELECT * FROM crm_deals WHERE customer_id = ? AND tenant_id = ? ORDER BY created_at DESC", [customerId, req.tenant_id]);
    const [interacoes] = await pool.query("SELECT * FROM crm_interactions WHERE customer_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 20", [customerId, req.tenant_id]);
    const [tarefas] = await pool.query("SELECT * FROM crm_tasks WHERE customer_id = ? AND tenant_id = ? ORDER BY prazo ASC", [customerId, req.tenant_id]);
    const [[pedidos]] = await pool.query("SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS valor_total FROM orders WHERE customer_id = ? AND tenant_id = ? AND status = 'pago'", [customerId, req.tenant_id]);

    res.json({ customer, deals, interacoes, tarefas, resumo_pedidos: pedidos });
  } catch (err) {
    res.status(500).json({ error: "Erro ao montar visao 360", details: err.message });
  }
};