
import React from 'react';
import { Difficulty, QuestionType } from '../types';
import Spinner from './Spinner';
import { useTranslation } from '../LanguageContext';

interface QuizFormProps {
    subject: string;
    setSubject: (value: string) => void;
    numberOfQuestionsToGenerate: number;
    setNumberOfQuestionsToGenerate: (value: number) => void;
    gradeLevel: string;
    setGradeLevel: (value: string) => void;
    difficulty: Difficulty;
    setDifficulty: (value: Difficulty) => void;
    questionType: QuestionType;
    setQuestionType: (value: QuestionType) => void;
    numberOfChoices: number;
    setNumberOfChoices: (value: number) => void;
    isHOTS: boolean;
    setIsHOTS: (value: boolean) => void;
    onSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
}

const OptionButton: React.FC<{
    value: string | number;
    label: string;
    selectedValue: string | number;
    onClick: (value: any) => void;
}> = ({ value, label, selectedValue, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(value)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex-1
        ${selectedValue === value
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
    >
        {label}
    </button>
);

const gradeLevelOptions = [
    { value: "PAUD / TK", labelKey: "grade_levels.preschool" },
    { value: "Kelas 1 SD", labelKey: "grade_levels.grade_1" },
    { value: "Kelas 2 SD", labelKey: "grade_levels.grade_2" },
    { value: "Kelas 3 SD", labelKey: "grade_levels.grade_3" },
    { value: "Kelas 4 SD", labelKey: "grade_levels.grade_4" },
    { value: "Kelas 5 SD", labelKey: "grade_levels.grade_5" },
    { value: "Kelas 6 SD", labelKey: "grade_levels.grade_6" },
    { value: "Kelas 7 SMP", labelKey: "grade_levels.grade_7" },
    { value: "Kelas 8 SMP", labelKey: "grade_levels.grade_8" },
    { value: "Kelas 9 SMP", labelKey: "grade_levels.grade_9" },
    { value: "Kelas 10 SMA", labelKey: "grade_levels.grade_10" },
    { value: "Kelas 11 SMA", labelKey: "grade_levels.grade_11" },
    { value: "Kelas 12 SMA", labelKey: "grade_levels.grade_12" },
    { value: "Mahasiswa", labelKey: "grade_levels.university" },
    { value: "Umum", labelKey: "grade_levels.general" },
];


const QuizForm: React.FC<QuizFormProps> = ({
    subject,
    setSubject,
    numberOfQuestionsToGenerate,
    setNumberOfQuestionsToGenerate,
    gradeLevel,
    setGradeLevel,
    difficulty,
    setDifficulty,
    questionType,
    setQuestionType,
    numberOfChoices,
    setNumberOfChoices,
    isHOTS,
    setIsHOTS,
    onSubmit,
    isLoading
}) => {
    const { t } = useTranslation();

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            // Temporarily set to 0 to represent empty state in number type input
            setNumberOfQuestionsToGenerate(0);
            return;
        }

        const num = parseInt(value, 10);
        if (num > 50) {
            setNumberOfQuestionsToGenerate(50);
        } else {
            setNumberOfQuestionsToGenerate(num);
        }
    };

    const handleNumberBlur = () => {
        if (numberOfQuestionsToGenerate < 1) {
            setNumberOfQuestionsToGenerate(1);
        }
    };

    return (
        <form onSubmit={onSubmit} className="w-full max-w-2xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                    <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-2">
                        {t('quiz_generator.subject_label')}
                    </label>
                    <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t('quiz_generator.subject_placeholder')}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="numberOfQuestions" className="block text-sm font-medium text-slate-300 mb-2">
                        {t('quiz_generator.number_of_questions_label')}
                    </label>
                    <input
                        type="number"
                        id="numberOfQuestions"
                        value={numberOfQuestionsToGenerate === 0 ? '' : numberOfQuestionsToGenerate}
                        onChange={handleNumberChange}
                        onBlur={handleNumberBlur}
                        min="1"
                        max="50"
                        className={`w-full bg-slate-800 border rounded-md px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none transition ${numberOfQuestionsToGenerate < 1 ? 'border-red-500 focus:border-red-500' : 'border-slate-600 focus:border-purple-500'}`}
                        required
                    />
                    {numberOfQuestionsToGenerate < 1 && (
                         <p className="text-red-400 text-xs mt-1">{t('quiz_generator.min_question_warning')}</p>
                    )}
                </div>
            </div>


            <div>
                <label htmlFor="gradeLevel" className="block text-sm font-medium text-slate-300 mb-2">
                    {t('quiz_generator.grade_level_label')}
                </label>
                <select
                    id="gradeLevel"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                    {gradeLevelOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('quiz_generator.difficulty_label')}</label>
                <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
                    <OptionButton value={Difficulty.Easy} label={t('quiz_generator.difficulty_easy')} selectedValue={difficulty} onClick={setDifficulty} />
                    <OptionButton value={Difficulty.Medium} label={t('quiz_generator.difficulty_medium')} selectedValue={difficulty} onClick={setDifficulty} />
                    <OptionButton value={Difficulty.Hard} label={t('quiz_generator.difficulty_hard')} selectedValue={difficulty} onClick={setDifficulty} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('quiz_generator.question_type_label')}</label>
                <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
                    <OptionButton value={QuestionType.MultipleChoice} label={t('quiz_generator.question_type_mc')} selectedValue={questionType} onClick={setQuestionType} />
                    <OptionButton value={QuestionType.Essay} label={t('quiz_generator.question_type_essay')} selectedValue={questionType} onClick={setQuestionType} />
                </div>
            </div>

            {questionType === QuestionType.MultipleChoice && (
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{t('quiz_generator.choices_label')}</label>
                    <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
                        <OptionButton value={4} label={t('quiz_generator.choices_4')} selectedValue={numberOfChoices} onClick={setNumberOfChoices} />
                        <OptionButton value={5} label={t('quiz_generator.choices_5')} selectedValue={numberOfChoices} onClick={setNumberOfChoices} />
                    </div>
                </div>
            )}

            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center">
                    <input
                        id="hots-checkbox"
                        type="checkbox"
                        checked={isHOTS}
                        onChange={(e) => setIsHOTS(e.target.checked)}
                        className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-2 focus:ring-offset-0 focus:ring-offset-slate-800 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="hots-checkbox" className="ml-3 text-sm font-medium text-slate-200 cursor-pointer">
                        {t('quiz_generator.hots_label')}
                    </label>
                </div>
            </div>


            <button
                type="submit"
                disabled={isLoading || !subject.trim() || numberOfQuestionsToGenerate < 1}
                className="w-full flex justify-center items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
            >
                {isLoading ? <Spinner /> : t('quiz_generator.submit_button')}
            </button>
        </form>
    );
};

export default QuizForm;
