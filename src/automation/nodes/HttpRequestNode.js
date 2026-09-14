const axios = require("axios");
const { resolverTemplate } = require("../engine/TemplateResolver");

module.exports = async (node, context) => {
  const cfg = node.config || {};
  const method = (cfg.method || "GET").toUpperCase();
  const url = resolverTemplate(cfg.url, context);

  const headers = {};
  for (const k in (cfg.headers || {})) headers[k] = resolverTemplate(cfg.headers[k], context);

  const params = {};
  for (const k in (cfg.queryParams || {})) params[k] = resolverTemplate(cfg.queryParams[k], context);

  let data;
  if (cfg.body) {
    const bodyBruto = typeof cfg.body === "string" ? cfg.body : JSON.stringify(cfg.body);
    const bodyResolvido = resolverTemplate(bodyBruto, context);
    try { data = JSON.parse(bodyResolvido); } catch { data = bodyResolvido; }
  }

  const timeout = Number(cfg.timeout) || 15000;
  const maxTentativas = Math.max(1, Number(cfg.retry) || 1);

  let ultimoErro;
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const resp = await axios({ method, url, headers, params, data, timeout, validateStatus: () => true });
      const sucesso = resp.status >= 200 && resp.status < 300;
      return {
        output: { status: resp.status, headers: resp.headers, body: resp.data, ok: sucesso },
        log: `HTTP ${method} ${url} -> ${resp.status}`,
        branch: sucesso ? "success" : "error",
      };
    } catch (err) {
      ultimoErro = err;
      if (tentativa < maxTentativas) await new Promise(r => setTimeout(r, 1000 * tentativa));
    }
  }
  throw new Error(`Falha na requisicao HTTP apos ${maxTentativas} tentativa(s): ${ultimoErro.message}`);
};