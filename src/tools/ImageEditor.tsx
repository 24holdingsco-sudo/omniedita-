import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from 'react-konva';
import useImage from 'use-image';
import { Upload, Download, Type, Image as ImageIcon, RotateCw, Crop, Trash2, Scissors, RefreshCw, SlidersHorizontal, X, Save, FolderOpen, Undo2, Redo2, Hash, Trash, ZoomIn, ZoomOut, Maximize2, Minimize2, Settings2 } from 'lucide-react';
import { cn } from '../utils';
import { removeBackground } from '@imgly/background-removal';
import Konva from 'konva';
import ReactCrop, { type Crop as CropType, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useHistory } from '../hooks/useHistory';
import { createAsciiImage } from '../utils/ascii';

interface Element {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  src?: string;
  text?: string;
  fontSize?: number;
  fill?: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  width?: number;
  height?: number;
  grayscale?: boolean;
  sepia?: boolean;
  brightness?: number;
  contrast?: number;
}

const CropModal = ({ src, onComplete, onCancel }: { src: string, onComplete: (croppedSrc: string, width: number, height: number) => void, onCancel: () => void }) => {
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const handleCrop = async () => {
    if (completedCrop && imgRef.current && completedCrop.width > 0 && completedCrop.height > 0) {
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          imgRef.current,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );
        const base64Image = canvas.toDataURL('image/png');
        onComplete(base64Image, canvas.width, canvas.height);
      }
    } else {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 md:p-8 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-4xl max-h-full flex flex-col gap-4 border border-black/10 dark:border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Crop size={20} className="text-indigo-500" />
            Crop Image
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center p-4 border border-black/5 dark:border-slate-800 min-h-[300px] md:min-h-[400px]">
          <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
            <img ref={imgRef} src={src} alt="Crop me" className="max-w-full max-h-[50vh] md:max-h-[60vh] object-contain" />
          </ReactCrop>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors">Cancel</button>
          <button onClick={handleCrop} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors">Apply Crop</button>
        </div>
      </div>
    </div>
  );
};

