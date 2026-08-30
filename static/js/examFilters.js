/**
 * examFilters.js
 * --------------
 * Handles floating filter sidebar state, controls, range sliders,
 * checkboxes, search inputs, and UI synchronization.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { ExamService } from './examService.js';
import { showToast } from './utils.js';
import { t, updateSortDropdownLabel } from './i18n.js';

export const ALL_QUESTION_TYPES = ['escolha_multipla', 'boolean', 'escrita'];

/**
 * Calculates effective excluded types for an exam by merging:
 * 1. Globally unchecked question types from the floating sidebar.
 * 2. Exam-specific exclusions toggled directly on the card capsule.
 *
 * @param {object} exam
 * @returns {string[]}
 */
export function getEffectiveExcludedTypes(exam) {
    const globalExcluded = ALL_QUESTION_TYPES.filter(t => !State.globalQuestionTypes.includes(t));
    const examExcluded = State.examFilters && State.examFilters[exam.id] ? State.examFilters[exam.id] : [];
    return Array.from(new Set([...globalExcluded, ...examExcluded]));
}

let floatingFiltersInitialized = false;

/**
 * Initializes floating sidebar filter controls.
 * @param {Function} onFilterChange - Callback invoked when filter values change.
 */
export function initFloatingFilters(onFilterChange) {
    if (floatingFiltersInitialized) return;
    floatingFiltersInitialized = true;

    // 0. Search input
    const examSearchInput = elements.filterExamSearch || document.getElementById('filter-exam-search');
    const examSearchClear = elements.btnClearExamSearch || document.getElementById('btn-clear-exam-search');

    if (examSearchInput) {
        examSearchInput.addEventListener('input', () => {
            State.examSearch = examSearchInput.value;
            if (examSearchClear) {
                examSearchClear.style.display = examSearchInput.value.trim() ? 'inline-flex' : 'none';
            }
            if (onFilterChange) onFilterChange();
        });
    }

    if (examSearchClear) {
        examSearchClear.addEventListener('click', () => {
            State.examSearch = '';
            if (examSearchInput) {
                examSearchInput.value = '';
                examSearchInput.focus();
            }
            examSearchClear.style.display = 'none';
            if (onFilterChange) onFilterChange();
        });
    }

    // 1. Exam State Checkboxes
    const stateCheckboxes = document.querySelectorAll('.floating-state-check-input');
    stateCheckboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const activeStates = [];
            stateCheckboxes.forEach(c => {
                if (c.checked) activeStates.push(c.value);
            });
            State.examStateFilter = activeStates;
            if (onFilterChange) onFilterChange();
        });
    });

    // 2. Question Types Checkboxes
    const typeCheckboxes = document.querySelectorAll('.floating-check-input');
    typeCheckboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const activeTypes = [];
            typeCheckboxes.forEach(c => {
                if (c.checked) activeTypes.push(c.value);
            });
            State.globalQuestionTypes = activeTypes;
            if (onFilterChange) onFilterChange();
        });
    });

    // 3. Questions Range Slider & Inputs
    const qMinSlider = elements.sliderQuestionsMin || document.getElementById('slider-questions-min');
    const qMaxSlider = elements.sliderQuestionsMax || document.getElementById('slider-questions-max');
    const qMinInput = elements.filterQuestionsMin || document.getElementById('filter-questions-min');
    const qMaxInput = elements.filterQuestionsMax || document.getElementById('filter-questions-max');
    const qTrack = elements.trackFillQuestions || document.getElementById('track-fill-questions');

    const updateQuestionsTrackUI = (minVal, maxVal) => {
        if (!qTrack) return;
        const maxLimit = Math.max(1, ...(State.exams || []).map(e => ExamService.getQuestionsCount(e)));
        const span = Math.max(1, maxLimit - 1);
        const leftPercent = Math.max(0, Math.min(100, ((minVal - 1) / span) * 100));
        const rightPercent = Math.max(0, Math.min(100, 100 - (((maxVal - 1) / span) * 100)));
        qTrack.style.left = `${leftPercent}%`;
        qTrack.style.right = `${rightPercent}%`;
    };

    if (qMinSlider) {
        qMinSlider.addEventListener('input', () => {
            let minVal = parseInt(qMinSlider.value, 10);
            let maxVal = parseInt(qMaxSlider ? qMaxSlider.value : (State.examQuestionsMax || 999), 10);
            if (minVal > maxVal) {
                minVal = maxVal;
                qMinSlider.value = minVal;
            }
            State.examQuestionsMin = minVal;
            if (qMinInput) qMinInput.value = minVal;
            updateQuestionsTrackUI(minVal, maxVal);
            if (onFilterChange) onFilterChange();
        });
    }

    if (qMaxSlider) {
        qMaxSlider.addEventListener('input', () => {
            let minVal = parseInt(qMinSlider ? qMinSlider.value : (State.examQuestionsMin || 1), 10);
            let maxVal = parseInt(qMaxSlider.value, 10);
            if (maxVal < minVal) {
                maxVal = minVal;
                qMaxSlider.value = maxVal;
            }
            State.examQuestionsMax = maxVal;
            if (qMaxInput) qMaxInput.value = maxVal;
            updateQuestionsTrackUI(minVal, maxVal);
            if (onFilterChange) onFilterChange();
        });
    }

    if (qMinInput) {
        qMinInput.addEventListener('input', () => {
            let val = parseInt(qMinInput.value, 10);
            if (isNaN(val)) val = 1;
            val = Math.max(1, Math.min(State.examQuestionsMax || 999, val));
            State.examQuestionsMin = val;
            if (qMinSlider) qMinSlider.value = val;
            updateQuestionsTrackUI(val, State.examQuestionsMax || 999);
            if (onFilterChange) onFilterChange();
        });
    }

    if (qMaxInput) {
        qMaxInput.addEventListener('input', () => {
            let val = parseInt(qMaxInput.value, 10);
            const maxLimit = Math.max(1, ...(State.exams || []).map(e => ExamService.getQuestionsCount(e)));
            if (isNaN(val)) val = maxLimit;
            val = Math.max(State.examQuestionsMin || 1, Math.min(maxLimit, val));
            State.examQuestionsMax = val;
            if (qMaxSlider) qMaxSlider.value = val;
            updateQuestionsTrackUI(State.examQuestionsMin || 1, val);
            if (onFilterChange) onFilterChange();
        });
    }

    // 4. Score Range Slider & Inputs
    const sMinSlider = elements.sliderScoreMin || document.getElementById('slider-score-min');
    const sMaxSlider = elements.sliderScoreMax || document.getElementById('slider-score-max');
    const sMinInput = elements.filterScoreMin || document.getElementById('filter-score-min');
    const sMaxInput = elements.filterScoreMax || document.getElementById('filter-score-max');
    const sTrack = elements.trackFillScore || document.getElementById('track-fill-score');

    const updateScoreTrackUI = (minVal, maxVal) => {
        if (!sTrack) return;
        sTrack.style.left = `${minVal}%`;
        sTrack.style.right = `${100 - maxVal}%`;
    };

    if (sMinSlider) {
        sMinSlider.addEventListener('input', () => {
            let minVal = parseInt(sMinSlider.value, 10);
            let maxVal = parseInt(sMaxSlider ? sMaxSlider.value : (State.examScoreMax || 100), 10);
            if (minVal > maxVal) {
                minVal = maxVal;
                sMinSlider.value = minVal;
            }
            State.examScoreMin = minVal;
            if (sMinInput) sMinInput.value = minVal;
            updateScoreTrackUI(minVal, maxVal);
            if (onFilterChange) onFilterChange();
        });
    }

    if (sMaxSlider) {
        sMaxSlider.addEventListener('input', () => {
            let minVal = parseInt(sMinSlider ? sMinSlider.value : (State.examScoreMin || 0), 10);
            let maxVal = parseInt(sMaxSlider.value, 10);
            if (maxVal < minVal) {
                maxVal = minVal;
                sMaxSlider.value = maxVal;
            }
            State.examScoreMax = maxVal;
            if (sMaxInput) sMaxInput.value = maxVal;
            updateScoreTrackUI(minVal, maxVal);
            if (onFilterChange) onFilterChange();
        });
    }

    if (sMinInput) {
        sMinInput.addEventListener('input', () => {
            let val = parseInt(sMinInput.value, 10);
            if (isNaN(val)) val = 0;
            val = Math.max(0, Math.min(State.examScoreMax || 100, val));
            State.examScoreMin = val;
            if (sMinSlider) sMinSlider.value = val;
            updateScoreTrackUI(val, State.examScoreMax || 100);
            if (onFilterChange) onFilterChange();
        });
    }

    if (sMaxInput) {
        sMaxInput.addEventListener('input', () => {
            let val = parseInt(sMaxInput.value, 10);
            if (isNaN(val)) val = 100;
            val = Math.max(State.examScoreMin || 0, Math.min(100, val));
            State.examScoreMax = val;
            if (sMaxSlider) sMaxSlider.value = val;
            updateScoreTrackUI(State.examScoreMin || 0, val);
            if (onFilterChange) onFilterChange();
        });
    }

    // 5. Reset Filters Button
    const resetBtn = elements.btnResetGlobalFilters || document.getElementById('btn-reset-global-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetAllFilters(onFilterChange);
            showToast(t('toast_filters_reset'));
        });
    }
}

