import Phaser from 'phaser';
import Hammer from 'hammerjs';

import { TileMap } from '../systems/TileMap';
import { ResourceManager } from '../systems/ResourceManager.js';
import { UnitManager }     from '../systems/UnitManager.js';
import { BuildingManager } from '../systems/BuildingManager.js';
import { tileToScreen, screenToTile } from '../utils/IsoMath.js';
import { MAP_WIDTH, MAP_HEIGHT, TILE_WIDTH, TILE_HEIGHT, PLAYER, AI, UNIT_TYPE } from '../utils/Constants.js';
import { resources, population, isNight, isRaining, timeRemaining, selectedUnits, gameMessage } from '$lib/stores/gameState.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────
    create() {
        // ── World bounds ──
        const worldW = (MAP_WIDTH + MAP_HEIGHT) * (TILE_WIDTH / 2);
        const worldH = (MAP_WIDTH + MAP_HEIGHT) * (TILE_HEIGHT / 2);
        if (this.sys.game.device.os.desktop) {
            this.cameras.main.setBounds((-(worldW / 2) - 600), (-0 - 400), (worldW + 1400), (worldH + 600));
        } else {
            this.cameras.main.setBounds((-(worldW / 2) - 100), (-0 - 200), (worldW + 400), (worldH + 200));
        }
        this.cameras.main.setZoom(1);

        // ── Systems ──
        this.tileMap = new TileMap(this);
        this.resourceManager = new ResourceManager();
        this.unitManager     = new UnitManager(this);
        this.buildingManager = new BuildingManager(this);

        this.tileMap.generate();
        this._placeStartingPositions();

        // ── Camera start ──
        const playerHall = this.buildingManager.getBuildingsForOwner(PLAYER)[0];
        if (playerHall) {
            const { x, y } = tileToScreen(playerHall.tileX, playerHall.tileY);
            this.cameras.main.centerOn(x, y);
        }

        // ── Resource store sync ──
        this.resourceManager.onResourceChange = (owner, res) => {
            if (owner === PLAYER) resources.set(res);
        };

        this._updateStores();

        // ── Fog of war initial reveal around starting positions ──
        const playerUnits = this.unitManager.getUnitsForOwner(PLAYER);

        // ── Controls (desktop/mouse) ──
        this._setupControls();

        // ─── HAMMER.JS – mobile gestures ──────────────────────────────────────
        if (!this.sys.game.device.os.desktop) {
            const canvas = this.sys.game.canvas;
            const hammer = new Hammer(canvas);

            hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 5 });
            hammer.get('pinch').set({ enable: true });
            hammer.get('pinch').recognizeWith(hammer.get('pan'));

            const cam = this.cameras.main;

            // ---- Pan state (incremental) ----
            let lastPanX = 0, lastPanY = 0;
            let isPinching = false;
            let panCooldown = false;   // if true, ignore pan events temporarily

            hammer.on('panstart', (e) => {
                if (isPinching || panCooldown) return;
                lastPanX = e.center.x;
                lastPanY = e.center.y;
            });

            hammer.on('pan', (e) => {
                if (isPinching || panCooldown) return;
                const dx = e.center.x - lastPanX;
                const dy = e.center.y - lastPanY;
                cam.scrollX -= dx / cam.zoom;
                cam.scrollY -= dy / cam.zoom;
                lastPanX = e.center.x;
                lastPanY = e.center.y;
            });

            // ---- Pinch state ----
            let pinchStartZoom = 1;

            hammer.on('pinchstart', (e) => {
                isPinching = true;
                panCooldown = false;   // cancel any pending cooldown
                pinchStartZoom = cam.zoom;
                // Reset last pan position to avoid jump after pinch
                lastPanX = e.center.x;
                lastPanY = e.center.y;
            });

            hammer.on('pinch', (e) => {
                let newZoom = pinchStartZoom * e.scale;
                newZoom = Phaser.Math.Clamp(newZoom, 0.5, 2.0);

                const worldBefore = cam.getWorldPoint(e.center.x, e.center.y);
                cam.setZoom(newZoom);
                cam.preRender();
                const worldAfter = cam.getWorldPoint(e.center.x, e.center.y);
                cam.scrollX += (worldBefore.x - worldAfter.x);
                cam.scrollY += (worldBefore.y - worldAfter.y);
            });

            hammer.on('pinchend', (e) => {
                isPinching = false;
                // Reset last pan position to the center where pinch ended
                lastPanX = e.center.x;
                lastPanY = e.center.y;
                // Activate cooldown to prevent a stray pan event from the remaining finger
                panCooldown = true;
                // Clear cooldown after 150ms (enough to skip the immediate pan)
                setTimeout(() => {
                    panCooldown = false;
                }, 150);
            });

            // ---- Tap (select) ----
            hammer.on('tap', (e) => {
                // Ignore taps if a pinch just ended (cooldown) or if pinching
                if (isPinching || panCooldown) return;
                const worldPos = cam.getWorldPoint(e.center.x, e.center.y);
                const tilePos = screenToTile(worldPos.x, worldPos.y);
                this._handleTap(tilePos.tileX, tilePos.tileY);
            });

            // ---- Press (long‑press → command) ----
            hammer.on('press', (e) => {
                if (isPinching || panCooldown) return;
                const worldPos = cam.getWorldPoint(e.center.x, e.center.y);
                const tilePos = screenToTile(worldPos.x, worldPos.y);
                this._issueCommand(tilePos.tileX, tilePos.tileY);
                if (navigator.vibrate) navigator.vibrate(20);
            });

            this.hammer = hammer;
        }
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
        if (this.hammer) {
            this.hammer.destroy();
            this.hammer = null;
        }
        document.removeEventListener('mouseenter', this._onMouseEnter);
        document.removeEventListener('mouseleave', this._onMouseLeave);
        clearTimeout(this._longPress?.timer);
    }

    // ─── STARTING POSITIONS ──────────────────────────────────────────────────
    _placeStartingPositions() {
        // Find two valid starting tiles — one per corner quadrant
        const playerStart = this._findStartTile(8, 8);
        const aiStart = this._findStartTile(MAP_WIDTH - 16, MAP_HEIGHT - 16);

        // Player starting buildings
        this.buildingManager.createBuilding(PLAYER, 'village_hall', playerStart.x, playerStart.y);

        // Player starting units — 3 villagers
        this.unitManager.createUnit(PLAYER, UNIT_TYPE.VILLAGER, playerStart.x + 2, playerStart.y + 1);
        this.unitManager.createUnit(PLAYER, UNIT_TYPE.VILLAGER, playerStart.x + 3, playerStart.y + 1);
        this.unitManager.createUnit(PLAYER, UNIT_TYPE.VILLAGER, playerStart.x + 4, playerStart.y + 1);

        // AI starting buildings
        this.buildingManager.createBuilding(AI, 'village_hall', aiStart.x, aiStart.y);

        // AI starting units
        this.unitManager.createUnit(AI, UNIT_TYPE.VILLAGER, aiStart.x + 2, aiStart.y + 1);
        this.unitManager.createUnit(AI, UNIT_TYPE.VILLAGER, aiStart.x + 3, aiStart.y + 1);
        this.unitManager.createUnit(AI, UNIT_TYPE.INFANTRY, aiStart.x + 5, aiStart.y + 2);

        this.tileMap.placeStartingResources([playerStart, aiStart]);
    }

    _findStartTile(preferX, preferY, size = 2) {
        const maxSearch = 20;
        for (let r = 0; r < maxSearch; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    const x = preferX + dx;
                    const y = preferY + dy;
                    let ok = true;
                    // Check every tile in the building's footprint
                    for (let fy = 0; fy < size; fy++) {
                        for (let fx = 0; fx < size; fx++) {
                            const tx = x + fx;
                            const ty = y + fy;
                            if (!this.tileMap.isBuildable(tx, ty)) {
                                ok = false;
                                break;
                            }
                        }
                        if (!ok) break;
                    }
                    if (ok) {
                        return { x, y };
                    }
                }
            }
        }
        // Fallback – should never happen on a valid map
        return { x: preferX, y: preferY };
    }

    // ─── CONTROLS SETUP ──────────────────────────────────────────────────────
    _setupControls() {
        const cam = this.cameras.main;
        const isDesktop = this.sys.game.device.os.desktop;

        // ─── EDGE SCROLL (desktop only) ───
        const EDGE_SIZE = 40;
        const EDGE_SPEED = 12;
        this.edgeScroll = {
            enabled: isDesktop,
            edgeSize: EDGE_SIZE,
            speed: EDGE_SPEED
        };

        // ─── POINTER WINDOW TRACKING (for edge scroll) ───
        this.pointerInWindow = true;
        this._onMouseEnter = () => { this.pointerInWindow = true; };
        this._onMouseLeave = () => { this.pointerInWindow = false; };
        document.addEventListener('mouseenter', this._onMouseEnter);
        document.addEventListener('mouseleave', this._onMouseLeave);

        // ─── KEYBOARD SCROLL ────────────────────────────────────────────
        this.wasd = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

        // ─── FULLSCREEN TOGGLE ──────────────────────────────────────────
        this.input.keyboard.on('keydown-BACKTICK', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        });

        // ─── SELECTION MODE STATE ──────────────────────────────────────
        this.selectionMode = false;
        this.selectionRect = null;
        this.selectionStart = null;

        // ─── DESKTOP ONLY – mouse events ──────────────────────────────
        if (isDesktop) {
            // // Left‑click → select
            // this.input.on('pointerup', (pointer) => {
            //     if (!pointer.leftButtonReleased()) return;
            //     if (Math.abs(pointer.upX - pointer.downX) > 10) return;
            //     if (Math.abs(pointer.upY - pointer.downY) > 10) return;

            //     const worldPos = cam.getWorldPoint(pointer.x, pointer.y);
            //     const tilePos = screenToTile(worldPos.x, worldPos.y);
            //     this._handleTap(tilePos.tileX, tilePos.tileY, pointer);
            // });

            // // Right‑click → command
            // this.input.on('pointerdown', (pointer) => {
            //     if (!pointer.rightButtonDown()) return;
            //     const worldPos = cam.getWorldPoint(pointer.x, pointer.y);
            //     const tilePos = screenToTile(worldPos.x, worldPos.y);
            //     this._issueCommand(tilePos.tileX, tilePos.tileY);
            // });

            // Scroll wheel → zoom
            this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
                const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.5, 2.0);
                cam.setZoom(newZoom);
            });
        }

        // On mobile, we do NOT attach any pointer events – Hammer handles everything.
    }

    // ─── EDGE SCROLL ─────────────────────────────────────────────────────────
    _updateEdgeScroll() {
        if (!this.edgeScroll.enabled) return;
        if (!this.pointerInWindow) return;
        if (!this.sys.game.device.os.desktop) return;

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
        const speed = 12;
        const cam = this.cameras.main;
        const { W, A, S, D, UP, DOWN, LEFT, RIGHT } = this.wasd;

        if (A.isDown || LEFT.isDown) cam.scrollX -= speed;
        if (D.isDown || RIGHT.isDown) cam.scrollX += speed;
        if (W.isDown || UP.isDown) cam.scrollY -= speed;
        if (S.isDown || DOWN.isDown) cam.scrollY += speed;
    }

    // ─── SVELTE STORE UPDATES ────────────────────────────────────────────────
    _updateStores() {
        resources.set({
            wood: this.resourceManager.getDisplay(PLAYER, 'wood'),
            food: this.resourceManager.getDisplay(PLAYER, 'food'),
            gold: this.resourceManager.getDisplay(PLAYER, 'gold'),
            stone: this.resourceManager.getDisplay(PLAYER, 'stone')
        });
    }
}