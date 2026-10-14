import { useState } from "react";
import api from "../../api";
import { useGet, estilos, int, pct, erroDe, Carregando, ErroBox, Vazio, Modal, Selo } from "./ui";

function Analise({ cor, id }) {
  const e = estilos(cor);
  const { data, erro, carregando } = useGet(`/marketing/funnels/${id}/analise`);
  if (carregando) return <Carregando cor={cor} />;
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  if (!data) return null;
  const max = Math.max(1, ...data.etapas.map(x => x.alcancaram));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <span style={e.muted}>{int(data.total_leads)} leads no funil</span><Selo tipo="observado" />
      </div>
      {!data.amostra_suficiente && (
        <div style={{ ...e.muted, marginBottom: 12 }}>Poucos leads para apontar gargalo: são necessários pelo menos {data.amostra_minima} (há {data.total_leads}). Os números abaixo são reais, mas ainda não conclusivos.</div>
      )}
      {data.gargalo && (
        <div style={{ background: "#f9731615", border: "1px solid #f9731640", color: "#fb923c", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
          Maior abandono: depois de <b>{data.gargalo.etapa}</b> — {pct(data.gargalo.pct_desistencia)} não avançam ({int(data.gargalo.desistencias)} leads).
        </div>
      )}
      {data.etapas.map(s => (
        <div key={s.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: cor.text }}>
            <span>{s.nome}</span>
            <span>{int(s.alcancaram)} <span style={e.muted}>({pct(s.pct_do_topo)} do topo)</span></span>
          </div>
          <div style={{ height: 8, background: cor.border, borderRadius: 6, overflow: "hidden", margin: "4px 0" }}>
            <div style={{ width: `${(s.alcancaram / max) * 100}%`, height: "100%", background: cor.accent }} />
          </div>
          <div style={e.muted}>
            {s.desistencias !== null && <>Abandono para a próxima etapa: {int(s.desistencias)} ({pct(s.pct_desistencia)}) · </>}
            perdidos aqui: {int(s.perdidos_na_etapa)} · parados aqui: {int(s.parados_na_etapa)}
          </div>
        </div>
      ))}
    </div>
  );
}

