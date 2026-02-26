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
      desc: 'Professional image manipulation with advanced cropping and flipping.',
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
            <Zap size={14} />
            <span>Professional Creative Suite</span>
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
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => onSelectTool('image')}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => onSelectTool('image')}
              className="px-8 py-4 glass-panel rounded-2xl font-bold text-lg hover:bg-white/10 transition-all active:scale-95"
            >
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
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl text-left">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">Powerful Tools, <br />One Studio.</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Everything you need to manipulate media, convert formats, and create art without leaving your browser.</p>
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-indigo-500">100%</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Client Side</span>
            </div>
            <div className="w-px h-12 bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-indigo-500">0</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Data Uploads</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {/* Large Bento Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => onSelectTool('image')}
            className="md:col-span-4 group glass-panel p-10 rounded-[2.5rem] hover:scale-[1.01] cursor-pointer transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -mr-32 -mt-32 rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />
            <div>
              <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-xl mb-8 group-hover:rotate-6 transition-transform">
                <Image size={32} />
              </div>
              <h3 className="text-3xl font-bold mb-4 group-hover:text-indigo-500 transition-colors">Advanced Image Editor</h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                Professional image manipulation with advanced cropping, flipping, and filters.
              </p>
            </div>
            <div className="flex items-center gap-3 text-indigo-500 font-bold text-sm uppercase tracking-widest">
              <span>Launch Editor</span>
              <ArrowRight size={18} />
            </div>
          </motion.div>

          {/* Small Bento Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            onClick={() => onSelectTool('pdf')}
            className="md:col-span-2 group glass-panel p-10 rounded-[2.5rem] hover:scale-[1.01] cursor-pointer transition-all duration-500 flex flex-col justify-between"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-purple-500 flex items-center justify-center text-white shadow-xl mb-8 group-hover:-rotate-6 transition-transform">
                <FileText size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-indigo-500 transition-colors">PDF Suite</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Edit, merge, and convert PDF documents with precision.
              </p>
            </div>
            <ArrowRight size={24} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" />
          </motion.div>

          {/* Another Small Bento Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onClick={() => onSelectTool('video')}
            className="md:col-span-2 group glass-panel p-10 rounded-[2.5rem] hover:scale-[1.01] cursor-pointer transition-all duration-500 flex flex-col justify-between"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-pink-500 flex items-center justify-center text-white shadow-xl mb-8 group-hover:scale-110 transition-transform">
                <Video size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-indigo-500 transition-colors">Video Tools</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Fast video processing and format conversion.
              </p>
            </div>
            <ArrowRight size={24} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" />
          </motion.div>

          {/* Large Bento Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            onClick={() => onSelectTool('converter')}
            className="md:col-span-4 group glass-panel p-10 rounded-[2.5rem] hover:scale-[1.01] cursor-pointer transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
          >
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 blur-[80px] -ml-32 -mb-32 rounded-full group-hover:bg-orange-500/20 transition-all duration-700" />
            <div>
              <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-xl mb-8 group-hover:rotate-12 transition-transform">
                <RefreshCw size={32} />
              </div>
              <h3 className="text-3xl font-bold mb-4 group-hover:text-indigo-500 transition-colors">Universal Converter</h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                Convert between images, PDFs, and Word documents instantly.
              </p>
            </div>
            <div className="flex items-center gap-3 text-indigo-500 font-bold text-sm uppercase tracking-widest">
              <span>Start Converting</span>
              <ArrowRight size={18} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">How it Works</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Three simple steps to professional results. No accounts, no uploads, just pure productivity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: '01', title: 'Select Tool', desc: 'Choose from our suite of professional editing and conversion tools.' },
            { step: '02', title: 'Process Locally', desc: 'Your files are processed entirely in your browser. Total privacy guaranteed.' },
            { step: '03', title: 'Download Result', desc: 'Get your high-quality results instantly. No watermarks, no limits.' }
          ].map((item, i) => (
            <div key={i} className="relative group">
              <div className="text-8xl font-display font-black text-slate-100 dark:text-white/5 absolute -top-12 -left-4 -z-10 group-hover:text-indigo-500/10 transition-colors">
                {item.step}
              </div>
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
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
          <Zap size={18} />
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
