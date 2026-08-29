/**
 * exams.js
 * --------
 * Manages fetching, rendering, and starting exams for the active cadeira.
 * Clean card layout with Title first, description underneath, and question count at the bottom.
 * Full WCAG 2.1 AA / EAA 2025 keyboard accessibility.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML, clampCardDescriptions, showToast } from './utils.js';
import { loadLocalData, QuestionStatus } from './storage.js';
import { transitionTo } from './navigation.js';
import { renderQuestion } from './question.js';
import { getExamQuestionTypes, getQuestionTypeInfo, renderQuestionTypeTagsHTML } from './questionTypes.js';

const ALL_QUESTION_TYPES = ['escolha_multipla', 'boolean', 'escrita'];

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

/**
 * Calculates the total and remaining active questions count after applying exclusions.
 *
 * @param {object} exam
 * @param {string[]} excludedTypes
 * @returns {{ totalCount: number, activeCount: number }}
 */
function getExamFilteredCount(exam, excludedTypes = []) {
    const totalCount = exam.perguntas
        ? exam.perguntas.length
        : (exam.perguntas_count || 0);

    if (!excludedTypes || excludedTypes.length === 0) {
        return { totalCount, activeCount: totalCount };
    }

    if (exam.tipos_contagem) {
        let excludedSum = 0;
        excludedTypes.forEach(t => {
            excludedSum += (exam.tipos_contagem[t] || 0);
        });
        return {
            totalCount,
            activeCount: Math.max(0, totalCount - excludedSum)
        };
    }

    if (Array.isArray(exam.perguntas)) {
        const active = exam.perguntas.filter(q => !excludedTypes.includes(getQuestionTypeInfo(q.tipo).id)).length;
        return { totalCount, activeCount: active };
    }

    return { totalCount, activeCount: totalCount };
}

/**
 * Generates the score percentage badge HTML for an exam based on its saved question status array.
 *
 * @param {string} examId
 * @returns {string} HTML string of the score badge, or empty string if no questions answered
 */
export function renderExamScoreBadgeHTML(examId) {
    if (!State.examHistory) return '';
    let histArr = State.examHistory[examId];
    if (!histArr) return '';

    // Converter dados legados se existirem
    if (!Array.isArray(histArr) && typeof histArr === 'object' && Array.isArray(histArr.questions)) {
        histArr = histArr.questions.map(q => {
            if (q.status === 'correct' || q.isCorrect === true) return QuestionStatus.CORRECT;
            if (q.status === 'incorrect' || q.isCorrect === false) return QuestionStatus.INCORRECT;
            return QuestionStatus.UNANSWERED;
        });
        State.examHistory[examId] = histArr;
    }

    if (!Array.isArray(histArr) || histArr.length === 0) return '';

    const total = histArr.length;
    const correctCount = histArr.filter(s => s === QuestionStatus.CORRECT).length;
    const incorrectCount = histArr.filter(s => s === QuestionStatus.INCORRECT).length;
    const unansweredCount = histArr.filter(s => s === QuestionStatus.UNANSWERED || s === 0 || !s).length;

    // Se ainda nenhuma pergunta foi respondida neste exame, não exibe badge
    if (correctCount === 0 && incorrectCount === 0) return '';

    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    let badgeClass = 'score-badge-low';
    let iconClass = 'fa-circle-xmark';

    if (pct >= 70) {
        badgeClass = 'score-badge-high';
        iconClass = 'fa-circle-check';
    } else if (pct >= 50) {
        badgeClass = 'score-badge-medium';
        iconClass = 'fa-circle-exclamation';
    }

    const title = `Aproveitamento: ${pct}% (${correctCount} corretas, ${incorrectCount} erradas, ${unansweredCount} por fazer)`;

    return `
        <span class="exam-score-badge ${badgeClass}" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}">
            <i class="fa-solid ${iconClass}" aria-hidden="true"></i>
            <span>${pct}%</span>
        </span>
    `;
}

/**
 * Updates the action counter and capsule button states for a specific exam row.
 *
 * @param {HTMLElement} row
 * @param {object} exam
 */
