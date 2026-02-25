import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Download, Video, Scissors, FileVideo, Undo2, Redo2, Hash, RefreshCw, Crop } from 'lucide-react';
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
          
          // Ensure canvas matches video dimensions
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // We use the createAsciiImage utility to get an ASCII canvas, then draw it to our display canvas
          const asciiCanvas = createAsciiImage(video, video.videoWidth, video.videoHeight, 8);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(asciiCanvas, 0, 0);
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
  }, [isAsciiMode, isPlaying]);

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
        
        if (crop && crop.width && crop.height) {
          const video = videoRef.current;
          const scaleX = video.videoWidth / video.clientWidth;
          const scaleY = video.videoHeight / video.clientHeight;
          const cw = Math.floor(crop.width * scaleX);
          const ch = Math.floor(crop.height * scaleY);
          const cx = Math.floor(crop.x * scaleX);
          const cy = Math.floor(crop.y * scaleY);
          args.push('-filter:v', `crop=${cw}:${ch}:${cx}:${cy}`);
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
        // Fallback to MediaRecorder
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
        };
        
        mediaRecorder.start();
        
        video.currentTime = 0;
        await video.play();
        
        const drawFrame = () => {
          if (!video.paused && !video.ended) {
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(drawFrame);
          } else if (video.ended) {
            mediaRecorder.stop();
          }
        };
        
        drawFrame();
        return; // Wait for media recorder to finish
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
    <div className="flex flex-col lg:flex-row h-full bg-slate-900/50 backdrop-blur-md rounded-none md:rounded-2xl border-0 md:border border-slate-700/50 overflow-hidden">
      <div className="w-full lg:w-72 bg-slate-800/80 border-b lg:border-b-0 lg:border-r border-slate-700/50 p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] lg:max-h-full shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Video Tools</h2>
          <div className="flex gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Undo"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Redo"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>
        
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors">
          <Upload size={18} />
          <span>Upload Video</span>
          <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
        </label>

        <button
          onClick={() => setIsCropping(!isCropping)}
          disabled={!videoUrl}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            isCropping ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
          )}
        >
          <Crop size={18} />
          <span>Crop Video {isCropping ? 'ON' : 'OFF'}</span>
        </button>

        {duration > 0 && (
          <div className="flex flex-col gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1">
              <Scissors size={16} />
              Trim Video
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Start: {trimStart.toFixed(1)}s</span>
                <span>End: {trimEnd.toFixed(1)}s</span>
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

        <div className="h-px bg-slate-700/50 my-2" />

        <button
          onClick={() => setIsAsciiMode(!isAsciiMode)}
          disabled={!videoUrl}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            isAsciiMode ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
          )}
        >
          <Hash size={18} />
          <span>ASCII Filter {isAsciiMode ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={convertToWebM}
          disabled={!videoUrl || isProcessing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <FileVideo size={18} />}
          <span>{isProcessing ? 'Converting...' : 'Convert to WebM'}</span>
        </button>

        {ffmpegLoaded && (
          <button
            onClick={extractAudio}
            disabled={!videoUrl || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Download size={18} />
            <span>Extract Audio (MP3)</span>
          </button>
        )}
        
        <p className="text-xs text-slate-400 mt-2 px-2">
          {ffmpegLoaded 
            ? "FFmpeg.wasm is loaded. Advanced tools are available."
            : "Note: Basic video conversion uses MediaRecorder API. FFmpeg.wasm is loading or unavailable."}
        </p>
      </div>

      <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-950/50">
        {!videoUrl ? (
          <div className="text-center text-slate-500 flex flex-col items-center">
            <Video className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">Select a video to start editing</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col items-center gap-6">
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
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
                  className={cn("w-full h-full object-contain", isAsciiMode && "opacity-0 absolute inset-0")}
                  onLoadedMetadata={handleVideoLoaded}
                  onEnded={() => setIsPlaying(false)}
                  controls={false}
                  crossOrigin="anonymous"
                />
              )}
              {isAsciiMode && !isCropping && (
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center pointer-events-none">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform pointer-events-auto shadow-lg"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                </button>
              </div>
            </div>
            
            <div className="w-full bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-white font-medium mb-2">Video Details</h3>
              <p className="text-sm text-slate-400">Name: {videoFile?.name}</p>
              <p className="text-sm text-slate-400">Size: {((videoFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
