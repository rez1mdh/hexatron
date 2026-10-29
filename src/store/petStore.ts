// src/store/petStore.ts
// Store for Oneko-style Companion Pets with multi-instance support and local storage persistence

import { create } from 'zustand';

export interface PetCharacter {
  id: string;
  name: string;
  subtitle: string;
  source: string;
  type: 'oneko-sprite' | 'svg-matrix';
  spriteUrl?: string;
  defaultScale: number;
}

export const PET_CHARACTERS: PetCharacter[] = [
  {
    id: 'oneko-classic',
    name: 'Classic Oneko',
    subtitle: 'The original 90s Neko cat mascot (adryd325/oneko.js)',
    source: 'adryd325/oneko.js (MIT License)',
    type: 'oneko-sprite',
    spriteUrl: '/pets/oneko-classic.gif',
    defaultScale: 1.0,
  },
  {
    id: 'oneko-dog',
    name: 'Shiba Dog',
    subtitle: 'Playful pixel Shiba Inu dog companion',
    source: 'spicetify-oneko ecosystem',
    type: 'oneko-sprite',
    spriteUrl: '/pets/oneko-dog.gif',
    defaultScale: 1.0,
  },
  {
    id: 'oneko-tora',
    name: 'Tora Cat',
    subtitle: 'Golden tiger-striped cat companion',
    source: 'spicetify-oneko ecosystem',
    type: 'oneko-sprite',
    spriteUrl: '/pets/oneko-tora.gif',
    defaultScale: 1.0,
  },
  {
    id: 'oneko-maia',
    name: 'Maia Calico',
    subtitle: 'Pastel tri-color calico kitten',
    source: 'spicetify-oneko ecosystem',
    type: 'oneko-sprite',
    spriteUrl: '/pets/oneko-maia.gif',
    defaultScale: 1.0,
  },
  {
    id: 'oneko-vaporwave',
    name: 'Vaporwave Cat',
    subtitle: 'Cyberpunk neon-tinted retro feline',
    source: 'spicetify-oneko ecosystem',
    type: 'oneko-sprite',
    spriteUrl: '/pets/oneko-vaporwave.gif',
    defaultScale: 1.0,
  },
  {
    id: 'purple-dog',
    name: 'Violet Pixel Dog',
    subtitle: 'Hexatron original custom violet pixel dog mascot',
    source: 'Hexatron Original Artwork',
    type: 'svg-matrix',
    defaultScale: 1.0,
  },
];

export interface PetInstance {
  id: string;
  characterId: string;
  name: string;
  scale: number; // 0.75 to 2.0
  speedMultiplier: number; // 0.5 to 2.0
  isPaused: boolean;
}

interface SavedPetConfig {
  pets: PetInstance[];
  globalEnabled: boolean;
  globalPaused: boolean;
}

const STORAGE_KEY = 'hexatron-pets-config';

function loadInitialConfig(): SavedPetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.pets) && parsed.pets.length > 0) {
        return {
          pets: parsed.pets,
          globalEnabled: parsed.globalEnabled ?? true,
          globalPaused: parsed.globalPaused ?? false,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load pet settings from localStorage', e);
  }
  return {
    pets: [
      {
        id: 'pet-default-1',
        characterId: 'oneko-classic',
        name: 'Oneko',
        scale: 1.0,
        speedMultiplier: 1.0,
        isPaused: false,
      },
    ],
    globalEnabled: true,
    globalPaused: false,
  };
}

function saveConfig(config: SavedPetConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save pet settings to localStorage', e);
  }
}

interface PetStoreState {
  pets: PetInstance[];
  globalEnabled: boolean;
  globalPaused: boolean;
  isPetsModalOpen: boolean;
  resetCounter: number; // bumped to signal pets to reset coordinates

  // Actions
  setPetsModalOpen: (open: boolean) => void;
  setGlobalEnabled: (enabled: boolean) => void;
  setGlobalPaused: (paused: boolean) => void;
  addPet: (characterId: string, customName?: string) => string;
  removePet: (id: string) => void;
  updatePet: (id: string, updates: Partial<PetInstance>) => void;
  resetPositions: () => void;
  restoreDefaults: () => void;
}

const initial = loadInitialConfig();

export const usePetStore = create<PetStoreState>((set, get) => ({
  pets: initial.pets,
  globalEnabled: initial.globalEnabled,
  globalPaused: initial.globalPaused,
  isPetsModalOpen: false,
  resetCounter: 0,

  setPetsModalOpen: (open: boolean) => set({ isPetsModalOpen: open }),

  setGlobalEnabled: (enabled: boolean) => {
    set({ globalEnabled: enabled });
    const { pets, globalPaused } = get();
    saveConfig({ pets, globalEnabled: enabled, globalPaused });
  },

  setGlobalPaused: (paused: boolean) => {
    set({ globalPaused: paused });
    const { pets, globalEnabled } = get();
    saveConfig({ pets, globalEnabled, globalPaused: paused });
  },

  addPet: (characterId: string, customName?: string) => {
    const char = PET_CHARACTERS.find(c => c.id === characterId) || PET_CHARACTERS[0];
    const newId = `pet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newPet: PetInstance = {
      id: newId,
      characterId: char.id,
      name: customName || char.name,
      scale: char.defaultScale,
      speedMultiplier: 1.0,
      isPaused: false,
    };
    const updated = [...get().pets, newPet];
    set({ pets: updated });
    saveConfig({
      pets: updated,
      globalEnabled: get().globalEnabled,
      globalPaused: get().globalPaused,
    });
    return newId;
  },

  removePet: (id: string) => {
    const updated = get().pets.filter(p => p.id !== id);
    set({ pets: updated });
    saveConfig({
      pets: updated,
      globalEnabled: get().globalEnabled,
      globalPaused: get().globalPaused,
    });
  },

  updatePet: (id: string, updates: Partial<PetInstance>) => {
    const updated = get().pets.map(p => (p.id === id ? { ...p, ...updates } : p));
    set({ pets: updated });
    saveConfig({
      pets: updated,
      globalEnabled: get().globalEnabled,
      globalPaused: get().globalPaused,
    });
  },

  resetPositions: () => {
    set(state => ({ resetCounter: state.resetCounter + 1 }));
  },

  restoreDefaults: () => {
    const defaultPets: PetInstance[] = [
      {
        id: 'pet-default-1',
        characterId: 'oneko-classic',
        name: 'Oneko',
        scale: 1.0,
        speedMultiplier: 1.0,
        isPaused: false,
      },
    ];
    set({
      pets: defaultPets,
      globalEnabled: true,
      globalPaused: false,
      resetCounter: get().resetCounter + 1,
    });
    saveConfig({
      pets: defaultPets,
      globalEnabled: true,
      globalPaused: false,
    });
  },
}));
