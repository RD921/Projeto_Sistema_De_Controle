import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../api";

const modulosPorIdioma = {
  pt: {
    badge: "BEM-VINDO",
    ola: "Olá, Rodrigo!",
    subtitulo: "Selecione um módulo para começar a gerenciar seu negócio.",
    aria: "Assistente Virtual",
    dicaTitulo: "Dica rápida",
    dicaTexto: "Explore os módulos e descubra como o Apollo pode otimizar seu tempo e aumentar seus resultados.",
    dicaBtn: "✨ Ver novidades",
    acessar: "Acessar módulo",
    tituloInstalados: "MÓDULOS INSTALADOS",
    nativos: [
      { id: "central", nome: "Central de Controle", descricao: "Visão geral, métricas e insights do seu negócio.", icon: "📊", cor: "#8b5cf6", bg: "#f3f0ff" },
      { id: "automacoes", nome: "Automações", descricao: "Crie fluxos inteligentes e automatize processos.", icon: "⚡", cor: "#f59e0b", bg: "#fffbeb" },
      { id: "financeiro", nome: "Financeiro", descricao: "Gerencie receitas, despesas, relatórios e fluxo de caixa.", icon: "💰", cor: "#10b981", bg: "#ecfdf5" },
      { id: "integracoes", nome: "Integrações", descricao: "Conecte Bling, Mercado Livre e outras plataformas.", icon: "🔗", cor: "#3b82f6", bg: "#eff6ff" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Gerencie seus produtos, pedidos e clientes em um só lugar.", icon: "🛒", cor: "#6366f1", bg: "#eef2ff", moduloId: "produtos" },
      { id: "marketing", nome: "Marketing", descricao: "Captação, funis de vendas e automação de marketing.", icon: "📣", cor: "#10b981", bg: "#ecfdf5", moduloId: "marketing" },
      { id: "atendimento", nome: "Atendimento", descricao: "Centralize conversas e ofereça suporte de qualidade.", icon: "🎧", cor: "#f59e0b", bg: "#fffbeb", moduloId: "atendimento" },
      { id: "logistica", nome: "Logística", descricao: "Gerencie envios, transportadoras e rastreamentos.", icon: "🚚", cor: "#3b82f6", bg: "#eff6ff", moduloId: "logistica" },
    ],
  },
  en: {
    badge: "WELCOME",
    ola: "Hi, Rodrigo!",
    subtitulo: "Select a module to start managing your business.",
    aria: "Virtual Assistant",
    dicaTitulo: "Quick tip",
    dicaTexto: "Explore the modules and discover how Apollo can optimize your time and boost your results.",
    dicaBtn: "✨ See what's new",
    acessar: "Open module",
    tituloInstalados: "INSTALLED MODULES",
    nativos: [
      { id: "central", nome: "Control Center", descricao: "Overview, metrics and insights for your business.", icon: "📊", cor: "#8b5cf6", bg: "#f3f0ff" },
      { id: "automacoes", nome: "Automations", descricao: "Create smart flows and automate processes.", icon: "⚡", cor: "#f59e0b", bg: "#fffbeb" },
      { id: "financeiro", nome: "Finance", descricao: "Manage revenue, expenses, reports and cash flow.", icon: "💰", cor: "#10b981", bg: "#ecfdf5" },
      { id: "integracoes", nome: "Integrations", descricao: "Connect Bling, Mercado Livre and other platforms.", icon: "🔗", cor: "#3b82f6", bg: "#eff6ff" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Manage your products, orders and customers in one place.", icon: "🛒", cor: "#6366f1", bg: "#eef2ff", moduloId: "produtos" },
      { id: "marketing", nome: "Marketing", descricao: "Lead capture, sales funnels and marketing automation.", icon: "📣", cor: "#10b981", bg: "#ecfdf5", moduloId: "marketing" },
      { id: "atendimento", nome: "Support", descricao: "Centralize conversations and provide quality support.", icon: "🎧", cor: "#f59e0b", bg: "#fffbeb", moduloId: "atendimento" },
      { id: "logistica", nome: "Logistics", descricao: "Manage shipments, carriers and tracking.", icon: "🚚", cor: "#3b82f6", bg: "#eff6ff", moduloId: "logistica" },
    ],
  },
  es: {
    badge: "BIENVENIDO",
    ola: "¡Hola, Rodrigo!",
    subtitulo: "Selecciona un módulo para comenzar a gestionar tu negocio.",
    aria: "Asistente Virtual",
    dicaTitulo: "Consejo rápido",
    dicaTexto: "Explora los módulos y descubre cómo Apollo puede optimizar tu tiempo y aumentar tus resultados.",
    dicaBtn: "✨ Ver novedades",
    acessar: "Abrir módulo",
    tituloInstalados: "MÓDULOS INSTALADOS",
    nativos: [
      { id: "central", nome: "Centro de Control", descricao: "Visión general, métricas e insights de tu negocio.", icon: "📊", cor: "#8b5cf6", bg: "#f3f0ff" },
      { id: "automacoes", nome: "Automatizaciones", descricao: "Crea flujos inteligentes y automatiza procesos.", icon: "⚡", cor: "#f59e0b", bg: "#fffbeb" },
      { id: "financeiro", nome: "Financiero", descricao: "Gestiona ingresos, gastos, informes y flujo de caja.", icon: "💰", cor: "#10b981", bg: "#ecfdf5" },
      { id: "integracoes", nome: "Integraciones", descricao: "Conecta Bling, Mercado Libre y otras plataformas.", icon: "🔗", cor: "#3b82f6", bg: "#eff6ff" },
    ],
    instalaveis: [
      { id: "ecommerce", nome: "E-commerce", descricao: "Gestiona tus productos, pedidos y clientes en un solo lugar.", icon: "🛒", cor: "#6366f1", bg: "#eef2ff", moduloId: "produtos" },
      { id: "marketing", nome: "Marketing", descricao: "Captación, embudos de ventas y automatización de marketing.", icon: "📣", cor: "#10b981", bg: "#ecfdf5", moduloId: "marketing" },
      { id: "atendimento", nome: "Atención", descricao: "Centraliza conversaciones y ofrece soporte de calidad.", icon: "🎧", cor: "#f59e0b", bg: "#fffbeb", moduloId: "atendimento" },
      { id: "logistica", nome: "Logística", descricao: "Gestiona envíos, transportistas y rastreos.", icon: "🚚", cor: "#3b82f6", bg: "#eff6ff", moduloId: "logistica" },
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
          background: statusModulo === "instalado" ? "#dcfce7" : "#f4f4f5",
          color: statusModulo === "instalado" ? "#16a34a" : "#a3a3a3",
        }}>
          {statusModulo === "instalado" ? "✓ Instalado" : "Não instalado"}
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
  const [ariaHover, setAriaHover] = useState(false);
  const [ariaOpen, setAriaOpen] = useState(false);
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
    if (id === "atendimento") navigate("/loja-modulos"); // ainda sem página própria
    if (id === "logistica") navigate("/loja-modulos"); // ainda sem página própria
  };

  return (
    <div style={{ minHeight: "100vh", background: cor.bg, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", position: "relative", transition: "all 0.3s" }}>

      <div style={{ padding: "40px 40px 0" }}>

        {/* HERO */}
        <div style={{
          background: cor.card, border: `1px solid ${cor.border}`,
          borderRadius: 20, padding: "36px 40px",
          marginBottom: 20, position: "relative", overflow: "hidden",
        }}>
          <p style={{ color: "#8b5cf6", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>{t.badge}</p>
          <h1 style={{ color: cor.text, fontSize: 30, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>
            {t.ola} <span style={{ display: "inline-block" }}>👋</span>
          </h1>
          <p style={{ color: cor.textMuted, fontSize: 15, maxWidth: 480, margin: 0 }}>{t.subtitulo}</p>

          <div style={{
            position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)",
            display: "flex", gap: 8, opacity: 0.5,
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg, #a78bfa33, #38bdf833)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📈</div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #f59e0b33, #f9731633)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginTop: 20 }}>💠</div>
          </div>
        </div>

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

        {/* MÓDULOS INSTALADOS — instaláveis, com selo */}
        <p style={{ color: "#7c3aed", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 14px" }}>
          ● {t.tituloInstalados}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18, marginBottom: 20 }}>
          {t.instalaveis.map(mod => (
            <ModuloCard
              key={mod.id} mod={mod} cor={cor} acessarLabel={t.acessar}
              onClick={() => irPara(mod.id)}
              statusModulo={modulosInstalados ? (modulosInstalados[mod.moduloId] ? "instalado" : "nao_instalado") : null}
            />
          ))}
        </div>

        {/* BANNER LOJA DE MÓDULOS */}
        <div style={{
          background: "linear-gradient(135deg, #a78bfa15, #38bdf815)", border: `1px solid ${cor.border}`,
          borderRadius: 16, padding: "18px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, marginBottom: 20,
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

        {/* DICA RÁPIDA */}
        <div style={{
          background: cor.card, border: `1px solid ${cor.border}`,
          borderRadius: 16, padding: "18px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, marginBottom: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✨</div>
            <div>
              <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, margin: 0 }}>{t.dicaTitulo}</p>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "2px 0 0" }}>{t.dicaTexto}</p>
            </div>
          </div>
          <button style={{
            background: "none", border: `1px solid ${cor.border}`, color: "#8b5cf6",
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}>
            {t.dicaBtn}
          </button>
        </div>
      </div>

      {/* BOTÃO FLUTUANTE ARIA */}
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
          cursor: "pointer", zIndex: 999,
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
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, margin: 0 }}>{t.aria}</p>
          </div>
        )}
      </div>

      {/* MINI CHAT ARIA */}
      {ariaOpen && (
        <div style={{
          position: "fixed", bottom: 100, right: 32,
          width: 320, zIndex: 998,
          background: "#111", border: "1px solid #222",
          borderRadius: 16, padding: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          animation: "slideUp 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>Aria</p>
            <button onClick={() => navigate("/assistente")}
              style={{ marginLeft: "auto", background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
              Abrir completo →
            </button>
          </div>
          <p style={{ color: "#888", fontSize: 13, lineHeight: 1.5, margin: "0 0 12px" }}>
            👋 Olá! Posso te ajudar com qualquer dúvida sobre o sistema. Clique em "Abrir completo" para o chat completo com voz!
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Ver pedidos", "Dicas de vendas", "Marketing"].map(s => (
              <button key={s} onClick={() => navigate("/assistente")}
                style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 20, padding: "4px 10px", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "sans-serif" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}