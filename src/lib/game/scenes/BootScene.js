import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    // ─── PRELOAD ─────────────────────────────────────────────────────────────
    // Load external assets here.
    preload() {
        // Show a simple loading bar while any real assets load
        this._createLoadingBar();
    }
    
    // ─── LOADING BAR ─────────────────────────────────────────────────────────
    _createLoadingBar() {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;

        this.add.text(cx, cy - 40, 'MINI RTS', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(cx, cy - 10, 'Loading...', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        const barBg = this.add.rectangle(cx, cy + 20, 300, 16, 0x333333);
        const bar   = this.add.rectangle(cx - 150, cy + 20, 0, 14, 0x4a90d9);
        bar.setOrigin(0, 0.5);

        this.load.on('progress', (value) => {
            bar.width = 300 * value;
        });
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────
    // generate all placeholder textures.
    create() {
        
    }
}