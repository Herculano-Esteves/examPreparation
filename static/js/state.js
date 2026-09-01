/**
 * state.js
 * --------
 * Single source of truth for application data.
 *
 * Intentionally contains NO DOM references — those live in elements.js (MOD-03).
 * All modules that need both import each separately.
 *
 * Computed getters (totalQuestions, currentQuestion) keep callers clean and
 * ensure the values are always derived from the current State.
 */

import { getInitialLanguage } from './config.js';

export const State = {
    // Active language from configuration / storage
    language: getInitialLanguage(),

    // Current active screen: 'cadeiras' | 'menu' | 'exam' | 'results' | 'addCadeira' | 'addExame' | 'settings'
    currentScreen: 'cadeiras',

    // Loaded list of subjects (cadeiras)
    cadeiras: [],
    localCadeiras: [],
    cadeirasSearch: '',

    // Selected subject
    activeCadeira: null,

    // Loaded list of exams for active subject
    exams: [],
    localExames: [],

    // Currently active exam
    activeExam: null,

    // Exam sorting & global filters
    examSort: 'default', // 'default' | 'score_desc' | 'score_asc' | 'questions_desc' | 'questions_asc' | 'title_asc' | 'title_desc'
    examSearch: '',
    globalQuestionTypes: ['escolha_multipla', 'boolean', 'escrita'],
    examStateFilter: ['completed', 'pending'], // ['completed', 'pending']
    examQuestionsMin: 1,
    examQuestionsMax: null, // dynamically calculated per cadeira
    examScoreMin: 0,
    examScoreMax: 100,
    examFilters: {}, // { [examId]: string[] (excluded types) }
    examHistory: {}, // { [examId]: number[] (array of QuestionStatus: 1=CORRECT, 2=INCORRECT, 3=UNANSWERED) }
    difficultQuestions: {}, // { [examId]: number[] (array of original question indices marked as difficult) }

    // Session answers & progress for active exam:
    // Array of { selectedOptions: number[], writtenInput: string, revealed: boolean, isCorrect: boolean|null }
    examAnswers: [],

    // Current question states
    question: {
        index: 0,
        selectedOptions: [],    // indices of selected options
        revealed: false,        // true once answer has been confirmed/revealed
        writtenInput: '',       // persists textarea content across re-renders
        firstAttemptCorrect: {} // { questionIndex: boolean } — set on first reveal
    },

    // JSON editor / validation state
    jsonValidationErrorLine: -1,
    validatedExamData: null,

    // Settings: remember which screen was active before entering settings
    previousScreenBeforeSettings: null,

    // ---------- Computed properties ----------

    /** Total number of questions in the active exam. */
    get totalQuestions() {
        if (!this.activeExam) return 0;
        const qList = this.activeExam.questions || this.activeExam.perguntas;
        return Array.isArray(qList) ? qList.length : 0;
    },
    set totalQuestions(_) {
        // Safe no-op setter to avoid TypeError in strict mode
    },

    /** The question object currently being shown. */
    get currentQuestion() {
        if (!this.activeExam) return null;
        const qList = this.activeExam.questions || this.activeExam.perguntas;
        if (!Array.isArray(qList)) return null;
        return qList[this.question.index] || null;
    }
};
