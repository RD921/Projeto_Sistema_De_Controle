import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import api from "../api";

const temas = {
  preto: { bg: "#000", sidebar: "#000", header: "#000", border: "#222", text: "#fff", textMuted: "#6e6e73", card: "#111", cardHover: "#1a1a1a" },
  branco: { bg: "#f5f5f7", sidebar: "#fff", header: "#fff", border: "#e5e5e5", text: "#1d1d1f", textMuted: "#6e6e73", card: "#fff", cardHover: "#f0f0f2" },
  sistema: { bg: "#0f172a", sidebar: "#0f172a", header: "#0f172a", border: "#1e293b", text: "#e2e8f0", textMuted: "#64748b", card: "#1e293b", cardHover: "#263348" },
};

const traducoes = {
  pt: {
    modulos: "Módulos", ecommerce: "E-commerce", marketing: "Marketing", central: "Central de Controle", integracoes: "Integrações",
    dashboard: "Dashboard", produtos: "Produtos", pedidos: "Pedidos",
    clientes: "Clientes", sair: "Sair",
    visaoGeral: "Visão Geral",
    ariaOnline: "● Online agora", ariaPlaceholder: "Digite uma mensagem...",
    tema: "Tema", idioma: "Idioma", buscar: "Buscar em tudo...",
    semNotificacoes: "Nenhuma notificação nova",
    canaisVenda: "Canais de Venda e Marketplaces", logistica: "Logística e Frete",
    fiscal: "Emissão de Nota Fiscal", pagamentos: "Gateways de Pagamento",
    financeiro: "Financeiro",
  },
  en: {
    modulos: "Modules", ecommerce: "E-commerce", marketing: "Marketing", central: "Control Center", integracoes: "Integrations",
    dashboard: "Dashboard", produtos: "Products", pedidos: "Orders",
    clientes: "Customers", sair: "Logout",
    visaoGeral: "Overview",
    ariaOnline: "● Online now", ariaPlaceholder: "Type a message...",
    tema: "Theme", idioma: "Language", buscar: "Search everything...",
    semNotificacoes: "No new notifications",
    canaisVenda: "Sales Channels & Marketplaces", logistica: "Logistics & Shipping",
    fiscal: "Invoice Issuance", pagamentos: "Payment Gateways",
    financeiro: "Finance",
  },
  es: {
    modulos: "Módulos", ecommerce: "E-commerce", marketing: "Marketing", central: "Centro de Control", integracoes: "Integraciones",
    dashboard: "Panel", produtos: "Productos", pedidos: "Pedidos",
    clientes: "Clientes", sair: "Salir",
    visaoGeral: "Visión General",
    ariaOnline: "● En línea ahora", ariaPlaceholder: "Escribe un mensaje...",
    tema: "Tema", idioma: "Idioma", buscar: "Buscar en todo...",
    semNotificacoes: "Sin notificaciones nuevas",
    canaisVenda: "Canales de Venta y Marketplaces", logistica: "Logística y Envío",
    fiscal: "Emisión de Factura", pagamentos: "Pasarelas de Pago",
    financeiro: "Financiero",
  },
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ariaOpen, setAriaOpen] = useState(false);
  const [ariaHover, setAriaHover] = useState(false);
  const [mensagens, setMensagens] = useState([
    { role: "assistant", text: "Olá! Sou a Aria 👋 Como posso te ajudar?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tema, setTema] = useState("preto");
  const [idioma, setIdioma] = useState("pt");
  const [showTema, setShowTema] = useState(false);
  const [showIdioma, setShowIdioma] = useState(false);
  const [sidebarColapsada, setSidebarColapsada] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [modulosInstalados, setModulosInstalados] = useState({});
  const [contabilExpandido, setContabilExpandido] = useState(false);
  const bottomRef = useRef(null);
  const buscaInputRef = useRef(null);
  const [showEmpresas, setShowEmpresas] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresaAtualId, setEmpresaAtualId] = useState(null);
  const [trocandoEmpresa, setTrocandoEmpresa] = useState(false);
  const moeda = empresas.find(e => e.id === empresaAtualId)?.moeda || "BRL";

  const t = traducoes[idioma];
  const cor = temas[tema];

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenant_id");
    navigate("/login");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  useEffect(() => {
    api.get("/modules").then(r => {
      const mapa = {};
      (r.data || []).forEach(m => { mapa[m.id] = m.instalado; });
      setModulosInstalados(mapa);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setBuscaAberta(true);
        setTimeout(() => buscaInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setBuscaAberta(false);
        setNotifOpen(false);
        setPerfilOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

useEffect(() => {
  api.get("/auth/minhas-empresas")
    .then(r => {
      setEmpresas(r.data || []);
      const token = localStorage.getItem("token");
      let tenantIdAtual = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          tenantIdAtual = payload.tenant_id;
        } catch {}
      }
      const atual = r.data?.find(e => e.id === tenantIdAtual) || r.data?.find(e => e.is_default) || r.data?.[0];
      if (atual) setEmpresaAtualId(atual.id);
    })
    .catch(() => {});
}, []);

const trocarEmpresa = async (tenantId) => {
  if (tenantId === empresaAtualId) { setShowEmpresas(false); return; }
  setTrocandoEmpresa(true);
  try {
    const r = await api.post("/auth/trocar-empresa", { tenant_id: tenantId });
    localStorage.setItem("token", r.data.token);
    window.location.reload();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao trocar de empresa.");
    setTrocandoEmpresa(false);
  }
};

  const enviarMensagem = async (texto) => {
    if (!texto.trim()) return;
    const novasMensagens = [...mensagens, { role: "user", text: texto }];
    setMensagens(novasMensagens);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/marketing/chat", { mensagens: novasMensagens });
      setMensagens(prev => [...prev, { role: "assistant", text: res.data.resposta }]);
    } catch {
      setMensagens(prev => [...prev, { role: "assistant", text: "Erro ao conectar. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const formatarTexto = (texto) => texto
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");

  const isCentral = location.pathname.startsWith("/central-controle");
  const isEcommerce = ["/products", "/orders", "/customers"].includes(location.pathname);
  const isIntegracoes = location.pathname.startsWith("/integracoes");
  const isMarketing = location.pathname.startsWith("/marketing");
  const isFinanceiro = location.pathname.startsWith("/financeiro");
  const isAutomacoes = location.pathname.startsWith("/automacoes") && !location.pathname.includes("/editor");
  const isCRM = location.pathname.startsWith("/crm");
  const isLogistica = location.pathname.startsWith("/logistica");
  const hasSidebar = isEcommerce || isMarketing || isCentral || isIntegracoes || isFinanceiro || isAutomacoes || isCRM || isLogistica;

  const centralLinks = [
    { to: "/central-controle/resumo", label: "Resumo", icon: "📊" },
    ...(modulosInstalados.financeiro ? [{ to: "/central-controle/financeiro", label: "Financeiro", icon: "💰" }] : []),
    ...(modulosInstalados.ecommerce ? [{ to: "/central-controle/ecommerce", label: "E-commerce", icon: "🛒" }] : []),
    ...(modulosInstalados.marketing ? [{ to: "/central-controle/marketing", label: "Marketing", icon: "📣" }] : []),
    ...(modulosInstalados.integracoes ? [{ to: "/central-controle/integracoes", label: "Integrações", icon: "🔗" }] : []),
    ...(modulosInstalados.automacoes ? [{ to: "/central-controle/automacoes", label: "Automações", icon: "⚡" }] : []),
  ];
  const ecommerceLinks = [
    { to: "/products", label: t.produtos, icon: "📦" },
    { to: "/orders", label: t.pedidos, icon: "🛒" },
    { to: "/customers", label: t.clientes, icon: "👥" },
  ];
  
      const marketingLinks = [
    { to: "/marketing/visao-geral", label: "Visão Geral", icon: "📊" },
    { to: "/marketing/alcance-metricas", label: "Alcance & Métricas", icon: "📍" },
    { to: "/marketing/leads-campanhas", label: "Leads & Campanhas", icon: "🚀" },
    { to: "/marketing/landing-pages", label: "Landing Pages", icon: "🖥️" },
    { to: "/marketing/copy-ia", label: "Copy com IA", icon: "🤖" },
    { to: "/marketing/lead-scoring", label: "Lead Scoring", icon: "🎯" },
    { to: "/marketing/scripts-ia", label: "Scripts IA", icon: "🎭" },
  ];

  const crmLinks = [
    { to: "/crm/pipeline", label: "Pipeline", icon: "🎯" },
    { to: "/crm/dashboard", label: "Dashboard", icon: "📊" },
  ];

  const integracoesLinks = [
    { to: "/integracoes/canais-venda", label: t.canaisVenda, icon: "🛒" },
    { to: "/integracoes/logistica", label: t.logistica, icon: "🚚" },
    { to: "/integracoes/fiscal", label: t.fiscal, icon: "📄" },
    { to: "/integracoes/pagamentos", label: t.pagamentos, icon: "💳" },
  ];

  const contabilidadeSubLinks = [
  { to: "/financeiro/contabilidade/plano-contas", label: "Plano de Contas", icon: "📚" },
  { to: "/financeiro/contabilidade/lancamentos", label: "Lançamentos", icon: "✍️" },
  { to: "/financeiro/contabilidade/diario", label: "Livro Diário", icon: "📓" },
  { to: "/financeiro/contabilidade/razao", label: "Livro Razão", icon: "📖" },
  { to: "/financeiro/contabilidade/balancete", label: "Balancete", icon: "📊" },
  { to: "/financeiro/contabilidade/dre", label: "DRE", icon: "📈" },
  { to: "/financeiro/contabilidade/balanco", label: "Balanço", icon: "⚖️" },
];

  const financeiroLinks = [
  { to: "/financeiro/resumo", label: "Resumo", icon: "💰" },
  { to: "/financeiro/motor-financeiro", label: "Motor Financeiro", icon: "⚙️" },
  { to: "/financeiro/rentabilidade", label: "Rentabilidade Real", icon: "📈" },
  { to: "/financeiro/fluxo-preditivo", label: "Fluxo de Caixa Preditivo", icon: "🔮" },
  { to: "/financeiro/simulador", label: "Simulador de Cenários", icon: "🔮" },
  { to: "/financeiro/tesouraria", label: "Tesouraria", icon: "🏛️" },
  { to: "/financeiro/orcamento", label: "Orçamento", icon: "🎯" },
  { to: "/financeiro/automacao", label: "Automação Financeira", icon: "🤖" },
  { to: "/financeiro/alertas", label: "Alertas e Riscos", icon: "🚨" },
  { to: "/financeiro/cartoes", label: "Cartões Corporativos", icon: "💳" },
  { to: "/financeiro/fechamento", label: "Fechamento do Mês", icon: "🔒" },
  { to: "/financeiro/governanca", label: "Governança e Auditoria", icon: "🛡️" },
  { to: "/financeiro/fiscal", label: "Fiscal e Contábil", icon: "🧾" },
  { to: "/financeiro/notas-fiscais", label: "Notas Fiscais", icon: "📜" },
  { to: "/financeiro/contabilidade", label: "Contabilidade", icon: "📗" },
  { to: "/financeiro/contas-pagar", label: "Contas a Pagar", icon: "📤" },
  { to: "/financeiro/contas-receber", label: "Contas a Receber", icon: "📥" },
  { to: "/financeiro/contratos", label: "Contratos", icon: "📑" },
  { to: "/financeiro/centros-custo", label: "Centros de Custo", icon: "🏷️" },
  { to: "/financeiro/bancos", label: "Bancos", icon: "🏦" },
  { to: "/financeiro/conciliacao", label: "Conciliação Bancária", icon: "🔄" },
  { to: "/financeiro/obrigacoes", label: "Obrigações Fiscais", icon: "📅" },
  { to: "/financeiro/documentos", label: "Documentos", icon: "🗂️" },
];

  const automacoesLinks = [
    { to: "/automacoes/minhas", label: "Minhas Automações", icon: "⚡" },
    { to: "/automacoes/templates-ia", label: "Templates da IA", icon: "🤖" },
    { to: "/automacoes/execucoes", label: "Execuções", icon: "▶️" },
    { to: "/automacoes/eventos", label: "Eventos", icon: "📡" },
    { to: "/automacoes/logs", label: "Logs", icon: "📋" },
  ];

  const logisticaLinks = [
  { to: "/logistica/dashboard", label: "Torre de Controle", icon: "📊" },
  { to: "/logistica/envios", label: "Envios", icon: "🚚" },
];

         const linksAtivos = isCentral ? centralLinks
    : isMarketing ? marketingLinks
    : isIntegracoes ? integracoesLinks
    : isFinanceiro ? financeiroLinks
    : isAutomacoes ? automacoesLinks
    : isCRM ? crmLinks
    : isLogistica ? logisticaLinks
    : ecommerceLinks;

      const tituloSecao = isCentral ? t.central
    : isMarketing ? t.marketing
    : isIntegracoes ? t.integracoes
    : isFinanceiro ? t.financeiro
    : isAutomacoes ? "Automações"
    : isCRM ? "CRM"
    : isLogistica ? "Logística"
    : "";

  const MODULOS_TODOS = [
    { id: "central", label: "Central de Controle", path: "/central-controle/resumo", icon: "📊", sempre: true },
    { id: "ecommerce", label: "E-commerce", path: "/products", icon: "🛒" },
    { id: "marketing", label: "Marketing", path: "/marketing/visao-geral", icon: "📣" },
    { id: "integracoes", label: "Integrações", path: "/integracoes/canais-venda", icon: "🔗", sempre: true },
    { id: "financeiro", label: "Financeiro", path: "/financeiro", icon: "💰", sempre: true },
    { id: "automacoes", label: "Automações", path: "/automacoes/minhas", icon: "⚡", sempre: true },
    { id: "assistente", label: "Assistente Aria", path: "/assistente", icon: "🤖", sempre: true },
    { id: "crm", label: "CRM", path: "/crm/pipeline", icon: "💼", sempre: true },
  ];

  const resultadosBusca = buscaTexto.trim()
    ? MODULOS_TODOS.filter(m => m.label.toLowerCase().includes(buscaTexto.toLowerCase()))
    : MODULOS_TODOS.filter(m => m.sempre || modulosInstalados[m.id]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", position: "relative", background: cor.bg, transition: "all 0.3s" }}>

      {hasSidebar && (
        <aside style={{
          width: sidebarColapsada ? 64 : 220, background: cor.sidebar, borderRight: `1px solid ${cor.border}`,
          color: cor.text, padding: "16px 0", display: "flex", flexDirection: "column",
          transition: "width 0.25s ease", overflow: "hidden", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 16px 16px" }}>
            <button onClick={() => setSidebarColapsada(!sidebarColapsada)} title={sidebarColapsada ? "Expandir" : "Recolher"}
              style={{ background: "none", border: `1px solid ${cor.border}`, borderRadius: 6, color: cor.textMuted, cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>
              {sidebarColapsada ? "»" : "«"}
            </button>
          </div>

          <button onClick={() => navigate("/")} title="Voltar para o painel" style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", color: cor.textMuted, cursor: "pointer",
            fontSize: 12.5, fontFamily: "inherit", padding: sidebarColapsada ? "8px 0" : "8px 20px",
            justifyContent: sidebarColapsada ? "center" : "flex-start", marginBottom: 8,
          }}>
            <span>←</span>
            {!sidebarColapsada && "Voltar para o painel"}
          </button>

          {!sidebarColapsada && (
            <h2 style={{ marginBottom: 8, fontSize: 11, padding: "0 20px", color: cor.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
              {tituloSecao}
            </h2>
          )}

          {linksAtivos.map((n) => {
            if (isFinanceiro && n.to === "/financeiro/contabilidade") {
              const contabilAtivo = location.pathname.startsWith("/financeiro/contabilidade");
              return (
                <div key="contabilidade-grupo">
                  <div
                    onClick={() => {
                      setContabilExpandido(!contabilExpandido);
                      if (!contabilAtivo) navigate("/financeiro/contabilidade/plano-contas");
                    }}
                    title={sidebarColapsada ? n.label : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      padding: sidebarColapsada ? "10px 0" : "10px 20px 10px 28px",
                      justifyContent: sidebarColapsada ? "center" : "flex-start",
                      color: contabilAtivo ? cor.text : cor.textMuted,
                      fontSize: 14,
                      background: contabilAtivo ? cor.card : "transparent",
                      borderLeft: contabilAtivo && !sidebarColapsada ? `2px solid ${cor.text}` : "2px solid transparent",
                      transition: "all 0.15s",
                    }}>
                    <span style={{ fontSize: 15 }}>{n.icon}</span>
                    {!sidebarColapsada && (
                      <>
                        <span style={{ flex: 1 }}>{n.label}</span>
                        <span style={{ fontSize: 10, transform: contabilExpandido ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▶</span>
                      </>
                    )}
                  </div>
                  {!sidebarColapsada && contabilExpandido && contabilidadeSubLinks.map(sub => (
                    <NavLink key={sub.to} to={sub.to}
                      style={({ isActive }) => ({
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 20px 8px 46px",
                        color: isActive ? cor.text : cor.textMuted,
                        textDecoration: "none", fontSize: 13,
                        background: isActive ? cor.card : "transparent",
                        borderLeft: isActive ? `2px solid ${cor.text}` : "2px solid transparent",
                        transition: "all 0.15s",
                      })}>
                      <span style={{ fontSize: 13 }}>{sub.icon}</span>
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              );
            }
            return (
              <NavLink key={n.label} to={n.to} title={sidebarColapsada ? n.label : undefined}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: 10,
                  padding: sidebarColapsada ? "10px 0" : "10px 20px 10px 28px",
                  justifyContent: sidebarColapsada ? "center" : "flex-start",
                  color: isActive ? cor.text : cor.textMuted,
                  textDecoration: "none", fontSize: 14,
                  background: isActive ? cor.card : "transparent",
                  borderLeft: isActive && !sidebarColapsada ? `2px solid ${cor.text}` : "2px solid transparent",
                  transition: "all 0.15s",
                })}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>
                {!sidebarColapsada && n.label}
              </NavLink>
            );
          })}
        </aside>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        <div style={{ height: 52, background: cor.header, borderBottom: `1px solid ${cor.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, transition: "all 0.3s", position: "sticky", top: 0, zIndex: 50 }}>

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <button onClick={() => { setBuscaAberta(true); setTimeout(() => buscaInputRef.current?.focus(), 50); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, background: cor.card, border: `1px solid ${cor.border}`,
                borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: cor.textMuted, fontSize: 12.5,
                width: "100%", maxWidth: 340, fontFamily: "inherit",
              }}>
              🔍 {t.buscar}
              <span style={{ marginLeft: "auto", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 4, padding: "1px 6px", fontSize: 10.5 }}>Ctrl K</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

{empresas.length > 1 && (
  <div style={{ position: "relative" }}>
    <button onClick={() => { setShowEmpresas(!showEmpresas); setShowTema(false); setShowIdioma(false); setNotifOpen(false); setPerfilOpen(false); }}
      disabled={trocandoEmpresa}
      style={{ display: "flex", alignItems: "center", gap: 6, background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, color: cor.textMuted, fontFamily: "sans-serif" }}>
      🏢 {empresas.find(e => e.id === empresaAtualId)?.nome || "Empresa"}
    </button>
    {showEmpresas && (
      <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: cor.sidebar, border: `1px solid ${cor.border}`, borderRadius: 10, overflow: "hidden", zIndex: 200, minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
        {empresas.map(emp => (
          <button key={emp.id} onClick={() => trocarEmpresa(emp.id)}
            style={{ display: "flex", flexDirection: "column", width: "100%", padding: "10px 14px", background: emp.id === empresaAtualId ? cor.card : "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "sans-serif", borderBottom: `1px solid ${cor.border}` }}>
            <span style={{ fontSize: 13, color: cor.text, fontWeight: emp.id === empresaAtualId ? 600 : 400 }}>{emp.nome}</span>
            <span style={{ fontSize: 11, color: cor.textMuted }}>{emp.role === "admin" ? "Administrador" : "Usuário"}</span>
          </button>
        ))}
      </div>
    )}
  </div>
)}

            <div style={{ position: "relative" }}>
              <button onClick={() => { setShowTema(!showTema); setShowIdioma(false); setNotifOpen(false); setPerfilOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, color: cor.textMuted, fontFamily: "sans-serif" }}>
                🎨 {tema === "preto" ? "🌑" : tema === "branco" ? "⚪" : "🔵"}
              </button>
              {showTema && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: cor.sidebar, border: `1px solid ${cor.border}`, borderRadius: 10, overflow: "hidden", zIndex: 200, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                  {[
                    { id: "preto", label: "🌑 Preto", sublabel: "Dark" },
                    { id: "branco", label: "⚪ Branco", sublabel: "Light" },
                    { id: "sistema", label: "🔵 Sistema", sublabel: "Navy" },
                  ].map(op => (
                    <button key={op.id} onClick={() => { setTema(op.id); setShowTema(false); }}
                      style={{ display: "flex", flexDirection: "column", width: "100%", padding: "10px 14px", background: tema === op.id ? cor.card : "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "sans-serif", borderBottom: `1px solid ${cor.border}` }}>
                      <span style={{ fontSize: 13, color: cor.text, fontWeight: tema === op.id ? 600 : 400 }}>{op.label}</span>
                      <span style={{ fontSize: 11, color: cor.textMuted }}>{op.sublabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button onClick={() => { setShowIdioma(!showIdioma); setShowTema(false); setNotifOpen(false); setPerfilOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, color: cor.textMuted, fontFamily: "sans-serif" }}>
                🌐 {idioma === "pt" ? "🇧🇷" : idioma === "en" ? "🇺🇸" : "🇪🇸"}
              </button>
              {showIdioma && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: cor.sidebar, border: `1px solid ${cor.border}`, borderRadius: 10, overflow: "hidden", zIndex: 200, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                  {[
                    { id: "pt", label: "🇧🇷 Português" },
                    { id: "en", label: "🇺🇸 English" },
                    { id: "es", label: "🇪🇸 Español" },
                  ].map(op => (
                    <button key={op.id} onClick={() => { setIdioma(op.id); setShowIdioma(false); }}
                      style={{ display: "flex", width: "100%", padding: "10px 14px", background: idioma === op.id ? cor.card : "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "sans-serif", fontSize: 13, color: cor.text, fontWeight: idioma === op.id ? 600 : 400, borderBottom: `1px solid ${cor.border}` }}>
                      {op.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button onClick={() => { setNotifOpen(!notifOpen); setShowTema(false); setShowIdioma(false); setPerfilOpen(false); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", position: "relative", color: cor.textMuted }}>
                🔔
              </button>
              {notifOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: cor.sidebar, border: `1px solid ${cor.border}`, borderRadius: 10, zIndex: 200, minWidth: 240, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", padding: 16 }}>
                  <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Notificações</p>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, margin: 0 }}>{t.semNotificacoes}</p>
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button onClick={() => { setPerfilOpen(!perfilOpen); setShowTema(false); setShowIdioma(false); setNotifOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                  R
                </div>
              </button>
              {perfilOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: cor.sidebar, border: `1px solid ${cor.border}`, borderRadius: 10, zIndex: 200, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", borderBottom: `1px solid ${cor.border}` }}>
                    <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Rodrigo</p>
                    <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>admin@apollo.com</p>
                  </div>
                  <button onClick={logout} style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "#f87171", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                    {t.sair}
                  </button>
                </div>
              )}
            </div>
          </div>

          {(showTema || showIdioma || notifOpen || perfilOpen) && (
            <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowTema(false); setShowIdioma(false); setNotifOpen(false); setPerfilOpen(false); }} />
          )}
        </div>

        <main style={{ flex: 1, padding: hasSidebar ? 30 : 0, background: cor.bg, transition: "all 0.3s" }}>
         <Outlet context={{ tema, idioma, cor, moeda }} />
        </main>
      </div>

      {buscaAberta && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setBuscaAberta(false)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <input
              ref={buscaInputRef}
              value={buscaTexto}
              onChange={e => setBuscaTexto(e.target.value)}
              placeholder={t.buscar}
              style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", borderBottom: `1px solid ${cor.border}`, color: cor.text, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <div style={{ maxHeight: 300, overflowY: "auto", padding: 8 }}>
              {resultadosBusca.length === 0 && (
                <p style={{ color: cor.textMuted, fontSize: 13, padding: 16, textAlign: "center" }}>Nenhum resultado.</p>
              )}
              {resultadosBusca.map(m => (
                <button key={m.path} onClick={() => { navigate(m.path); setBuscaAberta(false); setBuscaTexto(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: "none", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                  onMouseEnter={e => e.currentTarget.style.background = cor.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  <span style={{ color: cor.text, fontSize: 13.5 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        onMouseEnter={() => setAriaHover(true)}
        onMouseLeave={() => setAriaHover(false)}
        onClick={() => setAriaOpen(!ariaOpen)}
        style={{
          position: "fixed", bottom: 32, right: 32,
          display: "flex", alignItems: "center", gap: 10,
          background: ariaOpen ? "#222" : "linear-gradient(135deg, #a78bfa, #38bdf8)",
          borderRadius: ariaHover || ariaOpen ? 20 : "50%",
          padding: ariaHover || ariaOpen ? "14px 20px" : "16px",
          cursor: "pointer", zIndex: 998,
          boxShadow: "0 4px 24px rgba(167,139,250,0.4)",
          transition: "all 0.3s ease",
          width: ariaHover || ariaOpen ? "auto" : 56,
          height: ariaHover || ariaOpen ? "auto" : 56,
          border: ariaOpen ? "1px solid #333" : "none",
        }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>🤖</span>
        {(ariaHover || ariaOpen) && (
          <div>
            <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>Aria</p>
            <p style={{ color: ariaOpen ? "#4ade80" : "rgba(255,255,255,0.8)", fontSize: 11, margin: 0 }}>
              {ariaOpen ? "● Online" : "Assistente Virtual"}
            </p>
          </div>
        )}
      </div>

      {ariaOpen && (
        <div style={{
          position: "fixed", bottom: 100, right: 32,
          width: 360, height: 500, zIndex: 997,
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          border: "1px solid #222",
          display: "flex", flexDirection: "column",
          background: "#111",
          animation: "slideUp 0.3s ease",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #222", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>Aria</p>
              <p style={{ color: "#4ade80", fontSize: 11, margin: 0 }}>{t.ariaOnline}</p>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {mensagens.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "78%", padding: "9px 13px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? "#a78bfa" : "#1a1a1a",
                  border: msg.role === "user" ? "none" : "1px solid #222",
                  color: "#fff", fontSize: 13, lineHeight: 1.5,
                }}
                dangerouslySetInnerHTML={{ __html: formatarTexto(msg.text) }} />
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "14px 14px 14px 4px", padding: "9px 13px", display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", animation: `bounce 1s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "10px 14px", borderTop: "1px solid #222", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && enviarMensagem(input)}
              placeholder={t.ariaPlaceholder}
              style={{ flex: 1, padding: "9px 14px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, color: "#fff", fontSize: 13, outline: "none", fontFamily: "sans-serif" }}
              onFocus={e => e.target.style.borderColor = "#a78bfa"}
              onBlur={e => e.target.style.borderColor = "#333"}
            />
            <button onClick={() => enviarMensagem(input)} disabled={loading || !input.trim()} style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              background: input.trim() ? "#a78bfa" : "#333",
              color: "#fff", cursor: input.trim() ? "pointer" : "not-allowed",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s",
            }}>➤</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}