/**
 * storage.js
 * ----------
 * All localStorage read/write operations for the application.
 *
 * Design rules:
 * - Every write is wrapped in try/catch; QuotaExceededError is surfaced to
 *   the user via alert() (ROB-04).
 * - loadLocalData() must NOT be called inside render functions (BUG-04).
 *   It should only run on startup and after explicit save/delete operations.
 */

import { QuestionStatus } from './constants.js';
import { APP_CONFIG } from './config.js';

export { QuestionStatus };
export const STORAGE_VERSION = APP_CONFIG.storageVersion;
const VERSION_KEY = APP_CONFIG.storageKeys.version;

/**
 * Verifica a versão do localStorage. Se não existir versão ou for uma versão antiga/legada,
 * limpa automaticamente todos os dados para prevenir incompatibilidades e garantir integridade.
 *
 * @param {object} State
 */
export function checkAndMigrateStorageVersion(State) {
    try {
        const storedVersion = localStorage.getItem(VERSION_KEY);
        if (!storedVersion || storedVersion !== STORAGE_VERSION) {
            console.warn(`[Storage] Versão de dados incompatível ou legada detectada (${storedVersion || 'nenhuma'}). A purgar dados antigos para nova versão ${STORAGE_VERSION}...`);
            localStorage.removeItem(APP_CONFIG.storageKeys.cadeiras);
            localStorage.removeItem(APP_CONFIG.storageKeys.exames);
            localStorage.removeItem(APP_CONFIG.storageKeys.history);
            localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
            if (State) {
                State.localCadeiras = [];
                State.localExames   = [];
                State.examHistory   = {};
            }
        }
    } catch (e) {
        console.error('Erro na verificação de versão do localStorage:', e);
    }
}

/**
 * Load locally-stored cadeiras, exames, and exam answers history into State.
 * Gracefully handles corrupted JSON (resets to empty objects/arrays).
 *
 * @param {object} State
 */
export function loadLocalData(State) {
    // Executa verificação e migração automática de versão antes de carregar
    checkAndMigrateStorageVersion(State);

    try {
        const cadeirasRaw = localStorage.getItem(APP_CONFIG.storageKeys.cadeiras);
        State.localCadeiras = cadeirasRaw ? JSON.parse(cadeirasRaw) : [];
    } catch (e) {
        console.error('Erro ao ler cadeiras locais:', e);
        State.localCadeiras = [];
    }

    try {
        const examesRaw = localStorage.getItem(APP_CONFIG.storageKeys.exames);
        State.localExames = examesRaw ? JSON.parse(examesRaw) : [];
    } catch (e) {
        console.error('Erro ao ler exames locais:', e);
        State.localExames = [];
    }

    try {
        const historyRaw = localStorage.getItem(APP_CONFIG.storageKeys.history);
        State.examHistory = historyRaw ? JSON.parse(historyRaw) : {};
        // Normaliza arrays legados caso existam
        if (State.examHistory && typeof State.examHistory === 'object') {
            Object.keys(State.examHistory).forEach(key => {
                const val = State.examHistory[key];
                if (!Array.isArray(val) && val && typeof val === 'object' && Array.isArray(val.questions)) {
                    State.examHistory[key] = val.questions.map(q => {
                        if (q.status === 'correct' || q.isCorrect === true) return QuestionStatus.CORRECT;
                        if (q.status === 'incorrect' || q.isCorrect === false) return QuestionStatus.INCORRECT;
                        return QuestionStatus.UNANSWERED;
                    });
                }
            });
        }
    } catch (e) {
        console.error('Erro ao ler histórico de exames:', e);
        State.examHistory = {};
    }

    try {
        const diffRaw = localStorage.getItem(APP_CONFIG.storageKeys.difficultQuestions);
        State.difficultQuestions = diffRaw ? JSON.parse(diffRaw) : {};
    } catch (e) {
        console.error('Erro ao ler perguntas difíceis:', e);
        State.difficultQuestions = {};
    }
}

/**
 * Persist the exam history dictionary to localStorage.
 * Maps examId -> Array of QuestionStatus (1: CORRECT, 2: INCORRECT, 3: UNANSWERED)
 * @param {object} State
 */
export function saveExamHistory(State) {
    try {
        localStorage.setItem(APP_CONFIG.storageKeys.history, JSON.stringify(State.examHistory || {}));
    } catch (e) {
        console.error('Erro ao guardar histórico de exames:', e);
    }
}

/**
 * Updates or records the status of a single question in an exam in real-time.
 *
 * @param {string} examId - ID of the exam
 * @param {number} questionOriginalIndex - 0-indexed position of question in the exam's full array
 * @param {number} status - QuestionStatus.CORRECT (1) | QuestionStatus.INCORRECT (2) | QuestionStatus.UNANSWERED (3)
 * @param {object} State
 * @param {number} [totalQuestions] - Total question count in full exam to pre-allocate array if needed
 */
