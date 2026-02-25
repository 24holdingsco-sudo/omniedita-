import React, { useState, useEffect } from 'react';
import { Upload, ArrowRight, FileImage, FileText, Download, RefreshCw, Eye, Settings2 } from 'lucide-react';
import { cn } from '../utils';
import { PDFDocument } from 'pdf-lib';

type CompressionLevel = 'none' | 'low' | 'medium' | 'high';

export const Converter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>('pdf');
  const [compression, setCompression] = useState<CompressionLevel>('none');
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
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

  const compressImage = (imageFile: File, quality: number, scale: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas not supported');
        
        // Use better interpolation for downscaling if possible
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Always compress to JPEG for PDF embedding to save space, unless it's a PNG with transparency
        // For simplicity in this demo, we'll use JPEG
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
    
    let processedFile = imageFile;
    let imageBytes = await processedFile.arrayBuffer();
    let isJpeg = imageFile.type === 'image/jpeg';

    if (compression !== 'none') {
      const quality = getCompressionQuality(compression);
      const scale = getCompressionScale(compression);
      const compressedBlob = await compressImage(imageFile, quality, scale);
      imageBytes = await compressedBlob.arrayBuffer();
      isJpeg = true; // compressImage returns JPEG
    }
    
    let image;
    if (isJpeg) {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (imageFile.type === 'image/png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      // If it's neither (e.g., WebP), we must convert it to JPEG first
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
      let resultBlob: Blob;
      
      if (file.type.startsWith('image/')) {
        if (targetFormat === 'pdf') {
          resultBlob = await convertImageToPdf(file);
        } else {
          resultBlob = await convertImageFormat(file, targetFormat);
        }
      } else {
        alert('Currently only image conversions are supported in this demo.');
        setIsConverting(false);
        return;
      }

      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-${compression !== 'none' ? 'compressed-' : ''}${Date.now()}.${targetFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Conversion failed.');
    } finally {
      setIsConverting(false);
    }
  };

  const isCompressible = targetFormat === 'jpeg' || targetFormat === 'webp' || targetFormat === 'pdf';

  return (
    <div className="flex h-full bg-slate-900/50 backdrop-blur-md rounded-none md:rounded-2xl border-0 md:border border-slate-700/50 overflow-y-auto">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">Universal Converter</h1>
          <p className="text-slate-400">Convert and compress images to PDF, PNG, JPEG, or WebP entirely in your browser.</p>
        </div>

        <div className="w-full bg-slate-800/80 rounded-2xl border border-slate-700 p-8 shadow-2xl flex flex-col gap-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            
            {/* Source File */}
            <div className="flex-1 w-full">
              <label className={cn(
                "flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors relative overflow-hidden",
                file ? "border-emerald-500 bg-emerald-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-900/50"
              )}>
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                {file && fileUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <img src={fileUrl} alt="Preview" className="max-w-full max-h-full object-contain opacity-30 blur-[2px]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10">
                      <FileImage className="w-12 h-12 text-emerald-400 mx-auto mb-2 drop-shadow-md" />
                      <p className="text-white font-medium truncate max-w-[200px] drop-shadow-md">{file.name}</p>
                      <p className="text-sm text-slate-200 drop-shadow-md">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-300 font-medium">Select File</p>
                  </div>
                )}
              </label>
            </div>

            <ArrowRight className="w-8 h-8 text-slate-500 hidden md:block" />

            {/* Target Format & Settings */}
            <div className="flex-1 w-full">
              <div className="h-48 bg-slate-900/50 rounded-xl border border-slate-700 p-6 flex flex-col justify-center gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Convert to:</label>
                  <select
                    value={targetFormat}
                    onChange={(e) => {
                      setTargetFormat(e.target.value);
                      if (e.target.value === 'png') setCompression('none');
                    }}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="png">PNG Image</option>
                    <option value="jpeg">JPEG Image</option>
                    <option value="webp">WebP Image</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <Settings2 size={16} />
                    Compression Level:
                  </label>
                  <select
                    value={compression}
                    onChange={(e) => setCompression(e.target.value as CompressionLevel)}
                    disabled={!isCompressible}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="none">None (Original Quality)</option>
                    <option value="low">Low (Good Quality, Smaller File)</option>
                    <option value="medium">Medium (Fair Quality, Small File)</option>
                    <option value="high">High (Low Quality, Smallest File)</option>
                  </select>
                  {!isCompressible && (
                    <p className="text-xs text-slate-500 mt-1">Compression not available for PNG.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Area */}
          {fileUrl && (
            <div className="w-full bg-slate-900/50 rounded-xl border border-slate-700 p-4 flex flex-col items-center">
              <div className="flex items-center gap-2 text-slate-300 mb-4 w-full">
                <Eye size={18} />
                <span className="font-medium">Preview</span>
              </div>
              <div className="relative w-full max-w-md aspect-video bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700">
                <img src={fileUrl} alt="Full Preview" className="max-w-full max-h-full object-contain" />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-700 flex justify-center">
            <button
              onClick={handleConvert}
              disabled={!file || isConverting}
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium text-lg transition-all transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
            >
              {isConverting ? (
                <RefreshCw className="animate-spin" size={24} />
              ) : (
                <Download size={24} />
              )}
              <span>{isConverting ? 'Processing...' : 'Convert & Download'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
