import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML, getLocalizedText, getLocalizedList, showToast, NotificationType } from './utils.js';
import { renderMarkdown, renderMath, renderRichText } from './renderer.js';
import { transitionTo } from './navigation.js';
import { getQuestionTypeInfo } from './questionTypes.js';
import { QuestionStatus, updateQuestionStatus, toggleDifficultQuestion, isQuestionDifficult } from './storage.js';
import { t, getCurrentLanguage } from './i18n.js';
import { Events, APP_EVENTS } from './events.js';
import { syncExamSplitLayout } from './layout.js';

// ---------------------------------------------------------------------------
// Sub-renderers (called by renderQuestion)
// ---------------------------------------------------------------------------

/**
 * Renders the text area and optional "Ver Resposta" button for essay questions.
 * @param {object} q - Current question object
 */
export function renderWrittenQuestionUI(q) {
    const label = document.createElement('p');
    label.className = 'written-answer-label';
    label.innerHTML = `<i class="fa-regular fa-keyboard" aria-hidden="true"></i> ${t('written_label')}`;
    elements.optionsContainer.appendChild(label);

    const textarea = document.createElement('textarea');
    textarea.id = 'written-answer-input';
    textarea.className = 'written-answer-textarea';
    textarea.placeholder = t('written_placeholder');
    textarea.value = State.question.writtenInput || '';

    textarea.addEventListener('input', (e) => {
        State.question.writtenInput = e.target.value;
        if (State.examAnswers && State.examAnswers[State.question.index]) {
            State.examAnswers[State.question.index].writtenInput = e.target.value;
        }
    });

    if (State.question.revealed) {
        textarea.disabled = true;
        textarea.classList.add('disabled-textarea');
    }

    elements.optionsContainer.appendChild(textarea);

    if (!State.question.revealed) {
        const btnReveal = document.createElement('button');
        btnReveal.className = 'btn-control btn-primary btn-full btn-reveal';
        btnReveal.innerHTML = `<span>${t('btn_reveal_answer')}</span> <i class="fa-solid fa-eye" aria-hidden="true"></i>`;
        btnReveal.addEventListener('click', () => revealWrittenAnswer());
        elements.optionsContainer.appendChild(btnReveal);
    }
}

/**
 * Renders option buttons (A/B/C/D or Verdadeiro/Falso) and the confirm button.
 * @param {object} q - Current question object
 */
export function renderChoiceQuestionUI(q) {
    const isBoolean   = (q.type || q.tipo) === 'boolean';
    const rawOptions  = q.options || q.opcoes;
    const optionsList = isBoolean 
        ? (getCurrentLanguage() === 'en' ? ['True', 'False'] : ['Verdadeiro', 'Falso'])
        : getLocalizedList(rawOptions);
    const rawSolution = q.solution !== undefined ? q.solution : q.solucao;
    const correctList = Array.isArray(rawSolution) ? rawSolution : [rawSolution];

    optionsList.forEach((opcao, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.setAttribute('type', 'button');
        
        const prefixText = isBoolean 
            ? (idx === 0 ? (getCurrentLanguage() === 'en' ? 'T)' : 'V)') : 'F)')
            : `${String.fromCharCode(65 + idx)})`;
            
        btn.innerHTML = `<span class="option-btn-prefix">${prefixText}</span> <span>${escapeHTML(opcao)}</span>`;

        const isSelected = State.question.selectedOptions.includes(idx);
        const isCorrect  = correctList.includes(idx);

        if (State.question.revealed) {
            btn.classList.add('disabled');
            if (isCorrect) {
                btn.classList.add('correct-highlight');
                if (isSelected) btn.classList.add('selected-correct');
            } else if (isSelected) {
                btn.classList.add('selected-incorrect');
            }
        } else {
            if (isSelected) btn.classList.add('selected-toggled');
            btn.addEventListener('click', () => selectOption(idx));
        }

        elements.optionsContainer.appendChild(btn);
    });

    if (!State.question.revealed) {
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-control btn-primary btn-full btn-confirm-answer';
        confirmBtn.innerHTML = `<span>${t('btn_confirm_selection')}</span> <i class="fa-solid fa-square-check" aria-hidden="true"></i>`;
        confirmBtn.disabled = State.question.selectedOptions.length === 0;
        confirmBtn.addEventListener('click', () => confirmMultipleChoiceAnswer());
        elements.optionsContainer.appendChild(confirmBtn);
    }
}

