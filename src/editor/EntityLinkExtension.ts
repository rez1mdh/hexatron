// src/editor/EntityLinkExtension.ts
// Custom TipTap inline node that renders a clickable entity reference

import { Node, mergeAttributes } from '@tiptap/core';

export interface EntityLinkOptions {
  onEntityClick?: (entityId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    entityLink: {
      insertEntityLink: (attrs: { entityId: string; label: string }) => ReturnType;
      unlinkEntity: (pos?: number) => ReturnType;
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
      entityId: {
        default: null,
        parseHTML: element => element.getAttribute('data-entity-id'),
        renderHTML: attributes => ({
          'data-entity-id': attributes.entityId,
          href: `/entity/${attributes.entityId}`,
        }),
      },
      label: {
        default: '',
        parseHTML: element => element.textContent || '',
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-entity-id]',
        getAttrs: el => ({
          entityId: (el as HTMLElement).getAttribute('data-entity-id'),
          label: (el as HTMLElement).textContent || '',
        }),
      },
      {
        tag: 'span[data-entity-id]',
        getAttrs: el => ({
          entityId: (el as HTMLElement).getAttribute('data-entity-id'),
          label: (el as HTMLElement).textContent || '',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = node.attrs.label || HTMLAttributes.label || '';
    const entityId = node.attrs.entityId || HTMLAttributes['data-entity-id'] || '';
    return [
      'a',
      mergeAttributes(
        {
          class: 'entity-link',
          href: `/entity/${entityId}`,
          'data-entity-id': entityId,
          title: label ? `Open article for ${label}` : 'Open article',
          role: 'link',
          tabindex: '0',
        },
        HTMLAttributes
      ),
      label,
    ];
  },

  addCommands() {
    return {
      insertEntityLink: (attrs) => ({ chain }) => {
        return chain()
          .insertContent({ type: this.name, attrs })
          .run();
      },
      unlinkEntity: (pos) => ({ tr, dispatch, state }) => {
        const targetPos = pos !== undefined ? pos : state.selection.from;
        const node = state.doc.nodeAt(targetPos);
        if (node && node.type.name === this.name) {
          const label = node.attrs.label || '';
          if (dispatch) {
            tr.replaceWith(targetPos, targetPos + node.nodeSize, state.schema.text(label));
          }
          return true;
        }
        return false;
      },
    };
  },
});
