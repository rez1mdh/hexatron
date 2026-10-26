// src/editor/EntityLinkView.tsx
// React node view for inline entity links — renders accessible, clickable entity references

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useNavigate } from 'react-router-dom';

export default function EntityLinkView(props: NodeViewProps) {
  const navigate = useNavigate();
  const { entityId, label } = props.node.attrs as { entityId: string; label: string };

  const handleOpen = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (entityId) {
      navigate(`/entity/${entityId}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleOpen(e);
    }
  };

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <a
        href={`/entity/${entityId}`}
        className="entity-link"
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
        title={`Open article for ${label}`}
        aria-label={`Open article for ${label}`}
        data-entity-id={entityId}
      >
        {label}
      </a>
    </NodeViewWrapper>
  );
}
