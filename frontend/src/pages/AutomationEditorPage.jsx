import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import AutomationEditor from '../components/automation/AutomationEditor';

export default function AutomationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cor } = useOutletContext();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${cor.border}`, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/automacoes')}
          style={{
            background: 'none', border: 'none', color: cor.textMuted, cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit', padding: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Voltar
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <AutomationEditor
          automationId={id}
          apiBaseUrl="http://localhost:3000/api/automations"
        />
      </div>
    </div>
  );
}