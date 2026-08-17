const pool = require("../config/db");
const ml = require("../services/mercadolivreService");
exports.handleMercadoLivre = async (req, res) => {
  try {
    const { topic, resource } = req.body || {};
    await pool.query(
      "INSERT INTO webhooks_log (marketplace, topic, resource, payload) VALUES (?, ?, ?, ?)",
      ["mercadolivre", topic || null, resource || null, JSON.stringify(req.body)]
    );
    res.sendStatus(200);
    if (topic === "orders_v2" && resource) {
      try {
        const { token } = await ml.getValidToken();
        const orderId = resource.replace("/orders/", "");
        const orderData = await ml.getOrderById(token, orderId);
        const [existing] = await pool.query(
          "SELECT id FROM marketplace_orders WHERE marketplace = 'mercadolivre' AND marketplace_order_id = ?",
          [String(orderId)]
        );
        if (existing.length > 0) {
          await pool.query(
            "UPDATE marketplace_orders SET status = ?, total = ?, raw_data = ?, synced_at = NOW() WHERE marketplace = 'mercadolivre' AND marketplace_order_id = ?",
            [orderData.status, orderData.total_amount, JSON.stringify(orderData), String(orderId)]
          );
        } else {
          await pool.query(
            `INSERT INTO marketplace_orders (marketplace, marketplace_order_id, status, total, buyer_name, buyer_email, raw_data)
             VALUES ('mercadolivre', ?, ?, ?, ?, ?, ?)`,
            [
              String(orderId),
              orderData.status,
              orderData.total_amount,
              orderData.buyer?.nickname || "Desconhecido",
              orderData.buyer?.email || null,
              JSON.stringify(orderData)
            ]
          );
        }
        await pool.query(
          "UPDATE webhooks_log SET processado = TRUE WHERE marketplace = 'mercadolivre' AND resource = ?",
          [resource]
        );
      } catch (err) {
        console.error("Erro ao processar webhook ML:", err.message);
      }
    }
  } catch (err) {
    console.error("Erro no webhook:", err.message);
    res.sendStatus(500);
  }
};