import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { FileText, Plus, Download, Trash2, Merge, Upload, Eye, FileType, Image as ImageIcon, ScanText, RefreshCw, Undo2, Redo2 } from 'lucide-react';
import { cn } from '../utils';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';
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

  const performOcrOnPdf = async (docFile: DocFile) => {
    if (docFile.type !== 'pdf') return;
    setIsProcessing(true);
    setProcessingStatus('Initializing OCR...');

    try {
      const arrayBuffer = await docFile.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        setProcessingStatus(`Running OCR on page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        
        const dataUrl = canvas.toDataURL('image/png');
        
        const result = await Tesseract.recognize(dataUrl, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProcessingStatus(`OCR Page ${i}: ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        
        fullText += result.data.text + '\n\n';
      }

      const blob = new Blob([fullText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docFile.name.replace('.pdf', '')}-ocr.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error performing OCR:', error);
      alert('Failed to perform OCR on PDF.');
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
    <div className="flex flex-col lg:flex-row h-full bg-slate-900/50 backdrop-blur-md rounded-none md:rounded-2xl border-0 md:border border-slate-700/50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-full lg:w-80 bg-slate-800/80 border-b lg:border-b-0 lg:border-r border-slate-700/50 p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] lg:max-h-full shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Document Editor</h2>
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
        
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors cursor-pointer text-center",
            isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-800/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm text-slate-300 font-medium">Upload PDF or TXT</p>
        </div>

        <div className="h-px bg-slate-700/50 my-2" />

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => setSelectedId(file.id)}
              className={cn(
                "flex flex-col p-3 rounded-lg border cursor-pointer transition-colors",
                selectedId === file.id 
                  ? "bg-indigo-600/20 border-indigo-500" 
                  : "bg-slate-800/50 border-slate-700 hover:bg-slate-700/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className={cn("w-5 h-5 flex-shrink-0", file.type === 'pdf' ? "text-red-400" : "text-blue-400")} />
                  <p className="text-sm text-white font-medium truncate">{file.name}</p>
                </div>
                <button
                  onClick={(e) => removeFile(file.id, e)}
                  className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              {selectedId === file.id && file.type === 'txt' && (
                <button
                  onClick={(e) => { e.stopPropagation(); convertTxtToPdf(file); }}
                  disabled={isProcessing}
                  className="mt-2 flex items-center justify-center gap-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                >
                  <FileType size={14} />
                  Convert to PDF
                </button>
              )}

              {selectedId === file.id && file.type === 'pdf' && (
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); convertPdfToTxt(file); }}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                    title="Extract text preserving layout"
                  >
                    <FileType size={14} />
                    Extract to TXT
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); performOcrOnPdf(file); }}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    title="Use OCR for scanned PDFs"
                  >
                    <ScanText size={14} />
                    OCR to TXT
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); convertPdfToImages(file); }}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-colors"
                  >
                    <ImageIcon size={14} />
                    Extract to Images
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {files.filter(f => f.type === 'pdf').length > 1 && (
          <div className="mt-auto pt-4 border-t border-slate-700/50">
            <button
              onClick={mergePdfs}
              disabled={isProcessing}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Merge size={18} />
              <span>Merge All PDFs</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 p-6 bg-slate-950/50 flex flex-col">
        {selectedFile ? (
          <div className="flex-1 flex flex-col bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl relative">
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-lg font-medium text-white">{processingStatus}</p>
              </div>
            )}
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Eye size={18} />
                <span className="font-medium">Preview: {selectedFile.name}</span>
              </div>
              <a
                href={selectedFile.url}
                download={selectedFile.name}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Download size={16} />
                Download Original
              </a>
            </div>
            <div className="flex-1 bg-white overflow-hidden relative">
              {selectedFile.type === 'pdf' ? (
                <iframe
                  src={`${selectedFile.url}#toolbar=0`}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              ) : (
                <pre className="w-full h-full p-6 text-slate-800 font-mono text-sm overflow-auto whitespace-pre-wrap">
                  {selectedFile.content}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">Select a document to preview</p>
          </div>
        )}
      </div>
    </div>
  );
};

