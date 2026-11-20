/**
 * questionTypes.js
 * ----------------
 * Centralized registry and helper functions for all question types supported
 * by the exam simulation platform.
 */

import { escapeHTML } from './utils.js';
import { t } from './i18n.js';
import { APP_CONFIG, normalizeQuestionType } from './config.js';

const { MULTIPLE_CHOICE, BOOLEAN, WRITTEN } = APP_CONFIG.questionTypes;

/**
 * Registry defining metadata, display labels, icons, and CSS badges for each question type.
 */
export const QUESTION_TYPES = {
    [MULTIPLE_CHOICE]: {
        id: MULTIPLE_CHOICE,
        label: 'Multiple Choice',
        shortLabel: 'Multiple',
        icon: 'fa-list-check',
        badgeClass: 'badge-type-choice',
        description: 'Questions with multiple selectable options (options A, B, C, D).'
    },
    [BOOLEAN]: {
        id: BOOLEAN,
        label: 'True / False',
        shortLabel: 'T / F',
        icon: 'fa-check-double',
        badgeClass: 'badge-type-boolean',
        description: 'Binary questions with true or false statements.'
    },
    [WRITTEN]: {
        id: WRITTEN,
        label: 'Essay / Written',
        shortLabel: 'Written',
        icon: 'fa-pen-to-square',
        badgeClass: 'badge-type-written',
        description: 'Open-ended essay and written reflection questions with model solutions.'
    }
};

/**
 * Retrieves metadata for a specific question type with safe fallback to MULTIPLE_CHOICE.
 *
 * @param {string} rawType - The type identifier from question JSON.
 * @returns {object} The question type definition with localized labels.
 */
export function getQuestionTypeInfo(rawType) {
    const canonicalId = normalizeQuestionType(rawType);
    const base = QUESTION_TYPES[canonicalId] || QUESTION_TYPES[MULTIPLE_CHOICE];

    return {
        ...base,
        label: t(`type_${base.id}`),
        shortLabel: t(`type_${base.id}_short`),
        description: t(`type_${base.id}_desc`)
    };
}

/**
 * Extracts a normalized, unique list of question types present in an exam object.
 *
 * @param {object} exam - The exam object (from index.json or local storage).
 * @returns {string[]} Array of normalized type identifiers.
 */
export function getExamQuestionTypes(exam) {
    if (!exam) return [MULTIPLE_CHOICE];

    const typesList = exam.question_types || exam.tipos_perguntas;
    if (Array.isArray(typesList) && typesList.length > 0) {
        return [...new Set(typesList.map(typeId => getQuestionTypeInfo(typeId).id))];
    }

    const questionsList = exam.questions || exam.perguntas;
    if (Array.isArray(questionsList) && questionsList.length > 0) {
        return [...new Set(questionsList.map(q => getQuestionTypeInfo(q.type || q.tipo).id))];
    }

    return [MULTIPLE_CHOICE];
}

/**
 * Generates the HTML split capsule showing all question types included in an exam.
 * Features: Single continuous capsule, type icons on the left, short labels, and checkbox icons (☑ / ☐) on the right.
 *
 * @param {string[]} types - Array of question type identifiers.
 * @param {string[]} [excludedTypes=[]] - Array of type identifiers currently excluded.
 * @returns {string} HTML string representing the interactive split capsule.
 */
export function renderQuestionTypeTagsHTML(types, excludedTypes = []) {
    if (!Array.isArray(types) || types.length === 0) {
        types = [MULTIPLE_CHOICE];
    }

    const segmentsHTML = types.map(tipo => {
        const info = getQuestionTypeInfo(tipo);
        const isExcluded = excludedTypes.includes(info.id);
        const excludedClass = isExcluded ? 'type-excluded' : '';
        const title = isExcluded
            ? `Excluído: ${info.label} (Clique para incluir)`
            : `Incluído: ${info.label} (Clique para excluir)`;
        const label = info.shortLabel || info.label;

        const actionHTML = isExcluded
            ? `<span class="chip-action-bubble" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>`
            : `<span class="chip-action-bubble" aria-hidden="true"><i class="fa-solid fa-xmark"></i></span>`;

        return `
            <button type="button"
                    class="exam-type-segment ${info.badgeClass} ${excludedClass}"
                    data-type="${info.id}"
                    title="${escapeHTML(title)}"
                    aria-label="${escapeHTML(title)}"
                    aria-pressed="${isExcluded ? 'false' : 'true'}">
                <i class="fa-solid ${info.icon} chip-type-icon" aria-hidden="true"></i>
                <span class="type-segment-text">${escapeHTML(label)}</span>
                ${actionHTML}
            </button>
        `;
    }).join('');

    return `<div class="exam-types-capsule interactive" role="group" aria-label="Filtro de tipos de perguntas">${segmentsHTML}</div>`;
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

    const qText = q.question !== undefined ? q.question : q.pergunta;
    if (!qText || (typeof qText !== 'string' && typeof qText !== 'object')) {
        return { valid: false, error: "Campo 'question' obrigatório ausente ou inválido." };
    }

    const qType = q.type || q.tipo;
    const info = getQuestionTypeInfo(qType);
    const qSol = q.solution !== undefined ? q.solution : q.solucao;
    const qOpts = q.options !== undefined ? q.options : q.opcoes;

    if (info.id === WRITTEN) {
        if (qSol === undefined || (typeof qSol !== 'string' && typeof qSol !== 'object')) {
            return { valid: false, error: `Type '${WRITTEN}' requires a valid textual 'solution'.` };
        }
        return { valid: true };
    }

    if (info.id === BOOLEAN) {
        const isValid = qSol === 0 || qSol === 1 || (Array.isArray(qSol) && qSol.length > 0 && (qSol[0] === 0 || qSol[0] === 1));
        if (!isValid) {
            return { valid: false, error: `Type '${BOOLEAN}' requires 'solution' to be 0 (True) or 1 (False).` };
        }
        return { valid: true };
    }

    // Default: multiple_choice
    let optCount = 0;
    if (Array.isArray(qOpts)) {
        optCount = qOpts.length;
    } else if (qOpts && typeof qOpts === 'object') {
        const firstLang = Object.keys(qOpts)[0];
        optCount = Array.isArray(qOpts[firstLang]) ? qOpts[firstLang].length : 0;
    }

    if (optCount < 2) {
        return { valid: false, error: `Type '${MULTIPLE_CHOICE}' requires at least 2 items in 'options'.` };
    }

    if (!Array.isArray(qSol) || qSol.length === 0) {
        return { valid: false, error: `Type '${MULTIPLE_CHOICE}' requires an array of indices in 'solution'.` };
    }

    for (const s of qSol) {
        if (typeof s !== 'number' || s < 0 || s >= optCount) {
            return { valid: false, error: `Solution index [${s}] is out of bounds for options (0 to ${optCount - 1}).` };
        }
    }

    return { valid: true };
}
