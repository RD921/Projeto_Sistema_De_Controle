const pool = require("../config/db");
const { registrar } = require("../services/auditoriaService");
const financeiroService = require("../services/financeiroComprasService");

// ── Fornecedores ──
exports.listarFornecedores = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM compras_fornecedores WHERE tenant_id = ? ORDER BY nome", [req.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar fornecedores", details: err.message });
  }
};

exports.criarFornecedor = async (req, res) => {
  try {
    const { nome, cnpj, contato, telefone, email, prazo_entrega_dias } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    const [result] = await pool.query(
      "INSERT INTO compras_fornecedores (tenant_id, nome, cnpj, contato, telefone, email, prazo_entrega_dias) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.tenant_id, nome, cnpj || null, contato || null, telefone || null, email || null, prazo_entrega_dias || null]
    );
    await registrar(req.tenant_id, req.user, "criar_fornecedor", "compras_fornecedor", result.insertId, `Criou fornecedor "${nome}"`);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar fornecedor", details: err.message });
  }
};

exports.atualizarFornecedor = async (req, res) => {
  try {
    const { nome, cnpj, contato, telefone, email, prazo_entrega_dias } = req.body;
    const [[fornecedor]] = await pool.query("SELECT nome FROM compras_fornecedores WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!fornecedor) return res.status(404).json({ error: "Fornecedor nao encontrado" });

    await pool.query(
      "UPDATE compras_fornecedores SET nome = ?, cnpj = ?, contato = ?, telefone = ?, email = ?, prazo_entrega_dias = ? WHERE id = ? AND tenant_id = ?",
      [nome, cnpj || null, contato || null, telefone || null, email || null, prazo_entrega_dias || null, req.params.id, req.tenant_id]
    );
    await registrar(req.tenant_id, req.user, "editar_fornecedor", "compras_fornecedor", req.params.id, `Editou fornecedor "${fornecedor.nome}"`);
    res.json({ message: "Fornecedor atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar fornecedor", details: err.message });
  }
};

exports.desativarFornecedor = async (req, res) => {
  try {
    const [[fornecedor]] = await pool.query("SELECT nome FROM compras_fornecedores WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    await pool.query("UPDATE compras_fornecedores SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    await registrar(req.tenant_id, req.user, "desativar_fornecedor", "compras_fornecedor", req.params.id, fornecedor ? `Desativou fornecedor "${fornecedor.nome}"` : "Desativou fornecedor");
    res.json({ message: "Fornecedor desativado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar fornecedor", details: err.message });
  }
};

// ── Pedidos de Compra ──
exports.listarPedidos = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT p.*, f.nome AS fornecedor_nome FROM compras_pedidos p
               JOIN compras_fornecedores f ON f.id = p.fornecedor_id WHERE p.tenant_id = ?`;
    const params = [req.tenant_id];
    if (status) { sql += " AND p.status = ?"; params.push(status); }
    sql += " ORDER BY p.created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar pedidos de compra", details: err.message });
  }
};

exports.buscarPedido = async (req, res) => {
  try {
    const [[pedido]] = await pool.query(
      `SELECT p.*, f.nome AS fornecedor_nome, f.contato AS fornecedor_contato FROM compras_pedidos p
       JOIN compras_fornecedores f ON f.id = p.fornecedor_id WHERE p.id = ? AND p.tenant_id = ?`,
      [req.params.id, req.tenant_id]
    );
    if (!pedido) return res.status(404).json({ error: "Pedido nao encontrado" });

    const [itens] = await pool.query(
      `SELECT i.*, pr.nome AS produto_nome, pr.sku FROM compras_itens i
       JOIN products pr ON pr.id = i.product_id WHERE i.pedido_id = ?`,
      [pedido.id]
    );

    res.json({ ...pedido, itens });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedido", details: err.message });
  }
};

exports.criarPedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { fornecedor_id, data_prevista, observacoes, itens } = req.body;
    if (!fornecedor_id) { conn.release(); return res.status(400).json({ error: "fornecedor_id e obrigatorio" }); }
    if (!Array.isArray(itens) || itens.length === 0) { conn.release(); return res.status(400).json({ error: "informe ao menos um item" }); }

    const [[fornecedor]] = await conn.query("SELECT id FROM compras_fornecedores WHERE id = ? AND tenant_id = ?", [fornecedor_id, req.tenant_id]);
    if (!fornecedor) { conn.release(); return res.status(400).json({ error: "fornecedor_id invalido para este tenant" }); }

    let valorTotal = 0;
    for (const item of itens) {
      if (!item.product_id || !item.quantidade || item.preco_unitario == null) {
        conn.release();
        return res.status(400).json({ error: "cada item precisa de product_id, quantidade e preco_unitario" });
      }
      valorTotal += item.quantidade * item.preco_unitario;
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO compras_pedidos (tenant_id, fornecedor_id, data_prevista, observacoes, valor_total, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [req.tenant_id, fornecedor_id, data_prevista || null, observacoes || null, valorTotal, req.user?.id || null]
    );
    const pedidoId = result.insertId;

    for (const item of itens) {
      const [[produto]] = await conn.query("SELECT id FROM products WHERE id = ? AND tenant_id = ?", [item.product_id, req.tenant_id]);
      if (!produto) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: `product_id ${item.product_id} invalido para este tenant` });
      }
      await conn.query(
        "INSERT INTO compras_itens (pedido_id, product_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)",
        [pedidoId, item.product_id, item.quantidade, item.preco_unitario]
      );
    }

    await conn.commit();
    conn.release();

    await registrar(req.tenant_id, req.user, "criar_pedido_compra", "compras_pedido", pedidoId, `Criou pedido de compra no valor de R$ ${valorTotal.toFixed(2)}`);

    res.status(201).json({ id: pedidoId, valor_total: valorTotal });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao criar pedido de compra", details: err.message });
  }
};

exports.mudarStatusPedido = async (req, res) => {
  try {
    const { status } = req.body;
    const validos = ["rascunho", "enviado", "confirmado", "parcialmente_recebido", "recebido", "cancelado"];
    if (!validos.includes(status)) return res.status(400).json({ error: `status deve ser um de: ${validos.join(", ")}` });

    const [[pedido]] = await pool.query(
      `SELECT p.status, p.valor_total, p.data_prevista, f.nome AS fornecedor_nome
       FROM compras_pedidos p JOIN compras_fornecedores f ON f.id = p.fornecedor_id
       WHERE p.id = ? AND p.tenant_id = ?`,
      [req.params.id, req.tenant_id]
    );
    if (!pedido) return res.status(404).json({ error: "Pedido nao encontrado" });

    await pool.query("UPDATE compras_pedidos SET status = ? WHERE id = ? AND tenant_id = ?", [status, req.params.id, req.tenant_id]);
    await registrar(req.tenant_id, req.user, "mudar_status_pedido_compra", "compras_pedido", req.params.id, `Status: ${pedido.status} -> ${status}`);

    // Ao confirmar o pedido, a obrigacao financeira se torna real - gera a
    // Conta a Pagar automaticamente, reaproveitando o Financeiro existente.
    // So gera uma vez (se o status ja era 'confirmado' antes, nao duplica).
    if (status === "confirmado" && pedido.status !== "confirmado") {
      try {
        const contaId = await financeiroService.gerarContaAPagar({
          tenantId: req.tenant_id, pedidoId: req.params.id, fornecedorNome: pedido.fornecedor_nome,
          valorTotal: pedido.valor_total, dataPrevista: pedido.data_prevista,
        });
        await registrar(req.tenant_id, req.user, "gerar_conta_a_pagar_compra", "financial_entry", contaId, `Gerou Conta a Pagar de R$ ${pedido.valor_total} para o pedido #${req.params.id}`);
      } catch (errFinanceiro) {
        console.error("[COMPRAS] Erro ao gerar Conta a Pagar automatica:", errFinanceiro.message);
        // Nao bloqueia a mudanca de status do pedido por falha na geracao financeira
      }
    }

    res.json({ message: "Status atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao mudar status", details: err.message });
  }
};

