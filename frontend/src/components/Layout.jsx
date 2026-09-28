import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import api from "../api";
import { temas, getTemaSalvo, salvarTema, getIdiomaSalvo, salvarIdioma } from "../theme";
import AriaAssistant from "./AriaAssistant";

const traducoes = {
  pt: {
    modulos: "Módulos", ecommerce: "E-commerce", marketing: "Marketing", central: "Central de Controle", integracoes: "Integrações",
    dashboard: "Dashboard", produtos: "Produtos", pedidos: "Pedidos",
    clientes: "Clientes", sair: "Sair",
    visaoGeral: "Visão Geral",
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
    tema: "Tema", idioma: "Idioma", buscar: "Buscar en todo...",
    semNotificacoes: "Sin notificaciones nuevas",
    canaisVenda: "Canales de Venta y Marketplaces", logistica: "Logística y Envío",
    fiscal: "Emisión de Factura", pagamentos: "Pasarelas de Pago",
    financeiro: "Financiero",
  },
};

const CHAVE_PINS = "midnight_pinned_modulos";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tema, setTemaState] = useState(getTemaSalvo);
  const setTema = (novoTema) => { salvarTema(novoTema); setTemaState(novoTema); };
  const [idioma, setIdiomaState] = useState(getIdiomaSalvo);
  const setIdioma = (novoIdioma) => { salvarIdioma(novoIdioma); setIdiomaState(novoIdioma); };
  const [sidebarColapsada, setSidebarColapsada] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [modulosInstalados, setModulosInstalados] = useState({});
  const [contabilExpandido, setContabilExpandido] = useState(false);
  const buscaInputRef = useRef(null);
  const [showEmpresas, setShowEmpresas] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresaAtualId, setEmpresaAtualId] = useState(null);
  const [trocandoEmpresa, setTrocandoEmpresa] = useState(false);
  const moeda = empresas.find(e => e.id === empresaAtualId)?.moeda || "BRL";

  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_PINS)) || []; } catch { return []; }
  });
  const [pickerAberto, setPickerAberto] = useState(false);

  const t = traducoes[idioma];
  const cor = temas[tema];

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenant_id");
    navigate("/login");
  };

  useEffect(() => {
    api.get("/modules").then(r => {
      const mapa = {};
      (r.data || []).forEach(m => { mapa[m.id] = m.instalado; });
      setModulosInstalados(mapa);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.background = cor.bg;
  }, [cor.bg]);

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
        setPickerAberto(false);
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

  const isCentral = location.pathname.startsWith("/central-controle");
  const isEcommerce = ["/products", "/orders", "/customers"].includes(location.pathname);
  const isIntegracoes = location.pathname.startsWith("/integracoes");
  const isMarketing = location.pathname.startsWith("/marketing");
  const isFinanceiro = location.pathname.startsWith("/financeiro");
  const isAutomacoes = location.pathname.startsWith("/automacoes") && !location.pathname.includes("/editor");
  const isCRM = location.pathname.startsWith("/crm");
  const isLogistica = location.pathname.startsWith("/logistica");
  const isConfiguracoes = location.pathname.startsWith("/configuracoes");
  const isRelatorios = location.pathname.startsWith("/relatorios");
  const hasSidebar = isEcommerce || isMarketing || isCentral || isIntegracoes || isFinanceiro || isAutomacoes || isCRM || isLogistica || isConfiguracoes || isRelatorios;

  const centralLinks = [
    { to: "/central-controle/resumo", label: "Resumo", icon: "📊" },
    ...(modulosInstalados.financeiro ? [{ to: "/central-controle/financeiro", label: "Financeiro", icon: "💰" }] : []),
    ...(modulosInstalados.ecommerce ? [{ to: "/central-controle/ecommerce", label: "E-commerce", icon: "🛒" }] : []),
    ...(modulosInstalados.crm ? [{ to: "/central-controle/crm", label: "CRM", icon: "🤝" }] : []),
    ...(modulosInstalados.marketing ? [{ to: "/central-controle/marketing", label: "Marketing", icon: "📣" }] : []),
    ...(modulosInstalados.logistica ? [{ to: "/central-controle/logistica", label: "Logística", icon: "🚚" }] : []),
    ...(modulosInstalados.integracoes ? [{ to: "/central-controle/integracoes", label: "Integrações", icon: "🔗" }] : []),
    ...(modulosInstalados.automacoes ? [{ to: "/central-controle/automacoes", label: "Automações", icon: "⚡" }] : []),
    { to: "/central-controle/relatorios", label: "Relatórios", icon: "📈" },
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

  const configuracoesLinks = [
    { to: "/configuracoes/visao-geral", label: "Visão Geral", icon: "📊" },
    { grupo: "EMPRESA" },
    { to: "/configuracoes/tipo-empresa", label: "Empresa e Tipo Jurídico", icon: "🏢" },
    { grupo: "CONTA" },
    { to: "/configuracoes/conta", label: "Minha Conta", icon: "👤" },
    { to: "/configuracoes/usuarios", label: "Usuários e Permissões", icon: "👥" },
    { grupo: "SISTEMA" },
    { to: "/configuracoes/aparencia", label: "Aparência e Idioma", icon: "🎨" },
    { to: "/configuracoes/sistema", label: "Sistema", icon: "⚙️" },
    { to: "/configuracoes/notificacoes", label: "Notificações", icon: "🔔" },
    { grupo: "SERVIÇOS" },
    { to: "/configuracoes/pagamento", label: "Pagamento", icon: "💳" },
    { to: "/configuracoes/sac", label: "SAC / Atendimento", icon: "🎧" },
    { grupo: "SEGURANÇA" },
    { to: "/configuracoes/backup", label: "Backup e Segurança", icon: "🛡️" },
    { grupo: "INTELIGÊNCIA" },
    { to: "/configuracoes/ia", label: "Configuração da IA", icon: "🧠" },
    { to: "/configuracoes/auditoria", label: "Auditoria", icon: "📋" },
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
    { to: "/logistica/entregas", label: "Entregas", icon: "📦" },
    { to: "/logistica/depositos", label: "Depósitos", icon: "🏭" },
    { to: "/logistica/transferencias", label: "Transferências", icon: "🔄" },
    { to: "/logistica/transportadoras", label: "Transportadoras", icon: "🚛" },
    { to: "/logistica/devolucoes", label: "Devoluções", icon: "↩️" },
    { to: "/logistica/indicadores", label: "Indicadores", icon: "📈" },
    { to: "/logistica/custos", label: "Custos", icon: "💸" },
    { to: "/logistica/alertas", label: "Alertas", icon: "🚨" },
    { to: "/logistica/simulador", label: "Simulador", icon: "🔮" },
    { to: "/logistica/compras", label: "Compras", icon: "🛒" },
  ];

  const relatoriosLinks = [
    { to: "/relatorios/executivo", label: "Executivo", icon: "📊" },
    { to: "/relatorios/vendas", label: "Vendas", icon: "💰" },
    { to: "/relatorios/clientes", label: "Clientes", icon: "👥" },
    { to: "/relatorios/logistica", label: "Logística", icon: "🚚" },
    { to: "/relatorios/produtos", label: "Produtos", icon: "📦" },
    { to: "/relatorios/marketplaces", label: "Marketplaces", icon: "🛒" },
  ];

  const linksAtivos = isCentral ? centralLinks
  : isMarketing ? marketingLinks
  : isIntegracoes ? integracoesLinks
  : isFinanceiro ? financeiroLinks
  : isAutomacoes ? automacoesLinks
  : isCRM ? crmLinks
  : isLogistica ? logisticaLinks
  : isConfiguracoes ? configuracoesLinks
  : isRelatorios ? relatoriosLinks
  : ecommerceLinks;

  const tituloSecao = isCentral ? t.central
  : isMarketing ? t.marketing
  : isIntegracoes ? t.integracoes
  : isFinanceiro ? t.financeiro
  : isAutomacoes ? "Automações"
  : isCRM ? "CRM"
  : isLogistica ? "Logística"
  : isConfiguracoes ? "Configurações"
  : isRelatorios ? "Relatórios"
  : "";

  const PIN_CATALOGO = [
    { id: "central", label: "Central de Controle", path: "/central-controle/resumo", icon: "📊", sempre: true },
    { id: "ecommerce", label: "E-commerce", path: "/products", icon: "🛒" },
    { id: "marketing", label: "Marketing", path: "/marketing/visao-geral", icon: "📣" },
    { id: "crm", label: "CRM", path: "/crm/pipeline", icon: "💼", sempre: true },
    { id: "integracoes", label: "Integrações", path: "/integracoes/canais-venda", icon: "🔗", sempre: true },
    { id: "financeiro", label: "Financeiro", path: "/financeiro/resumo", icon: "💰", sempre: true },
    { id: "logistica", label: "Logística", path: "/logistica/dashboard", icon: "🚚" },
    { id: "automacoes", label: "Automações", path: "/automacoes/minhas", icon: "⚡", sempre: true },
    { id: "relatorios", label: "Relatórios", path: "/relatorios/vendas", icon: "📈", sempre: true },
    { id: "configuracoes", label: "Configurações", path: "/configuracoes/visao-geral", icon: "⚙️", sempre: true },
  ];
  const modulosDisponiveis = PIN_CATALOGO.filter(m => m.sempre || modulosInstalados[m.id]);

  const MODULOS_BUSCA = [
    ...PIN_CATALOGO,
    { id: "assistente", label: "Assistente Aria", path: "/assistente", icon: "🤖", sempre: true },
  ];
  const resultadosBusca = buscaTexto.trim()
    ? MODULOS_BUSCA.filter(m => m.label.toLowerCase().includes(buscaTexto.toLowerCase()))
    : MODULOS_BUSCA.filter(m => m.sempre || modulosInstalados[m.id]);

  const togglePin = (id) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      try { localStorage.setItem(CHAVE_PINS, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", position: "relative", background: cor.bg, transition: "all 0.3s" }}>

      {hasSidebar ? (
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

          {linksAtivos.map((n, idx) => {
            if (n.grupo) {
              if (sidebarColapsada) return null;
              return (
                <p key={`grupo-${idx}`} style={{ color: cor.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "14px 20px 4px", margin: 0, opacity: 0.7 }}>
                  {n.grupo}
                </p>
              );
            }
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
      ) : (
        <aside style={{
          width: 64, background: cor.sidebar, borderRight: `1px solid ${cor.border}`,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "16px 0", gap: 6, flexShrink: 0,
        }}>
          <button onClick={() => navigate("/")} title="MidNight" style={{
            width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)", color: "#fff",
            fontWeight: 800, fontSize: 14, marginBottom: 10, fontFamily: "inherit",
          }}>M</button>

          <button onClick={() => setPickerAberto(true)} title="Adicionar módulo" style={{
            width: 36, height: 36, borderRadius: 10, cursor: "pointer",
            background: "none", border: `1.5px dashed ${cor.border}`, color: cor.textMuted,
            fontSize: 18, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center",
          }}>+</button>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", alignItems: "center", overflowY: "auto" }}>
            {pinnedIds.map(id => {
              const modulo = PIN_CATALOGO.find(m => m.id === id);
              if (!modulo) return null;
              return (
                <button key={id} onClick={() => navigate(modulo.path)} title={modulo.label}
                  style={{
                    width: 40, height: 40, borderRadius: 10, cursor: "pointer",
                    background: "none", border: "1px solid transparent", color: cor.text, fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {modulo.icon}
                </button>
              );
            })}
          </div>
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
                <button onClick={() => { setShowEmpresas(!showEmpresas); setNotifOpen(false); setPerfilOpen(false); }}
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
              <button onClick={() => { setNotifOpen(!notifOpen); setPerfilOpen(false); }}
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
              <button onClick={() => { setPerfilOpen(!perfilOpen); setNotifOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #38bdf8, #0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                  R
                </div>
              </button>
              {perfilOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: cor.sidebar, border: `1px solid ${cor.border}`, borderRadius: 10, zIndex: 200, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", borderBottom: `1px solid ${cor.border}` }}>
                    <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Rodrigo</p>
                    <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>admin@apollo.com</p>
                  </div>
                  <button onClick={() => navigate("/configuracoes/visao-geral")} style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", color: cor.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                    ⚙️ Configurações
                  </button>
                  <button onClick={logout} style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "#f87171", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                    {t.sair}
                  </button>
                </div>
              )}
            </div>
          </div>

          {(showEmpresas || notifOpen || perfilOpen) && (
            <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowEmpresas(false); setNotifOpen(false); setPerfilOpen(false); }} />
          )}
        </div>

        <main style={{ flex: 1, padding: hasSidebar ? 30 : 0, background: cor.bg, transition: "all 0.3s" }}>
          <Outlet context={{ tema, setTema, idioma, setIdioma, cor, moeda }} />
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

      {pickerAberto && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setPickerAberto(false)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", padding: 20 }}>
            <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>Personalizar barra lateral</p>
            <p style={{ color: cor.textMuted, fontSize: 12, margin: "0 0 16px" }}>Escolha quais módulos ficam fixados como ícone aqui na Home.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
              {modulosDisponiveis.map(m => {
                const fixado = pinnedIds.includes(m.id);
                return (
                  <button key={m.id} onClick={() => togglePin(m.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                      background: fixado ? cor.cardHover : "none", border: `1px solid ${fixado ? cor.border : "transparent"}`,
                      borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    }}>
                    <span style={{ fontSize: 17 }}>{m.icon}</span>
                    <span style={{ color: cor.text, fontSize: 13, flex: 1 }}>{m.label}</span>
                    <span style={{
                      width: 34, height: 20, borderRadius: 20, background: fixado ? (cor.accent || "#38bdf8") : cor.border,
                      position: "relative", transition: "background 0.15s", flexShrink: 0,
                    }}>
                      <span style={{
                        position: "absolute", top: 2, left: fixado ? 16 : 2, width: 16, height: 16, borderRadius: "50%",
                        background: "#fff", transition: "left 0.15s",
                      }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AriaAssistant idioma={idioma} />
    </div>
  );
}