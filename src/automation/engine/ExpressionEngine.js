// Motor de expressões das automações. Avalia {{ ... }} SEM usar eval/Function:
// um tokenizer + parser próprios, com lista fechada de variáveis e funções.
// Exemplos: {{ $json.cliente.nome }}   {{ $node["Buscar pedido"].json.total * 0.9 }}
//           {{ upper($json.nome) }}    {{ $json.valor > 100 ? "alto" : "baixo" }}
//           {{ dateFormat(dateAdd($now, 3, "days"), "DD/MM/YYYY") }}

class ErroExpressao extends Error {}

const PROIBIDAS = new Set(["__proto__", "constructor", "prototype"]);
const FUSO = "America/Sao_Paulo";

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
function tokenizar(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let j = i;
      while (j < n && /[0-9]/.test(src[j])) j++;
      if (src[j] === "." && /[0-9]/.test(src[j + 1] || "")) { j++; while (j < n && /[0-9]/.test(src[j])) j++; }
      tokens.push({ t: "num", v: Number(src.slice(i, j)) });
      i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1, out = "";
      while (j < n && src[j] !== c) {
        if (src[j] === "\\" && j + 1 < n) {
          const e = src[j + 1];
          out += e === "n" ? "\n" : e === "t" ? "\t" : e;
          j += 2;
        } else { out += src[j]; j++; }
      }
      if (j >= n) throw new ErroExpressao("texto sem aspas de fechamento");
      tokens.push({ t: "str", v: out });
      i = j + 1; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      tokens.push({ t: "id", v: src.slice(i, j) });
      i = j; continue;
    }
    const tres = src.slice(i, i + 3);
    if (tres === "===" || tres === "!==") { tokens.push({ t: "op", v: tres }); i += 3; continue; }
    const dois = src.slice(i, i + 2);
    if (["||", "&&", "??", "==", "!=", "<=", ">="].includes(dois)) { tokens.push({ t: "op", v: dois }); i += 2; continue; }
    if ("+-*/%<>!".includes(c)) { tokens.push({ t: "op", v: c }); i++; continue; }
    if ("()[].,?:".includes(c)) { tokens.push({ t: "p", v: c }); i++; continue; }
    throw new ErroExpressao(`caractere não permitido: "${c}"`);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser (precedência) -> AST
// ---------------------------------------------------------------------------
const PREC = { "??": 1, "||": 2, "&&": 3, "==": 4, "!=": 4, "===": 4, "!==": 4, "<": 5, "<=": 5, ">": 5, ">=": 5, "+": 6, "-": 6, "*": 7, "/": 7, "%": 7 };

function parsear(tokens) {
  let pos = 0;
  const ver = () => tokens[pos];
  const pegar = () => tokens[pos++];
  const ehP = v => ver() && ver().t === "p" && ver().v === v;
  const exigirP = v => { if (!ehP(v)) throw new ErroExpressao(`esperado "${v}"`); pos++; };

  function ternario() {
    const cond = binario(1);
    if (ehP("?")) {
      pos++;
      const a = ternario();
      exigirP(":");
      const b = ternario();
      return { k: "tern", cond, a, b };
    }
    return cond;
  }

  function binario(min) {
    let esq = unario();
    for (;;) {
      const tk = ver();
      if (!tk || tk.t !== "op" || !(tk.v in PREC) || PREC[tk.v] < min) break;
      pos++;
      const dir = binario(PREC[tk.v] + 1);
      esq = { k: "bin", op: tk.v, esq, dir };
    }
    return esq;
  }

  function unario() {
    const tk = ver();
    if (tk && tk.t === "op" && (tk.v === "!" || tk.v === "-")) { pos++; return { k: "un", op: tk.v, x: unario() }; }
    return posfixo();
  }

  function posfixo() {
    let no = primario();
    for (;;) {
      if (ehP(".")) {
        pos++;
        const id = pegar();
        if (!id || id.t !== "id") throw new ErroExpressao('esperado nome depois de "."');
        no = { k: "mem", obj: no, chave: { k: "lit", v: id.v } };
      } else if (ehP("[")) {
        pos++;
        const idx = ternario();
        exigirP("]");
        no = { k: "mem", obj: no, chave: idx };
      } else break;
    }
    return no;
  }

  function primario() {
    const tk = pegar();
    if (!tk) throw new ErroExpressao("expressão incompleta");
    if (tk.t === "num" || tk.t === "str") return { k: "lit", v: tk.v };
    if (tk.t === "p" && tk.v === "(") { const e = ternario(); exigirP(")"); return e; }
    if (tk.t === "id") {
      if (tk.v === "true") return { k: "lit", v: true };
      if (tk.v === "false") return { k: "lit", v: false };
      if (tk.v === "null") return { k: "lit", v: null };
      if (ehP("(")) {
        pos++;
        const args = [];
        if (!ehP(")")) { for (;;) { args.push(ternario()); if (ehP(",")) { pos++; continue; } break; } }
        exigirP(")");
        return { k: "call", nome: tk.v, args };
      }
      return { k: "var", nome: tk.v };
    }
    throw new ErroExpressao(`símbolo inesperado: "${tk.v}"`);
  }

  const ast = ternario();
  if (pos < tokens.length) throw new ErroExpressao(`sobrou texto depois da expressão: "${tokens[pos].v}"`);
  return ast;
}

