// Game Configuration
const BOARD_SIZE = 48;
const ROWS = 8;
const COLS = 6;

// Game State
// Game State
let currentPosition = 1;
let isMoving = false;
let movesLeft = 20;
const MAX_MOVES = 20;

// DOM Elements
const containerEl = document.getElementById('game-container'); // Wrapper
const boardEl = document.getElementById('game-board'); // Grid only
const playerEl = document.getElementById('player');
const rollBtn = document.getElementById('roll-btn');
const diceContainer = document.getElementById('dice-container');
const positionDisplay = document.getElementById('position-display');
const gameStatus = document.getElementById('game-status');
const canvas = document.getElementById('board-canvas');
const ctx = canvas.getContext('2d');
const winModal = document.getElementById('win-modal');
const playAgainBtn = document.getElementById('play-again-btn');
const movesDisplay = document.getElementById('moves-display');

// Snakes and Ladders Definitions (Start -> End)
// Ladders: Go UP (Start < End)
// Snakes: Go DOWN (Start > End)
const LADDERS = [
    { start: 3, end: 16 },
    { start: 14, end: 28 },
    { start: 33, end: 46 }
];

const SNAKES = [
    { start: 19, end: 6 },
    { start: 47, end: 22 },
    { start: 38, end: 24 },
    { start: 29, end: 9 }
];

// Initialize Game
function initGame() {
    createBoard();
    resizeCanvas();
    drawBoardGraphics();
    updatePlayerPosition(1);

    rollBtn.addEventListener('click', rollDice);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawBoardGraphics();
        updatePlayerUI();
    });
}

function createBoard() {
    boardEl.innerHTML = '';
    // Create 48 cells (1 to 48)
    // Visual order depends on Zigzag pattern, but DOM order usually easiest logic is top-left to bottom-right or reverse.
    // But for Tailwind Grid, it fills row by row.
    // Row 8 (Top): 43 44 45 46 47 48 (Left to Right)
    // ...
    // Row 1 (Bottom): 1 2 3 4 5 6 (Left to Right) if normal, but Snakes usually zigzag.

    // Zigzag Pattern logic:
    // Row 1 (Bottom): 1-6 (L->R)
    // Row 2: 12-7 (R->L)
    // Row 3: 13-18 (L->R)
    // ...

    // However, HTML Grid fills Top-Left first.
    // So we need to generate cells for Row 8 down to Row 1.

    for (let row = ROWS; row >= 1; row--) {
        const rowCells = [];
        for (let col = 1; col <= COLS; col++) {
            let num;
            if (row % 2 !== 0) { // Odd rows (1, 3, 5, 7) are increasing Left to Right in logic.
                // But wait, standard zigzag usually starts 1 at bottom-left.
                // Row 1: 1..6
                // Row 2: 12..7
                // Row 3: 13..18
                // ...
                num = (row - 1) * COLS + col;
            } else {
                // Even rows (2, 4, 6, 8) are Reverse
                num = (row * COLS) - col + 1;
            }
            rowCells.push(num);
        }

        // If row is even (e.g. 8), logic says 48..43 (R->L), so num order above is correct for logic? 
        // Wait. Let's trace.
        // Row 1 (Odd): (0)*6 + 1 = 1 to 6. Correct.
        // Row 2 (Even): (2)*6 - 1 + 1 = 12 ... 7. Correct.

        // BUT visual CSS Grid fills L->R.
        // So for Row 2, we want visual L to be 12, R to be 7.
        // My logic above generates `num` correctly for the L->R grid slot?
        // Let's check Row 2 col 1 (Leftmost): num = (2*6) - 1 + 1 = 12. Correct.
        // Row 2 col 6 (Rightmost): num = 12 - 6 + 1 = 7. Correct.

        // So the loop above generates numbers exactly as they should appear in the DOM order (Left To Right) for that row.

        rowCells.forEach(n => {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = n;
            cell.textContent = n;

            // Base style:
            cell.classList.add('bg-white', 'text-slate-400', 'font-mono');

            // Apply specific colors as requested
            // Green for Ladders (Start & End)
            if (LADDERS.find(l => l.start === n || l.end === n)) {
                cell.style.backgroundColor = '#86efac'; // Light Green (green-300)
                cell.classList.remove('text-slate-400');
                cell.classList.add('text-green-800', 'font-bold');
            }
            // Light Red for Snakes (Start & End)
            else if (SNAKES.find(s => s.start === n || s.end === n)) {
                cell.style.backgroundColor = '#fca5a5'; // Light Red (red-300)
                cell.classList.remove('text-slate-400');
                cell.classList.add('text-red-800', 'font-bold');
            }
            else if (n % 2 === 0) {
                // Even cells default
                cell.classList.remove('bg-white');
                cell.classList.add('bg-emerald-50/50');
            }

            boardEl.append(cell);
        });
    }
}

