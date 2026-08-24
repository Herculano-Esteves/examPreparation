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
import { showToast } from './utils.js';

/**
 * Build a plain-text representation of the current question and copy it.
 *
 * @param {boolean} includeAnswer - If false, copies question + options only.
 *                                  If true, includes correct answer & explanation.
 */
export function copyQuestionToClipboard(includeAnswer = false) {
    const q = State.currentQuestion;
    if (!q) return;

    let textToCopy = `Exame: ${State.activeExam.titulo}\nQuestão ${State.question.index + 1} de ${State.totalQuestions}\n`;

    if (q.cabecalho) {
        textToCopy += `\nCenário:\n${q.cabecalho}\n`;
    }

    textToCopy += `\nPergunta:\n${q.pergunta}\n`;

    if (q.tipo === 'escrita') {
        if (includeAnswer && q.solucao) {
            textToCopy += `\nResposta Esperada / Resolução:\n${q.solucao}\n`;
        }
    } else {
        const isBoolean   = q.tipo === 'boolean';
        const optionsList = isBoolean ? ['Verdadeiro', 'Falso'] : q.opcoes;
        const correctList = Array.isArray(q.solucao) ? q.solucao : [q.solucao];

        if (optionsList && optionsList.length > 0) {
            const optionsText = optionsList
                .map((opcao, idx) => `${String.fromCharCode(65 + idx)}) ${opcao}`)
                .join('\n');
            textToCopy += `\nAlíneas:\n${optionsText}\n`;
        }

        if (includeAnswer) {
            const correctLetters = correctList
                .map(val => String.fromCharCode(65 + val))
                .sort()
                .join(', ');
            textToCopy += `\nResposta(s) Correta(s):\n${correctLetters}\n`;
        }
    }

    if (includeAnswer && q.explicacao) {
        textToCopy += `\nExplicação / Justificação:\n${q.explicacao}\n`;
    }

    const targetBtn = includeAnswer ? elements.btnCopyAnswer : elements.btnCopy;

    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            triggerCopyButtonFeedback(targetBtn);
            showToast(includeAnswer ? 'Questão + Resposta Copiadas' : 'Questão Copiada', elements);
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
    btn.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i> <span>Copiado!</span>`;

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
