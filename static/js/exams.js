/**
 * exams.js
 * --------
 * Orchestrator module for the exams screen:
 * - Fetches exams for the active subject.
 * - Coordinates filtering, sorting, and rendering.
 * - Launches active exams.
 *
 * Sub-responsibilities are cleanly separated into:
 * - examFilters.js: Floating filter controls and sliders.
 * - examSorting.js: Sorting dropdown and comparison algorithms.
 * - examCard.js: Exam card rendering and capsule buttons.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML, showToast, safeAsync } from './utils.js';
import { loadLocalData, QuestionStatus } from './storage.js';
import { transitionTo } from './navigation.js';
import { renderQuestion } from './question.js';
import { getQuestionTypeInfo } from './questionTypes.js';
import { t, updateSortDropdownLabel, getCurrentLanguage } from './i18n.js';
import { ExamService } from './examService.js';
import { Events, APP_EVENTS } from './events.js';

import {
    ALL_QUESTION_TYPES,
    getEffectiveExcludedTypes,
    initFloatingFilters,
    syncFilterInputsUI,
    resetAllFilters
} from './examFilters.js';
import { sanitizeQuestionsMax, sanitizeQuestionsMin } from './filterState.js';

import {
    initSortDropdown,
    sortExams
} from './examSorting.js';

import {
    renderExamScoreBadgeHTML,
    createExamCardElement
} from './examCard.js';

export {
    ExamService,
    ALL_QUESTION_TYPES,
    getEffectiveExcludedTypes,
    resetAllFilters,
    renderExamScoreBadgeHTML
};

let renderTimer = null;
function scheduleRenderExamsMenu() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderExamsMenu, 25);
}

/**
 * Fetch exam list for the active cadeira from the server index file,
 * merge with any locally stored exams, and render the exams grid.
 *
 * @param {string} indexPath - Relative path to the cadeira's index.json
 */
