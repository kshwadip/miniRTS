// src/lib/game/systems/UnitManager.js
import { UNIT_TYPE } from '../utils/Constants.js';
import { Villager }  from '../entities/Villager.js';
// import { Infantry }  from '../entities/Infantry.js';
// import { Ranged }    from '../entities/Ranged.js';
// import { Cavalry }   from '../entities/Cavalry.js';

export class UnitManager {
    constructor(scene) {
        this.scene  = scene;
        this.units  = [];       // All units — both players
        this._nextId = 0;
    }

    // ─── CREATION ────────────────────────────────────────────────────────────

    createUnit(owner, type, tileX, tileY) {
        const unit = this._buildUnit(owner, type, tileX, tileY);
        if (!unit) return null;

        unit.id = this._nextId++;
        this.units.push(unit);
        return unit;
    }

    _buildUnit(owner, type, tileX, tileY) {
        switch (type) {
            case UNIT_TYPE.VILLAGER:  return new Villager (this.scene, tileX, tileY, owner);
            // case UNIT_TYPE.INFANTRY:  return new Infantry (this.scene, tileX, tileY, owner);
            // case UNIT_TYPE.RANGED:    return new Ranged   (this.scene, tileX, tileY, owner);
            // case UNIT_TYPE.CAVALRY:   return new Cavalry  (this.scene, tileX, tileY, owner);
            default:
                console.warn(`[UnitManager] Unknown unit type: ${type}`);
                return null;
        }
    }

    // ─── QUERIES ─────────────────────────────────────────────────────────────

    getAllUnits() {
        return this.units.filter(u => u.alive);
    }

    getUnitsForOwner(owner) {
        return this.units.filter(u => u.alive && u.owner === owner);
    }

    getUnitById(id) {
        return this.units.find(u => u.id === id && u.alive) || null;
    }

    // Returns first player-owned unit standing on this exact tile
    getUnitAtTile(owner, tileX, tileY) {
        return this.units.find(u =>
            u.alive &&
            u.owner  === owner &&
            u.tileX  === tileX &&
            u.tileY  === tileY
        ) || null;
    }

    // Returns all units within tile radius of a position
    getUnitsInRadius(tileX, tileY, radius, owner = null) {
        return this.units.filter(u => {
            if (!u.alive) return false;
            if (owner !== null && u.owner !== owner) return false;
            const dist = Math.max(
                Math.abs(u.tileX - tileX),
                Math.abs(u.tileY - tileY)
            );
            return dist <= radius;
        });
    }

    // ─── VISIBILITY ──────────────────────────────────────────────────────────

    // Called every tick — show or hide AI units based on player fog of war
    // and sneak stance rules
    updateUnitVisibility(fogOfWar, aiUnits) {
        aiUnits.forEach(unit => {
            if (!unit.alive) return;

            const visible = fogOfWar.isVisible(unit.tileX, unit.tileY);

            if (!visible) {
                // Outside fog — completely hidden
                unit.sprite.setVisible(false);
                unit.healthBar.setVisible(false);
                return;
            }

            // Inside visible tile — check sneak stance
            if (unit.sneakStance) {
                // Sneak stance removes outline — unit invisible even in visible tile
                // Exception: if player has spies researched (post-MVP)
                unit.sprite.setVisible(false);
                unit.healthBar.setVisible(false);
            } else {
                unit.sprite.setVisible(true);
                unit.healthBar.setVisible(true);
            }
        });
    }

    // ─── RAIN PROPAGATION ────────────────────────────────────────────────────

    // Propagate rain state to all ranged units so their range adjusts
    setRaining(raining) {
        this.units.forEach(u => {
            if (u.type === UNIT_TYPE.RANGED && typeof u.setRaining === 'function') {
                u.setRaining(raining);
            }
        });
    }

    // ─── CLEANUP ─────────────────────────────────────────────────────────────

    removeDeadUnits() {
        this.units = this.units.filter(u => u.alive);
    }

    // Remove all units for an owner — called on game over
    clearOwner(owner) {
        this.units
            .filter(u => u.owner === owner)
            .forEach(u => u.die());
        this.removeDeadUnits();
    }
}
