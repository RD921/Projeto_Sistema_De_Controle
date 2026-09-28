import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { temas, getTemaSalvo } from "../theme";
import AriaAssistant from "../components/AriaAssistant";

export default function Login() {
  const navigate = useNavigate();
  const [tema] = useState(getTemaSalvo);
  const cor = temas[tema];
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo2fa, setCodigo2fa] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailValidado, setEmailValidado] = useState(false);
  const [pedirCodigo, setPedirCodigo] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const senhaRef = useRef(null);
  const codigoRef = useRef(null);

  useEffect(() => { if (emailValidado) setTimeout(() => senhaRef.current?.focus(), 350); }, [emailValidado]);
  useEffect(() => { if (pedirCodigo) setTimeout(() => codigoRef.current?.focus(), 350); }, [pedirCodigo]);

  const finalizarLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("tenant_id", data.tenant_id);
    api.get("/onboarding")
      .then((onboarding) => navigate(onboarding.data.completed ? "/" : "/onboarding"))
      .catch(() => navigate("/"));
  };

  const mensagemDeErro = (err) => {
    if (!err.response) return "Não foi possível falar com o servidor. Verifique sua conexão ou tente novamente em instantes.";
    const msg = err.response.data?.error;
    switch (msg) {
      case "Usuario nao encontrado": return "Não existe conta com esse e-mail.";
      case "Usuario inativo": return "Essa conta está desativada. Fale com um administrador.";
      case "Senha invalida": return "Senha incorreta.";
      case "Codigo de autenticacao invalido": return "Código de autenticação inválido.";
      default: return msg || "Não foi possível entrar. Tente novamente.";
    }
  };

  const avancarEmail = () => {
    if (!email || !email.includes("@")) { setErro("Digite um e-mail válido."); return; }
    setErro(""); setEmailValidado(true);
  };

  const tentarLogin = async () => {
    setErro(""); setLoading(true);
    try {
      const payload = pedirCodigo ? { email, senha, codigo_2fa: codigo2fa } : { email, senha };
      const res = await api.post("/auth/login", payload);
      if (res.data.requer_2fa) { setPedirCodigo(true); return; }
      finalizarLogin(res.data);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally { setLoading(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); if (!emailValidado) { avancarEmail(); return; } tentarLogin(); };
  const editarEmail = () => { setEmailValidado(false); setPedirCodigo(false); setSenha(""); setCodigo2fa(""); setMostrarSenha(false); setErro(""); };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "auto", background: cor.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} preserveAspectRatio="none">
        <path className="linha-1" d="M-100,120 Q400,60 900,180 T2000,120" stroke="#38bdf8" strokeWidth="1" fill="none" opacity="0.12" />
        <path className="linha-2" d="M-100,420 Q500,340 1000,460 T2000,380" stroke="#0ea5e9" strokeWidth="1" fill="none" opacity="0.1" />
        <path className="linha-3" d="M-100,700 Q600,640 1100,740 T2000,680" stroke="#38bdf8" strokeWidth="1" fill="none" opacity="0.08" />
      </svg>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.04em", color: cor.text }}>
              Mid<span style={{ color: "#0ea5e9" }}>Night</span>
            </span>
          </div>

          <div style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 18, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: cor.text, marginBottom: 4 }}>Entrar</h1>
            <p style={{ color: cor.textMuted, fontSize: 13.5, marginBottom: 24 }}>Acesse sua conta MidNight.</p>

            {erro && (
              <div style={{ background: "#fff2f2", border: "1px solid #ffcdd2", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#c62828", fontSize: 13 }}>
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: emailValidado ? 10 : 0 }}>
                <label style={{ fontSize: 12.5, color: cor.textMuted, marginBottom: 6, display: "block" }}>E-mail</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="voce@email.com" disabled={emailValidado}
                    style={{
                      flex: 1, padding: "12px 14px", fontSize: 14, borderRadius: 10,
                      border: `1.5px solid ${cor.border}`, outline: "none",
                      background: emailValidado ? cor.bg : cor.card, color: cor.text,
                      boxSizing: "border-box", fontFamily: "inherit",
                    }}
                  />
                  {emailValidado && (
                    <button type="button" onClick={editarEmail} style={{ background: "none", border: "none", color: "#0ea5e9", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      Editar
                    </button>
                  )}
                </div>
              </div>

              <div style={{
                display: "grid", gridTemplateRows: emailValidado ? "1fr" : "0fr",
                transition: "grid-template-rows 0.3s ease", overflow: "hidden",
              }}>
                <div style={{ minHeight: 0 }}>
                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontSize: 12.5, color: cor.textMuted, marginBottom: 6, display: "block" }}>Senha</label>
                    <div style={{ position: "relative" }}>
                      <input
                        ref={senhaRef}
                        type={mostrarSenha ? "text" : "password"}
                        value={senha} onChange={e => setSenha(e.target.value)}
                        placeholder="Sua senha"
                        style={{
                          width: "100%", padding: "12px 44px 12px 14px", fontSize: 14, borderRadius: 10,
                          border: `1.5px solid ${cor.border}`, outline: "none",
                          background: cor.card, color: cor.text, boxSizing: "border-box", fontFamily: "inherit",
                        }}
                      />
                      <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: cor.textMuted, fontSize: 15 }}>
                        {mostrarSenha ? "🙈" : "👁️"}
                      </button>
                    </div>
                    <p style={{ textAlign: "right", marginTop: 8 }}>
                      <span onClick={() => navigate("/esqueci-senha")} style={{ color: "#0ea5e9", fontSize: 12.5, cursor: "pointer" }}>Esqueceu a senha?</span>
                    </p>
                  </div>

                  {pedirCodigo && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 12.5, color: cor.textMuted, marginBottom: 6, display: "block" }}>Código de autenticação</label>
                      <input
                        ref={codigoRef}
                        value={codigo2fa} onChange={e => setCodigo2fa(e.target.value)}
                        placeholder="000000" maxLength={6}
                        style={{
                          width: "100%", padding: "12px 14px", fontSize: 16, letterSpacing: "0.3em", textAlign: "center",
                          borderRadius: 10, border: `1.5px solid ${cor.border}`, outline: "none",
                          background: cor.card, color: cor.text, boxSizing: "border-box", fontFamily: "inherit",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading} style={{
                marginTop: 20, width: "100%", padding: "13px", background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: loading ? 0.7 : 1,
              }}>
                {loading ? "Entrando..." : emailValidado ? "Entrar" : "Continuar"}
              </button>
            </form>

            <p style={{ textAlign: "center", color: cor.textMuted, fontSize: 13.5, marginTop: 20 }}>
              Não tem uma conta?{" "}
              <span onClick={() => navigate("/register")} style={{ color: "#0ea5e9", cursor: "pointer", fontWeight: 600 }}>
                Crie sua conta
              </span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes deriva1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }
        @keyframes deriva2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-25px,25px); } }
        @keyframes deriva3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,15px); } }
        .linha-1 { animation: deriva1 22s ease-in-out infinite; }
        .linha-2 { animation: deriva2 28s ease-in-out infinite; }
        .linha-3 { animation: deriva3 25s ease-in-out infinite; }
      `}</style>

      <AriaAssistant />
    </div>
  );
}