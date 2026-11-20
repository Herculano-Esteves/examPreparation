/**
 * builderTemplates.js
 * -------------------
 * Exam Builder defaults, schema templates, and language configuration detection.
 */

import { State } from '../state.js';
import { APP_CONFIG } from '../config.js';

/**
 * Returns array of selected language codes (e.g. ['pt'], ['en'], or ['pt', 'en'])
 * @returns {string[]}
 */
export function getSelectedLanguages() {
    const langSelect = document.getElementById('builder-exam-lang');
    const val = langSelect ? langSelect.value : (State.language || 'pt');
    if (val === 'pt,en' || val === 'en,pt') {
        return ['pt', 'en'];
    }
    if (val === 'en') {
        return ['en'];
    }
    return ['pt'];
}

/**
 * Returns true if the builder is currently configured in bilingual (PT + EN) mode.
 * @returns {boolean}
 */
export function isBilingualMode() {
    return getSelectedLanguages().length > 1;
}

/**
 * Generates an empty default question item respecting active language mode
 * @param {string} [type=APP_CONFIG.questionTypes.MULTIPLE_CHOICE] - 'multiple_choice' | 'boolean' | 'written'
 * @returns {object}
 */
export function createDefaultQuestion(type = APP_CONFIG.questionTypes.MULTIPLE_CHOICE) {
    const bilingual = isBilingualMode();
    const { MULTIPLE_CHOICE, BOOLEAN, WRITTEN } = APP_CONFIG.questionTypes;

    if (type === BOOLEAN) {
        return {
            type: BOOLEAN,
            question: bilingual ? { pt: '', en: '' } : '',
            solution: 0,
            explanation: bilingual ? { pt: '', en: '' } : ''
        };
    }
    if (type === WRITTEN) {
        return {
            type: WRITTEN,
            question: bilingual ? { pt: '', en: '' } : '',
            solution: bilingual ? { pt: '', en: '' } : '',
            explanation: bilingual ? { pt: '', en: '' } : ''
        };
    }
    return {
        type: MULTIPLE_CHOICE,
        question: bilingual ? { pt: '', en: '' } : '',
        options: bilingual ? { pt: ['', '', '', ''], en: ['', '', '', ''] } : ['', '', '', ''],
        solution: [0],
        explanation: bilingual ? { pt: '', en: '' } : ''
    };
}
