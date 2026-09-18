const pool = require("../config/db");
const ml = require("../services/mercadolivreService");

exports.getAuthUrl = (req, res) => {
  try {
    // O tenant_id vai no "state" do OAuth - e como o Mercado Livre nos devolve
    // esse state no callback, sem ele nao teriamos como saber de qual empresa
    // era a autorizacao quando o usuario voltar do Mercado Livre.
    const url = ml.getAuthUrl(req.tenant_id);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar URL de autorizacao", details: err.message });
  }
};

exports.handleCallback = async (req, res) => {
  const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
  try {
    const { code, state } = req.query;
    if (!code) return res.redirect(`${frontendUrl}/integracoes/canais-venda?erro=codigo_ausente`);

    const tenantId = state ? parseInt(state, 10) : null;
    if (!tenantId) {
      console.error("Callback do Mercado Livre sem tenant_id no state - conexao recusada.");
      return res.redirect(`${frontendUrl}/integracoes/canais-venda?erro=tenant_ausente`);
    }

    const tokenData = await ml.exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Isolado por tenant_id + marketplace - cada empresa tem sua propria linha,
    // nunca sobrescreve o token de outra empresa.
    const [existing] = await pool.query(
      "SELECT id FROM integrations WHERE tenant_id = ? AND marketplace = 'mercadolivre'",
      [tenantId]
    );
    if (existing.length > 0) {
      await pool.query(
        "UPDATE integrations SET access_token = ?, refresh_token = ?, expires_at = ?, seller_id = ?, ativo = TRUE WHERE tenant_id = ? AND marketplace = 'mercadolivre'",
        [tokenData.access_token, tokenData.refresh_token, expiresAt, tokenData.user_id, tenantId]
      );
    } else {
      await pool.query(
        "INSERT INTO integrations (tenant_id, marketplace, app_id, client_secret, access_token, refresh_token, expires_at, seller_id) VALUES (?, 'mercadolivre', ?, ?, ?, ?, ?, ?)",
        [tenantId, process.env.ML_APP_ID, process.env.ML_CLIENT_SECRET, tokenData.access_token, tokenData.refresh_token, expiresAt, tokenData.user_id]
      );
    }

    await pool.query(
      `INSERT INTO tenant_integrations (tenant_id, integration_id, status, credenciais, connected_at)
       VALUES (?, 'mercadolivre', 'connected', ?, NOW())
       ON DUPLICATE KEY UPDATE status = 'connected', credenciais = VALUES(credenciais), connected_at = NOW()`,
      [tenantId, JSON.stringify({ seller_id: tokenData.user_id })]
    );

    res.redirect(`${frontendUrl}/integracoes/canais-venda?conectado=mercadolivre`);
  } catch (err) {
    console.error("Erro no callback do Mercado Livre:", err.message);
    res.redirect(`${frontendUrl}/integracoes/canais-venda?erro=falha_conexao`);
  }
};

exports.getIntegrations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, marketplace, seller_id, ativo, expires_at, created_at FROM integrations WHERE tenant_id = ?",
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar integracoes", details: err.message });
  }
};

