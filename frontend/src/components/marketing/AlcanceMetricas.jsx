import { useState } from "react";
import api, { API_PUBLIC_URL } from "../../api";
import { estilos, useGet, Carregando, ErroBox, Vazio, Selo, Modal, brl, int, pct, dataBR, hojeISO, erroDe } from "./ui";

const copiar = (txt, avisar) => navigator.clipboard.writeText(txt).then(() => avisar({ tipo: "sucesso", texto: "Copiado." })).catch(() => avisar({ tipo: "erro", texto: "Não foi possível copiar." }));

function Links({ cor, e, avisar, campanhas }) {
  const { data, erro, carregando, recarregar } = useGet("/marketing/links");
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ nome: "", destino: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", campaign_id: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const criar = async () => {
    try {
      await api.post("/marketing/links", { ...f, campaign_id: f.campaign_id || undefined });
      setAberto(false); setF({ nome: "", destino: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", campaign_id: "" });
      avisar({ tipo: "sucesso", texto: "Link criado." }); recarregar();
    } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); }
  };
  const alternar = async l => { try { await api.put(`/marketing/links/${l.id}`, { ativo: !l.ativo }); recarregar(); } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); } };
  const excluir = async l => { if (!window.confirm(`Excluir o link "${l.nome}"? Os cliques registrados dele também serão apagados.`)) return; try { await api.delete(`/marketing/links/${l.id}`); recarregar(); } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); } };

  return (
    <div style={{ ...e.card, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h3 style={e.h3}>Links rastreáveis (UTM)</h3><button style={e.btn} onClick={() => setAberto(true)}>+ Novo link</button>
      </div>
      <p style={{ ...e.muted, margin: "0 0 12px" }}>O link curto registra cada clique e leva o visitante ao destino com UTM. O lead que preencher o formulário depois herda a campanha e a origem. <Selo tipo="observado" /></p>
      {carregando ? <Carregando cor={cor} /> : erro ? <ErroBox cor={cor} texto={erro} /> : data.length === 0 ? <Vazio cor={cor} titulo="Nenhum link criado" texto="Crie um link por canal (Instagram, Google, e-mail…) para saber o que realmente traz clientes." /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={e.th}>Link</th><th style={e.th}>Origem / mídia</th><th style={e.th}>Campanha</th><th style={e.th}>Cliques</th><th style={e.th}>Leads</th><th style={e.th}></th></tr></thead>
            <tbody>{data.map(l => (
              <tr key={l.id}>
                <td style={e.td}><b>{l.nome}</b>{!l.ativo && <span style={{ color: "#f87171", fontSize: 11, marginLeft: 6 }}>desativado</span>}<br /><span style={{ ...e.muted, fontSize: 11.5 }}>{API_PUBLIC_URL}/marketing/r/{l.slug}</span></td>
                <td style={e.td}>{l.utm_source}{l.utm_medium ? ` / ${l.utm_medium}` : ""}</td>
                <td style={e.td}>{l.campanha_nome || "—"}</td>
                <td style={e.td}>{int(l.cliques)} <span style={e.muted}>({int(l.cliques_7d)} em 7d)</span></td>
                <td style={e.td}>{int(l.leads)}</td>
                <td style={{ ...e.td, whiteSpace: "nowrap" }}>
                  <button style={e.ghost} onClick={() => copiar(`${API_PUBLIC_URL}/marketing/r/${l.slug}`, avisar)}>Copiar</button>{" "}
                  <button style={e.ghost} onClick={() => alternar(l)}>{l.ativo ? "Desativar" : "Ativar"}</button>{" "}
                  <button style={{ ...e.ghost, color: "#f87171" }} onClick={() => excluir(l)}>Excluir</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {aberto && (
        <Modal cor={cor} titulo="Novo link rastreável" onClose={() => setAberto(false)}>
          <div style={{ display: "grid", gap: 10 }}>
            <div><label style={e.label}>Nome do link *</label><input style={e.input} value={f.nome} onChange={ev => set("nome", ev.target.value)} placeholder="Ex: Instagram – promoção de outubro" /></div>
            <div><label style={e.label}>Endereço de destino * (https://…)</label><input style={e.input} value={f.destino} onChange={ev => set("destino", ev.target.value)} placeholder="https://sualoja.com.br/oferta" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={e.label}>utm_source * (origem)</label><input style={e.input} value={f.utm_source} onChange={ev => set("utm_source", ev.target.value)} placeholder="instagram" /></div>
              <div><label style={e.label}>utm_medium (mídia)</label><input style={e.input} value={f.utm_medium} onChange={ev => set("utm_medium", ev.target.value)} placeholder="cpc, email, social…" /></div>
              <div><label style={e.label}>utm_campaign</label><input style={e.input} value={f.utm_campaign} onChange={ev => set("utm_campaign", ev.target.value)} /></div>
              <div><label style={e.label}>utm_content</label><input style={e.input} value={f.utm_content} onChange={ev => set("utm_content", ev.target.value)} /></div>
            </div>
            <div><label style={e.label}>Campanha</label>
              <select style={e.input} value={f.campaign_id} onChange={ev => set("campaign_id", ev.target.value)}><option value="">Sem campanha</option>{campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            <button style={e.btn} onClick={criar}>Criar link</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Formularios({ cor, e, avisar, campanhas }) {
  const { data, erro, carregando, recarregar } = useGet("/marketing/forms");
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ nome: "", origem_padrao: "", canal_padrao: "", campaign_id: "", telefone: true, empresa: false, interesse: false });
  const criar = async () => {
    const campos = [{ nome: "nome", obrigatorio: true }, { nome: "email", obrigatorio: true }];
    if (f.telefone) campos.push({ nome: "telefone" });
    if (f.empresa) campos.push({ nome: "empresa" });
    if (f.interesse) campos.push({ nome: "interesse" });
    try {
      await api.post("/marketing/forms", { nome: f.nome, campos, origem_padrao: f.origem_padrao || undefined, canal_padrao: f.canal_padrao || undefined, campaign_id: f.campaign_id || undefined });
      setAberto(false); avisar({ tipo: "sucesso", texto: "Formulário criado." }); recarregar();
    } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); }
  };
  const alternar = async x => { try { await api.put(`/marketing/forms/${x.id}`, { ativo: !x.ativo }); recarregar(); } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); } };
  return (
    <div style={{ ...e.card, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h3 style={e.h3}>Formulários de captação</h3><button style={e.btn} onClick={() => setAberto(true)}>+ Novo formulário</button>
      </div>
      <p style={{ ...e.muted, margin: "0 0 12px" }}>Use o endereço do formulário no seu site ou em uma landing page (aba Landing Pages). Duplicados por e-mail ou telefone não são criados.</p>
      {carregando ? <Carregando cor={cor} /> : erro ? <ErroBox cor={cor} texto={erro} /> : data.length === 0 ? <Vazio cor={cor} titulo="Nenhum formulário" /> : data.map(x => (
        <div key={x.id} style={{ borderTop: `1px solid ${cor.border}`, padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div><b style={{ color: cor.text, fontSize: 13.5 }}>{x.nome}</b>{!x.ativo && <span style={{ color: "#f87171", fontSize: 11, marginLeft: 6 }}>inativo</span>}
            <p style={{ ...e.muted, margin: "2px 0 0", fontSize: 11.5, wordBreak: "break-all" }}>POST {API_PUBLIC_URL}/marketing/forms/public/{x.token}</p></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={e.muted}>{int(x.total_submissoes)} envio(s)</span>
            <button style={e.ghost} onClick={() => copiar(`${API_PUBLIC_URL}/marketing/forms/public/${x.token}`, avisar)}>Copiar endereço</button>
            <button style={e.ghost} onClick={() => alternar(x)}>{x.ativo ? "Desativar" : "Ativar"}</button></div>
        </div>
      ))}
      {aberto && (
        <Modal cor={cor} titulo="Novo formulário" onClose={() => setAberto(false)}>
          <div style={{ display: "grid", gap: 10 }}>
            <div><label style={e.label}>Nome *</label><input style={e.input} value={f.nome} onChange={ev => setF(p => ({ ...p, nome: ev.target.value }))} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={e.label}>Origem padrão</label><input style={e.input} value={f.origem_padrao} onChange={ev => setF(p => ({ ...p, origem_padrao: ev.target.value }))} placeholder="site" /></div>
              <div><label style={e.label}>Canal padrão</label><input style={e.input} value={f.canal_padrao} onChange={ev => setF(p => ({ ...p, canal_padrao: ev.target.value }))} placeholder="landing page" /></div>
            </div>
            <div><label style={e.label}>Campanha</label><select style={e.input} value={f.campaign_id} onChange={ev => setF(p => ({ ...p, campaign_id: ev.target.value }))}><option value="">Sem campanha</option>{campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            <div style={{ color: cor.text, fontSize: 13 }}>Campos: nome e e-mail (obrigatórios)
              {[["telefone", "telefone"], ["empresa", "empresa"], ["interesse", "interesse"]].map(([k, r]) => <label key={k} style={{ marginLeft: 14 }}><input type="checkbox" checked={f[k]} onChange={ev => setF(p => ({ ...p, [k]: ev.target.checked }))} /> {r}</label>)}</div>
            <button style={e.btn} onClick={criar}>Criar formulário</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Fontes({ cor, e, filtros }) {
  const { data, erro, carregando } = useGet("/marketing/analise/canais", { dias: filtros.dias, ...(filtros.campaignId ? { campaign_id: filtros.campaignId } : {}) });
  return (
    <div style={{ ...e.card, marginBottom: 16 }}>
      <h3 style={{ ...e.h3, marginBottom: 6 }}>Fontes de leads</h3>
      <p style={{ ...e.muted, margin: "0 0 12px" }}>Canal ou origem informado em cada lead, no período selecionado. <Selo tipo="observado" /></p>
      {carregando ? <Carregando cor={cor} /> : erro ? <ErroBox cor={cor} texto={erro} /> : data.canais.length === 0 ? <Vazio cor={cor} titulo="Nenhum lead no período" /> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={e.th}>Canal / origem</th><th style={e.th}>Leads</th><th style={e.th}>Clientes</th><th style={e.th}>Conversão</th><th style={e.th}>Receita</th></tr></thead>
          <tbody>{data.canais.map(c => <tr key={c.canal}><td style={e.td}>{c.canal}</td><td style={e.td}>{int(c.leads)}</td><td style={e.td}>{int(c.clientes)}</td><td style={e.td}>{pct(c.taxa_conversao_pct)}</td><td style={e.td}>{brl(c.receita)}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

function Investimento({ cor, e, avisar, campanhas }) {
  const { data, erro, carregando, recarregar } = useGet("/marketing/investimentos", { dias: 90 });
  const [f, setF] = useState({ valor: "", data: hojeISO(), campaign_id: "", canal: "", observacao: "" });
  const registrar = async () => {
    try {
      await api.post("/marketing/investimentos", { valor: Number(String(f.valor).replace(",", ".")), data: f.data, campaign_id: f.campaign_id || undefined, canal: f.canal || undefined, observacao: f.observacao || undefined });
      setF(p => ({ ...p, valor: "", observacao: "" })); avisar({ tipo: "sucesso", texto: "Investimento registrado." }); recarregar();
    } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); }
  };
  const excluir = async i => { if (!window.confirm("Excluir este lançamento?")) return; try { await api.delete(`/marketing/investimentos/${i.id}`); recarregar(); } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); } };
  return (
    <div style={e.card}>
      <h3 style={{ ...e.h3, marginBottom: 6 }}>Investimento em marketing</h3>
      <p style={{ ...e.muted, margin: "0 0 12px" }}>É a base do CAC, custo por lead, ROAS e ROI. Lance aqui o que foi gasto (o sistema não importa gastos de anúncios sozinho). <Selo tipo="informado" /></p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
        <div><label style={e.label}>Valor (R$) *</label><input style={e.input} inputMode="decimal" value={f.valor} onChange={ev => setF(p => ({ ...p, valor: ev.target.value }))} /></div>
        <div><label style={e.label}>Data *</label><input style={e.input} type="date" value={f.data} onChange={ev => setF(p => ({ ...p, data: ev.target.value }))} /></div>
        <div><label style={e.label}>Campanha</label><select style={e.input} value={f.campaign_id} onChange={ev => setF(p => ({ ...p, campaign_id: ev.target.value }))}><option value="">Geral</option>{campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div><label style={e.label}>Canal</label><input style={e.input} value={f.canal} onChange={ev => setF(p => ({ ...p, canal: ev.target.value }))} placeholder="instagram" /></div>
        <div style={{ display: "flex", alignItems: "flex-end" }}><button style={{ ...e.btn, width: "100%" }} onClick={registrar}>Registrar</button></div>
      </div>
      {carregando ? <Carregando cor={cor} /> : erro ? <ErroBox cor={cor} texto={erro} /> : data.itens.length === 0 ? <Vazio cor={cor} titulo="Nenhum investimento nos últimos 90 dias" texto="Sem isso, CAC, ROAS e ROI ficam indisponíveis." /> : (
        <>
          <p style={{ color: cor.text, fontSize: 13.5, margin: "0 0 8px" }}>Total (90 dias): <b>{brl(data.total)}</b></p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={e.th}>Data</th><th style={e.th}>Valor</th><th style={e.th}>Campanha</th><th style={e.th}>Canal</th><th style={e.th}></th></tr></thead>
            <tbody>{data.itens.map(i => <tr key={i.id}><td style={e.td}>{dataBR(i.data)}</td><td style={e.td}>{brl(i.valor)}</td><td style={e.td}>{i.campanha_nome || "Geral"}</td><td style={e.td}>{i.canal || "—"}</td><td style={e.td}><button style={{ ...e.ghost, color: "#f87171" }} onClick={() => excluir(i)}>Excluir</button></td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default function AlcanceMetricas({ cor, filtros, avisar, campanhas }) {
  const e = estilos(cor);
  return (
    <div>
      <div style={{ ...e.card, marginBottom: 16, borderColor: `${cor.accent}55` }}>
        <p style={{ color: cor.text, fontSize: 13, margin: 0 }}>Esta tela mostra apenas dados reais captados pelo sistema. <b>Mapa por estado/cidade e acessos de site não existem aqui</b>: o cadastro de clientes não guarda localização e não há rastreamento de visitas do site além dos cliques nos links e envios de formulário.</p>
      </div>
      <Links cor={cor} e={e} avisar={avisar} campanhas={campanhas} />
      <Formularios cor={cor} e={e} avisar={avisar} campanhas={campanhas} />
      <Fontes cor={cor} e={e} filtros={filtros} />
      <Investimento cor={cor} e={e} avisar={avisar} campanhas={campanhas} />
    </div>
  );
}
