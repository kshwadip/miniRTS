import Phaser from 'phaser';
import { TILE_WIDTH, TILE_HEIGHT } from '../utils/Constants';

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
        this._generateTileTextures();

        this.time.delayedCall(300, () => {
            this.scene.start('GameScene');
        });
    }

    // ─── TILE TEXTURES ───────────────────────────────────────────────────────
    // All tiles are isometric diamonds: TILE_WIDTH wide, TILE_HEIGHT tall
    // Origin when rendering is bottom-center (0.5, 1)
    _generateTileTextures() {
        const W = TILE_WIDTH;   // 64
        const H = TILE_HEIGHT;  // 32
        const hw = W / 2;       // 32 — half width
        const hh = H / 2;       // 16 — half height

        // Diamond points — reused for every tile
        // Top, Right, Bottom, Left
        const diamond = [
            { x: hw,     y: 0  },
            { x: W,      y: hh },
            { x: hw,     y: H  },
            { x: 0,      y: hh }
        ];

        // ── Grass ──
        const grass = this.add.graphics();
        grass.fillStyle(0x4a7c3f);
        grass.fillPoints(diamond, true);
        // Subtle edge shading
        grass.lineStyle(1, 0x3a6030, 0.6);
        grass.strokePoints(diamond, true);
        // Small detail dots
        grass.fillStyle(0x5a8c4f, 0.5);
        grass.fillCircle(hw + 8, hh - 2, 2);
        grass.fillCircle(hw - 10, hh + 4, 1.5);
        grass.generateTexture('tile_grass', W, H);
        grass.destroy();

        // ── Water Deep ──
        const waterDeep = this.add.graphics();
        waterDeep.fillStyle(0x1a3a6e);
        waterDeep.fillPoints(diamond, true);
        waterDeep.lineStyle(1, 0x0f2a5e, 0.8);
        waterDeep.strokePoints(diamond, true);
        // Wave suggestion
        waterDeep.lineStyle(1, 0x2a5a9e, 0.4);
        waterDeep.lineBetween(hw - 10, hh, hw + 10, hh);
        waterDeep.generateTexture('tile_water_deep', W, H);
        waterDeep.destroy();

        // ── Water Shallow ──
        const waterShallow = this.add.graphics();
        waterShallow.fillStyle(0x4a90b8);
        waterShallow.fillPoints(diamond, true);
        waterShallow.lineStyle(1, 0x3a80a8, 0.8);
        waterShallow.strokePoints(diamond, true);
        waterShallow.lineStyle(1, 0x6ab0d8, 0.4);
        waterShallow.lineBetween(hw - 8, hh - 2, hw + 8, hh - 2);
        waterShallow.generateTexture('tile_water_shallow', W, H);
        waterShallow.destroy();

        // ── Dirt ──
        const dirt = this.add.graphics();
        dirt.fillStyle(0x9b7653);
        dirt.fillPoints(diamond, true);
        dirt.lineStyle(1, 0x7b5633, 0.5);
        dirt.strokePoints(diamond, true);
        dirt.generateTexture('tile_dirt', W, H);
        dirt.destroy();

        // ── Forest ──
        const forest = this.add.graphics();
        // Ground
        forest.fillStyle(0x2d5a1b);
        forest.fillPoints(diamond, true);
        forest.lineStyle(1, 0x1d4a0b, 0.6);
        forest.strokePoints(diamond, true);
        // Tree canopy — two overlapping circles to suggest a tree
        forest.fillStyle(0x1a3d0d);
        forest.fillCircle(hw, hh - 6, 14);
        forest.fillStyle(0x2a5a1b);
        forest.fillCircle(hw - 6, hh - 2, 10);
        forest.fillStyle(0x3a6a2b);
        forest.fillCircle(hw + 4, hh - 4, 8);
        // Trunk
        forest.fillStyle(0x6b4c35);
        forest.fillRect(hw - 2, hh + 2, 4, 6);
        forest.generateTexture('tile_forest', W, H);
        forest.destroy();

        // ── Gold Deposit ──
        const gold = this.add.graphics();
        gold.fillStyle(0x4a4a2a);
        gold.fillPoints(diamond, true);
        // Gold nuggets
        gold.fillStyle(0xd4a017);
        gold.fillCircle(hw - 6, hh - 2, 6);
        gold.fillCircle(hw + 6, hh, 5);
        gold.fillCircle(hw, hh - 6, 4);
        gold.fillStyle(0xf0c040);
        gold.fillCircle(hw - 6, hh - 3, 3);
        gold.generateTexture('tile_gold', W, H);
        gold.destroy();

        // ── Stone Deposit ──
        const stoneDep = this.add.graphics();
        stoneDep.fillStyle(0x3a3a3a);
        stoneDep.fillPoints(diamond, true);
        // Rock shapes
        stoneDep.fillStyle(0x6a6a6a);
        stoneDep.fillEllipse(hw - 6, hh - 2, 16, 12);
        stoneDep.fillEllipse(hw + 6, hh, 14, 10);
        stoneDep.fillStyle(0x8a8a8a);
        stoneDep.fillEllipse(hw - 6, hh - 3, 8, 6);
        stoneDep.generateTexture('tile_stone', W, H);
        stoneDep.destroy();
    }
}