export async function fetchExams(indexPath) {
    if (!elements.examsGrid) return;

    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
            <p data-i18n="loading_exams">${escapeHTML(t('loading_exams'))}</p>
        </div>
    `;

    await safeAsync(async () => {
        loadLocalData(State);
        const currentCadeiraId = State.activeCadeira ? State.activeCadeira.id : null;
        State.exams = await ExamService.fetchExamsForSubject(indexPath, currentCadeiraId, State.localExames);

        const maxQ = Math.max(1, ...State.exams.map(e => ExamService.getQuestionsCount(e)));
        State.examSearch = '';
        State.examQuestionsMax = maxQ;
        State.examQuestionsMin = 1;
        State.examScoreMin = 0;
        State.examScoreMax = 100;
        State.examStateFilter = ['completed', 'pending'];
        State.globalQuestionTypes = ALL_QUESTION_TYPES;

        renderExamsMenu();
    }, {
        context: 'exames',
        container: elements.examsGrid,
        onRetry: () => fetchExams(indexPath)
    });
}

/**
 * Render the exams grid from State.exams applying floating filters and sorting.
 */
export function renderExamsMenu() {
    if (!elements.examsGrid) return;

    initFloatingFilters(scheduleRenderExamsMenu);
    initSortDropdown(scheduleRenderExamsMenu);
    updateSortDropdownLabel();

    elements.examsGrid.innerHTML = '';
    if (!State.examFilters) State.examFilters = {};
    if (!State.globalQuestionTypes) State.globalQuestionTypes = ALL_QUESTION_TYPES;
    if (!State.examStateFilter) State.examStateFilter = ['completed', 'pending'];

    const maxQInCadeira = Math.max(1, ...(State.exams || []).map(e => ExamService.getQuestionsCount(e)));
    State.examQuestionsMax = sanitizeQuestionsMax(State.examQuestionsMax, maxQInCadeira);
    State.examQuestionsMin = sanitizeQuestionsMin(State.examQuestionsMin, State.examQuestionsMax);

    // Synchronize UI inputs
    syncFilterInputsUI(maxQInCadeira);

    // 1. Prepare items with calculated active counts and score history
    const preparedExams = (State.exams || []).map((exam, originalIndex) => {
        const effectiveExcluded = getEffectiveExcludedTypes(exam);
        const questionTypes = ExamService.getQuestionTypes(exam);
        const { totalCount, activeCount } = ExamService.getFilteredCount(exam, effectiveExcluded);

        const histArr = State.examHistory ? State.examHistory[exam.id] : null;
        let isAttempted = false;
        let scorePercentage = null;

        if (Array.isArray(histArr)) {
            const correctCount = histArr.filter(s => s === QuestionStatus.CORRECT).length;
            const incorrectCount = histArr.filter(s => s === QuestionStatus.INCORRECT).length;
            const answeredCount = histArr.filter(s => s === QuestionStatus.ANSWERED).length;
            if (correctCount > 0 || incorrectCount > 0 || answeredCount > 0) {
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
        // Search query
        if (query) {
            const titleNorm = ExamService.getTitle(exam).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const descNorm = ExamService.getDescription(exam).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (!titleNorm.includes(query) && !descNorm.includes(query)) {
                return false;
            }
        }

        // Active question types
        if (exam._activeCount <= 0) return false;

        // State (completed vs pending)
        if (exam._isAttempted && !allowedStates.includes('completed')) return false;
        if (!exam._isAttempted && !allowedStates.includes('pending')) return false;

        // Question count range
        if (exam._activeCount < minQ || exam._activeCount > maxQ) return false;

        // Score percentage range
        if (exam._isAttempted) {
            if (exam._scorePercentage < minScore || exam._scorePercentage > maxScore) return false;
        } else {
            if (minScore > 0) return false;
        }

        return true;
    });

    // 3. Sort visible exams using examSorting module
    sortExams(visibleExams, State.examSort || 'default', getCurrentLanguage());

    // 4. Update status indicator in floating sidebar
    const statusEl = elements.floatingFilterCountText || document.getElementById('floating-filter-count-text');
    if (statusEl) {
        const total = (State.exams || []).length;
        const visible = visibleExams.length;
        statusEl.textContent = t('filter_status_indicator', { visible, total });
    }

    // 5. Empty State Handling
    if (visibleExams.length === 0) {
        elements.examsGrid.innerHTML = `
            <div class="empty-filters-state">
                <i class="fa-solid fa-filter-circle-xmark empty-filters-main-icon" aria-hidden="true"></i>
                <h4>${escapeHTML(t('empty_filters_title'))}</h4>
                <p>${escapeHTML(t('empty_filters_desc'))}</p>
                <button type="button" class="btn-control btn-primary btn-sm" id="btn-reset-filters-empty">
                    <i class="fa-solid fa-rotate-left"></i> ${escapeHTML(t('btn_reset_all_filters'))}
                </button>
            </div>
        `;
        const resetEmptyBtn = document.getElementById('btn-reset-filters-empty');
        if (resetEmptyBtn) {
            resetEmptyBtn.addEventListener('click', () => {
                resetAllFilters(scheduleRenderExamsMenu);
                showToast(t('toast_filters_reset'));
            });
        }
        return;
    }

    // 6. Render Exam Rows using examCard module
    visibleExams.forEach(exam => {
        const row = createExamCardElement(exam, startExam);
        elements.examsGrid.appendChild(row);
    });

    // 7. Update Right Practice Sidebar Stats & Listeners
    initPracticeSidebarListeners();
    updatePracticeSidebarStats();
}

/**
 * Calculates the total number of difficult questions in the active subject.
 * @param {object} State
 * @returns {number}
 */
export function getSubjectDifficultCount(State) {
    if (!State || !State.exams || !State.difficultQuestions) return 0;
    const currentExamIds = new Set(State.exams.map(e => e.id));
    let count = 0;
    Object.keys(State.difficultQuestions).forEach(examId => {
        if (currentExamIds.has(examId)) {
            const arr = State.difficultQuestions[examId];
            if (Array.isArray(arr)) {
                count += arr.length;
            }
        }
    });
    return count;
}

/**
 * Calculates the total number of incorrect questions in the active subject.
 * @param {object} State
 * @returns {number}
 */
export function getSubjectIncorrectCount(State) {
    if (!State || !State.exams || !State.examHistory) return 0;
    const currentExamIds = new Set(State.exams.map(e => e.id));
    let count = 0;
    Object.keys(State.examHistory).forEach(examId => {
        if (currentExamIds.has(examId)) {
            const arr = State.examHistory[examId];
            if (Array.isArray(arr)) {
                count += arr.filter(s => s === QuestionStatus.INCORRECT).length;
            }
        }
    });
    return count;
}

/**
 * Updates the Right Practice Sidebar counters and button states.
 */
export function updatePracticeSidebarStats() {
    const diffCount = getSubjectDifficultCount(State);
    const incCount = getSubjectIncorrectCount(State);

    // 1. Difficult questions
    const diffCountEl = elements.practiceDifficultCountText;
    const btnDiff = elements.btnPracticeDifficult;
    if (diffCountEl) {
        diffCountEl.textContent = `${diffCount}`;
        diffCountEl.title = diffCount === 0
            ? t('practice_difficult_count_empty')
            : (diffCount === 1 ? t('practice_difficult_count_single') : t('practice_difficult_count', { count: diffCount }));
        if (diffCount === 0) {
            diffCountEl.classList.add('count-zero');
        } else {
            diffCountEl.classList.remove('count-zero');
        }
    }
    if (btnDiff) {
        btnDiff.disabled = (diffCount === 0);
    }

    // 2. Incorrect questions
    const incCountEl = elements.practiceIncorrectCountText;
    const btnInc = elements.btnPracticeIncorrect;
    if (incCountEl) {
        incCountEl.textContent = `${incCount}`;
        incCountEl.title = incCount === 0
            ? t('practice_incorrect_count_empty')
            : (incCount === 1 ? t('practice_incorrect_count_single') : t('practice_incorrect_count', { count: incCount }));
        if (incCount === 0) {
            incCountEl.classList.add('count-zero');
        } else {
            incCountEl.classList.remove('count-zero');
        }
    }
    if (btnInc) {
        btnInc.disabled = (incCount === 0);
    }
}

let practiceListenersInitialized = false;
export function initPracticeSidebarListeners() {
    if (practiceListenersInitialized) return;
    practiceListenersInitialized = true;

    if (elements.btnPracticeDifficult) {
        elements.btnPracticeDifficult.addEventListener('click', () => {
            launchSpecialExam('difficult');
        });
    }

    if (elements.btnPracticeIncorrect) {
        elements.btnPracticeIncorrect.addEventListener('click', () => {
            launchSpecialExam('incorrect');
        });
    }
}

/**
 * Fisher-Yates shuffle of a multiple-choice question's options in-place.
 * Delegated to ExamService.
 *
 * @param {object} q - Question object (mutated in-place)
 */
export function shuffleQuestionOptions(q) {
    ExamService.shuffleOptions(q);
}

/**
 * Load a full exam's question data, filter out excluded types, shuffle options,
 * and transition to the exam screen.
 *
 * @param {string} examId - The exam's ID as defined in the cadeira's index.json
 */
export async function startExam(examId) {
    const examMeta = (State.exams || []).find(e => e.id === examId);
    if (!examMeta) return;

    if (elements.examsGrid) {
        elements.examsGrid.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
                <p data-i18n="loading_exams">${escapeHTML(t('loading_exams'))}</p>
            </div>
        `;
    }

    try {
        const examData = await ExamService.loadFullExam(examMeta);
        const allQuestions = examData.questions || [];
        allQuestions.forEach((q, idx) => {
            q._origIndex = idx;
        });

        if (!State.examHistory) State.examHistory = {};
        if (!State.examHistory[examMeta.id] || !Array.isArray(State.examHistory[examMeta.id])) {
            State.examHistory[examMeta.id] = new Array(allQuestions.length).fill(QuestionStatus.UNANSWERED);
        } else {
            while (State.examHistory[examMeta.id].length < allQuestions.length) {
                State.examHistory[examMeta.id].push(QuestionStatus.UNANSWERED);
            }
        }

        const excludedTypes = getEffectiveExcludedTypes(examMeta);
        let questionsToUse = allQuestions;
        if (excludedTypes.length > 0) {
            questionsToUse = questionsToUse.filter(q => {
                const tInfo = getQuestionTypeInfo(q.type || q.tipo);
                return !excludedTypes.includes(tInfo.id);
            });
        }

        if (questionsToUse.length === 0) {
            showToast('Todas as perguntas estão excluídas. Ative pelo menos um tipo para iniciar.');
            renderExamsMenu();
            return;
        }

        questionsToUse.forEach(q => ExamService.shuffleOptions(q));

        State.activeExam = {
            ...examMeta,
            ...examData,
            questions: questionsToUse,
            perguntas: questionsToUse
        };

        State.examAnswers = questionsToUse.map(() => ({
            selectedOptions: [],
            writtenInput: '',
            revealed: false,
            isCorrect: null
        }));

        State.question.index               = 0;
        State.question.selectedOptions     = [];
        State.question.revealed            = false;
        State.question.firstAttemptCorrect = {};
        State.question.writtenInput        = '';

        if (elements.currentExamTitle) {
            elements.currentExamTitle.textContent = ExamService.getTitle(State.activeExam);
        }

        if (State.activeCadeira && State.activeCadeira.icon) {
            const iconEl = document.getElementById('exam-subject-icon');
            if (iconEl) iconEl.className = `fa-solid ${State.activeCadeira.icon}`;
        }

        transitionTo('exam');
        Events.emit(APP_EVENTS.EXAM_STARTED, { examId, exam: State.activeExam });

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

/**
 * Launches a special dynamic practice exam aggregated across all exams of the active subject.
 * @param {'difficult'|'incorrect'} type
 */
export async function launchSpecialExam(type) {
    if (!State.exams || State.exams.length === 0) return;

    if (elements.examsGrid) {
        elements.examsGrid.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
                <p data-i18n="loading_exams">${escapeHTML(t('loading_exams'))}</p>
            </div>
        `;
    }

    try {
        // 1. Identify which exams contain questions matching the target criteria
        const matchingExamsMeta = State.exams.filter(examMeta => {
            if (type === 'difficult') {
                const diffList = State.difficultQuestions ? State.difficultQuestions[examMeta.id] : null;
                return Array.isArray(diffList) && diffList.length > 0;
            } else {
                const histList = State.examHistory ? State.examHistory[examMeta.id] : null;
                return Array.isArray(histList) && histList.some(s => s === QuestionStatus.INCORRECT);
            }
        });

        if (matchingExamsMeta.length === 0) {
            showToast(type === 'difficult' ? t('practice_difficult_count_empty') : t('practice_incorrect_count_empty'));
            renderExamsMenu();
            return;
        }

        // 2. Load full question data for all matching exams in parallel
        const loadedExamsData = await Promise.all(
            matchingExamsMeta.map(meta => ExamService.loadFullExam(meta))
        );

        // 3. Extract and tag all matching questions
        const aggregatedQuestions = [];
        loadedExamsData.forEach((examData, metaIdx) => {
            const meta = matchingExamsMeta[metaIdx];
            const allQ = examData.questions || examData.perguntas || [];
            
            allQ.forEach((q, origIdx) => {
                let isMatch = false;
                if (type === 'difficult') {
                    const diffList = State.difficultQuestions ? State.difficultQuestions[meta.id] : null;
                    isMatch = Array.isArray(diffList) && diffList.includes(origIdx);
                } else {
                    const histList = State.examHistory ? State.examHistory[meta.id] : null;
                    isMatch = Array.isArray(histList) && histList[origIdx] === QuestionStatus.INCORRECT;
                }

                if (isMatch) {
                    const questionClone = JSON.parse(JSON.stringify(q));
                    questionClone._origIndex = origIdx;
                    questionClone._sourceExamId = meta.id;
                    questionClone._sourceExamTitle = meta.title || meta.titulo;
                    ExamService.shuffleOptions(questionClone);
                    aggregatedQuestions.push(questionClone);
                }
            });
        });

        if (aggregatedQuestions.length === 0) {
            showToast(type === 'difficult' ? t('practice_difficult_count_empty') : t('practice_incorrect_count_empty'));
            renderExamsMenu();
            return;
        }

        const isDiff = (type === 'difficult');
        const specialTitle = isDiff ? t('special_exam_difficult_title') : t('special_exam_incorrect_title');
        const specialDesc = isDiff ? t('practice_difficult_desc') : t('practice_incorrect_desc');

        State.activeExam = {
            id: isDiff ? 'special-difficult' : 'special-incorrect',
            isSpecial: true,
            specialType: type,
            title: `${specialTitle} (${aggregatedQuestions.length})`,
            titulo: `${specialTitle} (${aggregatedQuestions.length})`,
            description: specialDesc,
            descricao: specialDesc,
            questions: aggregatedQuestions,
            perguntas: aggregatedQuestions,
            questions_count: aggregatedQuestions.length
        };

        State.examAnswers = aggregatedQuestions.map(() => ({
            selectedOptions: [],
            writtenInput: '',
            revealed: false,
            isCorrect: null
        }));

        State.question.index               = 0;
        State.question.selectedOptions     = [];
        State.question.revealed            = false;
        State.question.firstAttemptCorrect = {};
        State.question.writtenInput        = '';

        if (elements.currentExamTitle) {
            elements.currentExamTitle.textContent = State.activeExam.title;
        }

        if (State.activeCadeira && State.activeCadeira.icon) {
            const iconEl = document.getElementById('exam-subject-icon');
            if (iconEl) iconEl.className = `fa-solid ${State.activeCadeira.icon}`;
        }

        transitionTo('exam');
        Events.emit(APP_EVENTS.EXAM_STARTED, { examId: State.activeExam.id, exam: State.activeExam });

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
        console.error('Error fetching practice questions:', error);
        renderExamsMenu();
        alert('Erro ao carregar o exame de prática: ' + error.message);
    }
}

// ---------------------------------------------------------------------------
// EventBus Subscriptions
// ---------------------------------------------------------------------------
Events.on(APP_EVENTS.SCREEN_CHANGED, ({ to }) => {
    if (to === 'menu') {
        if (State.activeCadeira) {
            fetchExams(State.activeCadeira.index_path);
        }
    }
});

Events.on(APP_EVENTS.LANGUAGE_CHANGED, () => {
    if (State.currentScreen === 'menu') {
        renderExamsMenu();
    }
});
