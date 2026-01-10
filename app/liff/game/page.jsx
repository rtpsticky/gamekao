'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import liff from '@line/liff';
import { useSearchParams } from 'next/navigation';
import { getUserGameData } from '@/app/actions/game';

// Game Configuration
const BOARD_SIZE = 48;
const ROWS = 8;
const COLS = 6;
const MAX_MOVES = 20;

// LIFF Version: No Snakes, No Ladders
const LADDERS = [];
const SNAKES = [];

function GameContent() {
    const searchParams = useSearchParams();
    const action = searchParams.get('action');

    const [currentPosition, setCurrentPosition] = useState(1);
    const [movesLeft, setMovesLeft] = useState(0);
    const [isMoving, setIsMoving] = useState(false);
    const [diceValue, setDiceValue] = useState('🎲');
    const [gameStatus, setGameStatus] = useState('กำลังโหลดข้อมูล...');
    const [showWinModal, setShowWinModal] = useState(false);
    const [isRolling, setIsRolling] = useState(false);
    const [liffError, setLiffError] = useState(null);
    const [userData, setUserData] = useState(null);

    const containerRef = useRef(null);
    const boardRef = useRef(null);
    const canvasRef = useRef(null);
    const playerRef = useRef(null);

    // Fetch User Data Logic
    const fetchUserData = async (userId) => {
        try {
            const data = await getUserGameData(userId);
            if (data.error) {
                console.error(data.error);
                setGameStatus("ไม่พบข้อมูลผู้เล่น");
                return;
            }

            setUserData(data);
            setMovesLeft(data.diceCount);

            // Logic for "Walking 1 step" animation
            // If action is exercise, we assume they JUST walked 1 step.
            // So previous position was (data.currentPosition - 1).
            // But if they are at 0 or 1, might be edge case. 
            // Also need to check if they actually gained a position? 
            // Lets trust the DB position.

            if (action === 'exercise') {
                const targetPos = data.currentPosition;
                const startPos = Math.max(1, targetPos - 1); // Ensure we don't start below 1

                // Set initial visual position to startPos
                setCurrentPosition(startPos);

                if (targetPos > startPos) {
                    setGameStatus("รับแต้มจากการออกกำลังกาย... เดิน 1 ช่อง!");
                    // Trigger walk animation after a short delay
                    setTimeout(() => {
                        movePlayerInternal(startPos, 1); // Move 1 step
                    }, 1000);
                } else {
                    // Already at same pos (maybe maxed out?)
                    setCurrentPosition(targetPos);
                    setGameStatus("คุณอยู่ที่เส้นชัยแล้ว!");
                }
            } else {
                // Normal load
                setCurrentPosition(Math.max(1, data.currentPosition));
                setGameStatus("พร้อมลุย! กดปุ่มเพื่อทอยเต๋า");
            }

        } catch (err) {
            console.error(err);
            setGameStatus("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        }
    };


    useEffect(() => {
        // Initialize LIFF
        liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID_GAME || '' })
            .then(() => {
                console.log('LIFF initialized');
                if (!liff.isLoggedIn()) {
                    liff.login();
                } else {
                    liff.getProfile().then(profile => {
                        fetchUserData(profile.userId);
                    });
                }
            })
            .catch((err) => {
                console.error('LIFF initialization failed', err);
                setLiffError(err.toString());
            });
    }, []);

    // Helper to get cell center coordinates
    const getCellCenter = (number) => {
        if (!boardRef.current || !containerRef.current) return { x: 0, y: 0 };

        const cell = boardRef.current.querySelector(`[data-index='${number}']`);
        if (!cell) return { x: 0, y: 0 };

        const containerRect = containerRef.current.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();

        return {
            x: cellRect.left - containerRect.left + cellRect.width / 2,
            y: cellRect.top - containerRect.top + cellRect.height / 2
        };
    };

    // Drawing Logic - Kept minimal as arrays are empty, but structure preserved for compatibility if needed later.
    const drawBoardGraphics = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !containerRef.current) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Ladders (Empty)
        LADDERS.forEach(ladder => {
            const start = getCellCenter(ladder.start);
            const end = getCellCenter(ladder.end);
            drawLadder(ctx, start, end, canvas.width);
        });

        // Draw Snakes (Empty)
        SNAKES.forEach(snake => {
            const start = getCellCenter(snake.start);
            const end = getCellCenter(snake.end);
            drawSnake(ctx, start, end, canvas.width);
        });
    };

    // Helper drawing functions kept for completeness, though unused in this version
    const drawLadder = (ctx, start, end, canvasWidth) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const unit = canvasWidth / COLS;
        const width = unit * 0.35;
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
    };

    const drawSnake = (ctx, start, end, canvasWidth) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const unit = canvasWidth / COLS;
        const snakeWidth = unit * 0.12;

        ctx.save();
        ctx.translate(start.x, start.y);
        ctx.rotate(angle);

        ctx.strokeStyle = '#fb7185'; // Rose
        ctx.lineWidth = snakeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const waves = Math.floor(len / (unit * 0.6)) * 2;
        const waveAmp = unit * 0.25;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        const detail = 5;
        for (let x = 0; x <= len; x += detail) {
            const y = Math.sin(x * (Math.PI * 2) / (unit * 1.5)) * waveAmp;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(len, 0);
        ctx.stroke();

        // Head
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
    };

    // Resize Handling
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            canvasRef.current.width = rect.width;
            canvasRef.current.height = rect.height;
            drawBoardGraphics();

            // Also update player position visually
            updatePlayerUI(currentPosition);
        }
    };

    useEffect(() => {
        // Initial setup
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPosition]);


    const updatePlayerUI = (pos) => {
        const center = getCellCenter(pos);
        if (playerRef.current) {
            const w = playerRef.current.offsetWidth;
            const h = playerRef.current.offsetHeight;
            playerRef.current.style.transform = `translate(${center.x - w / 2}px, ${center.y - h / 2}px)`;
        }
    };

    // Effect to update player visual position whenever currentPosition state changes
    useEffect(() => {
        updatePlayerUI(currentPosition);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPosition]);

    // Internal Move Logic (Visual + State) without Dice/DB update components
    // Used for both Dice Move and Exercise Move
    const movePlayerInternal = async (startPos, steps) => {
        let tempPos = startPos;
        const path = [];

        for (let i = 0; i < steps; i++) {
            tempPos++;
            if (tempPos > BOARD_SIZE) {
                // Standard logic: clamp at BOARD_SIZE
                path.push(Math.min(tempPos, BOARD_SIZE));
            } else {
                path.push(tempPos);
            }
        }

        if (path.length === 0) return; // No move

        const destination = path[path.length - 1];

        // Animate walking
        for (const pos of path) {
            setCurrentPosition(pos);
            await new Promise(resolve => setTimeout(resolve, 400));
        }

        checkSpecialTiles(destination);
    };


    // Game Logic
    const handleRollDice = async () => {
        if (isMoving || movesLeft <= 0) return;

        setMovesLeft(prev => prev - 1);
        setIsMoving(true);
        setIsRolling(true);
        setDiceValue('🎲');

        // Simulate dice roll animation time
        setTimeout(async () => {
            setIsRolling(false);
            const roll = Math.floor(Math.random() * 3) + 1;
            setDiceValue(roll);

            await movePlayer(roll); // Use the wrapper
        }, 600);
    };

    const movePlayer = async (steps) => {
        await movePlayerInternal(currentPosition, steps);
    };

    const checkSpecialTiles = (pos) => {
        // No checks for snakes or ladders in this version

        if (pos === BOARD_SIZE) {
            setGameStatus("ยินดีด้วย! คุณชนะแล้ว!");
            setShowWinModal(true);
            setIsMoving(false);
            return;
        }

        // If not win, enable move again
        setIsMoving(false);
    };

    // Check Game Over (Out of moves)
    useEffect(() => {
        if (!isMoving && movesLeft === 0 && currentPosition !== BOARD_SIZE && !showWinModal) {
            setGameStatus("หมดสิทธิ์ทอยแล้ว! ไปส่งผลออกกำลังกายเพิ่มสิ");
        }
    }, [movesLeft, isMoving, currentPosition, showWinModal]);


    const resetGame = () => {
        window.location.reload();
    };


    // Generating Grid Cells
    const cells = [];
    // Loop rows from ROWS downto 1
    for (let row = ROWS; row >= 1; row--) {
        const rowCells = [];
        for (let col = 1; col <= COLS; col++) {
            let num;
            // If row is odd (1,3,5,7...) -> Left to Right (1..6)
            // If row is even (2,4,6,8...) -> Right to Left (12..7)
            if (row % 2 !== 0) {
                num = (row - 1) * COLS + col;
            } else {
                num = (row * COLS) - col + 1;
            }
            rowCells.push(num);
        }
        // rowCells contains the numbers for this row in visual order (Left->Right)
        cells.push(...rowCells);
    }


    return (
        <main className="bg-gradient-to-br from-green-50 via-teal-100 to-emerald-50 min-h-screen flex flex-col overflow-x-hidden font-sans">
            <div className="container mx-auto max-w-5xl flex flex-col md:flex-row gap-4 md:gap-8 p-4 md:p-8 flex-grow justify-start md:justify-center items-center md:items-start">

                {/* Top Controls */}
                <div id="top-controls" className="w-full md:w-auto flex flex-row md:flex-col items-center justify-center gap-4 p-4 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 z-40 order-1">
                    <div
                        id="dice-container"
                        className={`w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.05)] font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95 border border-slate-100 shrink-0 ${isRolling ? 'animate-spin' : ''}`}
                        onClick={!isMoving && movesLeft > 0 ? handleRollDice : undefined}
                    >
                        {diceValue}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            id="roll-btn"
                            onClick={handleRollDice}
                            disabled={isMoving || movesLeft <= 0}
                            className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <span>ทอยเต๋า!</span>
                        </button>
                        <div className="text-xs font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-slate-200">
                            เหลือ: <span className="text-orange-500 text-sm">{movesLeft}</span> ครั้ง
                        </div>
                    </div>
                </div>

                {/* Game Board */}
                <div
                    id="game-container"
                    ref={containerRef}
                    className="relative w-full max-w-[540px] aspect-[3/4] mx-auto shadow-2xl rounded-3xl border-4 border-emerald-100 overflow-hidden bg-emerald-50 order-2"
                >
                    {/* Grid */}
                    <div id="game-board" ref={boardRef} className="grid grid-cols-6 gap-1 w-full h-full p-1 relative z-10">
                        {cells.map((num) => {
                            let cellColorClass = 'bg-white text-slate-400';
                            if (num % 2 === 0) cellColorClass = 'bg-emerald-50/50 text-slate-400';

                            return (
                                <div
                                    key={num}
                                    data-index={num}
                                    className={`flex items-center justify-center font-mono text-[0.8rem] rounded shadow-sm ${cellColorClass}`}
                                >
                                    {num}
                                </div>
                            );
                        })}
                    </div>

                    {/* Canvas Overlay - Will be transparent as no snakes/ladders are drawn */}
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
                    />

                    {/* Player Token */}
                    <div
                        id="player"
                        ref={playerRef}
                        className="absolute top-0 left-0 z-30 transition-transform duration-500 ease-in-out"
                        style={{ transform: 'translate(0,0)' }} // Initial placeholder
                    >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm transform hover:scale-110 transition-transform">
                            {userData?.profileImageUrl ? (
                                <img src={userData.profileImageUrl} alt="me" className="w-full h-full rounded-full object-cover border-2 border-white" />
                            ) : (
                                "🏃"
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl w-full md:w-80 border border-white/50 text-slate-700 flex flex-col items-center order-3">
                    <div className="mb-4 text-center">
                        <span className="inline-block px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-bold mb-2 tracking-wider">HEALTHY MODE</span>
                        <h1 className="text-4xl font-extrabold mb-1 text-emerald-600 drop-shadow-sm">เก๋า ไม่ล้ม 💪</h1>
                        <p className="text-slate-500 text-sm">สุขภาพดี สะสมแต้ม!</p>
                    </div>

                    <div className="mb-6 w-full bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl text-center border border-emerald-100">
                        <p className="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-1">ตำแหน่งของคุณ</p>
                        <div id="position-display" className="text-5xl font-black text-emerald-500">{currentPosition}</div>
                    </div>

                    <div className="w-full bg-white/50 p-4 rounded-xl text-sm text-slate-500 border border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">🔔 สถานะเกม</h3>
                        <p className="leading-relaxed">{gameStatus}</p>
                    </div>

                    <button
                        onClick={resetGame}
                        className="mt-6 text-slate-400 hover:text-orange-400 text-sm font-medium transition-colors"
                    >
                        ↺ รีโหลดหน้า
                    </button>
                </div>

            </div>

            {/* Win Modal */}
            {showWinModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-md">
                    <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md mx-4 transform transition-all scale-100 animate-bounce border-4 border-emerald-100">
                        <div className="text-7xl mb-6 animate-pulse">🎉</div>
                        <h2 className="text-4xl font-extrabold text-emerald-600 mb-2">สุดยอดมาก!</h2>
                        <p className="text-lg text-slate-600 mb-8">คุณออกกำลังกายจนถึงเส้นชัยแล้ว!</p>
                        <button
                            onClick={resetGame}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 px-10 rounded-full shadow-xl transition transform hover:scale-105 active:scale-95 text-lg"
                        >
                            เล่นอีกรอบ
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function LiffGamePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GameContent />
        </Suspense>
    );
}
