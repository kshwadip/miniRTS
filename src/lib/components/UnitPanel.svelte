<script>
    import { selectedUnits } from '$lib/stores/gameState.js';
    import { UNIT_COSTS }    from '$lib/game/systems/BuildingManager.js';

    export let game = null;

    function getScene() {
        if (!game) return null;
        return game.scene.getScene('GameScene');
    }

    // ── Unit display info ──
    const UNIT_LABELS = {
        villager:  'Villager',
        infantry:  'Infantry',
        ranged:    'Ranged',
        cavalry:   'Cavalry'
    };

    const UNIT_ICONS = {
        villager:  '👷',
        infantry:  '⚔️',
        ranged:    '🏹',
        cavalry:   '🐴'
    };

    // ── Action handlers — call public methods on GameScene ──
    function cmdStop() {
        getScene()?.commandStop();
    }

    function cmdSneak() {
        getScene()?.commandSneakStance();
    }

    function cmdSubmerge() {
        getScene()?.commandSubmerge();
    }

    // ── Derived state ──
    $: units        = $selectedUnits;
    $: count        = units.length;
    $: firstType    = units[0]?.type || null;
    $: allSameType  = units.every(u => u.type === firstType);
    $: avgHp        = count > 0
        ? Math.floor(units.reduce((s, u) => s + u.hp, 0) / count)
        : 0;

    $: canSwim      = firstType && firstType !== 'cavalry';
    $: canSneak     = firstType && firstType !== 'cavalry';
    $: isVillager   = firstType === 'villager';
</script>

{#if count > 0}
<div class="unit-panel">

    <!-- ── Unit portraits grid ── -->
    <div class="portraits">
        {#each units.slice(0, 9) as unit}
            <div class="portrait" title={UNIT_LABELS[unit.type]}>
                <span class="icon">{UNIT_ICONS[unit.type] || '?'}</span>
                <div class="hp-bar">
                    <div
                        class="hp-fill"
                        class:low={unit.hp < 33}
                        class:mid={unit.hp >= 33 && unit.hp < 66}
                        style="width: {unit.hp}%"
                    ></div>
                </div>
            </div>
        {/each}
        {#if count > 9}
            <div class="portrait overflow">+{count - 9}</div>
        {/if}
    </div>

    <!-- ── Unit info ── -->
    <div class="unit-info">
        {#if allSameType && firstType}
            <span class="unit-name">{UNIT_LABELS[firstType]}</span>
            {#if count > 1}
                <span class="unit-count">x{count}</span>
            {/if}
        {:else}
            <span class="unit-name">Mixed ({count})</span>
        {/if}
        <span class="unit-hp">HP {avgHp}%</span>
    </div>

    <!-- ── Divider ── -->
    <div class="divider"></div>

    <!-- ── Action buttons ── -->
    <div class="actions">
        <button class="action-btn" on:click={cmdStop} title="Stop">
            <span>■</span>
            <label for="stop">Stop</label>
        </button>

        {#if canSneak}
            <button class="action-btn" on:click={cmdSneak} title="Sneak Stance">
                <span>👁</span>
                <label for="sneak">Sneak</label>
            </button>
        {/if}

        {#if canSwim}
            <button class="action-btn" on:click={cmdSubmerge} title="Submerge / Surface">
                <span>🌊</span>
                <label for="dive">Dive</label>
            </button>
        {/if}

        {#if isVillager}
            <!-- Villager build buttons — post-MVP will open a build submenu -->
            <button class="action-btn build" title="Build">
                <span>🏗</span>
                <label for="build">Build</label>
            </button>
        {/if}
    </div>

</div>
{/if}

<style>
    .unit-panel {
        position:   absolute;
        bottom:     12px;
        left:       12px;
        width:      260px;
        background: rgba(10, 15, 30, 0.88);
        border:     1px solid rgba(74, 106, 138, 0.6);
        border-radius: 4px;
        padding:    10px;
        color:      #dddddd;
        font-family: monospace;
        font-size:  12px;
        pointer-events: all;
        user-select: none;
    }

    /* ── Portraits ── */
    .portraits {
        display:         flex;
        flex-wrap:       wrap;
        gap:             4px;
        margin-bottom:   8px;
    }

    .portrait {
        width:           44px;
        height:          44px;
        background:      rgba(255,255,255,0.05);
        border:          1px solid rgba(74,106,138,0.5);
        border-radius:   3px;
        display:         flex;
        flex-direction:  column;
        align-items:     center;
        justify-content: center;
        position:        relative;
    }

    .portrait.overflow {
        font-size:  11px;
        color:      #888;
    }

    .icon {
        font-size: 20px;
        line-height: 1;
    }

    .hp-bar {
        position: absolute;
        bottom:   2px;
        left:     2px;
        right:    2px;
        height:   3px;
        background: #333;
        border-radius: 1px;
    }

    .hp-fill {
        height:       100%;
        border-radius: 1px;
        background:   #00cc44;
        transition:   width 0.2s;
    }

    .hp-fill.mid  { background: #ccaa00; }
    .hp-fill.low  { background: #cc2200; }

    /* ── Info row ── */
    .unit-info {
        display:         flex;
        align-items:     baseline;
        gap:             8px;
        margin-bottom:   6px;
    }

    .unit-name  { font-weight: bold; color: #eee; }
    .unit-count { color: #aaa; }
    .unit-hp    { margin-left: auto; color: #88cc88; font-size: 11px; }

    /* ── Divider ── */
    .divider {
        height:       1px;
        background:   rgba(74, 106, 138, 0.4);
        margin-bottom: 8px;
    }

    /* ── Action buttons ── */
    .actions {
        display: flex;
        gap:     6px;
        flex-wrap: wrap;
    }

    .action-btn {
        display:        flex;
        flex-direction: column;
        align-items:    center;
        justify-content: center;
        width:          52px;
        height:         52px;
        background:     rgba(255,255,255,0.05);
        border:         1px solid rgba(74,106,138,0.5);
        border-radius:  4px;
        color:          #ccc;
        cursor:         pointer;
        gap:            2px;
        transition:     background 0.1s, border-color 0.1s;
        padding:        0;
    }

    .action-btn:hover {
        background:   rgba(74,106,138,0.3);
        border-color: rgba(74,106,138,0.9);
        color:        #fff;
    }

    .action-btn:active {
        background: rgba(74,106,138,0.5);
    }

    .action-btn span  { font-size: 18px; line-height: 1; }
    .action-btn label { font-size: 9px; color: #aaa; cursor: pointer; }

    .action-btn.build { border-color: rgba(138, 106, 74, 0.5); }
    .action-btn.build:hover { border-color: rgba(138,106,74,0.9); }
</style>
