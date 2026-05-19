
import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, QuestionType, Question, LessonPlan, TeacherNote, SpecializedLKPD, ExtractedQuizData } from '../types';

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY environment variable not set. AI features may not work.");
} else {
    console.log("GEMINI_API_KEY is present (length: " + process.env.GEMINI_API_KEY.length + ")");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const formattingRules = (difficulty: Difficulty, questionType: QuestionType, numberOfChoices: number, language: 'id' | 'en', gradeLevel: string, isHOTS: boolean): string => {
    let hotsInstruction = '';
    if (isHOTS) {
        hotsInstruction = language === 'en'
            ? `11. HOTS Requirement: CRITICAL! All questions must be High Order Thinking Skills (HOTS) questions that require analysis, evaluation, or creation (Bloom's Taxonomy Levels C4, C5, C6). Avoid simple recall or comprehension questions (C1, C2).`
            : `11. Syarat HOTS: KRUSIAL! Semua soal harus berupa soal High Order Thinking Skills (HOTS) yang memerlukan analisis, evaluasi, atau kreasi (Taksonomi Bloom Level C4, C5, C6). Hindari soal hafalan (C1, C2).`;
    }
    
    if (language === 'en') {
        const mcInstruction = questionType === QuestionType.MultipleChoice
          ? `provide ${numberOfChoices} plausible answer choices and one correct answer.`
          : `provide a thought-provoking question and include key points or a complete sample answer.`;

        const difficultyEn = { [Difficulty.Easy]: 'easy', [Difficulty.Medium]: 'medium', [Difficulty.Hard]: 'hard' }[difficulty];
        const questionTypeEn = { [QuestionType.MultipleChoice]: 'multiple choice', [QuestionType.Essay]: 'essay' }[questionType];

        return `Question Specifications:
1.  Language: Generate all content (questions, options, answers, explanations) strictly in English.
2.  Education Level: ${gradeLevel}. Adjust the material depth, vocabulary, and question complexity according to this education level.
3.  Difficulty Level: ${difficultyEn}. Adjust the complexity of the question and the depth of the explanation to this level.
4.  Question Type: ${questionTypeEn}.
5.  In-depth Research: Conduct thorough research on this topic using reliable web sources from various languages (English, Indonesian, etc.) to ensure accuracy, relevance, and the quality of challenging questions.
6.  Math Support: If the question or answer contains mathematical formulas, use pure LaTeX format. IMPORTANT: ALWAYS enclose LaTeX formulas in dollar signs ($ for inline, $$ for block).
    -   Inline: $...$ (example: $E = mc^2$)
    -   Block: $$...$$ (example: $$S = \sum_{i=1}^{n} (x_i - \bar{x})^2$$)
    -   IMPORTANT: In the JSON output, you MUST double-escape backslashes (e.g., write "\\\\rightarrow" so it parses as "\\rightarrow").
    -   Indonesian Logarithm: For Indonesian logarithm notation (e.g., '5 log 25'), you MUST use the \\indolog{base}{number} macro and it MUST be enclosed in single dollar signs ($) for inline format. ALWAYS use curly braces for both arguments even if they are single digits. CORRECT EXAMPLE: $\\indolog{5}{25}$. INCORRECT EXAMPLE: \\indolog{5}{25} or \\indolog525. Never write the \\indolog macro without surrounding dollar signs and NEVER without curly braces for BOTH arguments.
    -   Multiplication/Dots: Use \\cdot for multiplication dots. Example: $a \\cdot b$.
    -   Set Notation: Use \\{...\\} for curly braces, \\mid for the vertical bar, and \\text{...} for regular text within formulas. Example: $\\{x \\mid x > 0, \\text{ x is a real number}\\}$
7.  Educational Solution: For each question, provide a clear and guiding solution.
    -   Language Style: Use a communicative tone, as if you were explaining to a student. Avoid overly formal or rigid language.
    -   Smart Formatting Choice:
        a.  If the solution is mathematical and sequential (step-by-step), USE a numbered list (e.g., 1. ..., 2. ..., etc.).
        b.  If the solution is conceptual or a narrative explanation (e.g., for history or biology questions), provide it in clear paragraphs WITHOUT numbering.
    -   Language Quality: Pay attention to correct grammar, punctuation, and spacing to ensure the text is easy to read and professional.
    -   Output Field: Insert this explanation into the 'langkah_langkah_jawaban' field.
8.  Instruksi Format Output:
    -   For "multiple choice", ${mcInstruction} IMPORTANT: In the 'pilihan' array, include ONLY the answer text, without letter prefixes like 'a.' or 'B.'. The system will add the option letters automatically.
    -   For "essay", provide a thought-provoking question and include key points or a complete sample answer.
9.  Image Generation Prompt: If the question requires an illustration to be understood or solved (e.g., Geometry figures, Chemical structures, Physics diagrams, Anatomy), provide a detailed English description of the image in the 'image_prompt' field. CRITICAL: The image description MUST specify a CLEAN diagram WITHOUT any text, letters, or vertex labels (e.g., "a wireframe cube without labels", "a right triangle without text"). The user will label it manually. If no image is needed, leave 'image_prompt' empty or null.
10. Final Output: Return the result ONLY in a valid JSON format according to the specified schema, without any additional text or formatting.
${hotsInstruction}`;
    }

    const mcInstruction = questionType === QuestionType.MultipleChoice
      ? `sediakan ${numberOfChoices} pilihan jawaban yang masuk akal dan satu jawaban yang benar.`
      : `berikan pertanyaan yang memancing pemikiran dan sertakan poin-poin kunci atau contoh jawaban lengkap.`;
  
    return `Spesifikasi soal:
1.  Bahasa: Hasilkan semua konten (soal, pilihan, jawaban, penjelasan) secara ketat dalam Bahasa Indonesia.
2.  Tingkat Pendidikan: ${gradeLevel}. Sesuaikan kedalaman materi, kosakata, dan kompleksitas soal dengan tingkat pendidikan ini.
3.  Tingkat Kesulitan: ${difficulty}. Sesuaikan kompleksitas pertanyaan dan kedalaman penjelasan dengan tingkat ini.
4.  Jenis Soal: ${questionType}.
5.  Riset Mendalam: Lakukan riset topik ini menggunakan sumber-sumber web terpercaya dari berbagai bahasa (Inggris, Indonesia, dll.) untuk memastikan akurasi, relevansi, dan kualitas soal yang menantang.
6.  Dukungan Matematika: Jika pertanyaan atau jawaban mengandung formula matematika, gunakan format LaTeX murni. PENTING: SELALU apit formula LaTeX dengan tanda dolar ($ untuk inline, $$ untuk blok).
    -   Inline: $...$ (contoh: $E = mc^2$)
    -   Blok: $$...$$ (contoh: $$S = \sum_{i=1}^{n} (x_i - \bar{x})^2$$)
    -   PENTING: Dalam output JSON, Anda WAJIB melakukan double-escape pada backslash (misal: tulis "\\\\rightarrow" agar terurai sebagai "\\rightarrow").
    -   Indonesian Logarithm: Untuk notasi logaritma Indonesia (misalnya '5 log 25'), WAJIB gunakan makro \\indolog{basis}{angka} dan WAJIB diapit dengan tanda dolar tunggal ($) untuk format inline atau tanda dolar ganda ($$) untuk format blok. SELALU gunakan kurung kurawal untuk kedua argumen. JANGAN menuliskan perpangkatan di luar argumen logaritma (seperti ^2 log) secara manual; selalu gunakan \\indolog.
    -   Perkalian/Titik: Gunakan \\cdot UNTUK SEMUA titik perkalian. JANGAN gunakan titik (.) atau karakter titik tengah (⋅) secara literal di dalam atau di luar formula. Contoh: $a \\cdot b$.
    -   Perpangkatan: Selalu gunakan operator ^ untuk perpangkatan, misal $(2x)^2$. Jangan biarkan angka pangkat terpisah tanpa operator. Pastikan SEMUA ekspresi matematika diapit oleh tanda dolar.
    -   Dilarang Newline dalam Formula: Jangan masukkan baris baru (newline) di tengah-tengah ekspresi matematika $...$. Formula harus dalam satu baris kecuali menggunakan blok $$...$$.
    -   Notasi Himpunan: Gunakan \\{...\\} untuk kurung kurawal, \\mid untuk garis vertikal, dan \\text{...} untuk teks biasa di dalam formula. Contoh: $\\{x \\mid x > 0, \\text{ x adalah bilangan real}\\}$
7.  Penyelesaian yang Mendidik: Untuk setiap soal, berikan penyelesaian yang jelas dan membimbing.
    -   Gaya Bahasa: Gunakan bahasa yang komunikatif, seolah-olah Anda sedang menjelaskan kepada seorang siswa. Hindari bahasa yang terlalu baku atau kaku.
    -   Pemilihan Format Cerdas:
        a.  Jika penyelesaiannya bersifat matematis dan berurutan (langkah-demi-langkah), GUNAKAN daftar bernomor (contoh: 1. ..., 2. ..., dst.).
        b.  Jika penyelesaiannya bersifat konseptual atau berupa penjelasan naratif (misalnya untuk soal sejarah atau biologi), berikan dalam bentuk paragraf yang jelas TANPA penomoran.
    -   Kualitas Bahasa: Perhatikan Ejaan yang Disempurnakan (EYD), tanda baca, dan spasi yang benar untuk memastikan teks mudah dibaca dan profesional.
    -   Field Output: Masukkan penjelasan ini ke dalam field 'langkah_langkah_jawaban'.
8.  Instruksi Format Output:
    -   Untuk "pilihan ganda", ${mcInstruction} PENTING: Dalam array 'pilihan', masukkan HANYA teks jawabannya, tanpa awalan huruf seperti 'a.' atau 'B.'. Sistem akan menambahkan huruf opsi secara otomatis.
    -   Untuk "esai", berikan pertanyaan yang memancing pemikiran dan sertakan poin-poin kunci atau contoh jawaban lengkap.
9.  Prompt Gambar: Jika soal memerlukan ilustrasi agar dapat dipahami atau diselesaikan (misalnya: Gambar Geometri, Struktur Kimia, Diagram Fisika, Anatomi), berikan deskripsi gambar yang detail dalam Bahasa Inggris pada field 'image_prompt'. PENTING: Deskripsi harus meminta gambar BERSIH TANPA label teks, huruf, atau angka pada titik sudut (misal: "a wireframe cube without labels"). Pengguna akan memberi label sendiri. Jika tidak butuh gambar, biarkan field ini kosong.
10. Output Final: Kembalikan hasilnya HANYA dalam format JSON yang valid sesuai skema yang telah ditentukan, tanpa teks atau format tambahan.
${hotsInstruction}`;
};

const generatePrompt = (subject: string, difficulty: Difficulty, questionType: QuestionType, numberOfChoices: number, language: 'id' | 'en', gradeLevel: string, isHOTS: boolean, numberOfQuestions: number): string => {
    if (language === 'en') {
        return `You are an expert and experienced teacher/tutor.
Your task is to create ${numberOfQuestions} high-quality questions about the topic: "${subject}" that not only test but also educate.
CRITICAL: Ensure all ${numberOfQuestions} questions are unique and there is no duplication. Focus on diverse aspects or sub-topics.

${formattingRules(difficulty, questionType, numberOfChoices, language, gradeLevel, isHOTS)}`;
    }

    return `Anda adalah seorang guru/tutor yang ahli dan berpengalaman.
Tugas Anda adalah membuat ${numberOfQuestions} soal berkualitas tinggi tentang topik: "${subject}" yang tidak hanya menguji, tetapi juga mendidik.
KRUSIAL: Pastikan semua ${numberOfQuestions} soal ini unik dan tidak ada duplikasi. Fokus pada aspek atau sub-topik yang beragam.

${formattingRules(difficulty, questionType, numberOfChoices, language, gradeLevel, isHOTS)}`;
};

const generateAddMorePrompt = (subject: string, difficulty: Difficulty, questionType: QuestionType, numberOfChoices: number, existingQuestions: Question[], language: 'id' | 'en', gradeLevel: string, isHOTS: boolean, numberOfQuestions: number): string => {
    const existingQuestionTexts = existingQuestions.map(q => `- "${q.pertanyaan}"`).join('\n');
    const rules = formattingRules(difficulty, questionType, numberOfChoices, language, gradeLevel, isHOTS);

    if (language === 'en') {
        return `You are an expert and experienced teacher/tutor, continuing a question-generation session.
You have previously created the following questions for the topic "${subject}":
${existingQuestionTexts}

Your task now is to create ${numberOfQuestions} NEW questions that continue the previous set.
IMPORTANT:
1.  DO NOT repeat the questions above.
2.  Focus on DIFFERENT aspects, sub-topics, or case studies from the previous questions to ensure diversity.
3.  Use the exact same specifications as below.

${rules}`;
    }

    return `Anda adalah seorang guru/tutor yang ahli dan berpengalaman, melanjutkan sesi pembuatan soal.
Anda sebelumnya telah membuat soal-soal berikut untuk topik "${subject}":
${existingQuestionTexts}

Tugas Anda sekarang adalah membuat ${numberOfQuestions} soal BARU LAGI yang melanjutkan set sebelumnya.
PENTING:
1.  JANGAN ulangi soal-soal di atas.
2.  Fokus pada aspek, sub-topik, atau studi kasus yang BERBEDA dari soal-soal sebelumnya untuk memastikan keberagaman.
3.  Gunakan spesifikasi yang sama persis seperti di bawah ini.

${rules}`;
};

const generateRegeneratePrompt = (subject: string, difficulty: Difficulty, questionType: QuestionType, numberOfChoices: number, allOtherQuestions: Question[], language: 'id' | 'en', gradeLevel: string, isHOTS: boolean): string => {
    const existingQuestionTexts = allOtherQuestions.map(q => `- "${q.pertanyaan}"`).join('\n');
    let rules = formattingRules(difficulty, questionType, numberOfChoices, language, gradeLevel, isHOTS);

    if (language === 'en') {
        rules = rules.replace(
            "Return the result ONLY in a valid JSON format according to the specified schema, without any additional text or formatting.",
            "Return the result ONLY as a single, valid JSON object, not an array."
        );
        return `You are an expert teacher/tutor. Your task is to create EXACTLY ONE (1) NEW question for the topic "${subject}".
This new question MUST NOT BE THE SAME or too similar to the existing questions listed below:
${existingQuestionTexts}

Use the following specifications for the new question:
${rules}`;
    }

    rules = rules.replace(
        "Kembalikan hasilnya HANYA dalam format JSON yang valid sesuai skema yang telah ditentukan, tanpa teks atau format tambahan.",
        "Kembalikan hasilnya HANYA dalam format satu objek JSON tunggal yang valid, bukan sebuah array."
    );

    return `Anda adalah seorang guru/tutor ahli. Tugas Anda adalah membuat TEPAT SATU (1) soal BARU untuk topik "${subject}".
Soal baru ini TIDAK BOLEH SAMA atau terlalu mirip dengan soal-soal yang sudah ada di bawah ini:
${existingQuestionTexts}

Gunakan spesifikasi berikut untuk soal baru:
${rules}`;
};

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const deepSanitize = (obj: any): any => {
    // Sanitize a single string value.
    const sanitizeString = (text: string): string => {
        if (typeof text !== 'string') return text;
        
        let sanitizedText = text;

        // Fix common JSON escaping issues where \r, \n, \t are interpreted as control characters
        // instead of LaTeX commands like \rightarrow, \newline, \times
        sanitizedText = sanitizedText.replace(/\r/g, '\\r');
        sanitizedText = sanitizedText.replace(/\n/g, '\\n');
        sanitizedText = sanitizedText.replace(/\t/g, '\\t');

        // Fix custom `extsuperscript` format for units
        sanitizedText = sanitizedText.replace(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*extsuperscript{([^{}]+)}/g, '$$$1 \\text{$2}^{$3}$$');
        
        // Remove backticks around LaTeX expressions
        sanitizedText = sanitizedText.replace(/`+\s*(\${1,2}[\s\S]*?\${1,2})\s*`+/g, '$1');

        // Fix incorrect set notation
        sanitizedText = sanitizedText.replace(/(?<!\\){(.*?)\|(.*?)(?<!\\)}/g, '\\{$1 \\mid $2\\}');
        
        // Fix erroneous spaces after backslashes
        sanitizedText = sanitizedText.replace(/\\ \s*([{}])/g, '\\$1');

        // 1. Convert literal multiplication dots to \cdot
        sanitizedText = sanitizedText.replace(/⋅/g, '\\cdot');

        // 2. Fix \indolog unbraced and missing dollars
        // Pattern: \indolog digit digit+ (like \indolog232)
        sanitizedText = sanitizedText.replace(/\\indolog\s*([0-9])\s*([0-9]+)/g, '\\indolog{$1}{$2}');
        
        // 3. Consolidate newlines within perceived math regions (heuristic)
        // Check for newlines between math characters repeatedly so that multiple newlines collapse.
        let prev;
        do {
            prev = sanitizedText;
            // Remove newlines surrounded by math characters: digits, operators, brackets, commands, and $
            sanitizedText = sanitizedText.replace(/([+\-−⋅/\\^=()\[\]{}0-9$]|\\indolog|\\frac|\\sqrt|\\log)\s*\n\s*([+\-−⋅/\\^=()\[\]{}0-9$]|\\indolog|\\frac|\\sqrt|\\log)/g, '$1 $2');
        } while (sanitizedText !== prev);

        // 4. Wrap math blocks in dollars if they are missing
        // Iterate through string to find unwrapped \frac or \indolog
        let newText = '';
        let i = 0;
        let inDollar = false;
        let inDoubleDollar = false;
        while (i < sanitizedText.length) {
            if (sanitizedText.startsWith('$$', i)) {
                inDoubleDollar = !inDoubleDollar;
                newText += '$$';
                i += 2;
                continue;
            } else if (sanitizedText[i] === '$') {
                if (!inDoubleDollar) inDollar = !inDollar;
                newText += '$';
                i += 1;
                continue;
            }

            if (!inDollar && !inDoubleDollar) {
                let cmd = '';
                let expectedBraces = 0;
                if (sanitizedText.startsWith('\\frac{', i)) {
                    cmd = '\\frac{';
                    expectedBraces = 2;
                } else if (sanitizedText.startsWith('\\indolog{', i)) {
                    cmd = '\\indolog{';
                    expectedBraces = 2;
                }

                if (cmd) {
                    let j = i + cmd.length - 1; // start at the {
                    let depth = 0;
                    let bracePairs = 0;
                    while (j < sanitizedText.length) {
                        if (sanitizedText[j] === '{') depth++;
                        else if (sanitizedText[j] === '}') {
                            depth--;
                            if (depth === 0) {
                                bracePairs++;
                                if (bracePairs === expectedBraces) {
                                    j++;
                                    break;
                                }
                                // Next should be { (allowing spaces)
                                let k = j + 1;
                                while (k < sanitizedText.length && /\s/.test(sanitizedText[k])) k++;
                                if (k < sanitizedText.length && sanitizedText[k] === '{') {
                                    j = k - 1; 
                                } else {
                                    break; // malformed command
                                }
                            }
                        }
                        j++;
                    }

                    if (bracePairs === expectedBraces) {
                        // We found a complete un-wrapped math command. Wrap it in $.
                        // Strip inner stray $ to avoid breaking math mode, except if it's explicitly correct,
                        // but usually it's a mistake if $ is inside a math command.
                        const innerText = sanitizedText.substring(i, j).replace(/\$/g, '');
                        
                        // Heuristic: Expand wrapping left/right to include attached parentheses or operators
                        let start = newText.length;
                        while (start > 0 && /[+\-−⋅/\\^=()\[\]\s]/.test(newText[start - 1])) {
                            start--;
                        }
                        // Don't expand too far if it includes newlines or letters
                        let prefix = newText.substring(start);
                        // Ensure prefix doesn't have regular text words
                        if (/[a-zA-Z]{2,}/.test(prefix)) {
                            start = newText.length;
                            prefix = '';
                        }
                        
                        // We will just wrap the command itself for safety, but if there's a leading ( we can include it.
                        newText += '$' + innerText + '$';
                        i = j;
                        continue;
                    }
                }
            }

            newText += sanitizedText[i];
            i++;
        }
        sanitizedText = newText;
        
        // 5. Fix floating exponents: (...) 2 -> (...)^2
        // Look for math blocks ending in ) followed by a number
        sanitizedText = sanitizedText.replace(/\)[\s\n]*(\d+)/g, ')^$1');
        
        // 6. Fix missing log delimiters and bases: "2 log 12" -> "$\indolog{2}{12}$"
        sanitizedText = sanitizedText.replace(/(?<![a-zA-Z0-9\$\\])(\d{1,2})[\s\n]*\\?log[\s\n]*(\d+)/g, '$\\indolog{$1}{$2}$');
        
        // 7. Fix cases where base is already wrapped in superscript but not in indolog: ^2 log 12 -> $\indolog{2}{12}$
        sanitizedText = sanitizedText.replace(/\^\{?(\d{1,2})\}?[\s\n]*\\?log[\s\n]*\{?(\d+)\}?/g, '$\\indolog{$1}{$2}$');

        // 8. Fix LaTeX subscript log: \log_{2} 32 -> $\indolog{2}{32}$
        sanitizedText = sanitizedText.replace(/\\log_\{?([^{}]+)\}?[\s\n]*\{?([^{}]+)\}?/g, '$\\indolog{$1}{$2}$');
        
        // 9. Cleanup spacing around operators that might have been broken
        sanitizedText = sanitizedText.replace(/\\ cdot/g, '\\cdot');

        return sanitizedText;
    };

    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepSanitize(item));
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                newObj[key] = sanitizeString(value);
            } else {
                newObj[key] = deepSanitize(value);
            }
        }
    }
    return newObj;
};

