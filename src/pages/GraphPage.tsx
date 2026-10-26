// src/pages/GraphPage.tsx
// Dedicated Obsidian-style Graph View page

import { useParams } from 'react-router-dom';
import GraphView from '../components/graph/GraphView';
import './pages.css';

export default function GraphPage() {
  const { worldId, entityId } = useParams<{ worldId?: string; entityId?: string }>();

  return (
    <div style={{ height: 'calc(100vh - var(--header-h))', width: '100%', position: 'relative' }}>
      <GraphView worldId={worldId} initialSelectedEntityId={entityId} />
    </div>
  );
}
