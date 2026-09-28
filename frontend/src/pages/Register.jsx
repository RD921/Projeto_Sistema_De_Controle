import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AriaAssistant from "../components/AriaAssistant";

const TIPOS_DOCUMENTO = [
  { id: "contrato_social", label: "Contrato Social" },
  { id: "cartao_cnpj", label: "Cartão CNPJ" },
  { id: "certificado_a1", label: "Certificado Digital A1" },
  { id: "comprovante_endereco", label: "Comprovante de Endereço" },
  { id: "rg_cpf_responsavel", label: "RG/CPF do Responsável" },
  { id: "outro", label: "Outro documento" },
];

const FORMATOS_ACEITOS = ["pdf", "jpg", "jpeg", "png"];
const TAMANHO_MAX_MB = 10;

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    empresa: "", email_empresa: "",
    tipo_pessoa: "cnpj", documento: "",
    nome_admin: "", email_admin: "",
    senha: "", confirmar_senha: "",
    moeda: "BRL",
  });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [menuDocumentosAberto, setMenuDocumentosAberto] = useState(false);
  const [tipoDocumentoSelecionado, setTipoDocumentoSelecionado] = useState(null);
  const [documentos, setDocumentos] = useState([]); // { id, tipo, tipoLabel, arquivo, nomeArquivo, tamanhoKb }
  const [erroDocumento, setErroDocumento] = useState("");
  const inputArquivoRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleEscolherTipoDocumento = (tipo) => {
    setTipoDocumentoSelecionado(tipo);
    setMenuDocumentosAberto(false);
    setErroDocumento("");
    setTimeout(() => inputArquivoRef.current?.click(), 50);
  };

  const handleArquivoSelecionado = (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !tipoDocumentoSelecionado) return;

    const extensao = arquivo.name.split(".").pop()?.toLowerCase();
    if (!FORMATOS_ACEITOS.includes(extensao)) {
      setErroDocumento(`Formato não aceito. Envie um arquivo ${FORMATOS_ACEITOS.join(", ").toUpperCase()}.`);
      return;
    }
    if (arquivo.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErroDocumento(`Arquivo muito grande. O tamanho máximo é ${TAMANHO_MAX_MB}MB.`);
      return;
    }

    setDocumentos(prev => [
      ...prev,
      {
        id: `${tipoDocumentoSelecionado.id}_${Date.now()}`,
        tipo: tipoDocumentoSelecionado.id,
        tipoLabel: tipoDocumentoSelecionado.label,
        arquivo,
        nomeArquivo: arquivo.name,
        tamanhoKb: Math.round(arquivo.size / 1024),
      },
    ]);
    setErroDocumento("");
    setTipoDocumentoSelecionado(null);
  };

  const removerDocumento = (id) => setDocumentos(prev => prev.filter(d => d.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    if (form.senha !== form.confirmar_senha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (form.senha.length < 8) {
      setErro("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { confirmar_senha, ...payload } = form;
      const res = await api.post("/auth/register", payload);
      setSucesso(true);

      // Os documentos ficam prontos em `documentos` (cada item já tem o File em .arquivo).
      // Quando existir uma rota de upload (ex: POST /auth/register/documentos, multipart/form-data,
      // usando tenant_id do retorno abaixo), o envio entra aqui.
      // if (res.data?.tenant_id && documentos.length > 0) {
      //   const dataDocs = new FormData();
      //   documentos.forEach(d => dataDocs.append("documentos", d.arquivo, d.nomeArquivo));
      //   documentos.forEach(d => dataDocs.append("tipos[]", d.tipo));
      //   await api.post(`/auth/register/documentos`, dataDocs, { headers: { "Content-Type": "multipart/form-data" } });
      // }

      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("tenant_id", res.data.tenant_id);
        setTimeout(() => navigate("/onboarding"), 1200);
      } else {
        setTimeout(() => navigate("/login"), 2500);
      }
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", fontSize: 15,
    borderRadius: 12, border: "1.5px solid #d2d2d7", outline: "none",
    background: "#fff", color: "#1d1d1f", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color 0.2s",
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
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
            <p style={{ color: "#6e6e73" }}>Redirecionando...</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1d1d1f", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Criar sua conta
            </h1>
            <p style={{ color: "#6e6e73", marginBottom: 32, fontSize: 15 }}>
              Cadastre sua empresa para começar a usar o Apollo.
            </p>

            {erro && (
              <div style={{ background: "#fff2f2", border: "1px solid #ffcdd2", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#c62828", fontSize: 14 }}>
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Nome da empresa *</label>
                <input name="empresa" value={form.empresa} onChange={handleChange} placeholder="Nome da sua empresa" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>E-mail da empresa *</label>
                <input name="email_empresa" type="email" value={form.email_empresa} onChange={handleChange} placeholder="contato@suaempresa.com" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Sua empresa tem CNPJ? *</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {[
                    { id: "cnpj", label: "Tenho CNPJ" },
                    { id: "cpf", label: "Só tenho CPF" },
                  ].map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setForm({ ...form, tipo_pessoa: op.id, documento: "" })}
                      style={{
                        flex: 1, padding: "12px 14px", borderRadius: 12,
                        border: form.tipo_pessoa === op.id ? "1.5px solid #0066cc" : "1.5px solid #d2d2d7",
                        background: form.tipo_pessoa === op.id ? "#eaf3ff" : "#fff",
                        color: form.tipo_pessoa === op.id ? "#0066cc" : "#6e6e73",
                        fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
                <input
                  name="documento"
                  value={form.documento}
                  onChange={handleChange}
                  placeholder={form.tipo_pessoa === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"}
                />
                <p style={{ fontSize: 11.5, color: "#a1a1a6", marginTop: 6 }}>
                  Sem CNPJ não tem problema — com CPF você usa o sistema normalmente, sem nenhuma função bloqueada.
                </p>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Em qual moeda sua empresa opera? *</label>
                <select name="moeda" value={form.moeda} onChange={handleChange} required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"}>
                  <option value="BRL">🇧🇷 Real (R$)</option>
                  <option value="USD">🇺🇸 Dólar (US$)</option>
                  <option value="EUR">🇪🇺 Euro (€)</option>
                </select>
                <p style={{ fontSize: 11.5, color: "#a1a1a6", marginTop: 6 }}>
                  Essa escolha define a moeda usada em todo o sistema. Obrigações fiscais brasileiras continuam sempre calculadas em Reais, independente dessa opção.
                </p>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Seu nome (administrador) *</label>
                <input name="nome_admin" value={form.nome_admin} onChange={handleChange} placeholder="Seu nome completo" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#0066cc"} onBlur={e => e.target.style.borderColor = "#d2d2d7"} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6e6e73", marginBottom: 6, display: "block" }}>Seu e-mail de login *</label>
                <input name="email_admin" type="email" value={form.email_admin} onChange={handleChange} placeholder="voce@email.com" required style={inputStyle}
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

              <div style={{ marginTop: 4, border: "1.5px solid #d2d2d7", borderRadius: 14, padding: 16, background: "#fafafa", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>Documentos <span style={{ fontWeight: 400, color: "#a1a1a6" }}>(opcional)</span></p>
                    <p style={{ fontSize: 12, color: "#a1a1a6", margin: "4px 0 0" }}>
                      Não é obrigatório enviar agora. Você pode anexar depois, e isso não impede o uso do sistema — inclusive se sua empresa usa CPF.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuDocumentosAberto(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "#fff", border: "1.5px solid #d2d2d7", borderRadius: 10,
                      padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#1d1d1f",
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    Documentos {menuDocumentosAberto ? "▲" : "▾"}
                  </button>
                </div>

                {menuDocumentosAberto && (
                  <div style={{
                    marginTop: 10, background: "#fff", border: "1.5px solid #d2d2d7", borderRadius: 10,
                    overflow: "hidden",
                  }}>
                    {TIPOS_DOCUMENTO.map(tipo => (
                      <div
                        key={tipo.id}
                        onClick={() => handleEscolherTipoDocumento(tipo)}
                        style={{
                          padding: "11px 14px", fontSize: 13.5, color: "#1d1d1f", cursor: "pointer",
                          borderBottom: "1px solid #f0f0f2",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f5f5f7"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                      >
                        {tipo.label}
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={inputArquivoRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleArquivoSelecionado}
                  style={{ display: "none" }}
                />

                {erroDocumento && (
                  <p style={{ color: "#c62828", fontSize: 12, marginTop: 10, marginBottom: 0 }}>{erroDocumento}</p>
                )}

                {documentos.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {documentos.map(doc => (
                      <div key={doc.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: "#fff", border: "1px solid #e5e5e7", borderRadius: 10, padding: "9px 12px",
                      }}>
                        <span style={{ fontSize: 16 }}>📄</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12.5, color: "#1d1d1f", fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {doc.tipoLabel}
                          </p>
                          <p style={{ fontSize: 11, color: "#a1a1a6", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {doc.nomeArquivo} · {doc.tamanhoKb} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removerDocumento(doc.id)}
                          style={{ background: "none", border: "none", color: "#c62828", fontSize: 13, cursor: "pointer", flexShrink: 0 }}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: 11, color: "#a1a1a6", marginTop: 12, marginBottom: 0 }}>
                  Formatos aceitos: PDF, JPG ou PNG · Tamanho máximo por arquivo: {TAMANHO_MAX_MB}MB.
                </p>
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

      <AriaAssistant />
    </div>
  );
}