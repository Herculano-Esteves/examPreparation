/**
 * examSorting.js
 * --------------
 * Handles sorting dropdown interaction and exam sorting algorithms.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { ExamService } from './examService.js';
import { updateSortDropdownLabel, getCurrentLanguage } from './i18n.js';

let sortDropdownInitialized = false;

/**
 * Initializes sort dropdown trigger, menu, keyboard navigation, and clicks.
 * @param {Function} onSortChange - Callback invoked when sort option changes.
 */
export function initSortDropdown(onSortChange) {
    if (sortDropdownInitialized) return;
    sortDropdownInitialized = true;

    const trigger = elements.sortDropdownTrigger || document.getElementById('sort-dropdown-trigger');
    const menu = elements.sortDropdownMenu || document.getElementById('sort-dropdown-menu');
    const dropdown = elements.sortDropdown || document.getElementById('sort-dropdown');

    if (trigger && menu) {
        const toggleDropdown = (open) => {
            const isCurrentlyOpen = trigger.getAttribute('aria-expanded') === 'true';
            const shouldOpen = (typeof open === 'boolean') ? open : !isCurrentlyOpen;
            trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            menu.classList.toggle('open', shouldOpen);
            if (dropdown) dropdown.classList.toggle('open', shouldOpen);
        };

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });

        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                toggleDropdown(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
                toggleDropdown(false);
                trigger.focus();
            }
        });

        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = item.getAttribute('data-value');
                State.examSort = value;

                menu.querySelectorAll('.dropdown-item').forEach(i => {
                    const isSelected = i === item;
                    i.classList.toggle('active', isSelected);
                    i.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                });

                updateSortDropdownLabel();
                toggleDropdown(false);
                if (onSortChange) onSortChange();
            });
        });
    }
}

/**
 * Sorts an array of prepared exam objects in-place or returns the sorted array.
 *
 * @param {object[]} examsList
 * @param {string} [sortMode]
 * @param {string} [lang]
 * @returns {object[]}
 */
export function sortExams(examsList, sortMode = 'default', lang = null, prioritizedLang = null) {
    const currentLang = lang || getCurrentLanguage();
    const shouldPrioritize = State && State.prioritizeLanguage !== false;
    const pLang = shouldPrioritize ? (prioritizedLang || (State && State.prioritizedLanguage) || (State && State.examLanguageFilter?.length === 1 ? State.examLanguageFilter[0] : currentLang)) : null;

    return examsList.sort((a, b) => {
        // Prioridade 1: Idioma Selecionado/Prioritário (se ativado)
        if (pLang) {
            const aSupports = ExamService.isLanguageSupported(a, pLang);
            const bSupports = ExamService.isLanguageSupported(b, pLang);
            if (aSupports && !bSupports) return -1;
            if (!aSupports && bSupports) return 1;
        }

        // Prioridade 2: Modo de Ordenação Selecionado
        if (sortMode === 'score_desc') {
            const scoreA = a._isAttempted ? a._scorePercentage : -1;
            const scoreB = b._isAttempted ? b._scorePercentage : -1;
            return (scoreB - scoreA) || (b._activeCount - a._activeCount) || (a._originalIndex - b._originalIndex);
        }
        if (sortMode === 'score_asc') {
            const scoreA = a._isAttempted ? a._scorePercentage : 999;
            const scoreB = b._isAttempted ? b._scorePercentage : 999;
            return (scoreA - scoreB) || (a._activeCount - b._activeCount) || (a._originalIndex - b._originalIndex);
        }
        if (sortMode === 'questions_desc') {
            return (b._activeCount - a._activeCount) || (b._totalCount - a._totalCount) || (a._originalIndex - b._originalIndex);
        }
        if (sortMode === 'questions_asc') {
            return (a._activeCount - b._activeCount) || (a._totalCount - b._totalCount) || (a._originalIndex - b._originalIndex);
        }
        if (sortMode === 'title_asc') {
            const titleA = ExamService.getTitle(a, pLang || currentLang);
            const titleB = ExamService.getTitle(b, pLang || currentLang);
            return titleA.localeCompare(titleB, currentLang, { numeric: true, sensitivity: 'base' });
        }
        if (sortMode === 'title_desc') {
            const titleA = ExamService.getTitle(a, pLang || currentLang);
            const titleB = ExamService.getTitle(b, pLang || currentLang);
            return titleB.localeCompare(titleA, currentLang, { numeric: true, sensitivity: 'base' });
        }
        return a._originalIndex - b._originalIndex;
    });
}
