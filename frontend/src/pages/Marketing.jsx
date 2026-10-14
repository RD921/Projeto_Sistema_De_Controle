import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import api from "../api";
import LandingPageEditor from "../components/marketing/LandingPageEditor";
import VisaoGeral from "../components/marketing/VisaoGeral";
import AlcanceMetricas from "../components/marketing/AlcanceMetricas";
import LeadsCampanhas, { FormCampanha } from "../components/marketing/LeadsCampanhas";
import FunisConversao from "../components/marketing/FunisConversao";
import Publicos from "../components/marketing/Publicos";
import Recuperacao from "../components/marketing/Recuperacao";
import AnalisesROI from "../components/marketing/AnalisesROI";
import Tarefas from "../components/marketing/Tarefas";
import LeadScoring from "../components/marketing/LeadScoring";
import { CopyIA, ScriptsIA } from "../components/marketing/CopyScriptsIA";
import { Aviso, Modal, estilos, erroDe, Selo } from "../components/marketing/ui";

const SECOES = {
  "visao-geral": "Visão Geral",
  "alcance-metricas": "Alcance & Métricas",
  "leads-campanhas": "Leads & Campanhas",
  "landing-pages": "Landing Pages",
  "copy-ia": "Copy com IA",
  "lead-scoring": "Lead Scoring",
  "scripts-ia": "Scripts IA",
  funis: "Funis de Conversão",
  publicos: "Públicos",
  automacoes: "Automações",
  recuperacao: "Recuperação de Oportunidades",
  "analises-roi": "Análises & ROI",
  tarefas: "Tarefas",
};

