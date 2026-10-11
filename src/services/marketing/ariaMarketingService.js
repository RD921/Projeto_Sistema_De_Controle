// A Aria no Marketing. Tudo parte de dados reais do sistema:
//  - contexto(): foto atual do negócio (leads, funil, canais, campanhas, clientes, pedidos)
//  - gerarRecomendacoes(): detectores com regras explícitas que geram alertas explicados e priorizados
//  - gerarEstrategia(): plano de ação a partir de um pedido em linguagem natural (Gemini quando
//    disponível, regras quando não), validado antes de ser mostrado
//  - planejarAquisicao(): cenários estimados a partir do histórico (nunca promessa de resultado)
const pool = require("../../config/db");
const gemini = require("../geminiService");
const { perfilParaAria } = require("../onboardingIAService");
const { prepararTenant } = require("../marketingSchema");
const analytics = require("./analyticsService");
const recovery = require("./recoveryService");
const { criarTarefa } = require("./taskService");
const { ErroValidacao } = require("./leadService");

const MIN_LEADS = 30;
const MIN_CLIENTES = 3;
const num = v => Number(v || 0);
const brl = v => `R$ ${num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cortar = (v, max) => String(v ?? "").trim().slice(0, max);

function confianca(amostra) {
  return Math.round(Math.min(90, 35 + 12 * Math.log2(num(amostra) + 1)));
}

// ---------------------------------------------------------------------------
// Contexto real
// ---------------------------------------------------------------------------
async function contexto(tenantId, dias = 90) {
  await prepararTenant(tenantId);
  const r = await analytics.resumo(tenantId, { dias });
  const opor = await recovery.oportunidades(tenantId, { detalhes: false });
  const [[ped]] = await pool.query(
    `SELECT COUNT(*) AS pedidos, COALESCE(SUM(CASE WHEN status = 'pago' THEN total END), 0) AS receita,
            COUNT(DISTINCT customer_id) AS clientes_que_compraram
     FROM orders WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [tenantId, dias]);
  const [[cli]] = await pool.query("SELECT COUNT(*) AS n FROM customers WHERE tenant_id = ? AND ativo = 1", [tenantId]);
  const [produtos] = await pool.query(
    `SELECT p.nome, COALESCE(SUM(oi.quantidade), 0) AS vendidos FROM products p
     LEFT JOIN order_items oi ON oi.product_id = p.id LEFT JOIN orders o ON o.id = oi.order_id AND o.tenant_id = ?
     WHERE p.tenant_id = ? GROUP BY p.id, p.nome ORDER BY vendidos DESC LIMIT 8`, [tenantId, tenantId]);
  const k = r.kpis;
  const leads = k.leads_captados.valor, clientes = k.clientes_adquiridos.valor;
  const lacunas = [];
  if (r.dados.leads_total < MIN_LEADS) lacunas.push(`Poucos leads cadastrados (${r.dados.leads_total}; o ideal é ${MIN_LEADS}+ para tirar conclusões).`);
  if (clientes < MIN_CLIENTES) lacunas.push(`Poucos clientes convertidos no período (${clientes}; o ideal é ${MIN_CLIENTES}+).`);
  if (r.dados.registros_de_investimento === 0) lacunas.push("Nenhum investimento em marketing informado: não dá para calcular CAC, ROAS e ROI.");
  if (r.dados.leads_total > 0 && r.dados.leads_com_campanha / r.dados.leads_total < 0.3) lacunas.push("A maioria dos leads não tem campanha/origem rastreada.");
  return {
    periodo_dias: dias,
    kpis: Object.fromEntries(Object.entries(k).map(([nome, v]) => [nome, { valor: v.valor, anterior: v.anterior, variacao_pct: v.variacao_pct, tipo: v.tipo }])),
    funil: r.funil && { etapas: r.funil.etapas.map(e => ({ etapa: e.nome, alcancaram: e.alcancaram, pct_desistencia: e.pct_desistencia })), gargalo: r.funil.gargalo, amostra_suficiente: r.funil.amostra_suficiente },
    canais: r.canais,
    campanhas: r.campanhas.slice(0, 10).map(c => ({ nome: c.nome, status: c.status, canal: c.canal, leads: c.leads, clientes: c.clientes, investimento: c.investimento, custo_por_cliente: c.custo_por_cliente, roas: c.roas })),
    leads_prioritarios: r.leads_prioritarios.map(l => ({ nome: l.nome, score: l.score, temperatura: l.temperatura, status: l.status, explicacao: l.explicacao })),
    recuperacao: opor.map(o => ({ tipo: o.nome, quantidade: o.quantidade, valor_potencial: o.valor_potencial, tipo_metrica: o.tipo_metrica })),
    loja: { pedidos: num(ped.pedidos), receita_paga: num(ped.receita), clientes_que_compraram: num(ped.clientes_que_compraram), clientes_ativos_cadastrados: num(cli.n), produtos_mais_vendidos: produtos.map(p => ({ nome: p.nome, vendidos: num(p.vendidos) })) },
    dados_suficientes: lacunas.length === 0,
    lacunas,
  };
}

// ---------------------------------------------------------------------------
// Recomendações (alertas explicados, priorizados)
// ---------------------------------------------------------------------------
const PESO_IMPACTO = { baixo: 1, medio: 2, alto: 3 };
const PESO_ESFORCO = { baixo: 1, medio: 1.5, alto: 2 };
const prioridadeDe = r => Math.round((PESO_IMPACTO[r.impacto] * r.confianca) / PESO_ESFORCO[r.esforco]);

