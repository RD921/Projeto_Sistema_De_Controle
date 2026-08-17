import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api";

export default function Products() {
  const { cor } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome_asc");
  const [selecionados, setSelecionados] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: "", sku: "", preco: "", estoque: "", descricao: "" });
  const [salvando, setSalvando] = useState(false);
  const porPagina = 8;

  const carregar = () => {
    setLoading(true);
    api.get("/products").then(r => setProducts(r.data.data || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/products", form);
      setForm({ nome: "", sku: "", preco: "", estoque: "", descricao: "" });
      setModal(false);
      carregar();
    } catch {}
    finally { setSalvando(false); }
  };

  // ── Filtro + busca + ordenação (client-side) ──
  let lista = products.filter(p => {
    const buscaOk = !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()) || p.sku?.toLowerCase().includes(busca.toLowerCase());
    const statusOk = filtroStatus === "todos" || (filtroStatus === "ativo" && p.ativo) || (filtroStatus === "inativo" && !p.ativo);
    return buscaOk && statusOk;
  });
  lista = [...lista].sort((a, b) => {
    if (ordenacao === "nome_asc") return (a.nome || "").localeCompare(b.nome || "");
    if (ordenacao === "nome_desc") return (b.nome || "").localeCompare(a.nome || "");
    if (ordenacao === "preco_asc") return Number(a.preco) - Number(b.preco);
    if (ordenacao === "preco_desc") return Number(b.preco) - Number(a.preco);
    if (ordenacao === "estoque_asc") return Number(a.estoque) - Number(b.estoque);
    return 0;
  });

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const listaPaginada = lista.slice((pagina - 1) * porPagina, pagina * porPagina);

  const toggleSelecionado = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleTodos = () => {
    if (selecionados.length === listaPaginada.length) setSelecionados([]);
    else setSelecionados(listaPaginada.map(p => p.id));
  };

  const exportarCSV = () => {
    const linhas = [["Nome", "SKU", "Preço", "Estoque", "Status"], ...lista.map(p => [p.nome, p.sku, p.preco, p.estoque, p.ativo ? "Ativo" : "Inativo"])];
    const csv = linhas.map(l => l.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "produtos.csv"; a.click();
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Produtos</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, margin: "4px 0 0" }}>{lista.length} produtos encontrados</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportarCSV} style={{ background: cor.card, border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontFamily: "sans-serif" }}>
            ⬇ Exportar CSV
          </button>
          <button onClick={() => setModal(true)} style={{ background: cor.text, color: cor.bg, border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
            + Novo Produto
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} placeholder="🔍 Buscar por nome ou SKU..." style={{ ...inputStyle, maxWidth: 280 }} />
        <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }} style={{ ...inputStyle, maxWidth: 160, appearance: "none" }}>
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <select value={ordenacao} onChange={e => setOrdenacao(e.target.value)} style={{ ...inputStyle, maxWidth: 200, appearance: "none" }}>
          <option value="nome_asc">Nome (A-Z)</option>
          <option value="nome_desc">Nome (Z-A)</option>
          <option value="preco_asc">Preço (menor)</option>
          <option value="preco_desc">Preço (maior)</option>
          <option value="estoque_asc">Estoque (menor)</option>
        </select>
        {selecionados.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#a78bfa22", border: "1px solid #a78bfa55", borderRadius: 8, padding: "0 14px", fontSize: 13, color: "#a78bfa" }}>
            {selecionados.length} selecionado(s)
            <button onClick={() => setSelecionados([])} style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 13 }}>✕</button>
          </div>
        )}
      </div>

      {/* TABELA */}
      <div style={{ background: cor.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${cor.border}` }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 44, background: cor.cardHover, borderRadius: 8, marginBottom: 8, opacity: 0.5 }} />
            ))}
          </div>
        ) : listaPaginada.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📦</p>
            <p style={{ color: cor.text, fontWeight: 600, margin: 0 }}>Nenhum produto encontrado</p>
            <p style={{ color: cor.textMuted, fontSize: 13, marginTop: 4 }}>Tente ajustar os filtros ou cadastre um novo produto.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>
                  <input type="checkbox" checked={selecionados.length === listaPaginada.length && listaPaginada.length > 0} onChange={toggleTodos} />
                </th>
                {["Nome", "SKU", "Preço", "Estoque", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: cor.textMuted, fontWeight: 600, fontSize: 12.5, borderBottom: `1px solid ${cor.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaPaginada.map(p => (
                <tr key={p.id} style={{ borderTop: `1px solid ${cor.border}`, background: selecionados.includes(p.id) ? cor.cardHover : "transparent" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => toggleSelecionado(p.id)} />
                  </td>
                  <td style={{ padding: "12px 16px", color: cor.text }}>{p.nome}</td>
                  <td style={{ padding: "12px 16px", color: cor.textMuted }}>{p.sku}</td>
                  <td style={{ padding: "12px 16px", color: cor.text }}>R$ {Number(p.preco).toFixed(2)}</td>
                  <td style={{ padding: "12px 16px", color: Number(p.estoque) <= 5 ? "#f87171" : cor.text }}>{p.estoque}{Number(p.estoque) <= 5 && " ⚠️"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: p.ativo ? "#052e16" : "#2d0a0a", color: p.ativo ? "#4ade80" : "#f87171", padding: "2px 10px", borderRadius: 20, fontSize: 12 }}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINAÇÃO */}
      {totalPaginas > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPagina(n)} style={{
              width: 30, height: 30, borderRadius: 8, border: `1px solid ${cor.border}`,
              background: pagina === n ? cor.text : "none", color: pagina === n ? cor.bg : cor.textMuted,
              cursor: "pointer", fontSize: 12.5, fontFamily: "inherit",
            }}>{n}</button>
          ))}
        </div>
      )}

      {/* MODAL CADASTRO */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModal(false)} />
          <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 460 }}>
            <h2 style={{ color: cor.text, marginBottom: 20, fontSize: 17 }}>Novo Produto</h2>
            <form onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do produto" required style={inputStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU" required style={inputStyle} />
                <input type="number" step="0.01" value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} placeholder="Preço" required style={inputStyle} />
              </div>
              <input type="number" value={form.estoque} onChange={e => setForm({ ...form, estoque: e.target.value })} placeholder="Estoque" required style={inputStyle} />
              <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição" rows={3} style={{ ...inputStyle, resize: "none" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                <button type="submit" disabled={salvando} style={{ flex: 1, padding: 11, background: cor.text, color: cor.bg, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}