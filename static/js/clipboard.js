/**
 * clipboard.js
 * ------------
 * Handles copying exam question text to the clipboard.
 *
 * Uses the modern navigator.clipboard API with a graceful fallback to
 * document.execCommand for older browsers / non-HTTPS environments.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { showToast } from './utils.js';

/**
 * Build a plain-text representation of the current question and copy it.
 * Includes: exam title, question number, cabecalho (if any), question text,
 * options / expected answer, and explanation.
 */
export function copyQuestionToClipboard() {
    const q = State.currentQuestion;
    if (!q) return;

    let textToCopy = `Exame: ${State.activeExam.titulo}\nQuestão ${State.question.index + 1} de ${State.totalQuestions}\n`;

    if (q.cabecalho) {
        textToCopy += `\nCenário:\n${q.cabecalho}\n`;
    }

    textToCopy += `\nPergunta:\n${q.pergunta}\n`;

    if (q.tipo === 'escrita') {
        textToCopy += `\nResposta Esperada / Resolução:\n${q.solucao}`;
    } else {
        const isBoolean    = q.tipo === 'boolean';
        const optionsList  = isBoolean ? ['Verdadeiro', 'Falso'] : q.opcoes;
        const correctList  = Array.isArray(q.solucao) ? q.solucao : [q.solucao];

        const optionsText  = optionsList
            .map((opcao, idx) => `${String.fromCharCode(65 + idx)}) ${opcao}`)
            .join('\n');
        const correctLetters = correctList
            .map(val => String.fromCharCode(65 + val))
            .sort()
            .join(', ');

        textToCopy += `\nAlíneas:\n${optionsText}\n\nResposta(s) Correta(s):\n${correctLetters}`;
    }

    if (q.explicacao) {
        textToCopy += `\n\nExplicação / Justificação:\n${q.explicacao}`;
    }

    navigator.clipboard.writeText(textToCopy)
        .then(() => triggerCopyButtonFeedback())
        .catch(err => {
            console.error('Failed to copy text:', err);
            fallbackCopyTextToClipboard(textToCopy);
        });
}

/**
 * Briefly change the copy button to a "Copiado!" state for visual feedback.
 * Restores the original HTML after 1.5 s.
 */
export function triggerCopyButtonFeedback() {
    const btn = document.getElementById('btn-copy');
    if (!btn) return;

    const originalHTML = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Copiado!</span>`;

    // Note: this setTimeout only controls a UI feedback timer (not a navigation
    // timer), so it is acceptable — a slightly longer or shorter delay has no
    // correctness implications.
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
 */
export function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // avoid scrolling to bottom of page
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            triggerCopyButtonFeedback();
        } else {
            showToast('Erro ao copiar.', elements);
        }
    } catch (err) {
        console.error('Fallback clipboard error:', err);
        showToast('Erro ao copiar.', elements);
    }
    document.body.removeChild(textArea);
}
