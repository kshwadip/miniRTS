import { TILE_WIDTH, TILE_HEIGHT, MAP_WIDTH, MAP_HEIGHT, TILE, GOLD_AMOUNT, STONE_AMOUNT, TERRAIN_FLAGS } from '../utils/Constants.js';
import { tileToScreen, inBounds } from '../utils/IsoMath.js';

export class TileMap {
    constructor(scene) {
        this.scene = scene;
        this.width = MAP_WIDTH;
        this.height = MAP_HEIGHT;

        // The core data structure — a flat array representing the 2D grid
        // Access tile at (x, y) with: this.tiles[y * this.width + x]
        this.tiles = new Array(this.width * this.height).fill(TILE.GRASS);

        // Sprite references for each tile — parallel array to this.tiles
        this.tileSprites = new Array(this.width * this.height).fill(null);

        // Resource deposits — Map of "x,y" -> resource type and amount
        this.resourceDeposits = new Map();
    }

    // ─── TILE ACCESS ───

    getTile(tileX, tileY) {
        return this.tiles[tileY * this.width + tileX];
    }

    setTile(tileX, tileY, tileType) {
        this.tiles[tileY * this.width + tileX] = tileType;
    }

    isWalkable(tileX, tileY, unitCanSwim, unitIsCavalry) {
        const tile = this.getTile(tileX, tileY);
        const flags = TERRAIN_FLAGS[tile];
        if (!flags) return false;
        if (flags.swimmable && !unitCanSwim) return false;
        if (!flags.walkable && !flags.swimmable) return false;
        return true;
    }

    isBuildable(tileX, tileY) {
        if (!inBounds(tileX, tileY, this.width, this.height)) return false;
        const tile = this.getTile(tileX, tileY);
        // Only grass is considered buildable for now.
        // Add DIRT, STONE_PATH if you generate them later.
        return tile === TILE.GRASS || tile === TILE.DIRT;
    }

    // ─── MAP GENERATION ───

    generate() {
        // Step 1: Fill with grass
        this.tiles.fill(TILE.GRASS);

        // Step 2: Generate a central water body using random walk
        this._generateWater();

        // Step 3: Add forest clusters
        this._generateForests();

        // Step 4: Add resource deposits
        this._placeResources();

        // Step 5: Render all tiles
        this._renderTiles();
    }