function updateExamRowUI(row, exam) {
    const excluded = getEffectiveExcludedTypes(exam);
    const { totalCount, activeCount } = getExamFilteredCount(exam, excluded);

    const actionEl = row.querySelector('.exam-list-action');
    if (actionEl) {
        const totalLabel = totalCount === 1 ? '1 questão' : `${totalCount} questões`;
        if (activeCount === totalCount) {
            actionEl.innerHTML = `[ ${totalLabel} ]`;
        } else {
            const activeLabel = activeCount === 1 ? '1 questão' : `${activeCount} questões`;
            actionEl.innerHTML = `[ <s class="count-old">${totalCount}</s> <span class="count-new ${activeCount === 0 ? 'count-zero' : ''}">${activeLabel}</span> ]`;
        }
    }

    row.querySelectorAll('.exam-type-segment').forEach(btn => {
        const typeId = btn.getAttribute('data-type');
        const isExcluded = excluded.includes(typeId);
        const info = getQuestionTypeInfo(typeId);
        const label = info.shortLabel || info.label;

        const actionHTML = isExcluded
            ? `<span class="chip-action-bubble" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>`
            : `<span class="chip-action-bubble" aria-hidden="true"><i class="fa-solid fa-xmark"></i></span>`;

        if (isExcluded) {
            btn.classList.add('type-excluded');
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('title', `Excluído: ${info.label} (Clique para incluir)`);
            btn.setAttribute('aria-label', `Excluído: ${info.label} (Clique para incluir)`);
        } else {
            btn.classList.remove('type-excluded');
            btn.setAttribute('aria-pressed', 'true');
            btn.setAttribute('title', `Incluído: ${info.label} (Clique para excluir)`);
            btn.setAttribute('aria-label', `Incluído: ${info.label} (Clique para excluir)`);
        }

        btn.innerHTML = `
            <i class="fa-solid ${info.icon} chip-type-icon" aria-hidden="true"></i>
            <span class="type-segment-text">${escapeHTML(label)}</span>
            ${actionHTML}
        `;
    });
}

let floatingFiltersInitialized = false;

/**
 * Initializes floating sidebar filter controls (Sort dropdown, State checkboxes, Question type checkboxes, Range inputs, Reset button).
 */
export function initFloatingFilters() {
    if (floatingFiltersInitialized) return;
    floatingFiltersInitialized = true;

    // --- 0. EXAM SEARCH INPUT ---
    const examSearchInput = elements.filterExamSearch || document.getElementById('filter-exam-search');
    const examSearchClear = elements.btnClearExamSearch || document.getElementById('btn-clear-exam-search');

    if (examSearchInput) {
        examSearchInput.addEventListener('input', () => {
            State.examSearch = examSearchInput.value;
            if (examSearchClear) {
                examSearchClear.style.display = examSearchInput.value.trim() ? 'inline-flex' : 'none';
            }
            scheduleRenderExamsMenu();
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
            scheduleRenderExamsMenu();
        });
    }

    // --- 1. SORT DROPDOWN ---
    const trigger = elements.sortDropdownTrigger || document.getElementById('sort-dropdown-trigger');
    const menu = elements.sortDropdownMenu || document.getElementById('sort-dropdown-menu');
    const dropdown = elements.sortDropdown || document.getElementById('sort-dropdown');
    const labelSpan = elements.sortDropdownSelectedLabel || document.getElementById('sort-dropdown-selected-label');

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

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                toggleDropdown(false);
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
                toggleDropdown(false);
                trigger.focus();
            }
        });

        // Dropdown Items Selection
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = item.getAttribute('data-value');
                State.examSort = value;

                // Update active class & label
                menu.querySelectorAll('.dropdown-item').forEach(i => {
                    const isSelected = i === item;
                    i.classList.toggle('active', isSelected);
                    i.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                });

                if (labelSpan) {
                    labelSpan.innerHTML = item.innerHTML;
                }

                toggleDropdown(false);
                renderExamsMenu();
            });
        });
    }

    // --- 2. EXAM STATE CHECKBOXES (FEITOS / POR FAZER) ---
    const stateCheckboxes = document.querySelectorAll('.floating-state-check-input');
    stateCheckboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const activeStates = [];
            stateCheckboxes.forEach(c => {
                if (c.checked) activeStates.push(c.value);
            });
            State.examStateFilter = activeStates;
            renderExamsMenu();
        });
    });

    // --- 3. GLOBAL QUESTION TYPE CHECKBOXES ---
    const typeCheckboxes = document.querySelectorAll('.floating-check-input');
    typeCheckboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const activeTypes = [];
            typeCheckboxes.forEach(c => {
                if (c.checked) activeTypes.push(c.value);
            });
            State.globalQuestionTypes = activeTypes;
            renderExamsMenu();
        });
    });

