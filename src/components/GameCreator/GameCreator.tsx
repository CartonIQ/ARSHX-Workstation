import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  Play, 
  RotateCcw, 
  Code2, 
  Sparkles, 
  Download, 
  Volume2, 
  VolumeX, 
  Smartphone,
  Trophy,
  Zap,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Project } from '../../types';

interface GameCreatorProps {
  activeProject: Project;
  onSaveGameScript: (filename: string, content: string) => void;
  onAskAi: (prompt: string) => Promise<string>;
}

export const GameCreator: React.FC<GameCreatorProps> = ({
  activeProject,
  onSaveGameScript,
  onAskAi,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<'dodger' | 'pong'>('dodger');
  const [isPlaying, setIsPlaying] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Editable game script configuration
  const [gameScript, setGameScript] = useState(`// ARSHX 2D Game Engine Script
// Modify variables below and click 'Apply & Restart' to test in real-time!

const CONFIG = {
  playerSpeed: 7,
  obstacleSpeed: 4.5,
  spawnInterval: 45, // frames
  playerColor: "#E5222A", // ARSHX Red
  energyColor: "#22C55E",
  obstacleColor: "#64748B",
  canvasBg: "#0C0C10"
};
`);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    playerX: 180,
    playerY: 420,
    playerWidth: 32,
    playerHeight: 20,
    keys: { left: false, right: false },
    obstacles: [] as { x: number; y: number; width: number; height: number; speed: number; isEnergy?: boolean }[],
    frame: 0,
    score: 0,
    gameOver: false,
  });

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') gameStateRef.current.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') gameStateRef.current.keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') gameStateRef.current.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') gameStateRef.current.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const state = gameStateRef.current;

      if (isPlaying && !state.gameOver) {
        state.frame++;

        // Update player movement
        if (state.keys.left && state.playerX > 10) {
          state.playerX -= 6;
        }
        if (state.keys.right && state.playerX < canvas.width - state.playerWidth - 10) {
          state.playerX += 6;
        }

        // Spawn obstacles & energy cores
        if (state.frame % 35 === 0) {
          const isEnergy = Math.random() < 0.25;
          state.obstacles.push({
            x: Math.random() * (canvas.width - 40) + 10,
            y: -20,
            width: isEnergy ? 16 : 28,
            height: isEnergy ? 16 : 28,
            speed: isEnergy ? 3 : 4 + Math.random() * 2,
            isEnergy,
          });
        }

        // Update and check collisions
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
          const obs = state.obstacles[i];
          obs.y += obs.speed;

          // Check collision with player
          if (
            state.playerX < obs.x + obs.width &&
            state.playerX + state.playerWidth > obs.x &&
            state.playerY < obs.y + obs.height &&
            state.playerY + state.playerHeight > obs.y
          ) {
            if (obs.isEnergy) {
              // Collected bonus energy
              state.score += 50;
              setScore(state.score);
              state.obstacles.splice(i, 1);
              continue;
            } else {
              // Hit obstacle
              state.gameOver = true;
              setGameOver(true);
              setHighScore(prev => Math.max(prev, state.score));
              break;
            }
          }

          // Out of screen
          if (obs.y > canvas.height) {
            state.obstacles.splice(i, 1);
            state.score += 10;
            setScore(state.score);
          }
        }
      }

      // Render Stage
      ctx.fillStyle = '#0B0B0F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield dots
      ctx.fillStyle = '#222230';
      for (let i = 0; i < 20; i++) {
        const x = (i * 37 + state.frame) % canvas.width;
        const y = (i * 73 + state.frame * 2) % canvas.height;
        ctx.fillRect(x, y, 2, 2);
      }

      // Draw Player Ship (Crimson Chevron)
      ctx.fillStyle = '#E5222A';
      ctx.beginPath();
      ctx.moveTo(state.playerX + state.playerWidth / 2, state.playerY);
      ctx.lineTo(state.playerX + state.playerWidth, state.playerY + state.playerHeight);
      ctx.lineTo(state.playerX, state.playerY + state.playerHeight);
      ctx.closePath();
      ctx.fill();

      // Engine thruster flame
      ctx.fillStyle = state.frame % 4 < 2 ? '#FF5E65' : '#FBBF24';
      ctx.fillRect(state.playerX + state.playerWidth / 2 - 3, state.playerY + state.playerHeight, 6, 8);

      // Draw Obstacles & Energy
      for (const obs of state.obstacles) {
        if (obs.isEnergy) {
          ctx.fillStyle = '#22C55E';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#475569';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = '#64748B';
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        }
      }

      // Game Over Overlay
      if (state.gameOver) {
        ctx.fillStyle = 'rgba(11, 11, 15, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#E5222A';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MISSION OVER', canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = '#F7F7FA';
        ctx.font = '14px monospace';
        ctx.fillText(`Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 15);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const handleRestart = () => {
    gameStateRef.current = {
      playerX: 180,
      playerY: 420,
      playerWidth: 32,
      playerHeight: 20,
      keys: { left: false, right: false },
      obstacles: [],
      frame: 0,
      score: 0,
      gameOver: false,
    };
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const handleSaveGame = () => {
    onSaveGameScript('game_engine.js', gameScript);
    alert('Game script saved to active project!');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 bg-[#141418] border-b border-[#24242C] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="w-5 h-5 text-[#E5222A]" />
          <div>
            <h2 className="text-sm font-bold text-white">ARSHX Game Creator</h2>
            <p className="text-[11px] text-[#A5A5B2]">
              2D Canvas Engine, physics mechanics, and interactive game builder.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="px-3 py-1.5 bg-[#1F1F27] hover:bg-[#282834] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#2F2F3D] transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-[#67E8F9]" />
            <span>{showCode ? 'Hide Script' : 'Edit Script'}</span>
          </button>

          <button
            onClick={handleSaveGame}
            className="px-3.5 py-1.5 bg-[#E5222A] hover:bg-[#d01c24] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#E5222A]/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Game</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Game Canvas Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#08080B] overflow-auto">
          {/* Top Scoreboard */}
          <div className="w-[380px] max-w-full flex items-center justify-between text-xs font-mono mb-2 px-2 text-[#A5A5B2]">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#E5222A]" />
              <span className="text-white font-bold tabular-nums">Score: {score}</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-[#FBBF24]" />
              <span className="tabular-nums">Best: {highScore}</span>
            </div>
          </div>

          {/* Canvas Box */}
          <div className="relative rounded-2xl overflow-hidden border border-[#272736] shadow-2xl bg-[#0B0B0F] max-w-full">
            <canvas
              ref={canvasRef}
              width={380}
              height={480}
              className="block max-w-full h-auto"
            />

            {gameOver && (
              <div className="absolute inset-x-0 bottom-12 flex justify-center">
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 bg-[#E5222A] hover:bg-[#d01c24] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#E5222A]/40 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Mission</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Touch DPAD Controls */}
          <div className="w-[380px] max-w-full flex items-center justify-between mt-3 px-4">
            <button
              onMouseDown={() => { gameStateRef.current.keys.left = true; }}
              onMouseUp={() => { gameStateRef.current.keys.left = false; }}
              onTouchStart={() => { gameStateRef.current.keys.left = true; }}
              onTouchEnd={() => { gameStateRef.current.keys.left = false; }}
              className="w-16 h-12 bg-[#1A1A24] hover:bg-[#252533] border border-[#2C2C3D] rounded-xl flex items-center justify-center text-white active:scale-90 select-none shadow-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <span className="text-[11px] text-[#A5A5B2] font-mono">Use Arrow Keys or Touch Buttons</span>

            <button
              onMouseDown={() => { gameStateRef.current.keys.right = true; }}
              onMouseUp={() => { gameStateRef.current.keys.right = false; }}
              onTouchStart={() => { gameStateRef.current.keys.right = true; }}
              onTouchEnd={() => { gameStateRef.current.keys.right = false; }}
              className="w-16 h-12 bg-[#1A1A24] hover:bg-[#252533] border border-[#2C2C3D] rounded-xl flex items-center justify-center text-white active:scale-90 select-none shadow-md"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Script Editor Drawer (Collapsible) */}
        {showCode && (
          <div className="w-full md:w-96 bg-[#111114] border-l border-[#24242C] flex flex-col overflow-hidden">
            <div className="h-10 bg-[#16161C] border-b border-[#24242C] px-3 flex items-center justify-between text-xs text-[#A5A5B2]">
              <span className="font-mono text-white">game_engine.js</span>
              <button
                onClick={handleRestart}
                className="text-[11px] text-[#E5222A] hover:underline font-semibold"
              >
                Apply & Restart
              </button>
            </div>
            <textarea
              value={gameScript}
              onChange={(e) => setGameScript(e.target.value)}
              className="flex-1 p-3 bg-transparent text-[#F7F7FA] font-mono text-xs leading-5 focus:outline-none resize-none overflow-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
};
