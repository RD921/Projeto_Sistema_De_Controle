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

let MOEDA_ATUAL = "BRL";

function formatarMoeda(v) {
  const locales = { BRL: "pt-BR", USD: "en-US", EUR: "de-DE" };
  return Number(v || 0).toLocaleString(locales[MOEDA_ATUAL] || "pt-BR", { style: "currency", currency: MOEDA_ATUAL });
}

function formatarMoedaBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Financeiro() {
    const { cor, moeda } = useOutletContext();
  MOEDA_ATUAL = moeda || "BRL";
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
  const [form, setForm] = useState({ tipo: "despesa", categoria: "outros", cost_center_id: "", descricao: "", entidade_nome: "", forma_pagamento: "", valor: "", data_vencimento: "", total_parcelas: 1, requer_aprovacao: false });

  // ── Motor Financeiro ──
  const [configMotor, setConfigMotor] = useState({ imposto_padrao_pct: "", comissao_marketplace_pct: "", taxa_gateway_pct: "", frete_medio_pct: "" });
  const [loadingConfigMotor, setLoadingConfigMotor] = useState(true);
  const [salvandoConfigMotor, setSalvandoConfigMotor] = useState(false);
  const [avisoConfigMotor, setAvisoConfigMotor] = useState(null);
  const [resumoMotor, setResumoMotor] = useState(null);
  const [loadingResumoMotor, setLoadingResumoMotor] = useState(true);
  const [breakdowns, setBreakdowns] = useState([]);
  const [loadingBreakdowns, setLoadingBreakdowns] = useState(true);
  const [processandoPendentes, setProcessandoPendentes] = useState(false);

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

  // ── Contas a Pagar / Receber ──
  const [contasPagar, setContasPagar] = useState(null);
  const [loadingPagar, setLoadingPagar] = useState(true);
  const [contasReceber, setContasReceber] = useState(null);
  const [loadingReceber, setLoadingReceber] = useState(true);

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

  // ── Rentabilidade Real ──
  const [abaRentabilidade, setAbaRentabilidade] = useState("produtos");
  const [rentProdutos, setRentProdutos] = useState([]);
  const [rentClientes, setRentClientes] = useState([]);
  const [rentCanal, setRentCanal] = useState([]);
  const [rentPeriodo, setRentPeriodo] = useState([]);
  const [loadingRentabilidade, setLoadingRentabilidade] = useState(true);

  // ── Fluxo de Caixa Preditivo ──
  const [fluxoPreditivo, setFluxoPreditivo] = useState(null);
  const [loadingFluxoPreditivo, setLoadingFluxoPreditivo] = useState(true);
  const [diasProjecao, setDiasProjecao] = useState(60);

  // ── Tesouraria ──
  const [abaTesouraria, setAbaTesouraria] = useState("posicao");
  const [posicaoTesouraria, setPosicaoTesouraria] = useState(null);
  const [loadingPosicao, setLoadingPosicao] = useState(true);
  const [transferencias, setTransferencias] = useState([]);
  const [loadingTransferencias, setLoadingTransferencias] = useState(true);
  const [modalTransferAberto, setModalTransferAberto] = useState(false);
  const [formTransfer, setFormTransfer] = useState({ conta_origem_id: "", conta_destino_id: "", valor: "", data: "", descricao: "" });
  const [salvandoTransfer, setSalvandoTransfer] = useState(false);
  const [erroTransfer, setErroTransfer] = useState("");
  const [investimentos, setInvestimentos] = useState([]);
  const [loadingInvestimentos, setLoadingInvestimentos] = useState(true);
  const [modalInvestAberto, setModalInvestAberto] = useState(false);
  const [formInvest, setFormInvest] = useState({ bank_account_id: "", nome: "", tipo: "cdb", valor_aplicado: "", data_aplicacao: "", data_vencimento: "" });
  const [salvandoInvest, setSalvandoInvest] = useState(false);
  const [erroInvest, setErroInvest] = useState("");

  // ── Orçamento ──
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [competenciaOrcamento, setCompetenciaOrcamento] = useState(mesAtual);
  const [dadosOrcamento, setDadosOrcamento] = useState(null);
  const [loadingOrcamento, setLoadingOrcamento] = useState(true);
  const [modalOrcamentoAberto, setModalOrcamentoAberto] = useState(false);
  const [formOrcamento, setFormOrcamento] = useState({ tipo: "despesa", categoria: "outros", cost_center_id: "", valor_planejado: "" });
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [erroOrcamento, setErroOrcamento] = useState("");
  const [copiandoOrcamento, setCopiandoOrcamento] = useState(false);

  // ── Automação Financeira ──
  const [abaAutomacao, setAbaAutomacao] = useState("regras");
  const [regrasAutomacao, setRegrasAutomacao] = useState([]);
  const [loadingRegras, setLoadingRegras] = useState(true);
  const [logsAutomacao, setLogsAutomacao] = useState([]);
  const [loadingLogsAutomacao, setLoadingLogsAutomacao] = useState(true);
  const [modalRegraAberto, setModalRegraAberto] = useState(false);
  const [formRegra, setFormRegra] = useState({
    nome: "", ordem: 0, condicao_tipo: "", condicao_categoria: "", condicao_cost_center_id: "",
    condicao_valor_operador: "", condicao_valor_min: "", condicao_valor_max: "", acao: "exigir_aprovacao",
  });
  const [salvandoRegra, setSalvandoRegra] = useState(false);
  const [erroRegra, setErroRegra] = useState("");

  // ── Alertas e Riscos ──
  const [alertas, setAlertas] = useState([]);
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  const [revarrendoAlertas, setRevarrendoAlertas] = useState(false);

  // ── Fechamento Financeiro ──
  const [competenciaFechamento, setCompetenciaFechamento] = useState(mesAtual);
  const [checklistFechamento, setChecklistFechamento] = useState(null);
  const [loadingFechamento, setLoadingFechamento] = useState(true);

  // ── Governança e Auditoria ──
  const [abaGovernanca, setAbaGovernanca] = useState("logs");
  const [logsAuditoria, setLogsAuditoria] = useState([]);
  const [loadingLogsAuditoria, setLoadingLogsAuditoria] = useState(true);
  const [alcada, setAlcada] = useState({ valor_minimo: "" });
  const [loadingAlcada, setLoadingAlcada] = useState(true);
  const [salvandoAlcada, setSalvandoAlcada] = useState(false);
  const [avisoAlcada, setAvisoAlcada] = useState(null);

  // ── Documentos: Vínculo ──
  const [modalVincularAberto, setModalVincularAberto] = useState(false);
  const [documentoParaVincular, setDocumentoParaVincular] = useState(null);
  const [entidadeVinculo, setEntidadeVinculo] = useState("");
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);
  const [documentosPorEntrada, setDocumentosPorEntrada] = useState({});

  // ── Fiscal Profundo: Apuração ──
  const [abaFiscalDetalhe, setAbaFiscalDetalhe] = useState("cadastro");
  const [competenciaApuracao, setCompetenciaApuracao] = useState(mesAtual);
  const [calculoFiscal, setCalculoFiscal] = useState(null);
  const [loadingCalculoFiscal, setLoadingCalculoFiscal] = useState(false);
  const [calculandoFiscal, setCalculandoFiscal] = useState(false);
  const [gerandoGuia, setGerandoGuia] = useState(false);
  const [costCenterGuia, setCostCenterGuia] = useState("");
  const [historicoFiscal, setHistoricoFiscal] = useState([]);

// ── Notas Fiscais ──
const [notasFiscais, setNotasFiscais] = useState([]);
const [loadingNotasFiscais, setLoadingNotasFiscais] = useState(true);
const [customersNF, setCustomersNF] = useState([]);
const [modalNotaFiscalAberto, setModalNotaFiscalAberto] = useState(false);
const [formNotaFiscal, setFormNotaFiscal] = useState({
  tipo: "nfe", customer_id: "", municipio_codigo_ibge: "", natureza_operacao: "Venda de mercadoria",
  itens: [{ descricao: "", quantidade: 1, valor_unitario: "" }], observacoes: "",
});
const [salvandoNotaFiscal, setSalvandoNotaFiscal] = useState(false);
const [erroNotaFiscal, setErroNotaFiscal] = useState("");
const [xmlVisualizado, setXmlVisualizado] = useState(null);

// ── Contratos ──
const [contratos, setContratos] = useState([]);
const [loadingContratos, setLoadingContratos] = useState(true);
const [filtroTipoContrato, setFiltroTipoContrato] = useState("");
const [filtroStatusContrato, setFiltroStatusContrato] = useState("");
const [modalContratoAberto, setModalContratoAberto] = useState(false);
const [formContrato, setFormContrato] = useState({
  tipo: "fornecedor", nome_contraparte: "", documento: "", descricao: "", categoria: "outros",
  cost_center_id: "", valor: "", tipo_recorrencia: "mensal", dia_vencimento: 10,
  data_inicio: "", data_fim: "", renovacao_automatica: true, alerta_dias_antes: 30, observacoes: "",
});
const [editandoContratoId, setEditandoContratoId] = useState(null);
const [salvandoContrato, setSalvandoContrato] = useState(false);
const [erroContrato, setErroContrato] = useState("");
const [vencimentosContratos, setVencimentosContratos] = useState([]);
const [competenciaGerarContratos, setCompetenciaGerarContratos] = useState(mesAtual);
const [gerandoLancamentosContratos, setGerandoLancamentosContratos] = useState(false);
const [detalheContrato, setDetalheContrato] = useState(null);

// ── Cartões Corporativos ──
const [cartoes, setCartoes] = useState([]);
const [loadingCartoes, setLoadingCartoes] = useState(true);
const [cartaoSelecionado, setCartaoSelecionado] = useState(null);
const [limiteCartaoSelecionado, setLimiteCartaoSelecionado] = useState(null);
const [competenciaCartao, setCompetenciaCartao] = useState(mesAtual);
const [transacoesCartao, setTransacoesCartao] = useState([]);
const [loadingTransacoesCartao, setLoadingTransacoesCartao] = useState(false);
const [faturasCartao, setFaturasCartao] = useState([]);
const [modalCartaoAberto, setModalCartaoAberto] = useState(false);
const [editandoCartaoId, setEditandoCartaoId] = useState(null);
const [formCartao, setFormCartao] = useState({
  nome: "", bandeira: "outro", banco: "", final_cartao: "", limite: "",
  dia_fechamento: 25, dia_vencimento: 10, cost_center_id: "",
});
const [salvandoCartao, setSalvandoCartao] = useState(false);
const [erroCartao, setErroCartao] = useState("");
const [modalTransacaoCartaoAberto, setModalTransacaoCartaoAberto] = useState(false);
const [formTransacaoCartao, setFormTransacaoCartao] = useState({ data: "", descricao: "", categoria: "outros", valor: "", cost_center_id: "" });
const [salvandoTransacaoCartao, setSalvandoTransacaoCartao] = useState(false);
const [erroTransacaoCartao, setErroTransacaoCartao] = useState("");
const [fechandoFatura, setFechandoFatura] = useState(false);

