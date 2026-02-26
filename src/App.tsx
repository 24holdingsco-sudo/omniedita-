import React, { useState, useEffect } from 'react';
import { Background } from './components/Background';
import { ImageEditor } from './tools/ImageEditor';
import { PdfEditor } from './tools/PdfEditor';
import { VideoEditor } from './tools/VideoEditor';
import { Converter } from './tools/Converter';
import { AsciiStudio } from './tools/AsciiStudio';
import { Home } from './tools/Home';
import { Image, FileText, Video, RefreshCw, Layers, Hash, Sun, Moon, Eye, Menu, X, Zap, ArrowUp } from 'lucide-react';
import { cn } from './utils';
import { motion, AnimatePresence } from 'motion/react';

type Tool = 'home' | 'image' | 'pdf' | 'video' | 'converter' | 'ascii';
type Theme = 'light' | 'dark' | 'eye-protection';

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'eye-protection');
    root.classList.add(theme);
  }, [theme]);

  const tools = [
    { id: 'image', name: 'Image Editor', icon: Image },
    { id: 'pdf', name: 'PDF Editor', icon: FileText },
    { id: 'video', name: 'Video Tools', icon: Video },
    { id: 'ascii', name: 'ASCII Studio', icon: Hash },
    { id: 'converter', name: 'Converter', icon: RefreshCw },
  ] as const;

  const themes = [
    { id: 'light', name: 'Light', icon: Sun },
    { id: 'dark', name: 'Dark', icon: Moon },
    { id: 'eye-protection', name: 'Eye Protection', icon: Eye },
  ] as const;

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 transition-colors duration-500">
      <Background />
      
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-20 glass-panel z-50 flex items-center justify-between px-4 md:px-12 border-b border-black/5 dark:border-white/5">
        <div 
          className="flex items-center gap-3 text-indigo-500 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="p-2 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
            <Layers className="w-6 h-6 flex-shrink-0" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight hidden sm:block">OmniEdit</span>
        </div>

        {/* Desktop Tool Navigation - Centered */}
        <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {tools.map((tool) => {
            return (
              <button
                key={tool.id}
                onClick={() => scrollToSection(tool.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-500 relative group text-slate-500 hover:text-indigo-500"
              >
                <span className="text-sm font-medium">{tool.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {/* Theme Switcher */}
          <div className="hidden md:flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    isActive 
                      ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  )}
                  title={t.name}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => scrollToSection('image')}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Zap size={16} />
            Launch Studio
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-slate-500 hover:bg-black/5 rounded-xl transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="absolute top-16 left-0 right-0 glass-panel p-4 flex flex-col gap-2 animate-in slide-in-from-top-4 duration-300">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => scrollToSection(tool.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-500 hover:bg-indigo-500/10"
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tool.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="pt-20 min-h-screen flex flex-col">
        <div id="home">
          <Home onSelectTool={scrollToSection} />
        </div>
        
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 space-y-32 py-20">
          <section id="image" className="scroll-mt-24">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">Image Editor</h2>
              <p className="text-slate-500">Professional manipulation and enhancement tools.</p>
            </div>
            <div className="h-[700px] rounded-3xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/5">
              <ImageEditor />
            </div>
          </section>

          <section id="pdf" className="scroll-mt-24">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">PDF Suite</h2>
              <p className="text-slate-500">Comprehensive document management and conversion.</p>
            </div>
            <div className="h-[700px] rounded-3xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/5">
              <PdfEditor />
            </div>
          </section>

          <section id="video" className="scroll-mt-24">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">Video Tools</h2>
              <p className="text-slate-500">Fast processing and format optimization.</p>
            </div>
            <div className="h-[700px] rounded-3xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/5">
              <VideoEditor />
            </div>
          </section>

          <section id="ascii" className="scroll-mt-24">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">ASCII Studio</h2>
              <p className="text-slate-500">Creative media transformation into stylized art.</p>
            </div>
            <div className="h-[700px] rounded-3xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/5">
              <AsciiStudio />
            </div>
          </section>

          <section id="converter" className="scroll-mt-24">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">Universal Converter</h2>
              <p className="text-slate-500">Instant file format switching for all your needs.</p>
            </div>
            <div className="h-[700px] rounded-3xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/5">
              <Converter />
            </div>
          </section>
        </div>
      </main>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 z-50 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
