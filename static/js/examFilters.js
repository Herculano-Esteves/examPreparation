/**
 * examFilters.js
 * --------------
 * Orquestrador modular dos controlos da barra lateral de filtros:
 * - Pesquisa por texto com botão de limpar
 * - Checkboxes de estado dos exames (Realizados / Pendentes)
 * - Checkboxes de tipologias de questões
 * - Instâncias modulares de dualRangeSlider para Questões e Classificação
 * - Botão de Reposição e Sincronização de UI
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { ExamService } from './examService.js';
import { showToast } from './utils.js';
import { t, updateSortDropdownLabel } from './i18n.js';
import { ALL_QUESTION_TYPES, ALL_EXAM_STATES, clampQuestionsRange, clampScoreRange, sanitizeQuestionsMax, sanitizeQuestionsMin } from './filterState.js';
import { createDualRangeSlider } from './dualRangeSlider.js';

export { ALL_QUESTION_TYPES, ALL_EXAM_STATES };

/**
 * Calcula os tipos excluídos efetivos para um exame, combinando:
 * 1. Tipos desmarcados globalmente na barra lateral.
 * 2. Exclusões específicas do exame assinaladas na pílula do cartão.
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
let questionsSliderController = null;
let scoreSliderController = null;

/**
 * Inicializa todos os controlos da barra lateral flutuante de filtros.
 * @param {Function} onFilterChange - Callback invocado sempre que um critério é alterado.
 */
export function initFloatingFilters(onFilterChange) {
    if (floatingFiltersInitialized) return;
    floatingFiltersInitialized = true;

    // 1. Campo de Pesquisa de Exames
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

    // 2. Checkboxes de Estado do Exame
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

    // 3. Checkboxes de Tipologias de Questão
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

    // 4. Controlador Modular de Slider Duplo: Nº de Questões
    const qWrapper = document.querySelector('#slider-questions-min')?.closest('.dual-range-slider-wrapper');
    const qMinSlider = elements.sliderQuestionsMin || document.getElementById('slider-questions-min');
    const qMaxSlider = elements.sliderQuestionsMax || document.getElementById('slider-questions-max');
    const qMinInput = elements.filterQuestionsMin || document.getElementById('filter-questions-min');
    const qMaxInput = elements.filterQuestionsMax || document.getElementById('filter-questions-max');
    const qTrack = elements.trackFillQuestions || document.getElementById('track-fill-questions');

    const initialMaxQ = Math.max(1, ...(State.exams || []).map(e => ExamService.getQuestionsCount(e)));

    questionsSliderController = createDualRangeSlider({
        wrapper: qWrapper,
        minSlider: qMinSlider,
        maxSlider: qMaxSlider,
        minInput: qMinInput,
        maxInput: qMaxInput,
        trackFill: qTrack,
        minLimit: 1,
        maxLimit: initialMaxQ,
        onChange: (minVal, maxVal) => {
            State.examQuestionsMin = minVal;
            State.examQuestionsMax = maxVal;
            if (onFilterChange) onFilterChange();
        }
    });

    // 5. Controlador Modular de Slider Duplo: Classificação (%)
    const sWrapper = document.querySelector('#slider-score-min')?.closest('.dual-range-slider-wrapper');
    const sMinSlider = elements.sliderScoreMin || document.getElementById('slider-score-min');
    const sMaxSlider = elements.sliderScoreMax || document.getElementById('slider-score-max');
    const sMinInput = elements.filterScoreMin || document.getElementById('filter-score-min');
    const sMaxInput = elements.filterScoreMax || document.getElementById('filter-score-max');
    const sTrack = elements.trackFillScore || document.getElementById('track-fill-score');

    scoreSliderController = createDualRangeSlider({
        wrapper: sWrapper,
        minSlider: sMinSlider,
        maxSlider: sMaxSlider,
        minInput: sMinInput,
        maxInput: sMaxInput,
        trackFill: sTrack,
        minLimit: 0,
        maxLimit: 100,
        onChange: (minVal, maxVal) => {
            State.examScoreMin = minVal;
            State.examScoreMax = maxVal;
            if (onFilterChange) onFilterChange();
        }
    });

    // 6. Botão de Reposição de Todos os Filtros
    const resetBtn = elements.btnResetGlobalFilters || document.getElementById('btn-reset-global-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetAllFilters(onFilterChange);
            showToast(t('toast_filters_reset'));
        });
    }
}

/**
 * Sincroniza visualmente os inputs e sliders com o Estado atual da aplicação.
 * @param {number} maxQInCadeira Teto máximo de questões da cadeira atual
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
        chk.checked = (State.examStateFilter || ALL_EXAM_STATES).includes(chk.value);
    });

    // Atualiza sliders através dos controladores modulares
    const safeMaxQ = sanitizeQuestionsMax(State.examQuestionsMax, maxQInCadeira);
    const safeMinQ = sanitizeQuestionsMin(State.examQuestionsMin, safeMaxQ);
    State.examQuestionsMax = safeMaxQ;
    State.examQuestionsMin = safeMinQ;

    if (questionsSliderController) {
        questionsSliderController.update(safeMinQ, safeMaxQ, maxQInCadeira);
    } else {
        // Fallback defensivo
        const qMinInput = elements.filterQuestionsMin || document.getElementById('filter-questions-min');
        const qMaxInput = elements.filterQuestionsMax || document.getElementById('filter-questions-max');
        if (qMinInput) qMinInput.value = safeMinQ;
        if (qMaxInput) qMaxInput.value = safeMaxQ;
    }

    const safeScoreRange = clampScoreRange(State.examScoreMin, State.examScoreMax);
    State.examScoreMin = safeScoreRange.min;
    State.examScoreMax = safeScoreRange.max;

    if (scoreSliderController) {
        scoreSliderController.update(safeScoreRange.min, safeScoreRange.max, 100);
    } else {
        const sMinInput = elements.filterScoreMin || document.getElementById('filter-score-min');
        const sMaxInput = elements.filterScoreMax || document.getElementById('filter-score-max');
        if (sMinInput) sMinInput.value = safeScoreRange.min;
        if (sMaxInput) sMaxInput.value = safeScoreRange.max;
    }
}

/**
 * Repõe todos os filtros para o seu estado padrão e atualiza a interface.
 * @param {Function} [onReset]
 */
export function resetAllFilters(onReset) {
    const maxQ = Math.max(1, ...(State.exams || []).map(e => ExamService.getQuestionsCount(e)));

    State.examSearch = '';
    State.examSort = 'default';
    State.examStateFilter = [...ALL_EXAM_STATES];
    State.globalQuestionTypes = [...ALL_QUESTION_TYPES];
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
