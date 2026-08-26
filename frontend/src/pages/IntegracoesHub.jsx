import { useEffect, useState } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
import api from "../api";

const CATEGORIAS = {
  "canais-venda": { label: "Canais de Venda e Marketplaces", desc: "Centralize e sincronize estoque e pedidos." },
  "logistica": { label: "Logística e Frete", desc: "Calcule frete, gere etiquetas e rastreie encomendas." },
  "fiscal": { label: "Emissão de Nota Fiscal", desc: "Faturamento automatizado, sem burocracia." },
  "pagamentos": { label: "Gateways de Pagamento", desc: "Conciliação e aprovação automática das vendas." },
};

// Integrações com fluxo OAuth real já implementado no backend.
// Chave = id na integrations_catalog, valor = rota de auth no backend.
const OAUTH_INTEGRATIONS = {
  mercadolivre: "/integrations/mercadolivre/auth",
};

// Rota de disconnect "de verdade" (desativa o token), além do disconnect genérico do catálogo.
const OAUTH_DISCONNECT_ROUTES = {
  mercadolivre: "/integrations/mercadolivre/disconnect",
};

const DOMINIOS_MARCA = {
  amazon: "amazon.com",
  mercadolivre: "mercadolivre.com.br",
  nuvemshop: "nuvemshop.com.br",
  shopee: "shopee.com.br",
  shopify: "shopify.com",
  woocommerce: "woocommerce.com",
  correios: "correios.com.br",
  frenet: "frenet.com.br",
  melhorenvio: "melhorenvio.com.br",
  bling: "bling.com.br",
  nfe: "nfe.io",
  asaas: "asaas.com",
  mercadopago: "mercadopago.com.br",
  pagseguro: "pagseguro.uol.com.br",
};

const CORES_MARCA = {
  amazon: "#232f3e", mercadolivre: "#ffe600", nuvemshop: "#6c5ce7", shopee: "#ee4d2d",
  shopify: "#95bf47", woocommerce: "#96588a", correios: "#0033a0", frenet: "#0a5fd8",
  melhorenvio: "#0098e5", bling: "#4ea935", nfe: "#7c3aed", asaas: "#00b2ff",
  mercadopago: "#009ee3", pagseguro: "#3ac850",
};

