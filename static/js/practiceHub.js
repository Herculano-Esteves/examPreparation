/**
 * practiceHub.js
 * --------------
 * Encapsulated Subject Practice Hub component.
 * Adheres to:
 * - Strict object-oriented encapsulation with private class fields and methods (#field, #method).
 * - Immutability of internal state from external tampering.
 * - Single Responsibility Principle (Practice Sessions orchestration & metrics).
 * - Invariant: On subjects with 0 exams or 0 marked questions, the practice cards
 *   display 0 count, count-zero visual style, and disabled launch buttons.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { QuestionStatus } from './constants.js';
import { showToast, escapeHTML } from './utils.js';
import { ExamService } from './examService.js';
import { transitionTo } from './navigation.js';
import { renderQuestion } from './question.js';
import { t } from './i18n.js';
import { Events, APP_EVENTS } from './events.js';

class PracticeHubManager {
    #initialized = false;
    #difficultCount = 0;
    #incorrectCount = 0;
    #activeSubjectId = null;

    /**
     * Private calculation of difficult questions strictly scoped to active subject's exams.
     * @param {object} state
     * @returns {number}
     */
    #computeDifficultCount(state) {
        if (!state || !state.exams || !Array.isArray(state.exams) || !state.difficultQuestions) {
            return 0;
        }
        const currentExamIds = new Set(state.exams.map(e => e.id));
        let count = 0;
        Object.keys(state.difficultQuestions).forEach(examId => {
            if (currentExamIds.has(examId)) {
                const arr = state.difficultQuestions[examId];
                if (Array.isArray(arr)) {
                    count += arr.length;
                }
            }
        });
        return count;
    }

    /**
     * Private calculation of incorrect questions strictly scoped to active subject's exams.
     * @param {object} state
     * @returns {number}
     */
    #computeIncorrectCount(state) {
        if (!state || !state.exams || !Array.isArray(state.exams) || !state.examHistory) {
            return 0;
        }
        const currentExamIds = new Set(state.exams.map(e => e.id));
        let count = 0;
        Object.keys(state.examHistory).forEach(examId => {
            if (currentExamIds.has(examId)) {
                const arr = state.examHistory[examId];
                if (Array.isArray(arr)) {
                    count += arr.filter(s => s === QuestionStatus.INCORRECT).length;
                }
            }
        });
        return count;
    }

    /**
     * Private DOM rendering pipeline for counters, titles, and button states.
     */
    #renderUI() {
        const sidebar = elements.examsSidebarPractice;
        if (sidebar) {
            sidebar.style.display = '';
        }

        // 1. Difficult Questions Card & Button
        const diffCountEl = elements.practiceDifficultCountText;
        const btnDiff = elements.btnPracticeDifficult;
        if (diffCountEl) {
            diffCountEl.textContent = `${this.#difficultCount}`;
            diffCountEl.title = this.#difficultCount === 0
                ? t('practice_difficult_count_empty')
                : (this.#difficultCount === 1 ? t('practice_difficult_count_single') : t('practice_difficult_count', { count: this.#difficultCount }));
            if (this.#difficultCount === 0) {
                diffCountEl.classList.add('count-zero');
            } else {
                diffCountEl.classList.remove('count-zero');
            }
        }
        if (btnDiff) {
            btnDiff.disabled = (this.#difficultCount === 0);
        }

        // 2. Incorrect Questions Card & Button
        const incCountEl = elements.practiceIncorrectCountText;
        const btnInc = elements.btnPracticeIncorrect;
        if (incCountEl) {
            incCountEl.textContent = `${this.#incorrectCount}`;
            incCountEl.title = this.#incorrectCount === 0
                ? t('practice_incorrect_count_empty')
                : (this.#incorrectCount === 1 ? t('practice_incorrect_count_single') : t('practice_incorrect_count', { count: this.#incorrectCount }));
            if (this.#incorrectCount === 0) {
                incCountEl.classList.add('count-zero');
            } else {
                incCountEl.classList.remove('count-zero');
            }
        }
        if (btnInc) {
            btnInc.disabled = (this.#incorrectCount === 0);
        }
    }

    /**
     * Updates the Practice Hub metrics and DOM for the given application state.
     * @param {object} [state=State]
     */
    update(state = State) {
        if (!state || !state.activeCadeira) {
            this.#activeSubjectId = null;
            this.#difficultCount = 0;
            this.#incorrectCount = 0;
        } else {
            this.#activeSubjectId = state.activeCadeira.id;
            this.#difficultCount = this.#computeDifficultCount(state);
            this.#incorrectCount = this.#computeIncorrectCount(state);
        }
        this.#renderUI();
    }

    /**
     * Resets internal metrics to 0 and updates DOM to zero/disabled state.
     */
    reset() {
        this.#difficultCount = 0;
        this.#incorrectCount = 0;
        this.#activeSubjectId = null;
        this.#renderUI();
    }

    /**
     * Initializes event listeners and event bus subscriptions once.
     */
    init() {
        if (this.#initialized) return;
        this.#initialized = true;

        if (elements.btnPracticeDifficult) {
            elements.btnPracticeDifficult.addEventListener('click', () => {
                this.launchSpecialExam('difficult', State);
            });
        }

        if (elements.btnPracticeIncorrect) {
            elements.btnPracticeIncorrect.addEventListener('click', () => {
                this.launchSpecialExam('incorrect', State);
            });
        }

        Events.on(APP_EVENTS.CADEIRA_SELECTED, () => {
            this.reset();
        });

        Events.on(APP_EVENTS.SCREEN_CHANGED, ({ to }) => {
            if (to === 'menu') {
                this.update(State);
            }
        });

        Events.on(APP_EVENTS.LANGUAGE_CHANGED, () => {
            if (State.currentScreen === 'menu') {
                this.update(State);
            }
        });

        Events.on(APP_EVENTS.EXAM_FINISHED, () => {
            if (State.currentScreen === 'menu') {
                this.update(State);
            }
        });

        Events.on(APP_EVENTS.QUESTION_DIFFICULT_TOGGLED, () => {
            if (State.currentScreen === 'menu') {
                this.update(State);
            }
        });
    }

    /**
     * Launches a special dynamic practice exam aggregated across all exams of the active subject.
     * @param {'difficult'|'incorrect'} type
     * @param {object} [state=State]
     */
    async launchSpecialExam(type, state = State) {
        if (!state.exams || state.exams.length === 0) {
            showToast(type === 'difficult' ? t('practice_difficult_count_empty') : t('practice_incorrect_count_empty'));
            return;
        }

        if (elements.examsGrid) {
            elements.examsGrid.innerHTML = `
                <div class="loading-state">
                    <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
                    <p data-i18n="loading_exams">${escapeHTML(t('loading_exams'))}</p>
                </div>
            `;
        }

        try {
            const matchingExamsMeta = state.exams.filter(examMeta => {
                if (type === 'difficult') {
                    const diffList = state.difficultQuestions ? state.difficultQuestions[examMeta.id] : null;
                    return Array.isArray(diffList) && diffList.length > 0;
                } else {
                    const histList = state.examHistory ? state.examHistory[examMeta.id] : null;
                    return Array.isArray(histList) && histList.some(s => s === QuestionStatus.INCORRECT);
                }
            });

            if (matchingExamsMeta.length === 0) {
                showToast(type === 'difficult' ? t('practice_difficult_count_empty') : t('practice_incorrect_count_empty'));
                this.update(state);
                return;
            }

            const loadedExamsData = await Promise.all(
                matchingExamsMeta.map(meta => ExamService.loadFullExam(meta))
            );

            const aggregatedQuestions = [];
            loadedExamsData.forEach((examData, metaIdx) => {
                const meta = matchingExamsMeta[metaIdx];
                const allQ = examData.questions || examData.perguntas || [];
                
                allQ.forEach((q, origIdx) => {
                    let isMatch = false;
                    if (type === 'difficult') {
                        const diffList = state.difficultQuestions ? state.difficultQuestions[meta.id] : null;
                        isMatch = Array.isArray(diffList) && diffList.includes(origIdx);
                    } else {
                        const histList = state.examHistory ? state.examHistory[meta.id] : null;
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
                this.update(state);
                return;
            }

            const isDiff = (type === 'difficult');
            const specialTitle = isDiff ? t('special_exam_difficult_title') : t('special_exam_incorrect_title');
            const specialDesc = isDiff ? t('practice_difficult_desc') : t('practice_incorrect_desc');

            state.activeExam = {
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

            state.examAnswers = aggregatedQuestions.map(() => ({
                selectedOptions: [],
                writtenInput: '',
                revealed: false,
                isCorrect: null
            }));

            state.question.index               = 0;
            state.question.selectedOptions     = [];
            state.question.revealed            = false;
            state.question.firstAttemptCorrect = {};
            state.question.writtenInput        = '';

            if (elements.currentExamTitle) {
                elements.currentExamTitle.textContent = state.activeExam.title;
            }

            if (state.activeCadeira && state.activeCadeira.icon) {
                const iconEl = document.getElementById('exam-subject-icon');
                if (iconEl) iconEl.className = `fa-solid ${state.activeCadeira.icon}`;
            }

            transitionTo('exam');
            Events.emit(APP_EVENTS.EXAM_STARTED, { examId: state.activeExam.id, exam: state.activeExam });

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
            this.update(state);
            alert('Erro ao carregar o exame de prática: ' + error.message);
        }
    }

    get difficultCount() {
        return this.#difficultCount;
    }

    get incorrectCount() {
        return this.#incorrectCount;
    }
}

// Singleton Instance
export const PracticeHub = new PracticeHubManager();

// Explicit functional exports for modular consumption
export const updatePracticeHubUI = (state) => PracticeHub.update(state);
export const resetPracticeHubUI = () => PracticeHub.reset();
export const initPracticeHub = () => PracticeHub.init();
export const launchSpecialExam = (type, state) => PracticeHub.launchSpecialExam(type, state);
export const getSubjectDifficultCount = (state = State) => {
    PracticeHub.update(state);
    return PracticeHub.difficultCount;
};
export const getSubjectIncorrectCount = (state = State) => {
    PracticeHub.update(state);
    return PracticeHub.incorrectCount;
};
