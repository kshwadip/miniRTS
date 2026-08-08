export class Building {
    constructor(scene, tileX, tileY, owner, type, stats) {
        this.scene  = scene;
        this.tileX  = tileX;
        this.tileY  = tileY;
        this.owner  = owner;
        this.type   = type;
        this.alive  = true;

        this.maxHp      = stats.hp * STAT_SCALE;
        this.currentHp  = this.maxHp;
        this.size       = stats.size || 1;   // Tiles occupied (1x1, 2x2, etc.)

        // Production queue — array of { unitType, ticksRemaining }
        this.productionQueue = [];
        this.productionRate  = stats.productionRate || 30; // Ticks to train one unit

        const { x, y } = tileToScreen(tileX, tileY);
        this.sprite = scene.add.image(x, y, `building_${type}`);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth((tileY * MAP_WIDTH + tileX) * 10 + 1);
        this.sprite.setTint(owner === 0 ? 0xaaaaff : 0xffaaaa);
    }

    // Add unit to production queue
    queueUnit(unitType, resourceManager, unitCosts) {
        if (!resourceManager.spend(this.owner, unitCosts[unitType])) {
            return false; // Cannot afford
        }
        this.productionQueue.push({
            unitType,
            ticksRemaining: this.productionRate
        });
        return true;
    }

    // Called every tick — process production
    tickProduction(unitManager) {
        if (this.productionQueue.length === 0) return null;

        const current = this.productionQueue[0];
        current.ticksRemaining--;

        if (current.ticksRemaining <= 0) {
            this.productionQueue.shift();
            // Spawn unit adjacent to building
            const spawnTile = this._findSpawnTile();
            if (spawnTile) {
                return unitManager.createUnit(
                    this.owner,
                    current.unitType,
                    spawnTile.tileX,
                    spawnTile.tileY
                );
            }
        }
        return null;
    }

    takeDamage(rawDamage) {
        const mitigated = Math.max(0, rawDamage - 500); // Buildings have flat 5 defense (scaled)
        this.currentHp  = Math.max(0, this.currentHp - mitigated);
        if (this.currentHp === 0) this.destroy();
    }

    destroy() {
        this.alive = false;
        this.sprite.destroy();
    }

    _findSpawnTile() {
        // Find a walkable tile adjacent to this building
        const offsets = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
        ];
        for (const { dx, dy } of offsets) {
            const tx = this.tileX + dx;
            const ty = this.tileY + dy;
            if (this.scene.tileMap.isWalkable(tx, ty, false, false)) {
                return { tileX: tx, tileY: ty };
            }
        }
        return null;
    }
}