/**
 * Renders the feedback banner below the options (correct / incorrect / solution).
 * @param {object} q - Current question object
 */
export function renderFeedbackUI(q) {
    if (!State.question.revealed) {
        elements.answerFeedback.className = 'answer-feedback hidden';
        return;
    }

    const qType = q.type || q.tipo;
    const rawSolution = q.solution !== undefined ? q.solution : q.solucao;
    const rawExplanation = q.explanation || q.explicacao;

    if (qType === 'escrita') {
        const ans = State.examAnswers ? State.examAnswers[State.question.index] : null;
        const isAssessedCorrect = ans && ans.isCorrect === true;
        const isAssessedIncorrect = ans && ans.isCorrect === false;

        let feedbackClass = 'answer-feedback';
        if (isAssessedCorrect) feedbackClass += ' correct';
        else if (isAssessedIncorrect) feedbackClass += ' incorrect';
        else feedbackClass += ' answered';

        elements.answerFeedback.className = feedbackClass;
        elements.feedbackTitle.innerHTML = `<i class="fa-solid fa-lightbulb" aria-hidden="true"></i> ${t('feedback_expected_solution')}`;
        
        let explanationHTML = renderMarkdown(getLocalizedText(rawSolution));
        if (rawExplanation) {
            const expText = getLocalizedText(rawExplanation);
            if (expText) {
                explanationHTML += `<br><br><strong>${t('feedback_explanation')}:</strong><br>${renderMarkdown(expText)}`;
            }
        }

        // Card de Autoavaliação interativo
        const selfAssessmentHTML = `
            <div class="self-assessment-card">
                <div class="self-assessment-actions">
                    <button type="button" class="btn-self-assess btn-assess-correct ${isAssessedCorrect ? 'selected-correct' : ''}" id="btn-assess-correct">
                        <i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span>${t('btn_assess_correct')}</span>
                    </button>
                    <button type="button" class="btn-self-assess btn-assess-incorrect ${isAssessedIncorrect ? 'selected-incorrect' : ''}" id="btn-assess-incorrect">
                        <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> <span>${t('btn_assess_incorrect')}</span>
                    </button>
                </div>
            </div>
        `;

        elements.feedbackMessage.innerHTML = `${explanationHTML}${selfAssessmentHTML}`;

        const btnCorrect = document.getElementById('btn-assess-correct');
        const btnIncorrect = document.getElementById('btn-assess-incorrect');

        if (btnCorrect) {
            btnCorrect.addEventListener('click', () => assessWrittenAnswer(true));
        }
        if (btnIncorrect) {
            btnIncorrect.addEventListener('click', () => assessWrittenAnswer(false));
        }
        return;
    }

    const selected    = State.question.selectedOptions;
    const correctList = Array.isArray(rawSolution) ? rawSolution : [rawSolution];
    const isCorrect   = selected.length === correctList.length &&
                        selected.every(val => correctList.includes(val));

    elements.answerFeedback.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    elements.feedbackTitle.innerHTML = isCorrect 
        ? `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${t('feedback_correct')}`
        : `<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> ${t('feedback_incorrect')}`;

    const isBoolean = qType === 'boolean';
    let letters = '';
    if (isBoolean) {
        const isTrue = (correctList[0] === 0);
        letters = isTrue
            ? (getCurrentLanguage() === 'en' ? 'True (T)' : 'Verdadeiro (V)')
            : (getCurrentLanguage() === 'en' ? 'False (F)' : 'Falso (F)');
    } else {
        letters = correctList.map(val => String.fromCharCode(65 + val)).sort().join(', ');
    }

    let msg = (correctList.length === 1 || isBoolean)
        ? t('feedback_correct_single', { letters })
        : t('feedback_correct_plural', { letters });

    const explanationText = getLocalizedText(rawExplanation);
    if (explanationText) {
        msg += `<br><br><strong>${t('feedback_explanation')}:</strong><br>${renderMarkdown(explanationText)}`;
    }
    elements.feedbackMessage.innerHTML = msg;
}

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

