import { useEffect, useState } from "react";
import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import api from "../api";

const CATEGORIAS = ["fornecedores", "marketing", "impostos", "folha", "aluguel", "outros"];

const REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
  { value: "isento", label: "Isento" },
];

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const TIPOS_CONTA = [
  { value: "ativo", label: "Ativo" },
  { value: "passivo", label: "Passivo" },
  { value: "patrimonio_liquido", label: "Patrimônio Líquido" },
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
];

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Financeiro() {
  const { cor } = useOutletContext();
  const navigate = useNavigate();
  const { secao } = useParams();
  const secaoAtiva = secao || "resumo";

  // ── aba Resumo ──
  const [resumo, setResumo] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ tipo: "despesa", categoria: "outros", descricao: "", valor: "", data_vencimento: "" });

  // ── aba Fiscal e Contábil (cadastro da empresa) ──
  const [dadosFiscais, setDadosFiscais] = useState({
    cnpj: "", razao_social: "", nome_fantasia: "", inscricao_estadual: "", inscricao_municipal: "",
    regime_tributario: "simples_nacional", natureza_juridica: "", cnaes: "",
    cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", pais: "Brasil",
    contador_nome: "", contador_email: "", contador_telefone: "", contador_crc: "",
  });
  const [loadingFiscal, setLoadingFiscal] = useState(true);
  const [salvandoFiscal, setSalvandoFiscal] = useState(false);
  const [avisoFiscal, setAvisoFiscal] = useState(null);

  // ── aba Contabilidade ──
  const [abaContabil, setAbaContabil] = useState("plano-contas");
  const [contas, setContas] = useState([]);
  const [loadingContas, setLoadingContas] = useState(true);
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [formConta, setFormConta] = useState({ codigo: "", nome: "", tipo: "despesa", natureza: "devedora", conta_pai_id: "", nivel: "analitica" });
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [erroConta, setErroConta] = useState("");

  const [lancamentosContabeis, setLancamentosContabeis] = useState([]);
  const [loadingLancContabeis, setLoadingLancContabeis] = useState(true);
  const [modalLancAberto, setModalLancAberto] = useState(false);
  const [formLanc, setFormLanc] = useState({ data: "", historico: "", documento: "", linhas: [{ conta_id: "", tipo: "debito", valor: "" }, { conta_id: "", tipo: "credito", valor: "" }] });
  const [salvandoLanc, setSalvandoLanc] = useState(false);
  const [erroLanc, setErroLanc] = useState("");
  const [detalheLanc, setDetalheLanc] = useState(null);

  const [balancete, setBalancete] = useState([]);
  const [loadingBalancete, setLoadingBalancete] = useState(true);
  const [dre, setDre] = useState(null);
  const [loadingDre, setLoadingDre] = useState(true);
  const [balanco, setBalanco] = useState(null);
  const [loadingBalanco, setLoadingBalanco] = useState(true);

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.get("/financeiro/resumo"),
      api.get("/financeiro/lancamentos", { params: { tipo: filtroTipo || undefined, status: filtroStatus || undefined } }),
    ])
      .then(([r1, r2]) => { setResumo(r1.data); setLancamentos(r2.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (secaoAtiva === "resumo") carregar(); }, [filtroTipo, filtroStatus, secaoAtiva]);

  useEffect(() => {
    if (secaoAtiva !== "fiscal") return;
    setLoadingFiscal(true);
    api.get("/financeiro/fiscal")
      .then(r => { if (r.data) setDadosFiscais(prev => ({ ...prev, ...r.data })); })
      .catch(() => {})
      .finally(() => setLoadingFiscal(false));
  }, [secaoAtiva]);

  const carregarContas = () => {
    setLoadingContas(true);
    api.get("/contabilidade/contas").then(r => setContas(r.data || [])).catch(() => {}).finally(() => setLoadingContas(false));
  };

  const carregarLancamentosContabeis = () => {
    setLoadingLancContabeis(true);
    api.get("/contabilidade/lancamentos").then(r => setLancamentosContabeis(r.data || [])).catch(() => {}).finally(() => setLoadingLancContabeis(false));
  };

  const carregarBalancete = () => {
    setLoadingBalancete(true);
    api.get("/contabilidade/balancete").then(r => setBalancete(r.data || [])).catch(() => {}).finally(() => setLoadingBalancete(false));
  };

  const carregarDre = () => {
    setLoadingDre(true);
    api.get("/contabilidade/dre").then(r => setDre(r.data)).catch(() => {}).finally(() => setLoadingDre(false));
  };

  const carregarBalanco = () => {
  setLoadingBalanco(true);
  api.get("/contabilidade/balanco").then(r => setBalanco(r.data)).catch(() => {}).finally(() => setLoadingBalanco(false));
};

  useEffect(() => {
  if (secaoAtiva !== "contabilidade") return;
  carregarContas();
  if (abaContabil === "lancamentos") carregarLancamentosContabeis();
  if (abaContabil === "balancete") carregarBalancete();
  if (abaContabil === "dre") carregarDre();
  if (abaContabil === "balanco") carregarBalanco();
}, [secaoAtiva, abaContabil]);

  const abrirModal = () => {
    setForm({ tipo: "despesa", categoria: "outros", descricao: "", valor: "", data_vencimento: "" });
    setErro("");
    setModalAberto(true);
  };

  const salvarLancamento = async (e) => {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.data_vencimento) {
      setErro("Preencha todos os campos.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.post("/financeiro/lancamentos", form);
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao salvar lançamento.");
    } finally {
      setSalvando(false);
    }
  };

  const marcarPago = async (id) => {
    try {
      await api.post(`/financeiro/lancamentos/${id}/pagar`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao marcar como pago.");
    }
  };

  const excluir = async (id) => {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await api.delete(`/financeiro/lancamentos/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  const salvarDadosFiscais = async (e) => {
    e.preventDefault();
    setSalvandoFiscal(true);
    setAvisoFiscal(null);
    try {
      await api.post("/financeiro/fiscal", dadosFiscais);
      setAvisoFiscal({ tipo: "sucesso", texto: "Dados fiscais salvos com sucesso." });
    } catch (err) {
      setAvisoFiscal({ tipo: "erro", texto: err.response?.data?.error || "Erro ao salvar dados fiscais." });
    } finally {
      setSalvandoFiscal(false);
    }
  };

  useEffect(() => {
    if (!avisoFiscal) return;
    const t = setTimeout(() => setAvisoFiscal(null), 4000);
    return () => clearTimeout(t);
  }, [avisoFiscal]);

  const setCampoFiscal = (campo, valor) => setDadosFiscais(prev => ({ ...prev, [campo]: valor }));

  // ── handlers Contabilidade ──

  const abrirModalConta = () => {
    setFormConta({ codigo: "", nome: "", tipo: "despesa", natureza: "devedora", conta_pai_id: "", nivel: "analitica" });
    setErroConta("");
    setModalContaAberto(true);
  };

  const salvarConta = async (e) => {
    e.preventDefault();
    if (!formConta.codigo || !formConta.nome) {
      setErroConta("Preencha código e nome.");
      return;
    }
    setSalvandoConta(true);
    setErroConta("");
    try {
      await api.post("/contabilidade/contas", { ...formConta, conta_pai_id: formConta.conta_pai_id || null });
      setModalContaAberto(false);
      carregarContas();
    } catch (err) {
      setErroConta(err.response?.data?.error || "Erro ao salvar conta.");
    } finally {
      setSalvandoConta(false);
    }
  };

  const desativarConta = async (id) => {
    if (!confirm("Desativar esta conta?")) return;
    try {
      await api.delete(`/contabilidade/contas/${id}`);
      carregarContas();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao desativar conta.");
    }
  };

  const contasAnaliticas = contas.filter(c => c.nivel === "analitica" && c.ativo);

  const abrirModalLanc = () => {
    setFormLanc({ data: "", historico: "", documento: "", linhas: [{ conta_id: "", tipo: "debito", valor: "" }, { conta_id: "", tipo: "credito", valor: "" }] });
    setErroLanc("");
    setModalLancAberto(true);
  };

  const atualizarLinha = (idx, campo, valor) => {
    setFormLanc(prev => {
      const linhas = [...prev.linhas];
      linhas[idx] = { ...linhas[idx], [campo]: valor };
      return { ...prev, linhas };
    });
  };

  const adicionarLinha = (tipo) => {
    setFormLanc(prev => ({ ...prev, linhas: [...prev.linhas, { conta_id: "", tipo, valor: "" }] }));
  };

  const removerLinha = (idx) => {
    setFormLanc(prev => ({ ...prev, linhas: prev.linhas.filter((_, i) => i !== idx) }));
  };

  const totalDebitoForm = formLanc.linhas.filter(l => l.tipo === "debito").reduce((a, l) => a + Number(l.valor || 0), 0);
  const totalCreditoForm = formLanc.linhas.filter(l => l.tipo === "credito").reduce((a, l) => a + Number(l.valor || 0), 0);
  const balanceado = totalDebitoForm > 0 && Math.abs(totalDebitoForm - totalCreditoForm) < 0.01;

  const salvarLancamentoContabil = async (e) => {
    e.preventDefault();
    if (!formLanc.data || !formLanc.historico) {
      setErroLanc("Preencha data e histórico.");
      return;
    }
    if (!balanceado) {
      setErroLanc("Débito e crédito precisam ter o mesmo valor total.");
      return;
    }
    setSalvandoLanc(true);
    setErroLanc("");
    try {
      await api.post("/contabilidade/lancamentos", formLanc);
      setModalLancAberto(false);
      carregarLancamentosContabeis();
    } catch (err) {
      setErroLanc(err.response?.data?.error || "Erro ao salvar lançamento.");
    } finally {
      setSalvandoLanc(false);
    }
  };

  const abrirDetalheLanc = async (id) => {
    try {
      const r = await api.get(`/contabilidade/lancamentos/${id}`);
      setDetalheLanc(r.data);
    } catch {
      alert("Erro ao carregar detalhes do lançamento.");
    }
  };

  const excluirLancamentoContabil = async (id) => {
    if (!confirm("Excluir este lançamento contábil?")) return;
    try {
      await api.delete(`/contabilidade/lancamentos/${id}`);
      setDetalheLanc(null);
      carregarLancamentosContabeis();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 14, padding: 20 };
  const inputStyle = { width: "100%", padding: "10px 14px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif", marginBottom: 12 };
  const labelStyle = { fontSize: 12, color: cor.textMuted, marginBottom: 4, display: "block" };

  return (
    <div>
      {secaoAtiva === "resumo" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Financeiro</h1>
            <button onClick={abrirModal} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
              + Novo Lançamento
            </button>
          </div>

          {resumo && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
              <div style={cardStyle}>
                <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Receita (pedidos + manual)</p>
                <h2 style={{ color: "#16a34a", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumo.receita_total)}</h2>
                <p style={{ color: cor.textMuted, fontSize: 11, margin: "4px 0 0" }}>{resumo.qtd_pedidos} pedidos pagos</p>
              </div>
              <div style={cardStyle}>
                <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Despesas pagas</p>
                <h2 style={{ color: "#dc2626", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumo.despesas_pagas)}</h2>
              </div>
              <div style={cardStyle}>
                <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Despesas pendentes</p>
                <h2 style={{ color: "#f59e0b", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumo.despesas_pendentes)}</h2>
              </div>
              <div style={cardStyle}>
                <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Saldo</p>
                <h2 style={{ color: resumo.saldo >= 0 ? "#16a34a" : "#dc2626", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumo.saldo)}</h2>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
              <option value="">Todos os tipos</option>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>

          {loading ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : lancamentos.length === 0 ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum lançamento manual ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lancamentos.map(l => (
                <div key={l.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: l.tipo === "receita" ? "#16a34a" : "#dc2626" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{l.descricao}</p>
                    <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>
                      {l.categoria} · vence em {new Date(l.data_vencimento).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p style={{ color: l.tipo === "receita" ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>
                    {l.tipo === "receita" ? "+" : "-"} {formatarMoeda(l.valor)}
                  </p>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                    background: l.status === "pago" ? "#16a34a22" : l.status === "atrasado" ? "#dc262622" : "#f59e0b22",
                    color: l.status === "pago" ? "#16a34a" : l.status === "atrasado" ? "#dc2626" : "#f59e0b",
                  }}>
                    {l.status}
                  </span>
                  {l.status !== "pago" && (
                    <button onClick={() => marcarPago(l.id)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                      Marcar pago
                    </button>
                  )}
                  <button onClick={() => excluir(l.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}

          {modalAberto && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalAberto(false)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
                <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Novo Lançamento</h2>
                <form onSubmit={salvarLancamento}>
                  <label style={labelStyle}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                  <label style={labelStyle}>Categoria</label>
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label style={labelStyle}>Descrição</label>
                  <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={inputStyle} placeholder="Ex: Fornecedor de embalagens" />
                  <label style={labelStyle}>Valor (R$)</label>
                  <input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={inputStyle} placeholder="0,00" />
                  <label style={labelStyle}>Data de vencimento</label>
                  <input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} style={inputStyle} />
                  {erro && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    <button type="submit" disabled={salvando} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                      {salvando ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {secaoAtiva === "fiscal" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Fiscal e Contábil</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 24 }}>Cadastro fiscal da empresa — base para notas fiscais, obrigações e cálculo de impostos.</p>

          {avisoFiscal && (
            <div style={{
              marginBottom: 18, padding: "12px 16px", borderRadius: 10, fontSize: 13.5,
              background: avisoFiscal.tipo === "sucesso" ? "#16a34a15" : "#dc262615",
              color: avisoFiscal.tipo === "sucesso" ? "#16a34a" : "#dc2626",
              border: `1px solid ${avisoFiscal.tipo === "sucesso" ? "#16a34a40" : "#dc262640"}`,
            }}>
              {avisoFiscal.texto}
            </div>
          )}

          {loadingFiscal ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : (
            <form onSubmit={salvarDadosFiscais}>
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Identificação</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={labelStyle}>CNPJ</label><input value={dadosFiscais.cnpj || ""} onChange={e => setCampoFiscal("cnpj", e.target.value)} style={inputStyle} placeholder="00.000.000/0000-00" /></div>
                  <div><label style={labelStyle}>Regime Tributário</label>
                    <select value={dadosFiscais.regime_tributario || "simples_nacional"} onChange={e => setCampoFiscal("regime_tributario", e.target.value)} style={inputStyle}>
                      {REGIMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Razão Social</label><input value={dadosFiscais.razao_social || ""} onChange={e => setCampoFiscal("razao_social", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Nome Fantasia</label><input value={dadosFiscais.nome_fantasia || ""} onChange={e => setCampoFiscal("nome_fantasia", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Inscrição Estadual</label><input value={dadosFiscais.inscricao_estadual || ""} onChange={e => setCampoFiscal("inscricao_estadual", e.target.value)} style={inputStyle} placeholder="Ou 'Isento'" /></div>
                  <div><label style={labelStyle}>Inscrição Municipal</label><input value={dadosFiscais.inscricao_municipal || ""} onChange={e => setCampoFiscal("inscricao_municipal", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Natureza Jurídica</label><input value={dadosFiscais.natureza_juridica || ""} onChange={e => setCampoFiscal("natureza_juridica", e.target.value)} style={inputStyle} placeholder="Ex: Sociedade Empresária Limitada" /></div>
                  <div><label style={labelStyle}>CNAEs</label><input value={dadosFiscais.cnaes || ""} onChange={e => setCampoFiscal("cnaes", e.target.value)} style={inputStyle} placeholder="Ex: 4771-7/01, 4772-5/00" /></div>
                </div>
              </div>

              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Endereço</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div><label style={labelStyle}>CEP</label><input value={dadosFiscais.cep || ""} onChange={e => setCampoFiscal("cep", e.target.value)} style={inputStyle} /></div>
                  <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Endereço</label><input value={dadosFiscais.endereco || ""} onChange={e => setCampoFiscal("endereco", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Número</label><input value={dadosFiscais.numero || ""} onChange={e => setCampoFiscal("numero", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Complemento</label><input value={dadosFiscais.complemento || ""} onChange={e => setCampoFiscal("complemento", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Bairro</label><input value={dadosFiscais.bairro || ""} onChange={e => setCampoFiscal("bairro", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cidade</label><input value={dadosFiscais.cidade || ""} onChange={e => setCampoFiscal("cidade", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Estado</label>
                    <select value={dadosFiscais.estado || ""} onChange={e => setCampoFiscal("estado", e.target.value)} style={inputStyle}>
                      <option value="">—</option>
                      {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>País</label><input value={dadosFiscais.pais || "Brasil"} onChange={e => setCampoFiscal("pais", e.target.value)} style={inputStyle} /></div>
                </div>
              </div>

              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Contador Responsável</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={labelStyle}>Nome</label><input value={dadosFiscais.contador_nome || ""} onChange={e => setCampoFiscal("contador_nome", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>CRC</label><input value={dadosFiscais.contador_crc || ""} onChange={e => setCampoFiscal("contador_crc", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>E-mail</label><input type="email" value={dadosFiscais.contador_email || ""} onChange={e => setCampoFiscal("contador_email", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Telefone</label><input value={dadosFiscais.contador_telefone || ""} onChange={e => setCampoFiscal("contador_telefone", e.target.value)} style={inputStyle} /></div>
                </div>
              </div>

              <button type="submit" disabled={salvandoFiscal} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13.5, fontWeight: 600, cursor: salvandoFiscal ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {salvandoFiscal ? "Salvando..." : "Salvar dados fiscais"}
              </button>
            </form>
          )}
        </div>
      )}

      {secaoAtiva === "contabilidade" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Contabilidade</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Plano de contas, lançamentos por partida dobrada, balancete e DRE.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "plano-contas", label: "📚 Plano de Contas" },
              { id: "lancamentos", label: "✍️ Lançamentos" },
              { id: "balancete", label: "📊 Balancete" },
              { id: "dre", label: "📈 DRE" },
              { id: "balanco", label: "⚖️ Balanço" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaContabil(tab.id)} style={{
                background: abaContabil === tab.id ? cor.text : "none",
                color: abaContabil === tab.id ? cor.bg : cor.textMuted,
                border: `1px solid ${cor.border}`, borderRadius: 8, padding: "7px 16px",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {abaContabil === "plano-contas" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button onClick={abrirModalConta} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                  + Nova Conta
                </button>
              </div>
              {loadingContas ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {contas.map(c => (
                    <div key={c.id} style={{
                      ...cardStyle, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
                      opacity: c.ativo ? 1 : 0.5,
                      paddingLeft: c.codigo.split(".").length > 1 ? 16 + (c.codigo.split(".").length - 1) * 20 : 16,
                    }}>
                      <span style={{ color: cor.textMuted, fontSize: 12, fontFamily: "monospace", width: 70, flexShrink: 0 }}>{c.codigo}</span>
                      <span style={{ color: cor.text, fontSize: 13, fontWeight: c.nivel === "sintetica" ? 700 : 400, flex: 1 }}>{c.nome}</span>
                      <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                        {c.nivel === "sintetica" ? "Sintética" : "Analítica"}
                      </span>
                      <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                        {TIPOS_CONTA.find(t => t.value === c.tipo)?.label}
                      </span>
                      {c.ativo && (
                        <button onClick={() => desativarConta(c.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit", flexShrink: 0 }}>
                          Desativar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {abaContabil === "lancamentos" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button onClick={abrirModalLanc} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                  + Novo Lançamento Contábil
                </button>
              </div>
              {loadingLancContabeis ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : lancamentosContabeis.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum lançamento contábil ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lancamentosContabeis.map(l => (
                    <div key={l.id} onClick={() => abrirDetalheLanc(l.id)} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{l.historico}</p>
                        <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>
                          {new Date(l.data).toLocaleDateString("pt-BR")} {l.documento ? `· ${l.documento}` : ""}
                        </p>
                      </div>
                      <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>{formatarMoeda(l.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {abaContabil === "balancete" && (
            <div>
              {loadingBalancete ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", padding: "8px 16px", fontSize: 11, color: cor.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
                    <span style={{ width: 70 }}>Código</span>
                    <span style={{ flex: 1 }}>Conta</span>
                    <span style={{ width: 120, textAlign: "right" }}>Débito</span>
                    <span style={{ width: 120, textAlign: "right" }}>Crédito</span>
                    <span style={{ width: 120, textAlign: "right" }}>Saldo</span>
                  </div>
                  {balancete.map(c => (
                    <div key={c.id} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center", fontWeight: c.nivel === "sintetica" ? 700 : 400 }}>
                      <span style={{ color: cor.textMuted, fontSize: 12, fontFamily: "monospace", width: 70 }}>{c.codigo}</span>
                      <span style={{ color: cor.text, fontSize: 13, flex: 1 }}>{c.nome}</span>
                      <span style={{ color: cor.textMuted, fontSize: 12.5, width: 120, textAlign: "right" }}>{formatarMoeda(c.total_debito)}</span>
                      <span style={{ color: cor.textMuted, fontSize: 12.5, width: 120, textAlign: "right" }}>{formatarMoeda(c.total_credito)}</span>
                      <span style={{ color: Number(c.saldo) >= 0 ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 700, width: 120, textAlign: "right" }}>{formatarMoeda(c.saldo)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {abaContabil === "dre" && (
            <div>
              {loadingDre ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : !dre ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Sem dados suficientes ainda.</p>
              ) : (
                <div style={{ maxWidth: 560 }}>
                  <div style={cardStyle}>
                    <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Receitas</p>
                    {dre.receitas.length === 0 ? (
                      <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 10 }}>Nenhuma receita lançada no período.</p>
                    ) : dre.receitas.map(r => (
                      <div key={r.codigo} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${cor.border}` }}>
                        <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{r.nome}</span>
                        <span style={{ color: "#16a34a", fontSize: 12.5, fontWeight: 600 }}>{formatarMoeda(r.valor)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6 }}>
                      <span style={{ color: cor.text, fontSize: 13, fontWeight: 700 }}>Total de Receitas</span>
                      <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 700 }}>{formatarMoeda(dre.total_receitas)}</span>
                    </div>
                  </div>

                  <div style={{ ...cardStyle, marginTop: 14 }}>
                    <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Despesas</p>
                    {dre.despesas.length === 0 ? (
                      <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 10 }}>Nenhuma despesa lançada no período.</p>
                    ) : dre.despesas.map(d => (
                      <div key={d.codigo} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${cor.border}` }}>
                        <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{d.nome}</span>
                        <span style={{ color: "#dc2626", fontSize: 12.5, fontWeight: 600 }}>{formatarMoeda(d.valor)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6 }}>
                      <span style={{ color: cor.text, fontSize: 13, fontWeight: 700 }}>Total de Despesas</span>
                      <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{formatarMoeda(dre.total_despesas)}</span>
                    </div>
                  </div>

                  <div style={{
                    ...cardStyle, marginTop: 14,
                    background: Number(dre.resultado_liquido) >= 0 ? "#16a34a10" : "#dc262610",
                    border: `1px solid ${Number(dre.resultado_liquido) >= 0 ? "#16a34a40" : "#dc262640"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ color: cor.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Resultado Líquido</p>
                        <p style={{ color: cor.textMuted, fontSize: 12, margin: "4px 0 0" }}>Margem líquida: {dre.margem_liquida}%</p>
                      </div>
                      <p style={{ color: Number(dre.resultado_liquido) >= 0 ? "#16a34a" : "#dc2626", fontSize: 24, fontWeight: 700, margin: 0 }}>
                        {formatarMoeda(dre.resultado_liquido)}
                      </p>
                    </div>
                  </div>

                  <p style={{ color: cor.textMuted, fontSize: 11.5, marginTop: 14 }}>
                    ⚠️ A DRE considera apenas lançamentos contábeis registrados manualmente em Contabilidade → Lançamentos, não os lançamentos financeiros simples (aba Resumo). Para números completos, registre as movimentações relevantes como lançamentos contábeis com partida dobrada.
                  </p>
                </div>
              )}
            </div>
          )}

          {abaContabil === "balanco" && (
      <div>
    {loadingBalanco ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : !balanco ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Sem dados suficientes ainda.</p>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 900 }}>
        <div style={cardStyle}>
          <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Ativo</p>
          {balanco.ativo.length === 0 ? (
            <p style={{ color: cor.textMuted, fontSize: 12.5 }}>Nenhuma movimentação de ativo.</p>
          ) : balanco.ativo.map(a => (
            <div key={a.codigo} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${cor.border}` }}>
              <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{a.nome}</span>
              <span style={{ color: cor.text, fontSize: 12.5, fontWeight: 600 }}>{formatarMoeda(a.valor)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6 }}>
            <span style={{ color: cor.text, fontSize: 13, fontWeight: 700 }}>Total do Ativo</span>
            <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 700 }}>{formatarMoeda(balanco.total_ativo)}</span>
          </div>
        </div>

        <div>
          <div style={cardStyle}>
            <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Passivo</p>
            {balanco.passivo.length === 0 ? (
              <p style={{ color: cor.textMuted, fontSize: 12.5 }}>Nenhuma movimentação de passivo.</p>
            ) : balanco.passivo.map(p => (
              <div key={p.codigo} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${cor.border}` }}>
                <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{p.nome}</span>
                <span style={{ color: cor.text, fontSize: 12.5, fontWeight: 600 }}>{formatarMoeda(p.valor)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6 }}>
              <span style={{ color: cor.text, fontSize: 13, fontWeight: 700 }}>Total do Passivo</span>
              <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{formatarMoeda(balanco.total_passivo)}</span>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: 14 }}>
            <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Patrimônio Líquido</p>
            {balanco.patrimonio_liquido.map(p => (
              <div key={p.codigo} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${cor.border}` }}>
                <span style={{ color: cor.textMuted, fontSize: 12.5 }}>{p.nome}</span>
                <span style={{ color: cor.text, fontSize: 12.5, fontWeight: 600 }}>{formatarMoeda(p.valor)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${cor.border}` }}>
              <span style={{ color: cor.textMuted, fontSize: 12.5 }}>Resultado do Exercício</span>
              <span style={{ color: cor.text, fontSize: 12.5, fontWeight: 600 }}>{formatarMoeda(balanco.resultado_exercicio)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6 }}>
              <span style={{ color: cor.text, fontSize: 13, fontWeight: 700 }}>Total do PL</span>
              <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700 }}>{formatarMoeda(balanco.total_patrimonio_liquido)}</span>
            </div>
          </div>
        </div>

        <div style={{
          gridColumn: "span 2", padding: "14px 20px", borderRadius: 14,
          background: balanco.balanceado ? "#16a34a10" : "#dc262610",
          border: `1px solid ${balanco.balanceado ? "#16a34a40" : "#dc262640"}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ color: cor.text, fontSize: 13, fontWeight: 600 }}>
            Ativo ({formatarMoeda(balanco.total_ativo)}) = Passivo + PL ({formatarMoeda(balanco.total_passivo_mais_pl)})
          </span>
          <span style={{ color: balanco.balanceado ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 700 }}>
            {balanco.balanceado ? "✓ Balanço fechado" : `✗ Diferença de ${formatarMoeda(balanco.diferenca)}`}
          </span>
        </div>
      </div>
    )}
  </div>
)}

          {/* Modal Nova Conta */}
          {modalContaAberto && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalContaAberto(false)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
                <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Nova Conta</h2>
                <form onSubmit={salvarConta}>
                  <label style={labelStyle}>Código (ex: 1.1.04)</label>
                  <input value={formConta.codigo} onChange={e => setFormConta({ ...formConta, codigo: e.target.value })} style={inputStyle} placeholder="1.1.04" />
                  <label style={labelStyle}>Nome</label>
                  <input value={formConta.nome} onChange={e => setFormConta({ ...formConta, nome: e.target.value })} style={inputStyle} />
                  <label style={labelStyle}>Tipo</label>
                  <select value={formConta.tipo} onChange={e => setFormConta({ ...formConta, tipo: e.target.value })} style={inputStyle}>
                    {TIPOS_CONTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <label style={labelStyle}>Natureza</label>
                  <select value={formConta.natureza} onChange={e => setFormConta({ ...formConta, natureza: e.target.value })} style={inputStyle}>
                    <option value="devedora">Devedora</option>
                    <option value="credora">Credora</option>
                  </select>
                  <label style={labelStyle}>Nível</label>
                  <select value={formConta.nivel} onChange={e => setFormConta({ ...formConta, nivel: e.target.value })} style={inputStyle}>
                    <option value="analitica">Analítica (recebe lançamentos)</option>
                    <option value="sintetica">Sintética (agrupadora)</option>
                  </select>
                  <label style={labelStyle}>Conta Pai (opcional)</label>
                  <select value={formConta.conta_pai_id} onChange={e => setFormConta({ ...formConta, conta_pai_id: e.target.value })} style={inputStyle}>
                    <option value="">— Nenhuma —</option>
                    {contas.filter(c => c.nivel === "sintetica").map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                    ))}
                  </select>
                  {erroConta && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroConta}</p>}
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={() => setModalContaAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    <button type="submit" disabled={salvandoConta} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                      {salvandoConta ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Novo Lançamento Contábil */}
          {modalLancAberto && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalLancAberto(false)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto" }}>
                <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Novo Lançamento Contábil</h2>
                <form onSubmit={salvarLancamentoContabil}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={labelStyle}>Data</label><input type="date" value={formLanc.data} onChange={e => setFormLanc({ ...formLanc, data: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Documento (opcional)</label><input value={formLanc.documento} onChange={e => setFormLanc({ ...formLanc, documento: e.target.value })} style={inputStyle} /></div>
                  </div>
                  <label style={labelStyle}>Histórico</label>
                  <input value={formLanc.historico} onChange={e => setFormLanc({ ...formLanc, historico: e.target.value })} style={inputStyle} placeholder="Ex: Pagamento de fornecedor X" />

                  <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, margin: "16px 0 8px" }}>Linhas do lançamento</p>
                  {formLanc.linhas.map((linha, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <select value={linha.tipo} onChange={e => atualizarLinha(idx, "tipo", e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: 100, flexShrink: 0 }}>
                        <option value="debito">Débito</option>
                        <option value="credito">Crédito</option>
                      </select>
                      <select value={linha.conta_id} onChange={e => atualizarLinha(idx, "conta_id", e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }}>
                        <option value="">Selecione a conta...</option>
                        {contasAnaliticas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
                      </select>
                      <input type="number" step="0.01" value={linha.valor} onChange={e => atualizarLinha(idx, "valor", e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: 110, flexShrink: 0 }} placeholder="0,00" />
                      {formLanc.linhas.length > 2 && (
                        <button type="button" onClick={() => removerLinha(idx)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <button type="button" onClick={() => adicionarLinha("debito")} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit" }}>+ linha débito</button>
                    <button type="button" onClick={() => adicionarLinha("credito")} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit" }}>+ linha crédito</button>
                  </div>

                  <div style={{
                    display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                    background: balanceado ? "#16a34a15" : "#dc262615",
                    border: `1px solid ${balanceado ? "#16a34a40" : "#dc262640"}`,
                  }}>
                    <span style={{ fontSize: 12.5, color: cor.text }}>Débito: {formatarMoeda(totalDebitoForm)} · Crédito: {formatarMoeda(totalCreditoForm)}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: balanceado ? "#16a34a" : "#dc2626" }}>{balanceado ? "✓ Balanceado" : "✗ Não balanceado"}</span>
                  </div>

                  {erroLanc && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroLanc}</p>}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => setModalLancAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    <button type="submit" disabled={salvandoLanc || !balanceado} style={{ flex: 1, padding: 11, background: balanceado ? "#16a34a" : cor.border, color: "#fff", border: "none", borderRadius: 8, cursor: balanceado ? "pointer" : "not-allowed", fontWeight: 600, fontFamily: "inherit" }}>
                      {salvandoLanc ? "Salvando..." : "Registrar Lançamento"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Detalhe Lançamento */}
          {detalheLanc && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setDetalheLanc(null)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <h2 style={{ color: cor.text, fontSize: 16, margin: 0 }}>{detalheLanc.historico}</h2>
                    <p style={{ color: cor.textMuted, fontSize: 12, margin: "4px 0 0" }}>{new Date(detalheLanc.data).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <button onClick={() => excluirLancamentoContabil(detalheLanc.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                    Excluir
                  </button>
                </div>
                {detalheLanc.linhas.map(l => (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${cor.border}` }}>
                    <span style={{ color: cor.textMuted, fontSize: 12.5 }}>
                      <strong style={{ color: l.tipo === "debito" ? cor.text : cor.textMuted }}>{l.tipo === "debito" ? "D" : "C"}</strong> {l.codigo} — {l.nome}
                    </span>
                    <span style={{ color: cor.text, fontSize: 12.5, fontWeight: 600 }}>{formatarMoeda(l.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}