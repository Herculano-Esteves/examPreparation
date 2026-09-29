/**
 * i18n.js
 * -------
 * Centralized Internationalisation module supporting Portuguese (PT)
 * and British English (EN-GB). Dictionaries are modularized under static/js/locales/.
 */

import { State } from './state.js';
import { APP_CONFIG, getInitialLanguage, persistLanguage, isLanguageSupported } from './config.js';
import { Events, APP_EVENTS } from './events.js';
import { pt } from './locales/pt.js';
import { en } from './locales/en.js';

export const TRANSLATIONS = {
    pt,
    en
};

/**
 * Returns the currently active language code from state or config.
 * @returns {string}
 */
export function getCurrentLanguage() {
    return State.language || getInitialLanguage();
}

/**
 * Translates a key according to the active language with dynamic fallback resolution.
 * Example: t('question_counter', { current: 1, total: 10 })
 *
 * @param {string} key
 * @param {object} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
    const lang = getCurrentLanguage();
    let str = null;

    // 1. Try active language
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key] !== undefined) {
        str = TRANSLATIONS[lang][key];
    } else {
        // 2. Try configured fallback languages in order
        for (const fallbackLang of APP_CONFIG.fallbackLanguages) {
            if (TRANSLATIONS[fallbackLang] && TRANSLATIONS[fallbackLang][key] !== undefined) {
                str = TRANSLATIONS[fallbackLang][key];
                break;
            }
        }
    }

    if (str === null || str === undefined) {
        str = key;
    }

    if (params && typeof params === 'object') {
        Object.keys(params).forEach(k => {
            str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
        });
    }

    return str;
}

/**
 * Updates the sort dropdown trigger label to reflect the current active sort and language.
 */
export function updateSortDropdownLabel() {
    const labelSpan = document.getElementById('sort-dropdown-selected-label');
    if (!labelSpan) return;

    const sortIcons = {
        default: 'fa-list-ol',
        score_desc: 'fa-trophy',
        score_asc: 'fa-trophy',
        questions_desc: 'fa-arrow-down-9-1',
        questions_asc: 'fa-arrow-up-1-9',
        title_asc: 'fa-arrow-down-a-z',
        title_desc: 'fa-arrow-up-z-a'
    };
    const sortKeys = {
        default: 'sort_default',
        score_desc: 'sort_score_desc',
        score_asc: 'sort_score_asc',
        questions_desc: 'sort_questions_desc',
        questions_asc: 'sort_questions_asc',
        title_asc: 'sort_title_asc',
        title_desc: 'sort_title_desc'
    };

    const currentSort = State.examSort || 'default';
    const icon = sortIcons[currentSort] || 'fa-list-ol';
    const key = sortKeys[currentSort] || 'sort_default';

    labelSpan.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i> <span>${t(key)}</span>`;
}

/**
 * Updates the cadeiras sort dropdown trigger label to reflect the current active sort and language.
 */
export function updateSortCadeirasDropdownLabel() {
    const labelSpan = document.getElementById('sort-cadeiras-selected-label');
    if (!labelSpan) return;

    const sortIcons = {
        default: 'fa-list-ol',
        name_asc: 'fa-arrow-down-a-z',
        name_desc: 'fa-arrow-up-z-a',
        sigla_asc: 'fa-font',
        exams_desc: 'fa-arrow-down-9-1',
        exams_asc: 'fa-arrow-up-1-9'
    };
    const sortKeys = {
        default: 'sort_default',
        name_asc: 'sort_title_asc',
        name_desc: 'sort_title_desc',
        sigla_asc: 'sort_sigla_asc',
        exams_desc: 'sort_exams_desc',
        exams_asc: 'sort_exams_asc'
    };

    const currentSort = State.cadeiraSort || 'default';
    const icon = sortIcons[currentSort] || 'fa-list-ol';
    const key = sortKeys[currentSort] || 'sort_default';

    labelSpan.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i> <span>${t(key)}</span>`;
}

/**
 * Applies translations to all DOM elements bearing data-i18n attributes.
 */
export function applyTranslations() {
    const lang = getCurrentLanguage();

    // 1. Text Content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // 2. Input Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', t(key));
    });

    // 3. Titles / Tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });

    // 4. ARIA Labels
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        el.setAttribute('aria-label', t(key));
    });

    // 5. Update HTML lang attribute
    document.documentElement.lang = lang === 'en' ? 'en-GB' : 'pt-PT';

    // 6. Update Sort dropdown trigger labels
    updateSortDropdownLabel();
    updateSortCadeirasDropdownLabel();

    // 7. Update Language selector buttons UI in Settings
    document.querySelectorAll('.btn-lang-option').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        if (btnLang === lang) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
    });
}

/**
 * Sets the active language, persists it to storage, and updates UI.
 *
 * @param {string} lang - 'en' | 'pt'
 */
export function setLanguage(lang) {
    const targetLang = isLanguageSupported(lang) ? lang : APP_CONFIG.defaultLanguage;
    State.language = targetLang;
    persistLanguage(targetLang);
    applyTranslations();
    Events.emit(APP_EVENTS.LANGUAGE_CHANGED, { lang: targetLang });
}
