import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

const cardStyle = { background: "#111", border: "1px solid #222", borderRadius: 12, padding: 20, cursor: "pointer" };
const cardStyleFixo = { ...cardStyle, cursor: "default" };

const CARDS_PRINCIPAIS = [
  { id: "tipo-empresa", titulo: "Empresa", desc: "Dados cadastrais e perfil empresarial.", icone: "🏢", cor: "#f59e0b" },
  { id: "conta", titulo: "Conta", desc: "Informações da conta, acesso e dados do usuário.", icone: "👤", cor: "#3b82f6" },
  { id: "pagamento", titulo: "Pagamentos", desc: "Meios de pagamento e cobranças.", icone: "💳", cor: "#22c55e" },
  { id: "sistema", titulo: "Sistema", desc: "Preferências gerais do sistema.", icone: "⚙️", cor: "#8b5cf6" },
  { id: "usuarios", titulo: "Usuários e Permissões", desc: "Usuários, perfis e permissões.", icone: "👥", cor: "#14b8a6" },
  { id: "notificacoes", titulo: "Notificações", desc: "Preferências de notificações.", icone: "🔔", cor: "#ef4444" },
  { id: "backup", titulo: "Backup e Segurança", desc: "Políticas e configurações de backup.", icone: "🛡️", cor: "#3b82f6" },
  { id: "sac", titulo: "SAC / Atendimento", desc: "Configurações gerais de atendimento.", icone: "🎧", cor: "#ec4899" },
  { id: "ia", titulo: "Inteligência Artificial", desc: "Configuração global da Aria: comportamento, permissões e módulos disponíveis.", icone: "🧠", cor: "#4ade80" },
];

const ACOES_RAPIDAS = [
  { label: "Adicionar usuário", icone: "➕", to: "/configuracoes/usuarios" },
  { label: "Editar empresa", icone: "🏢", to: "/configuracoes/tipo-empresa" },
  { label: "Configurar pagamento", icone: "💳", to: "/configuracoes/pagamento" },
  { label: "Segurança", icone: "🔐", to: "/configuracoes/backup" },
];

const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif", marginBottom: 12 };
const labelStyle = { color: "#555", fontSize: 11, display: "block", marginBottom: 4 };
const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };

function formatarDataHora(iso) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ═══════════════════ VISÃO GERAL ═══════════════════
const CORES_PRIORIDADE = { alta: "#f87171", media: "#fbbf24", baixa: "#60a5fa" };
const LABELS_PRIORIDADE = { alta: "🔴 Alta", media: "🟡 Média", baixa: "🔵 Baixa" };

