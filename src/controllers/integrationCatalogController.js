// src/controllers/integrationCatalogController.js
const pool = require("../config/db");

exports.list = async (req, res) => {
  try {
    const [catalogo] = await pool.query("SELECT * FROM integrations_catalog ORDER BY categoria, label");
    const [conectadas] = await pool.query(
      "SELECT integration_id, status FROM tenant_integrations WHERE tenant_id = ?",
      [req.tenant_id]
    );
    const mapa = Object.fromEntries(conectadas.map(c => [c.integration_id, c.status]));

    res.json(catalogo.map(i => {
      const conectado = mapa[i.id] === "connected";
      return {
        ...i,
        campos_credencial: typeof i.campos_credencial === "string" ? JSON.parse(i.campos_credencial) : i.campos_credencial,
        conectado,
        sincronizacao_real: !!i.sincronizacao_real,
        // Honestidade com o usuario: credencial salva != integracao funcionando de verdade,
        // exceto para as que ja tem sincronizacao_real = TRUE (hoje, so Mercado Livre).
        status_label: !conectado ? "nao_conectado" : (i.sincronizacao_real ? "conectado_ativo" : "credencial_salva"),
      };
    }));
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar integrações", details: err.message });
  }
};

// Salva as credenciais informadas pelo usuário e marca como conectado.
// NOTA: nesta fase, apenas armazena as credenciais — a chamada real à
// API de cada serviço (validar/sincronizar) é feita por integração,
// conforme cada uma for implementada de fato.
exports.connect = async (req, res) => {
  try {
    const { id } = req.params;
    const { credenciais } = req.body;
    const [[integracao]] = await pool.query("SELECT id FROM integrations_catalog WHERE id = ?", [id]);
    if (!integracao) return res.status(404).json({ error: "Integração não encontrada" });

    await pool.query(
      `INSERT INTO tenant_integrations (tenant_id, integration_id, status, credenciais, connected_at)
       VALUES (?, ?, 'connected', ?, NOW())
       ON DUPLICATE KEY UPDATE status = 'connected', credenciais = VALUES(credenciais), connected_at = NOW()`,
      [req.tenant_id, id, JSON.stringify(credenciais || {})]
    );
    res.json({ message: "Integração conectada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao conectar integração", details: err.message });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE tenant_integrations SET status = 'disconnected' WHERE tenant_id = ? AND integration_id = ?",
      [req.tenant_id, id]
    );
    res.json({ message: "Integração desconectada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desconectar integração", details: err.message });
  }
};