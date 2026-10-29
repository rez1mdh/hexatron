// src/services/welcomeGuideService.ts
// Service for managing the Welcome & Visitor Guide page content
// Backed by IndexedDB (Dexie) entities table and mirrored in localStorage for instant access

import { db, type Entity } from '../db/schema';
import { isCloudConfigured, getSupabaseClient } from './supabase';

export interface VideoMediaItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface FeaturedArticleItem {
  entityId: string;
  title: string;
  subtitle?: string;
  badge?: string;
  typeId?: string;
}

export interface WelcomeGuideContent {
  projectTitle: string;
  projectSubtitle: string;
  heroIntro: string;
  bannerImageUrl?: string;
  aboutCreator: {
    creatorName: string;
    creatorRole: string;
    bio: string;
    purpose: string;
    inspiration: string;
    distinctiveElements: string;
    visitorWishes: string;
  };
  featuredArticles: FeaturedArticleItem[];
  videos: VideoMediaItem[];
  projectNotes?: string;
  acknowledgements?: string;
  updatedAt: number;
}

const STORAGE_KEY = 'hexatron_welcome_guide_content';
const ENTITY_ID = 'doc-welcome-guide';

const LEGACY_FEATURED_ID_MAP: Record<string, string> = {
  'char-hannik-armanas': '43de1704-3746-444a-af5e-1613b3fe9b3a',
  'event-trafloriede': '85437dcd-7d16-4887-9bd5-0f4045cd63ae',
  'culture-armanites': '389817ec-f400-5a07-b23a-031692fda563',
  'char-hannik-lonko': 'fd581a68-92a4-496a-9769-22e2c198ad17',
};

function normalizeFeaturedArticles(items: FeaturedArticleItem[]): FeaturedArticleItem[] {
  return items.map(item => ({
    ...item,
    entityId: LEGACY_FEATURED_ID_MAP[item.entityId] || item.entityId,
  }));
}

export function getDefaultWelcomeGuideContent(): WelcomeGuideContent {
  return {
    projectTitle: 'Aurythar',
    projectSubtitle: 'An Interconnected Worldbuilding Encyclopedia & Fan Lore Archive',
    heroIntro: 'Welcome to the official public encyclopedia and lore archive for the Universe of Aurythar. Explore interconnected articles, deep federal politics, ethnic histories, cultural dynastic trees, and multimedia records chronicling this fictional setting.',
    bannerImageUrl: '',
    aboutCreator: {
      creatorName: 'Creator & Archive Curator',
      creatorRole: 'Author & Worldbuilder',
      bio: 'Welcome! I am the creator and author of this worldbuilding project and fiction archive.',
      purpose: 'This encyclopedia was built to document, organize, and share the deep history, characters, civilizations, and interconnected lore of this setting in an immersive, Wikipedia-style format.',
      inspiration: 'Inspired by political histories, speculative sci-fi/fantasy worldbuilding, complex ethnic stratification, and interconnected genealogical archives.',
      distinctiveElements: 'Aurythar is defined by deep federal politics, colonizer vs native demographic tensions, ethnic stratification, and religious schisms centered around foundational events like The Battle of Trafloriede.',
      visitorWishes: 'I hope you enjoy exploring the interconnected articles, discovering historical figures, tracing genealogical trees, and immersing yourself in the lore.'
    },
    featuredArticles: [
      {
        entityId: '43de1704-3746-444a-af5e-1613b3fe9b3a',
        title: 'Hannik Armanas',
        subtitle: 'Cultural Hero of Sorivinsenzio & Ancestral Progenitor of the Armanites',
        badge: 'Historical Figure',
        typeId: 'et-character'
      },
      {
        entityId: '85437dcd-7d16-4887-9bd5-0f4045cd63ae',
        title: 'The Battle of Trafloriede',
        subtitle: 'Decisive 50 A.C. Native Victory and Clash of Plains',
        badge: 'Key Event',
        typeId: 'et-event'
      },
      {
        entityId: '389817ec-f400-5a07-b23a-031692fda563',
        title: 'Armanites',
        subtitle: 'Cultural Dynasty & Confirmed 110-Member Kinship Lineage',
        badge: 'Culture & Dynasty',
        typeId: 'et-culture'
      },
      {
        entityId: 'fd581a68-92a4-496a-9769-22e2c198ad17',
        title: 'Hannik Lonko',
        subtitle: 'Sorivinsenzio Vanguard Leader at Trafloriede',
        badge: 'Commander',
        typeId: 'et-character'
      }
    ],
    videos: [],
    projectNotes: 'This archive is actively curated and continually expanding as new historical chronicles, articles, and genealogical records are published.',
    acknowledgements: 'Special thanks to all readers, visitors, and supporters exploring this universe.',
    updatedAt: Date.now()
  };
}

