export const temas = {
  preto: { bg: "#000", sidebar: "#000", header: "#000", border: "#222", text: "#fff", textMuted: "#6e6e73", card: "#111", cardHover: "#1a1a1a", accent: "#38bdf8" },
  branco: { bg: "#f5f5f7", sidebar: "#fff", header: "#fff", border: "#e5e5e5", text: "#1d1d1f", textMuted: "#6e6e73", card: "#fff", cardHover: "#f0f0f2", accent: "#0066cc" },
  sistema: { bg: "#0f172a", sidebar: "#0f172a", header: "#0f172a", border: "#1e293b", text: "#e2e8f0", textMuted: "#64748b", card: "#1e293b", cardHover: "#263348", accent: "#38bdf8" },
};

const CHAVE_TEMA = "tema";
export function getTemaSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    return salvo && temas[salvo] ? salvo : "sistema";
  } catch { return "sistema"; }
}
export function salvarTema(id) {
  try { localStorage.setItem(CHAVE_TEMA, id); } catch {}
}

const CHAVE_IDIOMA = "idioma";
const IDIOMAS_VALIDOS = ["pt", "en", "es"];
export function getIdiomaSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE_IDIOMA);
    return salvo && IDIOMAS_VALIDOS.includes(salvo) ? salvo : "pt";
  } catch { return "pt"; }
}
export function salvarIdioma(id) {
  try { localStorage.setItem(CHAVE_IDIOMA, id); } catch {}
}