import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LessonPlan, SpecializedLKPD } from './types';
import { generateLessonPlan, generateTeacherNotes, generateSpecializedLKPD, generateQuestionImage } from './services/geminiService';
import { useTranslation } from './LanguageContext';
import ChevronLeftIcon from './components/icons/ChevronLeftIcon';
import Spinner from './components/Spinner';
import BookIcon from './components/icons/BookIcon';
import DocumentIcon from './components/icons/DocumentIcon';
import WordIcon from './components/icons/WordIcon';
import PrinterIcon from './components/icons/PrinterIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, BorderStyle, Math as DocxMath, ImageRun, Table, TableRow, TableCell, WidthType, MathRun, MathFraction, MathSuperScript, MathSubScript, MathRadical } from 'docx';

interface LessonPlanGeneratorProps {
    onNavigateBack: () => void;
}

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
        runs.push(new MathSuperScript({
          children: [new MathRun(" ")],
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

const parseTextWithMath = (text: string) => {
    if (!text) return [];
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);
    const finalRuns: any[] = [];

    parts.forEach(part => {
        if (part.startsWith('$')) {
            const cleanMath = part.replace(/^\$\$?|\$\$?$/g, '').trim();
            const mathRuns = parseLatexToDocxMath(cleanMath);
            finalRuns.push(new DocxMath({ children: mathRuns }));
        } else if (part) {
            finalRuns.push(new TextRun(part));
        }
    });

    return finalRuns;
};

const LessonPlanGenerator: React.FC<LessonPlanGeneratorProps> = ({ onNavigateBack }) => {
    const { t, language } = useTranslation();
    const [topic, setTopic] = useState('');
    const [subject, setSubject] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Kelas 10 SMA');
    const [creatorName, setCreatorName] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [writingLocation, setWritingLocation] = useState('');
    const [dateOfWriting, setDateOfWriting] = useState(new Date().toISOString().split('T')[0]);
    const [jpCount, setJpCount] = useState('2 JP');
    const [meetingCount, setMeetingCount] = useState('1');
    const [learningModel, setLearningModel] = useState('Problem Based Learning (PBL)');
    const [subTopic, setSubTopic] = useState('');
    const [selectedFocus, setSelectedFocus] = useState<string[]>(['HOTS']);
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
    const [isGeneratingLKPD, setIsGeneratingLKPD] = useState(false);
    const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const notesRef = useRef<HTMLDivElement>(null);
    const lkpdRef = useRef<HTMLDivElement>(null);

    // Refresh MathJax when lessonPlan or teacherNotes changes
    useEffect(() => {
        if (typeof window.MathJax !== 'undefined') {
            window.MathJax.typesetPromise?.();
        }
    }, [lessonPlan]);

    const getJPMultiplier = () => {
        if (gradeLevel.includes('SD')) return 35;
        if (gradeLevel.includes('SMP')) return 40;
        return 45; // SMA and others
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) {
            setError(t('lesson_plan.error_empty_topic'));
            return;
        }

        const multiplier = getJPMultiplier();
        const numJP = parseInt(jpCount) || 1;
        const formattedJP = `${numJP} JP x ${multiplier} Menit = ${numJP * multiplier} Menit`;
        
        const formattedDate = writingLocation 
            ? `${writingLocation}, ${new Date(dateOfWriting).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : new Date(dateOfWriting).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        setIsLoading(true);
        setError(null);
        try {
            const plan = await generateLessonPlan(topic, subject, gradeLevel, {
                creatorName,
                schoolName,
                dateOfWriting: formattedDate,
                jpCount: formattedJP,
                meetingCount,
                learningModel,
                subTopic,
                focus: selectedFocus
            });
            setLessonPlan(plan);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateNotes = async () => {
        if (!lessonPlan) return;
        setIsGeneratingNotes(true);
        try {
            const notes = await generateTeacherNotes(lessonPlan);
            setLessonPlan({ ...lessonPlan, teacherNotes: notes });
        } catch (err) {
            console.error(err);
            alert('Gagal membuat catatan penting guru. Silakan coba lagi.');
        } finally {
            setIsGeneratingNotes(false);
        }
    };

    const handleGenerateLKPD = async () => {
        if (!lessonPlan) return;
        setIsGeneratingLKPD(true);
        try {
            const lkpd = await generateSpecializedLKPD(lessonPlan);
            setLessonPlan({ ...lessonPlan, specializedLKPD: lkpd });
        } catch (err) {
            console.error(err);
            alert('Gagal membuat LKPD spesial. Silakan coba lagi.');
        } finally {
            setIsGeneratingLKPD(false);
        }
    };

    const handleGenerateLKPDImage = async (tahapIndex: number) => {
        if (!lessonPlan || !lessonPlan.specializedLKPD) return;
        const lkpd = lessonPlan.specializedLKPD;
        const prompt = lkpd.langkahKegiatan[tahapIndex].imagePrompt;
        if (!prompt) return;

        setGeneratingImageId(`lkpd-image-${tahapIndex}`);
        try {
            const imageUrl = await generateQuestionImage(prompt);
            const updatedLangkah = [...lkpd.langkahKegiatan];
            updatedLangkah[tahapIndex] = { ...updatedLangkah[tahapIndex], imageUrl };
            setLessonPlan({
                ...lessonPlan,
                specializedLKPD: { ...lkpd, langkahKegiatan: updatedLangkah }
            });
        } catch (err) {
            console.error(err);
            alert('Gagal membuat ilustrasi.');
        } finally {
            setGeneratingImageId(null);
        }
    };

    const fetchImageAsBuffer = async (url: string): Promise<Uint8Array | null> => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        } catch (error) {
            console.error("Error fetching image for Word:", error);
            return null;
        }
    };

    const handlePrintLKPD = () => {
        const content = lkpdRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Silakan izinkan popup untuk mencetak/menyimpan PDF.');
            return;
        }

        // Clone and clean
        const contentClone = content.cloneNode(true) as HTMLElement;
        const actionButtons = contentClone.querySelectorAll('button');
        actionButtons.forEach(btn => btn.remove());

        printWindow.document.write(`
            <html>
                <head>
                    <title>LKPD Spesial - ${topic}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Andika:wght@400;700&display=swap');
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        
                        @page {
                            margin: 1.5cm;
                            size: A4;
                        }

                        body { 
                            font-family: 'Andika', 'Inter', sans-serif; 
                            line-height: 1.5; 
                            color: #1e293b; 
                            padding: 0;
                            margin: 0;
                            background: white;
                        }

                        .lkpd-wrapper {
                            padding: 0;
                        }

                        .lkpd-header {
                            text-align: center;
                            border: 3px solid #4338ca;
                            border-radius: 12px;
                            padding: 20px;
                            margin-bottom: 30px;
                            background-color: #f5f3ff !important;
                            -webkit-print-color-adjust: exact;
                        }

                        .lkpd-title {
                            color: #4338ca !important;
                            font-size: 24pt;
                            font-weight: 800;
                            margin: 0 0 5px 0;
                            text-transform: uppercase;
                        }

                        .header-subtitle {
                            color: #6366f1 !important;
                            font-weight: bold;
                            letter-spacing: 2px;
                            font-size: 10pt;
                            margin: 0;
                        }

                        .identity-grid {
                            display: table;
                            width: 100%;
                            margin-bottom: 25px;
                            border-collapse: collapse;
                            font-size: 10pt;
                            background: #f8fafc !important;
                            -webkit-print-color-adjust: exact;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                        }

                        .identity-row {
                            display: table-row;
                        }

                        .identity-cell {
                            display: table-cell;
                            padding: 8px 12px;
                            border: 1px solid #e2e8f0;
                        }

                        .label { font-weight: bold; color: #475569; }

                        .section-title {
                            color: #4338ca !important;
                            font-weight: bold;
                            font-size: 14pt;
                            border-bottom: 2px dashed #c7d2fe;
                            margin-bottom: 12px;
                            margin-top: 25px;
                            padding-bottom: 5px;
                            display: block;
                        }

                        .content-box {
                            background: #f0f7ff !important;
                            -webkit-print-color-adjust: exact;
                            border-radius: 10px;
                            padding: 15px;
                            margin-bottom: 20px;
                            border-left: 5px solid #3b82f6;
                        }

                        .step-card {
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                            padding: 15px;
                            margin-bottom: 20px;
                            background: white;
                            page-break-inside: avoid;
                        }

                        .step-header {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            margin-bottom: 10px;
                        }

                        .step-number {
                            background: #4338ca !important;
                            color: white !important;
                            width: 28px;
                            height: 28px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            -webkit-print-color-adjust: exact;
                        }

                        .step-title {
                            font-weight: bold;
                            font-size: 12pt;
                            margin: 0;
                        }

                        .step-image {
                            max-width: 100%;
                            width: 12cm; /* Fixed width for consistent printing */
                            height: auto;
                            margin: 15px auto;
                            display: block;
                            border-radius: 10px;
                            border: 1px solid #e2e8f0;
                        }

                        .tantangan-item {
                            background: #fdf2ff !important;
                            -webkit-print-color-adjust: exact;
                            border: 1px solid #f5d0fe;
                            border-radius: 10px;
                            padding: 15px;
                            margin-bottom: 15px;
                            page-break-inside: avoid;
                        }

                        .answer-line {
                            border-bottom: 1px dashed #cbd5e1;
                            height: 25px;
                            margin-top: 10px;
                        }

                        .kesimpulan-box {
                            background: #e0e7ff !important;
                            -webkit-print-color-adjust: exact;
                            border-radius: 15px;
                            padding: 25px;
                            text-align: center;
                            font-style: italic;
                            font-size: 12pt;
                            color: #3730a3 !important;
                            margin-top: 30px;
                            border: 2px solid #c7d2fe;
                        }

                        .footer {
                            text-align: center;
                            font-size: 8pt;
                            color: #94a3b8;
                            margin-top: 30px;
                        }

                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                            .no-print { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="lkpd-wrapper">
                        ${contentClone.innerHTML}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 1200);
    };

    const handleDownloadWordLKPD = async () => {
        if (!lessonPlan || !lessonPlan.specializedLKPD) return;
        const lkpd = lessonPlan.specializedLKPD;

        const sections: any[] = [];
        
        // Header
        sections.push(new Paragraph({
            children: [new TextRun({ text: lkpd.judul.toUpperCase(), bold: true, size: 36, color: "4338CA", font: "Andika" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 }
        }));

        sections.push(new Paragraph({
            children: [new TextRun({ text: "LEMBAR KERJA PESERTA DIDIK (LKPD)", bold: true, size: 24, color: "6366F1", font: "Andika" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }));

        // Identity Table
        const idt = lkpd.identitas;
        sections.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: "Mata Pelajaran:", bold: true }), new TextRun(` ${idt.mataPelajaran}`)] })],
                        }),
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: "Topik:", bold: true }), new TextRun(` ${idt.topik}`)] })],
                        }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: "Kelas/Semester:", bold: true }), new TextRun(` ${idt.kelasSemester}`)] })],
                        }),
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: "Alokasi Waktu:", bold: true }), new TextRun(` ${idt.alokasiWaktu}`)] })],
                        }),
                    ],
                }),
            ],
        }));

        const addSectionHeader = (title: string, emoji = "") => {
            sections.push(new Paragraph({
                children: [
                    new TextRun({ text: `${emoji} ${title}`, bold: true, color: "4338CA", size: 26, font: "Andika" })
                ],
                spacing: { before: 400, after: 200 },
                border: { bottom: { color: "C7D2FE", space: 4, style: BorderStyle.DASHED, size: 12 } }
            }));
        };

        addSectionHeader("TUJUAN PEMBELAJARAN", "🎯");
        lkpd.tujuanPembelajaran.forEach(tp => {
            sections.push(new Paragraph({
                text: tp,
                bullet: { level: 0 },
                spacing: { after: 120 },
                indent: { left: 720, hanging: 360 }
            }));
        });

        addSectionHeader("MARI BELAJAR!", "🚀");
        sections.push(new Paragraph({
            children: [new TextRun({ text: lkpd.materiSingkat })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 }
        }));
        
        addSectionHeader("LANGKAH KEGIATAN KITA", "📝");

        for (const [i, lk] of lkpd.langkahKegiatan.entries()) {
            sections.push(new Paragraph({
                children: [
                    new TextRun({ text: `${i + 1}. ${lk.tahap}`, bold: true, size: 24, color: "1E293B" })
                ],
                spacing: { before: 200, after: 120 }
            }));

            sections.push(new Paragraph({
                text: lk.instruksi,
                indent: { left: 400 },
                spacing: { after: 200 }
            }));

            if (lk.imageUrl) {
                const imageBuffer = await fetchImageAsBuffer(lk.imageUrl);
                if (imageBuffer) {
                    sections.push(new Paragraph({
                        children: [
                            new ImageRun({
                                data: imageBuffer,
                                transformation: {
                                    width: 450,
                                    height: 300,
                                },
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 200 }
                    }));
                }
            }
        }

        addSectionHeader("TANTANGAN SERU", "🧠");
        lkpd.pertanyaanDiskusi.forEach((p, i) => {
            sections.push(new Paragraph({
                children: [new TextRun({ text: `${i + 1}. ${p}`, bold: true })],
                spacing: { after: 120, before: 120 }
            }));
            // Lines for answer
            for (let j = 0; j < 2; j++) {
                sections.push(new Paragraph({
                    children: [new TextRun({ text: ".".repeat(100), color: "CBD5E1" })],
                    spacing: { after: 120 }
                }));
            }
        });

        sections.push(new Paragraph({
            children: [new TextRun({ text: "✨ KESIMPULAN KITA", bold: true, color: "4338CA", size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 200 }
        }));

        sections.push(new Paragraph({
            children: [new TextRun({ text: `"${lkpd.kesimpulan}"`, italics: true, color: "3730A3", size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        }));

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: "Arial", // More standard for Word stability
                            size: 24,
                        },
                    },
                },
            },
            sections: [{ 
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                children: sections 
            }],
        });

        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `LKPD_Spesial_${topic.replace(/\s+/g, '_')}.docx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Silakan izinkan popup untuk mencetak/menyimpan PDF.');
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Modul Ajar - ${topic}</title>
                    <script>
                        window.MathJax = {
                            tex: {
                                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                                macros: { indolog: ['^{#1}\\\\log{#2}', 2] }
                            }
                        };
                    </script>
                    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap');
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        
                        @page {
                            margin: 2cm;
                            size: A4;
                        }

                        body { 
                            font-family: 'Crimson Pro', 'Times New Roman', serif; 
                            line-height: 1.6; 
                            color: #1a202c; 
                            padding: 0;
                            margin: 0 auto;
                            background: white;
                        }

                        .print-container { padding: 0; }

                        .doc-header {
                            text-align: center;
                            border-bottom: 5px double #1a202c;
                            padding-bottom: 15px;
                            margin-bottom: 30px;
                        }

                        .doc-title {
                            font-size: 20pt;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin: 0;
                        }

                        .section-header {
                            background-color: #f1f5f9 !important;
                            -webkit-print-color-adjust: exact;
                            padding: 8px;
                            font-weight: bold;
                            text-align: center;
                            border: 1px solid #1a202c;
                            margin: 25px 0 15px;
                            text-transform: uppercase;
                        }

                        .identity-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }

                        .identity-table td {
                            padding: 5px 0;
                            vertical-align: top;
                        }

                        .label-cell {
                            width: 180px;
                            font-weight: bold;
                        }

                        .value-cell {
                            padding-left: 10px;
                        }

                        .sub-section-title {
                            font-weight: bold;
                            border-left: 4px solid #1a202c;
                            padding-left: 10px;
                            margin: 20px 0 10px;
                            text-transform: uppercase;
                        }

                        .activity-box {
                            border: 1px solid #e2e8f0;
                            background: #f8fafc !important;
                            -webkit-print-color-adjust: exact;
                            padding: 15px;
                            margin-bottom: 20px;
                            border-radius: 5px;
                        }

                        .activity-header {
                            background: #e2e8f0 !important;
                            -webkit-print-color-adjust: exact;
                            padding: 5px 10px;
                            font-weight: bold;
                            margin-bottom: 10px;
                        }

                        .assessment-grid {
                            display: flex;
                            gap: 15px;
                            margin: 15px 0;
                        }

                        .assessment-item {
                            flex: 1;
                            border: 1px solid #e2e8f0;
                            padding: 10px;
                            font-size: 10pt;
                        }

                        .page-break { page-break-after: always; }
                        
                        ul, ol { padding-left: 20px; margin-top: 5px; }
                        li { text-align: justify; margin-bottom: 5px; }

                        p { text-align: justify; margin: 5px 0; }

                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                            .no-print { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        ${content.innerHTML}
                    </div>
                    <script>
                        window.onload = () => {
                            if (window.MathJax && window.MathJax.typesetPromise) {
                                window.MathJax.typesetPromise().then(() => {
                                    setTimeout(() => { window.print(); window.close(); }, 1000);
                                });
                            } else {
                                setTimeout(() => { window.print(); window.close(); }, 1500);
                            }
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrintNotes = () => {
        const content = notesRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Silakan izinkan popup untuk mencetak/menyimpan PDF.');
            return;
        }

        // Clone content and remove SVGs for cleaner print
        const contentClone = content.cloneNode(true) as HTMLElement;
        const decorativeIcons = contentClone.querySelectorAll('svg');
        decorativeIcons.forEach(icon => icon.remove());

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cheat Sheet - ${topic}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        body { 
                            font-family: 'Inter', sans-serif; 
                            line-height: 1.6; 
                            color: #1a202c; 
                            padding: 40px;
                            max-width: 900px;
                            margin: 0 auto;
                            background-color: #fff;
                        }
                        .cheat-sheet-title {
                            color: #92400e;
                            font-size: 26px;
                            font-weight: 800;
                            margin-bottom: 30px;
                            text-align: center;
                            border-bottom: 2px solid #fbbf24;
                            padding-bottom: 15px;
                            text-transform: uppercase;
                        }
                        .note-card {
                            background: #fff !important;
                            border: 1px solid #e2e8f0 !important;
                            border-radius: 10px;
                            padding: 24px;
                            margin-bottom: 24px;
                            page-break-inside: avoid;
                            color: #1a202c !important;
                        }
                        .note-header {
                            font-size: 18px;
                            font-weight: 700;
                            color: #1e293b !important;
                            border-bottom: 1px solid #f1f5f9;
                            margin-bottom: 12px;
                            padding-bottom: 6px;
                        }
                        ul { padding-left: 20px; list-style-type: disc; }
                        li { color: #334155 !important; margin-bottom: 8px; }
                        span { color: inherit !important; }
                        /* Ensure MathJax visibility */
                        .mjx-chtml { color: #000 !important; }
                        @media print {
                            body { padding: 20px; }
                            .note-card { border-color: #cbd5e1; }
                        }
                    </style>
                    <script>
                        window.MathJax = {
                            tex: {
                                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                                macros: { indolog: ['^{#1}\\\\log{#2}', 2] }
                            }
                        };
                    </script>
                    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
                </head>
                <body>
                    <div class="cheat-sheet-title">CATATAN PENTING GURU: ${topic.toUpperCase()}</div>
                    ${contentClone.innerHTML}
                    <script>
                        window.onload = () => {
                            if (window.MathJax && window.MathJax.typesetPromise) {
                                window.MathJax.typesetPromise().then(() => {
                                    setTimeout(() => { window.print(); window.close(); }, 800);
                                });
                            } else {
                                setTimeout(() => { window.print(); window.close(); }, 1200);
                            }
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadWordNotes = async () => {
        if (!lessonPlan || !lessonPlan.teacherNotes) return;

        const sections: any[] = [];
        
        sections.push(new Paragraph({
            children: [new TextRun({ text: "CATATAN PENTING GURU", bold: true, size: 32, color: "D97706" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }));

        sections.push(new Paragraph({
            children: [new TextRun({ text: topic.toUpperCase(), bold: true, size: 28, color: "92400E" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            border: { bottom: { color: "FBBF24", space: 1, style: BorderStyle.SINGLE, size: 12 } }
        }));

        lessonPlan.teacherNotes.forEach(note => {
            sections.push(new Paragraph({
                children: [new TextRun({ text: `Pertemuan ${note.pertemuan}: ${note.materi}`, bold: true, color: "92400E", size: 24 })],
                shading: { fill: "FFFBEB" },
                spacing: { before: 200, after: 120 },
                border: {
                    top: { color: "FCD34D", style: BorderStyle.SINGLE, size: 6 },
                    bottom: { color: "FCD34D", style: BorderStyle.SINGLE, size: 6 },
                    left: { color: "FCD34D", style: BorderStyle.SINGLE, size: 6 },
                    right: { color: "FCD34D", style: BorderStyle.SINGLE, size: 6 },
                }
            }));

            note.catatan.forEach(item => {
                sections.push(new Paragraph({
                    children: parseTextWithMath(item),
                    bullet: { level: 0 },
                    spacing: { after: 80 },
                    indent: { left: 720, hanging: 360 }
                }));
            });
        });

        const doc = new Document({
            sections: [{ properties: {}, children: sections }],
        });

        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Cheat_Sheet_${topic.replace(/\s+/g, '_')}.docx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const handleDownloadWord = async () => {
        if (!lessonPlan) return;

        const sections: any[] = [];
        const lp = lessonPlan;

        // Title
        sections.push(new Paragraph({
            children: [new TextRun({ text: "MODUL AJAR", bold: true, size: 32, color: "0F172A" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 }
        }));
        sections.push(new Paragraph({
            children: [new TextRun({ text: `${lp.informasiUmum.identitasModul.mataPelajaran.toUpperCase()}: ${topic.toUpperCase()}`, bold: true, size: 24, color: "334155" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            border: { bottom: { color: "0F172A", space: 8, style: BorderStyle.DOUBLE, size: 24 } }
        }));

        // Identity Table
        const idm = lp.informasiUmum.identitasModul;
        sections.push(new Paragraph({
            children: [new TextRun({ text: "INFORMASI UMUM", bold: true, size: 28, color: "1E293B" })],
            shading: { fill: "F1F5F9" },
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 }
        }));

        sections.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                ["Nama Penyusun", idm.namaPenyusun],
                ["Satuan Pendidikan", idm.satuanPendidikan],
                ["Fase / Kelas", idm.faseKelas],
                ["Mata Pelajaran", idm.mataPelajaran],
                ["Alokasi Waktu", idm.alokasiWaktu],
                ["Tanggal", idm.tahunPenyusunan]
            ].map(([label, value]) => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: `: ${value}` })], width: { size: 70, type: WidthType.PERCENTAGE } }),
                ]
            }))
        }));

        const addSectionHeader = (title: string) => {
            sections.push(new Paragraph({
                children: [new TextRun({ text: title, bold: true, size: 26, color: "0F172A" })],
                shading: { fill: "F8FAFC" },
                spacing: { before: 400, after: 200 },
                border: { left: { color: "0F172A", style: BorderStyle.SINGLE, size: 24, space: 6 } }
            }));
        };

        addSectionHeader("I. KOMPETENSI AWAL");
        sections.push(new Paragraph({ children: parseTextWithMath(lp.informasiUmum.kompetensiAwal), alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 } }));

        addSectionHeader("II. PROFIL PELAJAR PANCASILA");
        sections.push(new Paragraph({ children: [new TextRun({ text: lp.informasiUmum.profilPelajarPancasila.join(", "), italics: true })], spacing: { after: 200 } }));

        addSectionHeader("III. SARANA DAN PRASARANA");
        lp.informasiUmum.saranaPrasarana.forEach(item => {
            sections.push(new Paragraph({ children: parseTextWithMath(item), bullet: { level: 0 }, spacing: { after: 120 }, indent: { left: 720, hanging: 360 } }));
        });
        
        sections.push(new Paragraph({
            children: [new TextRun({ text: "Target Peserta Didik: ", bold: true }), new TextRun(lp.informasiUmum.targetPesertaDidik)],
            spacing: { before: 200 }
        }));
        sections.push(new Paragraph({
            children: [new TextRun({ text: "Model Pembelajaran: ", bold: true }), new TextRun(lp.informasiUmum.modelPembelajaran)],
            spacing: { after: 400 }
        }));

        sections.push(new Paragraph({ children: [new PageBreak()] }));

        sections.push(new Paragraph({
            children: [new TextRun({ text: "KOMPONEN INTI", bold: true, size: 28 })],
            shading: { fill: "F1F5F9" },
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 }
        }));

        addSectionHeader("I. TUJUAN PEMBELAJARAN");
        lp.komponenInti.tujuanPembelajaran.forEach(tp => {
            sections.push(new Paragraph({ children: parseTextWithMath(tp), bullet: { level: 0 }, spacing: { after: 120 }, indent: { left: 720, hanging: 360 } }));
        });

        addSectionHeader("II. PEMAHAMAN BERMAKNA");
        lp.komponenInti.pemahamanBermakna.forEach(pb => {
            sections.push(new Paragraph({ children: parseTextWithMath(pb), bullet: { level: 0 }, spacing: { after: 120 }, indent: { left: 720, hanging: 360 } }));
        });

        addSectionHeader("III. PERTANYAAN PEMANTIK");
        lp.komponenInti.pertanyaanPemantik.forEach(pp => {
            sections.push(new Paragraph({ children: [new TextRun({ text: pp, italics: true })], bullet: { level: 0 }, spacing: { after: 120 }, indent: { left: 720, hanging: 360 } }));
        });
        
        addSectionHeader("IV. KEGIATAN PEMBELAJARAN");

        lp.komponenInti.kegiatanPembelajaran.forEach(pt => {
            sections.push(new Paragraph({
                children: [new TextRun({ text: `PERTEMUAN KE-${pt.pertemuan}: ${pt.materi}`, bold: true, color: "1E293B" })],
                shading: { fill: "F8FAFC" },
                spacing: { before: 200, after: 120 }
            }));

            const addActivity = (label: string, items: string[]) => {
                sections.push(new Paragraph({
                    children: [new TextRun({ text: label, bold: true, underline: {} })],
                    spacing: { before: 120, after: 60 }
                }));
                items.forEach(item => {
                    sections.push(new Paragraph({
                        children: parseTextWithMath(item),
                        bullet: { level: 0 },
                        indent: { left: 720, hanging: 360 },
                        spacing: { after: 60 }
                    }));
                });
            };

            addActivity("Pendahuluan", pt.pendahuluan);
            addActivity("Kegiatan Inti", pt.inti);
            addActivity("Penutup", pt.penutup);
        });

        sections.push(new Paragraph({ children: [new PageBreak()] }));

        // Assessments etc
        sections.push(new Paragraph({
            children: [new TextRun({ text: "ASESMEN DAN REFLEKSI", bold: true, size: 28 })],
            shading: { fill: "F1F5F9" },
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 }
        }));

        sections.push(new Paragraph({ children: [new TextRun({ text: "Sikap: ", bold: true }), ...parseTextWithMath(lp.asesmenPenilaian.sikap)], spacing: { before: 200, after: 60 } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "Pengetahuan: ", bold: true }), ...parseTextWithMath(lp.asesmenPenilaian.pengetahuan)], spacing: { after: 60 } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "Keterampilan: ", bold: true }), ...parseTextWithMath(lp.asesmenPenilaian.keterampilan)], spacing: { after: 200 } }));

        addSectionHeader("VI. PENGAYAAN DAN REMEDIAL");
        sections.push(new Paragraph({ children: [new TextRun({ text: "Pengayaan: ", bold: true }), ...parseTextWithMath(lp.pengayaanRemedial.pengayaan)], spacing: { after: 60 } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "Remedial: ", bold: true }), ...parseTextWithMath(lp.pengayaanRemedial.remedial)], spacing: { after: 200 } }));

        addSectionHeader("VII. REFLEKSI GURU DAN PESERTA DIDIK");
        sections.push(new Paragraph({ children: [new TextRun({ text: "Refleksi Guru:", bold: true })] }));
        lp.refleksi.guru.forEach(r => sections.push(new Paragraph({ children: parseTextWithMath(r), bullet: { level: 0 }, indent: { left: 720, hanging: 360 } })));
        sections.push(new Paragraph({ children: [new TextRun({ text: "Refleksi Siswa:", bold: true })], spacing: { before: 120 } }));
        lp.refleksi.siswa.forEach(r => sections.push(new Paragraph({ children: parseTextWithMath(r), bullet: { level: 0 }, indent: { left: 720, hanging: 360 } })));

        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(new Paragraph({
            children: [new TextRun({ text: "LAMPIRAN-LAMPIRAN", bold: true, size: 28 })],
            shading: { fill: "F1F5F9" },
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 }
        }));

        lp.lampiran.lkpd.forEach((lk, i) => {
            sections.push(new Paragraph({ children: [new TextRun({ text: `Lampiran ${i + 1}: ${lk.judul}`, bold: true, size: 24 })], spacing: { before: 200, after: 120 } }));
            sections.push(new Paragraph({ children: [new TextRun({ text: "Petunjuk Kerja:", bold: true, underline: {} })], spacing: { after: 60 } }));
            lk.petunjuk.forEach(p => sections.push(new Paragraph({ children: parseTextWithMath(p), bullet: { level: 0 }, indent: { left: 720, hanging: 360 } })));
            sections.push(new Paragraph({ children: [new TextRun({ text: "Tugas/Aktivitas:", bold: true, underline: {} })], spacing: { before: 120, after: 60 } }));
            lk.tugas.forEach(t => sections.push(new Paragraph({ children: parseTextWithMath(t), bullet: { level: 0 }, indent: { left: 720, hanging: 360 } })));
        });

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: "Times New Roman",
                            size: 24,
                        },
                    },
                },
            },
            sections: [{ 
                properties: {
                    page: {
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                    }
                },
                children: sections 
            }],
        });

        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Modul_Ajar_${topic.replace(/\s+/g, '_')}.docx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <button
                onClick={onNavigateBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group no-print"
            >
                <ChevronLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                {t('back_button')}
            </button>

            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BookIcon className="w-10 h-10 text-cyan-400" />
                        {t('lesson_plan.title')}
                    </h1>
                    <p className="text-slate-400 mt-2">
                        {t('lesson_plan.description')}
                    </p>
                </div>
            </div>

            {!lessonPlan ? (
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-2xl no-print">
                    <form onSubmit={handleGenerate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    {t('lesson_plan.topic_label')}
                                </label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder={t('lesson_plan.topic_placeholder')}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    {t('lesson_plan.subject_label')}
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Contoh: Sejarah Indonesia"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Nama Penyusun & Sekolah */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    {t('lesson_plan.creator_label')}
                                </label>
                                <input
                                    type="text"
                                    value={creatorName}
                                    onChange={(e) => setCreatorName(e.target.value)}
                                    placeholder="Nama Anda"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    {t('lesson_plan.school_label')}
                                </label>
                                <input
                                    type="text"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    placeholder="Nama Sekolah"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    Tempat Penyusunan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={writingLocation}
                                    onChange={(e) => setWritingLocation(e.target.value)}
                                    placeholder="Contoh: Jakarta"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    {t('lesson_plan.date_label')}
                                </label>
                                <input
                                    type="date"
                                    value={dateOfWriting}
                                    onChange={(e) => setDateOfWriting(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    {t('lesson_plan.jp_label')}
                                </label>
                                <select
                                    value={jpCount}
                                    onChange={(e) => setJpCount(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all appearance-none"
                                >
                                    <option value="1 JP">1 JP</option>
                                    <option value="2 JP">2 JP</option>
                                    <option value="3 JP">3 JP</option>
                                    <option value="4 JP">4 JP</option>
                                    <option value="5 JP">5 JP</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    {t('lesson_plan.meetings_label')}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={meetingCount}
                                    onChange={(e) => setMeetingCount(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Alokasi Waktu */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col justify-end pb-3">
                                <div className="text-xs text-slate-400 italic">
                                    Info: 1 JP = {getJPMultiplier()} Menit (Berdasarkan {gradeLevel.includes('SD') ? 'SD' : gradeLevel.includes('SMP') ? 'SMP' : 'SMA/Umum'})
                                </div>
                            </div>
                        </div>

                        {/* Sub Topik (Opsional) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">
                                {t('lesson_plan.sub_topic_label')}
                            </label>
                            <textarea
                                value={subTopic}
                                onChange={(e) => setSubTopic(e.target.value)}
                                placeholder="Jelaskan fokus spesifik atau sub-materi yang ingin ditekankan..."
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all min-h-[100px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                    {t('lesson_plan.grade_level_label')}
                                </label>
                                <select
                                    value={gradeLevel}
                                    onChange={(e) => setGradeLevel(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all appearance-none"
                                >
                                <option value="Kelas 1 SD">Kelas 1 SD</option>
                                <option value="Kelas 2 SD">Kelas 2 SD</option>
                                <option value="Kelas 3 SD">Kelas 3 SD</option>
                                <option value="Kelas 4 SD">Kelas 4 SD</option>
                                <option value="Kelas 5 SD">Kelas 5 SD</option>
                                <option value="Kelas 6 SD">Kelas 6 SD</option>
                                <option value="Kelas 7 SMP">Kelas 7 SMP</option>
                                <option value="Kelas 8 SMP">Kelas 8 SMP</option>
                                <option value="Kelas 9 SMP">Kelas 9 SMP</option>
                                <option value="Kelas 10 SMA">Kelas 10 SMA</option>
                                <option value="Kelas 11 SMA">Kelas 11 SMA</option>
                                <option value="Kelas 12 SMA">Kelas 12 SMA</option>
                            </select>
                        </div>

                        {/* Model Pembelajaran */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">
                                {t('lesson_plan.model_label')}
                            </label>
                            <select
                                value={learningModel}
                                onChange={(e) => setLearningModel(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all appearance-none"
                            >
                                <option value="Problem Based Learning (PBL)">Problem Based Learning (PBL)</option>
                                <option value="Project Based Learning (PjBL)">Project Based Learning (PjBL)</option>
                                <option value="Discovery Learning">Discovery Learning</option>
                                <option value="Inquiry Learning">Inquiry Learning</option>
                                <option value="Contextual Teaching and Learning (CTL)">Contextual Teaching and Learning (CTL)</option>
                                <option value="Cooperative Learning">Cooperative Learning</option>
                                <option value="Experiential Learning">Experiential Learning</option>
                                <option value="Direct Instruction">Direct Instruction (Ceramah Plus)</option>
                                <option value="Teaching at The Right Level (TaRL)">Teaching at The Right Level (TaRL)</option>
                                <option value="Culturally Responsive Teaching (CRT)">Culturally Responsive Teaching (CRT)</option>
                                <option value="Game Based Learning">Game Based Learning</option>
                                <option value="Flipped Classroom">Flipped Classroom</option>
                                <option value="Teams Games Tournament (TGT)">Teams Games Tournament (TGT)</option>
                                <option value="Student Teams Achievement Divisions (STAD)">Student Teams Achievement Divisions (STAD)</option>
                                <option value="Think Pair Share (TPS)">Think Pair Share (TPS)</option>
                                <option value="Jigsaw">Jigsaw</option>
                            </select>
                        </div>
                    </div>

                        {/* Fokus Pembelajaran (Multi-select style) */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-300">
                                {t('lesson_plan.focus_label')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['HOTS', 'Literasi', 'Numerasi', 'Proyek', 'Digital', 'Karakter', 'Inklusi'].map((focus) => (
                                    <button
                                        key={focus}
                                        type="button"
                                        onClick={() => {
                                            if (selectedFocus.includes(focus)) {
                                                setSelectedFocus(selectedFocus.filter(f => f !== focus));
                                            } else {
                                                setSelectedFocus([...selectedFocus, focus]);
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                                            selectedFocus.includes(focus)
                                            ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]'
                                            : 'bg-slate-900/80 text-slate-400 border border-slate-700 hover:border-slate-500'
                                        }`}
                                    >
                                        {focus}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-300 ${
                                isLoading 
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner className="w-6 h-6" />
                                    {t('lesson_plan.loading_message')}
                                </>
                            ) : (
                                <>
                                    <BookIcon className="w-6 h-6" />
                                    {t('lesson_plan.submit_button')}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex justify-end gap-3 no-print">
                        <button
                            onClick={() => setLessonPlan(null)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                        >
                            {t('back_button')}
                        </button>
                        <button
                            onClick={handleDownloadWord}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                        >
                            <WordIcon className="w-4 h-4" />
                            Unduh Word
                        </button>
                        
                        {!lessonPlan.teacherNotes && (
                            <button
                                onClick={handleGenerateNotes}
                                disabled={isGeneratingNotes}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                            >
                                {isGeneratingNotes ? <Spinner className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                                Buat Catatan Penting Guru
                            </button>
                        )}

                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Cetak / Simpan PDF
                        </button>
                    </div>

                    {lessonPlan && lessonPlan.teacherNotes && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-slate-800/50 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 sm:p-8 mb-8 no-print shadow-[0_0_50px_-12px_rgba(245,158,11,0.2)] animate-in fade-in slide-in-from-top-4 duration-500 group">
                             {/* Background Decoration */}
                             <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
                             <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 blur-[100px] -ml-32 -mb-32 rounded-full pointer-events-none" />

                             <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-amber-500 flex items-center gap-3">
                                        <div className="p-2 bg-amber-500/20 rounded-lg">
                                            <SparklesIcon className="w-6 h-6" />
                                        </div>
                                        Catatan Penting Guru
                                        <span className="text-xs font-medium px-2 py-0.5 bg-amber-500/20 rounded-full text-amber-300 uppercase tracking-wider">AI Generated</span>
                                    </h3>
                                    <p className="text-slate-400 mt-1 text-sm">Ringkasan konsep kunci untuk membimbing proses mengajar Anda.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleDownloadWordNotes}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-slate-900/80 hover:bg-slate-900 text-amber-400 border border-amber-500/30 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 text-sm font-bold"
                                    >
                                        <WordIcon className="w-4 h-4" />
                                        Word
                                    </button>
                                    <button
                                        onClick={handlePrintNotes}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 text-sm font-bold shadow-lg shadow-amber-600/20"
                                    >
                                        <PrinterIcon className="w-4 h-4" />
                                        PDF
                                    </button>
                                </div>
                             </div>

                            <div ref={notesRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {lessonPlan.teacherNotes.map((note, idx) => (
                                    <div key={idx} className="note-card relative bg-slate-900/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 hover:border-amber-500/30 transition-colors group/card">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/card:opacity-30 transition-opacity">
                                            <BookIcon className="w-12 h-12 text-amber-500" />
                                        </div>
                                        <h4 className="note-header font-black text-white text-lg mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                                            <span className="w-8 h-8 flex items-center justify-center bg-amber-500/20 rounded-lg text-amber-500 text-sm">
                                                {note.pertemuan}
                                            </span>
                                            {note.materi}
                                        </h4>
                                        <ul className="space-y-3">
                                            {note.catatan.map((item, i) => (
                                                <li key={i} className="text-slate-300 text-sm flex gap-3 leading-relaxed">
                                                    <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Specific LKPD Generation Option */}
                    <div className="mt-8 pt-8 border-t border-slate-700 bg-slate-800/30 rounded-3xl p-6 no-print">
                            {!lessonPlan.specializedLKPD ? (
                                <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-8 text-center">
                                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <SparklesIcon className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{t('lesson_plan.generate_lkpd_title')}</h3>
                                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                                        {t('lesson_plan.generate_lkpd_desc')}
                                    </p>
                                    <button
                                        onClick={handleGenerateLKPD}
                                        disabled={isGeneratingLKPD}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 group"
                                    >
                                        {isGeneratingLKPD ? <Spinner /> : <SparklesIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                                        {isGeneratingLKPD ? t('lesson_plan.generating_lkpd') : t('lesson_plan.start_lkpd_btn')}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                                <SparklesIcon className="w-6 h-6 text-indigo-400" />
                                                {t('lesson_plan.lkpd_generated')}
                                            </h3>
                                            <p className="text-slate-400 text-sm">
                                                {gradeLevel.includes('SD') ? t('lesson_plan.lkpd_generated_desc_sd') : t('lesson_plan.lkpd_generated_desc_secondary')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDownloadWordLKPD}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl transition-all text-sm font-bold"
                                            >
                                                <WordIcon className="w-4 h-4" />
                                                Word
                                            </button>
                                            <button
                                                onClick={handlePrintLKPD}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-600/20"
                                            >
                                                <PrinterIcon className="w-4 h-4" />
                                                PDF
                                            </button>
                                        </div>
                                    </div>

                                    {/* Specialized LKPD Review Area */}
                                    <div ref={lkpdRef} className="bg-white rounded-2xl shadow-xl overflow-hidden text-slate-800 p-8 sm:p-12 mb-10">
                                        <div className="lkpd-header p-6 border-4 border-indigo-200 rounded-3xl bg-indigo-50 mb-10 text-center">
                                            <h2 className="lkpd-title text-3xl font-black text-indigo-700 tracking-tight mb-2 uppercase">{lessonPlan.specializedLKPD.judul}</h2>
                                            <p className="text-indigo-500 font-bold tracking-widest text-sm">LEMBAR KERJA PESERTA DIDIK (LKPD)</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border-2 border-slate-100 italic text-sm" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            <div><span className="font-bold not-italic">Mata Pelajaran:</span> {lessonPlan.specializedLKPD.identitas.mataPelajaran}</div>
                                            <div><span className="font-bold not-italic">Topik:</span> {lessonPlan.specializedLKPD.identitas.topik}</div>
                                            <div><span className="font-bold not-italic">Kelas/Sem:</span> {lessonPlan.specializedLKPD.identitas.kelasSemester}</div>
                                            <div><span className="font-bold not-italic">Waktu:</span> {lessonPlan.specializedLKPD.identitas.alokasiWaktu}</div>
                                        </div>

                                        <section className="mb-8">
                                            <h4 className="section-title text-lg font-bold text-indigo-600 border-b-2 border-indigo-100 pb-1 mb-4 flex items-center gap-2">
                                                🎯 TUJUAN KITA HARI INI
                                            </h4>
                                            <ul className="list-disc ml-6 space-y-2">
                                                {lessonPlan.specializedLKPD.tujuanPembelajaran.map((t, i) => (
                                                    <li key={i}>{t}</li>
                                                ))}
                                            </ul>
                                        </section>

                                        <section className="mb-10 bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-100">
                                            <h4 className="section-title text-xl font-bold text-blue-600 mb-4">🚀 MARI BELAJAR!</h4>
                                            <p className="leading-relaxed whitespace-pre-wrap">{lessonPlan.specializedLKPD.materiSingkat}</p>
                                        </section>

                                        <section className="mb-10">
                                            <h4 className="section-title text-xl font-bold text-indigo-600 mb-6">📝 LANGKAH KEGIATAN KITA</h4>
                                            <div className="space-y-8">
                                                {lessonPlan.specializedLKPD.langkahKegiatan.map((lk, i) => (
                                                    <div key={i} className="step-card bg-white border-2 border-slate-100 p-6 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <span className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full font-bold text-xl shrink-0">{i + 1}</span>
                                                            <h5 className="text-xl font-bold text-slate-800">{lk.tahap}</h5>
                                                        </div>
                                                        <p className="text-slate-600 ml-0 sm:ml-13 leading-relaxed mb-4">{lk.instruksi}</p>
                                                        
                                                        {lk.imageUrl ? (
                                                            <div className="sm:ml-13 mt-4">
                                                                <img src={lk.imageUrl} alt={lk.tahap} className="step-image max-w-full sm:max-w-md h-auto rounded-xl shadow-lg border-4 border-white" />
                                                            </div>
                                                        ) : lk.imagePrompt && (
                                                            <div className="sm:ml-13 mt-4 no-print">
                                                                <button
                                                                    onClick={() => handleGenerateLKPDImage(i)}
                                                                    disabled={generatingImageId === `lkpd-image-${i}`}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold"
                                                                >
                                                                    {generatingImageId === `lkpd-image-${i}` ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                                                                    Generate Ilustrasi
                                                                </button>
                                                                <p className="text-[10px] text-slate-400 mt-1 italic">Buat LKPD lebih menarik ({lk.imagePrompt.slice(0, 30)}...)</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="mb-10 p-6 bg-purple-50 rounded-2xl border-2 border-purple-100">
                                            <h4 className="section-title text-xl font-bold text-purple-600 mb-6">🧠 TANTANGAN SERU</h4>
                                            <div className="space-y-6">
                                                {lessonPlan.specializedLKPD.pertanyaanDiskusi.map((p, i) => (
                                                    <div key={i} className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
                                                        <p className="font-bold text-slate-800 mb-8">{i + 1}. {p}</p>
                                                        <div className="h-20 border-b-2 border-slate-200 border-dashed"></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="text-center p-8 bg-indigo-50 rounded-3xl border-2 border-indigo-100">
                                            <h4 className="text-2xl font-bold text-indigo-600 mb-3 uppercase tracking-tighter">✨ KESIMPULAN KITA</h4>
                                            <p className="font-medium italic leading-relaxed text-indigo-800 text-lg">"{lessonPlan.specializedLKPD.kesimpulan}"</p>
                                            <div className="mt-8 text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Ajarin.ai - Intelligent Teaching Assistant</div>
                                        </section>
                                    </div>
                                </div>
                            )}
                    </div>

                    <div ref={printRef} className="bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm font-serif print:shadow-none print:p-0">
                        <div className="text-center mb-8 border-b-4 border-double border-slate-900 pb-4">
                            <h1 className="text-2xl font-bold uppercase mb-1">Modul Ajar</h1>
                            <h2 className="text-xl font-bold uppercase">{lessonPlan.informasiUmum.identitasModul.mataPelajaran}: {topic}</h2>
                        </div>

                        {/* INFORMASI UMUM */}
                        <section className="mb-8">
                            <div className="bg-slate-100 p-2 font-bold uppercase mb-4 text-center border border-slate-900">
                                INFORMASI UMUM
                            </div>
                            <div className="grid grid-cols-[1fr_2fr] gap-x-4 gap-y-2 mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr' }}>
                                <span className="font-bold">Nama Penyusun</span>
                                <span>: {lessonPlan.informasiUmum.identitasModul.namaPenyusun}</span>
                                <span className="font-bold">Satuan Pendidikan</span>
                                <span>: {lessonPlan.informasiUmum.identitasModul.satuanPendidikan}</span>
                                <span className="font-bold">Fase / Kelas</span>
                                <span>: {lessonPlan.informasiUmum.identitasModul.faseKelas}</span>
                                <span className="font-bold">Mata Pelajaran</span>
                                <span>: {lessonPlan.informasiUmum.identitasModul.mataPelajaran}</span>
                                <span className="font-bold">Alokasi Waktu</span>
                                <span>: {lessonPlan.informasiUmum.identitasModul.alokasiWaktu}</span>
                                <span className="font-bold">Tanggal Penyusunan</span>
                                <span>: {lessonPlan.informasiUmum.identitasModul.tahunPenyusunan}</span>
                            </div>

                            <div className="space-y-4">
                                <div className="mb-4">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2">I. KOMPETENSI AWAL</h3>
                                    <p className="text-justify leading-relaxed">{lessonPlan.informasiUmum.kompetensiAwal}</p>
                                </div>
                                <div className="mb-4">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2">II. PROFIL PELAJAR PANCASILA</h3>
                                    <p className="italic">{lessonPlan.informasiUmum.profilPelajarPancasila.join(', ')}</p>
                                </div>
                                <div className="mb-4">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2">III. SARANA DAN PRASARANA</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                        <ul className="list-disc list-inside">
                                            {lessonPlan.informasiUmum.saranaPrasarana.map((item, idx) => (
                                                <li key={idx} className="text-sm">{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                    <div>
                                        <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2 uppercase text-xs">Target Peserta Didik</h3>
                                        <p>{lessonPlan.informasiUmum.targetPesertaDidik}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2 uppercase text-xs">Model Pembelajaran</h3>
                                        <p>{lessonPlan.informasiUmum.modelPembelajaran}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* KOMPONEN INTI */}
                        <section className="mb-8">
                            <div className="bg-slate-100 p-2 font-bold uppercase mb-4 text-center border border-slate-900">
                                KOMPONEN INTI
                            </div>
                            <div className="space-y-6">
                                <div className="mb-6">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2">I. TUJUAN PEMBELAJARAN</h3>
                                    <ul className="list-disc ml-5 space-y-1">
                                        {lessonPlan.komponenInti.tujuanPembelajaran.map((item, idx) => (
                                            <li key={idx} className="text-justify">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mb-6">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2">II. PEMAHAMAN BERMAKNA</h3>
                                    <ul className="list-disc ml-5 space-y-1">
                                        {lessonPlan.komponenInti.pemahamanBermakna.map((item, idx) => (
                                            <li key={idx} className="text-justify">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mb-6">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2">III. PERTANYAAN PEMANTIK</h3>
                                    <ul className="list-disc ml-5 space-y-1">
                                        {lessonPlan.komponenInti.pertanyaanPemantik.map((item, idx) => (
                                            <li key={idx} className="text-justify italic">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mb-6">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-4">IV. KEGIATAN PEMBELAJARAN</h3>
                                    {lessonPlan.komponenInti.kegiatanPembelajaran.map((pertemuan, pIdx) => (
                                        <div key={pIdx} className="mb-6 last:mb-0 border border-slate-200 p-4 rounded bg-slate-50">
                                            <div className="bg-slate-200 px-2 py-1 font-bold mb-3 border-b border-slate-900">
                                                PERTEMUAN KE-{pertemuan.pertemuan} ({pertemuan.materi})
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="mb-4">
                                                    <h4 className="font-bold text-sm underline mb-1">Pendahuluan</h4>
                                                    <ul className="list-disc ml-5 text-sm space-y-0.5">
                                                        {pertemuan.pendahuluan.map((item, idx) => <li key={idx}>{item}</li>)}
                                                    </ul>
                                                </div>
                                                <div className="mb-4">
                                                    <h4 className="font-bold text-sm underline mb-1">Kegiatan Inti</h4>
                                                    <ul className="list-disc ml-5 text-sm space-y-0.5">
                                                        {pertemuan.inti.map((item, idx) => <li key={idx}>{item}</li>)}
                                                    </ul>
                                                </div>
                                                <div className="mb-4">
                                                    <h4 className="font-bold text-sm underline mb-1">Penutup</h4>
                                                    <ul className="list-disc ml-5 text-sm space-y-0.5">
                                                        {pertemuan.penutup.map((item, idx) => <li key={idx}>{item}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <div className="page-break" />

                        {/* ASESMEN & DLL */}
                        <section className="mb-8">
                            <div className="bg-slate-100 p-2 font-bold uppercase mb-4 text-center border border-slate-900">
                                ASESMEN, PENGAYAAN, DAN REFLEKSI
                            </div>
                            <div className="space-y-6">
                                <div className="mb-6">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2">V. ASESMEN / PENILAIAN</h3>
                                    <div className="grid grid-cols-3 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                                        <div className="border border-slate-300 p-3 rounded bg-slate-50">
                                            <h4 className="font-bold text-xs uppercase mb-1">Sikap</h4>
                                            <p className="text-xs">{lessonPlan.asesmenPenilaian.sikap}</p>
                                        </div>
                                        <div className="border border-slate-300 p-3 rounded bg-slate-50">
                                            <h4 className="font-bold text-xs uppercase mb-1">Pengetahuan</h4>
                                            <p className="text-xs">{lessonPlan.asesmenPenilaian.pengetahuan}</p>
                                        </div>
                                        <div className="border border-slate-300 p-3 rounded bg-slate-50">
                                            <h4 className="font-bold text-xs uppercase mb-1">Keterampilan</h4>
                                            <p className="text-xs">{lessonPlan.asesmenPenilaian.keterampilan}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2">VI. PENGAYAAN DAN REMEDIAL</h3>
                                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                        <div>
                                            <h4 className="font-bold text-sm underline mb-1">Pengayaan</h4>
                                            <p className="text-sm">{lessonPlan.pengayaanRemedial.pengayaan}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm underline mb-1">Remedial</h4>
                                            <p className="text-sm">{lessonPlan.pengayaanRemedial.remedial}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-2 uppercase">VII. Refleksi Guru dan Peserta Didik</h3>
                                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">Refleksi Guru:</h4>
                                            <ul className="list-disc ml-5 text-sm">
                                                {lessonPlan.refleksi.guru.map((item, idx) => <li key={idx}>{item}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">Refleksi Siswa:</h4>
                                            <ul className="list-disc ml-5 text-sm">
                                                {lessonPlan.refleksi.siswa.map((item, idx) => <li key={idx}>{item}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="page-break" />

                        {/* LAMPIRAN */}
                        <section className="mb-8">
                            <div className="bg-slate-100 p-2 font-bold uppercase mb-4 text-center border border-slate-900">
                                LAMPIRAN-LAMPIRAN
                            </div>
                            <div className="space-y-8">
                                <div className="mb-8">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-4 uppercase">Lampiran 1: LKPD (Lembar Kerja Peserta Didik)</h3>
                                    {lessonPlan.lampiran.lkpd.map((lk, idx) => (
                                        <div key={idx} className="border-2 border-slate-900 p-6 rounded-md bg-slate-50 mb-6">
                                            <h4 className="text-center font-extrabold text-lg uppercase mb-4 border-b border-slate-900 pb-2">{lk.judul}</h4>
                                            <div className="mb-4">
                                                <h5 className="font-bold underline mb-2">Petunjuk Kerja:</h5>
                                                <ul className="list-decimal ml-5 space-y-1">
                                                    {lk.petunjuk.map((p, pIdx) => <li key={pIdx}>{p}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <h5 className="font-bold underline mb-2">Tugas/Aktivitas:</h5>
                                                <ul className="list-disc ml-5 space-y-2">
                                                    {lk.tugas.map((t, tIdx) => <li key={tIdx}>{t}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mb-8">
                                    <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-4 uppercase">Lampiran 2: Bahan Bacaan Guru dan Peserta Didik</h3>
                                    {lessonPlan.lampiran.bahanBacaan.map((bh, idx) => (
                                        <div key={idx} className="mb-6 last:mb-0">
                                            <h4 className="font-bold mb-2 underline">{bh.judul}</h4>
                                            <p className="text-sm text-justify whitespace-pre-wrap leading-relaxed">{bh.konten}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                    <div>
                                        <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-4 uppercase">Glosarium</h3>
                                        <dl className="space-y-2">
                                            {lessonPlan.lampiran.glosarium.map((g, idx) => (
                                                <div key={idx} className="text-sm">
                                                    <dt className="font-bold inline">{g.istilah}: </dt>
                                                    <dd className="inline">{g.definisi}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                    <div>
                                        <h3 className="font-bold border-l-4 border-slate-900 pl-3 mb-4 uppercase">Daftar Pustaka</h3>
                                        <ul className="list-disc ml-5 text-xs space-y-1">
                                            {lessonPlan.lampiran.daftarPustaka.map((d, idx) => <li key={idx}>{d}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonPlanGenerator;
