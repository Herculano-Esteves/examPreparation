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
        selectedOptions: [],  // list of selected numbers (indices)
        revealed: false,      // true if option has been clicked
        firstAttemptCorrect: {} // tracks correct answers on first attempt: { questionIndex: boolean }
    },

    // JSON Validation state
    jsonValidationErrorLine: -1,
    validatedExamData: null,

    previousScreenBeforeSettings: null,

    get totalQuestions() {
        return this.activeExam ? this.activeExam.perguntas.length : 0;
    },

    get currentQuestion() {
        if (!this.activeExam || !this.activeExam.perguntas) return null;
        return this.activeExam.perguntas[this.question.index];
    }
};

// Cached elements selectors resolving elements dynamically to ensure they exist
export const elements = {
    screens: {
        cadeiras: document.getElementById('screen-cadeiras'),
        menu: document.getElementById('screen-menu'),
        exam: document.getElementById('screen-exam'),
        results: document.getElementById('screen-results'),
        addCadeira: document.getElementById('screen-add-cadeira'),
        addExame: document.getElementById('screen-add-exame'),
        settings: document.getElementById('screen-settings')
    },
    cadeirasGrid: document.getElementById('cadeiras-grid'),
    btnBackCadeiras: document.getElementById('btn-back-cadeiras'),
    examsGrid: document.getElementById('exams-grid'),
    currentExamTitle: document.getElementById('current-exam-title'),
    currentExamDesc: document.getElementById('current-exam-desc'),
    questionCounter: document.getElementById('question-counter'),
    progressPercentage: document.getElementById('progress-percentage'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    currentQNum: document.getElementById('current-q-num'),
    questionCabecalho: document.getElementById('question-cabecalho'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    answerFeedback: document.getElementById('answer-feedback'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackMessage: document.getElementById('feedback-message'),
    btnExit: document.getElementById('btn-exit'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnCopy: document.getElementById('btn-copy'),
    btnBackMenu: document.getElementById('btn-back-menu'),
    resultsExamTitle: document.getElementById('results-exam-title'),
    toast: document.getElementById('toast'),
    btnSettings: document.getElementById('btn-settings')
};
