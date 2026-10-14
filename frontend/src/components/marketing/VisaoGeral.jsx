import { useState } from "react";
import api from "../../api";
import { estilos, useGet, Carregando, ErroBox, Vazio, Selo, BadgeTemp, brl, int, pct, vezes, erroDe, STATUS_CAMPANHA_COR } from "./ui";

// [chave, rótulo, formato, menor é melhor?, o que falta quando vier vazio]
const KPIS = [
  ["leads_captados", "Leads captados", int, false, "Nenhum lead captado no período"],
  ["leads_qualificados", "Leads qualificados", int, false, "Nenhum lead qualificado no período"],
  ["taxa_conversao", "Taxa de conversão", pct, false, "Sem leads no período para calcular"],
  ["clientes_adquiridos", "Clientes adquiridos", int, false, "Nenhum lead virou cliente no período"],
  ["investimento", "Investimento", brl, false, "Nenhum investimento informado"],
  ["custo_por_lead", "Custo por lead", brl, true, "Informe o investimento para calcular"],
  ["cac", "CAC", brl, true, "Informe o investimento e tenha clientes adquiridos"],
  ["receita_atribuida", "Receita atribuída", brl, false, "Nenhum pedido pago atribuído a campanhas"],
  ["roas", "ROAS", vezes, false, "Informe o investimento para calcular"],
  ["roi_pct", "ROI", pct, false, "Informe o investimento para calcular"],
];

function Variacao({ k, menorMelhor, cor }) {
  if (k.variacao_pct === null || k.variacao_pct === undefined) return <span style={{ color: cor.textMuted, fontSize: 11.5 }}>sem período anterior para comparar</span>;
  const bom = menorMelhor ? k.variacao_pct <= 0 : k.variacao_pct >= 0;
  const c = k.variacao_pct === 0 ? cor.textMuted : bom ? "#4ade80" : "#f87171";
  return <span style={{ color: c, fontSize: 12, fontWeight: 600 }}>{k.variacao_pct > 0 ? "▲" : k.variacao_pct < 0 ? "▼" : "•"} {Math.abs(k.variacao_pct).toLocaleString("pt-BR")}% <span style={{ color: cor.textMuted, fontWeight: 400 }}>vs. período anterior</span></span>;
}

