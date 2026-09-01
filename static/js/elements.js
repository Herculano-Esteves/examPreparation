/**
 * elements.js
 * -----------
 * Centralised, dynamic accessors for DOM element references.
 * Implemented using getter accessors so element lookups always return live DOM
 * nodes without throwing early-evaluation or stale reference errors.
 *
 * Separated from state.js (MOD-03) so that pure application data and DOM
 * references have distinct, single-purpose modules.
 *
 * Rule: never add business logic here — only getElementById / querySelector.
 */

export const elements = {
    // ---------- Screen containers ----------
    get screens() {
        return {
            cadeiras:   document.getElementById('screen-cadeiras'),
            menu:       document.getElementById('screen-menu'),
            exam:       document.getElementById('screen-exam'),
            results:    document.getElementById('screen-results'),
            addCadeira: document.getElementById('screen-add-cadeira'),
            addExame:   document.getElementById('screen-add-exame'),
            settings:   document.getElementById('screen-settings')
        };
    },

    // ---------- Navigation grids & Floating Filters ----------
    get cadeirasGrid()              { return document.getElementById('cadeiras-grid'); },
    get btnBackCadeiras()           { return document.getElementById('btn-back-cadeiras'); },
    get searchCadeiras()            { return document.getElementById('search-cadeiras'); },
    get btnClearCadeiraSearch()     { return document.getElementById('btn-clear-cadeira-search'); },
    get examsGrid()                 { return document.getElementById('exams-grid'); },
    get examsSidebarFilters()       { return document.getElementById('exams-sidebar-filters'); },
    get filterExamSearch()          { return document.getElementById('filter-exam-search'); },
    get btnClearExamSearch()        { return document.getElementById('btn-clear-exam-search'); },
    get sortDropdown()              { return document.getElementById('sort-dropdown'); },
    get sortDropdownTrigger()       { return document.getElementById('sort-dropdown-trigger'); },
    get sortDropdownSelectedLabel() { return document.getElementById('sort-dropdown-selected-label'); },
    get sortDropdownMenu()          { return document.getElementById('sort-dropdown-menu'); },
    get btnResetGlobalFilters()     { return document.getElementById('btn-reset-global-filters'); },
    get floatingFilterCountText()   { return document.getElementById('floating-filter-count-text'); },
    get filterStateCompleted()      { return document.getElementById('filter-state-completed'); },
    get filterStatePending()        { return document.getElementById('filter-state-pending'); },
    get filterQuestionsMin()        { return document.getElementById('filter-questions-min'); },
    get filterQuestionsMax()        { return document.getElementById('filter-questions-max'); },
    get sliderQuestionsMin()        { return document.getElementById('slider-questions-min'); },
    get sliderQuestionsMax()        { return document.getElementById('slider-questions-max'); },
    get trackFillQuestions()        { return document.getElementById('track-fill-questions'); },
    get filterScoreMin()            { return document.getElementById('filter-score-min'); },
    get filterScoreMax()            { return document.getElementById('filter-score-max'); },
    get sliderScoreMin()            { return document.getElementById('slider-score-min'); },
    get sliderScoreMax()            { return document.getElementById('slider-score-max'); },
    get trackFillScore()            { return document.getElementById('track-fill-score'); },

    // ---------- Exam top bar & Sub bar ----------
    get examTopBar()                { return document.getElementById('exam-top-bar'); },
    get currentExamTitle()          { return document.getElementById('current-exam-title'); },
    get questionCounter()           { return document.getElementById('question-counter'); },
    get progressPercentage()        { return document.getElementById('progress-percentage'); },
    get progressBarFill()           { return document.getElementById('progress-bar-fill'); },
    get btnToggleDifficult()        { return document.getElementById('btn-toggle-difficult'); },
    get btnToggleDifficultText()    { return document.getElementById('btn-toggle-difficult-text'); },

    // ---------- Question pane ----------
    get leftScrollContent()         { return document.getElementById('exam-left-scroll-content') || document.querySelector('.exam-left-scroll-content'); },
    get rightScrollContent()        { return document.getElementById('exam-right-scroll-content') || document.querySelector('.exam-right-scroll-content'); },
    get leftPaneSpacer()            { return document.getElementById('left-pane-spacer'); },
    get rightPaneSpacer()           { return document.getElementById('right-pane-spacer'); },
    get leftPaneContent()           { return document.getElementById('left-pane-content'); },
    get rightPaneContent()          { return document.getElementById('right-pane-content'); },
    get currentQNum()               { return document.getElementById('current-q-num'); },
    get questionCabecalho()         { return document.getElementById('question-cabecalho'); },
    get questionText()              { return document.getElementById('question-text-content') || document.getElementById('question-text'); },
    get optionsContainer()          { return document.getElementById('options-container'); },

    // ---------- Feedback ----------
    get answerFeedback()            { return document.getElementById('answer-feedback'); },
    get feedbackTitle()             { return document.getElementById('feedback-title'); },
    get feedbackMessage()           { return document.getElementById('feedback-message'); },

    // ---------- Buttons ----------
    get btnExit()                   { return document.getElementById('btn-exit'); },
    get btnPrev()                   { return document.getElementById('btn-prev'); },
    get btnNext()                   { return document.getElementById('btn-next'); },
    get btnCopy()                   { return document.getElementById('btn-copy'); },
    get btnCopyAnswer()             { return document.getElementById('btn-copy-answer'); },
    get btnBackMenu()               { return document.getElementById('btn-back-menu'); },
    get btnResumeExam()             { return document.getElementById('btn-resume-exam'); },
    get btnSettings()               { return document.getElementById('btn-settings'); },

    // ---------- Results screen ----------
    get resultsExamTitle()          { return document.getElementById('results-exam-title'); },
    get resultsScorePercentage()    { return document.getElementById('results-score-percentage'); },
    get resultsCorrectCount()       { return document.getElementById('results-correct-count'); },
    get resultsIncorrectCount()     { return document.getElementById('results-incorrect-count'); },
    get resultsUnansweredCount()    { return document.getElementById('results-unanswered-count'); },
    get resultsFeedbackMessage()    { return document.getElementById('results-feedback-message'); },

    // ---------- Notifications ----------
    get toast()                     { return document.getElementById('toast'); }
};
