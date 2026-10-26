// src/editor/ArticleEditor.tsx
// Full TipTap rich-text editor with automatic and manual inline entity linking

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Image as ImageExtension } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Typography from '@tiptap/extension-typography';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold, Italic, Strikethrough, Code, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Undo, Redo, Link2, Sparkles, X, Search
} from 'lucide-react';
import { EntityLinkExtension } from './EntityLinkExtension';
import { searchEntities, getEntities, formatEntryNumber } from '../db/operations';
import { linkMentionsInDoc, linkMentionsInArticleString } from '../utils/entityLinker';
import type { Entity } from '../db/schema';
import EntityTypeIcon from '../components/ui/EntityTypeIcon';
import './editor.css';

interface Props {
  content?: string; // JSON string
  onChange?: (json: string) => void;
  worldId?: string;
  currentEntityId?: string;
  readOnly?: boolean;
  placeholder?: string;
}

export default function ArticleEditor({
  content,
  onChange,
  worldId,
  currentEntityId,
  readOnly = false,
  placeholder,
}: Props) {
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);
  const [suggestions, setSuggestions] = useState<Entity[]>([]);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number } | null>(null);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const suggestRef = useRef<string>('');

  // Link Entity Modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState<Entity[]>([]);
  const [linkSelectedIdx, setLinkSelectedIdx] = useState(0);
  const [linkSelectionRange, setLinkSelectionRange] = useState<{ from: number; to: number; text: string } | null>(null);

  // Load available entities for inline link resolution and autocomplete
  useEffect(() => {
    getEntities(worldId).then(setAvailableEntities).catch(() => {});
  }, [worldId]);

  // When in readOnly mode, auto-resolve any unlinked entity mentions so lore text is instantly interconnected
  const processedContent = useMemo(() => {
    if (!content) return undefined;
    if (readOnly && availableEntities.length > 0) {
      return linkMentionsInArticleString(content, availableEntities, currentEntityId);
    }
    return content;
  }, [content, readOnly, availableEntities, currentEntityId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: 'hljs' } } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write your article here…' }),
      ImageExtension.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Typography,
      CharacterCount,
      EntityLinkExtension,
    ],
    content: (() => {
      try {
        const toLoad = processedContent || content;
        return toLoad ? JSON.parse(toLoad) : undefined;
      } catch {
        return undefined;
      }
    })(),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
    onSelectionUpdate: ({ editor }) => {
      // Entity link autocomplete via [[ trigger
      const { $anchor } = editor.state.selection;
      const text = $anchor.nodeBefore?.text ?? '';
      const match = text.match(/\[\[([^\]]{1,60})$/);
      if (match) {
        const query = match[1];
        suggestRef.current = query;
        setSuggestionQuery(query);
        const coords = editor.view.coordsAtPos($anchor.pos);
        setSuggestionPos({ top: coords.bottom + 8, left: coords.left });
        debouncedSearch(query, worldId);
      } else {
        closeSuggestions();
      }
    },
  });

  // Sync external content changes (e.g. switching entities or when entities finish loading)
  useEffect(() => {
    if (!editor) return;
    const targetContent = processedContent || content;
    const current = JSON.stringify(editor.getJSON());
    if (targetContent && targetContent !== current) {
      try {
        const parsed = JSON.parse(targetContent);
        editor.commands.setContent(parsed, { emitUpdate: false });
      } catch { /* ignore */ }
    }
  }, [processedContent, content, editor]);

  const debouncedSearch = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (q: string, wId?: string) => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          if (!q) return closeSuggestions();
          const results = await searchEntities(q, wId);
          setSuggestions(results.slice(0, 8));
          setSuggestionIdx(0);
        }, 180);
      };
    })(),
    []
  );

  function closeSuggestions() {
    setSuggestions([]);
    setSuggestionPos(null);
    setSuggestionQuery('');
  }

  function insertLink(entity: Entity) {
    if (!editor) return;
    const query = suggestRef.current;
    const deleteLen = query.length + 2; // [[ + text
    editor
      .chain()
      .focus()
      .deleteRange({ from: editor.state.selection.anchor - deleteLen, to: editor.state.selection.anchor })
      .insertEntityLink({ entityId: entity.id, label: entity.title })
      .run();
    closeSuggestions();
  }

  // Workflow for selecting text and linking it to an existing entity
  function openLinkModal() {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    let selectedText = '';
    if (!empty) {
      selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
    }
    setLinkSelectionRange({ from, to, text: selectedText });
    setLinkSearchQuery(selectedText);
    setLinkModalOpen(true);
    setLinkSelectedIdx(0);

    // Initial search with selected text
    if (selectedText) {
      searchEntities(selectedText, worldId).then(setLinkSearchResults);
    } else {
      setLinkSearchResults(availableEntities.slice(0, 10));
    }
  }

  function handleLinkModalSearch(q: string) {
    setLinkSearchQuery(q);
    setLinkSelectedIdx(0);
    if (!q.trim()) {
      setLinkSearchResults(availableEntities.slice(0, 10));
      return;
    }
    searchEntities(q, worldId).then(setLinkSearchResults);
  }

  function applyEntityLink(entity: Entity) {
    if (!editor) return;
    const label = linkSelectionRange?.text || entity.title;
    if (linkSelectionRange && !editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: linkSelectionRange.from, to: linkSelectionRange.to })
        .insertEntityLink({ entityId: entity.id, label })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertEntityLink({ entityId: entity.id, label: entity.title })
        .run();
    }
    setLinkModalOpen(false);
    setLinkSelectionRange(null);
  }

  // Scan and auto-link unlinked entity mentions in the current editor document
  function handleAutoLink() {
    if (!editor || availableEntities.length === 0) return;
    const currentJson = editor.getJSON();
    const updated = linkMentionsInDoc(currentJson, availableEntities, currentEntityId);
    editor.commands.setContent(updated, { emitUpdate: true });
  }

  function handleGlobalKeyDown(e: React.KeyboardEvent) {
    // Autocomplete [[ navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (suggestions[suggestionIdx]) insertLink(suggestions[suggestionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        closeSuggestions();
        return;
      }
    }

    // Shortcut Ctrl+L or Cmd+L for linking text
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !readOnly) {
      e.preventDefault();
      openLinkModal();
    }
  }

  if (!editor) return null;

  return (
    <div className={`article-editor ${readOnly ? 'readonly' : ''}`} onKeyDown={handleGlobalKeyDown}>
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          onOpenLinkModal={openLinkModal}
          onAutoLink={handleAutoLink}
        />
      )}

      <div className="editor-content-wrapper">
        <EditorContent editor={editor} className="tiptap-content" />
      </div>

      {/* Autocomplete dropdown for [[ typing */}
      {suggestions.length > 0 && suggestionPos && (
        <div
          className="entity-suggest-dropdown"
          style={{ position: 'fixed', top: suggestionPos.top, left: suggestionPos.left, zIndex: 500 }}
        >
          <div className="suggest-header">Link entity — typing: <strong>[[{suggestionQuery}</strong></div>
          {suggestions.map((e, i) => {
            const formattedNum = formatEntryNumber(e.entryNumber);
            return (
              <button
                key={e.id}
                type="button"
                className={`suggest-item ${i === suggestionIdx ? 'active' : ''}`}
                onMouseDown={() => insertLink(e)}
              >
                <div className="suggest-item-row">
                  <EntityTypeIcon name={e.typeId} size={13} />
                  {formattedNum && <span className="lep-entry-number">{formattedNum}</span>}
                  <span className="suggest-title">{e.title}</span>
                </div>
                {e.aliases.length > 0 && <span className="suggest-alias">a.k.a. {e.aliases.join(', ')}</span>}
              </button>
            );
          })}
          <div className="suggest-hint">↑↓ navigate · Enter/Tab insert · Esc cancel</div>
        </div>
      )}

      {/* Explicit Link Entity Dialog for selected text */}
      {linkModalOpen && (
        <div className="link-modal-backdrop" onClick={() => setLinkModalOpen(false)}>
          <div className="link-modal" onClick={e => e.stopPropagation()}>
            <div className="link-modal-header">
              <div className="link-modal-title">
                <Link2 size={15} className="text-accent" />
                <span>Link Text to Entity</span>
              </div>
              <button
                type="button"
                className="link-modal-close"
                onClick={() => setLinkModalOpen(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div className="link-modal-search-row">
              <Search size={14} className="text-muted" />
              <input
                type="text"
                autoFocus
                placeholder="Search entity by name or #001..."
                value={linkSearchQuery}
                onChange={e => handleLinkModalSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setLinkSelectedIdx(i => Math.min(i + 1, linkSearchResults.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setLinkSelectedIdx(i => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (linkSearchResults[linkSelectedIdx]) {
                      applyEntityLink(linkSearchResults[linkSelectedIdx]);
                    }
                  } else if (e.key === 'Escape') {
                    setLinkModalOpen(false);
                  }
                }}
                className="link-modal-input"
              />
            </div>

            {linkSelectionRange?.text && (
              <div className="link-modal-label-hint">
                Selected text: <strong>"{linkSelectionRange.text}"</strong>
              </div>
            )}

            <div className="link-modal-results">
              {linkSearchResults.length === 0 ? (
                <div className="link-modal-empty">No entities found matching "{linkSearchQuery}"</div>
              ) : (
                linkSearchResults.map((ent, idx) => {
                  const formattedNum = formatEntryNumber(ent.entryNumber);
                  return (
                    <button
                      key={ent.id}
                      type="button"
                      className={`link-modal-item ${idx === linkSelectedIdx ? 'active' : ''}`}
                      onClick={() => applyEntityLink(ent)}
                    >
                      <EntityTypeIcon name={ent.typeId} size={14} />
                      {formattedNum && <span className="lep-entry-number">{formattedNum}</span>}
                      <span className="link-modal-item-title">{ent.title}</span>
                      {ent.aliases.length > 0 && (
                        <span className="link-modal-item-alias">({ent.aliases.join(', ')})</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="link-modal-footer">
              Select an existing entity to create a persistent inline link.
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="editor-footer">
          {editor.storage.characterCount?.characters()} characters · {editor.storage.characterCount?.words()} words
        </div>
      )}
    </div>
  );
}

// ── Toolbar ──────────────────────────────────────────────────────────────

interface ToolbarProps {
  editor: any;
  onOpenLinkModal: () => void;
  onAutoLink: () => void;
}

function ToolBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onMouseDown={e => {
        e.preventDefault();
        onClick();
      }}
      title={title}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor, onOpenLinkModal, onAutoLink }: ToolbarProps) {
  return (
    <div className="editor-toolbar">
      <ToolBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </ToolBtn>
      <ToolBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={14} />
      </ToolBtn>
      <ToolBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={14} />
      </ToolBtn>
      <ToolBtn title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code size={14} />
      </ToolBtn>
      <span className="toolbar-sep" />
      <ToolBtn title="Link text to existing entity (Ctrl+L)" onClick={onOpenLinkModal}>
        <Link2 size={14} />
      </ToolBtn>
      <ToolBtn title="Scan & auto-link entity mentions" onClick={onAutoLink}>
        <Sparkles size={14} />
      </ToolBtn>
      <span className="toolbar-sep" />
      <ToolBtn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={14} />
      </ToolBtn>
      <ToolBtn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={14} />
      </ToolBtn>
      <span className="toolbar-sep" />
      <ToolBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={14} />
      </ToolBtn>
      <ToolBtn title="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={14} />
      </ToolBtn>
      <ToolBtn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={14} />
      </ToolBtn>
      <ToolBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={14} />
      </ToolBtn>
      <span className="toolbar-sep" />
      <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo size={14} />
      </ToolBtn>
      <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo size={14} />
      </ToolBtn>
    </div>
  );
}
