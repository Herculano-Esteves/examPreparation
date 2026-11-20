/**
 * config.js
 * ---------
 * Single source of truth for global application settings, supported locales,
 * storage keys, and user preference persistence.
 */

export const APP_CONFIG = {
    // Default language for fresh visits or unconfigured sessions
    defaultLanguage: 'en',

    // List of all fully supported language codes
    supportedLanguages: ['en', 'pt'],

    // Fallback search order when resolving multilingual content fields
    fallbackLanguages: ['en', 'pt'],

    // Storage keys used in localStorage
    storageKeys: {
        language: 'app_language',
        languageConfigured: 'simulador_lingua_configurada',
        version: 'simulador_storage_version',
        cadeiras: 'simulador_cadeiras_locais',
        exames: 'simulador_exames_locais',
        history: 'simulador_historico_exames',
        difficultQuestions: 'simulador_perguntas_dificeis'
    },

    // Canonical question type identifiers (English-first)
    questionTypes: {
        MULTIPLE_CHOICE: 'multiple_choice',
        BOOLEAN: 'boolean',
        WRITTEN: 'written'
    },

    // Accepted type aliases mapped to canonical English question types (backwards compatibility)
    questionTypeAliases: {
        multiple_choice: 'multiple_choice',
        'multiple-choice': 'multiple_choice',
        escolha_multipla: 'multiple_choice',
        multipla: 'multiple_choice',
        boolean: 'boolean',
        true_false: 'boolean',
        verdadeiro_falso: 'boolean',
        tf: 'boolean',
        written: 'written',
        escrita: 'written',
        essay: 'written',
        aberta: 'written',
        redacao: 'written',
        desenvolvimento: 'written'
    },

    // Storage version for automatic schema migrations
    storageVersion: '1.1.0'
};

/**
 * Normalizes a question type string (including legacy Portuguese aliases)
 * to its canonical English identifier defined in APP_CONFIG.questionTypes.
 * Returns null if rawType is non-empty and unrecognized.
 *
 * @param {string} rawType
 * @returns {string|null}
 */
export function resolveQuestionType(rawType) {
    if (!rawType || typeof rawType !== 'string') {
        return APP_CONFIG.questionTypes.MULTIPLE_CHOICE;
    }
    const key = rawType.toLowerCase().trim();
    return APP_CONFIG.questionTypeAliases[key] || null;
}

/**
 * Normalizes a question type string with safe fallback to MULTIPLE_CHOICE.
 *
 * @param {string} rawType
 * @returns {string}
 */
export function normalizeQuestionType(rawType) {
    return resolveQuestionType(rawType) || APP_CONFIG.questionTypes.MULTIPLE_CHOICE;
}

/**
 * Checks whether the user has explicitly selected/configured their language preference.
 * Returns false if the key does not exist or is not 'true'.
 * @returns {boolean}
 */
export function isLanguageConfigured() {
    try {
        return localStorage.getItem(APP_CONFIG.storageKeys.languageConfigured) === 'true';
    } catch (e) {
        console.warn('Unable to access localStorage for language configuration check:', e);
        return false;
    }
}

/**
 * Marks the language preference as configured (or resets it).
 * @param {boolean} [configured=true]
 */
export function setLanguageConfigured(configured = true) {
    try {
        if (configured) {
            localStorage.setItem(APP_CONFIG.storageKeys.languageConfigured, 'true');
        } else {
            localStorage.removeItem(APP_CONFIG.storageKeys.languageConfigured);
        }
    } catch (e) {
        console.error('Failed to update language configured flag:', e);
    }
}

/**
 * Retrieves the active language preference from localStorage or returns the default.
 * @returns {string}
 */
export function getInitialLanguage() {
    try {
        const saved = localStorage.getItem(APP_CONFIG.storageKeys.language);
        if (saved && APP_CONFIG.supportedLanguages.includes(saved)) {
            return saved;
        }
    } catch (e) {
        console.warn('Unable to access localStorage for language setting:', e);
    }
    return APP_CONFIG.defaultLanguage;
}

/**
 * Persists the user's language preference to localStorage.
 * @param {string} lang
 */
export function persistLanguage(lang) {
    if (APP_CONFIG.supportedLanguages.includes(lang)) {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.language, lang);
        } catch (e) {
            console.error('Failed to persist language preference:', e);
        }
    }
}

/**
 * Checks whether a language code is currently supported by the application.
 * @param {string} lang
 * @returns {boolean}
 */
export function isLanguageSupported(lang) {
    return APP_CONFIG.supportedLanguages.includes(lang);
}