/**
 * Synchronizes UI input values and sliders with current State.
 * @param {number} maxQInCadeira
 */
export function syncFilterInputsUI(maxQInCadeira) {
    const examSearchInput = elements.filterExamSearch || document.getElementById('filter-exam-search');
    const examSearchClear = elements.btnClearExamSearch || document.getElementById('btn-clear-exam-search');
    if (examSearchInput && examSearchInput.value !== (State.examSearch || '')) {
        examSearchInput.value = State.examSearch || '';
    }
    if (examSearchClear) {
        examSearchClear.style.display = (State.examSearch || '').trim() ? 'inline-flex' : 'none';
    }

    document.querySelectorAll('.floating-check-input').forEach(chk => {
        chk.checked = (State.globalQuestionTypes || ALL_QUESTION_TYPES).includes(chk.value);
    });

    document.querySelectorAll('.floating-state-check-input').forEach(chk => {
        chk.checked = (State.examStateFilter || ['completed', 'pending']).includes(chk.value);
    });

    const qMinInput = elements.filterQuestionsMin || document.getElementById('filter-questions-min');
    const qMaxInput = elements.filterQuestionsMax || document.getElementById('filter-questions-max');
    if (qMinInput) {
        qMinInput.value = State.examQuestionsMin;
        qMinInput.max = maxQInCadeira;
    }
    if (qMaxInput) {
        qMaxInput.value = State.examQuestionsMax;
        qMaxInput.max = maxQInCadeira;
    }

    const sMinInput = elements.filterScoreMin || document.getElementById('filter-score-min');
    const sMaxInput = elements.filterScoreMax || document.getElementById('filter-score-max');
    if (sMinInput) sMinInput.value = State.examScoreMin;
    if (sMaxInput) sMaxInput.value = State.examScoreMax;

    const qMinSlider = elements.sliderQuestionsMin || document.getElementById('slider-questions-min');
    const qMaxSlider = elements.sliderQuestionsMax || document.getElementById('slider-questions-max');
    const qTrack = elements.trackFillQuestions || document.getElementById('track-fill-questions');
    if (qMinSlider) {
        qMinSlider.min = 1;
        qMinSlider.max = maxQInCadeira;
        qMinSlider.value = State.examQuestionsMin;
    }
    if (qMaxSlider) {
        qMaxSlider.min = 1;
        qMaxSlider.max = maxQInCadeira;
        qMaxSlider.value = State.examQuestionsMax;
    }
    if (qTrack) {
        const span = Math.max(1, maxQInCadeira - 1);
        const leftPercent = Math.max(0, Math.min(100, ((State.examQuestionsMin - 1) / span) * 100));
        const rightPercent = Math.max(0, Math.min(100, 100 - (((State.examQuestionsMax - 1) / span) * 100)));
        qTrack.style.left = `${leftPercent}%`;
        qTrack.style.right = `${rightPercent}%`;
    }

    const sMinSlider = elements.sliderScoreMin || document.getElementById('slider-score-min');
    const sMaxSlider = elements.sliderScoreMax || document.getElementById('slider-score-max');
    const sTrack = elements.trackFillScore || document.getElementById('track-fill-score');
    if (sMinSlider) sMinSlider.value = State.examScoreMin;
    if (sMaxSlider) sMaxSlider.value = State.examScoreMax;
    if (sTrack) {
        sTrack.style.left = `${State.examScoreMin}%`;
        sTrack.style.right = `${100 - State.examScoreMax}%`;
    }
}