let renderRafId = null;

/**
 * Throttles renderExamsMenu execution using requestAnimationFrame for smooth, tear-free slider interactions.
 */
function scheduleRenderExamsMenu() {
    if (renderRafId) cancelAnimationFrame(renderRafId);
    renderRafId = requestAnimationFrame(() => {
        renderExamsMenu();
        renderRafId = null;
    });
}

    // --- 4. QUESTION COUNT DUAL SLIDER & INPUTS ---
    const qMinInput = elements.filterQuestionsMin || document.getElementById('filter-questions-min');
    const qMaxInput = elements.filterQuestionsMax || document.getElementById('filter-questions-max');
    const qMinSlider = elements.sliderQuestionsMin || document.getElementById('slider-questions-min');
    const qMaxSlider = elements.sliderQuestionsMax || document.getElementById('slider-questions-max');
    const qTrackFill = elements.trackFillQuestions || document.getElementById('track-fill-questions');

    const updateQuestionsTrackUI = (minVal, maxVal, maxRange) => {
        if (!qTrackFill) return;
        const span = Math.max(1, maxRange - 1);
        const leftPercent = Math.max(0, Math.min(100, ((minVal - 1) / span) * 100));
        const rightPercent = Math.max(0, Math.min(100, 100 - (((maxVal - 1) / span) * 100)));
        qTrackFill.style.left = `${leftPercent}%`;
        qTrackFill.style.right = `${rightPercent}%`;
    };

    if (qMinSlider && qMaxSlider) {
        qMinSlider.addEventListener('input', () => {
            let minVal = parseInt(qMinSlider.value, 10);
            let maxVal = parseInt(qMaxSlider.value, 10);
            if (minVal > maxVal) {
                minVal = maxVal;
                qMinSlider.value = minVal;
            }
            if (minVal >= maxVal - 1) {
                qMinSlider.style.zIndex = '5';
                qMaxSlider.style.zIndex = '4';
            } else {
                qMinSlider.style.zIndex = '3';
                qMaxSlider.style.zIndex = '4';
            }
            State.examQuestionsMin = minVal;
            if (qMinInput) qMinInput.value = minVal;
            const maxQ = parseInt(qMaxSlider.max, 10) || 50;
            updateQuestionsTrackUI(minVal, maxVal, maxQ);
            scheduleRenderExamsMenu();
        });

        qMaxSlider.addEventListener('input', () => {
            let minVal = parseInt(qMinSlider.value, 10);
            let maxVal = parseInt(qMaxSlider.value, 10);
            if (maxVal < minVal) {
                maxVal = minVal;
                qMaxSlider.value = maxVal;
            }
            if (maxVal <= minVal + 1) {
                qMaxSlider.style.zIndex = '5';
                qMinSlider.style.zIndex = '4';
            } else {
                qMaxSlider.style.zIndex = '4';
                qMinSlider.style.zIndex = '3';
            }
            State.examQuestionsMax = maxVal;
            if (qMaxInput) qMaxInput.value = maxVal;
            const maxQ = parseInt(qMaxSlider.max, 10) || 50;
            updateQuestionsTrackUI(minVal, maxVal, maxQ);
            scheduleRenderExamsMenu();
        });
    }

    if (qMinInput) {
        qMinInput.addEventListener('input', () => {
            let val = parseInt(qMinInput.value, 10);
            const maxQ = (qMaxSlider && parseInt(qMaxSlider.max, 10)) || 50;
            if (isNaN(val)) val = 1;
            val = Math.max(1, Math.min(State.examQuestionsMax || maxQ, val));
            State.examQuestionsMin = val;
            if (qMinSlider) qMinSlider.value = val;
            updateQuestionsTrackUI(val, State.examQuestionsMax || maxQ, maxQ);
            scheduleRenderExamsMenu();
        });
    }

    if (qMaxInput) {
        qMaxInput.addEventListener('input', () => {
            let val = parseInt(qMaxInput.value, 10);
            const maxQ = (qMaxSlider && parseInt(qMaxSlider.max, 10)) || 50;
            if (isNaN(val)) val = maxQ;
            val = Math.max(State.examQuestionsMin || 1, Math.min(maxQ, val));
            State.examQuestionsMax = val;
            if (qMaxSlider) qMaxSlider.value = val;
            updateQuestionsTrackUI(State.examQuestionsMin || 1, val, maxQ);
            scheduleRenderExamsMenu();
        });
    }

    // --- 5. SCORE PERCENTAGE DUAL SLIDER & INPUTS ---
    const sMinInput = elements.filterScoreMin || document.getElementById('filter-score-min');
    const sMaxInput = elements.filterScoreMax || document.getElementById('filter-score-max');
    const sMinSlider = elements.sliderScoreMin || document.getElementById('slider-score-min');
    const sMaxSlider = elements.sliderScoreMax || document.getElementById('slider-score-max');
    const sTrackFill = elements.trackFillScore || document.getElementById('track-fill-score');

    const updateScoreTrackUI = (minVal, maxVal) => {
        if (!sTrackFill) return;
        sTrackFill.style.left = `${minVal}%`;
        sTrackFill.style.right = `${100 - maxVal}%`;
    };

    if (sMinSlider && sMaxSlider) {
        sMinSlider.addEventListener('input', () => {
            let minVal = parseInt(sMinSlider.value, 10);
            let maxVal = parseInt(sMaxSlider.value, 10);
            if (minVal > maxVal) {
                minVal = maxVal;
                sMinSlider.value = minVal;
            }
            if (minVal >= maxVal - 2) {
                sMinSlider.style.zIndex = '5';
                sMaxSlider.style.zIndex = '4';
            } else {
                sMinSlider.style.zIndex = '3';
                sMaxSlider.style.zIndex = '4';
            }
            State.examScoreMin = minVal;
            if (sMinInput) sMinInput.value = minVal;
            updateScoreTrackUI(minVal, maxVal);
            scheduleRenderExamsMenu();
        });

        sMaxSlider.addEventListener('input', () => {
            let minVal = parseInt(sMinSlider.value, 10);
            let maxVal = parseInt(sMaxSlider.value, 10);
            if (maxVal < minVal) {
                maxVal = minVal;
                sMaxSlider.value = maxVal;
            }
            if (maxVal <= minVal + 2) {
                sMaxSlider.style.zIndex = '5';
                sMinSlider.style.zIndex = '4';
            } else {
                sMaxSlider.style.zIndex = '4';
                sMinSlider.style.zIndex = '3';
            }
            State.examScoreMax = maxVal;
            if (sMaxInput) sMaxInput.value = maxVal;
            updateScoreTrackUI(minVal, maxVal);
            scheduleRenderExamsMenu();
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
            scheduleRenderExamsMenu();
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
            scheduleRenderExamsMenu();
        });
    }

    // --- 6. RESET BUTTON ---
    const resetBtn = elements.btnResetGlobalFilters || document.getElementById('btn-reset-global-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetAllFilters();
            showToast('Todos os filtros foram repostos.');
        });
    }
}

