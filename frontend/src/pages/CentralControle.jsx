import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import api, { API_URL } from "../api";
import AutomationEditor from "../components/automation/AutomationEditor";

const estadosSimulados = [
  { uf: "SP", nome: "São Paulo", cidades: [{ nome: "São Paulo", acessos: 1240 }, { nome: "Campinas", acessos: 380 }, { nome: "Santos", acessos: 210 }] },
  { uf: "RJ", nome: "Rio de Janeiro", cidades: [{ nome: "Rio de Janeiro", acessos: 890 }, { nome: "Niterói", acessos: 150 }] },
  { uf: "MG", nome: "Minas Gerais", cidades: [{ nome: "Belo Horizonte", acessos: 620 }, { nome: "Uberlândia", acessos: 180 }] },
  { uf: "ES", nome: "Espírito Santo", cidades: [{ nome: "Vitória", acessos: 340 }, { nome: "Vila Velha", acessos: 190 }, { nome: "Serra", acessos: 120 }] },
  { uf: "PR", nome: "Paraná", cidades: [{ nome: "Curitiba", acessos: 410 }] },
  { uf: "BA", nome: "Bahia", cidades: [{ nome: "Salvador", acessos: 290 }] },
];

const AREAS = {
  resumo: { label: "Resumo", icon: "📊", cor: "#a78bfa", sub: "Visão consolidada de todas as áreas — clique nos cards para detalhes." },
  financeiro: { label: "Financeiro", icon: "💰", cor: "#4ade80", sub: "Dados reais do motor financeiro — receita, despesas e saldo." },
  ecommerce: { label: "E-commerce", icon: "🛒", cor: "#6366f1", sub: "Clientes, pedidos e produtos em um só lugar." },
  crm: { label: "CRM", icon: "🤝", cor: "#f472b6", sub: "Pipeline de vendas, fechamentos e tarefas — dados reais do CRM." },
  marketing: { label: "Marketing", icon: "📣", cor: "#fb7185", sub: "Alcance da loja e engajamento (dados simulados marcados abaixo)." },
  logistica: { label: "Logística", icon: "🚚", cor: "#22d3ee", sub: "Envios, entregas e transportadoras — dados reais da logística." },
  integracoes: { label: "Integrações", icon: "🔗", cor: "#60a5fa", sub: "Status das conexões externas — gerencie em Integrações." },
  automacoes: { label: "Automações", icon: "⚡", cor: "#facc15", sub: "Apollo Automation Engine — motor próprio, sem depender do n8n." },
  relatorios: { label: "Relatórios", icon: "📈", cor: "#fb923c", sub: "Atalhos rápidos para os relatórios completos do sistema." },
};

