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

const TIPOS_OBRIGACAO = ["ecd","ecf","efd_contribuicoes","efd_icms_ipi","efd_reinf","esocial","dctfweb","mit","outra"];

const STATUS_OBRIGACAO = [
  { value: "nao_iniciado", label: "Não iniciado", cor: "#6e6e73" },
  { value: "em_preparacao", label: "Em preparação", cor: "#3b82f6" },
  { value: "aguardando_revisao", label: "Aguardando revisão", cor: "#f59e0b" },
  { value: "com_erro", label: "Com erro", cor: "#dc2626" },
  { value: "pronto", label: "Pronto", cor: "#10b981" },
  { value: "transmitido", label: "Transmitido", cor: "#16a34a" },
  { value: "recebido", label: "Recebido", cor: "#16a34a" },
  { value: "rejeitado", label: "Rejeitado", cor: "#dc2626" },
  { value: "retificado", label: "Retificado", cor: "#a78bfa" },
];

const TIPOS_DOCUMENTO = [
  { value: "nfe", label: "NF-e" }, { value: "nfce", label: "NFC-e" }, { value: "nfse", label: "NFS-e" },
  { value: "cte", label: "CT-e" }, { value: "mdfe", label: "MDF-e" }, { value: "contrato", label: "Contrato" },
  { value: "boleto", label: "Boleto" }, { value: "recibo", label: "Recibo" }, { value: "comprovante", label: "Comprovante" },
  { value: "outro", label: "Outro" },
];

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Financeiro() {
  const { cor } = useOutletContext();
  const navigate = useNavigate();
  const { secao, sub } = useParams();
  const secaoAtiva = secao || "resumo";
  const abaContabil = sub || "plano-contas";

  // ── aba Resumo ──
  const [resumo, setResumo] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ tipo: "despesa", categoria: "outros", descricao: "", entidade_nome: "", forma_pagamento: "", valor: "", data_vencimento: "", total_parcelas: 1, requer_aprovacao: false });

  // ── Bancos ──
const [contasBancarias, setContasBancarias] = useState([]);
const [loadingContasBanc, setLoadingContasBanc] = useState(true);
const [contaBancSelecionada, setContaBancSelecionada] = useState(null);
const [transacoesBanc, setTransacoesBanc] = useState([]);
const [loadingTransacoes, setLoadingTransacoes] = useState(false);
const [modalContaBancAberto, setModalContaBancAberto] = useState(false);
const [formContaBanc, setFormContaBanc] = useState({ nome: "", banco: "", agencia: "", numero_conta: "", tipo: "corrente", saldo_inicial: "" });
const [salvandoContaBanc, setSalvandoContaBanc] = useState(false);
const [erroContaBanc, setErroContaBanc] = useState("");
const [modalTransacaoAberto, setModalTransacaoAberto] = useState(false);
const [formTransacao, setFormTransacao] = useState({ data: "", descricao: "", tipo: "entrada", valor: "" });
const [salvandoTransacao, setSalvandoTransacao] = useState(false);
const [erroTransacao, setErroTransacao] = useState("");

// ── Conciliação ──
const [contaConciliacaoSelecionada, setContaConciliacaoSelecionada] = useState("");
const [sugestoesConciliacao, setSugestoesConciliacao] = useState([]);
const [loadingConciliacao, setLoadingConciliacao] = useState(false);

// ── Centros de Custo ──
const [centrosCusto, setCentrosCusto] = useState([]);
const [loadingCentros, setLoadingCentros] = useState(true);
const [modalCentroAberto, setModalCentroAberto] = useState(false);
const [formCentro, setFormCentro] = useState({ codigo: "", nome: "", descricao: "" });
const [salvandoCentro, setSalvandoCentro] = useState(false);
const [erroCentro, setErroCentro] = useState("");
const [relatorioCentros, setRelatorioCentros] = useState([]);
const [loadingRelatorioCentros, setLoadingRelatorioCentros] = useState(false);

// ── Contas a Pagar / Receber (compartilham lógica) ──
const [contasPagar, setContasPagar] = useState(null);
const [loadingPagar, setLoadingPagar] = useState(true);
const [contasReceber, setContasReceber] = useState(null);
const [loadingReceber, setLoadingReceber] = useState(true);
const [filtroStatusPR, setFiltroStatusPR] = useState("");

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

  // ── Contabilidade: Plano de Contas ──
  const [contas, setContas] = useState([]);
  const [loadingContas, setLoadingContas] = useState(true);
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [formConta, setFormConta] = useState({ codigo: "", nome: "", tipo: "despesa", natureza: "devedora", conta_pai_id: "", nivel: "analitica" });
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [erroConta, setErroConta] = useState("");

  // ── Contabilidade: Lançamentos ──
  const [lancamentosContabeis, setLancamentosContabeis] = useState([]);
  const [loadingLancContabeis, setLoadingLancContabeis] = useState(true);
  const [modalLancAberto, setModalLancAberto] = useState(false);
  const [formLanc, setFormLanc] = useState({ data: "", historico: "", documento: "", linhas: [{ conta_id: "", cost_center_id: "", tipo: "debito", valor: "" }, { conta_id: "", cost_center_id: "", tipo: "credito", valor: "" }] });
  const [salvandoLanc, setSalvandoLanc] = useState(false);
  const [erroLanc, setErroLanc] = useState("");
  const [detalheLanc, setDetalheLanc] = useState(null);

  // ── Contabilidade: Diário / Razão / Balancete / DRE / Balanço ──
  const [livroDiario, setLivroDiario] = useState([]);
  const [loadingDiario, setLoadingDiario] = useState(true);
  const [contaRazaoSelecionada, setContaRazaoSelecionada] = useState("");
  const [livroRazao, setLivroRazao] = useState(null);
  const [loadingRazao, setLoadingRazao] = useState(false);
  const [balancete, setBalancete] = useState([]);
  const [loadingBalancete, setLoadingBalancete] = useState(true);
  const [dre, setDre] = useState(null);
  const [loadingDre, setLoadingDre] = useState(true);
  const [balanco, setBalanco] = useState(null);
  const [loadingBalanco, setLoadingBalanco] = useState(true);

  // ── Obrigações Fiscais ──
  const [obrigacoes, setObrigacoes] = useState([]);
  const [loadingObrigacoes, setLoadingObrigacoes] = useState(true);
  const [filtroStatusObrig, setFiltroStatusObrig] = useState("");
  const [modalObrigAberto, setModalObrigAberto] = useState(false);
  const [formObrig, setFormObrig] = useState({ nome: "", tipo: "outra", competencia: "", prazo: "", responsavel: "", observacoes: "" });
  const [salvandoObrig, setSalvandoObrig] = useState(false);
  const [erroObrig, setErroObrig] = useState("");

  // ── Documentos ──
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [filtroTipoDoc, setFiltroTipoDoc] = useState("");
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [formDoc, setFormDoc] = useState({ tipo_documento: "outro", descricao: "" });
  const [enviandoDoc, setEnviandoDoc] = useState(false);
  const [erroDoc, setErroDoc] = useState("");

  // ══════════════ CARREGAMENTOS ══════════════
