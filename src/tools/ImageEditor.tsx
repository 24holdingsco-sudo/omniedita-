import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from 'react-konva';
import useImage from 'use-image';
import { Upload, Download, Type, Image as ImageIcon, RotateCw, Crop, Trash2, Scissors, RefreshCw, SlidersHorizontal, X, Save, FolderOpen, Undo2, Redo2, Hash, Trash } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-4xl max-h-full flex flex-col gap-4 border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Crop size={20} className="text-indigo-400" />
            Crop Image
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-950 rounded-xl flex items-center justify-center p-4 border border-slate-800 min-h-[400px]">
          <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
            <img ref={imgRef} src={src} alt="Crop me" className="max-w-full max-h-[60vh] object-contain" />
          </ReactCrop>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-medium transition-colors">Cancel</button>
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

  const applyAsciiFilter = () => {
    if (!selectedId) return;
    
    const selectedElement = elements.find(el => el.id === selectedId);
    if (!selectedElement || selectedElement.type !== 'image' || !selectedElement.src) return;

    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = createAsciiImage(img, img.width, img.height, 8);
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

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-900/50 backdrop-blur-md rounded-none md:rounded-2xl border-0 md:border border-slate-700/50 overflow-hidden relative">
      {/* Sidebar Tools */}
      <div className="w-full lg:w-72 bg-slate-800/80 border-b lg:border-b-0 lg:border-r border-slate-700/50 p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] lg:max-h-full shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Image Editor</h2>
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
          <span>Upload Image</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>

        <button
          onClick={addText}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <Type size={18} />
          <span>Add Text</span>
        </button>

        <div className="h-px bg-slate-700/50 my-2" />

        <button
          onClick={() => setIsCropping(true)}
          disabled={!isImageSelected}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Crop size={18} />
          <span>Crop Image</span>
        </button>

        <button
          onClick={handleRemoveBackground}
          disabled={!isImageSelected || isRemovingBg}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRemovingBg ? <RefreshCw size={18} className="animate-spin" /> : <Scissors size={18} />}
          <span>{isRemovingBg ? 'Removing...' : 'Remove BG'}</span>
        </button>

        <button
          onClick={applyAsciiFilter}
          disabled={!isImageSelected}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Convert image to ASCII art"
        >
          <Hash size={18} />
          <span>ASCII Art Filter</span>
        </button>

        {isImageSelected && selectedElement && (
          <div className="flex flex-col gap-4 mt-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1">
              <SlidersHorizontal size={16} />
              Filters
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedElement.grayscale}
                  onChange={(e) => {
                    setElements(elements.map(el => el.id === selectedId ? { ...el, grayscale: e.target.checked } : el));
                  }}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                Grayscale
              </label>

              <label className="flex items-center gap-3 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedElement.sepia}
                  onChange={(e) => {
                    setElements(elements.map(el => el.id === selectedId ? { ...el, sepia: e.target.checked } : el));
                  }}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                Sepia
              </label>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between">
                  <label className="text-xs text-slate-400">Brightness</label>
                  <span className="text-xs text-slate-500">{Math.round((selectedElement.brightness || 0) * 100)}%</span>
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
                <div className="flex justify-between">
                  <label className="text-xs text-slate-400">Contrast</label>
                  <span className="text-xs text-slate-500">{Math.round((selectedElement.contrast || 0))}</span>
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

        <div className="h-px bg-slate-700/50 my-2" />

        <button
          onClick={deleteSelected}
          disabled={!selectedId}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={18} />
          <span>Delete Selected</span>
        </button>

        <div className="mt-auto pt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={saveProject}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
              title="Save Project"
            >
              <Save size={16} />
              <span>Save</span>
            </button>
            <button
              onClick={loadProject}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
              title="Load Project"
            >
              <FolderOpen size={16} />
              <span>Load</span>
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearCanvas}
              disabled={elements.length === 0}
              className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash size={18} />
              <span>Clear</span>
            </button>
            <button
              onClick={downloadImage}
              disabled={elements.length === 0}
              className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-slate-950/50" ref={containerRef}>
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center p-8">
          <div className="bg-white shadow-2xl" style={{ width: 800, height: 600 }}>
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
                // Determine new dimensions while keeping it within reasonable bounds
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
