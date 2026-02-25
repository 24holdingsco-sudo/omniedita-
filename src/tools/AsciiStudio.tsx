import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Settings2, Download, Copy, RefreshCcw } from 'lucide-react';

const ASCII_RAMP = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

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
  const [resolution, setResolution] = useState(120);
  const [copied, setCopied] = useState(false);

  const escapeHtml = (c: string) => {
    if (c === ' ') return '&nbsp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '&') return '&amp;';
    if (c === '"') return '&quot;';
    return c;
  };

  const processFrame = (source: HTMLVideoElement | HTMLImageElement, sourceWidth: number, sourceHeight: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    const output = outputRef.current;
    if (!canvas || !ctx || !output) return;

    const aspect = sourceWidth / sourceHeight;
    const width = resolution;
    const height = Math.floor((width / aspect) * 0.55);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.drawImage(source, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    let html = '';
    
    // Optimize threshold calculation (squared threshold to avoid Math.sqrt in the inner loop)
    // Scale threshold to match previous visual behavior (0-100 scale)
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
          // Optimized distance calculation (Squared Euclidean)
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
  }, [isPlaying, isVideo, contrast, threshold, resolution]);

  useEffect(() => {
    if (!isPlaying && imgRef.current && imgRef.current.src) {
      processFrame(imgRef.current, imgRef.current.width, imgRef.current.height);
    }
  }, [contrast, threshold, resolution]);

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
      // Create a temporary element to extract plain text without HTML tags
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
    setResolution(120);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-900/50 backdrop-blur-md rounded-none md:rounded-2xl border-0 md:border border-slate-700/50 overflow-hidden">
      <div className="w-full lg:w-72 bg-slate-800/80 border-b lg:border-b-0 lg:border-r border-slate-700/50 p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] lg:max-h-full shrink-0">
        <h2 className="text-lg font-semibold text-white mb-2">ASCII Studio</h2>
        
        <button
          onClick={startCamera}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          <Camera size={18} />
          <span>Start Camera</span>
        </button>

        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors">
          <Upload size={18} />
          <span>Upload Media</span>
          <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
        </label>

        <div className="h-px bg-slate-700/50 my-2" />

        <div className="flex flex-col gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Settings2 size={16} />
              ASCII Settings
            </div>
            <button
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Reset Settings"
            >
              <RefreshCcw size={14} />
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <label className="text-xs text-slate-400">Contrast Boost</label>
              <span className="text-xs text-slate-500">{contrast}</span>
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
            <div className="flex justify-between">
              <label className="text-xs text-slate-400">Color Grouping (ΔE)</label>
              <span className="text-xs text-slate-500">{threshold}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
              title="Higher values group more colors together, improving performance"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <label className="text-xs text-slate-400">Resolution</label>
              <span className="text-xs text-slate-500">{resolution}px</span>
            </div>
            <input
              type="range"
              min="50"
              max="300"
              value={resolution}
              onChange={(e) => setResolution(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        {(isPlaying || imgRef.current?.src) && (
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <Copy size={16} />
              <span>{copied ? 'Copied!' : 'Copy ASCII Text'}</span>
            </button>
            <button
              onClick={handleDownloadHtml}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <Download size={16} />
              <span>Save as HTML</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#050505] overflow-auto flex items-center justify-center relative">
        <video ref={videoRef} className="hidden" playsInline loop muted />
        <img ref={imgRef} className="hidden" alt="" />
        <canvas ref={canvasRef} className="hidden" />
        
        <div 
          ref={outputRef}
          className="font-mono font-bold text-[8px] leading-[1.0] whitespace-pre text-center p-4"
          style={{ fontFamily: "'Cascadia Code', 'Courier New', Courier, monospace" }}
        >
          {/* ASCII Output goes here */}
          {!isPlaying && !imgRef.current?.src && (
            <div className="text-slate-600 text-sm font-sans">
              Start camera or upload media to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