async function detectarRecomendacoes(tenantId) {
  const r = await analytics.resumo(tenantId, { dias: 30 });
  const k = r.kpis;
  const recs = [];

  // 1) Leads quentes sem contato
  const [[quentes]] = await pool.query(
    `SELECT COUNT(*) AS n, COALESCE(SUM(valor_estimado), 0) AS valor FROM marketing_leads
     WHERE tenant_id = ? AND temperatura = 'quente' AND status IN ('novo','contactado','engajado','qualificado') AND deal_id IS NULL
       AND COALESCE(ultimo_contato_em, created_at) <= DATE_SUB(NOW(), INTERVAL 2 DAY)`, [tenantId]);
  if (num(quentes.n) > 0) {
    recs.push({
      chave: "leads_quentes_sem_contato", tipo: "conversao", impacto: "alto", esforco: "baixo", confianca: 85,
      titulo: `Contatar ${quentes.n} lead(s) quente(s) parado(s)`,
      descricao: "Leads com pontuação alta e sem contato há 2 dias ou mais esfriam rápido.",
      motivo: `${quentes.n} lead(s) com temperatura quente estão sem interação há 2+ dias${num(quentes.valor) ? `, somando ${brl(quentes.valor)} em negócios estimados` : ""}. Contagem direta do sistema.`,
      dados: { quantidade: num(quentes.n), valor_estimado: num(quentes.valor) },
      tarefas: [{ titulo: `Contatar os ${quentes.n} leads quentes sem retorno`, descricao: "Abra Leads & Campanhas, filtre por temperatura quente e registre cada contato.", prioridade: "alta", prazo_dias: 1 }],
    });
  }

  // 2) Gargalo do funil
  if (r.funil?.gargalo) {
    const g = r.funil.gargalo;
    recs.push({
      chave: "gargalo_funil", tipo: "funil", impacto: "alto", esforco: "medio", confianca: confianca(r.funil.total_leads),
      titulo: `Gargalo no funil: etapa "${g.etapa}"`,
      descricao: "É onde mais potenciais clientes desistem entre uma etapa e a seguinte.",
      motivo: `Nos últimos 30 dias, ${g.pct_desistencia}% dos leads que chegaram em "${g.etapa}" não avançaram (${g.desistencias} de ${r.funil.etapas.find(e => e.id === g.etapa_id)?.alcancaram}).`,
      dados: g,
      tarefas: [{ titulo: `Revisar o processo na etapa "${g.etapa}"`, descricao: "Veja os leads parados nesta etapa, entenda o motivo e ajuste abordagem, prazo de resposta ou oferta.", prioridade: "alta", prazo_dias: 5 }],
    });
  }

  // 3) Queda de conversão
  const tc = k.taxa_conversao;
  if (tc.valor !== null && tc.anterior !== null && tc.variacao_pct !== null && tc.variacao_pct <= -20 && k.leads_captados.valor >= 20 && k.leads_captados.anterior >= 20) {
    recs.push({
      chave: "queda_conversao", tipo: "conversao", impacto: "alto", esforco: "medio", confianca: confianca(Math.min(k.leads_captados.valor, k.leads_captados.anterior)),
      titulo: "A conversão de leads caiu",
      descricao: "A taxa de leads que viram clientes está menor que no período anterior.",
      motivo: `Taxa de conversão foi de ${tc.anterior}% para ${tc.valor}% (${tc.variacao_pct}%). Comparação entre os últimos 30 dias e os 30 anteriores, com ${k.leads_captados.valor} e ${k.leads_captados.anterior} leads.`,
      dados: { atual: tc.valor, anterior: tc.anterior },
      tarefas: [{ titulo: "Investigar a queda de conversão (por canal e por campanha)", descricao: "Compare a conversão por canal em Análises & ROI e veja se a queda está concentrada em algum canal.", prioridade: "alta", prazo_dias: 3 }],
    });
  }

  // 4) CAC subiu
  const cac = k.cac;
  if (cac.valor !== null && cac.anterior !== null && cac.variacao_pct !== null && cac.variacao_pct >= 25 && k.clientes_adquiridos.valor >= MIN_CLIENTES && k.clientes_adquiridos.anterior >= MIN_CLIENTES) {
    recs.push({
      chave: "cac_subiu", tipo: "custo", impacto: "alto", esforco: "medio", confianca: confianca(Math.min(k.clientes_adquiridos.valor, k.clientes_adquiridos.anterior)),
      titulo: "O custo para conquistar cada cliente subiu",
      descricao: "O CAC está bem acima do período anterior.",
      motivo: `CAC foi de ${brl(cac.anterior)} para ${brl(cac.valor)} (+${cac.variacao_pct}%). É um valor calculado: investimento informado ÷ clientes adquiridos.`,
      dados: { atual: cac.valor, anterior: cac.anterior },
      tarefas: [{ titulo: "Revisar onde o investimento está rendendo menos", descricao: "Compare custo por cliente de cada campanha em Análises & ROI e reduza a verba das piores.", prioridade: "alta", prazo_dias: 5, externo: true }],
    });
  }

  // 5) Campanha com baixo desempenho
  for (const c of r.campanhas.filter(x => x.status === "ativa" && x.investimento > 0 && x.leads >= 15 && x.clientes === 0)) {
    recs.push({
      chave: `campanha_fraca_${c.id}`, tipo: "campanha", impacto: "medio", esforco: "baixo", confianca: confianca(c.leads), custo_estimado: c.investimento,
      titulo: `Campanha "${c.nome}" gastou e não converteu`,
      descricao: "Há investimento e leads captados, mas nenhum cliente no período.",
      motivo: `${c.leads} leads e ${brl(c.investimento)} investidos nos últimos 30 dias, com 0 clientes.`,
      dados: { campanha_id: c.id, leads: c.leads, investimento: c.investimento },
      tarefas: [{ titulo: `Revisar ou pausar a campanha "${c.nome}"`, descricao: "Confira se os leads estão sendo atendidos e se a oferta está alinhada ao público.", prioridade: "media", prazo_dias: 3, externo: true }],
    });
  }

  // 6) Canal promissor
  const totL = r.canais.reduce((a, c) => a + c.leads, 0), totC = r.canais.reduce((a, c) => a + c.clientes, 0);
  if (r.canais.length >= 2 && totL >= MIN_LEADS && totC >= MIN_CLIENTES) {
    const geral = totC / totL;
    const melhor = r.canais.filter(c => c.canal !== "Não informado" && c.leads >= 10 && c.clientes >= 2 && c.clientes / c.leads >= geral * 1.5).sort((a, b) => b.taxa_conversao_pct - a.taxa_conversao_pct)[0];
    if (melhor) {
      recs.push({
        chave: `canal_promissor_${melhor.canal.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}`, tipo: "crescimento", impacto: "alto", esforco: "medio", confianca: confianca(melhor.leads),
        titulo: `Canal promissor: ${melhor.canal}`,
        descricao: "Esse canal converte bem acima da média da empresa.",
        motivo: `${melhor.canal} converte ${melhor.taxa_conversao_pct}% (${melhor.clientes} de ${melhor.leads} leads) contra ${(geral * 100).toFixed(1)}% da média geral nos últimos 30 dias.`,
        dados: melhor,
        tarefas: [{ titulo: `Testar mais investimento em ${melhor.canal}`, descricao: "Aumente a verba de forma gradual (ex: +20%) e acompanhe a conversão por 2 semanas.", prioridade: "media", prazo_dias: 7, externo: true }],
      });
    }
  }

  // 7) Oportunidades de recuperação
  const opor = await recovery.oportunidades(tenantId, { detalhes: false });
  const comItens = opor.filter(o => o.quantidade > 0);
  if (comItens.length) {
    const total = comItens.reduce((a, o) => a + o.valor_potencial, 0);
    recs.push({
      chave: "recuperacao_oportunidades", tipo: "recuperacao", impacto: total >= 1000 ? "alto" : "medio", esforco: "baixo", confianca: comItens.every(o => o.tipo_metrica === "observado") ? 80 : 60,
      titulo: `${comItens.reduce((a, o) => a + o.quantidade, 0)} oportunidade(s) parada(s) para recuperar`,
      descricao: "Leads, negociações, clientes e pedidos que as regras de recuperação marcaram.",
      motivo: comItens.map(o => `${o.nome}: ${o.quantidade} (${brl(o.valor_potencial)}${o.tipo_metrica === "estimado" ? ", estimado" : ""})`).join("; ") + ".",
      dados: { grupos: comItens.map(o => ({ tipo: o.tipo, quantidade: o.quantidade, valor_potencial: o.valor_potencial })) },
      tarefas: [{ titulo: "Abordar as oportunidades da tela Recuperação de Oportunidades", descricao: "Execute as regras para gerar uma tarefa por oportunidade e distribua entre o time.", prioridade: "alta", prazo_dias: 2 }],
    });
  }

  // 8) Qualidade dos dados
  if (r.dados.leads_total >= 5 && r.dados.registros_de_investimento === 0) {
    recs.push({
      chave: "informar_investimento", tipo: "dados", impacto: "medio", esforco: "baixo", confianca: 95,
      titulo: "Informe quanto você investe em marketing",
      descricao: "Sem o investimento, CAC, custo por lead, ROAS e ROI não podem ser calculados.",
      motivo: `Existem ${r.dados.leads_total} leads, mas nenhum lançamento de investimento.`,
      dados: {}, tarefas: [{ titulo: "Lançar os investimentos do mês em Análises & ROI", prioridade: "media", prazo_dias: 3 }],
    });
  }
  if (r.dados.leads_total >= 10 && r.dados.leads_com_campanha / r.dados.leads_total < 0.3) {
    recs.push({
      chave: "rastrear_origem", tipo: "dados", impacto: "medio", esforco: "baixo", confianca: 90,
      titulo: "A maioria dos leads não tem origem rastreada",
      descricao: "Sem campanha/UTM, não dá para saber o que realmente traz clientes.",
      motivo: `Só ${r.dados.leads_com_campanha} de ${r.dados.leads_total} leads têm campanha associada.`,
      dados: {}, tarefas: [{ titulo: "Criar links rastreáveis para cada canal em Alcance & Métricas", prioridade: "media", prazo_dias: 3 }],
    });
  }

  return recs.map(x => ({ ...x, prioridade: prioridadeDe(x) }));
}

