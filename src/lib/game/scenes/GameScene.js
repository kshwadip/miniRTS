import Phaser from 'phaser';

import { TileMap } from '../systems/TileMap';
import { tileToScreen, screenToTile } from '../utils/IsoMath.js';
import { MAP_WIDTH, MAP_HEIGHT, TILE_WIDTH, TILE_HEIGHT } from '../utils/Constants.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────
    create() {
        // ── World bounds ──
        // The full map in pixels — camera scrolls within these bounds
        const worldW = (MAP_WIDTH + MAP_HEIGHT) * (TILE_WIDTH  / 2);
        const worldH = (MAP_WIDTH + MAP_HEIGHT) * (TILE_HEIGHT / 2);
        this.cameras.main.setBounds((-(worldW / 2) - 600), (-0 - 400), (worldW + 1400), (worldH + 600));
        this.cameras.main.setZoom(1);

        // ── Systems — instantiate in dependency order ──
        this.tileMap = new TileMap(this);
        this.tileMap.generate();

        // ── Controls ──
        this._setupControls();
    }

    update(time, delta) {
        this._updateKeyboardScroll();
    }

    _setupControls() {
        // ─── MAP SCROLLING ───
        // Drag to scroll (when no unit selected)
        let lastPointer = null;

        this.input.on('pointerdown', (pointer) => {
            lastPointer = { x: pointer.x, y: pointer.y };
        });


        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            if (this.selectionMode) return; // Don't scroll in selection mode

            const dx = pointer.x - lastPointer.x;
            const dy = pointer.y - lastPointer.y;

            this.cameras.main.scrollX -= dx;
            this.cameras.main.scrollY -= dy;

            lastPointer = { x: pointer.x, y: pointer.y };
        });

        // ─── UNIT SELECTION ───
        // Tap to select single unit
        this.input.on('pointerup', (pointer) => {
            if (Math.abs(pointer.upX - pointer.downX) > 10) return; // Was a drag, not a tap
            const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const tilePos = screenToTile(worldPos.x, worldPos.y);
            this._handleTap(tilePos.tileX, tilePos.tileY, pointer);
        });

        // ─── SELECTION MODE TOGGLE ───
        // Button in HUD triggers this
        this.selectionMode = false;

        // ─── BOX SELECTION ───
        // In selection mode: drag draws a selection rectangle
        this.selectionRect = null;
        this.selectionStart = null;

        // ─── PINCH TO ZOOM ───
        // Pinch remains zoom — not repurposed for selection
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const zoom = this.cameras.main.zoom;
            const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.5, 2.0);
            this.cameras.main.setZoom(newZoom);
        });

        // Touch pinch
        this.input.addPointer(1); // Enable multi-touch
        let pinchStart = null;

        this.input.on('pointermove', (pointer) => {
            const pointers = this.input.pointer1.isDown && this.input.pointer2.isDown;
            if (!pointers) { pinchStart = null; return; }

            const p1 = this.input.pointer1;
            const p2 = this.input.pointer2;
            const currentDist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

            if (pinchStart === null) { pinchStart = currentDist; return; }

            const delta = currentDist - pinchStart;
            const zoom = this.cameras.main.zoom;
            const newZoom = Phaser.Math.Clamp(zoom + delta * 0.005, 0.5, 2.0);
            this.cameras.main.setZoom(newZoom);
            pinchStart = currentDist;
        });

        // ─── MINIMAP TAP ───
        // Tapping minimap moves camera to that location
        // Implemented in the Svelte minimap component via store update

        // ─── KEYBOARD (emulator / PC) ───
        const wasd = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
        this.wasd = wasd;
    }

    // In update() — keyboard camera scroll
    _updateKeyboardScroll() {
        const speed = 8;
        const { W, A, S, D, UP, DOWN, LEFT, RIGHT } = this.wasd;
        if (A.isDown || LEFT.isDown) this.cameras.main.scrollX -= speed;
        if (D.isDown || RIGHT.isDown) this.cameras.main.scrollX += speed;
        if (W.isDown || UP.isDown) this.cameras.main.scrollY -= speed;
        if (S.isDown || DOWN.isDown) this.cameras.main.scrollY += speed;
    }
}