let difficultListenerInitialized = false;

/**
 * Initializes the difficult question toggle button listener once.
 */
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
        const isDiff = toggleDifficultQuestion(State.activeExam.id, origIndex, State);
        
        updateDifficultButtonUI(isDiff);

        if (isDiff) {
            showToast(t('toast_question_marked_difficult'), NotificationType.SUCCESS);
        } else {
            showToast(t('toast_question_unmarked_difficult'), NotificationType.INFO);
        }

        Events.emit('question:difficult_toggled', {
            examId: State.activeExam.id,
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
    const isDiff = isQuestionDifficult(State.activeExam?.id, origIndex, State);
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
// User interaction handlers
// ---------------------------------------------------------------------------

/**
 * Toggle selection of an option for multiple-choice / boolean questions.
 * @param {number} optionIndex
 */
export function selectOption(optionIndex) {
    if (State.question.revealed) return;
    const q = State.currentQuestion;
    if (!q) return;

    if ((q.type || q.tipo) === 'boolean') {
        State.question.selectedOptions = [optionIndex];
    } else {
        const pos = State.question.selectedOptions.indexOf(optionIndex);
        if (pos > -1) {
            State.question.selectedOptions.splice(pos, 1);
        } else {
            State.question.selectedOptions.push(optionIndex);
        }
    }

    // Guardar seleção em memória
    if (State.examAnswers && State.examAnswers[State.question.index]) {
        State.examAnswers[State.question.index].selectedOptions = [...State.question.selectedOptions];
    }

    renderQuestion();
}

/**
 * Confirm the selected answer(s) for a multiple-choice / boolean question.
 */
export function confirmMultipleChoiceAnswer() {
    if (State.question.revealed) return;
    const q = State.currentQuestion;
    if (!q) return;

    State.question.revealed = true;

    const selected    = State.question.selectedOptions;
    const rawSolution = q.solution !== undefined ? q.solution : q.solucao;
    const correctList = Array.isArray(rawSolution) ? rawSolution : [rawSolution];
    const isCorrect   = selected.length === correctList.length &&
                        selected.every(val => correctList.includes(val));

    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = isCorrect;
    }

    // Guardar estado de confirmação e resultado em memória
    if (State.examAnswers && State.examAnswers[State.question.index]) {
        State.examAnswers[State.question.index].revealed = true;
        State.examAnswers[State.question.index].isCorrect = isCorrect;
        State.examAnswers[State.question.index].selectedOptions = [...selected];
    }

    // Atualizar resultado desta pergunta em tempo real no localStorage
    if (State.activeExam && State.activeExam.id) {
        const origIdx = (q._origIndex !== undefined) ? q._origIndex : State.question.index;
        const status = isCorrect ? QuestionStatus.CORRECT : QuestionStatus.INCORRECT;
        updateQuestionStatus(State.activeExam.id, origIdx, status, State, State.totalQuestions);
    }

    renderQuestion();
}

/**
 * Reveal the expected answer for an essay question.
 */
export function revealWrittenAnswer() {
    State.question.revealed = true;
    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = null;
    }

    if (State.examAnswers && State.examAnswers[State.question.index]) {
        State.examAnswers[State.question.index].revealed = true;
        if (State.examAnswers[State.question.index].isCorrect === undefined) {
            State.examAnswers[State.question.index].isCorrect = null;
        }
    }

    // Atualizar resultado desta pergunta aberta em tempo real no localStorage como ANSWERED (4)
    if (State.activeExam && State.activeExam.id) {
        const q = State.currentQuestion;
        const origIdx = (q && q._origIndex !== undefined) ? q._origIndex : State.question.index;
        const ans = State.examAnswers ? State.examAnswers[State.question.index] : null;
        let status = QuestionStatus.ANSWERED;
        if (ans && ans.isCorrect === true) status = QuestionStatus.CORRECT;
        else if (ans && ans.isCorrect === false) status = QuestionStatus.INCORRECT;

        updateQuestionStatus(State.activeExam.id, origIdx, status, State, State.totalQuestions);
    }

    renderQuestion();
}