function LogoMarca({ id, label }) {
  const [erroLogo, setErroLogo] = useState(false);
  const dominio = DOMINIOS_MARCA[id];
  const corFundo = CORES_MARCA[id] || "#7c3aed";

  if (dominio && !erroLogo) {
    return (
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        border: "1px solid #ececec", padding: 9, boxSizing: "border-box", overflow: "hidden",
      }}>
        <img
          src={`https://logo.clearbit.com/${dominio}?size=128`}
          alt={label}
          onError={() => setErroLogo(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12, background: corFundo,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0,
    }}>
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function IntegracoesHub() {
  const { cor } = useOutletContext();
  const { categoria } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoriaAtiva = categoria || "canais-venda";

  const [integracoes, setIntegracoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalConectar, setModalConectar] = useState(null);
  const [credenciais, setCredenciais] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(null);
  const [aviso, setAviso] = useState(null);

  const carregar = () => {
    setLoading(true);
    api.get("/integrations-catalog").then(r => setIntegracoes(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  // Trata o retorno do OAuth (?conectado=mercadolivre ou ?erro=...)
  useEffect(() => {
    const conectado = searchParams.get("conectado");
    const erroParam = searchParams.get("erro");

    if (conectado) {
      setAviso({ tipo: "sucesso", texto: `Conectado com sucesso!` });
      carregar();
      searchParams.delete("conectado");
      setSearchParams(searchParams, { replace: true });
    }
    if (erroParam) {
      setAviso({ tipo: "erro", texto: "Não foi possível concluir a conexão. Tente novamente." });
      searchParams.delete("erro");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const iniciarOAuth = async (integrationId) => {
    try {
      const rota = OAUTH_INTEGRATIONS[integrationId];
      const res = await api.get(rota);
      window.location.href = res.data.url;
    } catch (err) {
      alert("Erro ao iniciar conexão: " + (err.response?.data?.error || err.message));
    }
  };

  const abrirConectar = (integ) => {
    setModalConectar(integ);
    setCredenciais({});
    setErro("");
  };

  const conectar = (integ) => {
    if (OAUTH_INTEGRATIONS[integ.id]) {
      iniciarOAuth(integ.id);
    } else {
      abrirConectar(integ);
    }
  };

  const salvarConexaoManual = async () => {
    setSalvando(true);
    setErro("");
    try {
      await api.post(`/integrations-catalog/${modalConectar.id}/connect`, { credenciais });
      setModalConectar(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao conectar.");
    } finally {
      setSalvando(false);
    }
  };

  const desconectar = async (integ) => {
    if (!confirm(`Desconectar ${integ.label}?`)) return;
    setExcluindo(integ.id);
    try {
      await api.post(`/integrations-catalog/${integ.id}/disconnect`);
      const rotaReal = OAUTH_DISCONNECT_ROUTES[integ.id];
      if (rotaReal) {
        await api.delete(rotaReal).catch(() => {});
      }
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao desconectar.");
    } finally {
      setExcluindo(null);
    }
  };

  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 14, padding: 20 };
  const inputStyle = { width: "100%", padding: "10px 14px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif", marginBottom: 12 };

  const categoriaBackend = categoriaAtiva.replace(/-/g, "_");
  const itensDaCategoria = integracoes.filter(i => i.categoria === categoriaBackend || i.categoria === categoriaAtiva);
  const infoCategoria = CATEGORIAS[categoriaAtiva] || { label: "Integrações", desc: "" };

  return (
    <div>
      {aviso && (
        <div style={{
          marginBottom: 18, padding: "12px 16px", borderRadius: 10, fontSize: 13.5,
          background: aviso.tipo === "sucesso" ? "#16a34a15" : "#dc262615",
          color: aviso.tipo === "sucesso" ? "#16a34a" : "#dc2626",
          border: `1px solid ${aviso.tipo === "sucesso" ? "#16a34a40" : "#dc262640"}`,
        }}>
          {aviso.texto}
        </div>
      )}

      <h1 style={{ color: cor.text, fontWeight: 700, fontSize: 28, margin: "0 0 6px" }}>{infoCategoria.label}</h1>
      <p style={{ color: cor.textMuted, fontSize: 14, margin: "0 0 24px" }}>{infoCategoria.desc}</p>

      {loading ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
      ) : itensDaCategoria.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma integração nesta categoria.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
          {itensDaCategoria.map(i => (
            <div key={i.id} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <LogoMarca id={i.id} label={i.label} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: cor.text }}>{i.label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: cor.textMuted }}>{i.descricao}</p>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <span style={{
                  fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  background: i.conectado ? "#16a34a22" : cor.bg,
                  color: i.conectado ? "#16a34a" : cor.textMuted,
                  border: `1px solid ${i.conectado ? "#16a34a55" : cor.border}`,
                }}>
                  {i.conectado ? "● Conectado" : "● Não conectado"}
                </span>
              </div>

              {i.conectado ? (
                <button
                  onClick={() => desconectar(i)}
                  disabled={excluindo === i.id}
                  style={{ width: "100%", background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: excluindo === i.id ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  {excluindo === i.id ? "Desconectando..." : "Desconectar"}
                </button>
              ) : (
                <button onClick={() => conectar(i)} style={{ width: "100%", background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Conectar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalConectar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalConectar(null)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <LogoMarca id={modalConectar.id} label={modalConectar.label} />
              <h2 style={{ color: cor.text, fontSize: 16, margin: 0 }}>Conectar {modalConectar.label}</h2>
            </div>

            {modalConectar.campos_credencial.map(campo => (
              <div key={campo}>
                <label style={{ fontSize: 12, color: cor.textMuted, marginBottom: 4, display: "block", textTransform: "capitalize" }}>
                  {campo.replace(/_/g, " ")}
                </label>
                <input
                  type={campo.toLowerCase().includes("senha") ? "password" : "text"}
                  style={inputStyle}
                  value={credenciais[campo] || ""}
                  onChange={e => setCredenciais({ ...credenciais, [campo]: e.target.value })}
                />
              </div>
            ))}

            {erro && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setModalConectar(null)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
                Cancelar
              </button>
              <button onClick={salvarConexaoManual} disabled={salvando} style={{ flex: 1, padding: 11, background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {salvando ? "Conectando..." : "Conectar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}