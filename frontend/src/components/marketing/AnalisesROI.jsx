import { useState } from "react";
import api from "../../api";
import { useGet, estilos, brl, int, pct, vezes, erroDe, Carregando, ErroBox, Vazio, Selo } from "./ui";

function Metrica({ cor, rotulo, valor, tipo, nota }) {
  const e = estilos(cor);
  return (
    <div style={{ background: cor.cardHover, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 12 }}>
      <div style={{ ...e.muted, display: "flex", justifyContent: "space-between", gap: 6 }}><span>{rotulo}</span>{tipo && <Selo tipo={tipo} />}</div>
      <div style={{ color: cor.text, fontSize: 20, fontWeight: 700, marginTop: 4 }}>{valor}</div>
      {nota && <div style={{ ...e.muted, fontSize: 11.5, marginTop: 2 }}>{nota}</div>}
    </div>
  );
}

function Desempenho({ cor, id, dias }) {
  const e = estilos(cor);
  const { data: d, erro, carregando } = useGet(`/marketing/campanhas/${id}/desempenho`, { dias });
  if (carregando) return <Carregando cor={cor} />;
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  const semInv = !d.investimento;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <Metrica cor={cor} rotulo="Leads" valor={int(d.leads)} tipo="observado" />
        <Metrica cor={cor} rotulo="Clientes" valor={int(d.clientes)} tipo="observado" />
        <Metrica cor={cor} rotulo="Investimento" valor={brl(d.investimento)} tipo="informado" nota={semInv ? "Nenhum investimento lançado" : undefined} />
        <Metrica cor={cor} rotulo="Receita atribuída" valor={brl(d.receita_atribuida)} tipo="atribuido" />
        <Metrica cor={cor} rotulo="Custo por lead" valor={brl(d.custo_por_lead)} tipo="calculado" nota={d.custo_por_lead === null ? "Precisa de investimento e leads" : undefined} />
        <Metrica cor={cor} rotulo="Custo por cliente" valor={brl(d.custo_por_cliente)} tipo="calculado" nota={d.custo_por_cliente === null ? "Precisa de investimento e clientes" : undefined} />
        <Metrica cor={cor} rotulo="ROAS" valor={vezes(d.roas)} tipo="calculado" nota={d.roas === null ? "Precisa de investimento" : undefined} />
        <Metrica cor={cor} rotulo="ROI" valor={pct(d.roi_pct)} tipo="calculado" nota={d.roi_pct === null ? "Precisa de investimento" : undefined} />
      </div>
      <p style={{ ...e.muted, marginBottom: 0 }}>
        Envios de formulário: {int(d.envios_de_formulario)} · cliques rastreados: {int(d.cliques_rastreados)} · lançamentos de investimento: {int(d.lancamentos_de_investimento)}.
        <br />Regra de atribuição: {d.regra_atribuicao}
      </p>
    </div>
  );
}

