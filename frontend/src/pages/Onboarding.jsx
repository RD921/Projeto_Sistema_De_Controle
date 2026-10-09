// frontend/src/pages/Onboarding.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AriaAssistant from "../components/AriaAssistant";

const STEPS = [
  { id: 1, label: "Dados da Empresa" },
  { id: 2, label: "Perguntas sobre o Negócio" },
  { id: 3, label: "Segurança da Aria" },
  { id: 4, label: "Recomendações de Módulos" },
  { id: 5, label: "Pronto para Usar" },
];

const SEGMENTOS = [
  { id: "ecommerce", label: "E-commerce", desc: "Lojas virtuais e vendas online", icon: "🛒" },
  { id: "varejo", label: "Varejo Físico", desc: "Lojas físicas e pontos de venda", icon: "🏬" },
  { id: "industria", label: "Indústria", desc: "Fabricação e produção", icon: "🏭" },
  { id: "distribuicao", label: "Distribuição", desc: "Distribuição e atacado", icon: "🚚" },
  { id: "servicos", label: "Serviços", desc: "Prestação de serviços e consultorias", icon: "👤" },
  { id: "infoprodutos", label: "Infoprodutos", desc: "Cursos, ebooks e conteúdo digital", icon: "🎓" },
  { id: "marketplace", label: "Marketplace", desc: "Venda em múltiplos marketplaces", icon: "🧩" },
  { id: "outros_segmento", label: "Outros", desc: "Outro segmento não listado", icon: "⋯" },
];

const CANAIS = [
  "Loja Virtual (Própria)", "Mercado Livre", "Shopee", "Amazon",
  "Magazine Luiza", "Americanas", "Aliexpress", "Outros Marketplaces",
  "Instagram", "WhatsApp", "Facebook", "Nenhum ainda",
];

const SISTEMAS = [
  { id: "bling", label: "Bling", desc: "ERP e gestão completa" },
  { id: "tiny", label: "Tiny", desc: "Gestão para e-commerce" },
  { id: "omie", label: "Omie", desc: "ERP na nuvem" },
  { id: "sap", label: "SAP", desc: "Enterprise Management" },
  { id: "senior", label: "Senior", desc: "Sistema de gestão empresarial" },
  { id: "nenhum", label: "Nenhum", desc: "Não utilizo sistema de gestão" },
  { id: "outro", label: "Outro", desc: "Outro sistema não listado" },
];

const AREAS = [
  { id: "pedidos", label: "Gestão de Pedidos", desc: "Processamento e controle de pedidos", icon: "📦" },
  { id: "financeiro", label: "Financeiro", desc: "Contas a pagar/receber e fluxo de caixa", icon: "💰" },
  { id: "marketing", label: "Marketing", desc: "Campanhas e gestão de leads", icon: "📣" },
  { id: "clientes", label: "CRM", desc: "Gestão de clientes e oportunidades", icon: "👥" },
  { id: "relatorios", label: "Relatórios e BI", desc: "Dashboards e análises inteligentes", icon: "📈" },
  { id: "logistica", label: "Logística", desc: "Envios e rastreamento de entregas", icon: "🚛" },
  { id: "compras", label: "Compras", desc: "Gestão de fornecedores e compras", icon: "🛍️" },
];

const ICONES_MODULO = { ecommerce: "🛒", crm: "💼", marketing: "📣", relatorios: "📈", logistica: "🚛" };
const TIPO_CANAL_LABEL = { loja_fisica: "Loja física", site: "Site", marketplace: "Marketplace", rede_social: "Rede social", outro: "Outro" };
const LIMITE_PDF = 10 * 1024 * 1024;

const TAMANHOS = [
  { id: "iniciante", label: "Iniciante", desc: "Até 100 pedidos/mês", icon: "🌱" },
  { id: "pequena", label: "Pequena", desc: "101 a 1.000 pedidos/mês", icon: "🏠" },
  { id: "media", label: "Média", desc: "1.001 a 10.000 pedidos/mês", icon: "🏢" },
  { id: "grande", label: "Grande", desc: "+10.000 pedidos/mês", icon: "🏛️" },
];

