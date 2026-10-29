// src/components/pets/OnekoEngine.tsx
// Unified Oneko Companion System with Multi-Pet Support, Separation Physics, and Touch Compatibility
// Derived from adryd325/oneko.js (MIT License) with full local assets and custom Hexatron pet support

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePetStore, PET_CHARACTERS, type PetInstance } from '../../store/petStore';
import { PurpleDogSprite } from './PurpleDogSprite';
import './OnekoEngine.css';

// ── Oneko 32x32 Sprite Coordinates (from adryd325/oneko.js) ──────────────────
const SPRITE_SETS: Record<string, [number, number][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [
    [-5, 0],
    [-6, 0],
    [-7, 0],
  ],
  scratchWallN: [
    [0, 0],
    [0, -1],
  ],
  scratchWallS: [
    [-7, -1],
    [-6, -2],
  ],
  scratchWallE: [
    [-2, -2],
    [-2, -3],
  ],
  scratchWallW: [
    [-4, 0],
    [-4, -1],
  ],
  tired: [[-3, -2]],
  sleeping: [
    [-2, 0],
    [-2, -1],
  ],
  N: [
    [-1, -2],
    [-1, -3],
  ],
  NE: [
    [0, -2],
    [0, -3],
  ],
  E: [
    [-3, 0],
    [-3, -1],
  ],
  SE: [
    [-5, -1],
    [-5, -2],
  ],
  S: [
    [-6, -3],
    [-7, -2],
  ],
  SW: [
    [-5, -3],
    [-6, -1],
  ],
  W: [
    [-4, -2],
    [-4, -3],
  ],
  NW: [
    [-1, 0],
    [-1, -1],
  ],
};

interface LivePetState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  frameCount: number;
  idleTime: number;
  idleAnimation: string | null;
  idleAnimationFrame: number;
  direction: string;
  isDragging: boolean;
  flipX: boolean;
  purpleDogFrame: string;
  reaction: string | null;
  reactionTimer: number;
}