/**
 * Resets all exam filters and sorting to defaults.
 */
export function resetAllFilters() {
    const maxQ = Math.max(1, ...State.exams.map(e => e.perguntas ? e.perguntas.length : (e.perguntas_count || 0)));
    
    State.examSearch = '';
    State.globalQuestionTypes = ['escolha_multipla', 'boolean', 'escrita'];
    State.examStateFilter = ['completed', 'pending'];
    State.examQuestionsMin = 1;
    State.examQuestionsMax = maxQ;
    State.examScoreMin = 0;
    State.examScoreMax = 100;
    State.examSort = 'default';

    const examSearchInput = elements.filterExamSearch || document.getElementById('filter-exam-search');
    const examSearchClear = elements.btnClearExamSearch || document.getElementById('btn-clear-exam-search');
    if (examSearchInput) examSearchInput.value = '';
    if (examSearchClear) examSearchClear.style.display = 'none';

    // Reset dropdown trigger label
    const labelSpan = elements.sortDropdownSelectedLabel || document.getElementById('sort-dropdown-selected-label');
    if (labelSpan) {
        labelSpan.innerHTML = `<i class="fa-solid fa-list-ol" aria-hidden="true"></i> Ordem Padrão`;
    }

    const menu = elements.sortDropdownMenu || document.getElementById('sort-dropdown-menu');
    if (menu) {
        menu.querySelectorAll('.dropdown-item').forEach(i => {
            const isDef = i.getAttribute('data-value') === 'default';
            i.classList.toggle('active', isDef);
            i.setAttribute('aria-selected', isDef ? 'true' : 'false');
        });
    }

    renderExamsMenu();
}