const getQuestionSchema = (language: 'id' | 'en') => {
    const descriptions = language === 'en' ? {
        nomor: "Sequential number of the question",
        pertanyaan: "The full text of the question",
        tipe: "The type of question",
        pilihan: "Array of answer choices (for multiple choice only), without letter prefixes like 'a.'",
        jawaban_benar: "The correct answer from the choices (for multiple choice only), without letter prefixes like 'a.'",
        jawaban_esai: "Sample answer or key points (for essay only)",
        langkah_langkah_jawaban: "Explanation or steps to arrive at the correct answer. Can be a numbered list or narrative paragraph.",
        image_prompt: "Detailed English description of an image if the question requires one (e.g. Geometry), else null."
    } : {
        nomor: "Nomor urut pertanyaan",
        pertanyaan: "Teks lengkap dari pertanyaan",
        tipe: "Jenis pertanyaan",
        pilihan: "Array berisi pilihan jawaban (hanya untuk pilihan ganda), tanpa awalan huruf seperti 'a.'",
        jawaban_benar: "Jawaban yang benar dari pilihan yang ada (hanya untuk pilihan ganda), tanpa awalan huruf seperti 'a.'",
        jawaban_esai: "Contoh jawaban atau poin-poin kunci (hanya untuk esai)",
        langkah_langkah_jawaban: "Penjelasan atau langkah-langkah penyelesaian untuk mencapai jawaban yang benar. Dapat berupa daftar bernomor atau paragraf naratif.",
        image_prompt: "Deskripsi detail dalam Bahasa Inggris untuk gambar jika soal memerlukannya (misal Geometri), jika tidak biarkan null."
    };

    return {
        type: Type.OBJECT,
        properties: {
            nomor: { type: Type.INTEGER, description: descriptions.nomor },
            pertanyaan: { type: Type.STRING, description: descriptions.pertanyaan },
            tipe: { type: Type.STRING, enum: [QuestionType.MultipleChoice, QuestionType.Essay], description: descriptions.tipe },
            pilihan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: descriptions.pilihan,
                nullable: true,
            },
            jawaban_benar: {
                type: Type.STRING,
                description: descriptions.jawaban_benar,
                nullable: true,
            },
            jawaban_esai: {
                type: Type.STRING,
                description: descriptions.jawaban_esai,
                nullable: true,
            },
            langkah_langkah_jawaban: {
                type: Type.STRING,
                description: descriptions.langkah_langkah_jawaban,
                nullable: true,
            },
            image_prompt: {
                type: Type.STRING,
                description: descriptions.image_prompt,
                nullable: true,
            }
        },
        required: ["nomor", "pertanyaan", "tipe"],
    };
};

