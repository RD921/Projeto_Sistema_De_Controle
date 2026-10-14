import { useState } from "react";
import api from "../../api";
import { estilos, useGet, Carregando, ErroBox, Vazio, Modal, BadgeTemp, int, brl, dataBR, erroDe, STATUS_CAMPANHA_COR } from "./ui";

const STATUS = ["novo", "contactado", "engajado", "qualificado", "oportunidade", "cliente", "perdido", "inativo"];
const INTERACOES = [["ligacao", "Ligação"], ["reuniao", "Reunião"], ["resposta", "Resposta do lead"], ["proposta", "Proposta enviada"], ["email", "E-mail"], ["whatsapp", "WhatsApp"], ["nota", "Anotação"]];

function DetalheLead({ cor, e, id, onClose, avisar, recarregarLista }) {
  const { data: l, erro, carregando, recarregar } = useGet(`/marketing/leads/${id}`);
  const [inter, setInter] = useState({ tipo: "ligacao", descricao: "" });
  const [acao, setAcao] = useState({ proxima_acao: "" });
  const atualizar = () => { recarregar(); recarregarLista(); };
  const rodar = async (fn, ok) => { try { await fn(); avisar({ tipo: "sucesso", texto: ok }); atualizar(); } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); } };
  return (
    <Modal cor={cor} titulo={l ? l.nome : "Lead"} onClose={onClose} largura={720}>
      {carregando ? <Carregando cor={cor} /> : erro ? <ErroBox cor={cor} texto={erro} /> : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <BadgeTemp temperatura={l.temperatura} /><b style={{ color: cor.text }}>Score {l.score}</b>
            <span style={e.muted}>{l.email || "sem e-mail"} · {l.telefone || "sem telefone"}{l.empresa ? ` · ${l.empresa}` : ""}</span>
          </div>
          <div style={{ ...e.card, padding: 14 }}>
            <p style={{ color: cor.text, fontSize: 13, margin: "0 0 4px", fontWeight: 600 }}>Por que essa pontuação?</p>
            <p style={{ ...e.muted, margin: 0 }}>{l.explicacao}</p>
            <p style={{ color: cor.text, fontSize: 13, margin: "8px 0 0" }}>👉 Próxima ação sugerida: {l.proxima_acao || "—"}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <div><label style={e.label}>Status</label>
              <select style={e.input} value={l.status} onChange={ev => rodar(() => api.put(`/marketing/leads/${id}/status`, { status: ev.target.value, motivo: ev.target.value === "perdido" ? (window.prompt("Motivo da perda (opcional):") || undefined) : undefined }), "Status atualizado.")}>
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label style={e.label}>Origem / canal</label><div style={{ color: cor.text, fontSize: 13, paddingTop: 8 }}>{l.origem || "—"} / {l.canal || "—"}</div></div>
            <div><label style={e.label}>Campanha</label><div style={{ color: cor.text, fontSize: 13, paddingTop: 8 }}>{l.campanha_nome || "—"}</div></div>
            <div><label style={e.label}>Etapa do funil</label><div style={{ color: cor.text, fontSize: 13, paddingTop: 8 }}>{l.etapa_nome || "—"}</div></div>
          </div>
          {(l.utm_source || l.utm_campaign) && <p style={e.muted}>UTM: {[l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content].filter(Boolean).join(" / ")}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {l.deal_id ? <span style={{ color: "#4ade80", fontSize: 13 }}>No CRM: {l.deal?.titulo} ({l.deal?.estagio})</span> : (
              <button style={e.btn} disabled={["cliente", "perdido", "inativo"].includes(l.status)} onClick={() => rodar(() => api.post(`/marketing/leads/${id}/enviar-crm`), "Lead enviado ao CRM.")}>Enviar ao CRM</button>
            )}
          </div>
          <div style={{ ...e.card, padding: 14 }}>
            <p style={{ color: cor.text, fontSize: 13, margin: "0 0 8px", fontWeight: 600 }}>Registrar interação</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select style={{ ...e.input, width: 170 }} value={inter.tipo} onChange={ev => setInter(p => ({ ...p, tipo: ev.target.value }))}>{INTERACOES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select>
              <input style={{ ...e.input, flex: 1, minWidth: 180 }} placeholder="O que aconteceu?" value={inter.descricao} onChange={ev => setInter(p => ({ ...p, descricao: ev.target.value }))} />
              <button style={e.btn} onClick={() => rodar(async () => { await api.post(`/marketing/leads/${id}/interacoes`, inter); setInter(p => ({ ...p, descricao: "" })); }, "Interação registrada.")}>Registrar</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input style={e.input} placeholder="Definir a próxima ação (ex: ligar amanhã às 10h)" value={acao.proxima_acao} onChange={ev => setAcao({ proxima_acao: ev.target.value })} />
              <button style={e.ghost} onClick={() => rodar(() => api.put(`/marketing/leads/${id}`, acao), "Próxima ação salva.")}>Salvar</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            <div><p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>Composição do score</p>
              {l.historico_score.length === 0 ? <p style={e.muted}>Sem pontos registrados.</p> : l.historico_score.slice(0, 12).map((h, i) => <p key={i} style={{ ...e.muted, margin: "2px 0" }}><b style={{ color: h.pontos_aplicados >= 0 ? "#4ade80" : "#f87171" }}>{h.pontos_aplicados > 0 ? "+" : ""}{h.pontos_aplicados}</b> {h.motivo}</p>)}</div>
            <div><p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>Histórico</p>
              {l.eventos.length === 0 ? <p style={e.muted}>Nada registrado.</p> : l.eventos.slice(0, 12).map(h => <p key={h.id} style={{ ...e.muted, margin: "2px 0" }}>{dataBR(h.created_at)} · {h.descricao || h.tipo}</p>)}</div>
          </div>
          {l.tarefas.length > 0 && <div><p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>Tarefas</p>{l.tarefas.map(t => <p key={t.id} style={{ ...e.muted, margin: "2px 0" }}>{t.titulo} — {t.status}</p>)}</div>}
        </div>
      )}
    </Modal>
  );
}

