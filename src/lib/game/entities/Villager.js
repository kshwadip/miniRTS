import { Unit } from './Unit.js';
import { UNIT_TYPE } from '../utils/Constants.js';

const VILLAGER_STATS = {
    hp:       50,
    attack:   3,
    defense:  1,
    range:    1,     // Melee
    speed:    1,     // 1 tile per tick
    canSwim:  true,
    isCavalry: false
};

export class Villager extends Unit {
    constructor(scene, tileX, tileY, owner) {
        super(scene, tileX, tileY, owner, UNIT_TYPE.VILLAGER, VILLAGER_STATS);

        // Gather state
        this.gatherTarget    = null;  // Resource tile or building being gathered
        this.carryingResource = null; // { type, amount } or null
        this.gatherRate      = 25;   // Resources gathered per gather tick (scaled)
        this.carryCapacity   = 10;   // Max resources carried before needing dropoff
    }

    // Assign this villager to gather at a resource tile
    assignGather(resourceTileX, resourceTileY, resourceType, dropoffBuilding) {
        this.task            = 'gather';
        this.gatherTarget    = { tileX: resourceTileX, tileY: resourceTileY, resourceType };
        this.dropoffBuilding = dropoffBuilding;
        this.carryingResource = { type: resourceType, amount: 0 };
    }

    tickGather(resourceManager) {
        if (this.task !== 'gather' || !this.gatherTarget) return;

        // Check if at the resource tile
        const dist = Math.max(
            Math.abs(this.tileX - this.gatherTarget.tileX),
            Math.abs(this.tileY - this.gatherTarget.tileY)
        );

        if (dist <= 1) {
            // Gather — add to carry
            const gathered = Math.min(this.gatherRate, this.carryCapacity - this.carryingResource.amount);
            this.carryingResource.amount += gathered;
            resourceManager.deplete(this.gatherTarget.tileX, this.gatherTarget.tileY, gathered);

            // If carrying capacity reached, head to dropoff
            if (this.carryingResource.amount >= this.carryCapacity) {
                this.task = 'dropoff';
                if (this.dropoffBuilding) {
                    const path = this.scene.pathFinder.findPath(
                        this.tileX, this.tileY,
                        this.dropoffBuilding.tileX, this.dropoffBuilding.tileY
                    );
                    this.setPath(path);
                }
            }
        } else {
            // Not at resource tile yet — move toward it
            const path = this.scene.pathFinder.findPath(
                this.tileX, this.tileY,
                this.gatherTarget.tileX, this.gatherTarget.tileY
            );
            this.setPath(path);
        }
    }

    tickDropoff(resourceManager) {
        if (this.task !== 'dropoff' || !this.dropoffBuilding) return;

        const dist = Math.max(
            Math.abs(this.tileX - this.dropoffBuilding.tileX),
            Math.abs(this.tileY - this.dropoffBuilding.tileY)
        );

        if (dist <= 1) {
            // Drop off resources
            resourceManager.addResource(
                this.owner,
                this.carryingResource.type,
                this.carryingResource.amount
            );
            this.carryingResource.amount = 0;
            // Return to gathering
            this.task = 'gather';
            const path = this.scene.pathFinder.findPath(
                this.tileX, this.tileY,
                this.gatherTarget.tileX, this.gatherTarget.tileY
            );
            this.setPath(path);
        }
    }
}