const callGeminiApi = async (prompt: string, language: 'id' | 'en'): Promise<Question[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const responseSchema = {
            type: Type.ARRAY,
            items: getQuestionSchema(language),
        };

        const modelName = "gemini-3-flash-preview";

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.8,
            },
        });

        const jsonText = response.text.trim();
        let parsedQuestions: Omit<Question, 'id'>[] = deepSanitize(JSON.parse(jsonText));
        
        let generatedQuestions: Question[] = parsedQuestions.map(q => ({
            ...q,
            id: crypto.randomUUID(),
        }));
        
        generatedQuestions = deepSanitize(generatedQuestions);
        
        generatedQuestions.forEach(q => {
             if(q.tipe === QuestionType.MultipleChoice && q.pilihan && Array.isArray(q.pilihan)) {
                // Shuffle the options to ensure randomization
                q.pilihan = shuffleArray(q.pilihan);
            }

            if(q.tipe === QuestionType.MultipleChoice && q.jawaban_benar && q.pilihan) {
                const cleanJawaban = q.jawaban_benar.replace(/^[A-Ea-e]\.\s*/, '');
                // Try to find exact or clean match in the (now shuffled) options
                const matchingChoice = q.pilihan.find(p => p.replace(/^[A-Ea-e]\.\s*/, '') === cleanJawaban);
                if(matchingChoice) {
                    q.jawaban_benar = matchingChoice;
                }
            }
        });

        return generatedQuestions;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate quiz: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating the quiz.");
    }
}

