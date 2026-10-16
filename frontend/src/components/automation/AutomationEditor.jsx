import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { API_URL, API_PUBLIC_URL } from '../../api';
import './AutomationEditor.css';

// ============================================================
// CONFIGURAÇÃO DOS TIPOS DE NODE
// ============================================================
const NODE_TYPES_CONFIG = {
  manual_trigger: {
    label: 'Trigger Manual',
    color: '#16a34a',
    bg: '#dcfce7',
    icon: '▶',
    category: 'trigger',
    defaultConfig: {},
    fields: [],
  },
  event_trigger: {
    label: 'Trigger de Evento',
    color: '#ea580c',
    bg: '#ffedd5',
    icon: '⚡',
    category: 'trigger',
    defaultConfig: { event: 'ORDER_CREATED' },
    fields: [
      {
        key: 'event',
        label: 'Evento',
        type: 'select',
        options: ['ORDER_CREATED', 'ORDER_PAID', 'STOCK_LOW'],
      },
    ],
  },
  schedule_trigger: {
    label: 'Trigger Agendado',
    color: '#7c3aed',
    bg: '#ede9fe',
    icon: '🕐',
    category: 'trigger',
    defaultConfig: { cron: '0 9 * * *' },
    fields: [
      { key: 'cron', label: 'Expressão cron (ex: 0 9 * * * = todo dia às 9h)', type: 'text' },
    ],
  },
  webhook_trigger: {
    label: 'Trigger de Webhook',
    color: '#0891b2',
    bg: '#cffafe',
    icon: '🔗',
    category: 'trigger',
    defaultConfig: {},
    fields: [],
  },
  set: {
    label: 'Set (definir campo)',
    color: '#2563eb',
    bg: '#dbeafe',
    icon: '✎',
    category: 'action',
    defaultConfig: { field: '', value: '' },
    fields: [
      { key: 'field', label: 'Campo (ex: status)', type: 'text' },
      { key: 'value', label: 'Valor (aceita {{$json.x}})', type: 'text' },
    ],
  },
  if: {
    label: 'If (condição)',
    color: '#9333ea',
    bg: '#f3e8ff',
    icon: '◑',
    category: 'logic',
    defaultConfig: { field: '', operator: 'equals', value: '' },
    fields: [
      { key: 'field', label: 'Campo (ex: {{$json.total}})', type: 'text' },
      {
        key: 'operator',
        label: 'Operador',
        type: 'select',
        options: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'],
      },
      { key: 'value', label: 'Valor de comparação', type: 'text' },
    ],
    branches: ['true', 'false'],
  },
  log: {
    label: 'Log',
    color: '#525252',
    bg: '#f4f4f5',
    icon: '▤',
    category: 'action',
    defaultConfig: { message: '' },
    fields: [{ key: 'message', label: 'Mensagem (aceita {{$json.x}})', type: 'text' }],
  },
  switch: {
    label: 'Switch (multiplas condicoes)',
    color: '#9333ea',
    bg: '#f3e8ff',
    icon: '◆',
    category: 'logic',
    defaultConfig: { field: '', defaultBranch: 'default', cases: [] },
    fields: [
      { key: 'field', label: 'Campo (ex: {{$json.status}})', type: 'text' },
      { key: 'cases', label: 'Casos (JSON: [{"value":"x","branch":"nome"}])', type: 'json' },
      { key: 'defaultBranch', label: 'Branch padrao (se nenhum caso bater)', type: 'text' },
    ],
    branches: (config) => [...(config?.cases || []).map((c) => c.branch || c.value), config?.defaultBranch || 'default'],
  },
  http_request: {
    label: 'HTTP Request',
    color: '#0369a1',
    bg: '#e0f2fe',
    icon: '⇄',
    category: 'integration',
    defaultConfig: { method: 'GET', url: '', headers: {}, queryParams: {}, body: {}, timeout: 15000, retry: 1 },
    fields: [
      { key: 'method', label: 'Metodo', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      { key: 'url', label: 'URL (aceita {{$json.x}})', type: 'text' },
      { key: 'headers', label: 'Headers (JSON)', type: 'json' },
      { key: 'queryParams', label: 'Query params (JSON)', type: 'json' },
      { key: 'body', label: 'Body (JSON, aceita {{$json.x}})', type: 'json' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'text' },
      { key: 'retry', label: 'Tentativas', type: 'text' },
    ],
    branches: ['success', 'error'],
  },
  database: {
    label: 'Banco de Dados',
    color: '#0f766e',
    bg: '#ccfbf1',
    icon: '▤',
    category: 'data',
    defaultConfig: { operation: 'select', table: '', filters: [], fields: {}, limit: 100 },
    fields: [
      { key: 'operation', label: 'Operacao', type: 'select', options: ['select', 'insert', 'update', 'delete'] },
      { key: 'table', label: 'Tabela', type: 'select', options: ['financial_entries', 'cost_centers', 'financial_alerts', 'contracts'] },
      { key: 'filters', label: 'Filtros (JSON: [{"field":"x","operator":"equals","value":"y"}])', type: 'json' },
      { key: 'fields', label: 'Campos p/ insert/update (JSON: {"campo":"valor"})', type: 'json' },
      { key: 'limit', label: 'Limite (select)', type: 'text' },
    ],
  },
  wait: {
    label: 'Esperar',
    color: '#a16207',
    bg: '#fef9c3',
    icon: '⏱',
    category: 'logic',
    defaultConfig: { amount: 1, unit: 'minutes' },
    fields: [
      { key: 'amount', label: 'Quantidade', type: 'text' },
      { key: 'unit', label: 'Unidade', type: 'select', options: ['minutes', 'hours', 'days'] },
      { key: 'until', label: 'OU data/hora exata ISO (opcional, sobrepoe quantidade)', type: 'text' },
    ],
  },
  human_approval: {
    label: 'Aprovacao Humana',
    color: '#be123c',
    bg: '#ffe4e6',
    icon: '✓',
    category: 'logic',
    defaultConfig: {},
    fields: [],
    branches: ['approved', 'rejected'],
  },
  finance_create_entry: {
    label: 'Criar Lancamento',
    color: '#15803d',
    bg: '#dcfce7',
    icon: '$+',
    category: 'finance',
    defaultConfig: { tipo: 'receita', categoria: 'outros' },
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['receita', 'despesa'] },
      { key: 'descricao', label: 'Descricao', type: 'text' },
      { key: 'valor', label: 'Valor', type: 'text' },
      { key: 'data_vencimento', label: 'Data de vencimento (AAAA-MM-DD)', type: 'text' },
      { key: 'cost_center_id', label: 'Centro de custo (id)', type: 'text' },
      { key: 'entidade_nome', label: 'Cliente/Fornecedor (opcional)', type: 'text' },
      { key: 'categoria', label: 'Categoria', type: 'text' },
    ],
  },
  finance_get_entry: {
    label: 'Consultar Lancamento',
    color: '#0e7490',
    bg: '#cffafe',
    icon: '$?',
    category: 'finance',
    defaultConfig: {},
    fields: [{ key: 'entry_id', label: 'ID do lancamento (aceita {{$json.x}})', type: 'text' }],
  },
  finance_mark_paid: {
    label: 'Marcar como Pago',
    color: '#166534',
    bg: '#dcfce7',
    icon: '$✓',
    category: 'finance',
    defaultConfig: {},
    fields: [{ key: 'entry_id', label: 'ID do lancamento (aceita {{$json.x}})', type: 'text' }],
  },
  merge: {
    label: 'Merge (juntar ramos)',
    color: '#4338ca',
    bg: '#e0e7ff',
    icon: '⋈',
    category: 'logic',
    defaultConfig: { mode: 'merge' },
    fields: [
      { key: 'mode', label: 'Modo (merge = junta os campos; append = lista dos ramos; keyed = separa pelo nome de cada nó)', type: 'select', options: ['merge', 'append', 'keyed'] },
    ],
  },
    for_each: {
    label: 'For Each (repetir por item)',
    color: '#c2410c',
    bg: '#ffedd5',
    icon: '↻',
    category: 'logic',
    defaultConfig: { items: '', itemVar: 'item' },
    fields: [
      { key: 'items', label: 'Lista (ex: {{$json.rows}})', type: 'text' },
      { key: 'itemVar', label: 'Nome da variavel do item atual', type: 'text' },
    ],
    branches: ['loop_body', 'done'],
  },
    marketing_send_email: {
    label: 'Enviar Email (Marketing)',
    color: '#db2777',
    bg: '#fce7f3',
    icon: '✉',
    category: 'marketing',
    defaultConfig: { to: '', subject: '', html: '', fromName: 'EcomFlow Marketing' },
    fields: [
      { key: 'to', label: 'Para (aceita {{$json.x}})', type: 'text' },
      { key: 'subject', label: 'Assunto', type: 'text' },
      { key: 'html', label: 'Corpo (HTML, aceita {{$json.x}})', type: 'json' },
      { key: 'fromName', label: 'Nome do remetente', type: 'text' },
    ],
  },
  marketing_lead_action: {
    label: 'Ação no Lead (Marketing)',
    color: '#0891b2',
    bg: '#cffafe',
    icon: '🎯',
    category: 'marketing',
    defaultConfig: { action: 'set_status', lead_id: '', status: 'qualificado', pontos: 10, titulo: '', descricao: '', prioridade: 'media', prazo_dias: 2, tipo: 'nota' },
    fields: [
      { key: 'action', label: 'Ação', type: 'select', options: ['set_status', 'add_score', 'create_task', 'send_to_crm', 'register_interaction'] },
      { key: 'lead_id', label: 'Lead (vazio = lead do gatilho; aceita {{$json.lead_id}})', type: 'text' },
      { key: 'status', label: 'Novo status (set_status)', type: 'select', options: ['novo', 'contactado', 'engajado', 'qualificado', 'oportunidade', 'cliente', 'perdido', 'inativo'] },
      { key: 'pontos', label: 'Pontos (add_score, de -100 a 100)', type: 'text' },
      { key: 'titulo', label: 'Título da tarefa (create_task)', type: 'text' },
      { key: 'descricao', label: 'Descrição (tarefa ou interação)', type: 'text' },
      { key: 'prioridade', label: 'Prioridade da tarefa', type: 'select', options: ['baixa', 'media', 'alta'] },
      { key: 'prazo_dias', label: 'Prazo da tarefa (dias)', type: 'text' },
      { key: 'tipo', label: 'Tipo da interação (register_interaction)', type: 'select', options: ['nota', 'ligacao', 'reuniao', 'resposta', 'proposta', 'email', 'whatsapp'] },
    ],
  },
};

