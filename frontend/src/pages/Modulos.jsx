import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../api";

const modulosPorIdioma = {
  pt: {
    tituloModulos: "Módulos",
    subtituloModulos: "Acesse rapidamente os módulos do seu sistema.",
    verTodos: "Ver todos",
    tituloInstalados: "Módulos Instalados",
    subtituloInstalados: "Funcionalidades que já fazem parte do seu plano.",
    nativos: [
      { id: "central", nome: "Central de Controle", descricao: "Visão geral, métricas e insights do seu negócio.", icon: "📊", cor: "#8b5cf6" },
      { id: "automacoes", nome: "Automações", descricao: "Crie fluxos e automatize processos do seu dia a dia.", icon: "⚡", cor: "#f59e0b" },
      { id: "financeiro", nome: "Financeiro", descricao: "Controle suas finanças, fluxo de caixa e muito mais.", icon: "💰", cor: "#10b981" },
      { id: "integracoes", nome: "Integrações", descricao: "Conecte seus canais de venda, marketplaces e serviços.", icon: "🔗", cor: "#3b82f6" },
      { id: "relatorios", nome: "Relatórios", descricao: "Vendas, clientes, logística e produtos em um só lugar.", icon: "📈", cor: "#0ea5e9" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Gerencie seus produtos, pedidos e clientes em um só lugar.", icon: "🛒", cor: "#6366f1", moduloId: "ecommerce" },
      { id: "marketing", nome: "Marketing", descricao: "Crie campanhas e aumente suas vendas.", icon: "📣", cor: "#10b981", moduloId: "marketing" },
      { id: "logistica", nome: "Logística", descricao: "Rastreie pedidos e otimize suas entregas.", icon: "🚚", cor: "#3b82f6", moduloId: "logistica" },
      { id: "crm", nome: "CRM", descricao: "Pipeline de vendas, oportunidades e relacionamento com clientes.", icon: "💼", cor: "#8b5cf6", moduloId: "crm" },
    ],
  },
  en: {
    tituloModulos: "Modules",
    subtituloModulos: "Quickly access your system's modules.",
    verTodos: "See all",
    tituloInstalados: "Installed Modules",
    subtituloInstalados: "Features already part of your plan.",
    nativos: [
      { id: "central", nome: "Control Center", descricao: "Overview, metrics and insights for your business.", icon: "📊", cor: "#8b5cf6" },
      { id: "automacoes", nome: "Automations", descricao: "Create flows and automate your everyday processes.", icon: "⚡", cor: "#f59e0b" },
      { id: "financeiro", nome: "Finance", descricao: "Manage your finances, cash flow and much more.", icon: "💰", cor: "#10b981" },
      { id: "integracoes", nome: "Integrations", descricao: "Connect your sales channels, marketplaces and services.", icon: "🔗", cor: "#3b82f6" },
      { id: "relatorios", nome: "Reports", descricao: "Sales, customers, logistics and products in one place.", icon: "📈", cor: "#0ea5e9" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Manage your products, orders and customers in one place.", icon: "🛒", cor: "#6366f1", moduloId: "ecommerce" },
      { id: "marketing", nome: "Marketing", descricao: "Create campaigns and boost your sales.", icon: "📣", cor: "#10b981", moduloId: "marketing" },
      { id: "logistica", nome: "Logistics", descricao: "Track orders and optimize your deliveries.", icon: "🚚", cor: "#3b82f6", moduloId: "logistica" },
      { id: "crm", nome: "CRM", descricao: "Sales pipeline, deals and customer relationship management.", icon: "💼", cor: "#8b5cf6", moduloId: "crm" },
    ],
  },
  es: {
    tituloModulos: "Módulos",
    subtituloModulos: "Accede rápidamente a los módulos de tu sistema.",
    verTodos: "Ver todos",
    tituloInstalados: "Módulos Instalados",
    subtituloInstalados: "Funcionalidades que ya forman parte de tu plan.",
    nativos: [
      { id: "central", nome: "Centro de Control", descricao: "Visión general, métricas e insights de tu negocio.", icon: "📊", cor: "#8b5cf6" },
      { id: "automacoes", nome: "Automatizaciones", descricao: "Crea flujos y automatiza tus procesos diarios.", icon: "⚡", cor: "#f59e0b" },
      { id: "financeiro", nome: "Financiero", descricao: "Gestiona tus finanzas, flujo de caja y mucho más.", icon: "💰", cor: "#10b981" },
      { id: "integracoes", nome: "Integraciones", descricao: "Conecta tus canales de venta, marketplaces y servicios.", icon: "🔗", cor: "#3b82f6" },
      { id: "relatorios", nome: "Informes", descricao: "Ventas, clientes, logística y productos en un solo lugar.", icon: "📈", cor: "#0ea5e9" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Gestiona tus productos, pedidos y clientes en un solo lugar.", icon: "🛒", cor: "#6366f1", moduloId: "ecommerce" },
      { id: "marketing", nome: "Marketing", descricao: "Crea campañas y aumenta tus ventas.", icon: "📣", cor: "#10b981", moduloId: "marketing" },
      { id: "logistica", nome: "Logística", descricao: "Rastrea pedidos y optimiza tus entregas.", icon: "🚚", cor: "#3b82f6", moduloId: "logistica" },
      { id: "crm", nome: "CRM", descricao: "Pipeline de ventas, oportunidades y relación con clientes.", icon: "💼", cor: "#8b5cf6", moduloId: "crm" },
    ],
  },
};

function ModuloCard({ mod, onClick, cor }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
      style={{
        background: cor.card,
        border: `1px solid ${hover ? mod.cor + "40" : cor.border}`,
        borderRadius: 16, padding: 20, cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: hover ? `0 8px 24px ${mod.cor}1a` : "none",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11,
          background: `linear-gradient(135deg, ${mod.cor}, ${mod.cor}99)`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>
          {mod.icon}
        </div>
        <span style={{
          color: cor.textMuted, fontSize: 16, lineHeight: 1,
          opacity: hover ? 1 : 0.45, transition: "all 0.2s ease",
          transform: hover ? "translateX(2px)" : "translateX(0)",
        }}>›</span>
      </div>
      <h3 style={{ color: cor.text, fontSize: 14.5, fontWeight: 700, margin: "0 0 5px" }}>{mod.nome}</h3>
      <p style={{ color: cor.textMuted, fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{mod.descricao}</p>
    </div>
  );
}

function CabecalhoSecao({ titulo, subtitulo, cor, acao }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: cor.cardHover,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, color: cor.textMuted, flexShrink: 0,
        }}>▦</div>
        <div>
          <h2 style={{ color: cor.text, fontSize: 15.5, fontWeight: 700, margin: 0 }}>{titulo}</h2>
          <p style={{ color: cor.textMuted, fontSize: 12.5, margin: "2px 0 0" }}>{subtitulo}</p>
        </div>
      </div>
      {acao}
    </div>
  );
}

export default function Modulos() {
  const navigate = useNavigate();
  const { tema, idioma, cor } = useOutletContext();
  const [modulosInstalados, setModulosInstalados] = useState(null);

  const t = modulosPorIdioma[idioma] || modulosPorIdioma.pt;

  useEffect(() => {
    api.get("/modules").then(r => {
      const mapa = {};
      (r.data || []).forEach(m => { mapa[m.id] = m.instalado; });
      setModulosInstalados(mapa);
    }).catch(() => setModulosInstalados({}));
  }, []);

  const irPara = (id) => {
    if (id === "central") navigate("/central-controle");
    if (id === "ecommerce") navigate("/products");
    if (id === "marketing") navigate("/marketing");
    if (id === "automacoes") navigate("/automacoes");
    if (id === "integracoes") navigate("/integracoes");
    if (id === "financeiro") navigate("/financeiro");
    if (id === "crm") navigate("/crm/pipeline");
    if (id === "relatorios") navigate("/relatorios/vendas");
    if (id === "logistica") navigate("/logistica/dashboard");
  };

  const instaladosVisiveis = modulosInstalados
    ? t.instalaveis.filter(mod => modulosInstalados[mod.moduloId])
    : [];

  const linkVerTodos = (
    <span onClick={() => navigate("/loja-modulos")} style={{
      color: cor.accent || "#38bdf8", fontSize: 13, fontWeight: 600,
      cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {t.verTodos} →
    </span>
  );

  return (
    <div style={{ minHeight: "100vh", background: cor.bg, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", position: "relative", transition: "all 0.3s" }}>

      <div style={{ padding: "40px 40px 60px" }}>

        <CabecalhoSecao titulo={t.tituloModulos} subtitulo={t.subtituloModulos} cor={cor} acao={linkVerTodos} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginBottom: 32 }}>
          {t.nativos.map(mod => (
            <ModuloCard key={mod.id} mod={mod} cor={cor} onClick={() => irPara(mod.id)} />
          ))}
        </div>

        {instaladosVisiveis.length > 0 && (
          <>
            <CabecalhoSecao titulo={t.tituloInstalados} subtitulo={t.subtituloInstalados} cor={cor} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
              {instaladosVisiveis.map(mod => (
                <ModuloCard key={mod.id} mod={mod} cor={cor} onClick={() => irPara(mod.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}