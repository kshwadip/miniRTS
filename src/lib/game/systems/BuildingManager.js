import { tileToScreen } from '../utils/IsoMath.js';
import { STAT_SCALE, MAP_WIDTH } from '../utils/Constants.js';

// ─── BUILDING DEFINITIONS ────────────────────────────────────────────────────
// All costs in display values (unscaled)
// All stats in display values — StatSystem scales them internally

export const BUILDING_DEFS = {
    village_hall: {
        name:           'Village Hall',
        hp:             1200,
        size:           2,          // 2x2 tiles
        cost:           { wood: 0, food: 0, gold: 0, stone: 0 },  // Starting building — free
        provides:       { population: 5 },
        canProduce:     ['villager'],
        productionRate: 30,         // Ticks per unit
        spriteKey:      'building_village_hall'
    },
    training_grounds: {
        name:           'Training Grounds',
        hp:             600,
        size:           2,
        cost:           { wood: 175, food: 0, gold: 0, stone: 0 },
        provides:       { population: 0 },
        canProduce:     ['infantry'],
        productionRate: 25,
        spriteKey:      'building_training_grounds'
    },
    archery_post: {
        name:           'Archery Post',
        hp:             500,
        size:           2,
        cost:           { wood: 175, food: 0, gold: 0, stone: 0 },
        provides:       { population: 0 },
        canProduce:     ['ranged'],
        productionRate: 25,
        spriteKey:      'building_archery_post'
    },
    mount_yard: {
        name:           'Mount Yard',
        hp:             550,
        size:           2,
        cost:           { wood: 175, food: 0, gold: 0, stone: 0 },
        provides:       { population: 0 },
        canProduce:     ['cavalry'],
        productionRate: 30,
        spriteKey:      'building_mount_yard'
    },
    granary: {
        name:           'Granary',
        hp:             400,
        size:           1,
        cost:           { wood: 100, food: 0, gold: 0, stone: 0 },
        provides:       { population: 0 },
        canProduce:     [],
        productionRate: 0,
        spriteKey:      'building_granary'
    },
    woodcutters_lodge: {
        name:           "Woodcutter's Lodge",
        hp:             400,
        size:           1,
        cost:           { wood: 100, food: 0, gold: 0, stone: 0 },
        provides:       { population: 0 },
        canProduce:     [],
        productionRate: 0,
        spriteKey:      'building_woodcutters_lodge'
    },
    mining_post: {
        name:           'Mining Post',
        hp:             400,
        size:           1,
        cost:           { wood: 100, food: 0, gold: 0, stone: 0 },
        provides:       { population: 0 },
        canProduce:     [],
        productionRate: 0,
        spriteKey:      'building_mining_post'
    },
    house: {
        name:           'House',
        hp:             350,
        size:           1,
        cost:           { wood: 25, food: 0, gold: 0, stone: 0 },
        provides:       { population: 5 },
        canProduce:     [],
        productionRate: 0,
        spriteKey:      'building_house'
    }
};

// ─── UNIT COSTS — referenced by buildings when queuing production ─────────────
export const UNIT_COSTS = {
    villager: { wood: 0,  food: 50,  gold: 0,  stone: 0  },
    infantry: { wood: 0,  food: 60,  gold: 20, stone: 0  },
    ranged:   { wood: 0,  food: 40,  gold: 30, stone: 0  },
    cavalry:  { wood: 0,  food: 80,  gold: 40, stone: 0  }
};

// ─── BUILDING CLASS ──────────────────────────────────────────────────────────

class Building {
    constructor(scene, owner, type, tileX, tileY) {
        this.scene  = scene;
        this.owner  = owner;
        this.type   = type;
        this.tileX  = tileX;
        this.tileY  = tileY;
        this.alive  = true;

        const def        = BUILDING_DEFS[type];
        this.def         = def;
        this.maxHp       = def.hp * STAT_SCALE;
        this.currentHp   = this.maxHp;
        this.size        = def.size;
        this.provides    = def.provides;

        // Production queue — array of { unitType, ticksRemaining }
        this.productionQueue = [];
        this.productionRate  = def.productionRate;

        // ── Sprite ──
        const { x, y } = tileToScreen(tileX, tileY);
        this.sprite = scene.add.image(x, y, def.spriteKey);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(this._depth());

        // Owner tint — player blue, AI red
        this.sprite.setTint(owner === 0 ? 0xaaaaff : 0xffaaaa);

        // ── Health bar ──
        this.healthBar = scene.add.graphics();
        this.healthBar.setDepth(this._depth() + 1);
    }

