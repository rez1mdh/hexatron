// src/components/pets/PetsModal.tsx
// Management dialog and visual character gallery for Oneko Companions

import React, { useEffect } from 'react';
import {
  X, Sparkles, Plus, Trash2, RotateCcw, Eye, EyeOff, Play, Pause,
  Layers, ExternalLink, HelpCircle, RefreshCw
} from 'lucide-react';
import { usePetStore, PET_CHARACTERS, type PetInstance } from '../../store/petStore';
import { PurpleDogSprite } from './PurpleDogSprite';
import './PetsModal.css';

interface PetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PetsModal({ isOpen, onClose }: PetsModalProps) {
  const {
    pets,
    globalEnabled,
    globalPaused,
    setGlobalEnabled,
    setGlobalPaused,
    addPet,
    removePet,
    updatePet,
    resetPositions,
    restoreDefaults,
  } = usePetStore();

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="pets-modal-overlay" onClick={onClose}>
      <div
        className="pets-modal-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Companions and Pets Settings"
      >
        {/* Header */}
        <div className="pets-modal-header">
          <div className="pets-modal-title-group">
            <div className="pets-modal-icon-badge">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="pets-modal-title">Companions & Pets</h2>
              <p className="pets-modal-subtitle">
                Interactive pixel mascots chasing your cursor & wandering your workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            className="pets-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Toolbar */}
        <div className="pets-modal-toolbar">
          <div className="pets-toolbar-group">
            <button
              type="button"
              className={`pets-btn ${globalEnabled ? 'active' : ''}`}
              onClick={() => setGlobalEnabled(!globalEnabled)}
              title={globalEnabled ? 'Hide all companions' : 'Show all companions'}
            >
              {globalEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{globalEnabled ? 'All Pets Visible' : 'All Pets Hidden'}</span>
            </button>

            <button
              type="button"
              className={`pets-btn ${globalPaused ? 'active' : ''}`}
              onClick={() => setGlobalPaused(!globalPaused)}
              title={globalPaused ? 'Resume companions' : 'Pause companions'}
            >
              {globalPaused ? <Play size={14} /> : <Pause size={14} />}
              <span>{globalPaused ? 'Paused' : 'Active'}</span>
            </button>
          </div>

          <div className="pets-toolbar-group">
            <button
              type="button"
              className="pets-btn"
              onClick={resetPositions}
              title="Relocate pets to screen center"
            >
              <RotateCcw size={14} />
              <span>Center Pets</span>
            </button>

            <button
              type="button"
              className="pets-btn"
              onClick={restoreDefaults}
              title="Reset companion configuration to defaults"
            >
              <RefreshCw size={14} />
              <span>Defaults</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="pets-modal-body">
          {/* Active Pets Section */}
          <div>
            <div className="pets-section-title">
              <span>Active Companions ({pets.length})</span>
              <span style={{ fontSize: '0.72rem', textTransform: 'none', color: 'var(--text-muted)' }}>
                Drag anywhere on screen to reposition
              </span>
            </div>

            {pets.length === 0 ? (
              <div className="pets-empty-state">
                <p>No active companions on screen right now.</p>
                <button
                  type="button"
                  className="pets-btn primary"
                  style={{ marginTop: 10 }}
                  onClick={() => addPet('oneko-classic')}
                >
                  <Plus size={14} />
                  <span>Add Classic Oneko</span>
                </button>
              </div>
            ) : (
              <div className="active-pets-list">
                {pets.map(pet => {
                  const charDef = PET_CHARACTERS.find(c => c.id === pet.characterId) || PET_CHARACTERS[0];
                  const isSvg = charDef.type === 'svg-matrix';

                  return (
                    <div key={pet.id} className="active-pet-row">
                      <div className="active-pet-info">
                        <div className="active-pet-sprite-thumb">
                          {isSvg ? (
                            <PurpleDogSprite frameKey="idle_1" size={28} />
                          ) : (
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                backgroundImage: `url(${charDef.spriteUrl})`,
                                backgroundPosition: '-96px -96px',
                                imageRendering: 'pixelated',
                                transform: 'scale(0.85)',
                              }}
                            />
                          )}
                        </div>

                        <div className="active-pet-details">
                          <input
                            type="text"
                            className="active-pet-name-input"
                            value={pet.name}
                            onChange={e => updatePet(pet.id, { name: e.target.value })}
                            title="Click to rename companion"
                          />
                          <select
                            className="active-pet-select"
                            value={pet.characterId}
                            onChange={e => updatePet(pet.id, { characterId: e.target.value })}
                          >
                            {PET_CHARACTERS.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="active-pet-controls">
                        <div className="pet-slider-group">
                          <span>Size: {Math.round((pet.scale || 1) * 100)}%</span>
                          <input
                            type="range"
                            min="0.75"
                            max="2.0"
                            step="0.05"
                            value={pet.scale || 1}
                            onChange={e => updatePet(pet.id, { scale: parseFloat(e.target.value) })}
                          />
                        </div>

                        <div className="pet-slider-group">
                          <span>Speed: {Math.round((pet.speedMultiplier || 1) * 100)}%</span>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={pet.speedMultiplier || 1}
                            onChange={e => updatePet(pet.id, { speedMultiplier: parseFloat(e.target.value) })}
                          />
                        </div>

                        <div className="active-pet-actions">
                          <button
                            type="button"
                            className="pet-action-icon-btn"
                            onClick={() => updatePet(pet.id, { isPaused: !pet.isPaused })}
                            title={pet.isPaused ? 'Resume pet' : 'Pause pet'}
                          >
                            {pet.isPaused ? <Play size={14} /> : <Pause size={14} />}
                          </button>

                          <button
                            type="button"
                            className="pet-action-icon-btn delete"
                            onClick={() => removePet(pet.id)}
                            title="Remove companion"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Character Gallery Section */}
          <div>
            <div className="pets-section-title">
              <span>Character Gallery & Add Companion</span>
              <span style={{ fontSize: '0.72rem', textTransform: 'none', color: 'var(--text-muted)' }}>
                Choose any variant to add alongside existing pets
              </span>
            </div>

            <div className="pets-gallery-grid">
              {PET_CHARACTERS.map(char => {
                const isSvg = char.type === 'svg-matrix';
                const countActive = pets.filter(p => p.characterId === char.id).length;

                return (
                  <div key={char.id} className="pet-gallery-card">
                    <div className="pet-card-sprite-stage">
                      {isSvg ? (
                        <PurpleDogSprite frameKey="idle_1" size={36} />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            backgroundImage: `url(${char.spriteUrl})`,
                            backgroundPosition: '-96px -96px',
                            imageRendering: 'pixelated',
                            transform: 'scale(1.1)',
                          }}
                        />
                      )}
                    </div>

                    <div className="pet-card-name">{char.name}</div>
                    <div className="pet-card-desc">{char.subtitle}</div>

                    <button
                      type="button"
                      className="pet-card-add-btn"
                      onClick={() => addPet(char.id)}
                    >
                      <Plus size={13} />
                      <span>Add to Screen {countActive > 0 ? `(${countActive})` : ''}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pets-modal-footer">
          <div>
            <span>Based on </span>
            <a
              href="https://github.com/adryd325/oneko.js"
              target="_blank"
              rel="noopener noreferrer"
              className="pets-attribution-link"
            >
              adryd325/oneko.js
            </a>
            <span> (MIT License) with offline assets & multi-pet flocking. Preferences stored locally.</span>
          </div>
          <div>Double-click any pet on screen to open this menu.</div>
        </div>
      </div>
    </div>
  );
}
