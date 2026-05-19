
import React, { useState } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { useTranslation } from '../LanguageContext';
import Spinner from './Spinner';
import UploadIcon from './icons/UploadIcon';

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.7.284/pdf.worker.min.mjs`;

interface FileUploadProps {
  onQuestionsExtracted: (text: string) => Promise<void>;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onQuestionsExtracted, isLoading }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const fileName = file.name.toLowerCase();

    try {
      let text = '';
      const arrayBuffer = await file.arrayBuffer();

      if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (fileName.endsWith('.doc')) {
        try {
          // Convert ArrayBuffer to Base64
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64 = window.btoa(binary);

          const response = await fetch('/api/extract-text-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64 })
          });

          if (!response.ok) throw new Error('Server returned an error');
          const data = await response.json();
          text = data.text;
        } catch (docErr) {
          console.error("DOC Parsing Error:", docErr);
          setError("Gagal memproses file .doc. Gunakan .docx jika memungkinkan.");
          return;
        }
      } else if (fileName.endsWith('.pdf')) {
        try {
            // Using modern PDF.js loading
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              // @ts-ignore
              const strings = content.items.map((item: any) => item.str);
              fullText += strings.join(' ') + '\n';
            }
            text = fullText;
        } catch (pdfErr) {
            console.error("PDF Parsing Error:", pdfErr);
            setError("Gagal memproses PDF. Pastikan file tidak terkunci atau rusak.");
            return;
        }
      } else {
        setError(t('quiz_generator.upload.error_unsupported'));
        return;
      }

      if (text.trim()) {
        await onQuestionsExtracted(text);
      } else {
        setError('Dokumen kosong atau teks tidak berhasil diekstrak.');
      }
    } catch (err) {
      console.error("File Reader Error:", err);
      setError('Terjadi kesalahan saat membaca file.');
    } finally {
        // Reset input value so same file can be uploaded again if needed
        e.target.value = '';
    }
  };

  return (
    <div className="relative group">
      <label className={`
        flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer
        transition-all duration-300
        ${isLoading 
          ? 'bg-slate-700/50 cursor-not-allowed border border-slate-600' 
          : 'bg-slate-800/60 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-700/80 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] shadow-sm'
        }
      `}>
        {isLoading ? (
          <Spinner className="w-5 h-5 text-purple-500" />
        ) : (
          <UploadIcon className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
        )}
        <input 
          type="file" 
          className="hidden" 
          accept=".docx,.pdf,.doc" 
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>
      
      {/* Tooltip */}
      {!isLoading && (
        <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <div className="bg-slate-900 text-white text-[10px] sm:text-xs py-1 px-2 rounded border border-slate-700 shadow-xl">
            {t('quiz_generator.upload.button')}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-full right-0 mt-2 w-48 z-50">
            <p className="text-[10px] text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20 shadow-xl backdrop-blur-sm">
                {error}
                <button onClick={() => setError(null)} className="ml-2 underline font-bold">dismiss</button>
            </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
