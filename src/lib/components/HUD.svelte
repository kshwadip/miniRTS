<script>
    import { resources, population, isNight, isRaining, selectedUnits } from '$lib/stores/gameState.js';

    // Fullscreen toggle function
    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
</script>

<div class="hud" class:night={$isNight} class:rain={$isRaining}>

    <!-- Top Left: Resources -->
    <div class="resources">
        <span class="res wood">🌳 {$resources.wood}</span>
        <span class="res food">🌾 {$resources.food}</span>
        <span class="res gold">💰 {$resources.gold}</span>
        <span class="res stone">🗻 {$resources.stone}</span>
        <span class="pop">👥 {$population.current}/{$population.max}</span>
    </div>

    <!-- Top Right: Fullscreen Button -->
    <button class="fullscreen-btn" on:click={toggleFullscreen}>
        ⛶
    </button>

    <!-- Bottom Left: Unit Actions -->
    {#if $selectedUnits.length > 0}
    <div class="unit-panel">
        <div class="selected-units">
            {#each $selectedUnits as unit}
                <div class="unit-icon">{unit.type}</div>
            {/each}
        </div>
        <div class="action-buttons">
            <button>Move</button>
            <button>Attack</button>
            <button>Stop</button>
            {#if $selectedUnits[0]?.type === 'villager'}
                <button>Gather</button>
                <button>Build</button>
            {/if}
            <button>Sneak</button>
        </div>
    </div>
    {/if}

</div>

<style>
    .hud {
        position: absolute;
        inset: 0;
        pointer-events: none; /* Clicks pass through to Phaser */
    }

    /* Only interactive elements get pointer-events back */
    button, .action-buttons, .unit-panel {
        pointer-events: all;
    }

    .resources {
        position: absolute;
        top: 5px;
        left: 5px;
        display: flex;
        gap: 16px;
        background: rgba(0,0,0,0.6);
        padding: 8px 16px;
        border-radius: 4px;
        color: white;
        font-family: monospace;
        font-size: 14px;
    }

    .unit-panel {
        position: absolute;
        bottom: 12px;
        left: 12px;
        background: rgba(0,0,0,0.7);
        padding: 12px;
        border-radius: 4px;
        color: white;
    }

    /* Night tint on HUD elements */
    .hud.night .resources {
        background: rgba(0, 0, 30, 0.8);
    }

    /* Fullscreen button */
    .fullscreen-btn {
        position: absolute;
        top: 0px;
        right: 0px;
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        font-size: 18px;
        line-height: 1;
        padding: 6px;
        border-radius: 4px;
        cursor: pointer;
        pointer-events: all;
        transition: background 0.2s;
    }
    .fullscreen-btn:hover {
        background: rgba(255,255,255,0.2);
    }
</style>