import { useEffect, useState } from "react";
import api from "../api";

const tabs = ["Visão Geral", "Alcance & Métricas", "Copy com IA", "Lead Scoring", "Scripts IA"];

const estadosSimulados = [
  { uf: "SP", nome: "São Paulo", cidades: [{ nome: "São Paulo", acessos: 1240 }, { nome: "Campinas", acessos: 380 }, { nome: "Santos", acessos: 210 }] },
  { uf: "RJ", nome: "Rio de Janeiro", cidades: [{ nome: "Rio de Janeiro", acessos: 890 }, { nome: "Niterói", acessos: 150 }] },
  { uf: "MG", nome: "Minas Gerais", cidades: [{ nome: "Belo Horizonte", acessos: 620 }, { nome: "Uberlândia", acessos: 180 }] },
  { uf: "ES", nome: "Espírito Santo", cidades: [{ nome: "Vitória", acessos: 340 }, { nome: "Vila Velha", acessos: 190 }, { nome: "Serra", acessos: 120 }] },
  { uf: "PR", nome: "Paraná", cidades: [{ nome: "Curitiba", acessos: 410 }] },
  { uf: "BA", nome: "Bahia", cidades: [{ nome: "Salvador", acessos: 290 }] },
];

export default function Marketing() {
  const [tab, setTab] = useState("Visão Geral");
  const [stats, setStats] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [orders, setOrders] = useState([]);

  const [produto, setProduto] = useState("");
  const [publico, setPublico] = useState("");
  const [canal, setCanal] = useState("WhatsApp");
  const [copy, setCopy] = useState("");
  const [loadingCopy, setLoadingCopy] = useState(false);

  const [leadScores, setLeadScores] = useState([]);
  const [loadingScore, setLoadingScore] = useState(false);

  const [persona, setPersona] = useState("");
  const [produtoScript, setProdutoScript] = useState("");
  const [scripts, setScripts] = useState([]);
  const [loadingScripts, setLoadingScripts] = useState(false);

  useEffect(() => {
    const tid = localStorage.getItem("tenant_id") || 1;
    api.get(`/tenants/${tid}/stats`).then(r => setStats(r.data)).catch(() => {});
    api.get("/customers").then(r => setClientes(r.data.data || [])).catch(() => {});
    api.get("/orders").then(r => setOrders(r.data.data || [])).catch(() => {});
  }, []);

  const gerarCopy = async () => {
    if (!produto || !publico) return;
    setLoadingCopy(true); setCopy("");
    try {
      const res = await api.post("/marketing/copy", { produto, publico, canal });
      setCopy(res.data.copy);
    } catch { setCopy("Erro ao gerar copy. Tente novamente."); }
    finally { setLoadingCopy(false); }
  };

  const calcularLeadScore = async () => {
    setLoadingScore(true);
    try {
      const res = await api.get("/marketing/lead-scoring");
      setLeadScores(res.data);
    } catch {}
    finally { setLoadingScore(false); }
  };

  const gerarScripts = async () => {
    if (!persona || !produtoScript) return;
    setLoadingScripts(true); setScripts([]);
    try {
      const res = await api.post("/marketing/scripts", { persona, produto: produtoScript });
      setScripts(res.data.scripts);
    } catch {}
    finally { setLoadingScripts(false); }
  };

  const cardStyle = { background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24 };
  const inputStyle = { width: "100%", padding: "10px 14px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };

  const receita = orders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const pedidosPagos = orders.filter(o => o.status === "pago").length;
  const pedidosPendentes = orders.filter(o => o.status === "pendente").length;
  const pedidosCancelados = orders.filter(o => o.status === "cancelado").length;
  const totalOrders = orders.length || 1;
  const ticketMedio = orders.length > 0 ? receita / orders.length : 0;

  const tempCor = { quente: "#f87171", morno: "#fbbf24", frio: "#60a5fa" };

  const totalAcessos = estadosSimulados.reduce((acc, e) => acc + e.cidades.reduce((a, c) => a + c.acessos, 0), 0);
  const totalClientesCadastrados = clientes.length;

  const comprasPorCliente = {};
  orders.forEach(o => {
    const chave = o.cliente_id || o.cliente || o.customer_id;
    if (!chave) return;
    comprasPorCliente[chave] = (comprasPorCliente[chave] || 0) + 1;
  });
  const clientesRecorrentes = Object.values(comprasPorCliente).filter(qtd => qtd > 1).length;
  const taxaRecorrencia = totalClientesCadastrados > 0 ? ((clientesRecorrentes / totalClientesCadastrados) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <h1 style={{ color: "#fff", fontWeight: 700, marginBottom: 4 }}>Marketing com IA</h1>
      <p style={{ color: "#555", marginBottom: 24, fontSize: 14 }}>Powered by Gemini AI</p>

      <div style={{ display: "flex", gap: 4, marginBottom: 32, background: "#111", borderRadius: 10, padding: 4, border: "1px solid #222", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: tab === t ? "#fff" : "none",
            color: tab === t ? "#000" : "#555",
            cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 600 : 400,
            fontFamily: "sans-serif", transition: "all 0.2s",
          }}>{t}</button>
        ))}
      </div>

      {tab === "Visão Geral" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total Clientes", value: stats?.clientes ?? "-", cor: "#38bdf8" },
              { label: "Receita Total", value: `R$ ${receita.toFixed(2)}`, cor: "#4ade80" },
              { label: "Ticket Médio", value: `R$ ${ticketMedio.toFixed(2)}`, cor: "#f59e0b" },
              { label: "Taxa Conversão", value: `${((pedidosPagos / totalOrders) * 100).toFixed(1)}%`, cor: "#a78bfa" },
            ].map(c => (
              <div key={c.label} style={cardStyle}>
                <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>{c.label}</p>
                <h2 style={{ color: c.cor, fontSize: 26, fontWeight: 700 }}>{c.value}</h2>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={cardStyle}>
              <h3 style={{ color: "#fff", marginBottom: 20, fontSize: 15 }}>Status dos Pedidos</h3>
              {[
                { label: "Pagos", value: pedidosPagos, cor: "#4ade80" },
                { label: "Pendentes", value: pedidosPendentes, cor: "#fbbf24" },
                { label: "Cancelados", value: pedidosCancelados, cor: "#f87171" },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#888", fontSize: 13 }}>{item.label}</span>
                    <span style={{ color: item.cor, fontSize: 13, fontWeight: 600 }}>{item.value}</span>
                  </div>
                  <div style={{ background: "#222", borderRadius: 4, height: 6 }}>
                    <div style={{ background: item.cor, borderRadius: 4, height: 6, width: `${(item.value / totalOrders) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: "#fff", marginBottom: 20, fontSize: 15 }}>Últimos Clientes</h3>
              {clientes.slice(0, 5).map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <div>
                    <p style={{ color: "#fff", fontSize: 13, margin: 0 }}>{c.nome}</p>
                    <p style={{ color: "#555", fontSize: 11, margin: 0 }}>{c.email}</p>
                  </div>
                  <span style={{ color: "#4ade80", fontSize: 11, alignSelf: "center" }}>Ativo</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Alcance & Métricas" && (
        <div>
          <div style={{ background: "#1a1a1a", border: "1px solid #2d2000", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ color: "#fbbf24", fontSize: 13, margin: 0 }}>
              Dados de estado/cidade e acessos são <strong>simulados</strong>.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}>
              <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>👁️ Acessos à Loja</p>
              <h2 style={{ color: "#38bdf8", fontSize: 26, fontWeight: 700 }}>{totalAcessos.toLocaleString("pt-BR")}</h2>
              <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>últimos 30 dias (simulado)</p>
            </div>
            <div style={cardStyle}>
              <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>👥 Clientes Cadastrados</p>
              <h2 style={{ color: "#4ade80", fontSize: 26, fontWeight: 700 }}>{totalClientesCadastrados}</h2>
              <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>total na base</p>
            </div>
            <div style={cardStyle}>
              <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>🔁 Clientes Recorrentes</p>
              <h2 style={{ color: "#a78bfa", fontSize: 26, fontWeight: 700 }}>{clientesRecorrentes}</h2>
              <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>com +1 compra</p>
            </div>
            <div style={cardStyle}>
              <p style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>📊 Taxa de Recorrência</p>
              <h2 style={{ color: "#f59e0b", fontSize: 26, fontWeight: 700 }}>{taxaRecorrencia}%</h2>
              <p style={{ color: "#444", fontSize: 11, marginTop: 4 }}>clientes que voltaram</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={cardStyle}>
              <h3 style={{ color: "#fff", marginBottom: 20, fontSize: 15 }}>📍 Alcance por Estado</h3>
              {estadosSimulados
                .map(e => ({ ...e, total: e.cidades.reduce((a, c) => a + c.acessos, 0) }))
                .sort((a, b) => b.total - a.total)
                .map(e => (
                  <div key={e.uf} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "#ccc", fontSize: 13 }}>{e.nome} <span style={{ color: "#555" }}>({e.uf})</span></span>
                      <span style={{ color: "#38bdf8", fontSize: 13, fontWeight: 600 }}>{e.total.toLocaleString("pt-BR")}</span>
                    </div>
                    <div style={{ background: "#222", borderRadius: 4, height: 6 }}>
                      <div style={{ background: "#38bdf8", borderRadius: 4, height: 6, width: `${(e.total / totalAcessos) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>

            <div style={cardStyle}>
              <h3 style={{ color: "#fff", marginBottom: 20, fontSize: 15 }}>🏙️ Top Cidades</h3>
              {estadosSimulados
                .flatMap(e => e.cidades.map(c => ({ ...c, uf: e.uf })))
                .sort((a, b) => b.acessos - a.acessos)
                .slice(0, 8)
                .map((c, i) => (
                  <div key={c.nome} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#444", fontSize: 12, width: 16 }}>{i + 1}</span>
                      <p style={{ color: "#fff", fontSize: 13, margin: 0 }}>{c.nome} <span style={{ color: "#555" }}>— {c.uf}</span></p>
                    </div>
                    <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>{c.acessos.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Copy com IA" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={cardStyle}>
            <h3 style={{ color: "#fff", marginBottom: 8, fontSize: 15 }}>🤖 Gerador de Copy com IA</h3>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>A IA cria mensagens persuasivas para seu produto</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ color: "#555", fontSize: 12, display: "block", marginBottom: 6 }}>Produto ou Serviço</label>
                <input value={produto} onChange={e => setProduto(e.target.value)} placeholder="Ex: Ventilador Industrial 65cm" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: "#555", fontSize: 12, display: "block", marginBottom: 6 }}>Público-alvo</label>
                <input value={publico} onChange={e => setPublico(e.target.value)} placeholder="Ex: Donos de indústrias no interior de SP" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: "#555", fontSize: 12, display: "block", marginBottom: 6 }}>Canal</label>
                <select value={canal} onChange={e => setCanal(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                  <option>WhatsApp</option>
                  <option>Email</option>
                  <option>Instagram</option>
                  <option>Facebook</option>
                  <option>SMS</option>
                </select>
              </div>
              <button onClick={gerarCopy} disabled={loadingCopy || !produto || !publico} style={{
                background: produto && publico ? "#a78bfa" : "#333", color: "#fff",
                border: "none", borderRadius: 8, padding: "12px", fontSize: 14,
                fontWeight: 600, cursor: produto && publico ? "pointer" : "not-allowed",
                fontFamily: "sans-serif", transition: "all 0.2s",
              }}>
                {loadingCopy ? "⏳ Gerando com IA..." : "✨ Gerar Copy com IA"}
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: "#fff", marginBottom: 8, fontSize: 15 }}>📝 Copy Gerada</h3>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>Resultado da IA aparece aqui</p>
            {copy ? (
              <>
                <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: 16, minHeight: 200, color: "#fff", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {copy}
                </div>
                <button onClick={() => navigator.clipboard.writeText(copy)} style={{ marginTop: 12, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" }}>
                  📋 Copiar texto
                </button>
              </>
            ) : (
              <div style={{ background: "#1a1a1a", border: "1px dashed #333", borderRadius: 10, padding: 16, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "#444", fontSize: 14, textAlign: "center" }}>Preencha os campos e clique em<br/>"Gerar Copy com IA"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "Lead Scoring" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h3 style={{ color: "#fff", fontSize: 15, margin: 0 }}>🎯 Lead Scoring com IA</h3>
              <p style={{ color: "#555", fontSize: 13, margin: "4px 0 0" }}>A IA analisa cada cliente e dá uma pontuação de compra</p>
            </div>
            <button onClick={calcularLeadScore} disabled={loadingScore} style={{
              background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 20px", fontSize: 13, fontWeight: 600,
              cursor: loadingScore ? "not-allowed" : "pointer", fontFamily: "sans-serif",
            }}>
              {loadingScore ? "⏳ Analisando..." : "🤖 Analisar com IA"}
            </button>
          </div>

          {leadScores.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {leadScores.sort((a, b) => b.score - a.score).map(lead => (
                <div key={lead.id} style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#222", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: tempCor[lead.temperatura] || "#fff", fontWeight: 700, fontSize: 16 }}>{lead.score}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>{lead.nome}</p>
                      <span style={{ background: lead.temperatura === "quente" ? "#2d0a0a" : lead.temperatura === "morno" ? "#2d2000" : "#0a1a2d", color: tempCor[lead.temperatura] || "#fff", fontSize: 11, padding: "2px 10px", borderRadius: 20 }}>
                        {lead.temperatura}
                      </span>
                    </div>
                    <div style={{ background: "#222", borderRadius: 4, height: 6, marginBottom: 6 }}>
                      <div style={{ background: tempCor[lead.temperatura] || "#fff", borderRadius: 4, height: 6, width: `${lead.score}%`, transition: "width 0.8s" }} />
                    </div>
                    <p style={{ color: "#555", fontSize: 12, margin: 0 }}>👉 {lead.proxima_acao}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: "#1a1a1a", border: "1px dashed #333", borderRadius: 10, padding: 40, textAlign: "center" }}>
              <p style={{ color: "#444", fontSize: 14 }}>Clique em "Analisar com IA" para pontuar seus leads</p>
            </div>
          )}
        </div>
      )}

      {tab === "Scripts IA" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={cardStyle}>
            <h3 style={{ color: "#fff", marginBottom: 8, fontSize: 15 }}>🎭 Gerador de Scripts com IA</h3>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>A IA cria scripts personalizados por canal</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ color: "#555", fontSize: 12, display: "block", marginBottom: 6 }}>Persona do Cliente</label>
                <input value={persona} onChange={e => setPersona(e.target.value)} placeholder="Ex: Empresário do setor industrial, 40 anos" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: "#555", fontSize: 12, display: "block", marginBottom: 6 }}>Produto</label>
                <input value={produtoScript} onChange={e => setProdutoScript(e.target.value)} placeholder="Ex: Ventilador Industrial 65cm" style={inputStyle} />
              </div>
              <button onClick={gerarScripts} disabled={loadingScripts || !persona || !produtoScript} style={{
                background: persona && produtoScript ? "#a78bfa" : "#333", color: "#fff",
                border: "none", borderRadius: 8, padding: "12px", fontSize: 14,
                fontWeight: 600, cursor: persona && produtoScript ? "pointer" : "not-allowed",
                fontFamily: "sans-serif",
              }}>
                {loadingScripts ? "⏳ Gerando scripts..." : "✨ Gerar Scripts com IA"}
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: "#fff", marginBottom: 20, fontSize: 15 }}>📋 Scripts Gerados</h3>
            {scripts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {scripts.map((s, i) => (
                  <div key={i} style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{s.canal}</span>
                      <button onClick={() => navigator.clipboard.writeText(s.script)} style={{ background: "#222", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "sans-serif" }}>
                        📋 Copiar
                      </button>
                    </div>
                    <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{s.script}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: "#1a1a1a", border: "1px dashed #333", borderRadius: 10, padding: 40, textAlign: "center" }}>
                <p style={{ color: "#444", fontSize: 14 }}>Scripts gerados pela IA aparecerão aqui</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}