export async function getWelcomeGuideContent(): Promise<WelcomeGuideContent> {
  const defaults = getDefaultWelcomeGuideContent();

  // 1. Try local cache first for instant synchronous render
  let cached: WelcomeGuideContent | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[welcomeGuideService] Error parsing localStorage cache:', err);
  }

  // 2. Query IndexedDB entity record
  try {
    const ent = await db.entities.get(ENTITY_ID);
    if (ent && ent.properties && ent.properties.configJson) {
      const dbConfig = JSON.parse(ent.properties.configJson as string) as Partial<WelcomeGuideContent>;
      const merged: WelcomeGuideContent = {
        ...defaults,
        ...cached,
        ...dbConfig,
        aboutCreator: {
          ...defaults.aboutCreator,
          ...(cached?.aboutCreator || {}),
          ...(dbConfig.aboutCreator || {})
        },
        featuredArticles: normalizeFeaturedArticles(
          dbConfig.featuredArticles && dbConfig.featuredArticles.length > 0
            ? dbConfig.featuredArticles
            : (cached?.featuredArticles || defaults.featuredArticles)
        ),
        videos: dbConfig.videos !== undefined ? dbConfig.videos : (cached?.videos || defaults.videos),
        updatedAt: dbConfig.updatedAt || Date.now()
      };
      // Keep localStorage in sync
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('[welcomeGuideService] Error loading from IndexedDB:', err);
  }

  if (cached) {
    return {
      ...defaults,
      ...cached,
      aboutCreator: { ...defaults.aboutCreator, ...cached.aboutCreator }
    };
  }

  return defaults;
}

export async function saveWelcomeGuideContent(content: WelcomeGuideContent): Promise<void> {
  const now = Date.now();
  content.updatedAt = now;

  // 1. Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  } catch (e) {
    console.warn('[welcomeGuideService] LocalStorage save error:', e);
  }

  // 2. Persist to Dexie entities table
  try {
    const world = (await db.worlds.toArray())[0];
    const existing = await db.entities.get(ENTITY_ID);

    const entityRecord: Entity = {
      id: ENTITY_ID,
      worldId: world?.id || 'world-aurythar',
      typeId: 'et-concept',
      title: 'Welcome & Visitor Guide',
      aliases: ['Visitor Guide', 'About Aurythar'],
      linkedEntityIds: [],
      entryNumber: 0,
      canonStatus: 'canon',
      tags: ['guide', 'welcome', 'system'],
      properties: {
        isWelcomeGuide: true,
        configJson: JSON.stringify(content)
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    await db.entities.put(entityRecord);

    // 3. If Cloud is configured and client active, upsert to Supabase
    if (isCloudConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        client.from('hex_entities').upsert({
          id: entityRecord.id,
          world_id: entityRecord.worldId,
          type_id: entityRecord.typeId,
          title: entityRecord.title,
          entry_number: entityRecord.entryNumber,
          canon_status: entityRecord.canonStatus,
          tags: entityRecord.tags,
          properties: entityRecord.properties,
          created_at: new Date(entityRecord.createdAt).toISOString(),
          updated_at: new Date(entityRecord.updatedAt).toISOString()
        }, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.warn('[welcomeGuideService] Cloud upsert warning:', error.message);
        });
      }
    }
  } catch (err) {
    console.error('[welcomeGuideService] Failed to save guide content:', err);
    throw err;
  }
}

/**
 * Utility to parse various video URLs (YouTube, Vimeo, MP4) into safe embed details
 */
export function parseVideoUrl(url: string): {
  type: 'youtube' | 'vimeo' | 'direct' | 'external';
  embedUrl?: string;
  originalUrl: string;
} {
  const trimmed = (url || '').trim();
  if (!trimmed) return { type: 'external', originalUrl: '' };

  // YouTube match: watch?v=ID, youtu.be/ID, embed/ID, shorts/ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      originalUrl: trimmed
    };
  }

  // Vimeo match: vimeo.com/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      originalUrl: trimmed
    };
  }

  // Direct MP4 / WebM
  if (/\.(mp4|webm|ogg)($|\?)/i.test(trimmed)) {
    return {
      type: 'direct',
      embedUrl: trimmed,
      originalUrl: trimmed
    };
  }

  return {
    type: 'external',
    originalUrl: trimmed
  };
}
