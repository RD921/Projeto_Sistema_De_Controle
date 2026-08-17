import { useParams } from 'react-router-dom';
import AutomationEditor from '../components/automation/AutomationEditor';

export default function AutomationEditorPage() {
  const { id } = useParams();
  return (
    <AutomationEditor
      automationId={id}
      apiBaseUrl="http://localhost:3000/api/automations"
    />
  );
}