// ── Simulador de Cenários ──
const [tipoCenario, setTipoCenario] = useState("variacao_percentual");
const [mesesProjecaoCenario, setMesesProjecaoCenario] = useState(6);
const [paramsVariacao, setParamsVariacao] = useState({ alvo: "despesa", percentual: "" });
const [paramsContratarDemitir, setParamsContratarDemitir] = useState({ acao: "contratar", valor_mensal: "", data_inicio: "" });
const [paramsNovoContrato, setParamsNovoContrato] = useState({ tipo: "fornecedor", valor: "", recorrencia: "mensal", data_inicio: "" });
const [paramsLivre, setParamsLivre] = useState({ receita_mensal_ajuste: "", despesa_mensal_ajuste: "" });
const [resultadoCenario, setResultadoCenario] = useState(null);
const [simulando, setSimulando] = useState(false);
const [erroCenario, setErroCenario] = useState("");
const [cenariosSalvos, setCenariosSalvos] = useState([]);
const [loadingCenariosSalvos, setLoadingCenariosSalvos] = useState(true);
const [nomeCenarioSalvar, setNomeCenarioSalvar] = useState("");
const [salvandoCenario, setSalvandoCenario] = useState(false);
const [modalSalvarCenarioAberto, setModalSalvarCenarioAberto] = useState(false);

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

  useEffect(() => {
    if (secaoAtiva !== "resumo") return;
    carregar();
    carregarCentrosCusto();
  }, [filtroTipo, filtroStatus, secaoAtiva]);

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

  const carregarConfigMotor = () => {
    setLoadingConfigMotor(true);
    api.get("/motor-financeiro/configuracoes")
      .then(r => {
        if (r.data) {
          setConfigMotor({
            imposto_padrao_pct: String(r.data.imposto_padrao_pct ?? ""),
            comissao_marketplace_pct: String(r.data.comissao_marketplace_pct ?? ""),
            taxa_gateway_pct: String(r.data.taxa_gateway_pct ?? ""),
            frete_medio_pct: String(r.data.frete_medio_pct ?? ""),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfigMotor(false));
  };

  const carregarResumoMotor = () => {
    setLoadingResumoMotor(true);
    api.get("/motor-financeiro/resumo").then(r => setResumoMotor(r.data)).catch(() => {}).finally(() => setLoadingResumoMotor(false));
  };

  const carregarBreakdowns = () => {
    setLoadingBreakdowns(true);
    api.get("/motor-financeiro/breakdowns").then(r => setBreakdowns(r.data || [])).catch(() => {}).finally(() => setLoadingBreakdowns(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "motor-financeiro") return;
    carregarConfigMotor();
    carregarResumoMotor();
    carregarBreakdowns();
  }, [secaoAtiva]);

  const salvarConfigMotor = async (e) => {
    e.preventDefault();
    setSalvandoConfigMotor(true);
    setAvisoConfigMotor(null);
    try {
      await api.post("/motor-financeiro/configuracoes", configMotor);
      setAvisoConfigMotor({ tipo: "sucesso", texto: "Configurações salvas com sucesso." });
    } catch (err) {
      setAvisoConfigMotor({ tipo: "erro", texto: err.response?.data?.error || "Erro ao salvar." });
    } finally {
      setSalvandoConfigMotor(false);
    }
  };

  const processarPendentesMotor = async () => {
    setProcessandoPendentes(true);
    try {
      const r = await api.post("/motor-financeiro/processar-pendentes");
      alert(r.data.message);
      carregarResumoMotor();
      carregarBreakdowns();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao processar pedidos.");
    } finally {
      setProcessandoPendentes(false);
    }
  };

  useEffect(() => {
    if (!avisoConfigMotor) return;
    const t = setTimeout(() => setAvisoConfigMotor(null), 4000);
    return () => clearTimeout(t);
  }, [avisoConfigMotor]);

  const carregarRentabilidade = (aba) => {
    setLoadingRentabilidade(true);
    const rotas = { produtos: "/rentabilidade/produtos", clientes: "/rentabilidade/clientes", canal: "/rentabilidade/canal", periodo: "/rentabilidade/periodo" };
    api.get(rotas[aba])
      .then(r => {
        if (aba === "produtos") setRentProdutos(r.data || []);
        if (aba === "clientes") setRentClientes(r.data || []);
        if (aba === "canal") setRentCanal(r.data || []);
        if (aba === "periodo") setRentPeriodo(r.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadingRentabilidade(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "rentabilidade") return;
    carregarRentabilidade(abaRentabilidade);
  }, [secaoAtiva, abaRentabilidade]);

  const carregarFluxoPreditivo = (dias) => {
    setLoadingFluxoPreditivo(true);
    api.get("/fluxo-preditivo/projecao", { params: { dias } })
      .then(r => setFluxoPreditivo(r.data))
      .catch(() => {})
      .finally(() => setLoadingFluxoPreditivo(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "fluxo-preditivo") return;
    carregarFluxoPreditivo(diasProjecao);
  }, [secaoAtiva, diasProjecao]);

  const carregarPosicaoTesouraria = () => {
    setLoadingPosicao(true);
    api.get("/tesouraria/posicao").then(r => setPosicaoTesouraria(r.data)).catch(() => {}).finally(() => setLoadingPosicao(false));
  };

  const carregarTransferencias = () => {
    setLoadingTransferencias(true);
    api.get("/tesouraria/transferencias").then(r => setTransferencias(r.data || [])).catch(() => {}).finally(() => setLoadingTransferencias(false));
  };

  const carregarInvestimentos = () => {
    setLoadingInvestimentos(true);
    api.get("/tesouraria/investimentos").then(r => setInvestimentos(r.data || [])).catch(() => {}).finally(() => setLoadingInvestimentos(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "tesouraria") return;
    carregarPosicaoTesouraria();
    carregarContasBancarias();
    if (abaTesouraria === "transferencias") carregarTransferencias();
    if (abaTesouraria === "investimentos") carregarInvestimentos();
  }, [secaoAtiva, abaTesouraria]);

  const abrirModalTransfer = () => {
    setFormTransfer({ conta_origem_id: "", conta_destino_id: "", valor: "", data: "", descricao: "" });
    setErroTransfer("");
    setModalTransferAberto(true);
  };

  const salvarTransferencia = async (e) => {
    e.preventDefault();
    if (!formTransfer.conta_origem_id || !formTransfer.conta_destino_id || !formTransfer.valor || !formTransfer.data) {
      setErroTransfer("Preencha todos os campos.");
      return;
    }
    setSalvandoTransfer(true);
    setErroTransfer("");
    try {
      await api.post("/tesouraria/transferencias", formTransfer);
      setModalTransferAberto(false);
      carregarTransferencias();
      carregarPosicaoTesouraria();
    } catch (err) {
      setErroTransfer(err.response?.data?.error || "Erro ao realizar transferência.");
    } finally {
      setSalvandoTransfer(false);
    }
  };

  const abrirModalInvest = () => {
    setFormInvest({ bank_account_id: "", nome: "", tipo: "cdb", valor_aplicado: "", data_aplicacao: "", data_vencimento: "" });
    setErroInvest("");
    setModalInvestAberto(true);
  };

  const salvarInvestimento = async (e) => {
    e.preventDefault();
    if (!formInvest.bank_account_id || !formInvest.nome || !formInvest.valor_aplicado || !formInvest.data_aplicacao) {
      setErroInvest("Preencha conta, nome, valor e data de aplicação.");
      return;
    }
    setSalvandoInvest(true);
    setErroInvest("");
    try {
      await api.post("/tesouraria/investimentos", formInvest);
      setModalInvestAberto(false);
      carregarInvestimentos();
      carregarPosicaoTesouraria();
    } catch (err) {
      setErroInvest(err.response?.data?.error || "Erro ao registrar investimento.");
    } finally {
      setSalvandoInvest(false);
    }
  };

  const atualizarValorInvestimento = async (id, valorAtual) => {
    const novoValor = prompt("Novo valor atual do investimento:", valorAtual);
    if (!novoValor) return;
    try {
      await api.put(`/tesouraria/investimentos/${id}/valor`, { valor_atual: novoValor });
      carregarInvestimentos();
      carregarPosicaoTesouraria();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao atualizar valor.");
    }
  };

  const resgatarInvestimento = async (id) => {
    if (!confirm("Resgatar este investimento? O valor atual será depositado de volta na conta de origem.")) return;
    try {
      const r = await api.post(`/tesouraria/investimentos/${id}/resgatar`);
      alert(`Resgatado: ${r.data.valor_resgatado}`);
      carregarInvestimentos();
      carregarPosicaoTesouraria();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao resgatar.");
    }
  };

  const nomeTipoInvestimento = (tipo) => {
    const nomes = { cdb: "CDB", tesouro_direto: "Tesouro Direto", fundo: "Fundo de Investimento", poupanca: "Poupança", outro: "Outro" };
    return nomes[tipo] || tipo;
  };

  const carregarOrcamento = (competencia) => {
    setLoadingOrcamento(true);
    api.get("/orcamento", { params: { competencia } })
      .then(r => setDadosOrcamento(r.data))
      .catch(() => {})
      .finally(() => setLoadingOrcamento(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "orcamento") return;
    carregarOrcamento(competenciaOrcamento);
    carregarCentrosCusto();
  }, [secaoAtiva, competenciaOrcamento]);

  const abrirModalOrcamento = () => {
    setFormOrcamento({ tipo: "despesa", categoria: "outros", cost_center_id: "", valor_planejado: "" });
    setErroOrcamento("");
    setModalOrcamentoAberto(true);
  };

  const salvarOrcamento = async (e) => {
    e.preventDefault();
    if (!formOrcamento.cost_center_id || !formOrcamento.valor_planejado) {
      setErroOrcamento("Preencha centro de custo e valor planejado.");
      return;
    }
    setSalvandoOrcamento(true);
    setErroOrcamento("");
    try {
      await api.post("/orcamento", { ...formOrcamento, competencia: competenciaOrcamento });
      setModalOrcamentoAberto(false);
      carregarOrcamento(competenciaOrcamento);
    } catch (err) {
      setErroOrcamento(err.response?.data?.error || "Erro ao salvar orçamento.");
    } finally {
      setSalvandoOrcamento(false);
    }
  };

  const excluirOrcamento = async (id) => {
    if (!confirm("Excluir este item do orçamento?")) return;
    try {
      await api.delete(`/orcamento/${id}`);
      carregarOrcamento(competenciaOrcamento);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  const copiarOrcamentoMesAnterior = async () => {
    const [ano, mes] = competenciaOrcamento.split("-").map(Number);
    const dataAnterior = new Date(ano, mes - 2, 1);
    const competenciaAnterior = dataAnterior.toISOString().slice(0, 7);

    setCopiandoOrcamento(true);
    try {
      const r = await api.post("/orcamento/copiar", { competencia_origem: competenciaAnterior, competencia_destino: competenciaOrcamento });
      alert(r.data.message);
      carregarOrcamento(competenciaOrcamento);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao copiar orçamento.");
    } finally {
      setCopiandoOrcamento(false);
    }
  };

  const carregarRegrasAutomacao = () => {
    setLoadingRegras(true);
    api.get("/automacao-financeira/regras").then(r => setRegrasAutomacao(r.data || [])).catch(() => {}).finally(() => setLoadingRegras(false));
  };

  const carregarLogsAutomacao = () => {
    setLoadingLogsAutomacao(true);
    api.get("/automacao-financeira/logs").then(r => setLogsAutomacao(r.data || [])).catch(() => {}).finally(() => setLoadingLogsAutomacao(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "automacao") return;
    carregarCentrosCusto();
    if (abaAutomacao === "regras") carregarRegrasAutomacao();
    if (abaAutomacao === "logs") carregarLogsAutomacao();
  }, [secaoAtiva, abaAutomacao]);

  const abrirModalRegra = () => {
    setFormRegra({
      nome: "", ordem: regrasAutomacao.length, condicao_tipo: "", condicao_categoria: "", condicao_cost_center_id: "",
      condicao_valor_operador: "", condicao_valor_min: "", condicao_valor_max: "", acao: "exigir_aprovacao",
    });
    setErroRegra("");
    setModalRegraAberto(true);
  };

  const salvarRegra = async (e) => {
    e.preventDefault();
    if (!formRegra.nome) {
      setErroRegra("Preencha o nome da regra.");
      return;
    }
    setSalvandoRegra(true);
    setErroRegra("");
    try {
      await api.post("/automacao-financeira/regras", formRegra);
      setModalRegraAberto(false);
      carregarRegrasAutomacao();
    } catch (err) {
      setErroRegra(err.response?.data?.error || "Erro ao salvar regra.");
    } finally {
      setSalvandoRegra(false);
    }
  };

  const alternarAtivoRegra = async (id, ativoAtual) => {
    try {
      await api.put(`/automacao-financeira/regras/${id}`, { ativo: !ativoAtual });
      carregarRegrasAutomacao();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao atualizar regra.");
    }
  };

  const excluirRegra = async (id) => {
    if (!confirm("Excluir esta regra?")) return;
    try {
      await api.delete(`/automacao-financeira/regras/${id}`);
      carregarRegrasAutomacao();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao excluir regra.");
    }
  };

  const nomeAcao = (acao) => {
    const nomes = {
      aprovar_automatico: "✅ Aprovar automaticamente",
      exigir_aprovacao: "⏸️ Exigir aprovação manual",
      marcar_pago_automatico: "💰 Marcar como pago automaticamente",
      rejeitar: "🚫 Rejeitar automaticamente",
    };
    return nomes[acao] || acao;
  };

  const carregarAlertas = () => {
    setLoadingAlertas(true);
    api.get("/alertas").then(r => setAlertas(r.data || [])).catch(() => {}).finally(() => setLoadingAlertas(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "alertas") return;
    carregarAlertas();
  }, [secaoAtiva]);

  const revarrerAlertas = async () => {
    setRevarrendoAlertas(true);
    try {
      await api.post("/alertas/revarrer");
      carregarAlertas();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao gerar alertas.");
    } finally {
      setRevarrendoAlertas(false);
    }
  };

  const resolverAlerta = async (id) => {
    try {
      await api.post(`/alertas/${id}/resolver`);
      carregarAlertas();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao resolver alerta.");
    }
  };

  const corSeveridade = (severidade) => {
    const cores = { critico: "#dc2626", importante: "#f59e0b", atencao: "#3b82f6", normal: "#6e6e73" };
    return cores[severidade] || "#6e6e73";
  };

  const iconeSeveridade = (severidade) => {
    const icones = { critico: "🔴", importante: "🟠", atencao: "🟡", normal: "🟢" };
    return icones[severidade] || "🟢";
  };

  const labelSeveridade = (severidade) => {
    const labels = { critico: "Crítico", importante: "Importante", atencao: "Atenção", normal: "Normal" };
    return labels[severidade] || severidade;
  };

  const carregarFechamento = (competencia) => {
    setLoadingFechamento(true);
    api.get("/fechamento/checklist", { params: { competencia } })
      .then(r => setChecklistFechamento(r.data))
      .catch(() => {})
      .finally(() => setLoadingFechamento(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "fechamento") return;
    carregarFechamento(competenciaFechamento);
  }, [secaoAtiva, competenciaFechamento]);

  const corStatusFechamento = (status) => {
    const cores = { pronto: "#16a34a", quase_pronto: "#f59e0b", nao_pronto: "#dc2626" };
    return cores[status] || "#6e6e73";
  };

  const labelStatusFechamento = (status) => {
    const labels = { pronto: "✅ Pronto para fechar", quase_pronto: "⚠️ Quase pronto", nao_pronto: "🔴 Não pronto" };
    return labels[status] || status;
  };

  const carregarCalculoFiscal = (competencia) => {
    setLoadingCalculoFiscal(true);
    api.get("/fiscal-profundo/calculo", { params: { competencia } })
      .then(r => setCalculoFiscal(r.data))
      .catch(() => setCalculoFiscal(null))
      .finally(() => setLoadingCalculoFiscal(false));
  };

  const carregarHistoricoFiscal = () => {
    api.get("/fiscal-profundo/historico").then(r => setHistoricoFiscal(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    if (secaoAtiva !== "fiscal" || abaFiscalDetalhe !== "apuracao") return;
    carregarCalculoFiscal(competenciaApuracao);
    carregarHistoricoFiscal();
    carregarCentrosCusto();
  }, [secaoAtiva, abaFiscalDetalhe, competenciaApuracao]);

  const calcularImpostos = async () => {
    setCalculandoFiscal(true);
    try {
      const r = await api.get("/fiscal-profundo/calcular", { params: { competencia: competenciaApuracao } });
      setCalculoFiscal({ ...r.data, detalhes: r.data.detalhes });
      carregarHistoricoFiscal();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao calcular impostos.");
    } finally {
      setCalculandoFiscal(false);
    }
  };

  const gerarGuiaFiscal = async () => {
    if (!costCenterGuia) { alert("Selecione um centro de custo."); return; }
    setGerandoGuia(true);
    try {
      const r = await api.post("/fiscal-profundo/gerar-guia", { competencia: competenciaApuracao, cost_center_id: costCenterGuia });
      alert(r.data.message);
      carregarCalculoFiscal(competenciaApuracao);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao gerar guia.");
    } finally {
      setGerandoGuia(false);
    }
  };

  const carregarCartoes = () => {
  setLoadingCartoes(true);
  api.get("/cartoes").then(r => setCartoes(r.data || [])).catch(() => {}).finally(() => setLoadingCartoes(false));
};

useEffect(() => {
  if (secaoAtiva !== "cartoes") return;
  carregarCartoes();
  carregarCentrosCusto();
}, [secaoAtiva]);

const carregarLimiteCartao = (cardId) => {
  api.get(`/cartoes/${cardId}/limite`).then(r => setLimiteCartaoSelecionado(r.data)).catch(() => setLimiteCartaoSelecionado(null));
};

const carregarTransacoesCartao = (cardId, competencia) => {
  setLoadingTransacoesCartao(true);
  api.get("/cartoes/transacoes/listar", { params: { card_id: cardId, competencia } })
    .then(r => setTransacoesCartao(r.data || []))
    .catch(() => setTransacoesCartao([]))
    .finally(() => setLoadingTransacoesCartao(false));
};

const carregarFaturasCartao = (cardId) => {
  api.get(`/cartoes/${cardId}/faturas`).then(r => setFaturasCartao(r.data || [])).catch(() => {});
};

const selecionarCartao = (cartao) => {
  setCartaoSelecionado(cartao);
  carregarLimiteCartao(cartao.id);
  carregarTransacoesCartao(cartao.id, competenciaCartao);
  carregarFaturasCartao(cartao.id);
};

useEffect(() => {
  if (cartaoSelecionado) carregarTransacoesCartao(cartaoSelecionado.id, competenciaCartao);
}, [competenciaCartao]);

const abrirModalCartao = (cartao = null) => {
  if (cartao) {
    setEditandoCartaoId(cartao.id);
    setFormCartao({
      nome: cartao.nome, bandeira: cartao.bandeira, banco: cartao.banco || "", final_cartao: cartao.final_cartao || "",
      limite: cartao.limite, dia_fechamento: cartao.dia_fechamento, dia_vencimento: cartao.dia_vencimento,
      cost_center_id: cartao.cost_center_id,
    });
  } else {
    setEditandoCartaoId(null);
    setFormCartao({ nome: "", bandeira: "outro", banco: "", final_cartao: "", limite: "", dia_fechamento: 25, dia_vencimento: 10, cost_center_id: "" });
  }
  setErroCartao("");
  setModalCartaoAberto(true);
};

const salvarCartao = async (e) => {
  e.preventDefault();
  if (!formCartao.nome || !formCartao.limite || !formCartao.cost_center_id) {
    setErroCartao("Preencha nome, limite e centro de custo.");
    return;
  }
  setSalvandoCartao(true);
  setErroCartao("");
  try {
    if (editandoCartaoId) {
      await api.put(`/cartoes/${editandoCartaoId}`, formCartao);
    } else {
      await api.post("/cartoes", formCartao);
    }
    setModalCartaoAberto(false);
    carregarCartoes();
  } catch (err) {
    setErroCartao(err.response?.data?.error || "Erro ao salvar cartão.");
  } finally {
    setSalvandoCartao(false);
  }
};

const desativarCartao = async (id) => {
  if (!confirm("Desativar este cartão?")) return;
  try {
    await api.delete(`/cartoes/${id}`);
    carregarCartoes();
    if (cartaoSelecionado?.id === id) setCartaoSelecionado(null);
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao desativar cartão.");
  }
};

const abrirModalTransacaoCartao = () => {
  setFormTransacaoCartao({ data: "", descricao: "", categoria: "outros", valor: "", cost_center_id: cartaoSelecionado?.cost_center_id || "" });
  setErroTransacaoCartao("");
  setModalTransacaoCartaoAberto(true);
};

const salvarTransacaoCartao = async (e) => {
  e.preventDefault();
  if (!formTransacaoCartao.data || !formTransacaoCartao.descricao || !formTransacaoCartao.valor) {
    setErroTransacaoCartao("Preencha data, descrição e valor.");
    return;
  }
  setSalvandoTransacaoCartao(true);
  setErroTransacaoCartao("");
  try {
    await api.post("/cartoes/transacoes", { ...formTransacaoCartao, card_id: cartaoSelecionado.id });
    setModalTransacaoCartaoAberto(false);
    carregarTransacoesCartao(cartaoSelecionado.id, competenciaCartao);
    carregarLimiteCartao(cartaoSelecionado.id);
    carregarFaturasCartao(cartaoSelecionado.id);
  } catch (err) {
    setErroTransacaoCartao(err.response?.data?.error || "Erro ao lançar transação.");
  } finally {
    setSalvandoTransacaoCartao(false);
  }
};

const excluirTransacaoCartao = async (id) => {
  if (!confirm("Excluir este lançamento?")) return;
  try {
    await api.delete(`/cartoes/transacoes/${id}`);
    carregarTransacoesCartao(cartaoSelecionado.id, competenciaCartao);
    carregarLimiteCartao(cartaoSelecionado.id);
    carregarFaturasCartao(cartaoSelecionado.id);
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao excluir.");
  }
};

const fecharFaturaCartao = async () => {
  if (!confirm(`Fechar a fatura de ${competenciaCartao}? Isso vai gerar um lançamento em Contas a Pagar.`)) return;
  setFechandoFatura(true);
  try {
    const r = await api.post("/cartoes/faturas/fechar", { card_id: cartaoSelecionado.id, competencia: competenciaCartao });
    alert(r.data.message);
    carregarFaturasCartao(cartaoSelecionado.id);
    carregarLimiteCartao(cartaoSelecionado.id);
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao fechar fatura.");
  } finally {
    setFechandoFatura(false);
  }
};

const nomeBandeira = (b) => {
  const nomes = { visa: "Visa", mastercard: "Mastercard", elo: "Elo", amex: "Amex", outro: "Outra" };
  return nomes[b] || b;
};

const corStatusFatura = (status) => {
  const cores = { aberta: "#3b82f6", fechada: "#f59e0b", paga: "#16a34a" };
  return cores[status] || "#6e6e73";
};

const faturaAtualCompetencia = faturasCartao.find(f => f.competencia === competenciaCartao);

const carregarCenariosSalvos = () => {
  setLoadingCenariosSalvos(true);
  api.get("/cenarios").then(r => setCenariosSalvos(r.data || [])).catch(() => {}).finally(() => setLoadingCenariosSalvos(false));
};

useEffect(() => {
  if (secaoAtiva !== "simulador") return;
  carregarCenariosSalvos();
}, [secaoAtiva]);

const parametrosAtuais = () => {
  if (tipoCenario === "variacao_percentual") return paramsVariacao;
  if (tipoCenario === "contratar_demitir") return paramsContratarDemitir;
  if (tipoCenario === "novo_contrato") return paramsNovoContrato;
  return paramsLivre;
};

const validarParametros = () => {
  if (tipoCenario === "variacao_percentual") {
    return paramsVariacao.percentual !== "";
  }
  if (tipoCenario === "contratar_demitir") {
    return paramsContratarDemitir.valor_mensal !== "" && paramsContratarDemitir.data_inicio !== "";
  }
  if (tipoCenario === "novo_contrato") {
    return paramsNovoContrato.valor !== "" && paramsNovoContrato.data_inicio !== "";
  }
  if (tipoCenario === "livre") {
    return paramsLivre.receita_mensal_ajuste !== "" || paramsLivre.despesa_mensal_ajuste !== "";
  }
  return false;
};

const simularCenario = async () => {
  if (!validarParametros()) {
    setErroCenario("Preencha os parâmetros do cenário.");
    return;
  }
  setSimulando(true);
  setErroCenario("");
  try {
    const r = await api.post("/cenarios/simular", {
      tipo: tipoCenario,
      parametros: parametrosAtuais(),
      meses_projecao: mesesProjecaoCenario,
    });
    setResultadoCenario(r.data);
  } catch (err) {
    setErroCenario(err.response?.data?.error || "Erro ao simular cenário.");
  } finally {
    setSimulando(false);
  }
};

const abrirModalSalvarCenario = () => {
  setNomeCenarioSalvar("");
  setModalSalvarCenarioAberto(true);
};

const salvarCenarioAtual = async (e) => {
  e.preventDefault();
  if (!nomeCenarioSalvar.trim()) return;
  setSalvandoCenario(true);
  try {
    await api.post("/cenarios", {
      nome: nomeCenarioSalvar,
      tipo: tipoCenario,
      parametros: parametrosAtuais(),
      meses_projecao: mesesProjecaoCenario,
    });
    setModalSalvarCenarioAberto(false);
    carregarCenariosSalvos();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao salvar cenário.");
  } finally {
    setSalvandoCenario(false);
  }
};

const carregarCenarioSalvo = async (cenario) => {
  setTipoCenario(cenario.tipo);
  setMesesProjecaoCenario(cenario.meses_projecao);
  if (cenario.tipo === "variacao_percentual") setParamsVariacao(cenario.parametros);
  if (cenario.tipo === "contratar_demitir") setParamsContratarDemitir(cenario.parametros);
  if (cenario.tipo === "novo_contrato") setParamsNovoContrato(cenario.parametros);
  if (cenario.tipo === "livre") setParamsLivre(cenario.parametros);
  setResultadoCenario(null);
};

const excluirCenarioSalvo = async (id) => {
  if (!confirm("Excluir este cenário salvo?")) return;
  try {
    await api.delete(`/cenarios/${id}`);
    carregarCenariosSalvos();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao excluir.");
  }
};

const nomeTipoCenario = (tipo) => {
  const nomes = {
    variacao_percentual: "📊 Variação %", contratar_demitir: "👤 Contratar/Demitir",
    novo_contrato: "📑 Novo Contrato", livre: "✏️ Cenário Livre",
  };
  return nomes[tipo] || tipo;
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

const carregarNotasFiscais = () => {
  setLoadingNotasFiscais(true);
  api.get("/fiscal-documents").then(r => setNotasFiscais(r.data || [])).catch(() => {}).finally(() => setLoadingNotasFiscais(false));
};

useEffect(() => {
  if (secaoAtiva !== "notas-fiscais") return;
  carregarNotasFiscais();
  api.get("/customers").then(r => setCustomersNF(r.data.data || r.data || [])).catch(() => {});
}, [secaoAtiva]);

const abrirModalNotaFiscal = () => {
  setFormNotaFiscal({
    tipo: "nfe", customer_id: "", municipio_codigo_ibge: "", natureza_operacao: "Venda de mercadoria",
    itens: [{ descricao: "", quantidade: 1, valor_unitario: "" }], observacoes: "",
  });
  setErroNotaFiscal("");
  setModalNotaFiscalAberto(true);
};

const atualizarItemNF = (idx, campo, valor) => {
  setFormNotaFiscal(prev => {
    const itens = [...prev.itens];
    itens[idx] = { ...itens[idx], [campo]: valor };
    return { ...prev, itens };
  });
};

const adicionarItemNF = () => {
  setFormNotaFiscal(prev => ({ ...prev, itens: [...prev.itens, { descricao: "", quantidade: 1, valor_unitario: "" }] }));
};

const removerItemNF = (idx) => {
  setFormNotaFiscal(prev => ({ ...prev, itens: prev.itens.filter((_, i) => i !== idx) }));
};

const salvarNotaFiscal = async (e) => {
  e.preventDefault();
  if (formNotaFiscal.tipo === "nfse" && !formNotaFiscal.municipio_codigo_ibge) {
    setErroNotaFiscal("Codigo IBGE do municipio e obrigatorio para NFS-e.");
    return;
  }
  if (formNotaFiscal.itens.some(i => !i.descricao || !i.valor_unitario)) {
    setErroNotaFiscal("Preencha descricao e valor unitario de todos os itens.");
    return;
  }
  setSalvandoNotaFiscal(true);
  setErroNotaFiscal("");
  try {
    await api.post("/fiscal-documents", {
      ...formNotaFiscal,
      customer_id: formNotaFiscal.customer_id || undefined,
      itens: formNotaFiscal.itens.map(i => ({ ...i, quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario) })),
    });
    setModalNotaFiscalAberto(false);
    carregarNotasFiscais();
  } catch (err) {
    setErroNotaFiscal(err.response?.data?.error || "Erro ao criar documento fiscal.");
  } finally {
    setSalvandoNotaFiscal(false);
  }
};

const gerarXmlNotaFiscal = async (id) => {
  try {
    const r = await api.post(`/fiscal-documents/${id}/gerar-xml`);
    setXmlVisualizado(r.data.xml);
    carregarNotasFiscais();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao gerar XML.");
  }
};

const cancelarNotaFiscal = async (id) => {
  const motivo = prompt("Motivo do cancelamento (opcional):");
  try {
    await api.post(`/fiscal-documents/${id}/cancelar`, { motivo });
    carregarNotasFiscais();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao cancelar.");
  }
};

const excluirNotaFiscal = async (id) => {
  if (!confirm("Excluir este documento fiscal?")) return;
  try {
    await api.delete(`/fiscal-documents/${id}`);
    carregarNotasFiscais();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao excluir.");
  }
};

const corStatusNF = (status) => {
  const cores = { rascunho: "#6e6e73", aguardando_certificado: "#f59e0b", emitida: "#16a34a", cancelada: "#dc2626", erro: "#dc2626" };
  return cores[status] || "#6e6e73";
};

const labelStatusNF = (status) => {
  const labels = { rascunho: "Rascunho", aguardando_certificado: "Aguardando certificado", emitida: "Emitida", cancelada: "Cancelada", erro: "Erro" };
  return labels[status] || status;
};

const labelTipoNF = (tipo) => ({ nfe: "NF-e", nfce: "NFC-e", nfse: "NFS-e" }[tipo] || tipo);

  const carregarContratos = () => {
  setLoadingContratos(true);
  api.get("/contratos", { params: { tipo: filtroTipoContrato || undefined, status: filtroStatusContrato || undefined } })
    .then(r => setContratos(r.data || []))
    .catch(() => {})
    .finally(() => setLoadingContratos(false));
};

const carregarVencimentosContratos = () => {
  api.get("/contratos/vencimentos").then(r => setVencimentosContratos(r.data || [])).catch(() => {});
};

useEffect(() => {
  if (secaoAtiva !== "contratos") return;
  carregarContratos();
  carregarVencimentosContratos();
  carregarCentrosCusto();
}, [secaoAtiva, filtroTipoContrato, filtroStatusContrato]);

const abrirModalContrato = (contrato = null) => {
  if (contrato) {
    setEditandoContratoId(contrato.id);
    setFormContrato({
      tipo: contrato.tipo, nome_contraparte: contrato.nome_contraparte, documento: contrato.documento || "",
      descricao: contrato.descricao, categoria: contrato.categoria, cost_center_id: contrato.cost_center_id,
      valor: contrato.valor, tipo_recorrencia: contrato.tipo_recorrencia, dia_vencimento: contrato.dia_vencimento,
      data_inicio: contrato.data_inicio?.slice(0, 10) || "", data_fim: contrato.data_fim?.slice(0, 10) || "",
      renovacao_automatica: !!contrato.renovacao_automatica, alerta_dias_antes: contrato.alerta_dias_antes,
      observacoes: contrato.observacoes || "",
    });
  } else {
    setEditandoContratoId(null);
    setFormContrato({
      tipo: "fornecedor", nome_contraparte: "", documento: "", descricao: "", categoria: "outros",
      cost_center_id: "", valor: "", tipo_recorrencia: "mensal", dia_vencimento: 10,
      data_inicio: "", data_fim: "", renovacao_automatica: true, alerta_dias_antes: 30, observacoes: "",
    });
  }
  setErroContrato("");
  setModalContratoAberto(true);
};

const salvarContrato = async (e) => {
  e.preventDefault();
  if (!formContrato.nome_contraparte || !formContrato.descricao || !formContrato.cost_center_id || !formContrato.valor || !formContrato.data_inicio) {
    setErroContrato("Preencha contraparte, descrição, centro de custo, valor e data de início.");
    return;
  }
  setSalvandoContrato(true);
  setErroContrato("");
  try {
    if (editandoContratoId) {
      await api.put(`/contratos/${editandoContratoId}`, formContrato);
    } else {
      await api.post("/contratos", formContrato);
    }
    setModalContratoAberto(false);
    carregarContratos();
    carregarVencimentosContratos();
  } catch (err) {
    setErroContrato(err.response?.data?.error || "Erro ao salvar contrato.");
  } finally {
    setSalvandoContrato(false);
  }
};

const mudarStatusContrato = async (id, status) => {
  try {
    await api.post(`/contratos/${id}/status`, { status });
    carregarContratos();
    carregarVencimentosContratos();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao atualizar status.");
  }
};

const excluirContrato = async (id) => {
  if (!confirm("Excluir este contrato? Essa ação não pode ser desfeita.")) return;
  try {
    await api.delete(`/contratos/${id}`);
    carregarContratos();
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao excluir contrato.");
  }
};

const gerarLancamentosContratos = async () => {
  setGerandoLancamentosContratos(true);
  try {
    const r = await api.post("/contratos/gerar-lancamentos", { competencia: competenciaGerarContratos });
    alert(r.data.message);
  } catch (err) {
    alert(err.response?.data?.error || "Erro ao gerar lançamentos.");
  } finally {
    setGerandoLancamentosContratos(false);
  }
};

const nomeRecorrencia = (tipo) => {
  const nomes = { unico: "Único", mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" };
  return nomes[tipo] || tipo;
};

const corStatusContrato = (status) => {
  const cores = { ativo: "#16a34a", suspenso: "#f59e0b", encerrado: "#6e6e73" };
  return cores[status] || "#6e6e73";
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

  const abrirModalVincular = (doc) => {
    setDocumentoParaVincular(doc);
    setEntidadeVinculo(doc.entidade_id ? `lancamento_financeiro:${doc.entidade_id}` : "");
    setModalVincularAberto(true);
  };

  const salvarVinculo = async () => {
    setSalvandoVinculo(true);
    try {
      if (entidadeVinculo) {
        const [tipo, id] = entidadeVinculo.split(":");
        await api.put(`/documentos/${documentoParaVincular.id}/vincular`, { entidade_tipo: tipo, entidade_id: id });
      } else {
        await api.put(`/documentos/${documentoParaVincular.id}/vincular`, { entidade_tipo: "nenhuma", entidade_id: null });
      }
      setModalVincularAberto(false);
      carregarDocumentos();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao vincular documento.");
    } finally {
      setSalvandoVinculo(false);
    }
  };

  const carregarDocumentosDaEntrada = async (entradaId) => {
    if (documentosPorEntrada[entradaId]) return;
    try {
      const r = await api.get(`/documentos/entidade/lancamento_financeiro/${entradaId}`);
      setDocumentosPorEntrada(prev => ({ ...prev, [entradaId]: r.data || [] }));
    } catch {
      setDocumentosPorEntrada(prev => ({ ...prev, [entradaId]: [] }));
    }
  };

  useEffect(() => {
    if (secaoAtiva === "contas-pagar" && contasPagar?.lancamentos) {
      contasPagar.lancamentos.forEach(l => carregarDocumentosDaEntrada(l.id));
    }
  }, [contasPagar]);

  useEffect(() => {
    if (secaoAtiva === "contas-receber" && contasReceber?.lancamentos) {
      contasReceber.lancamentos.forEach(l => carregarDocumentosDaEntrada(l.id));
    }
  }, [contasReceber]);

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

  const nomeCanal = (canal) => {
    const nomes = { loja_propria: "Loja Própria", mercadolivre: "Mercado Livre", shopee: "Shopee", amazon: "Amazon", shopify: "Shopify", nuvemshop: "Nuvemshop", woocommerce: "WooCommerce" };
    return nomes[canal] || canal;
  };

  const carregarLogsAuditoria = () => {
    setLoadingLogsAuditoria(true);
    api.get("/auditoria/logs").then(r => setLogsAuditoria(r.data || [])).catch(() => {}).finally(() => setLoadingLogsAuditoria(false));
  };

  const carregarAlcada = () => {
    setLoadingAlcada(true);
    api.get("/auditoria/alcada")
      .then(r => setAlcada({ valor_minimo: String(r.data.valor_minimo ?? "5000") }))
      .catch(() => {})
      .finally(() => setLoadingAlcada(false));
  };

  useEffect(() => {
    if (secaoAtiva !== "governanca") return;
    if (abaGovernanca === "logs") carregarLogsAuditoria();
    if (abaGovernanca === "alcada") carregarAlcada();
  }, [secaoAtiva, abaGovernanca]);

  const salvarAlcada = async (e) => {
    e.preventDefault();
    setSalvandoAlcada(true);
    setAvisoAlcada(null);
    try {
      await api.post("/auditoria/alcada", alcada);
      setAvisoAlcada({ tipo: "sucesso", texto: "Alçada atualizada com sucesso." });
    } catch (err) {
      setAvisoAlcada({ tipo: "erro", texto: err.response?.data?.error || "Erro ao salvar." });
    } finally {
      setSalvandoAlcada(false);
    }
  };

  const nomeAcaoAuditoria = (acao) => {
    const nomes = {
      aprovar_lancamento: "✅ Aprovou lançamento", rejeitar_lancamento: "🚫 Rejeitou lançamento",
      resgatar_investimento: "💵 Resgatou investimento", criar_lancamento_contabil: "📝 Criou lançamento contábil",
      excluir_lancamento_contabil: "🗑️ Excluiu lançamento contábil",
    };
    return nomes[acao] || acao;
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

      {/* ═══════════ MOTOR FINANCEIRO ═══════════ */}
      {secaoAtiva === "motor-financeiro" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Motor Financeiro</h1>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Decompõe cada venda em receita, custo, taxas e lucro líquido real.</p>
            </div>
            <button onClick={processarPendentesMotor} disabled={processandoPendentes} style={{ background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
              {processandoPendentes ? "Processando..." : "⚙️ Processar Pedidos Pendentes"}
            </button>
          </div>

          {loadingResumoMotor ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : resumoMotor && (
            <>
              {Number(resumoMotor.qtd_pedidos_pendentes) > 0 && (
                <div style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 10, fontSize: 13.5, background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b40" }}>
                  ⚠️ {resumoMotor.qtd_pedidos_pendentes} pedido(s) pago(s) ainda não processado(s) pelo motor. Clique em "Processar Pedidos Pendentes".
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Receita Bruta</p>
                  <h2 style={{ color: cor.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumoMotor.receita_total)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Custo Produtos</p>
                  <h2 style={{ color: "#f87171", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumoMotor.custo_total)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Comissões</p>
                  <h2 style={{ color: "#f87171", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumoMotor.comissao_total)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Gateway</p>
                  <h2 style={{ color: "#f87171", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumoMotor.gateway_total)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Frete</p>
                  <h2 style={{ color: "#f87171", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumoMotor.frete_total)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Impostos</p>
                  <h2 style={{ color: "#f87171", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(resumoMotor.impostos_total)}</h2>
                </div>
              </div>

              <div style={{
                ...cardStyle, marginBottom: 28,
                background: Number(resumoMotor.lucro_total) >= 0 ? "#16a34a10" : "#dc262610",
                border: `1px solid ${Number(resumoMotor.lucro_total) >= 0 ? "#16a34a40" : "#dc262640"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ color: cor.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Lucro Líquido Real</p>
                    <p style={{ color: cor.textMuted, fontSize: 12, margin: "4px 0 0" }}>
                      Margem média: {resumoMotor.margem_media}% · {resumoMotor.qtd_pedidos_processados} pedidos processados
                    </p>
                  </div>
                  <p style={{ color: Number(resumoMotor.lucro_total) >= 0 ? "#16a34a" : "#dc2626", fontSize: 26, fontWeight: 700, margin: 0 }}>
                    {formatarMoeda(resumoMotor.lucro_total)}
                  </p>
                </div>
              </div>
            </>
          )}

          <h2 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>⚙️ Parâmetros de Cálculo</h2>
          <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 14 }}>Usados para estimar comissão, gateway, frete e impostos quando não há dado real vindo do marketplace.</p>

          {avisoConfigMotor && (
            <div style={{
              marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13,
              background: avisoConfigMotor.tipo === "sucesso" ? "#16a34a15" : "#dc262615",
              color: avisoConfigMotor.tipo === "sucesso" ? "#16a34a" : "#dc2626",
            }}>
              {avisoConfigMotor.texto}
            </div>
          )}

          {loadingConfigMotor ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : (
            <form onSubmit={salvarConfigMotor} style={{ ...cardStyle, marginBottom: 28, maxWidth: 560 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Imposto padrão (%)</label>
                  <input type="number" step="0.01" value={configMotor.imposto_padrao_pct} onChange={e => setConfigMotor({ ...configMotor, imposto_padrao_pct: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Comissão marketplace (%)</label>
                  <input type="number" step="0.01" value={configMotor.comissao_marketplace_pct} onChange={e => setConfigMotor({ ...configMotor, comissao_marketplace_pct: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Taxa gateway (%)</label>
                  <input type="number" step="0.01" value={configMotor.taxa_gateway_pct} onChange={e => setConfigMotor({ ...configMotor, taxa_gateway_pct: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Frete médio (%)</label>
                  <input type="number" step="0.01" value={configMotor.frete_medio_pct} onChange={e => setConfigMotor({ ...configMotor, frete_medio_pct: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <button type="submit" disabled={salvandoConfigMotor} style={{ marginTop: 10, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                {salvandoConfigMotor ? "Salvando..." : "Salvar Parâmetros"}
              </button>
            </form>
          )}

          <h2 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🧾 Pedidos Processados</h2>
          {loadingBreakdowns ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : breakdowns.length === 0 ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum pedido processado ainda. Clique em "Processar Pedidos Pendentes" para começar.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {breakdowns.map(b => (
                <div key={b.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>Pedido #{b.order_id}</p>
                    <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                      Receita {formatarMoeda(b.receita_bruta)} · Custo {formatarMoeda(b.custo_produtos)} · Taxas {formatarMoeda(Number(b.comissao_marketplace) + Number(b.taxa_gateway) + Number(b.frete) + Number(b.impostos))}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                    {b.margem_percentual}% margem
                  </span>
                  <p style={{ color: Number(b.lucro_liquido) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>
                    {formatarMoeda(b.lucro_liquido)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ RENTABILIDADE REAL ═══════════ */}
      {secaoAtiva === "rentabilidade" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Rentabilidade Real</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Lucro líquido detalhado por produto, cliente, canal e período — a partir dos pedidos já processados pelo Motor Financeiro.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "produtos", label: "📦 Produtos" },
              { id: "clientes", label: "👤 Clientes" },
              { id: "canal", label: "🛒 Canal" },
              { id: "periodo", label: "📅 Período" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaRentabilidade(tab.id)} style={{
                background: abaRentabilidade === tab.id ? cor.text : "none",
                color: abaRentabilidade === tab.id ? cor.bg : cor.textMuted,
                border: `1px solid ${cor.border}`, borderRadius: 8, padding: "7px 16px",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {loadingRentabilidade ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : (
            <>
              {abaRentabilidade === "produtos" && (
                rentProdutos.length === 0 ? (
                  <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum dado ainda. Processe pedidos no Motor Financeiro primeiro.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rentProdutos.map(p => (
                      <div key={p.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{p.nome}</p>
                          <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                            SKU {p.sku || "—"} · {p.unidades_vendidas} unidades vendidas · Receita {formatarMoeda(p.receita)}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                          {p.margem_percentual}% margem
                        </span>
                        <p style={{ color: Number(p.lucro) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>
                          {formatarMoeda(p.lucro)}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}

              {abaRentabilidade === "clientes" && (
                rentClientes.length === 0 ? (
                  <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum dado ainda. Processe pedidos no Motor Financeiro primeiro.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rentClientes.map(c => (
                      <div key={c.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nome}</p>
                          <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                            {c.email} · {c.qtd_pedidos} pedido(s) · Receita {formatarMoeda(c.receita)}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                          {c.margem_percentual}% margem
                        </span>
                        <p style={{ color: Number(c.lucro) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>
                          {formatarMoeda(c.lucro)}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}

              {abaRentabilidade === "canal" && (
                rentCanal.length === 0 ? (
                  <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum dado ainda. Processe pedidos no Motor Financeiro primeiro.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rentCanal.map(c => (
                      <div key={c.canal} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{nomeCanal(c.canal)}</p>
                          <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                            {c.qtd_pedidos} pedido(s) · Receita {formatarMoeda(c.receita)} · Taxas {formatarMoeda(c.taxas)}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                          {c.margem_percentual}% margem
                        </span>
                        <p style={{ color: Number(c.lucro) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>
                          {formatarMoeda(c.lucro)}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}

              {abaRentabilidade === "periodo" && (
                rentPeriodo.length === 0 ? (
                  <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum dado ainda. Processe pedidos no Motor Financeiro primeiro.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rentPeriodo.map(p => (
                      <div key={p.mes} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{p.mes}</p>
                          <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                            {p.qtd_pedidos} pedido(s) · Receita {formatarMoeda(p.receita)} · Custo {formatarMoeda(p.custo)}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                          {p.margem_percentual}% margem
                        </span>
                        <p style={{ color: Number(p.lucro) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>
                          {formatarMoeda(p.lucro)}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════ FLUXO DE CAIXA PREDITIVO ═══════════ */}
      {secaoAtiva === "fluxo-preditivo" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Fluxo de Caixa Preditivo</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Projeção dia a dia do saldo em caixa, com base nas contas a pagar e a receber já cadastradas.</p>

          <div style={{ marginBottom: 20 }}>
            <select value={diasProjecao} onChange={e => setDiasProjecao(Number(e.target.value))} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
              <option value={30}>Próximos 30 dias</option>
              <option value={60}>Próximos 60 dias</option>
              <option value={90}>Próximos 90 dias</option>
            </select>
          </div>

          {loadingFluxoPreditivo ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : fluxoPreditivo && (
            <>
              {fluxoPreditivo.tem_risco && (
                <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 10, fontSize: 13.5, background: "#dc262615", color: "#dc2626", border: "1px solid #dc262640" }}>
                  ⚠️ Risco de caixa detectado: o saldo projetado fica negativo a partir de{" "}
                  <strong>{new Date(fluxoPreditivo.primeiro_dia_critico + "T00:00:00").toLocaleDateString("pt-BR")}</strong>.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Hoje</p>
                  <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(fluxoPreditivo.marcos.hoje)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Em 7 dias</p>
                  <h2 style={{ color: Number(fluxoPreditivo.marcos.d7) >= 0 ? "#16a34a" : "#dc2626", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(fluxoPreditivo.marcos.d7)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Em 30 dias</p>
                  <h2 style={{ color: Number(fluxoPreditivo.marcos.d30) >= 0 ? "#16a34a" : "#dc2626", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(fluxoPreditivo.marcos.d30)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 6 }}>Em 60 dias</p>
                  <h2 style={{ color: Number(fluxoPreditivo.marcos.d60) >= 0 ? "#16a34a" : "#dc2626", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(fluxoPreditivo.marcos.d60)}</h2>
                </div>
              </div>

              <h2 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📅 Linha do Tempo</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 500, overflowY: "auto" }}>
                <div style={{ display: "flex", padding: "8px 16px", fontSize: 11, color: cor.textMuted, fontWeight: 700, textTransform: "uppercase", position: "sticky", top: 0, background: cor.bg }}>
                  <span style={{ width: 100 }}>Data</span>
                  <span style={{ width: 130, textAlign: "right" }}>Entradas</span>
                  <span style={{ width: 130, textAlign: "right" }}>Saídas</span>
                  <span style={{ flex: 1, textAlign: "right" }}>Saldo Projetado</span>
                </div>
                {fluxoPreditivo.linha_do_tempo.filter(d => d.entradas > 0 || d.saidas > 0 || Number(d.saldo_projetado) < 0).map(d => (
                  <div key={d.data} style={{
                    ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center",
                    border: Number(d.saldo_projetado) < 0 ? "1px solid #dc262666" : `1px solid ${cor.border}`,
                  }}>
                    <span style={{ color: cor.text, fontSize: 12.5, width: 100 }}>{new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                    <span style={{ color: "#16a34a", fontSize: 12.5, width: 130, textAlign: "right" }}>{d.entradas > 0 ? `+${formatarMoeda(d.entradas)}` : "—"}</span>
                    <span style={{ color: "#dc2626", fontSize: 12.5, width: 130, textAlign: "right" }}>{d.saidas > 0 ? `-${formatarMoeda(d.saidas)}` : "—"}</span>
                    <span style={{ color: Number(d.saldo_projetado) >= 0 ? cor.text : "#dc2626", fontSize: 13, fontWeight: 700, flex: 1, textAlign: "right" }}>
                      {formatarMoeda(d.saldo_projetado)} {Number(d.saldo_projetado) < 0 ? "⚠️" : ""}
                    </span>
                  </div>
                ))}
                {fluxoPreditivo.linha_do_tempo.every(d => d.entradas === 0 && d.saidas === 0) && (
                  <p style={{ color: cor.textMuted, fontSize: 13, padding: "20px 0" }}>Nenhuma movimentação prevista no período. Cadastre contas a pagar/receber para ver a projeção.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

{/* ═══════════ SIMULADOR DE CENÁRIOS ═══════════ */}
{secaoAtiva === "simulador" && (
  <div>
    <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Simulador de Cenários</h1>
    <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Projeta o impacto de decisões futuras no seu caixa, com base na média real do seu negócio.</p>

    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
      {["variacao_percentual", "contratar_demitir", "novo_contrato", "livre"].map(tipo => (
        <button key={tipo} onClick={() => { setTipoCenario(tipo); setResultadoCenario(null); setErroCenario(""); }} style={{
          background: tipoCenario === tipo ? cor.text : "none",
          color: tipoCenario === tipo ? cor.bg : cor.textMuted,
          border: `1px solid ${cor.border}`, borderRadius: 8, padding: "8px 16px",
          fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          {nomeTipoCenario(tipo)}
        </button>
      ))}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20 }}>
      <div>
        <div style={cardStyle}>
          <p style={{ color: cor.text, fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Parâmetros</p>

          <label style={labelStyle}>Meses de projeção</label>
          <input type="number" min="1" max="24" value={mesesProjecaoCenario} onChange={e => setMesesProjecaoCenario(Number(e.target.value))} style={inputStyle} />

          {tipoCenario === "variacao_percentual" && (
            <>
              <label style={labelStyle}>Aplicar variação sobre</label>
              <select value={paramsVariacao.alvo} onChange={e => setParamsVariacao({ ...paramsVariacao, alvo: e.target.value })} style={inputStyle}>
                <option value="despesa">Despesas</option>
                <option value="receita">Receitas</option>
                <option value="ambos">Ambos</option>
              </select>
              <label style={labelStyle}>Percentual (use negativo para redução, ex: -15)</label>
              <input type="number" step="0.1" value={paramsVariacao.percentual} onChange={e => setParamsVariacao({ ...paramsVariacao, percentual: e.target.value })} style={inputStyle} placeholder="Ex: 15 ou -15" />
            </>
          )}

          {tipoCenario === "contratar_demitir" && (
            <>
              <label style={labelStyle}>Ação</label>
              <select value={paramsContratarDemitir.acao} onChange={e => setParamsContratarDemitir({ ...paramsContratarDemitir, acao: e.target.value })} style={inputStyle}>
                <option value="contratar">Contratar (nova despesa)</option>
                <option value="demitir">Demitir (remover despesa)</option>
              </select>
              <label style={labelStyle}>Valor mensal (R$)</label>
              <input type="number" step="0.01" value={paramsContratarDemitir.valor_mensal} onChange={e => setParamsContratarDemitir({ ...paramsContratarDemitir, valor_mensal: e.target.value })} style={inputStyle} placeholder="0,00" />
              <label style={labelStyle}>A partir de</label>
              <input type="date" value={paramsContratarDemitir.data_inicio} onChange={e => setParamsContratarDemitir({ ...paramsContratarDemitir, data_inicio: e.target.value })} style={inputStyle} />
            </>
          )}

          {tipoCenario === "novo_contrato" && (
            <>
              <label style={labelStyle}>Tipo</label>
              <select value={paramsNovoContrato.tipo} onChange={e => setParamsNovoContrato({ ...paramsNovoContrato, tipo: e.target.value })} style={inputStyle}>
                <option value="fornecedor">Fornecedor (nova despesa)</option>
                <option value="cliente">Cliente (nova receita)</option>
              </select>
              <label style={labelStyle}>Valor por ocorrência (R$)</label>
              <input type="number" step="0.01" value={paramsNovoContrato.valor} onChange={e => setParamsNovoContrato({ ...paramsNovoContrato, valor: e.target.value })} style={inputStyle} placeholder="0,00" />
              <label style={labelStyle}>Recorrência</label>
              <select value={paramsNovoContrato.recorrencia} onChange={e => setParamsNovoContrato({ ...paramsNovoContrato, recorrencia: e.target.value })} style={inputStyle}>
                <option value="unico">Único</option>
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
              <label style={labelStyle}>Data de início</label>
              <input type="date" value={paramsNovoContrato.data_inicio} onChange={e => setParamsNovoContrato({ ...paramsNovoContrato, data_inicio: e.target.value })} style={inputStyle} />
            </>
          )}

          {tipoCenario === "livre" && (
            <>
              <label style={labelStyle}>Ajuste de receita mensal (R$, pode ser negativo)</label>
              <input type="number" step="0.01" value={paramsLivre.receita_mensal_ajuste} onChange={e => setParamsLivre({ ...paramsLivre, receita_mensal_ajuste: e.target.value })} style={inputStyle} placeholder="0,00" />
              <label style={labelStyle}>Ajuste de despesa mensal (R$, pode ser negativo)</label>
              <input type="number" step="0.01" value={paramsLivre.despesa_mensal_ajuste} onChange={e => setParamsLivre({ ...paramsLivre, despesa_mensal_ajuste: e.target.value })} style={inputStyle} placeholder="0,00" />
            </>
          )}

          {erroCenario && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroCenario}</p>}

          <button onClick={simularCenario} disabled={simulando} style={{ width: "100%", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "11px 20px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif", marginTop: 4 }}>
            {simulando ? "Simulando..." : "🔮 Simular"}
          </button>

          {resultadoCenario && (
            <button onClick={abrirModalSalvarCenario} style={{ width: "100%", background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>
              💾 Salvar este cenário
            </button>
          )}
        </div>

        <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, margin: "20px 0 12px" }}>Cenários Salvos</h3>
        {loadingCenariosSalvos ? (
          <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
        ) : cenariosSalvos.length === 0 ? (
          <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum cenário salvo ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cenariosSalvos.map(c => (
              <div key={c.id} style={{ ...cardStyle, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => carregarCenarioSalvo(c)}>
                  <p style={{ color: cor.text, fontSize: 12.5, fontWeight: 600, margin: 0 }}>{c.nome}</p>
                  <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{nomeTipoCenario(c.tipo)}</p>
                </div>
                <button onClick={() => excluirCenarioSalvo(c.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 15, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        {!resultadoCenario ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
            <p style={{ fontSize: 32, margin: "0 0 10px" }}>🔮</p>
            <p style={{ color: cor.textMuted, fontSize: 13.5 }}>Preencha os parâmetros ao lado e clique em "Simular" para ver a projeção.</p>
          </div>
        ) : (
          <>
            <div style={{
              ...cardStyle, marginBottom: 20,
              background: resultadoCenario.resumo.impacto_positivo ? "#16a34a10" : "#dc262610",
              border: `1px solid ${resultadoCenario.resumo.impacto_positivo ? "#16a34a40" : "#dc262640"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <p style={{ color: cor.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Impacto no saldo final (em {mesesProjecaoCenario} meses)</p>
                  <p style={{ color: cor.textMuted, fontSize: 12, margin: "4px 0 0" }}>
                    Base: {formatarMoeda(resultadoCenario.resumo.saldo_final_base)} · Com cenário: {formatarMoeda(resultadoCenario.resumo.saldo_final_cenario)}
                  </p>
                </div>
                <p style={{ color: resultadoCenario.resumo.impacto_positivo ? "#16a34a" : "#dc2626", fontSize: 26, fontWeight: 700, margin: 0 }}>
                  {resultadoCenario.resumo.impacto_positivo ? "+" : ""}{formatarMoeda(resultadoCenario.resumo.impacto_total)}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              <div style={cardStyle}>
                <p style={{ color: cor.textMuted, fontSize: 11.5, marginBottom: 4 }}>Saldo Atual</p>
                <h3 style={{ color: cor.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{formatarMoeda(resultadoCenario.saldo_atual)}</h3>
              </div>
              <div style={cardStyle}>
                <p style={{ color: cor.textMuted, fontSize: 11.5, marginBottom: 4 }}>Receita Média/mês</p>
                <h3 style={{ color: "#16a34a", fontSize: 16, fontWeight: 700, margin: 0 }}>{formatarMoeda(resultadoCenario.media_receita_mensal)}</h3>
              </div>
              <div style={cardStyle}>
                <p style={{ color: cor.textMuted, fontSize: 11.5, marginBottom: 4 }}>Despesa Média/mês</p>
                <h3 style={{ color: "#dc2626", fontSize: 16, fontWeight: 700, margin: 0 }}>{formatarMoeda(resultadoCenario.media_despesa_mensal)}</h3>
              </div>
            </div>

            <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📈 Projeção Visual (Saldo Base × Cenário)</h3>
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              {(() => {
                const valores = resultadoCenario.timeline.flatMap(t => [t.saldo_base, t.saldo_cenario]);
                const maxAbs = Math.max(...valores.map(v => Math.abs(v)), 1);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {resultadoCenario.timeline.map((t, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: cor.textMuted, fontSize: 11.5, textTransform: "capitalize" }}>{t.mes}</span>
                          <span style={{ color: cor.textMuted, fontSize: 11 }}>Δ {formatarMoeda(t.diferenca)}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 60, fontSize: 10.5, color: cor.textMuted, flexShrink: 0 }}>Base</span>
                            <div style={{ flex: 1, background: cor.bg, borderRadius: 4, height: 16, overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(100, Math.abs(t.saldo_base) / maxAbs * 100)}%`, height: "100%", background: t.saldo_base >= 0 ? "#6e6e7366" : "#dc262666", borderRadius: 4 }} />
                            </div>
                            <span style={{ width: 90, fontSize: 11, color: cor.text, textAlign: "right", flexShrink: 0 }}>{formatarMoeda(t.saldo_base)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 60, fontSize: 10.5, color: cor.textMuted, flexShrink: 0 }}>Cenário</span>
                            <div style={{ flex: 1, background: cor.bg, borderRadius: 4, height: 16, overflow: "hidden" }}>
                              <div style={{
                                width: `${Math.min(100, Math.abs(t.saldo_cenario) / maxAbs * 100)}%`, height: "100%", borderRadius: 4,
                                background: t.saldo_cenario >= 0 ? (t.diferenca >= 0 ? "#16a34a" : "#f59e0b") : "#dc2626",
                              }} />
                            </div>
                            <span style={{ width: 90, fontSize: 11, fontWeight: 700, color: t.saldo_cenario >= 0 ? "#16a34a" : "#dc2626", textAlign: "right", flexShrink: 0 }}>{formatarMoeda(t.saldo_cenario)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📋 Tabela Detalhada</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", padding: "8px 16px", fontSize: 10.5, color: cor.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
                <span style={{ width: 90 }}>Mês</span>
                <span style={{ flex: 1, textAlign: "right" }}>Receita Cen.</span>
                <span style={{ flex: 1, textAlign: "right" }}>Despesa Cen.</span>
                <span style={{ flex: 1, textAlign: "right" }}>Saldo Base</span>
                <span style={{ flex: 1, textAlign: "right" }}>Saldo Cenário</span>
                <span style={{ flex: 1, textAlign: "right" }}>Diferença</span>
              </div>
              {resultadoCenario.timeline.map((t, i) => (
                <div key={i} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center" }}>
                  <span style={{ color: cor.text, fontSize: 12.5, width: 90, textTransform: "capitalize" }}>{t.mes}</span>
                  <span style={{ color: "#16a34a", fontSize: 12, flex: 1, textAlign: "right" }}>{formatarMoeda(t.receita_cenario)}</span>
                  <span style={{ color: "#dc2626", fontSize: 12, flex: 1, textAlign: "right" }}>{formatarMoeda(t.despesa_cenario)}</span>
                  <span style={{ color: cor.textMuted, fontSize: 12, flex: 1, textAlign: "right" }}>{formatarMoeda(t.saldo_base)}</span>
                  <span style={{ color: t.saldo_cenario >= 0 ? cor.text : "#dc2626", fontSize: 12.5, fontWeight: 700, flex: 1, textAlign: "right" }}>{formatarMoeda(t.saldo_cenario)}</span>
                  <span style={{ color: t.diferenca >= 0 ? "#16a34a" : "#dc2626", fontSize: 12.5, fontWeight: 700, flex: 1, textAlign: "right" }}>{t.diferenca >= 0 ? "+" : ""}{formatarMoeda(t.diferenca)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>

    {modalSalvarCenarioAberto && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalSalvarCenarioAberto(false)} />
        <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
          <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Salvar Cenário</h2>
          <form onSubmit={salvarCenarioAtual}>
            <label style={labelStyle}>Nome do cenário</label>
            <input value={nomeCenarioSalvar} onChange={e => setNomeCenarioSalvar(e.target.value)} style={inputStyle} placeholder="Ex: Contratação Q4 2026" autoFocus />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setModalSalvarCenarioAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" disabled={salvandoCenario} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {salvandoCenario ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
)}

      {/* ═══════════ TESOURARIA ═══════════ */}
      {secaoAtiva === "tesouraria" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Tesouraria</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Posição consolidada, transferências entre contas e aplicações financeiras.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "posicao", label: "📊 Posição" },
              { id: "transferencias", label: "🔄 Transferências" },
              { id: "investimentos", label: "💵 Aplicações" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaTesouraria(tab.id)} style={{
                background: abaTesouraria === tab.id ? cor.text : "none",
                color: abaTesouraria === tab.id ? cor.bg : cor.textMuted,
                border: `1px solid ${cor.border}`, borderRadius: 8, padding: "7px 16px",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {abaTesouraria === "posicao" && (
            <div>
              {loadingPosicao ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : posicaoTesouraria && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
                    <div style={cardStyle}>
                      <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Total em Caixa</p>
                      <h2 style={{ color: cor.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(posicaoTesouraria.total_caixa)}</h2>
                    </div>
                    <div style={cardStyle}>
                      <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Total Investido</p>
                      <h2 style={{ color: "#a78bfa", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(posicaoTesouraria.total_investido)}</h2>
                    </div>
                    <div style={cardStyle}>
                      <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Rendimento Total</p>
                      <h2 style={{ color: Number(posicaoTesouraria.rendimento_total) >= 0 ? "#16a34a" : "#dc2626", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(posicaoTesouraria.rendimento_total)}</h2>
                    </div>
                    <div style={{ ...cardStyle, background: "#16a34a10", border: "1px solid #16a34a40" }}>
                      <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Disponibilidade Total</p>
                      <h2 style={{ color: "#16a34a", fontSize: 20, fontWeight: 700, margin: 0 }}>{formatarMoeda(posicaoTesouraria.disponibilidade_total)}</h2>
                    </div>
                  </div>

                  <h2 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Contas Bancárias</h2>
                  {posicaoTesouraria.contas.length === 0 ? (
                    <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma conta bancária cadastrada ainda.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {posicaoTesouraria.contas.map(c => (
                        <div key={c.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nome}</p>
                            <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>{c.banco || "—"} · {c.tipo}</p>
                          </div>
                          <p style={{ color: Number(c.saldo_atual) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700, fontSize: 15, margin: 0 }}>{formatarMoeda(c.saldo_atual)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {abaTesouraria === "transferencias" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button onClick={abrirModalTransfer} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                  + Nova Transferência
                </button>
              </div>
              {loadingTransferencias ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : transferencias.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma transferência registrada ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {transferencias.map(t => (
                    <div key={t.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{t.conta_origem_nome} → {t.conta_destino_nome}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>{t.descricao} · {new Date(t.data).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, margin: 0 }}>{formatarMoeda(t.valor)}</p>
                    </div>
                  ))}
                </div>
              )}

              {modalTransferAberto && (
                <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalTransferAberto(false)} />
                  <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
                    <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Nova Transferência</h2>
                    <form onSubmit={salvarTransferencia}>
                      <label style={labelStyle}>Conta de origem</label>
                      <select value={formTransfer.conta_origem_id} onChange={e => setFormTransfer({ ...formTransfer, conta_origem_id: e.target.value })} style={inputStyle}>
                        <option value="">Selecione...</option>
                        {contasBancarias.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <label style={labelStyle}>Conta de destino</label>
                      <select value={formTransfer.conta_destino_id} onChange={e => setFormTransfer({ ...formTransfer, conta_destino_id: e.target.value })} style={inputStyle}>
                        <option value="">Selecione...</option>
                        {contasBancarias.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <label style={labelStyle}>Valor (R$)</label>
                      <input type="number" step="0.01" value={formTransfer.valor} onChange={e => setFormTransfer({ ...formTransfer, valor: e.target.value })} style={inputStyle} placeholder="0,00" />
                      <label style={labelStyle}>Data</label>
                      <input type="date" value={formTransfer.data} onChange={e => setFormTransfer({ ...formTransfer, data: e.target.value })} style={inputStyle} />
                      <label style={labelStyle}>Descrição (opcional)</label>
                      <input value={formTransfer.descricao} onChange={e => setFormTransfer({ ...formTransfer, descricao: e.target.value })} style={inputStyle} />
                      {erroTransfer && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroTransfer}</p>}
                      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <button type="button" onClick={() => setModalTransferAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                        <button type="submit" disabled={salvandoTransfer} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                          {salvandoTransfer ? "Salvando..." : "Transferir"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {abaTesouraria === "investimentos" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button onClick={abrirModalInvest} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                  + Nova Aplicação
                </button>
              </div>
              {loadingInvestimentos ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : investimentos.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma aplicação registrada ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {investimentos.map(i => (
                    <div key={i.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, opacity: i.status === "resgatado" ? 0.5 : 1 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{i.nome}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                          {nomeTipoInvestimento(i.tipo)} · {i.conta_nome} · Aplicado em {new Date(i.data_aplicacao).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: cor.textMuted, fontSize: 11, margin: 0 }}>Aplicado: {formatarMoeda(i.valor_aplicado)}</p>
                        <p style={{ color: Number(i.valor_atual) >= Number(i.valor_aplicado) ? "#16a34a" : "#dc2626", fontSize: 14, fontWeight: 700, margin: 0 }}>{formatarMoeda(i.valor_atual)}</p>
                      </div>
                      {i.status === "ativo" && (
                        <>
                          <button onClick={() => atualizarValorInvestimento(i.id, i.valor_atual)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                            Atualizar valor
                          </button>
                          <button onClick={() => resgatarInvestimento(i.id)} style={{ background: "#a78bfa", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                            Resgatar
                          </button>
                        </>
                      )}
                      {i.status === "resgatado" && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>Resgatado</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {modalInvestAberto && (
                <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalInvestAberto(false)} />
                  <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
                    <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Nova Aplicação</h2>
                    <form onSubmit={salvarInvestimento}>
                      <label style={labelStyle}>Conta de origem</label>
                      <select value={formInvest.bank_account_id} onChange={e => setFormInvest({ ...formInvest, bank_account_id: e.target.value })} style={inputStyle}>
                        <option value="">Selecione...</option>
                        {contasBancarias.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <label style={labelStyle}>Nome da aplicação</label>
                      <input value={formInvest.nome} onChange={e => setFormInvest({ ...formInvest, nome: e.target.value })} style={inputStyle} placeholder="Ex: CDB Banco XP 110% CDI" />
                      <label style={labelStyle}>Tipo</label>
                      <select value={formInvest.tipo} onChange={e => setFormInvest({ ...formInvest, tipo: e.target.value })} style={inputStyle}>
                        <option value="cdb">CDB</option>
                        <option value="tesouro_direto">Tesouro Direto</option>
                        <option value="fundo">Fundo de Investimento</option>
                        <option value="poupanca">Poupança</option>
                        <option value="outro">Outro</option>
                      </select>
                      <label style={labelStyle}>Valor aplicado (R$)</label>
                      <input type="number" step="0.01" value={formInvest.valor_aplicado} onChange={e => setFormInvest({ ...formInvest, valor_aplicado: e.target.value })} style={inputStyle} placeholder="0,00" />
                      <label style={labelStyle}>Data de aplicação</label>
                      <input type="date" value={formInvest.data_aplicacao} onChange={e => setFormInvest({ ...formInvest, data_aplicacao: e.target.value })} style={inputStyle} />
                      <label style={labelStyle}>Data de vencimento (opcional)</label>
                      <input type="date" value={formInvest.data_vencimento} onChange={e => setFormInvest({ ...formInvest, data_vencimento: e.target.value })} style={inputStyle} />
                      {erroInvest && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroInvest}</p>}
                      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <button type="button" onClick={() => setModalInvestAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                        <button type="submit" disabled={salvandoInvest} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                          {salvandoInvest ? "Salvando..." : "Aplicar"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ORÇAMENTO ═══════════ */}
      {secaoAtiva === "orcamento" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Orçamento</h1>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Planejado × Realizado por categoria e centro de custo.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copiarOrcamentoMesAnterior} disabled={copiandoOrcamento} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                {copiandoOrcamento ? "Copiando..." : "📋 Copiar mês anterior"}
              </button>
              <button onClick={abrirModalOrcamento} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                + Novo Item
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <input type="month" value={competenciaOrcamento} onChange={e => setCompetenciaOrcamento(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }} />
          </div>

          {loadingOrcamento ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : dadosOrcamento && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Receita Planejada</p>
                  <h2 style={{ color: cor.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(dadosOrcamento.resumo.receita_planejada)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Receita Realizada</p>
                  <h2 style={{ color: "#16a34a", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(dadosOrcamento.resumo.receita_realizada)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Despesa Planejada</p>
                  <h2 style={{ color: cor.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(dadosOrcamento.resumo.despesa_planejada)}</h2>
                </div>
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 6 }}>Despesa Realizada</p>
                  <h2 style={{ color: "#dc2626", fontSize: 18, fontWeight: 700, margin: 0 }}>{formatarMoeda(dadosOrcamento.resumo.despesa_realizada)}</h2>
                </div>
              </div>

              {dadosOrcamento.itens.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum item de orçamento cadastrado para esse mês. Clique em "+ Novo Item" ou "Copiar mês anterior".</p>
              ) : (
                <div>
                  <div style={{ display: "flex", padding: "8px 16px", fontSize: 11, color: cor.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
                    <span style={{ width: 90 }}>Tipo</span>
                    <span style={{ flex: 1 }}>Categoria / Centro de Custo</span>
                    <span style={{ width: 120, textAlign: "right" }}>Planejado</span>
                    <span style={{ width: 120, textAlign: "right" }}>Realizado</span>
                    <span style={{ width: 110, textAlign: "right" }}>Desvio</span>
                    <span style={{ width: 40 }}></span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dadosOrcamento.itens.map(item => {
                      const desvioRuim = item.tipo === "despesa" ? Number(item.desvio) > 0 : Number(item.desvio) < 0;
                      return (
                        <div key={item.id} style={cardStyle}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <span style={{
                              width: 90, fontSize: 11, fontWeight: 600, color: item.tipo === "receita" ? "#16a34a" : "#dc2626",
                            }}>
                              {item.tipo === "receita" ? "Receita" : "Despesa"}
                            </span>
                            <div style={{ flex: 1 }}>
                              <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0, textTransform: "capitalize" }}>{item.categoria}</p>
                              <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{item.cost_center_codigo} — {item.cost_center_nome}</p>
                            </div>
                            <span style={{ color: cor.text, fontSize: 13, width: 120, textAlign: "right" }}>{formatarMoeda(item.valor_planejado)}</span>
                            <span style={{ color: cor.text, fontSize: 13, width: 120, textAlign: "right" }}>{formatarMoeda(item.valor_realizado)}</span>
                            <span style={{ color: desvioRuim ? "#dc2626" : "#16a34a", fontSize: 12.5, fontWeight: 700, width: 110, textAlign: "right" }}>
                              {item.desvio_percentual}%
                            </span>
                            <button onClick={() => excluirOrcamento(item.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, width: 40 }}>×</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {modalOrcamentoAberto && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalOrcamentoAberto(false)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
                <h2 style={{ color: cor.text, marginBottom: 6, fontSize: 17 }}>Novo Item de Orçamento</h2>
                <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 18 }}>Competência: {competenciaOrcamento}</p>
                <form onSubmit={salvarOrcamento}>
                  <label style={labelStyle}>Tipo</label>
                  <select value={formOrcamento.tipo} onChange={e => setFormOrcamento({ ...formOrcamento, tipo: e.target.value })} style={inputStyle}>
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                  <label style={labelStyle}>Categoria</label>
                  <select value={formOrcamento.categoria} onChange={e => setFormOrcamento({ ...formOrcamento, categoria: e.target.value })} style={inputStyle}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label style={labelStyle}>Centro de Custo</label>
                  <select value={formOrcamento.cost_center_id} onChange={e => setFormOrcamento({ ...formOrcamento, cost_center_id: e.target.value })} style={inputStyle}>
                    <option value="">Selecione...</option>
                    {centrosCusto.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
                  </select>
                  <label style={labelStyle}>Valor planejado (R$)</label>
                  <input type="number" step="0.01" value={formOrcamento.valor_planejado} onChange={e => setFormOrcamento({ ...formOrcamento, valor_planejado: e.target.value })} style={inputStyle} placeholder="0,00" />
                  {erroOrcamento && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroOrcamento}</p>}
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={() => setModalOrcamentoAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    <button type="submit" disabled={salvandoOrcamento} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                      {salvandoOrcamento ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ AUTOMAÇÃO FINANCEIRA ═══════════ */}
      {secaoAtiva === "automacao" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Automação Financeira</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Regras que avaliam cada novo lançamento e decidem automaticamente aprovar, exigir revisão ou pagar.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "regras", label: "⚙️ Regras" },
              { id: "logs", label: "📋 Histórico" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaAutomacao(tab.id)} style={{
                background: abaAutomacao === tab.id ? cor.text : "none",
                color: abaAutomacao === tab.id ? cor.bg : cor.textMuted,
                border: `1px solid ${cor.border}`, borderRadius: 8, padding: "7px 16px",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {abaAutomacao === "regras" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button onClick={abrirModalRegra} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                  + Nova Regra
                </button>
              </div>
              {loadingRegras ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : regrasAutomacao.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma regra cadastrada ainda. Sem regras, todo lançamento segue o fluxo manual normal.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {regrasAutomacao.map(r => (
                    <div key={r.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, opacity: r.ativo ? 1 : 0.5 }}>
                      <span style={{ color: cor.textMuted, fontSize: 12, width: 30 }}>#{r.ordem}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{r.nome}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                          {r.condicao_tipo && `Tipo: ${r.condicao_tipo} · `}
                          {r.condicao_categoria && `Categoria: ${r.condicao_categoria} · `}
                          {r.cost_center_nome && `Centro: ${r.cost_center_nome} · `}
                          {r.condicao_valor_operador && `Valor ${r.condicao_valor_operador.replace(/_/g, " ")} ${formatarMoeda(r.condicao_valor_min)}`}
                          {!r.condicao_tipo && !r.condicao_categoria && !r.cost_center_nome && !r.condicao_valor_operador && "Sem condições (sempre aplica)"}
                        </p>
                      </div>
                      <span style={{ fontSize: 11.5, padding: "3px 10px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                        {nomeAcao(r.acao)}
                      </span>
                      <button onClick={() => alternarAtivoRegra(r.id, r.ativo)} style={{ background: "none", border: `1px solid ${cor.border}`, color: r.ativo ? "#16a34a" : cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                        {r.ativo ? "Ativa" : "Inativa"}
                      </button>
                      <button onClick={() => excluirRegra(r.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {modalRegraAberto && (
                <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalRegraAberto(false)} />
                  <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto" }}>
                    <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Nova Regra de Automação</h2>
                    <form onSubmit={salvarRegra}>
                      <label style={labelStyle}>Nome da regra</label>
                      <input value={formRegra.nome} onChange={e => setFormRegra({ ...formRegra, nome: e.target.value })} style={inputStyle} placeholder="Ex: Aprovar despesas pequenas de marketing" />

                      <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, margin: "12px 0 8px" }}>Condições (deixe em branco para ignorar)</p>

                      <label style={labelStyle}>Tipo</label>
                      <select value={formRegra.condicao_tipo} onChange={e => setFormRegra({ ...formRegra, condicao_tipo: e.target.value })} style={inputStyle}>
                        <option value="">Qualquer</option>
                        <option value="despesa">Despesa</option>
                        <option value="receita">Receita</option>
                      </select>

                      <label style={labelStyle}>Categoria</label>
                      <select value={formRegra.condicao_categoria} onChange={e => setFormRegra({ ...formRegra, condicao_categoria: e.target.value })} style={inputStyle}>
                        <option value="">Qualquer</option>
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>

                      <label style={labelStyle}>Centro de Custo</label>
                      <select value={formRegra.condicao_cost_center_id} onChange={e => setFormRegra({ ...formRegra, condicao_cost_center_id: e.target.value })} style={inputStyle}>
                        <option value="">Qualquer</option>
                        {centrosCusto.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
                      </select>

                      <label style={labelStyle}>Condição de valor</label>
                      <select value={formRegra.condicao_valor_operador} onChange={e => setFormRegra({ ...formRegra, condicao_valor_operador: e.target.value })} style={inputStyle}>
                        <option value="">Sem condição de valor</option>
                        <option value="maior_que">Valor maior que</option>
                        <option value="menor_que">Valor menor que</option>
                        <option value="igual">Valor igual a</option>
                        <option value="entre">Valor entre</option>
                      </select>

                      {formRegra.condicao_valor_operador && (
                        <div style={{ display: "grid", gridTemplateColumns: formRegra.condicao_valor_operador === "entre" ? "1fr 1fr" : "1fr", gap: 12 }}>
                          <input type="number" step="0.01" value={formRegra.condicao_valor_min} onChange={e => setFormRegra({ ...formRegra, condicao_valor_min: e.target.value })} style={inputStyle} placeholder={formRegra.condicao_valor_operador === "entre" ? "Valor mínimo" : "Valor"} />
                          {formRegra.condicao_valor_operador === "entre" && (
                            <input type="number" step="0.01" value={formRegra.condicao_valor_max} onChange={e => setFormRegra({ ...formRegra, condicao_valor_max: e.target.value })} style={inputStyle} placeholder="Valor máximo" />
                          )}
                        </div>
                      )}

                      <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, margin: "12px 0 8px" }}>Ação a executar</p>
                      <select value={formRegra.acao} onChange={e => setFormRegra({ ...formRegra, acao: e.target.value })} style={inputStyle}>
                        <option value="aprovar_automatico">✅ Aprovar automaticamente</option>
                        <option value="exigir_aprovacao">⏸️ Exigir aprovação manual</option>
                        <option value="marcar_pago_automatico">💰 Marcar como pago automaticamente</option>
                        <option value="rejeitar">🚫 Rejeitar automaticamente</option>
                      </select>

                      {erroRegra && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10, marginTop: 10 }}>{erroRegra}</p>}
                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                        <button type="button" onClick={() => setModalRegraAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                        <button type="submit" disabled={salvandoRegra} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                          {salvandoRegra ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {abaAutomacao === "logs" && (
            <div>
              {loadingLogsAutomacao ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : logsAutomacao.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma automação executada ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {logsAutomacao.map(l => (
                    <div key={l.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{l.lancamento_descricao}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>
                          {l.regra_nome || "Regra excluída"} · {new Date(l.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <span style={{ fontSize: 11.5, padding: "3px 10px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                        {nomeAcao(l.acao_executada)}
                      </span>
                      <p style={{ color: cor.text, fontWeight: 700, fontSize: 13, margin: 0, flexShrink: 0 }}>{formatarMoeda(l.lancamento_valor)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ALERTAS E RISCOS ═══════════ */}
      {secaoAtiva === "alertas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Alertas e Riscos</h1>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Varredura automática de risco de caixa, obrigações, orçamento e inadimplência.</p>
            </div>
            <button onClick={revarrerAlertas} disabled={revarrendoAlertas} style={{ background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
              {revarrendoAlertas ? "Analisando..." : "🔄 Revarrer Agora"}
            </button>
          </div>

          {loadingAlertas ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : alertas.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: 32, margin: "0 0 10px" }}>✅</p>
              <p style={{ color: cor.text, fontSize: 15, fontWeight: 600, margin: 0 }}>Nenhum risco identificado</p>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Clique em "Revarrer Agora" para atualizar a análise com os dados mais recentes.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alertas.map(a => (
                <div key={a.id} style={{
                  ...cardStyle, display: "flex", alignItems: "flex-start", gap: 14,
                  borderLeft: `4px solid ${corSeveridade(a.severidade)}`,
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{iconeSeveridade(a.severidade)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: corSeveridade(a.severidade) + "22", color: corSeveridade(a.severidade), textTransform: "uppercase" }}>
                        {labelSeveridade(a.severidade)}
                      </span>
                    </div>
                    <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{a.titulo}</p>
                    {a.descricao && <p style={{ color: cor.textMuted, fontSize: 12.5, margin: "4px 0 0" }}>{a.descricao}</p>}
                  </div>
                  <button onClick={() => resolverAlerta(a.id)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                    Marcar resolvido
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ FECHAMENTO DO MÊS ═══════════ */}
      {secaoAtiva === "fechamento" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Fechamento do Mês</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Checklist automatizado que cruza bancos, contas, contabilidade e obrigações para dizer se o mês está pronto para fechar.</p>

          <div style={{ marginBottom: 24 }}>
            <input type="month" value={competenciaFechamento} onChange={e => setCompetenciaFechamento(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }} />
          </div>

          {loadingFechamento ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : checklistFechamento && (
            <>
              <div style={{
                ...cardStyle, marginBottom: 24,
                background: corStatusFechamento(checklistFechamento.status) + "10",
                border: `1px solid ${corStatusFechamento(checklistFechamento.status)}40`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <p style={{ color: corStatusFechamento(checklistFechamento.status), fontWeight: 700, fontSize: 17, margin: 0 }}>
                    {labelStatusFechamento(checklistFechamento.status)}
                  </p>
                  <p style={{ color: cor.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{checklistFechamento.percentual_pronto}%</p>
                </div>
                <div style={{ width: "100%", height: 8, borderRadius: 4, background: cor.bg, overflow: "hidden" }}>
                  <div style={{ width: `${checklistFechamento.percentual_pronto}%`, height: "100%", background: corStatusFechamento(checklistFechamento.status), transition: "width 0.3s" }} />
                </div>
                {checklistFechamento.total_pendencias > 0 && (
                  <p style={{ color: cor.textMuted, fontSize: 12.5, margin: "10px 0 0" }}>
                    {checklistFechamento.total_pendencias} pendência(s) encontrada(s) antes de fechar este período.
                  </p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {checklistFechamento.checklist.map((item, i) => (
                  <div key={i} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.ok ? "✅" : "🔴"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{item.item}</p>
                      <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>{item.detalhe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ GOVERNANÇA E AUDITORIA ═══════════ */}
      {secaoAtiva === "governanca" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Governança e Auditoria</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Registro de todas as ações sensíveis e regras de alçada de aprovação.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "logs", label: "📋 Histórico de Ações" },
              { id: "alcada", label: "🔐 Alçada de Aprovação" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaGovernanca(tab.id)} style={{
                background: abaGovernanca === tab.id ? cor.text : "none",
                color: abaGovernanca === tab.id ? cor.bg : cor.textMuted,
                border: `1px solid ${cor.border}`, borderRadius: 8, padding: "7px 16px",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {abaGovernanca === "logs" && (
            <div>
              {loadingLogsAuditoria ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : logsAuditoria.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma ação registrada ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {logsAuditoria.map(l => (
                    <div key={l.id} style={cardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{nomeAcaoAuditoria(l.acao)}</p>
                          <p style={{ color: cor.textMuted, fontSize: 12, margin: "4px 0 0" }}>{l.detalhes}</p>
                        </div>
                        <p style={{ color: cor.textMuted, fontSize: 11, margin: 0, whiteSpace: "nowrap" }}>{new Date(l.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                      <p style={{ color: cor.textMuted, fontSize: 11, margin: "8px 0 0" }}>Por: {l.user_email || "Sistema"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {abaGovernanca === "alcada" && (
            <div>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 14 }}>
                Lançamentos com valor igual ou acima deste limite só podem ser aprovados por um usuário administrador.
              </p>

              {avisoAlcada && (
                <div style={{
                  marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13,
                  background: avisoAlcada.tipo === "sucesso" ? "#16a34a15" : "#dc262615",
                  color: avisoAlcada.tipo === "sucesso" ? "#16a34a" : "#dc2626",
                }}>
                  {avisoAlcada.texto}
                </div>
              )}

              {loadingAlcada ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : (
                <form onSubmit={salvarAlcada} style={{ ...cardStyle, maxWidth: 400 }}>
                  <label style={labelStyle}>Valor limite (R$)</label>
                  <input type="number" step="0.01" value={alcada.valor_minimo} onChange={e => setAlcada({ valor_minimo: e.target.value })} style={inputStyle} />
                  <button type="submit" disabled={salvandoAlcada} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                    {salvandoAlcada ? "Salvando..." : "Salvar Alçada"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ FISCAL E CONTÁBIL ═══════════ */}
      {secaoAtiva === "fiscal" && (
        <div>
          <h1 style={{ color: cor.text, fontWeight: 700, marginBottom: 6 }}>Fiscal e Contábil</h1>
          <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 20 }}>Cadastro fiscal da empresa e apuração de impostos.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "cadastro", label: "🏢 Cadastro" },
              { id: "apuracao", label: "🧮 Apuração de Impostos" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaFiscalDetalhe(tab.id)} style={{
                background: abaFiscalDetalhe === tab.id ? cor.text : "none",
                color: abaFiscalDetalhe === tab.id ? cor.bg : cor.textMuted,
                border: `1px solid ${cor.border}`, borderRadius: 8, padding: "7px 16px",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {abaFiscalDetalhe === "cadastro" && (
            <div>
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

          {abaFiscalDetalhe === "apuracao" && (
  <div>
    {moeda !== "BRL" && (
      <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 12.5, background: "#3b82f615", color: "#3b82f6", border: "1px solid #3b82f640" }}>
        ℹ️ Esta apuração é sempre calculada em Reais (R$), independente da moeda operacional da empresa — exigência da legislação fiscal brasileira.
      </div>
    )}
    <div style={{ marginBottom: 20 }}>function formatarMoeda(v)
                <input type="month" value={competenciaApuracao} onChange={e => setCompetenciaApuracao(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }} />
              </div>

              {loadingCalculoFiscal ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : !calculoFiscal ? (
                <div style={cardStyle}>
                  <p style={{ color: cor.textMuted, fontSize: 13, marginBottom: 14 }}>Nenhum cálculo feito para essa competência ainda.</p>
                  <button onClick={calcularImpostos} disabled={calculandoFiscal} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                    {calculandoFiscal ? "Calculando..." : "🧮 Calcular Impostos"}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ ...cardStyle, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <p style={{ color: cor.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Total de Impostos</p>
                        <p style={{ color: cor.textMuted, fontSize: 12, margin: "4px 0 0" }}>
                          Regime: {REGIMES.find(r => r.value === calculoFiscal.regime_tributario)?.label} · Receita bruta: {formatarMoeda(calculoFiscal.receita_bruta)}
                        </p>
                      </div>
                      <p style={{ color: "#dc2626", fontSize: 24, fontWeight: 700, margin: 0 }}>{formatarMoeda(calculoFiscal.total_impostos)}</p>
                    </div>
                    <button onClick={calcularImpostos} disabled={calculandoFiscal} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
                      {calculandoFiscal ? "Recalculando..." : "🔄 Recalcular"}
                    </button>
                  </div>

                  <h2 style={{ color: cor.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Detalhamento por Imposto</h2>
                  {calculoFiscal.detalhes.length === 0 ? (
                    <p style={{ color: cor.textMuted, fontSize: 13 }}>Regime isento — nenhum imposto apurado.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                      {calculoFiscal.detalhes.map((d, i) => (
                        <div key={i} style={{ ...cardStyle, display: "flex", alignItems: "center" }}>
                          <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0, flex: 1 }}>{d.imposto}</p>
                          <span style={{ color: cor.textMuted, fontSize: 12, width: 140, textAlign: "right" }}>Base: {formatarMoeda(d.base_calculo)}</span>
                          <span style={{ color: cor.textMuted, fontSize: 12, width: 100, textAlign: "right" }}>{d.aliquota}</span>
                          <p style={{ color: "#dc2626", fontWeight: 700, fontSize: 14, margin: 0, width: 120, textAlign: "right" }}>{formatarMoeda(d.valor)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {calculoFiscal.status === "guia_gerada" ? (
                    <div style={{ padding: "12px 16px", borderRadius: 10, fontSize: 13, background: "#16a34a15", color: "#16a34a" }}>
                      ✅ Guia já gerada e lançada em Contas a Pagar.
                    </div>
                  ) : Number(calculoFiscal.total_impostos) > 0 && (
                    <div style={cardStyle}>
                      <p style={{ color: cor.text, fontWeight: 600, fontSize: 13.5, marginBottom: 12 }}>Gerar guia de pagamento</p>
                      <select value={costCenterGuia} onChange={e => setCostCenterGuia(e.target.value)} style={inputStyle}>
                        <option value="">Selecione o centro de custo...</option>
                        {centrosCusto.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
                      </select>
                      <button onClick={gerarGuiaFiscal} disabled={gerandoGuia} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                        {gerandoGuia ? "Gerando..." : "📤 Gerar Guia e Lançar em Contas a Pagar"}
                      </button>
                    </div>
                  )}
                </>
              )}

              <h2 style={{ color: cor.text, fontSize: 15, fontWeight: 700, margin: "28px 0 14px" }}>Histórico de Apurações</h2>
              {historicoFiscal.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma apuração anterior.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {historicoFiscal.map(h => (
                    <div key={h.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                      <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0, flex: 1 }}>{h.competencia}</p>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: h.status === "guia_gerada" ? "#16a34a22" : cor.bg, color: h.status === "guia_gerada" ? "#16a34a" : cor.textMuted }}>
                        {h.status === "guia_gerada" ? "Guia gerada" : "Calculado"}
                      </span>
                      <p style={{ color: "#dc2626", fontWeight: 700, fontSize: 14, margin: 0 }}>{formatarMoedaBRL(h.total_impostos)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ CONTABILIDADE ═══════════ */}
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
                          {documentosPorEntrada[l.id]?.length > 0 && (
                            <p style={{ color: "#a78bfa", fontSize: 11, margin: "4px 0 0" }}>
                              📎 {documentosPorEntrada[l.id].length} documento(s) anexado(s)
                            </p>
                          )}
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
                          {documentosPorEntrada[l.id]?.length > 0 && (
                            <p style={{ color: "#a78bfa", fontSize: 11, margin: "4px 0 0" }}>
                              📎 {documentosPorEntrada[l.id].length} documento(s) anexado(s)
                            </p>
                          )}
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

{/* ═══════════ CARTÕES CORPORATIVOS ═══════════ */}
{secaoAtiva === "cartoes" && (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Cartões Corporativos</h1>
        <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Gestão de cartões, lançamentos e fechamento de fatura.</p>
      </div>
      <button onClick={() => abrirModalCartao()} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
        + Novo Cartão
      </button>
    </div>

    {loadingCartoes ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : cartoes.length === 0 ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum cartão cadastrado ainda.</p>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cartoes.map(c => (
            <div key={c.id} onClick={() => selecionarCartao(c)} style={{
              ...cardStyle, padding: "14px 16px", cursor: "pointer",
              border: cartaoSelecionado?.id === c.id ? "1px solid #a78bfa" : `1px solid ${cor.border}`,
              opacity: c.ativo ? 1 : 0.5,
            }}>
              <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>💳 {c.nome}</p>
              <p style={{ color: cor.textMuted, fontSize: 11, margin: "3px 0 8px" }}>{nomeBandeira(c.bandeira)} {c.final_cartao ? `•••• ${c.final_cartao}` : ""}</p>
              <p style={{ color: cor.textMuted, fontSize: 11, margin: 0 }}>Limite: {formatarMoeda(c.limite)}</p>
              <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>{c.cost_center_codigo} — {c.cost_center_nome}</p>
            </div>
          ))}
        </div>

        <div>
          {!cartaoSelecionado ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Selecione um cartão para ver os detalhes.</p>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h2 style={{ color: cor.text, fontSize: 17, margin: 0 }}>{cartaoSelecionado.nome}</h2>
                  <p style={{ color: cor.textMuted, fontSize: 12, margin: "4px 0 0" }}>
                    Fecha dia {cartaoSelecionado.dia_fechamento} · Vence dia {cartaoSelecionado.dia_vencimento}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => abrirModalCartao(cartaoSelecionado)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
                    Editar
                  </button>
                  <button onClick={() => desativarCartao(cartaoSelecionado.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
                    Desativar
                  </button>
                </div>
              </div>

              {limiteCartaoSelecionado && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                  <div style={cardStyle}>
                    <p style={{ color: cor.textMuted, fontSize: 11.5, marginBottom: 4 }}>Limite Total</p>
                    <h3 style={{ color: cor.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{formatarMoeda(limiteCartaoSelecionado.limite)}</h3>
                  </div>
                  <div style={cardStyle}>
                    <p style={{ color: cor.textMuted, fontSize: 11.5, marginBottom: 4 }}>Comprometido</p>
                    <h3 style={{ color: "#f59e0b", fontSize: 16, fontWeight: 700, margin: 0 }}>{formatarMoeda(limiteCartaoSelecionado.comprometido)}</h3>
                  </div>
                  <div style={{ ...cardStyle, background: limiteCartaoSelecionado.disponivel >= 0 ? "#16a34a10" : "#dc262610", border: `1px solid ${limiteCartaoSelecionado.disponivel >= 0 ? "#16a34a40" : "#dc262640"}` }}>
                    <p style={{ color: cor.textMuted, fontSize: 11.5, marginBottom: 4 }}>Disponível</p>
                    <h3 style={{ color: limiteCartaoSelecionado.disponivel >= 0 ? "#16a34a" : "#dc2626", fontSize: 16, fontWeight: 700, margin: 0 }}>{formatarMoeda(limiteCartaoSelecionado.disponivel)}</h3>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <input type="month" value={competenciaCartao} onChange={e => setCompetenciaCartao(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }} />
                <button onClick={abrirModalTransacaoCartao} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                  + Lançamento
                </button>
                {faturaAtualCompetencia?.status === "aberta" && Number(faturaAtualCompetencia.valor_total) > 0 && (
                  <button onClick={fecharFaturaCartao} disabled={fechandoFatura} style={{ background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
                    {fechandoFatura ? "Fechando..." : "🔒 Fechar Fatura"}
                  </button>
                )}
                {faturaAtualCompetencia && faturaAtualCompetencia.status !== "aberta" && (
                  <span style={{ fontSize: 11.5, padding: "4px 12px", borderRadius: 20, background: corStatusFatura(faturaAtualCompetencia.status) + "22", color: corStatusFatura(faturaAtualCompetencia.status), fontWeight: 600 }}>
                    Fatura {faturaAtualCompetencia.status}
                  </span>
                )}
              </div>

              <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Lançamentos de {competenciaCartao}</h3>
              {loadingTransacoesCartao ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
              ) : transacoesCartao.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum lançamento nessa competência.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                  {transacoesCartao.map(t => (
                    <div key={t.id} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{t.descricao}</p>
                        <p style={{ color: cor.textMuted, fontSize: 11, margin: "2px 0 0" }}>
                          {new Date(t.data).toLocaleDateString("pt-BR")} · {t.categoria} {t.cost_center_codigo ? `· ${t.cost_center_codigo}` : ""}
                        </p>
                      </div>
                      <p style={{ color: cor.text, fontWeight: 700, fontSize: 13.5, margin: 0, flexShrink: 0 }}>{formatarMoeda(t.valor)}</p>
                      {faturaAtualCompetencia?.status === "aberta" && (
                        <button onClick={() => excluirTransacaoCartao(t.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ color: cor.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Histórico de Faturas</h3>
              {faturasCartao.length === 0 ? (
                <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhuma fatura ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {faturasCartao.map(f => (
                    <div key={f.id} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                      <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0, flex: 1 }}>{f.competencia}</p>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: corStatusFatura(f.status) + "22", color: corStatusFatura(f.status) }}>
                        {f.status}
                      </span>
                      <p style={{ color: cor.text, fontWeight: 700, fontSize: 13.5, margin: 0 }}>{formatarMoeda(f.valor_total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}

    {modalCartaoAberto && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalCartaoAberto(false)} />
        <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
          <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>{editandoCartaoId ? "Editar Cartão" : "Novo Cartão"}</h2>
          <form onSubmit={salvarCartao}>
            <label style={labelStyle}>Nome do cartão</label>
            <input value={formCartao.nome} onChange={e => setFormCartao({ ...formCartao, nome: e.target.value })} style={inputStyle} placeholder="Ex: Cartão Nubank Empresarial" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Bandeira</label>
                <select value={formCartao.bandeira} onChange={e => setFormCartao({ ...formCartao, bandeira: e.target.value })} style={inputStyle}>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="elo">Elo</option>
                  <option value="amex">Amex</option>
                  <option value="outro">Outra</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Últimos 4 dígitos (opcional)</label>
                <input value={formCartao.final_cartao} onChange={e => setFormCartao({ ...formCartao, final_cartao: e.target.value })} style={inputStyle} maxLength={4} placeholder="1234" />
              </div>
            </div>

            <label style={labelStyle}>Banco (opcional)</label>
            <input value={formCartao.banco} onChange={e => setFormCartao({ ...formCartao, banco: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Limite total (R$)</label>
            <input type="number" step="0.01" value={formCartao.limite} onChange={e => setFormCartao({ ...formCartao, limite: e.target.value })} style={inputStyle} placeholder="0,00" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Dia de fechamento</label>
                <input type="number" min="1" max="28" value={formCartao.dia_fechamento} onChange={e => setFormCartao({ ...formCartao, dia_fechamento: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dia de vencimento</label>
                <input type="number" min="1" max="28" value={formCartao.dia_vencimento} onChange={e => setFormCartao({ ...formCartao, dia_vencimento: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <label style={labelStyle}>Centro de Custo padrão</label>
            <select value={formCartao.cost_center_id} onChange={e => setFormCartao({ ...formCartao, cost_center_id: e.target.value })} style={inputStyle}>
              <option value="">Selecione...</option>
              {centrosCusto.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
            </select>

            {erroCartao && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroCartao}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setModalCartaoAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" disabled={salvandoCartao} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {salvandoCartao ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {modalTransacaoCartaoAberto && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalTransacaoCartaoAberto(false)} />
        <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
          <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Novo Lançamento — {cartaoSelecionado?.nome}</h2>
          <form onSubmit={salvarTransacaoCartao}>
            <label style={labelStyle}>Data da compra</label>
            <input type="date" value={formTransacaoCartao.data} onChange={e => setFormTransacaoCartao({ ...formTransacaoCartao, data: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Descrição</label>
            <input value={formTransacaoCartao.descricao} onChange={e => setFormTransacaoCartao({ ...formTransacaoCartao, descricao: e.target.value })} style={inputStyle} placeholder="Ex: Assinatura software X" />
            <label style={labelStyle}>Categoria</label>
            <select value={formTransacaoCartao.categoria} onChange={e => setFormTransacaoCartao({ ...formTransacaoCartao, categoria: e.target.value })} style={inputStyle}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label style={labelStyle}>Centro de Custo</label>
            <select value={formTransacaoCartao.cost_center_id} onChange={e => setFormTransacaoCartao({ ...formTransacaoCartao, cost_center_id: e.target.value })} style={inputStyle}>
              <option value="">Usar padrão do cartão</option>
              {centrosCusto.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
            </select>
            <label style={labelStyle}>Valor (R$)</label>
            <input type="number" step="0.01" value={formTransacaoCartao.valor} onChange={e => setFormTransacaoCartao({ ...formTransacaoCartao, valor: e.target.value })} style={inputStyle} placeholder="0,00" />
            {erroTransacaoCartao && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroTransacaoCartao}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setModalTransacaoCartaoAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" disabled={salvandoTransacaoCartao} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {salvandoTransacaoCartao ? "Salvando..." : "Lançar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
)}

{/* ═══════════ CONTRATOS ═══════════ */}
{secaoAtiva === "contratos" && (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Contratos</h1>
        <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>Fornecedores, clientes e recorrências financeiras.</p>
      </div>
      <button onClick={() => abrirModalContrato()} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
        + Novo Contrato
      </button>
    </div>

    {vencimentosContratos.length > 0 && (
      <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 10, fontSize: 13.5, background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b40" }}>
        ⚠️ {vencimentosContratos.length} contrato(s) próximo(s) do fim de vigência sem renovação automática.
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {vencimentosContratos.map(v => (
            <span key={v.id} style={{ fontSize: 12.5 }}>
              • {v.nome_contraparte} — vence em {new Date(v.data_fim).toLocaleDateString("pt-BR")} ({v.dias_restantes}d)
            </span>
          ))}
        </div>
      </div>
    )}

    <div style={{ ...cardStyle, marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <p style={{ color: cor.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Gerar lançamentos de contratos recorrentes:</p>
      <input type="month" value={competenciaGerarContratos} onChange={e => setCompetenciaGerarContratos(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }} />
      <button onClick={gerarLancamentosContratos} disabled={gerandoLancamentosContratos} style={{ background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
        {gerandoLancamentosContratos ? "Gerando..." : "⚙️ Gerar Lançamentos"}
      </button>
    </div>

    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      <select value={filtroTipoContrato} onChange={e => setFiltroTipoContrato(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
        <option value="">Todos os tipos</option>
        <option value="fornecedor">Fornecedor</option>
        <option value="cliente">Cliente</option>
      </select>
      <select value={filtroStatusContrato} onChange={e => setFiltroStatusContrato(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: "auto" }}>
        <option value="">Todos os status</option>
        <option value="ativo">Ativo</option>
        <option value="suspenso">Suspenso</option>
        <option value="encerrado">Encerrado</option>
      </select>
    </div>

    {loadingContratos ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
    ) : contratos.length === 0 ? (
      <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum contrato cadastrado ainda.</p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {contratos.map(c => (
          <div key={c.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, opacity: c.status === "encerrado" ? 0.5 : 1 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, flexShrink: 0,
              background: c.tipo === "fornecedor" ? "#dc262622" : "#16a34a22",
              color: c.tipo === "fornecedor" ? "#dc2626" : "#16a34a",
            }}>
              {c.tipo === "fornecedor" ? "Fornecedor" : "Cliente"}
            </span>
            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setDetalheContrato(c)}>
              <p style={{ color: cor.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nome_contraparte}</p>
              <p style={{ color: cor.textMuted, fontSize: 12, margin: "2px 0 0" }}>
                {c.descricao} · {nomeRecorrencia(c.tipo_recorrencia)} · {c.cost_center_codigo} — {c.cost_center_nome}
              </p>
            </div>
            <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>{formatarMoeda(c.valor)}</p>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: corStatusContrato(c.status) + "22", color: corStatusContrato(c.status), flexShrink: 0 }}>
              {c.status}
            </span>
            <button onClick={() => abrirModalContrato(c)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
              Editar
            </button>
            {c.status === "ativo" && (
              <button onClick={() => mudarStatusContrato(c.id, "suspenso")} style={{ background: "none", border: `1px solid ${cor.border}`, color: "#f59e0b", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                Suspender
              </button>
            )}
            {c.status === "suspenso" && (
              <button onClick={() => mudarStatusContrato(c.id, "ativo")} style={{ background: "none", border: `1px solid ${cor.border}`, color: "#16a34a", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                Reativar
              </button>
            )}
            {c.status !== "encerrado" && (
              <button onClick={() => mudarStatusContrato(c.id, "encerrado")} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                Encerrar
              </button>
            )}
            <button onClick={() => excluirContrato(c.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
          </div>
        ))}
      </div>
    )}

    {modalContratoAberto && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalContratoAberto(false)} />
        <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }}>
          <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>{editandoContratoId ? "Editar Contrato" : "Novo Contrato"}</h2>
          <form onSubmit={salvarContrato}>
            <label style={labelStyle}>Tipo</label>
            <select value={formContrato.tipo} onChange={e => setFormContrato({ ...formContrato, tipo: e.target.value })} style={inputStyle}>
              <option value="fornecedor">Fornecedor (gera despesa)</option>
              <option value="cliente">Cliente (gera receita)</option>
            </select>

            <label style={labelStyle}>{formContrato.tipo === "fornecedor" ? "Fornecedor" : "Cliente"}</label>
            <input value={formContrato.nome_contraparte} onChange={e => setFormContrato({ ...formContrato, nome_contraparte: e.target.value })} style={inputStyle} placeholder="Nome" />

            <label style={labelStyle}>CNPJ/CPF (opcional)</label>
            <input value={formContrato.documento} onChange={e => setFormContrato({ ...formContrato, documento: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Descrição do contrato</label>
            <input value={formContrato.descricao} onChange={e => setFormContrato({ ...formContrato, descricao: e.target.value })} style={inputStyle} placeholder="Ex: Assinatura de sistema ERP" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Categoria</label>
                <select value={formContrato.categoria} onChange={e => setFormContrato({ ...formContrato, categoria: e.target.value })} style={inputStyle}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Centro de Custo</label>
                <select value={formContrato.cost_center_id} onChange={e => setFormContrato({ ...formContrato, cost_center_id: e.target.value })} style={inputStyle}>
                  <option value="">Selecione...</option>
                  {centrosCusto.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
                </select>
              </div>
            </div>

            <label style={labelStyle}>Valor por parcela (R$)</label>
            <input type="number" step="0.01" value={formContrato.valor} onChange={e => setFormContrato({ ...formContrato, valor: e.target.value })} style={inputStyle} placeholder="0,00" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Recorrência</label>
                <select value={formContrato.tipo_recorrencia} onChange={e => setFormContrato({ ...formContrato, tipo_recorrencia: e.target.value })} style={inputStyle}>
                  <option value="unico">Único (não repete)</option>
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Dia de vencimento</label>
                <input type="number" min="1" max="28" value={formContrato.dia_vencimento} onChange={e => setFormContrato({ ...formContrato, dia_vencimento: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Data de início</label>
                <input type="date" value={formContrato.data_inicio} onChange={e => setFormContrato({ ...formContrato, data_inicio: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Data de fim (opcional)</label>
                <input type="date" value={formContrato.data_fim} onChange={e => setFormContrato({ ...formContrato, data_fim: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: cor.textMuted, marginBottom: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={formContrato.renovacao_automatica} onChange={e => setFormContrato({ ...formContrato, renovacao_automatica: e.target.checked })} />
              Renovação automática (não alertar no vencimento)
            </label>

            {!formContrato.renovacao_automatica && (
              <>
                <label style={labelStyle}>Alertar quantos dias antes do vencimento</label>
                <input type="number" min="1" value={formContrato.alerta_dias_antes} onChange={e => setFormContrato({ ...formContrato, alerta_dias_antes: e.target.value })} style={inputStyle} />
              </>
            )}

            <label style={labelStyle}>Observações (opcional)</label>
            <input value={formContrato.observacoes} onChange={e => setFormContrato({ ...formContrato, observacoes: e.target.value })} style={inputStyle} />

            {erroContrato && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroContrato}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setModalContratoAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" disabled={salvandoContrato} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {salvandoContrato ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {detalheContrato && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setDetalheContrato(null)} />
        <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 460 }}>
          <h2 style={{ color: cor.text, marginBottom: 6, fontSize: 17 }}>{detalheContrato.nome_contraparte}</h2>
          <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 18 }}>{detalheContrato.descricao}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: cor.textMuted }}>Valor</span><span style={{ color: cor.text, fontWeight: 600 }}>{formatarMoeda(detalheContrato.valor)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: cor.textMuted }}>Recorrência</span><span style={{ color: cor.text }}>{nomeRecorrencia(detalheContrato.tipo_recorrencia)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: cor.textMuted }}>Dia de vencimento</span><span style={{ color: cor.text }}>{detalheContrato.dia_vencimento}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: cor.textMuted }}>Início</span><span style={{ color: cor.text }}>{new Date(detalheContrato.data_inicio).toLocaleDateString("pt-BR")}</span></div>
            {detalheContrato.data_fim && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: cor.textMuted }}>Fim</span><span style={{ color: cor.text }}>{new Date(detalheContrato.data_fim).toLocaleDateString("pt-BR")}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: cor.textMuted }}>Centro de Custo</span><span style={{ color: cor.text }}>{detalheContrato.cost_center_codigo} — {detalheContrato.cost_center_nome}</span></div>
            {detalheContrato.observacoes && <div><span style={{ color: cor.textMuted, display: "block", marginBottom: 4 }}>Observações</span><span style={{ color: cor.text }}>{detalheContrato.observacoes}</span></div>}
          </div>
          <button onClick={() => setDetalheContrato(null)} style={{ marginTop: 20, width: "100%", padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Fechar</button>
        </div>
      </div>
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

                  {d.entidade_tipo && d.entidade_tipo !== "nenhuma" && (
                    <p style={{ color: "#16a34a", fontSize: 11, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      🔗 Vinculado a lançamento #{d.entidade_id}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={`http://localhost:3000/api/documentos/${d.id}/baixar`} target="_blank" rel="noreferrer"
                      style={{ flex: 1, textAlign: "center", background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", textDecoration: "none" }}>
                      Abrir
                    </a>
                    <button onClick={() => abrirModalVincular(d)} style={{ background: "none", border: "1px solid #a78bfa66", color: "#a78bfa", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                      Vincular
                    </button>
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

          {modalVincularAberto && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalVincularAberto(false)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
                <h2 style={{ color: cor.text, marginBottom: 6, fontSize: 17 }}>Vincular Documento</h2>
                <p style={{ color: cor.textMuted, fontSize: 12, marginBottom: 18 }}>{documentoParaVincular?.nome_original}</p>

                <label style={labelStyle}>Vincular a um lançamento financeiro</label>
                <select value={entidadeVinculo} onChange={e => setEntidadeVinculo(e.target.value)} style={inputStyle}>
                  <option value="">— Nenhum vínculo —</option>
                  {lancamentos.map(l => (
                    <option key={l.id} value={`lancamento_financeiro:${l.id}`}>
                      #{l.id} — {l.descricao} ({formatarMoeda(l.valor)})
                    </option>
                  ))}
                </select>
                <p style={{ color: cor.textMuted, fontSize: 11, marginBottom: 16 }}>
                  A lista mostra os lançamentos carregados na aba Resumo. Se não encontrar o que procura, visite a aba Resumo primeiro para carregá-los.
                </p>

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setModalVincularAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                  <button onClick={salvarVinculo} disabled={salvandoVinculo} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                    {salvandoVinculo ? "Salvando..." : "Salvar Vínculo"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

            {secaoAtiva === "notas-fiscais" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>Notas Fiscais</h1>
              <p style={{ color: cor.textMuted, fontSize: 13, margin: "6px 0 0" }}>
                Fundação de emissão (NF-e, NFC-e, NFS-e). Gera rascunho e XML estrutural — a transmissão real para a SEFAZ exige certificado digital configurado (ainda não disponível).
              </p>
            </div>
            <button onClick={abrirModalNotaFiscal} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif" }}>
              + Novo Documento Fiscal
            </button>
          </div>

          {loadingNotasFiscais ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
          ) : notasFiscais.length === 0 ? (
            <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum documento fiscal criado ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notasFiscais.map(nf => (
                <div key={nf.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: cor.bg, color: cor.textMuted, flexShrink: 0 }}>
                    {labelTipoNF(nf.tipo)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: cor.text, fontSize: 13.5, fontWeight: 600, margin: 0 }}>{nf.customer_nome || "Consumidor não identificado"}</p>
                    <p style={{ color: cor.textMuted, fontSize: 11.5, margin: "2px 0 0" }}>{nf.natureza_operacao} · criado em {new Date(nf.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <p style={{ color: cor.text, fontWeight: 700, fontSize: 14, margin: 0, flexShrink: 0 }}>{formatarMoeda(nf.valor_total)}</p>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: corStatusNF(nf.status) + "22", color: corStatusNF(nf.status), flexShrink: 0 }}>
                    {labelStatusNF(nf.status)}
                  </span>
                  {nf.status === "rascunho" && (
                    <button onClick={() => gerarXmlNotaFiscal(nf.id)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                      Gerar XML
                    </button>
                  )}
                  {nf.xml_rascunho && (
                    <button onClick={() => setXmlVisualizado(nf.xml_rascunho)} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.text, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                      Ver XML
                    </button>
                  )}
                  {nf.status !== "emitida" && nf.status !== "cancelada" && (
                    <button onClick={() => cancelarNotaFiscal(nf.id)} style={{ background: "none", border: "1px solid #f59e0b55", color: "#f59e0b", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                      Cancelar
                    </button>
                  )}
                  {nf.status !== "emitida" && (
                    <button onClick={() => excluirNotaFiscal(nf.id)} style={{ background: "none", border: "1px solid #dc262655", color: "#dc2626", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                      Excluir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {modalNotaFiscalAberto && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setModalNotaFiscalAberto(false)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto" }}>
                <h2 style={{ color: cor.text, marginBottom: 18, fontSize: 17 }}>Novo Documento Fiscal</h2>
                <form onSubmit={salvarNotaFiscal}>
                  <label style={labelStyle}>Tipo</label>
                  <select value={formNotaFiscal.tipo} onChange={e => setFormNotaFiscal({ ...formNotaFiscal, tipo: e.target.value })} style={inputStyle}>
                    <option value="nfe">NF-e (produtos)</option>
                    <option value="nfce">NFC-e (consumidor final)</option>
                    <option value="nfse">NFS-e (serviços)</option>
                  </select>

                  <label style={labelStyle}>Cliente (opcional)</label>
                  <select value={formNotaFiscal.customer_id} onChange={e => setFormNotaFiscal({ ...formNotaFiscal, customer_id: e.target.value })} style={inputStyle}>
                    <option value="">Consumidor não identificado</option>
                    {customersNF.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>

                  {formNotaFiscal.tipo === "nfse" && (
                    <>
                      <label style={labelStyle}>Código IBGE do município (obrigatório para NFS-e)</label>
                      <input value={formNotaFiscal.municipio_codigo_ibge} onChange={e => setFormNotaFiscal({ ...formNotaFiscal, municipio_codigo_ibge: e.target.value })} style={inputStyle} placeholder="Ex: 3205002 (Vila Velha/ES)" />
                    </>
                  )}

                  <label style={labelStyle}>Natureza da operação</label>
                  <input value={formNotaFiscal.natureza_operacao} onChange={e => setFormNotaFiscal({ ...formNotaFiscal, natureza_operacao: e.target.value })} style={inputStyle} />

                  <p style={{ color: cor.text, fontWeight: 600, fontSize: 13, margin: "12px 0 8px" }}>Itens</p>
                  {formNotaFiscal.itens.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <input value={item.descricao} onChange={e => atualizarItemNF(idx, "descricao", e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Descrição" />
                      <input type="number" value={item.quantidade} onChange={e => atualizarItemNF(idx, "quantidade", e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: 70, flexShrink: 0 }} placeholder="Qtd" />
                      <input type="number" step="0.01" value={item.valor_unitario} onChange={e => atualizarItemNF(idx, "valor_unitario", e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: 100, flexShrink: 0 }} placeholder="Valor unit." />
                      {formNotaFiscal.itens.length > 1 && (
                        <button type="button" onClick={() => removerItemNF(idx)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={adicionarItemNF} style={{ background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit", marginBottom: 14 }}>
                    + item
                  </button>

                  <label style={labelStyle}>Observações (opcional)</label>
                  <input value={formNotaFiscal.observacoes} onChange={e => setFormNotaFiscal({ ...formNotaFiscal, observacoes: e.target.value })} style={inputStyle} />

                  {erroNotaFiscal && <p style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{erroNotaFiscal}</p>}
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={() => setModalNotaFiscalAberto(false)} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    <button type="submit" disabled={salvandoNotaFiscal} style={{ flex: 1, padding: 11, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                      {salvandoNotaFiscal ? "Salvando..." : "Criar Rascunho"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {xmlVisualizado && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setXmlVisualizado(null)} />
              <div style={{ position: "relative", background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto" }}>
                <h2 style={{ color: cor.text, marginBottom: 14, fontSize: 17 }}>XML de Rascunho</h2>
                <pre style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 8, padding: 14, fontSize: 11.5, color: cor.textMuted, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {xmlVisualizado}
                </pre>
                <button onClick={() => setXmlVisualizado(null)} style={{ marginTop: 16, width: "100%", padding: 11, background: "none", border: `1px solid ${cor.border}`, color: cor.textMuted, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Fechar</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}