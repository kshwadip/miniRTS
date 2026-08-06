import { TILE_WIDTH, TILE_HEIGHT } from './Constants.js';

/**
 * Convert integer tile coordinates to isometric screen pixel position.
 * This is the only place floats enter — and only for rendering.
 * 
 * Isometric formula:
 * screenX = (tileX - tileY) * (TILE_WIDTH / 2)
 * screenY = (tileX + tileY) * (TILE_HEIGHT / 2)
 */
export function tileToScreen(tileX, tileY) {
    return {
        x: (tileX - tileY) * (TILE_WIDTH / 2),
        y: (tileX + tileY) * (TILE_HEIGHT / 2)
    };
}

/**
 * Convert screen pixel position back to tile coordinates.
 * Used when player taps on the screen — find which tile they tapped.
 * Returns integers via Math.floor.
 */
export function screenToTile(screenX, screenY) {
    const tileX = Math.floor(screenY / TILE_HEIGHT + screenX / TILE_WIDTH);
    const tileY = Math.floor(screenY / TILE_HEIGHT - screenX / TILE_WIDTH);
    return { tileX, tileY };
}

/**
 * Calculate tile distance between two tile positions.
 * Uses Chebyshev distance (diagonal counts as 1) — standard for grid RTS.
 * Returns an integer. Always.
 */
export function tileDistance(x1, y1, x2, y2) {
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/**
 * Check if tile coordinates are within map bounds.
 */
export function inBounds(tileX, tileY, mapWidth, mapHeight) {
    return tileX >= 0 && tileY >= 0 && tileX < mapWidth && tileY < mapHeight;
}