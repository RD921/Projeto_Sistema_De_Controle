import { useEffect, useState } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import api from "../api";

const SECOES = [
  { id: "executivo", label: "Executivo" },
  { id: "vendas", label: "Vendas" },
  { id: "clientes", label: "Clientes" },
  { id: "logistica", label: "Logística" },
  { id: "produtos", label: "Produtos" },
  { id: "marketplaces", label: "Marketplaces" },
];

function formatarMoeda(valor) {
  const n = Number(valor || 0);
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ── Botao de exportar, compartilhado por todas as secoes ──
const TIPO_POR_SECAO = {
  vendas: "sales",
  clientes: "marketing",
  logistica: "logistics",
  produtos: "products",
  marketplaces: "marketplaces",
  executivo: "executivo",
};

function BotaoExportar({ cor, secaoAtiva, dataInicio, dataFim }) {
  const [exportando, setExportando] = useState(false);

  const exportar = async (format) => {
    const tipo = TIPO_POR_SECAO[secaoAtiva];
    if (!tipo) return;

    setExportando(true);
    try {
      const params = secaoAtiva === "executivo"
        ? { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined, format }
        : { start_date: dataInicio || undefined, end_date: dataFim || undefined, format };

      const resposta = await api.get(`/reports/${tipo}/export`, { params, responseType: "blob" });

      const extensao = format === "xlsx" ? "xlsx" : "pdf";
      const url = window.URL.createObjectURL(new Blob([resposta.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_${secaoAtiva}.${extensao}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.alert("Erro ao exportar relatório. Tente novamente.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={() => exportar("xlsx")}
        disabled={exportando}
        style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, cursor: exportando ? "not-allowed" : "pointer", fontFamily: "inherit" }}
      >
        {exportando ? "Exportando..." : "⬇ Excel"}
      </button>
      <button
        onClick={() => exportar("pdf")}
        disabled={exportando}
        style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, cursor: exportando ? "not-allowed" : "pointer", fontFamily: "inherit" }}
      >
        {exportando ? "Exportando..." : "⬇ PDF"}
      </button>
    </div>
  );
}

// ── Filtro de período compartilhado por todas as seções ──
function FiltroPeriodo({ cor, dataInicio, dataFim, setDataInicio, setDataFim, inputStyle }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <label style={{ color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 }}>De</label>
        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
      </div>
      <div>
        <label style={{ color: cor.textMuted, fontSize: 11, display: "block", marginBottom: 4 }}>Até</label>
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
      </div>
      <p style={{ color: cor.textMuted, fontSize: 11.5, marginTop: 16 }}>
        Deixe em branco para usar os últimos 30 dias (padrão do relatório).
      </p>
    </div>
  );
}

function RelatorioVendas({ cor, cardStyle, inputStyle, dataInicio, dataFim }) {
  const [dados, setDados] = useState(null);
  const [groupBy, setGroupBy] = useState("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/reports/sales", { params: { start_date: dataInicio || undefined, end_date: dataFim || undefined, group_by: groupBy } })
      .then((r) => setDados(r.data))
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim, groupBy]);

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Erro ao carregar relatório de vendas.</p>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
          <option value="day">Agrupar por dia</option>
          <option value="week">Agrupar por semana</option>
          <option value="month">Agrupar por mês</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Total de Pedidos</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.resumo.total_pedidos || 0}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita Total</p>
          <h2 style={{ color: "#16a34a", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.resumo.receita_total)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Ticket Médio</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.resumo.ticket_medio)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Clientes Únicos</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.resumo.clientes_unicos || 0}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Cancelados</p>
          <h2 style={{ color: "#dc2626", fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.resumo.cancelados || 0}</h2>
        </div>
      </div>

      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Evolução por Período</h3>
      {dados.dados.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma venda no período selecionado.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {dados.dados.map((d, i) => (
            <div key={i} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, padding: "10px 16px" }}>
              <span style={{ color: cor.text, fontSize: 13, width: 130 }}>
               {groupBy === "day" ? formatarData(d.periodo) : String(d.periodo)}
             </span>
              <span style={{ color: cor.textMuted, fontSize: 12.5, flex: 1 }}>{d.total_pedidos} pedido(s)</span>
              <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 600 }}>{formatarMoeda(d.receita_total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatorioClientes({ cor, cardStyle, inputStyle, dataInicio, dataFim }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/reports/marketing", { params: { start_date: dataInicio || undefined, end_date: dataFim || undefined } })
      .then((r) => setDados(r.data))
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Erro ao carregar relatório de clientes.</p>;

  return (
    <div>
      <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 16 }}>
        Este relatório analisa clientes e pedidos (não confundir com o módulo Marketing, que trata de campanhas e leads).
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Novos Clientes</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.resumo.novos_clientes}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Clientes Recorrentes</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.resumo.clientes_recorrentes}</h2>
        </div>
      </div>

      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Top Clientes por Valor</h3>
      {dados.top_clientes.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum cliente com pedidos no período.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {dados.top_clientes.map((c) => (
            <div key={c.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{c.nome}</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                  {c.email} · {c.total_pedidos} pedido(s) · último em {formatarData(c.ultimo_pedido)}
                </p>
              </div>
              <p style={{ color: "#16a34a", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>{formatarMoeda(c.valor_total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatorioLogistica({ cor, cardStyle, dataInicio, dataFim }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/reports/logistics", { params: { start_date: dataInicio || undefined, end_date: dataFim || undefined } })
      .then((r) => setDados(r.data))
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Erro ao carregar relatório de logística.</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Total de Produtos</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.resumo.total_produtos}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Estoque Baixo</p>
          <h2 style={{ color: dados.resumo.produtos_estoque_baixo > 0 ? "#f87171" : cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
            {dados.resumo.produtos_estoque_baixo}
          </h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Valor em Estoque</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.resumo.valor_total_estoque)}</h2>
        </div>
      </div>

      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Pedidos por Status</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {dados.status_pedidos.map((s) => (
          <span key={s.status} style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 20, padding: "5px 14px", fontSize: 12.5, color: cor.text }}>
            {s.status}: <strong>{s.total}</strong>
          </span>
        ))}
      </div>

      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Produtos com Estoque Baixo</h3>
      {dados.estoque_baixo.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum produto com estoque baixo.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {dados.estoque_baixo.map((p) => (
            <div key={p.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{p.nome}</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>SKU {p.sku || "—"}</p>
              </div>
              <span style={{ color: "#f87171", fontWeight: 700, fontSize: 14 }}>{p.estoque} un.</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatorioProdutos({ cor, cardStyle, dataInicio, dataFim }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/reports/products", { params: { start_date: dataInicio || undefined, end_date: dataFim || undefined } })
      .then((r) => setDados(r.data))
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Erro ao carregar relatório de produtos.</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Produtos no Ranking</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.resumo.total_produtos}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita Total</p>
          <h2 style={{ color: "#16a34a", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.resumo.receita_total)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Mais Vendido</p>
          <h2 style={{ color: cor.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{dados.resumo.mais_vendido?.nome || "-"}</h2>
        </div>
      </div>

      <h3 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Ranking de Produtos</h3>
      {dados.produtos.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum produto vendido no período.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {dados.produtos.map((p, i) => (
            <div key={p.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ color: cor.textMuted, fontSize: 12, width: 24 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{p.nome}</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                  SKU {p.sku || "—"} · {p.unidades_vendidas} un. vendidas · {p.clientes_distintos} cliente(s)
                </p>
              </div>
              <p style={{ color: "#16a34a", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>{formatarMoeda(p.receita_gerada)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatorioMarketplaces({ cor, cardStyle, dataInicio, dataFim }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/reports/marketplaces", { params: { start_date: dataInicio || undefined, end_date: dataFim || undefined } })
      .then((r) => setDados(r.data))
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Erro ao carregar relatório de marketplaces.</p>;

  return (
    <div>
      {dados.canais.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum canal com vendas no período.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dados.canais.map((c) => (
            <div key={c.marketplace} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0, textTransform: "capitalize" }}>{c.marketplace}</p>
                <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                  {c.total_pedidos} pedido(s) · ticket médio {formatarMoeda(c.ticket_medio)}
                  {c.pagos !== undefined ? ` · ${c.pagos} pago(s), ${c.cancelados} cancelado(s)` : ""}
                </p>
              </div>
              <p style={{ color: "#16a34a", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>{formatarMoeda(c.receita_total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatorioExecutivo({ cor, cardStyle, dataInicio, dataFim }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/bi/executivo", { params: { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined } })
      .then((r) => setDados(r.data))
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  if (loading) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>;
  if (!dados) return <p style={{ color: cor.textMuted, fontSize: 13 }}>Erro ao carregar dashboard executivo.</p>;

  return (
    <div>
      <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 20 }}>
        Visão cruzada de Vendas, Financeiro, CRM, Estoque e Marketing numa única página. CRM, Estoque e Marketing refletem o estado atual do negócio (sem filtro de período); Vendas e Financeiro respeitam o filtro acima.
      </p>

      <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Vendas</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Total de Pedidos</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.vendas.total_pedidos}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita de Vendas</p>
          <h2 style={{ color: "#16a34a", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.vendas.receita_total)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Ticket Médio</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.vendas.ticket_medio)}</h2>
        </div>
      </div>

      <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Financeiro</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita Total</p>
          <h2 style={{ color: "#16a34a", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.financeiro.receita_total)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Despesas Pagas</p>
          <h2 style={{ color: "#dc2626", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.financeiro.despesas_pagas)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Despesas Pendentes</p>
          <h2 style={{ color: "#f59e0b", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.financeiro.despesas_pendentes)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Saldo</p>
          <h2 style={{ color: Number(dados.financeiro.saldo) >= 0 ? "#16a34a" : "#dc2626", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.financeiro.saldo)}</h2>
        </div>
      </div>

      <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>CRM</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Taxa de Conversão</p>
          <h2 style={{ color: "#4ade80", fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.crm.taxa_conversao != null ? dados.crm.taxa_conversao + "%" : "-"}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita Ganha</p>
          <h2 style={{ color: "#16a34a", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(dados.crm.receita_ganha)}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Pipeline Aberto</p>
          <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.crm.pipeline_aberto.total_deals} deal(s)</h2>
          <p style={{ color: cor.textMuted, fontSize: 11, margin: "4px 0 0" }}>{formatarMoeda(dados.crm.pipeline_aberto.valor_total)}</p>
        </div>
        <div style={cardStyle}>
          <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Tarefas Vencidas</p>
          <h2 style={{ color: dados.crm.tarefas_vencidas > 0 ? "#f87171" : cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.crm.tarefas_vencidas}</h2>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Estoque</h3>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Produtos com Estoque Baixo</p>
            <h2 style={{ color: dados.estoque.produtos_estoque_baixo > 0 ? "#f87171" : cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.estoque.produtos_estoque_baixo}</h2>
          </div>
        </div>
        <div>
          <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Marketing</h3>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Leads / Conversões</p>
            <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{dados.marketing.total_leads} leads · {dados.marketing.total_conversoes} conv.</h2>
            <p style={{ color: "#16a34a", fontSize: 11, margin: "4px 0 0" }}>{formatarMoeda(dados.marketing.receita_atribuida)} atribuído</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Relatorios() {
  const { cor } = useOutletContext();
  const { secao } = useParams();
  const navigate = useNavigate();
  const secaoAtiva = secao || "vendas";

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 14, padding: 20 };
  const inputStyle = { padding: "9px 12px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };

  return (
    <div>
      <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Relatórios</h1>
      <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Visão consolidada de vendas, clientes, logística, produtos e marketplaces.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {SECOES.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/relatorios/${s.id}`)}
            style={{
              background: secaoAtiva === s.id ? cor.text : "none",
              color: secaoAtiva === s.id ? cor.bg : cor.textMuted,
              border: `1px solid ${cor.border}`,
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <FiltroPeriodo cor={cor} dataInicio={dataInicio} dataFim={dataFim} setDataInicio={setDataInicio} setDataFim={setDataFim} inputStyle={inputStyle} />
        <BotaoExportar cor={cor} secaoAtiva={secaoAtiva} dataInicio={dataInicio} dataFim={dataFim} />
      </div>

      {secaoAtiva === "executivo" && <RelatorioExecutivo cor={cor} cardStyle={cardStyle} dataInicio={dataInicio} dataFim={dataFim} />}
      {secaoAtiva === "vendas" && <RelatorioVendas cor={cor} cardStyle={cardStyle} inputStyle={inputStyle} dataInicio={dataInicio} dataFim={dataFim} />}
      {secaoAtiva === "clientes" && <RelatorioClientes cor={cor} cardStyle={cardStyle} inputStyle={inputStyle} dataInicio={dataInicio} dataFim={dataFim} />}
      {secaoAtiva === "logistica" && <RelatorioLogistica cor={cor} cardStyle={cardStyle} dataInicio={dataInicio} dataFim={dataFim} />}
      {secaoAtiva === "produtos" && <RelatorioProdutos cor={cor} cardStyle={cardStyle} dataInicio={dataInicio} dataFim={dataFim} />}
      {secaoAtiva === "marketplaces" && <RelatorioMarketplaces cor={cor} cardStyle={cardStyle} dataInicio={dataInicio} dataFim={dataFim} />}
    </div>
  );
}