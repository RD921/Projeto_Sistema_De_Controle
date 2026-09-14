import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

const SECOES = {
  pipeline: "Pipeline",
  dashboard: "Dashboard",
};

const ESTAGIOS_KANBAN = [
  { key: "prospeccao", label: "Prospeccao", cor: "#60a5fa" },
  { key: "qualificacao", label: "Qualificacao", cor: "#a78bfa" },
  { key: "proposta", label: "Proposta", cor: "#fbbf24" },
  { key: "negociacao", label: "Negociacao", cor: "#fb923c" },
];

const cardStyle = { background: "#111", border: "1px solid #222", borderRadius: 12, padding: 20 };
const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };
const btnGhost = { background: "none", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
const inputSmall = { ...inputStyle, padding: "6px 10px", fontSize: 12 };
const linkBtn = { background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "2px 4px", color: "#60a5fa", fontFamily: "sans-serif", textDecoration: "underline" };

function formatarMoeda(valor) {
  const n = Number(valor || 0);
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PipelineKanban() {
  const [pipeline, setPipeline] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoCustomerId, setNovoCustomerId] = useState("");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Edicao inline do deal (titulo/valor)
  const [editingDealId, setEditingDealId] = useState(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editValor, setEditValor] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregar = function () {
    api.get("/crm/deals/pipeline").then(function (r) { setPipeline(r.data); }).catch(function () {});
  };

  useEffect(function () {
    carregar();
    api.get("/customers").then(function (r) { setCustomers(r.data.data || []); }).catch(function () {});
  }, []);

  const criarDeal = async function () {
    if (!novoCustomerId || !novoTitulo.trim()) return;
    setSalvando(true);
    try {
      await api.post("/crm/deals", {
        customer_id: Number(novoCustomerId),
        titulo: novoTitulo,
        valor: novoValor ? Number(novoValor) : undefined,
      });
      setNovoCustomerId("");
      setNovoTitulo("");
      setNovoValor("");
      setMostrarForm(false);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao criar oportunidade.");
    } finally {
      setSalvando(false);
    }
  };

  const avancarEstagio = async function (dealId, estagioAtual) {
    const indiceAtual = ESTAGIOS_KANBAN.findIndex(function (e) { return e.key === estagioAtual; });
    const proximo = indiceAtual < ESTAGIOS_KANBAN.length - 1 ? ESTAGIOS_KANBAN[indiceAtual + 1].key : "ganho";
    try {
      await api.put("/crm/deals/" + dealId + "/estagio", { estagio: proximo });
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao avancar estagio.");
    }
  };

  const marcarPerdido = async function (dealId) {
    const motivo = window.prompt("Motivo da perda (opcional):");
    try {
      await api.put("/crm/deals/" + dealId + "/estagio", { estagio: "perdido", motivo_perda: motivo || null });
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao marcar como perdido.");
    }
  };

  const excluirDeal = async function (dealId) {
    if (!window.confirm("Excluir esta oportunidade? Essa acao nao pode ser desfeita.")) return;
    try {
      await api.delete("/crm/deals/" + dealId);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao excluir oportunidade.");
    }
  };

  const iniciarEdicao = function (deal) {
    setEditingDealId(deal.id);
    setEditTitulo(deal.titulo);
    setEditValor(deal.valor || "");
  };

  const cancelarEdicao = function () {
    setEditingDealId(null);
  };

  const salvarEdicao = async function (dealId) {
    if (!editTitulo.trim()) return;
    setSalvandoEdicao(true);
    try {
      await api.put("/crm/deals/" + dealId, { titulo: editTitulo, valor: editValor ? Number(editValor) : null });
      setEditingDealId(null);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao editar oportunidade.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  if (!pipeline) return <p style={{ color: "#555", fontSize: 13 }}>Carregando pipeline...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={btnStyle} onClick={function () { setMostrarForm(!mostrarForm); }}>
          {mostrarForm ? "Cancelar" : "+ Nova Oportunidade"}
        </button>
      </div>

      {mostrarForm && (
        <div style={{ ...cardStyle, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Cliente</label>
            <select value={novoCustomerId} onChange={function (e) { setNovoCustomerId(e.target.value); }} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Selecione...</option>
              {customers.map(function (c) { return <option key={c.id} value={c.id}>{c.nome}</option>; })}
            </select>
          </div>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Titulo</label>
            <input value={novoTitulo} onChange={function (e) { setNovoTitulo(e.target.value); }} style={inputStyle} placeholder="Ex: Venda de equipamento" />
          </div>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Valor (R$)</label>
            <input value={novoValor} onChange={function (e) { setNovoValor(e.target.value); }} style={inputStyle} placeholder="0.00" type="number" />
          </div>
          <button style={btnStyle} onClick={criarDeal} disabled={salvando}>{salvando ? "Salvando..." : "Criar"}</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {ESTAGIOS_KANBAN.map(function (estagio) {
          const deals = pipeline[estagio.key] || [];
          const valorTotal = deals.reduce(function (acc, d) { return acc + Number(d.valor || 0); }, 0);
          return (
            <div key={estagio.key} style={{ background: "#0a0a0a", borderRadius: 10, padding: 12, minHeight: 300 }}>
              <div style={{ borderBottom: "2px solid " + estagio.cor, paddingBottom: 8, marginBottom: 10 }}>
                <p style={{ color: estagio.cor, fontSize: 12, fontWeight: 700, margin: 0, textTransform: "uppercase" }}>{estagio.label}</p>
                <p style={{ color: "#555", fontSize: 11, margin: "2px 0 0" }}>{deals.length} deal(s) - {formatarMoeda(valorTotal)}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deals.map(function (deal) {
                  const emEdicao = editingDealId === deal.id;
                  return (
                    <div key={deal.id} style={{ background: "#111", border: "1px solid #222", borderRadius: 8, padding: 10 }}>
                      {emEdicao ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input value={editTitulo} onChange={function (e) { setEditTitulo(e.target.value); }} style={inputSmall} placeholder="Titulo" />
                          <input type="number" value={editValor} onChange={function (e) { setEditValor(e.target.value); }} style={inputSmall} placeholder="Valor (R$)" />
                          <div style={{ display: "flex", gap: 4 }}>
                            <button style={{ ...btnGhost, color: "#4ade80", borderColor: "#4ade8040" }} onClick={function () { salvarEdicao(deal.id); }} disabled={salvandoEdicao}>
                              {salvandoEdicao ? "Salvando..." : "Salvar"}
                            </button>
                            <button style={btnGhost} onClick={cancelarEdicao}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <p
                              style={{ color: "#fff", fontSize: 12, margin: 0, fontWeight: 600, cursor: "pointer", flex: 1 }}
                              onClick={function () { window.location.href = "/crm/customer/" + deal.customer_id; }}
                            >
                              {deal.titulo}
                            </p>
                            <button style={linkBtn} onClick={function () { iniciarEdicao(deal); }}>editar</button>
                          </div>
                          <p style={{ color: "#555", fontSize: 11, margin: "4px 0 8px" }}>{deal.customer_nome} - {formatarMoeda(deal.valor)}</p>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <button style={{ ...btnGhost, color: "#4ade80", borderColor: "#4ade8040" }} onClick={function () { avancarEstagio(deal.id, deal.estagio); }}>
                              Avancar
                            </button>
                            <button style={{ ...btnGhost, color: "#f87171", borderColor: "#f8717140" }} onClick={function () { marcarPerdido(deal.id); }}>
                              Perder
                            </button>
                            <button style={{ ...btnGhost, color: "#888" }} onClick={function () { excluirDeal(deal.id); }}>
                              Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {deals.length === 0 && <p style={{ color: "#333", fontSize: 11, textAlign: "center", padding: 20 }}>Vazio</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardCRM() {
  const [dados, setDados] = useState(null);

  useEffect(function () {
    api.get("/crm/dashboard/resumo").then(function (r) { setDados(r.data); }).catch(function () {});
  }, []);

  if (!dados) return <p style={{ color: "#555", fontSize: 13 }}>Carregando dashboard...</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>Taxa de Conversao</p>
          <h2 style={{ color: "#4ade80", fontSize: 26, fontWeight: 700 }}>
            {dados.fechamentos.taxa_conversao != null ? dados.fechamentos.taxa_conversao + "%" : "-"}
          </h2>
          <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>{dados.fechamentos.ganhos} ganhos / {dados.fechamentos.perdidos} perdidos</p>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>Receita Ganha</p>
          <h2 style={{ color: "#38bdf8", fontSize: 26, fontWeight: 700 }}>{formatarMoeda(dados.fechamentos.receita_ganha)}</h2>
          <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>total fechado</p>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>Ciclo Medio de Venda</p>
          <h2 style={{ color: "#a78bfa", fontSize: 26, fontWeight: 700 }}>
            {dados.ciclo_medio_dias != null ? dados.ciclo_medio_dias + " dias" : "-"}
          </h2>
          <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>criacao ate fechamento</p>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>Tarefas</p>
          <h2 style={{ color: dados.tarefas.vencidas > 0 ? "#f87171" : "#4ade80", fontSize: 26, fontWeight: 700 }}>
            {dados.tarefas.vencidas} vencida(s)
          </h2>
          <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>{dados.tarefas.pendentes} pendente(s) - {dados.tarefas.concluidas} concluida(s)</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={{ color: "#fff", marginBottom: 20, fontSize: 15 }}>Pipeline por Estagio</h3>
          {dados.pipeline_por_estagio.map(function (p) {
            return (
              <div key={p.estagio} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                <span style={{ color: "#ccc", fontSize: 13, textTransform: "capitalize" }}>{p.estagio}</span>
                <span style={{ color: "#fff", fontSize: 13 }}>{p.total} - {formatarMoeda(p.valor_total)}</span>
              </div>
            );
          })}
        </div>

        <div style={cardStyle}>
          <h3 style={{ color: "#fff", marginBottom: 20, fontSize: 15 }}>Motivos de Perda</h3>
          {dados.motivos_perda.length === 0 ? (
            <p style={{ color: "#444", fontSize: 13 }}>Nenhuma perda registrada ainda.</p>
          ) : (
            dados.motivos_perda.map(function (m, i) {
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <span style={{ color: "#ccc", fontSize: 13 }}>{m.motivo_perda}</span>
                  <span style={{ color: "#f87171", fontSize: 13 }}>{m.total}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function CRM() {
  const { secao } = useParams();
  const secaoAtiva = secao || "pipeline";

  return (
    <div>
      <h1 style={{ color: "#fff", fontWeight: 700, marginBottom: 24 }}>{SECOES[secaoAtiva] || "CRM"}</h1>
      {secaoAtiva === "pipeline" && <PipelineKanban />}
      {secaoAtiva === "dashboard" && <DashboardCRM />}
    </div>
  );
}