let idCounter = 1;
const genId = () => `node_${Date.now()}_${idCounter++}`;



// ============================================================
// NODE CUSTOMIZADO
// ============================================================
function CustomNode({ id, data, selected }) {
  const cfg = NODE_TYPES_CONFIG[data.nodeType] || {};
  const debugLog = data.debugLog;

  const debugClass = debugLog
    ? debugLog.level === 'error'
      ? 'apollo-node--debug-error'
      : 'apollo-node--debug-success'
    : '';

  let branchList = cfg.branches
    ? (typeof cfg.branches === 'function' ? cfg.branches(data.config) : cfg.branches)
    : null;
  if (data.config?.__settings?.onError === 'error_branch' && cfg.category !== 'trigger') {
    const base = branchList || ['default'];
    branchList = base.includes('error') ? base : [...base, 'error'];
  }

  return (
    <div
      className={`apollo-node ${selected ? 'apollo-node--selected' : ''} ${debugClass}`}
      style={{ borderColor: selected && !debugLog ? cfg.color : undefined }}
    >
      {debugLog && (
        <span
          className={`apollo-node__debug-badge ${
            debugLog.level === 'error' ? 'apollo-node__debug-badge--error' : 'apollo-node__debug-badge--success'
          }`}
        >
          {debugLog.level === 'error' ? '✕' : '✓'}
        </span>
      )}

      {cfg.category !== 'trigger' && (
        <Handle type="target" position={Position.Left} className="apollo-handle" />
      )}

      <div className="apollo-node__header">
        <span className="apollo-node__icon" style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.icon}
        </span>
        <div>
          <div className="apollo-node__title">{data.label || cfg.label}</div>
          <div className="apollo-node__subtitle">{cfg.label}</div>
        </div>
      </div>

      {branchList ? (
        branchList.map((branch, i) => {
          const topPct = branchList.length === 1 ? 50 : 25 + i * (50 / (branchList.length - 1));
          return (
            <React.Fragment key={branch}>
              <Handle
                type="source"
                position={Position.Right}
                id={branch}
                style={{ top: `${topPct}%` }}
                className="apollo-handle"
              />
              <span
                className="apollo-node__branch-label"
                style={{
                  top: `${topPct}%`,
                  position: 'absolute',
                  right: -4,
                  fontSize: 9,
                  transform: 'translateY(-50%)',
                }}
              >
                {branch}
              </span>
            </React.Fragment>
          );
        })
      ) : (
        <Handle type="source" position={Position.Right} className="apollo-handle" />
      )}
    </div>
  );
}

