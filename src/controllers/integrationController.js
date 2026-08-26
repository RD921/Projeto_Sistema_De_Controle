const pool = require("../config/db");
const ml = require("../services/mercadolivreService");

exports.getAuthUrl = (req, res) => {
  try {
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
    const tokenData = await ml.exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const [existing] = await pool.query(
      "SELECT id FROM integrations WHERE marketplace = 'mercadolivre'"
    );
    if (existing.length > 0) {
      await pool.query(
        "UPDATE integrations SET access_token = ?, refresh_token = ?, expires_at = ?, seller_id = ?, ativo = TRUE WHERE marketplace = 'mercadolivre'",
        [tokenData.access_token, tokenData.refresh_token, expiresAt, tokenData.user_id]
      );
    } else {
      await pool.query(
        "INSERT INTO integrations (marketplace, app_id, client_secret, access_token, refresh_token, expires_at, seller_id) VALUES ('mercadolivre', ?, ?, ?, ?, ?, ?)",
        [process.env.ML_APP_ID, process.env.ML_CLIENT_SECRET, tokenData.access_token, tokenData.refresh_token, expiresAt, tokenData.user_id]
      );
    }

    if (tenantId) {
      await pool.query(
        `INSERT INTO tenant_integrations (tenant_id, integration_id, status, credenciais, connected_at)
         VALUES (?, 'mercadolivre', 'connected', ?, NOW())
         ON DUPLICATE KEY UPDATE status = 'connected', credenciais = VALUES(credenciais), connected_at = NOW()`,
        [tenantId, JSON.stringify({ seller_id: tokenData.user_id })]
      );
    }

    res.redirect(`${frontendUrl}/integracoes/canais-venda?conectado=mercadolivre`);
  } catch (err) {
    console.error("Erro no callback do Mercado Livre:", err.message);
    res.redirect(`${frontendUrl}/integracoes/canais-venda?erro=falha_conexao`);
  }
};

exports.getIntegrations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, marketplace, seller_id, ativo, expires_at, created_at FROM integrations"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar integracoes", details: err.message });
  }
};

exports.disconnectIntegration = async (req, res) => {
  try {
    const { marketplace } = req.params;
    await pool.query("UPDATE integrations SET ativo = FALSE WHERE marketplace = ?", [marketplace]);
    res.json({ message: `Integracao com ${marketplace} desativada` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar integracao", details: err.message });
  }
};

exports.syncOrders = async (req, res) => {
  try {
    const { token, sellerId } = await ml.getValidToken();
    const mlOrders = await ml.getOrders(token, sellerId);
    let created = 0;
    let updated = 0;
    for (const order of mlOrders) {
      const buyerName = order.buyer?.nickname || "Desconhecido";
      const buyerEmail = order.buyer?.email || null;
      const total = order.total_amount || 0;
      const status = order.status || "unknown";
      const [existing] = await pool.query(
        "SELECT id FROM marketplace_orders WHERE marketplace = 'mercadolivre' AND marketplace_order_id = ?",
        [String(order.id)]
      );
      if (existing.length > 0) {
        await pool.query(
          "UPDATE marketplace_orders SET status = ?, total = ?, raw_data = ?, synced_at = NOW() WHERE marketplace = 'mercadolivre' AND marketplace_order_id = ?",
          [status, total, JSON.stringify(order), String(order.id)]
        );
        updated++;
      } else {
        await pool.query(
          "INSERT INTO marketplace_orders (marketplace, marketplace_order_id, status, total, buyer_name, buyer_email, raw_data) VALUES ('mercadolivre', ?, ?, ?, ?, ?, ?)",
          [String(order.id), status, total, buyerName, buyerEmail, JSON.stringify(order)]
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
      pool.query("SELECT COUNT(*) as total FROM marketplace_orders WHERE marketplace = ?", [marketplace]),
      pool.query(
        "SELECT id, marketplace_order_id, status, total, buyer_name, buyer_email, synced_at FROM marketplace_orders WHERE marketplace = ? ORDER BY synced_at DESC LIMIT ? OFFSET ?",
        [marketplace, limit, offset]
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
    const { token } = await ml.getValidToken();
    const [products] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
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
      "UPDATE products SET ml_item_id = ? WHERE id = ?",
      [mlItem.id, id]
    );
    res.json({ message: "Produto publicado com sucesso", ml_item_id: mlItem.id, permalink: mlItem.permalink });
  } catch (err) {
    res.status(500).json({ error: "Erro ao publicar produto", details: err.message });
  }
};

exports.syncProductStock = async (req, res) => {
  try {
    const { token } = await ml.getValidToken();
    const [products] = await pool.query(
      "SELECT id, nome, estoque, ml_item_id FROM products WHERE ml_item_id IS NOT NULL AND ativo = TRUE"
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
    const { token } = await ml.getValidToken();
    const categories = await ml.searchCategories(token, q);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar categorias", details: err.message });
  }
};