const callGeminiApiForSingleQuestion = async (prompt: string, language: 'id' | 'en'): Promise<Question> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const modelName = "gemini-3-flash-preview";

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: getQuestionSchema(language),
                temperature: 0.9,
            },
        });

        const jsonText = response.text.trim();
        const parsedQuestion: Omit<Question, 'id'> = deepSanitize(JSON.parse(jsonText));

        let generatedQuestion: Question = {
            ...parsedQuestion,
            id: crypto.randomUUID(),
        };
        
        generatedQuestion = deepSanitize(generatedQuestion);
        
        if(generatedQuestion.tipe === QuestionType.MultipleChoice && generatedQuestion.pilihan && Array.isArray(generatedQuestion.pilihan)) {
             generatedQuestion.pilihan = shuffleArray(generatedQuestion.pilihan);
        }

        if(generatedQuestion.tipe === QuestionType.MultipleChoice && generatedQuestion.jawaban_benar && generatedQuestion.pilihan) {
            const cleanJawaban = generatedQuestion.jawaban_benar.replace(/^[A-Ea-e]\.\s*/, '');
            const matchingChoice = generatedQuestion.pilihan.find(p => p.replace(/^[A-Ea-e]\.\s*/, '') === cleanJawaban);
            if(matchingChoice) {
                generatedQuestion.jawaban_benar = matchingChoice;
            }
        }

        return generatedQuestion;

    } catch (error) {
        console.error("Error calling Gemini API for single question:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to regenerate question: ${error.message}`);
        }
        throw new Error("An unknown error occurred while regenerating the question.");
    }
}