/**
 * Fetch exam list for the active cadeira from the server index file,
 * merge with any locally stored exams, and render the exams grid.
 *
 * @param {string} indexPath - Relative path to the cadeira's index.json
 */
export async function fetchExams(indexPath) {
    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
            <p>A carregar exames...</p>
        </div>
    `;

    try {
        const response = await fetch(indexPath);
        if (!response.ok) throw new Error('Não foi possível carregar os exames desta cadeira.');
        const serverExams = await response.json();

        loadLocalData(State);

        const currentCadeiraId = State.activeCadeira ? State.activeCadeira.id : null;
        const matchingLocalExams = State.localExames.filter(
            e => e.cadeira_id === currentCadeiraId
        );

        State.exams = [
            ...serverExams.map(e => ({ ...e, isLocal: false })),
            ...matchingLocalExams.map(e => ({ ...e, isLocal: true }))
        ];

        // Initialize dynamic max questions for this subject
        const maxQ = Math.max(1, ...State.exams.map(e => e.perguntas ? e.perguntas.length : (e.perguntas_count || 0)));
        State.examSearch = '';
        State.examQuestionsMax = maxQ;
        State.examQuestionsMin = 1;
        State.examScoreMin = 0;
        State.examScoreMax = 100;
        State.examStateFilter = ['completed', 'pending'];
        State.globalQuestionTypes = ALL_QUESTION_TYPES;

        renderExamsMenu();
    } catch (error) {
        console.error('Error fetching exams:', error);
        elements.examsGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <h3>Erro ao carregar os exames</h3>
                <p>${escapeHTML(error.message)}</p>
                <button class="btn-control btn-primary" id="btn-retry-exams" style="margin-top: 1rem;">Tentar Novamente</button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-exams');
        if (retryBtn) retryBtn.addEventListener('click', () => fetchExams(indexPath));
    }
}

/**
 * Render the exams grid from State.exams applying floating filters and sorting.
 */
export function renderExamsMenu() {
    initFloatingFilters();
    elements.examsGrid.innerHTML = '';
    if (!State.examFilters) State.examFilters = {};
    if (!State.globalQuestionTypes) State.globalQuestionTypes = ALL_QUESTION_TYPES;
    if (!State.examStateFilter) State.examStateFilter = ['completed', 'pending'];

    const examSearchInput = elements.filterExamSearch || document.getElementById('filter-exam-search');
    const examSearchClear = elements.btnClearExamSearch || document.getElementById('btn-clear-exam-search');
    if (examSearchInput && examSearchInput.value !== (State.examSearch || '')) {
        examSearchInput.value = State.examSearch || '';
    }
    if (examSearchClear) {
        examSearchClear.style.display = (State.examSearch || '').trim() ? 'inline-flex' : 'none';
    }

    const maxQInCadeira = Math.max(1, ...State.exams.map(e => e.perguntas ? e.perguntas.length : (e.perguntas_count || 0)));
    if (State.examQuestionsMax === null || State.examQuestionsMax === undefined) {
        State.examQuestionsMax = maxQInCadeira;
    }

    // Synchronize UI inputs with state
    document.querySelectorAll('.floating-check-input').forEach(chk => {
        chk.checked = State.globalQuestionTypes.includes(chk.value);
    });

    document.querySelectorAll('.floating-state-check-input').forEach(chk => {
        chk.checked = State.examStateFilter.includes(chk.value);
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
    const qTrackFill = elements.trackFillQuestions || document.getElementById('track-fill-questions');
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
    if (qTrackFill) {
        const span = Math.max(1, maxQInCadeira - 1);
        const leftPercent = Math.max(0, Math.min(100, ((State.examQuestionsMin - 1) / span) * 100));
        const rightPercent = Math.max(0, Math.min(100, 100 - (((State.examQuestionsMax - 1) / span) * 100)));
        qTrackFill.style.left = `${leftPercent}%`;
        qTrackFill.style.right = `${rightPercent}%`;
    }

    const sMinSlider = elements.sliderScoreMin || document.getElementById('slider-score-min');
    const sMaxSlider = elements.sliderScoreMax || document.getElementById('slider-score-max');
    const sTrackFill = elements.trackFillScore || document.getElementById('track-fill-score');
    if (sMinSlider) sMinSlider.value = State.examScoreMin;
    if (sMaxSlider) sMaxSlider.value = State.examScoreMax;
    if (sTrackFill) {
        sTrackFill.style.left = `${State.examScoreMin}%`;
        sTrackFill.style.right = `${100 - State.examScoreMax}%`;
    }

    // 1. Prepare items with calculated active counts and score history
    const preparedExams = State.exams.map((exam, originalIndex) => {
        const effectiveExcluded = getEffectiveExcludedTypes(exam);
        const questionTypes = getExamQuestionTypes(exam);
        const { totalCount, activeCount } = getExamFilteredCount(exam, effectiveExcluded);

        // Analyze score history
        const histArr = State.examHistory ? State.examHistory[exam.id] : null;
        let isAttempted = false;
        let scorePercentage = null;

        if (Array.isArray(histArr)) {
            const correctCount = histArr.filter(s => s === QuestionStatus.CORRECT).length;
            const incorrectCount = histArr.filter(s => s === QuestionStatus.INCORRECT).length;
            if (correctCount > 0 || incorrectCount > 0) {
                isAttempted = true;
                scorePercentage = histArr.length > 0 ? Math.round((correctCount / histArr.length) * 100) : 0;
            }
        }

        return {
            ...exam,
            _originalIndex: originalIndex,
            _effectiveExcluded: effectiveExcluded,
            _questionTypes: questionTypes,
            _totalCount: totalCount,
            _activeCount: activeCount,
            _isAttempted: isAttempted,
            _scorePercentage: scorePercentage
        };
    });

    // 2. Filter exams based on all active criteria
    const minQ = typeof State.examQuestionsMin === 'number' ? State.examQuestionsMin : 1;
    const maxQ = typeof State.examQuestionsMax === 'number' ? State.examQuestionsMax : 9999;
    const minScore = typeof State.examScoreMin === 'number' ? State.examScoreMin : 0;
    const maxScore = typeof State.examScoreMax === 'number' ? State.examScoreMax : 100;
    const allowedStates = State.examStateFilter || ['completed', 'pending'];
    const query = (State.examSearch || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const visibleExams = preparedExams.filter(exam => {
        // Criterion 0: Search query by title or description
        if (query) {
            const titleNorm = (exam.titulo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const descNorm = (exam.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (!titleNorm.includes(query) && !descNorm.includes(query)) {
                return false;
            }
        }

        // Criterion A: Active question types (must have > 0 matching active questions)
        if (exam._activeCount <= 0) return false;

        // Criterion B: Exam State (Exames Feitos vs Exames Por Fazer)
        if (exam._isAttempted && !allowedStates.includes('completed')) return false;
        if (!exam._isAttempted && !allowedStates.includes('pending')) return false;

        // Criterion C: Question Count range
        if (exam._activeCount < minQ || exam._activeCount > maxQ) return false;

        // Criterion D: Score percentage range
        if (exam._isAttempted) {
            if (exam._scorePercentage < minScore || exam._scorePercentage > maxScore) return false;
        } else {
            // For pending exams without attempts, only display if score filter range includes 0%
            if (minScore > 0) return false;
        }

        return true;
    });

    // 3. Sort visible exams
    const sortMode = State.examSort || 'default';
    visibleExams.sort((a, b) => {
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
            return a.titulo.localeCompare(b.titulo, 'pt', { numeric: true, sensitivity: 'base' });
        }
        if (sortMode === 'title_desc') {
            return b.titulo.localeCompare(a.titulo, 'pt', { numeric: true, sensitivity: 'base' });
        }
        // 'default'
        return a._originalIndex - b._originalIndex;
    });

    // 4. Update status indicator in floating sidebar
    const statusEl = elements.floatingFilterCountText || document.getElementById('floating-filter-count-text');
    if (statusEl) {
        const total = State.exams.length;
        const visible = visibleExams.length;
        if (total === 0) {
            statusEl.textContent = '0 exames disponíveis';
        } else if (visible === total) {
            statusEl.textContent = `${total} ${total === 1 ? 'exame disponível' : 'exames disponíveis'}`;
        } else {
            statusEl.textContent = `${visible} de ${total} ${total === 1 ? 'exame exibido' : 'exames exibidos'}`;
        }
    }

    // 5. Empty State Handling
    if (visibleExams.length === 0) {
        elements.examsGrid.innerHTML = `
            <div class="empty-filters-state">
                <i class="fa-solid fa-filter-circle-xmark empty-filters-main-icon" aria-hidden="true"></i>
                <h4>Nenhum exame corresponde aos filtros</h4>
                <p>Ajuste os filtros de estado, tipos de pergunta ou intervalos na barra lateral para encontrar exames.</p>
                <button type="button" class="btn-control btn-primary btn-sm" id="btn-reset-filters-empty">
                    <i class="fa-solid fa-rotate-left"></i> Repor Todos os Filtros
                </button>
            </div>
        `;
        const resetEmptyBtn = document.getElementById('btn-reset-filters-empty');
        if (resetEmptyBtn) {
            resetEmptyBtn.addEventListener('click', () => {
                resetAllFilters();
                showToast('Filtros repostos com sucesso!');
            });
        }
        return;
    }

    // 6. Render Exam Rows
    visibleExams.forEach(exam => {
        const row = document.createElement('div');
        row.className = 'exam-list-row';
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `Iniciar exame ${exam.titulo}`);

        const typesHTML = renderQuestionTypeTagsHTML(exam._questionTypes, exam._effectiveExcluded);

        const totalLabel = exam._totalCount === 1 ? '1 questão' : `${exam._totalCount} questões`;
        let actionHTML = `[ ${totalLabel} ]`;

        if (exam._activeCount < exam._totalCount) {
            const activeLabel = exam._activeCount === 1 ? '1 questão' : `${exam._activeCount} questões`;
            actionHTML = `[ <s class="count-old">${exam._totalCount}</s> <span class="count-new ${exam._activeCount === 0 ? 'count-zero' : ''}">${activeLabel}</span> ]`;
        }

        const scoreBadgeHTML = renderExamScoreBadgeHTML(exam.id);

        row.innerHTML = `
            <div class="exam-list-header">
                <h4 class="exam-list-title">${escapeHTML(exam.titulo.toUpperCase())}${exam.isLocal ? ' <span class="badge-local">Local</span>' : ''}</h4>
                <div class="exam-list-header-right">
                    ${scoreBadgeHTML}
                    <span class="exam-list-action">${actionHTML}</span>
                </div>
            </div>
            ${typesHTML}
            <p class="exam-list-desc">${escapeHTML(exam.descricao)}</p>
        `;

        // Interactivity for question type toggle segments inside capsule
        row.querySelectorAll('.exam-type-segment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid triggering exam start
                const typeId = btn.getAttribute('data-type');
                if (!State.examFilters[exam.id]) {
                    State.examFilters[exam.id] = [];
                }
                const idx = State.examFilters[exam.id].indexOf(typeId);
                if (idx > -1) {
                    State.examFilters[exam.id].splice(idx, 1);
                } else {
                    State.examFilters[exam.id].push(typeId);
                }
                updateExamRowUI(row, exam);
            });
        });

        const activate = () => {
            const currentExcluded = getEffectiveExcludedTypes(exam);
            const countInfo = getExamFilteredCount(exam, currentExcluded);
            if (countInfo.activeCount === 0) {
                showToast('Todas as perguntas deste exame estão excluídas pelos filtros. Ative pelo menos um tipo para iniciar.');
                row.classList.add('row-shake-error');
                setTimeout(() => row.classList.remove('row-shake-error'), 450);
                return;
            }
            startExam(exam.id);
        };

        row.addEventListener('click', activate);
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate();
            }
        });

        elements.examsGrid.appendChild(row);
    });
}

/**
 * Fisher-Yates shuffle of a multiple-choice question's options in-place.
 * Updates q.solucao indices to match the new option order.
 * No-op for 'escrita' and 'boolean' questions (they have no shuffleable options).
 *
 * @param {object} q - Question object (mutated in-place)
 */
export function shuffleQuestionOptions(q) {
    if (q.tipo === 'escrita' || q.tipo === 'boolean' || !q.opcoes || q.opcoes.length === 0) {
        return;
    }

    const mapped = q.opcoes.map((opcao, idx) => ({
        texto:    opcao,
        eCorreta: q.solucao.includes(idx)
    }));

    for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
    }

    q.opcoes  = mapped.map(item => item.texto);
    q.solucao = mapped
        .map((item, idx) => item.eCorreta ? idx : -1)
        .filter(idx => idx !== -1);
}

/**
 * Load a full exam's question data, filter out excluded types, shuffle options,
 * and transition to the exam screen.
 *
 * @param {string} examId - The exam's ID as defined in the cadeira's index.json
 */
export async function startExam(examId) {
    const examMeta = State.exams.find(e => e.id === examId);
    if (!examMeta) return;

    const excludedTypes = getEffectiveExcludedTypes(examMeta);

    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
            <p>A carregar as perguntas do exame...</p>
        </div>
    `;

    try {
        let examData;
        if (examMeta.isLocal) {
            examData = examMeta;
        } else {
            const response = await fetch(examMeta.path);
            if (!response.ok) throw new Error('Não foi possível carregar as questões deste exame.');
            examData = await response.json();
        }

        const allQuestions = examData.perguntas || [];
        allQuestions.forEach((q, idx) => {
            q._origIndex = idx;
        });

        // Inicializar ou assegurar tamanho do array de histórico para este exame
        if (!State.examHistory) State.examHistory = {};
        if (!State.examHistory[examMeta.id] || !Array.isArray(State.examHistory[examMeta.id])) {
            State.examHistory[examMeta.id] = new Array(allQuestions.length).fill(QuestionStatus.UNANSWERED);
        } else {
            while (State.examHistory[examMeta.id].length < allQuestions.length) {
                State.examHistory[examMeta.id].push(QuestionStatus.UNANSWERED);
            }
        }

        // Apply question type filters
        let questionsToUse = allQuestions;
        if (excludedTypes.length > 0) {
            questionsToUse = questionsToUse.filter(q => {
                const t = getQuestionTypeInfo(q.tipo).id;
                return !excludedTypes.includes(t);
            });
        }

        if (questionsToUse.length === 0) {
            showToast('Todas as perguntas estão excluídas. Ative pelo menos um tipo para iniciar.');
            renderExamsMenu();
            return;
        }

        State.activeExam = {
            ...examMeta,
            perguntas: questionsToUse
        };

        State.activeExam.perguntas.forEach(q => shuffleQuestionOptions(q));

        // Inicializar armazenamento em memória da sessão de respostas do exame
        State.examAnswers = State.activeExam.perguntas.map(() => ({
            selectedOptions: [],
            writtenInput: '',
            revealed: false,
            isCorrect: null
        }));

        State.question.index              = 0;
        State.question.selectedOptions    = [];
        State.question.revealed           = false;
        State.question.firstAttemptCorrect = {};
        State.question.writtenInput       = '';

        elements.currentExamTitle.textContent = State.activeExam.titulo;

        if (State.activeCadeira && State.activeCadeira.icon) {
            const iconEl = document.getElementById('exam-subject-icon');
            if (iconEl) iconEl.className = `fa-solid ${State.activeCadeira.icon}`;
        }

        transitionTo('exam');

        try {
            renderQuestion();
        } catch (renderErr) {
            console.error('Erro ao renderizar a questão:', renderErr);
            if (elements.questionText) {
                elements.questionText.textContent =
                    '⚠️ Erro ao carregar a questão. Verifique a consola para detalhes.';
            }
            if (elements.optionsContainer) {
                elements.optionsContainer.innerHTML = `
                    <div class="error-state">
                        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                        <h3>Erro de renderização</h3>
                        <p>${escapeHTML(renderErr.message)}</p>
                    </div>`;
            }
        }

    } catch (error) {
        console.error('Error fetching exam questions:', error);
        renderExamsMenu();
        alert('Erro ao carregar o exame: ' + error.message);
    }
}
