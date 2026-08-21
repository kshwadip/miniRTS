import { writable } from 'svelte/store';
// These stores are updated by the Phaser game and read by Svelte components
export const resources     = writable({ wood: 200, food: 200, gold: 100, stone: 50 });
export const population    = writable({ current: 3, max: 75 });
export const isNight       = writable(false);
export const isRaining     = writable(false);
export const timeRemaining = writable({ phase: 'Day', ms: 900000 });
export const selectedUnits = writable([]);
export const gameMessage   = writable('');

// ── NEW: added for the unified HUD ──

// Set when a resource tile/node is clicked. Shape once wired up:
// { type: 'wood' | 'food' | 'gold' | 'stone', amount: number, max: number }
// Left as `null` until resource-node selection is implemented — the HUD
// already knows how to render it, so this is the only line that needs
// to change when that lands (set it from the click handler, clear on
// deselect the same way selectedUnits is cleared).
export const selectedResource = writable(null);

// Single-player stubs — swap for real identity data whenever multiplayer/
// save-profile work happens. HUD only reads these, never writes them.
export const playerName = writable('');
export const civName    = writable('');