const nodeTypes = { apolloNode: CustomNode };

// ============================================================
// PAINEL LATERAL — PALETA DE NODES
// ============================================================
function NodePalette() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/apollo-node-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = [
    { key: 'trigger', label: 'Gatilhos' },
    { key: 'logic', label: 'Logica' },
    { key: 'action', label: 'Acoes' },
    { key: 'data', label: 'Dados' },
    { key: 'integration', label: 'Integracao' },
    { key: 'finance', label: 'Financeiro' },
    { key: 'marketing', label: 'Marketing' },
  ];

  return (
    <aside className="apollo-palette">
      <h3 className="apollo-palette__title">Nodes</h3>
      {categories.map((cat) => (
        <div key={cat.key} className="apollo-palette__group">
          <div className="apollo-palette__group-label">{cat.label}</div>
          {Object.entries(NODE_TYPES_CONFIG)
            .filter(([, cfg]) => cfg.category === cat.key)
            .map(([type, cfg]) => (
              <div
                key={type}
                className="apollo-palette__item"
                draggable
                onDragStart={(e) => onDragStart(e, type)}
              >
                <span
                  className="apollo-node__icon apollo-node__icon--sm"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.icon}
                </span>
                {cfg.label}
              </div>
            ))}
        </div>
      ))}
      <p className="apollo-palette__hint">Arraste um node para o canvas para adicioná-lo.</p>
    </aside>
  );
}

