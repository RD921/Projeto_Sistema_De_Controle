const axios = require("axios");
const pool = require("../config/db");
const BASE_URL = "https://api.mercadolibre.com";
const AUTH_URL = "https://auth.mercadolivre.com.br/authorization";
const TOKEN_URL = `${BASE_URL}/oauth/token`;
function getAuthUrl() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ML_APP_ID,
    redirect_uri: process.env.ML_REDIRECT_URI
  });
  return `${AUTH_URL}?${params.toString()}`;
}
async function exchangeCodeForToken(code) {
  const response = await axios.post(TOKEN_URL, {
    grant_type: "authorization_code",
    client_id: process.env.ML_APP_ID,
    client_secret: process.env.ML_CLIENT_SECRET,
    code,
    redirect_uri: process.env.ML_REDIRECT_URI
  });
  return response.data;
}
async function refreshAccessToken(refreshToken) {
  const response = await axios.post(TOKEN_URL, {
    grant_type: "refresh_token",
    client_id: process.env.ML_APP_ID,
    client_secret: process.env.ML_CLIENT_SECRET,
    refresh_token: refreshToken
  });
  return response.data;
}
async function getValidToken() {
  const [rows] = await pool.query(
    "SELECT * FROM integrations WHERE marketplace = 'mercadolivre' AND ativo = TRUE LIMIT 1"
  );
  if (rows.length === 0) throw new Error("Integracao com Mercado Livre nao configurada");
  const integration = rows[0];
  const now = new Date();
  const expiresAt = new Date(integration.expires_at);
  if (expiresAt <= now) {
    const newTokens = await refreshAccessToken(integration.refresh_token);
    const newExpires = new Date(Date.now() + newTokens.expires_in * 1000);
    await pool.query(
      "UPDATE integrations SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?",
      [newTokens.access_token, newTokens.refresh_token, newExpires, integration.id]
    );
    return { token: newTokens.access_token, sellerId: integration.seller_id };
  }
  return { token: integration.access_token, sellerId: integration.seller_id };
}
async function getOrders(token, sellerId) {
  const response = await axios.get(
    `${BASE_URL}/orders/search/recent?seller=${sellerId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.results || [];
}
async function getOrderById(token, orderId) {
  const response = await axios.get(
    `${BASE_URL}/orders/${orderId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
async function publishProduct(token, product) {
  const body = {
    title: product.nome,
    category_id: product.ml_category_id || "MLB3530",
    price: parseFloat(product.preco),
    currency_id: "BRL",
    available_quantity: parseInt(product.estoque),
    buying_mode: "buy_it_now",
    listing_type_id: "gold_special",
    condition: "new"
  };
  if (product.descricao) {
    body.description = { plain_text: product.descricao };
  }
  const response = await axios.post(`${BASE_URL}/items`, body, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}
async function updateProductStock(token, mlItemId, quantity) {
  const response = await axios.put(
    `${BASE_URL}/items/${mlItemId}`,
    { available_quantity: parseInt(quantity) },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
async function searchCategories(token, query) {
  const response = await axios.get(
    `${BASE_URL}/sites/MLB/domain_discovery/search?q=${encodeURIComponent(query)}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
module.exports = {
  getAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getValidToken,
  getOrders,
  getOrderById,
  publishProduct,
  updateProductStock,
  searchCategories
};