function NovoLead({ cor, e, campanhas, onClose, onOk, avisar }) {
  const [f, setF] = useState({ nome: "", email: "", telefone: "", empresa: "", interesse: "", origem: "", valor_estimado: "", campaign_id: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const salvar = async () => {
    try {
      const r = await api.post("/marketing/leads", { ...f, valor_estimado: f.valor_estimado === "" ? undefined : Number(String(f.valor_estimado).replace(",", ".")), campaign_id: f.campaign_id || undefined });
      avisar({ tipo: "sucesso", texto: r.data.message }); onOk();
    } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); }
  };
  return (
    <Modal cor={cor} titulo="Novo lead" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["nome", "Nome *"], ["email", "E-mail"], ["telefone", "Telefone"], ["empresa", "Empresa"], ["interesse", "Interesse"], ["origem", "Origem (ex: indicacao)"], ["valor_estimado", "Valor estimado (R$)"]].map(([k, r]) => (
          <div key={k}><label style={e.label}>{r}</label><input style={e.input} value={f[k]} onChange={ev => set(k, ev.target.value)} /></div>
        ))}
        <div><label style={e.label}>Campanha</label><select style={e.input} value={f.campaign_id} onChange={ev => set("campaign_id", ev.target.value)}><option value="">Nenhuma</option>{campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
      </div>
      <p style={{ ...e.muted, margin: "10px 0" }}>Informe e-mail ou telefone. Se o contato já existir, os dados são completados em vez de duplicar.</p>
      <button style={e.btn} onClick={salvar}>Salvar lead</button>
    </Modal>
  );
}

