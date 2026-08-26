import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../api";

export default function LojaModulos() {
  const navigate = useNavigate();
  const { cor } = useOutletContext();
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null);

  const carregar = () => {
    setLoading(true);
    api.get("/modules").then(r => setModulos(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const instalar = async (id) => {
    setAcaoEmAndamento(id);
    try {
      await api.post(`/modules/${id}/install`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao instalar módulo.");
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const desinstalar = async (id) => {
    setAcaoEmAndamento(id);
    try {
      await api.post(`/modules/${id}/uninstall`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao desinstalar módulo.");
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const cardStyle = { background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 20 };

  const instalados = modulos.filter(m => m.instalado);
  const disponiveis = modulos.filter(m => !m.instalado && m.disponivel);
  const emBreve = modulos.filter(m => !m.disponivel);

  const Grupo = ({ titulo, itens, mostrarBotao }) => (
    <div style={{ marginBottom: 32 }}>
      <p style={{ color: cor.text, fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{titulo} <span style={{ color: cor.textMuted, fontWeight: 400 }}>({itens.length})</span></p>
      {itens.length === 0 ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum módulo aqui.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {itens.map(m => (
            <div key={m.id} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{m.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: cor.text }}>{m.label}</p>
                </div>
              </div>
              <p style={{ color: cor.textMuted, fontSize: 12.5, marginBottom: 16, minHeight: 34 }}>{m.descricao}</p>

                            {mostrarBotao === "instalado" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {m.rota && (
                    <button onClick={() => navigate(m.rota)} style={{ flex: 1, background: cor.text, color: cor.bg, border: "none", borderRadius: 8, padding: "8px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Abrir
                    </button>
                  )}
                  {m.nativo ? (
                    <span style={{ background: "#f3e8ff", color: "#7c3aed", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}>
                      🔒 Nativo
                    </span>
                  ) : (
                    <button onClick={() => desinstalar(m.id)} disabled={acaoEmAndamento === m.id} style={{ background: "none", border: `1px solid ${cor.border}`, color: "#dc2626", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                      {acaoEmAndamento === m.id ? "..." : "Remover"}
                    </button>
                  )}
                </div>
              )}
              {mostrarBotao === "disponivel" && (
                <button onClick={() => instalar(m.id)} disabled={acaoEmAndamento === m.id} style={{ width: "100%", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {acaoEmAndamento === m.id ? "Instalando..." : "+ Instalar"}
                  </button>
              )}
              {mostrarBotao === "em_breve" && (
                <span style={{ display: "block", textAlign: "center", background: "#f4f4f5", color: "#a3a3a3", borderRadius: 8, padding: "9px", fontSize: 12.5, fontWeight: 600 }}>
                  Em breve
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: cor.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        ← Voltar aos módulos
      </button>

      <h1 style={{ color: cor.text, fontWeight: 700, margin: 0 }}>🧩 Loja de Módulos</h1>
      <p style={{ color: cor.textMuted, fontSize: 13, margin: "4px 0 28px" }}>Instale ou remova módulos conforme seu negócio evolui.</p>

      {loading ? (
        <p style={{ color: cor.textMuted, fontSize: 13 }}>Carregando...</p>
      ) : (
        <>
          <Grupo titulo="✓ Instalados" itens={instalados} mostrarBotao="instalado" />
          <Grupo titulo="Disponíveis para instalar" itens={disponiveis} mostrarBotao="disponivel" />
          <Grupo titulo="Em breve" itens={emBreve} mostrarBotao="em_breve" />
        </>
      )}
    </div>
  );
}