export const isEnglishMaterial = (subject: string): boolean => {
    const englishKeywords = [
        'english', 'bahasa inggris', 'inggris', 'grammar', 'tense', 'writing', 'reading', 
        'speaking', 'listening', 'vocabulary', 'verb', 'noun', 'adjective', 
        'adverb', 'pronoun', 'preposition', 'conjunction', 'article', 
        'conditional', 'passive voice', 'direct indirect', 'cloze',
        'comprehension', 'narrative', 'recount', 'report', 'descriptive',
        'procedure', 'exposition', 'analytical', 'hortatory', 'explanation',
        'discussion', 'news item', 'review', 'simple past', 'simple present',
        'future tense', 'perfect tense', 'continuous tense', 'passive', 'active',
        'direct', 'indirect', 'modal', 'auxiliary', 'gerund', 'infinitive',
        'relative clause', 'degree of comparison', 'synonym', 'antonym', 'idiom',
        'present simple', 'past simple', 'present continuous', 'past continuous'
    ];
    const regex = new RegExp(`\\b(${englishKeywords.join('|')})\\b`, 'i');
    return regex.test(subject);
};

export const generateQuiz = async (subject: string, difficulty: Difficulty, questionType: QuestionType, numberOfChoices: number, language: 'id' | 'en', gradeLevel: string, isHOTS: boolean, numberOfQuestions: number): Promise<Question[]> => {
    // Auto-detect English subject
    const targetLanguage = isEnglishMaterial(subject) ? 'en' : language;
    
    const prompt = generatePrompt(subject, difficulty, questionType, numberOfChoices, targetLanguage, gradeLevel, isHOTS, numberOfQuestions);
    return callGeminiApi(prompt, targetLanguage);
};

export const addMoreQuizQuestions = async (subject: string, difficulty: Difficulty, questionType: QuestionType, numberOfChoices: number, existingQuestions: Question[], language: 'id' | 'en', gradeLevel: string, isHOTS: boolean, numberOfQuestions: number): Promise<Question[]> => {
    // Auto-detect English subject
    const targetLanguage = isEnglishMaterial(subject) ? 'en' : language;

    const prompt = generateAddMorePrompt(subject, difficulty, questionType, numberOfChoices, existingQuestions, targetLanguage, gradeLevel, isHOTS, numberOfQuestions);
    return callGeminiApi(prompt, targetLanguage);
};

