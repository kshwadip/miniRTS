import { writable } from 'svelte/store';

// These stores are updated by the Phaser game and read by Svelte components
export const resources     = writable({ wood: 200, food: 200, gold: 100, stone: 50 });
export const population    = writable({ current: 3, max: 75 });
export const isNight       = writable(false);
export const isRaining     = writable(false);
export const timeRemaining = writable({ phase: 'Day', ms: 900000 });
export const selectedUnits = writable([]);
export const gameMessage   = writable('');