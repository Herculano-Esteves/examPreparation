/**
 * question.js
 * -----------
 * Exam question lifecycle coordinator module.
 * Coordinates question rendering, split-pane layout syncing, navigation,
 * and delegates sub-rendering, answering, and results to focused submodules.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { getLocalizedText, showToast, NotificationType } from './utils.js';
import { renderMarkdown, renderMath } from './renderer.js';
import { toggleDifficultQuestion, isQuestionDifficult } from './storage.js';
import { t } from './i18n.js';
import { Events, APP_EVENTS } from './events.js';
import { syncExamSplitLayout } from './layout.js';

import { renderWrittenQuestionUI, renderChoiceQuestionUI, renderFeedbackUI } from './questions/questionUI.js';
import { selectOption, confirmMultipleChoiceAnswer, revealWrittenAnswer, assessWrittenAnswer } from './questions/questionEvaluation.js';
import { showResults } from './questions/questionResults.js';

export {
    renderWrittenQuestionUI,
    renderChoiceQuestionUI,
    renderFeedbackUI,
    selectOption,
    confirmMultipleChoiceAnswer,
    revealWrittenAnswer,
    assessWrittenAnswer,
    showResults
};

// ---------------------------------------------------------------------------
// Main question renderer
// ---------------------------------------------------------------------------

/**
 * Renders the current question into the exam pane.
 */
export function renderQuestion() {
    const q = State.currentQuestion;
    if (!q) return;

    const questionsList = State.activeExam ? (State.activeExam.questions || State.activeExam.perguntas || []) : [];

    // Garantir integridade do array de respostas da sessão
    if (!State.examAnswers || State.examAnswers.length !== State.totalQuestions) {
        State.examAnswers = questionsList.map(() => ({
            selectedOptions: [],
            writtenInput: '',
            revealed: false,
            isCorrect: null
        }));
    }

    // Carregar o estado guardado desta pergunta na sessão
    const saved = State.examAnswers[State.question.index];
    if (saved) {
        State.question.selectedOptions = saved.selectedOptions || [];
        State.question.writtenInput    = saved.writtenInput || '';
        State.question.revealed        = saved.revealed || false;
    }

    // --- Top bar progress & Title ---
    if (State.activeExam && elements.currentExamTitle) {
        elements.currentExamTitle.textContent = getLocalizedText(State.activeExam.title || State.activeExam.titulo);
    }

    elements.questionCounter.textContent = t('question_counter', {
        current: State.question.index + 1,
        total: State.totalQuestions
    });
    if (elements.currentQNum) {
        elements.currentQNum.textContent = State.question.index + 1;
    }

    const progressVal = ((State.question.index + 1) / State.totalQuestions) * 100;
    elements.progressPercentage.textContent = `${Math.round(progressVal)}%`;
    elements.progressBarFill.style.width = `${progressVal}%`;
    const progressBarContainer = document.querySelector('.progress-bar-bg-mini');
    if (progressBarContainer) {
        progressBarContainer.setAttribute('aria-valuenow', Math.round(progressVal));
    }

    // --- Question text ---
    elements.questionText.textContent = getLocalizedText(q.question || q.pergunta);

    // --- Header / Cabecalho (optional scenario block) ---
    const headerText = getLocalizedText(q.header || q.cabecalho);
    if (headerText) {
        elements.questionCabecalho.innerHTML = renderMarkdown(headerText, true);
        elements.questionCabecalho.classList.remove('hidden');
    } else {
        elements.questionCabecalho.innerHTML = '';
        elements.questionCabecalho.classList.add('hidden');
    }

    // --- Options / answer UI ---
    elements.optionsContainer.innerHTML = '';

    const qType = q.type || q.tipo;
    if (qType === 'escrita') {
        renderWrittenQuestionUI(q);
    } else {
        renderChoiceQuestionUI(q);
    }

    renderFeedbackUI(q);

    // --- Difficult question flag button ---
    updateQuestionDifficultButton(q);

    // --- Navigation buttons ---
    elements.btnPrev.disabled = State.question.index === 0;
    elements.btnPrev.innerHTML = `<i class="fa-solid fa-chevron-left" aria-hidden="true"></i> <span>${t('btn_prev')}</span>`;
    
    elements.btnNext.disabled = false;

    if (State.question.index === State.totalQuestions - 1) {
        elements.btnNext.innerHTML =
            `<span>${t('btn_finish')}</span> <i class="fa-solid fa-flag-checkered" aria-hidden="true"></i>`;
    } else {
        elements.btnNext.innerHTML =
            `<span>${t('btn_next')}</span> <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>`;
    }

    renderMath();
    syncExamSplitLayout();
}