async function gerarRecomendacoes(tenantId) {
  await prepararTenant(tenantId);
  const recs = await detectarRecomendacoes(tenantId);
  const chaves = recs.map(r => r.chave);
  for (const r of recs) {
    const [[atual]] = await pool.query("SELECT id, status, updated_at FROM marketing_recommendations WHERE tenant_id = ? AND chave = ?", [tenantId, r.chave]);
    const dias = atual ? (Date.now() - new Date(atual.updated_at).getTime()) / 86400000 : 0;
    // descartada fica descartada por 7 dias; aceita volta a aparecer depois de 14 dias se o problema persistir
    const status = !atual ? "pendente" : (atual.status === "descartada" && dias < 7) || (atual.status === "aceita" && dias < 14) ? atual.status : "pendente";
    const campos = [tenantId, r.tipo, r.titulo, r.descricao, r.motivo, r.impacto, r.esforco, r.confianca, r.custo_estimado || null, r.prioridade, JSON.stringify(r.dados || {}), JSON.stringify(r.tarefas || []), status, r.chave];
    await pool.query(
      `INSERT INTO marketing_recommendations (tenant_id, tipo, titulo, descricao, motivo, impacto, esforco, confianca, custo_estimado, prioridade, dados, tarefas, status, chave)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), titulo = VALUES(titulo), descricao = VALUES(descricao), motivo = VALUES(motivo), impacto = VALUES(impacto),
         esforco = VALUES(esforco), confianca = VALUES(confianca), custo_estimado = VALUES(custo_estimado), prioridade = VALUES(prioridade),
         dados = VALUES(dados), tarefas = VALUES(tarefas), status = VALUES(status)`, campos);
  }
  // Pendentes que deixaram de valer somem da lista
  if (chaves.length) await pool.query("DELETE FROM marketing_recommendations WHERE tenant_id = ? AND status = 'pendente' AND chave NOT IN (?)", [tenantId, chaves]);
  else await pool.query("DELETE FROM marketing_recommendations WHERE tenant_id = ? AND status = 'pendente'", [tenantId]);
  return listarRecomendacoes(tenantId);
}