/**
 * Self-assess a written question answer as correct (true) or incorrect (false).
 * @param {boolean} isCorrect
 */
export function assessWrittenAnswer(isCorrect) {
    if (!State.activeExam) return;
    const q = State.currentQuestion;
    if (!q) return;

    if (State.examAnswers && State.examAnswers[State.question.index]) {
        State.examAnswers[State.question.index].isCorrect = isCorrect;
    }

    if (State.question.firstAttemptCorrect[State.question.index] === undefined || State.question.firstAttemptCorrect[State.question.index] === null) {
        State.question.firstAttemptCorrect[State.question.index] = isCorrect;
    }

    const origIdx = (q._origIndex !== undefined) ? q._origIndex : State.question.index;
    const status = isCorrect ? QuestionStatus.CORRECT : QuestionStatus.INCORRECT;
    updateQuestionStatus(State.activeExam.id, origIdx, status, State, State.totalQuestions);

    if (isCorrect) {
        showToast(t('toast_assessed_correct'), NotificationType.SUCCESS);
    } else {
        showToast(t('toast_assessed_incorrect'), NotificationType.INFO);
    }

    renderQuestion();
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

/**
 * End the exam, calculate percentage and breakdown, and transition to the results screen.
 */
export function showResults() {
    elements.resultsExamTitle.textContent = State.activeExam ? State.activeExam.titulo : '';

    const total = State.totalQuestions;
    const answers = State.examAnswers || [];

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (let i = 0; i < total; i++) {
        const ans = answers[i];
        if (!ans || !ans.revealed) {
            unanswered++;
        } else if (ans.isCorrect === true) {
            correct++;
        } else {
            incorrect++;
        }
    }

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Atualizar visualização da percentagem
    if (elements.resultsScorePercentage) {
        elements.resultsScorePercentage.textContent = `${percentage}%`;
        elements.resultsScorePercentage.className = 'results-score-percentage';
        if (percentage >= 70) {
            elements.resultsScorePercentage.classList.add('score-high');
        } else if (percentage >= 50) {
            elements.resultsScorePercentage.classList.add('score-medium');
        } else {
            elements.resultsScorePercentage.classList.add('score-low');
        }
    }

    // Atualizar contadores
    if (elements.resultsCorrectCount) elements.resultsCorrectCount.textContent = correct;
    if (elements.resultsIncorrectCount) elements.resultsIncorrectCount.textContent = incorrect;
    if (elements.resultsUnansweredCount) elements.resultsUnansweredCount.textContent = unanswered;

    // Sincronizar array de respostas do exame completo no localStorage
    const questionsList = State.activeExam ? (State.activeExam.questions || State.activeExam.perguntas || []) : [];
    if (State.activeExam && State.activeExam.id && Array.isArray(questionsList)) {
        questionsList.forEach((q, idx) => {
            const ans = answers[idx];
            const origIdx = (q._origIndex !== undefined) ? q._origIndex : idx;
            let status = QuestionStatus.UNANSWERED;
            if (ans && ans.revealed) {
                if (ans.isCorrect === true) status = QuestionStatus.CORRECT;
                else if (ans.isCorrect === false) status = QuestionStatus.INCORRECT;
                else status = QuestionStatus.ANSWERED;
            }
            updateQuestionStatus(State.activeExam.id, origIdx, status, State, State.totalQuestions);
        });
    }

    Events.emit(APP_EVENTS.EXAM_FINISHED, {
        exam: State.activeExam,
        results: { total, correct, incorrect, unanswered, percentage }
    });

    transitionTo('results');
}

// ---------------------------------------------------------------------------
// EventBus Subscriptions
// ---------------------------------------------------------------------------
Events.on(APP_EVENTS.LANGUAGE_CHANGED, () => {
    if (State.currentScreen === 'exam') {
        if (elements.currentExamTitle && State.activeExam) {
            elements.currentExamTitle.textContent = State.activeExam.title ? getLocalizedText(State.activeExam.title) : getLocalizedText(State.activeExam.titulo);
        }
        renderQuestion();
    } else if (State.currentScreen === 'results') {
        showResults();
    }
});
