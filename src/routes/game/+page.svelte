<script>
    import { onMount, onDestroy } from 'svelte';
    import { initGame, destroyGame } from '$lib/game/Game.js';
    import HUD from '$lib/components/HUD.svelte';

    let canvasContainer;
    let game;

    onMount(() => {
        // Phaser mounts itself into the container div
        game = initGame(canvasContainer);
    });

    onDestroy(() => {
        // Clean up Phaser when navigating away
        destroyGame(game);
    });
</script>

<!-- The canvas container sits behind the HUD -->
<div class="game-wrapper">
    <div bind:this={canvasContainer} id="game-container"></div>
    <HUD />
</div>

<style>
    .game-wrapper {
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }
    #game-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
</style>