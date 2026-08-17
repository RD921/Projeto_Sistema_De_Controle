import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api";

const statusColor = { pendente: "#2d2000", pago: "#052e16", cancelado: "#2d0a0a", enviado: "#0a1a2d", finalizado: "#1a1a1a" };
const statusText = { pendente: "#fbbf24", pago: "#4ade80", cancelado: "#f87171", enviado: "#60a5fa", finalizado: "#9ca3af" };
const statusFluxo = ["pendente", "pago", "enviado", "finalizado"];

export default function Orders() {
  const { cor } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("data_desc");
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState(null);
  const porPagina = 8;

  useEffect(() => {
    setLoading(true);
    api.get("/orders").then(r => setOrders(r.data.data || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  let lista = orders.filter(o => {
    const buscaOk = !busca || o.cliente?.toLowerCase().includes(busca.toLowerCase()) || String(o.id).includes(busca);
    const statusOk = filtroStatus === "todos" || o.status === filtroStatus;
    return buscaOk && statusOk;
  });
  lista = [...lista].sort((a, b) => {
    if (ordenacao === "data_desc") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (ordenacao === "data_asc") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    if (ordenacao === "total_desc") return Number(b.total) - Number(a.total);
    if (ordenacao === "total_asc") return Number(a.total) - Number(b.total);
    return 0;
  });

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const listaPaginada = lista.slice((pagina - 1) * porPagina, pagina * porPagina);

  const inputStyle = { width: "100%", padding: "10px 14px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Pedidos</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, margin: "4px 0 0" }}>{lista.length} pedidos encontrados</p>
        </div>
      </div>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} placeholder="🔍 Buscar por cliente ou nº do pedido..." style={{ ...inputStyle, maxWidth: 280 }} />
        <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }} style={{ ...inputStyle, maxWidth: 170, appearance: "none" }}>
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="enviado">Enviado</option>
          <option value="finalizado">Finalizado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select value={ordenacao} onChange={e => setOrdenacao(e.target.value)} style={{ ...inputStyle, maxWidth: 190, appearance: "none" }}>
          <option value="data_desc">Mais recentes</option>
          <option value="data_asc">Mais antigos</option>
          <option value="total_desc">Maior valor</option>
          <option value="total_asc">Menor valor</option>
        </select>
      </div>

      <div style={{ background: cor.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${cor.border}` }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 44, background: cor.cardHover, borderRadius: 8, marginBottom: 8, opacity: 0.5 }} />
            ))}
          </div>
        ) : listaPaginada.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🛒</p>
            <p style={{ color: cor.text, fontWeight: 600, margin: 0 }}>Nenhum pedido encontrado</p>
            <p style={{ color: cor.textMuted, fontSize: 13, marginTop: 4 }}>Ajuste os filtros para ver mais resultados.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Cliente", "Total", "Status", "Data", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: cor.textMuted, fontWeight: 600, fontSize: 12.5, borderBottom: `1px solid ${cor.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaPaginada.map(o => (
                <tr key={o.id} style={{ borderTop: `1px solid ${cor.border}` }}>
                  <td style={{ padding: "12px 16px", color: cor.textMuted }}>#{o.id}</td>
                  <td style={{ padding: "12px 16px", color: cor.text }}>{o.cliente}</td>
                  <td style={{ padding: "12px 16px", color: cor.text }}>R$ {Number(o.total).toFixed(2)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: statusColor[o.status], color: statusText[o.status], padding: "2px 10px", borderRadius: 20, fontSize: 12 }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: cor.textMuted }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => setDetalhe(o)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPagina(n)} style={{
              width: 30, height: 30, borderRadius: 8, border: `1px solid ${cor.border}`,
              background: pagina === n ? cor.text : "none", color: pagina === n ? cor.bg : cor.textMuted,
              cursor: "pointer", fontSize: 12.5, fontFamily: "inherit",
            }}>{n}</button>
          ))}
        </div>
      )}

      {/* MODAL DETALHE COM TIMELINE */}
      {detalhe && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setDetalhe(null)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
            <button onClick={() => setDetalhe(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: cor.textMuted, cursor: "pointer", fontSize: 18 }}>✕</button>
            <h2 style={{ color: cor.text, marginBottom: 4, fontSize: 17 }}>Pedido #{detalhe.id}</h2>
            <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>{detalhe.cliente} · R$ {Number(detalhe.total).toFixed(2)}</p>

            <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Linha do tempo</p>
            {detalhe.status === "cancelado" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#2d0a0a", borderRadius: 10, padding: 14 }}>
                <span style={{ fontSize: 18 }}>❌</span>
                <span style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>Pedido cancelado</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {statusFluxo.map((s, i) => {
                  const idxAtual = statusFluxo.indexOf(detalhe.status);
                  const concluido = i <= idxAtual;
                  return (
                    <div key={s} style={{ display: "flex", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: concluido ? "#4ade80" : cor.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#000", flexShrink: 0 }}>
                          {concluido ? "✓" : ""}
                        </div>
                        {i < statusFluxo.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: concluido ? "#4ade80" : cor.border }} />}
                      </div>
                      <div style={{ paddingBottom: 20 }}>
                        <p style={{ color: concluido ? cor.text : cor.textMuted, fontSize: 13, fontWeight: concluido ? 600 : 400, margin: 0, textTransform: "capitalize" }}>{s}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}