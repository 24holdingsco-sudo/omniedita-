import React, { useState, useEffect, useRef } from 'react';
import { Upload, ArrowRight, FileImage, FileText, Download, RefreshCw, Eye, Settings2, Trash, FileType, ZoomIn, ZoomOut, Maximize2, Minimize2, FileCode } from 'lucide-react';
import { cn } from '../utils';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type CompressionLevel = 'none' | 'low' | 'medium' | 'high';

const PdfPreview = ({ file }: { file: File }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    if (file.type === 'application/pdf' && canvasRef.current) {
      const renderPage = async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setNumPages(pdf.numPages);
          
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = canvasRef.current!;
          const context = canvas.getContext('2d')!;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          } as any).promise;
        } catch (err) {
          console.error('Error rendering PDF preview:', err);
        }
      };
      renderPage();
    }
  }, [file]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/50 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
      {numPages > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/50 px-3 py-1.5 rounded-lg text-xs font-bold text-white backdrop-blur-md">
          {numPages} Page{numPages > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export const Converter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>('pdf');
  const [compression, setCompression] = useState<CompressionLevel>('none');
  const [isConverting, setIsConverting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      
      if (file.type === 'application/pdf') {
        setTargetFormat('docx');
      } else if (file.name.endsWith('.docx')) {
        setTargetFormat('pdf');
      } else if (file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        setTargetFormat('pdf');
      }

      return () => URL.revokeObjectURL(url);
    } else {
      setFileUrl(null);
    }
  }, [file]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const convertSvgToImage = (svgFile: File, format: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const svgText = e.target?.result as string;
        const img = new Image();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 800;
          canvas.height = img.height || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas not supported');
          
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject('SVG conversion failed');
          }, `image/${format}`, 0.92);
          URL.revokeObjectURL(url);
        };
        img.onerror = reject;
        img.src = url;
      };
      reader.onerror = reject;
      reader.readAsText(svgFile);
    });
  };

  const getCompressionQuality = (level: CompressionLevel): number => {
    switch (level) {
      case 'low': return 0.8;
      case 'medium': return 0.6;
      case 'high': return 0.4;
      default: return 1.0;
    }
  };

  const getCompressionScale = (level: CompressionLevel): number => {
    switch (level) {
      case 'low': return 0.9;
      case 'medium': return 0.75;
      case 'high': return 0.5;
      default: return 1.0;
    }
  };

  const compressImage = (imageFile: File | Blob, quality: number, scale: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas not supported');
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Compression failed');
        }, 'image/jpeg', quality);
        URL.revokeObjectURL(url);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const convertImageToPdf = async (imageFile: File) => {
    const pdfDoc = await PDFDocument.create();
    
    let processedFile: File | Blob = imageFile;
    let imageBytes = await processedFile.arrayBuffer();
    let isJpeg = imageFile.type === 'image/jpeg';

    if (compression !== 'none') {
      const quality = getCompressionQuality(compression);
      const scale = getCompressionScale(compression);
      const compressedBlob = await compressImage(imageFile, quality, scale);
      imageBytes = await compressedBlob.arrayBuffer();
      isJpeg = true;
    }
    
    let image;
    if (isJpeg) {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (imageFile.type === 'image/png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      const compressedBlob = await compressImage(imageFile, 1.0, 1.0);
      imageBytes = await compressedBlob.arrayBuffer();
      image = await pdfDoc.embedJpg(imageBytes);
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  };

  const convertPdfToImage = async (pdfFile: File, format: string): Promise<Blob[]> => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const blobs: Blob[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport } as any).promise;

      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob((b) => resolve(b), `image/${format}`, 0.92)
      );
      if (blob) blobs.push(blob);
    }
    return blobs;
  };

  const convertPdfToDocx = async (pdfFile: File): Promise<Blob> => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const sections = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str).join(' ');
      
      sections.push({
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: textItems,
                size: 24,
              }),
            ],
          }),
        ],
      });
    }

    const doc = new Document({
      sections: sections,
    });

    return await Packer.toBlob(doc);
  };

  const convertDocxToPdf = async (docxFile: File): Promise<Blob> => {
    const arrayBuffer = await docxFile.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    const fontSize = 12;
    const margin = 50;
    let y = height - margin;
    
    const textLines = text.split('\n');
    for (const line of textLines) {
      if (y < margin) {
        pdfDoc.addPage();
        y = height - margin;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= fontSize + 4;
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  };

  const convertImageFormat = (imageFile: File, format: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = compression !== 'none' ? getCompressionScale(compression) : 1.0;
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas not supported');
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const quality = compression !== 'none' ? getCompressionQuality(compression) : 0.92;
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Conversion failed');
        }, `image/${format}`, quality);
        URL.revokeObjectURL(url);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsConverting(true);

    try {
      if (file.type === 'application/pdf') {
        if (targetFormat === 'docx') {
          const resultBlob = await convertPdfToDocx(file);
          const url = URL.createObjectURL(resultBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `converted-${Date.now()}.docx`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const blobs = await convertPdfToImage(file, targetFormat);
          for (let i = 0; i < blobs.length; i++) {
            const url = URL.createObjectURL(blobs[i]);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converted-page-${i + 1}-${Date.now()}.${targetFormat}`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      } else if (file.name.endsWith('.docx')) {
        if (targetFormat === 'pdf') {
          const resultBlob = await convertDocxToPdf(file);
          const url = URL.createObjectURL(resultBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `converted-${Date.now()}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else if (file.type.startsWith('image/')) {
        let resultBlob: Blob;
        if (targetFormat === 'pdf') {
          resultBlob = await convertImageToPdf(file);
        } else {
          resultBlob = await convertImageFormat(file, targetFormat);
        }
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted-${compression !== 'none' ? 'compressed-' : ''}${Date.now()}.${targetFormat}`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (file.type === 'image/svg+xml') {
        let resultBlob: Blob;
        if (targetFormat === 'pdf') {
          const pngBlob = await convertSvgToImage(file, 'png');
          const pngFile = new File([pngBlob], 'temp.png', { type: 'image/png' });
          resultBlob = await convertImageToPdf(pngFile);
        } else {
          resultBlob = await convertSvgToImage(file, targetFormat);
        }
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted-${Date.now()}.${targetFormat}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error(error);
      alert('Conversion failed.');
    } finally {
      setIsConverting(false);
    }
  };

  const isCompressible = targetFormat === 'jpeg' || targetFormat === 'webp' || targetFormat === 'pdf';
  const isPdfInput = file?.type === 'application/pdf';
  const isDocxInput = file?.name.endsWith('.docx');

  return (
    <div className={cn(
      "flex flex-col lg:flex-row h-full overflow-hidden transition-all duration-300",
      isFullscreen && "fixed inset-0 z-[100] bg-slate-950"
    )}>
      {/* Sidebar Dashboard */}
      {!isFullscreen && (
        <div className="w-full lg:w-80 glass-panel border-b lg:border-b-0 lg:border-r p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] lg:max-h-full shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Dashboard</h2>
          
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-500/20 active:scale-95 font-bold">
              <Upload size={18} />
              <span>Upload File</span>
              <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf,image/svg+xml,.docx" />
            </label>

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />

          <div className="flex flex-col gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <Settings2 size={14} />
              Conversion Settings
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Target Format</label>
              <select
                value={targetFormat}
                onChange={(e) => {
                  setTargetFormat(e.target.value);
                  if (e.target.value === 'png') setCompression('none');
                }}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 transition-colors"
              >
                {isPdfInput && <option value="docx">Word Document (.docx)</option>}
                {isDocxInput && <option value="pdf">PDF Document</option>}
                {!isPdfInput && !isDocxInput && <option value="pdf">PDF Document</option>}
                <option value="png">PNG Image</option>
                <option value="jpeg">JPEG Image</option>
                <option value="webp">WebP Image</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Compression</label>
              <select
                value={compression}
                onChange={(e) => setCompression(e.target.value as CompressionLevel)}
                disabled={!isCompressible || isPdfInput}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="none">None (Original)</option>
                <option value="low">Low (Good)</option>
                <option value="medium">Medium (Small)</option>
                <option value="high">High (Smallest)</option>
              </select>
            </div>
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-2">
            <button
              onClick={handleConvert}
              disabled={!file || isConverting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 font-bold text-xs disabled:opacity-30"
            >
              {isConverting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
              <span>{isConverting ? 'Processing...' : 'Convert & Download'}</span>
            </button>
            
            <button
              onClick={() => setFile(null)}
              disabled={!file || isConverting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-30 font-bold text-xs"
            >
              <Trash size={18} />
              <span>Clear File</span>
            </button>
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 relative flex flex-col bg-slate-200/50 dark:bg-black/40 overflow-hidden">
        {/* Preview Toolbar */}
        {fileUrl && (
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
          {!fileUrl ? (
            <div className="text-center text-slate-400 flex flex-col items-center gap-4">
              <FileType className="w-16 h-16 opacity-20" />
              <p className="text-sm font-medium">Select a file to start converting</p>
            </div>
          ) : (
            <div 
              className="relative w-full max-w-4xl aspect-video bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl transition-transform duration-300 flex items-center justify-center"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              {isPdfInput ? (
                <PdfPreview file={file!} />
              ) : isDocxInput ? (
                <div className="flex flex-col items-center gap-4 text-slate-400">
                  <FileCode className="w-24 h-24 opacity-20" />
                  <p className="text-lg font-bold">Word Document Loaded</p>
                  <p className="text-sm">{file?.name}</p>
                </div>
              ) : (
                <img src={fileUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
              )}
            </div>
          )}
        </div>

        {file && !isFullscreen && (
          <div className="p-4 bg-white/5 border-t border-black/5 dark:border-white/5">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">File Name</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{file.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Size</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
