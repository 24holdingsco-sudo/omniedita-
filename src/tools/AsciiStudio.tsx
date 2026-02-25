import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Settings2, Download, Copy, RefreshCcw, Trash2, ZoomIn, ZoomOut, Maximize2, Minimize2, Trash, Hash } from 'lucide-react';
import { cn } from '../utils';

const ASCII_RAMP = "@#NW$M%&K*X01okxdcl{}[]()|/\\^<>+~:;,\"'. ";

export const AsciiStudio: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);
  
  const [contrast, setContrast] = useState(20);
  const [threshold, setThreshold] = useState(15);
  const [charSize, setCharSize] = useState(12);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const escapeHtml = (c: string) => {
    if (c === ' ') return '&nbsp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '&') return '&amp;';
    if (c === '"') return '&quot;';
    if (c === "'") return '&#39;';
    if (c === '`') return '&#96;';
    return c;
  };

  const processFrame = (source: HTMLVideoElement | HTMLImageElement, sourceWidth: number, sourceHeight: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    const output = outputRef.current;
    if (!canvas || !ctx || !output) return;

    const aspect = sourceWidth / sourceHeight;
    const cols = Math.floor(sourceWidth / (charSize * 2));
    const rows = Math.floor(cols / aspect);
    
    const width = cols;
    const height = rows;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.drawImage(source, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    let html = '';
    
    const effectiveThreshold = threshold * 4.41;
    const thresholdSq = effectiveThreshold * effectiveThreshold;

    for (let y = 0; y < height; y++) {
      let currentSpanColor: {r: number, g: number, b: number} | null = null;
      let currentSpanText = '';

      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        let r = data[offset];
        let g = data[offset + 1];
        let b = data[offset + 2];

        if (contrast !== 0) {
          r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
          g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
          b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
        }

        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const charIndex = Math.floor((luminance / 255) * (ASCII_RAMP.length - 1));
        const char = escapeHtml(ASCII_RAMP[charIndex]);

        if (!currentSpanColor) {
          currentSpanColor = {r, g, b};
          currentSpanText = char;
        } else {
          const dr = r - currentSpanColor.r;
          const dg = g - currentSpanColor.g;
          const db = b - currentSpanColor.b;
          const distSq = dr * dr + dg * dg + db * db;

          if (distSq <= thresholdSq) {
            currentSpanText += char;
          } else {
            html += `<span style="color: rgb(${currentSpanColor.r},${currentSpanColor.g},${currentSpanColor.b})">${currentSpanText}</span>`;
            currentSpanColor = {r, g, b};
            currentSpanText = char;
          }
        }
      }
      if (currentSpanText && currentSpanColor) {
        html += `<span style="color: rgb(${currentSpanColor.r},${currentSpanColor.g},${currentSpanColor.b})">${currentSpanText}</span>`;
      }
      html += '<br/>';
    }

    output.innerHTML = html;
  };

  const renderLoop = () => {
    if (!isPlaying) return;
    const video = videoRef.current;
    if (isVideo && video && video.readyState >= 2) {
      processFrame(video, video.videoWidth, video.videoHeight);
    }
    animationRef.current = requestAnimationFrame(renderLoop);
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(renderLoop);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, isVideo, contrast, threshold, charSize]);

  useEffect(() => {
    if (!isPlaying && imgRef.current && imgRef.current.src) {
      processFrame(imgRef.current, imgRef.current.width, imgRef.current.height);
    }
  }, [contrast, threshold, charSize]);

  const startCamera = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      setIsVideo(true);
      setIsPlaying(true);
      video.play();
    } catch (err) {
      alert('Camera access denied or unavailable.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const video = videoRef.current;
    const img = imgRef.current;
    
    if (video && video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }

    if (file.type.startsWith('image/')) {
      setIsPlaying(false);
      setIsVideo(false);
      if (img) {
        img.onload = () => {
          processFrame(img, img.width, img.height);
        };
        img.src = url;
      }
    } else {
      if (video) {
        video.src = url;
        setIsVideo(true);
        setIsPlaying(true);
        video.play();
      }
    }
  };

  const handleCopy = async () => {
    if (!outputRef.current) return;
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = outputRef.current.innerHTML.replace(/<br\s*\/?>/gi, '\n');
      await navigator.clipboard.writeText(tempDiv.textContent || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadHtml = () => {
    if (!outputRef.current) return;
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ASCII Art Export</title>
<style>
  body {
    margin: 0;
    background-color: #050505;
    color: #fff;
    font-family: 'Cascadia Code', 'Courier New', Courier, monospace;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  #ascii-output {
    font-size: 8px;
    line-height: 1.0;
    white-space: pre;
    font-weight: bold;
    text-align: center;
  }
</style>
</head>
<body>
  <div id="ascii-output">
    ${outputRef.current.innerHTML}
  </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascii-art-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setContrast(20);
    setThreshold(15);
    setCharSize(12);
  };

  return (
    <div className={cn(
      "flex flex-col lg:flex-row h-full overflow-hidden transition-all duration-300",
      isFullscreen && "fixed inset-0 z-[100] bg-slate-950"
    )}>
      {/* Sidebar Dashboard */}
      {!isFullscreen && (
        <div className="w-full lg:w-80 glass-panel border-b lg:border-b-0 lg:border-r p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] lg:max-h-full shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Dashboard</h2>
          
          <button
            onClick={startCamera}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 font-bold"
          >
            <Camera size={18} />
            <span>Start Camera</span>
          </button>

          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-500/20 active:scale-95 font-bold">
            <Upload size={18} />
            <span>Upload Media</span>
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
          </label>

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />

          <div className="flex flex-col gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Settings2 size={14} />
                ASCII Settings
              </div>
              <button
                onClick={handleReset}
                className="text-slate-500 hover:text-indigo-500 transition-colors"
                title="Reset Settings"
              >
                <RefreshCcw size={14} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Contrast</label>
                <span className="text-[10px] font-mono text-indigo-500">{contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Color Grouping</label>
                <span className="text-[10px] font-mono text-indigo-500">{threshold}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Char Size</label>
                <span className="text-[10px] font-mono text-indigo-500">{charSize}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="30"
                value={charSize}
                onChange={(e) => setCharSize(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-2">
            {(isPlaying || imgRef.current?.src) && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl transition-all border border-black/5 dark:border-white/5 font-bold text-xs"
                >
                  <Copy size={16} className="text-indigo-500" />
                  <span>{copied ? 'Copied!' : 'Copy ASCII Text'}</span>
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 font-bold text-xs"
                >
                  <Download size={16} />
                  <span>Save as HTML</span>
                </button>
              </>
            )}
            
            <button
              onClick={() => {
                setIsPlaying(false);
                setIsVideo(false);
                if (videoRef.current) {
                  if (videoRef.current.srcObject) {
                    (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
                    videoRef.current.srcObject = null;
                  }
                  videoRef.current.src = '';
                }
                if (imgRef.current) imgRef.current.src = '';
                if (outputRef.current) outputRef.current.innerHTML = '';
              }}
              disabled={!isPlaying && !imgRef.current?.src}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-30 font-bold text-xs"
            >
              <Trash2 size={18} />
              <span>Clear Media</span>
            </button>
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 relative flex flex-col bg-slate-200/50 dark:bg-black/40 overflow-hidden">
        {/* Preview Toolbar */}
        {(isPlaying || imgRef.current?.src) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 glass-panel px-4 py-2 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1.5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all">
                <ZoomOut size={18} />
              </button>
              <span className="text-xs font-mono w-12 text-center font-bold text-slate-500">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all">
                <ZoomIn size={18} />
              </button>
            </div>
            <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8">
          <video ref={videoRef} className="hidden" playsInline loop muted />
          <img ref={imgRef} className="hidden" alt="" />
          <canvas ref={canvasRef} className="hidden" />
          
          <div 
            ref={outputRef}
            className="font-mono font-bold whitespace-pre text-center p-4 transition-transform duration-300"
            style={{ 
              fontFamily: "'Cascadia Code', 'Courier New', Courier, monospace",
              fontSize: `${charSize}px`,
              lineHeight: '1.0',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            {!isPlaying && !imgRef.current?.src && (
              <div className="text-slate-400 text-sm font-sans flex flex-col items-center gap-4">
                <Hash className="w-16 h-16 opacity-20" />
                <p className="font-medium">Start camera or upload media to begin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
