import { useEffect, useState } from "react";
import api from "../../api";
import { estilos, Modal, erroDe } from "./ui";

function Resultado({ cor, titulo, vazio, children }) {
  const e = estilos(cor);
  return (
    <div style={e.card}>
      <h3 style={{ ...e.h3, marginBottom: 16 }}>{titulo}</h3>
      {children || <div style={{ border: `1px dashed ${cor.border}`, borderRadius: 10, padding: 40, textAlign: "center", color: cor.textMuted, fontSize: 14 }}>{vazio}</div>}
    </div>
  );
}

export function CopyIA({ cor, avisar }) {
  const e = estilos(cor);
  const [produto, setProduto] = useState("");
  const [publico, setPublico] = useState("");
  const [canal, setCanal] = useState("WhatsApp");
  const [copy, setCopy] = useState("");
  const [gerando, setGerando] = useState(false);
  const [google, setGoogle] = useState(false);
  const [modal, setModal] = useState(false);
  const [imagens, setImagens] = useState([]);
  const [carregandoImg, setCarregandoImg] = useState(false);
  const [imagem, setImagem] = useState(null);

  useEffect(() => { api.get("/google/status").then(r => setGoogle(!!r.data.conectado)).catch(() => {}); }, []);

  const conectar = async () => {
    try { window.location.href = (await api.get("/google/auth")).data.url; }
    catch (err) { avisar({ tipo: "erro", texto: erroDe(err, "Erro ao iniciar conexão com o Google.") }); }
  };
  const abrir = async () => {
    setModal(true); setCarregandoImg(true);
    try { setImagens((await api.get("/google/imagens")).data || []); }
    catch (err) { avisar({ tipo: "erro", texto: erroDe(err, "Erro ao buscar imagens do Google.") }); setModal(false); }
    finally { setCarregandoImg(false); }
  };
  const gerar = async () => {
    setGerando(true); setCopy("");
    try { setCopy((await api.post("/marketing/copy", { produto, publico, canal })).data.copy); }
    catch (err) { setCopy(erroDe(err, "Erro ao gerar copy. Tente novamente.")); }
    finally { setGerando(false); }
  };
  const ok = produto && publico;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
      <div style={e.card}>
        <h3 style={{ ...e.h3, marginBottom: 6 }}>Gerador de copy com IA</h3>
        <p style={{ ...e.muted, marginTop: 0 }}>A IA cria mensagens persuasivas para o seu produto. O texto é um rascunho: revise antes de usar.</p>
        <label style={e.label}>Produto ou serviço</label>
        <input style={e.input} value={produto} onChange={x => setProduto(x.target.value)} placeholder="Ex: Ventilador Industrial 65cm" />
        <label style={{ ...e.label, marginTop: 10 }}>Público-alvo</label>
        <input style={e.input} value={publico} onChange={x => setPublico(x.target.value)} placeholder="Ex: Donos de indústrias no interior de SP" />
        <label style={{ ...e.label, marginTop: 10 }}>Canal</label>
        <select style={e.input} value={canal} onChange={x => setCanal(x.target.value)}>{["WhatsApp", "Email", "Instagram", "Facebook", "SMS"].map(c => <option key={c}>{c}</option>)}</select>
        <label style={{ ...e.label, marginTop: 10 }}>Imagem (opcional)</label>
        {!google ? <button style={{ ...e.ghost, width: "100%" }} onClick={conectar}>Conectar Google Drive/Fotos</button>
          : imagem ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={imagem.thumbnail} alt={imagem.nome} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
              <span style={{ ...e.muted, flex: 1 }}>{imagem.nome}</span>
              <button style={{ ...e.ghost, color: "#f87171" }} onClick={() => setImagem(null)}>Remover</button>
            </div>
          ) : <button style={{ ...e.ghost, width: "100%" }} onClick={abrir}>Escolher imagem do Google</button>}
        <button style={{ ...e.btn, width: "100%", marginTop: 14, opacity: ok ? 1 : 0.5 }} disabled={gerando || !ok} onClick={gerar}>{gerando ? "Gerando…" : "Gerar copy"}</button>
      </div>
      <Resultado cor={cor} titulo="Copy gerada" vazio="Preencha os campos e clique em “Gerar copy”.">
        {copy && (
          <>
            <div style={{ background: cor.cardHover, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 16, color: cor.text, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{copy}</div>
            <button style={{ ...e.ghost, marginTop: 12 }} onClick={() => navigator.clipboard.writeText(copy).then(() => avisar({ tipo: "sucesso", texto: "Copiado." }))}>Copiar texto</button>
          </>
        )}
      </Resultado>
      {modal && (
        <Modal cor={cor} titulo="Escolher imagem" onClose={() => setModal(false)}>
          {carregandoImg ? <p style={e.muted}>Carregando imagens…</p> : !imagens.length ? <p style={e.muted}>Nenhuma imagem encontrada no Drive ou Fotos.</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
              {imagens.map(img => (
                <img key={`${img.origem}-${img.id}`} src={img.thumbnail} alt={img.nome} title={img.nome} onClick={() => { setImagem(img); setModal(false); }}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `1px solid ${cor.border}` }} />
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export function ScriptsIA({ cor, avisar }) {
  const e = estilos(cor);
  const [persona, setPersona] = useState("");
  const [produto, setProduto] = useState("");
  const [scripts, setScripts] = useState([]);
  const [gerando, setGerando] = useState(false);
  const gerar = async () => {
    setGerando(true); setScripts([]);
    try { setScripts((await api.post("/marketing/scripts", { persona, produto })).data.scripts || []); }
    catch (err) { avisar({ tipo: "erro", texto: erroDe(err, "Erro ao gerar scripts.") }); }
    finally { setGerando(false); }
  };
  const ok = persona && produto;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
      <div style={e.card}>
        <h3 style={{ ...e.h3, marginBottom: 6 }}>Gerador de scripts com IA</h3>
        <p style={{ ...e.muted, marginTop: 0 }}>Scripts de abordagem por canal. São rascunhos: revise antes de usar.</p>
        <label style={e.label}>Persona do cliente</label>
        <input style={e.input} value={persona} onChange={x => setPersona(x.target.value)} placeholder="Ex: Empresário do setor industrial, 40 anos" />
        <label style={{ ...e.label, marginTop: 10 }}>Produto</label>
        <input style={e.input} value={produto} onChange={x => setProduto(x.target.value)} placeholder="Ex: Ventilador Industrial 65cm" />
        <button style={{ ...e.btn, width: "100%", marginTop: 14, opacity: ok ? 1 : 0.5 }} disabled={gerando || !ok} onClick={gerar}>{gerando ? "Gerando…" : "Gerar scripts"}</button>
      </div>
      <Resultado cor={cor} titulo="Scripts gerados" vazio="Os scripts aparecerão aqui.">
        {scripts.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {scripts.map((s, i) => (
              <div key={i} style={{ background: cor.cardHover, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <b style={{ color: cor.text, fontSize: 13 }}>{s.canal}</b>
                  <button style={e.ghost} onClick={() => navigator.clipboard.writeText(s.script).then(() => avisar({ tipo: "sucesso", texto: "Copiado." }))}>Copiar</button>
                </div>
                <p style={{ color: cor.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{s.script}</p>
              </div>
            ))}
          </div>
        )}
      </Resultado>
    </div>
  );
}