function NovoFunil({ cor, onClose, onOk, avisar }) {
  const e = estilos(cor);
  const [nome, setNome] = useState("");
  const [etapas, setEtapas] = useState([{ nome: "", tipo: "etapa" }, { nome: "", tipo: "etapa" }, { nome: "Cliente", tipo: "ganho" }]);
  const [salvando, setSalvando] = useState(false);
  const set = (i, k, v) => setEtapas(l => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const salvar = async () => {
    setSalvando(true);
    try {
      await api.post("/marketing/funnels", { nome, etapas });
      avisar("sucesso", "Funil criado."); onOk();
    } catch (err) { avisar("erro", erroDe(err)); } finally { setSalvando(false); }
  };
  return (
    <Modal cor={cor} titulo="Novo funil" onClose={onClose}>
      <label style={e.label}>Nome do funil</label>
      <input style={e.input} value={nome} onChange={x => setNome(x.target.value)} />
      <p style={{ ...e.muted, margin: "14px 0 6px" }}>Etapas em ordem (2 a 15). No máximo uma de ganho e uma de perdido.</p>
      {etapas.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input style={e.input} placeholder={`Etapa ${i + 1}`} value={s.nome} onChange={x => set(i, "nome", x.target.value)} />
          <select style={{ ...e.input, width: 130 }} value={s.tipo} onChange={x => set(i, "tipo", x.target.value)}>
            <option value="etapa">Andamento</option><option value="ganho">Ganho</option><option value="perdido">Perdido</option>
          </select>
          <button style={e.ghost} onClick={() => setEtapas(l => l.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button style={e.ghost} onClick={() => setEtapas(l => [...l, { nome: "", tipo: "etapa" }])}>+ Etapa</button>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button style={e.btn} disabled={salvando || !nome.trim()} onClick={salvar}>{salvando ? "Salvando…" : "Criar funil"}</button>
      </div>
    </Modal>
  );
}

export default function FunisConversao({ cor, avisar }) {
  const e = estilos(cor);
  const { data, erro, carregando, recarregar } = useGet("/marketing/funnels");
  const [sel, setSel] = useState(null);
  const [novo, setNovo] = useState(false);
  const [novaEtapa, setNovaEtapa] = useState("");
  const [vers, setVers] = useState(0);
  if (carregando) return <Carregando cor={cor} />;
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  const funis = data || [];
  const atual = funis.find(f => f.id === sel) || funis[0];
  const agir = async (fn, ok) => {
    try { await fn(); if (ok) avisar("sucesso", ok); recarregar(); setVers(v => v + 1); }
    catch (err) { avisar("erro", erroDe(err)); }
  };
  const renomearEtapa = s => {
    const nome = window.prompt("Novo nome da etapa", s.nome);
    if (nome && nome.trim()) agir(() => api.put(`/marketing/funnels/etapas/${s.id}`, { nome }), "Etapa renomeada.");
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {funis.map(f => (
            <button key={f.id} onClick={() => setSel(f.id)} style={{ ...e.ghost, ...(atual?.id === f.id ? { borderColor: cor.accent, color: cor.accent } : {}) }}>
              {f.nome}{f.padrao ? " (padrão)" : ""}
            </button>
          ))}
        </div>
        <button style={e.btn} onClick={() => setNovo(true)}>+ Novo funil</button>
      </div>
      {!atual ? <Vazio cor={cor} titulo="Nenhum funil" texto="Crie um funil com as etapas do seu processo." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <div style={e.card}>
            <h3 style={{ ...e.h3, marginBottom: 12 }}>Análise de abandono</h3>
            <Analise key={`${atual.id}-${vers}`} cor={cor} id={atual.id} />
          </div>
          <div style={e.card}>
            <h3 style={{ ...e.h3, marginBottom: 12 }}>Etapas</h3>
            {atual.padrao && <p style={{ ...e.muted, marginTop: 0 }}>O funil padrão está ligado ao status dos leads: só é possível renomear as etapas.</p>}
            {atual.etapas.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${cor.border}` }}>
                <span style={{ color: cor.text, fontSize: 13 }}>{s.ordem}. {s.nome} <span style={e.muted}>({s.tipo})</span></span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button style={e.ghost} onClick={() => renomearEtapa(s)}>Renomear</button>
                  {!atual.padrao && <button style={{ ...e.ghost, color: "#f87171" }} onClick={() => window.confirm("Excluir esta etapa?") && agir(() => api.delete(`/marketing/funnels/etapas/${s.id}`), "Etapa excluída.")}>Excluir</button>}
                </span>
              </div>
            ))}
            {!atual.padrao && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input style={e.input} placeholder="Nova etapa" value={novaEtapa} onChange={x => setNovaEtapa(x.target.value)} />
                <button style={e.btn} disabled={!novaEtapa.trim()} onClick={() => agir(async () => { await api.post(`/marketing/funnels/${atual.id}/etapas`, { nome: novaEtapa }); setNovaEtapa(""); }, "Etapa adicionada.")}>Adicionar</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={e.ghost} onClick={() => {
                const nome = window.prompt("Novo nome do funil", atual.nome);
                if (nome && nome.trim()) agir(() => api.put(`/marketing/funnels/${atual.id}`, { nome }), "Funil renomeado.");
              }}>Renomear funil</button>
              {!atual.padrao && <button style={{ ...e.ghost, color: "#f87171" }} onClick={() => window.confirm("Excluir funil? Os leads voltam ao funil padrão.") && agir(async () => { await api.delete(`/marketing/funnels/${atual.id}`); setSel(null); }, "Funil excluído.")}>Excluir funil</button>}
            </div>
          </div>
        </div>
      )}
      {novo && <NovoFunil cor={cor} avisar={avisar} onClose={() => setNovo(false)} onOk={() => { setNovo(false); recarregar(); }} />}
    </div>
  );
}
