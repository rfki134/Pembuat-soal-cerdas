
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Question, QuestionType } from '../types';
import RefreshIcon from './icons/RefreshIcon';
import Spinner from './Spinner';
import PlusCircleIcon from './icons/PlusCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PhotoIcon from './icons/PhotoIcon';
import { useTranslation } from '../LanguageContext';

interface QuestionCardProps {
  question: Question;
  onRegenerate: (questionId: string) => void;
  isRegenerating: boolean;
  onAddToDocument: (question: Question) => void;
  isAddedToDocument: boolean;
  onGenerateImage: (questionId: string) => void;
  isGeneratingImage: boolean;
}

declare global {
    interface Window {
      MathJax: {
        typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      };
    }
}

const QuestionCard: React.FC<QuestionCardProps> = ({ 
    question, 
    onRegenerate, 
    isRegenerating, 
    onAddToDocument, 
    isAddedToDocument,
    onGenerateImage,
    isGeneratingImage
}) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // Reset answer visibility when the question content changes (e.g., after regenerating)
    setShowAnswer(false);
  }, [question]);

  useEffect(() => {
    // Typeset the entire card whenever the question content changes.
    // This handles initial rendering, regeneration, and answer visibility changes robustly.
    if (window.MathJax && cardRef.current) {
        window.MathJax.typesetPromise([cardRef.current])
            .catch((err) => console.error('MathJax card typesetting error:', err));
    }
  }, [question, showAnswer]); // Rerun if question changes or answer is toggled

  const isMultipleChoice = question.tipe === QuestionType.MultipleChoice;
  const solutionText = question.langkah_langkah_jawaban || '';
  const isNumberedList = /^\s*1\./.test(solutionText);

  // Parse solution steps only if it's a numbered list
  const solutionSteps = isNumberedList
    ? solutionText
        .split(/\s*(?=\d+\.\s*)/)
        .map(step => step.trim())
        .filter(step => {
            const match = step.match(/^\d+\.\s*(.*)/s);
            return match && match[1] && match[1].trim() !== '';
        })
    : [];

  return (
    <div ref={cardRef} className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 shadow-lg transform transition-transform duration-300 hover:scale-[1.02] hover:border-purple-500">
      
      {isRegenerating && (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
          <Spinner className="w-8 h-8"/>
        </div>
      )}

      <div>
        <div className="flex justify-between items-start">
            <div className="flex-grow pr-4">
            <div className="text-lg font-semibold text-slate-200 mb-4 prose prose-invert max-w-none flex items-start gap-2">
                <span className="text-purple-400 font-bold shrink-0">{question.nomor}.</span>
                <div className="flex-1 overflow-x-auto scrollbar-hide py-1">
                    <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[[rehypeKatex, { macros: { "\\indolog": "^{#1}\\log{#2}" } }]]}
                    >
                        {question.pertanyaan}
                    </ReactMarkdown>
                </div>
            </div>
            </div>
            <div className="flex flex-col items-center gap-2 -mt-2 -mr-2">
                <button
                    onClick={() => onAddToDocument(question)}
                    disabled={isAddedToDocument}
                    className="p-2 text-slate-400 transition-colors duration-200 rounded-full hover:bg-slate-700/50 disabled:cursor-not-allowed"
                    title={isAddedToDocument ? t('question_card.added_to_document') : t('question_card.add_to_document')}
                    aria-label={isAddedToDocument ? t('question_card.added_aria_label', {number: question.nomor}) : t('question_card.add_aria_label', {number: question.nomor})}
                >
                    {isAddedToDocument ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : <PlusCircleIcon className="w-5 h-5 hover:text-purple-400"/>}
                </button>
                <button
                    onClick={() => onRegenerate(question.id)}
                    disabled={isRegenerating}
                    className="p-2 text-slate-400 hover:text-purple-400 transition-colors duration-200 rounded-full hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50"
                    title={t('question_card.regenerate_tooltip')}
                    aria-label={t('question_card.regenerate_aria_label', {number: question.nomor})}
                >
                    <RefreshIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Image Section */}
        {question.image_url ? (
            <div className="mb-4 relative group">
                <img src={question.image_url} alt="Question Illustration" className="rounded-lg max-h-64 mx-auto border border-slate-600 shadow-md" />
                <button
                    onClick={() => onGenerateImage(question.id)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-full text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('question_card.regenerate_image')}
                >
                    <RefreshIcon className="w-4 h-4"/>
                </button>
            </div>
        ) : question.image_prompt ? (
            <div className="mb-4 flex justify-center">
                <button
                    onClick={() => onGenerateImage(question.id)}
                    disabled={isGeneratingImage}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md text-sm transition-colors border border-dashed border-slate-500"
                >
                    {isGeneratingImage ? <Spinner className="w-4 h-4" /> : <PhotoIcon className="w-4 h-4" />}
                    {isGeneratingImage ? t('question_card.generating_image') : t('question_card.generate_image')}
                </button>
            </div>
        ) : null}


        {isMultipleChoice && question.pilihan && (
            <div className="space-y-3 mb-4 prose prose-invert max-w-none">
            {question.pilihan.map((option, index) => {
                const isCorrect = option === question.jawaban_benar;
                const optionLetter = String.fromCharCode(97 + index);
                const cleanOption = option.replace(/^[A-Ea-e]\.\s*/, '');

                return (
                <div
                    key={index}
                    className={`p-3 rounded-md text-sm transition-colors duration-300 not-prose flex items-start gap-3 ${
                    showAnswer
                        ? isCorrect
                        ? 'bg-green-500/20 border border-green-500 text-green-300'
                        : 'bg-slate-700/50'
                        : 'bg-slate-700/50 hover:bg-slate-700 cursor-pointer'
                    }`}
                >
                    <span className="font-mono text-purple-400 shrink-0">{optionLetter}.</span>
                    <div className="flex-1 overflow-x-auto scrollbar-hide py-1">
                        <ReactMarkdown 
                            remarkPlugins={[remarkMath]} 
                            rehypePlugins={[[rehypeKatex, { macros: { "\\indolog": "^{#1}\\log{#2}" } }]]}
                        >
                            {cleanOption}
                        </ReactMarkdown>
                    </div>
                </div>
                );
            })}
            </div>
        )}
      </div>


      <div className="mt-4 pt-4 border-t border-slate-700">
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          {showAnswer ? t('question_card.hide_answer') : t('question_card.show_answer')}
        </button>
        {showAnswer && (
          <div className="mt-3 space-y-4">
            <div className="p-4 bg-slate-900/70 rounded-md prose prose-invert max-w-none text-sm text-slate-300">
                <span className="font-bold text-green-400 block mb-1">{t('question_card.answer_label')}: </span>
                <div className="overflow-x-auto scrollbar-hide py-1">
                    <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[[rehypeKatex, { macros: { "\\indolog": "^{#1}\\log{#2}" } }]]}
                    >
                        {isMultipleChoice ? question.jawaban_benar || '' : question.jawaban_esai || ''}
                    </ReactMarkdown>
                </div>
            </div>
            
            {solutionText && (
                <div className="p-4 bg-slate-800/60 rounded-md text-sm text-slate-400 border border-slate-700">
                    <h4 className="font-bold text-yellow-400 text-base mb-3">{t('question_card.solution_label')}:</h4>
                    {isNumberedList ? (
                         <ul className="text-slate-300 prose prose-invert max-w-none">
                            {solutionSteps.map((step, index) => {
                                const match = step.match(/^(\d+\.)\s*(.*)/s);
                                if (!match) return null;

                                const stepNumber = match[1];
                                const stepText = match[2];

                                return (
                                <li key={index} className="flex items-start mb-4 last:mb-0 not-prose gap-3">
                                    <span className="font-bold text-purple-400 shrink-0">{stepNumber}</span>
                                    <div className="flex-1 overflow-x-auto scrollbar-hide py-1">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkMath]} 
                                            rehypePlugins={[[rehypeKatex, { macros: { "\\indolog": "^{#1}\\log{#2}" } }]]}
                                        >
                                            {stepText}
                                        </ReactMarkdown>
                                    </div>
                                </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="text-slate-300 prose prose-invert max-w-none overflow-x-auto scrollbar-hide py-1">
                           <ReactMarkdown 
                               remarkPlugins={[remarkMath]} 
                               rehypePlugins={[[rehypeKatex, { macros: { "\\indolog": "^{#1}\\log{#2}" } }]]}
                           >
                               {solutionText}
                           </ReactMarkdown>
                        </div>
                    )}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
