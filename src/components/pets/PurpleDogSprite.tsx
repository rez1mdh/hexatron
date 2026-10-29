// src/components/pets/PurpleDogSprite.tsx
// High-fidelity SVG renderer for Hexatron's custom Violet Pixel Dog
// Preserves the original pixel matrix art while connecting to the Oneko animation state machine

import React from 'react';

const PALETTE: Record<string, string> = {
  P: '#7c3aed', // Primary Violet
  L: '#a78bfa', // Light Lavender
  D: '#4c1d95', // Deep Dark Violet
  G: '#f59e0b', // Gold Collar
  W: '#ffffff', // Eye White
  E: '#1e1b4b', // Eye Pupil & Dark Nose
  T: '#ec4899', // Pink Tongue
};

export const PURPLE_DOG_FRAMES: Record<string, string[]> = {
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
  ],
};

// Precompute SVG rect elements per frame for ultra-fast zero-allocation rendering
const CACHED_RECTS: Record<string, { x: number; y: number; color: string }[]> = {};
for (const [frameKey, rows] of Object.entries(PURPLE_DOG_FRAMES)) {
  const rects: { x: number; y: number; color: string }[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]];
      if (color) rects.push({ x, y, color });
    }
  });
  CACHED_RECTS[frameKey] = rects;
}

interface PurpleDogProps {
  frameKey: string;
  size?: number;
}

export function PurpleDogSprite({ frameKey, size = 32 }: PurpleDogProps) {
  const rects = CACHED_RECTS[frameKey] || CACHED_RECTS.idle_1;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 16"
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        shapeRendering: 'crispEdges',
      }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width="1" height="1" fill={r.color} />
      ))}
    </svg>
  );
}