export function updateQuestionStatus(examId, questionOriginalIndex, status, State, totalQuestions) {
    if (!examId || questionOriginalIndex < 0) return;
    if (!State.examHistory) State.examHistory = {};

    let arr = State.examHistory[examId];
    if (!Array.isArray(arr)) {
        const length = totalQuestions && totalQuestions > (questionOriginalIndex + 1)
            ? totalQuestions
            : (questionOriginalIndex + 1);
        arr = new Array(length).fill(QuestionStatus.UNANSWERED);
        State.examHistory[examId] = arr;
    }

    while (arr.length <= questionOriginalIndex) {
        arr.push(QuestionStatus.UNANSWERED);
    }

    arr[questionOriginalIndex] = status;
    saveExamHistory(State);
}

/**
 * Get the saved question status array for a specific exam ID.
 *
 * @param {string} examId
 * @param {object} State
 * @returns {number[]|null}
 */
export function getExamResult(examId, State) {
    if (!State || !State.examHistory) return null;
    return State.examHistory[examId] || null;
}

/**
 * Persist the current local cadeiras list to localStorage.
 * @param {object} State
 */
export function saveLocalCadeiras(State) {
    try {
        localStorage.setItem(APP_CONFIG.storageKeys.cadeiras, JSON.stringify(State.localCadeiras));
    } catch (e) {
        console.error('Erro ao guardar cadeiras locais (storage cheio?):', e);
        alert('Não foi possível guardar os dados localmente. O armazenamento do browser pode estar cheio.');
    }
}

/**
 * Persist the current local exames list to localStorage.
 * @param {object} State
 */
export function saveLocalExames(State) {
    try {
        localStorage.setItem(APP_CONFIG.storageKeys.exames, JSON.stringify(State.localExames));
    } catch (e) {
        console.error('Erro ao guardar exames locais (storage cheio?):', e);
        alert('Não foi possível guardar os dados localmente. O armazenamento do browser pode estar cheio.');
    }
}

/**
 * Persist the difficult questions dictionary to localStorage.
 * Maps examId -> Array of original question indices
 * @param {object} State
 */
export function saveDifficultQuestions(State) {
    try {
        localStorage.setItem(APP_CONFIG.storageKeys.difficultQuestions, JSON.stringify(State.difficultQuestions || {}));
    } catch (e) {
        console.error('Erro ao guardar perguntas difíceis:', e);
    }
}

/**
 * Toggle a question as difficult/starred in an exam.
 *
 * @param {string} examId
 * @param {number} questionOriginalIndex
 * @param {object} State
 * @returns {boolean} True if now marked difficult, false if unmarked
 */
export function toggleDifficultQuestion(examId, questionOriginalIndex, State) {
    if (!examId || questionOriginalIndex === undefined || questionOriginalIndex === null) return false;
    if (!State.difficultQuestions) State.difficultQuestions = {};
    if (!Array.isArray(State.difficultQuestions[examId])) {
        State.difficultQuestions[examId] = [];
    }

    const idxList = State.difficultQuestions[examId];
    const pos = idxList.indexOf(questionOriginalIndex);
    let isDifficult = false;

    if (pos > -1) {
        idxList.splice(pos, 1);
        isDifficult = false;
    } else {
        idxList.push(questionOriginalIndex);
        isDifficult = true;
    }

    saveDifficultQuestions(State);
    return isDifficult;
}

/**
 * Check if a question is marked as difficult.
 *
 * @param {string} examId
 * @param {number} questionOriginalIndex
 * @param {object} State
 * @returns {boolean}
 */
export function isQuestionDifficult(examId, questionOriginalIndex, State) {
    if (!examId || questionOriginalIndex === undefined || questionOriginalIndex === null) return false;
    if (!State || !State.difficultQuestions) return false;
    const list = State.difficultQuestions[examId];
    return Array.isArray(list) && list.includes(questionOriginalIndex);
}

/**
 * Delete all locally-created cadeiras, exames, and question history from localStorage and
 * reset the corresponding State arrays and dictionaries.
 *
 * @param {object} State
 */
export function clearAllLocalData(State) {
    try {
        localStorage.removeItem(APP_CONFIG.storageKeys.cadeiras);
        localStorage.removeItem(APP_CONFIG.storageKeys.exames);
        localStorage.removeItem(APP_CONFIG.storageKeys.history);
        localStorage.removeItem(APP_CONFIG.storageKeys.difficultQuestions);
        localStorage.removeItem(APP_CONFIG.storageKeys.language);
        localStorage.removeItem(APP_CONFIG.storageKeys.languageConfigured);
    } catch (e) {
        console.error('Erro ao limpar dados locais:', e);
    }
    State.localCadeiras = [];
    State.localExames   = [];
    State.examHistory   = {};
    State.difficultQuestions = {};
    State.language      = APP_CONFIG.defaultLanguage;
}
