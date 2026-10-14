import { useState } from "react";
import api from "../../api";
import { useGet, estilos, erroDe, Carregando, ErroBox, Vazio } from "./ui";

export default function LeadScoring({ cor, avisar }) {
  const e = estilos(cor);
  const { data, erro, carregando, recarregar } = useGet("/marketing/scoring/regras");
  const [tipo, setTipo] = useState("evento");
  const [f, setF] = useState({ event_type: "", campo: "", operador: "", valor: "", pontos: 10, descricao: "" });
  const agir = async (fn, ok) => { try { await fn(); if (ok) avisar("sucesso", ok); recarregar(); } catch (err) { avisar("erro", erroDe(err)); } };
  if (carregando) return <Carregando cor={cor} />;
  if (erro) return <ErroBox cor={cor} texto={erro} />;
  const lim = data.limites_temperatura;
  const semValor = ["preenchido", "vazio"].includes(f.operador);
  const criar = () => agir(async () => {
    const corpo = tipo === "evento"
      ? { tipo, event_type: f.event_type, pontos: Number(f.pontos), descricao: f.descricao || undefined }
      : { tipo, campo: f.campo, operador: f.operador, valor: semValor ? undefined : f.valor, pontos: Number(f.pontos), descricao: f.descricao || undefined };
    await api.post("/marketing/scoring/regras", corpo);
    setF({ event_type: "", campo: "", operador: "", valor: "", pontos: 10, descricao: "" });
  }, "Regra criada.");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={e.card}>
        <h3 style={{ ...e.h3, marginBottom: 6 }}>Regras de pontuação</h3>
        <p style={{ ...e.muted, marginTop: 0 }}>O score do lead é a soma das regras. Temperatura: quente a partir de {lim.quente} pontos, morna a partir de {lim.morno}. Regras de evento pontuam quando algo acontece com o lead; regras de atributo avaliam os dados do lead.</p>
        {!data.regras.length ? <Vazio cor={cor} titulo="Sem regras" /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={e.th}>Regra</th><th style={e.th}>Pontos</th><th style={e.th}>Ativa</th><th style={e.th} /></tr></thead>
              <tbody>{data.regras.map(r => (
                <tr key={r.id}>
                  <td style={e.td}>{r.tipo === "atributo" ? `${r.campo} ${r.operador} ${r.valor ?? ""}` : r.event_type}{r.descricao && <div style={e.muted}>{r.descricao}</div>}</td>
                  <td style={e.td}><input type="number" defaultValue={r.pontos} style={{ ...e.input, width: 80 }} onBlur={x => Number(x.target.value) !== r.pontos && agir(() => api.put(`/marketing/scoring/regras/${r.id}`, { pontos: Number(x.target.value) }))} /></td>
                  <td style={e.td}><input type="checkbox" checked={!!r.ativa} onChange={x => agir(() => api.put(`/marketing/scoring/regras/${r.id}`, { ativa: x.target.checked }))} /></td>
                  <td style={e.td}><button style={{ ...e.ghost, color: "#f87171" }} onClick={() => window.confirm("Excluir regra?") && agir(() => api.delete(`/marketing/scoring/regras/${r.id}`), "Regra excluída.")}>Excluir</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <div style={e.card}>
        <h3 style={{ ...e.h3, marginBottom: 10 }}>Nova regra</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div><label style={e.label}>Tipo</label><select style={e.input} value={tipo} onChange={x => setTipo(x.target.value)}><option value="evento">Evento</option><option value="atributo">Atributo do lead</option></select></div>
          {tipo === "evento" ? (
            <div><label style={e.label}>Evento (ex: interacao_resposta)</label><input style={e.input} value={f.event_type} onChange={x => setF({ ...f, event_type: x.target.value })} /></div>
          ) : (<>
            <div><label style={e.label}>Campo</label><select style={e.input} value={f.campo} onChange={x => setF({ ...f, campo: x.target.value })}><option value="">…</option>{data.campos_atributo.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={e.label}>Operador</label><select style={e.input} value={f.operador} onChange={x => setF({ ...f, operador: x.target.value })}><option value="">…</option>{data.operadores_atributo.map(c => <option key={c}>{c}</option>)}</select></div>
            {!semValor && <div><label style={e.label}>Valor</label><input style={e.input} value={f.valor} onChange={x => setF({ ...f, valor: x.target.value })} /></div>}
          </>)}
          <div><label style={e.label}>Pontos (-100 a 100)</label><input type="number" style={e.input} value={f.pontos} onChange={x => setF({ ...f, pontos: x.target.value })} /></div>
          <div><label style={e.label}>Descrição</label><input style={e.input} value={f.descricao} onChange={x => setF({ ...f, descricao: x.target.value })} /></div>
        </div>
        <div style={{ marginTop: 12 }}><button style={e.btn} onClick={criar}>Criar regra</button></div>
      </div>
    </div>
  );
}
