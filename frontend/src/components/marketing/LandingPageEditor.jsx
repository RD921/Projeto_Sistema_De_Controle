import React from "react";
import { useEffect, useState } from "react";
import api from "../../api";

const TIPOS_BLOCO = [
  { tipo: "titulo", label: "Titulo", icone: "1", padrao: { texto: "Novo titulo" } },
  { tipo: "texto", label: "Texto", icone: "2", padrao: { texto: "Novo paragrafo de texto." } },
  { tipo: "imagem", label: "Imagem", icone: "3", padrao: { url: "" } },
  { tipo: "botao", label: "Botao", icone: "4", padrao: { texto: "Clique aqui", url: "" } },
  { tipo: "formulario", label: "Formulario", icone: "5", padrao: { texto_botao: "Enviar" } },
];

const cardStyle = { background: "#111", border: "1px solid #222", borderRadius: 12, padding: 20 };
const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "sans-serif" };
const btnStyle = { background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" };
const btnGhost = { background: "none", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: "pointer", fontFamily: "sans-serif" };

function renderPreviewBloco(bloco, forms) {
  if (bloco.tipo === "titulo") {
    return React.createElement("h2", { style: { color: "#fff", margin: "0 0 8px" } }, bloco.texto || "(titulo vazio)");
  }
  if (bloco.tipo === "texto") {
    return React.createElement("p", { style: { color: "#ccc", margin: "0 0 8px" } }, bloco.texto || "(texto vazio)");
  }
  if (bloco.tipo === "imagem") {
    if (bloco.url) {
      return React.createElement("img", { src: bloco.url, alt: "", style: { maxWidth: "100%", borderRadius: 8, marginBottom: 8 } });
    }
    return React.createElement("div", { style: { background: "#1a1a1a", border: "1px dashed #333", borderRadius: 8, padding: 30, textAlign: "center", color: "#444", fontSize: 12, marginBottom: 8 } }, "Sem URL de imagem definida");
  }
  if (bloco.tipo === "botao") {
    return React.createElement("a", { href: bloco.url || "#", style: { display: "inline-block", padding: "10px 20px", background: "#a78bfa", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, marginBottom: 8 } }, bloco.texto || "Botao");
  }
  if (bloco.tipo === "formulario") {
    const formNome = forms.find(function (f) { return f.id === bloco.form_id; });
    const nomeTexto = formNome ? "Formulario embutido: " + formNome.nome : "Nenhum formulario selecionado para este bloco";
    return React.createElement(
      "div",
      { style: { background: "#1a1a1a", border: "1px dashed #333", borderRadius: 8, padding: 16, marginBottom: 8 } },
      React.createElement("p", { style: { color: "#888", fontSize: 12, margin: "0 0 8px" } }, nomeTexto),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 6 } },
        React.createElement("div", { style: Object.assign({}, inputStyle, { color: "#555" }) }, "Seu nome"),
        React.createElement("div", { style: Object.assign({}, inputStyle, { color: "#555" }) }, "Seu e-mail"),
        React.createElement("button", { disabled: true, style: Object.assign({}, btnStyle, { opacity: 0.6, cursor: "default" }) }, bloco.texto_botao || "Enviar")
      )
    );
  }
  return null;
}