// ---------------------------------------------------------------------------
// Funções permitidas
// ---------------------------------------------------------------------------
const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const str = v => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
const data = v => { const d = v instanceof Date ? v : new Date(v); if (Number.isNaN(d.getTime())) throw new ErroExpressao(`data inválida: ${str(v)}`); return d; };

function formatarData(d, fmt) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map(x => [x.type, x.value]));
  return String(fmt || "DD/MM/YYYY HH:mm").replace(/YYYY|MM|DD|HH|mm|ss/g, t => ({ YYYY: p.year, MM: p.month, DD: p.day, HH: p.hour, mm: p.minute, ss: p.second }[t]));
}

const FUNCOES = {
  upper: v => str(v).toUpperCase(),
  lower: v => str(v).toLowerCase(),
  trim: v => str(v).trim(),
  length: v => (Array.isArray(v) || typeof v === "string" ? v.length : v && typeof v === "object" ? Object.keys(v).length : 0),
  round: (v, d = 0) => { const f = 10 ** num(d); return Math.round(num(v) * f) / f; },
  floor: v => Math.floor(num(v)),
  ceil: v => Math.ceil(num(v)),
  abs: v => Math.abs(num(v)),
  min: (...a) => Math.min(...a.flat().map(num)),
  max: (...a) => Math.max(...a.flat().map(num)),
  sum: (...a) => a.flat().reduce((s, x) => s + num(x), 0),
  toNumber: v => num(v),
  toString: v => str(v),
  join: (arr, sep = ",") => (Array.isArray(arr) ? arr.map(str).join(str(sep)) : ""),
  split: (s, sep = ",") => str(s).split(str(sep)),
  replace: (s, a, b) => str(s).split(str(a)).join(str(b)),
  contains: (a, b) => (Array.isArray(a) ? a.some(x => x == b) : str(a).includes(str(b))),
  startsWith: (a, b) => str(a).startsWith(str(b)),
  endsWith: (a, b) => str(a).endsWith(str(b)),
  default: (v, f) => (v === null || v === undefined || v === "" ? f : v),
  coalesce: (...a) => a.find(v => v !== null && v !== undefined && v !== ""),
  isEmpty: v => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0),
  first: a => (Array.isArray(a) ? a[0] : undefined),
  last: a => (Array.isArray(a) ? a[a.length - 1] : undefined),
  slice: (a, i, j) => (Array.isArray(a) || typeof a === "string" ? a.slice(num(i), j === undefined ? undefined : num(j)) : undefined),
  keys: o => (o && typeof o === "object" ? Object.keys(o) : []),
  json: v => JSON.stringify(v === undefined ? null : v),
  now: () => new Date().toISOString(),
  dateAdd: (d, n, unit = "days") => {
    const base = data(d);
    const q = num(n);
    const ms = { seconds: 1e3, minutes: 6e4, hours: 36e5, days: 864e5 }[unit];
    if (ms) return new Date(base.getTime() + q * ms).toISOString();
    const r = new Date(base.getTime());
    if (unit === "months") r.setUTCMonth(r.getUTCMonth() + q);
    else if (unit === "years") r.setUTCFullYear(r.getUTCFullYear() + q);
    else throw new ErroExpressao(`unidade de tempo inválida: ${unit}`);
    return r.toISOString();
  },
  dateFormat: (d, fmt) => formatarData(data(d), fmt),
  formatBRL: v => `R$ ${num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
};

// ---------------------------------------------------------------------------
// Avaliação
// ---------------------------------------------------------------------------
function acessar(obj, chave) {
  if (obj === null || obj === undefined) return undefined;
  const k = typeof chave === "number" ? chave : String(chave);
  if (typeof k === "string" && PROIBIDAS.has(k)) return undefined;
  if ((Array.isArray(obj) || typeof obj === "string") && k === "length") return obj.length;
  if (typeof obj !== "object") return undefined;
  return Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : undefined;
}

function variavel(nome, ctx) {
  switch (nome) {
    case "$json": case "$input": return ctx.ultimoOutput;
    case "$trigger": return ctx.trigger || {};
    case "$execution": return { id: ctx.executionId ?? null };
    case "$vars": return ctx.vars || {};
    case "$index": return ctx.itemIndex ?? 0;
    case "$now": return new Date().toISOString();
    case "$today": return formatarData(new Date(), "YYYY-MM-DD");
    case "$node": {
      const out = {};
      for (const [id, reg] of Object.entries(ctx.nodes || {})) {
        const v = { json: reg.output, output: reg.output, label: reg.label, type: reg.type, id };
        out[id] = v;
        if (reg.label && !(reg.label in out)) out[reg.label] = v;
      }
      return out;
    }
    default: throw new ErroExpressao(`variável desconhecida: ${nome}`);
  }
}

function avaliar(no, ctx) {
  switch (no.k) {
    case "lit": return no.v;
    case "var": return variavel(no.nome, ctx);
    case "mem": return acessar(avaliar(no.obj, ctx), avaliar(no.chave, ctx));
    case "un": { const v = avaliar(no.x, ctx); return no.op === "!" ? !v : -num(v); }
    case "tern": return avaliar(no.cond, ctx) ? avaliar(no.a, ctx) : avaliar(no.b, ctx);
    case "call": {
      const f = Object.prototype.hasOwnProperty.call(FUNCOES, no.nome) ? FUNCOES[no.nome] : null;
      if (!f) throw new ErroExpressao(`função desconhecida: ${no.nome}`);
      return f(...no.args.map(a => avaliar(a, ctx)));
    }
    case "bin": {
      if (no.op === "&&") { const a = avaliar(no.esq, ctx); return a ? avaliar(no.dir, ctx) : a; }
      if (no.op === "||") { const a = avaliar(no.esq, ctx); return a ? a : avaliar(no.dir, ctx); }
      if (no.op === "??") { const a = avaliar(no.esq, ctx); return a === null || a === undefined ? avaliar(no.dir, ctx) : a; }
      const a = avaliar(no.esq, ctx), b = avaliar(no.dir, ctx);
      switch (no.op) {
        case "+": return typeof a === "string" || typeof b === "string" ? str(a) + str(b) : num(a) + num(b);
        case "-": return num(a) - num(b);
        case "*": return num(a) * num(b);
        case "/": return num(b) === 0 ? null : num(a) / num(b);
        case "%": return num(b) === 0 ? null : num(a) % num(b);
        case "==": return a == b; // eslint-disable-line eqeqeq
        case "!=": return a != b; // eslint-disable-line eqeqeq
        case "===": return a === b;
        case "!==": return a !== b;
        case "<": return a < b;
        case "<=": return a <= b;
        case ">": return a > b;
        case ">=": return a >= b;
        default: throw new ErroExpressao(`operador inválido: ${no.op}`);
      }
    }
    default: throw new ErroExpressao("expressão inválida");
  }
}

const cache = new Map();
function compilar(src) {
  let ast = cache.get(src);
  if (!ast) {
    ast = parsear(tokenizar(src));
    if (cache.size > 500) cache.clear();
    cache.set(src, ast);
  }
  return ast;
}

function avaliarExpressao(src, ctx) {
  if (String(src).length > 2000) throw new ErroExpressao("expressão longa demais");
  return avaliar(compilar(String(src)), ctx || {});
}

module.exports = { avaliarExpressao, ErroExpressao, FUNCOES, str };
