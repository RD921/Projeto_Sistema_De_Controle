import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api";

export default function Customers() {
  const { cor } = useOutletContext();
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState(null);
  const porPagina = 8;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/customers").then(r => setCustomers(r.data.data || r.data || [])).catch(() => {}),
      api.get("/orders").then(r => setOrders(r.data.data || r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const pedidosDoCliente = (c) => orders.filter(o => o.cliente === c.nome || o.cliente_id === c.id);

  const lista = customers.filter(c => !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.email?.toLowerCase().includes(busca.toLowerCase()));
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const listaPaginada = lista.slice((pagina - 1) * porPagina, pagina * porPagina);

  const inputStyle = { width: "100%", padding: "10px 14px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Clientes</h1>
        <p style={{ color: cor.textMuted, fontSize: 13, margin: "4px 0 0" }}>{lista.length} clientes cadastrados</p>
      </div>

      <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} placeholder="🔍 Buscar por nome ou email..." style={{ ...inputStyle, maxWidth: 320, marginBottom: 18 }} />

      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 64, background: cor.card, borderRadius: 12, marginBottom: 10, opacity: 0.5, border: `1px solid ${cor.border}` }} />
          ))}
        </div>
      ) : listaPaginada.length === 0 ? (
        <div style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 60, textAlign: "center" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
          <p style={{ color: cor.text, fontWeight: 600, margin: 0 }}>Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {listaPaginada.map(c => {
            const pedidos = pedidosDoCliente(c);
            const totalGasto = pedidos.reduce((a, o) => a + Number(o.total || 0), 0);
            const ultimaCompra = pedidos.length > 0 ? pedidos[pedidos.length - 1] : null;
            return (
              <div key={c.id} onClick={() => setDetalhe(c)}
                style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#a78bfa55"}
                onMouseLeave={e => e.currentTarget.style.borderColor = cor.border}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {c.nome?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nome}</p>
                  <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>{c.email}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>R$ {totalGasto.toFixed(2)}</p>
                  <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{pedidos.length} pedido(s)</p>
                </div>
                {pedidos.length > 1 && (
                  <span style={{ background: "#052e16", color: "#4ade80", fontSize: 10.5, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>Recorrente</span>
                )}
              </div>
            );
          })}
        </div>
      )}

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

      {/* MODAL DETALHE DO CLIENTE */}
      {detalhe && (() => {
        const pedidos = pedidosDoCliente(detalhe);
        const totalGasto = pedidos.reduce((a, o) => a + Number(o.total || 0), 0);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setDetalhe(null)} />
            <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 460, maxHeight: "80vh", overflowY: "auto" }}>
              <button onClick={() => setDetalhe(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: cor.textMuted, cursor: "pointer", fontSize: 18 }}>✕</button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>
                  {detalhe.nome?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p style={{ color: cor.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{detalhe.nome}</p>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, margin: "2px 0 0" }}>{detalhe.email}</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <p style={{ color: cor.textMuted, fontSize: 11, margin: "0 0 4px" }}>Total gasto</p>
                  <p style={{ color: "#4ade80", fontSize: 15, fontWeight: 700, margin: 0 }}>R$ {totalGasto.toFixed(0)}</p>
                </div>
                <div style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <p style={{ color: cor.textMuted, fontSize: 11, margin: "0 0 4px" }}>Pedidos</p>
                  <p style={{ color: "#38bdf8", fontSize: 15, fontWeight: 700, margin: 0 }}>{pedidos.length}</p>
                </div>
                <div style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <p style={{ color: cor.textMuted, fontSize: 11, margin: "0 0 4px" }}>Telefone</p>
                  <p style={{ color: cor.text, fontSize: 12, fontWeight: 600, margin: 0 }}>{detalhe.telefone || "—"}</p>
                </div>
              </div>

              <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Histórico de pedidos</p>
              {pedidos.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 12.5 }}>Nenhum pedido registrado.</p>
              ) : pedidos.map(o => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${cor.border}` }}>
                  <span style={{ color: cor.textMuted, fontSize: 12.5 }}>#{o.id} — {o.status}</span>
                  <span style={{ color: cor.text, fontSize: 12.5, fontWeight: 600 }}>R$ {Number(o.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}