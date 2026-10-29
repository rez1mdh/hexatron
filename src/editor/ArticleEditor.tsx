// src/editor/ArticleEditor.tsx
// Full TipTap rich-text editor with contextual selection toolbar, custom right-click context menu,
// slash command menu, quick entity creation, and reliable auto-linking

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Undo, Redo, Link2, Sparkles, X, Search,
  PlusCircle, ExternalLink, Unlink, Copy, Table as TableIcon, ImageIcon, Film
} from 'lucide-react';
import { EntityLinkExtension } from './EntityLinkExtension';
import { searchEntities, getEntities, formatEntryNumber, addImage } from '../db/operations';
import { linkMentionsInDoc, linkMentionsInArticleString } from '../utils/entityLinker';
import type { Entity } from '../db/schema';
import EntityTypeIcon from '../components/ui/EntityTypeIcon';
import CreateEntityQuickModal from './CreateEntityQuickModal';
import InsertMediaModal from '../components/ui/InsertMediaModal';
import './editor.css';

interface Props {
  content?: string; // JSON string
  onChange?: (json: string) => void;
  worldId?: string;
  currentEntityId?: string;
  readOnly?: boolean;
  placeholder?: string;
}

interface FloatingToolbarPos {
  top: number;
  left: number;
  selectedText: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  selectedText: string;
  hasSelection: boolean;
  linkedEntityId?: string;
  linkedEntityLabel?: string;
  nodePos?: number;
}

interface SlashCommandItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: (editor: any) => void;
}

