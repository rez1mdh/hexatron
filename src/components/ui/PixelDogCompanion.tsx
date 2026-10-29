// src/components/ui/PixelDogCompanion.tsx
// Interactive Violet Pixel-Dog Companion for Hexatron Encyclopedia
// Features crisp retro pixel art, autonomous wandering, click reactions, dragging, dropping, and edge-climbing

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, Heart, Settings, X, RotateCcw, Eye, EyeOff, Play, Pause } from 'lucide-react';
import './PixelDogCompanion.css';

// ── 1. Color Palette for Violet Pixel Dog ───────────────────────────────────
const PALETTE: Record<string, string> = {
  P: '#7c3aed', // Primary Violet
  L: '#a78bfa', // Light Lavender (highlights, muzzle, inner ears)
  D: '#4c1d95', // Deep Dark Violet (shadows, back legs, tail tip)
  G: '#f59e0b', // Gold Collar
  W: '#ffffff', // Eye White
  E: '#1e1b4b', // Eye Pupil & Dark Nose
  T: '#ec4899', // Pink Tongue
};

// ── 2. Pixel Art Matrices (20 wide × 16 high) ──────────────────────────────
const FRAMES = {
  idle_1: [
    '....................',
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '......LLTTLL........',
    '......GGGGGG........',
    '....PPPPPPPPPP......',
    '....PPPPPPPPPPDL....',
    '....PPPPPPPPPPP.DL..',
    '....DD..DD..DD......',
    '....DD..DD..DD......',
    '....LL..LL..LL......',
    '....................',
  ],
  idle_2: [
    '....................',
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '......LLLLLL........',
    '......GGGGGG........',
    '....PPPPPPPPPP......',
    '....PPPPPPPPPP..LD..',
    '....PPPPPPPPPPPDL...',
    '....DD..DD..DD......',
    '....DD..DD..DD......',
    '....LL..LL..LL......',
    '....................',
  ],
  walk_1: [
    '....................',
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '......LLTTLL........',
    '......GGGGGG........',
    '....PPPPPPPPPP......',
    '....PPPPPPPPPPDL....',
    '....PPPPPPPPPPP.DL..',
    '.....DD..DD...DD....',
    '.....DD..DD....DD...',
    '.....LL..LL.....LL..',
    '....................',
  ],
  walk_2: [
    '....................',
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '......LLLLLL........',
    '......GGGGGG........',
    '....PPPPPPPPPP......',
    '....PPPPPPPPPP..LD..',
    '....PPPPPPPPPPPDL...',
    '....DD...DD...DD....',
    '....DD...DD...DD....',
    '....LL...LL...LL....',
    '....................',
  ],
  run_1: [
    '....................',
    '....LL.......LL.....',
    '...LPL......LPL.....',
    '...PPPP....PPPP.....',
    '...PEWP....PEWP.....',
    '...PPPP....PPPP.....',
    '....PPEEPPPEE.......',
    '.....LLTTLL.........',
    '.....GGGGGG.........',
    '...PPPPPPPPPPP..DL..',
    '..PPPPPPPPPPPPPDL...',
    '.DD...DD...DD.......',
    '.LL...LL...LL.......',
    '....................',
    '....................',
    '....................',
  ],
  run_2: [
    '....................',
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '......GGGGGG........',
    '....PPPPPPPPPP.D....',
    '....PPPPPPPPPPPDL...',
    '.....DD...DD..DD....',
    '.....LL...LL..LL....',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  sit: [
    '....................',
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '......LLLLLL........',
    '......GGGGGG........',
    '....PPPPPPPP........',
    '....PPPPPPPPPP.LD...',
    '....PPPPPPPPPP.DL...',
    '....DD.DD.DDDDD.....',
    '....LL.LL...LLL.....',
    '....................',
    '....................',
  ],
  sleep: [
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '......LL......LL....',
    '.....LPL.....LPL....',
    '....PPPPPPPPPPPP....',
    '...PPEEPPPEEPPPEP...',
    '..PPPPPPPPPPPPPPPD..',
    '.PPPPPPPPPPPPPPPPPD.',
    '.DDDDDDDDDDDDDDDDL..',
    '..LLLLLLLLLLLLLLL...',
    '....................',
    '....................',
  ],
  jump: [
    '....LL.......LL.....',
    '...LPL......LPL.....',
    '...PPPP....PPPP.....',
    '...PEWP....PEWP.....',
    '...PPPP....PPPP.....',
    '....PPEEPPPEE.......',
    '.....LLTTLL.........',
    '.....GGGGGG.........',
    '...PPPPPPPPPPP..DL..',
    '..PPPPPPPPPPPPP.LD..',
    '..DD...DD...DD......',
    '..LL...LL...LL......',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  held: [
    '....................',
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '......LLTTLL........',
    '......GGGGGG........',
    '....PPPPPPPPPP......',
    '....PPPPPPPPPP.DL...',
    '....DD..DD..DD.LD...',
    '....DD..DD..DD......',
    '....DD..DD..DD......',
    '....LL..LL..LL......',
    '....................',
  ],
  climb: [
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '......LLTTLL........',
    '..DD..GGGGGG........',
    '..LLPPPPPPPPPP......',
    '....PPPPPPPPPP......',
    '....PPPPPPPPPP.DL...',
    '..DDPPPPPPPPPP.LD...',
    '..LL..DD..DD........',
    '......DD..DD........',
    '......LL..LL........',
    '....................',
  ],
  bark: [
    '....................',
    '.....LL.......LL....',
    '....LPL......LPL....',
    '....PPPP....PPPP....',
    '....PEWP....PEWP....',
    '....PPPP....PPPP....',
    '.....PPEEPPPEE......',
    '.....TTTTTTTT.......',
    '......GGGGGG........',
    '....PPPPPPPPPP......',
    '....PPPPPPPPPPDL....',
    '....PPPPPPPPPPP.DL..',
    '....DD..DD..DD......',
    '....DD..DD..DD......',
    '....LL..LL..LL......',
    '....................',
  ]
};

// ── 3. SVG Renderer for Pixel Matrix ────────────────────────────────────────
function PixelSprite({ frame, size }: { frame: keyof typeof FRAMES; size: number }) {
  const matrix = FRAMES[frame] || FRAMES.idle_1;
  const rects = useMemo(() => {
    const list: { x: number; y: number; color: string }[] = [];
    matrix.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        const color = PALETTE[char];
        if (color) {
          list.push({ x, y, color });
        }
      }
    });
    return list;
  }, [matrix]);

  return (
    <svg
      viewBox="0 0 20 16"
      width={size}
      height={Math.round(size * 0.8)}
      className="pixel-dog-svg"
      shapeRendering="crispEdges"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={r.color} />
      ))}
    </svg>
  );
}

