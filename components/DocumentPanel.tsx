
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Question, QuestionType } from '../types';
import XCircleIcon from './icons/XCircleIcon';
import TrashIcon from './icons/TrashIcon';
import PdfIcon from './icons/PdfIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import DocumentIcon from './icons/DocumentIcon';
import WordIcon from './icons/WordIcon';
import KeyIcon from './icons/KeyIcon';
import GoogleFormIcon from './icons/GoogleFormIcon';
import PrinterIcon from './icons/PrinterIcon';
import SparklesIcon from './icons/SparklesIcon';
import Spinner from './Spinner';
import Tooltip from './Tooltip';
import { useTranslation } from '../LanguageContext';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Math as DocxMath, ImageRun, MathRun, MathFraction, MathSuperScript, MathSubScript, MathRadical } from 'docx';

interface DocumentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onRemove: (questionId: string) => void;
  onClear: () => void;
  subject: string;
}

declare global {
    interface Window {
      MathJax: {
        typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      };
    }
}

const DocumentQuestionItem: React.FC<{ question: Question; index: number; onRemove: (id: string) => void }> = ({ question, index, onRemove }) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (window.MathJax && itemRef.current) {
            window.MathJax.typesetPromise([itemRef.current])
                .catch((err) => console.error('MathJax document item typesetting error:', err));
        }
    }, [question]); 

    return (
        <div ref={itemRef} className="question-item bg-slate-900/50 p-4 rounded-lg relative group prose prose-invert max-w-none">
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity not-prose no-print">
                <Tooltip content={t('document_panel.remove_item_tooltip')} position="left">
                    <button 
                        onClick={() => onRemove(question.id)}
                        className="p-1.5 text-slate-500 bg-slate-800 rounded-full hover:text-red-500 hover:bg-slate-700 transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                    </button>
                </Tooltip>
             </div>
            <div className="font-semibold text-slate-200 mb-2 flex items-start gap-2">
                <span className="font-bold shrink-0">{index + 1}.</span>
                <div className="flex-1 overflow-x-auto scrollbar-hide py-1">
                    <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[[rehypeKatex, { macros: { "\\indolog": "^{#1}\\log{#2}" } }]]}
                    >
                        {question.pertanyaan}
                    </ReactMarkdown>
                </div>
            </div>
            
            {question.image_url && (
                <div className="my-2">
                    <img src={question.image_url} alt="Question Diagram" className="rounded-lg max-h-48 border border-slate-600" />
                </div>
            )}

            {question.tipe === QuestionType.MultipleChoice && question.pilihan && (
                <div className="choices space-y-2 text-slate-300 pl-6">
                    {question.pilihan.map((option, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <span className="font-bold text-purple-400 shrink-0">{String.fromCharCode(97 + i)}.</span>
                            <div className="flex-1 overflow-x-auto scrollbar-hide py-1">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkMath]} 
                                    rehypePlugins={[[rehypeKatex, { macros: { "\\indolog": "^{#1}\\log{#2}" } }]]}
                                >
                                    {option.replace(/^[A-Ea-e]\.\s*/, '')}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {question.tipe === QuestionType.Essay && (
                <div className="mt-2 pl-6 no-print">
                    <p className="text-sm text-slate-400 italic">(Essay answer)</p>
                </div>
            )}
        </div>
    );
};


const DocumentPanel: React.FC<DocumentPanelProps> = ({
  isOpen,
  onClose,
  questions,
  onRemove,
  onClear,
  subject,
}) => {
  const { t, language } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showGFormModal, setShowGFormModal] = useState(false);
  const [showGFormConfig, setShowGFormConfig] = useState(true); 
  const [isGFormScriptCopied, setIsGFormScriptCopied] = useState(false);
  const gformScriptRef = useRef<HTMLTextAreaElement>(null);

  const [includeName, setIncludeName] = useState(true);
  const [includeClass, setIncludeClass] = useState(true);
  const [includeAbsentNo, setIncludeAbsentNo] = useState(true);
  const [mcPoints, setMcPoints] = useState(2);
  const [essayPoints, setEssayPoints] = useState(0);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<{formUrl: string, editUrl: string} | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        setIsAuthenticated(data.isAuthenticated);
      } catch (e) {
        console.error('Failed to check auth status', e);
      }
    };
    checkAuth();
  }, [showGFormModal]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsAuthenticated(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(url, 'google_oauth', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (e) {
      console.error('Failed to get auth URL', e);
      setExportError(t('document_panel.gform_error'));
    }
  };

  const handleDirectExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportResult(null);

    try {
      const res = await fetch('/api/export/gform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          questions,
          config: {
            includeName,
            includeClass,
            includeAbsentNo,
            mcPoints,
            essayPoints
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setExportResult({
          formUrl: data.formUrl,
          editUrl: data.editUrl
        });
      } else {
        setExportError(data.error || t('document_panel.gform_error'));
      }
    } catch (e) {
      console.error('Failed to export GForm', e);
      setExportError(t('document_panel.gform_error'));
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Comprehensive symbol mapper for non-linear math representation in Word
  const mapMathSymbols = (text: string) => {
    return text
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\ne/g, '≠')
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\infty/g, '∞')
      .replace(/\\pi/g, 'π')
      .replace(/\\int/g, '∫')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\sqrt/g, '√')
      .replace(/\\approx/g, '≈')
      .replace(/\\rightarrow/g, '→')
      .replace(/\\leftarrow/g, '←')
      .replace(/\\Rightarrow/g, '⇒')
      .replace(/\\Leftarrow/g, '⇐')
      .replace(/\\Leftrightarrow/g, '⇔')
      .replace(/\\forall/g, '∀')
      .replace(/\\exists/g, '∃')
      .replace(/\\in/g, '∈')
      .replace(/\\notin/g, '∉')
      .replace(/\\subset/g, '⊂')
      .replace(/\\supset/g, '⊃')
      .replace(/\\subseteq/g, '⊆')
      .replace(/\\supseteq/g, '⊇')
      .replace(/\\cup/g, '∪')
      .replace(/\\cap/g, '∩')
      .replace(/\\mid/g, '∣')
      .replace(/\\cdot/g, '·')
      .replace(/\\bullet/g, '•')
      .replace(/\\setminus/g, '∖')
      .replace(/\\emptyset/g, '∅')
      .replace(/\\angle/g, '∠')
      .replace(/\\degree/g, '°')
      .replace(/\\perp/g, '⊥')
      .replace(/\\parallel/g, '∥')
      .replace(/\\log/g, 'log')
      .replace(/\\ldots/g, '...')
      .replace(/\\cdots/g, '⋯')
      .replace(/\\vdots/g, '⋮')
      .replace(/\\ddots/g, '⋱');
  };

  // Recursive LaTeX parser to convert math to docx components
  const parseLatexToDocxMath = (latex: string): any[] => {
    const runs: any[] = [];
    let i = 0;

    const parseGroup = (): string => {
      if (i >= latex.length) return "";
      if (latex[i] === '{') {
        i++;
        let start = i;
        let depth = 1;
        while (i < latex.length && depth > 0) {
          if (latex[i] === '{') depth++;
          else if (latex[i] === '}') depth--;
          i++;
        }
        return latex.substring(start, i - 1);
      } else if (latex[i] === '\\') {
        let start = i;
        i++;
        while (i < latex.length && /[a-zA-Z]/.test(latex[i])) i++;
        return latex.substring(start, i);
      } else {
        return latex[i++];
      }
    };

    while (i < latex.length) {
      const char = latex[i];

      if (latex.startsWith('\\frac', i)) {
        i += 5;
        const num = parseGroup();
        const den = parseGroup();
        runs.push(new MathFraction({
          numerator: parseLatexToDocxMath(num),
          denominator: parseLatexToDocxMath(den),
        }));
      } else if (latex.startsWith('\\sqrt', i)) {
        i += 5;
        let degree: string | null = null;
        if (latex[i] === '[') {
          i++;
          let start = i;
          while (i < latex.length && latex[i] !== ']') i++;
          degree = latex.substring(start, i);
          i++;
        }
        const content = parseGroup();
        runs.push(new MathRadical({
          children: parseLatexToDocxMath(content),
          degree: degree ? parseLatexToDocxMath(degree) : undefined,
        }));
      } else if (latex.startsWith('\\indolog', i)) {
        i += 8;
        const base = parseGroup();
        const number = parseGroup();
        // Indonesian notation: ^base log number
        runs.push(new MathSuperScript({
          children: [new MathRun(" ")], // Empty base
          superScript: parseLatexToDocxMath(base),
        }));
        runs.push(new MathRun("log "));
        runs.push(...parseLatexToDocxMath(number));
      } else if (char === '^') {
        i++;
        const sup = parseGroup();
        const last = runs.pop();
        runs.push(new MathSuperScript({
          children: last ? [last] : [new MathRun(" ")],
          superScript: parseLatexToDocxMath(sup),
        }));
      } else if (char === '_') {
        i++;
        const sub = parseGroup();
        const last = runs.pop();
        runs.push(new MathSubScript({
          children: last ? [last] : [new MathRun(" ")],
          subScript: parseLatexToDocxMath(sub),
        }));
      } else if (char === '\\') {
        let start = i;
        i++;
        // Handle escaped characters like \{ and \}
        if (i < latex.length && (latex[i] === '{' || latex[i] === '}')) {
          runs.push(new MathRun(latex[i]));
          i++;
          continue;
        }
        while (i < latex.length && /[a-zA-Z]/.test(latex[i])) i++;
        const cmd = latex.substring(start, i);
        if (cmd === '\\text') {
            const text = parseGroup();
            runs.push(new MathRun(text));
        } else if (cmd === '\\cdot') {
            runs.push(new MathRun("·"));
        } else {
            runs.push(new MathRun(mapMathSymbols(cmd)));
        }
      } else if (char === '{' || char === '}') {
        runs.push(new MathRun(char));
        i++; 
      } else if (char === ' ') {
        runs.push(new MathRun(" "));
        i++;
      } else {
        runs.push(new MathRun(char));
        i++;
      }
    }
    return runs;
  };

  const parseFullText = (text: string) => {
    if (!text) return [];
    
    // Split into Math ($...$) and Plain text
    const blocks = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g);
    const finalRuns: any[] = [];

    blocks.forEach(block => {
      if (block.startsWith('$')) {
        const cleanMath = block.replace(/^\$\$?|\$\$?$/g, '').trim();
        const mathRuns = parseLatexToDocxMath(cleanMath);
        finalRuns.push(new DocxMath({ children: mathRuns }));
      } else if (block) {
        finalRuns.push(new TextRun(block));
      }
    });

    return finalRuns;
  };

  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64.split(',')[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };
  
  const formatQuestionsToText = useCallback(() => {
    let text = `${language === 'id' ? 'Materi' : 'Topic'}: ${subject}\n\n`;
    questions.forEach((q, index) => {
      text += `${index + 1}. ${q.pertanyaan}\n`;
      if (q.tipe === QuestionType.MultipleChoice && q.pilihan) {
        q.pilihan.forEach((option, i) => {
          text += `   ${String.fromCharCode(97 + i)}. ${option}\n`;
        });
      }
      text += '\n';
    });
    return text;
  }, [questions, subject, language]);

  const handleCopy = useCallback(() => {
    const textToCopy = formatQuestionsToText();
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [formatQuestionsToText]);

  const handleDownloadAnswers = useCallback(() => {
    if (questions.length === 0) return;
    let content = language === 'id' ? `KUNCI JAWABAN\n` : `ANSWER KEY\n`;
    content += `${language === 'id' ? 'Materi' : 'Topic'}: ${subject}\n`;
    content += `====================================\n\n`;
    const answerLines = questions.map((q, index) => {
        let line = `${index + 1}) `;
        if (q.tipe === QuestionType.MultipleChoice) {
            const correctIndex = q.pilihan?.findIndex(p => p === q.jawaban_benar) ?? -1;
            line += correctIndex !== -1 ? `${String.fromCharCode(97 + correctIndex)}. ${q.jawaban_benar}` : (q.jawaban_benar || '-');
        } else {
            line += q.jawaban_esai || '-';
        }
        return line;
    });
    content += answerLines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${language === 'id' ? 'kunci' : 'key'}_${subject.replace(/\s+/g, '_')}.txt`;
    link.click();
  }, [questions, subject, language]);

  const handleDownloadWord = useCallback(async () => {
    if (questions.length === 0) return;

    const children: any[] = [];

    // Title
    children.push(new Paragraph({
        children: [new TextRun({ text: subject.toUpperCase(), bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
    }));

    for (let index = 0; index < questions.length; index++) {
        const q = questions[index];

        // Question Paragraph
        children.push(new Paragraph({
            children: [
                new TextRun({ text: `${index + 1}. `, bold: true }),
                ...parseFullText(q.pertanyaan)
            ],
            spacing: { before: 200, after: 120 },
        }));
        
        // Image Handling
        if (q.image_url) {
            try {
                const imageBuffer = base64ToArrayBuffer(q.image_url);
                children.push(new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: { width: 300, height: 200 },
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 120 },
                }));
            } catch (e) {
                console.error("Failed to embed image in Word:", e);
            }
        }

        // Options
        if (q.tipe === QuestionType.MultipleChoice && q.pilihan) {
            q.pilihan.forEach((option, idx) => {
                const letter = String.fromCharCode(97 + idx); 
                children.push(new Paragraph({
                    children: [
                        new TextRun({ text: `${letter}. `, bold: true }),
                        ...parseFullText(option)
                    ],
                    indent: { left: 720 },
                    spacing: { after: 60 },
                }));
            });
        }

        // Add extra space for Essay
        if (q.tipe === QuestionType.Essay) {
            children.push(new Paragraph({ text: "", spacing: { after: 1000 } }));
        }
    }

    // --- Answer Key Page ---
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
        children: [new TextRun({ text: language === 'id' ? 'KUNCI JAWABAN' : 'ANSWER KEY', bold: true, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
    }));

    questions.forEach((q, index) => {
        let answerContent: any[] = [];
        if (q.tipe === QuestionType.MultipleChoice) {
             const correctIndex = q.pilihan?.findIndex(p => p === q.jawaban_benar) ?? -1;
             const letter = correctIndex !== -1 ? String.fromCharCode(97 + correctIndex) + '. ' : '';
             answerContent = [new TextRun(letter), ...parseFullText(q.jawaban_benar || '')];
        } else {
            answerContent = parseFullText(q.jawaban_esai || "-");
        }

        children.push(new Paragraph({
            children: [
                new TextRun({ text: `${index + 1}. `, bold: true }),
                ...answerContent
            ],
            spacing: { after: 120 },
        }));
    });

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "Times New Roman",
                        size: 24, // Word uses half-points (24 = 12pt)
                    },
                },
            },
        },
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${subject.replace(/\s+/g, '_')}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [questions, subject, language]);

  const handlePrint = () => {
    const contentNode = contentRef.current;
    if (!contentNode) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>${language === 'id' ? 'Cetak Soal' : 'Print Questions'}</title>`);
      const printStyles = `
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; }
          h1 { font-size: 16pt; margin-bottom: 0.5rem; }
          h2 { font-size: 14pt; margin-bottom: 1.25rem; }
          p { margin: 0; padding: 0; line-height: 1.2; }
          .question-item { margin-bottom: 1rem; page-break-inside: avoid; }
          .choices { list-style-type: lower-alpha; padding-left: 2em; margin: 0; }
          .choices li { padding-left: 0.5em; line-height: 1.2; }
          img { max-width: 100%; height: auto; max-height: 300px; display: block; margin: 10px 0; }
          mjx-container { font-size: 1.03em !important; vertical-align: -0.05em; }
          .no-print { display: none !important; }
        </style>
      `;
      printWindow.document.write(printStyles);
      printWindow.document.write('</head><body>');
      printWindow.document.write(`<h1>${language === 'id' ? 'Materi' : 'Topic'}: ${subject}</h1><h2>${language === 'id' ? 'Daftar Soal' : 'Question List'}</h2>`);
      printWindow.document.write(contentRef.current.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => { printWindow.print(); printWindow.close(); };
    }
  };

  const generateGoogleAppsScript = useCallback(() => {
    const rawSubject = subject.trim() || (language === 'id' ? 'Kuis Tanpa Judul' : 'Untitled Quiz');
    const finalSubject = rawSubject.replace(/\n|\r/g, ' ').substring(0, 200);
    const sanitizedSubject = finalSubject.replace(/'/g, "\\'");
    const cleanQuestions = questions.map(({image_url, image_prompt, ...rest}) => ({
        ...rest,
        pertanyaan: rest.pertanyaan || (language === 'id' ? '(Soal tidak terbaca)' : '(Question unreadable)'),
        pilihan: rest.pilihan || []
    }));
    const questionsJSON = JSON.stringify(cleanQuestions, null, 2);
    const langStrings = language === 'id' ? {
        description: `Kuis tentang ${sanitizedSubject}`,
        logCreated: 'Formulir berhasil dibuat!',
        logUrl: 'URL: ',
        errorLog: 'Error soal #',
    } : {
        description: `Quiz about ${sanitizedSubject}`,
        logCreated: 'Form created successfully!',
        logUrl: 'URL: ',
        errorLog: 'Error question #',
    };

    return `function createQuizFromQuestions() {
  var form = FormApp.create('${sanitizedSubject}');
  form.setIsQuiz(true);
  
  // Settings
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  
  ${includeName ? "form.addTextItem().setTitle('Nama Lengkap').setRequired(true);" : ""}
  ${includeClass ? "form.addTextItem().setTitle('Kelas').setRequired(true);" : ""}
  ${includeAbsentNo ? "form.addTextItem().setTitle('Nomor Absen').setRequired(true);" : ""}
  
  var questions = ${questionsJSON};
  Logger.log('Processing ' + questions.length + ' questions');
  
  questions.forEach(function(q, index) {
    try {
      // Determine if it is Multiple Choice or Essay
      // We check for presence of choices as a more robust fallback
      var tipeLower = (q.tipe || '').toLowerCase();
      var isMC = (tipeLower.indexOf('pilihan') !== -1 || tipeLower.indexOf('choice') !== -1) || 
                 (q.pilihan && q.pilihan.length > 0);
      
      var qTitle = (index + 1) + ". " + (q.pertanyaan || '');

      if (isMC) {
        var item = form.addMultipleChoiceItem()
          .setTitle(qTitle)
          .setPoints(${mcPoints});
          
        if (q.pilihan && Array.isArray(q.pilihan)) {
          var choices = [];
          for (var i = 0; i < q.pilihan.length; i++) {
            var opt = q.pilihan[i];
            var letter = String.fromCharCode(97 + i);
            var cleanOpt = opt ? opt.replace(/^[A-Ea-e]\\.\\s*/, '') : '';
            var valueWithLetter = letter + ". " + cleanOpt;
            
            var isCorrect = false;
            if (q.jawaban_benar) {
              var cleanCorrect = q.jawaban_benar.replace(/^[A-Ea-e]\\.\\s*/, '');
              isCorrect = (opt === q.jawaban_benar || cleanOpt === cleanCorrect);
            }
            
            choices.push(item.createChoice(valueWithLetter, isCorrect));
          }
          if (choices.length > 0) {
            item.setChoices(choices);
          }
        }
        Logger.log('Added MC question #' + (index + 1));
      } else {
        form.addParagraphTextItem()
          .setTitle(qTitle)
          .setPoints(${essayPoints});
        Logger.log('Added Essay question #' + (index + 1));
      }
    } catch (e) {
      Logger.log('Error adding question #' + (index + 1) + ': ' + e.toString());
    }
  });
  
  Logger.log('${langStrings.logCreated}');
  Logger.log('${langStrings.logUrl}' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());
}`;
}, [questions, subject, language, includeName, includeClass, includeAbsentNo, mcPoints, essayPoints]);

  const handleCopyGFormScript = useCallback(() => {
    if (gformScriptRef.current) {
        navigator.clipboard.writeText(gformScriptRef.current.value).then(() => {
            setIsGFormScriptCopied(true);
            setTimeout(() => setIsGFormScriptCopied(false), 2000);
        });
    }
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-modal="true" role="dialog"
      >
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
        <div
          ref={panelRef}
          className={`fixed top-0 right-0 bottom-0 flex flex-col w-full max-w-xl bg-slate-800/80 backdrop-blur-xl border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">{t('document_panel.title', {count: questions.length})}</h2>
            <div className="flex items-center gap-1 sm:gap-2">
              <Tooltip content={t('document_panel.download_answers_tooltip')}>
                  <button onClick={handleDownloadAnswers} disabled={questions.length === 0} className="p-2 text-slate-400 hover:text-green-400 rounded-full disabled:opacity-50"><KeyIcon className="w-5 h-5" /></button>
              </Tooltip>
              <Tooltip content={t('document_panel.google_form_tooltip')}>
                  <button onClick={() => setShowGFormModal(true)} disabled={questions.length === 0} className="p-2 text-slate-400 hover:text-purple-400 rounded-full disabled:opacity-50"><GoogleFormIcon className="w-5 h-5" /></button>
              </Tooltip>
              <Tooltip content={t('document_panel.download_word_tooltip')}>
                  <button onClick={handleDownloadWord} disabled={questions.length === 0} className="p-2 text-slate-400 hover:text-blue-400 rounded-full"><WordIcon className="w-5 h-5" /></button>
              </Tooltip>
              <Tooltip content={t('document_panel.download_pdf_tooltip')}>
                  <button onClick={handlePrint} disabled={questions.length === 0} className="p-2 text-slate-400 hover:text-purple-400 rounded-full"><PdfIcon className="w-5 h-5" /></button>
              </Tooltip>
              <Tooltip content={t('document_panel.copy_tooltip')}>
                  <button onClick={handleCopy} className="p-2 text-slate-400 hover:text-purple-400 rounded-full">{isCopied ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : <ClipboardIcon className="w-5 h-5" />}</button>
              </Tooltip>
              <Tooltip content={t('document_panel.clear_all_tooltip')}>
                  <button onClick={onClear} disabled={questions.length === 0} className="p-2 text-slate-400 hover:text-red-500 rounded-full disabled:opacity-50"><TrashIcon className="w-5 h-5" /></button>
              </Tooltip>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full"><XCircleIcon className="w-6 h-6" /></button>
            </div>
          </header>
          <div className="flex-grow p-6 overflow-y-auto">
            {questions.length > 0 ? (
              <div ref={contentRef} className="space-y-6">
                {questions.map((q, index) => (
                  <DocumentQuestionItem key={q.id} question={q} index={index} onRemove={onRemove} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                  <DocumentIcon className="w-16 h-16 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-400">{t('document_panel.empty_title')}</h3>
                  <p>{t('document_panel.empty_description')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showGFormModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowGFormModal(false)}>
            <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-w-2xl w-full p-6 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{showGFormConfig ? t('document_panel.gform_config_title') : t('document_panel.gform_help_title')}</h3>
                    <button onClick={() => setShowGFormModal(false)} className="p-1 text-slate-400 hover:text-white"><XCircleIcon className="w-6 h-6" /></button>
                </div>
                {showGFormConfig ? (
                    <div className="space-y-6 overflow-y-auto">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                            <h4 className="font-bold text-slate-200 mb-3">{t('document_panel.gform_identity_label')}</h4>
                            <div className="space-y-2">
                                {[{s:includeName,f:setIncludeName,l:t('document_panel.gform_include_name')},{s:includeClass,f:setIncludeClass,l:t('document_panel.gform_include_class')},{s:includeAbsentNo,f:setIncludeAbsentNo,l:t('document_panel.gform_include_absent')}].map((item,i)=>(
                                    <label key={i} className="flex items-center cursor-pointer">
                                        <input type="checkbox" checked={item.s} onChange={e=>item.f(e.target.checked)} className="h-4 w-4 rounded bg-slate-700 text-purple-500" />
                                        <span className="ml-3 text-slate-300">{item.l}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                            <h4 className="font-bold text-slate-200 mb-3">{t('document_panel.gform_scoring_label')}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm text-slate-400 mb-1">{t('document_panel.gform_mc_points')}</label>
                                <input type="number" value={mcPoints} onChange={e=>setMcPoints(parseInt(e.target.value)||0)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white" /></div>
                                <div><label className="block text-sm text-slate-400 mb-1">{t('document_panel.gform_essay_points')}</label>
                                <input type="number" value={essayPoints} onChange={e=>setEssayPoints(parseInt(e.target.value)||0)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white" /></div>
                            </div>
                        </div>

                        {/* Direct Export Section */}
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-purple-500/30">
                            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-purple-400" />
                                {t('document_panel.gform_direct_btn')}
                            </h4>
                            
                            {!isAuthenticated ? (
                                <button 
                                    onClick={handleGoogleLogin}
                                    className="w-full bg-white text-slate-900 font-bold py-3 rounded-md flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" />
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    {t('document_panel.gform_login_btn')}
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    {exportResult ? (
                                        <div className="space-y-3">
                                            <div className="p-3 bg-green-500/20 border border-green-500 rounded-md text-green-400 text-sm">
                                                {t('document_panel.gform_success')}
                                            </div>
                                            <div className="flex gap-2">
                                                <a 
                                                    href={exportResult.formUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-purple-600 text-white font-bold py-2 rounded-md text-center text-sm"
                                                >
                                                    {t('document_panel.gform_open_btn')}
                                                </a>
                                                <a 
                                                    href={exportResult.editUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-slate-700 text-white font-bold py-2 rounded-md text-center text-sm"
                                                >
                                                    {t('document_panel.gform_open_edit_btn')}
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {exportError && (
                                                <div className="p-2 bg-red-500/20 border border-red-500 rounded-md text-red-400 text-xs">
                                                    {exportError}
                                                </div>
                                            )}
                                            <button 
                                                onClick={handleDirectExport}
                                                disabled={isExporting}
                                                className="w-full bg-purple-600 text-white font-bold py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isExporting ? <Spinner /> : <GoogleFormIcon className="w-5 h-5" />}
                                                {isExporting ? t('document_panel.gform_exporting') : t('document_panel.gform_direct_btn')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            <div className="flex-1 h-px bg-slate-700"></div>
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Atau</span>
                            <div className="flex-1 h-px bg-slate-700"></div>
                        </div>

                        <button onClick={()=>setShowGFormConfig(false)} className="w-full text-slate-400 font-bold py-2 rounded-md hover:text-white transition-colors">{t('document_panel.gform_generate_btn')} (Copy-Paste)</button>
                    </div>
                ) : (
                    <div className="space-y-4 overflow-y-auto">
                        <textarea readOnly ref={gformScriptRef} value={generateGoogleAppsScript()} className="w-full h-40 bg-slate-900 border border-slate-600 rounded-md p-2 font-mono text-xs text-slate-300" />
                        <button onClick={handleCopyGFormScript} className={`w-full py-2 rounded-md ${isGFormScriptCopied?'bg-green-600':'bg-purple-600'} text-white`}>
                            {isGFormScriptCopied ? t('document_panel.gform_copied_button') : t('document_panel.gform_copy_button')}
                        </button>
                        <div className="flex justify-between mt-4">
                            <button onClick={()=>setShowGFormConfig(true)} className="text-slate-400 hover:text-white">{t('back_button')}</button>
                            <button onClick={()=>setShowGFormModal(false)} className="bg-purple-600 text-white px-4 py-2 rounded-md">{t('document_panel.word_help_button')}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </>
  );
};

export default DocumentPanel;
