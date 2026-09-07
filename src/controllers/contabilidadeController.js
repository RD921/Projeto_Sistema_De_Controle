const pool = require("../config/db");

// ── PLANO DE CONTAS ──

exports.listarContas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM chart_of_accounts WHERE tenant_id = ? ORDER BY codigo",
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar plano de contas", details: err.message });
  }
};

exports.criarConta = async (req, res) => {
  try {
    const { codigo, nome, tipo, natureza, conta_pai_id, nivel } = req.body;
    if (!codigo || !nome || !tipo || !natureza) {
      return res.status(400).json({ error: "codigo, nome, tipo e natureza são obrigatórios" });
    }
    if (!["ativo", "passivo", "patrimonio_liquido", "receita", "despesa"].includes(tipo)) {
      return res.status(400).json({ error: "tipo inválido" });
    }
    if (!["devedora", "credora"].includes(natureza)) {
      return res.status(400).json({ error: "natureza inválida" });
    }

    if (conta_pai_id) {
      const [[pai]] = await pool.query(
        "SELECT id FROM chart_of_accounts WHERE id = ? AND tenant_id = ?",
        [conta_pai_id, req.tenant_id]
      );
      if (!pai) return res.status(400).json({ error: "Conta pai não encontrada" });
    }

    const [result] = await pool.query(
      `INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, codigo, nome, tipo, natureza, conta_pai_id || null, nivel || "analitica"]
    );
    res.status(201).json({ id: result.insertId, message: "Conta criada" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Já existe uma conta com esse código" });
    }
    res.status(500).json({ error: "Erro ao criar conta", details: err.message });
  }
};

exports.atualizarConta = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nome, tipo, natureza, conta_pai_id, nivel, ativo } = req.body;

    const [result] = await pool.query(
      `UPDATE chart_of_accounts
       SET codigo = ?, nome = ?, tipo = ?, natureza = ?, conta_pai_id = ?, nivel = ?, ativo = ?
       WHERE id = ? AND tenant_id = ?`,
      [codigo, nome, tipo, natureza, conta_pai_id || null, nivel, ativo !== undefined ? ativo : true, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Conta não encontrada" });
    res.json({ message: "Conta atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar conta", details: err.message });
  }
};

exports.desativarConta = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "UPDATE chart_of_accounts SET ativo = FALSE WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Conta não encontrada" });
    res.json({ message: "Conta desativada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar conta", details: err.message });
  }
};

// ── LANÇAMENTOS CONTÁBEIS (PARTIDA DOBRADA) ──

exports.listarLancamentos = async (req, res) => {
  try {
    const { de, ate } = req.query;
    let sql = `
      SELECT e.id, e.data, e.historico, e.documento, e.origem, e.created_at,
        (SELECT SUM(valor) FROM accounting_entry_lines WHERE entry_id = e.id AND tipo = 'debito') AS total
      FROM accounting_entries e
      WHERE e.tenant_id = ?`;
    const params = [req.tenant_id];
    if (de) { sql += " AND e.data >= ?"; params.push(de); }
    if (ate) { sql += " AND e.data <= ?"; params.push(ate); }
    sql += " ORDER BY e.data DESC, e.id DESC LIMIT 200";

    const [entries] = await pool.query(sql, params);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar lançamentos", details: err.message });
  }
};

exports.detalharLancamento = async (req, res) => {
  try {
    const { id } = req.params;
    const [[entry]] = await pool.query(
      "SELECT * FROM accounting_entries WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (!entry) return res.status(404).json({ error: "Lançamento não encontrado" });

    const [linhas] = await pool.query(
      `SELECT l.id, l.tipo, l.valor, c.id AS conta_id, c.codigo, c.nome, cc.id AS cost_center_id, cc.nome AS cost_center_nome
       FROM accounting_entry_lines l
       JOIN chart_of_accounts c ON c.id = l.conta_id
       LEFT JOIN cost_centers cc ON cc.id = l.cost_center_id
       WHERE l.entry_id = ?
       ORDER BY l.tipo DESC, l.id`,
      [id]
    );
    res.json({ ...entry, linhas });
  } catch (err) {
    res.status(500).json({ error: "Erro ao detalhar lançamento", details: err.message });
  }
};

exports.criarLancamento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { data, historico, documento, linhas } = req.body;

    if (!data || !historico || !Array.isArray(linhas) || linhas.length < 2) {
      conn.release();
      return res.status(400).json({ error: "data, historico e ao menos 2 linhas (débito e crédito) são obrigatórios" });
    }

    for (const linha of linhas) {
      if (!linha.cost_center_id) {
        conn.release();
        return res.status(400).json({ error: "Todas as linhas do lançamento precisam de um centro de custo" });
      }
    }

    const totalDebito = linhas.filter(l => l.tipo === "debito").reduce((a, l) => a + Number(l.valor || 0), 0);
    const totalCredito = linhas.filter(l => l.tipo === "credito").reduce((a, l) => a + Number(l.valor || 0), 0);

    if (totalDebito <= 0 || totalCredito <= 0) {
      conn.release();
      return res.status(400).json({ error: "É necessário ao menos uma linha de débito e uma de crédito, com valor maior que zero" });
    }
    if (Math.abs(totalDebito - totalCredito) > 0.01) {
      conn.release();
      return res.status(400).json({
        error: "Lançamento não balanceado: soma do débito deve ser igual à soma do crédito",
        total_debito: totalDebito.toFixed(2),
        total_credito: totalCredito.toFixed(2),
      });
    }

    const contaIds = linhas.map(l => l.conta_id);
    const [contas] = await conn.query(
      `SELECT id, nivel FROM chart_of_accounts WHERE id IN (?) AND tenant_id = ?`,
      [contaIds, req.tenant_id]
    );
    if (contas.length !== new Set(contaIds).size) {
      conn.release();
      return res.status(400).json({ error: "Uma ou mais contas informadas não existem ou não pertencem à empresa" });
    }
    const contaSintetica = contas.find(c => c.nivel === "sintetica");
    if (contaSintetica) {
      conn.release();
      return res.status(400).json({ error: "Não é permitido lançar em conta sintética — use uma conta analítica" });
    }

    await conn.beginTransaction();

    const [entryResult] = await conn.query(
      `INSERT INTO accounting_entries (tenant_id, data, historico, documento, origem, usuario_id)
       VALUES (?, ?, ?, ?, 'manual', ?)`,
      [req.tenant_id, data, historico, documento || null, req.user?.id || null]
    );
    const entryId = entryResult.insertId;

    for (const linha of linhas) {
      await conn.query(
        `INSERT INTO accounting_entry_lines (entry_id, conta_id, cost_center_id, tipo, valor) VALUES (?, ?, ?, ?, ?)`,
        [entryId, linha.conta_id, linha.cost_center_id, linha.tipo, linha.valor]
      );
    }

    await conn.commit();
    conn.release();
    res.status(201).json({ id: entryId, message: "Lançamento contábil registrado" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao criar lançamento contábil", details: err.message });
  }
};

exports.excluirLancamento = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM accounting_entries WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lançamento não encontrado" });
    res.json({ message: "Lançamento excluído" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir lançamento", details: err.message });
  }
};

// ── BALANCETE ──

exports.balancete = async (req, res) => {
  try {
    const { de, ate } = req.query;
    const dataDe = de || "1970-01-01";
    const dataAte = ate || "2999-12-31";

    const [contas] = await pool.query(
      "SELECT id, codigo, nome, tipo, natureza, nivel FROM chart_of_accounts WHERE tenant_id = ? AND ativo = TRUE ORDER BY codigo",
      [req.tenant_id]
    );

    const [movimentos] = await pool.query(
      `SELECT l.conta_id,
         SUM(CASE WHEN l.tipo = 'debito' THEN l.valor ELSE 0 END) AS total_debito,
         SUM(CASE WHEN l.tipo = 'credito' THEN l.valor ELSE 0 END) AS total_credito
       FROM accounting_entry_lines l
       JOIN accounting_entries e ON e.id = l.entry_id
       WHERE e.tenant_id = ? AND e.data BETWEEN ? AND ?
       GROUP BY l.conta_id`,
      [req.tenant_id, dataDe, dataAte]
    );

    const mapaMovimento = {};
    movimentos.forEach(m => { mapaMovimento[m.conta_id] = m; });

    const resultado = contas.map(c => {
      const mov = mapaMovimento[c.id] || { total_debito: 0, total_credito: 0 };
      const debito = Number(mov.total_debito);
      const credito = Number(mov.total_credito);
      const saldo = c.natureza === "devedora" ? (debito - credito) : (credito - debito);
      return { ...c, total_debito: debito.toFixed(2), total_credito: credito.toFixed(2), saldo: saldo.toFixed(2) };
    });

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar balancete", details: err.message });
  }
};

// ── DRE ──

exports.dre = async (req, res) => {
  try {
    const { de, ate } = req.query;
    const dataDe = de || "1970-01-01";
    const dataAte = ate || "2999-12-31";

    const [linhas] = await pool.query(
      `SELECT c.id, c.codigo, c.nome, c.tipo, c.natureza,
         SUM(CASE WHEN l.tipo = 'debito' THEN l.valor ELSE 0 END) AS total_debito,
         SUM(CASE WHEN l.tipo = 'credito' THEN l.valor ELSE 0 END) AS total_credito
       FROM chart_of_accounts c
       JOIN accounting_entry_lines l ON l.conta_id = c.id
       JOIN accounting_entries e ON e.id = l.entry_id
       WHERE c.tenant_id = ? AND c.tipo IN ('receita', 'despesa') AND c.nivel = 'analitica'
         AND e.data BETWEEN ? AND ?
       GROUP BY c.id, c.codigo, c.nome, c.tipo, c.natureza
       ORDER BY c.codigo`,
      [req.tenant_id, dataDe, dataAte]
    );

    const receitas = [];
    const despesas = [];
    let totalReceitas = 0;
    let totalDespesas = 0;

    linhas.forEach(l => {
      const debito = Number(l.total_debito);
      const credito = Number(l.total_credito);
      const saldo = l.natureza === "credora" ? (credito - debito) : (debito - credito);

      if (l.tipo === "receita") {
        receitas.push({ codigo: l.codigo, nome: l.nome, valor: saldo.toFixed(2) });
        totalReceitas += saldo;
      } else {
        despesas.push({ codigo: l.codigo, nome: l.nome, valor: saldo.toFixed(2) });
        totalDespesas += saldo;
      }
    });

    const resultado = totalReceitas - totalDespesas;

    res.json({
      periodo: { de: dataDe, ate: dataAte },
      receitas,
      total_receitas: totalReceitas.toFixed(2),
      despesas,
      total_despesas: totalDespesas.toFixed(2),
      resultado_liquido: resultado.toFixed(2),
      margem_liquida: totalReceitas > 0 ? ((resultado / totalReceitas) * 100).toFixed(1) : "0.0",
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar DRE", details: err.message });
  }
};

// ── BALANÇO PATRIMONIAL ──

exports.balancoPatrimonial = async (req, res) => {
  try {
    const { ate } = req.query;
    const dataAte = ate || new Date().toISOString().slice(0, 10);

    const [linhas] = await pool.query(
      `SELECT c.id, c.codigo, c.nome, c.tipo, c.natureza,
         SUM(CASE WHEN l.tipo = 'debito' THEN l.valor ELSE 0 END) AS total_debito,
         SUM(CASE WHEN l.tipo = 'credito' THEN l.valor ELSE 0 END) AS total_credito
       FROM chart_of_accounts c
       JOIN accounting_entry_lines l ON l.conta_id = c.id
       JOIN accounting_entries e ON e.id = l.entry_id
       WHERE c.tenant_id = ? AND c.tipo IN ('ativo', 'passivo', 'patrimonio_liquido') AND c.nivel = 'analitica'
         AND e.data <= ?
       GROUP BY c.id, c.codigo, c.nome, c.tipo, c.natureza
       ORDER BY c.codigo`,
      [req.tenant_id, dataAte]
    );

    const ativo = [];
    const passivo = [];
    const patrimonioLiquido = [];
    let totalAtivo = 0, totalPassivo = 0, totalPL = 0;

    linhas.forEach(l => {
      const debito = Number(l.total_debito);
      const credito = Number(l.total_credito);
      const saldo = l.natureza === "devedora" ? (debito - credito) : (credito - debito);
      const item = { codigo: l.codigo, nome: l.nome, valor: saldo.toFixed(2) };

      if (l.tipo === "ativo") { ativo.push(item); totalAtivo += saldo; }
      else if (l.tipo === "passivo") { passivo.push(item); totalPassivo += saldo; }
      else { patrimonioLiquido.push(item); totalPL += saldo; }
    });

    const [[resultadoRow]] = await pool.query(
      `SELECT
         SUM(CASE WHEN c.tipo = 'receita' AND l.tipo = 'credito' THEN l.valor
                  WHEN c.tipo = 'receita' AND l.tipo = 'debito' THEN -l.valor
                  WHEN c.tipo = 'despesa' AND l.tipo = 'debito' THEN -l.valor
                  WHEN c.tipo = 'despesa' AND l.tipo = 'credito' THEN l.valor
                  ELSE 0 END) AS resultado
       FROM chart_of_accounts c
       JOIN accounting_entry_lines l ON l.conta_id = c.id
       JOIN accounting_entries e ON e.id = l.entry_id
       WHERE c.tenant_id = ? AND c.tipo IN ('receita','despesa') AND e.data <= ?`,
      [req.tenant_id, dataAte]
    );
    const resultadoExercicio = Number(resultadoRow.resultado) || 0;
    totalPL += resultadoExercicio;

    const totalPassivoMaisPL = totalPassivo + totalPL;
    const diferenca = totalAtivo - totalPassivoMaisPL;

    res.json({
      data_referencia: dataAte,
      ativo,
      total_ativo: totalAtivo.toFixed(2),
      passivo,
      total_passivo: totalPassivo.toFixed(2),
      patrimonio_liquido: patrimonioLiquido,
      resultado_exercicio: resultadoExercicio.toFixed(2),
      total_patrimonio_liquido: totalPL.toFixed(2),
      total_passivo_mais_pl: totalPassivoMaisPL.toFixed(2),
      balanceado: Math.abs(diferenca) < 0.01,
      diferenca: diferenca.toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar balanço patrimonial", details: err.message });
  }
};

// ── LIVRO DIÁRIO ──

exports.livroDiario = async (req, res) => {
  try {
    const { de, ate } = req.query;
    const dataDe = de || "1970-01-01";
    const dataAte = ate || "2999-12-31";

    const [entries] = await pool.query(
      `SELECT id, data, historico, documento FROM accounting_entries
       WHERE tenant_id = ? AND data BETWEEN ? AND ?
       ORDER BY data ASC, id ASC`,
      [req.tenant_id, dataDe, dataAte]
    );

    if (entries.length === 0) return res.json([]);

    const ids = entries.map(e => e.id);
    const [linhas] = await pool.query(
      `SELECT l.entry_id, l.tipo, l.valor, c.codigo, c.nome
       FROM accounting_entry_lines l
       JOIN chart_of_accounts c ON c.id = l.conta_id
       WHERE l.entry_id IN (?)
       ORDER BY l.tipo DESC, c.codigo`,
      [ids]
    );

    const linhasPorEntry = {};
    linhas.forEach(l => {
      if (!linhasPorEntry[l.entry_id]) linhasPorEntry[l.entry_id] = [];
      linhasPorEntry[l.entry_id].push(l);
    });

    const resultado = entries.map(e => ({
      ...e,
      linhas: linhasPorEntry[e.id] || [],
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar livro diário", details: err.message });
  }
};

// ── LIVRO RAZÃO ──

exports.livroRazao = async (req, res) => {
  try {
    const { conta_id, de, ate } = req.query;
    if (!conta_id) return res.status(400).json({ error: "conta_id é obrigatório" });

    const dataDe = de || "1970-01-01";
    const dataAte = ate || "2999-12-31";

    const [[conta]] = await pool.query(
      "SELECT id, codigo, nome, natureza FROM chart_of_accounts WHERE id = ? AND tenant_id = ?",
      [conta_id, req.tenant_id]
    );
    if (!conta) return res.status(404).json({ error: "Conta não encontrada" });

    const [movimentos] = await pool.query(
      `SELECT e.id AS entry_id, e.data, e.historico, e.documento, l.tipo, l.valor
       FROM accounting_entry_lines l
       JOIN accounting_entries e ON e.id = l.entry_id
       WHERE l.conta_id = ? AND e.tenant_id = ? AND e.data BETWEEN ? AND ?
       ORDER BY e.data ASC, e.id ASC`,
      [conta_id, req.tenant_id, dataDe, dataAte]
    );

    let saldoAcumulado = 0;
    const linhasComSaldo = movimentos.map(m => {
      const valor = Number(m.valor);
      const efeito = conta.natureza === "devedora"
        ? (m.tipo === "debito" ? valor : -valor)
        : (m.tipo === "credito" ? valor : -valor);
      saldoAcumulado += efeito;
      return { ...m, saldo_acumulado: saldoAcumulado.toFixed(2) };
    });

    res.json({ conta, movimentos: linhasComSaldo, saldo_final: saldoAcumulado.toFixed(2) });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar livro razão", details: err.message });
  }
};