// ---------------------------------------------------------------------------
// Difficulty Toggle Management
// ---------------------------------------------------------------------------

let difficultListenerInitialized = false;

function initDifficultToggleListener() {
    if (difficultListenerInitialized) return;
    const btn = elements.btnToggleDifficult;
    if (!btn) return;
    difficultListenerInitialized = true;

    btn.addEventListener('click', () => {
        if (!State.activeExam) return;
        const q = State.currentQuestion;
        if (!q) return;
        const origIndex = (q._origIndex !== undefined) ? q._origIndex : State.question.index;
        const targetExamId = q._sourceExamId || State.activeExam.id;
        const isDiff = toggleDifficultQuestion(targetExamId, origIndex, State);
        
        updateDifficultButtonUI(isDiff);

        if (isDiff) {
            showToast(t('toast_question_marked_difficult'), NotificationType.SUCCESS);
        } else {
            showToast(t('toast_question_unmarked_difficult'), NotificationType.INFO);
        }

        Events.emit(APP_EVENTS.QUESTION_DIFFICULT_TOGGLED, {
            examId: targetExamId,
            origIndex,
            isDifficult: isDiff
        });
    });
}

/**
 * Updates the difficult question button state for the active question.
 * @param {object} q - Current question object
 */
export function updateQuestionDifficultButton(q) {
    if (!q) return;
    initDifficultToggleListener();

    // Difficult Question Button State
    const origIndex = (q._origIndex !== undefined) ? q._origIndex : State.question.index;
    const targetExamId = q._sourceExamId || State.activeExam?.id;
    const isDiff = isQuestionDifficult(targetExamId, origIndex, State);
    updateDifficultButtonUI(isDiff);
}

export const updateQuestionSubBar = updateQuestionDifficultButton;

/**
 * Updates visual state of the difficult toggle button.
 * @param {boolean} isDiff
 */
function updateDifficultButtonUI(isDiff) {
    const btn = elements.btnToggleDifficult;
    const btnText = elements.btnToggleDifficultText;
    if (!btn) return;

    if (isDiff) {
        btn.classList.add('is-difficult');
        btn.setAttribute('aria-pressed', 'true');
        const iconEl = btn.querySelector('i');
        if (iconEl) iconEl.className = 'fa-solid fa-fire';
        if (btnText) btnText.textContent = t('btn_unmark_difficult');
    } else {
        btn.classList.remove('is-difficult');
        btn.setAttribute('aria-pressed', 'false');
        const iconEl = btn.querySelector('i');
        if (iconEl) iconEl.className = 'fa-solid fa-fire';
        if (btnText) btnText.textContent = t('btn_mark_difficult');
    }
}

// ---------------------------------------------------------------------------
// Navigation between questions
// ---------------------------------------------------------------------------

/**
 * Advance to the next question, or show results if on the last one (button click only).
 * @param {boolean} isKeyboard - If true, ignores advancing past the last question.
 */
export function nextQuestion(isKeyboard = false) {
    if (State.question.index === State.totalQuestions - 1) {
        if (!isKeyboard) {
            showResults();
        }
    } else {
        State.question.index += 1;
        const leftPane = document.querySelector('.exam-left-scroll-content');
        if (leftPane) leftPane.scrollTop = 0;
        renderQuestion();
    }
}

/**
 * Go back to the previous question.
 */
export function prevQuestion() {
    if (State.question.index > 0) {
        State.question.index -= 1;
        const leftPane = document.querySelector('.exam-left-scroll-content');
        if (leftPane) leftPane.scrollTop = 0;
        renderQuestion();
    }
}

// ---------------------------------------------------------------------------
// EventBus Subscriptions
// ---------------------------------------------------------------------------
Events.on(APP_EVENTS.LANGUAGE_CHANGED, () => {
    if (State.currentScreen === 'exam' || State.previousScreenBeforeSettings === 'exam') {
        if (elements.currentExamTitle && State.activeExam) {
            elements.currentExamTitle.textContent = getLocalizedText(State.activeExam.title || State.activeExam.titulo);
        }
        if (State.activeExam && State.question.index !== undefined) {
            renderQuestion();
        }
    } else if (State.currentScreen === 'results' || State.previousScreenBeforeSettings === 'results') {
        showResults();
    }
});
