import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';

export function initGame(parent) {
    const config = {
        type: Phaser.AUTO,         // AUTO = WebGL if available, fallback to Canvas
        width: window.innerWidth,
        height: window.innerHeight,
        parent: parent,            // Mount into the div we bound in Svelte
        backgroundColor: '#1a1a2e',
        scene: [BootScene],
        scale: {
            mode: Phaser.Scale.RESIZE,        // Fills the parent div
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        audio: {
            disableWebAudio: false
        }
    };

    return new Phaser.Game(config);
}

export function destroyGame(game) {
    if (game) {
        game.destroy(true);
    }
}