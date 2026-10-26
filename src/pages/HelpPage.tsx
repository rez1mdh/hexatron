// src/pages/HelpPage.tsx — In-app documentation, user manual & searchable command reference

import { useState } from 'react';
import {
  HelpCircle, Search, BookOpen, Layers, Link2, Terminal,
  Shield, Database, RefreshCw, Smartphone, Key, Compass, ChevronDown, ChevronRight,
  Sparkles, GitBranch
} from 'lucide-react';
import './HelpPage.css';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function HelpPage() {
  const [activeSectionId, setActiveSectionId] = useState('entities');
  const [cmdSearch, setCmdSearch] = useState('');

  const commands = [
    {
      name: 'Quick Character',
      syntax: '/c <name>',
      desc: 'Super-fast command to create a character entity in the active world.',
      requiredArgs: '<name>: Character name (e.g. John or "Marcus Vance")',
      example: '/c "Jon Snow"',
      result: 'Creates a Character entity and opens its profile.'
    },
    {
      name: 'Create Entity',
      syntax: '/new <type> <name>',
      desc: 'Creates a new entity of any type (built-in or custom).',
      requiredArgs: '<type>: Type name (e.g. character, nation, religion, family, weapon); <name>: Entity title',
      example: '/new religion "Eastern Orthodox"',
      result: 'Creates entity record and navigates directly to it.'
    },
    {
      name: 'Link Entities',
      syntax: '/link <source> <relation> <target>',
      desc: 'Creates a relationship link between two existing entities.',
      requiredArgs: '<source>: Entity name; <relation>: Verb (parent, child, spouse, sibling, member, citizen...); <target>: Target entity',
      example: '/link "Jon Snow" "parent" "Ned Stark"',
      result: 'Creates an explicit relationship linking both entities.'
    },
    {
      name: 'Visual Family Tree',
      syntax: '/tree <name>',
      desc: 'Jumps directly to the visual family tree for a person or dynasty.',
      requiredArgs: '<name>: Character or Family name',
      example: '/tree "House Stark"',
      result: 'Opens the entity page with the interactive Family Tree expanded.'
    },
    {
      name: 'Search Database',
      syntax: '/find <query>',
      desc: 'Quickly search all entities, lore, aliases, and articles.',
      requiredArgs: '<query>: Search keyword or phrase',
      example: '/find dragon',
      result: 'Navigates to the search page with instant results.'
    },
    {
      name: 'New World',
      syntax: '/world new',
      desc: 'Opens the world creation wizard to start a new world or planet.',
      requiredArgs: 'None',
      example: '/world new',
      result: 'Opens the New World page.'
    },
    {
      name: 'Open Help',
      syntax: '/help',
      desc: 'Opens this Help Center and Guide manual.',
      requiredArgs: 'None',
      example: '/help',
      result: 'Navigates to the Help Center.'
    }
  ];

  const filteredCommands = commands.filter(c =>
    c.name.toLowerCase().includes(cmdSearch.toLowerCase()) ||
    c.syntax.toLowerCase().includes(cmdSearch.toLowerCase()) ||
    c.desc.toLowerCase().includes(cmdSearch.toLowerCase())
  );

  const sections: GuideSection[] = [
    {
      id: 'entities',
      title: '1. What is an Entity?',
      icon: <BookOpen size={16} />,
      content: (
        <div>
          <p>An <strong>Entity</strong> is the primary unit of lore in Hexatron. Everything in your fictional universe is an entity: a person, nation, artifact, battle, planet, philosophy, or creature.</p>
          <p>Every entity possesses:</p>
          <ul>
            <li><strong>Title:</strong> The main name of the record.</li>
            <li><strong>Aliases:</strong> Alternative names, titles, or moniker translations (fully indexed for search and autocomplete).</li>
            <li><strong>Entity Type:</strong> Its ontological classification (e.g., Character, Nation, Weapon).</li>
            <li><strong>Canon Status:</strong> Canon, Provisional, Disputed, Non-Canon, or Alternate Timeline.</li>
            <li><strong>Properties:</strong> Structured typed key-value attributes (e.g., birth dates, weights, populations).</li>
            <li><strong>Relationships:</strong> Explicit first-class connections to other entities.</li>
            <li><strong>Wiki Article:</strong> Rich-text long-form article with internal entity links.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'entity-types',
      title: '2. Entity Types & Custom Categories',
      icon: <Layers size={16} />,
      content: (
        <div>
          <p>Entity types are <strong>user-defined categories</strong>, not rigid code limits. You can create custom types (e.g., <em>Family, Dynasty, Species, Weapon, Vehicle, Planet, Empire</em>) whenever your universe demands them.</p>
          <h4>How to Create a Custom Entity Type:</h4>
          <ol>
            <li>Click the <strong>Manage Types</strong> or <strong>+ button</strong> on any world overview or entity edit screen.</li>
            <li>Click <strong>New Type</strong>.</li>
            <li>Provide a <strong>Display Name</strong> (e.g., "Weapon"). The unique internal identifier (e.g., <code>et-weapon</code>) is generated automatically.</li>
            <li>Choose an accent color and an icon (Swords, Crowns, Rockets, Shields, etc.).</li>
            <li>Optionally configure <strong>Default Fields</strong> (such as <em>Material, Weight, Manufacturer</em>).</li>
            <li>Click <strong>Create Type</strong>. It becomes immediately selectable everywhere in forms, filters, and searches.</li>
          </ol>
          <div className="callout-note">
            <strong>Safe Deletion:</strong> Types in active use cannot be deleted accidentally. Hexatron verifies whether any entities are assigned to that category before deletion is allowed.
          </div>
        </div>
      )
    },
    {
      id: 'properties-vs-relationships',
      title: '3. Properties vs. Relationships',
      icon: <Link2 size={16} />,
      content: (
        <div>
          <p>Understanding the distinction between properties and relationships is central to clean worldbuilding:</p>
          <div className="table-wrapper">
            <table className="help-table">
              <thead>
                <tr>
                  <th>Concept</th>
                  <th>What it represents</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Property</strong></td>
                  <td>An attribute describing the entity itself (numbers, text, dates, booleans, options).</td>
                  <td>Weight: <em>4.5 kg</em>, Population: <em>12,000,000</em>, Climate: <em>Arid</em>, Status: <em>Alive</em></td>
                </tr>
                <tr>
                  <td><strong>Relationship</strong></td>
                  <td>A direct, first-class connection between two distinct entity records.</td>
                  <td><em>John</em> [member of] <em>Iron Guild</em>, <em>America</em> [contains] <em>Washington</em></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>Do not use raw text strings for entities that exist in your database—use <strong>Relationships</strong> or <strong>Entity References</strong> so bidirectional links and navigation stay permanent even if you rename entities.</p>
        </div>
      )
    },
    {
      id: 'entity-search-creation',
      title: '4. Instant Entity Search & Inline Creation',
      icon: <Sparkles size={16} />,
      content: (
        <div>
          <p>Whenever you edit a field or relationship that refers to another entity (such as a character's religion, nationality, language, or spouse), you never need to leave the page to create missing records:</p>
          <ol>
            <li><strong>Type to search:</strong> Type the name into the selector (e.g. <em>"Christianity"</em> or <em>"House Stark"</em>).</li>
            <li><strong>Reuses existing:</strong> If the entity already exists, it appears with its category icon. Selecting it links directly to that existing entity ID—never creating duplicates.</li>
            <li><strong>Instant creation:</strong> If it does not exist, an option <code>+ Create new [Type]: "[Name]"</code> appears.</li>
            <li><strong>Automatic article:</strong> Selecting it creates the entity immediately, assigns a permanent UUID, links it to your current record, and gives the new entity its own editable article.</li>
            <li><strong>Renaming safety:</strong> Because links use stable IDs rather than raw strings, renaming an entity later updates all references across the universe without breaking links.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'family-trees',
      title: '5. Family Trees & Dynasty Management',
      icon: <GitBranch size={16} />,
      content: (
        <div>
          <p>Hexatron includes a visual <strong>Family Tree</strong> engine designed for worldbuilders:</p>
          <ul>
            <li><strong>Generation Tiers:</strong> Organizes families automatically into <em>Generation I (Parents & Ancestors)</em>, <em>Generation II (Subject, Spouses & Siblings)</em>, and <em>Generation III (Children & Descendants)</em>.</li>
            <li><strong>Spouses & Marriages:</strong> Supported via <code>rt-spouse-of</code> / <code>rt-married-to</code> with partner badges. Multiple spouses and complex marital lines are supported.</li>
            <li><strong>Adoptions:</strong> Explicitly marked with an amber <em>Adopted</em> badge, supporting non-biological lineage.</li>
            <li><strong>Calculated Siblings:</strong> When two characters share the same parents, Hexatron automatically identifies them as siblings without requiring duplicate manual links.</li>
            <li><strong>Dynasty / House Articles:</strong> On Family articles (e.g., <em>House Stark</em> or <em>Julio-Claudian Dynasty</em>), all house members and lineages appear in a centralized visual lineage board.</li>
            <li><strong>Interactive Navigation:</strong> Click any character card in the family tree to navigate directly to their article. Click <strong>Unlink</strong> to safely remove a relationship without deleting either character.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'demographics-charts',
      title: '6. Demographics, Ancestry & Interactive Charts',
      icon: <Compass size={16} />,
      content: (
        <div>
          <p>Add statistical breakdowns to any nation, city, religion, or character:</p>
          <ul>
            <li><strong>Ancestry Composition:</strong> Break down a character's lineage (e.g. 60% Irish, 20% German, 20% French) with real-time percentage validation.</li>
            <li><strong>Nation Demographics:</strong> Record ethnic compositions, religious affiliations, or language speaker distributions.</li>
            <li><strong>Interactive Visual Charts:</strong> Render pure SVG <strong>Pie</strong>, <strong>Donut</strong>, or <strong>Bar</strong> charts with hover tooltips.</li>
            <li><strong>Linked Entities:</strong> Link demographic categories (like <em>Spanish</em> or <em>Celtic</em>) to real entities in your world—clicking the slice or bar opens that entity's article!</li>
          </ul>
        </div>
      )
    },
    {
      id: 'wiki-links',
      title: '7. Wiki Articles, Links & Backlinks',
      icon: <Compass size={16} />,
      content: (
        <div>
          <p>Writing in Hexatron functions like an interconnected personal encyclopedia:</p>
          <ul>
            <li><strong>Internal Entity Links:</strong> Type <code>[[</code> anywhere in an article to bring up the autocomplete dropdown. Typing entity names filters matches in real time.</li>
            <li><strong>Stable Entity References:</strong> Links store internal UUIDs rather than raw strings. Renaming an entity automatically updates across the application without breaking links.</li>
            <li><strong>Automatic Backlinks:</strong> Hexatron extracts entity references from article bodies on save and automatically computes <em>"Referenced by"</em> backlinks in the right context panel.</li>
            <li><strong>Create from Unresolved Link:</strong> If an entity does not exist yet when typing <code>[[Something]]</code>, select <em>+ Create "Something" as new entity</em> directly from the popup.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'command-palette',
      title: '8. Command Palette & Simpler Shortcuts',
      icon: <Terminal size={16} />,
      content: (
        <div>
          <p>Hexatron features a built-in command palette accessible from any screen:</p>
          <ul>
            <li><strong>Keyboard Shortcut:</strong> Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>/</kbd>) on desktop.</li>
            <li><strong>Mobile / Button:</strong> Click the <strong>Commands</strong> or <strong>Search</strong> button in the navigation bar.</li>
          </ul>
          <p>Below is the complete reference of simpler commands you can execute directly:</p>
          <div className="cmd-search-box">
            <Search size={14} />
            <input
              type="text"
              className="form-input small"
              placeholder="Filter command reference…"
              value={cmdSearch}
              onChange={e => setCmdSearch(e.target.value)}
            />
          </div>
          <div className="command-cards-grid">
            {filteredCommands.map(cmd => (
              <div key={cmd.name} className="cmd-card">
                <div className="cmd-card-header">
                  <span className="cmd-card-name">{cmd.name}</span>
                  <code className="cmd-card-syntax">{cmd.syntax}</code>
                </div>
                <p className="cmd-card-desc">{cmd.desc}</p>
                <div className="cmd-card-meta">
                  <div><strong>Arguments:</strong> {cmd.requiredArgs}</div>
                  <div><strong>Example:</strong> <code>{cmd.example}</code></div>
                  <div><strong>Result:</strong> {cmd.result}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'offline-sync-backup',
      title: '9. Offline Editing, Sync & Backups',
      icon: <Database size={16} />,
      content: (
        <div>
          <p>Hexatron is designed <strong>offline-first</strong> using client-side IndexedDB (Dexie.js):</p>
          <ul>
            <li><strong>Persistent Storage:</strong> The app requests persistent quota from the browser so browser cleanup routines will not evict your worlds.</li>
            <li><strong>Full JSON Backup:</strong> Click the <strong>Download icon</strong> in the top navigation bar to export a complete JSON snapshot of all universes, worlds, custom entity types, relationships, images, and articles.</li>
            <li><strong>Restoration & Migration:</strong> Click the <strong>Upload icon</strong> in the top bar to import any previously exported Hexatron backup.</li>
            <li><strong>Change Ledger:</strong> All mutations (creations, edits, deletions, relationships) are logged to an internal <code>changes</code> table for eventual peer-to-peer or server synchronization.</li>
          </ul>
        </div>
      )
    }
  ];

  const currentSection = sections.find(s => s.id === activeSectionId) ?? sections[0];

  return (
    <div className="page-container help-page">
      <div className="help-header">
        <div className="help-header-title-row">
          <HelpCircle size={28} className="text-accent" />
          <div>
            <h1 className="help-title">Help Center & Worldbuilding Guide</h1>
            <p className="help-subtitle">Everything you need to know about entities, custom schemas, relationships, and commands</p>
          </div>
        </div>
      </div>

      <div className="help-layout">
        {/* Sidebar table of contents */}
        <aside className="help-toc-sidebar">
          <div className="help-toc-heading">Topics</div>
          {sections.map(s => (
            <button
              key={s.id}
              className={`help-toc-item ${activeSectionId === s.id ? 'active' : ''}`}
              onClick={() => setActiveSectionId(s.id)}
            >
              {s.icon}
              <span>{s.title}</span>
            </button>
          ))}
        </aside>

        {/* Main topic content */}
        <main className="help-content-pane">
          <div className="help-content-card">
            <h2 className="help-section-title">{currentSection.title}</h2>
            <div className="help-section-body">
              {currentSection.content}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