export default function OnekoEngine() {
  const { pets, globalEnabled, globalPaused, resetCounter, setPetsModalOpen } = usePetStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const petDomRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const petSpriteRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const purpleDogStateRefs = useRef<Map<string, (frame: string, flip: boolean) => void>>(new Map());
  const reactionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Mutable live state for each pet (prevents React re-renders during 60FPS RAF loop)
  const liveStates = useRef<Map<string, LivePetState>>(new Map());

  // Shared pointer coordinates & wander target
  const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const lastTouchTime = useRef(Date.now());
  const wanderTarget = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  // Check reduced-motion preference
  const isReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize or reset positions when pets or resetCounter change
  useEffect(() => {
    const current = liveStates.current;
    pets.forEach((pet, index) => {
      if (!current.has(pet.id)) {
        // Place new pets near center with an offset
        const spread = (index % 5) * 36;
        const initialX = Math.min(Math.max(48, (window.innerWidth / 2) + spread - 72), window.innerWidth - 48);
        const initialY = Math.min(Math.max(48, (window.innerHeight / 2) + ((index % 3) * 24)), window.innerHeight - 48);

        current.set(pet.id, {
          x: initialX,
          y: initialY,
          targetX: initialX,
          targetY: initialY,
          frameCount: 0,
          idleTime: 0,
          idleAnimation: null,
          idleAnimationFrame: 0,
          direction: 'idle',
          isDragging: false,
          flipX: false,
          purpleDogFrame: 'idle_1',
          reaction: null,
          reactionTimer: 0,
        });
      }
    });

    // Cleanup removed pets
    for (const key of current.keys()) {
      if (!pets.some(p => p.id === key)) {
        current.delete(key);
      }
    }
  }, [pets]);

  // Handle position reset signal
  useEffect(() => {
    if (resetCounter === 0) return;
    const current = liveStates.current;
    pets.forEach((pet, index) => {
      const state = current.get(pet.id);
      if (state) {
        state.x = (window.innerWidth / 2) + ((index - (pets.length - 1) / 2) * 36);
        state.y = window.innerHeight / 2;
        state.idleTime = 0;
        state.idleAnimation = null;
      }
    });
  }, [resetCounter, pets]);

  // Global mouse and touch event listeners
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      lastTouchTime.current = Date.now();
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) {
        mousePos.current.x = e.touches[0].clientX;
        mousePos.current.y = e.touches[0].clientY;
        lastTouchTime.current = Date.now();
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
    };
  }, []);

  // Main animation and physics loop (runs on requestAnimationFrame)
  useEffect(() => {
    if (!globalEnabled || globalPaused || isReducedMotion || pets.length === 0) {
      return;
    }

    let animationFrameId: number;
    let lastFrameTimestamp = performance.now();
    let wanderTimer = 0;

    function frameLoop(timestamp: number) {
      // Step simulation roughly every ~100ms (matching original Oneko timing)
      const elapsed = timestamp - lastFrameTimestamp;
      if (elapsed > 100) {
        lastFrameTimestamp = timestamp;
        stepPhysics();
      }
      animationFrameId = requestAnimationFrame(frameLoop);
    }

    function stepPhysics() {
      const states = liveStates.current;
      const petList = pets;
      const now = Date.now();

      // Mobile autonomous wander when idle for > 5 seconds
      wanderTimer++;
      if (now - lastTouchTime.current > 5000 && wanderTimer % 40 === 0) {
        wanderTarget.current = {
          x: 48 + Math.random() * (window.innerWidth - 96),
          y: Math.max(80, window.innerHeight - 80 - Math.random() * 120),
        };
      }

      const activeTarget = (now - lastTouchTime.current > 5000)
        ? wanderTarget.current
        : mousePos.current;

      petList.forEach((pet, index) => {
        const state = states.get(pet.id);
        if (!state || pet.isPaused || state.isDragging) return;

        // Manage reaction bubble timeout
        if (state.reactionTimer > 0) {
          state.reactionTimer--;
          if (state.reactionTimer === 0) {
            state.reaction = null;
            const reactEl = reactionRefs.current.get(pet.id);
            if (reactEl) reactEl.style.display = 'none';
          }
        }

        // Target offset for multiple pets so they flock organically around pointer
        const offsetAngle = (index / Math.max(1, petList.length)) * Math.PI * 2;
        const targetOffsetX = petList.length > 1 ? Math.cos(offsetAngle) * 32 : 0;
        const targetOffsetY = petList.length > 1 ? Math.sin(offsetAngle) * 32 : 0;

        const effectiveTargetX = activeTarget.x + targetOffsetX;
        const effectiveTargetY = activeTarget.y + targetOffsetY;

        const diffX = state.x - effectiveTargetX;
        const diffY = state.y - effectiveTargetY;
        const distance = Math.hypot(diffX, diffY);
        const speed = 10 * (pet.speedMultiplier || 1);

        state.frameCount++;

        // Flocking / Separation push from other pets
        for (let j = 0; j < petList.length; j++) {
          if (j !== index) {
            const otherState = states.get(petList[j].id);
            if (otherState) {
              const sepX = state.x - otherState.x;
              const sepY = state.y - otherState.y;
              const sepDist = Math.hypot(sepX, sepY);
              if (sepDist > 0 && sepDist < 38) {
                const push = ((38 - sepDist) / 38) * 3;
                state.x += (sepX / sepDist) * push;
                state.y += (sepY / sepDist) * push;
              }
            }
          }
        }

        // Idle state when close to target
        if (distance < speed || distance < 48) {
          handleIdle(state);
        } else {
          // Running towards target
          state.idleAnimation = null;
          state.idleAnimationFrame = 0;

          if (state.idleTime > 1) {
            setPetSprite(pet, state, 'alert', 0);
            state.idleTime = Math.min(state.idleTime, 7) - 1;
          } else {
            let dir = '';
            dir += diffY / distance > 0.5 ? 'N' : '';
            dir += diffY / distance < -0.5 ? 'S' : '';
            dir += diffX / distance > 0.5 ? 'W' : '';
            dir += diffX / distance < -0.5 ? 'E' : '';
            if (!dir) dir = 'S';

            state.direction = dir;
            setPetSprite(pet, state, dir, state.frameCount);

            state.x -= (diffX / distance) * speed;
            state.y -= (diffY / distance) * speed;
          }
        }

        // Constrain to viewport boundaries
        const petRadius = 16 * (pet.scale || 1);
        state.x = Math.min(Math.max(petRadius, state.x), window.innerWidth - petRadius);
        state.y = Math.min(Math.max(petRadius, state.y), window.innerHeight - petRadius);

        // Update DOM transform directly for smooth 60fps movement
        const domEl = petDomRefs.current.get(pet.id);
        if (domEl) {
          const scale = pet.scale || 1.0;
          domEl.style.transform = `translate3d(${state.x - 16}px, ${state.y - 16}px, 0px) scale(${scale})`;
        }
      });
    }

    function handleIdle(state: LivePetState) {
      state.idleTime += 1;

      // Random idle event trigger (sleeping, scratching)
      if (state.idleTime > 10 && Math.floor(Math.random() * 150) === 0 && state.idleAnimation === null) {
        const available: string[] = ['sleeping', 'scratchSelf'];
        if (state.x < 32) available.push('scratchWallW');
        if (state.y < 32) available.push('scratchWallN');
        if (state.x > window.innerWidth - 32) available.push('scratchWallE');
        if (state.y > window.innerHeight - 32) available.push('scratchWallS');

        state.idleAnimation = available[Math.floor(Math.random() * available.length)];
      }

      const activePet = pets.find(p => liveStates.current.get(p.id) === state);
      if (!activePet) return;

      switch (state.idleAnimation) {
        case 'sleeping':
          if (state.idleAnimationFrame < 8) {
            setPetSprite(activePet, state, 'tired', 0);
          } else {
            setPetSprite(activePet, state, 'sleeping', Math.floor(state.idleAnimationFrame / 4));
            if (state.idleAnimationFrame > 192) {
              state.idleAnimation = null;
              state.idleAnimationFrame = 0;
            }
          }
          break;
        case 'scratchWallN':
        case 'scratchWallS':
        case 'scratchWallE':
        case 'scratchWallW':
        case 'scratchSelf':
          setPetSprite(activePet, state, state.idleAnimation, state.idleAnimationFrame);
          if (state.idleAnimationFrame > 9) {
            state.idleAnimation = null;
            state.idleAnimationFrame = 0;
          }
          break;
        default:
          setPetSprite(activePet, state, 'idle', 0);
          return;
      }
      state.idleAnimationFrame += 1;
    }

    function setPetSprite(pet: PetInstance, state: LivePetState, name: string, frame: number) {
      const charDef = PET_CHARACTERS.find(c => c.id === pet.characterId) || PET_CHARACTERS[0];

      if (charDef.type === 'svg-matrix') {
        // Violet Pixel Dog Frame Translation
        let pFrame = 'idle_1';
        let flip = false;

        if (name === 'idle') {
          pFrame = (frame % 2 === 0) ? 'idle_1' : 'idle_2';
        } else if (name === 'alert') {
          pFrame = 'bark';
        } else if (name === 'tired' || name === 'scratchSelf') {
          pFrame = 'sit';
        } else if (name === 'sleeping') {
          pFrame = 'sleep';
        } else {
          // Walking or running direction
          if (name.includes('W')) {
            flip = true;
          }
          pFrame = (frame % 2 === 0) ? 'run_1' : 'run_2';
        }

        state.purpleDogFrame = pFrame;
        state.flipX = flip;

        const updateFn = purpleDogStateRefs.current.get(pet.id);
        if (updateFn) {
          updateFn(pFrame, flip);
        }
      } else {
        // Oneko Sprite Sheet Position
        const spriteSet = SPRITE_SETS[name] || SPRITE_SETS.idle;
        const coords = spriteSet[frame % spriteSet.length];
        const spriteEl = petSpriteRefs.current.get(pet.id);
        if (spriteEl) {
          spriteEl.style.backgroundPosition = `${coords[0] * 32}px ${coords[1] * 32}px`;
        }
      }
    }

    animationFrameId = requestAnimationFrame(frameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [pets, globalEnabled, globalPaused, isReducedMotion]);

  // Pointer drag & click handling on individual pets
  const handlePointerDown = useCallback((petId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const state = liveStates.current.get(petId);
    if (!state) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    state.isDragging = true;
    state.idleAnimation = null;

    const domEl = petDomRefs.current.get(petId);
    if (domEl) domEl.classList.add('dragging');

    // Reaction sparkle on tap
    triggerReaction(petId, '✨');
  }, []);

  const handlePointerMove = useCallback((petId: string, e: React.PointerEvent) => {
    const state = liveStates.current.get(petId);
    if (!state || !state.isDragging) return;

    state.x = e.clientX;
    state.y = e.clientY;

    const domEl = petDomRefs.current.get(petId);
    if (domEl) {
      const pet = pets.find(p => p.id === petId);
      const scale = pet?.scale || 1.0;
      domEl.style.transform = `translate3d(${state.x - 16}px, ${state.y - 16}px, 0px) scale(${scale})`;
    }
  }, [pets]);

  const handlePointerUp = useCallback((petId: string, e: React.PointerEvent) => {
    const state = liveStates.current.get(petId);
    if (!state) return;

    state.isDragging = false;
    const domEl = petDomRefs.current.get(petId);
    if (domEl) domEl.classList.remove('dragging');

    triggerReaction(petId, '❤️');
  }, []);

  function triggerReaction(petId: string, symbol: string) {
    const state = liveStates.current.get(petId);
    if (!state) return;
    state.reaction = symbol;
    state.reactionTimer = 14; // ~1.4 seconds

    const reactEl = reactionRefs.current.get(petId);
    if (reactEl) {
      reactEl.textContent = symbol;
      reactEl.style.display = 'block';
    }
  }

  if (!globalEnabled || pets.length === 0) {
    return null;
  }

  return (
    <div className="oneko-viewport-container" ref={containerRef} aria-hidden="true">
      {pets.map(pet => {
        const charDef = PET_CHARACTERS.find(c => c.id === pet.characterId) || PET_CHARACTERS[0];
        const isSvg = charDef.type === 'svg-matrix';

        return (
          <PetInstanceView
            key={pet.id}
            pet={pet}
            charDef={charDef}
            isSvg={isSvg}
            petDomRefs={petDomRefs}
            petSpriteRefs={petSpriteRefs}
            purpleDogStateRefs={purpleDogStateRefs}
            reactionRefs={reactionRefs}
            onPointerDown={e => handlePointerDown(pet.id, e)}
            onPointerMove={e => handlePointerMove(pet.id, e)}
            onPointerUp={e => handlePointerUp(pet.id, e)}
            onDoubleClick={() => setPetsModalOpen(true)}
          />
        );
      })}
    </div>
  );
}

// ── Individual Pet Instance Component ─────────────────────────────────────────
interface PetInstanceViewProps {
  pet: PetInstance;
  charDef: (typeof PET_CHARACTERS)[0];
  isSvg: boolean;
  petDomRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  petSpriteRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  purpleDogStateRefs: React.MutableRefObject<Map<string, (f: string, flip: boolean) => void>>;
  reactionRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}

function PetInstanceView({
  pet,
  charDef,
  isSvg,
  petDomRefs,
  petSpriteRefs,
  purpleDogStateRefs,
  reactionRefs,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: PetInstanceViewProps) {
  const [purpleFrame, setPurpleFrame] = useState('idle_1');
  const [purpleFlip, setPurpleFlip] = useState(false);

  useEffect(() => {
    if (isSvg) {
      purpleDogStateRefs.current.set(pet.id, (frame, flip) => {
        setPurpleFrame(frame);
        setPurpleFlip(flip);
      });
      return () => {
        purpleDogStateRefs.current.delete(pet.id);
      };
    }
  }, [pet.id, isSvg, purpleDogStateRefs]);

  return (
    <div
      ref={el => {
        if (el) petDomRefs.current.set(pet.id, el);
        else petDomRefs.current.delete(pet.id);
      }}
      className="oneko-pet-instance"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      title={`${pet.name} (${charDef.name}) - Double-click for settings`}
    >
      <div className="oneko-name-tag">{pet.name}</div>

      <div
        ref={el => {
          if (el) reactionRefs.current.set(pet.id, el);
          else reactionRefs.current.delete(pet.id);
        }}
        className="oneko-reaction-pop"
        style={{ display: 'none' }}
      />

      {isSvg ? (
        <div
          style={{
            transform: purpleFlip ? 'scaleX(-1)' : 'none',
            transformOrigin: 'center center',
          }}
        >
          <PurpleDogSprite frameKey={purpleFrame} size={32} />
        </div>
      ) : (
        <div
          ref={el => {
            if (el) petSpriteRefs.current.set(pet.id, el);
            else petSpriteRefs.current.delete(pet.id);
          }}
          className="oneko-sprite-layer"
          style={{
            backgroundImage: `url(${charDef.spriteUrl})`,
            backgroundPosition: '-96px -96px', // Initial idle sprite
          }}
        />
      )}
    </div>
  );
}
