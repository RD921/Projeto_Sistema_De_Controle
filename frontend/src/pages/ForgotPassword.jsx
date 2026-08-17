import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setEnviado(true);
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao enviar e-mail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <nav style={{
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)", height: 48,
        display: "flex", alignItems: "center", padding: "0 22px",
      }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.04em", color: "#1d1d1f", cursor: "pointer" }}
          onClick={() => navigate("/login")}>
          Mid<span style={{ color: "#0066cc" }}>Night</span>
        </span>
      </nav>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
        {enviado ? (
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
            <h2 style={{ color: "#1d1d1f", marginBottom: 8 }}>E-mail enviado!</h2>
            <p style={{ color: "#6e6e73", marginBottom: 24 }}>
              Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
            </p>
            <button onClick={() => navigate("/login")} style={{
              background: "#1d1d1f", color: "#fff", border: "none",
              borderRadius: 12, padding: "14px 32px", fontSize: 15,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Voltar ao login
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1d1d1f", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Esqueceu sua senha?
            </h1>
            <p style={{ color: "#6e6e73", marginBottom: 32, fontSize: 15 }}>
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

            {erro && (
              <div style={{ background: "#fff2f2", border: "1px solid #ffcdd2", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#c62828", fontSize: 14 }}>
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ position: "relative", marginBottom: 20 }}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Seu e-mail" required autoFocus
                  style={{
                    width: "100%", padding: "16px 52px 16px 20px", fontSize: 17,
                    borderRadius: 12, border: "1.5px solid #d2d2d7", outline: "none",
                    background: "#fff", color: "#1d1d1f", boxSizing: "border-box",
                    fontFamily: "inherit", transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#0066cc"}
                  onBlur={e => e.target.style.borderColor = "#d2d2d7"}
                />
                <button type="submit" disabled={loading} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "#1d1d1f", border: "none", borderRadius: "50%",
                  width: 32, height: 32, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#0066cc"}
                onMouseLeave={e => e.currentTarget.style.background = "#1d1d1f"}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M7 2l5 5-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </form>

            <button onClick={() => navigate("/login")} style={{
              background: "none", border: "none", color: "#0066cc",
              fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            }}>
              ← Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}