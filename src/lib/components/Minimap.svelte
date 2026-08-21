<script>
    // src/lib/components/Minimap.svelte
    import { onMount, onDestroy } from 'svelte';
    import { MAP_WIDTH, MAP_HEIGHT } from '$lib/game/utils/Constants.js';

    // The Phaser game instance — passed in from the game page
    export let game = null;

    const MINIMAP_SIZE = 180;   // px — square minimap
    const ENLARGED_SIZE = 320;  // px — on hold

    let canvas;
    let ctx;
    let isEnlarged  = false;
    let holdTimer   = null;
    let animFrame   = null;

    // ── Colors matching tile types ──
    const TILE_COLORS = {
        0: '#4a7c3f',   // Grass
        1: '#1a3a6e',   // Water deep
        2: '#4a90b8',   // Water shallow
        3: '#9b7653',   // Dirt
        4: '#8a8a8a',   // Stone path
        5: '#2d5a1b',   // Forest
        6: '#d4a017',   // Gold
        7: '#6a6a6a',   // Stone deposit
    };

    const UNIT_COLORS = {
        player: '#4488ff',
        ai:     '#ff4444'
    };

    const BUILDING_COLORS = {
        player: '#2255cc',
        ai:     '#cc2222'
    };

    function getScene() {
        if (!game) return null;
        return game.scene.getScene('GameScene');
    }

    function draw() {
        if (!ctx || !canvas) return;

        const size   = isEnlarged ? ENLARGED_SIZE : MINIMAP_SIZE;
        canvas.width  = size;
        canvas.height = size;

        const scene = getScene();
        if (!scene || !scene.tileMap) {
            // Game not ready yet — draw blank
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, size, size);
            animFrame = requestAnimationFrame(draw);
            return;
        }

        const tileMap = scene.tileMap;
        const tileW   = size / MAP_WIDTH;
        const tileH   = size / MAP_HEIGHT;

        // ── Draw tiles ──
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tileType = tileMap.getTile(x, y);
                const fog      = scene.fogOfWar;

                if (fog && !fog.isExplored(x, y)) {
                    ctx.fillStyle = '#000000';
                } else if (fog && !fog.isVisible(x, y)) {
                    // Explored but not currently visible — darkened
                    ctx.fillStyle = TILE_COLORS[tileType] || '#4a7c3f';
                    ctx.globalAlpha = 0.4;
                } else {
                    ctx.fillStyle = TILE_COLORS[tileType] || '#4a7c3f';
                    ctx.globalAlpha = 1.0;
                }

                ctx.fillRect(
                    Math.floor(x * tileW),
                    Math.floor(y * tileH),
                    Math.ceil(tileW),
                    Math.ceil(tileH)
                );
                ctx.globalAlpha = 1.0;
            }
        }

        // ── Draw buildings ──
        if (scene.buildingManager) {
            scene.buildingManager.getAllBuildings().forEach(b => {
                if (!scene.fogOfWar?.isExplored(b.tileX, b.tileY)) return;
                ctx.fillStyle = b.owner === 0
                    ? BUILDING_COLORS.player
                    : BUILDING_COLORS.ai;
                ctx.fillRect(
                    Math.floor(b.tileX * tileW) - 1,
                    Math.floor(b.tileY * tileH) - 1,
                    Math.ceil(tileW * b.size) + 2,
                    Math.ceil(tileH * b.size) + 2
                );
            });
        }

        // ── Draw units ──
        if (scene.unitManager) {
            scene.unitManager.getAllUnits().forEach(u => {
                // Only draw AI units if visible (fog of war)
                if (u.owner !== 0 && !scene.fogOfWar?.isVisible(u.tileX, u.tileY)) return;

                ctx.fillStyle = u.owner === 0
                    ? UNIT_COLORS.player
                    : UNIT_COLORS.ai;

                ctx.beginPath();
                ctx.arc(
                    u.tileX * tileW + tileW / 2,
                    u.tileY * tileH + tileH / 2,
                    Math.max(2, tileW),
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            });
        }

        // ── Draw camera viewport rectangle ──
        if (scene.cameras?.main) {
            const cam     = scene.cameras.main;
            const worldW  = (MAP_WIDTH + MAP_HEIGHT) * 32;   // TILE_WIDTH / 2
            const worldH  = (MAP_WIDTH + MAP_HEIGHT) * 16;   // TILE_HEIGHT / 2

            const vx = (cam.scrollX / worldW) * size;
            const vy = (cam.scrollY / worldH) * size;
            const vw = (cam.width  / cam.zoom / worldW) * size;
            const vh = (cam.height / cam.zoom / worldH) * size;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth   = 1;
            ctx.strokeRect(vx, vy, vw, vh);
        }

        animFrame = requestAnimationFrame(draw);
    }

    // ── Tap: move camera to minimap position ──
    function handleTap(e) {
        const rect   = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const size   = isEnlarged ? ENLARGED_SIZE : MINIMAP_SIZE;

        const normX = clickX / size;
        const normY = clickY / size;

        const scene = getScene();
        if (scene?.navigateToMinimapPosition) {
            scene.navigateToMinimapPosition(normX, normY);
        }
    }

    // ── Hold: enlarge minimap ──
    function handlePointerDown(e) {
        holdTimer = setTimeout(() => {
            isEnlarged = true;
        }, 400);
    }

    function handlePointerUp(e) {
        clearTimeout(holdTimer);
        if (!isEnlarged) handleTap(e);
        isEnlarged = false;
    }

    function handlePointerLeave() {
        clearTimeout(holdTimer);
        isEnlarged = false;
    }

    onMount(() => {
        ctx       = canvas.getContext('2d');
        animFrame = requestAnimationFrame(draw);
    });

    onDestroy(() => {
        if (animFrame) cancelAnimationFrame(animFrame);
        clearTimeout(holdTimer);
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="minimap-wrapper"
    class:enlarged={isEnlarged}
    on:pointerdown={handlePointerDown}
    on:pointerup={handlePointerUp}
    on:pointerleave={handlePointerLeave}
>
    <canvas bind:this={canvas}></canvas>
    {#if isEnlarged}
        <div class="minimap-label">Hold to enlarge</div>
    {/if}
</div>

<style>
    .minimap-wrapper {
        position: absolute;
        bottom: 12px;
        right: 12px;
        width:  225px;
        height: 150px;
        border: 2px solid rgba(74, 106, 138, 0.8);
        background: #000;
        cursor: pointer;
        user-select: none;
        transition: width 0.15s ease, height 0.15s ease;
        pointer-events: all;
        z-index: 10;
    }

    .minimap-wrapper.enlarged {
        width:  400px;
        height: 267px;
        bottom: 16px;
        right:  16px;
    }

    canvas {
        display: block;
        width:   100%;
        height:  100%;
        image-rendering: pixelated;
    }

    .minimap-label {
        position:   absolute;
        bottom:     4px;
        left:       50%;
        transform:  translateX(-50%);
        font-size:  10px;
        color:      rgba(255,255,255,0.4);
        font-family: monospace;
        pointer-events: none;
    }
</style>