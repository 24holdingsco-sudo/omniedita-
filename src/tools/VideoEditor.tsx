import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Download, Video, Scissors, FileVideo, Undo2, Redo2, Hash, RefreshCw, Crop, SlidersHorizontal, Trash2, ZoomIn, ZoomOut, Maximize2, Minimize2, Trash } from 'lucide-react';
import { cn } from '../utils';
import { useHistory } from '../hooks/useHistory';
import { createAsciiImage } from '../utils/ascii';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ReactCrop, { type Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface VideoState {
  file: File | null;
  url: string | null;
}

export const VideoEditor: React.FC = () => {
  const { state: videoState, set: setVideoState, undo, redo, canUndo, canRedo } = useHistory<VideoState>({ file: null, url: null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAsciiMode, setIsAsciiMode] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [asciiCharSize, setAsciiCharSize] = useState(12);
  const [filters, setFilters] = useState({
    grayscale: false,
    sepia: false,
    brightness: 100,
    contrast: 100,
  });

  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());
  const animationRef = useRef<number | undefined>(undefined);

  const videoFile = videoState.file;
  const videoUrl = videoState.url;

  useEffect(() => {
    const loadFfmpeg = async () => {
      try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        const ffmpeg = ffmpegRef.current;
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegLoaded(true);
      } catch (err) {
        console.warn('FFmpeg failed to load (likely due to missing COOP/COEP headers in this environment). Falling back to basic tools.', err);
      }
    };
    loadFfmpeg();
  }, []);

  useEffect(() => {
    if (isAsciiMode && isPlaying) {
      const renderLoop = () => {
        if (videoRef.current && canvasRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          const asciiCanvas = createAsciiImage(video, video.videoWidth, video.videoHeight, asciiCharSize);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(asciiCanvas, 0, 0);
          }
          
          animationRef.current = requestAnimationFrame(renderLoop);
        }
      };
      animationRef.current = requestAnimationFrame(renderLoop);
    } else if (isPlaying && !isAsciiMode) {
      const renderLoop = () => {
        if (videoRef.current && canvasRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (canvas.width !== video.videoWidth) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            
            ctx.filter = `
              grayscale(${filters.grayscale ? 100 : 0}%)
              sepia(${filters.sepia ? 100 : 0}%)
              brightness(${filters.brightness}%)
              contrast(${filters.contrast}%)
            `;
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          animationRef.current = requestAnimationFrame(renderLoop);
        }
      };
      animationRef.current = requestAnimationFrame(renderLoop);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAsciiMode, isPlaying, asciiCharSize, filters]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoState({ file, url });
      setTrimStart(0);
      setTrimEnd(0);
      setDuration(0);
      setCrop(undefined);
      setIsCropping(false);
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      if (trimEnd === 0) setTrimEnd(d);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const convertToWebM = async () => {
    if (!videoRef.current || !videoFile) return;
    setIsProcessing(true);

    try {
      if (ffmpegLoaded) {
        const ffmpeg = ffmpegRef.current;
        await ffmpeg.writeFile(videoFile.name, await fetchFile(videoFile));
        
        const args = ['-i', videoFile.name];
        
        if (trimStart > 0 || trimEnd < duration) {
          args.push('-ss', trimStart.toString(), '-to', trimEnd.toString());
        }
        
        const videoFilters = [];
        
        if (filters.grayscale) videoFilters.push('hue=s=0');
        if (filters.sepia) videoFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
        if (filters.brightness !== 100) videoFilters.push(`eq=brightness=${(filters.brightness - 100) / 100}`);
        if (filters.contrast !== 100) videoFilters.push(`eq=contrast=${filters.contrast / 100}`);

        if (crop && crop.width && crop.height) {
          const video = videoRef.current;
          const scaleX = video.videoWidth / video.clientWidth;
          const scaleY = video.videoHeight / video.clientHeight;
          const cw = Math.floor(crop.width * scaleX);
          const ch = Math.floor(crop.height * scaleY);
          const cx = Math.floor(crop.x * scaleX);
          const cy = Math.floor(crop.y * scaleY);
          videoFilters.push(`crop=${cw}:${ch}:${cx}:${cy}`);
        }

        if (videoFilters.length > 0) {
          args.push('-vf', videoFilters.join(','));
        }
        
        args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', 'output.webm');
        
        await ffmpeg.exec(args);
        const data = await ffmpeg.readFile('output.webm');
        const blob = new Blob([data], { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: BlobPart[] = [];
        
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `converted-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          setIsProcessing(false);
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = trimStart;
          }
        };
        
        mediaRecorder.start();
        
        video.currentTime = trimStart;
        await video.play();
        setIsPlaying(true);
        
        const drawFrame = () => {
          if (!video.paused && !video.ended && video.currentTime < trimEnd) {
            ctx!.filter = `
              grayscale(${filters.grayscale ? 100 : 0}%)
              sepia(${filters.sepia ? 100 : 0}%)
              brightness(${filters.brightness}%)
              contrast(${filters.contrast}%)
            `;

            if (crop && crop.width && crop.height) {
              const scaleX = video.videoWidth / video.clientWidth;
              const scaleY = video.videoHeight / video.clientHeight;
              const cw = Math.floor(crop.width * scaleX);
              const ch = Math.floor(crop.height * scaleY);
              const cx = Math.floor(crop.x * scaleX);
              const cy = Math.floor(crop.y * scaleY);
              
              if (canvas.width !== cw) {
                canvas.width = cw;
                canvas.height = ch;
              }
              
              if (isAsciiMode) {
                const asciiCanvas = createAsciiImage(video, video.videoWidth, video.videoHeight, asciiCharSize);
                ctx?.drawImage(asciiCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
              } else {
                ctx?.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);
              }
            } else {
              if (isAsciiMode) {
                const asciiCanvas = createAsciiImage(video, video.videoWidth, video.videoHeight, asciiCharSize);
                ctx?.drawImage(asciiCanvas, 0, 0, canvas.width, canvas.height);
              } else {
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
              }
            }
            requestAnimationFrame(drawFrame);
          } else {
            mediaRecorder.stop();
            setIsPlaying(false);
          }
        };
        
        drawFrame();
        return;
      }
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Conversion failed. Your browser might not support this feature.');
    }
    setIsProcessing(false);
  };

  const extractAudio = async () => {
    if (!videoFile || !ffmpegLoaded) return;
    setIsProcessing(true);
    try {
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile(videoFile.name, await fetchFile(videoFile));
      await ffmpeg.exec(['-i', videoFile.name, '-q:a', '0', '-map', 'a', 'output.mp3']);
      const data = await ffmpeg.readFile('output.mp3');
      const blob = new Blob([data], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio-${Date.now()}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Audio extraction failed:', error);
      alert('Audio extraction failed.');
    }
    setIsProcessing(false);
  };

  return (
    <div className={cn(
      "flex flex-col lg:flex-row h-full overflow-hidden transition-all duration-300",
      isFullscreen && "fixed inset-0 z-[100] bg-slate-950"
    )}>
      {/* Sidebar Dashboard */}
      {!isFullscreen && (
        <div className="w-full lg:w-80 glass-panel border-b lg:border-b-0 lg:border-r p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] lg:max-h-full shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Dashboard</h2>
            <div className="flex gap-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-slate-500 hover:text-indigo-500 disabled:opacity-30 transition-colors"
                title="Undo"
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-slate-500 hover:text-indigo-500 disabled:opacity-30 transition-colors"
                title="Redo"
              >
                <Redo2 size={16} />
              </button>
            </div>
          </div>
          
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-500/20 active:scale-95 font-bold">
            <Upload size={18} />
            <span>Upload Video</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          </label>

          <button
            onClick={() => setIsCropping(!isCropping)}
            disabled={!videoUrl}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all border font-medium disabled:opacity-30",
              isCropping ? "bg-indigo-600 text-white border-indigo-600" : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-white border-black/5 dark:border-white/5"
            )}
          >
            <Crop size={18} className={isCropping ? "text-white" : "text-indigo-500"} />
            <span>Crop Video {isCropping ? 'ON' : 'OFF'}</span>
          </button>

          {duration > 0 && (
            <div className="flex flex-col gap-3 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Scissors size={14} />
                Trim Video
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] font-mono text-indigo-500">
                  <span>{trimStart.toFixed(1)}s</span>
                  <span>{trimEnd.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={trimStart}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val < trimEnd) setTrimStart(val);
                  }}
                  className="w-full accent-indigo-500"
                />
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={trimEnd}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val > trimStart) setTrimEnd(val);
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />

          <div className="flex flex-col gap-3 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
            <button
              onClick={() => setIsAsciiMode(!isAsciiMode)}
              disabled={!videoUrl}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-2 rounded-lg transition-all font-bold text-xs",
                isAsciiMode ? "bg-indigo-600 text-white" : "bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600 hover:text-white"
              )}
            >
              <Hash size={16} />
              <span>ASCII Filter {isAsciiMode ? 'ON' : 'OFF'}</span>
            </button>
            {isAsciiMode && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Density</label>
                  <span className="text-[10px] font-mono text-indigo-500">{asciiCharSize}px</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  step="1"
                  value={asciiCharSize}
                  onChange={(e) => setAsciiCharSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            )}
          </div>

          {videoUrl && (
            <div className="flex flex-col gap-4 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <SlidersHorizontal size={14} />
                Video Filters
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, grayscale: !filters.grayscale })}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      filters.grayscale ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-slate-500 border-black/10 dark:border-white/10"
                    )}
                  >
                    Grayscale
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, sepia: !filters.sepia })}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      filters.sepia ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-slate-500 border-black/10 dark:border-white/10"
                    )}
                  >
                    Sepia
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Brightness</label>
                    <span className="text-[10px] font-mono text-indigo-500">{filters.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.brightness}
                    onChange={(e) => setFilters({ ...filters, brightness: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Contrast</label>
                    <span className="text-[10px] font-mono text-indigo-500">{filters.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.contrast}
                    onChange={(e) => setFilters({ ...filters, contrast: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto pt-4 flex flex-col gap-2">
            <button
              onClick={convertToWebM}
              disabled={!videoUrl || isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all disabled:opacity-30 font-bold text-xs"
            >
              {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <FileVideo size={18} />}
              <span>{isProcessing ? 'Converting...' : 'Convert to WebM'}</span>
            </button>

            {ffmpegLoaded && (
              <button
                onClick={extractAudio}
                disabled={!videoUrl || isProcessing}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all disabled:opacity-30 font-bold text-xs border border-black/5 dark:border-white/5"
              >
                <Download size={18} className="text-indigo-500" />
                <span>Extract Audio (MP3)</span>
              </button>
            )}
            
            <button
              onClick={() => {
                setVideoState({ file: null, url: null });
                setIsPlaying(false);
                setIsAsciiMode(false);
                setIsCropping(false);
              }}
              disabled={!videoUrl}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-30 font-bold text-xs"
            >
              <Trash2 size={18} />
              <span>Clear Video</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mt-2 px-2 italic text-center">
            {ffmpegLoaded 
              ? "FFmpeg.wasm is active."
              : "MediaRecorder fallback active."}
          </p>
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 relative flex flex-col bg-slate-200/50 dark:bg-black/40 overflow-hidden">
        {/* Preview Toolbar */}
        {videoUrl && (
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

        <div className="flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8">
          {!videoUrl ? (
            <div className="text-center text-slate-400 flex flex-col items-center">
              <Video className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a video to start editing</p>
            </div>
          ) : (
            <div 
              className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl transition-transform duration-300 flex items-center justify-center"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              {isCropping ? (
                <ReactCrop crop={crop} onChange={c => setCrop(c)} className="max-h-full">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="max-h-full object-contain"
                    onLoadedMetadata={handleVideoLoaded}
                    onEnded={() => setIsPlaying(false)}
                    controls={false}
                    crossOrigin="anonymous"
                  />
                </ReactCrop>
              ) : (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className={cn("w-full h-full object-contain", (isAsciiMode || filters.grayscale || filters.sepia || filters.brightness !== 100 || filters.contrast !== 100) && "opacity-0 absolute inset-0")}
                  onLoadedMetadata={handleVideoLoaded}
                  onEnded={() => setIsPlaying(false)}
                  controls={false}
                  crossOrigin="anonymous"
                />
              )}
              {(isAsciiMode || filters.grayscale || filters.sepia || filters.brightness !== 100 || filters.contrast !== 100) && !isCropping && (
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center pointer-events-none">
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 transition-transform pointer-events-auto shadow-2xl"
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {videoUrl && !isFullscreen && (
          <div className="p-4 bg-white/5 border-t border-black/5 dark:border-white/5">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">File Name</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{videoFile?.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Size</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{((videoFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
