/**
 * elements.js
 * -----------
 * Centralised cache of DOM element references.
 * Resolved once at module load time (after DOMContentLoaded fires, since
 * this module is loaded as type="module" which is deferred by default).
 *
 * Separated from state.js (MOD-03) so that pure application data and DOM
 * references have distinct, single-purpose modules.
 *
 * Rule: never add business logic here — only getElementById / querySelector.
 */

export const elements = {
    // ---------- Screen containers ----------
    screens: {
        cadeiras:   document.getElementById('screen-cadeiras'),
        menu:       document.getElementById('screen-menu'),
        exam:       document.getElementById('screen-exam'),
        results:    document.getElementById('screen-results'),
        addCadeira: document.getElementById('screen-add-cadeira'),
        addExame:   document.getElementById('screen-add-exame'),
        settings:   document.getElementById('screen-settings')
    },

    // ---------- Navigation grids & Floating Filters ----------
    cadeirasGrid:               document.getElementById('cadeiras-grid'),
    btnBackCadeiras:            document.getElementById('btn-back-cadeiras'),
    searchCadeiras:             document.getElementById('search-cadeiras'),
    btnClearCadeiraSearch:      document.getElementById('btn-clear-cadeira-search'),
    examsGrid:                  document.getElementById('exams-grid'),
    examsSidebarFilters:        document.getElementById('exams-sidebar-filters'),
    filterExamSearch:           document.getElementById('filter-exam-search'),
    btnClearExamSearch:         document.getElementById('btn-clear-exam-search'),
    sortDropdown:               document.getElementById('sort-dropdown'),
    sortDropdownTrigger:        document.getElementById('sort-dropdown-trigger'),
    sortDropdownSelectedLabel:  document.getElementById('sort-dropdown-selected-label'),
    sortDropdownMenu:           document.getElementById('sort-dropdown-menu'),
    btnResetGlobalFilters:      document.getElementById('btn-reset-global-filters'),
    floatingFilterCountText:    document.getElementById('floating-filter-count-text'),
    filterStateCompleted:       document.getElementById('filter-state-completed'),
    filterStatePending:         document.getElementById('filter-state-pending'),
    filterQuestionsMin:         document.getElementById('filter-questions-min'),
    filterQuestionsMax:         document.getElementById('filter-questions-max'),
    sliderQuestionsMin:         document.getElementById('slider-questions-min'),
    sliderQuestionsMax:         document.getElementById('slider-questions-max'),
    trackFillQuestions:         document.getElementById('track-fill-questions'),
    filterScoreMin:             document.getElementById('filter-score-min'),
    filterScoreMax:             document.getElementById('filter-score-max'),
    sliderScoreMin:             document.getElementById('slider-score-min'),
    sliderScoreMax:             document.getElementById('slider-score-max'),
    trackFillScore:             document.getElementById('track-fill-score'),

    // ---------- Exam top bar ----------
    currentExamTitle:   document.getElementById('current-exam-title'),
    questionCounter:    document.getElementById('question-counter'),
    progressPercentage: document.getElementById('progress-percentage'),
    progressBarFill:    document.getElementById('progress-bar-fill'),

    // ---------- Question pane ----------
    currentQNum:        document.getElementById('current-q-num'),
    questionCabecalho:  document.getElementById('question-cabecalho'),
    questionText:       document.getElementById('question-text-content') || document.getElementById('question-text'),
    optionsContainer:   document.getElementById('options-container'),

    // ---------- Feedback ----------
    answerFeedback:  document.getElementById('answer-feedback'),
    feedbackTitle:   document.getElementById('feedback-title'),
    feedbackMessage: document.getElementById('feedback-message'),

    // ---------- Buttons ----------
    btnExit:       document.getElementById('btn-exit'),
    btnPrev:       document.getElementById('btn-prev'),
    btnNext:       document.getElementById('btn-next'),
    btnCopy:       document.getElementById('btn-copy'),
    btnCopyAnswer: document.getElementById('btn-copy-answer'),
    btnBackMenu:   document.getElementById('btn-back-menu'),
    btnResumeExam: document.getElementById('btn-resume-exam'),
    btnSettings:   document.getElementById('btn-settings'),

    // ---------- Results screen ----------
    resultsExamTitle:        document.getElementById('results-exam-title'),
    resultsScorePercentage:  document.getElementById('results-score-percentage'),
    resultsCorrectCount:     document.getElementById('results-correct-count'),
    resultsIncorrectCount:   document.getElementById('results-incorrect-count'),
    resultsUnansweredCount:  document.getElementById('results-unanswered-count'),
    resultsFeedbackMessage:  document.getElementById('results-feedback-message'),

    // ---------- Notifications ----------
    toast: document.getElementById('toast')
};