export const regenerateSingleQuestion = async (subject: string, difficulty: Difficulty, questionType: QuestionType, numberOfChoices: number, allQuestions: Question[], questionToReplace: Question, language: 'id' | 'en', gradeLevel: string, isHOTS: boolean): Promise<Question> => {
    // Auto-detect English subject
    const targetLanguage = isEnglishMaterial(subject) ? 'en' : language;

    const allOtherQuestions = allQuestions.filter(q => q.id !== questionToReplace.id);
    const prompt = generateRegeneratePrompt(subject, difficulty, questionType, numberOfChoices, allOtherQuestions, targetLanguage, gradeLevel, isHOTS);
    return callGeminiApiForSingleQuestion(prompt, targetLanguage);
};


export const extractQuestionsFromText = async (text: string, language: 'id' | 'en'): Promise<ExtractedQuizData> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Judul atau topik utama dari dokumen ini" },
                questions: {
                    type: Type.ARRAY,
                    items: getQuestionSchema(language)
                }
            },
            required: ["questions"]
        };

        const prompt = `Anda adalah seorang ahli asisten pendidikan.
Tugas Anda adalah mengekstrak soal-soal kurikulum sekolah dari teks dokumen berikut dan mengubahnya menjadi format JSON yang terstruktur.

TEKS INPUT:
"""
${text}
"""

INSTRUKSI KRUSIAL:
1. Temukan SEMUA pertanyaan, pilihan jawaban, jawaban benar, dan penjelasan/penyelesaian yang ada di dalam teks.
2. Identifikasi topik utama atau judul kuis dari teks (jika ada). Jika tidak ada judul eksplisit, buatlah judul singkat yang mewakili isi soal. Masukkan ke field 'title'.
3. Identifikasi tipe soal untuk setiap pertanyaan: 'pilihan ganda' atau 'esai'.
4. Untuk soal pilihan ganda, bersihkan pilihan jawaban dari prefix huruf (a., b., c., dll).
5. Gunakan spesifikasi teknis (LaTeX) yang sama untuk rumus matematika. Apit semua rumus dengan tanda dolar ($).
6. Jangan lewatkan detail penting. Pertanyaan 'pertanyaan' tidak boleh kosong.
7. Kembalikan dalam format JSON objek dengan field 'title' dan 'questions' (array dari objek Question).

${formattingRules(Difficulty.Medium, QuestionType.MultipleChoice, 4, language, "Umum", false)}`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            },
        });

        const jsonText = response.text.trim();
        const rawData = JSON.parse(jsonText);
        
        let questions: Question[] = (rawData.questions || []).map((q: any) => ({
            ...deepSanitize(q),
            id: crypto.randomUUID(),
        }));

        // Shuffle options for MC
        questions.forEach(q => {
            if(q.tipe === QuestionType.MultipleChoice && q.pilihan && Array.isArray(q.pilihan)) {
               q.pilihan = shuffleArray(q.pilihan);
           }
           if(q.tipe === QuestionType.MultipleChoice && q.jawaban_benar && q.pilihan) {
               const cleanJawaban = q.jawaban_benar.replace(/^[A-Ea-e]\.\s*/, '');
               const matchingChoice = q.pilihan.find(p => p.replace(/^[A-Ea-e]\.\s*/, '') === cleanJawaban);
               if(matchingChoice) q.jawaban_benar = matchingChoice;
           }
           // Ensure question text isn't empty
           if (!q.pertanyaan) q.pertanyaan = language === 'id' ? '(Soal tidak terbaca)' : '(Question unreadable)';
       });

        return {
            title: rawData.title || (language === 'id' ? 'Kuis dari Dokumen' : 'Quiz from Document'),
            questions: questions || []
        };

    } catch (error) {
        console.error("Error in extractQuestionsFromText:", error);
        throw new Error("Gagal mengekstrak soal dari dokumen.");
    }
};

export const generateQuestionImage = async (imagePrompt: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: imagePrompt,
        });
        
        // Find the image part in the candidates
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image data returned from API");
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate illustration.");
    }
};

