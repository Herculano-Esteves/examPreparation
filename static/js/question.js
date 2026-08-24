/**
 * question.js
 * -----------
 * Renders individual questions, handles user interaction (option selection,
 * answer confirmation, reveal), and manages navigation between questions.
 * Styled with hybrid cyber-glass formatting and full WCAG AA accessibility.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { renderMarkdown, escapeHTML } from './utils.js';
import { transitionTo } from './navigation.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Re-runs KaTeX on the question container after content changes. */
function renderMath() {
    if (typeof renderMathInElement !== 'function') return;
    try {
        const container =
            document.querySelector('.exam-split-container') ||
            document.querySelector('.question-card') ||
            document.body;
        renderMathInElement(container, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$',  right: '$',  display: false }
            ],
            throwOnError: false
        });
    } catch (err) {
        console.error('Erro ao renderizar equações matemáticas:', err);
    }
}

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
    label.innerHTML = `<i class="fa-regular fa-keyboard" aria-hidden="true"></i> Escreva a sua resposta (<strong>opcional</strong>):`;
    elements.optionsContainer.appendChild(label);

    const textarea = document.createElement('textarea');
    textarea.id = 'written-answer-input';
    textarea.className = 'written-answer-textarea';
    textarea.placeholder = 'Escreva aqui a sua resposta para estruturar as suas ideias...';
    textarea.value = State.question.writtenInput || '';

    textarea.addEventListener('input', (e) => {
        State.question.writtenInput = e.target.value;
    });

    if (State.question.revealed) {
        textarea.disabled = true;
        textarea.classList.add('disabled-textarea');
    }

    elements.optionsContainer.appendChild(textarea);

    if (!State.question.revealed) {
        const btnReveal = document.createElement('button');
        btnReveal.className = 'btn-control btn-primary btn-full btn-reveal';
        btnReveal.innerHTML = `<span>Ver Resposta</span> <i class="fa-solid fa-eye" aria-hidden="true"></i>`;
        btnReveal.addEventListener('click', () => revealWrittenAnswer());
        elements.optionsContainer.appendChild(btnReveal);
    }
}

/**
 * Renders option buttons (A/B/C/D or Verdadeiro/Falso) and the confirm button.
 * @param {object} q - Current question object
 */
export function renderChoiceQuestionUI(q) {
    const isBoolean   = q.tipo === 'boolean';
    const optionsList = isBoolean ? ['Verdadeiro', 'Falso'] : q.opcoes;
    const correctList = Array.isArray(q.solucao) ? q.solucao : [q.solucao];

    optionsList.forEach((opcao, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.setAttribute('type', 'button');
        
        const prefixText = isBoolean 
            ? (idx === 0 ? 'V)' : 'F)')
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
        confirmBtn.innerHTML = `<span>Confirmar Resposta(s)</span> <i class="fa-solid fa-square-check" aria-hidden="true"></i>`;
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

    if (q.tipo === 'escrita') {
        elements.answerFeedback.className = 'answer-feedback correct';
        elements.feedbackTitle.innerHTML = `<i class="fa-solid fa-lightbulb" aria-hidden="true"></i> Resposta Esperada / Resolução:`;
        elements.feedbackMessage.innerHTML = renderMarkdown(q.solucao);
        return;
    }

    const selected    = State.question.selectedOptions;
    const correctList = Array.isArray(q.solucao) ? q.solucao : [q.solucao];
    const isCorrect   = selected.length === correctList.length &&
                        selected.every(val => correctList.includes(val));

    elements.answerFeedback.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    elements.feedbackTitle.innerHTML = isCorrect 
        ? `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Resposta Correta!`
        : `<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> Resposta Incorreta!`;

    const letters = correctList.map(val => String.fromCharCode(65 + val)).sort().join(', ');
    let msg = correctList.length === 1
        ? `A resposta correta é a Alínea <strong>${letters}</strong>.`
        : `As respostas corretas são as Alíneas: <strong>${letters}</strong>.`;

    if (q.explicacao) {
        msg += `<br><br><strong>Explicação / Justificação:</strong><br>${renderMarkdown(q.explicacao)}`;
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

    // --- Top bar progress ---
    elements.questionCounter.textContent =
        `Questão ${State.question.index + 1} de ${State.totalQuestions}`;
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
    elements.questionText.textContent = q.pergunta;

    // --- Cabecalho (optional scenario block) ---
    if (q.cabecalho) {
        elements.questionCabecalho.innerHTML = renderMarkdown(q.cabecalho, true);
        elements.questionCabecalho.classList.remove('hidden');
    } else {
        elements.questionCabecalho.innerHTML = '';
        elements.questionCabecalho.classList.add('hidden');
    }

    // --- Options / answer UI ---
    elements.optionsContainer.innerHTML = '';

    if (q.tipo === 'escrita') {
        renderWrittenQuestionUI(q);
    } else {
        renderChoiceQuestionUI(q);
    }

    renderFeedbackUI(q);

    // --- Navigation buttons ---
    elements.btnPrev.disabled = State.question.index === 0;
    elements.btnPrev.innerHTML = `<i class="fa-solid fa-chevron-left" aria-hidden="true"></i> <span>Voltar</span>`;
    
    elements.btnNext.disabled = false;

    if (State.question.index === State.totalQuestions - 1) {
        elements.btnNext.innerHTML =
            `<span>Concluir Exame</span> <i class="fa-solid fa-flag-checkered" aria-hidden="true"></i>`;
    } else {
        elements.btnNext.innerHTML =
            `<span>Avançar</span> <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>`;
    }

    renderMath();
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

    if (q.tipo === 'boolean') {
        State.question.selectedOptions = [optionIndex];
    } else {
        const pos = State.question.selectedOptions.indexOf(optionIndex);
        if (pos > -1) {
            State.question.selectedOptions.splice(pos, 1);
        } else {
            State.question.selectedOptions.push(optionIndex);
        }
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
    const correctList = Array.isArray(q.solucao) ? q.solucao : [q.solucao];
    const isCorrect   = selected.length === correctList.length &&
                        selected.every(val => correctList.includes(val));

    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = isCorrect;
    }
    renderQuestion();
}

/**
 * Reveal the expected answer for an essay question.
 */
export function revealWrittenAnswer() {
    State.question.revealed = true;
    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = true;
    }
    renderQuestion();
}

// ---------------------------------------------------------------------------
// Navigation between questions
// ---------------------------------------------------------------------------

/**
 * Advance to the next question, or show results if on the last one.
 */
export function nextQuestion() {
    if (State.question.index === State.totalQuestions - 1) {
        showResults();
    } else {
        State.question.index += 1;
        State.question.selectedOptions = [];
        State.question.writtenInput    = '';
        State.question.revealed        = false;
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
        State.question.selectedOptions = [];
        State.question.writtenInput    = '';
        State.question.revealed        = false;
        const leftPane = document.querySelector('.exam-left-scroll-content');
        if (leftPane) leftPane.scrollTop = 0;
        renderQuestion();
    }
}

/**
 * End the exam and transition to the results screen.
 */
export function showResults() {
    elements.resultsExamTitle.textContent = State.activeExam.titulo;
    transitionTo('results');
}