// ── FASE 2: Cotacoes ──
exports.criarCotacao = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { titulo, data_limite, observacoes, itens, fornecedor_ids } = req.body;
    if (!titulo) { conn.release(); return res.status(400).json({ error: "titulo e obrigatorio" }); }
    if (!Array.isArray(itens) || itens.length === 0) { conn.release(); return res.status(400).json({ error: "informe ao menos um item" }); }
    if (!Array.isArray(fornecedor_ids) || fornecedor_ids.length === 0) { conn.release(); return res.status(400).json({ error: "convide ao menos um fornecedor" }); }

    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO compras_cotacoes (tenant_id, titulo, data_limite, observacoes, created_by) VALUES (?, ?, ?, ?, ?)",
      [req.tenant_id, titulo, data_limite || null, observacoes || null, req.user?.id || null]
    );
    const cotacaoId = result.insertId;

    for (const item of itens) {
      const [[produto]] = await conn.query("SELECT id FROM products WHERE id = ? AND tenant_id = ?", [item.product_id, req.tenant_id]);
      if (!produto) { await conn.rollback(); conn.release(); return res.status(400).json({ error: `product_id ${item.product_id} invalido` }); }
      await conn.query("INSERT INTO compras_cotacao_itens (cotacao_id, product_id, quantidade) VALUES (?, ?, ?)", [cotacaoId, item.product_id, item.quantidade]);
    }

    for (const fornecedorId of fornecedor_ids) {
      const [[fornecedor]] = await conn.query("SELECT id FROM compras_fornecedores WHERE id = ? AND tenant_id = ?", [fornecedorId, req.tenant_id]);
      if (!fornecedor) { await conn.rollback(); conn.release(); return res.status(400).json({ error: `fornecedor_id ${fornecedorId} invalido` }); }
      await conn.query("INSERT INTO compras_cotacao_fornecedores (cotacao_id, fornecedor_id) VALUES (?, ?)", [cotacaoId, fornecedorId]);
    }

    await conn.commit();
    conn.release();

    await registrar(req.tenant_id, req.user, "criar_cotacao", "compras_cotacao", cotacaoId, `Criou cotação "${titulo}" com ${itens.length} item(ns) e ${fornecedor_ids.length} fornecedor(es)`);

    res.status(201).json({ id: cotacaoId });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao criar cotacao", details: err.message });
  }
};

