/**
 * clipboard.js
 * ------------
 * Handles copying exam question text to the clipboard.
 * Supports copying question only (with options) or question + answer & explanation.
 *
 * Uses the modern navigator.clipboard API with a graceful fallback to
 * document.execCommand for older browsers / non-HTTPS environments.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { showToast, getLocalizedText, getLocalizedList } from './utils.js';
import { t, getCurrentLanguage } from './i18n.js';

/**
 * Build a plain-text representation of the current question and copy it.
 *
 * @param {boolean} includeAnswer - If false, copies question + options only.
 *                                  If true, includes correct answer & explanation.
 */
export function copyQuestionToClipboard(includeAnswer = false) {
    const q = State.currentQuestion;
    if (!q) return;

    const examTitle = getLocalizedText(State.activeExam.title || State.activeExam.titulo);
    const qNumText = t('clip_question', {
        current: State.question.index + 1,
        total: State.totalQuestions
    });

    let textToCopy = `${t('clip_exam')}: ${examTitle}\n${qNumText}\n`;

    const questionText = getLocalizedText(q.question || q.pergunta);
    textToCopy += `\n${t('clip_question_label')}:\n${questionText}\n`;

    const headerText = getLocalizedText(q.header || q.cabecalho);
    if (headerText) {
        textToCopy += `\n${t('clip_scenario')}:\n${headerText}\n`;
    }

    const qType = q.type || q.tipo;
    const rawSolution = q.solution !== undefined ? q.solution : q.solucao;
    const rawExplanation = q.explanation || q.explicacao;

    if (qType === 'escrita') {
        if (includeAnswer && rawSolution) {
            textToCopy += `\n${t('feedback_expected_solution')}\n${getLocalizedText(rawSolution)}\n`;
        }
    } else {
        const isBoolean   = qType === 'boolean';
        const rawOptions  = q.options || q.opcoes;
        const optionsList = isBoolean 
            ? (getCurrentLanguage() === 'en' ? ['True', 'False'] : ['Verdadeiro', 'Falso'])
            : getLocalizedList(rawOptions);
        const correctList = Array.isArray(rawSolution) ? rawSolution : [rawSolution];

        if (optionsList && optionsList.length > 0) {
            const optionsText = optionsList
                .map((opcao, idx) => {
                    const prefix = isBoolean 
                        ? (idx === 0 ? (getCurrentLanguage() === 'en' ? 'T)' : 'V)') : 'F)')
                        : `${String.fromCharCode(65 + idx)})`;
                    return `${prefix} ${opcao}`;
                })
                .join('\n');
            textToCopy += `\n${t('clip_options')}:\n${optionsText}\n`;
        }

        if (includeAnswer) {
            let correctLetters = '';
            if (isBoolean) {
                const isTrue = (correctList[0] === 0);
                correctLetters = isTrue
                    ? (getCurrentLanguage() === 'en' ? 'True (T)' : 'Verdadeiro (V)')
                    : (getCurrentLanguage() === 'en' ? 'False (F)' : 'Falso (F)');
            } else {
                correctLetters = correctList
                    .map(val => String.fromCharCode(65 + val))
                    .sort()
                    .join(', ');
            }
            textToCopy += `\n${t('clip_correct_answers')}:\n${correctLetters}\n`;
        }
    }

    const explanationText = getLocalizedText(rawExplanation);
    if (includeAnswer && explanationText) {
        textToCopy += `\n${t('feedback_explanation')}:\n${explanationText}\n`;
    }

    const targetBtn = includeAnswer ? elements.btnCopyAnswer : elements.btnCopy;

    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            triggerCopyButtonFeedback(targetBtn);
            showToast(includeAnswer ? t('toast_question_answer_copied') : t('toast_question_copied'), elements);
        })
        .catch(err => {
            console.error('Failed to copy text:', err);
            fallbackCopyTextToClipboard(textToCopy, targetBtn);
        });
}

/**
 * Briefly change the copy button to a "Copiado!" state for visual feedback.
 * Restores the original HTML after 1.5 s.
 *
 * @param {HTMLElement} btn
 */
export function triggerCopyButtonFeedback(btn) {
    if (!btn) btn = document.getElementById('btn-copy');
    if (!btn) return;

    const originalHTML = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i> <span>${t('copied_feedback')}</span>`;

    setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = originalHTML;
    }, 1500);
}

/**
 * Fallback for environments where navigator.clipboard is unavailable.
 * Creates a temporary textarea, selects it and uses execCommand('copy').
 *
 * @param {string} text
 * @param {HTMLElement} btn
 */
export function fallbackCopyTextToClipboard(text, btn) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            triggerCopyButtonFeedback(btn);
            showToast('Copiado com sucesso.', elements);
        } else {
            showToast('Erro ao copiar.', elements);
        }
    } catch (err) {
        console.error('Fallback clipboard error:', err);
        showToast('Erro ao copiar.', elements);
    }
    document.body.removeChild(textArea);
}