function Canais({ cor, dias, campaignId }) {
  const e = estilos(cor);
  const { data, erro, carregando } = useGet("/marketing/analise/canais", { dias, campaign_id: campaignId || undefined });
  if (carregando) return <Carregando cor={cor} />;
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  if (!data.canais.length) return <Vazio cor={cor} titulo="Sem leads no período" texto="Nenhum lead captado no período selecionado." />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={e.th}>Canal</th><th style={e.th}>Leads</th><th style={e.th}>Clientes</th><th style={e.th}>Conversão</th><th style={e.th}>Receita atribuída</th></tr></thead>
        <tbody>{data.canais.map(c => (
          <tr key={c.canal}><td style={e.td}>{c.canal}</td><td style={e.td}>{int(c.leads)}</td><td style={e.td}>{int(c.clientes)}</td><td style={e.td}>{pct(c.taxa_conversao_pct)}</td><td style={e.td}>{brl(c.receita)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Planejamento({ cor, avisar }) {
  const e = estilos(cor);
  const [f, setF] = useState({ meta_clientes: "", prazo_dias: 90, orcamento: "" });
  const [res, setRes] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const calcular = async () => {
    setCarregando(true);
    try { setRes((await api.post("/marketing/aria/planejar-aquisicao", { meta_clientes: Number(f.meta_clientes), prazo_dias: Number(f.prazo_dias), orcamento: f.orcamento === "" ? null : Number(f.orcamento) })).data); }
    catch (err) { avisar("erro", erroDe(err)); } finally { setCarregando(false); }
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div><label style={e.label}>Meta de clientes</label><input type="number" style={e.input} value={f.meta_clientes} onChange={x => setF({ ...f, meta_clientes: x.target.value })} /></div>
        <div><label style={e.label}>Prazo (dias)</label><input type="number" style={e.input} value={f.prazo_dias} onChange={x => setF({ ...f, prazo_dias: x.target.value })} /></div>
        <div><label style={e.label}>Orçamento (opcional, R$)</label><input type="number" style={e.input} value={f.orcamento} onChange={x => setF({ ...f, orcamento: x.target.value })} /></div>
      </div>
      <button style={{ ...e.btn, marginTop: 12 }} disabled={carregando || !f.meta_clientes} onClick={calcular}>{carregando ? "Calculando…" : "Calcular"}</button>
      {res && (
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 8 }}><Selo tipo="estimado" /> <span style={e.muted}>{res.aviso}</span></div>
          {!res.dados_suficientes ? (
            <div style={{ color: cor.text, fontSize: 13.5 }}>
              <b>Dados insuficientes para estimar.</b>
              <ul>{res.faltas.map(x => <li key={x}>{x}</li>)}</ul>
              <p style={e.muted}>Próximos passos:</p>
              <ul>{res.proximos_passos.map(x => <li key={x} style={e.muted}>{x}</li>)}</ul>
            </div>
          ) : (
            <>
              <p style={{ ...e.muted, margin: "0 0 8px" }}>Conversão histórica: {pct(res.taxa_historica_pct)} · custo por lead: {brl(res.custo_por_lead_historico)}</p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={e.th}>Cenário</th><th style={e.th}>Conversão</th><th style={e.th}>Leads necessários</th><th style={e.th}>Por semana</th><th style={e.th}>Custo estimado</th></tr></thead>
                <tbody>{res.cenarios.map(c => (
                  <tr key={c.nome}><td style={e.td}>{c.nome}</td><td style={e.td}>{pct(c.taxa_conversao_pct)}</td><td style={e.td}>{int(c.leads_necessarios)}</td><td style={e.td}>{int(c.leads_por_semana)}</td><td style={e.td}>{brl(c.custo_estimado)}</td></tr>
                ))}</tbody>
              </table>
              {res.distribuicao_orcamento && (
                <div style={{ marginTop: 10, color: cor.text, fontSize: 13 }}>
                  <b>Distribuição sugerida do orçamento</b> <span style={e.muted}>— {res.distribuicao_orcamento.nota}</span>
                  {res.distribuicao_orcamento.canais.map(c => <div key={c.canal}>{c.canal}: {brl(c.valor)} <span style={e.muted}>({c.criterio})</span></div>)}
                  <div>Reserva para experimentos: {brl(res.distribuicao_orcamento.reserva_para_experimentos)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TestesAB({ cor }) {
  const e = estilos(cor);
  const { data, erro, carregando } = useGet("/marketing/ab-tests");
  const [sel, setSel] = useState(null);
  const res = useGet(sel ? `/marketing/ab-tests/${sel}/resultados` : "/marketing/ab-tests", {}, !!sel);
  if (carregando) return <Carregando cor={cor} />;
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  if (!data?.length) return <Vazio cor={cor} titulo="Nenhum teste A/B" texto="Os testes A/B comparam automações (variantes) aplicadas a públicos. Não existe teste A/B de landing pages." />;
  return (
    <div>
      <p style={{ ...e.muted, marginTop: 0 }}>Cada variante é uma automação. Teste de landing pages não existe nesta versão.</p>
      {data.map(t => (
        <div key={t.id} style={{ borderTop: `1px solid ${cor.border}`, padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: cor.text, fontSize: 14 }}><b>{t.nome}</b> <span style={e.muted}>· {t.status} · {t.total_variantes} variantes · {t.total_leads} leads</span></span>
            <button style={e.ghost} onClick={() => setSel(sel === t.id ? null : t.id)}>{sel === t.id ? "Ocultar" : "Resultados"}</button>
          </div>
          {sel === t.id && (res.carregando ? <Carregando cor={cor} /> : res.erro ? <ErroBox cor={cor} texto={res.erro} /> : res.data?.variantes && (
            <div style={{ marginTop: 8 }}>
              {res.data.variantes.map(v => <div key={v.id} style={{ color: cor.text, fontSize: 13 }}>{v.nome}: {v.conversoes}/{v.leads_atribuidos} ({pct(v.taxa_conversao)})</div>)}
              <p style={{ ...e.muted, marginBottom: 0 }}>{res.data.analise.mensagem}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AnalisesROI({ cor, filtros, avisar, campanhas }) {
  const e = estilos(cor);
  const [campId, setCampId] = useState("");
  const idEfetivo = campId || (filtros.campaignId ? String(filtros.campaignId) : "");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={e.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={e.h3}>Desempenho por campanha — últimos {filtros.dias} dias</h3>
          <select style={{ ...e.input, width: 260 }} value={idEfetivo} onChange={x => setCampId(x.target.value)}>
            <option value="">Selecione uma campanha…</option>
            {(campanhas || []).map(c => <option key={c.id} value={c.id}>{c.nome} ({c.status})</option>)}
          </select>
        </div>
        {idEfetivo ? <Desempenho cor={cor} id={idEfetivo} dias={filtros.dias} /> : <Vazio cor={cor} titulo="Escolha uma campanha" texto="Os indicadores mostram de onde vem cada número e o que falta quando não há dados." />}
      </div>
      <div style={e.card}><h3 style={{ ...e.h3, marginBottom: 12 }}>Conversão por canal</h3><Canais cor={cor} dias={filtros.dias} campaignId={idEfetivo} /></div>
      <div style={e.card}><h3 style={{ ...e.h3, marginBottom: 12 }}>Planejamento de aquisição (estimativa)</h3><Planejamento cor={cor} avisar={avisar} /></div>
      <div style={e.card}><h3 style={{ ...e.h3, marginBottom: 12 }}>Testes A/B</h3><TestesAB cor={cor} /></div>
    </div>
  );
}
