import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "", cpf_cnpj: "", data_nascimento: "",
    estado: "", cidade: "", bairro: "", numero: "",
    email: "", senha: "", confirmar_senha: ""
  });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    if (form.senha !== form.confirmar_senha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register-user", form);
      setSucesso(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const estados = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  const inputStyle = {
    width: "100%", padding: "14px 16px", fontSize: 15,
    borderRadius: 12, border: "1.5px solid #d2d2d7", outline: "none",
    background: "#fff", color: "#1d1d1f", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      {/* Navbar */}
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

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 20px" }}>
        {sucesso ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "#1d1d1f", marginBottom: 8 }}>Conta criada!</h2>
            <p style={{ color: "#6e6e73" }}>Redirecionando para o login...</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1d1d1f", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Criar sua conta
            </h1>
            <p style={{ color: "#6e6e73", marginBottom: 32, fontSize: 15 }}>
              Preencha os dados abaixo para começar.
            </p>

            {erro && (
              <div style={{ background: "#fff2f2", border: "1px solid #ffcdd2", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#c62828", fontSize: 14 }}>
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Nome completo *</label>
                <input name="nome" value={form.nome} onChange={handleChange} placeholder="Seu nome completo" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>CPF ou CNPJ *</label>
                  <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder="000.000.000-00" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Data de nascimento *</label>
                  <input name="data_nascimento" type="date" value={form.data_nascimento} onChange={handleChange} required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Estado *</label>
                  <select name="estado" value={form.estado} onChange={handleChange} required
                    style={{ ...inputStyle, appearance: "none" }}
                    onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"}>
                    <option value="">UF</option>
                    {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Cidade *</label>
                  <input name="cidade" value={form.cidade} onChange={handleChange} placeholder="Sua cidade" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Bairro *</label>
                  <input name="bairro" value={form.bairro} onChange={handleChange} placeholder="Seu bairro" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Número *</label>
                  <input name="numero" value={form.numero} onChange={handleChange} placeholder="Nº" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>E-mail *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Senha *</label>
                  <input name="senha" type="password" value={form.senha} onChange={handleChange} placeholder="Mínimo 8 caracteres" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Confirmar senha *</label>
                  <input name="confirmar_senha" type="password" value={form.confirmar_senha} onChange={handleChange} placeholder="Repita a senha" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
                </div>
              </div>

              <button type="submit" disabled={loading} style={{
                marginTop: 8, padding: "16px", background: "#1d1d1f",
                color: "#fff", border: "none", borderRadius: 12,
                fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "background 0.2s",
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = "#0066cc")}
              onMouseLeave={e => !loading && (e.currentTarget.style.background = "#1d1d1f")}>
                {loading ? "Criando conta..." : "Criar conta"}
              </button>

              <p style={{ textAlign: "center", color: "#6e6e73", fontSize: 14, marginTop: 8 }}>
                Já tem uma conta?{" "}
                <span onClick={() => navigate("/login")} style={{ color: "#0066cc", cursor: "pointer" }}>
                  Entrar
                </span>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}