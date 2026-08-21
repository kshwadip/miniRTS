<script>
    import { onMount, onDestroy } from 'svelte';
    import {
        resources, population, isNight, isRaining,
        selectedUnits, selectedResource, playerName, civName
    } from '$lib/stores/gameState.js';
    import { UNIT_COSTS }        from '$lib/game/systems/BuildingManager.js';
    import { MAP_WIDTH, MAP_HEIGHT } from '$lib/game/utils/Constants.js';
    import Minimap from './Minimap.svelte';

    export let game = null;

    function getScene() {
        if (!game) return null;
        return game.scene.getScene('GameScene');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fullscreen
    // ─────────────────────────────────────────────────────────────────────────
    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Unit display data (was UnitPanel.svelte)
    // ─────────────────────────────────────────────────────────────────────────
    const UNIT_LABELS = {
        villager: 'Villager',
        infantry: 'Infantry',
        ranged:   'Ranged',
        cavalry:  'Cavalry'
    };

    const UNIT_ICONS = {
        villager: '👷',
        infantry: '⚔️',
        ranged:   '🏹',
        cavalry:  '🐴'
    };

    // Pulled from the unit class defs (Villager/Infantry/Ranged/Cavalry.js)
    // so the numbers shown here can never drift from the sim.
    const UNIT_STATS = {
        villager: { attack: 3,  defense: 1, range: 1, speed: 1 },
        infantry: { attack: 12, defense: 6, range: 1, speed: 1 },
        ranged:   { attack: 10, defense: 2, range: 5, speed: 1 },
        cavalry:  { attack: 14, defense: 4, range: 1, speed: 2 }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Resource display data — structural stub only. No resource-node
    // selection exists in the engine yet; this just keeps the HUD ready
    // for it. Wire it up by setting `selectedResource` from your click
    // handler with { type, amount, max }.
    // ─────────────────────────────────────────────────────────────────────────
    const RESOURCE_LABELS = {
        wood:  'Forest Tree',
        food:  'Forage Bush',
        gold:  'Gold Mine',
        stone: 'Stone Deposit'
    };

    const RESOURCE_ICONS = {
        wood:  '🌳',
        food:  '🌾',
        gold:  '⛏️',
        stone: '🪨'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Command handlers — call public methods on GameScene
    // ─────────────────────────────────────────────────────────────────────────
    function cmdDeselect() {
        getScene()?.commandClearSelection();
    }

    function cmdStop() {
        getScene()?.commandStop();
    }

    function cmdSneak() {
        getScene()?.commandSneakStance();
    }

    function cmdSubmerge() {
        getScene()?.commandSubmerge();
    }

    function cmdBuild() {
        // Post-MVP: opens the build submenu
        getScene()?.commandOpenBuildMenu?.();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Derived selection state
    // ─────────────────────────────────────────────────────────────────────────
    $: units       = $selectedUnits;
    $: unitCount   = units.length;
    $: firstType   = units[0]?.type || null;
    $: allSameType = units.every(u => u.type === firstType);

    // Supports either a plain 0-100 `hp` percentage on the unit, or a
    // `currentHp`/`maxHp` pair — whichever the engine is populating.
    function hpPercent(u) {
        if (u.maxHp) return Math.floor((u.currentHp / u.maxHp) * 100);
        return u.hp ?? 100;
    }

    $: avgHp = unitCount > 0
        ? Math.floor(units.reduce((s, u) => s + hpPercent(u), 0) / unitCount)
        : 0;

    $: canSwim    = firstType && firstType !== 'cavalry';
    $: canSneak   = firstType && firstType !== 'cavalry';
    $: isVillager = firstType === 'villager';

    // 'unit' | 'resource' | 'none' — drives all three panels below
    $: selectionKind = unitCount > 0 ? 'unit' : ($selectedResource ? 'resource' : 'none');

    const TILE_COLORS = {
        0: '#4a7c3f', // Grass
        1: '#1a3a6e', // Water deep
        2: '#4a90b8', // Water shallow
        3: '#9b7653', // Dirt
        4: '#8a8a8a', // Stone path
        5: '#2d5a1b', // Forest
        6: '#d4a017', // Gold
        7: '#6a6a6a', // Stone deposit
    };

    const UNIT_COLORS = {
        player: '#4488ff',
        ai:     '#ff4444'
    };

    const BUILDING_COLORS = {
        player: '#2255cc',
        ai:     '#cc2222'
    };
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

    <!-- Bottom bar: command panel | info panel | minimap -->
    {#if selectionKind !== 'none'}
    <div class="bottom-bar">

        <!-- ── LEFT: command panel ── -->
        <div class="command-panel">
            {#if selectionKind === 'unit'}
                <div class="command-grid">
                    {#if isVillager}
                        <button class="cmd-btn build" on:click={cmdBuild} title="Build">
                            <span>🏗</span>
                            <label for='build'>Build</label>
                        </button>
                    {/if}
                    <button class="cmd-btn deselect" on:click={cmdDeselect} title="Deselect">
                        <span>✕</span>
                        <label for='deselect'>Deselect</label>
                    </button>

                    <button class="cmd-btn" on:click={cmdStop} title="Stop">
                        <span>■</span>
                        <label for='stop'>Stop</label>
                    </button>

                    {#if canSneak}
                        <button class="cmd-btn" on:click={cmdSneak} title="Sneak Stance">
                            <span>👁</span>
                            <label for='sneak'>Sneak</label>
                        </button>
                    {/if}

                    {#if canSwim}
                        <button class="cmd-btn" on:click={cmdSubmerge} title="Submerge / Surface">
                            <span>🌊</span>
                            <label for='dive'>Dive</label>
                        </button>
                    {/if}

                    
                </div>
            {/if}
            <!-- selectionKind === 'resource' → left blank, resources aren't ownable/commandable -->
        </div>

        <!-- ── MIDDLE: info panel ── -->
        <div class="info-panel">

            {#if selectionKind === 'unit'}
                {#if unitCount === 1}
                    <!-- Single unit: big portrait + stat block -->
                    <div class="single-unit">
                        <div class="portrait large">
                            <span class="icon">{UNIT_ICONS[firstType] || '?'}</span>
                        </div>
                        <div class="unit-details">
                            <span class="unit-name">{UNIT_LABELS[firstType] || firstType}</span>
                            <div class="hp-line">
                                <div class="hp-bar-lg">
                                    <div
                                        class="hp-fill-lg"
                                        class:low={hpPercent(units[0]) < 33}
                                        class:mid={hpPercent(units[0]) >= 33 && hpPercent(units[0]) < 66}
                                        style="width: {hpPercent(units[0])}%"
                                    ></div>
                                </div>
                                <span class="hp-text">
                                    {#if units[0].maxHp}
                                        {units[0].currentHp}/{units[0].maxHp}
                                    {:else}
                                        {hpPercent(units[0])}/100
                                    {/if}
                                </span>
                            </div>
                            <div class="stat-row">
                                <span class="stat">⚔️ {UNIT_STATS[firstType]?.attack ?? '-'}</span>
                                <span class="stat">🛡 {UNIT_STATS[firstType]?.defense ?? '-'}</span>
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- Multiple units: portrait grid -->
                    <div class="portraits">
                        {#each units.slice(0, 9) as unit}
                            <div class="portrait" title={UNIT_LABELS[unit.type]}>
                                <span class="icon">{UNIT_ICONS[unit.type] || '?'}</span>
                                <div class="hp-bar">
                                    <div
                                        class="hp-fill"
                                        class:low={hpPercent(unit) < 33}
                                        class:mid={hpPercent(unit) >= 33 && hpPercent(unit) < 66}
                                        style="width: {hpPercent(unit)}%"
                                    ></div>
                                </div>
                            </div>
                        {/each}
                        {#if unitCount > 9}
                            <div class="portrait overflow">+{unitCount - 9}</div>
                        {/if}
                    </div>
                    <div class="unit-info-row">
                        {#if allSameType && firstType}
                            <span class="unit-name">{UNIT_LABELS[firstType]}</span>
                            <span class="unit-count">x{unitCount}</span>
                        {:else}
                            <span class="unit-name">Mixed ({unitCount})</span>
                        {/if}
                        <span class="unit-hp">HP {avgHp}%</span>
                    </div>
                {/if}

                <div class="owner-line">
                    <span class="civ-name">{$civName}</span>
                    <span class="player-name">{$playerName}</span>
                </div>

            {:else if selectionKind === 'resource'}
                <!-- Structural stub — populate `selectedResource` to activate -->
                <div class="single-unit">
                    <div class="portrait large">
                        <span class="icon">{RESOURCE_ICONS[$selectedResource?.type] || '❔'}</span>
                    </div>
                    <div class="unit-details">
                        <span class="unit-name">
                            {RESOURCE_LABELS[$selectedResource?.type] || 'Resource'}
                        </span>
                        <div class="stat-row">
                            <span class="stat">
                                🎒 {$selectedResource?.amount ?? '—'}{#if $selectedResource?.max}/{$selectedResource.max}{/if}
                            </span>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
    {/if}

    <Minimap {game}/>
</div>

<style>
    .hud {
        position: absolute;
        inset: 0;
        pointer-events: none; /* Clicks pass through to Phaser */
    }

    button {
        pointer-events: all;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Resources (unchanged, top-left)
       ───────────────────────────────────────────────────────────────────── */
    .resources {
        position: absolute;
        top: 0px;
        left: 0px;
        display: flex;
        gap: 12px;
        background: rgba(0,0,0,0.6);
        padding: 4px;
        border-radius: 4px;
        color: white;
        font-family: monospace;
        font-size: 14px;
    }

    .hud.night .resources {
        background: rgba(0, 0, 30, 0.8);
    }

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

    /* ─────────────────────────────────────────────────────────────────────
       Bottom bar — three zones, AoE2-style: command | info | minimap
       ───────────────────────────────────────────────────────────────────── */
    .bottom-bar {
        position:  absolute;
        left:      12px;
        right:     12px;
        bottom:    12px;
        display:   flex;
        align-items: flex-end;
        gap:       10px;
        pointer-events: none;
    }

    /* ── Command panel ── */
    .command-panel {
        flex: 0 0 220px;
        min-height: 140px;
        background: rgba(10, 15, 30, 0.88);
        border: 1px solid rgba(74, 106, 138, 0.6);
        border-radius: 4px;
        padding: 8px;
        pointer-events: all;
        box-sizing: border-box;
    }

    .command-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
    }

    .cmd-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(74,106,138,0.5);
        border-radius: 4px;
        color: #ccc;
        cursor: pointer;
        gap: 2px;
        padding: 0;
        transition: background 0.1s, border-color 0.1s;
    }
    .cmd-btn:hover {
        background: rgba(74,106,138,0.3);
        border-color: rgba(74,106,138,0.9);
        color: #fff;
    }
    .cmd-btn:active { background: rgba(74,106,138,0.5); }
    .cmd-btn span  { font-size: 18px; line-height: 1; }
    .cmd-btn label { font-size: 9px; color: #aaa; cursor: pointer; }
    .cmd-btn.build     { border-color: rgba(138, 106, 74, 0.5); }
    .cmd-btn.build:hover { border-color: rgba(138, 106, 74, 0.9); }
    .cmd-btn.deselect     { border-color: rgba(138, 74, 74, 0.5); }
    .cmd-btn.deselect:hover { border-color: rgba(180, 74, 74, 0.9); }

    /* ── Info panel ── */
    .info-panel {
        flex: 1 1 auto;
        min-height: 140px;
        background: rgba(10, 15, 30, 0.88);
        border: 1px solid rgba(74, 106, 138, 0.6);
        border-radius: 4px;
        padding: 10px;
        color: #dddddd;
        font-family: monospace;
        font-size: 12px;
        pointer-events: all;
        user-select: none;
        box-sizing: border-box;
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .single-unit {
        display: flex;
        gap: 12px;
    }

    .portrait.large {
        width: 64px;
        height: 64px;
        flex: 0 0 auto;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(74,106,138,0.5);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .portrait.large .icon { font-size: 32px; }

    .unit-details {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
    }

    .unit-name { font-weight: bold; color: #eee; font-size: 14px; }
    .unit-count { color: #aaa; margin-left: 6px; }

    .hp-line {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .hp-bar-lg {
        width: 120px;
        height: 8px;
        background: #333;
        border-radius: 2px;
        overflow: hidden;
    }
    .hp-fill-lg {
        height: 100%;
        background: #00cc44;
        transition: width 0.2s;
    }
    .hp-fill-lg.mid { background: #ccaa00; }
    .hp-fill-lg.low { background: #cc2200; }
    .hp-text { font-size: 11px; color: #88cc88; }

    .stat-row {
        display: flex;
        gap: 14px;
        font-size: 12px;
    }
    .stat { color: #ccc; }

    .owner-line {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        position: absolute;
        top: 10px;
        right: 12px;
        text-align: right;
    }
    .civ-name    { font-weight: bold; color: #eee; font-size: 12px; }
    .player-name { color: #999; font-size: 11px; }

    /* multi-select portrait grid (mirrors previous UnitPanel look) */
    .portraits {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 8px;
    }

    .portrait {
        width: 44px;
        height: 44px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(74,106,138,0.5);
        border-radius: 3px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
    }
    .portrait.overflow { font-size: 11px; color: #888; }
    .portrait .icon { font-size: 20px; line-height: 1; }

    .hp-bar {
        position: absolute;
        bottom: 2px;
        left: 2px;
        right: 2px;
        height: 3px;
        background: #333;
        border-radius: 1px;
    }
    .hp-fill {
        height: 100%;
        border-radius: 1px;
        background: #00cc44;
        transition: width 0.2s;
    }
    .hp-fill.mid { background: #ccaa00; }
    .hp-fill.low { background: #cc2200; }

    .unit-info-row {
        display: flex;
        align-items: baseline;
        gap: 8px;
    }
    .unit-hp { margin-left: auto; color: #88cc88; font-size: 11px; }

    /* ─────────────────────────────────────────────────────────────────────
       Mobile — shrink aggressively
       ───────────────────────────────────────────────────────────────────── */
    @media (max-width: 2160px) {
        .bottom-bar {
            left: 4px;
            right: 4px;
            bottom: 4px;
            gap: 6px;
        }

        .command-panel {
            flex-basis: 130px;
            min-height: 100px;
            padding: 6px;
        }

        .cmd-btn span  { font-size: 14px; }
        .cmd-btn label { font-size: 7px; }

        .info-panel {
            min-height: 100px;
            padding: 6px;
            font-size: 10px;
        }

        .portrait.large { width: 44px; height: 44px; }
        .portrait.large .icon { font-size: 22px; }
        .hp-bar-lg { width: 80px; height: 6px; }
        .unit-name { font-size: 11px; }
        .stat-row { font-size: 10px; gap: 8px; }
        .owner-line { top: 6px; right: 8px; }
        .civ-name { font-size: 10px; }
        .player-name { font-size: 9px; }

        .portrait { width: 30px; height: 30px; border-width: 1px; }
        .portrait .icon { font-size: 14px; }
        .portrait.overflow { font-size: 8px; }

        @media (max-width: 400px) {
            .command-panel { flex-basis: 100px; }
            .portrait { width: 26px; height: 26px; }
            .portrait .icon { font-size: 12px; }
        }
    }
</style>