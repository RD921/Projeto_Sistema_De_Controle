import { useState, useEffect } from "react";
import api from "../api";

const integracoes = [
  {
    id: "bling",
    nome: "Bling",
    descricao: "ERP para gestão de produtos, estoque e pedidos",
    icon: "🔵",
    cor: "#0066cc",
    campos: [
      { key: "api_key", label: "API Key", placeholder: "Cole sua API Key do Bling aqui", type: "text" }
    ],
    guia: [
      "Acesse app.bling.com.br",
      "Vá em Configurações → API",
      "Clique em 'Gerar API Key'",
      "Copie e cole a chave abaixo"
    ]
  },
  {
    id: "mercadolivre",
    nome: "Mercado Livre",
    descricao: "Marketplace para venda e análise de produtos",
    icon: "🟡",
    cor: "#f59e0b",
    campos: [
      { key: "client_id", label: "Client ID", placeholder: "Cole seu Client ID aqui", type: "text" },
      { key: "client_secret", label: "Client Secret", placeholder: "Cole seu Client Secret aqui", type: "password" }
    ],
    guia: [
      "Acesse developers.mercadolibre.com.br",
      "Clique em 'Criar aplicação'",
      "Preencha os dados e crie",
      "Copie o Client ID e Client Secret"
    ]
  },
];

export default function Integracoes() {
  const [ativo, setAtivo] = useState(null);
  const [form, setForm] = useState({});
  const [conectadas, setConectadas] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Carrega integrações salvas
    api.get("/integrations").then(r => {
      const data = r.data?.data || r.data || [];
      const mapa = {};
      data.forEach(i => { mapa[i.nome?.toLowerCase()] = i; });
      setConectadas(mapa);
    }).catch(() => {});
  }, []);

  const abrirGuia = (integracao) => {
    setAtivo(integracao);
    setForm({});
    setMsg("");
  };

  const conectar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await api.post("/integrations", {
        nome: ativo.id,
        config: form,
        ativo: true,
      });
      setConectadas(prev => ({ ...prev, [ativo.id]: { nome: ativo.id, config: form } }));
      setMsg("✅ Conectado com sucesso!");
      setTimeout(() => { setAtivo(null); setMsg(""); }, 2000);
    } catch {
      setMsg("❌ Erro ao conectar. Verifique as credenciais.");
    } finally {
      setLoading(false);
    }
  };

  const desconectar = async (id) => {
    try {
      await api.delete(`/integrations/${id}`);
      setConectadas(prev => { const n = {...prev}; delete n[id]; return n; });
    } catch {}
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", background: "#1a1a1a",
    border: "1px solid #333", borderRadius: 8, color: "#fff",
    fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif",
  };

  return (
    <div>
      <h1 style={{ color: "#fff", fontWeight: 700, marginBottom: 4 }}>Integrações</h1>
      <p style={{ color: "#555", marginBottom: 32, fontSize: 14 }}>Conecte suas ferramentas em poucos cliques</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {integracoes.map(integ => {
          const conectada = conectadas[integ.id];
          return (
            <div key={integ.id} style={{ background: "#111", border: `1px solid ${conectada ? integ.cor + "44" : "#222"}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 32 }}>{integ.icon}</span>
                  <div>
                    <h3 style={{ color: "#fff", fontSize: 16, margin: 0 }}>{integ.nome}</h3>
                    <p style={{ color: "#555", fontSize: 12, margin: "4px 0 0" }}>{integ.descricao}</p>
                  </div>
                </div>
                {conectada ? (
                  <span style={{ background: "#052e16", color: "#4ade80", fontSize: 11, padding: "4px 10px", borderRadius: 20 }}>● Conectado</span>
                ) : (
                  <span style={{ background: "#1a1a1a", color: "#555", fontSize: 11, padding: "4px 10px", borderRadius: 20 }}>Desconectado</span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => abrirGuia(integ)} style={{
                  flex: 1, padding: "10px", background: conectada ? "#1a1a1a" : integ.cor,
                  color: "#fff", border: "none", borderRadius: 8,
                  cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif",
                }}>
                  {conectada ? "⚙️ Reconfigurar" : "🔗 Conectar"}
                </button>
                {conectada && (
                  <button onClick={() => desconectar(integ.id)} style={{
                    padding: "10px 16px", background: "none", border: "1px solid #333",
                    color: "#f87171", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif",
                  }}>
                    Desconectar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Guia Rápido */}
      {ativo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)" }} onClick={() => setAtivo(null)} />
          <div style={{ position: "relative", background: "#111", border: "1px solid #222", borderRadius: 20, padding: 36, width: "100%", maxWidth: 500 }}>
            <button onClick={() => setAtivo(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 20 }}>✕</button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <span style={{ fontSize: 32 }}>{ativo.icon}</span>
              <div>
                <h2 style={{ color: "#fff", fontSize: 18, margin: 0 }}>Conectar {ativo.nome}</h2>
                <p style={{ color: "#555", fontSize: 13, margin: 0 }}>Guia rápido de configuração</p>
              </div>
            </div>

            {/* Guia passo a passo */}
            <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ color: "#888", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Como obter as credenciais</p>
              {ativo.guia.map((passo, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ background: ativo.cor, color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <p style={{ color: "#ccc", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{passo}</p>
                </div>
              ))}
            </div>

            {/* Formulário */}
            <form onSubmit={conectar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ativo.campos.map(campo => (
                <div key={campo.key}>
                  <label style={{ color: "#555", fontSize: 12, display: "block", marginBottom: 6 }}>{campo.label} *</label>
                  <input
                    type={campo.type}
                    value={form[campo.key] || ""}
                    onChange={e => setForm({...form, [campo.key]: e.target.value})}
                    placeholder={campo.placeholder}
                    required
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = ativo.cor}
                    onBlur={e => e.target.style.borderColor = "#333"}
                  />
                </div>
              ))}

              {msg && (
                <div style={{ padding: "10px 14px", background: msg.includes("✅") ? "#052e16" : "#2d0a0a", border: `1px solid ${msg.includes("✅") ? "#4ade80" : "#f87171"}`, borderRadius: 8, color: msg.includes("✅") ? "#4ade80" : "#f87171", fontSize: 13 }}>
                  {msg}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                padding: "14px", background: ativo.cor, color: "#fff",
                border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15, fontWeight: 600, fontFamily: "sans-serif", marginTop: 4,
              }}>
                {loading ? "Conectando..." : `🔗 Conectar ${ativo.nome}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}