function Funil({ funil, cor, e }) {
  if (!funil || !funil.etapas?.length) return <Vazio cor={cor} titulo="Sem funil" texto="O funil padrão é criado quando o primeiro lead entra." />;
  const caminho = funil.etapas.filter(x => x.tipo !== "perdido");
  const topo = caminho[0]?.alcancaram || 0;
  return (
    <div>
      {funil.total_leads === 0 && <p style={e.muted}>Nenhum lead captado no período.</p>}
      {caminho.map(et => {
        const gargalo = funil.gargalo?.etapa_id === et.id;
        return (
          <div key={et.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: cor.text }}>{et.nome}{gargalo && <span style={{ color: "#f87171", fontWeight: 700, marginLeft: 8, fontSize: 11 }}>● GARGALO</span>}</span>
              <span style={{ color: cor.textMuted }}>{int(et.alcancaram)}{topo > 0 ? ` · ${pct(et.pct_do_topo)}` : ""}</span>
            </div>
            <div style={{ background: cor.border, borderRadius: 4, height: 8 }}>
              <div style={{ background: gargalo ? "#f87171" : cor.accent, borderRadius: 4, height: 8, width: `${topo > 0 ? Math.max((et.alcancaram / topo) * 100, 1) : 0}%` }} />
            </div>
            {et.desistencias !== null && et.desistencias > 0 && <p style={{ ...e.muted, margin: "3px 0 0", fontSize: 11.5 }}>{int(et.desistencias)} não avançaram ({pct(et.pct_desistencia)})</p>}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Selo tipo="observado" />
        {!funil.amostra_suficiente && <span style={e.muted}>Amostra pequena ({funil.total_leads} de {funil.amostra_minima} leads): o gargalo só é apontado com volume suficiente.</span>}
      </div>
    </div>
  );
}

function PainelAria({ cor, e, recs, recarregar, ir }) {
  const [pergunta, setPergunta] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [pins, setPins] = useState({});
  const [msg, setMsg] = useState(null);

  const agir = async (id, acao) => {
    try {
      const r = await api.post(`/marketing/aria/recomendacoes/${id}/${acao}`);
      setMsg({ tipo: "sucesso", texto: acao === "aceitar" ? `${r.data.tarefas_criadas} tarefa(s) criada(s) em Tarefas.` : "Recomendação descartada." });
      recarregar();
    } catch (err) { setMsg({ tipo: "erro", texto: erroDe(err) }); }
  };

  const perguntar = async () => {
    const texto = pergunta.trim();
    if (!texto) return;
    const novas = [...msgs, { role: "user", text: texto }];
    setMsgs(novas); setPergunta(""); setEnviando(true);
    try {
      const r = await api.post("/marketing/chat", { mensagens: novas });
      setMsgs(p => [...p, { role: "assistant", text: r.data.resposta, acao: r.data.acao_proposta ? { ...r.data.acao_proposta, status: "pendente" } : null }]);
    } catch { setMsgs(p => [...p, { role: "assistant", text: "A Aria não respondeu agora. Verifique se a chave da IA (Gemini) está configurada no servidor." }]); }
    finally { setEnviando(false); }
  };

  const confirmar = async acao => {
    const pin = pins[acao.proposta_id];
    if (!pin) return;
    try {
      const r = await api.post(`/assistente/acoes/${acao.proposta_id}/confirmar`, { pin });
      setMsgs(p => p.map(m => m.acao?.proposta_id === acao.proposta_id ? { ...m, acao: { ...m.acao, status: "confirmada", resultado: r.data.resultado } } : m));
      recarregar();
    } catch (err) { setMsgs(p => p.map(m => m.acao?.proposta_id === acao.proposta_id ? { ...m, acao: { ...m.acao, erro: erroDe(err) } } : m)); }
  };

  const cI = { alto: "#f87171", medio: "#fbbf24", baixo: "#4ade80" };
  return (
    <div style={e.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={e.h3}>✨ Aria — oportunidades</h3>
        <button style={e.ghost} onClick={() => api.get("/marketing/aria/recomendacoes", { params: { atualizar: 1 } }).then(recarregar).catch(() => {})}>Atualizar análise</button>
      </div>
      {msg && <p style={{ color: msg.tipo === "sucesso" ? "#4ade80" : "#f87171", fontSize: 12.5 }}>{msg.texto}</p>}
      {recs.length === 0 ? (
        <p style={e.muted}>Nenhuma recomendação no momento. A Aria só recomenda quando encontra um sinal real nos seus dados.</p>
      ) : recs.map(r => (
        <div key={r.id} style={{ borderTop: `1px solid ${cor.border}`, padding: "10px 0" }}>
          <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: "0 0 3px" }}>{r.titulo}</p>
          <p style={{ ...e.muted, margin: "0 0 6px" }}>{r.motivo}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 11 }}>
            <span style={{ color: cI[r.impacto] }}>impacto {r.impacto}</span><span style={{ color: cor.textMuted }}>· esforço {r.esforco} · confiança {r.confianca}%{r.custo_estimado ? ` · custo ${brl(r.custo_estimado)}` : ""}</span>
            <span style={{ flex: 1 }} />
            <button style={{ ...e.btn, padding: "4px 10px", fontSize: 12 }} onClick={() => agir(r.id, "aceitar")}>Criar tarefas</button>
            <button style={{ ...e.ghost, padding: "4px 10px", fontSize: 12 }} onClick={() => agir(r.id, "descartar")}>Descartar</button>
          </div>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${cor.border}`, marginTop: 8, paddingTop: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ margin: "0 0 10px", textAlign: m.role === "user" ? "right" : "left" }}>
            <div style={{ display: "inline-block", maxWidth: "92%", background: m.role === "user" ? `${cor.accent}22` : cor.cardHover, color: cor.text, borderRadius: 10, padding: "8px 12px", fontSize: 13, whiteSpace: "pre-wrap", textAlign: "left" }}>{m.text}</div>
            {m.acao && (
              <div style={{ marginTop: 8, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 10, textAlign: "left" }}>
                <p style={{ color: cor.text, fontSize: 13, margin: "0 0 4px", fontWeight: 600 }}>{m.acao.resumo}</p>
                {m.acao.status === "confirmada" ? <p style={{ color: "#4ade80", fontSize: 12.5, margin: 0 }}>{m.acao.resultado?.mensagem || "Confirmado."}</p> : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="password" inputMode="numeric" placeholder="PIN de autorização" value={pins[m.acao.proposta_id] || ""} onChange={ev => setPins(p => ({ ...p, [m.acao.proposta_id]: ev.target.value.replace(/\D/g, "") }))} style={{ ...e.input, width: 170 }} />
                    <button style={e.btn} onClick={() => confirmar(m.acao)}>Confirmar</button>
                  </div>
                )}
                {m.acao.erro && <p style={{ color: "#f87171", fontSize: 12, margin: "6px 0 0" }}>{m.acao.erro}</p>}
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <input value={pergunta} onChange={ev => setPergunta(ev.target.value)} onKeyDown={ev => ev.key === "Enter" && perguntar()} placeholder="Pergunte à Aria: por que meus leads não convertem?" style={e.input} />
          <button style={e.btn} disabled={enviando} onClick={perguntar}>{enviando ? "…" : "Perguntar"}</button>
        </div>
        <p style={{ ...e.muted, margin: "6px 0 0", fontSize: 11.5 }}>Quer um plano completo? Use o botão “Estratégia com Aria” no topo. <button onClick={() => ir("tarefas")} style={{ background: "none", border: "none", color: cor.accent, cursor: "pointer", padding: 0, fontSize: 11.5 }}>Ver tarefas</button></p>
      </div>
    </div>
  );
}

export default function VisaoGeral({ cor, filtros, ir }) {
  const e = estilos(cor);
  const { data, erro, carregando, recarregar } = useGet("/marketing/overview", { dias: filtros.dias, ...(filtros.campaignId ? { campaign_id: filtros.campaignId } : {}) });
  const op = useGet("/marketing/recovery/oportunidades");
  if (carregando) return <Carregando cor={cor} />;
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  const k = data.kpis;
  const sinais = data.dados?.sinais_de_pouco_dado || [];

  return (
    <div>
      {sinais.length > 0 && (
        <div style={{ ...e.card, marginBottom: 16, borderColor: "#fbbf2455" }}>
          <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>O que falta para os números ficarem completos</p>
          {sinais.map(s => <p key={s} style={{ ...e.muted, margin: "2px 0" }}>• {s}</p>)}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12, marginBottom: 16 }}>
        {KPIS.map(([chave, rotulo, fmt, menorMelhor, falta]) => {
          const x = k[chave];
          const vazio = x.valor === null || x.valor === undefined;
          return (
            <div key={chave} style={{ ...e.card, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{rotulo}</span><Selo tipo={x.tipo} />
              </div>
              <div style={{ color: vazio ? cor.textMuted : cor.text, fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{fmt(x.valor)}</div>
              {vazio ? <span style={{ color: cor.textMuted, fontSize: 11.5 }}>{x.nota || falta}</span> : <Variacao k={x} menorMelhor={menorMelhor} cor={cor} />}
              {chave === "leads_qualificados" && x.taxa_sobre_leads_pct != null && <p style={{ ...e.muted, margin: "4px 0 0", fontSize: 11.5 }}>{pct(x.taxa_sobre_leads_pct)} dos leads</p>}
              {chave === "receita_atribuida" && <p style={{ ...e.muted, margin: "4px 0 0", fontSize: 11 }} title={x.regra}>{x.pedidos || 0} pedido(s) · ver regra ⓘ</p>}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={e.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}><h3 style={e.h3}>Funil de conversão</h3><button style={e.ghost} onClick={() => ir("funis")}>Detalhes</button></div>
          <Funil funil={data.funil} cor={cor} e={e} />
        </div>
        <PainelAria cor={cor} e={e} recs={data.recomendacoes || []} recarregar={recarregar} ir={ir} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={e.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><h3 style={e.h3}>Campanhas</h3><button style={e.ghost} onClick={() => ir("leads-campanhas")}>Gerenciar</button></div>
          {data.campanhas.length === 0 ? <Vazio cor={cor} titulo="Nenhuma campanha" texto="Crie uma campanha no botão “Nova campanha”." /> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={e.th}>Campanha</th><th style={e.th}>Leads</th><th style={e.th}>Clientes</th><th style={e.th}>Invest.</th><th style={e.th}>ROAS</th></tr></thead>
              <tbody>{data.campanhas.slice(0, 6).map(c => (
                <tr key={c.id}><td style={e.td}>{c.nome}<br /><span style={{ color: STATUS_CAMPANHA_COR[c.status], fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{c.status}</span></td>
                  <td style={e.td}>{int(c.leads)}</td><td style={e.td}>{int(c.clientes)}</td><td style={e.td}>{c.investimento > 0 ? brl(c.investimento) : "—"}</td><td style={e.td}>{vezes(c.roas)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div style={e.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><h3 style={e.h3}>Oportunidades prioritárias</h3><button style={e.ghost} onClick={() => ir("leads-campanhas")}>Ver leads</button></div>
          {data.leads_prioritarios.length === 0 ? <Vazio cor={cor} titulo="Nenhum lead em andamento" texto="Quando houver leads, os de maior pontuação aparecem aqui com a próxima ação." /> : data.leads_prioritarios.map(l => (
            <div key={l.id} style={{ borderTop: `1px solid ${cor.border}`, padding: "9px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ color: cor.text, fontSize: 13.5, fontWeight: 600 }}>{l.nome}</span><span style={{ display: "flex", gap: 8, alignItems: "center" }}><BadgeTemp temperatura={l.temperatura} /><b style={{ color: cor.text, fontSize: 13 }}>{l.score}</b></span></div>
              <p style={{ ...e.muted, margin: "3px 0 0" }}>👉 {l.proxima_acao || "—"}</p>
              <p style={{ ...e.muted, margin: "2px 0 0", fontSize: 11.5 }}>{l.explicacao}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <div style={e.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><h3 style={e.h3}>Recuperação de oportunidades</h3><button style={e.ghost} onClick={() => ir("recuperacao")}>Abrir</button></div>
          {op.carregando ? <Carregando cor={cor} /> : (op.data || []).filter(g => g.quantidade > 0).length === 0 ? <p style={e.muted}>As regras de recuperação não encontraram nada parado agora.</p> : (op.data || []).filter(g => g.quantidade > 0).map(g => (
            <div key={g.tipo} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderTop: `1px solid ${cor.border}`, padding: "8px 0" }}>
              <span style={{ color: cor.text, fontSize: 13 }}>{g.nome} <span style={e.muted}>({g.quantidade})</span></span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ color: cor.text, fontSize: 13 }}>{brl(g.valor_potencial)}</b><Selo tipo={g.tipo_metrica} /></span>
            </div>
          ))}
        </div>
        <div style={e.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><h3 style={e.h3}>Conversão por canal</h3><button style={e.ghost} onClick={() => ir("analises-roi")}>Análises</button></div>
          {data.canais.length === 0 ? <p style={e.muted}>Sem leads no período.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={e.th}>Canal</th><th style={e.th}>Leads</th><th style={e.th}>Clientes</th><th style={e.th}>Conv.</th><th style={e.th}>Receita</th></tr></thead>
              <tbody>{data.canais.map(c => <tr key={c.canal}><td style={e.td}>{c.canal}</td><td style={e.td}>{int(c.leads)}</td><td style={e.td}>{int(c.clientes)}</td><td style={e.td}>{pct(c.taxa_conversao_pct)}</td><td style={e.td}>{brl(c.receita)}</td></tr>)}</tbody>
            </table>
          )}
          <div style={{ marginTop: 10 }}><Selo tipo="observado" /></div>
        </div>
      </div>
      <p style={{ ...e.muted, marginTop: 14 }}>Tarefas: {data.tarefas.abertas} abertas · {data.tarefas.aguardando_aprovacao} aguardando aprovação · {data.tarefas.atrasadas} atrasadas. <button onClick={() => ir("tarefas")} style={{ background: "none", border: "none", color: cor.accent, cursor: "pointer", padding: 0, fontSize: 12.5 }}>Abrir tarefas</button></p>
    </div>
  );
}
