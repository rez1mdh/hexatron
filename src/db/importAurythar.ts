// src/db/importAurythar.ts
// Comprehensive Cosmological, Geographical & Lore Audit for Universe of Aurythar (530 A.C.)

import { v4 as uuidv4 } from 'uuid';
import { db, type StatisticalDataset, type Entity, type Relationship } from './schema';
import { getNextEntryNumber } from './operations';

// Helper to create valid TipTap ProseMirror document JSON strings
function makeDoc(sections: { heading?: string; paragraphs?: string[]; list?: string[] }[]): string {
  const content: any[] = [];
  for (const sec of sections) {
    if (sec.heading) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: sec.heading }]
      });
    }
    if (sec.paragraphs) {
      for (const p of sec.paragraphs) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: p }]
        });
      }
    }
    if (sec.list && sec.list.length > 0) {
      content.push({
        type: 'bulletList',
        content: sec.list.map(item => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: item }]
          }]
        }))
      });
    }
  }
  return JSON.stringify({ type: 'doc', content });
}

export interface AuditReport {
  universeId: string;
  worldId: string;
  totalEntities: number;
  updatedEntities: number;
  newEntities: number;
  totalRelationships: number;
}

export async function importAurytharData(forceAudit: boolean = true): Promise<AuditReport> {
  const now = Date.now();

  // 1. Universe check or creation
  let existingUniv = await db.universes.filter(u => u.title === 'Universe of Aurythar').first();
  let universeId: string;
  if (!existingUniv) {
    universeId = uuidv4();
    await db.universes.add({
      id: universeId,
      title: 'Universe of Aurythar',
      description: 'A sprawling fictional universe defined by deep federal politics, colonizer vs native demographic tensions, ethnic stratification, and religious schisms.',
      createdAt: now,
      updatedAt: now,
    });
  } else {
    universeId = existingUniv.id;
  }

  // 2. World container check or creation
  let existingWorld = await db.worlds.where('universeId').equals(universeId).first();
  let worldId: string;
  if (!existingWorld) {
    worldId = uuidv4();
    await db.worlds.add({
      id: worldId,
      universeId,
      title: 'Aurythar',
      description: 'The setting and planetary domain of the Federated States of Aurythar (FSA) and adjacent sovereign realms in 530 A.C.',
      color: '#3b82f6',
      icon: 'Globe',
      createdAt: now,
      updatedAt: now,
    });
  } else {
    worldId = existingWorld.id;
  }

  // 3. Load existing entities for this world to preserve stable internal IDs and entry numbers
  const existingEntities = await db.entities.where('worldId').equals(worldId).toArray();
  const existingByTitle = new Map<string, Entity>();
  for (const e of existingEntities) {
    existingByTitle.set(e.title.trim().toLowerCase(), e);
  }

  // Map to store final entity IDs by registry key
  const eMap = new Map<string, string>();
  const entitiesToUpsert: Entity[] = [];
  const relationshipsToInsert: Relationship[] = [];

  let nextNum = await getNextEntryNumber();
  let updatedCount = 0;
  let newCount = 0;

  function registerOrAuditEntity(
    key: string,
    title: string,
    typeId: string,
    article: string,
    properties: Record<string, unknown> = {},
    tags: string[] = [],
    aliases: string[] = [],
    demographicDatasets?: StatisticalDataset[]
  ): string {
    const existing = existingByTitle.get(title.trim().toLowerCase());
    if (existing) {
      // PRESERVE STABLE ID & PERMANENT ENTRY NUMBER
      const entityId = existing.id;
      eMap.set(key, entityId);
      entitiesToUpsert.push({
        ...existing,
        typeId,
        title,
        aliases: Array.from(new Set([...(existing.aliases || []), ...aliases])),
        article,
        properties: { ...(existing.properties || {}), ...properties },
        tags: Array.from(new Set([...(existing.tags || []), ...tags])),
        demographicDatasets: demographicDatasets || existing.demographicDatasets,
        updatedAt: now,
      });
      updatedCount++;
      return entityId;
    } else {
      // NEW ENTITY
      const entityId = uuidv4();
      eMap.set(key, entityId);
      entitiesToUpsert.push({
        id: entityId,
        worldId,
        typeId,
        title,
        entryNumber: nextNum++,
        aliases,
        article,
        properties,
        tags,
        canonStatus: 'canon',
        demographicDatasets,
        linkedEntityIds: [],
        createdAt: now,
        updatedAt: now,
      });
      newCount++;
      return entityId;
    }
  }

  function addRel(fromKey: string, toKey: string, typeId: string, notes?: string) {
    const fromId = eMap.get(fromKey);
    const toId = eMap.get(toKey);
    if (!fromId || !toId) {
      return;
    }
    relationshipsToInsert.push({
      id: uuidv4(),
      fromEntityId: fromId,
      toEntityId: toId,
      typeId,
      worldId,
      canonStatus: 'canon',
      notes,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // A. COSMOLOGICAL & CONTINENTAL CONTAINERS
  // ─────────────────────────────────────────────────────────────────────────

  registerOrAuditEntity(
    'cosmo-planet-aurythar',
    'Planet Aurythar',
    'et-planet',
    makeDoc([
      {
        heading: 'Astronomical & Planetary Profile',
        paragraphs: [
          'Planet Aurythar is a terrestrial world situated within the primary life-bearing orbit of its parent star. Characterized by expansive ocean basins, diverse climate belts ranging from subpolar archipelago zones to hyper-arid savannahs, it is the home world of the continent of Aurythar and overseas realms such as the Kingdom of Kalthar.',
          'The planet possesses a nitrogen-oxygen atmosphere sustaining rich biological diversity, extensive river networks, and vast agricultural biomes.',
        ],
      },
      {
        heading: 'Known Continents & Geopolitical Realms',
        paragraphs: [
          'The primary known continental landmass is the Continent of Aurythar, which hosts The Federated States of Aurythar (FSA), the Northern Brassic Kingdoms, the Eastern Trade Confederacy, and unexplored southern tribal territories.',
          'Across the treacherous Western Seas lies the ancestral realm of Kalthar, originating continent of the Jedeonshu merchant peoples.',
        ],
      },
    ]),
    {
      planetType: 'Terrestrial / Habitable World',
      atmosphere: 'Nitrogen-Oxygen (Standard)',
      gravity: '1.0 G Equivalent',
      orbitalPeriod: '365 Continental Days',
      status: 'Active',
    },
    ['astronomy', 'planet', 'cosmology', 'world']
  );

  registerOrAuditEntity(
    'cosmo-continent-aurythar',
    'Continent of Aurythar',
    'et-continent',
    makeDoc([
      {
        heading: 'Continental Geography & Major Biomes',
        paragraphs: [
          'The Continent of Aurythar is the dominant landmass of the known world, spanning over five distinct climatic zones: the subpolar marine fjords and archipelagos of Veyrithi-Marash in the far north; the central fertile lowlands of Sundralic; the temperate industrial valleys of Valmorri; the formidable alpine granite divide of Korvan; the Mediterranean and tropical valleys of Auryni-Yeloni; and the blistering southern acacia savannahs of Zahrani.',
          'Historically divided between indigenous native nations and colonizer landfall strongholds, the continent is now unified under the legal hegemony of The Federated States of Aurythar (FSA), bordered by independent kingdoms to the north and uncontacted sovereign tribes to the south.',
        ],
      },
    ]),
    {
      climate: 'Diverse (Subpolar to Arid Savannah)',
      terrain: 'Alpine Ranges, River Valleys, Prairies, Coastal Fjords, Desert Mesas',
      status: 'Active',
    },
    ['geography', 'continent', 'landmass']
  );

  // ─────────────────────────────────────────────────────────────────────────
  // B. CALENDAR & DATING SYSTEM
  // ─────────────────────────────────────────────────────────────────────────

  registerOrAuditEntity(
    'cal-continental',
    'Continental Calendar of Aurythar (A.C. / B.C.)',
    'et-calendar',
    makeDoc([
      {
        heading: 'Calendar Structure & Chronological Epochs',
        paragraphs: [
          'The Continental Calendar of Aurythar is the official legal and civil dating standard across the Federated States of Aurythar and adjacent commercial sea lanes.',
          'The calendar is anchored around the historic arrival and stronghold establishment of the Vahlari expeditionary forces at Auracross (modern-day Vermione), designated as Year 0 A.C. (circa 1525 A.D. historical equivalent).',
        ],
      },
      {
        heading: 'The Two Primary Eras',
        paragraphs: [
          '• B.C. (Before Conquest): Counts chronologically backward from the Vahlari arrival (500 B.C. to 0 B.C.). Encompasses the Indigenous Golden Age, the flourishing of native polytheistic confederations, ancient river engineering, and the earliest arrival of peaceful Thori and Jedeonshu immigrants.',
          '• A.C. (After Conquest): Counts forward from the establishment of the Auracross fortress in 0 A.C. to the present day (530 A.C.). Covers the Expansion Wars, the Autonomy Period, the Great Religious War, and the modern constitutional era.',
        ],
      },
    ]),
    {
      epoch: '0 A.C. (Establishment of Auracross stronghold at Vermione)',
      currentYear: '530 A.C.',
      eras: 'B.C. (Before Conquest) / A.C. (After Conquest)',
    },
    ['calendar', 'chronology', 'dating', 'epochs']
  );

  // ─────────────────────────────────────────────────────────────────────────
  // C. HISTORICAL THEORIES & INTERPRETATIONS
  // ─────────────────────────────────────────────────────────────────────────

  registerOrAuditEntity(
    'theory-waka-onda',
    "Theory of the Ancient Wa'ka Ond'A War Catastrophe",
    'et-theory',
    makeDoc([
      {
        heading: 'Historical & Genetic Inquiries',
        paragraphs: [
          "A debated historical inquiry concerning the catastrophic conflict (circa 800–600 B.C.) in which all males of the native Wa'ka Ond'A ethnic group were eradicated.",
          "Scholars of the Federal Academic Council dispute whether the subsequent all-female genetic condition—wherein Wa'ka Ond'A mothers exclusively give birth to female offspring—arose from genetic bottleneck mutations or unknown environmental causes.",
          "Political factions sharply contest this theory: the People's Alliance cites historical tragedy to demand total abolition of confinement statutes, whereas the Conservative Alliance uses genetic exceptionalism to justify quarantine and movement bans.",
        ],
      },
    ]),
    {
      proposedBy: 'Federal Anthropological Institute & Historians of Eleos',
      consensusStatus: 'Disputed',
    },
    ['theory', 'history', 'genetics', 'waka-onda']
  );

  registerOrAuditEntity(
    'theory-jedeonshu-compact',
    'Hypothesis of the Kalthari Financial Compact',
    'et-theory',
    makeDoc([
      {
        heading: 'Competing Interpretations of Jedeonshu Migration',
        paragraphs: [
          'A deeply polarized historiographical dispute regarding the arrival of Jedeonshu merchant groups from Kalthar circa 300 B.C. and their expulsion from six governorates between 382 and 420 A.C.',
          'The Nationalist Interpretation (championed by the National Renewal Movement and right-wing Flancosists) alleges an unbroken foreign banking conspiracy orchestrated from Kalthar to dominate continental gold reserves.',
          'The Mercantile Refuge Theory (supported by mainstream economists in Vermione) maintains that the Jedeonshu were skilled commercial refugees who were scapegoated during religious panics, finding sanctuary in Valmorri where their capital generated the continental industrial revolution.',
        ],
      },
    ]),
    {
      proposedBy: 'National Renewal Intellectuals vs Valmorri Commercial Guilds',
      consensusStatus: 'Disputed',
    },
    ['theory', 'economics', 'history', 'jedeonshu']
  );

  registerOrAuditEntity(
    'theory-aurythism-origin',
    'Doctrine of the Syncretic Reconciliation',
    'et-theory',
    makeDoc([
      {
        heading: 'Theological Origin Debate of Aurythism',
        paragraphs: [
          'The historical and religious debate surrounding the formal emergence of Aurythism in 420 A.C. from the synthesis of Flancosism and Zehrienotisism.',
          'Zehrienotist traditionalists in Hele argue that Aurythism was an imperial political contrivance engineered by early Vahlari colonial administrators to dilute orthodox native resistance with colonial Flancosist hierarchy.',
          'Federal scholars and Aurythist clergy contend that Aurythism emerged as an authentic grassroots spiritual compromise during the horrors of the Religious War (425–500 A.C.), providing the moral foundation for the unified federation.',
        ],
      },
    ]),
    {
      proposedBy: 'Patriarchs of Hele vs Federal Ecclesiastical Assembly',
      consensusStatus: 'Disputed',
    },
    ['theory', 'theology', 'religion', 'aurythism']
  );

  // ─────────────────────────────────────────────────────────────────────────
  // D. THE FEDERATED STATES OF AURYTHAR (FSA) & NEIGHBORS
  // ─────────────────────────────────────────────────────────────────────────

  const fsaDemographics: StatisticalDataset[] = [
    {
      id: uuidv4(),
      title: 'Ethnic Composition of the Federation (530 A.C.)',
      category: 'ethnicity',
      chartType: 'donut',
      year: '530 A.C.',
      geographicalScope: 'Federated States of Aurythar (National)',
      confidence: 'confirmed',
      totalPopulation: 18047300,
      isMutuallyExclusive: true,
      entries: [
        { id: uuidv4(), name: 'Vahlari (Colonizer)', count: 4478600, percentage: 24.81, color: '#3b82f6' },
        { id: uuidv4(), name: 'Dravari (Colonizer)', count: 2343600, percentage: 12.99, color: '#06b6d4' },
        { id: uuidv4(), name: 'Valmorri (Native)', count: 1525200, percentage: 8.45, color: '#8b5cf6' },
        { id: uuidv4(), name: 'Yeloni (Native)', count: 1206100, percentage: 6.68, color: '#eab308' },
        { id: uuidv4(), name: 'Ivarra (Native)', count: 1091200, percentage: 6.05, color: '#a855f7' },
        { id: uuidv4(), name: 'Auryni (Native)', count: 1055300, percentage: 5.85, color: '#f59e0b' },
        { id: uuidv4(), name: 'Veyrithi (Native)', count: 905800, percentage: 5.02, color: '#0ea5e9' },
        { id: uuidv4(), name: 'Mixed Heritage', count: 721600, percentage: 4.00, color: '#94a3b8' },
        { id: uuidv4(), name: 'Zahrani (Native)', count: 631400, percentage: 3.50, color: '#84cc16' },
        { id: uuidv4(), name: 'Marash (Native)', count: 603800, percentage: 3.35, color: '#14b8a6' },
        { id: uuidv4(), name: 'Jedeonshu (Immigrant)', count: 594000, percentage: 3.29, color: '#f97316' },
        { id: uuidv4(), name: 'Brassic (Colonizer)', count: 502100, percentage: 2.78, color: '#6366f1' },
        { id: uuidv4(), name: 'Erebbassics (Native)', count: 449600, percentage: 2.49, color: '#10b981' },
        { id: uuidv4(), name: 'Sundralic (Native)', count: 419100, percentage: 2.32, color: '#22c55e' },
        { id: uuidv4(), name: 'Korvan (Native)', count: 401700, percentage: 2.23, color: '#ef4444' },
        { id: uuidv4(), name: "Wa'ka Ond'A (Native Restricted)", count: 269700, percentage: 1.49, color: '#d946ef' },
        { id: uuidv4(), name: 'Thori (Immigrant)', count: 255600, percentage: 1.42, color: '#64748b' },
        { id: uuidv4(), name: 'Other / Unregistered', count: 592800, percentage: 3.28, color: '#475569' },
      ],
    },
    {
      id: uuidv4(),
      title: 'Religious Affiliation Across the Federation (530 A.C.)',
      category: 'religion',
      chartType: 'pie',
      year: '530 A.C.',
      geographicalScope: 'Federated States of Aurythar (National)',
      confidence: 'confirmed',
      totalPopulation: 18047300,
      isMutuallyExclusive: true,
      entries: [
        { id: uuidv4(), name: 'Zehrienotisism', count: 13932500, percentage: 77.20, color: '#eab308' },
        { id: uuidv4(), name: 'Aurythism', count: 3501200, percentage: 19.40, color: '#3b82f6' },
        { id: uuidv4(), name: 'Flancosism', count: 658700, percentage: 3.65, color: '#8b5cf6' },
        { id: uuidv4(), name: 'Jedeshebayom', count: 241800, percentage: 1.34, color: '#f97316' },
        { id: uuidv4(), name: 'Devonshierostianity', count: 211100, percentage: 1.17, color: '#6366f1' },
      ],
    },
  ];

  registerOrAuditEntity(
    'nation-fsa',
    'The Federated States of Aurythar',
    'et-nation',
    makeDoc([
      {
        heading: 'Constitutional Order & Foundations',
        paragraphs: [
          'The Federated States of Aurythar (FSA) is the dominant sovereign superpower of the known world, comprising 7 autonomous governorates and 33 federal member states, with an aggregate population of 18,047,300 in the year 530 A.C.',
          'Operating under a semi-presidential federal republican constitution from the capital district of Leivionas, the Federation was forged through centuries of colonial integration, indigenous resistance, and the 500 A.C. Peace Accords.',
        ],
      },
      {
        heading: 'Parliamentary Hierarchy & 5-Tier Governance',
        paragraphs: [
          'The national legislature comprises a 432-member bicameral structure elected through a 3-stage pyramid:',
          '1. Citizens (18 million) elect the 300 Members of Congress (M.C.) in the National Assembly via proportional governorate distribution (Valmorri: 67, Auryni-Yeloni: 50, Sundralic: 46, Ivarra: 37, Veyrithi-Marash: 33, Korvan: 33, Zahrani: 30).',
          '2. The 300 M.C. elect the 99-member Senate (exactly 3 Senators per state across all 33 states).',
          '3. In each state, the 3 Senators elect 1 Minister to form the 33-member National Cabinet.',
          '4. The 33 Ministers elect the supreme 3-member High Senate (President, Vice President, Chief Secretary).',
        ],
      },
      {
        heading: 'Economic & Global Status',
        paragraphs: [
          'The FSA commands the largest economy on the planet, backed by the Aurythar Stock Exchange (8.5 Trillion ℳ capitalization) and the State Bank of Aurythar. It maintains sovereign relations with Kalthar, the Northern Brassic Kingdoms, and the Eastern Trade Confederacy.',
          'The contemporary union faces constitutional strain under the Valmorri Crisis, where the wealthy Valmorri Governorate challenges federal oversight of its 210 Billion ℳ State Bank.',
        ],
      },
    ]),
    {
      governmentType: 'Federal Semi-Presidential Republic',
      capital: 'Leivionas',
      foundedDate: '81-160 A.C. (Chartered 320 A.C.)',
      population: '18,047,300',
      status: 'Existing',
      currency: 'Aurythari Mark (ℳ)',
    },
    ['federation', 'superpower', 'continental', 'fsa'],
    ['FSA', 'Federated States', 'Aurythar'],
    fsaDemographics
  );

  registerOrAuditEntity(
    'nation-kalthar',
    'Kingdom of Kalthar',
    'et-nation',
    makeDoc([
      {
        heading: 'Sovereign Realm of Kalthar',
        paragraphs: [
          'Kalthar is an ancient maritime kingdom located across the Western Seas from the continent of Aurythar. It is the ancestral homeland of the Jedeonshu people, who emigrated circa 300 B.C.',
          'Ruled by merchant dynasts and scholars of Jedeshebayom, Kalthar maintains lucrative commercial ties with banking houses in Vermione.',
        ],
      },
    ]),
    { governmentType: 'Mercantile Monarchy', capital: 'Kalthar-Shai', status: 'Existing' },
    ['foreign', 'homeland', 'mercantile']
  );

  registerOrAuditEntity(
    'nation-brassic-kingdoms',
    'Northern Brassic Kingdoms',
    'et-nation',
    makeDoc([
      {
        heading: 'The Brassic Realms',
        paragraphs: [
          'A confederation of traditional feudal domains located along the northern coasts of the continent. They preserve the heraldic chivalry and liturgical rites of Devonshierostianity.',
        ],
      },
    ]),
    { governmentType: 'Feudal Monarchy', status: 'Existing' },
    ['foreign', 'feudal', 'northern']
  );

  registerOrAuditEntity(
    'nation-trade-confederacy',
    'Eastern Trade Confederacy',
    'et-nation',
    makeDoc([
      {
        heading: 'Maritime Mercantile League',
        paragraphs: [
          'A coalition of merchant oligarchies controlling deep-sea shipping lanes east of Aurythar, maintaining primary trade treaties with the ports of Ivarradelpe and Veyrith.',
        ],
      },
    ]),
    { governmentType: 'Merchant League', status: 'Existing' },
    ['foreign', 'maritime', 'trade']
  );

  registerOrAuditEntity(
    'nation-southern-tribes',
    'Uncontacted Southern Tribes',
    'et-nation',
    makeDoc([
      {
        heading: 'Sovereign Frontier Clans',
        paragraphs: [
          'Sovereign indigenous peoples living in the deep southern rainforests and canyon plateaus south of the Zahrani Governorate, fiercely guarding their territory from federal development.',
        ],
      },
    ]),
    { governmentType: 'Tribal Confederacy', status: 'Existing' },
    ['tribal', 'indigenous', 'frontier']
  );

  // ─────────────────────────────────────────────────────────────────────────
  // E. THE SEVEN GOVERNORATES (`et-governorate`)
  // ─────────────────────────────────────────────────────────────────────────

  const governorates = [
    {
      key: 'gov-valmorri',
      title: 'Valmorri Governorate',
      capital: 'Vermione',
      pop: '4,026,500',
      seats: 67,
      statesCount: 7,
      draftColor: 'Blue',
      inspiration: 'France',
      climate: 'Continental',
      legalClusters: 'All 5 clusters legal (only governorate with full spectrum); Conservative Alliance dominant',
      desc: 'The economic powerhouse and most populous governorate of the Federation. Hosts the Valmorri State Bank (210B ℳ) and the entire Jedeonshu commercial banking sector. Currently at the center of the secessionist Valmorri Crisis following the 528 A.C. legalization of National Renewal.',
    },
    {
      key: 'gov-ivarra',
      title: 'Ivarra Governorate',
      capital: 'Ivarradelpe',
      pop: '2,192,400',
      seats: 37,
      statesCount: 4,
      draftColor: 'Purple',
      inspiration: 'Nordic / Scottish Isles',
      climate: 'Temperate Maritime',
      legalClusters: 'Democratic Front (Dominant), People’s Alliance, United Development; Conservative Alliance & National Renewal BANNED',
      desc: 'Coastal maritime governorate centered around deep-water naval bases, heavy commercial shipping, and shipbuilding yards. Historically inhabited by native Ivarra maritime clans and Dravari colonizers.',
    },
    {
      key: 'gov-sundralic',
      title: 'Sundralic Governorate',
      capital: 'Leivionas (Federal Capital)',
      pop: '2,793,800',
      seats: 46,
      statesCount: 5,
      draftColor: 'Green',
      inspiration: 'France / Germany / Italy',
      climate: 'Subtropical Lowlands',
      legalClusters: 'Democratic Front (Leading), People’s Alliance (Strong), United Development; Conservative Alliance & National Renewal BANNED',
      desc: 'The administrative and civic heartland of Aurythar. Contains the Federal Capital District of Leivionas, the Federal Parliament, the Supreme Court, and the Aurythar Stock Exchange.',
    },
    {
      key: 'gov-korvan',
      title: 'Korvan Governorate',
      capital: 'Vahareus',
      pop: '2,008,400',
      seats: 33,
      statesCount: 5,
      draftColor: 'Red',
      inspiration: 'Alps / Austria / German lowlands',
      climate: 'Alpine Continental',
      legalClusters: 'Democratic Front (Leading), People’s Alliance (Strong in mining); Conservative Alliance & National Renewal BANNED',
      desc: 'Formidable alpine mountain governorate renowned for deep anthracite and gold mining, heavy metallurgy, federal bullion minting at Vahareus, and strategic deterrence missile silos.',
    },
    {
      key: 'gov-auryni-yeloni',
      title: 'Auryni-Yeloni Governorate',
      capital: 'Southern Eleos & Hele',
      pop: '3,015,200',
      seats: 50,
      statesCount: 6,
      draftColor: 'Yellow',
      inspiration: 'Tropical desert / cold highland mix',
      climate: 'Tropical with variations (hot desert in Auryni; cold in Yeloni highlands)',
      legalClusters: 'Democratic Front (Dominant), People’s Alliance, United Development; Conservative Alliance & National Renewal BANNED',
      desc: 'The spiritual and cultural cradle of the continent. 100% adherence to Zehrienotisism, seat of the High Patriarchate at Hele, rich terraced vineyards, and deep traditionalist resistance to colonial secularization.',
    },
    {
      key: 'gov-veyrithi-marash',
      title: 'Veyrithi-Marash Governorate',
      capital: 'Veyrith',
      pop: '2,012,800',
      seats: 33,
      statesCount: 3,
      draftColor: 'Cyan',
      inspiration: 'Cold Maritime',
      climate: 'Cold Maritime (rocky coasts, long snowy winters)',
      legalClusters: 'Democratic Front (Leading), People’s Alliance (Strong in Steroshi), United Development; Conservative Alliance & National Renewal BANNED',
      desc: 'Boreal subarctic maritime governorate comprising coastal pine forests, offshore whaling archipelagos, timber milling, and the peaceful Thori agricultural minority.',
    },
    {
      key: 'gov-zahrani',
      title: 'Zahrani Governorate',
      capital: 'Zerione',
      pop: '1,798,200',
      seats: 30,
      statesCount: 3,
      draftColor: 'Lime',
      inspiration: 'Hot Savannah',
      climate: 'Hot Savannah (desert expanses, scorching summers, oases)',
      legalClusters: 'Democratic Front (Dominant), People’s Alliance, United Development; Conservative Alliance & National Renewal BANNED',
      desc: 'Southern frontier governorate of arid steppes and sandstone canyons. 100% Zehrienotisist in faith; home to proud equestrian nomadic clans who repulsed centuries of invader conquest.',
    },
  ];

  for (const g of governorates) {
    registerOrAuditEntity(
      g.key,
      g.title,
      'et-governorate',
      makeDoc([
        {
          heading: 'Governorate Profile & Demographics',
          paragraphs: [
            g.desc,
            `Population: ${g.pop} registered citizens.`,
            `National Assembly Representation: ${g.seats} seats (${g.statesCount} constituent federal states).`,
            `Capital: ${g.capital}.`,
            `Dominant Climate: ${g.climate}.`,
          ],
        },
        {
          heading: 'Political Status & Legal Clusters',
          paragraphs: [
            `Legal Clusters Status: ${g.legalClusters}.`,
            `Draft Reference Color: ${g.draftColor} (Cultural Inspiration: ${g.inspiration}).`,
          ],
        },
      ]),
      {
        capital: g.capital,
        population: g.pop,
        assemblySeats: g.seats,
        climate: g.climate,
        status: 'Active',
      },
      ['governorate', 'fsa-region', 'administrative-division']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // F. THE 33 FEDERAL STATES (`et-state`)
  // ─────────────────────────────────────────────────────────────────────────

  const statesData: {
    govKey: string;
    name: string;
    pop: string;
    ruling: string;
    isCap?: boolean;
    role: string;
  }[] = [
    // Valmorri (7)
    { govKey: 'gov-valmorri', name: 'Seirmoine', pop: '1,187,300', ruling: 'Conservative Alliance', role: 'Largest industrial city and chemical/metallurgical manufacturing center in Aurythar.' },
    { govKey: 'gov-valmorri', name: 'Vermione', pop: '912,600', ruling: 'Conservative Alliance', isCap: true, role: 'Capital of Valmorri; financial capital of Aurythar and headquarters of the Valmorri State Bank.' },
    { govKey: 'gov-valmorri', name: 'Flanione', pop: '788,400', ruling: 'National Renewal Movement', role: 'Historical industrial heartland, cradle of Flancosism, and stronghold of the National Renewal Movement.' },
    { govKey: 'gov-valmorri', name: 'Valmorrione', pop: '711,200', ruling: 'Conservative Alliance', role: 'Ancestral cultural seat and textile milling center of the native Valmorri nobility.' },
    { govKey: 'gov-valmorri', name: 'Eastern Sethislione', pop: '612,500', ruling: 'Democratic Front', role: 'Border state with extensive rail cargo yards connecting Valmorri to the Ivarran coast.' },
    { govKey: 'gov-valmorri', name: 'Nortopostus', pop: '386,400', ruling: 'Conservative Alliance', role: 'Inland distribution junction specializing in precision machine tooling.' },
    { govKey: 'gov-valmorri', name: 'Seloptione', pop: '428,100', ruling: "People's Alliance", role: 'Southern agricultural grain state with growing socialist labor unions.' },

    // Ivarra (4)
    { govKey: 'gov-ivarra', name: 'Couleodione', pop: '684,200', ruling: 'Democratic Front', role: 'Naval fortress state housing deep-water submarine pens and torpedo manufacturing.' },
    { govKey: 'gov-ivarra', name: 'Terogionne', pop: '612,800', ruling: 'Democratic Front', role: 'Primary international container shipping port handling foreign ocean trade.' },
    { govKey: 'gov-ivarra', name: 'Ivarradelpe', pop: '512,400', ruling: 'Democratic Front', isCap: true, role: 'Capital of Ivarra; headquarters of the Federal Navy Admiralty and historic shipwright guilds.' },
    { govKey: 'gov-ivarra', name: 'Sethislione', pop: '383,000', ruling: "People's Alliance", role: 'Coastal artisanal fishing state with proud native Ivarra clan traditions.' },

    // Sundralic (5)
    { govKey: 'gov-sundralic', name: 'Skorvas', pop: '894,200', ruling: "People's Alliance", role: 'Major agrarian wheat state and headquarters of the socialist People’s Alliance.' },
    { govKey: 'gov-sundralic', name: 'Kentas', pop: '703,500', ruling: 'Democratic Front', role: 'River transit hub, food warehousing center, and base of Fort Vahl.' },
    { govKey: 'gov-sundralic', name: 'Leivionas', pop: '612,800', ruling: 'Democratic Front', isCap: true, role: 'Federal Capital District of Aurythar; seat of the High Senate, Parliament, and ASE.' },
    { govKey: 'gov-sundralic', name: 'Deliovas', pop: '388,300', ruling: 'Democratic Front', role: 'Suburban administrative belt housing civil service academies and signals intelligence archives.' },
    { govKey: 'gov-sundralic', name: 'Sundrassia', pop: '195,000', ruling: "People's Alliance", role: 'Rolling prairie state known for cattle ranching and federal nature reserves.' },

    // Korvan (5)
    { govKey: 'gov-korvan', name: 'Oastusione', pop: '703,200', ruling: 'Democratic Front', role: 'Alpine foothill manufacturing center producing heavy earthmoving equipment.' },
    { govKey: 'gov-korvan', name: 'Korvione', pop: '587,600', ruling: 'Democratic Front', role: 'Ancient subterranean fortress city of the Korvan clan chiefs.' },
    { govKey: 'gov-korvan', name: 'Vahareus', pop: '412,800', ruling: 'Democratic Front', isCap: true, role: 'Capital of Korvan; high mountain city housing the Federal Mint and gold bullion vaults.' },
    { govKey: 'gov-korvan', name: 'Oseareus', pop: '294,700', ruling: "People's Alliance", role: 'Glacial reservoir valley housing strategic hydroelectric dams and space tracking dishes.' },
    { govKey: 'gov-korvan', name: 'Dateus', pop: '10,100', ruling: "People's Alliance", role: 'High-altitude rare-earth mining enclave providing raw tungsten and quartz.' },

    // Auryni-Yeloni (6)
    { govKey: 'gov-auryni-yeloni', name: 'Achios', pop: '987,300', ruling: 'Democratic Front', role: 'Northern agrarian state famous for olive oil, wine, and classical stone masonry.' },
    { govKey: 'gov-auryni-yeloni', name: 'Northern Eleos', pop: '812,600', ruling: 'Democratic Front', role: 'Terraced vineyard state with ancient monastic scriptoriums.' },
    { govKey: 'gov-auryni-yeloni', name: 'Hele', pop: '788,400', ruling: 'Democratic Front', isCap: true, role: 'Spiritual co-capital of the Federation, seat of the High Zehrienotist Patriarchate.' },
    { govKey: 'gov-auryni-yeloni', name: 'Southern Eleos', pop: '611,700', ruling: 'Democratic Front', isCap: true, role: 'Administrative co-capital housing the Council of Governors.' },
    { govKey: 'gov-auryni-yeloni', name: 'Deuson', pop: '388,200', ruling: "People's Alliance", role: 'Highland pastoral valley state dedicated to traditional livestock husbandry.' },
    { govKey: 'gov-auryni-yeloni', name: 'Peirona', pop: '427,000', ruling: "People's Alliance", role: 'Coastal river delta state renowned for ceramic craftsmanship and paper milling.' },

    // Veyrithi-Marash (3)
    { govKey: 'gov-veyrithi-marash', name: 'Marash', pop: '687,500', ruling: 'Democratic Front', role: 'Rugged mainland boreal coastline home to the native Marash clans.' },
    { govKey: 'gov-veyrithi-marash', name: 'Steroshi Islands', pop: '712,300', ruling: "People's Alliance", role: 'Subarctic archipelago famous for whaling heritage, fishing communes, and maritime radar.' },
    { govKey: 'gov-veyrithi-marash', name: 'Veyrith', pop: '613,000', ruling: 'Democratic Front', isCap: true, role: 'Governorate capital and chief boreal port city.' },

    // Zahrani (3)
    { govKey: 'gov-zahrani', name: 'Rebeone', pop: '687,300', ruling: "People's Alliance", role: 'Northern border state acting as the trading gateway between the savannah and the central plains.' },
    { govKey: 'gov-zahrani', name: 'Zerione', pop: '611,800', ruling: 'Democratic Front', isCap: true, role: 'Governorate capital; oasis citadel surrounded by date palms and adobe ramparts.' },
    { govKey: 'gov-zahrani', name: 'Keleone', pop: '499,100', ruling: 'Democratic Front', role: 'Southern expanse of sandstone canyonlands bordering the Uncontacted Southern Tribes.' },
  ];

  for (const st of statesData) {
    const stateKey = `state-${st.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    registerOrAuditEntity(
      stateKey,
      `State of ${st.name}`,
      'et-state',
      makeDoc([
        {
          heading: 'State Demographics & Governance',
          paragraphs: [
            `The State of ${st.name} is one of the 33 constituent federal member states of the Federated States of Aurythar.`,
            `Total Registered Population: ${st.pop}.`,
            `Ruling Political Cluster: ${st.ruling}.`,
            st.isCap ? `Official capital city/district of its regional governorate.` : '',
            st.role,
          ].filter(Boolean),
        },
      ]),
      {
        population: st.pop,
        rulingCluster: st.ruling,
        isCapital: !!st.isCap,
        status: 'Active',
      },
      ['federal-state', 'fsa-member', st.govKey]
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // G. MAJOR CITIES & SETTLEMENTS (`et-city`)
  // ─────────────────────────────────────────────────────────────────────────

  const majorCities = [
    { key: 'city-seirmoine', name: 'City of Seirmoine', pop: '1,187,300', gov: 'Valmorri', state: 'State of Seirmoine', desc: 'Largest city by population in the Federation; heavy chemical, railway engineering, and steel foundries.' },
    { key: 'city-achios', name: 'City of Achios', pop: '987,300', gov: 'Auryni-Yeloni', state: 'State of Achios', desc: 'Ancient cultural city with terraced gardens, amphitheaters, and stone masonry guilds.' },
    { key: 'city-vermione', name: 'City of Vermione', pop: '912,600', gov: 'Valmorri', state: 'State of Vermione', isCap: true, desc: 'Financial capital of Aurythar, capital of Valmorri, and headquarters of the Valmorri State Bank.' },
    { key: 'city-skorvas', name: 'City of Skorvas', pop: '894,200', gov: 'Sundralic', state: 'State of Skorvas', desc: 'Agricultural manufacturing hub and political headquarters of the socialist People’s Alliance.' },
    { key: 'city-flanione', name: 'City of Flanione', pop: '788,400', gov: 'Valmorri', state: 'State of Flanione', desc: 'Historic industrial city along the Flan River; cradle of Flancosism and headquarters of the National Renewal Movement.' },
    { key: 'city-hele', name: 'Holy City of Hele', pop: '788,400', gov: 'Auryni-Yeloni', state: 'State of Hele', isCap: true, desc: 'The spiritual capital of Aurythar and supreme holy city of Zehrienotisism, home to the Golden Dome.' },
    { key: 'city-valmorrione', name: 'City of Valmorrione', pop: '711,200', gov: 'Valmorri', state: 'State of Valmorrione', desc: 'Ancestral seat of native Valmorri nobility, high textile design houses, and river barge harbors.' },
    { key: 'city-leivionas', name: 'Federal City of Leivionas', pop: '612,800', gov: 'Sundralic', state: 'State of Leivionas', isCap: true, desc: 'Federal Capital of the Federation; host of Parliament, Supreme Court, High Senate, and ASE.' },
    { key: 'city-southern-eleos', name: 'City of Southern Eleos', pop: '611,700', gov: 'Auryni-Yeloni', state: 'State of Southern Eleos', isCap: true, desc: 'Administrative capital of Auryni-Yeloni housing the regional legislative assembly.' },
    { key: 'city-veyrith', name: 'City of Veyrith', pop: '613,000', gov: 'Veyrithi-Marash', state: 'State of Veyrith', isCap: true, desc: 'Northern maritime port capital; cold-weather ship fitting, dry docks, and timber export wharves.' },
    { key: 'city-zerione', name: 'Citadel of Zerione', pop: '611,800', gov: 'Zahrani', state: 'State of Zerione', isCap: true, desc: 'Oasis desert capital surrounded by sandstone ramparts and ancient cistern networks.' },
    { key: 'city-ivarradelpe', name: 'City of Ivarradelpe', pop: '512,400', gov: 'Ivarra', state: 'State of Ivarradelpe', isCap: true, desc: 'Naval admiralty capital and commercial maritime hub of the western shores.' },
    { key: 'city-vahareus', name: 'City of Vahareus', pop: '412,800', gov: 'Korvan', state: 'State of Vahareus', isCap: true, desc: 'High alpine fortress capital housing the Federal Gold Bullion Mint and alpine division barracks.' },
  ];

  for (const c of majorCities) {
    registerOrAuditEntity(
      c.key,
      c.name,
      'et-city',
      makeDoc([
        {
          heading: 'Metropolitan Profile',
          paragraphs: [
            c.desc,
            `Population: ${c.pop}.`,
            `Regional Governorate: ${c.gov}.`,
            `Constituent State: ${c.state}.`,
            c.isCap ? 'Holds official capital status.' : '',
          ].filter(Boolean),
        },
      ]),
      {
        population: c.pop,
        isCapital: !!c.isCap,
        status: 'Active',
      },
      ['city', 'urban-center', 'settlement']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // H. 17 ETHNICITIES (`et-ethnicity`)
  // ─────────────────────────────────────────────────────────────────────────

  const ethnicGroups = [
    {
      key: 'eth-vahlari',
      title: 'Vahlari',
      pop: '4,478,600 (24.81%)',
      role: 'Colonizer — Federal Ruling & Military Elite',
      homeland: 'Western Trans-Oceanic Lands',
      desc: 'The principal colonizing ethnicity that arrived in 0 A.C. to establish the Auracross stronghold. Historically commands the officer corps of the armed forces, federal ministries, and academic faculties.',
    },
    {
      key: 'eth-dravari',
      title: 'Dravari',
      pop: '2,343,600 (12.99%)',
      role: 'Colonizer — Coastal & Naval Pioneers',
      homeland: 'Southern Maritime Archipelago',
      desc: 'Naval navigators and civil engineers who accompanied the early colonial fleets, heavily concentrated in the maritime ports of Ivarra and Sundralic.',
    },
    {
      key: 'eth-brassic',
      title: 'Brassic',
      pop: '502,100 (2.78%)',
      role: 'Colonizer — Northern Aristocratic Lineage',
      homeland: 'Northern Brassic Kingdoms',
      desc: 'An aristocratic minority that entered via northern mountain passes in 1 A.C., preserving chivalric codes, feudal genealogies, and Devonshierostian liturgy.',
    },
    {
      key: 'eth-valmorri',
      title: 'Valmorri',
      pop: '1,525,200 (8.45%)',
      role: 'Native — Commercial & Industrial Aristocracy',
      homeland: 'Valmorri River Valley',
      desc: 'Indigenous plains people who successfully modernized during early industrialization, establishing massive manufacturing guilds and retaining intense regional pride.',
    },
    {
      key: 'eth-yeloni',
      title: 'Yeloni',
      pop: '1,206,100 (6.68%)',
      role: 'Native — Agrarian Guilds & Artisans',
      homeland: 'Central Highland Valleys',
      desc: 'Native agrarian society renowned for sacred agriculture, ceramic arts, and devout Zehrienotisist orthodoxy.',
    },
    {
      key: 'eth-ivarra',
      title: 'Ivarra',
      pop: '1,091,200 (6.05%)',
      role: 'Native — Maritime Fisherfolk & Shipwrights',
      homeland: 'Ivarran Coastal Estuaries',
      desc: 'Indigenous coastal population possessing centuries of ocean navigation lore, deep-sea fishing techniques, and boatbuilding craftsmanship.',
    },
    {
      key: 'eth-auryni',
      title: 'Auryni',
      pop: '1,055,300 (5.85%)',
      role: 'Native — Scholarly & Priestly Custodians',
      homeland: 'Auryn Highlands & Sacred Eleos',
      desc: 'The intellectual custodians of ancient continental philosophy, solar theology, and temple scriptoriums.',
    },
    {
      key: 'eth-veyrithi',
      title: 'Veyrithi',
      pop: '905,800 (5.02%)',
      role: 'Native — Boreal Miners & Stonemasons',
      homeland: 'Veyrith Glacial Plateau',
      desc: 'Hardy boreal natives adapted to subpolar winters, granite quarrying, cold-forge metallurgy, and deep forestry.',
    },
    {
      key: 'eth-mixed',
      title: 'Mixed Heritage',
      pop: '721,600 (4.00%)',
      role: 'Integrated Urban Population',
      homeland: 'Federal Corridors & Rail Cities',
      desc: 'Multigenerational intermarriage between colonizer and indigenous lineages, concentrated in Leivionas and urban transit junctions.',
    },
    {
      key: 'eth-zahrani',
      title: 'Zahrani',
      pop: '631,400 (3.50%)',
      role: 'Native — Savannah Pastoralists & Scouts',
      homeland: 'Zahrani Arid Steppes',
      desc: 'Equestrian savannah clans celebrated for horse-breeding, composite archery, and fiercely defending Zehrienotisism against foreign invaders.',
    },
    {
      key: 'eth-marash',
      title: 'Marash',
      pop: '603,800 (3.35%)',
      role: 'Native — Northern Island Navigators',
      homeland: 'Marash Coast & Steroshi Islands',
      desc: 'Subarctic islanders accustomed to arctic sea hunting, whaling cooperatives, and navigating treacherous icy ocean straits.',
    },
    {
      key: 'eth-jedeonshu',
      title: 'Jedeonshu',
      pop: '594,000 (3.29%)',
      role: 'Immigrant — Merchant Bankers & Financiers',
      homeland: 'Kingdom of Kalthar',
      desc: 'Immigrants from across the western sea who adhere to Jedeshebayom. Following widespread expulsion edicts (382–420 A.C.) banning them from six governorates, they concentrated in Valmorri where they dominate merchant banking and the Valmorri State Bank.',
    },
    {
      key: 'eth-erebbassics',
      title: 'Erebbassics',
      pop: '449,600 (2.49%)',
      role: 'Native — River Basin Clans',
      homeland: 'Ereb River Basin',
      desc: 'Ancient riverine folk specializing in freshwater fish drying, reed boat building, and inland canal transport.',
    },
    {
      key: 'eth-sundralic',
      title: 'Sundralic',
      pop: '419,100 (2.32%)',
      role: 'Native — Prairie Grain Cultivators',
      homeland: 'Sundralic Plains',
      desc: 'Indigenous tillers of the central continental prairie, whose lands were incorporated under the earliest federal treaties.',
    },
    {
      key: 'eth-korvan',
      title: 'Korvan',
      pop: '401,700 (2.23%)',
      role: 'Native — Subterranean Miners & Founders',
      homeland: 'Korvan Crags & Caves',
      desc: 'High mountain native clans famed for extracting the deepest veins of gold and anthracite coal in the known world.',
    },
    {
      key: 'eth-waka-onda',
      title: "Wa'ka Ond'A",
      pop: '269,700 (1.49%)',
      role: 'Native Matriarchy — Restricted Movement Status',
      homeland: 'Southern Rain Highlands',
      desc: "An all-female native society operating under ancient matriarchal succession. Following an ancient war (c. 800-600 B.C.) that killed all males, they possess a genetic condition bearing only female children. Under 525 A.C. reforms, inter-ethnic relations were approved, though marriage and geographic movement outside home governorates remain prohibited by statute.",
    },
    {
      key: 'eth-thori',
      title: 'Thori',
      pop: '255,600 (1.42%)',
      role: 'Immigrant — Peaceful Baltic Agrarians',
      homeland: 'Northeastern Coasts',
      desc: 'Peaceful immigrants who fled early persecution in 150 B.C. to find refuge in the Veyrithi-Marash islands, integrating peacefully through cooperative agriculture.',
    },
  ];

  for (const eth of ethnicGroups) {
    registerOrAuditEntity(
      eth.key,
      `${eth.title} People`,
      'et-ethnicity',
      makeDoc([
        {
          heading: 'Heritage & Demographic Standing',
          paragraphs: [
            eth.desc,
            `Population: ${eth.pop}.`,
            `Key Societal Role: ${eth.role}.`,
            `Ancestral Homeland: ${eth.homeland}.`,
          ],
        },
      ]),
      {
        homeland: eth.homeland,
        population: eth.pop,
        status: 'Active',
      },
      ['ethnicity', 'demographics', 'peoples']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // I. 5 RELIGIONS (`et-religion`)
  // ─────────────────────────────────────────────────────────────────────────

  const religions = [
    {
      key: 'rel-zehrienotisism',
      title: 'Zehrienotisism',
      pct: '77.20% (13,932,500 adherents)',
      deity: 'Zehrien — The Living Cosmic Solar Architect',
      holySite: 'The Golden Dome of Hele',
      sacredText: 'The Zehrien Codex',
      desc: 'The overwhelming majority indigenous religion of Aurythar. Emerged in Zahrani c. 500-250 B.C., emphasizing strict monotheism, solar balance, and divine law. Holds 100% adherence in Auryni-Yeloni and Zahrani Governorates.',
    },
    {
      key: 'rel-aurythism',
      title: 'Aurythism',
      pct: '19.40% (3,501,200 adherents)',
      deity: 'The Federal Spirit & Transcendent Order',
      holySite: 'Grand Rotunda of Leivionas',
      sacredText: 'The Aurythari Compilation',
      desc: 'The syncretic faith born in 420 A.C. from the reconciliation of Zehrienotisism and Flancosism. Promotes civic duty, ancestral respect, and inter-ethnic harmony. Prevalent in former Invader Sphere governorates.',
    },
    {
      key: 'rel-flancosism',
      title: 'Flancosism',
      pct: '3.65% (658,700 adherents)',
      deity: 'The Divine Father & Heavenly Host',
      holySite: 'Cathedral of the White Cataract (Flanione)',
      sacredText: 'The Flancos Codex',
      desc: 'Foreign colonial monotheistic faith brought by Vahlari colonizers in 0 A.C. Now concentrated almost entirely in Valmorri; extremist factions form the political base of the National Renewal Movement.',
    },
    {
      key: 'rel-jedeshebayom',
      title: 'Jedeshebayom',
      pct: '1.34% (241,800 adherents)',
      deity: 'Bayom — The Single Eternal Flame',
      holySite: 'Temple of the Seven Pillars (Vermione)',
      sacredText: 'The Jedeshe Codex',
      desc: 'Covenant-based scripture faith followed exclusively by the Jedeonshu people from Kalthar. Confined to Valmorri following historical expulsion edicts.',
    },
    {
      key: 'rel-devonshierostianity',
      title: 'Devonshierostianity',
      pct: '1.17% (211,100 adherents)',
      deity: 'The Triune Majesty & Coastal Saints',
      holySite: 'Cathedral of Saint Devonshier (Brassic Coast)',
      sacredText: 'The Choral Liturgies',
      desc: 'Ancient liturgical sacramental faith preserved by the Brassic colonizers and northern Veyrithi-Marash coastal communities.',
    },
  ];

  for (const r of religions) {
    registerOrAuditEntity(
      r.key,
      r.title,
      'et-religion',
      makeDoc([
        {
          heading: 'Doctrinal Tenets & Sacred Canon',
          paragraphs: [
            r.desc,
            `Adherence: ${r.pct} of the Federation.`,
            `Primary Sacred Text: ${r.sacredText}.`,
            `Supreme Holy Site: ${r.holySite}.`,
          ],
        },
      ]),
      {
        deity: r.deity,
        holySite: r.holySite,
        adherence: r.pct,
        sacredText: r.sacredText,
      },
      ['religion', 'faith', 'demographics']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // J. 5 POLITICAL CLUSTERS (`et-organization`)
  // ─────────────────────────────────────────────────────────────────────────

  const politicalClusters = [
    {
      key: 'party-conservative-alliance',
      title: 'Conservative Alliance',
      hq: 'Vermione, Valmorri',
      founded: 'c. 200 A.C.',
      motto: 'State Sovereignty, Fiscal Discipline, Unbroken Enterprise',
      symbol: 'Blue Banner',
      leader: 'Chancellor Markon Vance',
      status: 'Legal in Valmorri only; BANNED in six governorates',
      factions: 'Moderates (40%), Traditionalists (45%), Pragmatists (15%)',
      desc: 'Traditional right-wing coalition representing landowners, Valmorri industrialists, and Jedeonshu financiers. Opposes federal wealth redistribution and supports strict movement controls on the Wa\'ka Ond\'A.',
    },
    {
      key: 'party-national-renewal',
      title: 'National Renewal Movement',
      hq: 'Flanione, Valmorri',
      founded: '500 A.C. (split from Conservative Alliance)',
      motto: 'Strength Through Unity, Order Through Tradition',
      symbol: 'Iron Flame',
      leader: 'General Cassian Thorne (Ret.)',
      status: 'Legal ONLY in Valmorri (since 528 A.C.); BANNED elsewhere',
      factions: 'Hardliners (35%), Populists (50%), Militants (15%)',
      desc: 'Far-right ultranationalist movement advocating Vahlari supremacy, Flancosist theocracy, cessation of interstate migration, and provincial secession. Operates the Renewal Youth Brigade militia.',
    },
    {
      key: 'party-democratic-front',
      title: 'Democratic Front',
      hq: 'Leivionas, Sundralic',
      founded: 'c. 200 A.C.',
      motto: 'Liberty, Civil Equality, Common Destiny',
      symbol: 'Golden Dawn',
      leader: 'President Alyssa Vane',
      status: 'Legal in all seven governorates; dominant in six',
      factions: 'Moderates (30%), Progressives (50%), Reformists (20%)',
      desc: 'Mainstream center-left unionist coalition advocating social democracy, progressive reform, cultural harmony, and expansion of indigenous civil liberties.',
    },
    {
      key: 'party-peoples-alliance',
      title: "People's Alliance",
      hq: 'Skorvas, Sundralic',
      founded: '525 A.C. (split from Democratic Front)',
      motto: 'Bread, Land, Labor, Dignity',
      symbol: 'Red Star',
      leader: 'Secretary Jon Draken',
      status: 'Legal in all seven governorates; rapidly growing',
      factions: 'Democratic Socialists (60%), Revolutionary Socialists (25%), Eco-Socialists (15%)',
      desc: 'Socialist left coalition representing miners, industrial labor, and agricultural workers. Fiercely advocates full legal marriage and movement rights for the Wa\'ka Ond\'A.',
    },
    {
      key: 'party-united-development',
      title: 'United Development Partnership',
      hq: 'Leivionas, Sundralic',
      founded: '526 A.C.',
      motto: 'Infrastructure, Innovation, Continental Integration',
      symbol: 'Rising Phoenix',
      leader: 'Director Elena Rostov',
      status: 'Legal in all seven governorates; small but growing',
      factions: 'Economic Nationalists (40%), Globalizers (35%), Technocrats (25%)',
      desc: 'Technocratic coalition of economists, railway directors, and civil engineers advancing state-capitalist development, high-speed rail, and export trade.',
    },
  ];

  for (const p of politicalClusters) {
    registerOrAuditEntity(
      p.key,
      p.title,
      'et-organization',
      makeDoc([
        {
          heading: 'Platform & Ideological Profile',
          paragraphs: [
            p.desc,
            `Official Symbol: ${p.symbol}.`,
            `National Status: ${p.status}.`,
            `Internal Factions: ${p.factions}.`,
            `Headquarters: ${p.hq}.`,
          ],
        },
      ]),
      {
        headquarters: p.hq,
        motto: p.motto,
        leader: p.leader,
        foundedDate: p.founded,
        status: p.status,
      },
      ['political-party', 'cluster', 'parliament', 'fsa-politics']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // K. 5 GOVERNANCE BODIES (`et-organization`)
  // ─────────────────────────────────────────────────────────────────────────

  const governanceBodies = [
    { key: 'gov-parliament', title: 'Federal Parliament of Aurythar', hq: 'Palace of the Federation, Leivionas', members: '432 Total Members', desc: 'The bicameral national parliament comprising the High Senate (3), National Cabinet (33), Senate (99), and National Assembly (300).' },
    { key: 'gov-high-senate', title: 'High Senate of the Federation', hq: 'The Inner Chancellery, Leivionas', members: '3 High Chancellors', desc: 'The supreme executive triumvirate: President of the FSA, Vice President, and Chief Secretary, elected by the 33 National Cabinet Ministers.' },
    { key: 'gov-cabinet', title: 'National Cabinet of Aurythar', hq: 'Executive Chancellery, Leivionas', members: '33 State Ministers', desc: 'Executive cabinet composed of exactly one Minister per federal state, elected by that state’s 3 Senators.' },
    { key: 'gov-senate', title: 'Senate of Aurythar', hq: 'Senate Chamber, Leivionas', members: '99 Senators', desc: 'Upper legislative chamber consisting of 99 senators (exactly 3 per federal state), elected by the Members of Congress of each state.' },
    { key: 'gov-assembly', title: 'National Assembly of Aurythar', hq: 'Assembly Hall, Leivionas', members: '300 Members of Congress', desc: 'Lower legislative chamber directly elected by the 18 million citizens across all 33 states via proportional governorate distribution.' },
  ];

  for (const gb of governanceBodies) {
    registerOrAuditEntity(
      gb.key,
      gb.title,
      'et-organization',
      makeDoc([
        {
          heading: 'Constitutional Authority & Role',
          paragraphs: [
            gb.desc,
            `Composition: ${gb.members}.`,
            `Seat of Power: ${gb.hq}.`,
          ],
        },
      ]),
      { headquarters: gb.hq },
      ['governance', 'parliament', 'constitution']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // L. 14 MILITARY, LAW ENFORCEMENT & INTELLIGENCE SERVICES (`et-organization`)
  // ─────────────────────────────────────────────────────────────────────────

  const securityAgencies = [
    // Military
    { key: 'mil-army', title: 'Aurythari Federal Army', hq: 'Fort Vahlari, Sundralic', strength: '180,000 active personnel', desc: 'Primary land warfare force operating armored divisions, mechanized brigades, and coastal fortress artillery.' },
    { key: 'mil-navy', title: 'Aurythari Federal Navy', hq: 'Ivarradelpe, Ivarra', strength: '120,000 active personnel', desc: 'Sovereign naval fleet operating guided-missile cruisers, destroyers, nuclear attack submarines, and carrier strike groups.' },
    { key: 'mil-air-force', title: 'Aurythari Federal Air Force', hq: 'Leivionas, Sundralic', strength: '80,000 personnel', desc: 'Continental air superiority command, long-range tactical strike wings, and high-altitude interceptors.' },
    { key: 'mil-space-command', title: 'Aurythari Space & Orbital Command', hq: 'Space Center Korvan', strength: '20,000 personnel', desc: 'Operates military reconnaissance satellites, orbital telemetry arrays, and orbital defense systems.' },
    { key: 'mil-socom', title: 'Special Operations Command (SOCOM)', hq: 'Fort Sundralic', strength: '8,000 elite operators', desc: 'Joint tier-one direct action, counter-terrorism, and deep unconventional warfare detachments.' },
    { key: 'mil-strategic-forces', title: 'Strategic Deterrence Forces', hq: 'Classified Mountain Silos (Korvan)', strength: '5,000 personnel', desc: 'Guards the nuclear-capable strategic deterrent arsenals and underground missile silos.' },

    // Law Enforcement
    { key: 'sec-fps', title: 'Federal Police Service (FPS)', hq: 'Leivionas', strength: '45,000 federal officers', desc: 'Primary civilian federal law enforcement agency investigating interstate crimes, federal fraud, and judicial security.' },
    { key: 'sec-bsf', title: 'Border Security Force (BSF)', hq: 'Leivionas', strength: '25,000 armed guards', desc: 'Guards international land frontiers, customs entry points, and the southern tribal demarcation line.' },
    { key: 'sec-coast-guard', title: 'Aurythar Coast Guard', hq: 'Maritime Command, Terogionne', strength: '15,000 maritime patrol personnel', desc: 'Enforces maritime laws, performs search and rescue, and interdicts contraband along territorial waters.' },

    // Intelligence Agencies
    { key: 'intel-dsb', title: 'Department of State Security (DSB)', hq: 'Leivionas', strength: '8,200 agents (1,200 assigned to Valmorri)', desc: 'Domestic counterintelligence agency. Severe limitation: cannot operate in Flanione without local approval.' },
    { key: 'intel-fis', title: 'Federal Intelligence Service (FIS)', hq: 'Leivionas', strength: '6,500 foreign intelligence officers', desc: 'External clandestine espionage directorate. Limitation: cannot use Valmorri as a staging base for foreign operations.' },
    { key: 'intel-sid', title: 'Signals & Cyber Intelligence Directorate (SID)', hq: 'Cyber Citadel, Deliovas', strength: '4,200 cyber specialists', desc: 'Monitors signals emissions and national cyber infrastructure. Severe gap: blocked from signals collection within Valmorri.' },
    { key: 'intel-gsc', title: 'Government Signals Command (GSC)', hq: 'Vermione', strength: '3,800 cryptographic analysts', desc: 'Cryptologic authority securing federal communications. Severe limitation: lacks local police cooperation.' },
    { key: 'intel-fab', title: 'Federal Antiterrorism Bureau (FAB)', hq: 'Leivionas', strength: '1,300 tactical investigators', desc: 'Rapid response tactical intelligence unit; blind spots in national extremist tracking due to Valmorri data blockades.' },
  ];

  for (const s of securityAgencies) {
    registerOrAuditEntity(
      s.key,
      s.title,
      'et-organization',
      makeDoc([
        {
          heading: 'Mission & Force Structure',
          paragraphs: [
            s.desc,
            `Active Personnel: ${s.strength}.`,
            `Headquarters: ${s.hq}.`,
          ],
        },
      ]),
      { headquarters: s.hq, strength: s.strength },
      ['military', 'security', 'intelligence', 'fsa-defense']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // M. FINANCIAL INSTITUTIONS & ECONOMIC CONCEPTS (`et-organization` / `et-concept`)
  // ─────────────────────────────────────────────────────────────────────────

  const financialBodies = [
    { key: 'bank-sba', title: 'State Bank of Aurythar (SBA)', hq: 'Financial Square, Leivionas', desc: 'The central reserve bank issuing the Aurythari Mark (ℳ); oversees commercial bank reserve ratios.' },
    { key: 'bank-valmorri-state', title: 'Valmorri State Bank', hq: 'Vermione', desc: 'Jedeonshu-controlled autonomous state bank holding 210 Billion ℳ in assets; refuses federal inspections since 528 A.C.' },
    { key: 'inst-ase', title: 'Aurythar Stock Exchange (ASE)', hq: 'Leivionas Bourse', desc: 'The premier continental equities exchange with aggregate market capitalization exceeding 8.5 Trillion ℳ.' },
    { key: 'bank-national', title: 'National Bank of Aurythar', hq: 'Leivionas', desc: 'Largest Big Five commercial retail bank holding 680 Billion ℳ in assets.' },
    { key: 'bank-vahlari-trust', title: 'Vahlari Trust & Savings', hq: 'Vermione', desc: 'Big Five financial institution holding 590 Billion ℳ in assets, managing aristocratic family trusts.' },
    { key: 'bank-sundralic-united', title: 'Sundralic United Bank', hq: 'Leivionas', desc: 'Big Five retail and agricultural credit institution holding 510 Billion ℳ in assets.' },
    { key: 'bank-ivarra-maritime', title: 'Ivarra Maritime Bank', hq: 'Ivarradelpe', desc: 'Big Five commercial bank holding 430 Billion ℳ in assets, financing global shipping and shipyards.' },
    { key: 'bank-eastern-commercial', title: 'Eastern Commercial Bank', hq: 'Hele', desc: 'Big Five commercial bank holding 380 Billion ℳ in assets, financing eastern trade networks.' },
  ];

  for (const fb of financialBodies) {
    registerOrAuditEntity(
      fb.key,
      fb.title,
      'et-organization',
      makeDoc([
        {
          heading: 'Financial Standing & Institutional Role',
          paragraphs: [fb.desc, `Headquarters: ${fb.hq}.`],
        },
      ]),
      { headquarters: fb.hq },
      ['finance', 'banking', 'economy']
    );
  }

  registerOrAuditEntity(
    'concept-aurythari-mark',
    'Aurythari Mark (ℳ)',
    'et-concept',
    makeDoc([
      {
        heading: 'Sovereign Currency',
        paragraphs: [
          'The official legal tender of the Federated States of Aurythar, introduced in 162 A.C. and issued by the State Bank of Aurythar (SBA).',
          'Backed by federal gold bullion reserves in Vahareus and the industrial output of the Valmorri and Sundralic Governorates.',
        ],
      },
    ]),
    {},
    ['currency', 'economy', 'mark']
  );

  registerOrAuditEntity(
    'concept-valmorri-gap',
    'The Valmorri Gap',
    'et-concept',
    makeDoc([
      {
        heading: 'Economic Disparity',
        paragraphs: [
          'The severe per-capita GDP divergence between the wealthy, hyper-industrialized Valmorri Governorate and the agrarian governorates (Auryni-Yeloni and Zahrani), generating continuous parliamentary friction over federal budget redistribution.',
        ],
      },
    ]),
    {},
    ['economics', 'crisis', 'inequality']
  );

  registerOrAuditEntity(
    'concept-valmorri-crisis',
    'The Valmorri Crisis',
    'et-concept',
    makeDoc([
      {
        heading: 'Constitutional Standoff',
        paragraphs: [
          'The defining modern political crisis of the Federation. Triggered by federal attempts to inspect the Valmorri State Bank, Jedeonshu financial autonomy, and the 528 A.C. legalization of the extremist National Renewal Movement in Flanione.',
        ],
      },
    ]),
    {},
    ['crisis', 'politics', 'history']
  );

  // ─────────────────────────────────────────────────────────────────────────
  // N. 5 HISTORICAL ERAS (`et-era`)
  // ─────────────────────────────────────────────────────────────────────────

  const eras = [
    { key: 'era-golden-age', title: 'The Indigenous Golden Age', start: '500 B.C.', end: '0 A.C.', desc: 'Indigenous polytheistic civilizations flourish. Ivarra dominate seas, Valmorri farm plains, Korvan mine highlands, Auryni and Yeloni build temples, Zahrani roam savannahs. Zehrienotisism emerges in Zahrani.' },
    { key: 'era-conquest', title: 'The Conquest & Colonial Period', start: '0 A.C.', end: '160 A.C.', desc: 'Vahlari invasion begins at Auracross in 0 A.C. Brassic and Dravari colonizers arrive. Expansion Wars subjugate mainland; FSA chartered; Flancosism enforced as colonial faith.' },
    { key: 'era-autonomy', title: 'Autonomy & Resistance Era', start: '200 A.C.', end: '381 A.C.', desc: 'Capital relocated to Leivionas in 200 A.C. Two-cluster political system emerges. Zahran invasion in 350 A.C. leads to Zahrani Governorate creation; Zehrienotisism surges as protest faith.' },
    { key: 'era-religious-war', title: 'Religious Upheaval & Reformation', start: '382 A.C.', end: '500 A.C.', desc: 'Jedeonshu expelled from six governorates (382-420 A.C.) and migrate to Valmorri. Aurythism forms in 420 A.C. Religious War (425-500 A.C.) concludes with 500 A.C. Peace Treaty.' },
    { key: 'era-modern', title: 'Unification & Modern Federal Era', start: '510 A.C.', end: '530 A.C. (Present)', desc: 'Unified federal system established in 520 A.C. Conservative Alliance banned in six governorates. Great Schism in 525 A.C. Valmorri legalizes National Renewal in 528 A.C., sparking intelligence crisis.' },
  ];

  for (const e of eras) {
    registerOrAuditEntity(
      e.key,
      e.title,
      'et-era',
      makeDoc([
        {
          heading: 'Historical Overview',
          paragraphs: [e.desc, `Chronological Span: ${e.start} to ${e.end}.`],
        },
      ]),
      { startYear: e.start, endYear: e.end },
      ['history', 'era', 'chronology']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // O. 10 HISTORICAL EVENTS (`et-event`)
  // ─────────────────────────────────────────────────────────────────────────

  const events = [
    { key: 'event-waka-onda-war', title: "The Ancient Wa'ka Ond'A War", date: 'c. 800-600 B.C.', eraKey: 'era-golden-age', outcome: 'Eradication of all males; emergence of all-female genetic succession', desc: "Ancient war resulting in the annihilation of all Wa'ka Ond'A males, leading to their unique single-sex hereditary lineage and centuries of movement restrictions." },
    { key: 'event-vahlari-landing', title: 'The Vahlari Invasion & Auracross Landfall', date: '0 A.C.', eraKey: 'era-conquest', outcome: 'Establishment of colonial stronghold; beginning of A.C. Calendar', desc: 'The arrival of Vahlari expeditionary forces on the western shores, founding the Auracross fortress (modern Vermione).' },
    { key: 'event-expansion-wars', title: 'The Expansion Wars', date: '81 - 160 A.C.', eraKey: 'era-conquest', outcome: 'Mainland subjugation; establishment of the FSA', desc: 'Decades of colonial campaigns incorporating the mainland river basins and provinces under federal charter.' },
    { key: 'event-capital-relocation', title: 'Capital Relocation to Leivionas', date: '200 A.C.', eraKey: 'era-autonomy', outcome: 'Establishment of central neutral capital', desc: 'Indigenous protests force moving the federal administrative center from coastal colonial ports to inland Leivionas.' },
    { key: 'event-zahran-invasion', title: 'The Great Zahran Invasion', date: '350 A.C.', eraKey: 'era-autonomy', outcome: 'Creation of Zahrani Governorate with sovereign autonomy', desc: 'United southern cavalry offensive compelling federal treaties recognizing Zahrani territorial autonomy.' },
    { key: 'event-jedeonshu-expulsion', title: 'The Jedeonshu Expulsion Edicts', date: '382 - 420 A.C.', eraKey: 'era-religious-war', outcome: 'Expulsion from six governorates; concentration in Valmorri', desc: 'Exposure of financial schemes leading to the mass expulsion of Jedeonshu merchants from six governorates and their concentration in Valmorri.' },
    { key: 'event-aurythism-formation', title: 'Formation of Aurythism', date: '420 A.C.', eraKey: 'era-religious-war', outcome: 'Synthesis of Flancosism and Zehrienotisism; emergence of Aurythari tongue', desc: 'The formal theological reconciliation creating the syncretic faith of Aurythism to mediate between colonizer and native creeds.' },
    { key: 'event-religious-war', title: 'The Great Religious War', date: '425 - 500 A.C.', eraKey: 'era-religious-war', outcome: '500 A.C. Peace Treaty; legal co-existence of Zehrienotists and Aurythists', desc: 'Brutal seventy-five year conflict ending with the 500 A.C. Peace Accords and the nationwide ban on National Renewal.' },
    { key: 'event-great-schism', title: 'The Great Political Schism', date: '525 A.C.', eraKey: 'era-modern', outcome: "People's Alliance splits from Democratic Front; Wa'ka Ond'A relations approved", desc: "Labor and socialist factions split from the Democratic Front to form the People's Alliance; reforms permit inter-ethnic relations for Wa'ka Ond'A." },
    { key: 'event-valmorri-standoff', title: 'The Valmorri Standoff & Legalization of Renewal', date: '528 A.C.', eraKey: 'era-modern', outcome: 'Intelligence crisis and constitutional showdown', desc: 'Valmorri unilaterally legalizes the far-right National Renewal Movement and blocks federal bank inspections, triggering the modern Valmorri Crisis.' },
  ];

  for (const ev of events) {
    registerOrAuditEntity(
      ev.key,
      ev.title,
      'et-event',
      makeDoc([
        {
          heading: 'Historical Impact & Outcome',
          paragraphs: [ev.desc, `Date: ${ev.date}.`, `Outcome: ${ev.outcome}.`],
        },
      ]),
      { startDate: ev.date, outcome: ev.outcome },
      ['history', 'event', 'conflict']
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // P. REBUILD COMPREHENSIVE HIERARCHICAL RELATIONSHIPS (~200+)
  // ─────────────────────────────────────────────────────────────────────────

  // 1. Cosmological & Geographical Containment
  addRel('cosmo-planet-aurythar', 'cosmo-continent-aurythar', 'rt-located-in', 'Contains Continent');
  addRel('cosmo-continent-aurythar', 'nation-fsa', 'rt-located-in', 'Contains Federation');
  addRel('cosmo-continent-aurythar', 'nation-kalthar', 'rt-located-in', 'Adjacent Overseas Realm');
  addRel('cosmo-continent-aurythar', 'nation-brassic-kingdoms', 'rt-located-in', 'Northern Boundary');
  addRel('cosmo-continent-aurythar', 'nation-trade-confederacy', 'rt-located-in', 'Eastern Maritime Border');
  addRel('cosmo-continent-aurythar', 'nation-southern-tribes', 'rt-located-in', 'Southern Mountain Frontier');

  // 2. Governorates in FSA
  for (const g of governorates) {
    addRel(g.key, 'nation-fsa', 'rt-located-in', 'Constituent Governorate');
  }

  // 3. States in Governorates & FSA
  for (const st of statesData) {
    const stateKey = `state-${st.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    addRel(stateKey, st.govKey, 'rt-located-in', 'Constituent State');
    addRel(stateKey, 'nation-fsa', 'rt-located-in', 'Federal Member State');
  }

  // 4. Cities in States & Governorates
  for (const c of majorCities) {
    const stateEntityKey = `state-${c.state.replace('State of ', '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    addRel(c.key, stateEntityKey, 'rt-located-in', 'Urban Center');
    if (c.isCap) {
      if (c.key === 'city-leivionas') {
        addRel(c.key, 'nation-fsa', 'rt-capital-of', 'Federal Capital');
        addRel(c.key, 'gov-sundralic', 'rt-capital-of', 'Governorate Capital');
      } else {
        const govMatch = governorates.find(g => g.title.includes(c.gov));
        if (govMatch) {
          addRel(c.key, govMatch.key, 'rt-capital-of', 'Regional Capital');
        }
      }
    }
  }

  // 5. Ruling Political Clusters
  for (const st of statesData) {
    const stateKey = `state-${st.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (st.ruling.includes('Conservative')) addRel(st.govKey, 'party-conservative-alliance', 'rt-ruled');
    if (st.ruling.includes('National Renewal')) addRel(stateKey, 'party-national-renewal', 'rt-ruled');
    if (st.ruling.includes('Democratic Front')) addRel(stateKey, 'party-democratic-front', 'rt-ruled');
    if (st.ruling.includes("People's Alliance")) addRel(stateKey, 'party-peoples-alliance', 'rt-ruled');
  }
  addRel('gov-valmorri', 'party-conservative-alliance', 'rt-ruled', 'Dominant Legislative Coalition');
  addRel('gov-valmorri', 'party-national-renewal', 'rt-allied-with', 'Legal Far-Right Minority');
  addRel('gov-ivarra', 'party-democratic-front', 'rt-ruled', 'Dominant Coalition');
  addRel('gov-sundralic', 'party-democratic-front', 'rt-ruled', 'Leading Coalition');
  addRel('gov-sundralic', 'party-peoples-alliance', 'rt-allied-with', 'Strong Left Presence');
  addRel('gov-korvan', 'party-democratic-front', 'rt-ruled', 'Leading Coalition');
  addRel('gov-auryni-yeloni', 'party-democratic-front', 'rt-ruled', 'Dominant Coalition');
  addRel('gov-veyrithi-marash', 'party-democratic-front', 'rt-ruled', 'Leading Coalition');
  addRel('gov-zahrani', 'party-democratic-front', 'rt-ruled', 'Dominant Coalition');

  // 6. Parliamentary Hierarchy
  for (const gb of governanceBodies) {
    addRel(gb.key, 'nation-fsa', 'rt-member-of', 'Federal Branch');
  }
  addRel('gov-high-senate', 'gov-parliament', 'rt-member-of', 'Tier 5 Leadership');
  addRel('gov-cabinet', 'gov-parliament', 'rt-member-of', 'Tier 4 Executive');
  addRel('gov-senate', 'gov-parliament', 'rt-member-of', 'Tier 3 Senate (99)');
  addRel('gov-assembly', 'gov-parliament', 'rt-member-of', 'Tier 2 National Assembly (300)');

  // 7. Security, Law Enforcement & Intelligence
  for (const s of securityAgencies) {
    addRel(s.key, 'nation-fsa', 'rt-member-of', 'Federal Security Service');
  }
  addRel('mil-socom', 'mil-army', 'rt-member-of', 'Special Operations Branch');
  addRel('mil-strategic-forces', 'mil-air-force', 'rt-member-of', 'Deterrent Silo Directorate');
  addRel('intel-dsb', 'sec-fps', 'rt-allied-with', 'Federal Security Interlock');
  addRel('intel-gsc', 'intel-sid', 'rt-allied-with', 'Cryptologic Intelligence');
  addRel('intel-fab', 'sec-fps', 'rt-allied-with', 'Tactical Counter-Terrorism');

  // 8. Banking & Financial Sector
  for (const fb of financialBodies) {
    addRel(fb.key, 'nation-fsa', 'rt-located-in', 'Financial Entity');
  }
  addRel('bank-sba', 'nation-fsa', 'rt-member-of', 'Central Reserve Authority');
  addRel('bank-valmorri-state', 'gov-valmorri', 'rt-located-in', 'Provincial Depository');
  addRel('bank-valmorri-state', 'concept-valmorri-crisis', 'rt-involved-in', 'Center of Banking Standoff');
  addRel('inst-ase', 'nation-fsa', 'rt-located-in', 'Equities Exchange');
  addRel('concept-aurythari-mark', 'bank-sba', 'rt-created', 'Issued and Regulated');
  addRel('concept-valmorri-gap', 'concept-valmorri-crisis', 'rt-involved-in', 'Economic Driver');

  // 9. Ethnicities to Homelands & Religions
  addRel('eth-vahlari', 'rel-aurythism', 'rt-follows-faith', 'Primary Faith');
  addRel('eth-vahlari', 'rel-flancosism', 'rt-follows-faith', 'Ancestral Colonial Faith');
  addRel('eth-dravari', 'rel-aurythism', 'rt-follows-faith', 'Primary Faith');
  addRel('eth-brassic', 'rel-devonshierostianity', 'rt-follows-faith', 'Liturgical Faith');
  addRel('eth-valmorri', 'rel-flancosism', 'rt-follows-faith', 'Ancestral Faith');
  addRel('eth-valmorri', 'rel-aurythism', 'rt-follows-faith', 'Civic Faith');
  addRel('eth-auryni', 'rel-zehrienotisism', 'rt-follows-faith', 'Temple Priests');
  addRel('eth-yeloni', 'rel-zehrienotisism', 'rt-follows-faith', 'Orthodox Faith');
  addRel('eth-zahrani', 'rel-zehrienotisism', 'rt-follows-faith', 'Orthodox Faith');
  addRel('eth-jedeonshu', 'rel-jedeshebayom', 'rt-follows-faith', 'Exclusive Covenant');
  addRel('eth-jedeonshu', 'gov-valmorri', 'rt-located-in', 'Sole Sanctuary Governorate');
  addRel('eth-jedeonshu', 'nation-kalthar', 'rt-descended-from', 'Overseas Origin');
  addRel('eth-waka-onda', 'gov-zahrani', 'rt-located-in', 'Restricted Southern Enclave');
  addRel('eth-thori', 'gov-veyrithi-marash', 'rt-located-in', 'Island Agriculturalists');

  // 10. Eras, Events, Calendar & Theories
  addRel('cal-continental', 'era-golden-age', 'rt-involved-in', 'B.C. Epoch Coverage');
  addRel('cal-continental', 'era-conquest', 'rt-involved-in', '0 A.C. Origin Epoch');
  addRel('cal-continental', 'era-autonomy', 'rt-involved-in', 'A.C. Century Coverage');
  addRel('cal-continental', 'era-religious-war', 'rt-involved-in', 'A.C. Century Coverage');
  addRel('cal-continental', 'era-modern', 'rt-involved-in', 'A.C. Century Coverage');

  for (const ev of events) {
    addRel(ev.key, ev.eraKey, 'rt-occurred-in', 'Historical Era');
    addRel(ev.key, 'nation-fsa', 'rt-involved-in', 'Federation Context');
  }
  addRel('event-waka-onda-war', 'theory-waka-onda', 'rt-involved-in', 'Investigated Subject');
  addRel('event-jedeonshu-expulsion', 'theory-jedeonshu-compact', 'rt-involved-in', 'Historical Focal Point');
  addRel('event-aurythism-formation', 'theory-aurythism-origin', 'rt-involved-in', 'Theological Dispute Subject');

  // Write all changes into IndexedDB
  console.log(`[importAurythar] Executing audit update: ${entitiesToUpsert.length} entities (${updatedCount} updated, ${newCount} new) and ${relationshipsToInsert.length} relationships.`);

  await db.transaction('rw', db.entities, db.relationships, async () => {
    // Upsert entities (preserves existing IDs and entry numbers)
    await db.entities.bulkPut(entitiesToUpsert);

    // Replace relationships for this world with the audited, deduplicated graph
    const existingWorldRels = await db.relationships.where('worldId').equals(worldId).toArray();
    const existingRelIds = existingWorldRels.map(r => r.id);
    if (existingRelIds.length > 0) {
      await db.relationships.bulkDelete(existingRelIds);
    }
    await db.relationships.bulkAdd(relationshipsToInsert);
  });

  console.log(`[importAurythar] Cosmological & lore audit completed successfully!`);

  return {
    universeId,
    worldId,
    totalEntities: entitiesToUpsert.length,
    updatedEntities: updatedCount,
    newEntities: newCount,
    totalRelationships: relationshipsToInsert.length,
  };
}
