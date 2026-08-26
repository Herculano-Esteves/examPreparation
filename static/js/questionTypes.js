/**
 * questionTypes.js
 * ----------------
 * Centralized registry and helper functions for all question types supported
 * by the exam simulation platform.
 */

import { escapeHTML } from './utils.js';

/**
 * Registry defining metadata, display labels, icons, and CSS badges for each question type.
 */
export const QUESTION_TYPES = {
    escolha_multipla: {
        id: 'escolha_multipla',
        label: 'Escolha Múltipla',
        shortLabel: 'Múltipla',
        icon: 'fa-list-check',
        badgeClass: 'badge-type-choice',
        description: 'Questões com várias opções de seleção (alíneas A, B, C, D).'
    },
    boolean: {
        id: 'boolean',
        label: 'Verdadeiro / Falso',
        shortLabel: 'V / F',
        icon: 'fa-check-double',
        badgeClass: 'badge-type-boolean',
        description: 'Questões binárias de afirmações verdadeiras ou falsas.'
    },
    escrita: {
        id: 'escrita',
        label: 'Desenvolvimento',
        shortLabel: 'Escrita',
        icon: 'fa-pen-to-square',
        badgeClass: 'badge-type-written',
        description: 'Questões abertas de redação e reflexão escrita com solução esperada.'
    }
};

/**
 * Retrieves metadata for a specific question type with safe fallback to 'escolha_multipla'.
 *
 * @param {string} tipo - The type identifier from question JSON.
 * @returns {object} The question type definition.
 */
export function getQuestionTypeInfo(tipo) {
    const key = (tipo || '').toLowerCase().trim();
    if (QUESTION_TYPES[key]) {
        return QUESTION_TYPES[key];
    }
    // Aliases
    if (key === 'multipla' || key === 'multiple_choice' || key === 'multiple-choice') {
        return QUESTION_TYPES.escolha_multipla;
    }
    if (key === 'true_false' || key === 'verdadeiro_falso' || key === 'tf') {
        return QUESTION_TYPES.boolean;
    }
    if (key === 'essay' || key === 'aberta' || key === 'redacao' || key === 'desenvolvimento') {
        return QUESTION_TYPES.escrita;
    }
    // Default fallback
    return QUESTION_TYPES.escolha_multipla;
}

/**
 * Extracts a normalized, unique list of question types present in an exam object.
 *
 * @param {object} exam - The exam object (from index.json or local storage).
 * @returns {string[]} Array of normalized type identifiers.
 */
export function getExamQuestionTypes(exam) {
    if (!exam) return ['escolha_multipla'];

    if (Array.isArray(exam.tipos_perguntas) && exam.tipos_perguntas.length > 0) {
        return [...new Set(exam.tipos_perguntas.map(t => getQuestionTypeInfo(t).id))];
    }

    if (Array.isArray(exam.perguntas) && exam.perguntas.length > 0) {
        return [...new Set(exam.perguntas.map(q => getQuestionTypeInfo(q.tipo).id))];
    }

    return ['escolha_multipla'];
}

/**
 * Generates the HTML split capsule showing all question types included in an exam.
 * Each segment can be clicked to exclude/include that type from the exam session.
 *
 * @param {string[]} types - Array of question type identifiers.
 * @param {string[]} [excludedTypes=[]] - Array of type identifiers currently excluded.
 * @returns {string} HTML string representing the interactive split capsule.
 */
export function renderQuestionTypeTagsHTML(types, excludedTypes = []) {
    if (!Array.isArray(types) || types.length === 0) {
        types = ['escolha_multipla'];
    }

    const segmentsHTML = types.map(tipo => {
        const info = getQuestionTypeInfo(tipo);
        const isExcluded = excludedTypes.includes(info.id);
        const excludedClass = isExcluded ? 'type-excluded' : '';
        const title = isExcluded
            ? `Excluído: ${info.label} (Clique para incluir)`
            : `Incluído: ${info.label} (Clique para excluir)`;

        return `
            <button type="button"
                    class="exam-type-segment ${info.badgeClass} ${excludedClass}"
                    data-type="${info.id}"
                    title="${escapeHTML(title)}"
                    aria-label="${escapeHTML(title)}"
                    aria-pressed="${isExcluded ? 'false' : 'true'}">
                <i class="fa-solid ${info.icon}" aria-hidden="true"></i>
                <span class="type-segment-text">${escapeHTML(info.label)}</span>
            </button>
        `;
    }).join('');

    return `<div class="exam-types-capsule interactive" role="group" aria-label="Tipos de perguntas no exame (clique para excluir/incluir)">${segmentsHTML}</div>`;
}

/**
 * Validates whether a given question object complies with the rules of its declared type.
 *
 * @param {object} q - Question object to validate.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateQuestionSchema(q) {
    if (!q || typeof q !== 'object') {
        return { valid: false, error: 'Objeto de pergunta inválido.' };
    }

    if (!q.pergunta || typeof q.pergunta !== 'string' || !q.pergunta.trim()) {
        return { valid: false, error: "Campo 'pergunta' obrigatório ausente ou vazio." };
    }

    const info = getQuestionTypeInfo(q.tipo);

    if (info.id === 'escrita') {
        if (!q.solucao || typeof q.solucao !== 'string' || !q.solucao.trim()) {
            return { valid: false, error: "Tipo 'escrita' requer 'solucao' textual válida." };
        }
        return { valid: true };
    }

    if (info.id === 'boolean') {
        const sol = q.solucao;
        const isValid = sol === 0 || sol === 1 || (Array.isArray(sol) && sol.length > 0 && (sol[0] === 0 || sol[0] === 1));
        if (!isValid) {
            return { valid: false, error: "Tipo 'boolean' requer 'solucao' 0 (Verdadeiro) ou 1 (Falso)." };
        }
        return { valid: true };
    }

    // Default: escolha_multipla
    if (!Array.isArray(q.opcoes) || q.opcoes.length < 2) {
        return { valid: false, error: "Tipo 'escolha_multipla' requer pelo menos 2 opções em 'opcoes'." };
    }

    if (!Array.isArray(q.solucao) || q.solucao.length === 0) {
        return { valid: false, error: "Tipo 'escolha_multipla' requer array com índices em 'solucao'." };
    }

    for (const s of q.solucao) {
        if (typeof s !== 'number' || s < 0 || s >= q.opcoes.length) {
            return { valid: false, error: `Índice de solução [${s}] fora do intervalo de opções (0 a ${q.opcoes.length - 1}).` };
        }
    }

    return { valid: true };
}