exports.disconnectIntegration = async (req, res) => {
  try {
    const { marketplace } = req.params;
    await pool.query("UPDATE integrations SET ativo = FALSE WHERE tenant_id = ? AND marketplace = ?", [req.tenant_id, marketplace]);
    await pool.query(
      "UPDATE tenant_integrations SET status = 'disconnected' WHERE tenant_id = ? AND integration_id = ?",
      [req.tenant_id, marketplace]
    );
    res.json({ message: `Integracao com ${marketplace} desativada` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar integracao", details: err.message });
  }
};

exports.syncOrders = async (req, res) => {
  try {
    const { token, sellerId } = await ml.getValidToken(req.tenant_id);
    const mlOrders = await ml.getOrders(token, sellerId);
    let created = 0;
    let updated = 0;
    for (const order of mlOrders) {
      const buyerName = order.buyer?.nickname || "Desconhecido";
      const buyerEmail = order.buyer?.email || null;
      const total = order.total_amount || 0;
      const status = order.status || "unknown";
      const [existing] = await pool.query(
        "SELECT id FROM marketplace_orders WHERE tenant_id = ? AND marketplace = 'mercadolivre' AND marketplace_order_id = ?",
        [req.tenant_id, String(order.id)]
      );
      if (existing.length > 0) {
        await pool.query(
          "UPDATE marketplace_orders SET status = ?, total = ?, raw_data = ?, synced_at = NOW() WHERE tenant_id = ? AND marketplace = 'mercadolivre' AND marketplace_order_id = ?",
          [status, total, JSON.stringify(order), req.tenant_id, String(order.id)]
        );
        updated++;
      } else {
        await pool.query(
          "INSERT INTO marketplace_orders (tenant_id, marketplace, marketplace_order_id, status, total, buyer_name, buyer_email, raw_data) VALUES (?, 'mercadolivre', ?, ?, ?, ?, ?, ?)",
          [req.tenant_id, String(order.id), status, total, buyerName, buyerEmail, JSON.stringify(order)]
        );
        created++;
      }
    }
    res.json({ message: "Sincronizacao concluida", created, updated, total: mlOrders.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao sincronizar pedidos", details: err.message });
  }
};

exports.getMarketplaceOrders = async (req, res) => {
  try {
    const marketplace = req.params.marketplace || "mercadolivre";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const [[countRows], [rows]] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM marketplace_orders WHERE tenant_id = ? AND marketplace = ?", [req.tenant_id, marketplace]),
      pool.query(
        "SELECT id, marketplace_order_id, status, total, buyer_name, buyer_email, synced_at FROM marketplace_orders WHERE tenant_id = ? AND marketplace = ? ORDER BY synced_at DESC LIMIT ? OFFSET ?",
        [req.tenant_id, marketplace, limit, offset]
      )
    ]);
    res.json({ data: rows, page, limit, total: countRows[0].total });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedidos do marketplace", details: err.message });
  }
};

exports.publishProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = await ml.getValidToken(req.tenant_id);
    const [products] = await pool.query("SELECT * FROM products WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (products.length === 0) return res.status(404).json({ error: "Produto nao encontrado" });
    const product = products[0];
    if (product.ml_item_id) {
      return res.status(409).json({
        error: "Produto ja publicado no Mercado Livre",
        ml_item_id: product.ml_item_id
      });
    }
    const mlItem = await ml.publishProduct(token, product);
    await pool.query(
      "UPDATE products SET ml_item_id = ? WHERE id = ? AND tenant_id = ?",
      [mlItem.id, id, req.tenant_id]
    );
    res.json({ message: "Produto publicado com sucesso", ml_item_id: mlItem.id, permalink: mlItem.permalink });
  } catch (err) {
    res.status(500).json({ error: "Erro ao publicar produto", details: err.message });
  }
};

exports.syncProductStock = async (req, res) => {
  try {
    const { token } = await ml.getValidToken(req.tenant_id);
    const [products] = await pool.query(
      "SELECT id, nome, estoque, ml_item_id FROM products WHERE tenant_id = ? AND ml_item_id IS NOT NULL AND ativo = TRUE",
      [req.tenant_id]
    );
    if (products.length === 0) {
      return res.json({ message: "Nenhum produto publicado no ML para sincronizar" });
    }
    const results = [];
    for (const product of products) {
      try {
        await ml.updateProductStock(token, product.ml_item_id, product.estoque);
        results.push({ id: product.id, nome: product.nome, ml_item_id: product.ml_item_id, estoque: product.estoque, status: "ok" });
      } catch (err) {
        results.push({ id: product.id, nome: product.nome, ml_item_id: product.ml_item_id, status: "erro", erro: err.message });
      }
    }
    res.json({ message: "Sincronizacao de estoque concluida", results });
  } catch (err) {
    res.status(500).json({ error: "Erro ao sincronizar estoque", details: err.message });
  }
};

exports.searchMLCategories = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Parametro q e obrigatorio" });
    const { token } = await ml.getValidToken(req.tenant_id);
    const categories = await ml.searchCategories(token, q);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar categorias", details: err.message });
  }
};