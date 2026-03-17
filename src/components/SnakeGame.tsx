import React, { useEffect, useRef, useState } from 'react';

interface SnakeProps {
  isActive: boolean;
}

const SnakeGame: React.FC<SnakeProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 20;
    const tileCount = canvas.width / gridSize;

    let snake = [{ x: 10, y: 10 }];
    let food = { x: 5, y: 5 };
    let dx = 0;
    let dy = 0;
    let nextDx = 0;
    let nextDy = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && dy === 0) { nextDx = 0; nextDy = -1; }
      if (e.key === 'ArrowDown' && dy === 0) { nextDx = 0; nextDy = 1; }
      if (e.key === 'ArrowLeft' && dx === 0) { nextDx = -1; nextDy = 0; }
      if (e.key === 'ArrowRight' && dx === 0) { nextDx = 1; nextDy = 0; }
    };

    window.addEventListener('keydown', handleKeyDown);

    const gameLoop = setInterval(() => {
      dx = nextDx;
      dy = nextDy;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall collision
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        resetGame();
        return;
      }

      // Self collision
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        resetGame();
        return;
      }

      snake.unshift(head);

      // Food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 1);
        food = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount)
        };
      } else if (dx !== 0 || dy !== 0) {
        snake.pop();
      }

      // Draw
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ff0044';
      ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);

      ctx.fillStyle = '#00ffcc';
      snake.forEach((segment, i) => {
        ctx.globalAlpha = 1 - (i / snake.length) * 0.5;
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
      });
      ctx.globalAlpha = 1;

    }, 100);

    const resetGame = () => {
      snake = [{ x: 10, y: 10 }];
      nextDx = 0;
      nextDy = 0;
      setScore(0);
    };

    return () => {
      clearInterval(gameLoop);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10">
      <div className="absolute top-4 left-4 text-white font-mono text-sm bg-black/60 px-3 py-1 rounded-full border border-white/20">
        SCORE: {score}
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="max-w-full h-auto border border-white/5"
      />
      <div className="absolute bottom-4 text-white/50 text-xs font-mono uppercase tracking-widest">
        Use Arrow Keys to Slither
      </div>
    </div>
  );
};

export default SnakeGame;