exports.listarCotacoes = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = "SELECT * FROM compras_cotacoes WHERE tenant_id = ?";
    const params = [req.tenant_id];
    if (status) { sql += " AND status = ?"; params.push(status); }
    sql += " ORDER BY created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar cotacoes", details: err.message });
  }
};

// Retorna a "grade de comparacao": para cada item, o preco que cada fornecedor
// convidado registrou (ou null se ainda nao respondeu). E o formato pronto para
// o frontend renderizar uma tabela item x fornecedor sem processamento extra.
exports.buscarCotacao = async (req, res) => {
  try {
    const [[cotacao]] = await pool.query("SELECT * FROM compras_cotacoes WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!cotacao) return res.status(404).json({ error: "Cotacao nao encontrada" });

    const [itens] = await pool.query(
      `SELECT i.id, i.product_id, i.quantidade, p.nome AS produto_nome, p.sku
       FROM compras_cotacao_itens i JOIN products p ON p.id = i.product_id WHERE i.cotacao_id = ?`,
      [cotacao.id]
    );

    const [fornecedores] = await pool.query(
      `SELECT f.id, f.nome FROM compras_cotacao_fornecedores cf JOIN compras_fornecedores f ON f.id = cf.fornecedor_id WHERE cf.cotacao_id = ?`,
      [cotacao.id]
    );

    const [precos] = await pool.query(
      `SELECT p.cotacao_item_id, p.fornecedor_id, p.preco_unitario, p.prazo_entrega_dias
       FROM compras_cotacao_precos p JOIN compras_cotacao_itens i ON i.id = p.cotacao_item_id WHERE i.cotacao_id = ?`,
      [cotacao.id]
    );

    const grade = itens.map(item => ({
      ...item,
      precos: fornecedores.map(f => {
        const preco = precos.find(p => p.cotacao_item_id === item.id && p.fornecedor_id === f.id);
        return { fornecedor_id: f.id, fornecedor_nome: f.nome, preco_unitario: preco?.preco_unitario ?? null, prazo_entrega_dias: preco?.prazo_entrega_dias ?? null };
      }),
    }));

    res.json({ ...cotacao, itens: grade, fornecedores });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar cotacao", details: err.message });
  }
};

exports.registrarPreco = async (req, res) => {
  try {
    const { cotacao_item_id, fornecedor_id, preco_unitario, prazo_entrega_dias } = req.body;
    if (!cotacao_item_id || !fornecedor_id || preco_unitario == null) {
      return res.status(400).json({ error: "cotacao_item_id, fornecedor_id e preco_unitario sao obrigatorios" });
    }

    const [[vinculo]] = await pool.query(
      `SELECT i.id FROM compras_cotacao_itens i
       JOIN compras_cotacoes c ON c.id = i.cotacao_id
       WHERE i.id = ? AND c.tenant_id = ? AND c.status = 'aberta'`,
      [cotacao_item_id, req.tenant_id]
    );
    if (!vinculo) return res.status(400).json({ error: "Item de cotacao invalido ou cotacao ja fechada" });

    await pool.query(
      `INSERT INTO compras_cotacao_precos (cotacao_item_id, fornecedor_id, preco_unitario, prazo_entrega_dias)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE preco_unitario = VALUES(preco_unitario), prazo_entrega_dias = VALUES(prazo_entrega_dias)`,
      [cotacao_item_id, fornecedor_id, preco_unitario, prazo_entrega_dias || null]
    );

    res.json({ message: "Preco registrado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao registrar preco", details: err.message });
  }
};

// Converte a cotacao em pedido(s) de compra reais, reaproveitando a mesma
// logica/tabelas de compras_pedidos - nao existe um "pedido de cotacao" paralelo.
// O comprador escolhe, para cada item, qual fornecedor venceu; itens do mesmo
// fornecedor viram um unico pedido (agrupado), fornecedores diferentes geram
// pedidos separados.
exports.converterEmPedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { escolhas } = req.body; // [{ cotacao_item_id, fornecedor_id }]
    if (!Array.isArray(escolhas) || escolhas.length === 0) { conn.release(); return res.status(400).json({ error: "informe as escolhas de fornecedor vencedor por item" }); }

    const [[cotacao]] = await conn.query("SELECT * FROM compras_cotacoes WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!cotacao) { conn.release(); return res.status(404).json({ error: "Cotacao nao encontrada" }); }
    if (cotacao.status === "convertida") { conn.release(); return res.status(409).json({ error: "Cotacao ja foi convertida em pedido" }); }

    const porFornecedor = {};
    for (const escolha of escolhas) {
      const [[item]] = await conn.query(
        `SELECT i.product_id, i.quantidade, p.preco_unitario FROM compras_cotacao_itens i
         LEFT JOIN compras_cotacao_precos p ON p.cotacao_item_id = i.id AND p.fornecedor_id = ?
         WHERE i.id = ? AND i.cotacao_id = ?`,
        [escolha.fornecedor_id, escolha.cotacao_item_id, cotacao.id]
      );
      if (!item || item.preco_unitario == null) { await conn.rollback(); conn.release(); return res.status(400).json({ error: `Fornecedor escolhido nao registrou preco para o item ${escolha.cotacao_item_id}` }); }

      if (!porFornecedor[escolha.fornecedor_id]) porFornecedor[escolha.fornecedor_id] = [];
      porFornecedor[escolha.fornecedor_id].push({ product_id: item.product_id, quantidade: item.quantidade, preco_unitario: item.preco_unitario });
    }

    await conn.beginTransaction();

    const pedidosCriados = [];
    for (const [fornecedorId, itens] of Object.entries(porFornecedor)) {
      const valorTotal = itens.reduce((acc, i) => acc + i.quantidade * i.preco_unitario, 0);
      const [result] = await conn.query(
        "INSERT INTO compras_pedidos (tenant_id, fornecedor_id, valor_total, created_by, observacoes) VALUES (?, ?, ?, ?, ?)",
        [req.tenant_id, fornecedorId, valorTotal, req.user?.id || null, `Gerado a partir da cotação "${cotacao.titulo}"`]
      );
      for (const item of itens) {
        await conn.query("INSERT INTO compras_itens (pedido_id, product_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)", [result.insertId, item.product_id, item.quantidade, item.preco_unitario]);
      }
      pedidosCriados.push(result.insertId);
    }

    await conn.query("UPDATE compras_cotacoes SET status = 'convertida' WHERE id = ?", [cotacao.id]);

    await conn.commit();
    conn.release();

    await registrar(req.tenant_id, req.user, "converter_cotacao_pedido", "compras_cotacao", cotacao.id, `Convertida em ${pedidosCriados.length} pedido(s) de compra`);

    res.json({ message: "Cotacao convertida", pedidos_criados: pedidosCriados });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao converter cotacao", details: err.message });
  }
};

