import Phaser from 'phaser';

import { TileMap } from '../systems/TileMap';
import { BuildingManager } from '../systems/BuildingManager.js';
import { tileToScreen, screenToTile } from '../utils/IsoMath.js';
import { MAP_WIDTH, MAP_HEIGHT, TILE_WIDTH, TILE_HEIGHT, PLAYER, AI } from '../utils/Constants.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────
    create() {
        // ── World bounds ──
        const worldW = (MAP_WIDTH + MAP_HEIGHT) * (TILE_WIDTH / 2);
        const worldH = (MAP_WIDTH + MAP_HEIGHT) * (TILE_HEIGHT / 2);
        this.cameras.main.setBounds((-(worldW / 2) - 600), (-0 - 400), (worldW + 1400), (worldH + 600));
        this.cameras.main.setZoom(1);

        // ── Systems — instantiate in dependency order ──
        this.tileMap = new TileMap(this);
        this.buildingManager = new BuildingManager(this);


        // ── Generate the world ──
        this.tileMap.generate();

        // ── Place starting structures ──
        this._placeStartingPositions();

        // ── Camera starting position — center on player Village Hall ──
        const playerHall = this.buildingManager.getBuildingsForOwner(PLAYER)[0];
        if (playerHall) {
            const { x, y } = tileToScreen(playerHall.tileX, playerHall.tileY);
            this.cameras.main.centerOn(x, y);
        }

        // ── Controls ──
        this._setupControls();

        // At the end of create() — ask for fullscreen when game loads
        // Browser requires this to be triggered by a user gesture
        // So wire it to the first click instead of firing immediately
        this.input.once('pointerdown', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {
                    // Browser blocked it — user can use F key instead
                });
            }
        });
    }

    // ─── UPDATE ──────────────────────────────────────────────────────────────
    update(time, delta) {
        this._updateEdgeScroll();
        this._updateKeyboardScroll();
    }

    // ─── SHUTDOWN — runs when scene stops ────────────────────────────────────
    // Removes native event listeners to prevent memory leaks and
    // duplicate handlers if the scene restarts
    shutdown() {
        document.removeEventListener('mouseenter', this._onMouseEnter);
        document.removeEventListener('mouseleave', this._onMouseLeave);
    }

    // ─── STARTING POSITIONS ──────────────────────────────────────────────────
    _placeStartingPositions() {
        // Find two valid starting tiles — one per corner quadrant
        const playerStart = this._findStartTile(8, 8);
        const aiStart     = this._findStartTile(MAP_WIDTH - 16, MAP_HEIGHT - 16);

        // Player starting buildings
        this.buildingManager.createBuilding(PLAYER, 'village_hall',     playerStart.x,     playerStart.y);
    
        // AI starting buildings
        this.buildingManager.createBuilding(AI, 'village_hall',      aiStart.x,     aiStart.y);    
    }

    _findStartTile(preferX, preferY) {
        // Find nearest walkable tile to preferred position
        for (let r = 0; r < 10; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    const x = preferX + dx;
                    const y = preferY + dy;
                    if (this.tileMap.isWalkable(x, y, false, false)) {
                        return { x, y };
                    }
                }
            }
        }
        return { x: preferX, y: preferY }; // Fallback
    }

    // ─── CONTROLS SETUP ──────────────────────────────────────────────────────
    _setupControls() {
        const cam = this.cameras.main;

        // ─── EDGE SCROLL SETTINGS ───
        const EDGE_SIZE = 40;
        const EDGE_SPEED = 12;
        this.edgeScroll = { enabled: true, edgeSize: EDGE_SIZE, speed: EDGE_SPEED };

        // ─── POINTER WINDOW TRACKING ───
        // Native document events instead of Phaser's pointerover/pointerout
        // Browser handles these at OS level — never missed regardless of
        // how fast the pointer moves out of the window
        this.pointerInWindow = true;

        this._onMouseEnter = () => { this.pointerInWindow = true; };
        this._onMouseLeave = () => { this.pointerInWindow = false; };

        document.addEventListener('mouseenter', this._onMouseEnter);
        document.addEventListener('mouseleave', this._onMouseLeave);

        // ─── LEFT CLICK — UNIT SELECTION ───
        this.input.on('pointerup', (pointer) => {
            if (!pointer.leftButtonReleased()) return;
            if (Math.abs(pointer.upX - pointer.downX) > 10) return;
            if (Math.abs(pointer.upY - pointer.downY) > 10) return;

            const worldPos = cam.getWorldPoint(pointer.x, pointer.y);
            const tilePos = screenToTile(worldPos.x, worldPos.y);
            this._handleTap(tilePos.tileX, tilePos.tileY, pointer);
        });

        // ─── RIGHT CLICK — MOVE / ATTACK COMMAND ───
        this.input.on('pointerdown', (pointer) => {
            if (!pointer.rightButtonDown()) return;
            const worldPos = cam.getWorldPoint(pointer.x, pointer.y);
            const tilePos = screenToTile(worldPos.x, worldPos.y);
            this._issueCommand(tilePos.tileX, tilePos.tileY);
        });

        // ─── SCROLL WHEEL — ZOOM ───
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.5, 2.0);
            cam.setZoom(newZoom);
        });

        // ─── TOUCH PINCH — ZOOM ───
        this.input.addPointer(1);
        let pinchDist = null;

        this.input.on('pointermove', () => {
            const p1 = this.input.pointer1;
            const p2 = this.input.pointer2;
            if (!p1.isDown || !p2.isDown) { pinchDist = null; return; }

            const currentDist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
            if (pinchDist === null) { pinchDist = currentDist; return; }

            const newZoom = Phaser.Math.Clamp(
                cam.zoom + (currentDist - pinchDist) * 0.005,
                0.5, 2.0
            );
            cam.setZoom(newZoom);
            pinchDist = currentDist;
        });

        // ─── SELECTION MODE ───
        this.selectionMode = false;
        this.selectionRect = null;
        this.selectionStart = null;

        // ─── KEYBOARD SCROLL ───
        this.wasd = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

        // ─── FULLSCREEN TOGGLE ───
        this.input.keyboard.on('keydown-BACKTICK', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        });

    }

    // ─── EDGE SCROLL ─────────────────────────────────────────────────────────
    _updateEdgeScroll() {
        if (!this.edgeScroll.enabled) return;
        if (!this.pointerInWindow) return;

        const pointer = this.input.activePointer;
        const cam = this.cameras.main;
        const { edgeSize, speed } = this.edgeScroll;
        const { width, height } = this.scale;

        if (!pointer.active) return;

        const x = pointer.x;
        const y = pointer.y;

        if (x < edgeSize) cam.scrollX -= speed;
        if (x > width - edgeSize) cam.scrollX += speed;
        if (y < edgeSize) cam.scrollY -= speed;
        if (y > height - edgeSize) cam.scrollY += speed;
    }

    // ─── KEYBOARD SCROLL ─────────────────────────────────────────────────────
    _updateKeyboardScroll() {
        const speed = 8;
        const cam = this.cameras.main;
        const { W, A, S, D, UP, DOWN, LEFT, RIGHT } = this.wasd;

        if (A.isDown || LEFT.isDown) cam.scrollX -= speed;
        if (D.isDown || RIGHT.isDown) cam.scrollX += speed;
        if (W.isDown || UP.isDown) cam.scrollY -= speed;
        if (S.isDown || DOWN.isDown) cam.scrollY += speed;
    }
}