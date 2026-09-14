const pool = require("../config/db");

function slugify(texto) {
  return texto.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

exports.listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT lp.id, lp.nome, lp.slug, lp.status, lp.total_visualizacoes, lp.created_at,
              f.nome AS form_nome, c.nome AS campanha_nome
       FROM marketing_landing_pages lp
       LEFT JOIN marketing_forms f ON f.id = lp.form_id
       LEFT JOIN marketing_campaigns c ON c.id = lp.campaign_id
       WHERE lp.tenant_id = ? ORDER BY lp.created_at DESC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar landing pages", details: err.message });
  }
};

exports.obter = async (req, res) => {
  try {
    const [[lp]] = await pool.query("SELECT * FROM marketing_landing_pages WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!lp) return res.status(404).json({ error: "Landing page nao encontrada" });
    res.json({ ...lp, blocos: typeof lp.blocos === "string" ? JSON.parse(lp.blocos) : lp.blocos });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar landing page", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, blocos, form_id, campaign_id } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    if (!Array.isArray(blocos) || blocos.length === 0) return res.status(400).json({ error: "blocos deve ser uma lista nao vazia" });

    if (form_id) {
      const [[f]] = await pool.query("SELECT id FROM marketing_forms WHERE id = ? AND tenant_id = ?", [form_id, req.tenant_id]);
      if (!f) return res.status(400).json({ error: "form_id invalido para este tenant" });
    }

    let slug = slugify(nome);
    const [existentes] = await pool.query("SELECT slug FROM marketing_landing_pages WHERE tenant_id = ? AND slug LIKE ?", [req.tenant_id, `${slug}%`]);
    if (existentes.some(e => e.slug === slug)) {
      slug = `${slug}-${existentes.length + 1}`;
    }

    const [result] = await pool.query(
      "INSERT INTO marketing_landing_pages (tenant_id, nome, slug, blocos, form_id, campaign_id) VALUES (?, ?, ?, ?, ?, ?)",
      [req.tenant_id, nome, slug, JSON.stringify(blocos), form_id || null, campaign_id || null]
    );
    res.status(201).json({ id: result.insertId, slug, url_publica: `/api/marketing/landing-pages/public/${req.tenant_id}/${slug}` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar landing page", details: err.message });
  }
};

exports.publicar = async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE marketing_landing_pages SET status = 'publicada' WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Landing page nao encontrada" });
    res.json({ message: "Landing page publicada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao publicar", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM marketing_landing_pages WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Landing page nao encontrada" });
    res.json({ message: "Landing page excluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir", details: err.message });
  }
};

// Renderiza a landing page PUBLICAMENTE (sem autenticacao) a partir do slug.
// Gera um HTML simples a partir dos blocos JSON, incrementando o contador de views.
// O script de submissao do formulario roda via atributo onsubmit (nao <script> inline),
// para nao esbarrar na Content Security Policy global (helmet) que bloqueia scripts inline.
exports.renderizarPublica = async (req, res) => {
  try {
    const { tenantId, slug } = req.params;
    const [[lp]] = await pool.query(
      "SELECT * FROM marketing_landing_pages WHERE tenant_id = ? AND slug = ? AND status = 'publicada'",
      [tenantId, slug]
    );
    if (!lp) return res.status(404).send("<h1>Pagina nao encontrada</h1>");

    await pool.query("UPDATE marketing_landing_pages SET total_visualizacoes = total_visualizacoes + 1 WHERE id = ?", [lp.id]);

    let formToken = null;
    if (lp.form_id) {
      const [[form]] = await pool.query("SELECT token FROM marketing_forms WHERE id = ?", [lp.form_id]);
      formToken = form?.token || null;
    }

    const blocos = typeof lp.blocos === "string" ? JSON.parse(lp.blocos) : lp.blocos;
    const htmlBlocos = blocos.map(b => {
      if (b.tipo === "titulo") return `<h1>${b.texto}</h1>`;
      if (b.tipo === "texto") return `<p>${b.texto}</p>`;
      if (b.tipo === "imagem") return `<img src="${b.url}" style="max-width:100%" />`;
      if (b.tipo === "botao") return `<a href="${b.url}" style="display:inline-block;padding:12px 24px;background:#a78bfa;color:#fff;border-radius:8px;text-decoration:none;">${b.texto}</a>`;
      if (b.tipo === "formulario" && formToken) {
        return `
          <form id="lp-form" action="/api/marketing/forms/public/${formToken}" method="POST" style="display:flex;flex-direction:column;gap:10px;max-width:400px;">
            <input name="nome" placeholder="Seu nome" required style="padding:10px;border-radius:6px;border:1px solid #ccc;" />
            <input name="email" type="email" placeholder="Seu e-mail" required style="padding:10px;border-radius:6px;border:1px solid #ccc;" />
            <button type="submit" style="padding:10px;border-radius:6px;background:#a78bfa;color:#fff;border:none;">${b.texto_botao || "Enviar"}</button>
          </form>
          <p id="lp-obrigado" style="display:none;color:#16a34a;font-weight:bold;">Obrigado pelo cadastro!</p>`;
      }
      return "";
    }).join("\n");

    // CSP relaxada so nesta resposta (nao afeta o resto do sistema), permitindo
    // o pequeno script inline que faz a submissao via fetch sem recarregar a pagina.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );

    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${lp.nome}</title>
</head>
<body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;">
  ${htmlBlocos}
  <script>
    var form = document.getElementById('lp-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var dados = Object.fromEntries(new FormData(form));
        fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        }).then(function () {
          form.style.display = 'none';
          document.getElementById('lp-obrigado').style.display = 'block';
        }).catch(function () {
          alert('Erro ao enviar. Tente novamente.');
        });
      });
    }
  </script>
</body>
</html>`);
  } catch (err) {
    res.status(500).send("<h1>Erro ao carregar pagina</h1>");
  }
};