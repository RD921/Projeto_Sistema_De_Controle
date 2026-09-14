import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

const cardStyle = { background: "#111", border: "1px solid #222", borderRadius: 12, padding: 20 };
const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };
const btnGhost = { background: "none", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: "pointer", fontFamily: "sans-serif" };
const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
const linkBtn = { background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "2px 4px", color: "#60a5fa", fontFamily: "sans-serif", textDecoration: "underline" };
const linkBtnDanger = { ...linkBtn, color: "#f87171" };

const CORES_ESTAGIO = { prospeccao: "#60a5fa", qualificacao: "#a78bfa", proposta: "#fbbf24", negociacao: "#fb923c", ganho: "#4ade80", perdido: "#f87171" };
const ICONE_TIPO = { ligacao: "\u260E", reuniao: "\u{1F465}", email: "\u2709", nota: "\u{1F4DD}", whatsapp: "\u{1F4AC}" };

function formatarMoeda(valor) {
  const n = Number(valor || 0);
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toDatetimeLocal(valor) {
  if (!valor) return "";
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "";
  const pad = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export default function Customer360() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  const [mostrarInteracao, setMostrarInteracao] = useState(false);
  const [tipoInteracao, setTipoInteracao] = useState("ligacao");
  const [descricaoInteracao, setDescricaoInteracao] = useState("");

  const [mostrarTarefa, setMostrarTarefa] = useState(false);
  const [tituloTarefa, setTituloTarefa] = useState("");
  const [prazoTarefa, setPrazoTarefa] = useState("");

  const [salvando, setSalvando] = useState(false);

  const [editingInteracaoId, setEditingInteracaoId] = useState(null);
  const [editTipoInteracao, setEditTipoInteracao] = useState("ligacao");
  const [editDescricaoInteracao, setEditDescricaoInteracao] = useState("");
  const [salvandoInteracao, setSalvandoInteracao] = useState(false);

  const [editingTarefaId, setEditingTarefaId] = useState(null);
  const [editTituloTarefa, setEditTituloTarefa] = useState("");
  const [editPrazoTarefa, setEditPrazoTarefa] = useState("");
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);

  const carregar = function () {
    api.get("/crm/customers/" + customerId + "/360")
      .then(function (r) { setDados(r.data); })
      .catch(function (err) {
        setErro((err.response && err.response.data && err.response.data.error) || "Erro ao carregar cliente.");
      });
  };

  useEffect(function () { carregar(); }, [customerId]);

  const salvarInteracao = async function () {
    if (!descricaoInteracao.trim()) return;
    setSalvando(true);
    try {
      await api.post("/crm/interactions", {
        customer_id: Number(customerId),
        tipo: tipoInteracao,
        descricao: descricaoInteracao,
      });
      setDescricaoInteracao("");
      setMostrarInteracao(false);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao registrar interacao.");
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicaoInteracao = function (interacao) {
    setEditingInteracaoId(interacao.id);
    setEditTipoInteracao(interacao.tipo);
    setEditDescricaoInteracao(interacao.descricao);
  };

  const cancelarEdicaoInteracao = function () {
    setEditingInteracaoId(null);
  };

  const salvarEdicaoInteracao = async function (id) {
    if (!editDescricaoInteracao.trim()) return;
    setSalvandoInteracao(true);
    try {
      await api.put("/crm/interactions/" + id, { tipo: editTipoInteracao, descricao: editDescricaoInteracao });
      setEditingInteracaoId(null);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao editar interacao.");
    } finally {
      setSalvandoInteracao(false);
    }
  };

  const excluirInteracao = async function (id) {
    if (!window.confirm("Excluir esta interacao? Essa acao nao pode ser desfeita.")) return;
    try {
      await api.delete("/crm/interactions/" + id);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao excluir interacao.");
    }
  };

  const salvarTarefa = async function () {
    if (!tituloTarefa.trim()) return;
    setSalvando(true);
    try {
      await api.post("/crm/tasks", {
        customer_id: Number(customerId),
        titulo: tituloTarefa,
        prazo: prazoTarefa || undefined,
      });
      setTituloTarefa("");
      setPrazoTarefa("");
      setMostrarTarefa(false);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao criar tarefa.");
    } finally {
      setSalvando(false);
    }
  };

  const concluirTarefa = async function (taskId) {
    try {
      await api.put("/crm/tasks/" + taskId + "/concluir");
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao concluir tarefa.");
    }
  };

  const iniciarEdicaoTarefa = function (tarefa) {
    setEditingTarefaId(tarefa.id);
    setEditTituloTarefa(tarefa.titulo);
    setEditPrazoTarefa(toDatetimeLocal(tarefa.prazo));
  };

  const cancelarEdicaoTarefa = function () {
    setEditingTarefaId(null);
  };

  const salvarEdicaoTarefa = async function (id) {
    if (!editTituloTarefa.trim()) return;
    setSalvandoTarefa(true);
    try {
      await api.put("/crm/tasks/" + id, { titulo: editTituloTarefa, prazo: editPrazoTarefa || null });
      setEditingTarefaId(null);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao editar tarefa.");
    } finally {
      setSalvandoTarefa(false);
    }
  };

  const excluirTarefa = async function (id) {
    if (!window.confirm("Excluir esta tarefa? Essa acao nao pode ser desfeita.")) return;
    try {
      await api.delete("/crm/tasks/" + id);
      carregar();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao excluir tarefa.");
    }
  };

  if (erro) {
    return (
      <div>
        <p style={{ color: "#f87171", fontSize: 14 }}>{erro}</p>
        <button style={btnGhost} onClick={function () { navigate("/crm/pipeline"); }}>Voltar ao pipeline</button>
      </div>
    );
  }

  if (!dados) return <p style={{ color: "#555", fontSize: 13 }}>Carregando visao 360...</p>;

  const tarefasPendentes = dados.tarefas.filter(function (t) { return !t.concluida; });
  const tarefasConcluidas = dados.tarefas.filter(function (t) { return t.concluida; });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <button style={{ ...btnGhost, marginBottom: 12 }} onClick={function () { navigate("/crm/pipeline"); }}>
            {"\u2190"} Voltar
          </button>
          <h1 style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 24 }}>{dados.customer.nome}</h1>
          <p style={{ color: "#555", fontSize: 13, margin: "4px 0 0" }}>
            {dados.customer.email || "sem e-mail"} {dados.customer.telefone ? " \u00B7 " + dados.customer.telefone : ""}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "#555", fontSize: 12, margin: 0 }}>Total comprado (pedidos pagos)</p>
          <p style={{ color: "#4ade80", fontSize: 22, fontWeight: 700, margin: "4px 0 0" }}>
            {formatarMoeda(dados.resumo_pedidos.valor_total)}
          </p>
          <p style={{ color: "#555", fontSize: 12, margin: 0 }}>{dados.resumo_pedidos.total} pedido(s)</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h3 style={{ color: "#fff", fontSize: 15, marginBottom: 16 }}>Oportunidades</h3>
            {dados.deals.length === 0 ? (
              <p style={{ color: "#444", fontSize: 13 }}>Nenhuma oportunidade registrada.</p>
            ) : (
              dados.deals.map(function (deal) {
                return (
                  <div key={deal.id} style={{ padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ color: "#fff", fontSize: 13, margin: 0, fontWeight: 600 }}>{deal.titulo}</p>
                      <span style={{ color: CORES_ESTAGIO[deal.estagio] || "#888", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                        {deal.estagio}
                      </span>
                    </div>
                    <p style={{ color: "#555", fontSize: 12, margin: "4px 0 0" }}>
                      {formatarMoeda(deal.valor)} {"\u00B7"} criado em {formatarData(deal.created_at)}
                    </p>
                    {deal.motivo_perda && (
                      <p style={{ color: "#f87171", fontSize: 11, margin: "4px 0 0" }}>Motivo: {deal.motivo_perda}</p>
                    )}
                  </div>
                );
              })
            )}
            <p style={{ color: "#444", fontSize: 11, marginTop: 12 }}>
              Para editar ou excluir uma oportunidade, use o Pipeline.
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ color: "#fff", fontSize: 15, margin: 0 }}>Tarefas</h3>
              <button style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }} onClick={function () { setMostrarTarefa(!mostrarTarefa); }}>
                {mostrarTarefa ? "Cancelar" : "+ Nova"}
              </button>
            </div>

            {mostrarTarefa && (
              <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={tituloTarefa} onChange={function (e) { setTituloTarefa(e.target.value); }} style={inputStyle} placeholder="Titulo da tarefa" />
                <input value={prazoTarefa} onChange={function (e) { setPrazoTarefa(e.target.value); }} style={inputStyle} type="datetime-local" />
                <button style={btnStyle} onClick={salvarTarefa} disabled={salvando}>{salvando ? "Salvando..." : "Criar tarefa"}</button>
              </div>
            )}

            {tarefasPendentes.length === 0 && tarefasConcluidas.length === 0 ? (
              <p style={{ color: "#444", fontSize: 13 }}>Nenhuma tarefa registrada.</p>
            ) : (
              <>
                {tarefasPendentes.map(function (tarefa) {
                  const vencida = tarefa.prazo && new Date(tarefa.prazo) < new Date();
                  const emEdicao = editingTarefaId === tarefa.id;
                  return (
                    <div key={tarefa.id} style={{ padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                      {emEdicao ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input value={editTituloTarefa} onChange={function (e) { setEditTituloTarefa(e.target.value); }} style={inputStyle} placeholder="Titulo" />
                          <input type="datetime-local" value={editPrazoTarefa} onChange={function (e) { setEditPrazoTarefa(e.target.value); }} style={inputStyle} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={{ ...btnGhost, fontSize: 11, padding: "4px 10px", color: "#4ade80", borderColor: "#4ade8040" }} onClick={function () { salvarEdicaoTarefa(tarefa.id); }} disabled={salvandoTarefa}>
                              {salvandoTarefa ? "Salvando..." : "Salvar"}
                            </button>
                            <button style={{ ...btnGhost, fontSize: 11, padding: "4px 10px" }} onClick={cancelarEdicaoTarefa}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <p style={{ color: "#fff", fontSize: 13, margin: 0 }}>{tarefa.titulo}</p>
                              <button style={linkBtn} onClick={function () { iniciarEdicaoTarefa(tarefa); }}>editar</button>
                              <button style={linkBtnDanger} onClick={function () { excluirTarefa(tarefa.id); }}>excluir</button>
                            </div>
                            <p style={{ color: vencida ? "#f87171" : "#555", fontSize: 11, margin: "2px 0 0" }}>
                              {tarefa.prazo ? "Prazo: " + formatarData(tarefa.prazo) + (vencida ? " (vencida)" : "") : "sem prazo"}
                            </p>
                          </div>
                          <button style={{ ...btnGhost, fontSize: 11, padding: "4px 10px", color: "#4ade80", borderColor: "#4ade8040" }} onClick={function () { concluirTarefa(tarefa.id); }}>
                            Concluir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {tarefasConcluidas.map(function (tarefa) {
                  const emEdicao = editingTarefaId === tarefa.id;
                  return (
                    <div key={tarefa.id} style={{ padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                      {emEdicao ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input value={editTituloTarefa} onChange={function (e) { setEditTituloTarefa(e.target.value); }} style={inputStyle} placeholder="Titulo" />
                          <input type="datetime-local" value={editPrazoTarefa} onChange={function (e) { setEditPrazoTarefa(e.target.value); }} style={inputStyle} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={{ ...btnGhost, fontSize: 11, padding: "4px 10px", color: "#4ade80", borderColor: "#4ade8040" }} onClick={function () { salvarEdicaoTarefa(tarefa.id); }} disabled={salvandoTarefa}>
                              {salvandoTarefa ? "Salvando..." : "Salvar"}
                            </button>
                            <button style={{ ...btnGhost, fontSize: 11, padding: "4px 10px" }} onClick={cancelarEdicaoTarefa}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.5 }}>
                          <p style={{ color: "#888", fontSize: 13, margin: 0, textDecoration: "line-through" }}>{tarefa.titulo}</p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button style={linkBtn} onClick={function () { iniciarEdicaoTarefa(tarefa); }}>editar</button>
                            <button style={linkBtnDanger} onClick={function () { excluirTarefa(tarefa.id); }}>excluir</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: "#fff", fontSize: 15, margin: 0 }}>Historico de Interacoes</h3>
            <button style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }} onClick={function () { setMostrarInteracao(!mostrarInteracao); }}>
              {mostrarInteracao ? "Cancelar" : "+ Nova"}
            </button>
          </div>

          {mostrarInteracao && (
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <select value={tipoInteracao} onChange={function (e) { setTipoInteracao(e.target.value); }} style={{ ...inputStyle, appearance: "none" }}>
                <option value="ligacao">Ligacao</option>
                <option value="reuniao">Reuniao</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="nota">Nota</option>
              </select>
              <textarea value={descricaoInteracao} onChange={function (e) { setDescricaoInteracao(e.target.value); }} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Descricao da interacao..." />
              <button style={btnStyle} onClick={salvarInteracao} disabled={salvando}>{salvando ? "Salvando..." : "Registrar"}</button>
            </div>
          )}

          {dados.interacoes.length === 0 ? (
            <p style={{ color: "#444", fontSize: 13 }}>Nenhuma interacao registrada ainda.</p>
          ) : (
            dados.interacoes.map(function (interacao) {
              const emEdicao = editingInteracaoId === interacao.id;
              return (
                <div key={interacao.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <span style={{ fontSize: 14 }}>{ICONE_TIPO[interacao.tipo] || "\u2022"}</span>
                  <div style={{ flex: 1 }}>
                    {emEdicao ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <select value={editTipoInteracao} onChange={function (e) { setEditTipoInteracao(e.target.value); }} style={{ ...inputStyle, appearance: "none" }}>
                          <option value="ligacao">Ligacao</option>
                          <option value="reuniao">Reuniao</option>
                          <option value="email">Email</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="nota">Nota</option>
                        </select>
                        <textarea value={editDescricaoInteracao} onChange={function (e) { setEditDescricaoInteracao(e.target.value); }} style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...btnGhost, fontSize: 11, padding: "4px 10px", color: "#4ade80", borderColor: "#4ade8040" }} onClick={function () { salvarEdicaoInteracao(interacao.id); }} disabled={salvandoInteracao}>
                            {salvandoInteracao ? "Salvando..." : "Salvar"}
                          </button>
                          <button style={{ ...btnGhost, fontSize: 11, padding: "4px 10px" }} onClick={cancelarEdicaoInteracao}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <p style={{ color: "#fff", fontSize: 13, margin: 0, flex: 1 }}>{interacao.descricao}</p>
                          <button style={linkBtn} onClick={function () { iniciarEdicaoInteracao(interacao); }}>editar</button>
                          <button style={linkBtnDanger} onClick={function () { excluirInteracao(interacao.id); }}>excluir</button>
                        </div>
                        <p style={{ color: "#555", fontSize: 11, margin: "4px 0 0" }}>
                          {interacao.tipo} {"\u00B7"} {formatarData(interacao.created_at)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}