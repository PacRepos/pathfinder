/* 
----------------------------------
Pathfinder Visualizer
1.0.0

TODO:
    - Add diagonal movement support
    - Paragraphical messages for no path found, start/end not set, etc.
    - 

----------------------------------
*/
// GRID SIZE:
const ROWS = 50, COLS = 50;


let grid = [], start = null, end = null, mode = 'wall';

const gridEl = document.getElementById('grid');

function createGrid() {
    grid = [];
    gridEl.innerHTML = '';
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
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]]; // NSEW
    return dirs.map(([dx,dy]) => { // dir x/y
        const x = cell.x + dx, y = cell.y + dy;
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
            return grid[y][x];
        }
        console.log(`Cell was out of bounds: (${x}, ${y})`); // debug log for out of bounds
        alert(`Cell was out of bounds: (${x}, ${y})`); // alert for out of bounds
        return null;
    }).filter(n => n && !n.isWall); // if n is not null and not a wall (from above)
}

async function startAStar() {
    if (!start || !end) return alert("Set both start and end points.");
    if (start === end) return alert("Start and end points cannot be the same.");

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
            return;
        }

        closedSet.push(current);
        current.element.classList.add('visited');

        for (let neighbor of getNeighbors(current)) {
            if (closedSet.includes(neighbor)) continue; // already been
            let tentativeG = current.g + 1; // TODO consider diagonal movement cost or special costs

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

createGrid();