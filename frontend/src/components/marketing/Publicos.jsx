import { useState } from "react";
import api from "../../api";
import { useGet, estilos, int, dataBR, erroDe, Carregando, ErroBox, Vazio, Modal } from "./ui";

function NovoSegmento({ cor, onClose, onOk, avisar }) {
  const e = estilos(cor);
  const { data: cat } = useGet("/marketing/segments/campos");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("dinamico");
  const [base, setBase] = useState("leads");
  const [criterios, setCriterios] = useState([]);
  const [previa, setPrevia] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const campos = cat?.bases?.[base] || [];
  const set = (i, k, v) => { setCriterios(l => l.map((x, j) => (j === i ? { ...x, [k]: v } : x))); setPrevia(null); };
  const corpo = () => ({ nome, descricao, tipo, base, criterios });
  const ver = async () => {
    try { const r = await api.post("/marketing/segments/previa", { base, criterios }); setPrevia(r.data); }
    catch (err) { avisar("erro", erroDe(err)); }
  };
  const salvar = async () => {
    setSalvando(true);
    try { await api.post("/marketing/segments", corpo()); avisar("sucesso", "Público criado."); onOk(); }
    catch (err) { avisar("erro", erroDe(err)); } finally { setSalvando(false); }
  };
  return (
    <Modal cor={cor} titulo="Novo público" onClose={onClose} largura={680}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label style={e.label}>Nome</label><input style={e.input} value={nome} onChange={x => setNome(x.target.value)} /></div>
        <div><label style={e.label}>Base</label>
          <select style={e.input} value={base} onChange={x => { setBase(x.target.value); setCriterios([]); setPrevia(null); }}><option value="leads">Leads</option><option value="clientes">Clientes</option></select></div>
        <div><label style={e.label}>Tipo</label>
          <select style={e.input} value={tipo} onChange={x => setTipo(x.target.value)}><option value="dinamico">Dinâmico (regras, recalculado)</option><option value="estatico">Estático (lista manual)</option></select></div>
        <div><label style={e.label}>Descrição</label><input style={e.input} value={descricao} onChange={x => setDescricao(x.target.value)} /></div>
      </div>
      {tipo === "dinamico" && (
        <div style={{ marginTop: 14 }}>
          <p style={e.muted}>Critérios (todos precisam ser verdadeiros)</p>
          {criterios.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <select style={e.input} value={c.campo} onChange={x => set(i, "campo", x.target.value)}>
                <option value="">Campo…</option>{campos.map(f => <option key={f.campo} value={f.campo}>{f.rotulo}</option>)}
              </select>
              <select style={e.input} value={c.operador} onChange={x => set(i, "operador", x.target.value)}>
                <option value="">Operador…</option>{(cat?.operadores || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input style={e.input} placeholder="Valor" value={c.valor ?? ""} onChange={x => set(i, "valor", x.target.value)} />
              <button style={e.ghost} onClick={() => { setCriterios(l => l.filter((_, j) => j !== i)); setPrevia(null); }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={e.ghost} onClick={() => setCriterios(l => [...l, { campo: "", operador: "", valor: "" }])}>+ Critério</button>
            <button style={e.ghost} disabled={!criterios.length} onClick={ver}>Ver prévia</button>
            {previa && <span style={{ color: cor.text, fontSize: 13 }}>{int(previa.total)} {base === "clientes" ? "clientes" : "leads"} se encaixam</span>}
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button style={e.btn} disabled={salvando || !nome.trim() || (tipo === "dinamico" && !criterios.length)} onClick={salvar}>{salvando ? "Salvando…" : "Criar público"}</button>
      </div>
    </Modal>
  );
}

function Membros({ cor, seg, onClose }) {
  const e = estilos(cor);
  const { data, erro, carregando } = useGet(`/marketing/segments/${seg.id}/membros`);
  return (
    <Modal cor={cor} titulo={`Membros — ${seg.nome}`} onClose={onClose} largura={640}>
      {carregando ? <Carregando cor={cor} /> : erro ? <ErroBox cor={cor} texto={erro} /> :
        !data?.length ? <Vazio cor={cor} titulo="Sem membros" /> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={e.th}>Nome</th><th style={e.th}>Status</th><th style={e.th}>Score</th></tr></thead>
            <tbody>{data.slice(0, 200).map((m, i) => (
              <tr key={i}><td style={e.td}>{m.nome || m.lead_nome || m.customer_nome || "—"}</td><td style={e.td}>{m.status || "cliente"}</td><td style={e.td}>{m.score ?? "—"}</td></tr>
            ))}</tbody>
          </table>
        )}
    </Modal>
  );
}

export default function Publicos({ cor, avisar }) {
  const e = estilos(cor);
  const { data, erro, carregando, recarregar } = useGet("/marketing/segments");
  const [novo, setNovo] = useState(false);
  const [ver, setVer] = useState(null);
  const acao = async (fn, ok) => { try { await fn(); avisar("sucesso", ok); recarregar(); } catch (err) { avisar("erro", erroDe(err)); } };
  if (carregando) return <Carregando cor={cor} />;
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  return (
    <div style={e.card}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={e.h3}>Públicos</h3><button style={e.btn} onClick={() => setNovo(true)}>+ Novo público</button>
      </div>
      {!data?.length ? <Vazio cor={cor} titulo="Nenhum público" texto="Crie públicos por regras (dinâmicos) ou listas manuais." /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={e.th}>Nome</th><th style={e.th}>Tipo</th><th style={e.th}>Base</th><th style={e.th}>Membros</th><th style={e.th}>Atualizado</th><th style={e.th} /></tr></thead>
            <tbody>{data.map(s => (
              <tr key={s.id}>
                <td style={e.td}>{s.nome}{s.descricao && <div style={e.muted}>{s.descricao}</div>}</td>
                <td style={e.td}>{s.tipo}</td><td style={e.td}>{s.base}</td>
                <td style={e.td}>{int(s.total_membros ?? s.membros ?? 0)}</td>
                <td style={e.td}>{dataBR(s.ultimo_calculo || s.updated_at || s.created_at)}</td>
                <td style={{ ...e.td, whiteSpace: "nowrap" }}>
                  <button style={e.ghost} onClick={() => setVer(s)}>Membros</button>{" "}
                  {s.tipo === "dinamico" && <button style={e.ghost} onClick={() => acao(() => api.post(`/marketing/segments/${s.id}/recalcular`), "Público recalculado.")}>Recalcular</button>}{" "}
                  <button style={{ ...e.ghost, color: "#f87171" }} onClick={() => window.confirm("Excluir este público?") && acao(() => api.delete(`/marketing/segments/${s.id}`), "Público excluído.")}>Excluir</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {novo && <NovoSegmento cor={cor} avisar={avisar} onClose={() => setNovo(false)} onOk={() => { setNovo(false); recarregar(); }} />}
      {ver && <Membros cor={cor} seg={ver} onClose={() => setVer(null)} />}
    </div>
  );
}
