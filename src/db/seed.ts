// src/db/seed.ts
// Built-in entity types and relationship types — seeded on first run

import { v4 as uuidv4 } from 'uuid';
import { db, type EntityType } from './schema';

export const BUILT_IN_ENTITY_TYPES: EntityType[] = [
  {
    id: 'et-character',
    name: 'Character',
    color: '#7c6af7',
    icon: 'User',
    description: 'Individuals, figures, leaders, and protagonists.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'birthDate', label: 'Birth Date', type: 'text' },
      { key: 'birthplace', label: 'Birthplace', type: 'text' },
      { key: 'nationality', label: 'Nationality / Citizenship', type: 'text' },
      { key: 'race', label: 'Race', type: 'text' },
      { key: 'ethnicity', label: 'Ethnicity', type: 'text' },
      { key: 'nativeLanguage', label: 'Native Language', type: 'text' },
      { key: 'religion', label: 'Religion / Faith', type: 'text' },
      { key: 'occupation', label: 'Occupation', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Alive', 'Deceased', 'Unknown', 'Immortal'] },
      { key: 'physicalDescription', label: 'Physical Description', type: 'text' },
    ]
  },
  {
    id: 'et-location',
    name: 'Location',
    color: '#4f9ef7',
    icon: 'MapPin',
    description: 'Places, cities, ruins, landmarks, and regions.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'climate', label: 'Climate', type: 'text' },
      { key: 'terrain', label: 'Terrain', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Ruins', 'Lost', 'Submerged', 'Inhabited'] },
    ]
  },
  {
    id: 'et-nation',
    name: 'Nation',
    color: '#f7a14f',
    icon: 'Shield',
    description: 'Kingdoms, empires, republics, and sovereign territories.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'governmentType', label: 'Government Type', type: 'text' },
      { key: 'capital', label: 'Capital', type: 'text' },
      { key: 'foundedDate', label: 'Founded Date', type: 'text' },
      { key: 'population', label: 'Population', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Existing', 'Fallen', 'Annexed', 'Emerging'] },
    ]
  },
  {
    id: 'et-event',
    name: 'Event',
    color: '#f75f5f',
    icon: 'Zap',
    description: 'Historical occurrences, battles, treaties, and catastrophes.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'startDate', label: 'Start Date', type: 'text' },
      { key: 'endDate', label: 'End Date', type: 'text' },
      { key: 'outcome', label: 'Outcome', type: 'text' },
    ]
  },
  {
    id: 'et-era',
    name: 'Era',
    color: '#6af7c8',
    icon: 'Clock',
    description: 'Ages, periods, and historical epochs.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'startYear', label: 'Start Year / Date', type: 'text' },
      { key: 'endYear', label: 'End Year / Date', type: 'text' },
    ]
  },
  {
    id: 'et-organization',
    name: 'Organization',
    color: '#f7d44f',
    icon: 'Users',
    description: 'Guilds, factions, orders, and corporations.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'headquarters', label: 'Headquarters', type: 'text' },
      { key: 'motto', label: 'Motto', type: 'text' },
      { key: 'leader', label: 'Current Leader', type: 'text' },
    ]
  },
  {
    id: 'et-family',
    name: 'Family / Dynasty',
    color: '#a855f7',
    icon: 'Crown',
    description: 'Houses, dynasties, bloodlines, clans, and lineages.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'motto', label: 'House Motto / Words', type: 'text' },
      { key: 'seat', label: 'Ancestral Seat / Estate', type: 'text' },
      { key: 'founder', label: 'Founder', type: 'text' },
      { key: 'currentHead', label: 'Current Head', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Thriving', 'Declining', 'Extinct', 'Exiled', 'Ruling'] },
    ]
  },
  {
    id: 'et-ethnicity',
    name: 'Ethnicity',
    color: '#ec4899',
    icon: 'Users',
    description: 'Ethnic groups, ancestral populations, and peoples.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'homeland', label: 'Ancestral Homeland', type: 'text' },
      { key: 'associatedLanguage', label: 'Primary Language', type: 'text' },
    ]
  },
  {
    id: 'et-culture',
    name: 'Culture',
    color: '#e07cf7',
    icon: 'Globe',
    description: 'Customs, traditions, and societal groups.',
    isBuiltIn: true,
  },
  {
    id: 'et-religion',
    name: 'Religion',
    color: '#f7f74f',
    icon: 'Star',
    description: 'Pantheons, belief systems, and faiths.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'deity', label: 'Primary Deity', type: 'text' },
      { key: 'holySite', label: 'Holy Site', type: 'text' },
    ]
  },
  {
    id: 'et-language',
    name: 'Language',
    color: '#4ff7f7',
    icon: 'MessageSquare',
    description: 'Spoken, written, or magical tongues.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'languageFamily', label: 'Language Family', type: 'text' },
      { key: 'languageBranch', label: 'Branch / Subfamily', type: 'text' },
      { key: 'script', label: 'Writing System / Script', type: 'text' },
      { key: 'nativeSpeakers', label: 'Native Speaker Count', type: 'text' },
      { key: 'totalSpeakers', label: 'Total Speaker Count', type: 'text' },
      { key: 'earliestRecord', label: 'Earliest Attestation / Era', type: 'text' },
    ]
  },
  {
    id: 'et-creature',
    name: 'Creature',
    color: '#f74fa1',
    icon: 'Feather',
    description: 'Flora, fauna, biological species, and monstrous life.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'habitat', label: 'Habitat & Geographic Range', type: 'text' },
      { key: 'diet', label: 'Diet', type: 'select', options: ['Herbivore', 'Carnivore', 'Omnivore', 'Magivore', 'Other'] },
      { key: 'temperament', label: 'Temperament', type: 'text' },
      { key: 'ancestorSpecies', label: 'Ancestor / Predecessor Species', type: 'text' },
      { key: 'evolutionaryTraits', label: 'Key Adaptations / Traits', type: 'text' },
      { key: 'status', label: 'Conservation / Extinction Status', type: 'select', options: ['Extant', 'Endangered', 'Extinct', 'Mythical'] },
    ]
  },
  {
    id: 'et-map',
    name: 'Map',
    color: '#a1f74f',
    icon: 'Map',
    description: 'Cartographic records, world maps, and regional charts.',
    isBuiltIn: true,
  },
  {
    id: 'et-artifact',
    name: 'Artifact',
    color: '#f7a14f',
    icon: 'Package',
    description: 'Relics, magical items, heirlooms, and legendary objects.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'weight', label: 'Weight', type: 'text' },
      { key: 'creator', label: 'Creator / Origin', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Intact', 'Damaged', 'Destroyed', 'Lost'] },
    ]
  },
  {
    id: 'et-timeline',
    name: 'Timeline',
    color: '#4fa1f7',
    icon: 'GitBranch',
    description: 'Chronologies, canon branches, and alternate paths.',
    isBuiltIn: true,
  },
  {
    id: 'et-concept',
    name: 'Concept',
    color: '#a14ff7',
    icon: 'Lightbulb',
    description: 'Magical systems, scientific laws, or philosophies.',
    isBuiltIn: true,
  },
  {
    id: 'et-universe',
    name: 'Universe',
    color: '#ec4899',
    icon: 'Sparkles',
    description: 'Cosmic domains, dimensions, realities, and universal planes.',
    isBuiltIn: true,
  },
  {
    id: 'et-galaxy',
    name: 'Galaxy',
    color: '#d946ef',
    icon: 'Compass',
    description: 'Galaxies, star clusters, nebulae, and interstellar voids.',
    isBuiltIn: true,
  },
  {
    id: 'et-solar-system',
    name: 'Star / Solar System',
    color: '#f59e0b',
    icon: 'Sun',
    description: 'Stars, binary systems, planetary orbits, and asteroid belts.',
    isBuiltIn: true,
  },
  {
    id: 'et-planet',
    name: 'Planet',
    color: '#06b6d4',
    icon: 'Globe',
    description: 'Planets, moons, orbital habitats, and celestial bodies.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'planetType', label: 'Planet Type', type: 'text' },
      { key: 'atmosphere', label: 'Atmosphere', type: 'text' },
      { key: 'gravity', label: 'Surface Gravity', type: 'text' },
      { key: 'orbitalPeriod', label: 'Orbital Period / Year Length', type: 'text' },
    ]
  },
  {
    id: 'et-continent',
    name: 'Continent',
    color: '#10b981',
    icon: 'Compass',
    description: 'Major landmasses, subcontinents, and continental plates.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'climate', label: 'Dominant Climate', type: 'text' },
      { key: 'terrain', label: 'Major Terrain', type: 'text' },
    ]
  },
  {
    id: 'et-region',
    name: 'Region',
    color: '#14b8a6',
    icon: 'Map',
    description: 'Geographic zones, biomes, cultural regions, and frontiers.',
    isBuiltIn: true,
  },
  {
    id: 'et-governorate',
    name: 'Governorate',
    color: '#8b5cf6',
    icon: 'Landmark',
    description: 'Autonomous regional provinces, governorates, and federated divisions.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'capital', label: 'Regional Capital', type: 'text' },
      { key: 'governor', label: 'Governor / Head of Region', type: 'text' },
      { key: 'population', label: 'Population', type: 'text' },
    ]
  },
  {
    id: 'et-state',
    name: 'State / Province',
    color: '#3b82f6',
    icon: 'Layers',
    description: 'Constituent states, provinces, cantons, and federal units.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'capital', label: 'State Capital', type: 'text' },
      { key: 'population', label: 'Population', type: 'text' },
      { key: 'rulingCluster', label: 'Ruling Political Cluster', type: 'text' },
    ]
  },
  {
    id: 'et-territory',
    name: 'Territory / District',
    color: '#6366f1',
    icon: 'MapPin',
    description: 'Federal territories, special administrative districts, and enclaves.',
    isBuiltIn: true,
  },
  {
    id: 'et-city',
    name: 'City',
    color: '#0ea5e9',
    icon: 'Building2',
    description: 'Major cities, metropolises, capitals, and urban hubs.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'population', label: 'Population', type: 'text' },
      { key: 'isCapital', label: 'Is Capital?', type: 'boolean' },
    ]
  },
  {
    id: 'et-settlement',
    name: 'Settlement / Town',
    color: '#64748b',
    icon: 'Home',
    description: 'Towns, villages, ports, outposts, and rural communities.',
    isBuiltIn: true,
  },
  {
    id: 'et-calendar',
    name: 'Calendar / Dating System',
    color: '#eab308',
    icon: 'Calendar',
    description: 'Calendar systems, epochs, dating conventions, and chronologies.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'epoch', label: 'Starting Epoch / Year 0', type: 'text' },
      { key: 'currentYear', label: 'Current Year', type: 'text' },
      { key: 'eras', label: 'Dating Eras / Abbreviations', type: 'text' },
    ]
  },
  {
    id: 'et-theory',
    name: 'Theory / Interpretation',
    color: '#a855f7',
    icon: 'HelpCircle',
    description: 'Competing historical theories, academic hypotheses, and doctrines.',
    isBuiltIn: true,
    defaultFields: [
      { key: 'proposedBy', label: 'Proposed By / Proponents', type: 'text' },
      { key: 'consensusStatus', label: 'Consensus Status', type: 'select', options: ['Mainstream', 'Disputed', 'Fringe', 'Historical Myth', 'Under Investigation'] },
    ]
  },
];

