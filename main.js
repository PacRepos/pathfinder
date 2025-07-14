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


/*
-------- GRID MODE --------
*/




// GRID SIZE:
let ROWS = 50, COLS = 50;
let grid = [], start = null, end = null, mouseDown = false, mode = 'nothing', isLight = false;
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
    if (label) {
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
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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



/*
-------- OPEN MODE --------
*/


/* Some cleanup here for the toggling */
let openMode = 'nothing';
let wallSegments = [], openStart = null, openEnd = null;
let drawOpenPath, drawLineBetween;
let clearOpenPath, resetOpen;
let openPath = null;
let spacing = 1;
let offsetX = 0, offsetY = 0;
let drag = false, startX, startY;
let wallDrawStart = null;

function toggleMode() {
    const isOpenMode = document.getElementById('modeSwitch').innerHTML.includes('open');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    if (isOpenMode) {

        sidebar.innerHTML =
        `
            <button id="modeSwitch" onclick="toggleMode()">Switch to grid mode</button>
            <span id="themeToggle" onclick="toggleTheme()">🌙</span>
            <button onclick="setOpenMode('start')">Place Start</button>
            <button onclick="setOpenMode('end')">Place End</button>
            <button onclick="setOpenMode('wall')">Add/Remove Wall</button>
            <button onclick="drawOpenPath()">Calculate Path</button>
            <button onclick='clearOpenPath()'>Clear Path</button>
            <button onclick='resetOpen()'>Reset</button>
        `;
        main.innerHTML = `
            <div id='weightDisplay'></div>
            <canvas id="openMap" width="800" height="600"></canvas>
        `;
        if (isLight) toggleTheme();
        initOpen();
    } else {
        location.reload();
    }
}

function setOpenMode(m) {
    openMode = m;
    document.querySelectorAll('#sidebar button').forEach(btn => btn.classList.remove('active'));
    const buttonMap = {
        'start': 'Place Start',
        'end': 'Place End',
        'wall': 'Add/Remove Wall'
    };
    const label = buttonMap[m];
    if (label) {
        const btn = Array.from(document.querySelectorAll('#sidebar button')).find(b => b.innerHTML.trim() === label);
        if (btn) btn.classList.add('active');
    }
}

function initOpen() {
    const canvas = document.getElementById('openMap');
    const ctx = canvas.getContext('2d');

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        weightDisplay.innerHTML = 'Total Path Weight: Uncalculated';
        if (openPath && openPath.length > 1) {
            ctx.beginPath();
            ctx.moveTo(openPath[0].x * spacing - offsetX, openPath[0].y * spacing - offsetY);
            for (let p of openPath) {
                ctx.lineTo(p.x * spacing - offsetX, p.y * spacing - offsetY);
            }
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        wallSegments.forEach(seg => drawWall(seg, seg.highlighted));
        if (openStart) drawMarker(openStart.x, openStart.y, 'green');
        if (openEnd) drawMarker(openEnd.x, openEnd.y, 'red');
    }

    canvas.addEventListener('mousedown', e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (openMode === 'wall') {
            wallDrawStart = canvasToWorld(mx, my);
        } else {
            drag = true;
            startX = e.clientX;
            startY = e.clientY;
        }
        canvas._dragStartTime = Date.now();
    });
    canvas.addEventListener('mousemove', e => {
        if (drag) {
            offsetX -= e.clientX - startX;
            offsetY -= e.clientY - startY;
            startX = e.clientX;
            startY = e.clientY;
            drawGrid();
        } else if (openMode === 'wall') {
            const rect = canvas.getBoundingClientRect();
            const mouse = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
            wallSegments.forEach(seg => {
                const dx = seg.x2 - seg.x1;
                const dy = seg.y2 - seg.y1;
                const lenSq = dx * dx + dy * dy;
                const t = ((mouse.x - seg.x1) * dx + (mouse.y - seg.y1) * dy) / lenSq;
                const closestX = seg.x1 + t * dx;
                const closestY = seg.y1 + t * dy;
                const dist = Math.sqrt((mouse.x - closestX) ** 2 + (mouse.y - closestY) ** 2);
                seg.highlighted = dist < 0.5;
            });
            drawGrid();
      }
    });
    canvas.addEventListener('mouseup', e => {
        if (openMode === 'wall' && wallDrawStart) {
            const rect = canvas.getBoundingClientRect();
            const end = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
            wallSegments.push({
                x1: Math.round(wallDrawStart.x),
                y1: Math.round(wallDrawStart.y),
                x2: Math.round(end.x),
                y2: Math.round(end.y),
                highlighted: false
            });
            wallDrawStart = null;
            drawGrid();
        }
        drag = false;
    });
    canvas.addEventListener('mouseleave', () => {
        drag = false;
        wallDrawStart = null;
    });
    canvas.addEventListener('click', e => {
        if (Date.now() - canvas._dragStartTime > 150) return;
        const rect = canvas.getBoundingClientRect();
        const {x, y} = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
        if (openMode === 'start') openStart = {x, y};
        else if (openMode === 'end') openEnd = {x, y};
        else if (openMode === 'wall') {
            const index = wallSegments.findIndex(w => w.highlighted);
            if (index !== -1) wallSegments.splice(index, 1); // remove highlighted wall segment
        }
        openPath = null;
        drawGrid();
    });


    function canvasToWorld(x, y) {
        return {
            x: Math.floor((x + offsetX) / spacing),
            y: Math.floor((y + offsetY) / spacing)
        };
    }
    function drawMarker(x, y, color) {
        const cx = x * spacing - offsetX;
        const cy = y * spacing - offsetY;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
    function drawWall(seg, highlight = false) {
        ctx.beginPath();
        ctx.moveTo(seg.x1 * spacing - offsetX, seg.y1 * spacing - offsetY);
        ctx.lineTo(seg.x2 * spacing - offsetX, seg.y2 * spacing - offsetY);
        ctx.strokeStyle = highlight ? 'red' : 'black';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    drawOpenPath = function() {
        if (!openStart || !openEnd) return alert('Place both start and end points.');
        drawGrid();
        drawLineBetween(openStart, openEnd);
    };

    drawLineBetween = function(start, end) {
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        const key = (p) => `${p.x},${p.y}`;
        gScore.clear();
        fScore.clear();
        cameFrom.clear();

        // Round coordinates to grid
        start = {x: Math.round(start.x), y: Math.round(start.y)};
        end = {x: Math.round(end.x), y: Math.round(end.y)};

        openSet.push(start);
        gScore.set(key(start), 0);
        fScore.set(key(start), heuristic(start, end));

        function heuristic(a, b) {
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        }

        function getNeighbors(node) {
            const directions = [
                {x: 1, y: 0}, {x: -1, y: 0},
                {x: 0, y: 1}, {x: 0, y: -1},
                {x: 1, y: 1}, {x: -1, y: -1},
                {x: 1, y: -1}, {x: -1, y: 1}
            ];
            return directions
                .filter(dir => {
                    if (Math.abs(dir.x) + Math.abs(dir.y) === 2) {
                        const check1 = {x: node.x + dir.x, y: node.y};
                        const check2 = {x: node.x, y: node.y + dir.y};
                        if (isBlocked(node, check1) || isBlocked(node, check2)) return false;
                    }
                    return true;
                })
                .map(dir => ({
                    x: Math.round(node.x + dir.x),
                    y: Math.round(node.y + dir.y)
                }));
        }
        function isBlocked(from, to) {
            if (!Array.isArray(wallSegments)) return false;
            const blocked = wallSegments.some(seg =>
                linesIntersect(from, to, {x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2})
            );
            return blocked;
        }

        function linesIntersect(p1, p2, q1, q2) { // cross product
            function ccw(a, b, c) {
                return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
            }
            return (ccw(p1, q1, q2) !== ccw(p2, q1, q2)) && (ccw(p1, p2, q1) !== ccw(p1, p2, q2));
        }

        while (openSet.length > 0) {
            openSet.sort((a, b) => (fScore.get(key(a)) || Infinity) - (fScore.get(key(b)) || Infinity));
            const current = openSet.shift();
            closedSet.add(key(current));
            if (!current) {
                console.error("Open set empty unexpectedly");
                break;
            }

            if (current.x === end.x && current.y === end.y) {
                const path = [];
                let curr = current;
                while (key(curr) !== key(start)) {
                    path.push(curr);
                    curr = cameFrom.get(key(curr));
                    if (!curr) break; // safety check
                }
                path.push(start);
                path.reverse();
                const currentKey = key(curr);
                const currentG = gScore.get(currentKey);
                weightDisplay.innerHTML = `Total Path Weight: ${currentG.toFixed(2)}`;
                openPath = path;
                drawGrid();
                return;
            }

            for (const neighbor of getNeighbors(current)) {
                if (closedSet.has(key(neighbor))) continue; 
                if (isBlocked(current, neighbor)) continue;

                const currentKey = key(current);
                const currentG = gScore.has(currentKey) ? gScore.get(currentKey) : Infinity;
                const tentativeG = currentG + 1;
                const neighborKey = key(neighbor);
                const prevG = gScore.has(neighborKey) ? gScore.get(neighborKey) : Infinity;
                if (tentativeG < prevG) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + heuristic(neighbor, end));
                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        alert("No path found in open mode");
    };

    clearOpenPath = function() {
        openPath = null;
        drawGrid();
    };

    resetOpen = function() {
        wallSegments = [];
        openStart = null;
        openEnd = null;
        openPath = null;
        offsetX = 0;
        offsetY = 0;
        drag = false;
        wallDrawStart = null;
        drawGrid();
    };
    drawGrid();
}


/*
----------- INITIALIZATION --------
*/
createGrid();