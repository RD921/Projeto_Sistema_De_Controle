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

      {secaoAtiva !== "visao-geral" && !["conta", "tipo-empresa", "pagamento", "sistema", "usuarios"].includes(secaoAtiva) && (
        <div style={{ ...cardStyle, cursor: "default", textAlign: "center", padding: 60 }}>
          <p style={{ color: "#555", fontSize: 14 }}>Essa seção ainda está em desenvolvimento.</p>
        </div>
      )}
    </div>
  );
}