// ============================================================
// CAMPO DE TEXTO JSON (para filtros, headers, body, cases, etc.)
// ============================================================
function JsonField({ value, onChange }) {
  const [text, setText] = useState(() => {
    try {
      return JSON.stringify(value ?? {}, null, 2);
    } catch {
      return '{}';
    }
  });
  const [error, setError] = useState(null);

  return (
    <div>
      <textarea
        className="apollo-config__input"
        rows={4}
        style={{ fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() === '') {
            onChange({});
            setError(null);
            return;
          }
          try {
            onChange(JSON.parse(text));
            setError(null);
          } catch {
            setError('JSON invalido - alteracao nao foi salva, corrija e clique fora de novo');
          }
        }}
      />
      {error && <p style={{ color: '#dc2626', fontSize: 10.5, marginTop: 2 }}>{error}</p>}
    </div>
  );
}

// ============================================================
// PAINEL DE CONFIGURAÇÃO DO NODE SELECIONADO (+ DEBUG)
// ============================================================
function ConfigPanel({ node, onChange, onClose, onDelete, eventTypes }) {
  if (!node) return null;
  const cfg = NODE_TYPES_CONFIG[node.data.nodeType] || {};
  const debugLog = node.data.debugLog;

  const update = (patch) => {
    onChange(node.id, patch);
  };

  const formatJson = (val) => {
    if (val === null || val === undefined) return '—';
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(val);
    }
  };

  return (
    <aside className="apollo-config">
      <div className="apollo-config__header">
        <span className="apollo-node__icon" style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.icon}
        </span>
        <div>
          <div className="apollo-config__title">{cfg.label}</div>
          <div className="apollo-config__id">{node.id}</div>
        </div>
        <button className="apollo-config__close" onClick={onClose}>
          ✕
        </button>
      </div>

      {debugLog && (
        <div className="apollo-config__debug">
          <div
            className={`apollo-config__debug-title ${
              debugLog.level === 'error'
                ? 'apollo-config__debug-title--error'
                : 'apollo-config__debug-title--success'
            }`}
          >
            {debugLog.level === 'error' ? '✕ Falhou nesta execução' : '✓ Executado com sucesso'}
          </div>
          <div className="apollo-config__debug-row">
            <div className="apollo-config__debug-label">Entrada (input)</div>
            <div className="apollo-config__debug-json">{formatJson(debugLog.input_data)}</div>
          </div>
          <div className="apollo-config__debug-row">
            <div className="apollo-config__debug-label">Saída (output)</div>
            <div className="apollo-config__debug-json">{formatJson(debugLog.output_data)}</div>
          </div>
          <div className="apollo-config__debug-row" style={{ marginBottom: 0 }}>
            <span className="apollo-config__debug-time">⏱ {debugLog.duration_ms ?? '—'}ms</span>
            {debugLog.message && (
              <div className="apollo-config__debug-label" style={{ marginTop: 4 }}>
                {debugLog.message}
              </div>
            )}
          </div>
        </div>
      )}

      <label className="apollo-config__label">Nome do node</label>
      <input
        className="apollo-config__input"
        value={node.data.label || ''}
        onChange={(e) => update({ label: { ...node.data, label: e.target.value } })}
      />

      {node.data.nodeType === 'webhook_trigger' && node.data.config?.webhook_token && (
        <div style={{ marginTop: 12 }}>
          <label className="apollo-config__label">URL do webhook (copie para o sistema externo)</label>
          <input
            className="apollo-config__input"
            readOnly
            value={`${API_PUBLIC_URL}/webhooks/automation/${node.data.config.webhook_token}`}
            onFocus={(e) => e.target.select()}
            style={{ fontSize: '11px', fontFamily: 'monospace' }}
          />
          <p style={{ fontSize: '10.5px', color: '#a3a3a3', marginTop: 6, lineHeight: 1.4 }}>
            Envie um POST para essa URL para disparar esta automação. Não requer autenticação — trate como segredo.
          </p>
        </div>
      )}

      {cfg.fields?.map((field) => (
        <div key={field.key}>
          <label className="apollo-config__label">{field.label}</label>
          {field.type === 'select' ? (
            <select
              className="apollo-config__input"
              value={node.data.config?.[field.key] ?? ''}
              onChange={(e) =>
                update({
                  config: { ...node.data.config, [field.key]: e.target.value },
                })
              }
            >
              {field.key === 'event' && eventTypes?.length > 0
                ? eventTypes.map((ev) => (
                    <option key={ev.code} value={ev.code}>
                      {ev.label} ({ev.category})
                    </option>
                  ))
                : field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
            </select>
          ) : field.type === 'json' ? (
            <JsonField
              value={node.data.config?.[field.key]}
              onChange={(val) => update({ config: { ...node.data.config, [field.key]: val } })}
            />
          ) : (
            <input
              className="apollo-config__input"
              value={node.data.config?.[field.key] ?? ''}
              onChange={(e) =>
                update({
                  config: { ...node.data.config, [field.key]: e.target.value },
                })
              }
            />
          )}
        </div>
      ))}

      {cfg.category !== 'trigger' && (() => {
        const aj = node.data.config?.__settings || {};
        const setAj = (patch) => {
          const novo = { ...aj, ...patch };
          const cfgNovo = { ...node.data.config };
          if (!novo.onError || novo.onError === 'stop') delete novo.onError;
          if (novo.retry && !(Number(novo.retry.max) > 1)) delete novo.retry;
          if (Object.keys(novo).length) cfgNovo.__settings = novo; else delete cfgNovo.__settings;
          update({ config: cfgNovo });
        };
        const retry = aj.retry || {};
        return (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #3f3f46' }}>
            <label className="apollo-config__label">Tentativas se falhar (1 = sem repetir, máx. 10)</label>
            <input
              className="apollo-config__input"
              type="number"
              min="1"
              max="10"
              value={retry.max ?? 1}
              onChange={(e) => setAj({ retry: { waitMs: 1000, backoff: true, ...retry, max: Math.min(10, Math.max(1, Number(e.target.value) || 1)) } })}
            />
            {Number(retry.max) > 1 && (
              <>
                <label className="apollo-config__label">Espera entre tentativas (ms)</label>
                <input
                  className="apollo-config__input"
                  type="number"
                  min="0"
                  value={retry.waitMs ?? 1000}
                  onChange={(e) => setAj({ retry: { ...retry, waitMs: Math.max(0, Number(e.target.value) || 0) } })}
                />
                <label className="apollo-config__label">
                  <input
                    type="checkbox"
                    checked={retry.backoff !== false}
                    onChange={(e) => setAj({ retry: { ...retry, backoff: e.target.checked } })}
                  />{' '}
                  Dobrar a espera a cada tentativa
                </label>
              </>
            )}
            <label className="apollo-config__label">Se este passo falhar</label>
            <select
              className="apollo-config__input"
              value={aj.onError || 'stop'}
              onChange={(e) => setAj({ onError: e.target.value })}
            >
              <option value="stop">Parar a automação (padrão)</option>
              <option value="continue">Continuar mesmo assim (segue com o erro nos dados)</option>
              <option value="error_branch">Seguir pela saída "error"</option>
            </select>
          </div>
        );
      })()}

      <button className="apollo-config__delete" onClick={() => onDelete(node.id)}>
        Excluir node
      </button>
    </aside>
  );
}