const OBJETIVOS = [
  { id: "reduzir_custos", label: "Reduzir Custos", desc: "Otimizar processos e reduzir despesas", icon: "💲" },
  { id: "aumentar_vendas", label: "Aumentar Vendas", desc: "Vender mais e crescer o faturamento", icon: "📈" },
  { id: "escalar", label: "Escalar Operação", desc: "Preparar para crescer e escalar", icon: "🚀" },
  { id: "controle", label: "Melhorar Controle", desc: "Ter mais controle e visibilidade", icon: "👁️" },
];

const cor = {
  bg: "#f5f5f7", card: "#ffffff", border: "#e5e5e5",
  text: "#171717", textMuted: "#737373", accent: "#7c3aed",
};

function ToggleCard({ ativo, onClick, icon, label, desc }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${ativo ? cor.accent : cor.border}`,
        background: ativo ? "#f3e8ff" : "#fff",
        borderRadius: 12, padding: 14, cursor: "pointer",
        display: "flex", gap: 10, alignItems: "flex-start", position: "relative",
      }}
    >
      {ativo && (
        <span style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: cor.accent, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
      )}
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: cor.text }}>{label}</p>
        {desc && <p style={{ margin: "3px 0 0", fontSize: 11.5, color: cor.textMuted }}>{desc}</p>}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(2);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [segmento, setSegmento] = useState(null);
  const [canais, setCanais] = useState([]);
  const [sistemaGestao, setSistemaGestao] = useState(null);
  const [areas, setAreas] = useState([]);
  const [tamanho, setTamanho] = useState(null);
  const [objetivo, setObjetivo] = useState(null);

  // "Me conte mais sobre a sua empresa": texto livre (sem limite) e/ou PDF
  const [descricao, setDescricao] = useState("");
  const [arquivoPdf, setArquivoPdf] = useState(null);
  const [documentoSalvo, setDocumentoSalvo] = useState(null);
  const [removerDocumento, setRemoverDocumento] = useState(false);

  // Plano montado pela Aria na etapa de recomendações
  const [analisando, setAnalisando] = useState(false);
  const [plano, setPlano] = useState(null);
  const [modulosEscolhidos, setModulosEscolhidos] = useState([]);

  const [novoPin, setNovoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [pinConfigurado, setPinConfigurado] = useState(false);

  const [instalando, setInstalando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const toggleEm = (lista, setLista, valor) => {
    setLista(lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor]);
  };

  // O onboarding só existe para conta recém-criada: se não estiver pendente, vai para o painel.
  useEffect(() => {
    api.get("/onboarding").then(r => {
      if (!r.data.pendente) {
        navigate("/", { replace: true });
        return;
      }
      const a = r.data.answers;
      if (!a) return;
      if (a.segmento) setSegmento(a.segmento);
      if (a.canais?.length) setCanais(a.canais);
      if (a.sistema_gestao) setSistemaGestao(a.sistema_gestao);
      if (a.areas_automatizar?.length) setAreas(a.areas_automatizar);
      if (a.tamanho_operacao) setTamanho(a.tamanho_operacao);
      if (a.objetivo) setObjetivo(a.objetivo);
      if (a.descricao_empresa) setDescricao(a.descricao_empresa);
      if (a.documento_nome) setDocumentoSalvo(a.documento_nome);
    }).catch(() => {});
  }, [navigate]);

  // Ao chegar nas recomendações, a Aria lê tudo (respostas, texto e PDF) e monta o plano.
  // reanalisar = true quando as respostas mudaram (o plano antigo não vale mais).
  const irParaRecomendacoes = (reanalisar = false) => {
    setStep(4);
    if (plano && !reanalisar) return;
    setPlano(null);
    setAnalisando(true);
    setErro("");
    api.post("/onboarding/analisar")
      .then(r => {
        setPlano(r.data);
        setModulosEscolhidos((r.data.modulos || []).map(m => m.id));
      })
      .catch(err => {
        setErro(err.response?.data?.error || "Não foi possível analisar sua empresa agora.");
      })
      .finally(() => setAnalisando(false));
  };

  const escolherPdf = (arquivo) => {
    setErro("");
    if (!arquivo) return;
    if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
      setErro("Envie o arquivo em formato PDF.");
      return;
    }
    if (arquivo.size > LIMITE_PDF) {
      setErro("O PDF pode ter no máximo 10 MB.");
      return;
    }
    setArquivoPdf(arquivo);
    setRemoverDocumento(false);
  };

  const tirarPdf = () => {
    setArquivoPdf(null);
    if (documentoSalvo) setRemoverDocumento(true);
  };

  const nomeDocumento = arquivoPdf ? arquivoPdf.name : (!removerDocumento && documentoSalvo) || null;

  const podeAvancar = () => {
    if (step === 2) return segmento && canais.length > 0 && sistemaGestao && areas.length > 0 && tamanho && objetivo;
    if (step === 3) return pinConfigurado || (/^\d{4,6}$/.test(novoPin) && novoPin === confirmarPin);
    if (step === 4) return !!plano && !analisando;
    return true;
  };

  const instalarModulos = async () => {
    setErro("");
    setInstalando(true);
    setProgresso(0);

    const chamadaApi = api.post("/onboarding/complete", { modulos_selecionados: modulosEscolhidos })
      .catch(err => {
        setErro(err.response?.data?.error || "Erro ao concluir onboarding.");
      });

    await new Promise(resolve => {
      let atual = 0;
      const intervalo = setInterval(() => {
        atual = Math.min(100, atual + Math.random() * 12 + 6);
        setProgresso(Math.round(atual));
        if (atual >= 100) {
          clearInterval(intervalo);
          resolve();
        }
      }, 180);
    });

    await chamadaApi;
    setInstalando(false);
    setStep(5);
  };

  const avancar = async () => {
    setErro("");
    if (step === 2) {
      setSalvando(true);
      try {
        const dados = new FormData();
        dados.append("segmento", segmento);
        dados.append("canais", JSON.stringify(canais));
        dados.append("sistema_gestao", sistemaGestao);
        dados.append("areas_automatizar", JSON.stringify(areas));
        dados.append("tamanho_operacao", tamanho);
        dados.append("objetivo", objetivo);
        dados.append("descricao_empresa", descricao);
        if (arquivoPdf) dados.append("documento", arquivoPdf);
        else if (removerDocumento) dados.append("remover_documento", "true");
        await api.post("/onboarding", dados);
        if (arquivoPdf) {
          setDocumentoSalvo(arquivoPdf.name);
          setArquivoPdf(null);
        }
        if (removerDocumento) {
          setDocumentoSalvo(null);
          setRemoverDocumento(false);
        }
        // Respostas mudaram: a Aria analisa de novo.
        if (pinConfigurado) irParaRecomendacoes(true);
        else {
          setPlano(null);
          setStep(3);
        }
      } catch (err) {
        setErro(err.response?.data?.error || "Erro ao salvar respostas.");
      } finally {
        setSalvando(false);
      }
    } else if (step === 3) {
      if (pinConfigurado) {
        irParaRecomendacoes(false);
        return;
      }
      if (!/^\d{4,6}$/.test(novoPin)) {
        setErro("O PIN deve ter entre 4 e 6 dígitos numéricos.");
        return;
      }
      if (novoPin !== confirmarPin) {
        setErro("Os PINs digitados não coincidem.");
        return;
      }
      setSalvando(true);
      try {
        await api.put("/assistente/pin", { novo_pin: novoPin });
        setPinConfigurado(true);
        irParaRecomendacoes(false);
      } catch (err) {
        setErro(err.response?.data?.error || "Erro ao configurar o PIN.");
      } finally {
        setSalvando(false);
      }
    } else if (step === 4) {
      if (!plano) return;
      instalarModulos();
    } else if (step === 5) {
      navigate("/");
    }
  };


  const btnPrimary = { background: cor.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const btnGhost = { background: "none", color: cor.textMuted, border: `1px solid ${cor.border}`, borderRadius: 10, padding: "12px 24px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" };
  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${cor.border}`, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: cor.bg, display: "flex", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ width: 260, background: "#0f0f10", padding: "32px 24px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>🧩</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Apollo</span>
        </div>
        <p style={{ color: "#888", fontSize: 11.5, marginBottom: 28 }}>Vamos configurar seu negócio</p>

        <p style={{ color: "#666", fontSize: 10.5, letterSpacing: "0.06em", marginBottom: 4 }}>PROGRESSO</p>
        <p style={{ color: "#fff", fontSize: 13, marginBottom: 20 }}>{step} de {STEPS.length} · {Math.round((step / STEPS.length) * 100)}%</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 8, background: s.id === step ? "#1a1a1c" : "transparent" }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                background: s.id < step ? "#4ade80" : s.id === step ? cor.accent : "#2a2a2c",
                color: s.id <= step ? "#fff" : "#666",
              }}>
                {s.id < step ? "✓" : s.id}
              </span>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, color: s.id === step ? "#fff" : s.id < step ? "#aaa" : "#666", fontWeight: s.id === step ? 600 : 400 }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#555" }}>{s.id < step ? "Concluído" : s.id === step ? "Em andamento" : "Aguardando"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: "40px 60px", overflowY: "auto" }}>
        <div style={{ maxWidth: 780 }}>
          {step === 2 && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: cor.text, marginBottom: 4 }}>Conte-nos mais sobre o seu negócio</h1>
              <p style={{ color: cor.textMuted, fontSize: 13.5, marginBottom: 28 }}>Suas respostas nos ajudam a recomendar os melhores módulos para você.</p>

              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4, color: cor.text }}>1. Qual é o principal segmento do seu negócio?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                {SEGMENTOS.map(s => (
                  <ToggleCard key={s.id} ativo={segmento === s.id} onClick={() => setSegmento(s.id)} icon={s.icon} label={s.label} desc={s.desc} />
                ))}
              </div>

              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4, color: cor.text }}>2. Em quais canais você vende atualmente?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                {CANAIS.map(c => (
                  <ToggleCard key={c} ativo={canais.includes(c)} onClick={() => toggleEm(canais, setCanais, c)} icon="●" label={c} />
                ))}
              </div>

              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4, color: cor.text }}>3. Qual sistema você utiliza para gestão atualmente?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                {SISTEMAS.map(s => (
                  <ToggleCard key={s.id} ativo={sistemaGestao === s.id} onClick={() => setSistemaGestao(s.id)} icon="⚙️" label={s.label} desc={s.desc} />
                ))}
              </div>

              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4, color: cor.text }}>4. Quais áreas você deseja melhorar com automação?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
                {AREAS.map(a => (
                  <ToggleCard key={a.id} ativo={areas.includes(a.id)} onClick={() => toggleEm(areas, setAreas, a.id)} icon={a.icon} label={a.label} desc={a.desc} />
                ))}
              </div>

              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4, color: cor.text }}>5. Qual é o tamanho da sua operação?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                {TAMANHOS.map(t => (
                  <ToggleCard key={t.id} ativo={tamanho === t.id} onClick={() => setTamanho(t.id)} icon={t.icon} label={t.label} desc={t.desc} />
                ))}
              </div>

              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4, color: cor.text }}>6. Qual é o seu principal objetivo com o Apollo?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                {OBJETIVOS.map(o => (
                  <ToggleCard key={o.id} ativo={objetivo === o.id} onClick={() => setObjetivo(o.id)} icon={o.icon} label={o.label} desc={o.desc} />
                ))}
              </div>

              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2, color: cor.text }}>
                7. Me conte mais sobre a sua empresa <span style={{ fontWeight: 400, color: cor.textMuted }}>(opcional)</span>
              </p>
              <p style={{ fontSize: 12, color: cor.textMuted, margin: "0 0 10px" }}>
                Explique com suas palavras como a sua empresa funciona: o que vende, para quem, como é a operação e o que mais dá trabalho hoje.
                A Aria vai ler isso para montar o sistema do jeito que o seu negócio precisa.
              </p>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Somos uma loja de roupas femininas com uma loja física no centro e vendas pelo Instagram e Mercado Livre..."
                rows={7}
                style={{ ...inputStyle, resize: "vertical", minHeight: 140, lineHeight: 1.5, marginBottom: 12 }}
              />

              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); escolherPdf(e.dataTransfer.files?.[0]); }}
                style={{ border: `2px dashed ${nomeDocumento ? cor.accent : cor.border}`, background: nomeDocumento ? "#faf5ff" : "#fff", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}
              >
                <span style={{ fontSize: 26 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {nomeDocumento ? (
                    <>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: cor.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeDocumento}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: cor.textMuted }}>A Aria vai ler este PDF para entender como a sua empresa funciona.</p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: cor.text }}>Prefere mandar um arquivo? Envie um PDF</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: cor.textMuted }}>Um resumo de como a empresa funciona, apresentação, processos... Até 10 MB.</p>
                    </>
                  )}
                </div>
                {nomeDocumento && (
                  <button type="button" onClick={tirarPdf} style={{ ...btnGhost, padding: "8px 14px", fontSize: 12.5 }}>Remover</button>
                )}
                <label style={{ ...btnGhost, padding: "8px 14px", fontSize: 12.5, color: cor.accent, borderColor: cor.accent }}>
                  {nomeDocumento ? "Trocar" : "Escolher PDF"}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: "none" }}
                    onChange={e => { escolherPdf(e.target.files?.[0]); e.target.value = ""; }}
                  />
                </label>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: cor.text, marginBottom: 4 }}>Proteja as ações da Aria</h1>
              <p style={{ color: cor.textMuted, fontSize: 13.5, marginBottom: 28 }}>
                A Aria, sua assistente virtual, pode consultar dados livremente, mas nunca executa uma ação real (lançar receita/despesa, emitir nota fiscal, criar automação)
                sem antes montar uma proposta com análise de risco e pedir esse PIN para confirmar. Isso garante que nenhuma mudança acontece sem a sua autorização direta.
              </p>

              <div style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 14, padding: 24, maxWidth: 420 }}>
                {pinConfigurado ? (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <p style={{ fontSize: 30, marginBottom: 8 }}>🔒</p>
                    <p style={{ fontWeight: 600, color: cor.text, fontSize: 14.5 }}>PIN configurado com sucesso!</p>
                    <p style={{ color: cor.textMuted, fontSize: 12.5, marginTop: 4 }}>Você pode alterá-lo depois em Configurações → IA.</p>
                  </div>
                ) : (
                  <>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: cor.text, marginBottom: 6 }}>Criar PIN (4 a 6 dígitos)</label>
                    <input
                      type="password" inputMode="numeric" maxLength={6}
                      value={novoPin}
                      onChange={e => setNovoPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••"
                      style={{ ...inputStyle, marginBottom: 16, letterSpacing: "0.3em" }}
                    />

                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: cor.text, marginBottom: 6 }}>Confirmar PIN</label>
                    <input
                      type="password" inputMode="numeric" maxLength={6}
                      value={confirmarPin}
                      onChange={e => setConfirmarPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••"
                      style={{ ...inputStyle, letterSpacing: "0.3em" }}
                    />

                    <p style={{ color: cor.textMuted, fontSize: 11.5, marginTop: 14 }}>
                      Esse PIN é obrigatório para continuar. Ele é diferente da sua senha de login e fica guardado de forma criptografada — nem a equipe do sistema consegue vê-lo.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {step === 4 && !instalando && analisando && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{ fontSize: 34, marginBottom: 10 }}>🤖</p>
              <p style={{ fontWeight: 600, color: cor.text, fontSize: 15, marginBottom: 6 }}>A Aria está analisando a sua empresa...</p>
              <p style={{ color: cor.textMuted, fontSize: 13 }}>
                {documentoSalvo ? "Lendo suas respostas, o seu texto e o PDF enviado." : "Lendo suas respostas para montar o sistema ideal."} Isso leva alguns segundos.
              </p>
            </div>
          )}

          {step === 4 && !instalando && !analisando && plano && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: cor.text, marginBottom: 4 }}>O sistema montado para o seu negócio</h1>
              <p style={{ color: cor.textMuted, fontSize: 13.5, marginBottom: 24 }}>
                {plano.origem === "ia"
                  ? "A Aria leu tudo o que você contou e preparou esta configuração. Revise e desmarque o que não quiser."
                  : "Com base nas suas respostas, esta é a configuração recomendada. Revise e desmarque o que não quiser."}
              </p>

              {plano.resumo && (
                <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 12, padding: 16, marginBottom: 22 }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 13, color: cor.accent }}>Como a Aria entendeu a sua empresa</p>
                  <p style={{ margin: 0, fontSize: 13, color: cor.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{plano.resumo}</p>
                </div>
              )}

              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8, color: cor.text }}>Módulos que serão instalados</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                {(plano.modulos || []).map(m => {
                  const marcado = modulosEscolhidos.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleEm(modulosEscolhidos, setModulosEscolhidos, m.id)}
                      style={{ background: cor.card, border: `2px solid ${marcado ? cor.accent : cor.border}`, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 22 }}>{ICONES_MODULO[m.id] || "🧩"}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: cor.text }}>{m.label || m.id}</p>
                        {m.motivo && <p style={{ margin: "2px 0 0", fontSize: 12, color: cor.textMuted }}>{m.motivo}</p>}
                      </div>
                      <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${marcado ? cor.accent : cor.border}`, background: marcado ? cor.accent : "#fff", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {marcado ? "✓" : ""}
                      </span>
                    </div>
                  );
                })}
                {(plano.modulos || []).length === 0 && (
                  <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum módulo extra recomendado. Automações, Integrações e Financeiro já vêm ativos.</p>
                )}
              </div>

              {((plano.centros_custo || []).length > 0 || (plano.canais_venda || []).length > 0) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
                  <div style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 14 }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: cor.text }}>Centros de custo</p>
                    <p style={{ margin: "0 0 4px", fontSize: 12.5, color: cor.text }}>• Geral</p>
                    {(plano.centros_custo || []).map(c => (
                      <p key={c.codigo} style={{ margin: "0 0 4px", fontSize: 12.5, color: cor.text }} title={c.descricao}>• {c.nome}</p>
                    ))}
                  </div>
                  <div style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 14 }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: cor.text }}>Canais de venda</p>
                    {(plano.canais_venda || []).map(c => (
                      <p key={c.nome} style={{ margin: "0 0 4px", fontSize: 12.5, color: cor.text }}>
                        • {c.nome} <span style={{ color: cor.textMuted }}>({TIPO_CANAL_LABEL[c.tipo] || c.tipo})</span>
                      </p>
                    ))}
                    {(plano.canais_venda || []).length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: cor.textMuted }}>Nenhum por enquanto.</p>}
                  </div>
                </div>
              )}

              {(plano.observacoes || []).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: cor.text }}>Dicas da Aria</p>
                  {plano.observacoes.map((o, i) => (
                    <p key={i} style={{ margin: "0 0 4px", fontSize: 12.5, color: cor.textMuted }}>💡 {o}</p>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 4 && !instalando && !analisando && !plano && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ color: cor.textMuted, fontSize: 13.5, marginBottom: 14 }}>A análise não foi concluída.</p>
              <button onClick={() => irParaRecomendacoes(true)} style={btnPrimary}>Tentar de novo</button>
            </div>
          )}

          {step === 4 && instalando && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{ fontWeight: 600, color: cor.text, marginBottom: 20, fontSize: 15 }}>Instalando seus módulos...</p>
              <div style={{ width: "100%", maxWidth: 360, margin: "0 auto 14px", background: cor.border, borderRadius: 20, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${progresso}%`, height: "100%", background: cor.accent, borderRadius: 20, transition: "width 0.18s ease-out" }} />
              </div>
              <p style={{ color: cor.textMuted, fontSize: 13.5 }}>{progresso}%</p>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🎉</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: cor.text, marginBottom: 6 }}>Tudo pronto!</h1>
              <p style={{ color: cor.textMuted, fontSize: 13.5 }}>Seu painel já está configurado com base nas suas respostas.</p>
            </div>
          )}

          {erro && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{erro}</p>}

          {!instalando && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: `1px solid ${cor.border}` }}>
              {step > 2 && step !== 5 ? (
                <button onClick={() => setStep(step - 1)} style={btnGhost}>← Voltar</button>
              ) : <span />}
              <button onClick={avancar} disabled={!podeAvancar() || salvando} style={{ ...btnPrimary, opacity: (!podeAvancar() || salvando) ? 0.6 : 1 }}>
                {salvando ? "Salvando..." : step === 5 ? "Ir para o painel →" : "Próximo passo →"}
              </button>
            </div>
          )}
        </div>
      </div>

      <AriaAssistant />
    </div>
  );
}