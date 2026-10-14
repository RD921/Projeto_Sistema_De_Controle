import { useState } from "react";
import api from "../../api";
import { useGet, estilos, int, brl, erroDe, Carregando, ErroBox, Vazio, Selo } from "./ui";

export default function Recuperacao({ cor, avisar }) {
  const e = estilos(cor);
  const regras = useGet("/marketing/recovery/regras");
  const ops = useGet("/marketing/recovery/oportunidades");
  const [exec, setExec] = useState(false);
  const recarregar = () => { regras.recarregar(); ops.recarregar(); };
  const patch = async (id, dados) => {
    try { await api.put(`/marketing/recovery/regras/${id}`, dados); recarregar(); }
    catch (err) { avisar("erro", erroDe(err)); }
  };
  const executar = async () => {
    setExec(true);
    try {
      const r = (await api.post("/marketing/recovery/executar")).data;
      avisar("sucesso", `Encontrados: ${r.encontrados}. Tarefas criadas: ${r.tarefas_criadas}. Automações disparadas: ${r.eventos_disparados}.`);
      recarregar();
    } catch (err) { avisar("erro", erroDe(err)); } finally { setExec(false); }
  };
  if (regras.carregando || ops.carregando) return <Carregando cor={cor} />;
  if (regras.erro || ops.erro) return <ErroBox cor={cor} texto={regras.erro || ops.erro} />;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={e.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
          <h3 style={e.h3}>Oportunidades encontradas agora</h3>
          <button style={e.btn} disabled={exec} onClick={executar}>{exec ? "Executando…" : "Executar recuperação"}</button>
        </div>
        <p style={{ ...e.muted, marginTop: 0 }}>Cada regra ativa procura casos reais no seu sistema. Executar cria tarefas (sem duplicar as já abertas) e dispara automações, conforme configurado em cada regra.</p>
        {!ops.data?.length ? <Vazio cor={cor} titulo="Nenhuma regra ativa" texto="Ative uma regra abaixo." /> : ops.data.map(g => (
          <div key={g.tipo} style={{ borderTop: `1px solid ${cor.border}`, padding: "12px 0" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ color: cor.text, fontSize: 14 }}>{g.nome}</b><Selo tipo={g.tipo_metrica} />
              <span style={e.muted}>{int(g.quantidade)} caso(s) · {brl(g.valor_potencial)} em jogo</span>
            </div>
            {g.itens?.slice(0, 5).map((i, k) => (
              <div key={k} style={{ ...e.muted, marginTop: 4 }}>• {i.titulo} — {i.motivo}</div>
            ))}
            {g.quantidade > 5 && <div style={{ ...e.muted, marginTop: 4 }}>… e mais {g.quantidade - 5}.</div>}
          </div>
        ))}
      </div>
      <div style={e.card}>
        <h3 style={{ ...e.h3, marginBottom: 10 }}>Regras</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={e.th}>Regra</th><th style={e.th}>Dias</th><th style={e.th}>Ativa</th><th style={e.th}>Criar tarefa</th><th style={e.th}>Disparar automação</th></tr></thead>
            <tbody>{regras.data.map(r => (
              <tr key={r.id}>
                <td style={e.td}>{r.nome}<div style={e.muted}>Ação sugerida: {r.acao}</div></td>
                <td style={e.td}>
                  <input type="number" min="0" defaultValue={r.dias} style={{ ...e.input, width: 80 }}
                    onBlur={x => Number(x.target.value) !== r.dias && patch(r.id, { dias: Number(x.target.value) })} />
                </td>
                {["ativa", "criar_tarefa", "disparar_automacao"].map(k => (
                  <td key={k} style={e.td}><input type="checkbox" checked={!!r[k]} onChange={x => patch(r.id, { [k]: x.target.checked })} /></td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p style={e.muted}>“Disparar automação” emite o evento <code>marketing_oportunidade_recuperacao</code> no motor de automações; a ação (e-mail, tarefa etc.) depende de você ter criado uma automação para esse evento. Não há envio de WhatsApp/SMS no sistema.</p>
      </div>
    </div>
  );
}