function VarsField({ value, onChange }) {
  const [texto, setTexto] = useState(value ? JSON.stringify(value, null, 2) : '');
  const [erro, setErro] = useState(false);
  return (
    <>
      <textarea
        className="apollo-config__input"
        rows={5}
        style={{ fontFamily: 'monospace', fontSize: 11, borderColor: erro ? '#ef4444' : undefined }}
        value={texto}
        placeholder='{"loja": "Minha Loja"}'
        onChange={(e) => {
          const t = e.target.value;
          setTexto(t);
          if (!t.trim()) { setErro(false); onChange(undefined); return; }
          try {
            const j = JSON.parse(t);
            if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('x');
            setErro(false);
            onChange(j);
          } catch { setErro(true); }
        }}
      />
      {erro && <span style={{ color: '#ef4444', fontSize: 11 }}>JSON inválido (use um objeto)</span>}
    </>
  );
}

// ============================================================
// EDITOR PRINCIPAL
// ============================================================
function EditorCanvas({
  automationId,
  initialNodes,
  initialEdges,
  onSave,
  saving,
  saveError,
  embedded,
  executions,
  selectedExecutionId,
  onSelectExecution,
  logsByNode,
  eventTypes,
  settings,
  onSettingsChange,
  outrasAutomacoes,
}) {
  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, debugLog: logsByNode?.[n.id] || null },
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logsByNode]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: false }, eds)),
    [setEdges]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/apollo-node-type');
      if (!nodeType || !NODE_TYPES_CONFIG[nodeType]) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const cfg = NODE_TYPES_CONFIG[nodeType];
      const config = { ...cfg.defaultConfig };
      if (nodeType === 'webhook_trigger') {
        config.webhook_token = `whk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      }
      const newNode = {
        id: genId(),
        type: 'apolloNode',
        position,
        data: {
          nodeType,
          label: cfg.label,
          config,
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick = useCallback((_, node) => setSelectedNodeId(node.id), []);
  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  const handleConfigChange = (nodeId, patch) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        if (patch.label) return { ...n, data: patch.label };
        return { ...n, data: { ...n.data, ...patch } };
      })
    );
  };

  const handleDeleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  };

  const handleSave = () => {
    const payloadNodes = nodes.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      label: n.data.label,
      config: n.data.config || {},
      position: n.position,
    }));
    const payloadEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
    }));
    onSave({ nodes: payloadNodes, edges: payloadEdges, settings });
  };

  return (
    <div className={`apollo-editor ${embedded ? 'apollo-editor--embedded' : ''}`}>
      <NodePalette />

      <div className="apollo-editor__canvas" ref={reactFlowWrapper}>
        <div className="apollo-editor__toolbar">
          <div className="apollo-editor__toolbar-title">Editor de Automação</div>
          <div className="apollo-editor__toolbar-actions">
            {executions?.length > 0 && (
              <select
                className="apollo-editor__exec-select"
                value={selectedExecutionId || ''}
                onChange={(e) => onSelectExecution(e.target.value || null)}
              >
                <option value="">Sem debug (edição)</option>
                {executions.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    #{ex.id} · {ex.status === 'success' ? '✓' : ex.status === 'failed' ? '✕' : '…'} ·{' '}
                    {new Date(ex.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </option>
                ))}
              </select>
            )}
            <button className="apollo-btn" onClick={() => setMostrarAjustes((v) => !v)}>
              ⚙ Configurações do fluxo
            </button>
            {saveError && <span className="apollo-editor__error">{saveError}</span>}
            <button className="apollo-btn apollo-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar automação'}
            </button>
          </div>
        </div>

        {mostrarAjustes && (
          <div style={{ position: 'absolute', top: 56, right: 12, zIndex: 20, width: 340, background: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46', borderRadius: 10, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Configurações do fluxo</div>
            <label className="apollo-config__label">Tempo máximo de execução (segundos, vazio = padrão)</label>
            <input
              className="apollo-config__input"
              type="number"
              min="1"
              max="1800"
              value={settings.timeoutMs ? Math.round(settings.timeoutMs / 1000) : ''}
              onChange={(e) => {
                const novo = { ...settings };
                if (e.target.value === '') delete novo.timeoutMs; else novo.timeoutMs = Number(e.target.value) * 1000;
                onSettingsChange(novo);
              }}
            />
            <label className="apollo-config__label">Se esta automação falhar, executar</label>
            <select
              className="apollo-config__input"
              value={settings.errorAutomationId || ''}
              onChange={(e) => {
                const novo = { ...settings };
                if (!e.target.value) delete novo.errorAutomationId; else novo.errorAutomationId = Number(e.target.value);
                onSettingsChange(novo);
              }}
            >
              <option value="">Nenhuma</option>
              {outrasAutomacoes.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <label className="apollo-config__label">Variáveis fixas (JSON, usadas como {'{{ $vars.nome }}'})</label>
            <VarsField value={settings.vars} onChange={(v) => {
              const novo = { ...settings };
              if (v === undefined) delete novo.vars; else novo.vars = v;
              onSettingsChange(novo);
            }} />
            <p style={{ fontSize: 10.5, color: '#a3a3a3', marginTop: 8, lineHeight: 1.4 }}>
              Clique em "Salvar automação" para aplicar. A automação escolhida recebe o erro, o nome do passo e os dados da execução que falhou.
            </p>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background gap={16} color="#e5e5e5" />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <div className="apollo-execpanel">
        <p className="apollo-execpanel__title">Execuções recentes</p>
        {(!executions || executions.length === 0) ? (
          <p className="apollo-execpanel__empty">Nenhuma execução ainda.</p>
        ) : (
          executions.slice(0, 5).map((ex) => (
            <div
              key={ex.id}
              className="apollo-execpanel__item"
              onClick={() => onSelectExecution(String(ex.id))}
              style={{ color: '#d4d4d8' }}
            >
              <span>
                #{ex.id} · {new Date(ex.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} ·{' '}
                {ex.duration_ms != null ? `${ex.duration_ms}ms` : '—'}
              </span>
              <span
                className={`apollo-execpanel__status apollo-execpanel__status--${
                  ex.status === 'success' ? 'success' : ex.status === 'failed' ? 'failed' : 'pending'
                }`}
              >
                {ex.status === 'success' ? '✓ Sucesso' : ex.status === 'failed' ? '✕ Falhou' : ex.status}
              </span>
            </div>
          ))
        )}
      </div>

      <ConfigPanel
        node={selectedNode}
        onChange={handleConfigChange}
        onClose={() => setSelectedNodeId(null)}
        onDelete={handleDeleteNode}
        eventTypes={eventTypes}
      />
    </div>
  );
}

// ============================================================
// WRAPPER — carrega/salva via API, traduz formatos, e também
// carrega o histórico de execuções para o modo debug e o
// catálogo de eventos (Event Bus universal).
// ============================================================
export default function AutomationEditor({ automationId, apiBaseUrl = '/api/automations', embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialNodes, setInitialNodes] = useState([]);
  const [initialEdges, setInitialEdges] = useState([]);

  const [executions, setExecutions] = useState([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const [logsByNode, setLogsByNode] = useState({});
  const [eventTypes, setEventTypes] = useState([]);
  const [settings, setSettings] = useState({});
  const [outrasAutomacoes, setOutrasAutomacoes] = useState([]);

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${apiBaseUrl}/${automationId}/definicao`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error(`Erro ao carregar automação (${res.status})`);
        const data = await res.json();

        setSettings(data.settings && typeof data.settings === 'object' ? data.settings : {});
        try {
          const resLista = await fetch(apiBaseUrl, { headers: { Authorization: `Bearer ${getToken()}` } });
          if (resLista.ok) {
            const lista = await resLista.json();
            setOutrasAutomacoes((lista || []).filter((a) => String(a.id) !== String(automationId)));
          }
        } catch {
          // lista é opcional
        }

        const rawNodes = data.nodes || [];
        const rawEdges = data.edges || [];

        setInitialNodes(
          rawNodes.map((n) => ({
            id: String(n.node_id),
            type: 'apolloNode',
            position: { x: n.position_x || 100, y: n.position_y || 100 },
            data: {
              nodeType: n.type,
              label: n.label,
              config: n.config || {},
            },
          }))
        );
        setInitialEdges(
          rawEdges.map((e) => ({
            id: `${e.source_node_id}-${e.target_node_id}-${e.source_handle || 'default'}`,
            source: String(e.source_node_id),
            target: String(e.target_node_id),
            sourceHandle: e.source_handle && e.source_handle !== 'default' ? e.source_handle : undefined,
          }))
        );

        try {
          const resExec = await fetch(`${apiBaseUrl}/${automationId}/executions`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (resExec.ok) {
            const execData = await resExec.json();
            setExecutions(execData || []);
          }
        } catch {
          // histórico de execuções é opcional; falha aqui não bloqueia o editor
        }

        try {
          const resEvents = await fetch(`${API_URL}/events/types`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (resEvents.ok) {
            const eventsData = await resEvents.json();
            setEventTypes(eventsData || []);
          }
        } catch {
          // catálogo de eventos é opcional; se falhar, o dropdown cai
          // no fallback estático definido em NODE_TYPES_CONFIG
        }
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (automationId) load();
    else setLoading(false);
  }, [automationId, apiBaseUrl]);

  const handleSelectExecution = async (executionId) => {
    setSelectedExecutionId(executionId);
    if (!executionId) {
      setLogsByNode({});
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/executions/${executionId}/logs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Falha ao carregar logs');
      const logs = await res.json();
      const map = {};
      for (const l of logs) {
        map[String(l.node_id)] = l;
      }
      setLogsByNode(map);
    } catch (err) {
      setLogsByNode({});
    }
  };

  const handleSave = async ({ nodes, edges, settings: ajustes }) => {
    try {
      setSaving(true);
      setSaveError(null);

      const payload = {
        nodes: nodes.map((n) => ({
          node_id: n.id,
          type: n.type,
          label: n.label,
          config: n.config || {},
          position_x: n.position.x,
          position_y: n.position.y,
        })),
        edges: edges.map((e) => ({
          source_node_id: e.source,
          target_node_id: e.target,
          source_handle: e.sourceHandle || 'default',
          target_handle: 'default',
        })),
        settings: ajustes,
      };

      const res = await fetch(`${apiBaseUrl}/${automationId}/definicao`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `Falha ao salvar (${res.status})`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="apollo-editor__loading">Carregando editor...</div>;
  if (loadError) return <div className="apollo-editor__error-full">{loadError}</div>;

  return (
    <ReactFlowProvider>
      <EditorCanvas
        automationId={automationId}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onSave={handleSave}
        saving={saving}
        saveError={saveError}
        embedded={embedded}
        executions={executions}
        selectedExecutionId={selectedExecutionId}
        onSelectExecution={handleSelectExecution}
        logsByNode={logsByNode}
        eventTypes={eventTypes}
        settings={settings}
        onSettingsChange={setSettings}
        outrasAutomacoes={outrasAutomacoes}
      />
      {saveSuccess && <div className="apollo-editor__toast">Automação salva ✓</div>}
    </ReactFlowProvider>
  );
}