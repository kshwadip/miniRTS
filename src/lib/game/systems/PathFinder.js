import { inBounds } from "../utils/IsoMath";

export class PathFinder {
    constructor(tileMap) {
        this.tileMap = tileMap;
    }

    // Returns array of {tileX, tileY} waypoints from start to end
    // canSwim and isCavalry determine which tiles are traversable
    findPath(startX, startY, endX, endY, canSwim = false, isCavalry = false) {
        if (startX === endX && startY === endY) {
            return [];
        }

        const open   = new Map();
        const closed = new Set();
        const cameFrom = new Map();
        const gScore   = new Map();
        const fScore   = new Map();

        const startKey = `${startX},${startY}`;
        const endKey   = `${endX},${endY}`;

        gScore.set(startKey, 0);
        fScore.set(startKey, this._heuristic(startX, startY, endX, endY));
        open.set(startKey, { x: startX, y: startY });

        while (open.size > 0) {
            // Get node with lowest fScore
            let current = null;
            let lowestF = Infinity;
            for (const [key, node] of open) {
                const f = fScore.get(key) || Infinity;
                if (f < lowestF) { lowestF = f; current = { key, ...node }; }
            }

            if (!current) {
                break;
            }

            if (current.key === endKey) {
                return this._reconstructPath(cameFrom, current.key);
            }

            open.delete(current.key);
            closed.add(current.key);

            // 8-directional neighbours
            const neighbours = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x,     y: current.y + 1 },
                { x: current.x,     y: current.y - 1 },
                { x: current.x + 1, y: current.y + 1 },
                { x: current.x - 1, y: current.y - 1 },
                { x: current.x + 1, y: current.y - 1 },
                { x: current.x - 1, y: current.y + 1 }
            ];

            for (const n of neighbours) {
                const nKey = `${n.x},${n.y}`;
                if (closed.has(nKey)) continue;
                if (!inBounds(n.x, n.y, this.tileMap.width, this.tileMap.height)) continue;
                if (!this.tileMap.isWalkable(n.x, n.y, canSwim, isCavalry)) continue;

                const tentativeG = (gScore.get(current.key) || 0) + 1;

                if (tentativeG < (gScore.get(nKey) || Infinity)) {
                    cameFrom.set(nKey, current.key);
                    gScore.set(nKey, tentativeG);
                    fScore.set(nKey, tentativeG + this._heuristic(n.x, n.y, endX, endY));
                    open.set(nKey, n);
                }
            }

            // Limit search to prevent hanging on impossible paths
            if (closed.size > 2000) break;
        }

        return []; // No path found
    }

    _heuristic(x1, y1, x2, y2) {
        // Chebyshev distance — consistent with tileDistance()
        return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    }

    _reconstructPath(cameFrom, currentKey) {
        const path = [];
        let key = currentKey;
        while (cameFrom.has(key)) {
            const [x, y] = key.split(',').map(Number);
            path.unshift({ tileX: x, tileY: y });
            key = cameFrom.get(key);
        }
        return path;
    }
}