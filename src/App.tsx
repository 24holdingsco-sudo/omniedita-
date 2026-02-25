import React, { useState } from 'react';
import { Background } from './components/Background';
import { ImageEditor } from './tools/ImageEditor';
import { PdfEditor } from './tools/PdfEditor';
import { VideoEditor } from './tools/VideoEditor';
import { Converter } from './tools/Converter';
import { AsciiStudio } from './tools/AsciiStudio';
import { Image, FileText, Video, RefreshCw, Layers, Hash } from 'lucide-react';
import { cn } from './utils';

type Tool = 'image' | 'pdf' | 'video' | 'converter' | 'ascii';

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>('image');

  const tools = [
    { id: 'image', name: 'Image Editor', icon: Image },
    { id: 'pdf', name: 'PDF Editor', icon: FileText },
    { id: 'video', name: 'Video Tools', icon: Video },
    { id: 'ascii', name: 'ASCII Studio', icon: Hash },
    { id: 'converter', name: 'Converter', icon: RefreshCw },
  ] as const;

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30 bg-slate-950">
      <Background />
      
      <div className="flex flex-col md:flex-row h-screen overflow-hidden p-0 md:p-4 gap-0 md:gap-4">
        {/* Desktop Sidebar Navigation */}
        <nav className="hidden md:flex w-64 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 flex-col py-8 shadow-2xl relative z-10 transition-all duration-300">
          <div className="flex items-center gap-3 px-6 mb-12 text-indigo-400">
            <Layers className="w-8 h-8 flex-shrink-0" />
            <span className="text-xl font-bold text-white tracking-tight">OmniEdit</span>
          </div>

          <div className="flex flex-col gap-2 px-4 w-full">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group relative",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                  title={tool.name}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="font-medium">{tool.name}</span>
                </button>
              );
            })}
          </div>
          
          <div className="mt-auto px-6 text-xs text-slate-500 text-center">
            Client-Side Processing
          </div>
        </nav>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 flex items-center justify-around px-2 z-50 pb-safe">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[64px]",
                  isActive ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-indigo-500/20" : "bg-transparent"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap">{tool.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 relative z-10 transition-all duration-300 h-full pb-20 md:pb-0 overflow-hidden">
          {activeTool === 'image' && <ImageEditor />}
          {activeTool === 'pdf' && <PdfEditor />}
          {activeTool === 'video' && <VideoEditor />}
          {activeTool === 'ascii' && <AsciiStudio />}
          {activeTool === 'converter' && <Converter />}
        </main>
      </div>
    </div>
  );
}
