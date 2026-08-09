import { STAT_SCALE } from '../utils/Constants.js';

export class ResourceManager {
    constructor() {
        // Resources stored as scaled integers
        // 500 wood displayed = 500 * STAT_SCALE stored internally
        this.resources = {
            0: { wood: 20000, food: 20000, gold: 10000, stone: 5000 },  // Player
            1: { wood: 20000, food: 20000, gold: 10000, stone: 5000 }   // AI
        };

        // Map deposits — tileKey -> remaining amount
        this.deposits = new Map();

        // Callbacks for UI updates
        this.onResourceChange = null;
    }

    // ─── RESOURCE ACCESS ───

    // Returns display value (unscaled integer)
    getDisplay(owner, type) {
        return Math.floor(this.resources[owner][type] / STAT_SCALE);
    }

    // Internal scaled value
    get(owner, type) {
        return this.resources[owner][type];
    }

    // Add scaled amount
    addResource(owner, type, scaledAmount) {
        this.resources[owner][type] += scaledAmount;
        this._notifyChange(owner);
    }

    // Spend resources — returns true if successful
    spend(owner, costs) {
        // costs = { wood: 100, food: 0, gold: 50, stone: 0 } in display values
        // Check all first — atomic operation
        for (const [type, amount] of Object.entries(costs)) {
            if (amount <= 0) continue;
            if (this.resources[owner][type] < amount * STAT_SCALE) {
                return false; // Cannot afford
            }
        }
        // Deduct
        for (const [type, amount] of Object.entries(costs)) {
            if (amount <= 0) continue;
            this.resources[owner][type] -= amount * STAT_SCALE;
        }
        this._notifyChange(owner);
        return true;
    }

    // ─── DEPOSITS ───

    registerDeposit(tileX, tileY, amount) {
        this.deposits.set(`${tileX},${tileY}`, amount * STAT_SCALE);
    }

    deplete(tileX, tileY, scaledAmount) {
        const key = `${tileX},${tileY}`;
        const current = this.deposits.get(key) || 0;
        const newAmount = Math.max(0, current - scaledAmount);
        this.deposits.set(key, newAmount);
        return newAmount === 0; // Returns true if depleted
    }

    getDepositAmount(tileX, tileY) {
        return this.deposits.get(`${tileX},${tileY}`) || 0;
    }

    _notifyChange(owner) {
        if (this.onResourceChange) {
            this.onResourceChange(owner, {
                wood:  this.getDisplay(owner, 'wood'),
                food:  this.getDisplay(owner, 'food'),
                gold:  this.getDisplay(owner, 'gold'),
                stone: this.getDisplay(owner, 'stone')
            });
        }
    }
}