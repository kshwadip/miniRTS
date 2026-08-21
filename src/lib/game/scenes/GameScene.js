import Phaser from 'phaser';
import Hammer from 'hammerjs';

import { TileMap } from '../systems/TileMap';
import { FogOfWar }        from '../systems/FogOfWar.js';
import { ResourceManager } from '../systems/ResourceManager.js';
import { PathFinder }      from '../systems/PathFinder.js';
import { UnitManager }     from '../systems/UnitManager.js';
import { BuildingManager } from '../systems/BuildingManager.js';
import { tileToScreen, screenToTile } from '../utils/IsoMath.js';
import { MAP_WIDTH, MAP_HEIGHT, TILE_WIDTH, TILE_HEIGHT, PLAYER, AI, UNIT_TYPE, VISIBILITY, TICK_MS } from '../utils/Constants.js';
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
        this.tileMap         = new TileMap(this);
        this.fogOfWar        = new FogOfWar(this);
        this.resourceManager = new ResourceManager();
        this.pathFinder      = new PathFinder(this.tileMap);
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

        // ── Game loop state ──
        this.tickTimer    = 0;
        this.tickCount    = 0;
        this.gameRunning  = true;

        // ── Selection state ──
        this.selectedUnitList = [];
        this.selectionMode    = false; // false = scroll mode, true = box-select mode
        this.selectionBox     = null;
        this.selectionStart   = null;

        // ── Resource store sync ──
        this.resourceManager.onResourceChange = (owner, res) => {
            if (owner === PLAYER) resources.set(res);
        };

        this._updateStores();

        // ── Fog of war initial reveal around starting positions ──
        const playerUnits = this.unitManager.getUnitsForOwner(PLAYER);
        this.fogOfWar.update(playerUnits);

        // ── Controls (desktop/mouse) ──
        this._setupControls();

        // ── Hammerjs Controls ── 
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
        if (!this.gameRunning) return;

        this._updateEdgeScroll();
        this._updateKeyboardScroll();

        // Fixed-rate game logic tick
        this.tickTimer += delta;
        while (this.tickTimer >= TICK_MS) {
            this.tickTimer -= TICK_MS;
            this._gameTick(delta);
        }

        // Render-rate: selection box drawing
        if (this.selectionMode && this.selectionStart && this.input.activePointer.isDown) {
            this._drawSelectionBox();
        }
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

    _gameTick() {
        this.tickCount++;

        const playerUnits   = this.unitManager.getUnitsForOwner(PLAYER);
        const aiUnits       = this.unitManager.getUnitsForOwner(AI);
        const allUnits      = [...playerUnits, ...aiUnits];
        const allBuildings  = this.buildingManager.getAllBuildings();

        allUnits.forEach(u => {
            if (u.alive) u.tickMove(this.tileMap);
        });

        playerUnits.filter(u => u.type === UNIT_TYPE.VILLAGER && u.alive).forEach(v => {
                v.tickGather(this.resourceManager);
                v.tickDropoff(this.resourceManager);
        });

        allBuildings.forEach(b => {
            if (b.alive) {
                const newUnit = b.tickProduction(this.unitManager);
            }
        });

        this.unitManager.removeDeadUnits();
        this.buildingManager.removeDestroyedBuildings();

        const alivePlayerUnits = this.unitManager.getUnitsForOwner(PLAYER);
        this.fogOfWar.update(alivePlayerUnits);

        const totalPop = alivePlayerUnits.length;
        population.set({ current: totalPop, max: 75 });

        this._updateStores();
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
        this.unitManager.createUnit(AI, UNIT_TYPE.VILLAGER, aiStart.x + 5, aiStart.y + 2);

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

        // ─── SELECTION MODE STATE ─────
        this.selectionMode = false;
        this.selectionRect = null;
        this.selectionStart = null;

        // ─── EDGE SCROLL ───
        const EDGE_SIZE = 40;
        const EDGE_SPEED = 12;
        this.edgeScroll = {
            enabled: isDesktop,
            edgeSize: EDGE_SIZE,
            speed: EDGE_SPEED
        };

        // ─── FULLSCREEN TOGGLE ──────────────────────────────────────────
        this.input.keyboard.on('keydown-BACKTICK', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        });

        // ─── DESKTOP ONLY – mouse events ──────────────────────────────
        if (isDesktop) {


            // ─── POINTER WINDOW TRACKING (for edge scroll) ───
            this.pointerInWindow = true;
            this._onMouseEnter = () => { this.pointerInWindow = true; };
            this._onMouseLeave = () => { this.pointerInWindow = false; };
            document.addEventListener('mouseenter', this._onMouseEnter);
            document.addEventListener('mouseleave', this._onMouseLeave);
            this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

            // Left‑click → select
            this.input.on('pointerup', (pointer) => {
                // Only act if it's a tap (not a drag)
                if (Math.abs(pointer.upX - pointer.downX) > 10) return;
                if (Math.abs(pointer.upY - pointer.downY) > 10) return;

                const worldPos = cam.getWorldPoint(pointer.x, pointer.y);
                const tilePos = screenToTile(worldPos.x, worldPos.y);
                this._handleTap(tilePos.tileX, tilePos.tileY, pointer);
            });

            this.input.on('pointerdown', (pointer) => {
                if (pointer.leftButtonDown()) {
                    this.selectionStart = { x: pointer.worldX, y: pointer.worldY };
                    if (this.selectionBox) this.selectionBox.destroy();
                    this.selectionBox = this.add.graphics();
                    this.selectionBox.setDepth(10000);
                }
            });

            // _drawSelectionBox
            this.input.on('pointermove', (pointer) => {
                if (pointer.isDown && pointer.leftButtonDown() && this.selectionStart) {
                    // draw the box (already implemented in _drawSelectionBox)
                    this._drawSelectionBox();
                }
            });

            // _finaliseBoxSelection 
            this.input.on('pointerup', (pointer) => {
                if (this.selectionStart && pointer.leftButtonReleased()) {
                    this._finaliseBoxSelection();
                    this.selectionStart = null;
                }
            });

            // ── ESC: deselect ──
            this.input.keyboard.on('keydown-ESC', () => {
                this._clearSelection();
            });

            // Scroll wheel → zoom
            this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
                const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.5, 2.0);
                cam.setZoom(newZoom);
            });


        }

        // ─── KEYBOARD SCROLL ──────
        this.wasd = this.input.keyboard.addKeys('up,down,left,right,UP,DOWN,LEFT,RIGHT');


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
        const { up,down,left,right,UP,DOWN,LEFT,RIGHT } = this.wasd;

        if (LEFT.isDown) cam.scrollX -= speed;
        if (RIGHT.isDown) cam.scrollX += speed;
        if (UP.isDown) cam.scrollY -= speed;
        if (DOWN.isDown) cam.scrollY += speed;
    }

    // ─── TAP HANDLING ────────────────────────────────────────────────────────

    _handleTap(tileX, tileY, pointer) {
        const isRightClick = pointer && pointer.button === 2;

        // If units are selected and it's a right-click, issue command
        if (this.selectedUnitList.length > 0 && isRightClick) {
            this._issueCommand(tileX, tileY);
            return;
        }

        // Try to select a unit at the tapped tile
        const unit = this.unitManager.getUnitAtTile(PLAYER, tileX, tileY);
        if (unit) {
            this._clearSelection(); // always clear previous selection
            this._selectUnit(unit);
            return;
        }

        // Tapped empty tile while units selected → move command (left-click)
        if (this.selectedUnitList.length > 0) {
            this._issueCommand(tileX, tileY);
        } else {
            // Tapped nothing → deselect
            this._clearSelection();
        }
    }

    _issueCommand(tileX, tileY) {
        if (this.selectedUnitList.length === 0) return;

        // Move command — pathfind each unit to the target tile
        // Offset units in a formation to avoid stacking
        this.selectedUnitList.forEach((unit, index) => {
            const offset = this._formationOffset(index, this.selectedUnitList.length);
            const destX = tileX + offset.dx;
            const destY = tileY + offset.dy;
            if (!this.tileMap.isWalkable(unit.tileX, unit.tileY, unit.canSwim, unit.isCavalry)) {
                return; // Unit is stuck on unwalkable tile – don't attempt pathfinding
            }
            const path    = this.pathFinder.findPath(
                unit.tileX, unit.tileY,
                destX, destY,
                unit.canSwim,
                unit.isCavalry
            );
            unit.setPath(path);
            unit.target = null; // Clear attack target
        });
    }

    _formationOffset(index, total) {
        // Simple spread formation — units fan out around the target
        if (total === 1) return { dx: 0, dy: 0 };
        const row = Math.floor(index / 3);
        const col = index % 3;
        return { dx: col - 1, dy: row };
    }

     // ─── SELECTION MANAGEMENT ────────────────────────────────────────────────
    _selectUnit(unit) {
        if (this.selectedUnitList.includes(unit)) return;
        this.selectedUnitList.push(unit);

        // Visual selection indicator
        const { x, y } = tileToScreen(unit.tileX, unit.tileY);
        unit.selectionCircle = this.add.image(x, y, 'ui_selection_circle');
        unit.selectionCircle.setOrigin(0.5, 0.5);
        unit.selectionCircle.setDepth(unit.sprite.depth - 1);
        unit.selectionCircle.setAlpha(0.8);

        this._updateSelectionStore();
    }

    _clearSelection() {
        this.selectedUnitList.forEach(unit => {
            if (unit.selectionCircle) {
                unit.selectionCircle.destroy();
                unit.selectionCircle = null;
            }
        });
        this.selectedUnitList = [];
        this.selectedBuilding  = null;
        this._updateSelectionStore();

        if (this.selectionBox) {
            this.selectionBox.destroy();
            this.selectionBox   = null;
        }
        this.selectionStart = null;
    }

    _drawSelectionBox() {
        if (!this.selectionBox || !this.selectionStart) return;
        const ptr = this.input.activePointer;
        this.selectionBox.clear();
        this.selectionBox.lineStyle(1, 0x00ff88, 0.8);
        this.selectionBox.fillStyle(0x00ff88, 0.08);
        this.selectionBox.strokeRect(
            this.selectionStart.x,
            this.selectionStart.y,
            ptr.worldX - this.selectionStart.x,
            ptr.worldY - this.selectionStart.y
        );
        this.selectionBox.fillRect(
            this.selectionStart.x,
            this.selectionStart.y,
            ptr.worldX - this.selectionStart.x,
            ptr.worldY - this.selectionStart.y
        );
    }

    _finaliseBoxSelection() {
        if (!this.selectionStart || !this.selectionBox) return;
        const ptr = this.input.activePointer;

        const minX = Math.min(this.selectionStart.x, ptr.worldX);
        const maxX = Math.max(this.selectionStart.x, ptr.worldX);
        const minY = Math.min(this.selectionStart.y, ptr.worldY);
        const maxY = Math.max(this.selectionStart.y, ptr.worldY);

        const rect = new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);

        this._clearSelection();

        this.unitManager.getUnitsForOwner(PLAYER).forEach(unit => {
            if (!unit.alive) return;
            const { x, y } = tileToScreen(unit.tileX, unit.tileY);
            if (rect.contains(x, y)) {
                this._selectUnit(unit);
            }
        });

        if (this.selectionBox) {
            this.selectionBox.destroy();
            this.selectionBox = null;
        }
    }

    _updateSelectionStore() {
        selectedUnits.set(this.selectedUnitList.map(u => ({
            type: u.type,
            hp:   Math.floor(u.currentHp / u.maxHp * 100),
            id:   u.id
        })));
    }

    // ─── Public methods called by Svelte HUD buttons ────────────────────────────────────────────────
    commandAttackMove(tileX, tileY) {
        this.selectedUnitList.forEach((unit, i) => {
            const offset = this._formationOffset(i, this.selectedUnitList.length);
            const path   = this.pathFinder.findPath(
                unit.tileX, unit.tileY,
                tileX + offset.dx, tileY + offset.dy,
                unit.canSwim, unit.isCavalry
            );
            unit.setPath(path);
            unit.attackMove = true; // Attack any enemy encountered en route
        });
    }
    
    commandSubmerge() {
        this.selectedUnitList.forEach(u => {
            if (u.canSwim && !u.isSubmerged) u.submerge();
            else if (u.isSubmerged) u.surface();
        });
    }

    commandSneakStance() {
        this.selectedUnitList.forEach(u => {
            if (u.type !== UNIT_TYPE.CAVALRY) {
                u.setSneakStance(!u.sneakStance);
            }
        });
    }

    commandStop() {
        this.selectedUnitList.forEach(u => {
            u.path   = [];
            u.target = null;
        });
    }

    commandClearSelection(){
        this._clearSelection();
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