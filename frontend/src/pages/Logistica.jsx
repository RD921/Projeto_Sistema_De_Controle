import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import api from "../api";

const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };

const ESTAGIOS_CICLO = [
  "aguardando_separacao", "em_separacao", "conferencia", "em_embalagem", "pronto_expedicao",
  "despachado", "em_transito", "saiu_entrega", "entregue",
];

const CORES_STATUS = {
  aguardando_separacao: "#888", em_separacao: "#60a5fa", conferencia: "#60a5fa", em_embalagem: "#a78bfa",
  pronto_expedicao: "#fbbf24", despachado: "#fb923c", em_transito: "#fb923c", saiu_entrega: "#fb923c",
  entregue: "#4ade80", cancelado: "#f87171", devolvido: "#f87171", extraviado: "#f87171",
  endereco_invalido: "#f87171", aguardando_informacao: "#888", tentativa_entrega: "#fbbf24",
  entrega_recusada: "#f87171", problema_transporte: "#f87171",
};

function formatarMoeda(valor) {
  const n = Number(valor || 0);
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const LABELS_STATUS = {
  aguardando_separacao: "Aguardando Separação",
  em_separacao: "Em Separação",
  conferencia: "Conferência",
  em_embalagem: "Em Embalagem",
  pronto_expedicao: "Pronto para Expedição",
  despachado: "Despachado",
  em_transito: "Em Trânsito",
  saiu_entrega: "Saiu para Entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
  devolvido: "Devolvido",
  extraviado: "Extraviado",
  endereco_invalido: "Endereço Inválido",
  aguardando_informacao: "Aguardando Informação",
  tentativa_entrega: "Tentativa de Entrega",
  entrega_recusada: "Entrega Recusada",
  problema_transporte: "Problema de Transporte",
  solicitada: "Solicitada",
  em_analise: "Em Análise",
  aprovada: "Aprovada",
  etiqueta_gerada: "Etiqueta Gerada",
  em_transporte: "Em Transporte",
  recebida: "Recebida",
  conferida: "Conferida",
  concluida: "Concluída",
  rejeitada: "Rejeitada",
};

function labelStatus(status) {
  return LABELS_STATUS[status] || (status || "").replace(/_/g, " ");
}

function proximoEstagio(atual) {
  const i = ESTAGIOS_CICLO.indexOf(atual);
  if (i === -1 || i === ESTAGIOS_CICLO.length - 1) return null;
  return ESTAGIOS_CICLO[i + 1];
}

// ═══════════════════ FASE 1: DASHBOARD ═══════════════════
function DashboardLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const btnGhost = { background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const labelStyle = { color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 };
  const [dados, setDados] = useState(null);

  useEffect(() => {
    api.get("/logistica/dashboard").then(r => setDados(r.data)).catch(() => setDados(null));
  }, []);

  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Total de Envios</p>
          <h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.total_envios}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Taxa de Entrega</p>
          <h2 style={{ color: "#4ade80", fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.taxa_entrega != null ? dados.taxa_entrega + "%" : "-"}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Atrasados</p>
          <h2 style={{ color: dados.atrasados > 0 ? "#f87171" : cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.atrasados}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Frete Médio</p>
          <h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.frete_medio)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Frete Total</p>
          <h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.frete_total)}</h2>
        </div>
      </div>

      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Envios por Status</h3>
      {dados.por_status.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum envio registrado ainda.</p>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dados.por_status.map(s => (
            <span key={s.status} style={{ background: cor.card, border: `1px solid ${CORES_STATUS[s.status] || cor.border}55`, borderRadius: 20, padding: "6px 16px", fontSize: 12.5, color: CORES_STATUS[s.status] || cor.textMuted, textTransform: "capitalize" }}>
              {labelStatus(s.status)}: <strong>{s.total}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════ FASE 1/2: ENVIOS ═══════════════════
function EnviosLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const btnGhost = { background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const labelStyle = { color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 };
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositos, setDepositos] = useState([]);
  const [transportadoras, setTransportadoras] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ order_id: "", warehouse_id: "", carrier_id: "", peso_kg: "", volumes: 1, frete_valor: "", data_prevista: "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [detalheEnvio, setDetalheEnvio] = useState(null);
  const [formEmbalagem, setFormEmbalagem] = useState({ dimensoes: "", custo: "" });

  const carregar = () => {
    setLoading(true);
    api.get("/logistica/envios").then(r => setEnvios(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
    api.get("/logistica/depositos").then(r => setDepositos(r.data || [])).catch(() => {});
    api.get("/logistica/transportadoras").then(r => setTransportadoras(r.data || [])).catch(() => {});
    api.get("/orders").then(r => setPedidos(r.data.data || r.data || [])).catch(() => {});
  }, []);

  const criarEnvio = async (e) => {
    e.preventDefault();
    if (!form.order_id) { setErro("Selecione um pedido."); return; }
    setSalvando(true);
    setErro("");
    try {
      await api.post("/logistica/envios", {
        ...form,
        warehouse_id: form.warehouse_id || undefined,
        carrier_id: form.carrier_id || undefined,
        peso_kg: form.peso_kg ? Number(form.peso_kg) : undefined,
        frete_valor: form.frete_valor ? Number(form.frete_valor) : undefined,
      });
      setForm({ order_id: "", warehouse_id: "", carrier_id: "", peso_kg: "", volumes: 1, frete_valor: "", data_prevista: "" });
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao criar envio.");
    } finally {
      setSalvando(false);
    }
  };

  const avancarEnvio = async (envio) => {
    const proximo = proximoEstagio(envio.status);
    if (!proximo) return;

    try {
      if (proximo === "em_separacao") {
        await api.post(`/logistica/envios/${envio.id}/iniciar-separacao`);
      } else if (proximo === "conferencia") {
        await api.post(`/logistica/envios/${envio.id}/concluir-separacao`);
      } else if (proximo === "pronto_expedicao") {
        await api.put(`/logistica/envios/${envio.id}/status`, { status: proximo });
      } else {
        await api.put(`/logistica/envios/${envio.id}/status`, { status: proximo });
      }
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao avançar status.");
    }
  };

  const marcarProblema = async (envio, status) => {
    try {
      await api.put(`/logistica/envios/${envio.id}/status`, { status });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao atualizar status.");
    }
  };

  const abrirDetalhe = async (id) => {
    try {
      const r = await api.get(`/logistica/envios/${id}`);
      setDetalheEnvio(r.data);
      setFormEmbalagem({ dimensoes: "", custo: "" });
    } catch (err) {
      alert("Erro ao carregar detalhe do envio.");
    }
  };

  const registrarRastreio = async (id, codigo) => {
    if (!codigo) return;
    try {
      await api.put(`/logistica/envios/${id}/rastreio`, { tracking_code: codigo });
      abrirDetalhe(id);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao registrar rastreio.");
    }
  };

  const salvarEmbalagem = async (id) => {
    try {
      await api.post(`/logistica/envios/${id}/embalagem`, {
        dimensoes: formEmbalagem.dimensoes || undefined,
        custo: formEmbalagem.custo ? Number(formEmbalagem.custo) : undefined,
      });
      abrirDetalhe(id);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao registrar embalagem.");
    }
  };

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={btnStyle} onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? "Cancelar" : "+ Novo Envio"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={criarEnvio} style={{ ...cardStyle, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={{ gridColumn: "span 3" }}>
            <label style={labelStyle}>Pedido</label>
            <select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Selecione um pedido...</option>
              {pedidos.map(p => <option key={p.id} value={p.id}>#{p.id} — {formatarMoeda(p.total)} ({p.status})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Depósito</label>
            <select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Nenhum</option>
              {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Transportadora</label>
            <select value={form.carrier_id} onChange={e => setForm({ ...form, carrier_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Nenhuma</option>
              {transportadoras.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Data prevista</label>
            <input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Peso (kg)</label>
            <input type="number" step="0.001" value={form.peso_kg} onChange={e => setForm({ ...form, peso_kg: e.target.value })} style={inputStyle} placeholder="0.000" />
          </div>
          <div>
            <label style={labelStyle}>Volumes</label>
            <input type="number" min="1" value={form.volumes} onChange={e => setForm({ ...form, volumes: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Frete (R$)</label>
            <input type="number" step="0.01" value={form.frete_valor} onChange={e => setForm({ ...form, frete_valor: e.target.value })} style={inputStyle} placeholder="0.00" />
          </div>
          {erro && <p style={{ color: "#f87171", fontSize: 12.5, gridColumn: "span 3", margin: 0 }}>{erro}</p>}
          <div style={{ gridColumn: "span 3" }}>
            <button type="submit" style={btnStyle} disabled={salvando}>{salvando ? "Salvando..." : "Criar Envio"}</button>
          </div>
        </form>
      )}

      {envios.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum envio registrado ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {envios.map(envio => {
            const proximo = proximoEstagio(envio.status);
            const corStatus = CORES_STATUS[envio.status] || cor.textMuted;
            return (
              <div key={envio.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => abrirDetalhe(envio.id)}>
                  <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>
                    Envio #{envio.id} — Pedido #{envio.order_id} · {envio.customer_nome || "Cliente não identificado"}
                  </p>
                  <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                    {envio.carrier_nome || "sem transportadora"} · {envio.warehouse_nome || "sem depósito"} · {formatarMoeda(envio.frete_valor)}
                  </p>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: corStatus + "22", color: corStatus, textTransform: "capitalize", flexShrink: 0 }}>
                  {labelStatus(envio.status)}
                </span>
                {proximo && (
                  <button style={{ ...btnGhost, color: "#4ade80", borderColor: "#4ade8040" }} onClick={() => avancarEnvio(envio)}>
                    Avançar
                  </button>
                )}
                {!["entregue", "cancelado", "devolvido", "extraviado"].includes(envio.status) && (
                  <button style={{ ...btnGhost, color: "#f87171", borderColor: "#f8717140" }} onClick={() => marcarProblema(envio, "problema_transporte")}>
                    Problema
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {detalheEnvio && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setDetalheEnvio(null)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 500, maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ color: cor.text, marginBottom: 6, fontSize: 17 }}>Envio #{detalheEnvio.id}</h2>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 16 }}>
              Pedido #{detalheEnvio.order_id} · {detalheEnvio.customer_nome || "Cliente não identificado"} · {formatarMoeda(detalheEnvio.pedido_total)}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Código de rastreio</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input defaultValue={detalheEnvio.tracking_code || ""} id="tracking-input" style={inputStyle} placeholder="Ex: BR123456789" />
                <button style={btnGhost} onClick={() => registrarRastreio(detalheEnvio.id, document.getElementById("tracking-input").value)}>Salvar</button>
              </div>
            </div>

            {detalheEnvio.status === "em_separacao" && (
              <div style={{ marginBottom: 16, padding: 12, background: cor.bg, borderRadius: 8 }}>
                <p style={{ color: cor.text, fontSize: 12.5, fontWeight: 600, margin: "0 0 8px" }}>Registrar embalagem</p>
                <input value={formEmbalagem.dimensoes} onChange={e => setFormEmbalagem({ ...formEmbalagem, dimensoes: e.target.value })} style={{ ...inputStyle, marginBottom: 8 }} placeholder="Dimensões (ex: 30x20x15cm)" />
                <input type="number" step="0.01" value={formEmbalagem.custo} onChange={e => setFormEmbalagem({ ...formEmbalagem, custo: e.target.value })} style={{ ...inputStyle, marginBottom: 8 }} placeholder="Custo da embalagem (R$)" />
                <button style={btnStyle} onClick={() => salvarEmbalagem(detalheEnvio.id)}>Registrar Embalagem</button>
              </div>
            )}

            <h3 style={{ color: cor.text, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Histórico</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detalheEnvio.eventos.map(ev => (
                <div key={ev.id} style={{ padding: "8px 12px", background: cor.bg, borderRadius: 8 }}>
                  <p style={{ color: cor.text, fontSize: 12.5, margin: 0, textTransform: "capitalize" }}>{labelStatus(ev.evento)}</p>
                  <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{new Date(ev.created_at).toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setDetalheEnvio(null)} style={{ marginTop: 18, width: "100%", padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════ FASE 2: PAINEL DE ENTREGAS ═══════════════════
function EntregasLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const btnGhost = { background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const labelStyle = { color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 };
  const [filtro, setFiltro] = useState("todas");
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = (f) => {
    setLoading(true);
    api.get("/logistica/entregas", { params: { filtro: f === "todas" ? undefined : f } })
      .then(r => setEntregas(r.data || []))
      .catch(() => setEntregas([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(filtro); }, [filtro]);

  const FILTROS = [
    { id: "todas", label: "Ativas" },
    { id: "hoje", label: "Hoje" },
    { id: "amanha", label: "Amanhã" },
    { id: "atrasadas", label: "Atrasadas" },
    { id: "entregues", label: "Entregues" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            background: filtro === f.id ? cor.text : "none", color: filtro === f.id ? cor.bg : cor.textMuted,
            border: `1px solid ${cor.border}`, borderRadius: 8, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
      ) : entregas.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma entrega encontrada para esse filtro.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entregas.map(e => {
            const atrasado = e.data_prevista && new Date(e.data_prevista) < new Date() && e.status !== "entregue";
            return (
              <div key={e.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, border: atrasado ? "1px solid #f8717166" : `1px solid ${cor.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>Envio #{e.id} — {e.customer_nome || "Cliente não identificado"}</p>
                  <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                    {e.carrier_nome || "sem transportadora"} · Previsto: {e.data_prevista ? new Date(e.data_prevista).toLocaleDateString("pt-BR") : "sem data"}
                  </p>
                </div>
                {atrasado && <span style={{ color: "#f87171", fontSize: 11, fontWeight: 700 }}>ATRASADO</span>}
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: (CORES_STATUS[e.status] || cor.textMuted) + "22", color: CORES_STATUS[e.status] || cor.textMuted, textTransform: "capitalize" }}>
                  {labelStatus(e.status)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════ FASE 3: DEPÓSITOS E TRANSFERÊNCIAS ═══════════════════
function DepositosLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const btnGhost = { background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const labelStyle = { color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 };
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nome: "", cidade: "", estado: "", capacidade: "", responsavel: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.get("/logistica/depositos").then(r => setDepositos(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const criar = async (e) => {
    e.preventDefault();
    if (!form.nome) return;
    setSalvando(true);
    try {
      await api.post("/logistica/depositos", { ...form, capacidade: form.capacidade ? Number(form.capacidade) : undefined });
      setForm({ nome: "", cidade: "", estado: "", capacidade: "", responsavel: "" });
      setMostrarForm(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar depósito.");
    } finally {
      setSalvando(false);
    }
  };

  const desativar = async (id) => {
    if (!confirm("Desativar este depósito?")) return;
    try {
      await api.delete(`/logistica/depositos/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao desativar.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={btnStyle} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Cancelar" : "+ Novo Depósito"}</button>
      </div>
      {mostrarForm && (
        <form onSubmit={criar} style={{ ...cardStyle, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inputStyle} placeholder="Nome do depósito" required />
          <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} style={inputStyle} placeholder="Cidade" />
          <input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} style={inputStyle} placeholder="UF" maxLength={2} />
          <input type="number" value={form.capacidade} onChange={e => setForm({ ...form, capacidade: e.target.value })} style={inputStyle} placeholder="Capacidade" />
          <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} style={{ ...inputStyle, gridColumn: "span 2" }} placeholder="Responsável" />
          <div style={{ gridColumn: "span 2" }}>
            <button type="submit" style={btnStyle} disabled={salvando}>{salvando ? "Salvando..." : "Criar"}</button>
          </div>
        </form>
      )}
      {loading ? <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p> : depositos.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum depósito cadastrado.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {depositos.map(d => (
            <div key={d.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, opacity: d.ativo ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{d.nome}</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>{d.cidade || "—"}/{d.estado || "—"} · Capacidade: {d.capacidade || "não definida"}</p>
              </div>
              {d.ativo && <button style={{ ...btnGhost, color: "#f87171" }} onClick={() => desativar(d.id)}>Desativar</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransferenciasLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const btnGhost = { background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const labelStyle = { color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 };
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositos, setDepositos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarAjuste, setMostrarAjuste] = useState(false);
  const [form, setForm] = useState({ product_id: "", warehouse_origem_id: "", warehouse_destino_id: "", quantidade: "", data_prevista: "" });
  const [formAjuste, setFormAjuste] = useState({ product_id: "", warehouse_id: "", quantidade: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.get("/logistica/transferencias").then(r => setTransferencias(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
    api.get("/logistica/depositos").then(r => setDepositos(r.data || [])).catch(() => {});
    api.get("/products").then(r => setProdutos(r.data.data || r.data || [])).catch(() => {});
  }, []);

  const criar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!form.product_id || !form.warehouse_origem_id || !form.warehouse_destino_id || !form.quantidade) {
      setErro("Preencha produto, origem, destino e quantidade.");
      return;
    }
    setSalvando(true);
    try {
      await api.post("/logistica/transferencias", { ...form, quantidade: Number(form.quantidade) });
      setForm({ product_id: "", warehouse_origem_id: "", warehouse_destino_id: "", quantidade: "", data_prevista: "" });
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao criar transferência.");
    } finally {
      setSalvando(false);
    }
  };

  const ajustarSaldo = async (e) => {
    e.preventDefault();
    if (!formAjuste.product_id || !formAjuste.warehouse_id || formAjuste.quantidade === "") return;
    try {
      await api.post("/logistica/estoque-por-deposito/ajustar", { ...formAjuste, quantidade: Number(formAjuste.quantidade) });
      setFormAjuste({ product_id: "", warehouse_id: "", quantidade: "" });
      setMostrarAjuste(false);
      alert("Saldo inicial ajustado. Agora é possível criar transferências a partir desse depósito.");
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao ajustar saldo.");
    }
  };

  const concluir = async (id) => {
    try {
      await api.post(`/logistica/transferencias/${id}/concluir`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao concluir transferência.");
    }
  };

  const cancelar = async (id) => {
    if (!confirm("Cancelar esta transferência?")) return;
    try {
      await api.post(`/logistica/transferencias/${id}/cancelar`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao cancelar.");
    }
  };

  return (
    <div>
      <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 16 }}>
        O saldo por depósito começa zerado. Use "Ajustar Saldo Inicial" para definir onde cada produto está antes de criar transferências.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
        <button style={btnGhost} onClick={() => setMostrarAjuste(!mostrarAjuste)}>{mostrarAjuste ? "Cancelar" : "Ajustar Saldo Inicial"}</button>
        <button style={btnStyle} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Cancelar" : "+ Nova Transferência"}</button>
      </div>

      {mostrarAjuste && (
        <form onSubmit={ajustarSaldo} style={{ ...cardStyle, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <select value={formAjuste.product_id} onChange={e => setFormAjuste({ ...formAjuste, product_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="">Produto...</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select value={formAjuste.warehouse_id} onChange={e => setFormAjuste({ ...formAjuste, warehouse_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="">Depósito...</option>
            {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <input type="number" value={formAjuste.quantidade} onChange={e => setFormAjuste({ ...formAjuste, quantidade: e.target.value })} style={inputStyle} placeholder="Quantidade" />
          <div style={{ gridColumn: "span 3" }}>
            <button type="submit" style={btnStyle}>Ajustar</button>
          </div>
        </form>
      )}

      {mostrarForm && (
        <form onSubmit={criar} style={{ ...cardStyle, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} style={{ ...inputStyle, appearance: "none", gridColumn: "span 2" }}>
            <option value="">Produto...</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select value={form.warehouse_origem_id} onChange={e => setForm({ ...form, warehouse_origem_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="">Depósito de origem...</option>
            {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <select value={form.warehouse_destino_id} onChange={e => setForm({ ...form, warehouse_destino_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="">Depósito de destino...</option>
            {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} style={inputStyle} placeholder="Quantidade" />
          <input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} style={inputStyle} />
          {erro && <p style={{ color: "#f87171", fontSize: 12.5, gridColumn: "span 2", margin: 0 }}>{erro}</p>}
          <div style={{ gridColumn: "span 2" }}>
            <button type="submit" style={btnStyle} disabled={salvando}>{salvando ? "Salvando..." : "Criar Transferência"}</button>
          </div>
        </form>
      )}

      {loading ? <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p> : transferencias.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma transferência registrada.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {transferencias.map(t => (
            <div key={t.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{t.product_nome} — {t.quantidade} un.</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>{t.origem_nome} → {t.destino_nome}</p>
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: cor.border, color: cor.text, textTransform: "capitalize" }}>{t.status}</span>
              {t.status === "pendente" && (
                <>
                  <button style={{ ...btnGhost, color: "#4ade80" }} onClick={() => concluir(t.id)}>Concluir</button>
                  <button style={{ ...btnGhost, color: "#f87171" }} onClick={() => cancelar(t.id)}>Cancelar</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════ FASE 4: TRANSPORTADORAS E SCORE ═══════════════════
function TransportadorasLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const btnGhost = { background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const labelStyle = { color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 };
  const [transportadoras, setTransportadoras] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nome: "", cnpj: "", contato: "", modalidades: "", prazo_medio_dias: "", custo_medio: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.get("/logistica/transportadoras"),
      api.get("/logistica/transportadoras/score"),
    ]).then(([r1, r2]) => { setTransportadoras(r1.data || []); setScores(r2.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const criar = async (e) => {
    e.preventDefault();
    if (!form.nome) return;
    setSalvando(true);
    try {
      await api.post("/logistica/transportadoras", {
        ...form,
        prazo_medio_dias: form.prazo_medio_dias ? Number(form.prazo_medio_dias) : undefined,
        custo_medio: form.custo_medio ? Number(form.custo_medio) : undefined,
      });
      setForm({ nome: "", cnpj: "", contato: "", modalidades: "", prazo_medio_dias: "", custo_medio: "" });
      setMostrarForm(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar transportadora.");
    } finally {
      setSalvando(false);
    }
  };

  const desativar = async (id) => {
    if (!confirm("Desativar esta transportadora?")) return;
    try {
      await api.delete(`/logistica/transportadoras/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao desativar.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={btnStyle} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Cancelar" : "+ Nova Transportadora"}</button>
      </div>
      {mostrarForm && (
        <form onSubmit={criar} style={{ ...cardStyle, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inputStyle} placeholder="Nome" required />
          <input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} style={inputStyle} placeholder="CNPJ (opcional)" />
          <input value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} style={inputStyle} placeholder="Contato" />
          <input value={form.modalidades} onChange={e => setForm({ ...form, modalidades: e.target.value })} style={inputStyle} placeholder="Modalidades (ex: PAC, SEDEX)" />
          <input type="number" step="0.1" value={form.prazo_medio_dias} onChange={e => setForm({ ...form, prazo_medio_dias: e.target.value })} style={inputStyle} placeholder="Prazo médio (dias)" />
          <input type="number" step="0.01" value={form.custo_medio} onChange={e => setForm({ ...form, custo_medio: e.target.value })} style={inputStyle} placeholder="Custo médio (R$)" />
          <div style={{ gridColumn: "span 2" }}>
            <button type="submit" style={btnStyle} disabled={salvando}>{salvando ? "Salvando..." : "Criar"}</button>
          </div>
        </form>
      )}

      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Score de Desempenho (dados reais)</h3>
      {loading ? <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p> : scores.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma transportadora com dados suficientes ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {scores.map(s => (
            <div key={s.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{s.nome}</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                  {s.total_envios} envio(s) · pontualidade: {s.pontualidade_pct != null ? s.pontualidade_pct + "%" : "sem dados"} · frete médio real: {formatarMoeda(s.frete_medio_real)}
                </p>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: s.score == null ? cor.textMuted : s.score >= 80 ? "#4ade80" : s.score >= 60 ? "#fbbf24" : "#f87171" }}>
                {s.score != null ? s.score : "-"}
              </span>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Cadastro</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {transportadoras.map(t => (
          <div key={t.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, opacity: t.ativo ? 1 : 0.5 }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{t.nome}</p>
              <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>{t.modalidades || "—"} · prazo: {t.prazo_medio_dias || "?"} dias · custo médio: {formatarMoeda(t.custo_medio)}</p>
            </div>
            {t.ativo && <button style={{ ...btnGhost, color: "#f87171" }} onClick={() => desativar(t.id)}>Desativar</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════ FASE 5: DEVOLUÇÕES ═══════════════════
const FLUXO_DEVOLUCAO = ["solicitada", "em_analise", "aprovada", "etiqueta_gerada", "em_transporte", "recebida", "conferida", "concluida"];

function DevolucoesLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const btnGhost = { background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const labelStyle = { color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 };
  const [devolucoes, setDevolucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [envios, setEnvios] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ shipment_id: "", motivo: "defeito", descricao: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.get("/logistica/devolucoes").then(r => setDevolucoes(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
    api.get("/logistica/envios").then(r => setEnvios(r.data || [])).catch(() => {});
  }, []);

  const criar = async (e) => {
    e.preventDefault();
    if (!form.shipment_id) return;
    setSalvando(true);
    try {
      await api.post("/logistica/devolucoes", form);
      setForm({ shipment_id: "", motivo: "defeito", descricao: "" });
      setMostrarForm(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar devolução.");
    } finally {
      setSalvando(false);
    }
  };

  const avancar = async (dev) => {
    const i = FLUXO_DEVOLUCAO.indexOf(dev.status);
    const proximo = FLUXO_DEVOLUCAO[i + 1];
    if (!proximo) return;
    try {
      await api.put(`/logistica/devolucoes/${dev.id}/status`, { status: proximo });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao avançar.");
    }
  };

  const rejeitar = async (id) => {
    try {
      await api.put(`/logistica/devolucoes/${id}/status`, { status: "rejeitada" });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao rejeitar.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={btnStyle} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Cancelar" : "+ Nova Devolução"}</button>
      </div>
      {mostrarForm && (
        <form onSubmit={criar} style={{ ...cardStyle, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <select value={form.shipment_id} onChange={e => setForm({ ...form, shipment_id: e.target.value })} style={{ ...inputStyle, appearance: "none", gridColumn: "span 2" }}>
            <option value="">Selecione o envio...</option>
            {envios.map(e => <option key={e.id} value={e.id}>Envio #{e.id} — {e.customer_nome}</option>)}
          </select>
          <select value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="defeito">Defeito</option>
            <option value="arrependimento">Arrependimento</option>
            <option value="produto_incorreto">Produto incorreto</option>
            <option value="avaria">Avaria</option>
            <option value="problema_transporte">Problema de transporte</option>
            <option value="descricao_incorreta">Descrição incorreta</option>
            <option value="outros">Outros</option>
          </select>
          <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={inputStyle} placeholder="Descrição (opcional)" />
          <div style={{ gridColumn: "span 2" }}>
            <button type="submit" style={btnStyle} disabled={salvando}>{salvando ? "Salvando..." : "Criar"}</button>
          </div>
        </form>
      )}

      {loading ? <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p> : devolucoes.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma devolução registrada.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {devolucoes.map(d => (
            <div key={d.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>Devolução #{d.id} — {d.customer_nome || "Cliente"}</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>Motivo: {labelStatus(d.motivo)}</p>
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: cor.border, color: cor.text, textTransform: "capitalize" }}>{labelStatus(d.status)}</span>
              {!["rejeitada", "concluida"].includes(d.status) && (
                <>
                  <button style={{ ...btnGhost, color: "#4ade80" }} onClick={() => avancar(d)}>Avançar</button>
                  <button style={{ ...btnGhost, color: "#f87171" }} onClick={() => rejeitar(d.id)}>Rejeitar</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════ FASE 6: INDICADORES, CUSTOS E ALERTAS ═══════════════════
function IndicadoresLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const [dados, setDados] = useState(null);
  useEffect(() => { api.get("/logistica/indicadores").then(r => setDados(r.data)).catch(() => {}); }, []);
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
      <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>OTIF (no prazo)</p><h2 style={{ color: "#4ade80", fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.otif_pct != null ? dados.otif_pct + "%" : "-"}</h2></div>
      <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Tempo médio separação</p><h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.tempo_medio_separacao_horas != null ? dados.tempo_medio_separacao_horas + "h" : "-"}</h2></div>
      <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Tempo médio expedição</p><h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.tempo_medio_expedicao_horas != null ? dados.tempo_medio_expedicao_horas + "h" : "-"}</h2></div>
      <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Taxa de devolução</p><h2 style={{ color: "#f87171", fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.taxa_devolucao_pct != null ? dados.taxa_devolucao_pct + "%" : "-"}</h2></div>
      <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Taxa de ocorrência</p><h2 style={{ color: "#f87171", fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.taxa_ocorrencia_pct != null ? dados.taxa_ocorrencia_pct + "%" : "-"}</h2></div>
      <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Total de envios</p><h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.total_envios}</h2></div>
    </div>
  );
}

function CustosLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const [dados, setDados] = useState(null);
  useEffect(() => { api.get("/logistica/custos").then(r => setDados(r.data)).catch(() => {}); }, []);
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Custo Frete</p><h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.custo_frete_total)}</h2></div>
        <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Custo Embalagem</p><h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.custo_embalagem_total)}</h2></div>
        <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Logística Reversa</p><h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.custo_logistica_reversa_total)}</h2></div>
        <div style={{ ...cardStyle, background: "#3f1d1d" }}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Custo Logístico Total</p><h2 style={{ color: "#f87171", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.custo_logistico_total)}</h2></div>
      </div>
      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Por Transportadora</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dados.por_transportadora.map((t, i) => (
          <div key={i} style={{ ...cardStyle, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: cor.text, fontSize: 13 }}>{t.nome}</span>
            <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{t.total_envios} envio(s) · {formatarMoeda(t.custo_frete)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertasLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const [dados, setDados] = useState(null);
  useEffect(() => { api.get("/logistica/alertas").then(r => setDados(r.data)).catch(() => {}); }, []);
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  if (dados.total === 0) return <p style={{ color: "#4ade80", fontSize: 14 }}>✅ Nenhum alerta crítico no momento.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {dados.alertas.map((a, i) => (
        <div key={i} style={{ ...cardStyle, borderLeft: "3px solid #f87171" }}>
          <p style={{ color: "#f87171", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", margin: "0 0 4px" }}>{a.severidade}</p>
          <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{a.titulo}</p>
          {a.descricao && <p style={{ color: cor.textMuted, fontSize: 12, margin: "4px 0 0" }}>{a.descricao}</p>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════ FASE 7: SIMULADOR ═══════════════════
function SimuladorLogistica() {
  const { cor } = useOutletContext();
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const labelStyle = { color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 };
  const [tipo, setTipo] = useState("troca_transportadora");
  const [parametros, setParametros] = useState({ novo_frete_medio: "", percentual_aumento: "" });
  const [resultado, setResultado] = useState(null);
  const [simulando, setSimulando] = useState(false);
  const [erro, setErro] = useState("");

  const simular = async () => {
    setErro("");
    setSimulando(true);
    try {
      const params = tipo === "troca_transportadora"
        ? { novo_frete_medio: Number(parametros.novo_frete_medio) }
        : { percentual_aumento: Number(parametros.percentual_aumento) };
      const r = await api.post("/logistica/simular", { tipo, parametros: params });
      setResultado(r.data.resultado);
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao simular.");
    } finally {
      setSimulando(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      <div style={cardStyle}>
        <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Parâmetros</p>
        <label style={labelStyle}>Tipo de cenário</label>
        <select value={tipo} onChange={e => { setTipo(e.target.value); setResultado(null); }} style={{ ...inputStyle, marginBottom: 12, appearance: "none" }}>
          <option value="troca_transportadora">Troca de transportadora</option>
          <option value="aumento_volume">Aumento de volume</option>
          <option value="aumento_frete">Aumento de frete</option>
        </select>

        {tipo === "troca_transportadora" && (
          <>
            <label style={labelStyle}>Novo frete médio (R$)</label>
            <input type="number" step="0.01" value={parametros.novo_frete_medio} onChange={e => setParametros({ ...parametros, novo_frete_medio: e.target.value })} style={inputStyle} placeholder="0.00" />
          </>
        )}
        {(tipo === "aumento_volume" || tipo === "aumento_frete") && (
          <>
            <label style={labelStyle}>Percentual de aumento (%)</label>
            <input type="number" step="0.1" value={parametros.percentual_aumento} onChange={e => setParametros({ ...parametros, percentual_aumento: e.target.value })} style={inputStyle} placeholder="Ex: 20" />
          </>
        )}

        {erro && <p style={{ color: "#f87171", fontSize: 12.5, marginTop: 10 }}>{erro}</p>}
        <button onClick={simular} disabled={simulando} style={{ ...btnStyle, width: "100%", marginTop: 14 }}>{simulando ? "Simulando..." : "Simular"}</button>
      </div>

      <div>
        {!resultado ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
            <p style={{ color: cor.textMuted, fontSize: 13.5 }}>Preencha os parâmetros e clique em "Simular" para ver o impacto estimado.</p>
          </div>
        ) : (
          <div style={cardStyle}>
            {Object.entries(resultado).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${cor.border}` }}>
                <span style={{ color: cor.textMuted, fontSize: 12.5, textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                <span style={{ color: k === "impacto" ? (Number(v) > 0 ? "#f87171" : "#4ade80") : cor.text, fontSize: 13, fontWeight: 700 }}>
                  {typeof v === "string" && !isNaN(v) ? formatarMoeda(v) : v}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════ COMPONENTE PRINCIPAL ═══════════════════
export default function Logistica() {
  const { secao } = useParams();
  const { cor } = useOutletContext();
  const secaoAtiva = secao || "dashboard";

  const TITULOS = {
    dashboard: "Torre de Controle", envios: "Envios", entregas: "Entregas",
    depositos: "Depósitos", transferencias: "Transferências", transportadoras: "Transportadoras",
    devolucoes: "Devoluções", indicadores: "Indicadores", custos: "Custos", alertas: "Alertas", simulador: "Simulador",
  };

  return (
    <div>
      <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 24 }}>{TITULOS[secaoAtiva] || "Logística"}</h1>
      {secaoAtiva === "dashboard" && <DashboardLogistica />}
      {secaoAtiva === "envios" && <EnviosLogistica />}
      {secaoAtiva === "entregas" && <EntregasLogistica />}
      {secaoAtiva === "depositos" && <DepositosLogistica />}
      {secaoAtiva === "transferencias" && <TransferenciasLogistica />}
      {secaoAtiva === "transportadoras" && <TransportadorasLogistica />}
      {secaoAtiva === "devolucoes" && <DevolucoesLogistica />}
      {secaoAtiva === "indicadores" && <IndicadoresLogistica />}
      {secaoAtiva === "custos" && <CustosLogistica />}
      {secaoAtiva === "alertas" && <AlertasLogistica />}
      {secaoAtiva === "simulador" && <SimuladorLogistica />}
    </div>
  );
}