    // ─── PRODUCTION ──────────────────────────────────────────────────────────

    // Returns { unitType } when a unit finishes training, null otherwise
    tickProduction() {
        if (this.productionQueue.length === 0) return null;

        const current = this.productionQueue[0];
        current.ticksRemaining--;

        if (current.ticksRemaining <= 0) {
            this.productionQueue.shift();
            return { unitType: current.unitType };
        }

        return null;
    }

    // Returns false if cannot afford or queue full
    queueUnit(unitType, resourceManager) {
        const MAX_QUEUE = 5;
        if (this.productionQueue.length >= MAX_QUEUE) return false;
        if (!this.def.canProduce.includes(unitType))  return false;

        const cost = UNIT_COSTS[unitType];
        if (!cost) return false;

        const spent = resourceManager.spend(this.owner, cost);
        if (!spent) return false;

        this.productionQueue.push({
            unitType,
            ticksRemaining: this.productionRate
        });

        return true;
    }

    cancelQueue(index, resourceManager) {
        if (index < 0 || index >= this.productionQueue.length) return;
        const cancelled = this.productionQueue.splice(index, 1)[0];

        // Refund 100% if not yet started, 0% if in progress (index 0)
        if (index > 0) {
            const cost = UNIT_COSTS[cancelled.unitType];
            if (cost) resourceManager.addResource(this.owner, 'food', cost.food * STAT_SCALE);
        }
    }

    getQueueProgress() {
        if (this.productionQueue.length === 0) return null;
        const current = this.productionQueue[0];
        return {
            unitType:   current.unitType,
            progress:   1 - (current.ticksRemaining / this.productionRate),
            queueDepth: this.productionQueue.length
        };
    }

    // ─── COMBAT ──────────────────────────────────────────────────────────────

    takeDamage(rawDamage) {
        // Buildings have flat damage reduction of 5 (scaled)
        const BUILDING_ARMOR = 5 * STAT_SCALE;
        const mitigated      = Math.max(STAT_SCALE / 2, rawDamage - BUILDING_ARMOR);
        this.currentHp       = Math.max(0, this.currentHp - mitigated);

        this._updateHealthBar();

        if (this.currentHp <= 0) {
            this.destroy();
        }
    }

    // ─── SPAWN POINT ─────────────────────────────────────────────────────────

    // Returns the best adjacent tile to spawn a newly trained unit
    getSpawnTile(tileMap) {
        const offsets = [
            { dx:  0, dy:  1 },
            { dx:  1, dy:  0 },
            { dx: -1, dy:  0 },
            { dx:  0, dy: -1 },
            { dx:  1, dy:  1 },
            { dx: -1, dy:  1 },
            { dx:  1, dy: -1 },
            { dx: -1, dy: -1 }
        ];

        for (const { dx, dy } of offsets) {
            const tx = this.tileX + dx;
            const ty = this.tileY + dy;
            if (tileMap.isWalkable(tx, ty, false, false)) {
                return { tileX: tx, tileY: ty };
            }
        }

        return { tileX: this.tileX, tileY: this.tileY }; // Fallback
    }

    // ─── TILE FOOTPRINT ──────────────────────────────────────────────────────

    // Returns all tiles this building occupies
    // Used for placement validation and pathfinding obstacle marking
    getFootprint() {
        const tiles = [];
        for (let dy = 0; dy < this.size; dy++) {
            for (let dx = 0; dx < this.size; dx++) {
                tiles.push({ tileX: this.tileX + dx, tileY: this.tileY + dy });
            }
        }
        return tiles;
    }

    occupiesTile(tileX, tileY) {
        return this.getFootprint().some(t => t.tileX === tileX && t.tileY === tileY);
    }

    // ─── INTERNALS ───────────────────────────────────────────────────────────

    _depth() {
        return (this.tileY * MAP_WIDTH + this.tileX) * 10 + 1;
    }