const carregarCentrosCusto = () => {
  setLoadingCentros(true);
  api.get("/centros-custo").then(r => setCentrosCusto(r.data || [])).catch(() => {}).finally(() => setLoadingCentros(false));
};

const carregarRelatorioCentros = () => {
  setLoadingRelatorioCentros(true);
  api.get("/centros-custo/relatorio").then(r => setRelatorioCentros(r.data || [])).catch(() => {}).finally(() => setLoadingRelatorioCentros(false));
};

useEffect(() => {
  if (secaoAtiva !== "centros-custo") return;
  carregarCentrosCusto();
  carregarRelatorioCentros();
}, [secaoAtiva]);

const abrirModalCentro = () => {
  setFormCentro({ codigo: "", nome: "", descricao: "" });
  setErroCentro("");
  setModalCentroAberto(true);
};

const salvarCentroCusto = async (e) => {
  e.preventDefault();
  if (!formCentro.codigo || !formCentro.nome) {
    setErroCentro("Preencha código e nome.");
    return;
  }
  setSalvandoCentro(true);
  setErroCentro("");
  try {
    await api.post("/centros-custo", formCentro);
    setModalCentroAberto(false);
    carregarCentrosCusto();
  } catch (err) {
    setErroCentro(err.response?.data?.error || "Erro ao salvar centro de custo.");
  } finally {
    setSalvandoCentro(false);
  }
};

