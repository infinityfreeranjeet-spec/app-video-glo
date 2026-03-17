import React, { useEffect, useRef, useState } from 'react';

interface PinballProps {
  isActive: boolean;
}

const PinballGame: React.FC<PinballProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Game state
    const ball = {
      x: canvas.width / 2,
      y: canvas.height - 100,
      vx: 2,
      vy: -4,
      radius: 8,
      color: '#00ffcc'
    };

    const paddleWidth = 80;
    const paddleHeight = 10;
    const paddle = {
      x: (canvas.width - paddleWidth) / 2,
      y: canvas.height - 30,
      width: paddleWidth,
      height: paddleHeight,
      color: '#ff00ff'
    };

    const bumpers = [
      { x: 100, y: 100, radius: 20, color: '#ffff00' },
      { x: 300, y: 150, radius: 25, color: '#ff3300' },
      { x: 200, y: 250, radius: 20, color: '#00ccff' }
    ];

    let rightPressed = false;
    let leftPressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.closePath();

      // Draw paddle
      ctx.beginPath();
      ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
      ctx.fillStyle = paddle.color;
      ctx.fill();
      ctx.closePath();

      // Draw bumpers
      bumpers.forEach(bumper => {
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
        ctx.fillStyle = bumper.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
      });

      // Ball movement
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x + ball.vx > canvas.width - ball.radius || ball.x + ball.vx < ball.radius) {
        ball.vx = -ball.vx;
      }
      if (ball.y + ball.vy < ball.radius) {
        ball.vy = -ball.vy;
      } else if (ball.y + ball.vy > canvas.height - ball.radius) {
        // Paddle collision
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
          ball.vy = -ball.vy;
          setScore(s => s + 10);
        } else {
          // Reset ball
          ball.x = canvas.width / 2;
          ball.y = canvas.height - 100;
          ball.vy = -4;
          setScore(0);
        }
      }

      // Bumper collisions
      bumpers.forEach(bumper => {
        const dx = ball.x - bumper.x;
        const dy = ball.y - bumper.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < ball.radius + bumper.radius) {
          // Simple bounce
          const angle = Math.atan2(dy, dx);
          ball.vx = Math.cos(angle) * 5;
          ball.vy = Math.sin(angle) * 5;
          setScore(s => s + 50);
        }
      });

      // Paddle movement
      if (rightPressed && paddle.x < canvas.width - paddle.width) {
        paddle.x += 7;
      } else if (leftPressed && paddle.x > 0) {
        paddle.x -= 7;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
        className="max-w-full h-auto"
      />
      <div className="absolute bottom-4 text-white/50 text-xs font-mono uppercase tracking-widest">
        Use Arrow Keys to Move
      </div>
    </div>
  );
};

export default PinballGame;
