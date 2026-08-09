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
        this._generateUnitTextures();
        this._generateBuildingTextures();

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

    // ─── UNIT TEXTURES ───────────────────────────────────────────────────────
    // Each unit is a 32x32 sprite
    // Two versions of each: blue (player) and red (AI)
    // Shape communicates unit type — silhouette readable at small size
    _generateUnitTextures() {
        const unitDefs = [
            {
                key: 'villager',
                // Small figure with a tool — communicates civilian
                draw: (g, color) => {
                    // Body
                    g.fillStyle(color);
                    g.fillRect(12, 12, 8, 12);
                    // Head
                    g.fillCircle(16, 9, 6);
                    // Tool (axe suggestion)
                    g.fillStyle(0x888888);
                    g.fillRect(18, 10, 2, 10);
                    g.fillRect(18, 10, 6, 3);
                }
            },
            {
                key: 'infantry',
                // Stocky armored figure — communicates heavy melee
                draw: (g, color) => {
                    // Shield
                    g.fillStyle(0x888888);
                    g.fillRect(6, 12, 6, 12);
                    // Body — wider than villager
                    g.fillStyle(color);
                    g.fillRect(12, 10, 10, 14);
                    // Head with helmet
                    g.fillStyle(0x888888);
                    g.fillRect(12, 4, 10, 8);
                    // Sword
                    g.fillStyle(0xcccccc);
                    g.fillRect(22, 8, 2, 14);
                }
            },
            {
                key: 'ranged',
                // Slim figure with bow — communicates ranged
                draw: (g, color) => {
                    // Body — slimmer
                    g.fillStyle(color);
                    g.fillRect(13, 12, 7, 12);
                    // Head
                    g.fillCircle(16, 9, 5);
                    // Bow
                    g.lineStyle(2, 0x8b6347);
                    g.strokeEllipse(6, 14, 6, 16);
                    // Arrow
                    g.fillStyle(0xaaaaaa);
                    g.fillRect(8, 15, 14, 1);
                    g.fillTriangle(22, 13, 22, 17, 26, 15);
                }
            },
            {
                key: 'cavalry',
                // Figure on horse — wider and taller
                draw: (g, color) => {
                    // Horse body
                    g.fillStyle(0x8b6347);
                    g.fillEllipse(16, 20, 22, 10);
                    // Horse legs
                    g.fillRect(8,  24, 3, 6);
                    g.fillRect(13, 24, 3, 6);
                    g.fillRect(18, 24, 3, 6);
                    g.fillRect(23, 24, 3, 6);
                    // Horse head
                    g.fillRect(24, 14, 6, 8);
                    // Rider
                    g.fillStyle(color);
                    g.fillRect(12, 10, 9, 12);
                    // Rider head
                    g.fillStyle(0x888888);
                    g.fillCircle(16, 7, 5);
                    // Lance suggestion
                    g.fillStyle(0xaaaaaa);
                    g.fillRect(20, 6, 1, 18);
                }
            }
        ];

        const PLAYER_COLOR = 0x4488ff;  // Blue
        const AI_COLOR     = 0xff4444;  // Red

        unitDefs.forEach(({ key, draw }) => {
            // Player version
            const playerGfx = this.add.graphics();
            draw(playerGfx, PLAYER_COLOR);
            playerGfx.generateTexture(`unit_${key}_blue`, 32, 32);
            playerGfx.destroy();

            // AI version
            const aiGfx = this.add.graphics();
            draw(aiGfx, AI_COLOR);
            aiGfx.generateTexture(`unit_${key}_red`, 32, 32);
            aiGfx.destroy();

            // Sneak stance version — dimmed outline only
            // Used when unit is in sneak stance and visible to SELF only
            const sneakGfx = this.add.graphics();
            sneakGfx.lineStyle(1, 0x888888, 0.4);
            sneakGfx.strokeRect(8, 6, 16, 20);
            sneakGfx.generateTexture(`unit_${key}_sneak`, 32, 32);
            sneakGfx.destroy();
        });
    }

    // ─── BUILDING TEXTURES ───────────────────────────────────────────────────
    // Buildings are larger — 64x64 sprites
    // Each has a player tint applied in code — only neutral textures generated here
    _generateBuildingTextures() {
        const buildings = [
            {
                key: 'village_hall',
                draw: (g) => {
                    // Base — large stone structure
                    g.fillStyle(0x9b8b6b);
                    g.fillRect(8, 24, 48, 32);
                    // Roof
                    g.fillStyle(0x7b6b4b);
                    g.fillTriangle(4, 28, 32, 8, 60, 28);
                    // Door
                    g.fillStyle(0x5a3a1a);
                    g.fillRect(26, 40, 12, 16);
                    // Windows
                    g.fillStyle(0xffee88, 0.6);
                    g.fillRect(14, 32, 8, 8);
                    g.fillRect(42, 32, 8, 8);
                    // Chimney
                    g.fillStyle(0x8a7a5a);
                    g.fillRect(44, 10, 6, 18);
                    // Smoke suggestion
                    g.fillStyle(0xcccccc, 0.3);
                    g.fillCircle(47, 8, 4);
                    g.fillCircle(49, 5, 3);
                }
            },
            {
                key: 'training_grounds',
                draw: (g) => {
                    // Barracks — long rectangular structure
                    g.fillStyle(0x8b7b5b);
                    g.fillRect(4, 28, 56, 28);
                    // Roof
                    g.fillStyle(0x6b5b3b);
                    g.fillRect(4, 22, 56, 8);
                    // Training yard suggestion — fence
                    g.lineStyle(2, 0x6b4c35);
                    g.strokeRect(2, 48, 20, 8);
                    // Weapon rack
                    g.fillStyle(0xaaaaaa);
                    g.fillRect(42, 26, 2, 20);
                    g.fillRect(46, 26, 2, 20);
                    g.fillRect(50, 26, 2, 20);
                    // Door
                    g.fillStyle(0x5a3a1a);
                    g.fillRect(28, 38, 10, 18);
                }
            },
            {
                key: 'archery_post',
                draw: (g) => {
                    // Tower-like structure for archery
                    g.fillStyle(0x7a8a6a);
                    g.fillRect(14, 16, 36, 40);
                    // Battlements at top
                    g.fillStyle(0x6a7a5a);
                    for (let i = 0; i < 4; i++) {
                        g.fillRect(14 + i * 10, 10, 6, 10);
                    }
                    // Arrow slits
                    g.fillStyle(0x2a2a1a);
                    g.fillRect(22, 28, 4, 10);
                    g.fillRect(38, 28, 4, 10);
                    // Door
                    g.fillStyle(0x5a3a1a);
                    g.fillRect(26, 42, 12, 14);
                }
            },
            {
                key: 'mount_yard',
                draw: (g) => {
                    // Stable — wide low building with fence
                    g.fillStyle(0xa07850);
                    g.fillRect(6, 28, 52, 24);
                    // Roof
                    g.fillStyle(0x7a5830);
                    g.fillTriangle(4, 32, 32, 16, 60, 32);
                    // Fence posts
                    g.fillStyle(0x8b6347);
                    for (let i = 0; i < 5; i++) {
                        g.fillRect(4 + i * 14, 46, 3, 10);
                    }
                    // Fence rail
                    g.lineStyle(2, 0x8b6347);
                    g.lineBetween(4, 50, 60, 50);
                    // Door — wide for horses
                    g.fillStyle(0x5a3a1a);
                    g.fillRect(22, 36, 20, 16);
                }
            },
            {
                key: 'granary',
                draw: (g) => {
                    // Round granary structure
                    g.fillStyle(0xd4a860);
                    g.fillEllipse(32, 38, 48, 36);
                    // Conical roof
                    g.fillStyle(0xa07830);
                    g.fillTriangle(10, 28, 32, 10, 54, 28);
                    // Bands around the granary
                    g.lineStyle(2, 0xa07830, 0.6);
                    g.strokeEllipse(32, 36, 44, 14);
                    g.strokeEllipse(32, 44, 44, 10);
                    // Door
                    g.fillStyle(0x5a3a1a);
                    g.fillRect(26, 42, 12, 14);
                }
            },
            {
                key: 'woodcutters_lodge',
                draw: (g) => {
                    // Small cabin with wood pile
                    g.fillStyle(0x8b6347);
                    g.fillRect(12, 30, 36, 24);
                    // Roof
                    g.fillStyle(0x5a3a1a);
                    g.fillTriangle(8, 34, 30, 18, 56, 34);
                    // Log pile
                    g.fillStyle(0xa07830);
                    g.fillRect(2, 44, 14, 8);
                    g.fillStyle(0x8b6347);
                    g.fillEllipse(5, 44, 8, 5);
                    g.fillEllipse(12, 44, 8, 5);
                    g.fillRect(2, 36, 14, 10);
                    // Door
                    g.fillStyle(0x3a1a0a);
                    g.fillRect(22, 40, 10, 14);
                    // Axe leaning on wall
                    g.fillStyle(0x888888);
                    g.fillRect(50, 28, 2, 16);
                    g.fillRect(48, 28, 6, 4);
                }
            },
            {
                key: 'mining_post',
                draw: (g) => {
                    // Functional industrial look
                    g.fillStyle(0x6a6a5a);
                    g.fillRect(10, 28, 44, 26);
                    // Shed roof — flat angled
                    g.fillStyle(0x4a4a3a);
                    g.fillRect(8, 22, 48, 8);
                    // Support beam
                    g.fillStyle(0x8b6347);
                    g.fillRect(14, 22, 4, 32);
                    g.fillRect(46, 22, 4, 32);
                    // Mine entrance suggestion
                    g.fillStyle(0x1a1a1a);
                    g.fillEllipse(32, 48, 24, 12);
                    // Cart tracks
                    g.lineStyle(2, 0x888866);
                    g.lineBetween(22, 52, 42, 52);
                    g.lineBetween(24, 48, 24, 56);
                    g.lineBetween(32, 48, 32, 56);
                    g.lineBetween(40, 48, 40, 56);
                }
            }
        ];

        buildings.forEach(({ key, draw }) => {
            const g = this.add.graphics();
            draw(g);
            g.generateTexture(`building_${key}`, 64, 64);
            g.destroy();
        });
    }
}