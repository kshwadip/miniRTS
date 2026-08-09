import { MAP_WIDTH, MAP_HEIGHT, VISIBILITY, UNIT_TYPE } from '../utils/Constants.js';

export class FogOfWar {
    constructor(scene) {
        this.scene = scene;

        // Two arrays for the entire map — integers only
        // visibility: current frame visibility 0-255
        // explored: has the player ever seen this tile (0 or 1)
        this.visibility = new Uint8Array(MAP_WIDTH * MAP_HEIGHT).fill(0);
        this.explored   = new Uint8Array(MAP_WIDTH * MAP_HEIGHT).fill(0);

        // Phaser Graphics object for rendering the fog overlay
        this.fogGraphics = scene.add.graphics();
        this.fogGraphics.setDepth(9999); // Always on top of everything

        // Current global visibility modifier from day-night and rain
        this.globalModifier = VISIBILITY.FULL;
    }

    // ─── VISIBILITY UPDATE ───
    // Call this every game tick, passing all player units
    update(playerUnits) {
        // Reset current visibility
        this.visibility.fill(0);

        // For each player unit, reveal tiles in sight range
        playerUnits.forEach(unit => {
            if (!unit.alive) return;
            const range = this._getUnitSightRange(unit);
            this._revealArea(unit.tileX, unit.tileY, range);
        });

        // Render the fog overlay
        this._render();
    }

    _getUnitSightRange(unit) {
        // Base sight ranges in tiles
        const baseRanges = {
            [UNIT_TYPE.VILLAGER]:  4,
            [UNIT_TYPE.INFANTRY]:  5,
            [UNIT_TYPE.RANGED]:    7,
            [UNIT_TYPE.CAVALRY]:   8
        };

        let range = baseRanges[unit.type] || 5;

        // Apply global visibility modifier
        // Night: -75% sight range, Rain: -50%
        if (this.globalModifier === VISIBILITY.NIGHT) {
            range = Math.floor(range * 25 / 100); // 25% of base
        } else if (this.globalModifier === VISIBILITY.RAIN) {
            range = Math.floor(range * 50 / 100); // 50% of base
        }

        return Math.max(range, 1); // Always at least 1 tile sight
    }

    _revealArea(centerX, centerY, range) {
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) continue;
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                if (dist <= range) {
                    const idx = y * MAP_WIDTH + x;
                    this.visibility[idx] = 1;
                    this.explored[idx]   = 1;
                }
            }
        }
    }

    isVisible(tileX, tileY) {
        return this.visibility[tileY * MAP_WIDTH + tileX] === 1;
    }

    isExplored(tileX, tileY) {
        return this.explored[tileY * MAP_WIDTH + tileX] === 1;
    }

    setGlobalModifier(modifier) {
        this.globalModifier = modifier;
    }

    _render() {
        this.fogGraphics.clear();

        // This is a simple per-tile fog render
        // For performance on larger maps, use a RenderTexture instead
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const idx = y * MAP_WIDTH + x;
                if (this.visibility[idx] === 1) continue; // Fully visible — no fog

                const { x: sx, y: sy } = this._tileToScreen(x, y);
                const alpha = this.explored[idx] === 1 ? 0.6 : 0.95;

                this.fogGraphics.fillStyle(0x000000, alpha);
                // Draw a diamond shape matching the isometric tile
                this.fogGraphics.fillPoints([
                    { x: sx,               y: sy - 16 },  // top
                    { x: sx + 32,          y: sy },       // right
                    { x: sx,               y: sy + 16 },  // bottom
                    { x: sx - 32,          y: sy }        // left
                ], true);
            }
        }
    }

    _tileToScreen(tileX, tileY) {
        // Inline for performance — avoids function call overhead in tight loop
        return {
            x: (tileX - tileY) * 32,
            y: (tileX + tileY) * 16
        };
    }
}