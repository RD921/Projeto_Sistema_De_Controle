import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import api from "../api";

const CATEGORIAS = ["fornecedores", "marketing", "impostos", "folha", "aluguel", "outros"];

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Financeiro() {
  const { cor } = useOutletContext();
  const navigate = useNavigate();

  const [resumo, setResumo] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ tipo: "despesa", categoria: "outros", descricao: "", valor: "", data_vencimento: "" });

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.get("/financeiro/resumo"),
      api.get("/financeiro/lancamentos", { params: { tipo: filtroTipo || undefined, status: filtroStatus || undefined } }),
    ])
      .then(([r1, r2]) => { setResumo(r1.data); setLancamentos(r2.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtroTipo, filtroStatus]);

  const abrirModal = () => {
    setForm({ tipo: "despesa", categoria: "outros", descricao: "", valor: "", data_vencimento: "" });
    setErro("");
    setModalAberto(true);
  };

  const salvarLancamento = async (e) => {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.data_vencimento) {
      setErro("Preencha todos os campos.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.post("/financeiro/lancamentos", form);
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao salvar lançamento.");
    } finally {
      setSalvando(false);
    }
  };

  const marcarPago = async (id) => {
    try {
      await api.post(`/financeiro/lancamentos/${id}/pagar`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao marcar como pago.");
    }
  };

  const excluir = async (id) => {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await api.delete(`/financeiro/lancamentos/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 14, padding: 20 };
  const inputStyle = { width: "100%", padding: "10px 14px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif", marginBottom: 12 };

  return (
    <div>
      <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: cor.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        Voltar para o painel
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Financeiro</h1>
        <button onClick={abrirModal} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
          + Novo Lançamento
        </button>
      </div>

      {resumo && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Receita (pedidos + manual)</p>
            <h2 style={{ color: "#16a34a", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumo.receita_total)}</h2>
            <p style={{ color: cor.textMuted, fontSize: 11, margin: "4px 0 0" }}>{resumo.qtd_pedidos} pedidos pagos</p>
          </div>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Despesas pagas</p>
            <h2 style={{ color: "#dc2626", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumo.despesas_pagas)}</h2>
          </div>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Despesas pendentes</p>
            <h2 style={{ color: "#f59e0b", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumo.despesas_pendentes)}</h2>
          </div>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Saldo</p>
            <h2 style={{ color: resumo.saldo >= 0 ? "#16a34a" : "#dc2626", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumo.saldo)}</h2>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
          <option value="">Todos os tipos</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="atrasado">Atrasado</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
      ) : lancamentos.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum lançamento manual ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lancamentos.map(l => (
            <div key={l.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: l.tipo === "receita" ? "#16a34a" : "#dc2626",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{l.descricao}</p>
                <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>
                  {l.categoria} · vence em {new Date(l.data_vencimento).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <p style={{ color: l.tipo === "receita" ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>
                {l.tipo === "receita" ? "+" : "-"} {formatarMoeda(l.valor)}
              </p>
              <span style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                background: l.status === "pago" ? "#16a34a22" : l.status === "atrasado" ? "#dc262622" : "#f59e0b22",
                color: l.status === "pago" ? "#16a34a" : l.status === "atrasado" ? "#dc2626" : "#f59e0b",
              }}>
                {l.status}
              </span>
              {l.status !== "pago" && (
                <button onClick={() => marcarPago(l.id)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                  Marcar pago
                </button>
              )}
              <button onClick={() => excluir(l.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalAberto(false)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
            <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Novo Lançamento</h2>
            <form onSubmit={salvarLancamento}>
              <label style={{ fontSize: 12, color: cor.textMuted, marginBottom: 4, display: "block" }}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>

              <label style={{ fontSize: 12, color: cor.textMuted, marginBottom: 4, display: "block" }}>Categoria</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <label style={{ fontSize: 12, color: cor.textMuted, marginBottom: 4, display: "block" }}>Descrição</label>
              <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={inputStyle} placeholder="Ex: Fornecedor de embalagens" />

              <label style={{ fontSize: 12, color: cor.textMuted, marginBottom: 4, display: "block" }}>Valor (R$)</label>
              <input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={inputStyle} placeholder="0,00" />

              <label style={{ fontSize: 12, color: cor.textMuted, marginBottom: 4, display: "block" }}>Data de vencimento</label>
              <input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} style={inputStyle} />

              {erro && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}