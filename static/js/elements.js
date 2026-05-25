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

    // ---------- Navigation grids ----------
    cadeirasGrid:    document.getElementById('cadeiras-grid'),
    btnBackCadeiras: document.getElementById('btn-back-cadeiras'),
    examsGrid:       document.getElementById('exams-grid'),

    // ---------- Exam top bar ----------
    currentExamTitle:   document.getElementById('current-exam-title'),
    questionCounter:    document.getElementById('question-counter'),
    progressPercentage: document.getElementById('progress-percentage'),
    progressBarFill:    document.getElementById('progress-bar-fill'),

    // ---------- Question pane ----------
    currentQNum:        document.getElementById('current-q-num'),
    questionCabecalho:  document.getElementById('question-cabecalho'),
    questionText:       document.getElementById('question-text'),
    optionsContainer:   document.getElementById('options-container'),

    // ---------- Feedback ----------
    answerFeedback:  document.getElementById('answer-feedback'),
    feedbackTitle:   document.getElementById('feedback-title'),
    feedbackMessage: document.getElementById('feedback-message'),

    // ---------- Buttons ----------
    btnExit:     document.getElementById('btn-exit'),
    btnPrev:     document.getElementById('btn-prev'),
    btnNext:     document.getElementById('btn-next'),
    btnCopy:     document.getElementById('btn-copy'),
    btnBackMenu: document.getElementById('btn-back-menu'),
    btnSettings: document.getElementById('btn-settings'),

    // ---------- Results screen ----------
    resultsExamTitle: document.getElementById('results-exam-title'),

    // ---------- Notifications ----------
    toast: document.getElementById('toast')
};
