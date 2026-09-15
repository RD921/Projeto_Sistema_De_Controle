import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../api";

const modulosPorIdioma = {
  pt: {
    acessar: "Acessar módulo",
    tituloInstalados: "MÓDULOS INSTALADOS",
    nativos: [
      { id: "central", nome: "Central de Controle", descricao: "Visão geral, métricas e insights do seu negócio.", icon: "📊", cor: "#8b5cf6", bg: "#f3f0ff" },
      { id: "automacoes", nome: "Automações", descricao: "Crie fluxos inteligentes e automatize processos.", icon: "⚡", cor: "#f59e0b", bg: "#fffbeb" },
      { id: "financeiro", nome: "Financeiro", descricao: "Gerencie receitas, despesas, relatórios e fluxo de caixa.", icon: "💰", cor: "#10b981", bg: "#ecfdf5" },
      { id: "integracoes", nome: "Integrações", descricao: "Conecte Bling, Mercado Livre e outras plataformas.", icon: "🔗", cor: "#3b82f6", bg: "#eff6ff" },
      { id: "relatorios", nome: "Relatórios", descricao: "Vendas, clientes, logística e produtos em um só lugar.", icon: "📈", cor: "#0ea5e9", bg: "#eff6ff" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Gerencie seus produtos, pedidos e clientes em um só lugar.", icon: "🛒", cor: "#6366f1", bg: "#eef2ff", moduloId: "ecommerce" },
      { id: "marketing", nome: "Marketing", descricao: "Captação, funis de vendas e automação de marketing.", icon: "📣", cor: "#10b981", bg: "#ecfdf5", moduloId: "marketing" },
      { id: "atendimento", nome: "Atendimento", descricao: "Centralize conversas e ofereça suporte de qualidade.", icon: "🎧", cor: "#f59e0b", bg: "#fffbeb", moduloId: "atendimento" },
      { id: "logistica", nome: "Logística", descricao: "Gerencie envios, transportadoras e rastreamentos.", icon: "🚚", cor: "#3b82f6", bg: "#eff6ff", moduloId: "logistica" },
      { id: "crm", nome: "CRM", descricao: "Pipeline de vendas, oportunidades e relacionamento com clientes.", icon: "💼", cor: "#8b5cf6", bg: "#f3f0ff", moduloId: "crm" },
    ],
  },
  en: {
    acessar: "Open module",
    tituloInstalados: "INSTALLED MODULES",
    nativos: [
      { id: "central", nome: "Control Center", descricao: "Overview, metrics and insights for your business.", icon: "📊", cor: "#8b5cf6", bg: "#f3f0ff" },
      { id: "automacoes", nome: "Automations", descricao: "Create smart flows and automate processes.", icon: "⚡", cor: "#f59e0b", bg: "#fffbeb" },
      { id: "financeiro", nome: "Finance", descricao: "Manage revenue, expenses, reports and cash flow.", icon: "💰", cor: "#10b981", bg: "#ecfdf5" },
      { id: "integracoes", nome: "Integrations", descricao: "Connect Bling, Mercado Livre and other platforms.", icon: "🔗", cor: "#3b82f6", bg: "#eff6ff" },
      { id: "relatorios", nome: "Reports", descricao: "Sales, customers, logistics and products in one place.", icon: "📈", cor: "#0ea5e9", bg: "#eff6ff" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Manage your products, orders and customers in one place.", icon: "🛒", cor: "#6366f1", bg: "#eef2ff", moduloId: "ecommerce" },
      { id: "marketing", nome: "Marketing", descricao: "Lead capture, sales funnels and marketing automation.", icon: "📣", cor: "#10b981", bg: "#ecfdf5", moduloId: "marketing" },
      { id: "atendimento", nome: "Support", descricao: "Centralize conversations and provide quality support.", icon: "🎧", cor: "#f59e0b", bg: "#fffbeb", moduloId: "atendimento" },
      { id: "logistica", nome: "Logistics", descricao: "Manage shipments, carriers and tracking.", icon: "🚚", cor: "#3b82f6", bg: "#eff6ff", moduloId: "logistica" },
      { id: "crm", nome: "CRM", descricao: "Sales pipeline, deals and customer relationship management.", icon: "💼", cor: "#8b5cf6", bg: "#f3f0ff", moduloId: "crm" },
    ],
  },
  es: {
    acessar: "Abrir módulo",
    tituloInstalados: "MÓDULOS INSTALADOS",
    nativos: [
      { id: "central", nome: "Centro de Control", descricao: "Visión general, métricas e insights de tu negocio.", icon: "📊", cor: "#8b5cf6", bg: "#f3f0ff" },
      { id: "automacoes", nome: "Automatizaciones", descricao: "Crea flujos inteligentes y automatiza procesos.", icon: "⚡", cor: "#f59e0b", bg: "#fffbeb" },
      { id: "financeiro", nome: "Financiero", descricao: "Gestiona ingresos, gastos, informes y flujo de caja.", icon: "💰", cor: "#10b981", bg: "#ecfdf5" },
      { id: "integracoes", nome: "Integraciones", descricao: "Conecta Bling, Mercado Libre y otras plataformas.", icon: "🔗", cor: "#3b82f6", bg: "#eff6ff" },
      { id: "relatorios", nome: "Informes", descricao: "Ventas, clientes, logística y productos en un solo lugar.", icon: "📈", cor: "#0ea5e9", bg: "#eff6ff" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Gestiona tus productos, pedidos y clientes en un solo lugar.", icon: "🛒", cor: "#6366f1", bg: "#eef2ff", moduloId: "ecommerce" },
      { id: "marketing", nome: "Marketing", descricao: "Captación, embudos de ventas y automatización de marketing.", icon: "📣", cor: "#10b981", bg: "#ecfdf5", moduloId: "marketing" },
      { id: "atendimento", nome: "Atención", descricao: "Centraliza conversaciones y ofrece soporte de calidad.", icon: "🎧", cor: "#f59e0b", bg: "#fffbeb", moduloId: "atendimento" },
      { id: "logistica", nome: "Logística", descricao: "Gestiona envíos, transportistas y rastreos.", icon: "🚚", cor: "#3b82f6", bg: "#eff6ff", moduloId: "logistica" },
      { id: "crm", nome: "CRM", descricao: "Pipeline de ventas, oportunidades y relación con clientes.", icon: "💼", cor: "#8b5cf6", bg: "#f3f0ff", moduloId: "crm" },
    ],
  },
};

function ModuloCard({ mod, onClick, cor, acessarLabel, statusModulo }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: cor.card,
        border: `1px solid ${hover ? mod.cor + "55" : cor.border}`,
        borderRadius: 18, padding: 24, cursor: "pointer",
        transition: "all 0.25s", position: "relative", overflow: "hidden",
        boxShadow: hover ? `0 12px 32px ${mod.cor}22` : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        minHeight: 220, display: "flex", flexDirection: "column",
      }}
      onClick={onClick}>
      {statusModulo && (
        <span style={{
          position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 700,
          padding: "3px 10px", borderRadius: 20,
          background: "#dcfce7", color: "#16a34a",
        }}>
          ✓ Instalado
        </span>
      )}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: mod.bg, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, marginBottom: 18,
      }}>
        {mod.icon}
      </div>
      <h2 style={{ color: cor.text, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{mod.nome}</h2>
      <p style={{ color: cor.textMuted, fontSize: 13, lineHeight: 1.5, marginBottom: 20, flex: 1 }}>{mod.descricao}</p>
      <button style={{
        alignSelf: "flex-start",
        background: mod.cor, color: "#fff", border: "none",
        borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        fontFamily: "inherit", transition: "all 0.2s",
        transform: hover ? "translateX(2px)" : "translateX(0)",
      }}>
        {acessarLabel} →
      </button>
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
    if (id === "atendimento") navigate("/loja-modulos");
    if (id === "crm") navigate("/crm/pipeline");
    if (id === "relatorios") navigate("/relatorios/vendas");
    if (id === "logistica") navigate("/logistica/dashboard");
  };

  const instaladosVisiveis = modulosInstalados
    ? t.instalaveis.filter(mod => modulosInstalados[mod.moduloId])
    : [];

  return (
    <div style={{ minHeight: "100vh", background: cor.bg, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", position: "relative", transition: "all 0.3s" }}>

      <div style={{ padding: "40px 40px 0" }}>

        {/* MÓDULOS NATIVOS — sempre no topo, sem selo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18, marginBottom: 28 }}>
          {t.nativos.map(mod => (
            <ModuloCard
              key={mod.id} mod={mod} cor={cor} acessarLabel={t.acessar}
              onClick={() => irPara(mod.id)}
              statusModulo={null}
            />
          ))}
        </div>

        {/* MÓDULOS INSTALADOS — só aparece o que está de fato instalado */}
        {instaladosVisiveis.length > 0 && (
          <>
            <p style={{ color: "#7c3aed", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 14px" }}>
              ● {t.tituloInstalados}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18, marginBottom: 20 }}>
              {instaladosVisiveis.map(mod => (
                <ModuloCard
                  key={mod.id} mod={mod} cor={cor} acessarLabel={t.acessar}
                  onClick={() => irPara(mod.id)}
                  statusModulo="instalado"
                />
              ))}
            </div>
          </>
        )}

        {/* BANNER LOJA DE MÓDULOS */}
        <div style={{
          background: "linear-gradient(135deg, #a78bfa15, #38bdf815)", border: `1px solid ${cor.border}`,
          borderRadius: 16, padding: "18px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, marginBottom: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#a78bfa22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🧩</div>
            <div>
              <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, margin: 0 }}>Loja de Módulos</p>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "2px 0 0" }}>Veja todos os módulos disponíveis e instale novos quando precisar.</p>
            </div>
          </div>
          <button onClick={() => navigate("/loja-modulos")} style={{
            background: "#7c3aed", border: "none", color: "#fff",
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}>
            Ver todos os módulos →
          </button>
        </div>
      </div>
    </div>
  );
}