// ── 4. Dog Config & Persistence ─────────────────────────────────────────────
interface DogConfig {
  visible: boolean;
  autonomous: boolean;
  size: 'small' | 'medium' | 'large';
  activity: 'calm' | 'normal' | 'playful';
  disabled: boolean;
}

const STORAGE_KEY = 'hexatron-pixel-dog-config';
const POS_STORAGE_KEY = 'hexatron-pixel-dog-pos';

const DEFAULT_CONFIG: DogConfig = {
  visible: true,
  autonomous: true,
  size: 'medium',
  activity: 'normal',
  disabled: false,
};

type DogState = 'idle' | 'walk' | 'run' | 'sit' | 'sleep' | 'jump' | 'held' | 'falling' | 'climb' | 'bark';

export default function PixelDogCompanion() {
  const [config, setConfig] = useState<DogConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveConfig = (newCfg: DogConfig) => {
    setConfig(newCfg);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCfg));
    } catch {
      // ignore
    }
  };

  // Dimensions based on size config
  const pixelSize = useMemo(() => {
    switch (config.size) {
      case 'small': return 32;
      case 'large': return 54;
      case 'medium':
      default: return 42;
    }
  }, [config.size]);

  const dogHeight = Math.round(pixelSize * 0.8);

  // Position & physics ref
  const posRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth - 120 : 300,
    y: typeof window !== 'undefined' ? window.innerHeight - 100 : 500,
    vx: 0,
    vy: 0,
  });

  // Load saved position
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          posRef.current.x = Math.max(10, Math.min(window.innerWidth - pixelSize - 10, parsed.x));
          posRef.current.y = Math.max(10, Math.min(window.innerHeight - dogHeight - 10, parsed.y));
        }
      }
    } catch {
      // ignore
    }
  }, [pixelSize, dogHeight]);

  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [currentFrame, setCurrentFrame] = useState<keyof typeof FRAMES>('idle_1');
  const [dogState, setDogState] = useState<DogState>('idle');

  // DOM node ref
  const dogElRef = useRef<HTMLDivElement | null>(null);

  // Dragging state refs
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    startTime: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    startTime: 0,
  });

  // Calculate floor Y coordinate
  const getFloorY = useCallback(() => {
    const isMobile = window.innerWidth <= 900;
    const bottomNavHeight = isMobile ? 54 : 12;
    return window.innerHeight - dogHeight - bottomNavHeight;
  }, [dogHeight]);

  // Trigger happy bark with heart emote
  const triggerBark = useCallback(() => {
    setDogState('bark');
    setCurrentFrame('bark');
    setShowHeart(true);
    if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
    heartTimerRef.current = setTimeout(() => {
      setShowHeart(false);
      setDogState('idle');
    }, 1300);
  }, []);

  // Listen for global custom event to toggle/open dog settings from QuickActions
  useEffect(() => {
    function handleToggleEvent() {
      setIsSettingsOpen(true);
    }
    window.addEventListener('hexatron-open-dog-settings', handleToggleEvent);
    return () => window.removeEventListener('hexatron-open-dog-settings', handleToggleEvent);
  }, []);

  // ── 5. Main Animation & Autonomous Behavior Loop ──────────────────────────
  useEffect(() => {
    if (!config.visible || config.disabled) return;

    let animId: number;
    let lastTime = performance.now();
    let stateTimer = 0;
    let frameTimer = 0;
    let walkFrameIdx = 0;
    let idleFrameIdx = 0;

    function loop(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // When document is hidden, conserve CPU
      if (document.hidden) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const floorY = getFloorY();
      const minX = 8;
      const maxX = window.innerWidth - pixelSize - 8;

      // If user is dragging, do not run autonomous physics
      if (dragRef.current.isDragging) {
        setCurrentFrame('held');
        animId = requestAnimationFrame(loop);
        return;
      }

      // If in bark reaction state, wait for timer
      if (dogState === 'bark') {
        animId = requestAnimationFrame(loop);
        return;
      }

      // ── Physics: Gravity if falling ──────────────────────────────────────
      if (dogState === 'falling') {
        posRef.current.vy += 650 * dt; // gravity
        posRef.current.y += posRef.current.vy * dt;

        if (posRef.current.y >= floorY) {
          posRef.current.y = floorY;
          posRef.current.vy = 0;
          setDogState('idle');
          setCurrentFrame('idle_1');
        } else {
          setCurrentFrame('held');
        }
      } else if (dogState === 'jump') {
        posRef.current.vy += 650 * dt;
        posRef.current.y += posRef.current.vy * dt;
        posRef.current.x += (facing === 'right' ? 70 : -70) * dt;

        if (posRef.current.y >= floorY) {
          posRef.current.y = floorY;
          posRef.current.vy = 0;
          setDogState('idle');
          setCurrentFrame('idle_1');
        } else {
          setCurrentFrame('jump');
        }
      } else if (dogState === 'walk') {
        const speed = 40;
        posRef.current.x += (facing === 'right' ? speed : -speed) * dt;

        // Animate walk frames
        frameTimer += dt;
        if (frameTimer > 0.18) {
          frameTimer = 0;
          walkFrameIdx = (walkFrameIdx + 1) % 4;
          const walkFrames: (keyof typeof FRAMES)[] = ['walk_1', 'walk_2', 'walk_1', 'walk_2'];
          setCurrentFrame(walkFrames[walkFrameIdx]);
        }

        // Boundary bounce
        if (posRef.current.x <= minX) {
          posRef.current.x = minX;
          setFacing('right');
        } else if (posRef.current.x >= maxX) {
          posRef.current.x = maxX;
          setFacing('left');
        }
      } else if (dogState === 'run') {
        const speed = 80;
        posRef.current.x += (facing === 'right' ? speed : -speed) * dt;

        frameTimer += dt;
        if (frameTimer > 0.14) {
          frameTimer = 0;
          walkFrameIdx = (walkFrameIdx + 1) % 2;
          setCurrentFrame(walkFrameIdx === 0 ? 'run_1' : 'run_2');
        }

        if (posRef.current.x <= minX) {
          posRef.current.x = minX;
          setFacing('right');
        } else if (posRef.current.x >= maxX) {
          posRef.current.x = maxX;
          setFacing('left');
        }
      } else if (dogState === 'idle') {
        frameTimer += dt;
        if (frameTimer > 0.6) {
          frameTimer = 0;
          idleFrameIdx = (idleFrameIdx + 1) % 2;
          setCurrentFrame(idleFrameIdx === 0 ? 'idle_1' : 'idle_2');
        }
      } else if (dogState === 'sit') {
        setCurrentFrame('sit');
      } else if (dogState === 'sleep') {
        setCurrentFrame('sleep');
      } else if (dogState === 'climb') {
        setCurrentFrame('climb');
      }

      // Clamp X & Y to viewport
      posRef.current.x = Math.max(minX, Math.min(maxX, posRef.current.x));
      if (dogState !== 'falling' && dogState !== 'jump' && dogState !== 'climb') {
        posRef.current.y = floorY;
      }

      // Update DOM transform directly for 60fps performance
      if (dogElRef.current) {
        dogElRef.current.style.transform = `translate3d(${Math.round(posRef.current.x)}px, ${Math.round(posRef.current.y)}px, 0)`;
      }

      // ── Autonomous State Machine Decisions ──────────────────────────────
      if (config.autonomous && dogState !== 'falling' && dogState !== 'jump' && dogState !== 'climb') {
        stateTimer += dt;
        const changeInterval = config.activity === 'playful' ? 3.5 : (config.activity === 'calm' ? 8 : 5.5);

        if (stateTimer > changeInterval) {
          stateTimer = 0;
          const roll = Math.random();

          if (config.activity === 'calm') {
            if (roll < 0.45) {
              setDogState('idle');
            } else if (roll < 0.75) {
              setDogState('sit');
            } else if (roll < 0.9) {
              setDogState('sleep');
            } else {
              setDogState('walk');
              setFacing(Math.random() > 0.5 ? 'right' : 'left');
            }
          } else if (config.activity === 'playful') {
            if (roll < 0.4) {
              setDogState('walk');
              setFacing(Math.random() > 0.5 ? 'right' : 'left');
            } else if (roll < 0.65) {
              setDogState('run');
              setFacing(Math.random() > 0.5 ? 'right' : 'left');
            } else if (roll < 0.8) {
              setDogState('jump');
              posRef.current.vy = -260;
            } else {
              setDogState('idle');
            }
          } else {
            // Normal
            if (roll < 0.35) {
              setDogState('idle');
            } else if (roll < 0.65) {
              setDogState('walk');
              setFacing(Math.random() > 0.5 ? 'right' : 'left');
            } else if (roll < 0.8) {
              setDogState('sit');
            } else if (roll < 0.92) {
              setDogState('sleep');
            } else {
              setDogState('run');
              setFacing(Math.random() > 0.5 ? 'right' : 'left');
            }
          }
        }
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [config.visible, config.disabled, config.autonomous, config.activity, dogState, facing, pixelSize, dogHeight, getFloorY]);

  // Window resize handler: clamp position
  useEffect(() => {
    function handleResize() {
      const floorY = getFloorY();
      posRef.current.x = Math.max(10, Math.min(window.innerWidth - pixelSize - 10, posRef.current.x));
      if (dogState !== 'climb') {
        posRef.current.y = floorY;
      }
      if (dogElRef.current) {
        dogElRef.current.style.transform = `translate3d(${Math.round(posRef.current.x)}px, ${Math.round(posRef.current.y)}px, 0)`;
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pixelSize, getFloorY, dogState]);

  // ── 6. Mouse & Touch Pointer Handlers (Drag, Drop, Click) ─────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (config.disabled) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: posRef.current.x,
      initialY: posRef.current.y,
      startTime: Date.now(),
    };

    setDogState('held');
    setCurrentFrame('held');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    posRef.current.x = Math.max(4, Math.min(window.innerWidth - pixelSize - 4, dragRef.current.initialX + dx));
    posRef.current.y = Math.max(4, Math.min(window.innerHeight - dogHeight - 4, dragRef.current.initialY + dy));

    if (dx > 2) setFacing('right');
    else if (dx < -2) setFacing('left');

    if (dogElRef.current) {
      dogElRef.current.style.transform = `translate3d(${Math.round(posRef.current.x)}px, ${Math.round(posRef.current.y)}px, 0)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const duration = Date.now() - dragRef.current.startTime;
    const dist = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragRef.current.isDragging = false;

    // Check if it was a quick click/tap
    if (duration < 280 && dist < 7) {
      triggerBark();
      return;
    }

    // Persist position
    try {
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ x: posRef.current.x, y: posRef.current.y }));
    } catch {
      // ignore
    }

    const floorY = getFloorY();

    // Check if dropped near the left sidebar edge (desktop or mobile)
    const isNearLeftEdge = posRef.current.x < 35 || (window.innerWidth > 900 && Math.abs(posRef.current.x - 245) < 30);
    if (isNearLeftEdge && posRef.current.y < floorY - 60) {
      // Cling to the edge in climbing pose!
      setDogState('climb');
      setCurrentFrame('climb');
      return;
    }

    // Otherwise drop with gentle gravity
    if (posRef.current.y < floorY - 5) {
      setDogState('falling');
      posRef.current.vy = 60;
    } else {
      posRef.current.y = floorY;
      setDogState('idle');
      setCurrentFrame('idle_1');
    }
  };

  const resetPosition = () => {
    posRef.current.x = window.innerWidth - pixelSize - 30;
    posRef.current.y = getFloorY();
    setDogState('idle');
    setCurrentFrame('idle_1');
    try {
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ x: posRef.current.x, y: posRef.current.y }));
    } catch {
      // ignore
    }
    setIsSettingsOpen(false);
  };

  if (!config.visible) return null;

  return (
    <>
      <div className="pixel-dog-overlay" aria-hidden="true">
        <div
          ref={dogElRef}
          className={`pixel-dog-wrapper ${dogState === 'held' ? 'held' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Violet Pixel Companion (Click to pet, Drag to carry!)"
          style={{
            transform: `translate3d(${Math.round(posRef.current.x)}px, ${Math.round(posRef.current.y)}px, 0)`,
          }}
        >
          {/* Flip horizontally based on facing direction */}
          <div style={{ transform: facing === 'left' ? 'scaleX(-1)' : 'none' }}>
            <PixelSprite frame={currentFrame} size={pixelSize} />
          </div>

          {/* Happy bark heart bubble */}
          {showHeart && (
            <div className="pixel-dog-bubble">
              <Heart size={11} fill="#ec4899" />
              <span>Bark!</span>
            </div>
          )}

          {/* Sleeping Zzz particles */}
          {dogState === 'sleep' && <div className="pixel-dog-zzz">Zzz...</div>}

          {/* Small gear button on hover to open companion preferences */}
          <button
            type="button"
            className="pixel-dog-settings-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsSettingsOpen(true);
            }}
            title="Companion Settings"
            aria-label="Companion Settings"
          >
            <Settings size={10} />
          </button>
        </div>
      </div>

      {/* Companion Settings Modal */}
      {isSettingsOpen && (
        <div className="pixel-dog-modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div className="pixel-dog-modal" onClick={e => e.stopPropagation()}>
            <div className="pdm-header">
              <div className="pdm-title">
                <Sparkles size={15} className="text-accent" />
                <span>Pixel Dog Companion</span>
              </div>
              <button
                type="button"
                className="icon-btn small"
                onClick={() => setIsSettingsOpen(false)}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="pdm-body">
              {/* Wandering Toggle */}
              <div className="pdm-row">
                <div>
                  <div className="pdm-label">Wandering</div>
                  <div className="pdm-sublabel">Walks around viewport automatically</div>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${config.autonomous ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => saveConfig({ ...config, autonomous: !config.autonomous })}
                >
                  {config.autonomous ? <Pause size={12} style={{ marginRight: 4 }} /> : <Play size={12} style={{ marginRight: 4 }} />}
                  {config.autonomous ? 'Roaming' : 'Still'}
                </button>
              </div>

              {/* Size Selector */}
              <div className="pdm-row">
                <div>
                  <div className="pdm-label">Size</div>
                  <div className="pdm-sublabel">Sprite scale on screen</div>
                </div>
                <div className="pdm-toggle-group">
                  {(['small', 'medium', 'large'] as const).map(sz => (
                    <button
                      key={sz}
                      type="button"
                      className={`pdm-btn-option ${config.size === sz ? 'active' : ''}`}
                      onClick={() => saveConfig({ ...config, size: sz })}
                    >
                      {sz === 'small' ? 'Sm' : sz === 'medium' ? 'Med' : 'Lg'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Level */}
              <div className="pdm-row">
                <div>
                  <div className="pdm-label">Activity</div>
                  <div className="pdm-sublabel">How lively the puppy behaves</div>
                </div>
                <div className="pdm-toggle-group">
                  {(['calm', 'normal', 'playful'] as const).map(act => (
                    <button
                      key={act}
                      type="button"
                      className={`pdm-btn-option ${config.activity === act ? 'active' : ''}`}
                      onClick={() => saveConfig({ ...config, activity: act })}
                    >
                      {act.charAt(0).toUpperCase() + act.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interaction Enabled */}
              <div className="pdm-row">
                <div>
                  <div className="pdm-label">Interaction</div>
                  <div className="pdm-sublabel">Allow dragging and clicking</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => saveConfig({ ...config, disabled: !config.disabled })}
                >
                  {config.disabled ? 'Disabled' : 'Enabled'}
                </button>
              </div>
            </div>

            <div className="pdm-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={resetPosition}
                title="Reset position to floor"
              >
                <RotateCcw size={12} style={{ marginRight: 4 }} />
                Reset Pos
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  saveConfig({ ...config, visible: false });
                  setIsSettingsOpen(false);
                }}
                title="Hide companion from view"
              >
                <EyeOff size={12} style={{ marginRight: 4 }} />
                Hide Dog
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── 7. Extension Point Note for Future Windows Native Pet ───────────────────
/**
 * ARCHITECTURE NOTE FOR FUTURE NATIVE PET EXTENSION:
 *
 * This companion currently executes 100% inside the web application viewport (PWA/browser),
 * functioning seamlessly across Windows Chrome/Edge and Android mobile without any native installation.
 *
 * If a future native Windows desktop wrapper (e.g. Tauri / Electron) is added:
 * - A secondary transparent, borderless, always-on-top window can be launched:
 *     `new Window({ transparent: true, alwaysOnTop: true, decorations: false })`
 * - This same <PixelDogCompanion /> component can be mounted in that window route
 *   with `pointer-events: auto` and OS-level window drag handling (`window.startDragging()`).
 * - This provides an effortless migration path without altering the website architecture.
 */
