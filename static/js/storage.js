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
        if (Array.isArray(State.localCadeiras)) {
            State.localCadeiras.forEach(c => {
                if (!c.createdAt && c.id) {
                    const ts = parseInt(c.id.replace('local_', ''), 10);
                    c.createdAt = new Date(!isNaN(ts) && ts > 1000000000000 ? ts : Date.now()).toISOString();
                }
            });
        }
    } catch (e) {
        console.error('Erro ao ler cadeiras locais:', e);
        State.localCadeiras = [];
    }

    try {
        const examesRaw = localStorage.getItem(APP_CONFIG.storageKeys.exames);
        State.localExames = examesRaw ? JSON.parse(examesRaw) : [];
        if (Array.isArray(State.localExames)) {
            State.localExames.forEach(e => {
                if (!e.createdAt && e.id) {
                    const ts = parseInt(e.id.replace('exam_local_', ''), 10);
                    e.createdAt = new Date(!isNaN(ts) && ts > 1000000000000 ? ts : Date.now()).toISOString();
                }
            });
        }
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

/**
 * Delete a locally-created cadeira and any of its associated local exams.
 * Also cleans up history and difficult questions.
 *
 * @param {string} cadeiraId
 * @param {object} State
 * @returns {boolean} True if deleted, false otherwise
 */
export function deleteLocalCadeira(cadeiraId, State) {
    if (!cadeiraId || !State || !Array.isArray(State.localCadeiras)) return false;

    const initialLen = State.localCadeiras.length;
    State.localCadeiras = State.localCadeiras.filter(c => c.id !== cadeiraId);
    if (State.localCadeiras.length === initialLen) return false;
    saveLocalCadeiras(State);

    // Clean up local exams associated with this cadeira
    if (Array.isArray(State.localExames)) {
        const examsToRemove = State.localExames.filter(e => e.cadeira_id === cadeiraId);
        examsToRemove.forEach(e => {
            if (State.examHistory && State.examHistory[e.id]) {
                delete State.examHistory[e.id];
            }
            if (State.difficultQuestions && State.difficultQuestions[e.id]) {
                delete State.difficultQuestions[e.id];
            }
        });
        State.localExames = State.localExames.filter(e => e.cadeira_id !== cadeiraId);
        saveLocalExames(State);
        saveExamHistory(State);
        saveDifficultQuestions(State);
    }

    // Reset activeCadeira if the active one was deleted
    if (State.activeCadeira && State.activeCadeira.id === cadeiraId) {
        State.activeCadeira = null;
    }

    return true;
}

/**
 * Delete a locally-created exam.
 * Also updates parent local cadeira's exames_count and cleans up exam history/difficult questions.
 *
 * @param {string} examId
 * @param {object} State
 * @returns {boolean} True if deleted, false otherwise
 */
export function deleteLocalExame(examId, State) {
    if (!examId || !State || !Array.isArray(State.localExames)) return false;

    const targetExam = State.localExames.find(e => e.id === examId);
    if (!targetExam) return false;

    // 1. Remove from localExames
    State.localExames = State.localExames.filter(e => e.id !== examId);
    saveLocalExames(State);

    // 2. Update parent local cadeira's exames_count if applicable
    if (targetExam.cadeira_id && Array.isArray(State.localCadeiras)) {
        const cIdx = State.localCadeiras.findIndex(c => c.id === targetExam.cadeira_id);
        if (cIdx > -1) {
            const currentCount = State.localCadeiras[cIdx].exames_count || 0;
            State.localCadeiras[cIdx].exames_count = Math.max(0, currentCount - 1);
            saveLocalCadeiras(State);
        }
    }

    // 3. Clean up history and difficult questions
    if (State.examHistory && State.examHistory[examId]) {
        delete State.examHistory[examId];
        saveExamHistory(State);
    }
    if (State.difficultQuestions && State.difficultQuestions[examId]) {
        delete State.difficultQuestions[examId];
        saveDifficultQuestions(State);
    }

    return true;
}

/**
 * Helper to extract comparable title from an exam object (supports string or { pt, en }).
 * @param {object} exam
 * @returns {string}
 */
export function getComparableExamTitle(exam) {
    if (!exam) return '';
    const raw = exam.title || exam.titulo || '';
    if (typeof raw === 'object' && raw !== null) {
        return (raw.pt || raw.en || Object.values(raw)[0] || '').trim().toLowerCase();
    }
    return String(raw).trim().toLowerCase();
}

/**
 * Normalizes ISO date string or timestamp to standard ISO 8601 string for exact comparison.
 * @param {string|number} dateVal
 * @returns {string}
 */
export function normalizeTimestamp(dateVal) {
    if (!dateVal) return '';
    try {
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? String(dateVal).trim() : d.toISOString();
    } catch (e) {
        return String(dateVal).trim();
    }
}

/**
 * Imports local subjects and exams from a parsed backup package with intelligent de-duplication:
 * - Same Name AND Same Creation Timestamp: Identical item -> Ignored (no duplicate).
 * - Same Name BUT Different Creation Timestamp: New version / distinct instance -> Added as new local item.
 * - Non-existent Name: Added as new local item.
 *
 * @param {{ cadeiras: object[], exames: object[] }} backupData
 * @param {object} State
 * @returns {{
 *   importedCadeirasCount: number,
 *   skippedCadeirasCount: number,
 *   importedExamsCount: number,
 *   skippedExamsCount: number
 * }}
 */
export function importLocalDataFromBackup({ cadeiras = [], exames = [] }, State) {
    if (!State) return { importedCadeirasCount: 0, skippedCadeirasCount: 0, importedExamsCount: 0, skippedExamsCount: 0 };
    if (!Array.isArray(State.localCadeiras)) State.localCadeiras = [];
    if (!Array.isArray(State.localExames)) State.localExames = [];

    let importedCadeirasCount = 0;
    let skippedCadeirasCount = 0;
    let importedExamsCount = 0;
    let skippedExamsCount = 0;

    // Map old/imported subject IDs to resolved/existing subject IDs
    const cadeiraIdMap = new Map();

    // 1. Process Subjects
    for (const incomingCadeira of cadeiras) {
        if (!incomingCadeira || !incomingCadeira.nome) continue;

        const incomingName = incomingCadeira.nome.trim().toLowerCase();
        const incomingCreatedAt = normalizeTimestamp(incomingCadeira.createdAt || (incomingCadeira.id ? incomingCadeira.id.replace('local_', '') : ''));

        // Check against existing local subjects
        const existingSubject = State.localCadeiras.find(c => {
            const existingName = (c.nome || '').trim().toLowerCase();
            const existingCreatedAt = normalizeTimestamp(c.createdAt || (c.id ? c.id.replace('local_', '') : ''));
            return existingName === incomingName && existingCreatedAt === incomingCreatedAt;
        });

        if (existingSubject) {
            // Exact same subject (same name & same createdAt) -> Skip creating duplicate
            cadeiraIdMap.set(incomingCadeira.id, existingSubject.id);
            skippedCadeirasCount++;
        } else {
            // New subject or different creation timestamp -> Create as new local subject
            const newSubjectId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            const cleanCreatedAt = incomingCreatedAt || new Date().toISOString();

            const newCadeiraObj = {
                id: newSubjectId,
                nome: incomingCadeira.nome.trim(),
                sigla: incomingCadeira.sigla || incomingCadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5),
                descricao: incomingCadeira.descricao || '',
                icon: incomingCadeira.icon || 'fa-graduation-cap',
                exames_count: 0,
                isLocal: true,
                index_path: null,
                createdAt: cleanCreatedAt
            };

            State.localCadeiras.push(newCadeiraObj);
            cadeiraIdMap.set(incomingCadeira.id, newSubjectId);
            importedCadeirasCount++;
        }
    }

    // 2. Process Exams
    for (const incomingExam of exames) {
        if (!incomingExam) continue;

        const incomingTitle = getComparableExamTitle(incomingExam);
        const incomingCreatedAt = normalizeTimestamp(incomingExam.createdAt || (incomingExam.id ? incomingExam.id.replace('exam_local_', '') : ''));
        const resolvedCadeiraId = cadeiraIdMap.get(incomingExam.cadeira_id) || incomingExam.cadeira_id || (State.localCadeiras[0] ? State.localCadeiras[0].id : null);

        // Check against existing local exams
        const existingExam = State.localExames.find(e => {
            const existingTitle = getComparableExamTitle(e);
            const existingCreatedAt = normalizeTimestamp(e.createdAt || (e.id ? e.id.replace('exam_local_', '') : ''));
            // If they have the exact same title AND the exact same createdAt, they are identical
            return existingTitle === incomingTitle && existingCreatedAt === incomingCreatedAt;
        });

        if (existingExam) {
            // Exact same exam (same title & same timestamp) -> Skip creating duplicate
            skippedExamsCount++;
        } else {
            // New exam or different timestamp -> Add as new local exam
            const newExamId = 'exam_local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            const cleanCreatedAt = incomingCreatedAt || new Date().toISOString();

            const newExamObj = {
                ...incomingExam,
                id: newExamId,
                cadeira_id: resolvedCadeiraId,
                isLocal: true,
                createdAt: cleanCreatedAt
            };

            State.localExames.push(newExamObj);
            importedExamsCount++;
        }
    }

    // 3. Recalculate exames_count for all local subjects
    State.localCadeiras.forEach(c => {
        c.exames_count = State.localExames.filter(e => e.cadeira_id === c.id).length;
    });

    // 4. Persist to localStorage
    saveLocalCadeiras(State);
    saveLocalExames(State);

    return {
        importedCadeirasCount,
        skippedCadeirasCount,
        importedExamsCount,
        skippedExamsCount
    };
}


