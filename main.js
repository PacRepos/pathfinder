/* 
----------------------------------
Pathfinder Visualizer
2.0.0
    - As of now finished everything I wanted to do with the grid mode
    - Working on open mode
    - Expect:
        - Infinitely scrolling grid (zoom in/out)
        - Points vs cells
        - Walls that take up a zone vs a cell
        - Weights that take up a zone vs a cell
        - Greedy smoothing/String pulling for pathfinding

----------------------------------
*/
// GRID SIZE:
let ROWS = 50, COLS = 50;


let grid = [], start = null, end = null, mouseDown = false, mode = 'nothing', isLight = document.body.classList.toggle('light-mode'); // force refresh light mode
let customWeight = 2;
// customWeight has to be equal to the default label box value since label box does not update until first input

const gridEl = document.getElementById('grid');
const weightDisplay = document.getElementById('weightDisplay');
const diagonalToggle = document.getElementById('diagonalToggle');
const animationToggle = document.getElementById('animationToggle');

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
                label: document.createElement('div'),
                weight: 1,
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

            cell.element.style.position = 'relative';
            cell.label.style.cssText = 'position:absolute;width:100%;height:100%;font-size:10px;text-align:center;line-height:15px;color:black;pointer-events:none;display:none;';
            cell.label.innerHTML = cell.weight;
            cell.element.appendChild(cell.label);

            gridEl.appendChild(cell.element);
            row.push(cell);
        }
        grid.push(row);
    }
}

function resizeGrid() {
    const rowInput = document.getElementById('rowsInput');
    const colInput = document.getElementById('colsInput');
    if (!rowInput || !colInput || isNaN(rowInput.value) || isNaN(colInput.value) || rowInput.value < 5 || colInput.value < 5 || rowInput.value > 100 || colInput.value > 100) {
        alert("Invalid input. Please enter values between 5 and 100.");
        return;
    }
    ROWS = Math.max(5, Math.min(100, parseInt(rowInput.value)));
    COLS = Math.max(5, Math.min(100, parseInt(colInput.value)));
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, 15px)`;
    gridEl.style.gridTemplateRows = `repeat(${ROWS}, 15px)`;
    createGrid();
}

function setMode(m) {
    mode = m;
    document.querySelectorAll('#sidebar button').forEach(btn => btn.classList.remove('active'));
    const buttonMap = {
        'start': 'Set Start',
        'end': 'Set End',
        'wall': 'Add/Remove Wall',
        'weight': 'Change Weight'
    };
    const label = buttonMap[m];
    if (label) { // search by label; probably not the best way but works
        const btn = Array.from(document.querySelectorAll('#sidebar button')).find(b => b.innerHTML.trim() === label);
        if (btn) btn.classList.add('active');
    }
}

function updateWeight() {
    const input = document.getElementById('weightInput');
    if (!input.value || isNaN(input.value) || input.value < 1) {
        alert("The minimum weight is 1.");
    } else if (input.value > 9) {
        alert("Visibility may have issues with weights above 9 - the algorithm will still work, but the display may not be ideal.");
    }
    customWeight = Math.max(1, parseInt(input.value));
}

function handleClick(cell) {
    if (mode !== 'weight') { // reset cell if not in weight mode to clear text and color
        if (isLight) {
            cell.element.style.backgroundColor = 'white';
        } else {
            cell.element.style.backgroundColor = '#888';
        }
        cell.label.innerHTML = '';
        cell.label.style.display = 'none';
    }
    if (mode === 'start') {
        if (start) {
            start.element.classList.remove('start');
        }
        start = cell;
        cell.element.classList.add('start');
    } else if (mode === 'end') {
        if (end) {
            end.element.classList.remove('end');
        }
        end = cell;
        cell.element.classList.add('end');
    } else if (mode === 'wall') {
        if (cell !== start && cell !== end) {
            cell.isWall = !cell.isWall;
            cell.element.classList.toggle('wall');
        }
    } else if (mode === 'weight') {
        if (!cell.isWall && cell !== start && cell !== end) {
            cell.weight = customWeight;
            if (customWeight === 1) {
                if (isLight) {
                    cell.element.style.backgroundColor = 'white';
                } else {
                    cell.element.style.backgroundColor = '#888';
                }
                cell.label.innerHTML = '';
                cell.label.style.display = 'none';
            } else {
                cell.element.style.backgroundColor = `rgba(255, 135, 0, ${Math.min(0.9, 0.1 + 0.1 * customWeight)})`;
                cell.label.innerHTML = customWeight;

                cell.label.style.display = 'block';
            }
        }
    }
    clearColoring();
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

                if ( // extra out of bounds check cause top was buggy
                    nx1 < 0 || nx1 >= COLS || ny2 < 0 || ny2 >= ROWS ||
                    nx2 < 0 || nx2 >= COLS || ny1 < 0 || ny1 >= ROWS
                ) return null;

                const n1 = grid[ny1][nx1];
                const n2 = grid[ny2][nx2];
                if (n1.isWall && n2.isWall) return null; // no corner cutting
            }
            return neighbor;
        }
        return null;
    }).filter(n => n); // if null (out of bounds or wall)
}

async function startAStar() {
    clearPath();
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
                    if (animationToggle.checked) {
                        await new Promise(r => setTimeout(r, 10));
                    }
                }
            }
            weightDisplay.innerHTML = `Total Path Weight: ${current.g.toFixed(2)}`;
            return;
        }

        closedSet.push(current);
        if (current !== start) {
            current.element.classList.add('visited');
        }
        for (let neighbor of getNeighbors(current)) {
            if (closedSet.includes(neighbor)) continue; // already been
            let isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
            let baseCost = isDiagonal ? Math.SQRT2 : 1;
            let tentativeG = current.g + baseCost * neighbor.weight;
            // 1.4 cost for diagonal, 1 for straight

            if (!openSet.includes(neighbor) || tentativeG < neighbor.g) { // if not in open set or found a better path
                neighbor.g = tentativeG;
                neighbor.h = distance(neighbor, end);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;
                if (!openSet.includes(neighbor)) openSet.push(neighbor); // add to open set
            }
        }
        if (animationToggle.checked) {
            await new Promise(r => setTimeout(r, 5));
        }
    }
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
    clearColoring();
    weightDisplay.innerHTML = 'Total Path Weight: Uncalculated';
}

function toggleTheme() {
    isLight = document.body.classList.toggle('light-mode');
    clearColoring();
    const toggle = document.getElementById('themeToggle');
    toggle.style.transform = 'translateX(-20px)';
    toggle.style.opacity = 0;
    setTimeout(() => {
        toggle.textContent = isLight ? '☀️' : '🌙';
        toggle.style.transform = 'translateX(0)';
        toggle.style.opacity = 1;
    }, 150);
}

function clearColoring() {
    for (let row of grid) {
        for (let cell of row) {
            if (!cell.isWall && cell !== start && cell !== end && cell.weight === 1) {
                if (isLight) {
                    cell.element.style.backgroundColor = 'white';
                } else {
                    cell.element.style.backgroundColor = '#888';
                }
            }
        }
    }
}

function toggleMode() {
    const isGridMode = document.getElementById('modeSwitch').innerHTML.includes('open');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    if (isGridMode) {
        sidebar.innerHTML = '<button id="modeSwitch" onclick="toggleMode()">Switch to grid mode</button>';
        main.innerHTML = '';
    } else {
        location.reload(); // Reload for grid mode
    }
}

createGrid();