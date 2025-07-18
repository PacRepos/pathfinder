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

// info box text toggle
let currentModeType = 'grid';

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
            weightDisplay.innerHTML = `Total Path Weight: ${current.g.toFixed(2)} cells`;
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


let openMode = 'nothing';
let wallSegments = [], openStart = null, openEnd = null;
let drawOpenPath, drawLineBetween;
let clearOpenPath, resetOpen;
let openPath = null;
let spacing = 1;
let offsetX = 0, offsetY = 0;
let drag = false, startX, startY;
let wallDrawStart = null;
const snap_radius = 2;
const highlight_radius = 1;
let currentSnapCandidate = null;

function toggleMode() {
    const isOpenMode = document.getElementById('modeSwitch').innerHTML.includes('open');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    if (isOpenMode) {
        currentModeType = 'open';
        sidebar.innerHTML = `
            <div id="topBar">
                <button id="modeSwitch" onclick="toggleMode()">Switch to grid mode</button>
                <button id="infoButton" onclick="toggleInfo()">ℹ️</button>
            </div>
            <span id="themeToggle" onclick="toggleTheme()">🌙</span>
            <button onclick="setOpenMode('start')">Place Start</button>
            <button onclick="setOpenMode('end')">Place End</button>
            <button onclick="setOpenMode('wall')">Add/Remove Wall</button>
            <button onclick="drawOpenPath()">Calculate Path</button>
            <button onclick='clearOpenPath()'>Clear Path</button>
            <button onclick='resetOpen()'>Reset</button>
        `;
        main.innerHTML = `
            <div id='openWeightDisplay'></div>
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
    const openWeightDisplay = document.getElementById('openWeightDisplay');

    async function drawGrid() {
        openWeightDisplay.innerHTML = 'Total Path Weight: Uncalculated';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (openPath && openPath.length > 1) {
            let totalWeight = 0;
            for (let i = 1; i < openPath.length; i++) {
                const dx = openPath[i].x - openPath[i - 1].x;
                const dy = openPath[i].y - openPath[i - 1].y;
                totalWeight += Math.sqrt(dx * dx + dy * dy);
            }
            openWeightDisplay.innerHTML = `Total Path Weight: ${totalWeight.toFixed(2)}`;

            ctx.beginPath();
            ctx.moveTo(openPath[0].x * spacing - offsetX, openPath[0].y * spacing - offsetY);
            for (let p of openPath) {
                ctx.lineTo(p.x * spacing - offsetX, p.y * spacing - offsetY);
            }
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        wallSegments.forEach(seg => drawWall(seg, seg.highlighted));
        if (currentSnapCandidate) {
            const snapX = currentSnapCandidate.x * spacing - offsetX;
            const snapY = currentSnapCandidate.y * spacing - offsetY;
            ctx.beginPath();
            ctx.arc(snapX, snapY, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'orange';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'darkorange';
            ctx.stroke();
        }
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
                seg.highlighted = dist < highlight_radius;
            });
            findSnapPoint(mouse);
            drawGrid();
        }
    });
    canvas.addEventListener('mouseup', e => {
        if (openMode === 'wall' && wallDrawStart) {
            const rect = canvas.getBoundingClientRect();
            const end = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
            const snappedStart = findSnapPoint(wallDrawStart);
            const snappedEnd = findSnapPoint(end);
            wallSegments.push({
                x1: Math.round(snappedStart.x),
                y1: Math.round(snappedStart.y),
                x2: Math.round(snappedEnd.x),
                y2: Math.round(snappedEnd.y),
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
    canvas.addEventListener('wheel', e => {
        e.preventDefault();

        const zoomFactor = 1.05; // 5% per step
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
        const worldBeforeZoom = canvasToWorld(mouseX, mouseY);
        if (e.deltaY < 0) {
            spacing *= zoomFactor;
        } else {
            spacing /= zoomFactor;
        }
        spacing = Math.max(0.1, Math.min(spacing, 50));
        const worldAfterZoom = canvasToWorld(mouseX, mouseY);
        offsetX += (worldAfterZoom.x - worldBeforeZoom.x) * spacing;
        offsetY += (worldAfterZoom.y - worldBeforeZoom.y) * spacing;

        drawGrid();
    }, {passive: false}); // stop scrolling down with default behavior


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

    function smoothPath(path, isBlocked) {
        const key = (p) => `${p.x},${p.y}`;
        if (path.length <= 2) return path;
        const smoothed = [];
        let i = 0;
        while (i < path.length) {
            smoothed.push(path[i]);
            let j = path.length - 1;
            while (j > i + 1) {
                if (!isBlocked(path[i], path[j])) {
                    i = j - 1;
                    break;
                }
                j--;
            }
            i++;
        }
        // add end point
        if (key(smoothed[smoothed.length - 1]) !== key(path[path.length - 1])) {
            smoothed.push(path[path.length - 1]);
        }
        return smoothed;
    }

    drawOpenPath = function() {
        if (!openStart || !openEnd) return alert('Place both start and end points.');
        drawGrid();
        drawLineBetween(openStart, openEnd);
    };

    drawLineBetween = async function(start, end) {
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
                const smoothed = smoothPath(path, isBlocked);
                openPath = smoothed;
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

    function findSnapPoint(target) {
        currentSnapCandidate = null;
        for (let seg of wallSegments) {
            const ends = [
                {x: seg.x1, y: seg.y1},
                {x: seg.x2, y: seg.y2}
            ];
            for (let end of ends) {
                const dx = target.x - end.x;
                const dy = target.y - end.y;
                if (Math.sqrt(dx * dx + dy * dy) <= snap_radius) {
                    currentSnapCandidate = {x: end.x, y: end.y};
                    return currentSnapCandidate;
                }
            }
        }
        return target;
    }

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
        spacing = 1;
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

function toggleInfo() {
    const panel = document.getElementById('infoPanel');
    const paragraph = panel.querySelector('p');

    if (currentModeType === 'grid') {
        paragraph.innerHTML = "Press the moon/sun to toggle between dark/light mode.<br>You can adjust Row/Column size using the two inputs."
        + "Set a start and end point by clicking the buttons and then selecting a cell."
        + "<br>To set walls click on the Add/Remove Wall button and click and drag to quickly place walls, or click on each individual cell."
        + " Clicking again on a cell with a wall will remove it.<br>You can also change the weight of a cell by adjusting the desired weight"
        + " value in the input and then clicking on Change Weight and selecting the cell to change the weight of. Changing a cell to a weight of"
        + " one will reset it.<br>Click Start Pathfinding to draw the path search and highlight the best path. Clear just the path or reset the"
        + " whole grid with the Clear Pathfinding and Reset buttons.<br>Lastly, toggle cardinal/diagonal movement and toggle the pathfinding"
        + " animation with the Allow Diagonal Movement and Show Pathfinding Animation checkboxes.";
    } else {
        paragraph.innerHTML = "Press the moon/sun to toggle between dark/light mode.<br>The map is infinite (drag while in Place Start or"
        + " Place End mode to reveal more of the map) and is scrollable (scroll to zoom in and out).<br>Place your start and end points"
        + " with the Place Start and Place End buttons.<br>You can set and remove walls by selecting the Add Wall button. Click, drag"
        + " your mouse, and release to draw a wall. While drawing your wall, coming close to an endpoint of another line will reveal an"
        + " orange circle that means release will snap your line to the endpoint of the other line. Hovering over a line will highlight"
        + " it red, and clicking while a line is red will delete it.<br>Calculate the shortest path (with smoothing) with the Calculate"
        + " Path button (note complex paths will take a few seconds to a minute to load).<br>Lastly, clear the path or reset the whole"
        + " map with the Clear Path and Reset buttons.";
    }

    panel.classList.toggle('hidden');
}