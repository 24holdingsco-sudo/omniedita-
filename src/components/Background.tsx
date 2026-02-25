import React, { useEffect, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';

export const Background: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'push' | 'pull'>('push');
  const [strength, setStrength] = useState<number>(0.02);
  const [showSettings, setShowSettings] = useState(false);

  // Use refs for animation loop to access latest state without re-binding
  const modeRef = useRef(mode);
  const strengthRef = useRef(strength);

  useEffect(() => {
    modeRef.current = mode;
    strengthRef.current = strength;
  }, [mode, strength]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const numParticles = 100;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.radius = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.fill();
      }
    }

    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle());
    }

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Connect particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100, 150, 255, ${1 - dist / 100})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // Connect to mouse
        const dxMouse = particles[i].x - mouseX;
        const dyMouse = particles[i].y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = `rgba(150, 200, 255, ${1 - distMouse / 150})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Apply push or pull effect
          const currentMode = modeRef.current;
          const currentStrength = strengthRef.current;
          
          if (currentMode === 'push') {
            particles[i].x += dxMouse * currentStrength;
            particles[i].y += dyMouse * currentStrength;
          } else if (currentMode === 'pull') {
            particles[i].x -= dxMouse * currentStrength;
            particles[i].y -= dyMouse * currentStrength;
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 bg-slate-950"
      />
      
      {/* Background Settings Widget */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {showSettings && (
          <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700/50 shadow-2xl flex flex-col gap-4 w-64 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings2 size={16} className="text-indigo-400" />
              Background Particles
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">Interaction Mode</label>
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setMode('push')}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${mode === 'push' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Push
                </button>
                <button
                  onClick={() => setMode('pull')}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${mode === 'pull' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Pull
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-slate-400 font-medium">Effect Strength</label>
                <span className="text-xs text-indigo-400">{Math.round(strength * 1000)}%</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.1"
                step="0.005"
                value={strength}
                onChange={(e) => setStrength(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 rounded-full shadow-lg transition-all duration-300 ${showSettings ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white backdrop-blur-md border border-slate-700/50'}`}
          title="Background Settings"
        >
          <Settings2 size={20} />
        </button>
      </div>
    </>
  );
};
