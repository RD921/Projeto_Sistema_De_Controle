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

// ═══════════════════ NOVA VISÃO GERAL ═══════════════════
const CORES_PRIORIDADE = { alta: "#f87171", media: "#fbbf24", baixa: "#60a5fa" };
const LABELS_PRIORIDADE = { alta: "🔴 Alta", media: "🟡 Média", baixa: "🔵 Baixa" };

function VisaoGeral({ navigate }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    api.get("/settings/checklist").then(r => setDados(r.data)).catch(() => {});
  }, []);

  if (!dados) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  const recomendacoes = dados.checklist.filter(i => i.status === "pendente" || i.status === "recomendado");
  const tudoCerto = recomendacoes.length === 0;

  return (
    <div>
      {/* Progresso da Configuração */}
      <div style={{ ...cardStyleFixo, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>
            {dados.percentual === 100 ? "🎉 Configuração da empresa" : "Configuração da empresa"}
          </p>
          <span style={{ color: dados.percentual === 100 ? "#4ade80" : "#fbbf24", fontSize: 24, fontWeight: 700 }}>{dados.percentual}%</span>
        </div>
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
        {/* Checklist Inteligente */}
        <div style={cardStyleFixo}>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Checklist de Configuração</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {dados.checklist.map(item => {
              const icone = item.status === "concluido" ? "✓" : item.status === "indisponivel" ? "—" : "⚠";
              const cor = item.status === "concluido" ? "#4ade80" : item.status === "indisponivel" ? "#555" : "#fbbf24";
              return (
                <div
                  key={item.chave}
                  onClick={() => item.status !== "indisponivel" && navigate(item.link)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: "1px solid #1a1a1a", cursor: item.status !== "indisponivel" ? "pointer" : "default" }}
                >
                  <span style={{ color: cor, fontSize: 14, width: 16 }}>{icone}</span>
                  <span style={{ color: item.status === "indisponivel" ? "#555" : "#fff", fontSize: 13, flex: 1 }}>{item.label}</span>
                  {item.status === "indisponivel" && <span style={{ color: "#555", fontSize: 10.5 }}>em breve</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Próximo Passo */}
        <div style={{ ...cardStyleFixo, background: "linear-gradient(135deg, #1a1428, #111)", border: "1px solid #a78bfa33" }}>
          <p style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>PRÓXIMO PASSO</p>
          {dados.proximo_passo ? (
            <>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: "0 0 8px" }}>{dados.proximo_passo.label}</p>
              <p style={{ color: "#aaa", fontSize: 12.5, margin: "0 0 16px", lineHeight: 1.5 }}>{dados.proximo_passo.recomendacao}</p>
              <button onClick={() => navigate(dados.proximo_passo.link)} style={{ ...btnStyle, width: "100%" }}>
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

      {/* Recomendações */}
      <div style={{ ...cardStyleFixo, marginBottom: 16 }}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Recomendações</p>
        {tudoCerto ? (
          <p style={{ color: "#4ade80", fontSize: 13 }}>✅ Tudo certo. Não encontramos pendências importantes na configuração atual.</p>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Contexto da Empresa */}
        <div style={cardStyleFixo}>
          <p style={{ color: "#555", fontSize: 11.5, marginBottom: 6 }}>Empresa</p>
          <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{dados.empresa_contexto.nome}</p>
          <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
            {dados.empresa_contexto.tipo_juridico !== "nao_definido" ? dados.empresa_contexto.tipo_juridico.toUpperCase() : "Tipo não definido"} · {dados.empresa_contexto.pais} · {dados.empresa_contexto.moeda}
          </p>
        </div>

        {/* Últimas Alterações */}
        <div style={cardStyleFixo}>
          <p style={{ color: "#555", fontSize: 11.5, marginBottom: 10 }}>Últimas configurações realizadas</p>
          {dados.atividade_recente.length === 0 ? (
            <p style={{ color: "#555", fontSize: 12.5 }}>Nenhuma alteração registrada ainda.</p>
          ) : (
            dados.atividade_recente.map((a, i) => (
              <p key={i} style={{ color: "#ccc", fontSize: 12, margin: "0 0 6px" }}>
                <span style={{ color: "#555" }}>{new Date(a.created_at).toLocaleDateString("pt-BR")} — </span>{a.acao}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function mapaLinkPendencia(chave) {
  const mapa = {
    conta_configurada: "/configuracoes/conta",
    empresa_configurada: "/configuracoes/tipo-empresa",
    tipo_empresa_configurado: "/configuracoes/tipo-empresa",
    usuarios_configurados: "/configuracoes/usuarios",
    sistema_configurado: "/configuracoes/sistema",
    pagamento_configurado: "/configuracoes/pagamento",
  };
  return mapa[chave] || "/configuracoes/visao-geral";
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

  const totalAdmins = usuarios.filter(u => u.role === "admin").length;
  const totalAtivos = usuarios.filter(u => u.ativo).length;

  if (loading) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  return (
    <div>
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
            <button onClick={() => mudarRole(u.id, u.role)} style={{ background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              Tornar {u.role === "admin" ? "Usuário" : "Admin"}
            </button>
            <button onClick={() => alternarAtivo(u.id)} style={{ background: "none", border: `1px solid ${u.ativo ? "#f8717155" : "#4ade8055"}`, color: u.ativo ? "#f87171" : "#4ade80", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              {u.ativo ? "Desativar" : "Reativar"}
            </button>
          </div>
        ))}
      </div>
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
      {/* Status */}
      <div style={{ ...cardStyleFixo, display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#4ade8022", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧠</div>
        <div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>Inteligência Artificial Estratégica (Aria)</p>
          <p style={{ color: "#4ade80", fontSize: 12, margin: "2px 0 0" }}>● Ativa — operando no nível "Somente Análise"</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Nível de Autonomia */}
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

        {/* Comportamento */}
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

      {/* Módulos disponíveis para a IA */}
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

      {/* Permissões de consulta (ferramentas reais) */}
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

export default function Configuracoes() {
  const { secao } = useParams();
  const navigate = useNavigate();
  const secaoAtiva = secao || "visao-geral";
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    api.get("/settings/overview").then(r => setOverview(r.data)).catch(() => {});
  }, []);

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
      {!["visao-geral", "conta", "tipo-empresa", "pagamento", "sistema", "usuarios", "ia"].includes(secaoAtiva) && (
        <div style={{ ...cardStyleFixo, textAlign: "center", padding: 60 }}>
          <p style={{ color: "#555", fontSize: 14 }}>Essa seção ainda está em desenvolvimento.</p>
        </div>
      )}
    </div>
  );
}