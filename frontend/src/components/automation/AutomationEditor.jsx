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
    icon: '⑂',
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
};

let idCounter = 1;
const genId = () => `node_${Date.now()}_${idCounter++}`;

// ============================================================
// NODE CUSTOMIZADO
// ============================================================
function CustomNode({ id, data, selected }) {
  const cfg = NODE_TYPES_CONFIG[data.nodeType] || {};
  const isIf = data.nodeType === 'if';
  const debugLog = data.debugLog;

  const debugClass = debugLog
    ? debugLog.level === 'error'
      ? 'apollo-node--debug-error'
      : 'apollo-node--debug-success'
    : '';

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

      {isIf ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: '35%' }}
            className="apollo-handle apollo-handle--true"
          />
          <span className="apollo-node__branch-label apollo-node__branch-label--true">true</span>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: '70%' }}
            className="apollo-handle apollo-handle--false"
          />
          <span className="apollo-node__branch-label apollo-node__branch-label--false">false</span>
        </>
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
    { key: 'logic', label: 'Lógica' },
    { key: 'action', label: 'Ações' },
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
            value={`http://localhost:3000/api/webhooks/automation/${node.data.config.webhook_token}`}
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

      <button className="apollo-config__delete" onClick={() => onDelete(node.id)}>
        Excluir node
      </button>
    </aside>
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
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  // Anota cada node com o log de debug correspondente (se houver
  // execução selecionada), pra colorir a borda e alimentar o painel.
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
    onSave({ nodes: payloadNodes, edges: payloadEdges });
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
            {saveError && <span className="apollo-editor__error">{saveError}</span>}
            <button className="apollo-btn apollo-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar automação'}
            </button>
          </div>
        </div>

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
              <span>#{ex.id} · {new Date(ex.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {ex.duration_ms != null ? `${ex.duration_ms}ms` : '—'}</span>
              <span className={`apollo-execpanel__status apollo-execpanel__status--${ex.status === 'success' ? 'success' : ex.status === 'failed' ? 'failed' : 'pending'}`}>
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
// WRAPPER — carrega/salva via API, traduz formatos, e agora
// também carrega o histórico de execuções para o modo debug
// e o catálogo de eventos (Event Bus universal).
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

        // Carrega o histórico de execuções em paralelo, para popular
        // o seletor de debug na toolbar.
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

        // Carrega o catálogo de eventos disponíveis (Event Bus universal)
        // para popular dinamicamente o dropdown do node "event_trigger".
        try {
          const resEvents = await fetch(`http://localhost:3000/api/events/types`, {
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

  // Ao escolher uma execução no seletor, busca os logs dela e monta
  // um mapa node_id -> log (para colorir/anotar os nodes no canvas).
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
        map[String(l.node_id)] = l; // última entrada para aquele node vence
      }
      setLogsByNode(map);
    } catch (err) {
      setLogsByNode({});
    }
  };

  const handleSave = async ({ nodes, edges }) => {
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
      };

      const res = await fetch(`${apiBaseUrl}/${automationId}/definicao`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Falha ao salvar (${res.status})`);
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
      />
      {saveSuccess && <div className="apollo-editor__toast">Automação salva ✓</div>}
    </ReactFlowProvider>
  );
}