function resizeCanvas() {
    const rect = containerEl.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

function getCellCenter(number) {
    // Find the DOM element for the cell number
    const cell = boardEl.querySelector(`[data-index='${number}']`);
    if (!cell) return { x: 0, y: 0 };

    // We need coordinates relative to the container (the parent of boardEl and playerEl)
    // The player is absolute positioned in the container.
    const containerRect = containerEl.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    return {
        x: cellRect.left - containerRect.left + cellRect.width / 2,
        y: cellRect.top - containerRect.top + cellRect.height / 2
    };
}

function drawBoardGraphics() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ladders (Green/Teal)
    LADDERS.forEach(ladder => {
        const start = getCellCenter(ladder.start);
        const end = getCellCenter(ladder.end);
        drawLadder(start, end);
    });

    // Draw Snakes (Red/Rose)
    SNAKES.forEach(snake => {
        const start = getCellCenter(snake.start);
        const end = getCellCenter(snake.end);
        drawSnake(start, end);
    });
}

function drawLadder(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Dynamic sizing
    const unit = canvas.width / COLS;
    const width = unit * 0.35; // Ladder width relative to cell
    const stepInterval = unit * 0.3;
    const steps = Math.floor(len / stepInterval);

    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);

    ctx.strokeStyle = '#2dd4bf'; // Teal
    ctx.lineWidth = unit * 0.08;
    ctx.lineCap = 'round';

    // Rails
    ctx.beginPath();
    ctx.moveTo(0, -width / 2);
    ctx.lineTo(len, -width / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, width / 2);
    ctx.lineTo(len, width / 2);
    ctx.stroke();

    // Rungs
    ctx.lineWidth = unit * 0.06;
    for (let i = 1; i < steps; i++) {
        const x = (len / steps) * i;
        ctx.beginPath();
        ctx.moveTo(x, -width / 2);
        ctx.lineTo(x, width / 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawSnake(start, end) {
    // Snake: Start is Head (Top), End is Tail (Bottom) usually in logic (Start > End)
    // But graphics wise, we draw from Start pt to End pt.

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Dynamic sizing
    const unit = canvas.width / COLS;
    const snakeWidth = unit * 0.12;

    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);

    // Body (Wavy)
    ctx.strokeStyle = '#fb7185'; // Rose
    ctx.lineWidth = snakeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const waves = Math.floor(len / (unit * 0.6)) * 2; // Number of bends
    const waveAmp = unit * 0.25;

    // Simple sine wave loop
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const detail = 5; // step size for drawing curve
    for (let x = 0; x <= len; x += detail) {
        const y = Math.sin(x * (Math.PI * 2) / (unit * 1.5)) * waveAmp;
        ctx.lineTo(x, y);
    }
    // Ensure we hit the end
    ctx.lineTo(len, 0);
    ctx.stroke();

    // Draw Head at 0,0 (Start)
    const headSize = unit * 0.2;
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(0, 0, headSize, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeOffset = headSize * 0.4;
    const eyeSize = headSize * 0.25;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(eyeOffset, -eyeOffset, eyeSize, 0, Math.PI * 2);
    ctx.arc(eyeOffset, eyeOffset, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    const pupilSize = eyeSize * 0.5;
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(eyeOffset + 1, -eyeOffset, pupilSize, 0, Math.PI * 2);
    ctx.arc(eyeOffset + 1, eyeOffset, pupilSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function rollDice() {
    if (isMoving) return;
    if (movesLeft <= 0) return;

    movesLeft--;
    movesDisplay.textContent = movesLeft;

    isMoving = true;
    rollBtn.disabled = true;

    let roll = Math.floor(Math.random() * 6) + 1;

    // Animation placeholder
    diceContainer.classList.add('dice-rolling');
    diceContainer.textContent = '🎲';

    setTimeout(() => {
        diceContainer.classList.remove('dice-rolling');
        diceContainer.textContent = roll;
        movePlayer(roll);
    }, 600);
}

async function movePlayer(steps) {
    const targetPos = currentPosition + steps;
    // Handle overshoot if necessary, but for now simple clamp or stop
    // If target > BOARD_SIZE, we can clamp or make them bounce.
    // Let's implement simple clamping for visual walk to 48 then stop/bounce?
    // Rule: Must hit 48 exactly? Or just reach it.
    // Let's assume standard rule: if roll takes you past 48, you bounce back.

    let path = [];
    let tempPos = currentPosition;

    // Generate path
    for (let i = 0; i < steps; i++) {
        tempPos++;
        if (tempPos > BOARD_SIZE) {
            // Bounce back: 49 becomes 47
            // Calculate excess: tempPos - BOARD_SIZE
            // newPos = BOARD_SIZE - excess
            // Simple approach: if we just incremented to 49, we actually want to go to 47.
            // But we can model the "step" as just moving -1 if we are bouncing.
            // Easier: just calculate sequence of numbers.
            // 46 -> 47 -> 48 -> 47 -> 46

            // Re-calculate math:
            // We want 'steps' total movements.
            // If at 47, roll 2.
            // Step 1: 48.
            // Step 2: 47.
            // Path: [48, 47]

            // Correct logic for bounce
            const oversized = tempPos - BOARD_SIZE;
            path.push(BOARD_SIZE - oversized);
        } else {
            path.push(tempPos);
        }
    }

    // Determine final destination from path
    const destination = path[path.length - 1];
    gameStatus.textContent = `เดิน ${steps} ช่อง... ไปที่ ${destination}`;

    // Animate walking
    for (const pos of path) {
        currentPosition = pos;
        updatePlayerUI();
        // Play step sound?
        await new Promise(resolve => setTimeout(resolve, 400)); // Wait 400ms per step
    }

    // Final position check
    currentPosition = destination;
    updatePlayerPosition(currentPosition);

    // Check special tiles after walking finished
    checkSpecialTiles();
}

function checkSpecialTiles() {
    const ladder = LADDERS.find(l => l.start === currentPosition);
    if (ladder) {
        gameStatus.textContent = "เจอไต่บันได! ขึ้นไปเลย!";
        currentPosition = ladder.end;
        updatePlayerUI();
    }

    const snake = SNAKES.find(s => s.start === currentPosition);
    if (snake) {
        gameStatus.textContent = "โอ้ย! เจองูฉก ตกลงไปข้างล่าง!";
        currentPosition = snake.end;
        updatePlayerUI();
    }

    if (currentPosition === BOARD_SIZE) {
        gameStatus.textContent = "ยินดีด้วย! คุณชนะแล้ว!";
        // Show Win Modal
        winModal.classList.remove('hidden');
    } else {
        isMoving = false;

        if (movesLeft > 0) {
            rollBtn.disabled = false;
        } else {
            gameStatus.textContent = "จบเกม! คุณใช้สิทธิ์ทอยครบแล้ว";
            rollBtn.disabled = true;
            rollBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    positionDisplay.textContent = currentPosition;
}

function updatePlayerUI() {
    const center = getCellCenter(currentPosition);
    // Adjust for player token size (centered)
    // We can't rely on fixed 16px offset anymore
    const w = playerEl.offsetWidth;
    const h = playerEl.offsetHeight;

    // We are using left/top on playerEl which is absolute in relative container
    // center.x/y assumes top-left of container is 0,0
    playerEl.style.transform = `translate(${center.x - w / 2}px, ${center.y - h / 2}px)`;
}

function updatePlayerPosition(pos) {
    currentPosition = pos;
    positionDisplay.textContent = pos;
    // Need to wait for DOM grid to be ready?
    // Use requestAnimationFrame
    requestAnimationFrame(() => updatePlayerUI());
}

function resetGame() {
    currentPosition = 1;
    isMoving = false;
    movesLeft = MAX_MOVES;
    movesDisplay.textContent = movesLeft;

    rollBtn.disabled = false;
    rollBtn.classList.remove('opacity-50', 'cursor-not-allowed');

    gameStatus.textContent = "เริ่มเกมใหม่!";
    diceContainer.textContent = '🎲';
    winModal.classList.add('hidden');
    updatePlayerPosition(1);
}

// Start
initGame();