export const generateLessonPlan = async (
    topic: string, 
    subject: string, 
    gradeLevel: string,
    params: {
        creatorName?: string;
        schoolName?: string;
        dateOfWriting?: string;
        jpCount?: string;
        meetingCount?: string;
        learningModel?: string;
        subTopic?: string;
        focus?: string[];
    }
): Promise<LessonPlan> => {
    const { 
        creatorName = "Guru Penggerak", 
        schoolName = "Satuan Pendidikan", 
        dateOfWriting = new Date().toLocaleDateString('id-ID'),
        jpCount = "2 JP", 
        meetingCount = "1", 
        learningModel = "Problem Based Learning", 
        subTopic = "",
        focus = ["HOTS"]
    } = params;

    const alokasiWaktu = `${jpCount} (${meetingCount} x Pertemuan)`;

    const prompt = `Anda adalah seorang guru profesional dan ahli kurikulum di Indonesia.
Tugas Anda adalah membuat Modul Ajar (RPP Plus) yang lengkap, terstruktur, dan inspiratif berdasarkan Kurikulum Merdeka atau standar resmi pendidikan Indonesia.

INFORMASI INPUT:
Topik Utama: "${topic}"
Sub Materi/Fokus Spesifik: "${subTopic}"
Mata Pelajaran: "${subject}"
Fase/Kelas: "${gradeLevel}"
Nama Penyusun: "${creatorName}"
Satuan Pendidikan: "${schoolName}"
Tanggal Penyusunan: "${dateOfWriting}"
Alokasi Waktu: "${alokasiWaktu}"
Model Pembelajaran: "${learningModel}"
Fokus Pembelajaran (Wajib diintegrasikan): ${focus.join(", ")}

INSTRUKSI KHUSUS:
1. Alokasi Waktu & Pertemuan: Buatlah rencana kegiatan pembelajaran untuk TEPAT ${meetingCount} kali pertemuan. 
2. Model Pembelajaran: Langkah-langkah dalam "Kegiatan Inti" HARUS secara eksplisit mengikuti sintaks/tahapan model "${learningModel}".
3. Fokus Pembelajaran: Seluruh konten (Tujuan, Aktivitas, Asesmen, dan LKPD) harus sangat kental dengan elemen ${focus.join(" dan ")}.
    - Jika ada "HOTS", pastikan pertanyaan dan tugas menuntut analisis, evaluasi, atau kreasi (C4-C6).
    - Jika ada "Literasi/Numerasi", integrasikan aktivitas baca-tulis atau pengolahan data numerik yang relevan.
4. Lampiran & LKPD: Buat LKPD yang sinkron dengan model ${learningModel} dan fokus ${focus.join("/")}.

Modul harus mencakup:
1.  **Informasi Umum**: Identitas modul (Gunakan input Nama Penyusun, Sekolah, Alokasi), kompetensi awal, profil pelajar pancasila (pilih 3-4 yang paling relevan), sarana & prasarana, target peserta didik, dan model pembelajaran "${learningModel}".
2.  **Komponen Inti**: Tujuan pembelajaran yang spesifik, pemahaman bermakna, pertanyaan pemantik, dan kegiatan pembelajaran yang rinci (Pendahuluan, Inti, Penutup) untuk ${meetingCount} pertemuan.
3.  **Asesmen**: Deskripsi penilaian sikap, pengetahuan, dan keterampilan.
4.  **Pengayaan & Remedial**: Strategi untuk siswa yang sudah mahir dan yang membutuhkan bantuan.
5.  **Refleksi**: Pertanyaan refleksi untuk guru dan siswa.
6.  **Lampiran**: 
    - Minimal 1 Lembar Kerja Peserta Didik (LKPD) yang menantang dan sesuai fokus ${focus.join("/")}.
    - Bahan bacaan singkat untuk guru dan siswa.
    - Glosarium (istilah penting).
    - Daftar pustaka.

Aturan Penting:
- Gunakan bahasa formal pendidikan Indonesia yang sopan dan profesional.
- Pastikan kegiatan pembelajaran selaras dengan tujuan.
- Kembalikan TEPAT satu objek JSON sesuai skema.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            informasiUmum: {
                type: Type.OBJECT,
                properties: {
                    identitasModul: {
                        type: Type.OBJECT,
                        properties: {
                            namaPenyusun: { type: Type.STRING },
                            satuanPendidikan: { type: Type.STRING },
                            faseKelas: { type: Type.STRING },
                            mataPelajaran: { type: Type.STRING },
                            alokasiWaktu: { type: Type.STRING },
                            tahunPenyusunan: { type: Type.STRING },
                        },
                        required: ["namaPenyusun", "satuanPendidikan", "faseKelas", "mataPelajaran", "alokasiWaktu", "tahunPenyusunan"]
                    },
                    kompetensiAwal: { type: Type.STRING },
                    profilPelajarPancasila: { type: Type.ARRAY, items: { type: Type.STRING } },
                    saranaPrasarana: { type: Type.ARRAY, items: { type: Type.STRING } },
                    targetPesertaDidik: { type: Type.STRING },
                    modelPembelajaran: { type: Type.STRING },
                },
                required: ["identitasModul", "kompetensiAwal", "profilPelajarPancasila", "saranaPrasarana", "targetPesertaDidik", "modelPembelajaran"]
            },
            komponenInti: {
                type: Type.OBJECT,
                properties: {
                    tujuanPembelajaran: { type: Type.ARRAY, items: { type: Type.STRING } },
                    pemahamanBermakna: { type: Type.ARRAY, items: { type: Type.STRING } },
                    pertanyaanPemantik: { type: Type.ARRAY, items: { type: Type.STRING } },
                    kegiatanPembelajaran: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                pertemuan: { type: Type.NUMBER },
                                materi: { type: Type.STRING },
                                pendahuluan: { type: Type.ARRAY, items: { type: Type.STRING } },
                                inti: { type: Type.ARRAY, items: { type: Type.STRING } },
                                penutup: { type: Type.ARRAY, items: { type: Type.STRING } },
                            },
                            required: ["pertemuan", "materi", "pendahuluan", "inti", "penutup"]
                        }
                    }
                },
                required: ["tujuanPembelajaran", "pemahamanBermakna", "pertanyaanPemantik", "kegiatanPembelajaran"]
            },
            asesmenPenilaian: {
                type: Type.OBJECT,
                properties: {
                    sikap: { type: Type.STRING },
                    pengetahuan: { type: Type.STRING },
                    keterampilan: { type: Type.STRING },
                },
                required: ["sikap", "pengetahuan", "keterampilan"]
            },
            pengayaanRemedial: {
                type: Type.OBJECT,
                properties: {
                    pengayaan: { type: Type.STRING },
                    remedial: { type: Type.STRING },
                },
                required: ["pengayaan", "remedial"]
            },
            refleksi: {
                type: Type.OBJECT,
                properties: {
                    guru: { type: Type.ARRAY, items: { type: Type.STRING } },
                    siswa: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["guru", "siswa"]
            },
            lampiran: {
                type: Type.OBJECT,
                properties: {
                    lkpd: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                judul: { type: Type.STRING },
                                petunjuk: { type: Type.ARRAY, items: { type: Type.STRING } },
                                tugas: { type: Type.ARRAY, items: { type: Type.STRING } },
                            },
                            required: ["judul", "petunjuk", "tugas"]
                        }
                    },
                    bahanBacaan: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                judul: { type: Type.STRING },
                                konten: { type: Type.STRING },
                            },
                            required: ["judul", "konten"]
                        }
                    },
                    glosarium: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                istilah: { type: Type.STRING },
                                definisi: { type: Type.STRING },
                            },
                            required: ["istilah", "definisi"]
                        }
                    },
                    daftarPustaka: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["lkpd", "bahanBacaan", "glosarium", "daftarPustaka"]
            }
        },
        required: ["informasiUmum", "komponenInti", "asesmenPenilaian", "pengayaanRemedial", "refleksi", "lampiran"]
    };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview", // Use Pro for complex structure
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            },
        });

        const jsonText = response.text.trim();
        const parsed: LessonPlan = deepSanitize(JSON.parse(jsonText));
        return { ...parsed, id: crypto.randomUUID() };
    } catch (error) {
        console.error("Error generating lesson plan:", error);
        throw new Error("Gagal menyusun modul ajar. Silakan coba lagi.");
    }
};

export const generateTeacherNotes = async (lessonPlan: LessonPlan): Promise<TeacherNote[]> => {
    const topic = lessonPlan.informasiUmum.identitasModul.mataPelajaran;
    const meetingDetails = lessonPlan.komponenInti.kegiatanPembelajaran.map(p => `Pertemuan ${p.pertemuan}: ${p.materi}`).join('\n');

    const prompt = `Anda adalah seorang asisten ahli untuk guru.
Berdasarkan Modul Ajar yang telah dibuat untuk topik "${topic}", tolong buatkan "Catatan Penting Guru" (Cheat Sheet) untuk setiap pertemuan berikut:
${meetingDetails}

Kriteria Catatan:
1. Berikan penjelasan konsep kunci, definisi penting, rumus/sifat-sifat (jika eksakta), atau fakta krusial yang harus dikuasai guru saat mengajar materi tersebut.
2. Fokus pada konten esensial materi (Content Knowledge).
3. Buat dalam poin-poin yang padat, jelas, dan akurat secara ilmiah.
4. Sesuaikan kedalaman materi dengan tingkat ${lessonPlan.informasiUmum.identitasModul.faseKelas}.
5. Gunakan format LaTeX untuk rumus matematika atau simbol ilmiah agar terlihat profesional (contoh: $x^2$, $\frac{a}{b}$, $^{n} \log{x}$).

Contoh: Jika materi Logaritma, sertakan definisi, sifat-sifat logaritma (gunakan LaTeX), dan tips mengerjakan.

Kembalikan dalam format JSON array sesuai skema.`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                pertemuan: { type: Type.NUMBER },
                materi: { type: Type.STRING },
                catatan: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["pertemuan", "materi", "catatan"],
        },
    };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            },
        });
        const jsonText = response.text.trim();
        return deepSanitize(JSON.parse(jsonText));
    } catch (error) {
        console.error("Error generating teacher notes:", error);
        throw new Error("Gagal membuat catatan penting guru.");
    }
};

export const generateSpecializedLKPD = async (lp: LessonPlan): Promise<SpecializedLKPD> => {
    const isElementary = lp.informasiUmum.identitasModul.faseKelas.toLowerCase().includes('sd');
    
    const prompt = `Anda adalah guru kreatif dan ahli desain instruksional kurikulum merdeka.
Tugas Anda adalah membuat Lembar Kerja Peserta Didik (LKPD) yang SANGAT MENARIK, AKTIF, dan VISUAL berdasarkan Modul Ajar berikut:

MODUL AJAR:
Topik: ${lp.informasiUmum.identitasModul.mataPelajaran} - ${lp.informasiUmum.identitasModul.faseKelas}
Topik Spesifik: ${lp.informasiUmum.identitasModul.tahunPenyusunan}
Tujuan Pembelajaran: ${lp.komponenInti.tujuanPembelajaran.join('; ')}

INSTRUKSI KHUSUS UNTUK TINGKAT ${isElementary ? 'SD' : 'MENENGAH'}:
${isElementary ? `
- Target adalah siswa SD. Gunakan bahasa yang penuh semangat, sapaan ceria, dan instruksi yang sangat sederhana.
- Fokus pada kegiatan "Learning by Doing" seperti mewarnai, menempel, mengamati sekitar, atau permainan.
- Sisipkan banyak imajinasi visual.
` : `
- Target siswa menengah (SMP/SMA). Gunakan bahasa yang intelektual namun retoris.
- Fokus pada tantangan logika, studi kasus, atau proyek kolaboratif.
- Gunakan diagram konseptual atau Tabel Analisis.
`}

STRUKTUR LKPD YANG DIHARAPKAN:
1. Judul yang menarik (bukan sekadar "LKPD 1").
2. Ringkasan Materi: Menggunakan analogi yang mudah dipahami.
3. Langkah Kegiatan: Minimal 3 tahap kegiatan aktif. Setiap tahap HARUS memiliki "imagePrompt" (deskripsi gambar bahasa inggris) untuk ilustrasi pendukung.
4. Tantangan/Pertanyaan: Minimal 3 pertanyaan yang merangsang rasa ingin tahu (HOTS).
5. Kata-kata penyemangat di bagian kesimpulan.

Image Prompts (Bahasa Inggris): Jelaskan secara detail apa yang harus digambarkan (kartun, diagram, dsb).

Kembalikan TEPAT satu objek JSON sesuai skema SpecializedLKPD.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            judul: { type: Type.STRING },
            identitas: {
                type: Type.OBJECT,
                properties: {
                    mataPelajaran: { type: Type.STRING },
                    kelasSemester: { type: Type.STRING },
                    topik: { type: Type.STRING },
                    alokasiWaktu: { type: Type.STRING },
                },
                required: ["mataPelajaran", "kelasSemester", "topik", "alokasiWaktu"]
            },
            tujuanPembelajaran: { type: Type.ARRAY, items: { type: Type.STRING } },
            materiSingkat: { type: Type.STRING },
            langkahKegiatan: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        tahap: { type: Type.STRING },
                        instruksi: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                    },
                    required: ["tahap", "instruksi"]
                }
            },
            pertanyaanDiskusi: { type: Type.ARRAY, items: { type: Type.STRING } },
            kesimpulan: { type: Type.STRING },
        },
        required: ["judul", "identitas", "tujuanPembelajaran", "materiSingkat", "langkahKegiatan", "pertanyaanDiskusi", "kesimpulan"]
    };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.8,
            },
        });

        const jsonText = response.text.trim();
        const parsed: SpecializedLKPD = deepSanitize(JSON.parse(jsonText));
        
        // Enhance with IDs
        return { ...parsed, id: crypto.randomUUID() };
    } catch (error) {
        console.error("Error generating LKPD:", error);
        throw new Error("Gagal membuat LKPD spesial.");
    }
};
