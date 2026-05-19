
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Difficulty, QuestionType, Question } from './types';
import { generateQuiz, addMoreQuizQuestions, regenerateSingleQuestion, generateQuestionImage, extractQuestionsFromText } from './services/geminiService';
import QuizForm from './components/QuizForm';
import FileUpload from './components/FileUpload';
import QuestionCard from './components/QuestionCard';
import SparklesIcon from './components/icons/SparklesIcon';
import Spinner from './components/Spinner';
import DocumentPanel from './components/DocumentPanel';
import FloatingActionButton from './components/FloatingActionButton';
import ChevronLeftIcon from './components/icons/ChevronLeftIcon';
import { useTranslation } from './LanguageContext';


declare global {
    interface Window {
      MathJax: {
        typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      };
    }
}

interface QuizGeneratorProps {
    onNavigateBack: () => void;
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onNavigateBack }) => {
    const { t, language } = useTranslation();
    const [subject, setSubject] = useState('');
    const [gradeLevel, setGradeLevel] = useState<string>('Umum');
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
    const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MultipleChoice);
    const [numberOfChoices, setNumberOfChoices] = useState<number>(4);
    const [numberOfQuestionsToGenerate, setNumberOfQuestionsToGenerate] = useState<number>(5);
    const [isHOTS, setIsHOTS] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddingMore, setIsAddingMore] = useState(false);
    const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
    const [generatingImageQuestionId, setGeneratingImageQuestionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [documentQuestions, setDocumentQuestions] = useState<Question[]>([]);
    const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(false);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const questionsContainerRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (window.MathJax && subtitleRef.current) {
          window.MathJax.typesetPromise([subtitleRef.current])
            .catch((err) => console.error('MathJax subtitle typesetting error:', err));
        }
    }, [t]);


    const handleGenerateQuiz = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!subject.trim()) {
            setError(t('quiz_generator.error_empty_subject'));
            return;
        }

        setIsLoading(true);
        setError(null);
        setQuestions([]);

        try {
            const generatedQuestions = await generateQuiz(subject, difficulty, questionType, numberOfChoices, language, gradeLevel, isHOTS, numberOfQuestionsToGenerate);
            setQuestions(generatedQuestions);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('quiz_generator.error_unknown'));
        } finally {
            setIsLoading(false);
        }
    }, [subject, difficulty, questionType, numberOfChoices, t, language, gradeLevel, isHOTS, numberOfQuestionsToGenerate]);

    const handleAddMore = useCallback(async () => {
        setIsAddingMore(true);
        setError(null);
        try {
            const newQuestions = await addMoreQuizQuestions(subject, difficulty, questionType, numberOfChoices, questions, language, gradeLevel, isHOTS, numberOfQuestionsToGenerate);
            const renumberedNewQuestions = newQuestions.map((q, index) => ({
                ...q,
                nomor: questions.length + index + 1,
            }));
            setQuestions(prev => [...prev, ...renumberedNewQuestions]);
        } catch (err)
 {
            setError(err instanceof Error ? err.message : t('quiz_generator.error_add_more'));
        } finally {
            setIsAddingMore(false);
            setTimeout(() => {
                questionsContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    }, [subject, difficulty, questionType, numberOfChoices, questions, t, language, gradeLevel, isHOTS, numberOfQuestionsToGenerate]);

    const handleRegenerateQuestion = useCallback(async (questionId: string) => {
        const questionToReplace = questions.find(q => q.id === questionId);
        if (!questionToReplace) return;

        setRegeneratingQuestionId(questionId);
        setError(null);
        try {
            const newContentQuestion = await regenerateSingleQuestion(subject, difficulty, questionType, numberOfChoices, questions, questionToReplace, language, gradeLevel, isHOTS);
            
            const newQuestion: Question = {
                ...newContentQuestion,
                id: questionId,
                nomor: questionToReplace.nomor,
            };

            setQuestions(prevQuestions => 
                prevQuestions.map(q => q.id === questionId ? newQuestion : q)
            );
             setDocumentQuestions(prevDocQuestions =>
                prevDocQuestions.map(q => q.id === questionId ? newQuestion : q)
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : t('quiz_generator.error_regenerate'));
        } finally {
            setRegeneratingQuestionId(null);
        }
    }, [subject, difficulty, questionType, numberOfChoices, questions, t, language, gradeLevel, isHOTS]);

    const handleGenerateImage = useCallback(async (questionId: string) => {
        const question = questions.find(q => q.id === questionId);
        if (!question || !question.image_prompt) return;

        setGeneratingImageQuestionId(questionId);
        setError(null);

        try {
            const imageUrl = await generateQuestionImage(question.image_prompt);
            
            setQuestions(prev => prev.map(q => 
                q.id === questionId ? { ...q, image_url: imageUrl } : q
            ));
            
            setDocumentQuestions(prev => prev.map(q => 
                q.id === questionId ? { ...q, image_url: imageUrl } : q
            ));

        } catch (err) {
            console.error(err);
            // Optionally set error specific to image generation
        } finally {
            setGeneratingImageQuestionId(null);
        }
    }, [questions]);

    const handleAddQuestionToDocument = useCallback((question: Question) => {
        setDocumentQuestions(prev => {
            if (prev.some(q => q.id === question.id)) {
                return prev;
            }
            return [...prev, question];
        });
    }, []);

    const handleRemoveQuestionFromDocument = useCallback((questionId: string) => {
        setDocumentQuestions(prev => prev.filter(q => q.id !== questionId));
    }, []);

    const handleClearDocument = useCallback(() => {
        setDocumentQuestions([]);
    }, []);

    const isAllSelected = questions.length > 0 && questions.every(q => documentQuestions.some(docQ => docQ.id === q.id));

    const handleSelectAllToggle = useCallback(() => {
        const currentQuestionIds = new Set(questions.map(q => q.id));
    
        if (isAllSelected) {
            setDocumentQuestions(prev => prev.filter(docQ => !currentQuestionIds.has(docQ.id)));
        } else {
            setDocumentQuestions(prev => {
                const existingIds = new Set(prev.map(q => q.id));
                const newQuestionsToAdd = questions.filter(q => !existingIds.has(q.id));
                return [...prev, ...newQuestionsToAdd];
            });
        }
    }, [isAllSelected, questions]);

    const handleFileUpload = useCallback(async (text: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const extractedData = await extractQuestionsFromText(text, language);
            
            // Set subject if currently empty
            if (!subject.trim()) {
                setSubject(extractedData.title);
            }

            setQuestions(prev => {
                const startNum = prev.length;
                const renumbered = extractedData.questions.map((q, index) => ({
                    ...q,
                    nomor: startNum + index + 1
                }));
                return [...prev, ...renumbered];
            });
            
            // Auto add to document as requested
            setDocumentQuestions(prev => {
                const existingIds = new Set(prev.map(q => q.id));
                const newOnes = extractedData.questions.filter(q => !existingIds.has(q.id));
                return [...prev, ...newOnes];
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal mengekstrak soal.");
        } finally {
            setIsLoading(false);
        }
    }, [language, subject]);


    return (
        <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <main className="max-w-4xl mx-auto flex flex-col items-center space-y-10">
                <div className="w-full flex justify-between items-center">
                    <button onClick={onNavigateBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                        <ChevronLeftIcon className="w-4 h-4" />
                        {t('back_to_home')}
                    </button>
                </div>
                
                <header className="text-center -mt-12">
                    <div className="inline-flex items-center justify-center gap-3 mb-2">
                         <SparklesIcon className="w-8 h-8 text-purple-400" />
                         <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                            {t('quiz_generator.title')}
                        </h1>
                    </div>
                    <p ref={subtitleRef} className="text-slate-400 max-w-2xl">
                        {t('quiz_generator.description')}
                    </p>
                </header>

                <div className="w-full p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl relative">
                    <div className="absolute top-4 right-4 z-10">
                        <FileUpload 
                            onQuestionsExtracted={handleFileUpload}
                            isLoading={isLoading}
                        />
                    </div>
                    
                    <QuizForm
                        subject={subject}
                        setSubject={setSubject}
                        numberOfQuestionsToGenerate={numberOfQuestionsToGenerate}
                        setNumberOfQuestionsToGenerate={setNumberOfQuestionsToGenerate}
                        gradeLevel={gradeLevel}
                        setGradeLevel={setGradeLevel}
                        difficulty={difficulty}
                        setDifficulty={setDifficulty}
                        questionType={questionType}
                        setQuestionType={setQuestionType}
                        numberOfChoices={numberOfChoices}
                        setNumberOfChoices={setNumberOfChoices}
                        isHOTS={isHOTS}
                        setIsHOTS={setIsHOTS}
                        onSubmit={handleGenerateQuiz}
                        isLoading={isLoading}
                    />
                </div>
                
                {error && (
                    <div className="w-full max-w-2xl p-4 text-center bg-red-500/20 border border-red-500 text-red-300 rounded-lg">
                        <p><span className="font-bold">Oops!</span> {error}</p>
                    </div>
                )}
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center space-y-3 p-8">
                        <div className="w-10 h-10 border-4 border-t-transparent border-purple-500 rounded-full animate-spin"></div>
                        <p className="text-slate-400">{t('quiz_generator.loading_message')}</p>
                    </div>
                )}

                {questions.length > 0 && (
                    <div ref={questionsContainerRef} className="w-full space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-200">{t('quiz_generator.results_title')}</h2>
                             <div className="flex items-center gap-2">
                                <label htmlFor="selectAll" className="text-sm text-slate-300 select-none cursor-pointer">
                                    {t('quiz_generator.select_all')}
                                </label>
                                <input
                                    type="checkbox"
                                    id="selectAll"
                                    checked={isAllSelected}
                                    onChange={handleSelectAllToggle}
                                    className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-2 focus:ring-offset-0 focus:ring-offset-slate-800 focus:ring-purple-500 cursor-pointer"
                                />
                            </div>
                        </div>
                        {questions.map((q) => (
                           <QuestionCard 
                            key={q.id} 
                            question={q} 
                            onRegenerate={handleRegenerateQuestion}
                            isRegenerating={regeneratingQuestionId === q.id}
                            onAddToDocument={handleAddQuestionToDocument}
                            isAddedToDocument={documentQuestions.some(docQ => docQ.id === q.id)}
                            onGenerateImage={handleGenerateImage}
                            isGeneratingImage={generatingImageQuestionId === q.id}
                           />
                        ))}

                        {!isLoading && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={handleAddMore}
                                    disabled={isAddingMore}
                                    className="flex items-center justify-center gap-2 px-6 py-3 border border-purple-500 text-purple-400 font-semibold rounded-lg transition-all duration-300 hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAddingMore ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
                                    {isAddingMore ? t('quiz_generator.adding_more') : t('quiz_generator.add_more_button', { count: numberOfQuestionsToGenerate })}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {questions.length > 0 && (
                <FloatingActionButton
                    count={documentQuestions.length}
                    onClick={() => setIsDocumentPanelOpen(true)}
                />
            )}

            <DocumentPanel
                isOpen={isDocumentPanelOpen}
                onClose={() => setIsDocumentPanelOpen(false)}
                questions={documentQuestions}
                onRemove={handleRemoveQuestionFromDocument}
                onClear={handleClearDocument}
                subject={subject}
            />
        </div>
    );
};

export default QuizGenerator;