export default function ArticleEditor({
  content,
  onChange,
  worldId,
  currentEntityId,
  readOnly = false,
  placeholder,
}: Props) {
  const navigate = useNavigate();
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);
  const [suggestions, setSuggestions] = useState<Entity[]>([]);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number } | null>(null);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const suggestRef = useRef<string>('');

  // Floating Contextual Toolbar state
  const [floatingPos, setFloatingPos] = useState<FloatingToolbarPos | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  // Custom Right-Click Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Slash Command Menu state
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIdx, setSlashIdx] = useState(0);

  // Link Entity Modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState<Entity[]>([]);
  const [linkSelectedIdx, setLinkSelectedIdx] = useState(0);
  const [linkSelectionRange, setLinkSelectionRange] = useState<{ from: number; to: number; text: string } | null>(null);

  // Quick Create Entity Modal state
  const [createQuickOpen, setCreateQuickOpen] = useState(false);
  const [createQuickInitialTitle, setCreateQuickInitialTitle] = useState('');

  // External Link Modal state
  const [externalLinkPromptOpen, setExternalLinkPromptOpen] = useState(false);
  const [externalUrl, setExternalUrl] = useState('https://');

  // Insert Media Modal state
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Load available entities for inline link resolution and autocomplete
  useEffect(() => {
    getEntities(worldId).then(setAvailableEntities).catch(() => { });
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
      Placeholder.configure({ placeholder: placeholder ?? 'Write your article here… Type / for commands, [[ to link entities.' }),
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
        if (!toLoad) return undefined;
        if (typeof toLoad === 'string' && (toLoad.startsWith('{') || toLoad.startsWith('['))) {
          return JSON.parse(toLoad);
        }
        return {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: String(toLoad) }],
            },
          ],
        };
      } catch {
        return undefined;
      }
    })(),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
    onSelectionUpdate: ({ editor }) => {
      if (readOnly) return;
      const { selection, doc } = editor.state;
      const { from, to, empty, $anchor } = selection;

      // 1. Text Selection -> Floating Contextual Toolbar
      if (!empty && from !== to) {
        const selectedText = doc.textBetween(from, to, ' ').trim();
        if (selectedText.length > 0) {
          const coords = editor.view.coordsAtPos(from);
          const endCoords = editor.view.coordsAtPos(to);
          const top = Math.max(10, coords.top - 46);
          const left = Math.min(window.innerWidth - 160, Math.max(120, (coords.left + endCoords.left) / 2));
          setFloatingPos({ top, left, selectedText });
        } else {
          setFloatingPos(null);
        }
      } else {
        setFloatingPos(null);
      }

      // 2. [[ Autocomplete trigger
      const textBefore = $anchor.nodeBefore?.text ?? '';
      const match = textBefore.match(/\[\[([^\]]{1,60})$/);
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

      // 3. Slash command trigger: check if current line starts with /
      const lineText = $anchor.parent.textContent || '';
      if (lineText.startsWith('/')) {
        const query = lineText.slice(1).trim().toLowerCase();
        setSlashQuery(query);
        const coords = editor.view.coordsAtPos($anchor.pos);
        setSlashMenuPos({ top: coords.bottom + 6, left: coords.left });
        setSlashIdx(0);
      } else {
        setSlashMenuPos(null);
      }
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (!editor) return;
    const targetContent = processedContent || content;
    if (!targetContent) return;

    try {
      let parsed: any;
      if (typeof targetContent === 'string' && (targetContent.startsWith('{') || targetContent.startsWith('['))) {
        parsed = JSON.parse(targetContent);
      } else {
        parsed = {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: String(targetContent) }] }],
        };
      }
      const current = JSON.stringify(editor.getJSON());
      if (JSON.stringify(parsed) !== current) {
        editor.commands.setContent(parsed, { emitUpdate: false });
      }
    } catch { /* ignore */ }
  }, [processedContent, content, editor]);

  // Global dismiss for context menus and floating toolbar on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

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

  // Open Link Modal with prefilled selection
  function openLinkModal(prefilledText?: string) {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    let selectedText = prefilledText ?? '';
    if (!selectedText && !empty) {
      selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
    }
    setLinkSelectionRange({ from, to, text: selectedText });
    setLinkSearchQuery(selectedText);
    setLinkModalOpen(true);
    setLinkSelectedIdx(0);
    setFloatingPos(null);
    setContextMenu(null);

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
    if (linkSelectionRange && linkSelectionRange.from !== linkSelectionRange.to) {
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

  // Workflow for creating a new entity directly from selected text
  function openQuickCreate(titleText?: string) {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    let selectedText = titleText ?? '';
    if (!selectedText && !empty) {
      selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
    }
    setLinkSelectionRange({ from, to, text: selectedText });
    setCreateQuickInitialTitle(selectedText);
    setCreateQuickOpen(true);
    setFloatingPos(null);
    setContextMenu(null);
  }

  function handleQuickCreatedAndLinked(newEntity: Entity) {
    applyEntityLink(newEntity);
    setCreateQuickOpen(false);
    // Refresh available entities list
    getEntities(worldId).then(setAvailableEntities).catch(() => { });
  }

  // Scan and auto-link unlinked entity mentions in the current editor document
  function handleAutoLink() {
    if (!editor || availableEntities.length === 0) return;
    const currentJson = editor.getJSON();
    const updated = linkMentionsInDoc(currentJson, availableEntities, currentEntityId);
    editor.commands.setContent(updated, { emitUpdate: true });
  }

  // ── Custom Right-Click Context Menu Handler ─────────────────────────────
  function handleContextMenu(e: React.MouseEvent) {
    if (readOnly || !editor) return;

    // Inspect if user clicked directly on or inside an inline entityLink
    const target = e.target as HTMLElement;
    const linkEl = target.closest('[data-entity-id]') as HTMLElement | null;
    const clickedEntityId = linkEl?.getAttribute('data-entity-id') || undefined;
    const clickedEntityLabel = linkEl?.textContent?.trim() || undefined;

    let nodePos: number | undefined;
    if (linkEl) {
      try {
        const p = editor.view.posAtDOM(linkEl, 0);
        nodePos = p;
      } catch { /* ignore */ }
    }

    const { from, to, empty } = editor.state.selection;
    const selectedText = !empty ? editor.state.doc.textBetween(from, to, ' ').trim() : '';

    // If clicked without an active text selection and not on an entity link, place caret at click coordinates
    if (empty && !linkEl) {
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (pos) {
        editor.commands.setTextSelection(pos.pos);
      }
    }

    e.preventDefault();
    setFloatingPos(null);
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 240),
      y: Math.min(e.clientY, window.innerHeight - 320),
      selectedText: selectedText || (clickedEntityLabel ?? ''),
      hasSelection: !empty || !!clickedEntityLabel,
      linkedEntityId: clickedEntityId,
      linkedEntityLabel: clickedEntityLabel,
      nodePos,
    });
  }

  // ── Slash Commands Definition ──────────────────────────────────────────
  const slashCommands: SlashCommandItem[] = useMemo(() => [
    {
      id: 'link-entity',
      title: 'Link to Existing Entity',
      desc: 'Insert an internal Wikipedia-style entity reference',
      icon: Link2,
      action: (ed) => {
        ed.commands.deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos });
        openLinkModal();
      },
    },
    {
      id: 'create-entity',
      title: 'Create New Entity',
      desc: 'Create a new database entity and link it',
      icon: PlusCircle,
      action: (ed) => {
        ed.commands.deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos });
        openQuickCreate();
      },
    },
    {
      id: 'h1',
      title: 'Heading 1',
      desc: 'Big section heading',
      icon: Heading1,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos }).toggleHeading({ level: 1 }).run();
      },
    },
    {
      id: 'h2',
      title: 'Heading 2',
      desc: 'Medium subsection heading',
      icon: Heading2,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos }).toggleHeading({ level: 2 }).run();
      },
    },
    {
      id: 'h3',
      title: 'Heading 3',
      desc: 'Sub-topic heading',
      icon: Heading3,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos }).toggleHeading({ level: 3 }).run();
      },
    },
    {
      id: 'bullet-list',
      title: 'Bulleted List',
      desc: 'Create a bulleted list',
      icon: List,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos }).toggleBulletList().run();
      },
    },
    {
      id: 'numbered-list',
      title: 'Numbered List',
      desc: 'Create an ordered sequence',
      icon: ListOrdered,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos }).toggleOrderedList().run();
      },
    },
    {
      id: 'quote',
      title: 'Blockquote',
      desc: 'Capture a historical quote or chronicle note',
      icon: Quote,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos }).toggleBlockquote().run();
      },
    },
    {
      id: 'divider',
      title: 'Horizontal Divider',
      desc: 'Visually separate encyclopedia sections',
      icon: Minus,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos }).setHorizontalRule().run();
      },
    },
    {
      id: 'table',
      title: 'Data Table',
      desc: 'Insert a 3x3 structured table',
      icon: TableIcon,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos }).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      id: 'media',
      title: 'Insert Image / Video',
      desc: 'Upload or embed photos, maps, and videos',
      icon: Film,
      action: (ed) => {
        ed.commands.deleteRange({ from: ed.state.selection.$anchor.start(), to: ed.state.selection.$anchor.pos });
        setIsMediaModalOpen(true);
      },
    },
  ], []);

  const filteredSlashCommands = useMemo(() => {
    if (!slashQuery) return slashCommands;
    return slashCommands.filter(c =>
      c.title.toLowerCase().includes(slashQuery) ||
      c.desc.toLowerCase().includes(slashQuery) ||
      c.id.includes(slashQuery)
    );
  }, [slashCommands, slashQuery]);

  function handleGlobalKeyDown(e: React.KeyboardEvent) {
    // 1. Autocomplete [[ navigation
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

    // 2. Slash menu navigation
    if (slashMenuPos && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIdx(i => Math.min(i + 1, filteredSlashCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredSlashCommands[slashIdx];
        if (cmd && editor) {
          cmd.action(editor);
          setSlashMenuPos(null);
        }
        return;
      }
      if (e.key === 'Escape') {
        setSlashMenuPos(null);
        return;
      }
    }

    // 3. Shortcut Ctrl+L or Cmd+L for linking text
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !readOnly) {
      e.preventDefault();
      openLinkModal();
      return;
    }

    // 4. Shortcut Ctrl+K for external or quick entity link
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !readOnly) {
      e.preventDefault();
      openLinkModal();
      return;
    }
  }

  // Handle clicking on inline entity links to navigate directly to their article
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.entity-link');
    if (target) {
      const entityId = target.getAttribute('data-entity-id') || target.getAttribute('href')?.replace(/^\/entity\//, '');
      if (entityId) {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/entity/${entityId}`);
      }
    }
  };

  if (!editor) return null;

  return (
    <div
      className={`article-editor ${readOnly ? 'readonly' : ''}`}
      onKeyDown={handleGlobalKeyDown}
      onContextMenu={handleContextMenu}
    >
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          onOpenLinkModal={() => openLinkModal()}
          onAutoLink={handleAutoLink}
          onOpenMediaModal={() => setIsMediaModalOpen(true)}
        />
      )}

      <div className="editor-content-wrapper" onClick={handleEditorClick}>
        <EditorContent editor={editor} className="tiptap-content" />
      </div>

      {/* ── FEATURE 1: Floating Contextual Toolbar for Selected Text ─── */}
      {floatingPos && !readOnly && !linkModalOpen && !createQuickOpen && (
        <div
          ref={floatingRef}
          className="editor-floating-toolbar"
          style={{
            position: 'fixed',
            top: floatingPos.top,
            left: floatingPos.left,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={e => {
            // Prevent blur from clearing text selection in TipTap
            e.preventDefault();
          }}
        >
          <button
            type="button"
            className={`float-btn ${editor.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            className={`float-btn ${editor.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            className={`float-btn ${editor.isActive('strike') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough size={13} />
          </button>
          <button
            type="button"
            className={`float-btn ${editor.isActive('code') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Code"
          >
            <Code size={13} />
          </button>

          <span className="float-sep" />

          {/* Link to Existing Entity */}
          <button
            type="button"
            className="float-btn accent"
            onClick={() => openLinkModal(floatingPos.selectedText)}
            title="Link to existing entity (Ctrl+L)"
          >
            <Link2 size={13} />
            <span>Link Entity</span>
          </button>

          {/* Create New Entity from Selection */}
          <button
            type="button"
            className="float-btn accent"
            onClick={() => openQuickCreate(floatingPos.selectedText)}
            title="Create new entity from selection"
          >
            <PlusCircle size={13} />
            <span>New Entity</span>
          </button>
        </div>
      )}

      {/* ── FEATURE 2: Custom Right-Click Context Menu ─────────────────── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="editor-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onContextMenu={e => e.preventDefault()}
        >
          {contextMenu.hasSelection && (
            <div className="context-header">
              Selected: "{contextMenu.selectedText.slice(0, 24)}{contextMenu.selectedText.length > 24 ? '…' : ''}"
            </div>
          )}

          {/* Entity Actions */}
          <button
            type="button"
            className="context-item"
            onClick={() => {
              const text = contextMenu.selectedText;
              setContextMenu(null);
              openLinkModal(text);
            }}
          >
            <Link2 size={14} className="text-accent" />
            <span className="context-item-label">Link to existing entity</span>
            <span className="context-item-shortcut">Ctrl+L</span>
          </button>

          <button
            type="button"
            className="context-item"
            onClick={() => {
              const text = contextMenu.selectedText;
              setContextMenu(null);
              openQuickCreate(text);
            }}
          >
            <PlusCircle size={14} className="text-accent" />
            <span className="context-item-label">Create new entity from text</span>
          </button>

          {contextMenu.linkedEntityId && (
            <>
              <button
                type="button"
                className="context-item"
                onClick={() => {
                  window.open(`/entity/${contextMenu.linkedEntityId}`, '_blank');
                  setContextMenu(null);
                }}
              >
                <ExternalLink size={14} />
                <span className="context-item-label">Open entity article in new tab</span>
              </button>

              <button
                type="button"
                className="context-item danger"
                onClick={() => {
                  if (contextMenu.nodePos !== undefined) {
                    editor.commands.unlinkEntity(contextMenu.nodePos);
                  }
                  setContextMenu(null);
                }}
              >
                <Unlink size={14} />
                <span className="context-item-label">Remove entity link (keep text)</span>
              </button>
            </>
          )}

          <div className="context-sep" />

          {/* Text Formatting Actions */}
          {contextMenu.hasSelection && (
            <>
              <button
                type="button"
                className="context-item"
                onClick={() => {
                  editor.chain().focus().toggleBold().run();
                  setContextMenu(null);
                }}
              >
                <Bold size={14} />
                <span className="context-item-label">Bold</span>
                <span className="context-item-shortcut">Ctrl+B</span>
              </button>
              <button
                type="button"
                className="context-item"
                onClick={() => {
                  editor.chain().focus().toggleItalic().run();
                  setContextMenu(null);
                }}
              >
                <Italic size={14} />
                <span className="context-item-label">Italic</span>
                <span className="context-item-shortcut">Ctrl+I</span>
              </button>
              <button
                type="button"
                className="context-item"
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.selectedText);
                  setContextMenu(null);
                }}
              >
                <Copy size={14} />
                <span className="context-item-label">Copy selected text</span>
              </button>
              <div className="context-sep" />
            </>
          )}

          <button
            type="button"
            className="context-item"
            onClick={() => {
              handleAutoLink();
              setContextMenu(null);
            }}
          >
            <Sparkles size={14} className="text-accent" />
            <span className="context-item-label">Auto-link all entity mentions</span>
          </button>
        </div>
      )}

      {/* ── FEATURE 5: Slash Commands Insertion Menu ─────────────────── */}
      {slashMenuPos && filteredSlashCommands.length > 0 && !readOnly && (
        <div
          className="editor-slash-menu"
          style={{ top: slashMenuPos.top, left: slashMenuPos.left }}
        >
          <div className="slash-menu-header">
            <span>Commands {slashQuery ? `matching "${slashQuery}"` : ''}</span>
            <span>Esc to close</span>
          </div>
          {filteredSlashCommands.map((cmd, idx) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                type="button"
                className={`slash-item ${idx === slashIdx ? 'active' : ''}`}
                onMouseDown={e => {
                  e.preventDefault();
                  cmd.action(editor);
                  setSlashMenuPos(null);
                }}
              >
                <div className="slash-item-icon">
                  <Icon size={14} />
                </div>
                <div className="slash-item-text">
                  <span className="slash-item-title">{cmd.title}</span>
                  <span className="slash-item-desc">{cmd.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

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

      {/* ── FEATURE 3: Link Text to Existing Entity Dialog ───────────── */}
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
                <div className="link-modal-empty">
                  <p>No entities found matching "{linkSearchQuery}"</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      const txt = linkSearchQuery || linkSelectionRange?.text || '';
                      setLinkModalOpen(false);
                      openQuickCreate(txt);
                    }}
                  >
                    <PlusCircle size={13} /> Create "{linkSearchQuery || 'New Entity'}"
                  </button>
                </div>
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

      {/* ── FEATURE 4: Create Entity From Selection Quick Modal ─────── */}
      <CreateEntityQuickModal
        isOpen={createQuickOpen}
        initialTitle={createQuickInitialTitle}
        worldId={worldId}
        onClose={() => setCreateQuickOpen(false)}
        onCreatedAndLinked={handleQuickCreatedAndLinked}
        onSelectExisting={(existingEnt) => {
          applyEntityLink(existingEnt);
          setCreateQuickOpen(false);
        }}
      />

      {/* ── FEATURE 5: Insert Image / Video Modal ─────────────────── */}
      <InsertMediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        allowInlineOption={true}
        onSaveMedia={async (data) => {
          let src = data.remoteUrl || '';
          if (data.file) {
            src = URL.createObjectURL(data.file);
          }
          if (src) {
            if (data.mediaType === 'image') {
              editor?.chain().focus().setImage({ src, alt: data.caption || data.title }).run();
            } else {
              editor?.chain().focus().insertContent(`<p><a href="${src}" target="_blank" rel="noopener noreferrer">🎬 Video: ${data.title || data.caption || src}</a></p>`).run();
            }
          }
          if (currentEntityId) {
            await addImage({
              entityId: currentEntityId,
              role: data.role,
              caption: data.caption,
              title: data.title,
              description: data.description,
              mediaType: data.mediaType,
              localBlob: data.file,
              remoteUrl: data.remoteUrl,
              sortOrder: 0,
            });
          }
        }}
      />

      {!readOnly && (
        <div className="editor-footer">
          <span>{editor.storage.characterCount?.characters()} characters · {editor.storage.characterCount?.words()} words</span>
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
  onOpenMediaModal: () => void;
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

function EditorToolbar({ editor, onOpenLinkModal, onAutoLink, onOpenMediaModal }: ToolbarProps) {
  return (
    <div className="editor-toolbar">
      <ToolBtn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </ToolBtn>
      <ToolBtn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
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
      <ToolBtn title="Insert Image or Video" onClick={onOpenMediaModal}>
        <Film size={14} />
      </ToolBtn>
      <span className="toolbar-sep" />
      <ToolBtn title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={14} />
      </ToolBtn>
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
      <ToolBtn title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
        <Undo size={14} />
      </ToolBtn>
      <ToolBtn title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}>
        <Redo size={14} />
      </ToolBtn>
    </div>
  );
}