exports.fecharCotacao = async (req, res) => {
  try {
    const [[cotacao]] = await pool.query("SELECT titulo, status FROM compras_cotacoes WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!cotacao) return res.status(404).json({ error: "Cotacao nao encontrada" });
    if (cotacao.status !== "aberta") return res.status(409).json({ error: "So e possivel fechar uma cotacao aberta" });

    await pool.query("UPDATE compras_cotacoes SET status = 'fechada' WHERE id = ?", [req.params.id]);
    await registrar(req.tenant_id, req.user, "fechar_cotacao", "compras_cotacao", req.params.id, `Fechou cotação "${cotacao.titulo}" sem registrar novos precos`);
    res.json({ message: "Cotacao fechada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao fechar cotacao", details: err.message });
  }
};

// ── FASE 3: Recebimento (integra com Estoque) ──
const { ajustarEstoque } = require("../services/estoqueService");

// Registra o recebimento (total ou parcial) de um pedido de compra:
// da entrada real no estoque via estoqueService (mesma logica usada em /stock/:id/ajustar,
// sem duplicar), atualiza quantidade_recebida do item, e move o pedido para
// "parcialmente_recebido" ou "recebido" automaticamente conforme o que falta.
exports.receberPedido = async (req, res) => {
  try {
    const { itens } = req.body; // [{ item_id, quantidade_recebida_agora }]
    if (!Array.isArray(itens) || itens.length === 0) return res.status(400).json({ error: "informe ao menos um item recebido" });

    const [[pedido]] = await pool.query("SELECT * FROM compras_pedidos WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!pedido) return res.status(404).json({ error: "Pedido nao encontrado" });
    if (!["enviado", "confirmado", "parcialmente_recebido"].includes(pedido.status)) {
      return res.status(409).json({ error: "So e possivel receber pedidos enviados, confirmados ou parcialmente recebidos" });
    }

    const movimentacoes = [];
    for (const entrada of itens) {
      const [[item]] = await pool.query(
        `SELECT i.* FROM compras_itens i WHERE i.id = ? AND i.pedido_id = ?`,
        [entrada.item_id, pedido.id]
      );
      if (!item) return res.status(400).json({ error: `Item ${entrada.item_id} nao pertence a este pedido` });

      const faltaReceber = item.quantidade - item.quantidade_recebida;
      if (entrada.quantidade_recebida_agora > faltaReceber) {
        return res.status(400).json({ error: `Item ${entrada.item_id}: tentando receber ${entrada.quantidade_recebida_agora}, mas so faltam ${faltaReceber}` });
      }
      if (entrada.quantidade_recebida_agora <= 0) continue;

      // Entrada real no estoque - mesma funcao usada pelo ajuste manual de estoque
      const resultado = await ajustarEstoque({
        tenantId: req.tenant_id, userId: req.user?.id, productId: item.product_id,
        tipo: "entrada", quantidade: entrada.quantidade_recebida_agora,
        motivo: `Recebimento do pedido de compra #${pedido.id}`,
      });

      await pool.query("UPDATE compras_itens SET quantidade_recebida = quantidade_recebida + ? WHERE id = ?", [entrada.quantidade_recebida_agora, item.id]);
      movimentacoes.push({ item_id: item.id, product_id: item.product_id, quantidade: entrada.quantidade_recebida_agora, estoque_novo: resultado.estoque_novo });
    }

    // Recalcula se o pedido ficou totalmente recebido ou ainda parcial
    const [itensAtualizados] = await pool.query("SELECT quantidade, quantidade_recebida FROM compras_itens WHERE pedido_id = ?", [pedido.id]);
    const totalmenteRecebido = itensAtualizados.every(i => i.quantidade_recebida >= i.quantidade);
    const novoStatus = totalmenteRecebido ? "recebido" : "parcialmente_recebido";

    await pool.query("UPDATE compras_pedidos SET status = ? WHERE id = ?", [novoStatus, pedido.id]);

    await registrar(req.tenant_id, req.user, "receber_pedido_compra", "compras_pedido", pedido.id, `Recebeu ${movimentacoes.length} item(ns), status: ${novoStatus}`);

    res.json({ message: "Recebimento registrado", status: novoStatus, movimentacoes });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : "Erro ao registrar recebimento", details: err.status ? undefined : err.message });
  }
};