    _updateHealthBar() {
        this.healthBar.clear();
        if (this.currentHp >= this.maxHp) return;

        const { x, y } = tileToScreen(this.tileX, this.tileY);
        const barW  = 48;
        const pct   = this.currentHp / this.maxHp;
        const color = pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffff00 : 0xff0000;

        this.healthBar.fillStyle(0x333333);
        this.healthBar.fillRect(x - 24, y - 72, barW, 5);
        this.healthBar.fillStyle(color);
        this.healthBar.fillRect(x - 24, y - 72, Math.floor(barW * pct), 5);
    }

    destroy() {
        this.alive = false;
        this.sprite.destroy();
        this.healthBar.destroy();
    }
}

// ─── BUILDING MANAGER ────────────────────────────────────────────────────────

export class BuildingManager {
    constructor(scene) {
        this.scene     = scene;
        this.buildings = [];    // All buildings — both players
        this._nextId   = 0;
    }

    // ─── CREATION ────────────────────────────────────────────────────────────

    createBuilding(owner, type, tileX, tileY) {
        if (!BUILDING_DEFS[type]) {
            console.warn(`[BuildingManager] Unknown building type: ${type}`);
            return null;
        }

        const building    = new Building(this.scene, owner, type, tileX, tileY);
        building.id       = this._nextId++;
        this.buildings.push(building);
        return building;
    }

    // Validate placement before building — called by villager build action
    canPlace(owner, type, tileX, tileY, tileMap, resourceManager) {
        const def = BUILDING_DEFS[type];
        if (!def) return { ok: false, reason: 'Unknown building type' };

        // Check resources
        const affordable = resourceManager.canAfford(owner, def.cost);
        if (!affordable) return { ok: false, reason: 'Cannot afford' };

        // Check all tiles in footprint are walkable and unoccupied
        const size = def.size;
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const tx = tileX + dx;
                const ty = tileY + dy;

                if (!tileMap.isWalkable(tx, ty, false, false)) {
                    return { ok: false, reason: 'Tile not walkable' };
                }

                if (this.getBuildingAtTile(null, tx, ty)) {
                    return { ok: false, reason: 'Tile occupied by another building' };
                }
            }
        }

        return { ok: true };
    }

    // ─── QUERIES ─────────────────────────────────────────────────────────────

    getAllBuildings() {
        return this.buildings.filter(b => b.alive);
    }

    getBuildingsForOwner(owner) {
        return this.buildings.filter(b => b.alive && b.owner === owner);
    }

    // Returns first building occupying this tile regardless of owner
    // Pass null as owner to check all buildings
    getBuildingAtTile(owner, tileX, tileY) {
        return this.buildings.find(b => {
            if (!b.alive) return false;
            if (owner !== null && b.owner !== owner) return false;
            return b.occupiesTile(tileX, tileY);
        }) || null;
    }

    getBuildingById(id) {
        return this.buildings.find(b => b.id === id && b.alive) || null;
    }

    // Nearest building of a given type for a given owner
    // Used by villagers finding their dropoff point
    getNearestBuilding(owner, type, fromTileX, fromTileY) {
        let nearest     = null;
        let nearestDist = Infinity;

        this.getBuildingsForOwner(owner).forEach(b => {
            if (b.type !== type) return;
            const dist = Math.max(
                Math.abs(b.tileX - fromTileX),
                Math.abs(b.tileY - fromTileY)
            );
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest     = b;
            }
        });

        return nearest;
    }

    // Total population capacity from all buildings for an owner
    getPopulationCap(owner) {
        return this.getBuildingsForOwner(owner)
            .reduce((total, b) => total + (b.provides.population || 0), 0);
    }

    // ─── TICK ────────────────────────────────────────────────────────────────

    // Call every game tick — processes production queues for all buildings
    // Returns array of { owner, unitType, tileX, tileY } for units ready to spawn
    tick(tileMap) {
        const readyUnits = [];

        this.getAllBuildings().forEach(b => {
            const result = b.tickProduction();
            if (!result) return;

            const spawnTile = b.getSpawnTile(tileMap);
            readyUnits.push({
                owner:    b.owner,
                unitType: result.unitType,
                tileX:    spawnTile.tileX,
                tileY:    spawnTile.tileY
            });
        });

        return readyUnits;
    }

    // ─── CLEANUP ─────────────────────────────────────────────────────────────

    removeDestroyedBuildings() {
        this.buildings = this.buildings.filter(b => b.alive);
    }
}
