import { useState } from "react";
import api from "../../api";
import { useGet, estilos, dataBR, erroDe, Carregando, ErroBox, Vazio, Modal } from "./ui";

const PRI = { alta: "#f87171", media: "#fbbf24", baixa: "#60a5fa" };
const ST = { aguardando_aprovacao: "Aguardando aprovação", aberta: "Aberta", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada" };

function NovaTarefa({ cor, onClose, onOk, avisar }) {
  const e = estilos(cor);
  const [f, setF] = useState({ titulo: "", descricao: "", prioridade: "media", prazo: "" });
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    try { await api.post("/marketing/tasks", { ...f, prazo: f.prazo || undefined }); avisar("sucesso", "Tarefa criada."); onOk(); }
    catch (err) { avisar("erro", erroDe(err)); } finally { setSalvando(false); }
  };
  return (
    <Modal cor={cor} titulo="Nova tarefa" onClose={onClose}>
      <label style={e.label}>Título</label><input style={e.input} value={f.titulo} onChange={x => setF({ ...f, titulo: x.target.value })} />
      <label style={{ ...e.label, marginTop: 10 }}>Descrição</label><textarea style={{ ...e.input, minHeight: 70 }} value={f.descricao} onChange={x => setF({ ...f, descricao: x.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <div><label style={e.label}>Prioridade</label><select style={e.input} value={f.prioridade} onChange={x => setF({ ...f, prioridade: x.target.value })}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></div>
        <div><label style={e.label}>Prazo</label><input type="date" style={e.input} value={f.prazo} onChange={x => setF({ ...f, prazo: x.target.value })} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><button style={e.btn} disabled={salvando || !f.titulo.trim()} onClick={salvar}>Criar</button></div>
    </Modal>
  );
}

export default function Tarefas({ cor, avisar }) {
  const e = estilos(cor);
  const [filtro, setFiltro] = useState("abertas");
  const [novo, setNovo] = useState(false);
  const { data, erro, carregando, recarregar } = useGet("/marketing/tasks", { status: filtro === "todas" ? undefined : filtro });
  const agir = async (fn, ok) => { try { await fn(); avisar("sucesso", ok); recarregar(); } catch (err) { avisar("erro", erroDe(err)); } };
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  const r = data?.resumo;
  return (
    <div style={e.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["abertas", `Abertas${r ? ` (${r.abertas})` : ""}`], ["aguardando_aprovacao", `Aguardando aprovação${r ? ` (${r.aguardando_aprovacao})` : ""}`], ["concluida", "Concluídas"], ["todas", "Todas"]].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} style={{ ...e.ghost, ...(filtro === k ? { borderColor: cor.accent, color: cor.accent } : {}) }}>{l}</button>
          ))}
        </div>
        <button style={e.btn} onClick={() => setNovo(true)}>+ Nova tarefa</button>
      </div>
      {r?.atrasadas > 0 && <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 10px" }}>{r.atrasadas} tarefa(s) atrasada(s).</p>}
      {carregando ? <Carregando cor={cor} /> : !data?.itens?.length ? <Vazio cor={cor} titulo="Nenhuma tarefa" texto="Tarefas manuais, da Aria e da recuperação de oportunidades aparecem aqui." /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={e.th}>Tarefa</th><th style={e.th}>Prioridade</th><th style={e.th}>Prazo</th><th style={e.th}>Status</th><th style={e.th}>Origem</th><th style={e.th} /></tr></thead>
            <tbody>{data.itens.map(t => (
              <tr key={t.id}>
                <td style={e.td}>{t.titulo}{t.descricao && <div style={e.muted}>{t.descricao}</div>}
                  {(t.lead_nome || t.campanha_nome) && <div style={e.muted}>{t.lead_nome && `Lead: ${t.lead_nome} `}{t.campanha_nome && `· Campanha: ${t.campanha_nome}`}</div>}</td>
                <td style={e.td}><span style={{ color: PRI[t.prioridade] }}>{t.prioridade}</span></td>
                <td style={{ ...e.td, color: t.atrasada ? "#f87171" : cor.text }}>{dataBR(t.prazo)}</td>
                <td style={e.td}>{ST[t.status] || t.status}</td>
                <td style={e.td}>{t.origem}</td>
                <td style={{ ...e.td, whiteSpace: "nowrap" }}>
                  {t.status === "aguardando_aprovacao" && <button style={e.btn} onClick={() => agir(() => api.post(`/marketing/tasks/${t.id}/aprovar`), "Tarefa aprovada.")}>Aprovar</button>}
                  {t.status === "aberta" && <button style={e.ghost} onClick={() => agir(() => api.put(`/marketing/tasks/${t.id}`, { status: "em_andamento" }), "Tarefa iniciada.")}>Iniciar</button>}{" "}
                  {["aberta", "em_andamento"].includes(t.status) && <button style={e.ghost} onClick={() => agir(() => api.put(`/marketing/tasks/${t.id}`, { status: "concluida" }), "Tarefa concluída.")}>Concluir</button>}{" "}
                  {!["concluida", "cancelada"].includes(t.status) && <button style={{ ...e.ghost, color: "#f87171" }} onClick={() => agir(() => api.put(`/marketing/tasks/${t.id}`, { status: "cancelada" }), "Tarefa cancelada.")}>Cancelar</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {novo && <NovaTarefa cor={cor} avisar={avisar} onClose={() => setNovo(false)} onOk={() => { setNovo(false); recarregar(); }} />}
    </div>
  );
}
