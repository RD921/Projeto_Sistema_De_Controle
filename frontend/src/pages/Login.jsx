import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [suporteOpen, setSuporteOpen] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) { setErro("Digite um e-mail válido."); return; }
    setErro(""); setStep("senha");
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setErro(""); setLoading(true);
    try {
            const res = await api.post("/auth/login", { email, senha });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("tenant_id", res.data.tenant_id);

      try {
        const onboarding = await api.get("/onboarding");
        navigate(onboarding.data.completed ? "/" : "/onboarding");
      } catch {
        navigate("/");
      }
    } catch {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuporte = async (e) => {
    e.preventDefault(); if (!mensagem.trim()) return; setEnviando(true);
    try { await api.post("/auth/suporte", { mensagem, para: "rodrigoarrezzimaciel17@gmail.com" }); } catch {}
    setEnviando(false); setEnviado(true); setMensagem("");
    setTimeout(() => { setEnviado(false); setSuporteOpen(false); }, 3000);
  };

  const navLinks = ["Loja", "Produtos", "Pedidos", "Clientes", "Integrações", "Suporte"];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}>

      <nav style={{
  background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.08)",
  position: "sticky", top: 0, zIndex: 100,
  display: "flex", alignItems: "center", justifyContent: "center",
  height: 48, padding: "0 22px",
}}>
  {/* Logo */}
  <div style={{ position: "absolute", left: 22 }}>
    <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.04em", color: "#1d1d1f" }}>
      MidNight
    </span>
  </div>

  {/* Nav Links centralizados */}
  <div style={{ display: "flex", alignItems: "center" }}>
    {navLinks.map(link => (
      <button key={link}
        onClick={() => link === "Suporte" && setSuporteOpen(true)}
        style={{
          color: "#1d1d1f", background: "none", border: "none",
          fontSize: 13, padding: "0 14px", opacity: 0.75,
          transition: "opacity 0.2s", cursor: "pointer", fontFamily: "inherit",
        }}
        onMouseEnter={e => e.target.style.opacity = 1}
        onMouseLeave={e => e.target.style.opacity = 0.75}>
        {link}
      </button>
    ))}
  </div>

  {/* Ícone de pesquisa */}
  <div style={{ position: "absolute", right: 22 }}>
    <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="5.5" stroke="#1d1d1f" strokeWidth="1.3"/>
        <path d="M10.5 10.5L14 14" stroke="#1d1d1f" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    </button>
  </div>
</nav>

      {/* MODAL SUPORTE */}
      {suporteOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setSuporteOpen(false)} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <button onClick={() => setSuporteOpen(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#6e6e73" }}>✕</button>
            {enviado ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{ color: "#1d1d1f", marginBottom: 8 }}>Mensagem enviada!</h3>
                <p style={{ color: "#6e6e73", fontSize: 14 }}>Entraremos em contato em breve.</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1d1d1f", marginBottom: 8 }}>Suporte</h2>
                <p style={{ color: "#6e6e73", fontSize: 14, marginBottom: 24 }}>Descreva sua dúvida ou problema. Responderemos por e-mail.</p>
                <form onSubmit={handleSuporte}>
                  <textarea value={mensagem} onChange={e => setMensagem(e.target.value)}
                    placeholder="Digite sua mensagem aqui..." rows={6} autoFocus
                    style={{ width: "100%", padding: 16, fontSize: 15, borderRadius: 12, border: "1.5px solid #d2d2d7", outline: "none", resize: "none", fontFamily: "inherit", color: "#1d1d1f", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = "#0066cc"}
                    onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                  <button type="submit" disabled={enviando || !mensagem.trim()} style={{ marginTop: 16, width: "100%", padding: 14, background: mensagem.trim() ? "#1d1d1f" : "#d2d2d7", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: mensagem.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                    {enviando ? "Enviando..." : "Enviar mensagem"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* LOGIN */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
        {step === "email" ? (
          <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1d1d1f", marginBottom: 32, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Inicie sessão para acessar o EcomFlow.
            </h1>
            <form onSubmit={handleEmailSubmit}>
              {erro && <p style={{ color: "#ff3b30", fontSize: 13, marginBottom: 12 }}>{erro}</p>}
              <div style={{ position: "relative" }}>
                <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} autoFocus
                  style={{ width: "100%", padding: "16px 52px 16px 20px", fontSize: 17, borderRadius: 12, border: "1.5px solid #d2d2d7", outline: "none", background: "#fff", color: "#1d1d1f", boxSizing: "border-box", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#0066cc"}
                  onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                <button type="submit" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#1d1d1f", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#0066cc"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1d1d1f"}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M7 2l5 5-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <input type="checkbox" id="lembrar" style={{ width: 15, height: 15, accentColor: "#0066cc", cursor: "pointer" }} />
                <label htmlFor="lembrar" style={{ fontSize: 14, color: "#1d1d1f", cursor: "pointer" }}>Lembrar</label>
              </div>
              <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 8 }}>
                <span onClick={() => navigate("/forgot-password")} style={{ color: "#0066cc", fontSize: 14, cursor: "pointer" }}>Esqueceu a senha? ↗</span>
                <p style={{ color: "#6e6e73", fontSize: 14, margin: 0 }}>
                  Não tem uma conta?{" "}
                  <span onClick={() => navigate("/register")} style={{ color: "#0066cc", cursor: "pointer" }}>Crie sua conta ↗</span>
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1d1d1f", marginBottom: 8, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Digite sua senha.
            </h1>
            <p style={{ color: "#6e6e73", fontSize: 15, marginBottom: 32 }}>{email}</p>
            <form onSubmit={handleLogin}>
              {erro && <p style={{ color: "#ff3b30", fontSize: 13, marginBottom: 12 }}>{erro}</p>}
              <div style={{ position: "relative" }}>
                <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} autoFocus
                  style={{ width: "100%", padding: "16px 52px 16px 20px", fontSize: 17, borderRadius: 12, border: "1.5px solid #d2d2d7", outline: "none", background: "#fff", color: "#1d1d1f", boxSizing: "border-box", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#0066cc"}
                  onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                <button type="submit" disabled={loading} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: loading ? "#6e6e73" : "#1d1d1f", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.background = "#0066cc")}
                  onMouseLeave={e => !loading && (e.currentTarget.style.background = "#1d1d1f")}>
                  {loading ? <div style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> :
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              </div>
              <div style={{ marginTop: 20 }}>
                <button type="button" onClick={() => { setStep("email"); setErro(""); setSenha(""); }}
                  style={{ background: "none", border: "none", color: "#0066cc", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Voltar</button>
              </div>
              <div style={{ marginTop: 20 }}>
                <span onClick={() => navigate("/forgot-password")} style={{ color: "#0066cc", fontSize: 14, cursor: "pointer" }}>Esqueceu a senha? ↗</span>
              </div>
            </form>
          </div>
        )}

        <p style={{ marginTop: 40, color: "#6e6e73", fontSize: 12, textAlign: "center", maxWidth: 400 }}>
          Precisa de mais ajuda?{" "}
          <button onClick={() => setSuporteOpen(true)} style={{ background: "none", border: "none", color: "#0066cc", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
            Entre em contato
          </button>{" "}ou ligue para 0800 761 0867
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}