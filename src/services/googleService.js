const axios = require("axios");
const pool = require("../config/db");

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/photoslibrary.readonly",
].join(" ");

function getAuthUrl(tenantId) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: String(tenantId),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const response = await axios.post(TOKEN_URL, {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  return response.data;
}

async function refreshAccessToken(refreshToken) {
  const response = await axios.post(TOKEN_URL, {
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  return response.data;
}

async function getValidToken(tenantId) {
  const [rows] = await pool.query(
    "SELECT * FROM google_integrations WHERE tenant_id = ? AND ativo = TRUE LIMIT 1",
    [tenantId]
  );
  if (rows.length === 0) throw new Error("Google nao conectado");
  const integ = rows[0];
  const now = new Date();
  const expiresAt = new Date(integ.expires_at);

  if (expiresAt <= now) {
    if (!integ.refresh_token) throw new Error("Sessao do Google expirada, reconecte");
    const novo = await refreshAccessToken(integ.refresh_token);
    const novoExpires = new Date(Date.now() + novo.expires_in * 1000);
    await pool.query(
      "UPDATE google_integrations SET access_token = ?, expires_at = ? WHERE tenant_id = ?",
      [novo.access_token, novoExpires, tenantId]
    );
    return novo.access_token;
  }
  return integ.access_token;
}

async function listDriveImages(token) {
  const response = await axios.get("https://www.googleapis.com/drive/v3/files", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: "mimeType contains 'image/' and trashed = false",
      fields: "files(id,name,thumbnailLink,webViewLink)",
      pageSize: 30,
    },
  });
  return (response.data.files || []).map(f => ({
    origem: "drive",
    id: f.id,
    nome: f.name,
    thumbnail: f.thumbnailLink,
    url: f.webViewLink,
  }));
}

async function listPhotos(token) {
  const response = await axios.get("https://photoslibrary.googleapis.com/v1/mediaItems", {
    headers: { Authorization: `Bearer ${token}` },
    params: { pageSize: 30 },
  });
  return (response.data.mediaItems || []).map(m => ({
    origem: "fotos",
    id: m.id,
    nome: m.filename,
    thumbnail: `${m.baseUrl}=w200-h200`,
    url: `${m.baseUrl}=w1600`,
  }));
}

module.exports = {
  getAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getValidToken,
  listDriveImages,
  listPhotos,
};