// src/pages/GraphPage.tsx
// Dedicated Obsidian-style Graph View page

import { useParams } from 'react-router-dom';
import GraphView from '../components/graph/GraphView';
import './pages.css';

export default function GraphPage() {
  const { worldId, entityId } = useParams<{ worldId?: string; entityId?: string }>();

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <GraphView worldId={worldId} initialSelectedEntityId={entityId} />
    </div>
  );
}
