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
      color: string;
      baseRadius: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.baseRadius = Math.random() * 1.5 + 0.5;
        this.radius = this.baseRadius;
        const colors = [
          'rgba(99, 102, 241, 0.4)', // Indigo
          'rgba(167, 139, 250, 0.4)', // Violet
          'rgba(236, 72, 153, 0.4)', // Pink
          'rgba(52, 211, 153, 0.4)',  // Emerald
          'rgba(251, 191, 36, 0.4)'   // Amber
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(mouseX: number, mouseY: number) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;

        // Interaction
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
          const force = (200 - dist) / 200;
          const currentMode = modeRef.current;
          const currentStrength = strengthRef.current * 2;
          
          if (currentMode === 'push') {
            this.vx += (dx / dist) * force * currentStrength;
            this.vy += (dy / dist) * force * currentStrength;
          } else {
            this.vx -= (dx / dist) * force * currentStrength;
            this.vy -= (dy / dist) * force * currentStrength;
          }
          this.radius = this.baseRadius * (1 + force * 2);
        } else {
          this.radius = this.baseRadius;
        }

        // Friction
        this.vx *= 0.98;
        this.vy *= 0.98;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
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
        particles[i].update(mouseX, mouseY);
        particles[i].draw();

        // Connect particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.1 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
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
      <div className="mesh-gradient" />
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />
      
      {/* Background Settings Widget */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {showSettings && (
            <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-2xl flex flex-col gap-4 w-64 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20">
                <Settings2 size={16} className="text-indigo-400" />
              </div>
              Studio Environment
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Interaction</label>
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                <button
                  onClick={() => setMode('push')}
                  className={`flex-1 text-xs py-2 rounded-lg transition-all ${mode === 'push' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  Push
                </button>
                <button
                  onClick={() => setMode('pull')}
                  className={`flex-1 text-xs py-2 rounded-lg transition-all ${mode === 'pull' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  Pull
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atmosphere</label>
                <span className="text-[10px] font-mono text-indigo-400">{Math.round(strength * 1000)}%</span>
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
          className={`p-3 rounded-full shadow-2xl transition-all duration-500 ${showSettings ? 'bg-indigo-600 text-white rotate-90' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white backdrop-blur-xl border border-white/10'}`}
          title="Studio Environment Settings"
        >
          <Settings2 size={20} />
        </button>
      </div>
    </>
  );
};