function Leads({ cor, e, filtros, avisar, campanhas }) {
  const [f, setF] = useState({ status: "", temperatura: "", q: "" });
  const [pagina, setPagina] = useState(0);
  const [aberto, setAberto] = useState(null);
  const [novo, setNovo] = useState(false);
  const LIM = 25;
  const params = { limite: LIM, offset: pagina * LIM, ...(filtros.campaignId ? { campaign_id: filtros.campaignId } : {}), ...(f.status ? { status: f.status } : {}), ...(f.temperatura ? { temperatura: f.temperatura } : {}), ...(f.q ? { q: f.q } : {}) };
  const { data, erro, carregando, headers, recarregar } = useGet("/marketing/leads", params);
  const total = Number(headers?.["x-total-count"] || 0);
  return (
    <div style={{ ...e.card, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <h3 style={e.h3}>Leads {total ? <span style={e.muted}>({int(total)})</span> : null}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...e.input, width: 180 }} placeholder="Buscar nome, e-mail…" value={f.q} onChange={ev => { setPagina(0); setF(p => ({ ...p, q: ev.target.value })); }} />
          <select style={{ ...e.input, width: 140 }} value={f.status} onChange={ev => { setPagina(0); setF(p => ({ ...p, status: ev.target.value })); }}><option value="">Todos os status</option>{STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select>
          <select style={{ ...e.input, width: 140 }} value={f.temperatura} onChange={ev => { setPagina(0); setF(p => ({ ...p, temperatura: ev.target.value })); }}><option value="">Temperatura</option><option value="quente">quente</option><option value="morno">morno</option><option value="frio">frio</option></select>
          <button style={e.btn} onClick={() => setNovo(true)}>+ Novo lead</button>
        </div>
      </div>
      {carregando ? <Carregando cor={cor} /> : erro ? <ErroBox cor={cor} texto={erro} /> : data.length === 0 ? <Vazio cor={cor} titulo="Nenhum lead encontrado" texto="Leads chegam por formulários, landing pages, links rastreáveis ou cadastro manual." /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={e.th}>Lead</th><th style={e.th}>Status / etapa</th><th style={e.th}>Origem</th><th style={e.th}>Campanha</th><th style={e.th}>Score</th><th style={e.th}>Captado</th></tr></thead>
            <tbody>{data.map(l => (
              <tr key={l.id} onClick={() => setAberto(l.id)} style={{ cursor: "pointer" }}>
                <td style={e.td}><b>{l.nome}</b><br /><span style={e.muted}>{l.email || l.telefone || "—"}</span></td>
                <td style={e.td}>{l.status}<br /><span style={e.muted}>{l.etapa_nome || ""}</span></td>
                <td style={e.td}>{l.origem || "—"}{l.canal ? ` / ${l.canal}` : ""}</td>
                <td style={e.td}>{l.campanha_nome || "—"}</td>
                <td style={e.td}><b>{l.score}</b> <BadgeTemp temperatura={l.temperatura} /></td>
                <td style={e.td}>{dataBR(l.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
        <button style={e.ghost} disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>← Anterior</button>
        <span style={e.muted}>Página {pagina + 1}</span>
        <button style={e.ghost} disabled={(pagina + 1) * LIM >= total} onClick={() => setPagina(p => p + 1)}>Próxima →</button>
      </div>
      {aberto && <DetalheLead cor={cor} e={e} id={aberto} onClose={() => setAberto(null)} avisar={avisar} recarregarLista={recarregar} />}
      {novo && <NovoLead cor={cor} e={e} campanhas={campanhas} avisar={avisar} onClose={() => setNovo(false)} onOk={() => { setNovo(false); recarregar(); }} />}
    </div>
  );
}

const TIPOS_CAMP = ["email", "sms", "whatsapp", "push", "ads", "social", "outro"];
const ETAPAS = [["aquisicao", "Aquisição"], ["nutricao", "Nutrição"], ["conversao", "Conversão"], ["recompra", "Recompra"]];

export function FormCampanha({ cor, e, onClose, onOk, avisar, inicial }) {
  const [f, setF] = useState({ nome: "", objetivo: "", tipo: "ads", canal: "", etapa_funil: "", orcamento: "", meta_leads: "", meta_clientes: "", meta_receita: "", data_inicio: "", data_fim: "", conteudo: "", ...(inicial || {}) });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const salvar = async () => {
    const corpo = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== null && v !== undefined));
    try {
      if (inicial?.id) await api.put(`/marketing/campaigns/${inicial.id}`, corpo); else await api.post("/marketing/campaigns", corpo);
      avisar({ tipo: "sucesso", texto: inicial?.id ? "Campanha atualizada." : "Campanha criada como rascunho." }); onOk();
    } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); }
  };
  const ini = v => (v ? String(v).slice(0, 10) : "");
  return (
    <Modal cor={cor} titulo={inicial?.id ? "Editar campanha" : "Nova campanha"} onClose={onClose} largura={640}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}><label style={e.label}>Nome *</label><input style={e.input} value={f.nome} onChange={ev => set("nome", ev.target.value)} /></div>
        <div style={{ gridColumn: "1 / -1" }}><label style={e.label}>Objetivo</label><input style={e.input} value={f.objetivo || ""} onChange={ev => set("objetivo", ev.target.value)} placeholder="Ex: captar 100 leads qualificados" /></div>
        <div><label style={e.label}>Tipo</label><select style={e.input} value={f.tipo} onChange={ev => set("tipo", ev.target.value)}>{TIPOS_CAMP.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label style={e.label}>Canal</label><input style={e.input} value={f.canal || ""} onChange={ev => set("canal", ev.target.value)} placeholder="instagram, google…" /></div>
        <div><label style={e.label}>Etapa do funil</label><select style={e.input} value={f.etapa_funil || ""} onChange={ev => set("etapa_funil", ev.target.value)}><option value="">—</option>{ETAPAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
        <div><label style={e.label}>Orçamento (R$) <span style={e.muted}>— meta, não é gasto</span></label><input style={e.input} value={f.orcamento || ""} onChange={ev => set("orcamento", ev.target.value)} /></div>
        <div><label style={e.label}>Meta de leads</label><input style={e.input} value={f.meta_leads || ""} onChange={ev => set("meta_leads", ev.target.value)} /></div>
        <div><label style={e.label}>Meta de clientes</label><input style={e.input} value={f.meta_clientes || ""} onChange={ev => set("meta_clientes", ev.target.value)} /></div>
        <div><label style={e.label}>Meta de receita (R$)</label><input style={e.input} value={f.meta_receita || ""} onChange={ev => set("meta_receita", ev.target.value)} /></div>
        <div />
        <div><label style={e.label}>Início</label><input type="date" style={e.input} value={ini(f.data_inicio)} onChange={ev => set("data_inicio", ev.target.value)} /></div>
        <div><label style={e.label}>Fim</label><input type="date" style={e.input} value={ini(f.data_fim)} onChange={ev => set("data_fim", ev.target.value)} /></div>
        <div style={{ gridColumn: "1 / -1" }}><label style={e.label}>Conteúdo / mensagem</label><textarea style={{ ...e.input, minHeight: 70 }} value={f.conteudo || ""} onChange={ev => set("conteudo", ev.target.value)} /></div>
      </div>
      <button style={{ ...e.btn, marginTop: 12 }} onClick={salvar}>{inicial?.id ? "Salvar" : "Criar campanha (rascunho)"}</button>
    </Modal>
  );
}

function Campanhas({ cor, e, avisar, campanhas, recarregarCampanhas }) {
  const [edit, setEdit] = useState(null);
  const acao = async (c, a) => {
    if (a === "excluir" && !window.confirm(`Excluir a campanha "${c.nome}"?`)) return;
    try { if (a === "excluir") await api.delete(`/marketing/campaigns/${c.id}`); else await api.post(`/marketing/campaigns/${c.id}/${a}`); recarregarCampanhas(); } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); }
  };
  return (
    <div style={e.card}>
      <h3 style={{ ...e.h3, marginBottom: 12 }}>Campanhas</h3>
      {campanhas.length === 0 ? <Vazio cor={cor} titulo="Nenhuma campanha" texto="Use o botão “Nova campanha” no topo." /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={e.th}>Campanha</th><th style={e.th}>Canal / tipo</th><th style={e.th}>Metas</th><th style={e.th}>Orçamento</th><th style={e.th}>Responsável</th><th style={e.th}></th></tr></thead>
            <tbody>{campanhas.map(c => (
              <tr key={c.id}>
                <td style={e.td}><b>{c.nome}</b><br /><span style={{ color: STATUS_CAMPANHA_COR[c.status], fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{c.status}</span>{c.objetivo && <span style={{ ...e.muted, display: "block" }}>{c.objetivo}</span>}</td>
                <td style={e.td}>{c.canal || "—"} / {c.tipo}</td>
                <td style={e.td}>{c.meta_leads ? `${c.meta_leads} leads` : ""}{c.meta_clientes ? ` · ${c.meta_clientes} clientes` : ""}{c.meta_receita ? ` · ${brl(c.meta_receita)}` : ""}{!c.meta_leads && !c.meta_clientes && !c.meta_receita ? "—" : ""}</td>
                <td style={e.td}>{c.orcamento != null ? brl(c.orcamento) : "—"}</td>
                <td style={e.td}>{c.responsavel_nome || "—"}</td>
                <td style={{ ...e.td, whiteSpace: "nowrap" }}>
                  <button style={e.ghost} onClick={() => setEdit(c)}>Editar</button>{" "}
                  {c.status !== "ativa" && c.status !== "finalizada" && <button style={e.ghost} onClick={() => acao(c, "ativar")}>Ativar</button>}{" "}
                  {c.status === "ativa" && <button style={e.ghost} onClick={() => acao(c, "pausar")}>Pausar</button>}{" "}
                  {c.status !== "finalizada" && <button style={e.ghost} onClick={() => acao(c, "finalizar")}>Finalizar</button>}{" "}
                  <button style={{ ...e.ghost, color: "#f87171" }} onClick={() => acao(c, "excluir")}>Excluir</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p style={{ ...e.muted, marginTop: 10 }}>Ativar uma campanha não envia mensagens nem gasta dinheiro sozinho: se ela tiver uma automação vinculada, a automação é ativada. O investimento é lançado manualmente em Alcance & Métricas.</p>
      {edit && <FormCampanha cor={cor} e={e} inicial={edit} avisar={avisar} onClose={() => setEdit(null)} onOk={() => { setEdit(null); recarregarCampanhas(); }} />}
    </div>
  );
}

export default function LeadsCampanhas({ cor, filtros, avisar, campanhas, recarregarCampanhas }) {
  const e = estilos(cor);
  return (
    <div>
      <Leads cor={cor} e={e} filtros={filtros} avisar={avisar} campanhas={campanhas} />
      <Campanhas cor={cor} e={e} avisar={avisar} campanhas={campanhas} recarregarCampanhas={recarregarCampanhas} />
    </div>
  );
}
