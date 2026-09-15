import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

const cardStyle = { background: "#111", border: "1px solid #222", borderRadius: 12, padding: 20, cursor: "pointer" };

const CARDS = [
  { id: "sac", titulo: "SAC (Atendimento)", desc: "Configure os canais de atendimento, regras de suporte, SLA e integrações com o time de atendimento.", icone: "🎧" },
  { id: "conta", titulo: "Configuração de Conta", desc: "Gerencie os dados da sua conta, informações da empresa e dados de acesso.", icone: "👤" },
  { id: "pagamento", titulo: "Configuração de Pagamento", desc: "Configure as formas de pagamento, meios de recebimento, parcelamento e gateways.", icone: "💳" },
  { id: "sistema", titulo: "Configuração Geral do Sistema", desc: "Personalize o funcionamento do sistema, idioma, moeda, fuso horário, aparência e outras preferências.", icone: "⚙️" },
  { id: "tipo-empresa", titulo: "Tipo de Empresa", desc: "Configure regras e parâmetros específicos para o tipo de empresa (MEI, ME, EPP, LTDA, etc).", icone: "🏢" },
  { id: "usuarios", titulo: "Usuários e Permissões", desc: "Gerencie usuários, perfis de acesso e permissões do sistema.", icone: "👥" },
  { id: "integracoes-atalho", titulo: "Integrações", desc: "Conecte o sistema com outras plataformas e serviços (marketplaces, bancos, transportadoras, etc).", icone: "🔗", externo: "/integracoes/canais-venda" },
  { id: "notificacoes", titulo: "Notificações", desc: "Configure como e quando receber notificações do sistema.", icone: "🔔" },
  { id: "backup", titulo: "Backup e Segurança", desc: "Configure políticas de backup, segurança dos dados e autenticação.", icone: "🛡️" },
];

const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif", marginBottom: 12 };
const labelStyle = { color: "#555", fontSize: 11, display: "block", marginBottom: 4 };
const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };

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
      <form onSubmit={salvarConta} style={cardStyle}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Dados da Conta</p>
        <label style={labelStyle}>Nome</label>
        <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
        <label style={labelStyle}>E-mail</label>
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        {erro && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}
        {msg && <p style={{ color: "#4ade80", fontSize: 12.5, marginBottom: 10 }}>{msg}</p>}
        <button type="submit" style={btnStyle}>Salvar</button>
      </form>

      <form onSubmit={salvarSenha} style={cardStyle}>
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
    <div style={{ ...cardStyle, cursor: "default", maxWidth: 480 }}>
      <p style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>Tipo de Empresa</p>
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
    <div style={{ ...cardStyle, cursor: "default", maxWidth: 480 }}>
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

  useEffect(() => { api.get("/settings/overview").then(r => setMoeda(r.data.sistema.moeda)).catch(() => {}); }, []);

  const salvar = async () => {
    setErro(""); setMsg("");
    try {
      await api.put("/settings/sistema", { moeda });
      setMsg("Configuração salva.");
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao salvar.");
    }
  };

  return (
    <div style={{ ...cardStyle, cursor: "default", maxWidth: 480 }}>
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

  if (loading) return <p style={{ color: "#555", fontSize: 13 }}>Carregando...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {usuarios.map(u => (
        <div key={u.id} style={{ ...cardStyle, cursor: "default", display: "flex", alignItems: "center", gap: 14, opacity: u.ativo ? 1 : 0.5 }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", fontSize: 13.5, fontWeight: 600, margin: 0 }}>{u.nome}</p>
            <p style={{ color: "#888", fontSize: 11.5, margin: "2px 0 0" }}>{u.email}</p>
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
      <h1 style={{ color: "#fff", fontWeight: 700, marginBottom: 6 }}>Configurações</h1>
      <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>Gerencie todas as configurações do seu sistema de forma centralizada.</p>

      {secaoAtiva === "visao-geral" && (
        <div>
          {overview && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
              <div style={cardStyle}>
                <p style={{ color: "#555", fontSize: 11.5, marginBottom: 4 }}>🟢 Sistema</p>
                <p style={{ color: "#fff", fontSize: 13.5, fontWeight: 600, margin: 0 }}>{overview.sistema.status}</p>
              </div>
              <div style={cardStyle} onClick={() => navigate("/configuracoes/tipo-empresa")}>
                <p style={{ color: "#555", fontSize: 11.5, marginBottom: 4 }}>🏢 Tipo de Empresa</p>
                <p style={{ color: "#fff", fontSize: 13.5, fontWeight: 600, margin: 0 }}>{overview.empresa.tipo_juridico_label}</p>
              </div>
              <div style={cardStyle} onClick={() => navigate("/configuracoes/pagamento")}>
                <p style={{ color: "#555", fontSize: 11.5, marginBottom: 4 }}>👥 Plano</p>
                <p style={{ color: "#4ade80", fontSize: 13.5, fontWeight: 600, margin: 0 }}>{overview.plano.nome} · Ativo</p>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {CARDS.map(c => (
              <div
                key={c.id}
                style={cardStyle}
                onClick={() => c.externo ? navigate(c.externo) : navigate(`/configuracoes/${c.id}`)}
              >
                <p style={{ fontSize: 22, margin: "0 0 8px" }}>{c.icone}</p>
                <p style={{ color: "#fff", fontSize: 14.5, fontWeight: 700, margin: "0 0 6px" }}>{c.titulo}</p>
                <p style={{ color: "#888", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

            {secaoAtiva === "conta" && <SecaoConta />}
      {secaoAtiva === "tipo-empresa" && <SecaoTipoEmpresa />}
      {secaoAtiva === "pagamento" && <SecaoPagamento />}
      {secaoAtiva === "sistema" && <SecaoSistema />}
      {secaoAtiva === "usuarios" && <SecaoUsuarios />}
      {!["visao-geral", "conta", "tipo-empresa", "pagamento", "sistema", "usuarios"].includes(secaoAtiva) && (
        <div style={{ ...cardStyle, cursor: "default", textAlign: "center", padding: 60 }}>
          <p style={{ color: "#555", fontSize: 14 }}>Essa seção ainda está em desenvolvimento.</p>
        </div>
      )}
    </div>
  );
}