const ImageElement = ({ element, isSelected, onSelect, onChange }: any) => {
  const [img] = useImage(element.src);
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  useEffect(() => {
    if (img && shapeRef.current) {
      shapeRef.current.cache();
    }
  }, [img, element.grayscale, element.sepia, element.brightness, element.contrast]);

  const filters = [];
  if (element.grayscale) filters.push(Konva.Filters.Grayscale);
  if (element.sepia) filters.push(Konva.Filters.Sepia);
  if (element.brightness !== undefined && element.brightness !== 0) filters.push(Konva.Filters.Brighten);
  if (element.contrast !== undefined && element.contrast !== 0) filters.push(Konva.Filters.Contrast);

  return (
    <React.Fragment>
      <KonvaImage
        image={img}
        {...element}
        ref={shapeRef}
        filters={filters}
        brightness={element.brightness || 0}
        contrast={element.contrast || 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            ...element,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...element,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

const TextElement = ({ element, isSelected, onSelect, onChange }: any) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Text
        {...element}
        ref={shapeRef}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            ...element,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...element,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export const ImageEditor: React.FC = () => {
  const { state: elements, set: setElements, undo, redo, canUndo, canRedo, reset } = useHistory<Element[]>([]);
  const [selectedId, selectShape] = useState<string | null>(null);
  const stageRef = useRef<any>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.src = reader.result as string;
        img.onload = () => {
          setElements([
            ...elements,
            {
              id: Date.now().toString(),
              type: 'image',
              src: reader.result as string,
              x: 50,
              y: 50,
              width: img.width > 400 ? 400 : img.width,
              height: img.width > 400 ? (img.height * 400) / img.width : img.height,
              brightness: 0,
              contrast: 0,
              grayscale: false,
              sepia: false,
            },
          ]);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const addText = () => {
    setElements([
      ...elements,
      {
        id: Date.now().toString(),
        type: 'text',
        text: 'Double click to edit',
        x: 100,
        y: 100,
        fontSize: 24,
        fill: '#ffffff',
      },
    ]);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(elements.filter((el) => el.id !== selectedId));
      selectShape(null);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedId) return;
    
    const selectedElement = elements.find(el => el.id === selectedId);
    if (!selectedElement || selectedElement.type !== 'image' || !selectedElement.src) return;

    setIsRemovingBg(true);
    try {
      const blob = await removeBackground(selectedElement.src);
      const url = URL.createObjectURL(blob);
      
      setElements(elements.map(el => {
        if (el.id === selectedId) {
          return { ...el, src: url };
        }
        return el;
      }));
    } catch (error) {
      console.error('Error removing background:', error);
      alert('Failed to remove background. Please try again.');
    } finally {
      setIsRemovingBg(false);
    }
  };

  const [asciiCharSize, setAsciiCharSize] = useState(12);

  const applyAsciiFilter = () => {
    if (!selectedId) return;
    
    const selectedElement = elements.find(el => el.id === selectedId);
    if (!selectedElement || selectedElement.type !== 'image' || !selectedElement.src) return;

    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = createAsciiImage(img, img.width, img.height, asciiCharSize);
      const asciiUrl = canvas.toDataURL('image/png');
      
      setElements(elements.map(el => {
        if (el.id === selectedId) {
          return { ...el, src: asciiUrl };
        }
        return el;
      }));
    };
    img.src = selectedElement.src;
  };

  const downloadImage = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const saveProject = () => {
    try {
      localStorage.setItem('image-editor-state', JSON.stringify(elements));
      alert('Project saved successfully!');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project. The image might be too large for local storage.');
    }
  };

  const loadProject = () => {
    try {
      const saved = localStorage.getItem('image-editor-state');
      if (saved) {
        reset(JSON.parse(saved));
        selectShape(null);
        alert('Project loaded successfully!');
      } else {
        alert('No saved project found.');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Failed to load project.');
    }
  };

  const selectedElement = elements.find(el => el.id === selectedId);
  const isImageSelected = selectedElement?.type === 'image';

  const clearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      reset([]);
      selectShape(null);
    }
  };

  const baseScale = Math.min(
    (containerSize.width - 64) / 800,
    (containerSize.height - 64) / 600,
    1
  );
  const stageScale = baseScale * zoom;

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
            <span>Upload Image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>

          <button
            onClick={addText}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all border border-black/5 dark:border-white/5 font-medium"
          >
            <Type size={18} className="text-indigo-500" />
            <span>Add Text</span>
          </button>

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsCropping(true)}
              disabled={!isImageSelected}
              className="flex flex-col items-center gap-2 p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all border border-black/5 dark:border-white/5 disabled:opacity-30"
            >
              <Crop size={20} className="text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Crop</span>
            </button>

            <button
              onClick={handleRemoveBackground}
              disabled={!isImageSelected || isRemovingBg}
              className="flex flex-col items-center gap-2 p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all border border-black/5 dark:border-white/5 disabled:opacity-30"
            >
              {isRemovingBg ? <RefreshCw size={20} className="animate-spin text-indigo-500" /> : <Scissors size={20} className="text-indigo-500" />}
              <span className="text-[10px] font-bold uppercase tracking-wider">Remove BG</span>
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
            <button
              onClick={applyAsciiFilter}
              disabled={!isImageSelected}
              className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg transition-all font-bold text-xs"
              title="Convert image to ASCII art"
            >
              <Hash size={16} />
              <span>ASCII Filter</span>
            </button>
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
          </div>

          {isImageSelected && selectedElement && (
            <div className="flex flex-col gap-4 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <SlidersHorizontal size={14} />
                Filters
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setElements(elements.map(el => el.id === selectedId ? { ...el, grayscale: !el.grayscale } : el))}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      selectedElement.grayscale ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-slate-500 border-black/10 dark:border-white/10"
                    )}
                  >
                    Grayscale
                  </button>
                  <button
                    onClick={() => setElements(elements.map(el => el.id === selectedId ? { ...el, sepia: !el.sepia } : el))}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      selectedElement.sepia ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-slate-500 border-black/10 dark:border-white/10"
                    )}
                  >
                    Sepia
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Brightness</label>
                    <span className="text-[10px] font-mono text-indigo-500">{Math.round((selectedElement.brightness || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={selectedElement.brightness || 0}
                    onChange={(e) => {
                      setElements(elements.map(el => el.id === selectedId ? { ...el, brightness: parseFloat(e.target.value) } : el));
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Contrast</label>
                    <span className="text-[10px] font-mono text-indigo-500">{Math.round((selectedElement.contrast || 0))}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={selectedElement.contrast || 0}
                    onChange={(e) => {
                      setElements(elements.map(el => el.id === selectedId ? { ...el, contrast: parseFloat(e.target.value) } : el));
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />

          <button
            onClick={deleteSelected}
            disabled={!selectedId}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-30 font-bold text-xs"
          >
            <Trash2 size={18} />
            <span>Delete Selected</span>
          </button>

          <div className="mt-auto pt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={saveProject}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all text-xs font-bold border border-black/5 dark:border-white/5"
              >
                <Save size={16} className="text-indigo-500" />
                <span>Save</span>
              </button>
              <button
                onClick={loadProject}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all text-xs font-bold border border-black/5 dark:border-white/5"
              >
                <FolderOpen size={16} className="text-indigo-500" />
                <span>Load</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearCanvas}
                disabled={elements.length === 0}
                className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-bold transition-all disabled:opacity-30 text-xs"
              >
                <Trash size={18} />
                <span>Clear</span>
              </button>
              <button
                onClick={downloadImage}
                disabled={elements.length === 0}
                className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold transition-all disabled:opacity-30 shadow-lg shadow-emerald-500/20 text-xs"
              >
                <Download size={18} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 relative flex flex-col bg-slate-200/50 dark:bg-black/40 overflow-hidden" ref={containerRef}>
        {/* Canvas Toolbar */}
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

        <div className="flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8">
          <div 
            className="bg-white shadow-2xl transition-transform duration-300" 
            style={{ 
              width: 800, 
              height: 600,
              transform: `scale(${stageScale})`,
              transformOrigin: 'center center'
            }}
          >
            <Stage
              width={800}
              height={600}
              onMouseDown={checkDeselect}
              onTouchStart={checkDeselect}
              ref={stageRef}
            >
              <Layer>
                {elements.map((el, i) => {
                  if (el.type === 'image') {
                    return (
                      <ImageElement
                        key={el.id}
                        element={el}
                        isSelected={el.id === selectedId}
                        onSelect={() => selectShape(el.id)}
                        onChange={(newAttrs: any) => {
                          const rects = elements.slice();
                          rects[i] = newAttrs;
                          setElements(rects);
                        }}
                      />
                    );
                  }
                  if (el.type === 'text') {
                    return (
                      <TextElement
                        key={el.id}
                        element={el}
                        isSelected={el.id === selectedId}
                        onSelect={() => selectShape(el.id)}
                        onChange={(newAttrs: any) => {
                          const rects = elements.slice();
                          rects[i] = newAttrs;
                          setElements(rects);
                        }}
                      />
                    );
                  }
                  return null;
                })}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {isCropping && selectedElement && selectedElement.src && (
        <CropModal
          src={selectedElement.src}
          onComplete={(croppedSrc, width, height) => {
            setElements(elements.map(el => {
              if (el.id === selectedId) {
                const maxWidth = 600;
                const scale = width > maxWidth ? maxWidth / width : 1;
                return { 
                  ...el, 
                  src: croppedSrc,
                  width: width * scale,
                  height: height * scale,
                  scaleX: 1,
                  scaleY: 1
                };
              }
              return el;
            }));
            setIsCropping(false);
          }}
          onCancel={() => setIsCropping(false)}
        />
      )}
    </div>
  );
};
