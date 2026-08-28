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

export { QuestionStatus };
export const STORAGE_VERSION = '2.0.0';
const VERSION_KEY = 'simulador_storage_version';

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
            localStorage.removeItem('simulador_cadeiras_locais');
            localStorage.removeItem('simulador_exames_locais');
            localStorage.removeItem('simulador_historico_exames');
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
        const cadeirasRaw = localStorage.getItem('simulador_cadeiras_locais');
        State.localCadeiras = cadeirasRaw ? JSON.parse(cadeirasRaw) : [];
    } catch (e) {
        console.error('Erro ao ler cadeiras locais:', e);
        State.localCadeiras = [];
    }

    try {
        const examesRaw = localStorage.getItem('simulador_exames_locais');
        State.localExames = examesRaw ? JSON.parse(examesRaw) : [];
    } catch (e) {
        console.error('Erro ao ler exames locais:', e);
        State.localExames = [];
    }

    try {
        const historyRaw = localStorage.getItem('simulador_historico_exames');
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
}

/**
 * Persist the exam history dictionary to localStorage.
 * Maps examId -> Array of QuestionStatus (1: CORRECT, 2: INCORRECT, 3: UNANSWERED)
 * @param {object} State
 */
export function saveExamHistory(State) {
    try {
        localStorage.setItem('simulador_historico_exames', JSON.stringify(State.examHistory || {}));
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
        localStorage.setItem('simulador_cadeiras_locais', JSON.stringify(State.localCadeiras));
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
        localStorage.setItem('simulador_exames_locais', JSON.stringify(State.localExames));
    } catch (e) {
        console.error('Erro ao guardar exames locais (storage cheio?):', e);
        alert('Não foi possível guardar os dados localmente. O armazenamento do browser pode estar cheio.');
    }
}

/**
 * Delete all locally-created cadeiras, exames, and question history from localStorage and
 * reset the corresponding State arrays and dictionaries.
 *
 * @param {object} State
 */
export function clearAllLocalData(State) {
    try {
        localStorage.removeItem('simulador_cadeiras_locais');
        localStorage.removeItem('simulador_exames_locais');
        localStorage.removeItem('simulador_historico_exames');
    } catch (e) {
        console.error('Erro ao limpar dados locais:', e);
    }
    State.localCadeiras = [];
    State.localExames   = [];
    State.examHistory   = {};
}
