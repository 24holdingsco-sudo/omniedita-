import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { FileText, Plus, Download, Trash2, Merge, Upload, Eye, FileType, Image as ImageIcon, RefreshCw, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Minimize2, List, Edit3, Save, RotateCw, FolderOpen } from 'lucide-react';
import { cn } from '../utils';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useHistory } from '../hooks/useHistory';

// Set worker path for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface DocFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url: string;
  content?: string;
}

const PdfPreview = ({ file, onUpdateContent }: { file: DocFile, onUpdateContent?: (id: string, content: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(file.content || '');

  useEffect(() => {
    if (file.type === 'pdf') {
      const generateThumbnails = async () => {
        try {
          const arrayBuffer = await file.file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const thumbs: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport, canvas: canvas as any } as any).promise;
            thumbs.push(canvas.toDataURL());
          }
          setThumbnails(thumbs);
        } catch (err) {
          console.error('Error generating thumbnails:', err);
        }
      };
      generateThumbnails();
    }
  }, [file]);

  useEffect(() => {
    if (file.type === 'pdf' && canvasRef.current) {
      const renderPage = async () => {
        try {
          const arrayBuffer = await file.file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setNumPages(pdf.numPages);
          
          const page = await pdf.getPage(currentPage);
          const viewport = page.getViewport({ scale });
          const canvas = canvasRef.current!;
          const context = canvas.getContext('2d')!;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas as any
          } as any).promise;
        } catch (err) {
          console.error('Error rendering PDF:', err);
        }
      };
      renderPage();
    }
  }, [file, currentPage, scale]);

  const handleSaveText = () => {
    if (onUpdateContent) {
      onUpdateContent(file.id, editedContent);
      setIsEditing(false);
    }
  };

  if (file.type !== 'pdf') {
    return (
      <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 dark:border-white/5">
          <span className="text-xs font-medium text-slate-500 uppercase">Text Editor</span>
          <div className="flex gap-2">
            {isEditing ? (
              <button onClick={handleSaveText} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Save Changes">
                <Save size={16} />
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Edit Text">
                <Edit3 size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-800 dark:text-slate-200"
            />
          ) : (
            <pre className="w-full h-full font-mono text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">
              {file.content}
            </pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 transition-all duration-300",
      isFullscreen && "fixed inset-0 z-[100] p-0"
    )}>
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-black/5 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowToc(!showToc)}
            className={cn("p-2 rounded-lg transition-colors", showToc ? "bg-indigo-500/10 text-indigo-500" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
            title="Table of Contents"
          >
            <List size={18} />
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ZoomOut size={18} />
          </button>
          <span className="text-xs font-mono w-12 text-center text-slate-500">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ZoomIn size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 text-slate-500 disabled:opacity-30"
            >
              <Undo2 size={16} className="rotate-90" />
            </button>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {currentPage} / {numPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage === numPages}
              className="p-1 text-slate-500 disabled:opacity-30"
            >
              <Redo2 size={16} className="rotate-90" />
            </button>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* TOC Sidebar */}
        {showToc && (
          <div className="w-48 border-r border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 overflow-y-auto p-2 flex flex-col gap-4 animate-in slide-in-from-left duration-300">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">Pages</h3>
            {thumbnails.map((thumb, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "flex flex-col gap-1 p-1 rounded-lg transition-all",
                  currentPage === i + 1 ? "ring-2 ring-indigo-500 bg-indigo-500/5" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <img src={thumb} alt={`Page ${i + 1}`} className="w-full rounded border border-black/5 dark:border-white/5" />
                <span className="text-[10px] font-medium text-slate-500">Page {i + 1}</span>
              </button>
            ))}
          </div>
        )}

        {/* PDF Canvas Area */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-200/50 dark:bg-black/40">
          <div className="bg-white shadow-2xl h-fit">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

const sanitizeForPdf = (text: string): string => {
  const winAnsiMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '™': '(TM)', '©': '(C)', '®': '(R)', '…': '...', '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"'
  };
  return text.split('').map(char => winAnsiMap[char] || (char.charCodeAt(0) > 255 ? '?' : char)).join('');
};

export const PdfEditor: React.FC = () => {
  const { state: files, set: setFiles, undo, redo, canUndo, canRedo } = useHistory<DocFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const onDrop = async (acceptedFiles: File[]) => {
    const newFiles = await Promise.all(acceptedFiles.map(async (file) => {
      const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
      let content = undefined;
      if (isTxt) {
        content = await file.text();
      }
      return {
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        size: file.size,
        type: isTxt ? 'txt' : 'pdf',
        url: URL.createObjectURL(file),
        content
      };
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    if (!selectedId && newFiles.length > 0) {
      setSelectedId(newFiles[0].id);
    }
  };

  const updateFileContent = (id: string, newContent: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, content: newContent } : f));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    }
  });

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== id);
      if (selectedId === id) {
        setSelectedId(newFiles.length > 0 ? newFiles[0].id : null);
      }
      return newFiles;
    });
  };

  const mergePdfs = async () => {
    const pdfFiles = files.filter(f => f.type === 'pdf');
    if (pdfFiles.length < 2) {
      alert('Please upload at least 2 PDF files to merge.');
      return;
    }
    setIsProcessing(true);
    setProcessingStatus('Merging PDFs...');

    try {
      const mergedPdf = await PDFDocument.create();

      for (const docFile of pdfFiles) {
        const arrayBuffer = await docFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfFile = await mergedPdf.save();
      const blob = new Blob([mergedPdfFile], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const convertTxtToPdf = async (docFile: DocFile) => {
    if (docFile.type !== 'txt' || !docFile.content) return;
    setIsProcessing(true);
    setProcessingStatus('Converting to PDF...');

    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      const fontSize = 12;
      const margin = 50;
      let y = height - margin;
      
      const lines = docFile.content.split('\n');
      
      for (const line of lines) {
        if (y < margin) {
          pdfDoc.addPage();
          y = height - margin;
        }
        page.drawText(sanitizeForPdf(line), {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        y -= fontSize + 4;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docFile.name.replace('.txt', '')}-converted.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error converting TXT to PDF:', error);
      alert('Failed to convert TXT to PDF.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const convertPdfToTxt = async (docFile: DocFile) => {
    if (docFile.type !== 'pdf') return;
    setIsProcessing(true);
    setProcessingStatus('Extracting text...');

    try {
      const arrayBuffer = await docFile.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group text items by their Y coordinate (rounded to nearest 5 to account for slight variations)
        const lines: { [y: number]: any[] } = {};
        textContent.items.forEach((item: any) => {
          const y = Math.round(item.transform[5] / 5) * 5;
          if (!lines[y]) lines[y] = [];
          lines[y].push(item);
        });

        // Sort lines by Y coordinate descending (top to bottom)
        const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
        
        let pageText = '';
        sortedY.forEach(y => {
          // Sort items in each line by X coordinate (left to right)
          const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
          
          let lineText = '';
          let lastX = -1;
          let lastWidth = 0;
          
          lineItems.forEach(item => {
            const x = item.transform[4];
            // Add spaces if there's a significant gap between words
            if (lastX !== -1 && (x - (lastX + lastWidth)) > item.width * 0.5) {
              lineText += ' '.repeat(Math.max(1, Math.floor((x - (lastX + lastWidth)) / (item.width || 5))));
            }
            lineText += item.str;
            lastX = x;
            lastWidth = item.width;
          });
          
          pageText += lineText + '\n';
        });
        
        fullText += pageText + '\n\n';
      }

      const blob = new Blob([fullText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docFile.name.replace('.pdf', '')}-extracted.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error converting PDF to TXT:', error);
      alert('Failed to extract text from PDF.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const rotatePdf = async (docFile: DocFile) => {
    if (docFile.type !== 'pdf') return;
    setIsProcessing(true);
    setProcessingStatus('Rotating PDF...');

    try {
      const arrayBuffer = await docFile.file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();
      pages.forEach(page => {
        const rotation = page.getRotation().angle;
        page.setRotation(degrees((rotation + 90) % 360));
      });

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docFile.name.replace('.pdf', '')}-rotated.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error rotating PDF:', error);
      alert('Failed to rotate PDF.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const convertPdfToImages = async (docFile: DocFile) => {
    if (docFile.type !== 'pdf') return;
    setIsProcessing(true);
    setProcessingStatus('Extracting images...');

    try {
      const arrayBuffer = await docFile.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${docFile.name.replace('.pdf', '')}-page-${i}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    } catch (error) {
      console.error('Error converting PDF to Images:', error);
      alert('Failed to convert PDF to images.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const selectedFile = files.find(f => f.id === selectedId);

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Sidebar Dashboard */}
      <div className="w-full lg:w-80 glass-panel border-b lg:border-b-0 lg:border-r p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] lg:max-h-full shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Dashboard</h2>
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 disabled:opacity-30 transition-all active:scale-90"
              title="Undo"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 disabled:opacity-30 transition-all active:scale-90"
              title="Redo"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center justify-center gap-2 px-3 py-3 bg-indigo-600 text-white rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-500/20 active:scale-95 font-bold text-xs">
            <Plus size={16} />
            <span>Add File</span>
            <input type="file" accept="application/pdf,text/plain" multiple className="hidden" onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) onDrop(files);
            }} />
          </label>
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/pdf,text/plain';
              input.multiple = true;
              input.onchange = (e: any) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) onDrop(files as File[]);
              };
              input.click();
            }}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all font-bold text-xs"
          >
            <FolderOpen size={16} />
            <span>Load</span>
          </button>
        </div>
        
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer text-center",
            isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-black/10 dark:border-white/10 hover:border-indigo-500/30 bg-black/5 dark:bg-white/5"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-indigo-500 mb-2" />
          <p className="text-sm font-medium">Upload PDF or TXT</p>
          <p className="text-[10px] text-slate-400 mt-1">Drag and drop or click to browse</p>
        </div>

        <div className="h-px bg-black/5 dark:bg-white/5 my-2" />

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => setSelectedId(file.id)}
              className={cn(
                "flex flex-col p-3 rounded-xl border cursor-pointer transition-all duration-300",
                selectedId === file.id 
                  ? "bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10" 
                  : "bg-transparent border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={cn("p-2 rounded-lg", file.type === 'pdf' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500")}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium truncate">{file.name}</p>
                </div>
                <button
                  onClick={(e) => removeFile(file.id, e)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              {selectedId === file.id && file.type === 'txt' && (
                <button
                  onClick={(e) => { e.stopPropagation(); convertTxtToPdf(file); }}
                  disabled={isProcessing}
                  className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95"
                >
                  <FileType size={14} />
                  Convert to PDF
                </button>
              )}

              {selectedId === file.id && file.type === 'pdf' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); convertPdfToTxt(file); }}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white text-[10px] font-bold rounded-lg transition-all"
                    title="Extract text preserving layout"
                  >
                    <FileType size={14} />
                    Extract
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); rotatePdf(file); }}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white text-[10px] font-bold rounded-lg transition-all"
                    title="Rotate all pages 90 degrees"
                  >
                    <RotateCw size={14} />
                    Rotate
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); convertPdfToImages(file); }}
                    disabled={isProcessing}
                    className="col-span-2 flex items-center justify-center gap-2 py-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    <ImageIcon size={14} />
                    Extract to Images
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-3">
          {files.filter(f => f.type === 'pdf').length > 1 && (
            <button
              onClick={mergePdfs}
              disabled={isProcessing}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-xl shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
            >
              <Merge size={18} />
              <span>Merge All PDFs</span>
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm('Clear all files?')) {
                setFiles([]);
                setSelectedId(null);
              }
            }}
            className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all active:scale-95 border border-red-500/20"
          >
            <Trash2 size={18} />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 p-4 md:p-8 flex flex-col overflow-hidden">
        {selectedFile ? (
          <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden relative shadow-2xl">
            {isProcessing && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-lg font-bold">{processingStatus}</p>
              </div>
            )}
            <PdfPreview file={selectedFile} onUpdateContent={updateFileContent} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="p-8 rounded-full bg-black/5 dark:bg-white/5 mb-6">
              <FileText className="w-16 h-16 opacity-20" />
            </div>
            <p className="text-xl font-medium">Select a document to begin</p>
            <p className="text-sm opacity-60 mt-2">Upload PDFs or text files to edit and convert</p>
          </div>
        )}
      </div>
    </div>
  );
};

