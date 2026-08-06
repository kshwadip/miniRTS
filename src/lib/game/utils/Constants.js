// ─── TILE SYSTEM ───
export const TILE_WIDTH = 64;        // Width of one isometric tile in pixels
export const TILE_HEIGHT = 32;       // Height of one isometric tile in pixels
export const MAP_WIDTH = 64;         // Map width in tiles
export const MAP_HEIGHT = 64;        // Map height in tiles

// ─── FIXED POINT SCALE ───
// All stats stored as integers multiplied by this factor
// 100 base attack is stored as 10000 internally
export const STAT_SCALE = 100;

// ─── GAME TICK ───
export const TICK_RATE = 10;         // Game logic updates per second (not render fps)
export const TICK_MS = 1000 / TICK_RATE;

// ─── VISIBILITY ───
export const VISIBILITY = {
    FULL: 255,
    DAY: 255,
    RAIN: 128,        // -50% from day
    NIGHT: 64,        // -75% from day
    EXPLORED: 40,     // Seen before but not currently visible (shroud)
    HIDDEN: 0         // Never seen
};

// ─── DAY NIGHT ───
export const DAY_DURATION_MS   = 15 * 60 * 1000;  // 15 minutes
export const NIGHT_DURATION_MS = 5  * 60 * 1000;  // 5 minutes

// ─── PLAYER IDS ───
export const PLAYER = 0;
export const AI     = 1;

// ─── UNIT TYPES ───
export const UNIT_TYPE = {
    VILLAGER:  'villager',
    INFANTRY:  'infantry',
    RANGED:    'ranged',
    CAVALRY:   'cavalry'
};

// ─── TILE TYPES ───
export const TILE = {
    GRASS:        0,
    WATER_DEEP:   1,
    WATER_SHALLOW: 2,
    DIRT:         3,
    STONE_PATH:   4,
    FOREST:       5,
    GOLD_DEPOSIT: 6,
    STONE_DEPOSIT: 7
};

// ─── TERRAIN FLAGS ───
// What can move through each tile type
export const TERRAIN_FLAGS = {
    [TILE.GRASS]:          { walkable: true,  swimmable: false, cavalryOk: true  },
    [TILE.WATER_DEEP]:     { walkable: false, swimmable: true,  cavalryOk: false },
    [TILE.WATER_SHALLOW]:  { walkable: true,  swimmable: true,  cavalryOk: true  },
    [TILE.DIRT]:           { walkable: true,  swimmable: false, cavalryOk: true  },
    [TILE.STONE_PATH]:     { walkable: true,  swimmable: false, cavalryOk: true  },
    [TILE.FOREST]:         { walkable: true,  swimmable: false, cavalryOk: true  },
    [TILE.GOLD_DEPOSIT]:   { walkable: false, swimmable: false, cavalryOk: false },
    [TILE.STONE_DEPOSIT]:  { walkable: false, swimmable: false, cavalryOk: false }
};