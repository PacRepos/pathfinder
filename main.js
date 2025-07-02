/* 
----------------------------------
Pathfinder Visualizer
1.4.1

TODO:
    - Paragraphical messages for no path found, start/end not set, etc.
    - better ui
    - add more algorithms (Dijkstra, etc.)
    - add weights to cells (click to set weight)
    - stop marking start as path

----------------------------------
*/
// GRID SIZE:
const ROWS = 50, COLS = 50;


let grid = [], start = null, end = null, mode = 'wall';
let mouseDown = false;

const gridEl = document.getElementById('grid');
const weightDisplay = document.getElementById('weightDisplay');
const diagonalToggle = document.getElementById('diagonalToggle');

document.body.addEventListener('mousedown', () => mouseDown = true);
document.body.addEventListener('mouseup', () => mouseDown = false);

function createGrid() {
    grid = [];
    gridEl.innerHTML = '';
    weightDisplay.innerHTML = 'Total Path Weight: Uncalculated';
    for (let y = 0; y < ROWS; y++) {
        const row = [];
        for (let x = 0; x < COLS; x++) {
            const cell = {
                x, y,
                isWall: false,
                f: 0, g: 0, h: 0, // f = g + h, g: cost start to current, h: cost to end
                parent: null,
                element: document.createElement('div') // individualized divs for each cell
            };
            cell.element.className = 'cell';
            cell.element.id = `cell-${x}-${y}`;
            cell.element.addEventListener('click', () => handleClick(cell));
            cell.element.addEventListener('mouseenter', () => {
                if (mouseDown && mode === 'wall') handleClick(cell); // add/remove wall on mouse drag
            });
            gridEl.appendChild(cell.element);
            row.push(cell);
        }
        grid.push(row);
    }
}

function setMode(m) {
    mode = m;
}

function handleClick(cell) {
    if (mode === 'start') {
        if (start) start.element.classList.remove('start'); // handling if start already exists
        start = cell;
        cell.element.classList.add('start');
    } else if (mode === 'end') {
        if (end) end.element.classList.remove('end'); // handling if end already exists
        end = cell;
        cell.element.classList.add('end');
    } else if (mode === 'wall') {
        if (cell !== start && cell !== end) { // toggle wall state
            cell.isWall = !cell.isWall;
            cell.element.classList.toggle('wall');
        }
    }
}

function distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan distance
}


function getNeighbors(cell) {
    const cardinalDirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];
    const diagonalDirs = [
        [1, 1], [-1, -1], [1, -1], [-1, 1]
    ];
    const dirs = diagonalToggle.checked ? cardinalDirs.concat(diagonalDirs) : cardinalDirs;
    return dirs.map(([dx, dy]) => {
        const x = cell.x + dx, y = cell.y + dy;
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
            const neighbor = grid[y][x];
            if (neighbor.isWall) return null;
            if (dx !== 0 && dy !== 0) {
                const nx1 = cell.x + dx;
                const ny1 = cell.y;
                const nx2 = cell.x;
                const ny2 = cell.y + dy;

                if (
                    nx1 < 0 || nx1 >= COLS || ny2 < 0 || ny2 >= ROWS ||
                    nx2 < 0 || nx2 >= COLS || ny1 < 0 || ny1 >= ROWS
                ) return null;

            const n1 = grid[ny1][nx1];
            const n2 = grid[ny2][nx2];
                if (n1.isWall && n2.isWall) return null; // no corner cutting
            }
            return neighbor;
        }
        alert(`Cell was out of bounds: (${x}, ${y})`);
        return null;
    }).filter(n => n); // if null (out of bounds or wall)
}

async function startAStar() {
    clearPath(); // clear previous path
    if (!start || !end) return alert("Set both start and end points.");

    let openSet = [start];
    let closedSet = [];

    for (let row of grid) {
        for (let cell of row) { // clear values + parents
            cell.g = 0;
            cell.f = 0;
            cell.h = 0;
            cell.parent = null;
        }
    }

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        let current = openSet.shift(); // lowest total cost cell

        if (current === end) { // if we reached the end
            let path = [];
            let temp = current;
            while (temp) {
                path.push(temp);
                temp = temp.parent;
            }
            path.reverse();
            for (let cell of path) { // highlight the path
                if (cell !== start && cell !== end) {
                    cell.element.classList.add('path');
                    await new Promise(r => setTimeout(r, 10));
                }
            }
            weightDisplay.textContent = `Total Path Weight: ${current.g.toFixed(2)}`;
            return;
        }

        closedSet.push(current);
        if (current !== start) {
            current.element.classList.add('visited');
        }
        for (let neighbor of getNeighbors(current)) {
            if (closedSet.includes(neighbor)) continue; // already been
            let isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
            let tentativeG = current.g + (isDiagonal ? Math.SQRT2 : 1);
            // 1.4 cost for diagonal, 1 for straight

            if (!openSet.includes(neighbor) || tentativeG < neighbor.g) { // if not in open set or found a better path
                neighbor.g = tentativeG;
                neighbor.h = distance(neighbor, end);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;
                if (!openSet.includes(neighbor)) openSet.push(neighbor); // add to open set
            }
        }
        await new Promise(r => setTimeout(r, 5)); // visualize pause (change as needed)
    }

    console.log("No path found."); // TODO create a paragraphical message
    alert("No path found.");
}

function resetGrid() {
    createGrid();
    start = null;
    end = null;
}

function clearPath() {
    for (let row of grid) {
        for (let cell of row) {
            cell.element.classList.remove('path', 'visited');
        }
    }
    weightDisplay.innerHTML = '';
}

createGrid();