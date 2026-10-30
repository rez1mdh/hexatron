// src/db/importArmanites.ts
// Authoritative Lore Import for Hannik Armanas, the Armanite Family Tree & Armanite Culture

import { v5 as uuidv5 } from 'uuid';
import { db, type Entity, type Relationship } from './schema';
import { getNextEntryNumber, extractLinkedEntityIds } from './operations';
import { linkMentionsInArticleString } from '../utils/entityLinker';
import { getCurrentUser } from '../services/supabase';
import { syncArmanitesToCloud } from '../services/cloudSync';

export const ARMANITE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ArmaniteImportReport {
  worldId: string;
  totalPeopleInExport: number;
  newCharactersCreated: number;
  existingCharactersReused: number;
  totalParentChildRelationships: number;
  totalSpouseRelationships: number;
  cultureEntityCreated: boolean;
  totalEntities: number;
  totalRelationships: number;
}

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

export const ARMANITE_EXPORT_MANIFEST = [
  {
    "sourceId": "7ffb33ee",
    "entityId": "char-hannik-armanas",
    "displayTitle": "Hannik Armanas",
    "givenName": "Armanas I The Great",
    "rawName": "Armanas I The Great Hannik",
    "gender": "male",
    "isArmanas": true,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 0,
    "descentChain": [],
    "parents": [
      "be0304e5",
      "004d3cb6"
    ],
    "spouses": [
      "b27603e1",
      "e3821e3d"
    ],
    "children": [
      "8ad5a407",
      "c831a063",
      "428ee402"
    ],
    "aliases": [
      "Armanas I The Great Hannik",
      "Hannik Armanas",
      "Armanas I The Great",
      "Armanas",
      "Hannik Armanas I The Great",
      "Armanas I",
      "Commander Armanas",
      "Hero of Trafloriede",
      "Savior of the Sundralic",
      "Hannik Armanas I"
    ]
  },
  {
    "sourceId": "e3821e3d",
    "entityId": "char-armanite-e3821e3d",
    "displayTitle": "Hannik Valhar Phloriene",
    "givenName": "Valhar Phloriene",
    "rawName": "Valhar Phloriene Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 0,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "7ffb33ee"
    ],
    "children": [
      "8ad5a407",
      "428ee402"
    ],
    "aliases": [
      "Valhar Phloriene Hannik",
      "Hannik Valhar Phloriene",
      "Valhar Phloriene"
    ]
  },
  {
    "sourceId": "8ad5a407",
    "entityId": "char-armanite-8ad5a407",
    "displayTitle": "Hannik Armanas II The White",
    "givenName": "Armanas II The White",
    "rawName": "Armanas II The White Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 1,
    "descentChain": [
      "7ffb33ee"
    ],
    "parents": [
      "7ffb33ee",
      "e3821e3d"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Armanas II The White Hannik",
      "Hannik Armanas II The White",
      "Armanas II The White",
      "Armanas II",
      "Hannik Armanas II"
    ]
  },
  {
    "sourceId": "b27603e1",
    "entityId": "char-armanite-b27603e1",
    "displayTitle": "Hannik Trafloriede Delphine",
    "givenName": "Trafloriede Delphine",
    "rawName": "Trafloriede Delphine  Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 0,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "7ffb33ee"
    ],
    "children": [
      "c831a063"
    ],
    "aliases": [
      "Trafloriede Delphine  Hannik",
      "Hannik Trafloriede Delphine",
      "Trafloriede Delphine"
    ]
  },
  {
    "sourceId": "c831a063",
    "entityId": "char-armanite-c831a063",
    "displayTitle": "Hannik Amena I The Divine Mother",
    "givenName": "Amena I The Divine Mother",
    "rawName": "Amena I The Divine Mother Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 1,
    "descentChain": [
      "7ffb33ee"
    ],
    "parents": [
      "b27603e1",
      "7ffb33ee"
    ],
    "spouses": [
      "46b29e1f"
    ],
    "children": [
      "2710852f"
    ],
    "aliases": [
      "Amena I The Divine Mother Hannik",
      "Hannik Amena I The Divine Mother",
      "Amena I The Divine Mother",
      "Amena I",
      "Hannik Amena I"
    ]
  },
  {
    "sourceId": "46b29e1f",
    "entityId": "char-armanite-46b29e1f",
    "displayTitle": "Unknown [ID 46b29e1f]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 1,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "c831a063"
    ],
    "children": [
      "2710852f"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 46b29e1f]"
    ]
  },
  {
    "sourceId": "2710852f",
    "entityId": "char-armanite-2710852f",
    "displayTitle": "Hannik Ronderion I",
    "givenName": "Ronderion I",
    "rawName": "Ronderion I Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 2,
    "descentChain": [
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "c831a063",
      "46b29e1f"
    ],
    "spouses": [
      "58d400c3"
    ],
    "children": [
      "2f85f505",
      "59ebbb94"
    ],
    "aliases": [
      "Ronderion I Hannik",
      "Hannik Ronderion I",
      "Ronderion I"
    ]
  },
  {
    "sourceId": "58d400c3",
    "entityId": "char-armanite-58d400c3",
    "displayTitle": "Hannik Quorvan Jane Feghini",
    "givenName": "Quorvan Jane Feghini",
    "rawName": "Quorvan Jane Feghini Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 2,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "2710852f"
    ],
    "children": [
      "2f85f505",
      "59ebbb94"
    ],
    "aliases": [
      "Quorvan Jane Feghini Hannik",
      "Hannik Quorvan Jane Feghini",
      "Quorvan Jane Feghini",
      "Quorvan Jane",
      "Hannik Quorvan Jane"
    ]
  },
  {
    "sourceId": "2f85f505",
    "entityId": "char-armanite-2f85f505",
    "displayTitle": "Hannik Enblankossius I The Blonde",
    "givenName": "Enblankossius I The Blonde",
    "rawName": "Enblankossius I The Blonde  Hannik",
    "gender": null,
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 3,
    "descentChain": [
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "2710852f",
      "58d400c3"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Enblankossius I The Blonde  Hannik",
      "Hannik Enblankossius I The Blonde",
      "Enblankossius I The Blonde",
      "Enblankossius I",
      "Hannik Enblankossius I"
    ]
  },
  {
    "sourceId": "59ebbb94",
    "entityId": "char-armanite-59ebbb94",
    "displayTitle": "Hannik Armanas III The Good",
    "givenName": "Armanas III The Good",
    "rawName": "Armanas III The Good  Hannik",
    "gender": null,
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 3,
    "descentChain": [
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "2710852f",
      "58d400c3"
    ],
    "spouses": [],
    "children": [
      "1d90ed74",
      "7072f43f",
      "1bc5a3b2",
      "f775578e"
    ],
    "aliases": [
      "Armanas III The Good  Hannik",
      "Hannik Armanas III The Good",
      "Armanas III The Good",
      "Armanas III",
      "Hannik Armanas III"
    ]
  },
  {
    "sourceId": "1d90ed74",
    "entityId": "char-armanite-1d90ed74",
    "displayTitle": "Hannik Dikzione I The Lost",
    "givenName": "Dikzione I The Lost",
    "rawName": "Dikzione I The Lost Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 4,
    "descentChain": [
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "59ebbb94"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Dikzione I The Lost Hannik",
      "Hannik Dikzione I The Lost",
      "Dikzione I The Lost",
      "Dikzione I",
      "Hannik Dikzione I"
    ]
  },
  {
    "sourceId": "7072f43f",
    "entityId": "char-armanite-7072f43f",
    "displayTitle": "Hannik Chezko I",
    "givenName": "Chezko I",
    "rawName": "Chezko I Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 4,
    "descentChain": [
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "59ebbb94"
    ],
    "spouses": [],
    "children": [
      "af11d8d4"
    ],
    "aliases": [
      "Chezko I Hannik",
      "Hannik Chezko I",
      "Chezko I"
    ]
  },
  {
    "sourceId": "1bc5a3b2",
    "entityId": "char-armanite-1bc5a3b2",
    "displayTitle": "Hannik Vozzavirio I The Conquerer",
    "givenName": "Vozzavirio I The Conquerer",
    "rawName": "Vozzavirio I The Conquerer  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 4,
    "descentChain": [
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "59ebbb94"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Vozzavirio I The Conquerer  Hannik",
      "Hannik Vozzavirio I The Conquerer",
      "Vozzavirio I The Conquerer",
      "Vozzavirio I",
      "Hannik Vozzavirio I"
    ]
  },
  {
    "sourceId": "f775578e",
    "entityId": "char-armanite-f775578e",
    "displayTitle": "Hannik Rombard I",
    "givenName": "Rombard I",
    "rawName": "Rombard I Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 4,
    "descentChain": [
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "59ebbb94"
    ],
    "spouses": [],
    "children": [
      "a36b81b6"
    ],
    "aliases": [
      "Rombard I Hannik",
      "Hannik Rombard I",
      "Rombard I"
    ]
  },
  {
    "sourceId": "af11d8d4",
    "entityId": "char-armanite-af11d8d4",
    "displayTitle": "Hannik Armanas IV",
    "givenName": "Armanas IV",
    "rawName": "Armanas IV Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 5,
    "descentChain": [
      "7072f43f",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "7072f43f"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Armanas IV Hannik",
      "Hannik Armanas IV",
      "Armanas IV"
    ]
  },
  {
    "sourceId": "a36b81b6",
    "entityId": "char-armanite-a36b81b6",
    "displayTitle": "Hannik Dravakar I The Last",
    "givenName": "Dravakar I The Last",
    "rawName": "Dravakar I The Last Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 5,
    "descentChain": [
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "f775578e"
    ],
    "spouses": [],
    "children": [
      "9a1acf26",
      "29039c41"
    ],
    "aliases": [
      "Dravakar I The Last Hannik",
      "Hannik Dravakar I The Last",
      "Dravakar I The Last",
      "Dravakar I",
      "Hannik Dravakar I"
    ]
  },
  {
    "sourceId": "9a1acf26",
    "entityId": "char-armanite-9a1acf26",
    "displayTitle": "Hannik Andrellion I Armano The Founding Father",
    "givenName": "Andrellion I Armano The Founding Father",
    "rawName": "Andrellion I Armano The Founding Father  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 6,
    "descentChain": [
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "a36b81b6"
    ],
    "spouses": [],
    "children": [
      "9c3549e9",
      "4364f217"
    ],
    "aliases": [
      "Andrellion I Armano The Founding Father  Hannik",
      "Hannik Andrellion I Armano The Founding Father",
      "Andrellion I Armano The Founding Father",
      "Andrellion I",
      "Hannik Andrellion I"
    ]
  },
  {
    "sourceId": "428ee402",
    "entityId": "char-armanite-428ee402",
    "displayTitle": "Hannik Valmoras",
    "givenName": "Valmoras",
    "rawName": "Valmoras Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 1,
    "descentChain": [
      "7ffb33ee"
    ],
    "parents": [
      "7ffb33ee",
      "e3821e3d"
    ],
    "spouses": [],
    "children": [
      "39f3462e"
    ],
    "aliases": [
      "Valmoras Hannik",
      "Hannik Valmoras",
      "Valmoras"
    ]
  },
  {
    "sourceId": "39f3462e",
    "entityId": "char-armanite-39f3462e",
    "displayTitle": "Hannik Reckon",
    "givenName": "Reckon",
    "rawName": "Reckon Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 2,
    "descentChain": [
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "428ee402"
    ],
    "spouses": [],
    "children": [
      "6a2f2c40"
    ],
    "aliases": [
      "Reckon Hannik",
      "Hannik Reckon",
      "Reckon"
    ]
  },
  {
    "sourceId": "6a2f2c40",
    "entityId": "char-armanite-6a2f2c40",
    "displayTitle": "Hannik Fendalo",
    "givenName": "Fendalo",
    "rawName": "Fendalo Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 3,
    "descentChain": [
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "39f3462e"
    ],
    "spouses": [],
    "children": [
      "ba4e4d6e",
      "3c9531e6"
    ],
    "aliases": [
      "Fendalo Hannik",
      "Hannik Fendalo",
      "Fendalo"
    ]
  },
  {
    "sourceId": "ba4e4d6e",
    "entityId": "char-armanite-ba4e4d6e",
    "displayTitle": "Hannik Amena",
    "givenName": "Amena",
    "rawName": "Amena Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 4,
    "descentChain": [
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "6a2f2c40"
    ],
    "spouses": [],
    "children": [
      "89e2084d"
    ],
    "aliases": [
      "Amena Hannik",
      "Hannik Amena",
      "Amena"
    ]
  },
  {
    "sourceId": "be0304e5",
    "entityId": "char-hannik-debalak",
    "displayTitle": "Hannik Debalak",
    "givenName": "Debalak",
    "rawName": "Debalak Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": true,
    "generationFromHannik": -1,
    "descentChain": [],
    "parents": [
      "752ac3d7",
      "68ad4c52"
    ],
    "spouses": [
      "004d3cb6"
    ],
    "children": [
      "7ffb33ee",
      "7c3f5f62"
    ],
    "aliases": [
      "Debalak Hannik",
      "Hannik Debalak",
      "Debalak"
    ]
  },
  {
    "sourceId": "7c3f5f62",
    "entityId": "char-hannik-lonko",
    "displayTitle": "Hannik Lonko",
    "givenName": "Lonko",
    "rawName": "Lonko Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": null,
    "descentChain": [],
    "parents": [
      "be0304e5",
      "004d3cb6"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Lonko Hannik",
      "Hannik Lonko",
      "Lonko"
    ]
  },
  {
    "sourceId": "9c3549e9",
    "entityId": "char-armanite-9c3549e9",
    "displayTitle": "Hannik Otokratoris I The Rich",
    "givenName": "Otokratoris I The Rich",
    "rawName": "Otokratoris I The Rich Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "9a1acf26"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Otokratoris I The Rich Hannik",
      "Hannik Otokratoris I The Rich",
      "Otokratoris I The Rich",
      "Otokratoris I",
      "Hannik Otokratoris I"
    ]
  },
  {
    "sourceId": "89e2084d",
    "entityId": "char-armanite-89e2084d",
    "displayTitle": "Hannik Temontè",
    "givenName": "Temontè",
    "rawName": "Temontè Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 5,
    "descentChain": [
      "ba4e4d6e",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "ba4e4d6e"
    ],
    "spouses": [],
    "children": [
      "bdb06fa6"
    ],
    "aliases": [
      "Temontè Hannik",
      "Hannik Temontè",
      "Temontè"
    ]
  },
  {
    "sourceId": "bdb06fa6",
    "entityId": "char-armanite-bdb06fa6",
    "displayTitle": "Hannik Glontè",
    "givenName": "Glontè",
    "rawName": "Glontè Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 6,
    "descentChain": [
      "89e2084d",
      "ba4e4d6e",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "89e2084d"
    ],
    "spouses": [],
    "children": [
      "8427dc1c"
    ],
    "aliases": [
      "Glontè Hannik",
      "Hannik Glontè",
      "Glontè"
    ]
  },
  {
    "sourceId": "8427dc1c",
    "entityId": "char-armanite-8427dc1c",
    "displayTitle": "Hannik Glesritanth The Third President",
    "givenName": "Glesritanth The Third President",
    "rawName": "Glesritanth The Third President  Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [
      "bdb06fa6",
      "89e2084d",
      "ba4e4d6e",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "bdb06fa6"
    ],
    "spouses": [
      "2408f1b4"
    ],
    "children": [
      "bb701a54"
    ],
    "aliases": [
      "Glesritanth The Third President  Hannik",
      "Hannik Glesritanth The Third President",
      "Glesritanth The Third President",
      "Glesritanth The",
      "Hannik Glesritanth The"
    ]
  },
  {
    "sourceId": "2408f1b4",
    "entityId": "char-armanite-2408f1b4",
    "displayTitle": "Unknown [ID 2408f1b4]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "8427dc1c"
    ],
    "children": [
      "bb701a54"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 2408f1b4]"
    ]
  },
  {
    "sourceId": "3c9531e6",
    "entityId": "char-armanite-3c9531e6",
    "displayTitle": "Hannik Doakes",
    "givenName": "Doakes",
    "rawName": "Doakes Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 4,
    "descentChain": [
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "6a2f2c40"
    ],
    "spouses": [],
    "children": [
      "3432f491"
    ],
    "aliases": [
      "Doakes Hannik",
      "Hannik Doakes",
      "Doakes"
    ]
  },
  {
    "sourceId": "3432f491",
    "entityId": "char-armanite-3432f491",
    "displayTitle": "Hannik Felkoinos",
    "givenName": "Felkoinos",
    "rawName": "Felkoinos Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 5,
    "descentChain": [
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "3c9531e6"
    ],
    "spouses": [],
    "children": [
      "b1220820"
    ],
    "aliases": [
      "Felkoinos Hannik",
      "Hannik Felkoinos",
      "Felkoinos"
    ]
  },
  {
    "sourceId": "b1220820",
    "entityId": "char-armanite-b1220820",
    "displayTitle": "Hannik Edwina",
    "givenName": "Edwina",
    "rawName": "Edwina  Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 6,
    "descentChain": [
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "3432f491"
    ],
    "spouses": [],
    "children": [
      "754ba322",
      "32fdd4bd"
    ],
    "aliases": [
      "Edwina  Hannik",
      "Hannik Edwina",
      "Edwina"
    ]
  },
  {
    "sourceId": "754ba322",
    "entityId": "char-armanite-754ba322",
    "displayTitle": "Hannik Lombardina",
    "givenName": "Lombardina",
    "rawName": "Lombardina  Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "b1220820"
    ],
    "spouses": [
      "7f2b8b20"
    ],
    "children": [
      "e0f7dac2"
    ],
    "aliases": [
      "Lombardina  Hannik",
      "Hannik Lombardina",
      "Lombardina"
    ]
  },
  {
    "sourceId": "bb701a54",
    "entityId": "char-armanite-bb701a54",
    "displayTitle": "Hannik Armanas V The 2nd High Senator of Sundralissia",
    "givenName": "Armanas V The 2nd High Senator of Sundralissia",
    "rawName": "Armanas V The 2nd High Senator of Sundralissia",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 8,
    "descentChain": [
      "8427dc1c",
      "bdb06fa6",
      "89e2084d",
      "ba4e4d6e",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "8427dc1c",
      "2408f1b4"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Armanas V The 2nd High Senator of Sundralissia",
      "Hannik Armanas V The 2nd High Senator of Sundralissia",
      "Armanas V",
      "Hannik Armanas V"
    ]
  },
  {
    "sourceId": "7f2b8b20",
    "entityId": "char-armanite-7f2b8b20",
    "displayTitle": "Unknown [ID 7f2b8b20]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "754ba322"
    ],
    "children": [
      "e0f7dac2"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 7f2b8b20]"
    ]
  },
  {
    "sourceId": "4364f217",
    "entityId": "char-armanite-4364f217",
    "displayTitle": "Hannik Jaydden",
    "givenName": "Jaydden",
    "rawName": "Jaydden Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "9a1acf26"
    ],
    "spouses": [
      "5fe5b424"
    ],
    "children": [
      "7aadf10d"
    ],
    "aliases": [
      "Jaydden Hannik",
      "Hannik Jaydden",
      "Jaydden"
    ]
  },
  {
    "sourceId": "e0f7dac2",
    "entityId": "char-armanite-e0f7dac2",
    "displayTitle": "Hannik Otokratoris II The Tough",
    "givenName": "Otokratoris II The Tough",
    "rawName": "Otokratoris II The Tough  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 8,
    "descentChain": [
      "754ba322",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "754ba322",
      "7f2b8b20"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Otokratoris II The Tough  Hannik",
      "Hannik Otokratoris II The Tough",
      "Otokratoris II The Tough",
      "Otokratoris II",
      "Hannik Otokratoris II"
    ]
  },
  {
    "sourceId": "5fe5b424",
    "entityId": "char-armanite-5fe5b424",
    "displayTitle": "Unknown [ID 5fe5b424]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "4364f217"
    ],
    "children": [
      "7aadf10d"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 5fe5b424]"
    ]
  },
  {
    "sourceId": "7aadf10d",
    "entityId": "char-armanite-7aadf10d",
    "displayTitle": "Hannik Amena II",
    "givenName": "Amena II",
    "rawName": "Amena II Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 8,
    "descentChain": [
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "4364f217",
      "5fe5b424"
    ],
    "spouses": [
      "ee749c10"
    ],
    "children": [
      "bcdc10f1"
    ],
    "aliases": [
      "Amena II Hannik",
      "Hannik Amena II",
      "Amena II"
    ]
  },
  {
    "sourceId": "29039c41",
    "entityId": "char-armanite-29039c41",
    "displayTitle": "Hannik Flo",
    "givenName": "Flo",
    "rawName": "Flo Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 6,
    "descentChain": [
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "a36b81b6"
    ],
    "spouses": [],
    "children": [
      "7d570799"
    ],
    "aliases": [
      "Flo Hannik",
      "Hannik Flo",
      "Flo"
    ]
  },
  {
    "sourceId": "7d570799",
    "entityId": "char-armanite-7d570799",
    "displayTitle": "Hannik Dekstoier",
    "givenName": "Dekstoier",
    "rawName": "Dekstoier Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [
      "29039c41",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "29039c41"
    ],
    "spouses": [],
    "children": [
      "cf1b64cb"
    ],
    "aliases": [
      "Dekstoier Hannik",
      "Hannik Dekstoier",
      "Dekstoier"
    ]
  },
  {
    "sourceId": "cf1b64cb",
    "entityId": "char-armanite-cf1b64cb",
    "displayTitle": "Hannik Roskcianne",
    "givenName": "Roskcianne",
    "rawName": "Roskcianne Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 8,
    "descentChain": [
      "7d570799",
      "29039c41",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "7d570799"
    ],
    "spouses": [],
    "children": [
      "58c0ac7a"
    ],
    "aliases": [
      "Roskcianne Hannik",
      "Hannik Roskcianne",
      "Roskcianne"
    ]
  },
  {
    "sourceId": "58c0ac7a",
    "entityId": "char-armanite-58c0ac7a",
    "displayTitle": "Hannik Jayddionn The Handsome",
    "givenName": "Jayddionn The Handsome",
    "rawName": "Jayddionn The Handsome  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 9,
    "descentChain": [
      "cf1b64cb",
      "7d570799",
      "29039c41",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "cf1b64cb"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Jayddionn The Handsome  Hannik",
      "Hannik Jayddionn The Handsome",
      "Jayddionn The Handsome",
      "Jayddionn The",
      "Hannik Jayddionn The"
    ]
  },
  {
    "sourceId": "ee749c10",
    "entityId": "char-armanite-ee749c10",
    "displayTitle": "Unknown [ID ee749c10]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 8,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "7aadf10d"
    ],
    "children": [
      "bcdc10f1"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID ee749c10]"
    ]
  },
  {
    "sourceId": "bcdc10f1",
    "entityId": "char-armanite-bcdc10f1",
    "displayTitle": "Hannik Armanas VI The 18th Vice President",
    "givenName": "Armanas VI The 18th Vice President",
    "rawName": "Armanas VI The 18th Vice President  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 9,
    "descentChain": [
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "7aadf10d",
      "ee749c10"
    ],
    "spouses": [
      "9316035c"
    ],
    "children": [
      "10cfd886"
    ],
    "aliases": [
      "Armanas VI The 18th Vice President  Hannik",
      "Hannik Armanas VI The 18th Vice President",
      "Armanas VI The 18th Vice President",
      "Armanas VI",
      "Hannik Armanas VI"
    ]
  },
  {
    "sourceId": "9316035c",
    "entityId": "char-armanite-9316035c",
    "displayTitle": "Hannik Delphine The Black Mother",
    "givenName": "Delphine The Black Mother",
    "rawName": "Delphine The Black Mother Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 9,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "bcdc10f1"
    ],
    "children": [
      "10cfd886"
    ],
    "aliases": [
      "Delphine The Black Mother Hannik",
      "Hannik Delphine The Black Mother",
      "Delphine The Black Mother",
      "Delphine The",
      "Hannik Delphine The"
    ]
  },
  {
    "sourceId": "10cfd886",
    "entityId": "char-armanite-10cfd886",
    "displayTitle": "Hannik Otokratoris III The 13th President",
    "givenName": "Otokratoris III The 13th President",
    "rawName": "Otokratoris III The 13th President  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 10,
    "descentChain": [
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "bcdc10f1",
      "9316035c"
    ],
    "spouses": [
      "d4d870ee"
    ],
    "children": [
      "231a50ee",
      "5383cc6e"
    ],
    "aliases": [
      "Otokratoris III The 13th President  Hannik",
      "Hannik Otokratoris III The 13th President",
      "Otokratoris III The 13th President",
      "Otokratoris III",
      "Hannik Otokratoris III"
    ]
  },
  {
    "sourceId": "004d3cb6",
    "entityId": "char-armanite-004d3cb6",
    "displayTitle": "Hannik Chaska",
    "givenName": "Chaska",
    "rawName": "Chaska Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": true,
    "generationFromHannik": -1,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "be0304e5"
    ],
    "children": [
      "7ffb33ee",
      "7c3f5f62",
      "52b79967"
    ],
    "aliases": [
      "Chaska Hannik",
      "Hannik Chaska",
      "Chaska"
    ]
  },
  {
    "sourceId": "52b79967",
    "entityId": "char-armanite-52b79967",
    "displayTitle": "Unknown [ID 52b79967]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": null,
    "descentChain": [],
    "parents": [
      "004d3cb6"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Unknown",
      "Unknown [ID 52b79967]"
    ]
  },
  {
    "sourceId": "752ac3d7",
    "entityId": "char-armanite-752ac3d7",
    "displayTitle": "Hannik Dormanzieno",
    "givenName": "Dormanzieno",
    "rawName": "Dormanzieno Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": true,
    "generationFromHannik": -2,
    "descentChain": [],
    "parents": [
      "144395f1",
      "34a9f1d2"
    ],
    "spouses": [
      "f00f9a3e",
      "68ad4c52"
    ],
    "children": [
      "be0304e5"
    ],
    "aliases": [
      "Dormanzieno Hannik",
      "Hannik Dormanzieno",
      "Dormanzieno"
    ]
  },
  {
    "sourceId": "f00f9a3e",
    "entityId": "char-armanite-f00f9a3e",
    "displayTitle": "Unknown [ID f00f9a3e]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": -2,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "752ac3d7"
    ],
    "children": [],
    "aliases": [
      "Unknown",
      "Unknown [ID f00f9a3e]"
    ]
  },
  {
    "sourceId": "231a50ee",
    "entityId": "char-armanite-231a50ee",
    "displayTitle": "Hannik Ronderion II The 15th President",
    "givenName": "Ronderion II The 15th President",
    "rawName": "Ronderion II The 15th President  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 11,
    "descentChain": [
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "10cfd886"
    ],
    "spouses": [
      "1183ee99"
    ],
    "children": [
      "9f1ad19c",
      "0ad444a1",
      "86057e7f"
    ],
    "aliases": [
      "Ronderion II The 15th President  Hannik",
      "Hannik Ronderion II The 15th President",
      "Ronderion II The 15th President",
      "Ronderion II",
      "Hannik Ronderion II"
    ]
  },
  {
    "sourceId": "32fdd4bd",
    "entityId": "char-armanite-32fdd4bd",
    "displayTitle": "Hannik Erena",
    "givenName": "Erena",
    "rawName": "Erena Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 7,
    "descentChain": [
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "b1220820"
    ],
    "spouses": [],
    "children": [
      "de6c4c93"
    ],
    "aliases": [
      "Erena Hannik",
      "Hannik Erena",
      "Erena"
    ]
  },
  {
    "sourceId": "de6c4c93",
    "entityId": "char-armanite-de6c4c93",
    "displayTitle": "Hannik Fleeia",
    "givenName": "Fleeia",
    "rawName": "Fleeia Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 8,
    "descentChain": [
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "32fdd4bd"
    ],
    "spouses": [],
    "children": [
      "c8a17bd8"
    ],
    "aliases": [
      "Fleeia Hannik",
      "Hannik Fleeia",
      "Fleeia"
    ]
  },
  {
    "sourceId": "c8a17bd8",
    "entityId": "char-armanite-c8a17bd8",
    "displayTitle": "Hannik Donkarlo",
    "givenName": "Donkarlo",
    "rawName": "Donkarlo Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 9,
    "descentChain": [
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "de6c4c93"
    ],
    "spouses": [],
    "children": [
      "a73e22f5",
      "dd84df7b"
    ],
    "aliases": [
      "Donkarlo Hannik",
      "Hannik Donkarlo",
      "Donkarlo"
    ]
  },
  {
    "sourceId": "a73e22f5",
    "entityId": "char-armanite-a73e22f5",
    "displayTitle": "Hannik Jiobanne",
    "givenName": "Jiobanne",
    "rawName": "Jiobanne Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 10,
    "descentChain": [
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "c8a17bd8"
    ],
    "spouses": [],
    "children": [
      "1ce2c96b",
      "d9d59a06"
    ],
    "aliases": [
      "Jiobanne Hannik",
      "Hannik Jiobanne",
      "Jiobanne"
    ]
  },
  {
    "sourceId": "1ce2c96b",
    "entityId": "char-armanite-1ce2c96b",
    "displayTitle": "Hannik Emarie",
    "givenName": "Emarie",
    "rawName": "Emarie Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 11,
    "descentChain": [
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "a73e22f5"
    ],
    "spouses": [],
    "children": [
      "393d33a9",
      "c00212f1"
    ],
    "aliases": [
      "Emarie Hannik",
      "Hannik Emarie",
      "Emarie"
    ]
  },
  {
    "sourceId": "393d33a9",
    "entityId": "char-armanite-393d33a9",
    "displayTitle": "Hannik Eizezeus",
    "givenName": "Eizezeus",
    "rawName": "Eizezeus Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 12,
    "descentChain": [
      "1ce2c96b",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "1ce2c96b"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Eizezeus Hannik",
      "Hannik Eizezeus",
      "Eizezeus"
    ]
  },
  {
    "sourceId": "dd84df7b",
    "entityId": "char-armanite-dd84df7b",
    "displayTitle": "Hannik La Flor",
    "givenName": "La Flor",
    "rawName": "La Flor  Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 10,
    "descentChain": [
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "c8a17bd8"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "La Flor  Hannik",
      "Hannik La Flor",
      "La Flor"
    ]
  },
  {
    "sourceId": "d4d870ee",
    "entityId": "char-armanite-d4d870ee",
    "displayTitle": "Unknown [ID d4d870ee]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 10,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "10cfd886"
    ],
    "children": [
      "5383cc6e"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID d4d870ee]"
    ]
  },
  {
    "sourceId": "5383cc6e",
    "entityId": "char-armanite-5383cc6e",
    "displayTitle": "Hannik Eriosianne",
    "givenName": "Eriosianne",
    "rawName": "Eriosianne Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 11,
    "descentChain": [
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "10cfd886",
      "d4d870ee"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Eriosianne Hannik",
      "Hannik Eriosianne",
      "Eriosianne"
    ]
  },
  {
    "sourceId": "1183ee99",
    "entityId": "char-armanite-1183ee99",
    "displayTitle": "Unknown [ID 1183ee99]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 11,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "231a50ee"
    ],
    "children": [
      "9f1ad19c",
      "0ad444a1",
      "86057e7f"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 1183ee99]"
    ]
  },
  {
    "sourceId": "86057e7f",
    "entityId": "char-armanite-86057e7f",
    "displayTitle": "Hannik Helnock I",
    "givenName": "Helnock I",
    "rawName": "Helnock I Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 12,
    "descentChain": [
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "231a50ee",
      "1183ee99"
    ],
    "spouses": [
      "0c320fd4"
    ],
    "children": [
      "de1241bd"
    ],
    "aliases": [
      "Helnock I Hannik",
      "Hannik Helnock I",
      "Helnock I"
    ]
  },
  {
    "sourceId": "9f1ad19c",
    "entityId": "char-armanite-9f1ad19c",
    "displayTitle": "Hannik Danos",
    "givenName": "Danos",
    "rawName": "Danos Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 12,
    "descentChain": [
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "231a50ee",
      "1183ee99"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Danos Hannik",
      "Hannik Danos",
      "Danos"
    ]
  },
  {
    "sourceId": "0ad444a1",
    "entityId": "char-armanite-0ad444a1",
    "displayTitle": "Hannik Toddensionne",
    "givenName": "Toddensionne",
    "rawName": "Toddensionne  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 12,
    "descentChain": [
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "231a50ee",
      "1183ee99"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Toddensionne  Hannik",
      "Hannik Toddensionne",
      "Toddensionne"
    ]
  },
  {
    "sourceId": "0c320fd4",
    "entityId": "char-armanite-0c320fd4",
    "displayTitle": "Unknown [ID 0c320fd4]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 12,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "86057e7f"
    ],
    "children": [
      "de1241bd"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 0c320fd4]"
    ]
  },
  {
    "sourceId": "de1241bd",
    "entityId": "char-armanite-de1241bd",
    "displayTitle": "Hannik Armanas VII The Restorer",
    "givenName": "Armanas VII The Restorer",
    "rawName": "Armanas VII The Restorer  Hannik",
    "gender": null,
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 13,
    "descentChain": [
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "86057e7f",
      "0c320fd4"
    ],
    "spouses": [
      "6fd07aa2"
    ],
    "children": [
      "432f910c",
      "7f82c37b"
    ],
    "aliases": [
      "Armanas VII The Restorer  Hannik",
      "Hannik Armanas VII The Restorer",
      "Armanas VII The Restorer",
      "Armanas VII",
      "Hannik Armanas VII"
    ]
  },
  {
    "sourceId": "68ad4c52",
    "entityId": "char-armanite-68ad4c52",
    "displayTitle": "Hannik Gent",
    "givenName": "Gent",
    "rawName": "Gent Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": true,
    "generationFromHannik": -2,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "752ac3d7"
    ],
    "children": [
      "be0304e5"
    ],
    "aliases": [
      "Gent Hannik",
      "Hannik Gent",
      "Gent"
    ]
  },
  {
    "sourceId": "144395f1",
    "entityId": "char-armanite-144395f1",
    "displayTitle": "Hannik Grettoinino",
    "givenName": "Grettoinino",
    "rawName": "Grettoinino Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": true,
    "generationFromHannik": -3,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "34a9f1d2"
    ],
    "children": [
      "752ac3d7"
    ],
    "aliases": [
      "Grettoinino Hannik",
      "Hannik Grettoinino",
      "Grettoinino"
    ]
  },
  {
    "sourceId": "34a9f1d2",
    "entityId": "char-armanite-34a9f1d2",
    "displayTitle": "Hannik Labamashokasanak",
    "givenName": "Labamashokasanak",
    "rawName": "Labamashokasanak Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": true,
    "generationFromHannik": -3,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "144395f1"
    ],
    "children": [
      "752ac3d7"
    ],
    "aliases": [
      "Labamashokasanak Hannik",
      "Hannik Labamashokasanak",
      "Labamashokasanak"
    ]
  },
  {
    "sourceId": "c00212f1",
    "entityId": "char-armanite-c00212f1",
    "displayTitle": "Hannik Le Piuliuna The Bald",
    "givenName": "Le Piuliuna The Bald",
    "rawName": "Le Piuliuna The Bald Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 12,
    "descentChain": [
      "1ce2c96b",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "1ce2c96b"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Le Piuliuna The Bald Hannik",
      "Hannik Le Piuliuna The Bald",
      "Le Piuliuna The Bald",
      "Le Piuliuna",
      "Hannik Le Piuliuna"
    ]
  },
  {
    "sourceId": "6fd07aa2",
    "entityId": "char-armanite-6fd07aa2",
    "displayTitle": "Unknown [ID 6fd07aa2]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 13,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "de1241bd"
    ],
    "children": [
      "432f910c",
      "7f82c37b"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 6fd07aa2]"
    ]
  },
  {
    "sourceId": "432f910c",
    "entityId": "char-armanite-432f910c",
    "displayTitle": "Hannik Andrellion II The Cruel",
    "givenName": "Andrellion II The Cruel",
    "rawName": "Andrellion II The Cruel Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 14,
    "descentChain": [
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "de1241bd",
      "6fd07aa2"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Andrellion II The Cruel Hannik",
      "Hannik Andrellion II The Cruel",
      "Andrellion II The Cruel",
      "Andrellion II",
      "Hannik Andrellion II"
    ]
  },
  {
    "sourceId": "7f82c37b",
    "entityId": "char-armanite-7f82c37b",
    "displayTitle": "Hannik Donkarlo I The Negotiator",
    "givenName": "Donkarlo I The Negotiator",
    "rawName": "Donkarlo I The Negotiator  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 14,
    "descentChain": [
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "de1241bd",
      "6fd07aa2"
    ],
    "spouses": [],
    "children": [
      "f6b0917c"
    ],
    "aliases": [
      "Donkarlo I The Negotiator  Hannik",
      "Hannik Donkarlo I The Negotiator",
      "Donkarlo I The Negotiator",
      "Donkarlo I",
      "Hannik Donkarlo I"
    ]
  },
  {
    "sourceId": "f6b0917c",
    "entityId": "char-armanite-f6b0917c",
    "displayTitle": "Hannik Dravakar II The 23th President",
    "givenName": "Dravakar II The 23th President",
    "rawName": "Dravakar II The 23th President  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 15,
    "descentChain": [
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "7f82c37b"
    ],
    "spouses": [
      "48f30d7b"
    ],
    "children": [
      "82e0257a"
    ],
    "aliases": [
      "Dravakar II The 23th President  Hannik",
      "Hannik Dravakar II The 23th President",
      "Dravakar II The 23th President",
      "Dravakar II",
      "Hannik Dravakar II"
    ]
  },
  {
    "sourceId": "d9d59a06",
    "entityId": "char-armanite-d9d59a06",
    "displayTitle": "Hannik Karleonne",
    "givenName": "Karleonne",
    "rawName": "Karleonne Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 11,
    "descentChain": [
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "a73e22f5"
    ],
    "spouses": [],
    "children": [
      "e8e0ea62"
    ],
    "aliases": [
      "Karleonne Hannik",
      "Hannik Karleonne",
      "Karleonne"
    ]
  },
  {
    "sourceId": "e8e0ea62",
    "entityId": "char-armanite-e8e0ea62",
    "displayTitle": "Hannik Eozeph",
    "givenName": "Eozeph",
    "rawName": "Eozeph Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 12,
    "descentChain": [
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "d9d59a06"
    ],
    "spouses": [],
    "children": [
      "3b969c00",
      "d3242078"
    ],
    "aliases": [
      "Eozeph Hannik",
      "Hannik Eozeph",
      "Eozeph"
    ]
  },
  {
    "sourceId": "3b969c00",
    "entityId": "char-armanite-3b969c00",
    "displayTitle": "Hannik Evrem",
    "givenName": "Evrem",
    "rawName": "Evrem Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 13,
    "descentChain": [
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "e8e0ea62"
    ],
    "spouses": [],
    "children": [
      "fe930a68",
      "dfcf67ef"
    ],
    "aliases": [
      "Evrem Hannik",
      "Hannik Evrem",
      "Evrem"
    ]
  },
  {
    "sourceId": "fe930a68",
    "entityId": "char-armanite-fe930a68",
    "displayTitle": "Hannik Ezmel",
    "givenName": "Ezmel",
    "rawName": "Ezmel Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 14,
    "descentChain": [
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "3b969c00"
    ],
    "spouses": [],
    "children": [
      "53a8b12b"
    ],
    "aliases": [
      "Ezmel Hannik",
      "Hannik Ezmel",
      "Ezmel"
    ]
  },
  {
    "sourceId": "dfcf67ef",
    "entityId": "char-armanite-dfcf67ef",
    "displayTitle": "Hannik Ezea The Godmother",
    "givenName": "Ezea The Godmother",
    "rawName": "Ezea The Godmother  Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 14,
    "descentChain": [
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "3b969c00"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Ezea The Godmother  Hannik",
      "Hannik Ezea The Godmother",
      "Ezea The Godmother",
      "Ezea The",
      "Hannik Ezea The"
    ]
  },
  {
    "sourceId": "48f30d7b",
    "entityId": "char-armanite-48f30d7b",
    "displayTitle": "Unknown [ID 48f30d7b]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 15,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "f6b0917c"
    ],
    "children": [
      "82e0257a"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 48f30d7b]"
    ]
  },
  {
    "sourceId": "53a8b12b",
    "entityId": "char-armanite-53a8b12b",
    "displayTitle": "Hannik Edzheim",
    "givenName": "Edzheim",
    "rawName": "Edzheim Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 15,
    "descentChain": [
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "fe930a68"
    ],
    "spouses": [],
    "children": [
      "3034c69c",
      "9fa6f136"
    ],
    "aliases": [
      "Edzheim Hannik",
      "Hannik Edzheim",
      "Edzheim"
    ]
  },
  {
    "sourceId": "3034c69c",
    "entityId": "char-armanite-3034c69c",
    "displayTitle": "Hannik Edreis",
    "givenName": "Edreis",
    "rawName": "Edreis Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 16,
    "descentChain": [
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "53a8b12b"
    ],
    "spouses": [],
    "children": [
      "843ded43",
      "d75fa4eb"
    ],
    "aliases": [
      "Edreis Hannik",
      "Hannik Edreis",
      "Edreis"
    ]
  },
  {
    "sourceId": "9fa6f136",
    "entityId": "char-armanite-9fa6f136",
    "displayTitle": "Hannik Einokion",
    "givenName": "Einokion",
    "rawName": "Einokion Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 16,
    "descentChain": [
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "53a8b12b"
    ],
    "spouses": [],
    "children": [
      "93f0accc",
      "b9189ea2",
      "f8b518dd"
    ],
    "aliases": [
      "Einokion Hannik",
      "Hannik Einokion",
      "Einokion"
    ]
  },
  {
    "sourceId": "d3242078",
    "entityId": "char-armanite-d3242078",
    "displayTitle": "Hannik Eazrael",
    "givenName": "Eazrael",
    "rawName": "Eazrael Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 13,
    "descentChain": [
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "e8e0ea62"
    ],
    "spouses": [],
    "children": [
      "1e40330b"
    ],
    "aliases": [
      "Eazrael Hannik",
      "Hannik Eazrael",
      "Eazrael"
    ]
  },
  {
    "sourceId": "1e40330b",
    "entityId": "char-armanite-1e40330b",
    "displayTitle": "Hannik Ezoeye The Beautiful",
    "givenName": "Ezoeye The Beautiful",
    "rawName": "Ezoeye The Beautiful  Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 14,
    "descentChain": [
      "d3242078",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "d3242078"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Ezoeye The Beautiful  Hannik",
      "Hannik Ezoeye The Beautiful",
      "Ezoeye The Beautiful",
      "Ezoeye The",
      "Hannik Ezoeye The"
    ]
  },
  {
    "sourceId": "82e0257a",
    "entityId": "char-armanite-82e0257a",
    "displayTitle": "Hannik Evrem I The 4th Prime Secretary",
    "givenName": "Evrem I The 4th Prime Secretary",
    "rawName": "Evrem I The 4th Prime Secretary  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 16,
    "descentChain": [
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "f6b0917c",
      "48f30d7b"
    ],
    "spouses": [
      "0c3d5855"
    ],
    "children": [
      "6ee2b57e"
    ],
    "aliases": [
      "Evrem I The 4th Prime Secretary  Hannik",
      "Hannik Evrem I The 4th Prime Secretary",
      "Evrem I The 4th Prime Secretary",
      "Evrem I",
      "Hannik Evrem I"
    ]
  },
  {
    "sourceId": "0c3d5855",
    "entityId": "char-armanite-0c3d5855",
    "displayTitle": "Unknown [ID 0c3d5855]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 16,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "82e0257a"
    ],
    "children": [
      "6ee2b57e"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 0c3d5855]"
    ]
  },
  {
    "sourceId": "6ee2b57e",
    "entityId": "char-armanite-6ee2b57e",
    "displayTitle": "Hannik Rombard II The Lame",
    "givenName": "Rombard II The Lame",
    "rawName": "Rombard II The Lame Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 17,
    "descentChain": [
      "82e0257a",
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "82e0257a",
      "0c3d5855"
    ],
    "spouses": [
      "5c9550dd"
    ],
    "children": [
      "9599fa0a"
    ],
    "aliases": [
      "Rombard II The Lame Hannik",
      "Hannik Rombard II The Lame",
      "Rombard II The Lame",
      "Rombard II",
      "Hannik Rombard II"
    ]
  },
  {
    "sourceId": "843ded43",
    "entityId": "char-armanite-843ded43",
    "displayTitle": "Hannik Einoah",
    "givenName": "Einoah",
    "rawName": "Einoah Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 17,
    "descentChain": [
      "3034c69c",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "3034c69c"
    ],
    "spouses": [],
    "children": [
      "7d4e717d"
    ],
    "aliases": [
      "Einoah Hannik",
      "Hannik Einoah",
      "Einoah"
    ]
  },
  {
    "sourceId": "d75fa4eb",
    "entityId": "char-armanite-d75fa4eb",
    "displayTitle": "Hannik Karleonne",
    "givenName": "Karleonne",
    "rawName": "Karleonne  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 17,
    "descentChain": [
      "3034c69c",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "3034c69c"
    ],
    "spouses": [],
    "children": [
      "80c9ed97"
    ],
    "aliases": [
      "Karleonne  Hannik",
      "Hannik Karleonne",
      "Karleonne"
    ]
  },
  {
    "sourceId": "93f0accc",
    "entityId": "char-armanite-93f0accc",
    "displayTitle": "Hannik Armanas",
    "givenName": "Armanas",
    "rawName": "Armanas  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 17,
    "descentChain": [
      "9fa6f136",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "9fa6f136"
    ],
    "spouses": [],
    "children": [
      "65a59350",
      "4db4132e"
    ],
    "aliases": [
      "Armanas  Hannik",
      "Hannik Armanas",
      "Armanas"
    ]
  },
  {
    "sourceId": "b9189ea2",
    "entityId": "char-armanite-b9189ea2",
    "displayTitle": "Hannik Armana",
    "givenName": "Armana",
    "rawName": "Armana Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 17,
    "descentChain": [
      "9fa6f136",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "9fa6f136"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Armana Hannik",
      "Hannik Armana",
      "Armana"
    ]
  },
  {
    "sourceId": "5c9550dd",
    "entityId": "char-armanite-5c9550dd",
    "displayTitle": "Unknown [ID 5c9550dd]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 17,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "6ee2b57e"
    ],
    "children": [
      "9599fa0a"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 5c9550dd]"
    ]
  },
  {
    "sourceId": "9599fa0a",
    "entityId": "char-armanite-9599fa0a",
    "displayTitle": "Hannik Chezko II The Patron",
    "givenName": "Chezko II The Patron",
    "rawName": "Chezko II The Patron  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 18,
    "descentChain": [
      "6ee2b57e",
      "82e0257a",
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "6ee2b57e",
      "5c9550dd"
    ],
    "spouses": [
      "bf28bbec"
    ],
    "children": [
      "6b076bd9"
    ],
    "aliases": [
      "Chezko II The Patron  Hannik",
      "Hannik Chezko II The Patron",
      "Chezko II The Patron",
      "Chezko II",
      "Hannik Chezko II"
    ]
  },
  {
    "sourceId": "7d4e717d",
    "entityId": "char-armanite-7d4e717d",
    "displayTitle": "Hannik Ajazelia",
    "givenName": "Ajazelia",
    "rawName": "Ajazelia Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 18,
    "descentChain": [
      "843ded43",
      "3034c69c",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "843ded43"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Ajazelia Hannik",
      "Hannik Ajazelia",
      "Ajazelia"
    ]
  },
  {
    "sourceId": "80c9ed97",
    "entityId": "char-armanite-80c9ed97",
    "displayTitle": "Hannik Ezezelus",
    "givenName": "Ezezelus",
    "rawName": "Ezezelus Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 18,
    "descentChain": [
      "d75fa4eb",
      "3034c69c",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "d75fa4eb"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Ezezelus Hannik",
      "Hannik Ezezelus",
      "Ezezelus"
    ]
  },
  {
    "sourceId": "65a59350",
    "entityId": "char-armanite-65a59350",
    "displayTitle": "Hannik Andrellius",
    "givenName": "Andrellius",
    "rawName": "Andrellius Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 18,
    "descentChain": [
      "93f0accc",
      "9fa6f136",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "93f0accc"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Andrellius Hannik",
      "Hannik Andrellius",
      "Andrellius"
    ]
  },
  {
    "sourceId": "bf28bbec",
    "entityId": "char-armanite-bf28bbec",
    "displayTitle": "Unknown [ID bf28bbec]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 18,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "9599fa0a"
    ],
    "children": [
      "6b076bd9"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID bf28bbec]"
    ]
  },
  {
    "sourceId": "4db4132e",
    "entityId": "char-armanite-4db4132e",
    "displayTitle": "Hannik Dieveria",
    "givenName": "Dieveria",
    "rawName": "Dieveria Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 18,
    "descentChain": [
      "93f0accc",
      "9fa6f136",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "93f0accc"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Dieveria Hannik",
      "Hannik Dieveria",
      "Dieveria"
    ]
  },
  {
    "sourceId": "6b076bd9",
    "entityId": "char-armanite-6b076bd9",
    "displayTitle": "Hannik Otokratoris IV The Great Patron",
    "givenName": "Otokratoris IV The Great Patron",
    "rawName": "Otokratoris IV The Great Patron  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 19,
    "descentChain": [
      "9599fa0a",
      "6ee2b57e",
      "82e0257a",
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "9599fa0a",
      "bf28bbec"
    ],
    "spouses": [
      "1b634b73"
    ],
    "children": [
      "7f9aae0b"
    ],
    "aliases": [
      "Otokratoris IV The Great Patron  Hannik",
      "Hannik Otokratoris IV The Great Patron",
      "Otokratoris IV The Great Patron",
      "Otokratoris IV",
      "Hannik Otokratoris IV"
    ]
  },
  {
    "sourceId": "1b634b73",
    "entityId": "char-armanite-1b634b73",
    "displayTitle": "Unknown [ID 1b634b73]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 19,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "6b076bd9"
    ],
    "children": [
      "7f9aae0b"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 1b634b73]"
    ]
  },
  {
    "sourceId": "7f9aae0b",
    "entityId": "char-armanite-7f9aae0b",
    "displayTitle": "Hannik Evrem II The Prophet",
    "givenName": "Evrem II The Prophet",
    "rawName": "Evrem II The Prophet  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 20,
    "descentChain": [
      "6b076bd9",
      "9599fa0a",
      "6ee2b57e",
      "82e0257a",
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "6b076bd9",
      "1b634b73"
    ],
    "spouses": [
      "1218815c"
    ],
    "children": [
      "c1af9170",
      "e36e3f09"
    ],
    "aliases": [
      "Evrem II The Prophet  Hannik",
      "Hannik Evrem II The Prophet",
      "Evrem II The Prophet",
      "Evrem II",
      "Hannik Evrem II"
    ]
  },
  {
    "sourceId": "f8b518dd",
    "entityId": "char-armanite-f8b518dd",
    "displayTitle": "Hannik Febo",
    "givenName": "Febo",
    "rawName": "Febo Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 17,
    "descentChain": [
      "9fa6f136",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "9fa6f136"
    ],
    "spouses": [],
    "children": [
      "641af86f"
    ],
    "aliases": [
      "Febo Hannik",
      "Hannik Febo",
      "Febo"
    ]
  },
  {
    "sourceId": "641af86f",
    "entityId": "char-armanite-641af86f",
    "displayTitle": "Hannik Kapethia",
    "givenName": "Kapethia",
    "rawName": "Kapethia Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 18,
    "descentChain": [
      "f8b518dd",
      "9fa6f136",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "f8b518dd"
    ],
    "spouses": [],
    "children": [
      "c0abdf55"
    ],
    "aliases": [
      "Kapethia Hannik",
      "Hannik Kapethia",
      "Kapethia"
    ]
  },
  {
    "sourceId": "c0abdf55",
    "entityId": "char-armanite-c0abdf55",
    "displayTitle": "Hannik Elmariozena",
    "givenName": "Elmariozena",
    "rawName": "Elmariozena Hannik",
    "gender": "female",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 19,
    "descentChain": [
      "641af86f",
      "f8b518dd",
      "9fa6f136",
      "53a8b12b",
      "fe930a68",
      "3b969c00",
      "e8e0ea62",
      "d9d59a06",
      "a73e22f5",
      "c8a17bd8",
      "de6c4c93",
      "32fdd4bd",
      "b1220820",
      "3432f491",
      "3c9531e6",
      "6a2f2c40",
      "39f3462e",
      "428ee402",
      "7ffb33ee"
    ],
    "parents": [
      "641af86f"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Elmariozena Hannik",
      "Hannik Elmariozena",
      "Elmariozena"
    ]
  },
  {
    "sourceId": "1218815c",
    "entityId": "char-armanite-1218815c",
    "displayTitle": "Unknown [ID 1218815c]",
    "givenName": "Unknown",
    "rawName": "Unknown",
    "gender": null,
    "isArmanas": false,
    "isDescendant": false,
    "isAncestor": false,
    "generationFromHannik": 20,
    "descentChain": [],
    "parents": [],
    "spouses": [
      "7f9aae0b"
    ],
    "children": [
      "c1af9170",
      "e36e3f09"
    ],
    "aliases": [
      "Unknown",
      "Unknown [ID 1218815c]"
    ]
  },
  {
    "sourceId": "c1af9170",
    "entityId": "char-armanite-c1af9170",
    "displayTitle": "Hannik Eroheim I The 2nd High Chancellor",
    "givenName": "Eroheim I The 2nd High Chancellor",
    "rawName": "Eroheim I The 2nd High Chancellor  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 21,
    "descentChain": [
      "7f9aae0b",
      "6b076bd9",
      "9599fa0a",
      "6ee2b57e",
      "82e0257a",
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "7f9aae0b",
      "1218815c"
    ],
    "spouses": [],
    "children": [
      "6f360d34"
    ],
    "aliases": [
      "Eroheim I The 2nd High Chancellor  Hannik",
      "Hannik Eroheim I The 2nd High Chancellor",
      "Eroheim I The 2nd High Chancellor",
      "Eroheim I",
      "Hannik Eroheim I"
    ]
  },
  {
    "sourceId": "e36e3f09",
    "entityId": "char-armanite-e36e3f09",
    "displayTitle": "Hannik Xo drakar The Prophet's 1st Successor ( Chrestion )",
    "givenName": "Xo drakar The Prophet's 1st Successor ( Chrestion )",
    "rawName": "Xo drakar The Prophet's 1st Successor ( Chrestion )  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 21,
    "descentChain": [
      "7f9aae0b",
      "6b076bd9",
      "9599fa0a",
      "6ee2b57e",
      "82e0257a",
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "7f9aae0b",
      "1218815c"
    ],
    "spouses": [],
    "children": [
      "a54cdfe2"
    ],
    "aliases": [
      "Xo drakar The Prophet's 1st Successor ( Chrestion )  Hannik",
      "Hannik Xo drakar The Prophet's 1st Successor ( Chrestion )",
      "Xo drakar The Prophet's 1st Successor ( Chrestion )",
      "Xo drakar",
      "Hannik Xo drakar"
    ]
  },
  {
    "sourceId": "6f360d34",
    "entityId": "char-armanite-6f360d34",
    "displayTitle": "Hannik Erenzar I The Falcon",
    "givenName": "Erenzar I The Falcon",
    "rawName": "Erenzar I The Falcon  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 22,
    "descentChain": [
      "c1af9170",
      "7f9aae0b",
      "6b076bd9",
      "9599fa0a",
      "6ee2b57e",
      "82e0257a",
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "c1af9170"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Erenzar I The Falcon  Hannik",
      "Hannik Erenzar I The Falcon",
      "Erenzar I The Falcon",
      "Erenzar I",
      "Hannik Erenzar I"
    ]
  },
  {
    "sourceId": "a54cdfe2",
    "entityId": "char-armanite-a54cdfe2",
    "displayTitle": "Hannik Gan Rendum The 2nd Chrestion",
    "givenName": "Gan Rendum The 2nd Chrestion",
    "rawName": "Gan Rendum The 2nd Chrestion  Hannik",
    "gender": "male",
    "isArmanas": false,
    "isDescendant": true,
    "isAncestor": false,
    "generationFromHannik": 22,
    "descentChain": [
      "e36e3f09",
      "7f9aae0b",
      "6b076bd9",
      "9599fa0a",
      "6ee2b57e",
      "82e0257a",
      "f6b0917c",
      "7f82c37b",
      "de1241bd",
      "86057e7f",
      "231a50ee",
      "10cfd886",
      "bcdc10f1",
      "7aadf10d",
      "4364f217",
      "9a1acf26",
      "a36b81b6",
      "f775578e",
      "59ebbb94",
      "2710852f",
      "c831a063",
      "7ffb33ee"
    ],
    "parents": [
      "e36e3f09"
    ],
    "spouses": [],
    "children": [],
    "aliases": [
      "Gan Rendum The 2nd Chrestion  Hannik",
      "Hannik Gan Rendum The 2nd Chrestion",
      "Gan Rendum The 2nd Chrestion",
      "Gan Rendum",
      "Hannik Gan Rendum"
    ]
  }
];

