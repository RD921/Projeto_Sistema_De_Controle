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

function formatarMoeda(valor) {
  const n = Number(valor || 0);
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ═══════════════════ Painel de Contexto (Fase 4) ═══════════════════
function PainelContexto({ ticketId, cor }) {
  const [contexto, setContexto] = useState(null);
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    api.get(`/sac/tickets/${ticketId}/contexto`).then(r => setContexto(r.data)).catch(() => setContexto(null));
  }, [ticketId]);

  if (!contexto) return null;

  const temAlgumDado = contexto.pedido || contexto.logistica || contexto.crm.deals.length > 0 || contexto.tickets_anteriores.length > 0;

  return (
    <div style={{ borderBottom: `1px solid ${cor.border}`, background: cor.bg }}>
      <div onClick={() => setAberto(!aberto)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", cursor: "pointer" }}>
        <p style={{ color: cor.textMuted, fontSize: 11, fontWeight: 700, margin: 0, textTransform: "uppercase" }}>Contexto do Cliente</p>
        <span style={{ color: cor.textMuted, fontSize: 11 }}>{aberto ? "▲" : "▼"}</span>
      </div>
      {aberto && (
        <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
          <div>
            <p style={{ color: cor.textMuted, fontSize: 10.5, fontWeight: 700, margin: "0 0 4px" }}>PEDIDO</p>
            {contexto.pedido ? (
              <p style={{ color: cor.text, margin: 0 }}>#{contexto.pedido.id} · {contexto.pedido.status} · {formatarMoeda(contexto.pedido.total)}</p>
            ) : (
              <p style={{ color: cor.textMuted, margin: 0, fontStyle: "italic" }}>Pedido não encontrado.</p>
            )}
          </div>
          <div>
            <p style={{ color: cor.textMuted, fontSize: 10.5, fontWeight: 700, margin: "0 0 4px" }}>LOGÍSTICA</p>
            {contexto.logistica ? (
              <p style={{ color: cor.text, margin: 0 }}>
                {contexto.logistica.status} · {contexto.logistica.carrier_nome || "sem transportadora"}
                {contexto.logistica.tracking_code && ` · ${contexto.logistica.tracking_code}`}
              </p>
            ) : (
              <p style={{ color: cor.textMuted, margin: 0, fontStyle: "italic" }}>Informação logística não disponível.</p>
            )}
          </div>
          <div>
            <p style={{ color: cor.textMuted, fontSize: 10.5, fontWeight: 700, margin: "0 0 4px" }}>CRM — OPORTUNIDADES</p>
            {contexto.crm.deals.length === 0 ? (
              <p style={{ color: cor.textMuted, margin: 0, fontStyle: "italic" }}>Nenhuma oportunidade encontrada.</p>
            ) : (
              contexto.crm.deals.map(d => <p key={d.id} style={{ color: cor.text, margin: "0 0 2px" }}>{d.titulo} · {d.estagio}</p>)
            )}
          </div>
          <div>
            <p style={{ color: cor.textMuted, fontSize: 10.5, fontWeight: 700, margin: "0 0 4px" }}>TICKETS ANTERIORES</p>
            {contexto.tickets_anteriores.length === 0 ? (
              <p style={{ color: cor.textMuted, margin: 0, fontStyle: "italic" }}>Nenhum outro ticket deste cliente.</p>
            ) : (
              contexto.tickets_anteriores.map(t => <p key={t.id} style={{ color: cor.text, margin: "0 0 2px" }}>#{t.id} {t.assunto} · {LABELS_STATUS[t.status]}</p>)
            )}
          </div>
          {!temAlgumDado && <p style={{ color: cor.textMuted, gridColumn: "span 2", fontStyle: "italic" }}>Este ticket ainda não está vinculado a cliente/pedido.</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════ Central de Atendimento (Fase 2) ═══════════════════
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
  const [filas, setFilas] = useState([]);
  const [respostasRapidas, setRespostasRapidas] = useState([]);
  const [mostrarRespostas, setMostrarRespostas] = useState(false);
  const [mostrarAvaliacao, setMostrarAvaliacao] = useState(false);
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");

  const carregarLista = () => {
    setLoading(true);
    const params = filtro !== "todos" ? { status: filtro } : {};
    api.get("/sac/tickets", { params }).then(r => setTickets(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregarLista(); }, [filtro]);
  useEffect(() => {
    api.get("/sac/filas").then(r => setFilas(r.data || [])).catch(() => {});
    api.get("/sac/respostas-rapidas").then(r => setRespostasRapidas(r.data || [])).catch(() => {});
  }, []);

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
      if (status === "resolvido" || status === "encerrado") setMostrarAvaliacao(true);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao mudar status.");
    }
  };

  const mudarFila = async (queueId) => {
    try {
      await api.put(`/sac/tickets/${ticketAtivoId}/fila`, { queue_id: queueId || null });
      abrirTicket(ticketAtivoId);
      carregarLista();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao mudar fila.");
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

  const usarRespostaRapida = async (id) => {
    try {
      const r = await api.get(`/sac/respostas-rapidas/${id}/aplicar`, { params: { ticket_id: ticketAtivoId } });
      setNovaMensagem(r.data.conteudo);
      setMostrarRespostas(false);
    } catch (err) {
      alert("Erro ao aplicar resposta rápida.");
    }
  };

  const enviarAvaliacao = async () => {
    if (!notaAvaliacao) return;
    try {
      await api.post(`/sac/tickets/${ticketAtivoId}/avaliacao`, { nota: notaAvaliacao, comentario: comentarioAvaliacao || undefined });
      setMostrarAvaliacao(false);
      setNotaAvaliacao(0);
      setComentarioAvaliacao("");
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao enviar avaliação.");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 340px 1fr", gap: 14, height: "calc(100vh - 200px)" }}>
      <div style={{ ...cardStyle, padding: 14, overflowY: "auto" }}>
        <button onClick={() => setMostrarNovoTicket(true)} style={{ ...btnStyle, width: "100%", marginBottom: 16 }}>+ Novo Ticket</button>
        {FILTROS.map(f => (
          <div key={f.id} onClick={() => setFiltro(f.id)} style={{ padding: "9px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, marginBottom: 4, background: filtro === f.id ? cor.border : "transparent", color: filtro === f.id ? cor.text : cor.textMuted, fontWeight: filtro === f.id ? 600 : 400 }}>
            {f.label}
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, overflowY: "auto" }}>
        {loading ? (
          <p style={{ color: cor.textMuted, fontSize: 13, padding: 16 }}>Carregando...</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13, padding: 16 }}>Nenhum ticket encontrado para esse filtro.</p>
        ) : (
          tickets.map(t => (
            <div key={t.id} onClick={() => abrirTicket(t.id)} style={{ padding: 14, borderBottom: `1px solid ${cor.border}`, cursor: "pointer", background: ticketAtivoId === t.id ? cor.border : "transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: cor.text, fontSize: 13, fontWeight: 600 }}>#{t.id} {t.assunto}</span>
                <span style={{ color: CORES_PRIORIDADE[t.prioridade], fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{t.prioridade}</span>
              </div>
              <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "0 0 6px" }}>{t.customer_nome || "Cliente não vinculado"}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: CORES_STATUS[t.status] + "22", color: CORES_STATUS[t.status] }}>{LABELS_STATUS[t.status]}</span>
                  {t.sla_status === "vencido" && <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "#f8717122", color: "#f87171" }}>SLA vencido</span>}
                  {t.sla_status === "proximo_vencimento" && <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "#fbbf2422", color: "#fbbf24" }}>SLA próximo</span>}
                </div>
                <span style={{ color: cor.textMuted, fontSize: 10.5 }}>{formatarDataHora(t.updated_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

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
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {["em_atendimento", "aguardando_cliente", "resolvido", "encerrado", "reaberto"].map(s => (
                  <button key={s} onClick={() => mudarStatus(s)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    {LABELS_STATUS[s]}
                  </button>
                ))}
                <select value={ticketAtivo.queue_id || ""} onChange={e => mudarFila(e.target.value)} style={{ background: cor.bg, border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontFamily: "inherit", marginLeft: "auto" }}>
                  <option value="">Sem fila</option>
                  {filas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
            </div>

            <PainelContexto ticketId={ticketAtivo.id} cor={cor} />

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

            <div style={{ padding: 14, borderTop: `1px solid ${cor.border}`, position: "relative" }}>
              {mostrarRespostas && (
                <div style={{ position: "absolute", bottom: "100%", left: 14, right: 14, background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 8, maxHeight: 200, overflowY: "auto", marginBottom: 6, zIndex: 10 }}>
                  {respostasRapidas.length === 0 ? (
                    <p style={{ color: cor.textMuted, fontSize: 12, padding: 12 }}>Nenhuma resposta rápida cadastrada.</p>
                  ) : (
                    respostasRapidas.map(r => (
                      <div key={r.id} onClick={() => usarRespostaRapida(r.id)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${cor.border}` }}>
                        <p style={{ color: cor.text, fontSize: 12.5, fontWeight: 600, margin: 0 }}>{r.titulo}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{r.conteudo.slice(0, 60)}...</p>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setMostrarRespostas(!mostrarRespostas)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "0 12px", cursor: "pointer", fontSize: 16 }}>⚡</button>
                <input value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)} onKeyDown={e => e.key === "Enter" && enviarMensagem()} style={inputStyle} placeholder="Digite uma resposta..." />
                <button onClick={enviarMensagem} disabled={enviando} style={btnStyle}>{enviando ? "..." : "Enviar"}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {mostrarAvaliacao && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setMostrarAvaliacao(false)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
            <h2 style={{ color: cor.text, marginBottom: 6, fontSize: 17 }}>Avaliar Atendimento</h2>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 16 }}>Como você avalia este atendimento?</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} onClick={() => setNotaAvaliacao(n)} style={{ fontSize: 28, cursor: "pointer", color: n <= notaAvaliacao ? "#fbbf24" : cor.border }}>★</span>
              ))}
            </div>
            <textarea value={comentarioAvaliacao} onChange={e => setComentarioAvaliacao(e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical", marginBottom: 16 }} placeholder="Comentário (opcional)" />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setMostrarAvaliacao(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Agora não</button>
              <button onClick={enviarAvaliacao} disabled={!notaAvaliacao} style={{ ...btnStyle, flex: 1 }}>Enviar</button>
            </div>
          </div>
        </div>
      )}

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

// ═══════════════════ Gestão de Filas e Equipes (Fase 3) ═══════════════════
function GestaoFilasEquipes({ cor }) {
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif", marginBottom: 10 };
  const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };

  const [equipes, setEquipes] = useState([]);
  const [filas, setFilas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novaEquipe, setNovaEquipe] = useState("");
  const [novaFila, setNovaFila] = useState({ nome: "", team_id: "" });
  const [membroSelecionado, setMembroSelecionado] = useState({});

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.get("/sac/equipes"),
      api.get("/sac/filas"),
      api.get("/settings/usuarios"),
    ]).then(([e, f, u]) => { setEquipes(e.data || []); setFilas(f.data || []); setUsuarios(u.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const criarEquipe = async (e) => {
    e.preventDefault();
    if (!novaEquipe.trim()) return;
    try {
      await api.post("/sac/equipes", { nome: novaEquipe });
      setNovaEquipe("");
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar equipe.");
    }
  };

  const adicionarMembro = async (teamId) => {
    const userId = membroSelecionado[teamId];
    if (!userId) return;
    try {
      await api.post(`/sac/equipes/${teamId}/membros`, { user_id: userId });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao adicionar membro.");
    }
  };

  const removerMembro = async (teamId, userId) => {
    try {
      await api.delete(`/sac/equipes/${teamId}/membros/${userId}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao remover membro.");
    }
  };

  const criarFila = async (e) => {
    e.preventDefault();
    if (!novaFila.nome.trim()) return;
    try {
      await api.post("/sac/filas", { nome: novaFila.nome, team_id: novaFila.team_id || null });
      setNovaFila({ nome: "", team_id: "" });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar fila.");
    }
  };

  const desativarFila = async (id) => {
    if (!confirm("Desativar esta fila?")) return;
    try {
      await api.delete(`/sac/filas/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao desativar fila.");
    }
  };

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        <form onSubmit={criarEquipe} style={{ ...cardStyle, marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input value={novaEquipe} onChange={e => setNovaEquipe(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Nome da nova equipe" />
          <button type="submit" style={btnStyle}>Criar</button>
        </form>

        {equipes.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma equipe cadastrada ainda.</p>
        ) : (
          equipes.map(eq => (
            <div key={eq.id} style={{ ...cardStyle, marginBottom: 12 }}>
              <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{eq.nome}</p>
              {eq.membros.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 10 }}>Nenhum membro ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {eq.membros.map(m => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: cor.bg, borderRadius: 6, padding: "6px 10px" }}>
                      <span style={{ color: cor.text, fontSize: 12.5 }}>{m.nome}</span>
                      <button onClick={() => removerMembro(eq.id, m.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11 }}>Remover</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <select onChange={e => setMembroSelecionado({ ...membroSelecionado, [eq.id]: e.target.value })} style={{ ...inputStyle, marginBottom: 0, flex: 1, appearance: "none" }}>
                  <option value="">Adicionar membro...</option>
                  {usuarios.filter(u => !eq.membros.some(m => m.id === u.id)).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <button onClick={() => adicionarMembro(eq.id)} style={{ ...btnStyle, padding: "9px 14px" }}>+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <form onSubmit={criarFila} style={{ ...cardStyle, marginBottom: 16 }}>
          <input value={novaFila.nome} onChange={e => setNovaFila({ ...novaFila, nome: e.target.value })} style={inputStyle} placeholder="Nome da nova fila" />
          <select value={novaFila.team_id} onChange={e => setNovaFila({ ...novaFila, team_id: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="">Sem equipe vinculada</option>
            {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
          </select>
          <button type="submit" style={{ ...btnStyle, width: "100%" }}>Criar Fila</button>
        </form>

        {filas.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma fila cadastrada ainda.</p>
        ) : (
          filas.map(f => (
            <div key={f.id} style={{ ...cardStyle, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: cor.text, fontWeight: 600, fontSize: 13.5, margin: 0 }}>{f.nome}</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>{f.team_nome || "sem equipe vinculada"}</p>
              </div>
              <button onClick={() => desativarFila(f.id)} style={{ background: "none", border: `1px solid ${cor.border}`, color: "#f87171", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Desativar</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════ Gestão de SLA (Fase 5) ═══════════════════
function GestaoSla({ cor }) {
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const inputStyle = { width: "100%", padding: "8px 10px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
  const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };

  const [regras, setRegras] = useState([]);
  const [indicadores, setIndicadores] = useState(null);
  const [editando, setEditando] = useState({});
  const [loading, setLoading] = useState(true);

  const carregar = () => {
    setLoading(true);
    Promise.all([api.get("/sac/sla/regras"), api.get("/sac/sla/indicadores")])
      .then(([r, i]) => { setRegras(r.data || []); setIndicadores(i.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvarRegra = async (prioridade) => {
    const valores = editando[prioridade];
    if (!valores) return;
    try {
      await api.put("/sac/sla/regras", { prioridade, primeira_resposta_minutos: Number(valores.primeira_resposta_minutos), resolucao_minutos: Number(valores.resolucao_minutos) });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao salvar regra.");
    }
  };

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
      {indicadores && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Cumprimento de SLA</p><h2 style={{ color: indicadores.percentual_cumprimento >= 80 ? "#4ade80" : "#fbbf24", fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.percentual_cumprimento != null ? indicadores.percentual_cumprimento + "%" : "-"}</h2></div>
          <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Dentro do Prazo</p><h2 style={{ color: "#4ade80", fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.dentro_prazo}</h2></div>
          <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Próximo do Vencimento</p><h2 style={{ color: "#fbbf24", fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.proximo_vencimento}</h2></div>
          <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Vencidos</p><h2 style={{ color: "#f87171", fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.vencido}</h2></div>
        </div>
      )}

      <div style={cardStyle}>
        <p style={{ color: cor.text, fontWeight: 700, marginBottom: 16 }}>Regras de SLA por Prioridade</p>
        {regras.map(r => (
          <div key={r.prioridade} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${cor.border}` }}>
            <span style={{ color: CORES_PRIORIDADE[r.prioridade], fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{r.prioridade}</span>
            <div>
              <label style={{ color: cor.textMuted, fontSize: 10.5, display: "block", marginBottom: 2 }}>1ª resposta (min)</label>
              <input type="number" defaultValue={r.primeira_resposta_minutos} onChange={e => setEditando({ ...editando, [r.prioridade]: { ...editando[r.prioridade], primeira_resposta_minutos: e.target.value, resolucao_minutos: editando[r.prioridade]?.resolucao_minutos ?? r.resolucao_minutos } })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: cor.textMuted, fontSize: 10.5, display: "block", marginBottom: 2 }}>Resolução (min)</label>
              <input type="number" defaultValue={r.resolucao_minutos} onChange={e => setEditando({ ...editando, [r.prioridade]: { ...editando[r.prioridade], resolucao_minutos: e.target.value, primeira_resposta_minutos: editando[r.prioridade]?.primeira_resposta_minutos ?? r.primeira_resposta_minutos } })} style={inputStyle} />
            </div>
            <button onClick={() => salvarRegra(r.prioridade)} style={btnStyle}>Salvar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════ Base de Conhecimento e Respostas Rápidas (Fase 6) ═══════════════════
function Conhecimento({ cor }) {
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const inputStyle = { width: "100%", padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif", marginBottom: 10 };
  const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };

  const [subaba, setSubaba] = useState("artigos");
  const [artigos, setArtigos] = useState([]);
  const [respostas, setRespostas] = useState([]);
  const [mostrarFormArtigo, setMostrarFormArtigo] = useState(false);
  const [novoArtigo, setNovoArtigo] = useState({ titulo: "", categoria: "outros", conteudo: "", status: "rascunho" });
  const [mostrarFormResposta, setMostrarFormResposta] = useState(false);
  const [novaResposta, setNovaResposta] = useState({ titulo: "", conteudo: "" });

  const carregar = () => {
    api.get("/sac/kb/artigos").then(r => setArtigos(r.data || [])).catch(() => {});
    api.get("/sac/respostas-rapidas").then(r => setRespostas(r.data || [])).catch(() => {});
  };

  useEffect(() => { carregar(); }, []);

  const criarArtigo = async (e) => {
    e.preventDefault();
    if (!novoArtigo.titulo || !novoArtigo.conteudo) return;
    try {
      await api.post("/sac/kb/artigos", novoArtigo);
      setNovoArtigo({ titulo: "", categoria: "outros", conteudo: "", status: "rascunho" });
      setMostrarFormArtigo(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar artigo.");
    }
  };

  const excluirArtigo = async (id) => {
    if (!confirm("Excluir este artigo?")) return;
    try {
      await api.delete(`/sac/kb/artigos/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao excluir artigo (pode exigir permissão de admin).");
    }
  };

  const criarResposta = async (e) => {
    e.preventDefault();
    if (!novaResposta.titulo || !novaResposta.conteudo) return;
    try {
      await api.post("/sac/respostas-rapidas", novaResposta);
      setNovaResposta({ titulo: "", conteudo: "" });
      setMostrarFormResposta(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar resposta rápida.");
    }
  };

  const desativarResposta = async (id) => {
    try {
      await api.delete(`/sac/respostas-rapidas/${id}`);
      carregar();
    } catch (err) {
      alert("Erro ao desativar.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSubaba("artigos")} style={{ background: subaba === "artigos" ? cor.border : "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Base de Conhecimento</button>
        <button onClick={() => setSubaba("respostas")} style={{ background: subaba === "respostas" ? cor.border : "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Respostas Rápidas</button>
      </div>

      {subaba === "artigos" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button onClick={() => setMostrarFormArtigo(!mostrarFormArtigo)} style={btnStyle}>{mostrarFormArtigo ? "Cancelar" : "+ Novo Artigo"}</button>
          </div>
          {mostrarFormArtigo && (
            <form onSubmit={criarArtigo} style={{ ...cardStyle, marginBottom: 16 }}>
              <input value={novoArtigo.titulo} onChange={e => setNovoArtigo({ ...novoArtigo, titulo: e.target.value })} style={inputStyle} placeholder="Título" required />
              <select value={novoArtigo.categoria} onChange={e => setNovoArtigo({ ...novoArtigo, categoria: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
                <option value="entrega">Entrega</option>
                <option value="pagamento">Pagamento</option>
                <option value="troca">Troca</option>
                <option value="devolucao">Devolução</option>
                <option value="outros">Outros</option>
              </select>
              <textarea value={novoArtigo.conteudo} onChange={e => setNovoArtigo({ ...novoArtigo, conteudo: e.target.value })} style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} placeholder="Conteúdo do artigo" required />
              <select value={novoArtigo.status} onChange={e => setNovoArtigo({ ...novoArtigo, status: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
              </select>
              <button type="submit" style={btnStyle}>Criar</button>
            </form>
          )}
          {artigos.length === 0 ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum artigo cadastrado ainda.</p>
          ) : (
            artigos.map(a => (
              <div key={a.id} style={{ ...cardStyle, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, margin: 0 }}>{a.titulo}</p>
                  <button onClick={() => excluirArtigo(a.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11 }}>Excluir</button>
                </div>
                <p style={{ color: cor.textMuted, fontSize: 11.5, marginBottom: 8 }}>{a.categoria} · {a.status} · por {a.autor_nome || "—"}</p>
                <p style={{ color: cor.text, fontSize: 13, margin: 0 }}>{a.conteudo}</p>
              </div>
            ))
          )}
        </div>
      )}

      {subaba === "respostas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button onClick={() => setMostrarFormResposta(!mostrarFormResposta)} style={btnStyle}>{mostrarFormResposta ? "Cancelar" : "+ Nova Resposta"}</button>
          </div>
          {mostrarFormResposta && (
            <form onSubmit={criarResposta} style={{ ...cardStyle, marginBottom: 16 }}>
              <input value={novaResposta.titulo} onChange={e => setNovaResposta({ ...novaResposta, titulo: e.target.value })} style={inputStyle} placeholder="Título" required />
              <textarea value={novaResposta.conteudo} onChange={e => setNovaResposta({ ...novaResposta, conteudo: e.target.value })} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Conteúdo (use {nome} para o nome do cliente)" required />
              <button type="submit" style={btnStyle}>Criar</button>
            </form>
          )}
          {respostas.length === 0 ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma resposta rápida cadastrada ainda.</p>
          ) : (
            respostas.map(r => (
              <div key={r.id} style={{ ...cardStyle, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: cor.text, fontWeight: 700, fontSize: 13.5, margin: 0 }}>{r.titulo}</p>
                  <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>{r.conteudo}</p>
                </div>
                <button onClick={() => desativarResposta(r.id)} style={{ background: "none", border: `1px solid ${cor.border}`, color: "#f87171", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>Desativar</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════ Qualidade (Fase 8) ═══════════════════
function GestaoQualidade({ cor }) {
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const [indicadores, setIndicadores] = useState(null);

  useEffect(() => { api.get("/sac/qualidade/indicadores").then(r => setIndicadores(r.data)).catch(() => {}); }, []);

  if (!indicadores) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Nota Média</p><h2 style={{ color: "#fbbf24", fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.nota_media != null ? `${indicadores.nota_media} ★` : "-"}</h2></div>
        <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Total de Avaliações</p><h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.total_avaliacoes}</h2></div>
        <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Satisfeitos (4-5★)</p><h2 style={{ color: "#4ade80", fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.satisfeitos}</h2></div>
        <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Insatisfeitos (1-2★)</p><h2 style={{ color: "#f87171", fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.insatisfeitos}</h2></div>
        <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Taxa de Resposta</p><h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{indicadores.taxa_resposta_pct != null ? indicadores.taxa_resposta_pct + "%" : "-"}</h2></div>
      </div>

      <div style={cardStyle}>
        <p style={{ color: cor.text, fontWeight: 700, marginBottom: 14 }}>Distribuição de Notas</p>
        {indicadores.distribuicao.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma avaliação registrada ainda.</p>
        ) : (
          [5, 4, 3, 2, 1].map(n => {
            const item = indicadores.distribuicao.find(d => d.nota === n);
            const total = item?.total || 0;
            const max = Math.max(...indicadores.distribuicao.map(d => d.total), 1);
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ color: cor.textMuted, fontSize: 12, width: 30 }}>{n} ★</span>
                <div style={{ flex: 1, height: 8, background: cor.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(total / max) * 100}%`, background: "#fbbf24", borderRadius: 4 }} />
                </div>
                <span style={{ color: cor.text, fontSize: 12, width: 20, textAlign: "right" }}>{total}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RelatorioSac({ cor }) {
  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 20 };
  const inputStyle = { padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };

  const [dados, setDados] = useState(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = () => {
    setLoading(true);
    api.get("/sac/relatorio", { params: { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined } })
      .then(r => setDados(r.data))
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Erro ao carregar relatório.</p>;

  const maxCategoria = Math.max(...dados.por_categoria.map(c => c.total), 1);
  const maxCanal = Math.max(...dados.por_canal.map(c => c.total), 1);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <label style={{ color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 }}>De</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 }}>Até</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={carregar} style={{ background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>Filtrar</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Tempo Médio 1ª Resposta</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.tempo_medio_primeira_resposta_minutos != null ? `${dados.tempo_medio_primeira_resposta_minutos} min` : "-"}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Tempo Médio Resolução</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.tempo_medio_resolucao_minutos != null ? `${dados.tempo_medio_resolucao_minutos} min` : "-"}</h2>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div>
          <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Por Categoria</h3>
          <div style={cardStyle}>
            {dados.por_categoria.length === 0 ? (
              <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum ticket no período.</p>
            ) : (
              dados.por_categoria.map(c => (
                <div key={c.categoria} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: cor.textMuted, fontSize: 12, width: 90, textTransform: "capitalize" }}>{c.categoria}</span>
                  <div style={{ flex: 1, height: 8, background: cor.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(c.total / maxCategoria) * 100}%`, background: "#a78bfa", borderRadius: 4 }} />
                  </div>
                  <span style={{ color: cor.text, fontSize: 12, width: 20, textAlign: "right" }}>{c.total}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Por Canal</h3>
          <div style={cardStyle}>
            {dados.por_canal.length === 0 ? (
              <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum ticket no período.</p>
            ) : (
              dados.por_canal.map(c => (
                <div key={c.canal} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: cor.textMuted, fontSize: 12, width: 90, textTransform: "capitalize" }}>{c.canal}</span>
                  <div style={{ flex: 1, height: 8, background: cor.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(c.total / maxCanal) * 100}%`, background: "#60a5fa", borderRadius: 4 }} />
                  </div>
                  <span style={{ color: cor.text, fontSize: 12, width: 20, textAlign: "right" }}>{c.total}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Por Responsável</h3>
      <div style={cardStyle}>
        {dados.por_responsavel.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum ticket com responsável atribuído no período.</p>
        ) : (
          dados.por_responsavel.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < dados.por_responsavel.length - 1 ? `1px solid ${cor.border}` : "none" }}>
              <span style={{ color: cor.text, fontSize: 13 }}>{r.responsavel}</span>
              <span style={{ color: cor.textMuted, fontSize: 13 }}>{r.total} ticket(s)</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════ Componente principal ═══════════════════
export default function Sac() {
  const { cor } = useOutletContext();
  const [aba, setAba] = useState("central");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>SAC / Atendimento</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAba("central")} style={{ background: aba === "central" ? cor.border : "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Central de Atendimento</button>
          <button onClick={() => setAba("filas")} style={{ background: aba === "filas" ? cor.border : "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Filas e Equipes</button>
          <button onClick={() => setAba("sla")} style={{ background: aba === "sla" ? cor.border : "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>SLA</button>
          <button onClick={() => setAba("conhecimento")} style={{ background: aba === "conhecimento" ? cor.border : "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Conhecimento</button>
                    <button onClick={() => setAba("qualidade")} style={{ background: aba === "qualidade" ? cor.border : "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Qualidade</button>
          <button onClick={() => setAba("relatorios")} style={{ background: aba === "relatorios" ? cor.border : "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Relatórios</button>
        </div>
      </div>

      {aba === "central" && <CentralAtendimento cor={cor} />}
      {aba === "filas" && <GestaoFilasEquipes cor={cor} />}
      {aba === "sla" && <GestaoSla cor={cor} />}
      {aba === "conhecimento" && <Conhecimento cor={cor} />}
      {aba === "qualidade" && <GestaoQualidade cor={cor} />}
      {aba === "relatorios" && <RelatorioSac cor={cor} />}
    </div>
  );
}