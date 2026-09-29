/**
 * questionUI.js
 * -------------
 * Sub-renderers for written answer inputs, multiple choice option buttons,
 * and feedback/explanation banners in the exam solver.
 */

import { State } from '../state.js';
import { elements } from '../elements.js';
import { escapeHTML, getLocalizedText, getLocalizedList } from '../utils.js';
import { renderMarkdown } from '../renderer.js';
import { t, getCurrentLanguage } from '../i18n.js';
import { selectOption, confirmMultipleChoiceAnswer, revealWrittenAnswer, assessWrittenAnswer } from './questionEvaluation.js';

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