export default function LandingPageEditor() {
  const [paginas, setPaginas] = useState([]);
  const [forms, setForms] = useState([]);
  const [modoCriar, setModoCriar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const [nome, setNome] = useState("");
  const [formId, setFormId] = useState("");
  const [blocos, setBlocos] = useState([]);
  const [selecionado, setSelecionado] = useState(null);

  const carregarTudo = function () {
    api.get("/marketing/landing-pages").then(function (r) { setPaginas(r.data || []); }).catch(function () {});
    api.get("/marketing/forms").then(function (r) { setForms(r.data || []); }).catch(function () {});
  };

  useEffect(function () { carregarTudo(); }, []);

  const adicionarBloco = function (tipoDef) {
    const novo = Object.assign({ tipo: tipoDef.tipo }, tipoDef.padrao);
    setBlocos(function (prev) {
      const atualizado = prev.concat([novo]);
      setSelecionado(atualizado.length - 1);
      return atualizado;
    });
  };

  const moverBloco = function (index, direcao) {
    setBlocos(function (prev) {
      const novo = prev.slice();
      const alvo = index + direcao;
      if (alvo < 0 || alvo >= novo.length) return prev;
      const temp = novo[index];
      novo[index] = novo[alvo];
      novo[alvo] = temp;
      setSelecionado(alvo);
      return novo;
    });
  };

  const removerBloco = function (index) {
    setBlocos(function (prev) { return prev.filter(function (_, i) { return i !== index; }); });
    setSelecionado(null);
  };

  const atualizarBlocoSelecionado = function (campo, valor) {
    setBlocos(function (prev) {
      return prev.map(function (b, i) {
        if (i !== selecionado) return b;
        const copia = Object.assign({}, b);
        copia[campo] = valor;
        return copia;
      });
    });
  };

  const resetarFormulario = function () {
    setNome("");
    setFormId("");
    setBlocos([]);
    setSelecionado(null);
    setErro(null);
    setModoCriar(false);
  };

  const salvar = async function () {
    if (!nome.trim()) { setErro("De um nome para a pagina."); return; }
    if (blocos.length === 0) { setErro("Adicione ao menos um bloco."); return; }

    const blocosFinal = blocos.map(function (b) {
      if (b.tipo !== "formulario") return b;
      const copia = Object.assign({}, b);
      copia.form_id = formId ? Number(formId) : null;
      return copia;
    });

    setSalvando(true);
    setErro(null);
    try {
      const payload = { nome: nome, blocos: blocosFinal };
      if (formId) payload.form_id = Number(formId);
      await api.post("/marketing/landing-pages", payload);
      resetarFormulario();
      carregarTudo();
    } catch (err) {
      setErro((err.response && err.response.data && err.response.data.error) || "Erro ao salvar landing page.");
    } finally {
      setSalvando(false);
    }
  };

  const publicar = async function (id) {
    try {
      await api.post("/marketing/landing-pages/" + id + "/publicar");
      carregarTudo();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao publicar.");
    }
  };

  const excluir = async function (id) {
    if (!window.confirm("Excluir esta landing page?")) return;
    try {
      await api.delete("/marketing/landing-pages/" + id);
      carregarTudo();
    } catch (err) {
      window.alert((err.response && err.response.data && err.response.data.error) || "Erro ao excluir.");
    }
  };

  const corStatus = { rascunho: "#888", publicada: "#4ade80", arquivada: "#f87171" };

  if (!modoCriar) {
    const listaPaginas = paginas.length === 0
      ? React.createElement("div", { style: Object.assign({}, cardStyle, { textAlign: "center", padding: 40 }) },
          React.createElement("p", { style: { color: "#444", fontSize: 14 } }, "Nenhuma landing page criada ainda.")
        )
      : React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 10 } },
          paginas.map(function (p) {
            const tenantIdAtual = localStorage.getItem("tenant_id") || 1;
            const urlPublica = "http://localhost:3000/api/marketing/landing-pages/public/" + tenantIdAtual + "/" + p.slug;
            const statusCor = corStatus[p.status] || "#888";
            const subtitulo = p.status + " . " + p.total_visualizacoes + " visualizacoes" + (p.form_nome ? " . form: " + p.form_nome : "");

            const botoes = [];
            if (p.status === "publicada") {
              botoes.push(
                React.createElement("a", {
                  key: "ver",
                  href: urlPublica,
                  target: "_blank",
                  rel: "noreferrer",
                  style: { color: "#38bdf8", fontSize: 12 },
                }, "Ver pagina")
              );
            }
            if (p.status === "rascunho") {
              botoes.push(
                React.createElement("button", {
                  key: "pub",
                  style: Object.assign({}, btnGhost, { color: "#4ade80", borderColor: "#4ade8040" }),
                  onClick: function () { publicar(p.id); },
                }, "Publicar")
              );
            }
            botoes.push(
              React.createElement("button", {
                key: "del",
                style: Object.assign({}, btnGhost, { color: "#f87171", borderColor: "#f8717140" }),
                onClick: function () { excluir(p.id); },
              }, "Excluir")
            );

            return React.createElement(
              "div",
              { key: p.id, style: Object.assign({}, cardStyle, { display: "flex", justifyContent: "space-between", alignItems: "center" }) },
              React.createElement(
                "div",
                null,
                React.createElement("p", { style: { color: "#fff", fontSize: 14, margin: 0, fontWeight: 600 } }, p.nome),
                React.createElement("p", { style: { color: statusCor, fontSize: 12, margin: "4px 0 0" } }, subtitulo)
              ),
              React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, botoes)
            );
          })
        );

    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 } },
        React.createElement("p", { style: { color: "#555", fontSize: 13, margin: 0 } }, "Paginas publicas de captura de leads."),
        React.createElement("button", { style: btnStyle, onClick: function () { setModoCriar(true); } }, "+ Nova Landing Page")
      ),
      listaPaginas
    );
  }

  const blocoSelecionado = selecionado != null ? blocos[selecionado] : null;

  const paletaBotoes = TIPOS_BLOCO.map(function (t) {
    return React.createElement(
      "button",
      { key: t.tipo, style: Object.assign({}, btnGhost, { textAlign: "left" }), onClick: function () { adicionarBloco(t); } },
      t.label
    );
  });

  const previaBlocos = blocos.map(function (b, i) {
    return React.createElement(
      "div",
      {
        key: i,
        onClick: function () { setSelecionado(i); },
        style: { padding: 8, borderRadius: 6, cursor: "pointer", outline: selecionado === i ? "2px solid #a78bfa" : "none", marginBottom: 4 },
      },
      renderPreviewBloco(b, forms)
    );
  });

  let painelEdicao = React.createElement("p", { style: { color: "#444", fontSize: 12 } }, "Clique em um bloco na previa para edita-lo.");

  if (blocoSelecionado) {
    const campos = [];

    if (blocoSelecionado.tipo === "titulo" || blocoSelecionado.tipo === "texto") {
      campos.push(
        React.createElement(
          "div",
          { key: "texto" },
          React.createElement("label", { style: { color: "#555", fontSize: 11, display: "block", marginBottom: 4 } }, "Texto"),
          React.createElement("textarea", {
            value: blocoSelecionado.texto || "",
            onChange: function (e) { atualizarBlocoSelecionado("texto", e.target.value); },
            style: Object.assign({}, inputStyle, { minHeight: 70, resize: "vertical" }),
          })
        )
      );
    }

    if (blocoSelecionado.tipo === "imagem") {
      campos.push(
        React.createElement(
          "div",
          { key: "url" },
          React.createElement("label", { style: { color: "#555", fontSize: 11, display: "block", marginBottom: 4 } }, "URL da imagem"),
          React.createElement("input", {
            value: blocoSelecionado.url || "",
            onChange: function (e) { atualizarBlocoSelecionado("url", e.target.value); },
            style: inputStyle,
            placeholder: "https://...",
          })
        )
      );
    }

    if (blocoSelecionado.tipo === "botao") {
      campos.push(
        React.createElement(
          "div",
          { key: "texto" },
          React.createElement("label", { style: { color: "#555", fontSize: 11, display: "block", marginBottom: 4 } }, "Texto do botao"),
          React.createElement("input", {
            value: blocoSelecionado.texto || "",
            onChange: function (e) { atualizarBlocoSelecionado("texto", e.target.value); },
            style: inputStyle,
          })
        )
      );
      campos.push(
        React.createElement(
          "div",
          { key: "url" },
          React.createElement("label", { style: { color: "#555", fontSize: 11, display: "block", marginBottom: 4 } }, "URL de destino"),
          React.createElement("input", {
            value: blocoSelecionado.url || "",
            onChange: function (e) { atualizarBlocoSelecionado("url", e.target.value); },
            style: inputStyle,
            placeholder: "https://...",
          })
        )
      );
    }

    if (blocoSelecionado.tipo === "formulario") {
      campos.push(
        React.createElement(
          "div",
          { key: "form" },
          React.createElement("label", { style: { color: "#555", fontSize: 11, display: "block", marginBottom: 4 } }, "Formulario a usar"),
          React.createElement(
            "select",
            {
              value: formId,
              onChange: function (e) { setFormId(e.target.value); },
              style: Object.assign({}, inputStyle, { appearance: "none" }),
            },
            [React.createElement("option", { key: "vazio", value: "" }, "Selecione um formulario...")].concat(
              forms.map(function (f) { return React.createElement("option", { key: f.id, value: f.id }, f.nome); })
            )
          )
        )
      );
      campos.push(
        React.createElement(
          "div",
          { key: "textoBotao" },
          React.createElement("label", { style: { color: "#555", fontSize: 11, display: "block", marginBottom: 4 } }, "Texto do botao de envio"),
          React.createElement("input", {
            value: blocoSelecionado.texto_botao || "",
            onChange: function (e) { atualizarBlocoSelecionado("texto_botao", e.target.value); },
            style: inputStyle,
          })
        )
      );
    }

    campos.push(
      React.createElement(
        "div",
        { key: "acoes", style: { display: "flex", gap: 6, marginTop: 6 } },
        React.createElement("button", { style: btnGhost, onClick: function () { moverBloco(selecionado, -1); } }, "Subir"),
        React.createElement("button", { style: btnGhost, onClick: function () { moverBloco(selecionado, 1); } }, "Descer"),
        React.createElement("button", { style: Object.assign({}, btnGhost, { color: "#f87171", borderColor: "#f8717140" }), onClick: function () { removerBloco(selecionado); } }, "Remover")
      )
    );

    painelEdicao = React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, campos);
  }

  const tituloEdicao = blocoSelecionado
    ? "Editar: " + (TIPOS_BLOCO.find(function (t) { return t.tipo === blocoSelecionado.tipo; }) || {}).label
    : "Selecione um bloco";

  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
      React.createElement("input", {
        value: nome,
        onChange: function (e) { setNome(e.target.value); },
        placeholder: "Nome da landing page",
        style: Object.assign({}, inputStyle, { width: 320, fontSize: 15, fontWeight: 600 }),
      }),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8 } },
        React.createElement("button", { style: btnGhost, onClick: resetarFormulario }, "Cancelar"),
        React.createElement("button", { style: btnStyle, onClick: salvar, disabled: salvando }, salvando ? "Salvando..." : "Salvar Landing Page")
      )
    ),
    erro
      ? React.createElement("div", { style: { background: "#dc262615", border: "1px solid #dc262640", color: "#f87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 } }, erro)
      : null,
    React.createElement(
      "div",
      { style: { display: "grid", gridTemplateColumns: "180px 1fr 280px", gap: 16 } },
      React.createElement(
        "div",
        { style: cardStyle },
        React.createElement("h4", { style: { color: "#fff", fontSize: 13, margin: "0 0 12px" } }, "Adicionar bloco"),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, paletaBotoes)
      ),
      React.createElement(
        "div",
        { style: cardStyle },
        React.createElement("h4", { style: { color: "#fff", fontSize: 13, margin: "0 0 12px" } }, "Previa"),
        blocos.length === 0
          ? React.createElement("div", { style: { background: "#1a1a1a", border: "1px dashed #333", borderRadius: 8, padding: 40, textAlign: "center" } },
              React.createElement("p", { style: { color: "#444", fontSize: 13 } }, "Adicione blocos usando o painel a esquerda.")
            )
          : React.createElement("div", { style: { background: "#0a0a0a", borderRadius: 8, padding: 20 } }, previaBlocos)
      ),
      React.createElement(
        "div",
        { style: cardStyle },
        React.createElement("h4", { style: { color: "#fff", fontSize: 13, margin: "0 0 12px" } }, tituloEdicao),
        painelEdicao
      )
    )
  );
}