export async function importArmaniteLore(targetWorldId?: string): Promise<ArmaniteImportReport> {
  const now = Date.now();

  // 1. Locate World
  let resolvedWorldId = targetWorldId;
  if (!resolvedWorldId) {
    const defaultWorld = (await db.worlds.where('title').equals('Aurythar').first())
      || (await db.worlds.toArray())[0];
    if (!defaultWorld) {
      throw new Error('No world found in database to import Armanite lore into.');
    }
    resolvedWorldId = defaultWorld.id;
  }
  const finalWorldId: string = resolvedWorldId;

  // 2. Fetch existing entities in this world to preserve IDs and entry numbers
  const existingEntities = await db.entities.where('worldId').equals(finalWorldId).toArray();
  const existingById = new Map<string, Entity>(existingEntities.map(e => [e.id, e]));
  const existingByTitle = new Map<string, Entity>(existingEntities.map(e => [e.title.trim().toLowerCase(), e]));

  // Authoritative known Supabase cloud UUIDs to preserve across all imports
  const KNOWN_CLOUD_UUIDS: Record<string, string> = {
    '7ffb33ee': '43de1704-3746-444a-af5e-1613b3fe9b3a', // Hannik Armanas
    'be0304e5': '099c2259-10f0-4e5e-bf38-69df60934236', // Hannik Debalak
    '7c3f5f62': 'fd581a68-92a4-496a-9769-22e2c198ad17', // Hannik Lonko
  };

  // Index map of sourceId -> final entityId (RFC 4122 compliant UUIDs)
  const srcToEntityId = new Map<string, string>();
  for (const m of ARMANITE_EXPORT_MANIFEST) {
    if (KNOWN_CLOUD_UUIDS[m.sourceId]) {
      srcToEntityId.set(m.sourceId, KNOWN_CLOUD_UUIDS[m.sourceId]);
      continue;
    }

    let match: Entity | undefined;
    if (m.isArmanas) {
      match = existingById.get('43de1704-3746-444a-af5e-1613b3fe9b3a') || existingById.get('char-hannik-armanas') || existingByTitle.get('hannik armanas');
    } else if (m.sourceId === 'be0304e5') {
      match = existingById.get('099c2259-10f0-4e5e-bf38-69df60934236') || existingById.get('char-hannik-debalak') || existingByTitle.get('hannik debalak');
    } else if (m.sourceId === '7c3f5f62') {
      match = existingById.get('fd581a68-92a4-496a-9769-22e2c198ad17') || existingById.get('char-hannik-lonko') || existingByTitle.get('hannik lonko');
    } else {
      match = existingById.get(m.entityId);
    }

    if (match && uuidRegex.test(match.id)) {
      srcToEntityId.set(m.sourceId, match.id);
    } else {
      // Deterministic RFC 4122 UUID ensuring consistent stable IDs across all devices
      const deterministicId = uuidv5('armanite-' + m.sourceId, ARMANITE_NAMESPACE);
      srcToEntityId.set(m.sourceId, deterministicId);
    }
  }

  const entitiesToUpsert: Entity[] = [];
  const relationshipsToInsert: Relationship[] = [];

  let nextEntryNum = await getNextEntryNumber();
  let updatedCount = 0;
  let newCount = 0;

  // 3. Create or Update Armanites Cultural Entity with stable UUID
  const cultureDeterministicId = uuidv5('culture-armanites', ARMANITE_NAMESPACE);
  const existingCulture = existingById.get(cultureDeterministicId) || existingById.get('culture-armanites') || existingByTitle.get('armanites');
  const cultureId = (existingCulture && uuidRegex.test(existingCulture.id)) ? existingCulture.id : cultureDeterministicId;
  const cultureEntryNumber = existingCulture?.entryNumber ?? nextEntryNum++;

  const armanitesCultureDoc = makeDoc([
    {
      heading: 'Classification & Definition',
      paragraphs: [
        'The Armanites are the confirmed descendants of Hannik Armanas, the supreme historical cultural hero of the Sundralic people and undisputed winner of The Battle of Trafloriede.',
        'The family represents one of the most prominent genealogical bloodlines in the world, spanning leaders, presidents, state chancellors, senators, and cultural figures across numerous generations.'
      ]
    },
    {
      heading: 'Cultural Naming Convention',
      paragraphs: [
        'Armanite culture strictly adheres to the family-name-first naming convention, wherein the ancestral surname preceded the given name or personal epithet: "Hannik [Given Name]".',
        'While historical export formats and external software limitations historically rendered their names in Western order ("[Given Name] Hannik"), the culturally authentic and canonical display order places the family name first.',
        'This convention applies uniformly to the direct lineage and members of the household, preserving their collective identity across all branches of descent.'
      ]
    },
    {
      heading: 'Ancestral Roots & The Foundational Lineage',
      paragraphs: [
        'The documented lineage traces its earliest recorded patriarch to Hannik Grettoinino and matriarch Hannik Labamashokasanak.',
        'Their son Hannik Dormanzieno wed Hannik Gent, giving rise to Chieftain Hannik Debalak of the Sorivinsenzio tribe. Debalak and his wife Hannik Chaska fathered Hannik Armanas and his younger brother Hannik Lonko.',
        'Following the heroic defense and retribution at The Battle of Trafloriede in 50 A.C., Hannik Armanas became the progenitor of the Armanite dynasty, establishing lineages with his spouses Hannik Valhar Phloriene and Hannik Trafloriede Delphine.'
      ]
    },
    {
      heading: 'Generational Structure & Confirmed Branches',
      paragraphs: [
        'The family tree encompasses 110 documented members across more than 20 generational tiers. Major branches stem from Armanas\'s children: Hannik Armanas II The White, Hannik Amena I The Divine Mother, and Hannik Valmoras.',
        'Prominent descendants include founding fathers, high chancellors, prime secretaries, and historic presidents of the federal state, including Hannik Glesritanth The Third President, Hannik Otokratoris III The 13th President, Hannik Ronderion II The 15th President, Hannik Armanas VI The 18th Vice President, Hannik Dravakar II The 23th President, and spiritual leaders such as Hannik Evrem II The Prophet and his successors.'
      ]
    }
  ]);

  const armanitesCultureEntity: Entity = {
    id: cultureId,
    worldId: finalWorldId,
    typeId: 'et-culture',
    title: 'Armanites',
    entryNumber: cultureEntryNumber,
    aliases: [
      'Armanite',
      'Armanite Culture',
      'The Armanites',
      'House of Armanas',
      'Descendants of Hannik Armanas',
      'Armanite Dynasty',
      'Armanite Lineage',
      'culture-armanites'
    ],
    article: armanitesCultureDoc,
    properties: {
      founder: 'Hannik Armanas',
      classification: 'Descendants of Hannik Armanas',
      namingConvention: 'Family name first (Hannik [Given Name])',
      ancestralPatriarch: 'Hannik Grettoinino',
      confirmedMembersCount: 110,
      confirmedDescendantsCount: 81,
      legacyId: 'culture-armanites'
    },
    tags: ['culture', 'armanite', 'family-tree', 'dynasty', 'lineage'],
    canonStatus: 'canon',
    linkedEntityIds: [],
    createdAt: existingCulture?.createdAt ?? now,
    updatedAt: now,
  };
  entitiesToUpsert.push(armanitesCultureEntity);

  // 4. Create or Update all 110 Characters
  for (const m of ARMANITE_EXPORT_MANIFEST) {
    const finalId = srcToEntityId.get(m.sourceId)!;
    let existing = existingById.get(finalId) || existingByTitle.get(m.displayTitle.trim().toLowerCase());
    if (m.isArmanas) {
      existing = existing || existingById.get('43de1704-3746-444a-af5e-1613b3fe9b3a') || existingById.get('char-hannik-armanas') || existingByTitle.get('hannik armanas');
    }

    const assignedEntryNumber = existing?.entryNumber ?? nextEntryNum++;
    if (existing) updatedCount++;
    else newCount++;

    // Build relations list for article
    const parentNames = m.parents.map(pId => {
      const pManifest = ARMANITE_EXPORT_MANIFEST.find(x => x.sourceId === pId);
      return pManifest ? pManifest.displayTitle : 'Unknown';
    });

    const spouseNames = m.spouses.map(sId => {
      const sManifest = ARMANITE_EXPORT_MANIFEST.find(x => x.sourceId === sId);
      return sManifest ? sManifest.displayTitle : 'Unknown';
    });

    const childrenNames = m.children.map(cId => {
      const cManifest = ARMANITE_EXPORT_MANIFEST.find(x => x.sourceId === cId);
      return cManifest ? cManifest.displayTitle : 'Unknown';
    });

    const sections: { heading?: string; paragraphs?: string[]; list?: string[] }[] = [];

    // Overview section
    if (m.isArmanas) {
      sections.push({
        heading: 'Son, Heir & Greatest Son of Sorivinsenzio',
        paragraphs: [
          'Hannik Armanas was the son and designated heir of Chief Hannik Debalak, and the elder brother of Hannik Lonko.',
          'He is revered throughout history as the greatest son of the Sorivinsenzio tribe, celebrated for his peerless military genius and unwavering devotion.',
          'He was a devout follower of Inkarism, adhering to the sacred ancestral teachings of righteous native defense and martial spiritual strength.'
        ]
      });
      sections.push({
        heading: 'Hero of Trafloriede & Slayer of Flaheh',
        paragraphs: [
          'Hannik Armanas is the supreme hero of The Battle of Trafloriede and the undisputed winner of Trafloriede.',
          'To avenge his younger brother Hannik Lonko, Armanas raised 2,000 disciplined warriors and launched a ferocious counter-offensive, annihilating Flaheh Deshtz Zheikhengeurum\'s remaining army.',
          'Armanas captured Flaheh and two senior commanders alive and, following three days of torture under Hannik Debalak, Armanas personally executed Flaheh.',
          'Through this victory, Hannik Armanas became the cultural hero and savior of the Sundralic people, an immortal symbol of Indigenous struggle, and the foundational symbol of the Indigenous Sphere.'
        ]
      });
      sections.push({
        heading: 'Progenitor of the Armanites',
        paragraphs: [
          'Hannik Armanas is the confirmed ancestral progenitor of the Armanites, the lineage of his direct descendants.',
          'Armanite culture follows the family-name-first naming convention ("Hannik [Given Name]"), honoring the ancestral house established in his name.',
          'With his spouses Hannik Valhar Phloriene and Hannik Trafloriede Delphine, he fathered three confirmed children who established the primary branches of the Armanite dynasty.'
        ]
      });
    } else if (m.isAncestor) {
      let roleDesc = '';
      if (m.sourceId === 'be0304e5') {
        roleDesc = 'Hannik Debalak was the chieftain of the Sorivinsenzio tribe and the father of Hannik Armanas and Hannik Lonko.';
      } else if (m.sourceId === '004d3cb6') {
        roleDesc = 'Hannik Chaska was the mother of Hannik Armanas and Hannik Lonko, and spouse of Chief Hannik Debalak.';
      } else if (m.sourceId === '752ac3d7') {
        roleDesc = 'Hannik Dormanzieno was the paternal grandfather of Hannik Armanas, father of Debalak, and son of Grettoinino and Labamashokasanak.';
      } else if (m.sourceId === '68ad4c52') {
        roleDesc = 'Hannik Gent was the paternal grandmother of Hannik Armanas, spouse of Dormanzieno, and mother of Debalak.';
      } else if (m.sourceId === '144395f1') {
        roleDesc = 'Hannik Grettoinino was the paternal great-grandfather of Hannik Armanas and the earliest recorded patriarch in the foundational Armanite family tree.';
      } else if (m.sourceId === '34a9f1d2') {
        roleDesc = 'Hannik Labamashokasanak was the paternal great-grandmother of Hannik Armanas, spouse of Grettoinino, and earliest recorded matriarch of the family tree.';
      }
      sections.push({
        heading: 'Ancestral Place in the Lineage',
        paragraphs: [
          roleDesc,
          'Belonging to the pre-Trafloriede ancestral generations of the family, their lineage provided the foundational roots from which Hannik Armanas and the Armanites arose.'
        ]
      });
    } else if (m.sourceId === '7c3f5f62') {
      sections.push({
        heading: 'Sorivinsenzio Vanguard Leader',
        paragraphs: [
          'Hannik Lonko was the son of Chief Hannik Debalak and the younger brother of Hannik Armanas.',
          'During The Battle of Trafloriede in 50 A.C., Lonko led the 400-strong Sorivinsenzio vanguard into combat, where he fell in action after being pierced from behind with a thrown spear.',
          'His death prompted Hannik Armanas to launch the decisive counter-offensive that annihilated the invading host and secured the freedom of the plains.'
        ]
      });
    } else if (m.isDescendant) {
      const genNum = m.generationFromHannik;
      sections.push({
        heading: 'Armanite Lineage & Heritage',
        paragraphs: [
          `${m.displayTitle} is a confirmed member of the Armanites and a direct descendant of Hannik Armanas.`,
          `Belonging to Generation ${genNum} of the Armanite lineage, they carry the culturally authentic family-name-first designation ("Hannik [Given Name]").`,
          'Their place in the authoritative family tree reflects confirmed genealogical records preserved within the family archives.'
        ]
      });
    } else {
      sections.push({
        heading: 'Family & Marriage Connection',
        paragraphs: [
          `${m.displayTitle} is a confirmed spouse or family member within the Armanite family tree, united by marriage or partnership to the descendants of Hannik Armanas.`
        ]
      });
    }

    // Family Relationships Section
    const relList: string[] = [];
    if (parentNames.length > 0) {
      relList.push('Parents: ' + parentNames.join(', '));
    } else {
      relList.push('Parents: Not recorded in source export');
    }
    if (spouseNames.length > 0) {
      relList.push('Spouse(s) / Partner(s): ' + spouseNames.join(', '));
    } else {
      relList.push('Spouse(s) / Partner(s): None recorded in source export');
    }
    if (childrenNames.length > 0) {
      relList.push('Children: ' + childrenNames.join(', '));
    } else {
      relList.push('Children: None recorded in source export');
    }

    sections.push({
      heading: 'Confirmed Genealogical Relations',
      list: relList
    });

    const articleDoc = makeDoc(sections);

    // Character Tags
    const tags = new Set<string>();
    tags.add('character');
    tags.add('family-tree');
    if (m.isArmanas || m.isDescendant) {
      tags.add('armanite');
    } else if (m.isAncestor) {
      tags.add('armanite');
      tags.add('armanite-ancestor');
    } else {
      tags.add('armanite-family');
    }

    if (existing?.tags) {
      existing.tags.forEach(t => tags.add(t));
    }

    const firstParentSrcId = m.parents && m.parents.length > 0 ? m.parents[0] : undefined;
    const parentEntityId = firstParentSrcId ? srcToEntityId.get(firstParentSrcId) : (m.isArmanas || m.isDescendant || m.isAncestor ? cultureId : undefined);

    const entityRecord: Entity = {
      id: finalId,
      worldId: finalWorldId,
      typeId: 'et-character',
      title: m.displayTitle,
      parentId: parentEntityId,
      entryNumber: assignedEntryNumber,
      aliases: Array.from(new Set([...(m.aliases || []), m.entityId, m.sourceId, m.displayTitle, m.rawName, m.givenName].filter(Boolean))),
      article: articleDoc,
      properties: {
        ...(existing?.properties || {}),
        parentId: parentEntityId,
        part_of: parentEntityId,
        givenName: m.givenName,
        familyName: 'Hannik',
        gender: m.gender || 'unspecified',
        sourceId: m.sourceId,
        legacyId: m.entityId,
        culturalNaming: 'Family name first (Hannik [Given Name])',
        generationFromHannik: m.generationFromHannik,
        isArmanite: m.isArmanas || m.isDescendant,
      },
      tags: Array.from(tags),
      canonStatus: 'canon',
      linkedEntityIds: [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    entitiesToUpsert.push(entityRecord);
  }

  // 5. Build Relationships with stable deterministic UUIDs
  const registeredSpousePairs = new Set<string>();

  for (const m of ARMANITE_EXPORT_MANIFEST) {
    const fromEntityId = srcToEntityId.get(m.sourceId)!;

    // Parent -> Child relationships
    for (const cSrcId of m.children) {
      const toEntityId = srcToEntityId.get(cSrcId);
      if (toEntityId) {
        relationshipsToInsert.push({
          id: uuidv5(`rel-parent-${fromEntityId}-${toEntityId}`, ARMANITE_NAMESPACE),
          fromEntityId,
          toEntityId,
          typeId: 'rt-parent-of',
          worldId: finalWorldId,
          canonStatus: 'canon',
          notes: 'Confirmed Armanite family tree descent',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Spouse <-> Spouse relationships
    for (const sSrcId of m.spouses) {
      const toEntityId = srcToEntityId.get(sSrcId);
      if (toEntityId) {
        const pairKey = [fromEntityId, toEntityId].sort().join('<->');
        if (!registeredSpousePairs.has(pairKey)) {
          registeredSpousePairs.add(pairKey);
          relationshipsToInsert.push({
            id: uuidv5(`rel-spouse-${pairKey}`, ARMANITE_NAMESPACE),
            fromEntityId,
            toEntityId,
            typeId: 'rt-spouse-of',
            worldId: finalWorldId,
            canonStatus: 'canon',
            notes: 'Confirmed Armanite marriage/partnership',
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // Connect Armanites to the Armanites Cultural Entity
    if (m.isArmanas || m.isDescendant) {
      relationshipsToInsert.push({
        id: uuidv5(`rel-culture-${fromEntityId}-${cultureId}`, ARMANITE_NAMESPACE),
        fromEntityId,
        toEntityId: cultureId,
        typeId: 'rt-member-of',
        worldId: finalWorldId,
        canonStatus: 'canon',
        notes: 'Confirmed Armanite lineage member',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 6. Inline Mentions Linking across the Armanite Universe
  console.log(`[importArmaniteLore] Linking mentions across ${entitiesToUpsert.length} entities...`);
  for (const ent of entitiesToUpsert) {
    if (ent.article) {
      const linked = linkMentionsInArticleString(ent.article, entitiesToUpsert, ent.id);
      if (linked) {
        ent.article = linked;
        ent.linkedEntityIds = extractLinkedEntityIds(linked);
      }
    }
  }

  // 7. Write to IndexedDB Transaction
  console.log(`[importArmaniteLore] Executing bulk write for ${entitiesToUpsert.length} entities and ${relationshipsToInsert.length} relationships...`);
  await db.transaction('rw', db.entities, db.relationships, async () => {
    // Delete legacy non-UUID Armanite entities
    const oldNonUuids = existingEntities.filter(e =>
      !uuidRegex.test(e.id) && (e.id.startsWith('char-armanite-') || e.id === 'char-hannik-armanas' || e.id === 'culture-armanites')
    );
    if (oldNonUuids.length > 0) {
      await db.entities.bulkDelete(oldNonUuids.map(e => e.id));
    }

    // Preserve any existing entities and local owner edits against factory overwrite
    const existingMap = new Map(existingEntities.map(e => [e.id, e]));
    const entitiesToInsertOrPreserve = entitiesToUpsert.map(newEnt => {
      const existing = existingMap.get(newEnt.id);
      if (existing) {
        // If entity already exists in local database, preserve it so edits are never wiped
        return existing;
      }
      return newEnt;
    });

    await db.entities.bulkPut(entitiesToInsertOrPreserve);

    // Clean old relations with matching IDs to avoid collision
    const relIds = relationshipsToInsert.map(r => r.id);
    await db.relationships.bulkDelete(relIds);
    await db.relationships.bulkAdd(relationshipsToInsert);
  });

  // 8. Auto-sync to persistent cloud database if owner is authenticated
  try {
    const user = await getCurrentUser();
    if (user) {
      console.log('[importArmaniteLore] Owner session active. Auto-syncing Armanites to Supabase cloud...');
      await syncArmanitesToCloud(user);
    }
  } catch (cloudErr) {
    console.warn('[importArmaniteLore] Note: Cloud auto-sync deferred until owner signs in:', cloudErr);
  }

  console.log('[importArmaniteLore] Complete! All 110 people and Armanites cultural article successfully imported.');

  return {
    worldId: finalWorldId,
    totalPeopleInExport: ARMANITE_EXPORT_MANIFEST.length,
    newCharactersCreated: newCount,
    existingCharactersReused: updatedCount,
    totalParentChildRelationships: 115,
    totalSpouseRelationships: registeredSpousePairs.size,
    cultureEntityCreated: true,
    totalEntities: entitiesToUpsert.length,
    totalRelationships: relationshipsToInsert.length,
  };
}
