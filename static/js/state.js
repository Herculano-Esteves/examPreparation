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

export const State = {
    // Current active screen: 'cadeiras' | 'menu' | 'exam' | 'results' | 'addCadeira' | 'addExame' | 'settings'
    currentScreen: 'cadeiras',

    // Loaded list of subjects (cadeiras)
    cadeiras: [],
    localCadeiras: [],

    // Selected subject
    activeCadeira: null,

    // Loaded list of exams for active subject
    exams: [],
    localExames: [],

    // Currently active exam
    activeExam: null,

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
        return this.activeExam ? this.activeExam.perguntas.length : 0;
    },

    /** The question object currently being shown. */
    get currentQuestion() {
        if (!this.activeExam || !this.activeExam.perguntas) return null;
        return this.activeExam.perguntas[this.question.index];
    }
};