function EstrategiaAria({ cor, onClose, avisar, recarregar }) {
  const e = estilos(cor);
  const [pedido, setPedido] = useState("");
  const [gerando, setGerando] = useState(false);
  const [est, setEst] = useState(null);
  const [aplicando, setAplicando] = useState(false);
  const gerar = async () => {
    setGerando(true);
    try { setEst((await api.post("/marketing/aria/estrategias", { pedido })).data); }
    catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); } finally { setGerando(false); }
  };
  const decidir = async acao => {
    setAplicando(true);
    try {
      const r = (await api.post(`/marketing/aria/estrategias/${est.id}/${acao}`)).data;
      avisar({ tipo: "sucesso", texto: acao === "aplicar" ? `Estratégia aplicada: ${r.tarefas_criadas ?? 0} tarefa(s) criada(s)${r.aguardando_aprovacao ? `, ${r.aguardando_aprovacao} aguardando aprovação` : ""}.` : "Estratégia descartada." });
      recarregar(); onClose();
    } catch (err) { avisar({ tipo: "erro", texto: erroDe(err) }); } finally { setAplicando(false); }
  };
  const p = est?.plano;
  return (
    <Modal cor={cor} titulo="Estratégia com a Aria" onClose={onClose} largura={720}>
      {!est ? (
        <>
          <p style={{ ...e.muted, marginTop: 0 }}>Descreva o objetivo. A Aria monta um plano com base nos dados reais do sistema. Nada é criado até você aplicar.</p>
          <textarea style={{ ...e.input, minHeight: 90 }} value={pedido} onChange={x => setPedido(x.target.value)} placeholder="Ex: Quero conquistar 20 novos clientes nos próximos 60 dias" />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><button style={e.btn} disabled={gerando || pedido.trim().length < 8} onClick={gerar}>{gerando ? "Gerando…" : "Gerar plano"}</button></div>
        </>
      ) : (
        <div style={{ color: cor.text, fontSize: 13.5 }}>
          <div style={{ marginBottom: 8 }}><Selo tipo="estimado" /> <span style={e.muted}>Gerado por {est.origem === "ia" ? "IA" : "regras (sem IA configurada)"}.</span></div>
          <h3 style={{ ...e.h3, marginBottom: 4 }}>{p.titulo}</h3>
          <p style={{ marginTop: 0 }}>{p.resumo}</p>
          {p.lacunas?.length > 0 && <div style={{ background: "#fbbf2415", border: "1px solid #fbbf2440", color: "#fbbf24", borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>Dados que faltam: {p.lacunas.join(" · ")}</div>}
          {p.publico_alvo && <p><b>Público:</b> {p.publico_alvo}</p>}
          {p.diagnostico?.length > 0 && <><b>Diagnóstico</b><ul>{p.diagnostico.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          {p.canais?.length > 0 && <><b>Canais</b><ul>{p.canais.map((c, i) => <li key={i}>{c.canal} — <span style={e.muted}>{c.motivo}</span></li>)}</ul></>}
          <b>Etapas</b>
          {p.etapas.map((s, i) => (
            <div key={i} style={{ margin: "6px 0 10px" }}>
              <div>{i + 1}. {s.titulo} <span style={e.muted}>({s.prazo_dias} dias)</span></div>
              <div style={e.muted}>{s.descricao}</div>
              <ul style={{ margin: "4px 0" }}>{s.tarefas?.map((t, j) => <li key={j}>{t.titulo}{t.externo ? " (fora do sistema)" : ""}</li>)}</ul>
            </div>
          ))}
          {p.metas?.length > 0 && <><b>Metas</b><ul>{p.metas.map((m, i) => <li key={i}>{m.indicador}: {m.meta} em {m.prazo_dias} dias</li>)}</ul></>}
          {p.riscos?.length > 0 && <><b>Riscos</b><ul>{p.riscos.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          <p style={e.muted}>Aplicar cria as tarefas do plano (as que exigem aprovação ficam aguardando).</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={e.ghost} disabled={aplicando} onClick={() => decidir("descartar")}>Descartar</button>
            <button style={e.btn} disabled={aplicando} onClick={() => decidir("aplicar")}>Aplicar plano</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Marketing() {
  const { secao } = useParams();
  const secaoAtiva = SECOES[secao] ? secao : "visao-geral";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cor } = useOutletContext();
  const e = estilos(cor);

  const [aviso, setAviso] = useState(() => {
    if (searchParams.get("conectado") === "google") return { tipo: "sucesso", texto: "Google conectado com sucesso!" };
    if (searchParams.get("erro")) return { tipo: "erro", texto: "Não foi possível conectar ao Google." };
    return null;
  });
  const [dias, setDias] = useState(30);
  const [campaignId, setCampaignId] = useState("");
  const [campanhas, setCampanhas] = useState([]);
  const [versao, setVersao] = useState(0);
  const [modalCampanha, setModalCampanha] = useState(false);
  const [modalAria, setModalAria] = useState(false);

  // Aceita avisar({tipo, texto}) e avisar("sucesso"|"erro", texto)
  const avisar = useCallback((a, b) => setAviso(typeof a === "string" ? { tipo: a, texto: b } : a), []);
  const ir = useCallback(s => navigate(s === "automacoes" ? "/automacoes/minhas" : `/marketing/${s}`), [navigate]);

  const carregarCampanhas = useCallback(() => {
    api.get("/marketing/campaigns").then(r => setCampanhas(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => { carregarCampanhas(); }, [carregarCampanhas, versao]);

  useEffect(() => {
    if (secao === "automacoes") navigate("/automacoes/minhas", { replace: true });
  }, [secao, navigate]);

  useEffect(() => {
    if (searchParams.has("conectado") || searchParams.has("erro")) {
      searchParams.delete("conectado"); searchParams.delete("erro");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  const filtros = { dias, campaignId: campaignId || null };
  const recarregarTudo = () => { setVersao(v => v + 1); carregarCampanhas(); };
  const comFiltro = ["visao-geral", "alcance-metricas", "leads-campanhas", "analises-roi"].includes(secaoAtiva);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>{secaoAtiva === "visao-geral" ? "Central de Marketing" : SECOES[secaoAtiva]}</h1>
          {secaoAtiva === "visao-geral" && <p style={{ ...e.muted, margin: "4px 0 0" }}>Resultados reais do seu negócio, com a origem de cada número.</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {comFiltro && (
            <>
              <select aria-label="Período" style={{ ...e.input, width: 140 }} value={dias} onChange={x => setDias(Number(x.target.value))}>
                <option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option>
              </select>
              <select aria-label="Campanha" style={{ ...e.input, width: 200 }} value={campaignId} onChange={x => setCampaignId(x.target.value)}>
                <option value="">Todas as campanhas</option>
                {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </>
          )}
          <button style={e.btn} onClick={() => setModalCampanha(true)}>+ Nova campanha</button>
          <button style={e.ghost} onClick={() => setModalAria(true)}>Estratégia com Aria</button>
        </div>
      </div>

      <Aviso aviso={aviso} />

      {secaoAtiva === "visao-geral" && <VisaoGeral key={versao} cor={cor} filtros={filtros} ir={ir} />}
      {secaoAtiva === "alcance-metricas" && <AlcanceMetricas cor={cor} filtros={filtros} avisar={avisar} campanhas={campanhas} />}
      {secaoAtiva === "leads-campanhas" && <LeadsCampanhas key={versao} cor={cor} filtros={filtros} avisar={avisar} campanhas={campanhas} recarregarCampanhas={recarregarTudo} />}
      {secaoAtiva === "landing-pages" && <LandingPageEditor />}
      {secaoAtiva === "copy-ia" && <CopyIA cor={cor} avisar={avisar} />}
      {secaoAtiva === "lead-scoring" && <LeadScoring cor={cor} avisar={avisar} />}
      {secaoAtiva === "scripts-ia" && <ScriptsIA cor={cor} avisar={avisar} />}
      {secaoAtiva === "funis" && <FunisConversao cor={cor} avisar={avisar} />}
      {secaoAtiva === "publicos" && <Publicos cor={cor} avisar={avisar} />}
      {secaoAtiva === "recuperacao" && <Recuperacao cor={cor} avisar={avisar} />}
      {secaoAtiva === "analises-roi" && <AnalisesROI cor={cor} filtros={filtros} avisar={avisar} campanhas={campanhas} />}
      {secaoAtiva === "tarefas" && <Tarefas cor={cor} avisar={avisar} />}

      {modalCampanha && <FormCampanha cor={cor} e={e} avisar={avisar} onClose={() => setModalCampanha(false)} onOk={() => { setModalCampanha(false); recarregarTudo(); }} />}
      {modalAria && <EstrategiaAria cor={cor} avisar={avisar} onClose={() => setModalAria(false)} recarregar={recarregarTudo} />}
    </div>
  );
}