async function listarRecomendacoes(tenantId, { status = "pendente" } = {}) {
  const [rows] = await pool.query(
    "SELECT * FROM marketing_recommendations WHERE tenant_id = ? AND status = ? ORDER BY prioridade DESC, id DESC LIMIT 50", [tenantId, status]);
  return rows.map(r => ({
    ...r, dados: typeof r.dados === "string" ? JSON.parse(r.dados) : r.dados, tarefas: typeof r.tarefas === "string" ? JSON.parse(r.tarefas) : r.tarefas,
    custo_estimado: r.custo_estimado === null ? null : num(r.custo_estimado),
  }));
}

async function aceitarRecomendacao(tenantId, id, { userId } = {}) {
  const [[rec]] = await pool.query("SELECT * FROM marketing_recommendations WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!rec) return null;
  if (rec.status === "aceita") throw new ErroValidacao("Esta recomendação já foi aceita");
  const tarefas = typeof rec.tarefas === "string" ? JSON.parse(rec.tarefas) : (rec.tarefas || []);
  let criadas = 0;
  for (let i = 0; i < tarefas.length; i++) {
    const t = tarefas[i];
    const r = await criarTarefa(tenantId, { ...t, origem: "aria", requer_aprovacao: !!t.externo, recomendacao_id: rec.id, chave: `rec:${rec.chave}:${i}` }, { userId });
    if (!r.duplicada) criadas++;
  }
  await pool.query("UPDATE marketing_recommendations SET status = 'aceita' WHERE id = ?", [id]);
  return { tarefas_criadas: criadas };
}

async function descartarRecomendacao(tenantId, id) {
  const [r] = await pool.query("UPDATE marketing_recommendations SET status = 'descartada' WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return r.affectedRows > 0;
}

// ---------------------------------------------------------------------------
// Estratégia a partir de um pedido em linguagem natural
// ---------------------------------------------------------------------------
function intencao(pedido) {
  const t = pedido.toLowerCase();
  if (/recuper|inativ|reativ|voltem|voltar a comprar|abandon/.test(t)) return "recuperacao";
  if (/convers|converter|taxa de/.test(t)) return "conversao";
  if (/recompra|fideliz|comprar novamente|comprem de novo/.test(t)) return "recompra";
  if (/novos clientes|mais clientes|captar|conquistar|aquisi|leads|atrair/.test(t)) return "aquisicao";
  if (/vender mais|produto|promo|oferta/.test(t)) return "produto";
  return "geral";
}

function metaNumerica(pedido) {
  const m = pedido.match(/(\d{1,6})\s*(novos?\s+)?(clientes|leads|vendas|pedidos)/i);
  return m ? Number(m[1]) : null;
}

function planoPorRegras(pedido, ctx) {
  const tipo = intencao(pedido);
  const k = ctx.kpis;
  const melhorCanal = [...ctx.canais].filter(c => c.canal !== "Não informado" && c.clientes > 0).sort((a, b) => b.taxa_conversao_pct - a.taxa_conversao_pct)[0];
  const meta = metaNumerica(pedido);
  const produto = ctx.loja.produtos_mais_vendidos.find(p => pedido.toLowerCase().includes(p.nome.toLowerCase()));
  const base = { diagnostico: [], canais: [], etapas: [], metas: [], indicadores: [], experimentos: [], riscos: [] };

  base.diagnostico.push(`Nos últimos ${ctx.periodo_dias} dias: ${k.leads_captados.valor} leads, ${k.clientes_adquiridos.valor} clientes adquiridos, conversão de ${k.taxa_conversao.valor ?? "—"}%.`);
  if (ctx.funil?.gargalo) base.diagnostico.push(`Maior perda no funil: etapa "${ctx.funil.gargalo.etapa}" (${ctx.funil.gargalo.pct_desistencia}% não avançam).`);
  if (melhorCanal) base.diagnostico.push(`Canal que melhor converte hoje: ${melhorCanal.canal} (${melhorCanal.taxa_conversao_pct}%).`);
  if (!ctx.dados_suficientes) base.riscos.push("Os dados ainda são limitados; trate as metas como ponto de partida e revise em 30 dias.");
  base.riscos.push("Resultados dependem de execução e orçamento; nenhuma meta aqui é garantia.");

  if (tipo === "recuperacao" || tipo === "recompra") {
    const rec = ctx.recuperacao.filter(r => r.quantidade > 0);
    base.titulo = tipo === "recompra" ? "Plano de recompra" : "Plano de recuperação de clientes e oportunidades";
    base.publico_alvo = "Clientes inativos, clientes com padrão de recompra, leads parados e pedidos pendentes.";
    base.diagnostico.push(rec.length ? `Oportunidades encontradas: ${rec.map(r => `${r.tipo} (${r.quantidade})`).join("; ")}.` : "Nenhuma oportunidade de recuperação encontrada pelas regras atuais.");
    base.canais = [{ canal: "WhatsApp ou e-mail (conforme o que você já usa com o cliente)", motivo: "Contato direto com quem já conhece a empresa costuma ter melhor custo-benefício." }];
    base.etapas = [
      { titulo: "Levantar quem recuperar", descricao: "Use a tela Recuperação de Oportunidades para ver cada grupo e o valor em jogo.", prazo_dias: 2, tarefas: [{ titulo: "Executar as regras de recuperação e revisar a lista", prioridade: "alta", prazo_dias: 2 }] },
      { titulo: "Abordar", descricao: "Contato personalizado, citando a última compra ou conversa.", prazo_dias: 7, tarefas: [
        { titulo: "Abordar os clientes inativos de maior valor", prioridade: "alta", prazo_dias: 5 },
        { titulo: "Aprovar e ativar uma automação de reativação por e-mail", descricao: "Crie em Automações usando o evento 'Oportunidade de recuperação'.", prioridade: "media", prazo_dias: 7, externo: true } ] },
      { titulo: "Medir", descricao: "Acompanhe quantos voltaram a comprar.", prazo_dias: 30, tarefas: [{ titulo: "Comparar clientes reativados com a lista inicial", prioridade: "media", prazo_dias: 30 }] },
    ];
    base.metas = [{ indicador: "Clientes adquiridos", meta: null, prazo_dias: 30 }];
  } else if (tipo === "conversao") {
    base.titulo = "Plano para melhorar a conversão";
    base.publico_alvo = "Leads já captados que ainda não converteram.";
    base.etapas = [
      { titulo: "Achar o ponto de perda", descricao: ctx.funil?.gargalo ? `Comece pela etapa "${ctx.funil.gargalo.etapa}".` : "Ainda não há volume para apontar a etapa; registre mais movimentações de leads.", prazo_dias: 3, tarefas: [{ titulo: "Revisar os leads parados na etapa com maior perda", prioridade: "alta", prazo_dias: 3 }] },
      { titulo: "Responder mais rápido", descricao: "Leads quentes devem ser contatados em até 1 dia.", prazo_dias: 7, tarefas: [{ titulo: "Definir responsável e prazo de resposta para leads quentes", prioridade: "alta", prazo_dias: 2 }] },
      { titulo: "Testar", descricao: "Compare duas mensagens ou ofertas com um teste A/B.", prazo_dias: 21, tarefas: [{ titulo: "Criar um teste A/B de mensagem (duas automações)", prioridade: "media", prazo_dias: 10, externo: true }] },
    ];
    base.experimentos = [{ hipotese: "Resposta em menos de 24h aumenta a conversão dos leads quentes.", como_medir: "Conversão dos leads quentes contatados em até 1 dia vs. os demais." }];
    base.metas = [{ indicador: "Taxa de conversão", meta: null, prazo_dias: 60 }];
  } else if (tipo === "produto" && produto) {
    base.titulo = `Plano para vender mais: ${produto.nome}`;
    base.publico_alvo = `Clientes atuais e leads com interesse parecido com "${produto.nome}".`;
    base.diagnostico.push(`"${produto.nome}" vendeu ${produto.vendidos} unidade(s) no histórico.`);
    base.etapas = [
      { titulo: "Escolher a oferta", descricao: "Defina condição (desconto, brinde, frete) e prazo.", prazo_dias: 3, tarefas: [{ titulo: `Definir a oferta para ${produto.nome}`, prioridade: "alta", prazo_dias: 3 }] },
      { titulo: "Criar o público", descricao: "Segmento dinâmico com clientes que já compraram ou demonstraram interesse.", prazo_dias: 5, tarefas: [{ titulo: "Criar o segmento em Públicos", prioridade: "media", prazo_dias: 5 }] },
      { titulo: "Divulgar", descricao: "Campanha no canal que melhor converte.", prazo_dias: 10, tarefas: [{ titulo: `Aprovar e publicar a campanha de ${produto.nome}`, prioridade: "alta", prazo_dias: 10, externo: true }] },
    ];
    base.metas = [{ indicador: "Receita atribuída", meta: null, prazo_dias: 30 }];
  } else {
    base.titulo = meta ? `Plano para conquistar ${meta} novos clientes` : "Plano de captação de clientes";
    base.publico_alvo = "Perfil dos clientes que mais compram hoje, ampliado para quem ainda não conhece a empresa.";
    base.canais = melhorCanal
      ? [{ canal: melhorCanal.canal, motivo: `Maior conversão atual (${melhorCanal.taxa_conversao_pct}%).` }, { canal: "Indicação de clientes atuais", motivo: "Costuma ter custo baixo e boa conversão; vale testar." }]
      : [{ canal: "Escolha 2 canais para começar", motivo: "Ainda não há dados para apontar o melhor canal; teste dois e meça com links rastreáveis." }];
    base.etapas = [
      { titulo: "Preparar a captação", descricao: "Links rastreáveis e formulário/landing page prontos antes de investir.", prazo_dias: 7, tarefas: [
        { titulo: "Criar links rastreáveis para cada canal", prioridade: "alta", prazo_dias: 3 },
        { titulo: "Publicar uma landing page com formulário", prioridade: "alta", prazo_dias: 7 } ] },
      { titulo: "Atrair", descricao: "Campanhas nos canais escolhidos, começando com orçamento pequeno.", prazo_dias: 21, tarefas: [{ titulo: "Aprovar orçamento e iniciar campanhas de captação", prioridade: "alta", prazo_dias: 14, externo: true }] },
      { titulo: "Converter", descricao: "Atender rápido e acompanhar o funil.", prazo_dias: 30, tarefas: [{ titulo: "Revisar o funil semanalmente e contatar leads quentes", prioridade: "alta", prazo_dias: 7 }] },
    ];
    base.experimentos = [{ hipotese: "Um segundo canal pode ter custo por cliente menor que o atual.", como_medir: "Custo por cliente por canal em Análises & ROI." }];
    base.metas = [{ indicador: "Clientes adquiridos", meta, prazo_dias: 90 }, { indicador: "Leads captados", meta: null, prazo_dias: 30 }];
  }
  base.indicadores = ["Leads captados", "Taxa de conversão", "Clientes adquiridos", "CAC (se informar o investimento)", "Receita atribuída"];
  base.resumo = `${base.titulo}. Montado com regras e os dados reais da sua conta (a IA generativa não foi usada nesta resposta).`;
  base.confianca = ctx.dados_suficientes ? 65 : 40;
  return base;
}

// Aceita só o que tem forma de plano; limita tamanhos; preenche "atual" das metas com dados REAIS.
function normalizarPlano(bruto, ctx, pedido) {
  const lista = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
  const str = (v, max) => cortar(v, max);
  const prio = p => (["baixa", "media", "alta"].includes(p) ? p : "media");
  const atualDe = ind => {
    const t = String(ind || "").toLowerCase();
    const k = ctx.kpis;
    if (/lead/.test(t)) return k.leads_captados.valor;
    if (/convers/.test(t)) return k.taxa_conversao.valor;
    if (/cac/.test(t)) return k.cac.valor;
    if (/cliente/.test(t)) return k.clientes_adquiridos.valor;
    if (/receita|faturamento/.test(t)) return k.receita_atribuida.valor;
    return null;
  };
  const plano = {
    titulo: str(bruto.titulo, 150) || "Plano de marketing",
    resumo: str(bruto.resumo, 1200),
    pedido: cortar(pedido, 500),
    publico_alvo: str(bruto.publico_alvo, 600),
    diagnostico: lista(bruto.diagnostico, 8).map(x => str(x, 400)).filter(Boolean),
    canais: lista(bruto.canais, 6).map(c => ({ canal: str(c.canal, 100), motivo: str(c.motivo, 300) })).filter(c => c.canal),
    etapas: lista(bruto.etapas, 6).map(e => ({
      titulo: str(e.titulo, 150), descricao: str(e.descricao, 600), prazo_dias: Math.min(Math.max(Number(e.prazo_dias) || 7, 1), 365),
      tarefas: lista(e.tarefas, 6).map(t => ({ titulo: str(t.titulo, 255), descricao: str(t.descricao, 800), prioridade: prio(t.prioridade), prazo_dias: Math.min(Math.max(Number(t.prazo_dias) || 7, 1), 365), externo: !!t.externo })).filter(t => t.titulo),
    })).filter(e => e.titulo),
    metas: lista(bruto.metas, 6).map(m => ({ indicador: str(m.indicador, 100), atual: atualDe(m.indicador), meta: m.meta === null || m.meta === undefined || Number.isNaN(Number(m.meta)) ? null : Number(m.meta), prazo_dias: Math.min(Math.max(Number(m.prazo_dias) || 30, 1), 365) })).filter(m => m.indicador),
    indicadores: lista(bruto.indicadores, 8).map(x => str(x, 150)).filter(Boolean),
    experimentos: lista(bruto.experimentos, 5).map(x => ({ hipotese: str(x.hipotese, 300), como_medir: str(x.como_medir, 300) })).filter(x => x.hipotese),
    riscos: lista(bruto.riscos, 6).map(x => str(x, 300)).filter(Boolean),
    confianca: Math.min(Math.max(Number(bruto.confianca) || 50, 0), 90),
  };
  if (!plano.etapas.length) throw new Error("plano sem etapas");
  return plano;
}

function montarPrompt(pedido, ctx, perfil) {
  return `Você é a Aria, estrategista de marketing e vendas de um ERP brasileiro. Monte um plano de ação PRÁTICO para o pedido abaixo, usando SOMENTE os dados reais fornecidos.
REGRAS:
- Não invente números, clientes, produtos, canais ou resultados. Se faltar dado, diga em "riscos" e reduza "confianca".
- Não prometa resultado. Metas são objetivos, não garantias.
- Cada tarefa deve ser uma ação concreta que uma pessoa executa. Marque "externo": true quando a tarefa envolver publicar, enviar mensagens em massa, investir dinheiro ou alterar algo fora do sistema.
- Adapte à realidade da empresa (segmento, canais, produtos). Evite conselhos genéricos.
- Responda em português do Brasil, em JSON com exatamente estas chaves:
{"titulo":"", "resumo":"", "publico_alvo":"", "diagnostico":["..."], "canais":[{"canal":"","motivo":""}],
 "etapas":[{"titulo":"","descricao":"","prazo_dias":7,"tarefas":[{"titulo":"","descricao":"","prioridade":"alta|media|baixa","prazo_dias":7,"externo":false}]}],
 "metas":[{"indicador":"","meta":0,"prazo_dias":30}], "indicadores":["..."], "experimentos":[{"hipotese":"","como_medir":""}], "riscos":["..."], "confianca":0}
${perfil ? `\nCONTEXTO DA EMPRESA:${perfil}\n` : ""}
DADOS REAIS DO SISTEMA (JSON):
${JSON.stringify(ctx)}

PEDIDO DO USUÁRIO: ${pedido}`;
}

async function gerarEstrategia(tenantId, pedido, { userId = null } = {}) {
  const texto = String(pedido || "").trim();
  if (texto.length < 8) throw new ErroValidacao("Descreva melhor o que você quer (mínimo 8 caracteres)");
  if (texto.length > 2000) throw new ErroValidacao("Pedido muito longo (máximo 2000 caracteres)");
  const ctx = await contexto(tenantId, 90);
  const perfil = await perfilParaAria(tenantId);

  let plano = null, origem = "regras";
  if (process.env.GEMINI_API_KEY) {
    try {
      const bruto = await gemini.chamarGeminiJSON([{ text: montarPrompt(texto, ctx, perfil) }]);
      plano = normalizarPlano(bruto, ctx, texto);
      origem = "ia";
    } catch (err) {
      console.error("[ARIA MARKETING] IA indisponível, usando regras:", err.message);
    }
  }
  if (!plano) plano = normalizarPlano(planoPorRegras(texto, ctx), ctx, texto);
  plano.lacunas = ctx.lacunas;
  plano.dados_suficientes = ctx.dados_suficientes;

  const [r] = await pool.query(
    "INSERT INTO marketing_strategies (tenant_id, pedido, origem, dados_suficientes, plano, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [tenantId, texto, origem, ctx.dados_suficientes, JSON.stringify(plano), userId]);
  return { id: r.insertId, origem, dados_suficientes: ctx.dados_suficientes, plano };
}

async function listarEstrategias(tenantId) {
  const [rows] = await pool.query("SELECT id, pedido, origem, dados_suficientes, plano, status, created_at FROM marketing_strategies WHERE tenant_id = ? ORDER BY id DESC LIMIT 30", [tenantId]);
  return rows.map(r => ({ ...r, plano: typeof r.plano === "string" ? JSON.parse(r.plano) : r.plano }));
}

async function obterEstrategia(tenantId, id) {
  const [[r]] = await pool.query("SELECT * FROM marketing_strategies WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return r ? { ...r, plano: typeof r.plano === "string" ? JSON.parse(r.plano) : r.plano } : null;
}

// Transforma o plano em tarefas reais. Tarefas "externas" ficam aguardando aprovação.
async function aplicarEstrategia(tenantId, id, { userId = null } = {}) {
  const e = await obterEstrategia(tenantId, id);
  if (!e) return null;
  if (e.status === "aplicada") throw new ErroValidacao("Este plano já foi aplicado");
  let criadas = 0, aguardando = 0;
  for (let i = 0; i < e.plano.etapas.length; i++) {
    const etapa = e.plano.etapas[i];
    for (let j = 0; j < etapa.tarefas.length; j++) {
      const t = etapa.tarefas[j];
      const r = await criarTarefa(tenantId, {
        titulo: t.titulo, descricao: `${etapa.titulo}${t.descricao ? ` — ${t.descricao}` : ""}`, prioridade: t.prioridade, prazo_dias: t.prazo_dias,
        origem: "aria", requer_aprovacao: !!t.externo, estrategia_id: e.id, chave: `estr:${e.id}:${i}:${j}`,
      }, { userId });
      if (!r.duplicada) { criadas++; if (t.externo) aguardando++; }
    }
  }
  await pool.query("UPDATE marketing_strategies SET status = 'aplicada' WHERE id = ?", [id]);
  return { tarefas_criadas: criadas, aguardando_aprovacao: aguardando };
}

async function descartarEstrategia(tenantId, id) {
  const [r] = await pool.query("UPDATE marketing_strategies SET status = 'descartada' WHERE id = ? AND tenant_id = ? AND status = 'rascunho'", [id, tenantId]);
  return r.affectedRows > 0;
}

// ---------------------------------------------------------------------------
// Planejamento de aquisição (cenários estimados)
// ---------------------------------------------------------------------------
function wilson(c, n, z = 1.28) { // intervalo de ~80%
  if (n === 0) return [0, 0];
  const p = c / n, d = 1 + (z * z) / n;
  const centro = (p + (z * z) / (2 * n)) / d;
  const margem = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, centro - margem), Math.min(1, centro + margem)];
}

async function planejarAquisicao(tenantId, { meta_clientes, prazo_dias = 90, orcamento = null } = {}) {
  const meta = Number(meta_clientes);
  if (!Number.isInteger(meta) || meta < 1 || meta > 100000) throw new ErroValidacao("meta_clientes deve ser um número inteiro entre 1 e 100000");
  const prazo = Math.min(Math.max(Number(prazo_dias) || 90, 7), 365);
  const orc = orcamento === null || orcamento === undefined || orcamento === "" ? null : Number(orcamento);
  if (orc !== null && (Number.isNaN(orc) || orc < 0)) throw new ErroValidacao("orcamento inválido");

  await prepararTenant(tenantId);
  const w = analytics.janela(90);
  const canais = await analytics.porCanal(tenantId, w.ini, w.fim, null);
  const L = canais.reduce((a, c) => a + c.leads, 0);
  const C = canais.reduce((a, c) => a + c.clientes, 0);
  const [[inv]] = await pool.query("SELECT COALESCE(SUM(valor), 0) AS total FROM marketing_spend WHERE tenant_id = ? AND data >= DATE(?)", [tenantId, w.ini]);
  const investimento = num(inv.total);

  const faltas = [];
  if (L < MIN_LEADS) faltas.push(`Faltam leads: há ${L} nos últimos 90 dias e o mínimo para estimar é ${MIN_LEADS}.`);
  if (C < MIN_CLIENTES) faltas.push(`Faltam conversões: há ${C} clientes vindos de leads e o mínimo é ${MIN_CLIENTES}.`);
  const base = { meta_clientes: meta, prazo_dias: prazo, orcamento: orc, historico: { dias: 90, leads: L, clientes: C, investimento }, tipo: "estimado", aviso: "Projeção baseada no histórico da empresa; não é garantia de resultado." };
  if (faltas.length) {
    return { ...base, dados_suficientes: false, faltas, proximos_passos: ["Capte leads com links rastreáveis e formulários.", "Registre as movimentações dos leads e converta-os em clientes no sistema.", "Informe o investimento para calcular custo por lead."] };
  }

  const taxa = C / L;
  const [baixa, alta] = wilson(C, L);
  const cpl = investimento > 0 ? investimento / L : null;
  const cenario = (nome, t) => {
    const leadsNec = t > 0 ? Math.ceil(meta / t) : null;
    return {
      nome, taxa_conversao_pct: Number((t * 100).toFixed(1)), leads_necessarios: leadsNec,
      leads_por_semana: leadsNec ? Math.ceil(leadsNec / (prazo / 7)) : null,
      custo_estimado: leadsNec && cpl ? Number((leadsNec * cpl).toFixed(2)) : null,
      clientes_com_orcamento: orc !== null && cpl ? Math.floor((orc / cpl) * t) : null,
    };
  };
  const cenarios = [cenario("conservador", baixa), cenario("base", taxa), cenario("otimista", alta)];

  // Distribuição de orçamento: 80% entre canais com evidência, 20% para experimentos
  let distribuicao = null;
  if (orc !== null && orc > 0) {
    const [gastos] = await pool.query(
      `SELECT LOWER(COALESCE(NULLIF(s.canal, ''), NULLIF(c.canal, ''), 'não informado')) AS canal, SUM(s.valor) AS gasto
       FROM marketing_spend s LEFT JOIN marketing_campaigns c ON c.id = s.campaign_id WHERE s.tenant_id = ? AND s.data >= DATE(?) GROUP BY canal`, [tenantId, w.ini]);
    const gasto = new Map(gastos.map(g => [g.canal, num(g.gasto)]));
    const evid = canais.filter(c => c.canal !== "Não informado" && c.leads >= 10);
    const pontuado = evid.map(c => {
      const g = gasto.get(c.canal.toLowerCase());
      const score = g > 0 && c.clientes > 0 ? c.clientes / g : c.clientes / Math.max(c.leads, 1) / 100;
      return { canal: c.canal, score, base: g > 0 && c.clientes > 0 ? "clientes por real investido" : "taxa de conversão (sem custo informado para o canal)" };
    }).filter(c => c.score > 0);
    const soma = pontuado.reduce((a, c) => a + c.score, 0);
    distribuicao = {
      tipo: "estimado",
      canais: soma > 0 ? pontuado.map(c => ({ canal: c.canal, valor: Number((orc * 0.8 * (c.score / soma)).toFixed(2)), criterio: c.base })) : [],
      reserva_para_experimentos: Number((orc * (soma > 0 ? 0.2 : 1)).toFixed(2)),
      nota: soma > 0 ? "80% nos canais com melhor evidência e 20% para testar canais novos." : "Nenhum canal tem evidência suficiente: use o orçamento em testes pequenos de 2 canais.",
    };
  }

  const jaUsados = new Set(canais.map(c => c.canal.toLowerCase()));
  const sugestoes = ["Instagram", "Google", "WhatsApp", "Indicação", "E-mail"].filter(c => !jaUsados.has(c.toLowerCase())).slice(0, 3);
  const experimentos = sugestoes.map(c => ({ canal: c, hipotese: `${c} pode trazer leads com custo por cliente menor que os canais atuais.`, como_medir: "Link rastreável exclusivo e custo por cliente em Análises & ROI.", verba_sugerida: orc ? Number((orc * 0.07).toFixed(2)) : null }));

  return { ...base, dados_suficientes: true, taxa_historica_pct: Number((taxa * 100).toFixed(1)), custo_por_lead_historico: cpl ? Number(cpl.toFixed(2)) : null, cenarios, distribuicao_orcamento: distribuicao, experimentos };
}

module.exports = {
  contexto, detectarRecomendacoes, gerarRecomendacoes, listarRecomendacoes, aceitarRecomendacao, descartarRecomendacao,
  gerarEstrategia, listarEstrategias, obterEstrategia, aplicarEstrategia, descartarEstrategia, planejarAquisicao,
  planoPorRegras, normalizarPlano, intencao,
};
