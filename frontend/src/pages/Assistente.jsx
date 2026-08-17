import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const acoes = [
  { label: "📦 Ver Produtos", rota: "/products", msg: "Abrindo módulo de produtos..." },
  { label: "🛒 Ver Pedidos", rota: "/orders", msg: "Abrindo módulo de pedidos..." },
  { label: "👥 Ver Clientes", rota: "/customers", msg: "Abrindo módulo de clientes..." },
  { label: "📊 Marketing", rota: "/marketing", msg: "Abrindo módulo de marketing..." },
  { label: "📈 Dashboard", rota: "/dashboard", msg: "Abrindo o dashboard..." },
  { label: "⚡ Automações", rota: null, msg: "Acesse o módulo de Automações na tela inicial." },
];

export default function Assistente() {
  const navigate = useNavigate();
  const [mensagens, setMensagens] = useState([
    {
      role: "assistant",
      text: "Olá! Sou a **Aria**, sua assistente virtual do EcomFlow. 👋\n\nPosso te ajudar com informações sobre pedidos, produtos, clientes, marketing e muito mais. Como posso te ajudar hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

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
      setMensagens(prev => [...prev, { role: "assistant", text: res.data.resposta }]);
    } catch {
      setMensagens(prev => [...prev, { role: "assistant", text: "Erro ao conectar com a IA. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const iniciarVoz = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.onstart = () => setOuvindo(true);
    recognition.onend = () => setOuvindo(false);
    recognition.onresult = (e) => {
      const texto = e.results[0][0].transcript;
      enviarMensagem(texto);
    };
    recognition.onerror = () => setOuvindo(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const formatarTexto = (texto) => {
    return texto
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", fontFamily: "sans-serif", gap: 16 }}>

      {/* SIDEBAR */}
      <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 12px",
            background: "linear-gradient(135deg, #a78bfa, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, boxShadow: "0 0 20px #a78bfa44",
          }}>
            🤖
          </div>
          <h3 style={{ color: "#fff", fontSize: 16, margin: "0 0 4px", fontWeight: 700 }}>Aria</h3>
          <p style={{ color: "#4ade80", fontSize: 12, margin: 0 }}>● Online agora</p>
          <p style={{ color: "#555", fontSize: 11, marginTop: 8 }}>Assistente Virtual EcomFlow</p>
        </div>

        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: 16 }}>
          <p style={{ color: "#555", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Ações Rápidas</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {acoes.map(acao => (
              <button key={acao.label}
                onClick={() => {
                  setMensagens(prev => [...prev,
                    { role: "user", text: acao.label },
                    { role: "assistant", text: acao.msg }
                  ]);
                  if (acao.rota) setTimeout(() => navigate(acao.rota), 800);
                }}
                style={{
                  background: "#1a1a1a", border: "1px solid #222", borderRadius: 8,
                  color: "#ccc", padding: "8px 12px", cursor: "pointer",
                  fontSize: 12, textAlign: "left", fontFamily: "sans-serif",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#ccc"; }}>
                {acao.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: 16 }}>
          <p style={{ color: "#555", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Perguntar</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "Como aumentar minhas vendas?",
              "Dicas de marketing digital",
              "Como captar mais clientes?",
              "Estratégias de precificação",
            ].map(s => (
              <button key={s} onClick={() => enviarMensagem(s)}
                style={{
                  background: "none", border: "none", color: "#555",
                  padding: "4px 0", cursor: "pointer", fontSize: 12,
                  textAlign: "left", fontFamily: "sans-serif",
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
                onMouseLeave={e => e.currentTarget.style.color = "#555"}>
                → {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CHAT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#111", border: "1px solid #222", borderRadius: 16, overflow: "hidden" }}>

        <div style={{ padding: "16px 20px", borderBottom: "1px solid #222", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            🤖
          </div>
          <div>
            <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>Aria — Assistente Virtual</p>
            <p style={{ color: "#4ade80", fontSize: 12, margin: 0 }}>● Powered by Gemini AI</p>
          </div>
          <button onClick={() => setMensagens([{ role: "assistant", text: "Conversa reiniciada! Como posso te ajudar?" }])}
            style={{ marginLeft: "auto", background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" }}>
            Limpar
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {mensagens.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 10 }}>
              {msg.role === "assistant" && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  🤖
                </div>
              )}
              <div style={{
                maxWidth: "70%", padding: "12px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "#a78bfa" : "#1a1a1a",
                border: msg.role === "user" ? "none" : "1px solid #222",
                color: "#fff", fontSize: 14, lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={{ __html: formatarTexto(msg.text) }} />
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
              <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: `bounce 1s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: 16, borderTop: "1px solid #222", display: "flex", gap: 8 }}>
          <button onClick={iniciarVoz} style={{
            width: 42, height: 42, borderRadius: "50%", border: "1px solid #333",
            background: ouvindo ? "#a78bfa" : "#1a1a1a", color: ouvindo ? "#fff" : "#555",
            cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", flexShrink: 0,
            boxShadow: ouvindo ? "0 0 12px #a78bfa66" : "none",
          }}>
            🎤
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && enviarMensagem(input)}
            placeholder={ouvindo ? "🎤 Ouvindo..." : "Digite sua mensagem ou use o microfone..."}
            style={{
              flex: 1, padding: "10px 16px", background: "#1a1a1a", border: "1px solid #333",
              borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", fontFamily: "sans-serif",
            }}
            onFocus={e => e.target.style.borderColor = "#a78bfa"}
            onBlur={e => e.target.style.borderColor = "#333"}
          />
          <button onClick={() => enviarMensagem(input)} disabled={loading || !input.trim()} style={{
            width: 42, height: 42, borderRadius: "50%", border: "none",
            background: input.trim() ? "#a78bfa" : "#333", color: "#fff",
            cursor: input.trim() ? "pointer" : "not-allowed", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", flexShrink: 0,
          }}>
            ➤
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}