const desativarCentroCusto = async (id) => {
  if (!confirm("Desativar este centro de custo?")) return;
  try {
    await api.delete(`/centros-custo/${id}`);
    carregarCentrosCusto();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao desativar centro de custo.");
  }
};

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
  useEffect(() => { if (secaoAtiva === "resumo") { carregar(); carregarCentrosCusto(); } }, [filtroTipo, filtroStatus, secaoAtiva]);

  useEffect(() => {
    if (secaoAtiva !== "fiscal") return;
    setLoadingFiscal(true);
    api.get("/financeiro/fiscal")
      .then(r => { if (r.data) setDadosFiscais(prev => ({ ...prev, ...r.data })); })
      .catch(() => {})
      .finally(() => setLoadingFiscal(false));
  }, [secaoAtiva]);

  useEffect(() => {
    if (!avisoFiscal) return;
    const t = setTimeout(() => setAvisoFiscal(null), 4000);
    return () => clearTimeout(t);
  }, [avisoFiscal]);

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

  const carregarDiario = () => {
    setLoadingDiario(true);
    api.get("/contabilidade/diario").then(r => setLivroDiario(r.data || [])).catch(() => {}).finally(() => setLoadingDiario(false));
  };

  const carregarRazao = (contaId) => {
    if (!contaId) { setLivroRazao(null); return; }
    setLoadingRazao(true);
    api.get("/contabilidade/razao", { params: { conta_id: contaId } })
      .then(r => setLivroRazao(r.data))
      .catch(() => setLivroRazao(null))
      .finally(() => setLoadingRazao(false));
  };

  useEffect(() => {
  if (secaoAtiva !== "contabilidade") return;
  carregarContas();
  carregarCentrosCusto();
  if (abaContabil === "lancamentos") carregarLancamentosContabeis();
  if (abaContabil === "balancete") carregarBalancete();
  if (abaContabil === "dre") carregarDre();
  if (abaContabil === "balanco") carregarBalanco();
  if (abaContabil === "diario") carregarDiario();
  if (abaContabil === "razao") carregarRazao(contaRazaoSelecionada);
}, [secaoAtiva, abaContabil]);

  const carregarObrigacoes = () => {
    setLoadingObrigacoes(true);
    api.get("/obrigacoes", { params: { status: filtroStatusObrig || undefined } })
      .then(r => setObrigacoes(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingObrigacoes(false));
  };
  useEffect(() => { if (secaoAtiva === "obrigacoes") carregarObrigacoes(); }, [secaoAtiva, filtroStatusObrig]);

  const carregarDocumentos = () => {
    setLoadingDocs(true);
    api.get("/documentos", { params: { tipo_documento: filtroTipoDoc || undefined } })
      .then(r => setDocumentos(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  };
  useEffect(() => { if (secaoAtiva === "documentos") carregarDocumentos(); }, [secaoAtiva, filtroTipoDoc]);

  const carregarContasAPagar = () => {
  setLoadingPagar(true);
  api.get("/financeiro/contas-pagar").then(r => setContasPagar(r.data)).catch(() => {}).finally(() => setLoadingPagar(false));
};

const carregarContasAReceber = () => {
  setLoadingReceber(true);
  api.get("/financeiro/contas-receber").then(r => setContasReceber(r.data)).catch(() => {}).finally(() => setLoadingReceber(false));
};

useEffect(() => { if (secaoAtiva === "contas-pagar") carregarContasAPagar(); }, [secaoAtiva]);
useEffect(() => { if (secaoAtiva === "contas-receber") carregarContasAReceber(); }, [secaoAtiva]);

const aprovarLancamentoPR = async (id, tipo) => {
  try {
    await api.post(`/financeiro/lancamentos/${id}/aprovar`);
    tipo === "despesa" ? carregarContasAPagar() : carregarContasAReceber();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao aprovar.");
  }
};

const rejeitarLancamentoPR = async (id, tipo) => {
  try {
    await api.post(`/financeiro/lancamentos/${id}/rejeitar`);
    tipo === "despesa" ? carregarContasAPagar() : carregarContasAReceber();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao rejeitar.");
  }
};

  // ══════════════ HANDLERS: RESUMO ══════════════

  const abrirModal = () => {
  setForm({ tipo: "despesa", categoria: "outros", cost_center_id: "", descricao: "", entidade_nome: "", forma_pagamento: "", valor: "", data_vencimento: "", total_parcelas: 1, requer_aprovacao: false });
  setErro("");
  setModalAberto(true);
};

  const salvarLancamento = async (e) => {
  e.preventDefault();
  if (!form.descricao || !form.valor || !form.data_vencimento || !form.cost_center_id) {
    setErro("Preencha descrição, valor, data de vencimento e centro de custo.");
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

  // ══════════════ HANDLERS: FISCAL ══════════════

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

  const setCampoFiscal = (campo, valor) => setDadosFiscais(prev => ({ ...prev, [campo]: valor }));

  // ══════════════ HANDLERS: CONTABILIDADE ══════════════

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
  setFormLanc({ data: "", historico: "", documento: "", linhas: [{ conta_id: "", cost_center_id: "", tipo: "debito", valor: "" }, { conta_id: "", cost_center_id: "", tipo: "credito", valor: "" }] });
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
  setFormLanc(prev => ({ ...prev, linhas: [...prev.linhas, { conta_id: "", cost_center_id: "", tipo, valor: "" }] }));
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
  if (formLanc.linhas.some(l => !l.cost_center_id)) {
    setErroLanc("Todas as linhas precisam ter um centro de custo selecionado.");
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

  const carregarContasBancarias = () => {
  setLoadingContasBanc(true);
  api.get("/bancos/contas").then(r => setContasBancarias(r.data || [])).catch(() => {}).finally(() => setLoadingContasBanc(false));
};

const carregarTransacoes = (contaId) => {
  if (!contaId) { setTransacoesBanc([]); return; }
  setLoadingTransacoes(true);
  api.get("/bancos/transacoes", { params: { bank_account_id: contaId } })
    .then(r => setTransacoesBanc(r.data || []))
    .catch(() => {})
    .finally(() => setLoadingTransacoes(false));
};

useEffect(() => {
  if (secaoAtiva !== "bancos") return;
  carregarContasBancarias();
}, [secaoAtiva]);

const abrirModalContaBanc = () => {
  setFormContaBanc({ nome: "", banco: "", agencia: "", numero_conta: "", tipo: "corrente", saldo_inicial: "" });
  setErroContaBanc("");
  setModalContaBancAberto(true);
};

const salvarContaBancaria = async (e) => {
  e.preventDefault();
  if (!formContaBanc.nome) {
    setErroContaBanc("Preencha o nome da conta.");
    return;
  }
  setSalvandoContaBanc(true);
  setErroContaBanc("");
  try {
    await api.post("/bancos/contas", formContaBanc);
    setModalContaBancAberto(false);
    carregarContasBancarias();
  } catch (err) {
    setErroContaBanc(err.response?.data?.error || "Erro ao salvar conta bancária.");
  } finally {
    setSalvandoContaBanc(false);
  }
};

const desativarContaBancaria = async (id) => {
  if (!confirm("Desativar esta conta bancária?")) return;
  try {
    await api.delete(`/bancos/contas/${id}`);
    carregarContasBancarias();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao desativar conta.");
  }
};

const selecionarContaBanc = (conta) => {
  setContaBancSelecionada(conta);
  carregarTransacoes(conta.id);
};

const abrirModalTransacao = () => {
  setFormTransacao({ data: "", descricao: "", tipo: "entrada", valor: "" });
  setErroTransacao("");
  setModalTransacaoAberto(true);
};

const salvarTransacao = async (e) => {
  e.preventDefault();
  if (!formTransacao.data || !formTransacao.descricao || !formTransacao.valor) {
    setErroTransacao("Preencha data, descrição e valor.");
    return;
  }
  setSalvandoTransacao(true);
  setErroTransacao("");
  try {
    await api.post("/bancos/transacoes", { ...formTransacao, bank_account_id: contaBancSelecionada.id });
    setModalTransacaoAberto(false);
    carregarTransacoes(contaBancSelecionada.id);
    carregarContasBancarias();
  } catch (err) {
    setErroTransacao(err.response?.data?.error || "Erro ao registrar movimentação.");
  } finally {
    setSalvandoTransacao(false);
  }
};

const excluirTransacao = async (id) => {
  if (!confirm("Excluir esta movimentação?")) return;
  try {
    await api.delete(`/bancos/transacoes/${id}`);
    carregarTransacoes(contaBancSelecionada.id);
    carregarContasBancarias();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao excluir.");
  }
};

// ── Conciliação ──

const carregarSugestoesConciliacao = (contaId) => {
  if (!contaId) { setSugestoesConciliacao([]); return; }
  setLoadingConciliacao(true);
  api.get("/bancos/conciliacao/sugestoes", { params: { bank_account_id: contaId } })
    .then(r => setSugestoesConciliacao(r.data || []))
    .catch(() => {})
    .finally(() => setLoadingConciliacao(false));
};

useEffect(() => {
  if (secaoAtiva !== "conciliacao") return;
  carregarContasBancarias();
}, [secaoAtiva]);

const conciliarTransacao = async (transacaoId, financialEntryId) => {
  try {
    await api.post(`/bancos/transacoes/${transacaoId}/conciliar`, { financial_entry_id: financialEntryId });
    carregarSugestoesConciliacao(contaConciliacaoSelecionada);
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao conciliar.");
  }
};

  // ══════════════ HANDLERS: OBRIGAÇÕES ══════════════

  const abrirModalObrig = () => {
    setFormObrig({ nome: "", tipo: "outra", competencia: "", prazo: "", responsavel: "", observacoes: "" });
    setErroObrig("");
    setModalObrigAberto(true);
  };

  const salvarObrigacao = async (e) => {
    e.preventDefault();
    if (!formObrig.nome || !formObrig.competencia || !formObrig.prazo) {
      setErroObrig("Preencha nome, competência e prazo.");
      return;
    }
    setSalvandoObrig(true);
    setErroObrig("");
    try {
      await api.post("/obrigacoes", formObrig);
      setModalObrigAberto(false);
      carregarObrigacoes();
    } catch (err) {
      setErroObrig(err.response?.data?.error || "Erro ao salvar obrigação.");
    } finally {
      setSalvandoObrig(false);
    }
  };

  const mudarStatusObrigacao = async (id, status) => {
    try {
      await api.post(`/obrigacoes/${id}/status`, { status });
      carregarObrigacoes();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao atualizar status.");
    }
  };

  const excluirObrigacao = async (id) => {
    if (!confirm("Excluir esta obrigação?")) return;
    try {
      await api.delete(`/obrigacoes/${id}`);
      carregarObrigacoes();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  const diasRestantes = (prazo) => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dataPrazo = new Date(prazo + "T00:00:00");
    return Math.round((dataPrazo - hoje) / 86400000);
  };

  // ══════════════ HANDLERS: DOCUMENTOS ══════════════

  const abrirModalUpload = () => {
    setArquivoSelecionado(null);
    setFormDoc({ tipo_documento: "outro", descricao: "" });
    setErroDoc("");
    setModalUploadAberto(true);
  };

  const enviarDocumento = async (e) => {
    e.preventDefault();
    if (!arquivoSelecionado) {
      setErroDoc("Selecione um arquivo.");
      return;
    }
    setEnviandoDoc(true);
    setErroDoc("");
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivoSelecionado);
      fd.append("tipo_documento", formDoc.tipo_documento);
      fd.append("descricao", formDoc.descricao);
      await api.post("/documentos/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setModalUploadAberto(false);
      carregarDocumentos();
    } catch (err) {
      setErroDoc(err.response?.data?.error || "Erro ao enviar documento.");
    } finally {
      setEnviandoDoc(false);
    }
  };

  const excluirDocumento = async (id) => {
    if (!confirm("Excluir este documento? Essa ação não pode ser desfeita.")) return;
    try {
      await api.delete(`/documentos/${id}`);
      carregarDocumentos();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao excluir documento.");
    }
  };

  const formatarTamanho = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ══════════════ ESTILOS ══════════════

  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 14, padding: 20 };
  const inputStyle = { width: "100%", padding: "10px 14px", background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, color: cor.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif", marginBottom: 12 };
  const labelStyle = { fontSize: 12, color: cor.textMuted, marginBottom: 4, display: "block" };

  // ══════════════ RENDER ══════════════

  return (
    <div>

      {/* ═══════════ RESUMO ═══════════ */}
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
               <label style={labelStyle}>Centro de Custo *</label>
                <select value={form.cost_center_id} onChange={e => setForm({ ...form, cost_center_id: e.target.value })} style={inputStyle} required>
                <option value="">Selecione...</option>
                 {centrosCusto.filter(c => c.ativo).map(c => (
               <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
               ))}
               </select>
                  <label style={labelStyle}>Descrição</label>
<input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={inputStyle} placeholder="Ex: Fornecedor de embalagens" />
<label style={labelStyle}>{form.tipo === "despesa" ? "Fornecedor" : "Cliente"} (opcional)</label>
<input value={form.entidade_nome} onChange={e => setForm({ ...form, entidade_nome: e.target.value })} style={inputStyle} placeholder="Nome" />
<label style={labelStyle}>Valor total (R$)</label>
<input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={inputStyle} placeholder="0,00" />
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
  <div>
    <label style={labelStyle}>1º vencimento</label>
    <input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} style={inputStyle} />
  </div>
  <div>
    <label style={labelStyle}>Parcelas</label>
    <input type="number" min="1" max="60" value={form.total_parcelas} onChange={e => setForm({ ...form, total_parcelas: e.target.value })} style={inputStyle} />
  </div>
</div>
<label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: cor.textMuted, marginBottom: 12, cursor: "pointer" }}>
  <input type="checkbox" checked={form.requer_aprovacao} onChange={e => setForm({ ...form, requer_aprovacao: e.target.checked })} />
  Requer aprovação antes de ficar disponível para pagamento
</label>
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

      {/* ═══════════ FISCAL E CONTÁBIL ═══════════ */}
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

      {/* ═══════════ CONTABILIDADE (navegação via sidebar, sem abas internas) ═══════════ */}
      {secaoAtiva === "contabilidade" && (
        <div>
          {abaContabil === "plano-contas" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>📚 Plano de Contas</h1>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>✍️ Lançamentos</h1>
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

          {abaContabil === "diario" && (
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 18 }}>📓 Livro Diário</h1>
              {loadingDiario ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : livroDiario.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum lançamento registrado ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {livroDiario.map(e => (
                    <div key={e.id} style={cardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{e.historico}</p>
                        <p style={{ color: cor.textMuted, fontSize: 12, margin: 0 }}>
                          {new Date(e.data).toLocaleDateString("pt-BR")} {e.documento ? `· ${e.documento}` : ""}
                        </p>
                      </div>
                      {e.linhas.map((l, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5, paddingLeft: l.tipo === "credito" ? 20 : 0 }}>
                          <span style={{ color: cor.textMuted }}>
                            <strong style={{ color: l.tipo === "debito" ? cor.text : cor.textMuted }}>{l.tipo === "debito" ? "D" : "C"}</strong> {l.codigo} — {l.nome}
                          </span>
                          <span style={{ color: cor.text, fontWeight: 600 }}>{formatarMoeda(l.valor)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {abaContabil === "razao" && (
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 18 }}>📖 Livro Razão</h1>
              <div style={{ marginBottom: 16 }}>
                <select
                  value={contaRazaoSelecionada}
                  onChange={e => { setContaRazaoSelecionada(e.target.value); carregarRazao(e.target.value); }}
                  style={{ ...inputStyle, marginBottom: 0, width: "auto", minWidth: 260 }}
                >
                  <option value="">Selecione uma conta...</option>
                  {contas.filter(c => c.nivel === "analitica" && c.ativo).map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                  ))}
                </select>
              </div>

              {loadingRazao ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : !livroRazao ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Selecione uma conta para ver o histórico de movimentações.</p>
              ) : livroRazao.movimentos.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma movimentação para esta conta no período.</p>
              ) : (
                <div>
                  <div style={{ display: "flex", padding: "8px 16px", fontSize: 11, color: cor.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
                    <span style={{ width: 90 }}>Data</span>
                    <span style={{ flex: 1 }}>Histórico</span>
                    <span style={{ width: 110, textAlign: "right" }}>Débito</span>
                    <span style={{ width: 110, textAlign: "right" }}>Crédito</span>
                    <span style={{ width: 120, textAlign: "right" }}>Saldo</span>
                  </div>
                  {livroRazao.movimentos.map((m, i) => (
                    <div key={i} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ color: cor.textMuted, fontSize: 12, width: 90 }}>{new Date(m.data).toLocaleDateString("pt-BR")}</span>
                      <span style={{ color: cor.text, fontSize: 12.5, flex: 1 }}>{m.historico}</span>
                      <span style={{ color: cor.textMuted, fontSize: 12.5, width: 110, textAlign: "right" }}>{m.tipo === "debito" ? formatarMoeda(m.valor) : "—"}</span>
                      <span style={{ color: cor.textMuted, fontSize: 12.5, width: 110, textAlign: "right" }}>{m.tipo === "credito" ? formatarMoeda(m.valor) : "—"}</span>
                      <span style={{ color: cor.text, fontSize: 12.5, fontWeight: 700, width: 120, textAlign: "right" }}>{formatarMoeda(m.saldo_acumulado)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px", marginTop: 8 }}>
                    <span style={{ color: cor.text, fontSize: 14, fontWeight: 700 }}>Saldo final: {formatarMoeda(livroRazao.saldo_final)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {abaContabil === "balancete" && (
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 18 }}>📊 Balancete</h1>
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
              <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 18 }}>📈 DRE</h1>
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
              <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 18 }}>⚖️ Balanço Patrimonial</h1>
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
                      <select value={linha.cost_center_id} onChange={e => atualizarLinha(idx, "cost_center_id", e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: 130, flexShrink: 0 }}>
                      <option value="">C. Custo...</option>
                      {centrosCusto.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                       </select>
                       <input type="number" step="0.01" value={linha.valor} onChange={e => atualizarLinha(idx, "valor", e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: 100, flexShrink: 0 }} placeholder="0,00" />
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

      {/* ═══════════ OBRIGAÇÕES FISCAIS ═══════════ */}
      {secaoAtiva === "obrigacoes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Obrigações Fiscais</h1>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Calendário e status das obrigações fiscais e contábeis.</p>
            </div>
            <button onClick={abrirModalObrig} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
              + Nova Obrigação
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <select value={filtroStatusObrig} onChange={e => setFiltroStatusObrig(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
              <option value="">Todos os status</option>
              {STATUS_OBRIGACAO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {loadingObrigacoes ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : obrigacoes.length === 0 ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma obrigação cadastrada ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {obrigacoes.map(o => {
                const dias = diasRestantes(o.prazo);
                const statusInfo = STATUS_OBRIGACAO.find(s => s.value === o.status);
                const atrasado = dias < 0 && !["transmitido", "recebido"].includes(o.status);
                const urgente = dias >= 0 && dias <= 7 && !["transmitido", "recebido"].includes(o.status);
                return (
                  <div key={o.id} style={{
                    ...cardStyle, display: "flex", alignItems: "center", gap: 14,
                    border: atrasado ? "1px solid #dc262666" : urgente ? "1px solid #f59e0b66" : `1px solid ${cor.border}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{o.nome}</p>
                      <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>
                        Competência {o.competencia} · Prazo {new Date(o.prazo + "T00:00:00").toLocaleDateString("pt-BR")}
                        {o.responsavel ? ` · ${o.responsavel}` : ""}
                      </p>
                    </div>
                    {(atrasado || urgente) && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: atrasado ? "#dc2626" : "#f59e0b", flexShrink: 0 }}>
                        {atrasado ? `⚠️ Atrasado há ${Math.abs(dias)}d` : `⏰ Vence em ${dias}d`}
                      </span>
                    )}
                    <select
                      value={o.status}
                      onChange={e => mudarStatusObrigacao(o.id, e.target.value)}
                      style={{
                        fontSize: 11.5, padding: "4px 10px", borderRadius: 20, flexShrink: 0, border: "none", cursor: "pointer",
                        background: statusInfo.cor + "22", color: statusInfo.cor, fontWeight: 600, fontFamily: "inherit",
                      }}
                    >
                      {STATUS_OBRIGACAO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button onClick={() => excluirObrigacao(o.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                      Excluir
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {modalObrigAberto && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalObrigAberto(false)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
                <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Nova Obrigação</h2>
                <form onSubmit={salvarObrigacao}>
                  <label style={labelStyle}>Nome</label>
                  <input value={formObrig.nome} onChange={e => setFormObrig({ ...formObrig, nome: e.target.value })} style={inputStyle} placeholder="Ex: DCTFWeb Setembro/2026" />
                  <label style={labelStyle}>Tipo</label>
                  <select value={formObrig.tipo} onChange={e => setFormObrig({ ...formObrig, tipo: e.target.value })} style={inputStyle}>
                    {TIPOS_OBRIGACAO.map(t => <option key={t} value={t}>{t.toUpperCase().replace(/_/g, " ")}</option>)}
                  </select>
                  <label style={labelStyle}>Competência (AAAA-MM)</label>
                  <input value={formObrig.competencia} onChange={e => setFormObrig({ ...formObrig, competencia: e.target.value })} style={inputStyle} placeholder="2026-09" />
                  <label style={labelStyle}>Prazo</label>
                  <input type="date" value={formObrig.prazo} onChange={e => setFormObrig({ ...formObrig, prazo: e.target.value })} style={inputStyle} />
                  <label style={labelStyle}>Responsável (opcional)</label>
                  <input value={formObrig.responsavel} onChange={e => setFormObrig({ ...formObrig, responsavel: e.target.value })} style={inputStyle} />
                  <label style={labelStyle}>Observações (opcional)</label>
                  <input value={formObrig.observacoes} onChange={e => setFormObrig({ ...formObrig, observacoes: e.target.value })} style={inputStyle} />
                  {erroObrig && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroObrig}</p>}
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={() => setModalObrigAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    <button type="submit" disabled={salvandoObrig} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                      {salvandoObrig ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ CONTAS A PAGAR ═══════════ */}
{secaoAtiva === "contas-pagar" && (
  <div>
    <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Contas a Pagar</h1>
    <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Despesas, fornecedores e parcelas a vencer.</p>

    {loadingPagar ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : !contasPagar ? null : (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Total pendente</p>
            <h2 style={{ color: "#f59e0b", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(contasPagar.total_pendente)}</h2>
          </div>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Vencido</p>
            <h2 style={{ color: "#dc2626", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(contasPagar.total_vencido)}</h2>
          </div>
        </div>

        {contasPagar.lancamentos.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma despesa cadastrada ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contasPagar.lancamentos.map(l => {
              const vencido = l.status !== "pago" && new Date(l.data_vencimento) < new Date();
              return (
                <div key={l.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, border: vencido ? "1px solid #dc262666" : `1px solid ${cor.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {l.descricao} {l.total_parcelas > 1 ? `(${l.parcela_atual}/${l.total_parcelas})` : ""}
                    </p>
                    <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>
                      {l.entidade_nome ? `${l.entidade_nome} · ` : ""}Vence em {new Date(l.data_vencimento).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {l.aprovacao_status === "pendente" && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#f59e0b22", color: "#f59e0b", flexShrink: 0 }}>Aguardando aprovação</span>
                  )}
                  {vencido && <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", flexShrink: 0 }}>⚠️ Vencido</span>}
                  <p style={{ color: "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>{formatarMoeda(l.valor)}</p>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                    background: l.status === "pago" ? "#16a34a22" : "#f59e0b22",
                    color: l.status === "pago" ? "#16a34a" : "#f59e0b",
                  }}>{l.status}</span>
                  {l.aprovacao_status === "pendente" && (
                    <>
                      <button onClick={() => aprovarLancamentoPR(l.id, "despesa")} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>Aprovar</button>
                      <button onClick={() => rejeitarLancamentoPR(l.id, "despesa")} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>Rejeitar</button>
                    </>
                  )}
                  {l.status !== "pago" && l.aprovacao_status !== "pendente" && (
                    <button onClick={() => marcarPago(l.id)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>Marcar pago</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    )}
  </div>
)}

{/* ═══════════ CONTAS A RECEBER ═══════════ */}
{secaoAtiva === "contas-receber" && (
  <div>
    <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Contas a Receber</h1>
    <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Receitas, clientes e parcelas a receber.</p>

    {loadingReceber ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : !contasReceber ? null : (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Total pendente</p>
            <h2 style={{ color: "#16a34a", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(contasReceber.total_pendente)}</h2>
          </div>
          <div style={cardStyle}>
            <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Atrasado</p>
            <h2 style={{ color: "#dc2626", fontSize: 22, fontWeight: 700, margin: 0 }}>{formatarMoeda(contasReceber.total_atrasado)}</h2>
          </div>
        </div>

        {contasReceber.lancamentos.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma receita cadastrada ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contasReceber.lancamentos.map(l => {
              const atrasado = l.status !== "pago" && new Date(l.data_vencimento) < new Date();
              return (
                <div key={l.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, border: atrasado ? "1px solid #dc262666" : `1px solid ${cor.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {l.descricao} {l.total_parcelas > 1 ? `(${l.parcela_atual}/${l.total_parcelas})` : ""}
                    </p>
                    <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>
                      {l.entidade_nome ? `${l.entidade_nome} · ` : ""}Vence em {new Date(l.data_vencimento).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {l.aprovacao_status === "pendente" && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#f59e0b22", color: "#f59e0b", flexShrink: 0 }}>Aguardando aprovação</span>
                  )}
                  {atrasado && <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", flexShrink: 0 }}>⚠️ Atrasado</span>}
                  <p style={{ color: "#16a34a", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>{formatarMoeda(l.valor)}</p>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                    background: l.status === "pago" ? "#16a34a22" : "#f59e0b22",
                    color: l.status === "pago" ? "#16a34a" : "#f59e0b",
                  }}>{l.status}</span>
                  {l.aprovacao_status === "pendente" && (
                    <>
                      <button onClick={() => aprovarLancamentoPR(l.id, "receita")} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>Aprovar</button>
                      <button onClick={() => rejeitarLancamentoPR(l.id, "receita")} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>Rejeitar</button>
                    </>
                  )}
                  {l.status !== "pago" && l.aprovacao_status !== "pendente" && (
                    <button onClick={() => marcarPago(l.id)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>Marcar pago</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    )}
  </div>
)}

      {/* ═══════════ BANCOS ═══════════ */}
{secaoAtiva === "bancos" && (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Bancos</h1>
        <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Contas bancárias e extrato de movimentações.</p>
      </div>
      <button onClick={abrirModalContaBanc} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
        + Nova Conta Bancária
      </button>
    </div>

    {loadingContasBanc ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : contasBancarias.length === 0 ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma conta bancária cadastrada ainda.</p>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contasBancarias.map(c => (
            <div key={c.id} onClick={() => selecionarContaBanc(c)} style={{
              ...cardStyle, padding: "14px 16px", cursor: "pointer",
              border: contaBancSelecionada?.id === c.id ? "1px solid #a78bfa" : `1px solid ${cor.border}`,
              opacity: c.ativo ? 1 : 0.5,
            }}>
              <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{c.nome}</p>
              <p style={{ color: cor.textMuted, fontSize: 11, margin: "3px 0 8px" }}>{c.banco || "—"}</p>
              <p style={{ color: Number(c.saldo_atual) >= 0 ? "#16a34a" : "#dc2626", fontSize: 15, fontWeight: 700, margin: 0 }}>
                {formatarMoeda(c.saldo_atual)}
              </p>
            </div>
          ))}
        </div>

        <div>
          {!contaBancSelecionada ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Selecione uma conta para ver o extrato.</p>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ color: cor.text, fontSize: 16, margin: 0 }}>{contaBancSelecionada.nome}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={abrirModalTransacao} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "sans-serif" }}>
                    + Movimentação
                  </button>
                  <button onClick={() => desativarContaBancaria(contaBancSelecionada.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
                    Desativar conta
                  </button>
                </div>
              </div>

              {loadingTransacoes ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : transacoesBanc.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma movimentação registrada ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {transacoesBanc.map(t => (
                    <div key={t.id} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: t.tipo === "entrada" ? "#16a34a" : "#dc2626" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{t.descricao}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{new Date(t.data).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: t.conciliado ? "#16a34a22" : cor.bg, color: t.conciliado ? "#16a34a" : cor.textMuted, flexShrink: 0 }}>
                        {t.conciliado ? "✓ Conciliado" : "Pendente"}
                      </span>
                      <p style={{ color: t.tipo === "entrada" ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 13.5, margin: 0, flexShrink: 0 }}>
                        {t.tipo === "entrada" ? "+" : "-"} {formatarMoeda(t.valor)}
                      </p>
                      <button onClick={() => excluirTransacao(t.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit", flexShrink: 0 }}>
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}

    {modalContaBancAberto && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalContaBancAberto(false)} />
        <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
          <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Nova Conta Bancária</h2>
          <form onSubmit={salvarContaBancaria}>
            <label style={labelStyle}>Nome da conta</label>
            <input value={formContaBanc.nome} onChange={e => setFormContaBanc({ ...formContaBanc, nome: e.target.value })} style={inputStyle} placeholder="Ex: Conta Corrente Itaú" />
            <label style={labelStyle}>Banco</label>
            <input value={formContaBanc.banco} onChange={e => setFormContaBanc({ ...formContaBanc, banco: e.target.value })} style={inputStyle} placeholder="Ex: Itaú" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Agência</label><input value={formContaBanc.agencia} onChange={e => setFormContaBanc({ ...formContaBanc, agencia: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Número da conta</label><input value={formContaBanc.numero_conta} onChange={e => setFormContaBanc({ ...formContaBanc, numero_conta: e.target.value })} style={inputStyle} /></div>
            </div>
            <label style={labelStyle}>Tipo</label>
            <select value={formContaBanc.tipo} onChange={e => setFormContaBanc({ ...formContaBanc, tipo: e.target.value })} style={inputStyle}>
              <option value="corrente">Conta Corrente</option>
              <option value="poupanca">Poupança</option>
              <option value="caixa">Caixa</option>
              <option value="digital">Conta Digital</option>
            </select>
            <label style={labelStyle}>Saldo inicial (R$)</label>
            <input type="number" step="0.01" value={formContaBanc.saldo_inicial} onChange={e => setFormContaBanc({ ...formContaBanc, saldo_inicial: e.target.value })} style={inputStyle} placeholder="0,00" />
            {erroContaBanc && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroContaBanc}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setModalContaBancAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" disabled={salvandoContaBanc} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {salvandoContaBanc ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {modalTransacaoAberto && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalTransacaoAberto(false)} />
        <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
          <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Nova Movimentação</h2>
          <form onSubmit={salvarTransacao}>
            <label style={labelStyle}>Data</label>
            <input type="date" value={formTransacao.data} onChange={e => setFormTransacao({ ...formTransacao, data: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Descrição</label>
            <input value={formTransacao.descricao} onChange={e => setFormTransacao({ ...formTransacao, descricao: e.target.value })} style={inputStyle} placeholder="Ex: Recebimento venda #1042" />
            <label style={labelStyle}>Tipo</label>
            <select value={formTransacao.tipo} onChange={e => setFormTransacao({ ...formTransacao, tipo: e.target.value })} style={inputStyle}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
            <label style={labelStyle}>Valor (R$)</label>
            <input type="number" step="0.01" value={formTransacao.valor} onChange={e => setFormTransacao({ ...formTransacao, valor: e.target.value })} style={inputStyle} placeholder="0,00" />
            {erroTransacao && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroTransacao}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setModalTransacaoAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" disabled={salvandoTransacao} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {salvandoTransacao ? "Salvando..." : "Registrar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
)}

{/* ═══════════ CENTROS DE CUSTO ═══════════ */}
{secaoAtiva === "centros-custo" && (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Centros de Custo</h1>
        <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Dimensão obrigatória em todo lançamento — classifica onde o dinheiro entra ou sai dentro da empresa.</p>
      </div>
      <button onClick={abrirModalCentro} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
        + Novo Centro de Custo
      </button>
    </div>

    {loadingCentros ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {centrosCusto.map(c => (
          <div key={c.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, opacity: c.ativo ? 1 : 0.5 }}>
            <span style={{ color: cor.textMuted, fontSize: 12, fontFamily: "monospace", width: 80, flexShrink: 0 }}>{c.codigo}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nome}</p>
              {c.descricao && <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>{c.descricao}</p>}
            </div>
            {c.codigo === "GERAL" && (
              <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>Padrão do sistema</span>
            )}
            {c.ativo && c.codigo !== "GERAL" && (
              <button onClick={() => desativarCentroCusto(c.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                Desativar
              </button>
            )}
          </div>
        ))}
      </div>
    )}

    <h2 style={{ color: cor.text, fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📊 Desempenho por Centro de Custo</h2>
    {loadingRelatorioCentros ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", padding: "8px 16px", fontSize: 11, color: cor.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
          <span style={{ width: 80 }}>Código</span>
          <span style={{ flex: 1 }}>Nome</span>
          <span style={{ width: 130, textAlign: "right" }}>Receitas</span>
          <span style={{ width: 130, textAlign: "right" }}>Despesas</span>
          <span style={{ width: 130, textAlign: "right" }}>Saldo</span>
        </div>
        {relatorioCentros.map(r => (
          <div key={r.id} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center" }}>
            <span style={{ color: cor.textMuted, fontSize: 12, fontFamily: "monospace", width: 80 }}>{r.codigo}</span>
            <span style={{ color: cor.text, fontSize: 13, flex: 1 }}>{r.nome}</span>
            <span style={{ color: "#16a34a", fontSize: 12.5, width: 130, textAlign: "right" }}>{formatarMoeda(r.receitas)}</span>
            <span style={{ color: "#dc2626", fontSize: 12.5, width: 130, textAlign: "right" }}>{formatarMoeda(r.despesas)}</span>
            <span style={{ color: Number(r.saldo) >= 0 ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 700, width: 130, textAlign: "right" }}>{formatarMoeda(r.saldo)}</span>
          </div>
        ))}
      </div>
    )}

    {modalCentroAberto && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalCentroAberto(false)} />
        <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
          <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Novo Centro de Custo</h2>
          <form onSubmit={salvarCentroCusto}>
            <label style={labelStyle}>Código</label>
            <input value={formCentro.codigo} onChange={e => setFormCentro({ ...formCentro, codigo: e.target.value })} style={inputStyle} placeholder="Ex: VENDAS, MKT, ADM" />
            <label style={labelStyle}>Nome</label>
            <input value={formCentro.nome} onChange={e => setFormCentro({ ...formCentro, nome: e.target.value })} style={inputStyle} placeholder="Ex: Vendas Online" />
            <label style={labelStyle}>Descrição (opcional)</label>
            <input value={formCentro.descricao} onChange={e => setFormCentro({ ...formCentro, descricao: e.target.value })} style={inputStyle} />
            {erroCentro && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroCentro}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setModalCentroAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" disabled={salvandoCentro} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {salvandoCentro ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
)}

{/* ═══════════ CONCILIAÇÃO BANCÁRIA ═══════════ */}
{secaoAtiva === "conciliacao" && (
  <div>
    <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Conciliação Bancária</h1>
    <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>A IA sugere correspondências entre movimentações bancárias e lançamentos financeiros. Nada é conciliado automaticamente sem sua confirmação.</p>

    <div style={{ marginBottom: 20 }}>
      <select
        value={contaConciliacaoSelecionada}
        onChange={e => { setContaConciliacaoSelecionada(e.target.value); carregarSugestoesConciliacao(e.target.value); }}
        style={{ ...inputStyle, marginBottom: 0, width: "auto", minWidth: 260 }}
      >
        <option value="">Selecione uma conta bancária...</option>
        {contasBancarias.filter(c => c.ativo).map(c => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>
    </div>

    {loadingConciliacao ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : !contaConciliacaoSelecionada ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Selecione uma conta para ver as pendências de conciliação.</p>
    ) : sugestoesConciliacao.length === 0 ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma movimentação pendente de conciliação. Tudo certo! ✅</p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sugestoesConciliacao.map(({ transacao, candidatos }) => (
          <div key={transacao.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{transacao.descricao}</p>
                <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>{new Date(transacao.data).toLocaleDateString("pt-BR")}</p>
              </div>
              <p style={{ color: transacao.tipo === "entrada" ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 15, margin: 0 }}>
                {transacao.tipo === "entrada" ? "+" : "-"} {formatarMoeda(transacao.valor)}
              </p>
            </div>

            {candidatos.length === 0 ? (
              <p style={{ color: cor.textMuted, fontSize: 12.5 }}>Nenhuma correspondência encontrada automaticamente.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ color: cor.textMuted, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>Possíveis correspondências</p>
                {candidatos.map(c => (
                  <div key={c.financial_entry_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: cor.bg, borderRadius: 8 }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                      background: c.confianca === "alta" ? "#16a34a22" : c.confianca === "media" ? "#f59e0b22" : "#6e6e7322",
                      color: c.confianca === "alta" ? "#16a34a" : c.confianca === "media" ? "#f59e0b" : "#6e6e73",
                    }}>
                      {c.confianca === "alta" ? "Alta confiança" : c.confianca === "media" ? "Média confiança" : "Baixa confiança"}
                    </span>
                    <span style={{ color: cor.text, fontSize: 12.5, flex: 1 }}>{c.descricao}</span>
                    <span style={{ color: cor.textMuted, fontSize: 12, flexShrink: 0 }}>{formatarMoeda(c.valor)}</span>
                    <button onClick={() => conciliarTransacao(transacao.id, c.financial_entry_id)} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", flexShrink: 0 }}>
                      Conciliar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}

      {/* ═══════════ DOCUMENTOS ═══════════ */}
      {secaoAtiva === "documentos" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Documentos</h1>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Notas fiscais, contratos, comprovantes e demais arquivos financeiros.</p>
            </div>
            <button onClick={abrirModalUpload} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
              + Enviar Documento
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <select value={filtroTipoDoc} onChange={e => setFiltroTipoDoc(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
              <option value="">Todos os tipos</option>
              {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {loadingDocs ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : documentos.length === 0 ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum documento enviado ainda.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
              {documentos.map(d => (
                <div key={d.id} style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 24 }}>
                      {d.mimetype === "application/pdf" ? "📄" : d.mimetype?.includes("xml") ? "🧾" : "🖼️"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nome_original}</p>
                      <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{TIPOS_DOCUMENTO.find(t => t.value === d.tipo_documento)?.label} · {formatarTamanho(d.tamanho_bytes)}</p>
                    </div>
                  </div>
                  {d.descricao && <p style={{ color: cor.textMuted, fontSize: 12, margin: "0 0 10px" }}>{d.descricao}</p>}
                  <p style={{ color: cor.textMuted, fontSize: 11, margin: "0 0 10px" }}>{new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={`http://localhost:3000/api/documentos/${d.id}/baixar`} target="_blank" rel="noreferrer"
                      style={{ flex: 1, textAlign: "center", background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", textDecoration: "none" }}>
                      Abrir
                    </a>
                    <button onClick={() => excluirDocumento(d.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {modalUploadAberto && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalUploadAberto(false)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
                <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Enviar Documento</h2>
                <form onSubmit={enviarDocumento}>
                  <label style={labelStyle}>Arquivo (PDF, XML, PNG ou JPEG — até 15MB)</label>
                  <input type="file" accept=".pdf,.xml,.png,.jpg,.jpeg" onChange={e => setArquivoSelecionado(e.target.files[0])} style={inputStyle} />
                  <label style={labelStyle}>Tipo de documento</label>
                  <select value={formDoc.tipo_documento} onChange={e => setFormDoc({ ...formDoc, tipo_documento: e.target.value })} style={inputStyle}>
                    {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <label style={labelStyle}>Descrição (opcional)</label>
                  <input value={formDoc.descricao} onChange={e => setFormDoc({ ...formDoc, descricao: e.target.value })} style={inputStyle} placeholder="Ex: NF fornecedor X, pedido 1042" />
                  {erroDoc && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroDoc}</p>}
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={() => setModalUploadAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    <button type="submit" disabled={enviandoDoc} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                      {enviandoDoc ? "Enviando..." : "Enviar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}