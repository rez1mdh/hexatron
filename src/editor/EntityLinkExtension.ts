// src/editor/EntityLinkExtension.ts
// Custom TipTap inline node that renders a clickable entity reference

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import EntityLinkView from './EntityLinkView';

export interface EntityLinkOptions {
  onEntityClick?: (entityId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    entityLink: {
      insertEntityLink: (attrs: { entityId: string; label: string }) => ReturnType;
    };
  }
}

export const EntityLinkExtension = Node.create<EntityLinkOptions>({
  name: 'entityLink',
  group: 'inline',
  inline: true,
  atom: true,   // treated as single unit by cursor

  addOptions() {
    return { onEntityClick: undefined };
  },

  addAttributes() {
    return {
      entityId: { default: null },
      label:    { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-entity-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-entity-id': HTMLAttributes.entityId,
      class: 'entity-link',
    }), HTMLAttributes.label];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntityLinkView);
  },

  addCommands() {
    return {
      insertEntityLink: (attrs) => ({ chain }) => {
        return chain()
          .insertContent({ type: this.name, attrs })
          .run();
      },
    };
  },
});
