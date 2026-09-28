import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  const linkValido = Boolean(email && token);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha.length < 8) { setErro("A senha precisa ter no mínimo 8 caracteres."); return; }
    if (senha !== confirmar) { setErro("As senhas não conferem."); return; }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, token, senha });
      setSucesso(true);
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao redefinir senha.");
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
        {!linkValido ? (
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <h2 style={{ color: "#1d1d1f", marginBottom: 8 }}>Link inválido</h2>
            <p style={{ color: "#6e6e73", marginBottom: 24 }}>Este link de redefinição está incompleto ou expirou.</p>
            <button onClick={() => navigate("/forgot-password")} style={{
              background: "#1d1d1f", color: "#fff", border: "none",
              borderRadius: 12, padding: "14px 32px", fontSize: 15,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Pedir novo link
            </button>
          </div>
        ) : sucesso ? (
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "#1d1d1f", marginBottom: 8 }}>Senha redefinida!</h2>
            <p style={{ color: "#6e6e73", marginBottom: 24 }}>Já pode entrar com a nova senha.</p>
            <button onClick={() => navigate("/login")} style={{
              background: "#1d1d1f", color: "#fff", border: "none",
              borderRadius: 12, padding: "14px 32px", fontSize: 15,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Ir para o login
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1d1d1f", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Nova senha
            </h1>
            <p style={{ color: "#6e6e73", marginBottom: 32, fontSize: 15 }}>{email}</p>

            {erro && (
              <div style={{ background: "#fff2f2", border: "1px solid #ffcdd2", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#c62828", fontSize: 14 }}>
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input
                type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="Nova senha" required autoFocus
                style={{
                  width: "100%", padding: "16px 20px", fontSize: 17, marginBottom: 14,
                  borderRadius: 12, border: "1.5px solid #d2d2d7", outline: "none",
                  background: "#fff", color: "#1d1d1f", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <input
                type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                placeholder="Confirmar nova senha" required
                style={{
                  width: "100%", padding: "16px 20px", fontSize: 17, marginBottom: 20,
                  borderRadius: 12, border: "1.5px solid #d2d2d7", outline: "none",
                  background: "#fff", color: "#1d1d1f", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <button type="submit" disabled={loading} style={{
                width: "100%", background: loading ? "#6e6e73" : "#1d1d1f", color: "#fff",
                border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}>
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}