function VisaoGeral({ navigate }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    api.get("/settings/checklist").then(r => setDados(r.data)).catch(() => {});
  }, []);

  if (!dados) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  const itensReais = dados.checklist.filter(i => i.status !== "indisponivel");
  const itemSeguranca = dados.checklist.find(i => i.status === "indisponivel");

  const proximoPasso = dados.proximo_passo;
  const recomendacoes = itensReais.filter(i => (i.status === "pendente" || i.status === "recomendado") && i.chave !== proximoPasso?.chave);
  const tudoCerto = !proximoPasso;

  return (
    <div>
      <div style={{ ...cardStyleFixo, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>
            {dados.percentual === 100 ? "🎉 Configuração da empresa" : "Configuração da empresa"}
          </p>
          <span style={{ color: dados.percentual === 100 ? "#4ade80" : "#fbbf24", fontSize: 24, fontWeight: 700 }}>{dados.percentual}%</span>
        </div>
        <p style={{ color: "#555", fontSize: 12, marginBottom: 14 }}>
          {dados.resumo.concluidos} de {dados.resumo.total} etapas concluídas
        </p>
        <div style={{ height: 8, background: "#222", borderRadius: 4, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${dados.percentual}%`, background: dados.percentual === 100 ? "#4ade80" : "#fbbf24", borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12.5 }}>
          <span style={{ color: "#4ade80" }}>Concluídas: {dados.resumo.concluidos}</span>
          <span style={{ color: "#fbbf24" }}>Em andamento: {dados.resumo.em_andamento}</span>
          <span style={{ color: "#888" }}>Pendentes: {dados.resumo.pendentes}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={cardStyleFixo}>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Checklist de Configuração</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {itensReais.map(item => {
              const icone = item.status === "concluido" ? "✓" : "⚠";
              const cor = item.status === "concluido" ? "#4ade80" : "#fbbf24";
              return (
                <div key={item.chave} onClick={() => navigate(item.link)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}>
                  <span style={{ color: cor, fontSize: 14, width: 16 }}>{icone}</span>
                  <span style={{ color: "#fff", fontSize: 13, flex: 1 }}>{item.label}</span>
                </div>
              );
            })}
            {itemSeguranca && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", marginTop: 4, opacity: 0.6 }}>
                <span style={{ color: "#555", fontSize: 14, width: 16 }}>—</span>
                <span style={{ color: "#888", fontSize: 13, flex: 1 }}>{itemSeguranca.label}</span>
                <span style={{ color: "#555", fontSize: 10, border: "1px solid #333", borderRadius: 4, padding: "2px 6px" }}>em desenvolvimento</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ ...cardStyleFixo, background: "linear-gradient(135deg, #1a1428, #111)", border: "1px solid #a78bfa33" }}>
          <p style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>PRÓXIMO PASSO</p>
          {proximoPasso ? (
            <>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: "0 0 8px" }}>{proximoPasso.label}</p>
              <p style={{ color: "#aaa", fontSize: 12.5, margin: "0 0 16px", lineHeight: 1.5 }}>{proximoPasso.recomendacao}</p>
              <button onClick={() => navigate(proximoPasso.link)} style={{ ...btnStyle, width: "100%" }}>
                Continuar configuração →
              </button>
            </>
          ) : (
            <>
              <p style={{ color: "#4ade80", fontWeight: 700, fontSize: 15, margin: "0 0 8px" }}>🎉 Tudo pronto!</p>
              <p style={{ color: "#aaa", fontSize: 12.5, margin: 0 }}>Todas as configurações essenciais foram concluídas.</p>
            </>
          )}
        </div>
      </div>

      <div style={{ ...cardStyleFixo, marginBottom: 16 }}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Outras Recomendações</p>
        {recomendacoes.length === 0 && tudoCerto ? (
          <p style={{ color: "#4ade80", fontSize: 13 }}>✅ Tudo certo. Não encontramos outras pendências.</p>
        ) : recomendacoes.length === 0 ? (
          <p style={{ color: "#555", fontSize: 13 }}>Sem outras recomendações no momento.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recomendacoes.map(item => (
              <div key={item.chave} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0a", border: `1px solid ${CORES_PRIORIDADE[item.prioridade]}33`, borderRadius: 8, padding: 12 }}>
                <div>
                  <p style={{ color: CORES_PRIORIDADE[item.prioridade], fontSize: 10.5, fontWeight: 700, margin: "0 0 4px" }}>{LABELS_PRIORIDADE[item.prioridade]}</p>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{item.label}</p>
                  <p style={{ color: "#888", fontSize: 11.5, margin: 0 }}>{item.recomendacao}</p>
                </div>
                <button onClick={() => navigate(item.link)} style={{ background: "none", border: "1px solid #333", color: "#a78bfa", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  Configurar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ color: "#555", fontSize: 12.5, marginBottom: 16, padding: "0 4px" }}>
        🏢 {dados.empresa_contexto.nome} · {dados.empresa_contexto.tipo_juridico !== "nao_definido" ? dados.empresa_contexto.tipo_juridico.toUpperCase() : "tipo não definido"} · {dados.empresa_contexto.pais} · {dados.empresa_contexto.moeda}
      </p>

      <div style={cardStyleFixo}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ color: "#fff", fontWeight: 700, margin: 0 }}>Últimas configurações realizadas</p>
          <span onClick={() => navigate("/configuracoes/auditoria")} style={{ color: "#a78bfa", fontSize: 12, cursor: "pointer" }}>Ver histórico completo →</span>
        </div>
        {dados.atividade_recente.length === 0 ? (
          <p style={{ color: "#555", fontSize: 12.5 }}>Nenhuma alteração registrada ainda.</p>
        ) : (
          dados.atividade_recente.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < dados.atividade_recente.length - 1 ? "1px solid #1a1a1a" : "none" }}>
              <span style={{ color: "#ccc", fontSize: 12.5 }}>{a.acao}</span>
              <span style={{ color: "#555", fontSize: 11.5 }}>{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SecaoConta() {
  const [form, setForm] = useState({ nome: "", email: "" });
  const [senhas, setSenhas] = useState({ senha_atual: "", senha_nova: "" });
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [msgSenha, setMsgSenha] = useState("");

  useEffect(() => {
    api.get("/settings/overview").then(r => {
      setForm({ nome: r.data.usuario?.nome || "", email: r.data.usuario?.email || "" });
    }).catch(() => {});
  }, []);

  const salvarConta = async (e) => {
    e.preventDefault();
    setErro(""); setMsg("");
    try {
      await api.put("/settings/conta", form);
      setMsg("Dados atualizados com sucesso.");
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao atualizar conta.");
    }
  };

  const salvarSenha = async (e) => {
    e.preventDefault();
    setErroSenha(""); setMsgSenha("");
    try {
      await api.put("/settings/conta/senha", senhas);
      setMsgSenha("Senha alterada com sucesso.");
      setSenhas({ senha_atual: "", senha_nova: "" });
    } catch (err) {
      setErroSenha(err.response?.data?.error || "Erro ao alterar senha.");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <form onSubmit={salvarConta} style={cardStyleFixo}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Dados da Conta</p>
        <label style={labelStyle}>Nome</label>
        <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
        <label style={labelStyle}>E-mail</label>
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        {erro && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}
        {msg && <p style={{ color: "#4ade80", fontSize: 12.5, marginBottom: 10 }}>{msg}</p>}
        <button type="submit" style={btnStyle}>Salvar</button>
      </form>

      <form onSubmit={salvarSenha} style={cardStyleFixo}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Alterar Senha</p>
        <label style={labelStyle}>Senha atual</label>
        <input type="password" value={senhas.senha_atual} onChange={e => setSenhas({ ...senhas, senha_atual: e.target.value })} style={inputStyle} />
        <label style={labelStyle}>Nova senha (mín. 8 caracteres)</label>
        <input type="password" value={senhas.senha_nova} onChange={e => setSenhas({ ...senhas, senha_nova: e.target.value })} style={inputStyle} />
        {erroSenha && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{erroSenha}</p>}
        {msgSenha && <p style={{ color: "#4ade80", fontSize: 12.5, marginBottom: 10 }}>{msgSenha}</p>}
        <button type="submit" style={btnStyle}>Alterar Senha</button>
      </form>
    </div>
  );
}

function SecaoTipoEmpresa() {
  const [tipo, setTipo] = useState("nao_definido");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get("/settings/overview").then(r => setTipo(r.data.empresa.tipo_juridico)).catch(() => {});
  }, []);

  const salvar = async () => {
    setErro(""); setMsg("");
    try {
      await api.put("/settings/tipo-juridico", { tipo_juridico: tipo });
      setMsg("Tipo de empresa atualizado.");
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao atualizar.");
    }
  };

  const OPCOES = [
    { valor: "mei", label: "MEI — Microempreendedor Individual" },
    { valor: "me", label: "ME — Microempresa" },
    { valor: "epp", label: "EPP — Empresa de Pequeno Porte" },
    { valor: "ltda", label: "LTDA — Sociedade Limitada" },
    { valor: "outros", label: "Outros" },
  ];

  return (
    <div style={{ ...cardStyleFixo, maxWidth: 480 }}>
      <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Empresa e Tipo Jurídico</p>
      <p style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>Isso ajuda o sistema a ajustar regras fiscais e exigências específicas para o seu tipo de negócio.</p>
      <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
        <option value="nao_definido" disabled>Selecione...</option>
        {OPCOES.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
      </select>
      {erro && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}
      {msg && <p style={{ color: "#4ade80", fontSize: 12.5, marginBottom: 10 }}>{msg}</p>}
      <button onClick={salvar} style={btnStyle}>Salvar</button>
    </div>
  );
}

function SecaoPagamento() {
  const [dados, setDados] = useState(null);
  useEffect(() => { api.get("/settings/overview").then(r => setDados(r.data)).catch(() => {}); }, []);
  if (!dados) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;
  return (
    <div style={{ ...cardStyleFixo, maxWidth: 480 }}>
      <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Plano Atual</p>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ color: "#888", fontSize: 13 }}>Plano</span>
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{dados.plano.nome}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ color: "#888", fontSize: 13 }}>Valor mensal</span>
        <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>R$ {Number(dados.plano.preco_mensal).toFixed(2)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ color: "#888", fontSize: 13 }}>Limite de usuários</span>
        <span style={{ color: "#fff", fontSize: 13 }}>{dados.plano.limite_usuarios}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
        <span style={{ color: "#888", fontSize: 13 }}>Limite de produtos</span>
        <span style={{ color: "#fff", fontSize: 13 }}>{dados.plano.limite_produtos}</span>
      </div>
      <p style={{ color: "#555", fontSize: 11.5, marginTop: 16 }}>Gestão de formas de pagamento e gateways ainda não disponível — em desenvolvimento.</p>
    </div>
  );
}

function SecaoSistema() {
  const [moeda, setMoeda] = useState("BRL");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.get("/settings/overview").then(r => setMoeda(r.data.sistema.moeda)).catch(() => {});
    api.get("/settings/sistema-info").then(r => setInfo(r.data)).catch(() => {});
  }, []);

  const salvar = async () => {
    setErro(""); setMsg("");
    try {
      await api.put("/settings/sistema", { moeda });
      setMsg("Configuração salva.");
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao salvar.");
    }
  };

  const formatarUptime = (seg) => {
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    return `${h}h ${m}min`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={cardStyleFixo}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Configuração Geral</p>
        <label style={labelStyle}>Moeda</label>
        <select value={moeda} onChange={e => setMoeda(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
          <option value="BRL">Real (BRL)</option>
          <option value="USD">Dólar (USD)</option>
          <option value="EUR">Euro (EUR)</option>
        </select>
        {erro && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}
        {msg && <p style={{ color: "#4ade80", fontSize: 12.5, marginBottom: 10 }}>{msg}</p>}
        <button onClick={salvar} style={btnStyle}>Salvar</button>
        <p style={{ color: "#555", fontSize: 11.5, marginTop: 16 }}>Idioma e tema já são configurados no topo da tela (ícones de globo e paleta de cores).</p>
      </div>

      <div style={cardStyleFixo}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Status do Sistema</p>
        {!info ? <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p> : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ color: "#888", fontSize: 12.5 }}>Banco de dados</span>
              <span style={{ color: info.banco_conectado ? "#4ade80" : "#f87171", fontSize: 12.5, fontWeight: 600 }}>{info.banco_conectado ? "🟢 Conectado" : "🔴 Desconectado"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ color: "#888", fontSize: 12.5 }}>Versão do Node.js</span>
              <span style={{ color: "#fff", fontSize: 12.5 }}>{info.node_version}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ color: "#888", fontSize: 12.5 }}>Ambiente</span>
              <span style={{ color: "#fff", fontSize: 12.5, textTransform: "capitalize" }}>{info.ambiente}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0" }}>
              <span style={{ color: "#888", fontSize: 12.5 }}>Servidor ativo há</span>
              <span style={{ color: "#fff", fontSize: 12.5 }}>{formatarUptime(info.uptime_segundos)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SecaoUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({ nome: "", email: "", senha: "", role: "user" });
  const [erroCriar, setErroCriar] = useState("");
  const [salvandoCriar, setSalvandoCriar] = useState(false);
  const [gerenciandoPermissoes, setGerenciandoPermissoes] = useState(null);
  const [todasPermissoes, setTodasPermissoes] = useState([]);
  const [permsSelecionadas, setPermsSelecionadas] = useState([]);

  const carregar = () => {
    setLoading(true);
    api.get("/settings/usuarios").then(r => setUsuarios(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { carregar(); }, []);

  const mudarRole = async (id, roleAtual) => {
    const nova = roleAtual === "admin" ? "user" : "admin";
    try {
      await api.put(`/settings/usuarios/${id}/role`, { role: nova });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao mudar papel.");
    }
  };

  const alternarAtivo = async (id) => {
    try {
      await api.put(`/settings/usuarios/${id}/ativo`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao alternar status.");
    }
  };

  const criarUsuario = async (e) => {
    e.preventDefault();
    setErroCriar("");
    setSalvandoCriar(true);
    try {
      await api.post("/users", novoUsuario);
      setNovoUsuario({ nome: "", email: "", senha: "", role: "user" });
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErroCriar(err.response?.data?.error || "Erro ao criar usuário.");
    } finally {
      setSalvandoCriar(false);
    }
  };

  const abrirPermissoes = async (usuario) => {
    try {
      const [todasResp, doUsuarioResp] = await Promise.all([
        api.get("/settings/permissoes"),
        api.get(`/settings/usuarios/${usuario.id}/permissoes`),
      ]);
      setTodasPermissoes(todasResp.data);
      setPermsSelecionadas(doUsuarioResp.data.permissoes_concedidas.map(p => p.id));
      setGerenciandoPermissoes(usuario);
    } catch (err) {
      alert("Erro ao carregar permissões.");
    }
  };

  const togglePermissao = (id) => {
    setPermsSelecionadas(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const salvarPermissoes = async () => {
    try {
      await api.put(`/settings/usuarios/${gerenciandoPermissoes.id}/permissoes`, { permission_ids: permsSelecionadas });
      setGerenciandoPermissoes(null);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao salvar permissões.");
    }
  };

  const totalAdmins = usuarios.filter(u => u.role === "admin").length;
  const totalAtivos = usuarios.filter(u => u.ativo).length;

  if (loading) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => setMostrarForm(!mostrarForm)} style={btnStyle}>{mostrarForm ? "Cancelar" : "+ Novo Usuário"}</button>
      </div>

      {mostrarForm && (
        <form onSubmit={criarUsuario} style={{ ...cardStyleFixo, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <input value={novoUsuario.nome} onChange={e => setNovoUsuario({ ...novoUsuario, nome: e.target.value })} style={inputStyle} placeholder="Nome" required />
          <input type="email" value={novoUsuario.email} onChange={e => setNovoUsuario({ ...novoUsuario, email: e.target.value })} style={inputStyle} placeholder="E-mail" required />
          <input type="password" value={novoUsuario.senha} onChange={e => setNovoUsuario({ ...novoUsuario, senha: e.target.value })} style={inputStyle} placeholder="Senha" required />
          <select value={novoUsuario.role} onChange={e => setNovoUsuario({ ...novoUsuario, role: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          {erroCriar && <p style={{ color: "#f87171", fontSize: 12.5, gridColumn: "span 2", margin: 0 }}>{erroCriar}</p>}
          <div style={{ gridColumn: "span 2" }}>
            <button type="submit" style={btnStyle} disabled={salvandoCriar}>{salvandoCriar ? "Criando..." : "Criar Usuário"}</button>
          </div>
        </form>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={cardStyleFixo}>
          <p style={{ color: "#555", fontSize: 11.5, marginBottom: 4 }}>Total de Usuários</p>
          <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>{usuarios.length}</p>
        </div>
        <div style={cardStyleFixo}>
          <p style={{ color: "#555", fontSize: 11.5, marginBottom: 4 }}>Administradores</p>
          <p style={{ color: "#a78bfa", fontSize: 20, fontWeight: 700, margin: 0 }}>{totalAdmins}</p>
        </div>
        <div style={cardStyleFixo}>
          <p style={{ color: "#555", fontSize: 11.5, marginBottom: 4 }}>Ativos</p>
          <p style={{ color: "#4ade80", fontSize: 20, fontWeight: 700, margin: 0 }}>{totalAtivos}</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {usuarios.map(u => (
          <div key={u.id} style={{ ...cardStyleFixo, display: "flex", alignItems: "center", gap: 14, opacity: u.ativo ? 1 : 0.5 }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#fff", fontSize: 13.5, fontWeight: 600, margin: 0 }}>{u.nome}</p>
              <p style={{ color: "#888", fontSize: 11.5, margin: "2px 0 0" }}>{u.email} · desde {new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: u.role === "admin" ? "#a78bfa22" : "#33333355", color: u.role === "admin" ? "#a78bfa" : "#ccc" }}>
              {u.role === "admin" ? "Admin" : "Usuário"}
            </span>
            {u.role !== "admin" && (
              <button onClick={() => abrirPermissoes(u)} style={{ background: "none", border: "1px solid #333", color: "#a78bfa", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                Permissões
              </button>
            )}
            <button onClick={() => mudarRole(u.id, u.role)} style={{ background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              Tornar {u.role === "admin" ? "Usuário" : "Admin"}
            </button>
            <button onClick={() => alternarAtivo(u.id)} style={{ background: "none", border: `1px solid ${u.ativo ? "#f8717155" : "#4ade8055"}`, color: u.ativo ? "#f87171" : "#4ade80", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              {u.ativo ? "Desativar" : "Reativar"}
            </button>
          </div>
        ))}
      </div>

      {gerenciandoPermissoes && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setGerenciandoPermissoes(null)} />
          <div style={{ position: "relative", background: "#111", border: "1px solid #222", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ color: "#fff", marginBottom: 4, fontSize: 17 }}>Permissões de {gerenciandoPermissoes.nome}</h2>
            <p style={{ color: "#888", fontSize: 12, marginBottom: 18 }}>Marque as permissões extras que esse usuário deve ter, além do acesso padrão.</p>
            {Object.entries(
              todasPermissoes.reduce((acc, p) => { (acc[p.modulo] = acc[p.modulo] || []).push(p); return acc; }, {})
            ).map(([modulo, perms]) => (
              <div key={modulo} style={{ marginBottom: 16 }}>
                <p style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>{modulo}</p>
                {perms.map(p => (
                  <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}>
                    <input type="checkbox" checked={permsSelecionadas.includes(p.id)} onChange={() => togglePermissao(p.id)} />
                    <span style={{ color: "#fff", fontSize: 13 }}>{p.label}</span>
                  </label>
                ))}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => setGerenciandoPermissoes(null)} style={{ flex: 1, padding: 11, background: "none", border: "1px solid #333", color: "#888", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={salvarPermissoes} style={{ ...btnStyle, flex: 1 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecaoIA() {
  const [dados, setDados] = useState(null);
  const [form, setForm] = useState({ nivel_detalhamento: "equilibrado", forma_comunicacao: "direta" });
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [mostrarFerramentas, setMostrarFerramentas] = useState(false);

  const carregar = () => {
    api.get("/settings/ia").then(r => {
      setDados(r.data);
      setForm(r.data.comportamento);
    }).catch(() => {});
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    setErro(""); setMsg("");
    try {
      await api.put("/settings/ia/comportamento", form);
      setMsg("Comportamento da IA atualizado.");
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao salvar.");
    }
  };

  if (!dados) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
      <div style={{ ...cardStyleFixo, display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#4ade8022", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧠</div>
        <div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>Inteligência Artificial Estratégica (Aria)</p>
          <p style={{ color: "#4ade80", fontSize: 12, margin: "2px 0 0" }}>● Ativa — operando no nível "Somente Análise"</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={cardStyleFixo}>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 10 }}>Nível de Autonomia</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0a0a0a", border: "1px solid #4ade8033", borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <span style={{ color: "#4ade80", fontSize: 16 }}>●</span>
            <div>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>Somente Análise</p>
              <p style={{ color: "#888", fontSize: 11.5, margin: "2px 0 0" }}>A Aria consulta dados e responde perguntas — não executa nenhuma ação no sistema.</p>
            </div>
          </div>
          <p style={{ color: "#555", fontSize: 11 }}>
            Níveis de Recomendação, Aprovação e Execução Automática exigem ferramentas de execução que ainda não existem no sistema. Ficarão disponíveis conforme a Aria evoluir.
          </p>
        </div>

        <div style={cardStyleFixo}>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Comportamento da IA</p>
          <label style={labelStyle}>Nível de detalhamento</label>
          <select value={form.nivel_detalhamento} onChange={e => setForm({ ...form, nivel_detalhamento: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="objetivo">Objetivo</option>
            <option value="equilibrado">Equilibrado</option>
            <option value="detalhado">Detalhado</option>
            <option value="executivo">Executivo</option>
          </select>
          <label style={labelStyle}>Forma de comunicação</label>
          <select value={form.forma_comunicacao} onChange={e => setForm({ ...form, forma_comunicacao: e.target.value })} style={{ ...inputStyle, appearance: "none" }}>
            <option value="direta">Direta</option>
            <option value="executiva">Executiva</option>
            <option value="tecnica">Técnica</option>
            <option value="explicativa">Explicativa</option>
          </select>
          {erro && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}
          {msg && <p style={{ color: "#4ade80", fontSize: 12.5, marginBottom: 10 }}>{msg}</p>}
          <button onClick={salvar} style={btnStyle}>Salvar</button>
          <p style={{ color: "#555", fontSize: 11, marginTop: 12 }}>Essas preferências mudam de verdade como a Aria formula as respostas no chat.</p>
        </div>
      </div>

      <div style={{ ...cardStyleFixo, marginBottom: 16 }}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>Módulos Disponíveis para a IA</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          {dados.modulos.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ color: m.instalado ? "#4ade80" : "#555" }}>{m.instalado ? "✓" : "○"}</span>
              <span style={{ color: m.instalado ? "#fff" : "#555" }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyleFixo}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setMostrarFerramentas(!mostrarFerramentas)}>
          <p style={{ color: "#fff", fontWeight: 700, margin: 0 }}>Permissões de Consulta ({dados.total_ferramentas} ferramentas ativas)</p>
          <span style={{ color: "#888", fontSize: 12 }}>{mostrarFerramentas ? "▲ ocultar" : "▼ ver todas"}</span>
        </div>
        {mostrarFerramentas && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {dados.permissoes_consulta.map(p => (
              <div key={p.nome} style={{ padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                <p style={{ color: "#4ade80", fontSize: 12.5, fontWeight: 600, margin: 0, fontFamily: "monospace" }}>{p.nome}</p>
                <p style={{ color: "#888", fontSize: 11.5, margin: "3px 0 0" }}>{p.descricao}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SecaoAuditoria() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/settings/atividade-recente", { params: { limite: 100 } }).then(r => setLog(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  return (
    <div style={cardStyleFixo}>
      <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Histórico de Auditoria</p>
      {log.length === 0 ? (
        <p style={{ color: "#555", fontSize: 13 }}>Nenhuma alteração registrada ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {log.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < log.length - 1 ? "1px solid #1a1a1a" : "none" }}>
              <div>
                <p style={{ color: "#fff", fontSize: 13, margin: 0 }}>{a.acao}</p>
                <p style={{ color: "#888", fontSize: 11.5, margin: "2px 0 0" }}>
                  {a.usuario_nome} · {a.origem}
                  {a.valor_anterior && ` · de "${a.valor_anterior}" para "${a.valor_novo}"`}
                </p>
              </div>
              <span style={{ color: "#555", fontSize: 11.5, flexShrink: 0 }}>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecaoSeguranca() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    api.get("/settings/seguranca").then(r => setDados(r.data)).catch(() => {});
  }, []);

  if (!dados) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={cardStyleFixo}>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>Política de Senha</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#ccc" }}>
            <span style={{ color: "#4ade80" }}>✓</span> Mínimo de {dados.politica_senha.tamanho_minimo} caracteres
          </div>
        </div>

        <div style={cardStyleFixo}>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>Tentativas de Login (últimos 30 dias)</p>
          <div style={{ display: "flex", gap: 20 }}>
            <div><span style={{ color: "#4ade80", fontSize: 20, fontWeight: 700 }}>{dados.tentativas_login.sucessos_30_dias}</span><p style={{ color: "#888", fontSize: 11, margin: 0 }}>sucessos</p></div>
            <div><span style={{ color: "#f87171", fontSize: 20, fontWeight: 700 }}>{dados.tentativas_login.falhas_30_dias}</span><p style={{ color: "#888", fontSize: 11, margin: 0 }}>falhas</p></div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ ...cardStyleFixo, opacity: 0.6 }}>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>Autenticação em Dois Fatores (2FA)</p>
          <p style={{ color: "#888", fontSize: 12.5, margin: 0 }}>❌ {dados.autenticacao_dois_fatores.motivo}</p>
        </div>
        <div style={{ ...cardStyleFixo, opacity: 0.6 }}>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>Sessões Ativas</p>
          <p style={{ color: "#888", fontSize: 12.5, margin: 0 }}>❌ {dados.sessoes_ativas.motivo}</p>
        </div>
      </div>

      <div style={cardStyleFixo}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Tentativas Recentes</p>
        {dados.tentativas_login.recentes.length === 0 ? (
          <p style={{ color: "#555", fontSize: 13 }}>Nenhuma tentativa registrada.</p>
        ) : (
          dados.tentativas_login.recentes.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < dados.tentativas_login.recentes.length - 1 ? "1px solid #1a1a1a" : "none" }}>
              <div>
                <span style={{ color: t.sucesso ? "#4ade80" : "#f87171", fontSize: 13 }}>{t.sucesso ? "✓ Sucesso" : "✗ Falha"}</span>
                <span style={{ color: "#888", fontSize: 12, marginLeft: 10 }}>{t.email}{t.motivo_falha && ` · ${t.motivo_falha.replace(/_/g, " ")}`}</span>
              </div>
              <span style={{ color: "#555", fontSize: 11.5 }}>{new Date(t.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const { secao } = useParams();
  const navigate = useNavigate();
  const secaoAtiva = secao || "visao-geral";

  return (
    <div>
      <h1 style={{ color: "#fff", fontWeight: 700, marginBottom: 6 }}>Visão Geral</h1>
      <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>Central de configuração da sua empresa. Aqui você encontra um resumo do que está configurado, pendências e recomendações.</p>

      {secaoAtiva === "visao-geral" && <VisaoGeral navigate={navigate} />}
      {secaoAtiva === "conta" && <SecaoConta />}
      {secaoAtiva === "tipo-empresa" && <SecaoTipoEmpresa />}
      {secaoAtiva === "pagamento" && <SecaoPagamento />}
      {secaoAtiva === "sistema" && <SecaoSistema />}
      {secaoAtiva === "usuarios" && <SecaoUsuarios />}
      {secaoAtiva === "ia" && <SecaoIA />}
      {secaoAtiva === "auditoria" && <SecaoAuditoria />}
      {secaoAtiva === "backup" && <SecaoSeguranca />}
      {!["visao-geral", "conta", "tipo-empresa", "pagamento", "sistema", "usuarios", "ia", "auditoria"].includes(secaoAtiva) && (
        <div style={{ ...cardStyleFixo, textAlign: "center", padding: 60 }}>
          <p style={{ color: "#555", fontSize: 14 }}>Essa seção ainda está em desenvolvimento.</p>
        </div>
      )}
    </div>
  );
}