// frontend/src/pages/Onboarding.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const STEPS = [
  { id: 1, label: "Dados da Empresa" },
  { id: 2, label: "Perguntas sobre o Negócio" },
  { id: 3, label: "Recomendações de Módulos" },
  { id: 4, label: "Instalação dos Módulos" },
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
  { id: "pedidos", label: "Gestão de Pedidos", desc: "Processamento e controle de pedidos", icon: "📦", modulo: { label: "Pedidos", rota: "/orders", disponivel: true } },
  { id: "estoque", label: "Estoque", desc: "Controle e gestão de inventário", icon: "📊", modulo: { label: "Produtos (com controle de estoque)", rota: "/products", disponivel: true } },
  { id: "financeiro", label: "Financeiro", desc: "Contas a pagar/receber e fluxo de caixa", icon: "💰", modulo: { label: "Financeiro", disponivel: false } },
  { id: "marketing", label: "Marketing", desc: "Campanhas e gestão de leads", icon: "📣", modulo: { label: "Marketing", rota: "/marketing", disponivel: true } },
  { id: "atendimento", label: "Atendimento", desc: "Suporte e relacionamento com clientes", icon: "🎧", modulo: { label: "Atendimento", disponivel: false } },
  { id: "crm", label: "CRM", desc: "Gestão de clientes e oportunidades", icon: "👥", modulo: { label: "Clientes", rota: "/customers", disponivel: true } },
  { id: "relatorios", label: "Relatórios e BI", desc: "Dashboards e análises inteligentes", icon: "📈", modulo: { label: "Relatórios", disponivel: false } },
  { id: "logistica", label: "Logística", desc: "Envios e rastreamento de entregas", icon: "🚛", modulo: { label: "Logística", disponivel: false } },
  { id: "fiscal", label: "Fiscal e Contábil", desc: "Notas fiscais e obrigações fiscais", icon: "🧾", modulo: { label: "Fiscal", disponivel: false } },
  { id: "compras", label: "Compras", desc: "Gestão de fornecedores e compras", icon: "🛍️", modulo: { label: "Compras", disponivel: false } },
];

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

  const toggleEm = (lista, setLista, valor) => {
    setLista(lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor]);
  };

  useEffect(() => {
    api.get("/onboarding").then(r => {
      if (r.data.completed) {
        navigate("/", { replace: true });
      }
    }).catch(() => {});
  }, [navigate]);

  const podeAvancar = () => {
    if (step === 2) return segmento && canais.length > 0 && sistemaGestao && areas.length > 0 && tamanho && objetivo;
    return true;
  };

  const avancar = async () => {
    setErro("");
    if (step === 2) {
      setSalvando(true);
      try {
        await api.post("/onboarding", {
          segmento, canais, sistema_gestao: sistemaGestao,
          areas_automatizar: areas, tamanho_operacao: tamanho, objetivo,
        });
        setStep(3);
      } catch (err) {
        setErro(err.response?.data?.error || "Erro ao salvar respostas.");
      } finally {
        setSalvando(false);
      }
    } else if (step === 3) {
      setStep(4);
      setTimeout(() => setStep(5), 1200);
    } else if (step === 5) {
      setSalvando(true);
      try {
        const modulosRecomendados = AREAS.filter(a => areas.includes(a.id) && a.modulo.disponivel).map(a => a.id);
        await api.post("/onboarding/complete", { modulos_selecionados: modulosRecomendados });
        navigate("/");
      } catch (err) {
        setErro(err.response?.data?.error || "Erro ao concluir onboarding.");
      } finally {
        setSalvando(false);
      }
    }
  };

  const recomendados = AREAS.filter(a => areas.includes(a.id));

  const btnPrimary = { background: cor.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const btnGhost = { background: "none", color: cor.textMuted, border: `1px solid ${cor.border}`, borderRadius: 10, padding: "12px 24px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: cor.bg, display: "flex", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ width: 260, background: "#0f0f10", padding: "32px 24px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>🧩</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Apollo</span>
        </div>
        <p style={{ color: "#888", fontSize: 11.5, marginBottom: 28 }}>Vamos configurar seu negócio</p>

        <p style={{ color: "#666", fontSize: 10.5, letterSpacing: "0.06em", marginBottom: 4 }}>PROGRESSO</p>
        <p style={{ color: "#fff", fontSize: 13, marginBottom: 20 }}>{step} de 5 · {Math.round((step / 5) * 100)}%</p>

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
            </>
          )}

          {step === 3 && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: cor.text, marginBottom: 4 }}>Recomendações para o seu negócio</h1>
              <p style={{ color: cor.textMuted, fontSize: 13.5, marginBottom: 28 }}>Com base nas suas respostas, estes são os módulos que fazem mais sentido.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recomendados.map(a => (
                  <div key={a.id} style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 22 }}>{a.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: cor.text }}>{a.modulo.label}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: cor.textMuted }}>{a.desc}</p>
                    </div>
                    <span style={{
                      fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 600,
                      background: a.modulo.disponivel ? "#dcfce7" : "#f4f4f5",
                      color: a.modulo.disponivel ? "#16a34a" : "#a3a3a3",
                    }}>
                      {a.modulo.disponivel ? "Disponível" : "Em breve"}
                    </span>
                  </div>
                ))}
                {recomendados.length === 0 && (
                  <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma área selecionada na etapa anterior.</p>
                )}
              </div>
            </>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ width: 48, height: 48, border: `4px solid ${cor.border}`, borderTopColor: cor.accent, borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontWeight: 600, color: cor.text }}>Preparando seus módulos...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

          {step !== 4 && (
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
    </div>
  );
}