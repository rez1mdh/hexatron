// src/components/ui/CommandPalette.tsx
// Global command palette (Ctrl+K or Command Button) supporting quick actions, search, entity creation, and link/relationship generation

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal, Search, Plus, Link2, BookOpen, Globe,
  HelpCircle, ArrowRight, Check, AlertCircle, X
} from 'lucide-react';
import {
  getEntities, getWorlds, getEntityTypes, createEntity,
  createRelationship, getRelationshipTypes, formatEntryNumber
} from '../../db/operations';
import { useAppStore } from '../../store/appStore';
import type { Entity, World, EntityType, RelationshipType } from '../../db/schema';
import './CommandPalette.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandDef {
  id: string;
  syntax: string;
  title: string;
  description: string;
  category: 'navigate' | 'create' | 'link' | 'search';
  execute?: (args: string[]) => Promise<string | void>;
}

export default function CommandPalette({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { currentWorldId, setManageUniversesOpen, setBackupModalOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [relTypes, setRelTypes] = useState<RelationshipType[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setStatusMsg(null);
      getWorlds().then(setWorlds);
      getEntityTypes().then(setEntityTypes);
      getRelationshipTypes().then(setRelTypes);
      if (currentWorldId) {
        getEntities(currentWorldId).then(setEntities);
      } else {
        getEntities().then(setEntities);
      }
    }
  }, [isOpen, currentWorldId]);

  if (!isOpen) return null;

  // Built-in commands list
  const commands: CommandDef[] = [
    {
      id: 'cmd-quick-char',
      syntax: '/c <name>',
      title: 'Quick Character',
      description: 'Quickly create a new Character (e.g. /c John or /c "Marcus Vance")',
      category: 'create',
      execute: async (parts) => {
        let wId = currentWorldId;
        if (!wId) {
          const ws = await getWorlds();
          wId = ws[0]?.id;
        }
        if (!wId) throw new Error('Please create a world first.');
        if (parts.length < 1) throw new Error('Usage: /c <Character Name>');
        const name = parts.join(' ').replace(/^["']|["']$/g, '').trim();
        if (!name) throw new Error('Name cannot be empty.');
        const created = await createEntity({
          worldId: wId,
          typeId: 'et-character',
          title: name,
          aliases: [],
          tags: [],
          canonStatus: 'canon',
        });
        navigate(`/entity/${created.id}`);
        onClose();
        return `Created Character "${name}"`;
      }
    },
    {
      id: 'cmd-new-entity',
      syntax: '/new <type> <name>',
      title: 'Create Entity',
      description: 'Create any entity by type (e.g. /new religion Christianity or /new nation Eldoria)',
      category: 'create',
      execute: async (parts) => {
        let wId = currentWorldId;
        if (!wId) {
          const ws = await getWorlds();
          wId = ws[0]?.id;
        }
        if (!wId) throw new Error('Please create a world first.');
        if (parts.length < 2) throw new Error('Usage: /new <type> <name>');
        const typeInput = parts[0].toLowerCase().replace(/^["']|["']$/g, '');
        const name = parts.slice(1).join(' ').replace(/^["']|["']$/g, '').trim();
        if (!name) throw new Error('Entity title is required.');
        const matchedType = entityTypes.find(t =>
          t.name.toLowerCase() === typeInput ||
          t.id.toLowerCase() === typeInput ||
          t.id === `et-${typeInput}` ||
          t.name.toLowerCase().startsWith(typeInput)
        );
        if (!matchedType) {
          throw new Error(`Unknown type "${typeInput}". Available: ${entityTypes.map(t => t.name).join(', ')}`);
        }
        const created = await createEntity({
          worldId: wId,
          typeId: matchedType.id,
          title: name,
          aliases: [],
          tags: [],
          canonStatus: 'canon',
        });
        navigate(`/entity/${created.id}`);
        onClose();
        return `Created ${matchedType.name} "${name}"`;
      }
    },
    {
      id: 'cmd-link-entities',
      syntax: '/link <source> <relation> <target>',
      title: 'Link Entities',
      description: 'Connect two entities (e.g. /link "John" "parent" "Mark" or /link "John" "spouse" "Mary")',
      category: 'link',
      execute: async (parts) => {
        if (parts.length < 3) throw new Error('Usage: /link <Source> <relation> <Target>');
        // Regex to parse quoted strings or single words
        const rawArgs = parts.join(' ');
        const matches = rawArgs.match(/"([^"]+)"|'([^']+)'|(\S+)/g) || [];
        const clean = matches.map(m => m.replace(/^["']|["']$/g, '').trim());

        if (clean.length < 3) throw new Error('Usage: /link <Source> <relation> <Target>');
        const fromName = clean[0].toLowerCase();
        const verb = clean[1].toLowerCase();
        const toName = clean[2].toLowerCase();

        const fromEntity = entities.find(e => e.title.toLowerCase() === fromName || e.title.toLowerCase().includes(fromName));
        if (!fromEntity) throw new Error(`Entity "${clean[0]}" not found.`);

        const toEntity = entities.find(e => e.title.toLowerCase() === toName || e.title.toLowerCase().includes(toName));
        if (!toEntity) throw new Error(`Entity "${clean[2]}" not found.`);

        const matchedRel = relTypes.find(r =>
          r.name.toLowerCase().includes(verb) ||
          r.id.toLowerCase().includes(verb) ||
          r.reverseName.toLowerCase().includes(verb)
        );
        if (!matchedRel) throw new Error(`Unknown relation verb "${verb}". Available: parent, child, spouse, sibling, member, citizen, enemy, allied...`);

        await createRelationship({
          fromEntityId: fromEntity.id,
          toEntityId: toEntity.id,
          typeId: matchedRel.id,
          worldId: fromEntity.worldId,
          canonStatus: 'canon',
        });
        return `Linked "${fromEntity.title}" (${matchedRel.name}) "${toEntity.title}"`;
      }
    },
    {
      id: 'cmd-family-tree',
      syntax: '/tree <name>',
      title: 'Family Tree',
      description: 'Open the visual family tree for a character or family (e.g. /tree John)',
      category: 'navigate',
      execute: async (parts) => {
        if (parts.length < 1) throw new Error('Usage: /tree <Person or Family Name>');
        const name = parts.join(' ').replace(/^["']|["']$/g, '').toLowerCase();
        const target = entities.find(e => e.title.toLowerCase() === name || e.title.toLowerCase().includes(name));
        if (!target) throw new Error(`Entity "${name}" not found.`);
        navigate(`/entity/${target.id}`);
        onClose();
        return `Opened ${target.title}`;
      }
    },
    {
      id: 'cmd-graph-view',
      syntax: '/graph',
      title: 'Graph View',
      description: 'Open the Obsidian-style interactive network graph view',
      category: 'navigate',
      execute: async () => {
        navigate('/graph');
        onClose();
      }
    },
    {
      id: 'cmd-find-search',
      syntax: '/find <query>',
      title: 'Find / Search',
      description: 'Quick search for lore, characters, or text across all worlds (e.g. /find dragon)',
      category: 'search',
      execute: async (parts) => {
        const q = parts.join(' ');
        navigate(`/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
        onClose();
      }
    },
    {
      id: 'cmd-go-welcome',
      syntax: '/welcome',
      title: 'Welcome & Visitor Guide',
      description: 'Open the lore archive introduction, creator notes, and visitor guide',
      category: 'navigate',
      execute: async () => {
        navigate('/welcome');
        onClose();
      }
    },
    {
      id: 'cmd-go-help',
      syntax: '/help',
      title: 'Help & Guide',
      description: 'Open the beginner guide, family tree manual, and full command reference',
      category: 'navigate',
      execute: async () => {
        navigate('/help');
        onClose();
      }
    },
    {
      id: 'cmd-new-world',
      syntax: '/world new',
      title: 'New World',
      description: 'Create a new fictional setting or planet',
      category: 'create',
      execute: async () => {
        navigate('/new-world');
        onClose();
      }
    },
    {
      id: 'cmd-manage-universes',
      syntax: '/manage',
      title: 'Manage Universes & Worlds',
      description: 'Open the manager to inspect and delete universes or worlds',
      category: 'navigate',
      execute: async () => {
        onClose();
        setManageUniversesOpen(true);
      }
    },
    {
      id: 'cmd-export-backup',
      syntax: '/backup',
      title: 'Export Backup',
      description: 'Open Backup Center to download a full self-describing .json backup',
      category: 'navigate',
      execute: async () => {
        onClose();
        setBackupModalOpen(true, 'export');
      }
    },
    {
      id: 'cmd-import-restore',
      syntax: '/restore',
      title: 'Import / Restore Backup',
      description: 'Open Backup Center to validate and merge or restore data from a backup',
      category: 'navigate',
      execute: async () => {
        onClose();
        setBackupModalOpen(true, 'import');
      }
    }
  ];

  // Filtering results
  const isCommandQuery = query.startsWith('/');
  let displayItems: {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    action: () => void;
  }[] = [];

  if (isCommandQuery) {
    const rawCmd = query.trim().split(' ')[0].toLowerCase();
    const matchingCmds = commands.filter(c => c.syntax.toLowerCase().startsWith(rawCmd) || c.title.toLowerCase().includes(query.slice(1)));

    displayItems = matchingCmds.map(c => ({
      id: c.id,
      title: c.syntax,
      desc: c.description,
      icon: <Terminal size={15} className="text-accent" />,
      action: async () => {
        // Parse arguments if provided
        const parts = query.trim().split(/\s+/).slice(1);
        if (c.id === 'cmd-quick-char' && parts.length < 1) {
          setQuery('/c "Character Name"');
          return;
        }
        if (c.id === 'cmd-new-entity' && parts.length < 2) {
          setQuery('/new Character "Name"');
          return;
        }
        if (c.id === 'cmd-link-entities' && parts.length < 3) {
          setQuery('/link "Source" "parent" "Target"');
          return;
        }
        if (c.id === 'cmd-family-tree' && parts.length < 1) {
          setQuery('/tree "Person or House"');
          return;
        }
        if (c.execute) {
          try {
            const res = await c.execute(parts);
            if (res) setStatusMsg({ text: res, error: false });
          } catch (err) {
            setStatusMsg({ text: (err as Error).message, error: true });
          }
        }
      }
    }));
  } else if (query.trim().length > 0) {
    // Entity search matches
    const q = query.toLowerCase().trim();
    const cleanQ = q.startsWith('#') ? q.slice(1) : q;
    const matchingEntities = entities.filter(e => {
      const numStr = e.entryNumber !== undefined ? String(e.entryNumber) : '';
      const formatted = formatEntryNumber(e.entryNumber).toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        formatted.includes(q) ||
        numStr === cleanQ ||
        numStr.padStart(3, '0') === cleanQ ||
        e.aliases.some(a => a.toLowerCase().includes(q))
      );
    }).slice(0, 7);

    displayItems = matchingEntities.map(e => {
      const formattedNum = formatEntryNumber(e.entryNumber);
      return {
        id: e.id,
        title: formattedNum ? `${formattedNum} — ${e.title}` : e.title,
        desc: `Entity · ${e.typeId.replace('et-', '')} ${e.aliases.length > 0 ? `(a.k.a. ${e.aliases.join(', ')})` : ''}`,
        icon: <BookOpen size={15} />,
        action: () => {
          navigate(`/entity/${e.id}`);
          onClose();
        }
      };
    });

    // Matching worlds
    const matchingWorlds = worlds.filter(w => w.title.toLowerCase().includes(q));
    matchingWorlds.forEach(w => {
      displayItems.push({
        id: w.id,
        title: w.title,
        desc: `World · ${w.description || 'Fictional setting'}`,
        icon: <Globe size={15} />,
        action: () => {
          navigate(`/world/${w.id}`);
          onClose();
        }
      });
    });
  } else {
    // Default prompt choices
    displayItems = [
      ...commands.map(c => ({
        id: c.id,
        title: c.syntax,
        desc: c.description,
        icon: <Terminal size={15} className="text-accent" />,
        action: () => {
          if (c.id === 'cmd-go-help') {
            navigate('/help');
            onClose();
          } else {
            setQuery(c.syntax.split(' ')[0] + ' ');
          }
        }
      })),
      {
        id: 'help-center-choice',
        title: 'Open Help & Documentation Center',
        desc: 'Concepts, properties, relationships, and user manual',
        icon: <HelpCircle size={15} />,
        action: () => { navigate('/help'); onClose(); }
      }
    ];
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, displayItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayItems[selectedIndex]) {
        displayItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className="modal-backdrop command-palette-backdrop" onClick={onClose}>
      <div className="command-palette-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="palette-search-bar">
          <Search size={16} className="palette-icon-search" />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            value={query}
            placeholder="Type a command (/entity create, /link, /help) or search..."
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <button className="icon-btn small" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {statusMsg && (
          <div className={`palette-status ${statusMsg.error ? 'status-err' : 'status-ok'}`}>
            {statusMsg.error ? <AlertCircle size={14} /> : <Check size={14} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="palette-items-list">
          {displayItems.length === 0 ? (
            <div className="palette-empty">No matching commands or entities found.</div>
          ) : (
            displayItems.map((item, idx) => (
              <div
                key={item.id}
                className={`palette-item-row ${idx === selectedIndex ? 'active' : ''}`}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="palette-item-icon">{item.icon}</div>
                <div className="palette-item-content">
                  <div className="palette-item-title">{item.title}</div>
                  <div className="palette-item-desc">{item.desc}</div>
                </div>
                <ArrowRight size={13} className="palette-arrow" />
              </div>
            ))
          )}
        </div>

        <div className="palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> execute</span>
          <span><kbd>Esc</kbd> close</span>
          <span className="ml-auto">Type <code>/</code> for commands</span>
        </div>
      </div>
    </div>
  );
}