    _generateWater() {
        // Simple approach: place a river or lake using noise
        // For MVP: a central lake using expanding circle from a random center
        const centerX = Math.floor(this.width / 2) + Math.floor(Math.random() * 10) - 5;
        const centerY = Math.floor(this.height / 2) + Math.floor(Math.random() * 10) - 5;
        const lakeRadius = 8 + Math.floor(Math.random() * 6);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const dist = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
                if (dist < lakeRadius - 3) {
                    this.setTile(x, y, TILE.WATER_DEEP);
                } else if (dist < lakeRadius) {
                    this.setTile(x, y, TILE.WATER_SHALLOW);
                }
            }
        }
    }

    _generateForests() {
        // Scatter forest clusters — keep away from map edges (player spawn zones)
        const MARGIN = 10;
        const clusterCount = 12 + Math.floor(Math.random() * 8);

        for (let i = 0; i < clusterCount; i++) {
            const cx = MARGIN + Math.floor(Math.random() * (this.width - MARGIN * 2));
            const cy = MARGIN + Math.floor(Math.random() * (this.height - MARGIN * 2));
            const radius = 2 + Math.floor(Math.random() * 4);

            for (let y = cy - radius; y <= cy + radius; y++) {
                for (let x = cx - radius; x <= cx + radius; x++) {
                    if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
                    if (this.getTile(x, y) !== TILE.GRASS) continue;
                    const dist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
                    if (dist <= radius) {
                        this.setTile(x, y, TILE.FOREST);
                    }
                }
            }
        }
    }

    /**
     * Place 2 gold and 2 stone deposits near each starting position.
     * @param {Array<{x: number, y: number}>} centers - [playerStart, aiStart]
     */
    placeStartingResources(centers) {
        const depositTypes = [
            { type: TILE.GOLD_DEPOSIT, amount: GOLD_AMOUNT, count: 2 },
            { type: TILE.STONE_DEPOSIT, amount: STONE_AMOUNT, count: 2 }
        ];
        const RADIUS = 6; // tiles away from the town center

        centers.forEach(center => {
            depositTypes.forEach(({ type, amount, count }) => {
                let placed = 0;
                let attempts = 0;
                while (placed < count && attempts < 300) {
                    attempts++;
                    const dx = Math.floor(Math.random() * (RADIUS * 2 + 1)) - RADIUS;
                    const dy = Math.floor(Math.random() * (RADIUS * 2 + 1)) - RADIUS;
                    const tx = center.x + dx;
                    const ty = center.y + dy;
                    // Must be buildable (grass/dirt) and not already a deposit
                    if (this.isBuildable(tx, ty) && !this.resourceDeposits.has(`${tx},${ty}`)) {
                        this.setTile(tx, ty, type);
                        this.resourceDeposits.set(`${tx},${ty}`, { type, amount });
                        placed++;
                    }
                }
                if (placed < count) {
                    console.warn(`Only placed ${placed}/${count} ${TILE[type]} deposits near`, center);
                }
            });
        });
    }

    _placeResources() {
        // Place gold and stone deposits away from water and edges
        const deposits = [
            { type: TILE.GOLD_DEPOSIT,  count: 6, amount: GOLD_AMOUNT  },
            { type: TILE.STONE_DEPOSIT, count: 6, amount: STONE_AMOUNT }
        ];

        deposits.forEach(({ type, count, amount }) => {
            let placed = 0;
            let attempts = 0;
            while (placed < count && attempts < 500) {
                attempts++;
                const x = 5 + Math.floor(Math.random() * (this.width - 10));
                const y = 5 + Math.floor(Math.random() * (this.height - 10));
                if (this.getTile(x, y) === TILE.GRASS) {
                    this.setTile(x, y, type);
                    this.resourceDeposits.set(`${x},${y}`, { type, amount });
                    placed++;
                }
            }
        });
    }

    // ─── TILE RENDERING AND TEXTURES ───

    _renderTiles() {
        // Render tiles in isometric order — back to front (painter's algorithm)
        // In isometric: render row by row, top to bottom
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this._renderTile(x, y);
            }
        }
    }

    _renderTile(tileX, tileY) {
        const tile = this.getTile(tileX, tileY);
        const textureKey = this._getTileTexture(tile);
        const { x: screenX, y: screenY } = tileToScreen(tileX, tileY);

        const sprite = this.scene.add.image(screenX, screenY, textureKey);
        sprite.setOrigin(0.5, 1);  // Anchor at bottom-center for isometric

        // Depth sorting — tiles further back render behind those in front
        sprite.setDepth(tileY * this.width + tileX);

        this.tileSprites[tileY * this.width + tileX] = sprite;
    }

    _getTileTexture(tileType) {
        // Map tile type to asset key loaded in BootScene
        const textureMap = {
            [TILE.GRASS]:          'tile_grass',
            [TILE.WATER_DEEP]:     'tile_water_deep',
            [TILE.WATER_SHALLOW]:  'tile_water_shallow',
            [TILE.DIRT]:           'tile_dirt',
            [TILE.FOREST]:         'tile_forest',
            [TILE.GOLD_DEPOSIT]:   'tile_gold',
            [TILE.STONE_DEPOSIT]:  'tile_stone',
        };
        return textureMap[tileType] || 'tile_grass';
    }

    // ─── DEPTH SORTING UTILITY ───
    // Call this to get the correct depth value for any world object
    // Ensures units always render above tiles at the same position
    getDepth(tileX, tileY, layer = 0) {
        // layer 0 = tiles, layer 1 = buildings, layer 2 = units, layer 3 = UI elements
        return (tileY * this.width + tileX) * 10 + layer;
    }
}