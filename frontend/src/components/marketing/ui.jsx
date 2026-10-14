/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useState } from "react";
import api from "../../api";

// Formatadores ---------------------------------------------------------------
export const brl = v => (v === null || v === undefined ? "—" : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export const int = v => (v === null || v === undefined ? "—" : Number(v).toLocaleString("pt-BR"));
export const pct = v => (v === null || v === undefined ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
export const vezes = v => (v === null || v === undefined ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`);
export const dataBR = v => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};
export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const erroDe = (err, padrao = "Algo deu errado. Tente novamente.") => err?.response?.data?.error || padrao;

// Origem de cada número: o usuário sempre sabe de onde ele vem ----------------
export const TIPOS = {
  observado: { rotulo: "Observado", dica: "Contagem direta de dados do sistema.", cor: "#4ade80" },
  calculado: { rotulo: "Calculado", dica: "Conta feita sobre dados observados e o investimento informado.", cor: "#38bdf8" },
  atribuido: { rotulo: "Atribuído", dica: "Receita ligada à campanha por uma regra explícita de atribuição.", cor: "#a78bfa" },
  informado: { rotulo: "Informado", dica: "Valor lançado por uma pessoa da empresa.", cor: "#fbbf24" },
  estimado: { rotulo: "Estimado", dica: "Projeção baseada no histórico. Não é garantia de resultado.", cor: "#f97316" },
};

export function Selo({ tipo }) {
  const t = TIPOS[tipo];
  if (!t) return null;
  return (
    <span title={t.dica} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", color: t.cor, border: `1px solid ${t.cor}55`, background: `${t.cor}14`, borderRadius: 20, padding: "1px 8px", whiteSpace: "nowrap" }}>
      {t.rotulo}
    </span>
  );
}

// Busca de dados sem setState síncrono dentro de efeito -----------------------
export function useGet(url, params = {}, ativo = true) {
  const [n, setN] = useState(0);
  const chave = `${url}|${JSON.stringify(params)}|${n}`;
  const [res, setRes] = useState({ chave: null, data: null, erro: null, headers: null });
  useEffect(() => {
    if (!ativo) return undefined;
    let vivo = true;
    api.get(url, { params })
      .then(r => { if (vivo) setRes({ chave, data: r.data, erro: null, headers: r.headers }); })
      .catch(e => { if (vivo) setRes({ chave, data: null, erro: erroDe(e, "Não foi possível carregar."), headers: null }); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, ativo]);
  const recarregar = useCallback(() => setN(x => x + 1), []);
  return { data: res.chave === chave ? res.data : null, erro: res.chave === chave ? res.erro : null, carregando: ativo && res.chave !== chave, headers: res.headers, recarregar };
}

// Estilos baseados no tema ------------------------------------------------------
export function estilos(cor) {
  return {
    card: { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 },
    input: { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13.5, boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
    label: { color: cor.textMuted, fontSize: 12, display: "block", marginBottom: 5 },
    h3: { color: cor.text, fontSize: 15, fontWeight: 600, margin: 0 },
    muted: { color: cor.textMuted, fontSize: 12.5 },
    btn: { background: cor.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
    ghost: { background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" },
    th: { textAlign: "left", color: cor.textMuted, fontSize: 11.5, fontWeight: 600, padding: "8px 10px", borderBottom: `1px solid ${cor.border}`, whiteSpace: "nowrap" },
    td: { color: cor.text, fontSize: 13, padding: "9px 10px", borderBottom: `1px solid ${cor.border}`, verticalAlign: "top" },
  };
}

export function Carregando({ cor }) {
  return <p style={{ color: cor.textMuted, fontSize: 13.5 }}>Carregando…</p>;
}

export function ErroBox({ texto }) {
  return <div style={{ color: "#f87171", background: "#dc262615", border: "1px solid #dc262640", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>{texto}</div>;
}

export function Vazio({ cor, titulo, texto, children }) {
  return (
    <div style={{ border: `1px dashed ${cor.border}`, borderRadius: 10, padding: 24, textAlign: "center" }}>
      <p style={{ color: cor.text, fontSize: 14, margin: "0 0 4px", fontWeight: 600 }}>{titulo}</p>
      {texto && <p style={{ color: cor.textMuted, fontSize: 13, margin: 0 }}>{texto}</p>}
      {children}
    </div>
  );
}

export function Modal({ cor, titulo, onClose, children, largura = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: largura, maxHeight: "86vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: cor.text, fontSize: 17, margin: 0 }}>{titulo}</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", color: cor.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Aviso({ aviso }) {
  if (!aviso) return null;
  const okk = aviso.tipo === "sucesso";
  return (
    <div style={{ marginBottom: 16, padding: "11px 16px", borderRadius: 10, fontSize: 13.5, background: okk ? "#16a34a15" : "#dc262615", color: okk ? "#4ade80" : "#f87171", border: `1px solid ${okk ? "#16a34a40" : "#dc262640"}` }}>
      {aviso.texto}
    </div>
  );
}

export const TEMP_COR = { quente: "#f87171", morno: "#fbbf24", frio: "#60a5fa" };

export function BadgeTemp({ temperatura }) {
  const c = TEMP_COR[temperatura] || "#888";
  return <span style={{ background: `${c}22`, color: c, fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{temperatura}</span>;
}

export const STATUS_CAMPANHA_COR = { ativa: "#4ade80", pausada: "#fbbf24", rascunho: "#94a3b8", finalizada: "#60a5fa", cancelada: "#f87171", agendada: "#a78bfa" };
