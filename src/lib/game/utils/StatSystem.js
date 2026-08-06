import { STAT_SCALE } from './Constants.js';

export class StatSystem {
    // Apply a percentage modifier to a scaled stat
    // e.g. applyPercent(1000, 15) = 1150 (15% bonus to 10 attack)
    static applyPercent(scaledStat, percentBonus) {
        return Math.floor(scaledStat * (100 + percentBonus) / 100);
    }

    // Reduce damage by defense — both are scaled integers
    static mitigate(scaledDamage, scaledDefense) {
        const reduced = scaledDamage - scaledDefense;
        return Math.max(Math.floor(STAT_SCALE / 2), reduced); // Minimum 0.5 display damage always
    }

    // Display value — unscale for the player to read
    static display(scaledValue) {
        return Math.floor(scaledValue / STAT_SCALE);
    }

    // Scale a display value for internal use
    static scale(displayValue) {
        return displayValue * STAT_SCALE;
    }

    // Apply RPS multiplier — multiplier is percentage (150 = 1.5x)
    static applyRPS(scaledDamage, rpsMultiplier) {
        return Math.floor(scaledDamage * rpsMultiplier / 100);
    }
}