export const BUILT_IN_RELATIONSHIP_TYPES = [
  { id: 'rt-part-of',       name: 'part of',          reverseName: 'has part',           color: '#6366f1', isBuiltIn: true },
  { id: 'rt-parent-of',     name: 'parent of',       reverseName: 'child of',           color: '#7c6af7', isBuiltIn: true },
  { id: 'rt-member-of',     name: 'member of',        reverseName: 'has member',         color: '#4f9ef7', isBuiltIn: true },
  { id: 'rt-located-in',    name: 'located in',       reverseName: 'contains',           color: '#4ff7c8', isBuiltIn: true },
  { id: 'rt-capital-of',    name: 'capital of',       reverseName: 'has capital',        color: '#f59e0b', isBuiltIn: true },
  { id: 'rt-ruled',         name: 'ruled',            reverseName: 'ruled by',           color: '#f7a14f', isBuiltIn: true },
  { id: 'rt-governs',       name: 'governs',          reverseName: 'governed by',        color: '#8b5cf6', isBuiltIn: true },
  { id: 'rt-allied-with',   name: 'allied with',      reverseName: 'allied with',        color: '#6af7c8', isBuiltIn: true },
  { id: 'rt-enemy-of',      name: 'enemy of',         reverseName: 'enemy of',           color: '#f75f5f', isBuiltIn: true },
  { id: 'rt-involved-in',   name: 'involved in',      reverseName: 'involved',           color: '#f7d44f', isBuiltIn: true },
  { id: 'rt-proposes',      name: 'proposes',         reverseName: 'proposed by',        color: '#a855f7', isBuiltIn: true },
  { id: 'rt-created',       name: 'created',          reverseName: 'created by',         color: '#e07cf7', isBuiltIn: true },
  { id: 'rt-depicts',       name: 'depicts',          reverseName: 'depicted by',        color: '#a1f74f', isBuiltIn: true },
  { id: 'rt-diverged-from', name: 'diverged from',    reverseName: 'is origin of',       color: '#4fa1f7', isBuiltIn: true },
  { id: 'rt-belongs-to',    name: 'belongs to',       reverseName: 'contains',           color: '#f74fa1', isBuiltIn: true },
  { id: 'rt-occurred-in',   name: 'occurred in',      reverseName: 'context for',        color: '#f7f74f', isBuiltIn: true },
  { id: 'rt-married-to',    name: 'married to',       reverseName: 'married to',         color: '#7cf7a1', isBuiltIn: true },
  { id: 'rt-spouse-of',     name: 'spouse of',        reverseName: 'spouse of',          color: '#ec4899', isBuiltIn: true },
  { id: 'rt-child-of',      name: 'child of',         reverseName: 'parent of',          color: '#a855f7', isBuiltIn: true },
  { id: 'rt-sibling-of',    name: 'sibling of',       reverseName: 'sibling of',         color: '#6366f1', isBuiltIn: true },
  { id: 'rt-adopted-by',    name: 'adopted by',       reverseName: 'adopted parent of',  color: '#8b5cf6', isBuiltIn: true },
  { id: 'rt-citizen-of',    name: 'citizen of',       reverseName: 'has citizen',        color: '#f97316', isBuiltIn: true },
  { id: 'rt-follows-faith', name: 'follows faith',    reverseName: 'practiced by',       color: '#eab308', isBuiltIn: true },
  { id: 'rt-founded',       name: 'founded',          reverseName: 'founded by',         color: '#f7c84f', isBuiltIn: true },
  { id: 'rt-spoke',         name: 'spoke',            reverseName: 'spoken by',          color: '#4ff7f7', isBuiltIn: true },
  { id: 'rt-spoken-in',     name: 'spoken in',        reverseName: 'languages spoken',   color: '#38bdf8', isBuiltIn: true },
  { id: 'rt-evolved-from',  name: 'evolved from',     reverseName: 'evolved into',       color: '#ec4899', isBuiltIn: true },
  { id: 'rt-descended-from',name: 'descended from',   reverseName: 'ancestor of',        color: '#8b5cf6', isBuiltIn: true },
];

export async function seedBuiltIns(): Promise<void> {
  // Ensure all built-in entity types exist
  for (const bt of BUILT_IN_ENTITY_TYPES) {
    const cur = await db.entityTypes.get(bt.id);
    if (!cur) {
      await db.entityTypes.add(bt);
    } else if (cur.isBuiltIn && !cur.defaultFields && bt.defaultFields) {
      await db.entityTypes.update(bt.id, {
        defaultFields: bt.defaultFields,
        description: cur.description || bt.description,
      });
    }
  }

  // Ensure all built-in relationship types exist
  for (const rt of BUILT_IN_RELATIONSHIP_TYPES) {
    const cur = await db.relationshipTypes.get(rt.id);
    if (!cur) {
      await db.relationshipTypes.add(rt);
    }
  }

  // Built-in entity types and relationship types seeded
}