/**
 * Resets all floating filters to their default state.
 * @param {Function} [onReset]
 */
export function resetAllFilters(onReset) {
    const maxQ = Math.max(1, ...(State.exams || []).map(e => ExamService.getQuestionsCount(e)));

    State.examSearch = '';
    State.examSort = 'default';
    State.examStateFilter = ['completed', 'pending'];
    State.globalQuestionTypes = ALL_QUESTION_TYPES;
    State.examFilters = {};
    State.examQuestionsMin = 1;
    State.examQuestionsMax = maxQ;
    State.examScoreMin = 0;
    State.examScoreMax = 100;

    const examSearchInput = elements.filterExamSearch || document.getElementById('filter-exam-search');
    const examSearchClear = elements.btnClearExamSearch || document.getElementById('btn-clear-exam-search');
    if (examSearchInput) examSearchInput.value = '';
    if (examSearchClear) examSearchClear.style.display = 'none';

    updateSortDropdownLabel();

    const menu = elements.sortDropdownMenu || document.getElementById('sort-dropdown-menu');
    if (menu) {
        menu.querySelectorAll('.dropdown-item').forEach(i => {
            const isDef = i.getAttribute('data-value') === 'default';
            i.classList.toggle('active', isDef);
            i.setAttribute('aria-selected', isDef ? 'true' : 'false');
        });
    }

    syncFilterInputsUI(maxQ);
    if (onReset) onReset();
}