export default function CentralControle() {
  const { cor } = useOutletContext();
  const { secao } = useParams();
  const navigate = useNavigate();
  const secaoAtiva = secao || "resumo";
  const area = AREAS[secaoAtiva] || AREAS.resumo;

  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [modal, setModal] = useState(null);
  const [automations, setAutomations] = useState([]);
  const [automacaoSelecionada, setAutomacaoSelecionada] = useState(null);
  const [abaEcommerce, setAbaEcommerce] = useState("clientes");

  const [financeiro, setFinanceiro] = useState(null);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [crmResumo, setCrmResumo] = useState(null);
  const [logisticaDash, setLogisticaDash] = useState(null);

  useEffect(() => {
    const tid = localStorage.getItem("tenant_id") || 1;
    api.get(`/tenants/${tid}/stats`).then(r => setStats(r.data)).catch(() => {});
    api.get("/orders").then(r => setOrders(r.data.data || [])).catch(() => {});
    api.get("/customers").then(r => setClientes(r.data.data || [])).catch(() => {});
    api.get("/products").then(r => setProdutos(r.data.data || r.data || [])).catch(() => {});
    api.get("/automations").then(r => setAutomations(r.data || [])).catch(() => {});

    api.get("/financeiro/resumo").then(r => setFinanceiro(r.data)).catch(() => {});
    api.get("/financeiro/contas-pagar").then(r => setContasPagar(r.data || [])).catch(() => {});
    api.get("/financeiro/contas-receber").then(r => setContasReceber(r.data || [])).catch(() => {});
    api.get("/crm/dashboard/resumo").then(r => setCrmResumo(r.data)).catch(() => {});
    api.get("/logistica/dashboard").then(r => setLogisticaDash(r.data)).catch(() => {});
  }, []);

  const receita = orders.reduce((a, o) => a + Number(o.total || 0), 0);
  const pagos = orders.filter(o => o.status === "pago").length;
  const pendentes = orders.filter(o => o.status === "pendente").length;
  const cancelados = orders.filter(o => o.status === "cancelado").length;
  const enviados = orders.filter(o => o.status === "enviado").length;

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

  const clientesNovosUltimos7d = clientes.filter(c => {
    if (!c.created_at) return false;
    const dias = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return dias <= 7;
  }).length;

  const produtosComVendas = produtos.map((p, i) => ({
    ...p,
    vendidos: p.vendidos ?? Math.max(0, 40 - i * 6 + (i % 3) * 5),
    avaliacao: p.avaliacao ?? (4.8 - i * 0.3).toFixed(1),
    numAvaliacoes: p.numAvaliacoes ?? Math.max(3, 30 - i * 4),
  }));
  const maisVendidos = [...produtosComVendas].sort((a, b) => b.vendidos - a.vendidos).slice(0, 5);
  const menosVendidos = [...produtosComVendas].sort((a, b) => a.vendidos - b.vendidos).slice(0, 5);
  const maisAvaliados = [...produtosComVendas].sort((a, b) => b.avaliacao - a.avaliacao).slice(0, 5);
  const menosAvaliados = [...produtosComVendas].sort((a, b) => a.avaliacao - b.avaliacao).slice(0, 5);

  const totalRegiao = estadosSimulados.reduce((a, e) => a + e.cidades.reduce((s, c) => s + c.acessos, 0), 0);
  const novosClientesPorRegiao = estadosSimulados.map(e => {
    const totalEstado = e.cidades.reduce((s, c) => s + c.acessos, 0);
    const pct = ((totalEstado / totalRegiao) * 100).toFixed(1);
    const estimativa = Math.round((totalClientesCadastrados * totalEstado) / totalRegiao);
    return { ...e, pct, estimativa };
  }).sort((a, b) => b.pct - a.pct);

  const formatarMoeda = (v) => `R$ ${Number(v || 0).toFixed(2)}`;

  const cardStyle = { background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 14, padding: 18 };
  const clickCard = { ...cardStyle, cursor: "pointer", transition: "all 0.2s" };
  const kpiGrid = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${area.cor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
          {area.icon}
        </div>
        <h1 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{area.label}</h1>
      </div>
      <p style={{ color: cor.textMuted, fontSize: 13, margin: "4px 0 24px" }}>{area.sub}</p>

      {secaoAtiva === "resumo" && (
        <div>
          <div style={kpiGrid}>
            <div style={clickCard} onClick={() => setModal("faturamento")}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>💰 Faturamento</p>
              <h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>R$ {receita.toFixed(2)}</h2>
              <p style={{ color: "#a78bfa", fontSize: 11, marginTop: 6 }}>Ver gestão financeira →</p>
            </div>
            <div style={cardStyle}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>🛒 Pedidos</p>
              <h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{orders.length}</h2>
            </div>
            <div style={clickCard} onClick={() => setModal("clientes")}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>👥 Clientes</p>
              <h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{stats?.clientes ?? clientes.length}</h2>
              <p style={{ color: "#38bdf8", fontSize: 11, marginTop: 6 }}>Ver lista completa →</p>
            </div>
            <div style={clickCard} onClick={() => setModal("produtos")}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>📦 Produtos Vendidos</p>
              <h2 style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{pagos + enviados}</h2>
              <p style={{ color: "#f472b6", fontSize: 11, marginTop: 6 }}>Ver ranking →</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 22 }}>
            <div style={cardStyle}>
              <p style={{ color: cor.text, fontWeight: 600, margin: "0 0 4px", fontSize: 13 }}>Faturamento — últimos 7 dias</p>
              <p style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>R$ {receita.toFixed(2)}</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                {[40, 55, 35, 70, 50, 85, 95].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 6 ? "#a78bfa" : "#a78bfa33", borderRadius: "4px 4px 0 0" }} />
                ))}
              </div>
            </div>
            <div style={cardStyle}>
              <p style={{ color: cor.text, fontWeight: 600, marginBottom: 14, fontSize: 13 }}>Pedidos por Status</p>
              {[
                { label: "Pendentes", v: pendentes, c: "#fbbf24" },
                { label: "Enviados", v: enviados, c: "#10b981" },
                { label: "Entregues/Pagos", v: pagos, c: "#3b82f6" },
                { label: "Cancelados", v: cancelados, c: "#f87171" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${cor.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.c }} />
                    <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{s.label}</span>
                  </div>
                  <span style={{ color: cor.text, fontWeight: 600, fontSize: 12.5 }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Visão geral por módulo</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <div style={clickCard} onClick={() => navigate("/central-controle/financeiro")}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 8 }}>💰 Financeiro — Saldo</p>
              <h2 style={{ color: financeiro ? (Number(financeiro.saldo) >= 0 ? "#4ade80" : "#f87171") : cor.textMuted, fontSize: 19, fontWeight: 700, margin: 0 }}>
                {financeiro ? formatarMoeda(financeiro.saldo) : "—"}
              </h2>
            </div>
            <div style={clickCard} onClick={() => navigate("/central-controle/crm")}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 8 }}>🤝 CRM — Receita Ganha</p>
              <h2 style={{ color: "#f472b6", fontSize: 19, fontWeight: 700, margin: 0 }}>
                {crmResumo ? formatarMoeda(crmResumo.fechamentos?.receita_ganha) : "—"}
              </h2>
            </div>
            <div style={clickCard} onClick={() => navigate("/central-controle/logistica")}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 8 }}>🚚 Logística — Taxa de Entrega</p>
              <h2 style={{ color: "#22d3ee", fontSize: 19, fontWeight: 700, margin: 0 }}>
                {logisticaDash ? `${Number(logisticaDash.taxa_entrega).toFixed(1)}%` : "—"}
              </h2>
            </div>
            <div style={clickCard} onClick={() => navigate("/central-controle/automacoes")}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 8 }}>⚡ Automações Ativas</p>
              <h2 style={{ color: "#facc15", fontSize: 19, fontWeight: 700, margin: 0 }}>
                {automations.filter(a => a.status === "active").length} / {automations.length}
              </h2>
            </div>
            <div style={clickCard} onClick={() => navigate("/central-controle/marketing")}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 8 }}>📣 Marketing — Acessos (simulado)</p>
              <h2 style={{ color: "#fb7185", fontSize: 19, fontWeight: 700, margin: 0 }}>{totalAcessos.toLocaleString("pt-BR")}</h2>
            </div>
            <div style={clickCard} onClick={() => navigate("/central-controle/integracoes")}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 8 }}>🔗 Integrações Conectadas</p>
              <h2 style={{ color: "#60a5fa", fontSize: 19, fontWeight: 700, margin: 0 }}>0 / 2</h2>
            </div>
          </div>
        </div>
      )}

      {secaoAtiva === "financeiro" && (
        <div>
          {!financeiro ? (
            <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 13, margin: 0 }}>Carregando dados financeiros...</p></div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita (pedidos + manual)</p>
                  <p style={{ color: "#16a34a", fontSize: 17, fontWeight: 700, margin: 0 }}>{formatarMoeda(financeiro.receita_total)}</p>
                  <p style={{ color: cor.textMuted, fontSize: 11, marginTop: 4 }}>{financeiro.qtd_pedidos} pedidos pagos</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Despesas Pagas</p>
                  <p style={{ color: "#dc2626", fontSize: 17, fontWeight: 700, margin: 0 }}>{formatarMoeda(financeiro.despesas_pagas)}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Despesas Pendentes</p>
                  <p style={{ color: "#f59e0b", fontSize: 17, fontWeight: 700, margin: 0 }}>{formatarMoeda(financeiro.despesas_pendentes)}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Saldo</p>
                  <p style={{ color: Number(financeiro.saldo) >= 0 ? "#16a34a" : "#dc2626", fontSize: 17, fontWeight: 700, margin: 0 }}>{formatarMoeda(financeiro.saldo)}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.text, fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Contas a Pagar</p>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 12 }}>{contasPagar.length} lançamento(s) cadastrado(s)</p>
                  <p style={{ color: "#f87171", fontSize: 21, fontWeight: 700, margin: 0 }}>{contasPagar.length}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.text, fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Contas a Receber</p>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 12 }}>{contasReceber.length} lançamento(s) cadastrado(s)</p>
                  <p style={{ color: "#4ade80", fontSize: 21, fontWeight: 700, margin: 0 }}>{contasReceber.length}</p>
                </div>
              </div>
              <p style={{ color: cor.textMuted, fontSize: 11.5, marginTop: 14 }}>Dados vindos direto do módulo Financeiro (/financeiro/resumo, /financeiro/contas-pagar, /financeiro/contas-receber). Para detalhes completos, acesse o módulo Financeiro.</p>
            </>
          )}
        </div>
      )}

      {secaoAtiva === "ecommerce" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "clientes", label: "👥 Clientes" },
              { id: "pedidos", label: "🛒 Pedidos" },
              { id: "produtos", label: "📦 Produtos" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaEcommerce(tab.id)} style={{
                background: abaEcommerce === tab.id ? cor.text : "none",
                color: abaEcommerce === tab.id ? cor.bg : cor.textMuted,
                border: `1px solid ${cor.border}`, borderRadius: 8, padding: "7px 16px",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {abaEcommerce === "clientes" && (
            <div>
              <div style={kpiGrid}>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>👥 Cadastrados</p>
                  <h2 style={{ color: "#38bdf8", fontSize: 21, fontWeight: 700 }}>{totalClientesCadastrados}</h2>
                </div>
                <div style={clickCard} onClick={() => setModal("novosClientes")}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>🆕 Novos (7 dias)</p>
                  <h2 style={{ color: "#4ade80", fontSize: 21, fontWeight: 700 }}>{clientesNovosUltimos7d}</h2>
                  <p style={{ color: "#4ade80", fontSize: 11, marginTop: 6 }}>Ver por região →</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>🔁 Recorrentes</p>
                  <h2 style={{ color: "#a78bfa", fontSize: 21, fontWeight: 700 }}>{clientesRecorrentes}</h2>
                </div>
                <div style={clickCard} onClick={() => setModal("conversao")}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>📊 Taxa Recorrência</p>
                  <h2 style={{ color: "#f59e0b", fontSize: 21, fontWeight: 700 }}>{taxaRecorrencia}%</h2>
                  <p style={{ color: "#f59e0b", fontSize: 11, marginTop: 6 }}>Ver conversão →</p>
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, margin: 0 }}>Últimos clientes cadastrados</p>
                  <button onClick={() => setModal("clientes")} style={{ background: "none", border: "none", color: "#38bdf8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Ver todos →</button>
                </div>
                {clientes.length === 0 ? (
                  <p style={{ color: cor.textMuted, fontSize: 12.5 }}>Nenhum cliente cadastrado.</p>
                ) : clientes.slice(0, 5).map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${cor.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#38bdf822", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#38bdf8", fontWeight: 700 }}>
                        {c.nome?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p style={{ color: cor.text, fontSize: 12.5, margin: 0 }}>{c.nome}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11, margin: 0 }}>{c.email}</p>
                      </div>
                    </div>
                    <span style={{ color: "#4ade80", fontSize: 10.5, background: "#052e16", padding: "2px 8px", borderRadius: 20 }}>Ativo</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {abaEcommerce === "pedidos" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {[
                { label: "Total", v: orders.length, c: "#f59e0b" },
                { label: "Pendentes", v: pendentes, c: "#fbbf24" },
                { label: "Pagos", v: pagos, c: "#4ade80" },
                { label: "Cancelados", v: cancelados, c: "#f87171" },
              ].map(s => (
                <div key={s.label} style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>{s.label}</p>
                  <h2 style={{ color: s.c, fontSize: 21, fontWeight: 700 }}>{s.v}</h2>
                </div>
              ))}
            </div>
          )}

          {abaEcommerce === "produtos" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ color: cor.textMuted, fontSize: 12.5, margin: 0 }}>{produtos.length} produtos cadastrados</p>
                <button onClick={() => setModal("produtos")} style={{ background: "none", border: `1px solid ${cor.border}`, color: "#f472b6", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  Ver ranking completo →
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, marginBottom: 10 }}>🏆 Mais Vendidos</p>
                  {maisVendidos.slice(0, 3).map(p => (
                    <div key={p.id || p.nome} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                      <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{p.nome}</span>
                      <span style={{ color: "#4ade80", fontSize: 12.5, fontWeight: 600 }}>{p.vendidos} vendas</span>
                    </div>
                  ))}
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, marginBottom: 10 }}>⭐ Mais Avaliados</p>
                  {maisAvaliados.slice(0, 3).map(p => (
                    <div key={p.id || p.nome} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                      <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{p.nome}</span>
                      <span style={{ color: "#fbbf24", fontSize: 12.5, fontWeight: 600 }}>{p.avaliacao} ★</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {secaoAtiva === "crm" && (
        <div>
          {!crmResumo ? (
            <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 13, margin: 0 }}>Carregando dados do CRM...</p></div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Taxa de Conversão</p>
                  <p style={{ color: "#f472b6", fontSize: 19, fontWeight: 700, margin: 0 }}>{Number(crmResumo.fechamentos?.taxa_conversao || 0).toFixed(1)}%</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita Ganha</p>
                  <p style={{ color: "#4ade80", fontSize: 19, fontWeight: 700, margin: 0 }}>{formatarMoeda(crmResumo.fechamentos?.receita_ganha)}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Negócios Ganhos / Perdidos</p>
                  <p style={{ color: cor.text, fontSize: 19, fontWeight: 700, margin: 0 }}>{crmResumo.fechamentos?.ganhos ?? 0} / {crmResumo.fechamentos?.perdidos ?? 0}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Ciclo Médio</p>
                  <p style={{ color: cor.text, fontSize: 19, fontWeight: 700, margin: 0 }}>{crmResumo.ciclo_medio_dias ?? "—"} dias</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.text, fontWeight: 600, marginBottom: 14, fontSize: 13 }}>Pipeline por Estágio</p>
                  {(crmResumo.pipeline_por_estagio || []).length === 0 ? (
                    <p style={{ color: cor.textMuted, fontSize: 12.5 }}>Nenhum negócio em aberto.</p>
                  ) : crmResumo.pipeline_por_estagio.map(e => (
                    <div key={e.estagio} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${cor.border}` }}>
                      <span style={{ color: cor.textMuted, fontSize: 12.5, textTransform: "capitalize" }}>{e.estagio}</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: cor.text, fontWeight: 600, fontSize: 12.5 }}>{e.total} negócio(s)</span>
                        <p style={{ color: "#f472b6", fontSize: 11, margin: 0 }}>{formatarMoeda(e.valor_total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.text, fontWeight: 600, marginBottom: 14, fontSize: 13 }}>Tarefas</p>
                  {[
                    { label: "Vencidas", v: crmResumo.tarefas?.vencidas ?? 0, c: "#f87171" },
                    { label: "Pendentes", v: crmResumo.tarefas?.pendentes ?? 0, c: "#fbbf24" },
                    { label: "Concluídas", v: crmResumo.tarefas?.concluidas ?? 0, c: "#4ade80" },
                  ].map(s => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${cor.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.c }} />
                        <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{s.label}</span>
                      </div>
                      <span style={{ color: cor.text, fontWeight: 600, fontSize: 12.5 }}>{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {(crmResumo.motivos_perda || []).length > 0 && (
                <div style={{ ...cardStyle, marginTop: 14 }}>
                  <p style={{ color: cor.text, fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Motivos de Perda</p>
                  {crmResumo.motivos_perda.map(m => (
                    <div key={m.motivo_perda} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${cor.border}` }}>
                      <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{m.motivo_perda || "Não informado"}</span>
                      <span style={{ color: "#f87171", fontSize: 12.5, fontWeight: 600 }}>{m.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {secaoAtiva === "marketing" && (
        <div>
          <div style={{ background: cor.bg, border: "1px solid #2d2000", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <p style={{ color: "#fbbf24", fontSize: 12, margin: 0 }}>Dados de acessos são simulados. Configuração de IA de marketing continua no módulo Marketing.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <div style={cardStyle}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>👁️ Acessos</p>
              <h2 style={{ color: "#fb7185", fontSize: 21, fontWeight: 700 }}>{totalAcessos.toLocaleString("pt-BR")}</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>🎯 Conversão</p>
              <h2 style={{ color: "#fb7185", fontSize: 21, fontWeight: 700 }}>{orders.length > 0 ? ((pagos / orders.length) * 100).toFixed(1) : "0.0"}%</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>📍 Estados alcançados</p>
              <h2 style={{ color: "#fb7185", fontSize: 21, fontWeight: 700 }}>{estadosSimulados.length}</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 8 }}>🏙️ Cidades ativas</p>
              <h2 style={{ color: "#fb7185", fontSize: 21, fontWeight: 700 }}>{estadosSimulados.flatMap(e => e.cidades).length}</h2>
            </div>
          </div>
        </div>
      )}

      {secaoAtiva === "logistica" && (
        <div>
          {!logisticaDash ? (
            <div style={cardStyle}><p style={{ color: cor.textMuted, fontSize: 13, margin: 0 }}>Carregando dados de logística...</p></div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Total de Envios</p>
                  <p style={{ color: cor.text, fontSize: 19, fontWeight: 700, margin: 0 }}>{logisticaDash.total_envios}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Taxa de Entrega</p>
                  <p style={{ color: "#22d3ee", fontSize: 19, fontWeight: 700, margin: 0 }}>{Number(logisticaDash.taxa_entrega).toFixed(1)}%</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Atrasados</p>
                  <p style={{ color: "#f87171", fontSize: 19, fontWeight: 700, margin: 0 }}>{logisticaDash.atrasados}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Frete Médio</p>
                  <p style={{ color: cor.text, fontSize: 19, fontWeight: 700, margin: 0 }}>{formatarMoeda(logisticaDash.frete_medio)}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.text, fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Frete Total</p>
                  <p style={{ color: "#22d3ee", fontSize: 21, fontWeight: 700, margin: 0 }}>{formatarMoeda(logisticaDash.frete_total)}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.text, fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Envios por Status</p>
                  {(logisticaDash.por_status || []).length === 0 ? (
                    <p style={{ color: cor.textMuted, fontSize: 12.5 }}>Nenhum envio registrado.</p>
                  ) : logisticaDash.por_status.map(s => (
                    <div key={s.status} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${cor.border}` }}>
                      <span style={{ color: cor.textMuted, fontSize: 12.5, textTransform: "capitalize" }}>{s.status}</span>
                      <span style={{ color: cor.text, fontWeight: 600, fontSize: 12.5 }}>{s.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {secaoAtiva === "integracoes" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { nome: "Bling ERP", icon: "🔵" },
            { nome: "Mercado Livre", icon: "🟡" },
          ].map(i => (
            <div key={i.nome} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{i.icon}</span>
                <div>
                  <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{i.nome}</p>
                  <p style={{ color: cor.textMuted, fontSize: 11, margin: 0 }}>Não conectado</p>
                </div>
              </div>
              <span style={{ background: "#2d0a0a", color: "#f87171", fontSize: 10.5, padding: "3px 10px", borderRadius: 20 }}>Offline</span>
            </div>
          ))}
        </div>
      )}

      {secaoAtiva === "automacoes" && (
        automacaoSelecionada ? (
          <div>
            <button
              onClick={() => setAutomacaoSelecionada(null)}
              style={{
                background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted,
                borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer",
                fontFamily: "inherit", marginBottom: 14,
              }}
            >
              ← Voltar para a lista
            </button>
            <AutomationEditor
              automationId={automacaoSelecionada}
              apiBaseUrl={`${API_URL}/automations`}
              embedded
            />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ color: cor.textMuted, fontSize: 12.5, margin: 0 }}>{automations.length} automações criadas</p>
            </div>
            {automations.length === 0 ? (
              <div style={cardStyle}>
                <p style={{ color: cor.textMuted, fontSize: 12.5, margin: 0 }}>Nenhuma automação criada ainda.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {automations.map(a => (
                  <div
                    key={a.id}
                    style={{ ...clickCard, display: "flex", alignItems: "center", gap: 14 }}
                    onClick={() => setAutomacaoSelecionada(a.id)}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#facc1522", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>⚡</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{a.name}</p>
                      <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{a.description || "Sem descrição"} · v{a.version}</p>
                    </div>
                    <span style={{
                      background: a.status === "active" ? "#052e16" : "#2d2000",
                      color: a.status === "active" ? "#4ade80" : "#fbbf24",
                      fontSize: 10.5, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                    }}>
                      {a.status === "active" ? "Ativa" : a.status === "paused" ? "Pausada" : "Rascunho"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )
      )}

      {secaoAtiva === "relatorios" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
            <div style={cardStyle}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita Real</p>
              <p style={{ color: "#16a34a", fontSize: 19, fontWeight: 700, margin: 0 }}>R$ {receita.toFixed(2)}</p>
            </div>
            <div style={cardStyle}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Pedidos Registrados</p>
              <p style={{ color: cor.text, fontSize: 19, fontWeight: 700, margin: 0 }}>{orders.length}</p>
            </div>
            <div style={cardStyle}>
              <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Clientes Cadastrados</p>
              <p style={{ color: cor.text, fontSize: 19, fontWeight: 700, margin: 0 }}>{totalClientesCadastrados}</p>
            </div>
          </div>

          <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Relatórios completos</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { to: "/relatorios/executivo", label: "Executivo", icon: "📊" },
              { to: "/relatorios/vendas", label: "Vendas", icon: "💰" },
              { to: "/relatorios/clientes", label: "Clientes", icon: "👥" },
              { to: "/relatorios/logistica", label: "Logística", icon: "🚚" },
              { to: "/relatorios/produtos", label: "Produtos", icon: "📦" },
              { to: "/relatorios/marketplaces", label: "Marketplaces", icon: "🛒" },
            ].map(r => (
              <div key={r.to} style={{ ...clickCard, display: "flex", alignItems: "center", gap: 12 }} onClick={() => navigate(r.to)}>
                <span style={{ fontSize: 18 }}>{r.icon}</span>
                <span style={{ color: cor.text, fontSize: 13, fontWeight: 600, flex: 1 }}>{r.label}</span>
                <span style={{ color: "#fb923c", fontSize: 13 }}>→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModal(null)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 20, padding: 32, width: "100%", maxWidth: 640, maxHeight: "82vh", overflowY: "auto" }}>
            <button onClick={() => setModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: cor.textMuted, cursor: "pointer", fontSize: 20 }}>✕</button>

            {modal === "clientes" && (
              <>
                <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>👥 Clientes Cadastrados</h2>
                <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>{clientes.length} clientes na base</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {clientes.length === 0 && <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum cliente cadastrado.</p>}
                  {clientes.map(c => (
                    <div key={c.id} style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 16 }}>
                      <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, margin: "0 0 6px" }}>{c.nome}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: cor.textMuted }}>
                        <span>✉️ {c.email || "—"}</span>
                        <span>📞 {c.telefone || "—"}</span>
                        <span>🏙️ {c.cidade || "Não informado"}</span>
                        <span>🗺️ {c.estado || "Não informado"}</span>
                        <span>📌 {c.bairro || "Não informado"}</span>
                        <span>📮 {c.cep || "Não informado"}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {clientes.length > 0 && !clientes[0].cidade && (
                  <p style={{ color: "#fbbf24", fontSize: 12, marginTop: 16 }}>⚠️ Campos de cidade, estado, bairro e CEP ainda não são coletados no cadastro.</p>
                )}
              </>
            )}

            {modal === "produtos" && (
              <>
                <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📦 Desempenho de Produtos</h2>
                <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Ranking de vendas e avaliações</p>
                {[
                  { titulo: "🏆 Mais Vendidos", lista: maisVendidos, campo: "vendidos", sufixo: " vendas", cor2: "#4ade80" },
                  { titulo: "📉 Menos Vendidos", lista: menosVendidos, campo: "vendidos", sufixo: " vendas", cor2: "#f87171" },
                  { titulo: "⭐ Mais Avaliados", lista: maisAvaliados, campo: "avaliacao", sufixo: " ★", cor2: "#fbbf24" },
                  { titulo: "😕 Menos Avaliados", lista: menosAvaliados, campo: "avaliacao", sufixo: " ★", cor2: "#f87171" },
                ].map(bloco => (
                  <div key={bloco.titulo} style={{ marginBottom: 20 }}>
                    <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{bloco.titulo}</p>
                    {bloco.lista.length === 0 && <p style={{ color: cor.textMuted, fontSize: 12 }}>Sem produtos cadastrados.</p>}
                    {bloco.lista.map(p => (
                      <div key={p.id || p.nome} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${cor.border}` }}>
                        <span style={{ color: cor.textMuted, fontSize: 13 }}>{p.nome}</span>
                        <span style={{ color: bloco.cor2, fontSize: 13, fontWeight: 600 }}>{p[bloco.campo]}{bloco.sufixo}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <p style={{ color: "#fbbf24", fontSize: 12 }}>⚠️ Vendas e avaliações são estimadas até integrar contagem real.</p>
              </>
            )}

            {modal === "novosClientes" && (
              <>
                <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🆕 Novos Clientes por Região</h2>
                <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Distribuição por estado e município</p>
                {novosClientesPorRegiao.map(e => (
                  <div key={e.uf} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: cor.text, fontSize: 13, fontWeight: 600 }}>{e.nome} ({e.uf})</span>
                      <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 700 }}>{e.pct}% · ~{e.estimativa} clientes</span>
                    </div>
                    <div style={{ background: cor.border, borderRadius: 4, height: 6, marginBottom: 8 }}>
                      <div style={{ background: "#4ade80", borderRadius: 4, height: 6, width: `${e.pct}%` }} />
                    </div>
                    <div style={{ paddingLeft: 12 }}>
                      {e.cidades.map(c => (
                        <div key={c.nome} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: cor.textMuted, padding: "3px 0" }}>
                          <span>↳ {c.nome}</span>
                          <span>{((c.acessos / totalRegiao) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p style={{ color: "#fbbf24", fontSize: 12, marginTop: 8 }}>⚠️ Estimativa proporcional baseada em acessos simulados.</p>
              </>
            )}

            {modal === "faturamento" && (
              <>
                <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>💰 Gestão Financeira</h2>
                <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Dados reais vindos do módulo Financeiro</p>
                {financeiro ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 16 }}>
                      <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 4 }}>Receita (pedidos + manual)</p>
                      <p style={{ color: cor.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(financeiro.receita_total)}</p>
                    </div>
                    <div style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 16 }}>
                      <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 4 }}>Despesas Pagas</p>
                      <p style={{ color: "#dc2626", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(financeiro.despesas_pagas)}</p>
                    </div>
                    <div style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 16 }}>
                      <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 4 }}>Despesas Pendentes</p>
                      <p style={{ color: "#f59e0b", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(financeiro.despesas_pendentes)}</p>
                    </div>
                    <div style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 16 }}>
                      <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 4 }}>Saldo</p>
                      <p style={{ color: Number(financeiro.saldo) >= 0 ? "#16a34a" : "#dc2626", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(financeiro.saldo)}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando dados financeiros...</p>
                )}
                <button onClick={() => navigate("/central-controle/financeiro")} style={{ background: "none", border: `1px solid ${cor.border}`, color: "#4ade80", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                  Ver detalhes financeiros completos →
                </button>
              </>
            )}

            {modal === "conversao" && (
              <>
                <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>💬 Taxa de Conversão</h2>
                <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Como seus visitantes se tornam clientes</p>
                {[
                  { label: "Acessos totais", v: totalAcessos, cor2: "#38bdf8" },
                  { label: "Clientes cadastrados", v: totalClientesCadastrados, cor2: "#4ade80" },
                  { label: "Fizeram pedido", v: orders.length, cor2: "#a78bfa" },
                  { label: "Pedidos pagos", v: pagos, cor2: "#f59e0b" },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: cor.textMuted, fontSize: 13 }}>{s.label}</span>
                      <span style={{ color: s.cor2, fontWeight: 700, fontSize: 13 }}>{s.v.toLocaleString("pt-BR")}</span>
                    </div>
                    <div style={{ background: cor.border, borderRadius: 4, height: 8 }}>
                      <div style={{ background: s.cor2, borderRadius: 4, height: 8, width: `${Math.min((s.v / (arr[0].v || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
                <div style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 12, padding: 16, marginTop: 12 }}>
                  <p style={{ color: cor.text, fontSize: 14, margin: 0 }}>
                    De cada <strong>100 acessos</strong>, aproximadamente <strong style={{ color: "#4ade80" }}>{((totalClientesCadastrados / totalAcessos) * 100).toFixed(2)}</strong> viram clientes e <strong style={{ color: "#a78bfa" }}>{orders.length > 0 ? ((pagos / totalAcessos) * 100).toFixed(2) : "0.00"}</strong> completam uma compra paga.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}