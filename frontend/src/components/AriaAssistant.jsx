import { useEffect, useRef, useState } from "react";
import api from "../api";

const TRADUCOES_ARIA = {
  pt: { online: "● Online agora", placeholder: "Digite uma mensagem...", saudacao: "Olá! Sou a Aria 👋 Como posso te ajudar?" },
  en: { online: "● Online now", placeholder: "Type a message...", saudacao: "Hi! I'm Aria 👋 How can I help you?" },
  es: { online: "● En línea ahora", placeholder: "Escribe un mensaje...", saudacao: "¡Hola! Soy Aria 👋 ¿Cómo puedo ayudarte?" },
};

const RISCO_STYLE = {
  baixo: { bg: "#dcfce7", color: "#16a34a", label: "Risco baixo" },
  medio: { bg: "#fef9c3", color: "#a16207", label: "Risco médio" },
  alto: { bg: "#fee2e2", color: "#dc2626", label: "Risco alto" },
};

export default function AriaAssistant({ idioma = "pt" }) {
  const t = TRADUCOES_ARIA[idioma] || TRADUCOES_ARIA.pt;
  const [ariaOpen, setAriaOpen] = useState(false);
  const [ariaHover, setAriaHover] = useState(false);
  const [mensagens, setMensagens] = useState([{ role: "assistant", text: t.saudacao }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pinInputs, setPinInputs] = useState({});
  const [processando, setProcessando] = useState({});
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const enviarMensagem = async (texto) => {
    if (!texto.trim()) return;
    const novasMensagens = [...mensagens, { role: "user", text: texto }];
    setMensagens(novasMensagens);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/marketing/chat", { mensagens: novasMensagens });
      const acao = res.data.acao_proposta ? { ...res.data.acao_proposta, status: "pendente" } : null;
      setMensagens(prev => [...prev, { role: "assistant", text: res.data.resposta, acao }]);
    } catch {
      setMensagens(prev => [...prev, { role: "assistant", text: "Erro ao conectar. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const atualizarAcao = (propostaId, patch) => {
    setMensagens(prev => prev.map(m =>
      m.acao?.proposta_id === propostaId ? { ...m, acao: { ...m.acao, ...patch } } : m
    ));
  };

  const confirmarAcao = async (propostaId) => {
    const pin = pinInputs[propostaId];
    if (!pin) {
      atualizarAcao(propostaId, { erro: "Digite o PIN para confirmar." });
      return;
    }
    setProcessando(prev => ({ ...prev, [propostaId]: true }));
    atualizarAcao(propostaId, { erro: null });
    try {
      const res = await api.post(`/assistente/acoes/${propostaId}/confirmar`, { pin });
      atualizarAcao(propostaId, { status: "confirmada", resultado: res.data.resultado });
      setPinInputs(prev => ({ ...prev, [propostaId]: "" }));
    } catch (err) {
      atualizarAcao(propostaId, { erro: err.response?.data?.error || "Erro ao confirmar." });
    } finally {
      setProcessando(prev => ({ ...prev, [propostaId]: false }));
    }
  };

  const negarAcao = async (propostaId) => {
    setProcessando(prev => ({ ...prev, [propostaId]: true }));
    try {
      await api.post(`/assistente/acoes/${propostaId}/negar`);
      atualizarAcao(propostaId, { status: "negada" });
    } catch (err) {
      atualizarAcao(propostaId, { erro: err.response?.data?.error || "Erro ao negar." });
    } finally {
      setProcessando(prev => ({ ...prev, [propostaId]: false }));
    }
  };

  const formatarTexto = (texto) =>
    texto.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

  const TIPO_LABEL = {
    lancamento_financeiro: "Lançamento financeiro",
    emissao_nota_fiscal: "Emissão de nota fiscal",
    criacao_automacao: "Criação de automação",
  };

  return (
    <>
      {ariaOpen && (
        <div style={{
          position: "fixed", bottom: 88, right: 28, width: 380, height: 540,
          background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 900,
          animation: "ariaSlideUp 0.25s ease-out",
        }}>
          <div style={{
            padding: "16px 18px", background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 14 }}>Aria</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: 11 }}>{t.online}</p>
            </div>
            <button onClick={() => setAriaOpen(false)} style={{
              background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer",
              opacity: 0.85,
            }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {mensagens.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%", padding: "10px 13px", borderRadius: 14,
                  background: m.role === "user" ? "#0066cc" : "#f1f1f3",
                  color: m.role === "user" ? "#fff" : "#1d1d1f",
                  fontSize: 13, lineHeight: 1.45,
                  borderBottomRightRadius: m.role === "user" ? 4 : 14,
                  borderBottomLeftRadius: m.role === "user" ? 14 : 4,
                }}
                  dangerouslySetInnerHTML={{ __html: formatarTexto(m.text) }}
                />

                {m.acao && (
                  <div style={{
                    maxWidth: "92%", width: "100%", background: "#fff", border: "1.5px solid #e5e5e7",
                    borderRadius: 14, padding: 14,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: "#1d1d1f" }}>
                        {TIPO_LABEL[m.acao.tipo] || "Ação proposta"}
                      </p>
                      {m.acao.nivel_risco && (
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                          background: RISCO_STYLE[m.acao.nivel_risco]?.bg, color: RISCO_STYLE[m.acao.nivel_risco]?.color,
                        }}>
                          {RISCO_STYLE[m.acao.nivel_risco]?.label}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "#1d1d1f" }}>{m.acao.resumo}</p>
                    <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "#6e6e73" }}>{m.acao.analise_impacto}</p>

                    {m.acao.status === "pendente" && (
                      <>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="PIN de autorização"
                            value={pinInputs[m.acao.proposta_id] || ""}
                            onChange={e => setPinInputs(prev => ({ ...prev, [m.acao.proposta_id]: e.target.value.replace(/\D/g, "") }))}
                            style={{
                              flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #d2d2d7",
                              fontSize: 13, letterSpacing: "0.2em", textAlign: "center", fontFamily: "inherit", outline: "none",
                            }}
                          />
                        </div>
                        {m.acao.erro && (
                          <p style={{ color: "#dc2626", fontSize: 11, margin: "0 0 8px" }}>{m.acao.erro}</p>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => confirmarAcao(m.acao.proposta_id)}
                            disabled={processando[m.acao.proposta_id]}
                            style={{
                              flex: 1, padding: "9px", borderRadius: 8, border: "none",
                              background: "#16a34a", color: "#fff", fontSize: 12.5, fontWeight: 700,
                              cursor: processando[m.acao.proposta_id] ? "not-allowed" : "pointer", fontFamily: "inherit",
                            }}
                          >
                            {processando[m.acao.proposta_id] ? "..." : "Confirmar"}
                          </button>
                          <button
                            onClick={() => negarAcao(m.acao.proposta_id)}
                            disabled={processando[m.acao.proposta_id]}
                            style={{
                              flex: 1, padding: "9px", borderRadius: 8, border: "1.5px solid #d2d2d7",
                              background: "#fff", color: "#6e6e73", fontSize: 12.5, fontWeight: 700,
                              cursor: processando[m.acao.proposta_id] ? "not-allowed" : "pointer", fontFamily: "inherit",
                            }}
                          >
                            Negar
                          </button>
                        </div>
                      </>
                    )}

                    {m.acao.status === "confirmada" && (
                      <p style={{ margin: 0, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                        ✓ Confirmada {m.acao.resultado?.mensagem ? `— ${m.acao.resultado.mensagem}` : ""}
                      </p>
                    )}
                    {m.acao.status === "negada" && (
                      <p style={{ margin: 0, fontSize: 12, color: "#a1a1a6", fontWeight: 600 }}>✕ Negada</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", display: "flex", gap: 4, padding: "10px 13px" }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#a1a1a6",
                    animation: `ariaBounce 1.2s ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); enviarMensagem(input); }}
            style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #eee", flexShrink: 0 }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t.placeholder}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 20, border: "1.5px solid #e5e5e7",
                outline: "none", fontSize: 13, fontFamily: "inherit",
              }}
            />
            <button type="submit" disabled={loading} style={{
              width: 38, height: 38, borderRadius: "50%", border: "none", flexShrink: 0,
              background: "#0066cc", color: "#fff", fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            }}>➤</button>
          </form>
        </div>
      )}

      <button
        onClick={() => setAriaOpen(!ariaOpen)}
        onMouseEnter={() => setAriaHover(true)}
        onMouseLeave={() => setAriaHover(false)}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 900,
          height: 56, minWidth: 56, borderRadius: 28, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
          display: "flex", alignItems: "center", gap: 8,
          padding: ariaHover || ariaOpen ? "0 20px 0 16px" : "0",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(14,165,233,0.4)",
          transition: "padding 0.2s ease",
        }}
      >
        <span style={{ fontSize: 22 }}>{ariaOpen ? "✕" : "🤖"}</span>
        {(ariaHover || ariaOpen) && !ariaOpen && (
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>Aria</span>
        )}
      </button>

      <style>{`
        @keyframes ariaBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
        @keyframes ariaSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}