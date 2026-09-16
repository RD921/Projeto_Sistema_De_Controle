import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api";

const LABELS_STATUS = {
  novo: "Novo", em_atendimento: "Em Atendimento", aguardando_cliente: "Aguardando Cliente",
  aguardando_empresa: "Aguardando Empresa", resolvido: "Resolvido", encerrado: "Encerrado", reaberto: "Reaberto",
};
const CORES_STATUS = {
  novo: "#60a5fa", em_atendimento: "#a78bfa", aguardando_cliente: "#fbbf24", aguardando_empresa: "#fbbf24",
  resolvido: "#4ade80", encerrado: "#888", reaberto: "#f87171",
};
const CORES_PRIORIDADE = { baixa: "#60a5fa", normal: "#888", alta: "#fbbf24", urgente: "#f87171" };

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "novo", label: "Novos" },
  { id: "em_atendimento", label: "Em Atendimento" },
  { id: "aguardando_cliente", label: "Aguardando Cliente" },
  { id: "aguardando_empresa", label: "Aguardando Empresa" },
  { id: "resolvido", label: "Resolvidos" },
  { id: "encerrado", label: "Encerrados" },
];

function formatarDataHora(iso) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function CentralAtendimento({ cor }) {
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12 };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };

  const [filtro, setFiltro] = useState("todos");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketAtivoId, setTicketAtivoId] = useState(null);
  const [ticketAtivo, setTicketAtivo] = useState(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarNovoTicket, setMostrarNovoTicket] = useState(false);
  const [novoTicket, setNovoTicket] = useState({ assunto: "", descricao: "", categoria: "outros", prioridade: "normal", canal: "chat" });

  const carregarLista = () => {
    setLoading(true);
    const params = filtro !== "todos" ? { status: filtro } : {};
    api.get("/sac/tickets", { params }).then(r => setTickets(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregarLista(); }, [filtro]);

  const abrirTicket = (id) => {
    setTicketAtivoId(id);
    api.get(`/sac/tickets/${id}`).then(r => setTicketAtivo(r.data)).catch(() => {});
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/sac/tickets/${ticketAtivoId}/mensagens`, { conteudo: novaMensagem });
      setNovaMensagem("");
      abrirTicket(ticketAtivoId);
      carregarLista();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao enviar mensagem.");
    } finally {
      setEnviando(false);
    }
  };

  const mudarStatus = async (status) => {
    try {
      await api.put(`/sac/tickets/${ticketAtivoId}/status`, { status });
      abrirTicket(ticketAtivoId);
      carregarLista();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao mudar status.");
    }
  };

  const criarTicket = async (e) => {
    e.preventDefault();
    if (!novoTicket.assunto) return;
    try {
      const r = await api.post("/sac/tickets", novoTicket);
      setNovoTicket({ assunto: "", descricao: "", categoria: "outros", prioridade: "normal", canal: "chat" });
      setMostrarNovoTicket(false);
      carregarLista();
      abrirTicket(r.data.id);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar ticket.");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 340px 1fr", gap: 14, height: "calc(100vh - 140px)" }}>
      {/* COLUNA 1: Filtros */}
      <div style={{ ...cardStyle, padding: 14, overflowY: "auto" }}>
        <button onClick={() => setMostrarNovoTicket(true)} style={{ ...btnStyle, width: "100%", marginBottom: 16 }}>+ Novo Ticket</button>
        {FILTROS.map(f => (
          <div
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{ padding: "9px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, marginBottom: 4, background: filtro === f.id ? cor.border : "transparent", color: filtro === f.id ? cor.text : cor.textMuted, fontWeight: filtro === f.id ? 600 : 400 }}
          >
            {f.label}
          </div>
        ))}
      </div>

      {/* COLUNA 2: Lista de tickets */}
      <div style={{ ...cardStyle, overflowY: "auto" }}>
        {loading ? (
          <p style={{ color: cor.textMuted, fontSize: 13, padding: 16 }}>Carregando...</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13, padding: 16 }}>Nenhum ticket encontrado para esse filtro.</p>
        ) : (
          tickets.map(t => (
            <div
              key={t.id}
              onClick={() => abrirTicket(t.id)}
              style={{ padding: 14, borderBottom: `1px solid ${cor.border}`, cursor: "pointer", background: ticketAtivoId === t.id ? cor.border : "transparent" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: cor.text, fontSize: 13, fontWeight: 600 }}>#{t.id} {t.assunto}</span>
                <span style={{ color: CORES_PRIORIDADE[t.prioridade], fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{t.prioridade}</span>
              </div>
              <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "0 0 6px" }}>{t.customer_nome || "Cliente não vinculado"}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: CORES_STATUS[t.status] + "22", color: CORES_STATUS[t.status] }}>{LABELS_STATUS[t.status]}</span>
                <span style={{ color: cor.textMuted, fontSize: 10.5 }}>{formatarDataHora(t.updated_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* COLUNA 3: Atendimento aberto */}
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
        {!ticketAtivo ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <p style={{ color: cor.textMuted, fontSize: 13.5 }}>Selecione um ticket para ver a conversa.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: 16, borderBottom: `1px solid ${cor.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ color: cor.text, fontWeight: 700, fontSize: 15, margin: 0 }}>#{ticketAtivo.id} — {ticketAtivo.assunto}</p>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: CORES_STATUS[ticketAtivo.status] + "22", color: CORES_STATUS[ticketAtivo.status] }}>{LABELS_STATUS[ticketAtivo.status]}</span>
              </div>
              <p style={{ color: cor.textMuted, fontSize: 12, margin: "0 0 10px" }}>
                Cliente: {ticketAtivo.customer_nome || "não vinculado"} {ticketAtivo.customer_email && `· ${ticketAtivo.customer_email}`}
                {ticketAtivo.order_id && ` · Pedido #${ticketAtivo.order_id}`}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["em_atendimento", "aguardando_cliente", "resolvido", "encerrado", "reaberto"].map(s => (
                  <button key={s} onClick={() => mudarStatus(s)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    {LABELS_STATUS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {ticketAtivo.mensagens.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma mensagem ainda.</p>
              ) : (
                ticketAtivo.mensagens.map(m => (
                  <div key={m.id} style={{ alignSelf: m.tipo === "cliente" ? "flex-start" : "flex-end", maxWidth: "75%" }}>
                    <div style={{ background: m.interna ? "#fbbf2422" : m.tipo === "cliente" ? cor.border : "#a78bfa22", border: m.interna ? "1px solid #fbbf2455" : "none", borderRadius: 10, padding: "8px 12px" }}>
                      {m.interna && <p style={{ color: "#fbbf24", fontSize: 10, fontWeight: 700, margin: "0 0 4px" }}>NOTA INTERNA</p>}
                      <p style={{ color: cor.text, fontSize: 13, margin: 0 }}>{m.conteudo}</p>
                    </div>
                    <p style={{ color: cor.textMuted, fontSize: 10.5, margin: "3px 4px 0" }}>{m.remetente_nome || "Cliente"} · {formatarDataHora(m.created_at)}</p>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: 14, borderTop: `1px solid ${cor.border}`, display: "flex", gap: 8 }}>
              <input value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)} onKeyDown={e => e.key === "Enter" && enviarMensagem()} style={inputStyle} placeholder="Digite uma resposta..." />
              <button onClick={enviarMensagem} disabled={enviando} style={btnStyle}>{enviando ? "..." : "Enviar"}</button>
            </div>
          </>
        )}
      </div>

      {mostrarNovoTicket && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setMostrarNovoTicket(false)} />
          <form onSubmit={criarTicket} style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
            <h2 style={{ color: cor.text, marginBottom: 16, fontSize: 17 }}>Novo Ticket</h2>
            <input value={novoTicket.assunto} onChange={e => setNovoTicket({ ...novoTicket, assunto: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }} placeholder="Assunto" required />
            <textarea value={novoTicket.descricao} onChange={e => setNovoTicket({ ...novoTicket, descricao: e.target.value })} style={{ ...inputStyle, marginBottom: 10, minHeight: 70, resize: "vertical" }} placeholder="Descrição (opcional)" />
            <select value={novoTicket.categoria} onChange={e => setNovoTicket({ ...novoTicket, categoria: e.target.value })} style={{ ...inputStyle, marginBottom: 10, appearance: "none" }}>
              <option value="entrega">Entrega</option>
              <option value="pagamento">Pagamento</option>
              <option value="troca">Troca</option>
              <option value="devolucao">Devolução</option>
              <option value="produto">Produto</option>
              <option value="outros">Outros</option>
            </select>
            <select value={novoTicket.prioridade} onChange={e => setNovoTicket({ ...novoTicket, prioridade: e.target.value })} style={{ ...inputStyle, marginBottom: 16, appearance: "none" }}>
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setMostrarNovoTicket(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" style={{ ...btnStyle, flex: 1 }}>Criar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function Sac() {
  const { cor } = useOutletContext();

  return (
    <div>
      <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 20 }}>SAC / Atendimento</h1>
      <CentralAtendimento cor={cor} />
    </div>
  );
}