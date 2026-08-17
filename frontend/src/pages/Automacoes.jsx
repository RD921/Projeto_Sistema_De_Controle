import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import api from "../api";

const statusCor = {
  draft: "#6e6e73", active: "#4ade80", paused: "#fbbf24", error: "#f87171", archived: "#444",
};
const statusLabel = {
  draft: "Rascunho", active: "Ativa", paused: "Pausada", error: "Erro", archived: "Arquivada",
};

export default function Automacoes() {
  const { cor } = useOutletContext();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNova, setModalNova] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [criando, setCriando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [logs, setLogs] = useState(null);
  const [executando, setExecutando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.get("/automations").then(r => setAutomations(r.data || [])).catch(() => { }).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const criarAutomacao = async (e) => {
    e.preventDefault();
    if (!nomeNova.trim()) return;
    setCriando(true);
    try {
      await api.post("/automations", { name: nomeNova });
      setNomeNova("");
      setModalNova(false);
      carregar();
    } catch (err) {
      alert("Erro ao criar: " + (err.response?.data?.error || err.message));
    } finally {
      setCriando(false);
    }
  };

  const toggleStatus = async (automation) => {
    const acao = automation.status === "active" ? "pause" : "activate";
    try {
      await api.post(`/automations/${automation.id}/${acao}`);
      carregar();
    } catch (err) {
      alert("Erro: " + (err.response?.data?.error || err.message));
    }
  };

  const abrirDetalhe = async (automation) => {
    setDetalhe(automation);
    setLogs(null);
    try {
      const r = await api.get(`/automations/${automation.id}/executions`);
      setExecutions(r.data || []);
    } catch {
      setExecutions([]);
    }
  };

  const executarAgora = async () => {
    if (!detalhe) return;
    setExecutando(true);
    try {
      const r = await api.post(`/automations/${detalhe.id}/execute`, { data: {} });
      if (r.data.status === "failed") {
        alert("Execução falhou: " + r.data.error);
      }
      const rExec = await api.get(`/automations/${detalhe.id}/executions`);
      setExecutions(rExec.data || []);
    } catch (err) {
      alert("Erro ao executar: " + (err.response?.data?.error || err.message));
    } finally {
      setExecutando(false);
    }
  };

  const verLogs = async (executionId) => {
    try {
      const r = await api.get(`/automations/executions/${executionId}/logs`);
      setLogs({ executionId, itens: r.data || [] });
    } catch {
      setLogs({ executionId, itens: [] });
    }
  };

  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 14, padding: 18 };
  const inputStyle = { width: "100%", padding: "10px 14px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Automações</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, margin: "4px 0 0" }}>Apollo Automation Engine — motor próprio, sem depender do n8n</p>
        </div>
        <button onClick={() => setModalNova(true)} style={{ background: cor.text, color: cor.bg, border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
          + Nova Automação
        </button>
      </div>

      {/* KPIs rápidos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total", v: automations.length, c: "#a78bfa" },
          { label: "Ativas", v: automations.filter(a => a.status === "active").length, c: "#4ade80" },
          { label: "Pausadas", v: automations.filter(a => a.status === "paused").length, c: "#fbbf24" },
          { label: "Rascunhos", v: automations.filter(a => a.status === "draft").length, c: "#6e6e73" },
        ].map(k => (
          <div key={k.label} style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>{k.label}</p>
            <h2 style={{ color: k.c, fontSize: 22, fontWeight: 700, margin: 0 }}>{k.v}</h2>
          </div>
        ))}
      </div>

      {/* LISTA */}
      {loading ? (
        <div>{[1, 2, 3].map(i => <div key={i} style={{ height: 64, background: cor.card, borderRadius: 12, marginBottom: 10, opacity: 0.5, border: `1px solid ${cor.border}` }} />)}</div>
      ) : automations.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>⚡</p>
          <p style={{ color: cor.text, fontWeight: 600, margin: 0 }}>Nenhuma automação criada ainda</p>
          <p style={{ color: cor.textMuted, fontSize: 13, marginTop: 4 }}>Clique em "+ Nova Automação" para começar.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {automations.map(a => (
            <div key={a.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => abrirDetalhe(a)}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${statusCor[a.status]}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{a.name}</p>
                <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>{a.description || "Sem descrição"} · v{a.version}</p>
              </div>
              <span style={{ background: `${statusCor[a.status]}22`, color: statusCor[a.status], fontSize: 11.5, padding: "3px 12px", borderRadius: 20, flexShrink: 0 }}>
                {statusLabel[a.status]}
              </span>
              <Link
                to={`/automacoes/${a.id}/editor`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px",
                  cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0, textDecoration: "none",
                }}
              >
                ✎ Editor
              </Link>
              <button onClick={(e) => { e.stopPropagation(); toggleStatus(a); }} style={{
                background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px",
                cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0,
              }}>
                {a.status === "active" ? "⏸ Pausar" : "▶ Ativar"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NOVA AUTOMAÇÃO */}
      {modalNova && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalNova(false)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
            <h2 style={{ color: cor.text, marginBottom: 16, fontSize: 17 }}>Nova Automação</h2>
            <form onSubmit={criarAutomacao}>
              <input value={nomeNova} onChange={e => setNomeNova(e.target.value)} placeholder="Nome da automação" required autoFocus style={inputStyle} />
              <p style={{ color: cor.textMuted, fontSize: 11.5, marginTop: 8 }}>
                Após criar, você poderá definir os nodes (trigger, condições, ações) via API. O editor visual chega na próxima fase.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" onClick={() => setModalNova(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                <button type="submit" disabled={criando} style={{ flex: 1, padding: 11, background: cor.text, color: cor.bg, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                  {criando ? "Criando..." : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHE / EXECUÇÕES */}
      {detalhe && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => { setDetalhe(null); setLogs(null); }} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "82vh", overflowY: "auto" }}>
            <button onClick={() => { setDetalhe(null); setLogs(null); }} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: cor.textMuted, cursor: "pointer", fontSize: 18 }}>✕</button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ color: cor.text, fontSize: 18, margin: 0 }}>{detalhe.name}</h2>
                <p style={{ color: cor.textMuted, fontSize: 12.5, margin: "4px 0 0" }}>Status: {statusLabel[detalhe.status]} · v{detalhe.version}</p>
              </div>
              <button onClick={executarAgora} disabled={executando} style={{
                background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px",
                cursor: executando ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              }}>
                {executando ? "Executando..." : "▶ Executar agora"}
              </button>
            </div>

            <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Histórico de execuções</p>
            {executions.length === 0 ? (
              <p style={{ color: cor.textMuted, fontSize: 12.5 }}>Nenhuma execução ainda. Clique em "Executar agora".</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {executions.map(ex => (
                  <div key={ex.id} style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => verLogs(ex.id)}>
                      <div>
                        <p style={{ color: cor.text, fontSize: 12.5, margin: 0 }}>Execução #{ex.id}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>
                          {ex.duration_ms != null ? `${ex.duration_ms}ms` : "—"} · {new Date(ex.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 20,
                        background: ex.status === "success" ? "#052e16" : ex.status === "failed" ? "#2d0a0a" : "#2d2000",
                        color: ex.status === "success" ? "#4ade80" : ex.status === "failed" ? "#f87171" : "#fbbf24",
                      }}>
                        {ex.status === "success" ? "🟢 Sucesso" : ex.status === "failed" ? "🔴 Falhou" : "🟡 " + ex.status}
                      </span>
                    </div>
                    {ex.error_message && <p style={{ color: "#f87171", fontSize: 11.5, marginTop: 6 }}>{ex.error_message}</p>}

                    {logs?.executionId === ex.id && (
                      <div style={{ marginTop: 10, borderTop: `1px solid ${cor.border}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        {logs.itens.map(l => (
                          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                            <span style={{ color: l.level === "error" ? "#f87171" : cor.textMuted }}>
                              {l.level === "error" ? "🔴" : "🟢"} {l.node_id}: {l.message}
                            </span>
                            <span style={{ color: cor.textMuted, opacity: 0.6 }}>{l.duration_ms}ms</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}