// ── FASE 5: Indicadores ──
exports.indicadores = async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    const [[resumo]] = await pool.query(
      `SELECT COUNT(*) AS total_pedidos, COALESCE(SUM(valor_total), 0) AS valor_total_periodo,
              SUM(CASE WHEN status = 'recebido' THEN 1 ELSE 0 END) AS total_recebidos,
              SUM(CASE WHEN status IN ('enviado','confirmado','parcialmente_recebido') THEN 1 ELSE 0 END) AS total_em_andamento
       FROM compras_pedidos WHERE tenant_id = ?`,
      [tenantId]
    );

    const [porFornecedor] = await pool.query(
      `SELECT f.nome, COUNT(p.id) AS total_pedidos, COALESCE(SUM(p.valor_total), 0) AS valor_total
       FROM compras_pedidos p JOIN compras_fornecedores f ON f.id = p.fornecedor_id
       WHERE p.tenant_id = ? GROUP BY f.id ORDER BY valor_total DESC LIMIT 10`,
      [tenantId]
    );

    // Prazo medio real: diferenca entre criacao do pedido e o momento em que
    // ele foi totalmente recebido (usa updated_at como proxy do recebimento final,
    // ja que nao guardamos um "recebido_em" separado).
    const [[prazoMedio]] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(DAY, created_at, updated_at)) AS media_dias
       FROM compras_pedidos WHERE tenant_id = ? AND status = 'recebido'`,
      [tenantId]
    );

    const [produtosMaisComprados] = await pool.query(
      `SELECT pr.nome, pr.sku, SUM(i.quantidade) AS quantidade_total, COALESCE(SUM(i.quantidade * i.preco_unitario), 0) AS valor_total
       FROM compras_itens i
       JOIN compras_pedidos p ON p.id = i.pedido_id
       JOIN products pr ON pr.id = i.product_id
       WHERE p.tenant_id = ? GROUP BY pr.id ORDER BY quantidade_total DESC LIMIT 10`,
      [tenantId]
    );

    res.json({
      total_pedidos: Number(resumo.total_pedidos) || 0,
      valor_total_periodo: Number(resumo.valor_total_periodo) || 0,
      total_recebidos: Number(resumo.total_recebidos) || 0,
      total_em_andamento: Number(resumo.total_em_andamento) || 0,
      prazo_medio_recebimento_dias: prazoMedio.media_dias != null ? Math.round(prazoMedio.media_dias) : null,
      por_fornecedor: porFornecedor,
      produtos_mais_comprados: produtosMaisComprados,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular indicadores de compras", details: err.message });
  }
};