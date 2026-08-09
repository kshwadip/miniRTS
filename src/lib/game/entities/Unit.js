import { tileToScreen, tileDistance } from '../utils/IsoMath.js';
import { STAT_SCALE, UNIT_TYPE, MAP_WIDTH, MAP_HEIGHT } from '../utils/Constants.js';
import { StatSystem } from '../utils/StatSystem.js';

export class Unit {
    constructor(scene, tileX, tileY, owner, type, baseStats) {
        this.scene  = scene;
        this.tileX  = tileX;       // Integer — game logic position
        this.tileY  = tileY;       // Integer — game logic position
        this.owner  = owner;       // 0 = player, 1 = AI
        this.type   = type;
        this.alive  = true;

        // ─── STATS — all stored as scaled integers ───
        // e.g. 10 attack stored as 10 * STAT_SCALE = 1000
        this.maxHp      = baseStats.hp    * STAT_SCALE;
        this.currentHp  = this.maxHp;
        this.attack     = baseStats.attack * STAT_SCALE;
        this.defense    = baseStats.defense * STAT_SCALE;
        this.attackRange = baseStats.range;  // In tiles — stays integer
        this.moveSpeed  = baseStats.speed;   // Tiles per tick — integer

        // ─── CAPABILITIES ───
        this.canSwim     = baseStats.canSwim   || false;
        this.isCavalry   = baseStats.isCavalry || false;
        this.isSubmerged = false;

        // ─── STATE ───
        this.path         = [];        // Array of {tileX, tileY} waypoints
        this.target       = null;      // Current attack target (unit or building)
        this.task         = null;      // Current task (gather, build, etc.)
        this.sneakStance  = false;
        this.stance       = 'aggressive'; // aggressive | defensive | stand_ground

        // ─── SNEAK OUTLINE ───
        // Each unit has an outline sprite shown to enemies when not sneaking
        // For MVP: just control alpha of the main sprite
        this.outlineVisible = true;

        // ─── VISUALS ───
        const { x, y } = tileToScreen(tileX, tileY);
        this.sprite = scene.add.sprite(x, y, this._getSpriteKey());
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(this._calculateDepth());

        // Health bar
        this.healthBar = scene.add.graphics();
        this._updateHealthBar();

        // Owner color tint — player = blue tint, AI = red tint
        this.sprite.setTint(owner === 0 ? 0x8888ff : 0xff8888);
    }

    // ─── MOVEMENT ───

    // Set a path of tile waypoints to walk
    setPath(waypoints) {
        this.path = [...waypoints];
    }

    // Called every game tick
    tickMove() {
        if (this.path.length === 0) return;
        if (this.sneakStance) {
            // Moving breaks sneak stance
            this.setSneakStance(false);
        }

        const next = this.path[0];

        // Check if next tile is walkable for this unit type
        const map = this.scene.tileMap;
        if (!map.isWalkable(next.tileX, next.tileY, this.canSwim, this.isCavalry)) {
            this.path = []; // Path blocked — stop and recalculate later
            return;
        }

        // Move to next waypoint
        this.tileX = next.tileX;
        this.tileY = next.tileY;
        this.path.shift();

        // Update visual position
        this._updateSpritePosition();
    }

    // ─── COMBAT ───

    takeDamage(rawDamage) {
        // Fixed point damage calculation
        // rawDamage and defense are both scaled integers
        const mitigated = StatSystem.mitigate(rawDamage, this.defense);
        this.currentHp = Math.max(0, this.currentHp - mitigated);
        this._updateHealthBar();

        if (this.currentHp === 0) {
            this.die();
        }
    }

    canAttack(target) {
        if (!target || !target.alive) return false;
        const dist = tileDistance(this.tileX, this.tileY, target.tileX, target.tileY);
        return dist <= this.attackRange;
    }

    tickAttack() {
        if (!this.target || !this.canAttack(this.target)) return;
        this.target.takeDamage(this.attack);
    }

    die() {
        this.alive = false;
        this.sprite.destroy();
        this.healthBar.destroy();
    }

    // ─── SNEAK STANCE ───

    setSneakStance(active) {
        this.sneakStance = active;
        // Visual: hide outline for enemy players
        // For now: reduce alpha to signal to developer during testing
        if (active) {
            this.outlineVisible = false;
            this.sprite.setAlpha(0.5); // Placeholder — will be per-player visibility
        } else {
            this.outlineVisible = true;
            this.sprite.setAlpha(1.0);
        }
    }

    // ─── SWIMMING ───

    submerge() {
        if (!this.canSwim) return;
        this.isSubmerged = true;
        this.sprite.setAlpha(0.3); // Partially hidden underwater
    }

    surface() {
        this.isSubmerged = false;
        this.sprite.setAlpha(1.0);
    }

    // ─── INTERNALS ───

    _updateSpritePosition() {
        const { x, y } = tileToScreen(this.tileX, this.tileY);
        // Smooth visual interpolation — tween to new position
        // The tween is cosmetic only — game logic already moved the unit
        this.scene.tweens.add({
            targets: this.sprite,
            x: x,
            y: y,
            duration: 100,    // ms — fast enough to feel responsive
            ease: 'Linear'
        });
        this.sprite.setDepth(this._calculateDepth());
        this._updateHealthBar();
    }

    _calculateDepth() {
        // Units render above tiles at the same position
        return (this.tileY * MAP_WIDTH + this.tileX) * 10 + 2;
    }

    _updateHealthBar() {
        this.healthBar.clear();
        if (this.currentHp === this.maxHp) return; // Don't show full health bars
        const { x, y } = tileToScreen(this.tileX, this.tileY);
        const barWidth = 32;
        const pct = this.currentHp / this.maxHp; // Float only for display
        this.healthBar.fillStyle(0x333333);
        this.healthBar.fillRect(x - 16, y - 40, barWidth, 4);
        this.healthBar.fillStyle(pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffff00 : 0xff0000);
        this.healthBar.fillRect(x - 16, y - 40, Math.floor(barWidth * pct), 4);
        this.healthBar.setDepth(this._calculateDepth() + 1);
    }

    _getSpriteKey() {
        return `unit_${this.type}_${this.owner === 0 ? 'blue' : 'red'}`;
    }
}