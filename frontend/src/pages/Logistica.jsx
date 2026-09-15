import { useEffect, useState } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import api from "../api";

const cardStyle = { background: "#111", border: "1px solid #222", borderRadius: 12, padding: 20 };
const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };
const btnGhost = { background: "none", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" };
const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };

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

function labelStatus(status) {
  return (status || "").replace(/_/g, " ");
}

function proximoEstagio(atual) {
  const i = ESTAGIOS_CICLO.indexOf(atual);
  if (i === -1 || i === ESTAGIOS_CICLO.length - 1) return null;
  return ESTAGIOS_CICLO[i + 1];
}

function DashboardLogistica() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    api.get("/logistica/dashboard").then(r => setDados(r.data)).catch(() => setDados(null));
  }, []);

  if (!dados) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>Total de Envios</p>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.total_envios}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>Taxa de Entrega</p>
          <h2 style={{ color: "#4ade80", fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.taxa_entrega != null ? dados.taxa_entrega + "%" : "-"}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>Atrasados</p>
          <h2 style={{ color: dados.atrasados > 0 ? "#f87171" : "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{dados.atrasados}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>Frete Médio</p>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.frete_medio)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>Frete Total</p>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.frete_total)}</h2>
        </div>
      </div>

      <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Envios por Status</h3>
      {dados.por_status.length === 0 ? (
        <p style={{ color: "#555", fontSize: 13 }}>Nenhum envio registrado ainda.</p>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dados.por_status.map(s => (
            <span key={s.status} style={{ background: "#111", border: `1px solid ${CORES_STATUS[s.status] || "#333"}55`, borderRadius: 20, padding: "6px 16px", fontSize: 12.5, color: CORES_STATUS[s.status] || "#888", textTransform: "capitalize" }}>
              {labelStatus(s.status)}: <strong>{s.total}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EnviosLogistica() {
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
      await api.put(`/logistica/envios/${envio.id}/status`, { status: proximo });
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

  if (loading) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

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
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Pedido</label>
            <select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Selecione um pedido...</option>
              {pedidos.map(p => <option key={p.id} value={p.id}>#{p.id} — {formatarMoeda(p.total)} ({p.status})</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Depósito</label>
            <select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Nenhum</option>
              {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Transportadora</label>
            <select value={form.carrier_id} onChange={e => setForm({ ...form, carrier_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Nenhuma</option>
              {transportadoras.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Data prevista</label>
            <input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Peso (kg)</label>
            <input type="number" step="0.001" value={form.peso_kg} onChange={e => setForm({ ...form, peso_kg: e.target.value })} style={inputStyle} placeholder="0.000" />
          </div>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Volumes</label>
            <input type="number" min="1" value={form.volumes} onChange={e => setForm({ ...form, volumes: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Frete (R$)</label>
            <input type="number" step="0.01" value={form.frete_valor} onChange={e => setForm({ ...form, frete_valor: e.target.value })} style={inputStyle} placeholder="0.00" />
          </div>
          {erro && <p style={{ color: "#f87171", fontSize: 12.5, gridColumn: "span 3", margin: 0 }}>{erro}</p>}
          <div style={{ gridColumn: "span 3" }}>
            <button type="submit" style={btnStyle} disabled={salvando}>{salvando ? "Salvando..." : "Criar Envio"}</button>
          </div>
        </form>
      )}

      {envios.length === 0 ? (
        <p style={{ color: "#555", fontSize: 13 }}>Nenhum envio registrado ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {envios.map(envio => {
            const proximo = proximoEstagio(envio.status);
            const cor = CORES_STATUS[envio.status] || "#888";
            return (
              <div key={envio.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => abrirDetalhe(envio.id)}>
                  <p style={{ color: "#fff", fontSize: 13.5, fontWeight: 600, margin: 0 }}>
                    Envio #{envio.id} — Pedido #{envio.order_id} · {envio.customer_nome || "Cliente não identificado"}
                  </p>
                  <p style={{ color: "#555", fontSize: 11.5, margin: "2px 0 0" }}>
                    {envio.carrier_nome || "sem transportadora"} · {envio.warehouse_nome || "sem depósito"} · {formatarMoeda(envio.frete_valor)}
                  </p>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: cor + "22", color: cor, textTransform: "capitalize", flexShrink: 0 }}>
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
          <div style={{ position: "relative", background: "#111", border: "1px solid #222", borderRadius: 16, padding: 28, width: "100%", maxWidth: 500, maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ color: "#fff", marginBottom: 6, fontSize: 17 }}>Envio #{detalheEnvio.id}</h2>
            <p style={{ color: "#555", fontSize: 12.5, marginBottom: 16 }}>
              Pedido #{detalheEnvio.order_id} · {detalheEnvio.customer_nome || "Cliente não identificado"} · {formatarMoeda(detalheEnvio.pedido_total)}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#555", fontSize: 11, display: "block", marginBottom: 4 }}>Código de rastreio</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  defaultValue={detalheEnvio.tracking_code || ""}
                  id="tracking-input"
                  style={inputStyle}
                  placeholder="Ex: BR123456789"
                />
                <button
                  style={btnGhost}
                  onClick={() => registrarRastreio(detalheEnvio.id, document.getElementById("tracking-input").value)}
                >
                  Salvar
                </button>
              </div>
            </div>

            <h3 style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Histórico</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detalheEnvio.eventos.map(ev => (
                <div key={ev.id} style={{ padding: "8px 12px", background: "#0a0a0a", borderRadius: 8 }}>
                  <p style={{ color: "#fff", fontSize: 12.5, margin: 0, textTransform: "capitalize" }}>{labelStatus(ev.evento)}</p>
                  <p style={{ color: "#555", fontSize: 11, margin: "2px 0 0" }}>{new Date(ev.created_at).toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setDetalheEnvio(null)} style={{ marginTop: 18, width: "100%", padding: 11, background: "none", border: "1px solid #333", color: "#888", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Logistica() {
  const { secao } = useParams();
  const navigate = useNavigate();
  const secaoAtiva = secao || "dashboard";

  return (
    <div>
      <h1 style={{ color: "#fff", fontWeight: 700, marginBottom: 24 }}>Logística</h1>
      {secaoAtiva === "dashboard" && <DashboardLogistica />}
      {secaoAtiva === "envios" && <EnviosLogistica />}
    </div>
  );
}