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
import { t, updateSortDropdownLabel, getCurrentLanguage } from './i18n.js';
import { ALL_QUESTION_TYPES, ALL_EXAM_STATES, ALL_LANGUAGES, clampQuestionsRange, clampScoreRange, sanitizeQuestionsMax, sanitizeQuestionsMin, getEffectiveTargetLanguage } from './filterState.js';
import { createDualRangeSlider } from './dualRangeSlider.js';
import { QuestionStatus } from './storage.js';

export { ALL_QUESTION_TYPES, ALL_EXAM_STATES, ALL_LANGUAGES };

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

    // 3. Checkboxes de Idioma do Exame
    const langCheckboxes = document.querySelectorAll('.floating-lang-check-input');
    langCheckboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const activeLangs = [];
            langCheckboxes.forEach(c => {
                if (c.checked) activeLangs.push(c.value);
            });
            State.examLanguageFilter = activeLangs;
            if (onFilterChange) onFilterChange();
        });
    });

    const priorityCheckbox = elements.filterLangPriority || document.getElementById('filter-lang-priority');
    if (priorityCheckbox) {
        priorityCheckbox.addEventListener('change', () => {
            State.prioritizeLanguage = priorityCheckbox.checked;
            if (onFilterChange) onFilterChange();
        });
    }

    // 4. Checkboxes de Tipologias de Questão
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
            updateFilterOptionCounts();
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
            updateFilterOptionCounts();
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

    document.querySelectorAll('.floating-lang-check-input').forEach(chk => {
        chk.checked = (State.examLanguageFilter || ALL_LANGUAGES).includes(chk.value);
    });

    const priorityCheckbox = elements.filterLangPriority || document.getElementById('filter-lang-priority');
    if (priorityCheckbox) {
        priorityCheckbox.checked = State.prioritizeLanguage !== false;
    }

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

    // Atualiza contadores numéricos das opções de filtros
    updateFilterOptionCounts();
}

/**
 * Sincroniza a classe visual is-prioritized nos itens de idioma da barra lateral.
 */
export function syncLanguagePriorityUI() {
    const pLang = getEffectiveTargetLanguage(State.examLanguageFilter, getCurrentLanguage(), State.prioritizedLanguage);
    document.querySelectorAll('.floating-checkbox-item[data-lang]').forEach(item => {
        const lang = item.getAttribute('data-lang');
        item.classList.toggle('is-prioritized', lang === pLang);
    });
}

/**
 * Atualiza os contadores numéricos abrangidos pelas opções de Estado, Idioma, Tipos de Pergunta,
 * Nº de Questões e Classificação (%).
 * Cada contador reflete individualmente o número de exames abrangidos pela opção (sem parêntesis, sublinhados).
 */
export function updateFilterOptionCounts() {
    const typeExamCounts = {
        escolha_multipla: 0,
        boolean: 0,
        escrita: 0
    };
    let completedExamsCount = 0;
    let pendingExamsCount = 0;
    let langPtCount = 0;
    let langEnCount = 0;
    let questionsMatchCount = 0;
    let scoreMatchCount = 0;

    const minQ = State.examQuestionsMin !== null && State.examQuestionsMin !== undefined ? State.examQuestionsMin : 1;
    const maxQ = State.examQuestionsMax !== null && State.examQuestionsMax !== undefined ? State.examQuestionsMax : 9999;
    const minScore = State.examScoreMin !== null && State.examScoreMin !== undefined ? State.examScoreMin : 0;
    const maxScore = State.examScoreMax !== null && State.examScoreMax !== undefined ? State.examScoreMax : 100;

    (State.exams || []).forEach(exam => {
        // 1. Contagem de exames por idioma
        const langs = ExamService.getLanguages(exam);
        if (langs.includes('pt')) langPtCount++;
        if (langs.includes('en')) langEnCount++;

        // 2. Contagem de exames que contêm cada tipo de pergunta
        const tc = ExamService.getTypesCount(exam);
        const qTypes = ExamService.getQuestionTypes(exam);
        ['escolha_multipla', 'boolean', 'escrita'].forEach(tKey => {
            const hasType = (tc && tc[tKey] > 0) || (Array.isArray(qTypes) && qTypes.includes(tKey));
            if (hasType) {
                typeExamCounts[tKey]++;
            }
        });

        // 3. Estado do exame (realizado / pendente) e pontuação (score)
        const histArr = State.examHistory ? State.examHistory[exam.id] : null;
        let isAttempted = false;
        let scorePct = 0;
        if (Array.isArray(histArr) && histArr.length > 0) {
            const correct = histArr.filter(s => s === QuestionStatus.CORRECT).length;
            const incorrect = histArr.filter(s => s === QuestionStatus.INCORRECT).length;
            const answered = histArr.filter(s => s === QuestionStatus.ANSWERED).length;
            if (correct > 0 || incorrect > 0 || answered > 0) {
                isAttempted = true;
                scorePct = Math.round((correct / histArr.length) * 100);
            }
        }
        if (isAttempted) {
            completedExamsCount++;
        } else {
            pendingExamsCount++;
        }

        // 4. Avaliação individual isolada para Nº de Questões
        const totalQ = ExamService.getQuestionsCount(exam);
        if (totalQ >= minQ && totalQ <= maxQ) {
            questionsMatchCount++;
        }

        // 5. Avaliação individual isolada para Classificação (%)
        if (scorePct >= minScore && scorePct <= maxScore) {
            scoreMatchCount++;
        }
    });

    const elCompleted = elements.countStateCompleted || document.getElementById('count-state-completed');
    const elPending = elements.countStatePending || document.getElementById('count-state-pending');
    if (elCompleted) elCompleted.textContent = `${completedExamsCount}`;
    if (elPending) elPending.textContent = `${pendingExamsCount}`;

    const elLangPt = elements.countLangPt || document.getElementById('count-lang-pt');
    const elLangEn = elements.countLangEn || document.getElementById('count-lang-en');
    if (elLangPt) elLangPt.textContent = `${langPtCount}`;
    if (elLangEn) elLangEn.textContent = `${langEnCount}`;

    const elChoice = elements.countTypeChoice || document.getElementById('count-type-escolha_multipla');
    const elBoolean = elements.countTypeBoolean || document.getElementById('count-type-boolean');
    const elWritten = elements.countTypeWritten || document.getElementById('count-type-escrita');
    if (elChoice) elChoice.textContent = `${typeExamCounts.escolha_multipla}`;
    if (elBoolean) elBoolean.textContent = `${typeExamCounts.boolean}`;
    if (elWritten) elWritten.textContent = `${typeExamCounts.escrita}`;

    const elQuestions = elements.countFilterQuestions || document.getElementById('count-filter-questions');
    const elScore = elements.countFilterScore || document.getElementById('count-filter-score');
    if (elQuestions) elQuestions.textContent = `${questionsMatchCount}`;
    if (elScore) elScore.textContent = `${scoreMatchCount}`;
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
    State.examLanguageFilter = [...ALL_LANGUAGES];
    State.prioritizedLanguage = getCurrentLanguage();
    State.prioritizeLanguage = true;
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
