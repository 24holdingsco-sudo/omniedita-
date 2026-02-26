import React from 'react';
import { motion } from 'motion/react';
import { Image, FileText, Video, RefreshCw, Hash, ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';
import { cn } from '../utils';

interface HomeProps {
  onSelectTool: (tool: any) => void;
}

export const Home: React.FC<HomeProps> = ({ onSelectTool }) => {
  const features = [
    { 
      id: 'image', 
      name: 'Image Editor', 
      desc: 'Professional image manipulation with AI-powered background removal.',
      icon: Image,
      color: 'bg-blue-500'
    },
    { 
      id: 'pdf', 
      name: 'PDF Editor', 
      desc: 'Seamlessly edit, merge, and convert PDF documents with precision.',
      icon: FileText,
      color: 'bg-purple-500'
    },
    { 
      id: 'video', 
      name: 'Video Tools', 
      desc: 'Fast video processing, trimming, and format conversion.',
      icon: Video,
      color: 'bg-pink-500'
    },
    { 
      id: 'ascii', 
      name: 'ASCII Studio', 
      desc: 'Transform your media into unique, stylized ASCII art.',
      icon: Hash,
      color: 'bg-emerald-500'
    },
    { 
      id: 'converter', 
      name: 'Converter', 
      desc: 'Universal file conversion between images, PDFs, and Word docs.',
      icon: RefreshCw,
      color: 'bg-orange-500'
    },
  ];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles size={14} />
            <span>AI-Powered Creative Suite</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
            Creative Tools for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              Effortless Editing
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            OmniEdit Studio provides a professional, all-in-one environment for images, PDFs, videos, and more. Fast, secure, and entirely in your browser.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <div className="relative w-full max-w-lg group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <Sparkles size={20} />
              </div>
              <input 
                type="text" 
                placeholder="What would you like to create today?"
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 border border-black/5 dark:border-white/5">
                ⌘ K
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => onSelectTool('image')}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight size={20} />
            </button>
            <button className="px-8 py-4 glass-panel rounded-2xl font-bold text-lg hover:bg-white/10 transition-all active:scale-95">
              View All Tools
            </button>
          </div>
        </motion.div>

        {/* Floating Preview Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="mt-20 relative max-w-5xl mx-auto"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative glass-panel rounded-[2rem] overflow-hidden border-white/20 shadow-2xl aspect-[16/9] flex items-center justify-center bg-white/5">
            <div className="flex flex-col items-center gap-6 text-slate-400">
              <Zap size={64} className="animate-pulse text-indigo-500" />
              <div className="flex flex-col gap-2">
                <div className="h-2 w-48 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="h-full w-1/2 bg-indigo-500"
                  />
                </div>
                <p className="text-xs font-mono tracking-widest uppercase">System Initializing...</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tools Grid */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Powerful Tools, One Studio.</h2>
            <p className="text-slate-500 dark:text-slate-400">Everything you need to manipulate media, convert formats, and create art without leaving your browser.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-indigo-500">100%</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Client Side</span>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-indigo-500">0</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Data Uploads</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => onSelectTool(feature.id)}
                className="group glass-panel p-8 rounded-[2rem] hover:scale-[1.02] cursor-pointer transition-all duration-500"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg transition-transform group-hover:rotate-6", feature.color)}>
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-500 transition-colors">{feature.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  {feature.desc}
                </p>
                <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                  <span>Open Tool</span>
                  <ArrowRight size={14} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-black/5 dark:bg-white/5 border-y border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col items-center text-center">
          <Shield className="text-indigo-500 mb-6" size={48} />
          <h2 className="text-3xl font-display font-bold mb-4">Privacy by Design</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mb-12">
            OmniEdit Studio processes all your files locally in your browser. Your data never leaves your device, ensuring total privacy and security for your sensitive documents and media.
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-40 grayscale">
            <div className="font-display font-black text-2xl tracking-tighter italic">SECURE</div>
            <div className="font-display font-black text-2xl tracking-tighter italic">PRIVATE</div>
            <div className="font-display font-black text-2xl tracking-tighter italic">LOCAL</div>
            <div className="font-display font-black text-2xl tracking-tighter italic">FAST</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-8 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-t border-black/5 dark:border-white/5 mt-20">
        <div className="flex items-center gap-2 font-bold text-slate-400">
          <Sparkles size={18} />
          <span>OmniEdit Studio © 2026</span>
        </div>
        <div className="flex gap-8 text-sm font-medium text-slate-500">
          <a href="#" className="hover:text-indigo-500 transition-colors">Privacy</a>
          <a href="#" className="hover:text-indigo-500 transition-colors">Terms</a>
          <a href="#" className="hover:text-indigo-500 transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
};
