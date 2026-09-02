/**
 * filterState.js
 * --------------
 * Módulo puro e isolado para gestão de estado, validação, limites
 * matemáticos e predicados de filtragem de exames.
 * Sem acoplamento com o DOM para assegurar testabilidade e robustez.
 */

export const ALL_QUESTION_TYPES = ['escolha_multipla', 'boolean', 'escrita'];
export const ALL_EXAM_STATES = ['completed', 'pending'];

/**
 * Garante que os limites de número de questões são matematicamente válidos.
 * @param {number} minVal
 * @param {number} maxVal
 * @param {number} maxLimit
 * @returns {{ min: number, max: number }}
 */
export function clampQuestionsRange(minVal, maxVal, maxLimit) {
    const limit = Math.max(1, parseInt(maxLimit, 10) || 1);
    let min = parseInt(minVal, 10);
    let max = parseInt(maxVal, 10);

    if (isNaN(min)) min = 1;
    if (isNaN(max)) max = limit;

    min = Math.max(1, Math.min(limit, min));
    max = Math.max(1, Math.min(limit, max));

    if (min > max) {
        min = max;
    }

    return { min, max };
}

/**
 * Garante que os limites de percentagem de classificação são matematicamente válidos.
 * @param {number} minVal
 * @param {number} maxVal
 * @returns {{ min: number, max: number }}
 */
export function clampScoreRange(minVal, maxVal) {
    let min = parseInt(minVal, 10);
    let max = parseInt(maxVal, 10);

    if (isNaN(min)) min = 0;
    if (isNaN(max)) max = 100;

    min = Math.max(0, Math.min(100, min));
    max = Math.max(0, Math.min(100, max));

    if (min > max) {
        min = max;
    }

    return { min, max };
}

/**
 * Valida e ajusta o valor máximo de questões sem sobreposições destrutivas.
 * Se o valor for nulo/inválido ou exceder o teto da cadeira, repõe no limite superior.
 * Caso contrário, preserva o valor escolhido pelo utilizador!
 * @param {number|null|undefined} currentMax
 * @param {number} maxLimit
 * @returns {number}
 */
export function sanitizeQuestionsMax(currentMax, maxLimit) {
    const limit = Math.max(1, parseInt(maxLimit, 10) || 1);
    if (currentMax === null || currentMax === undefined || isNaN(currentMax)) {
        return limit;
    }
    const val = parseInt(currentMax, 10);
    if (val > limit) {
        return limit;
    }
    if (val < 1) {
        return 1;
    }
    return val;
}

/**
 * Valida e ajusta o valor mínimo de questões respeitando o máximo atual.
 * @param {number|null|undefined} currentMin
 * @param {number} currentMax
 * @returns {number}
 */
export function sanitizeQuestionsMin(currentMin, currentMax) {
    if (currentMin === null || currentMin === undefined || isNaN(currentMin)) {
        return 1;
    }
    const val = parseInt(currentMin, 10);
    return Math.max(1, Math.min(currentMax, val));
}

/**
 * Avalia se um determinado exame cumpre todos os critérios de filtro ativos.
 * @param {Object} item Exame preparado com activeCount, scorePercentage, isAttempted, etc.
 * @param {Object} state Estado da aplicação
 * @returns {boolean}
 */
export function isExamMatchingFilters(item, state) {
    if (!item) return false;

    // 1. Pesquisa por texto (título do exame)
    const searchFilter = (state.examSearch || '').trim().toLowerCase();
    if (searchFilter) {
        const titleStr = (item.title || item.titulo || '').toLowerCase();
        if (!titleStr.includes(searchFilter)) {
            return false;
        }
    }

    // 2. Filtro de Estado do Exame (completed vs pending)
    const stateFilter = state.examStateFilter || ALL_EXAM_STATES;
    const isCompleted = item.isAttempted === true;
    const isPending = !isCompleted;

    const allowsCompleted = stateFilter.includes('completed');
    const allowsPending = stateFilter.includes('pending');

    if (isCompleted && !allowsCompleted) return false;
    if (isPending && !allowsPending) return false;

    // 3. Filtro de Número de Questões (activeCount)
    const activeCount = item.activeCount !== undefined ? item.activeCount : 0;
    const minQ = state.examQuestionsMin !== null && state.examQuestionsMin !== undefined ? state.examQuestionsMin : 1;
    const maxQ = state.examQuestionsMax !== null && state.examQuestionsMax !== undefined ? state.examQuestionsMax : 9999;

    if (activeCount < minQ || activeCount > maxQ) {
        return false;
    }

    // 4. Filtro de Percentagem de Acerto / Classificação
    const minScore = state.examScoreMin !== null && state.examScoreMin !== undefined ? state.examScoreMin : 0;
    const maxScore = state.examScoreMax !== null && state.examScoreMax !== undefined ? state.examScoreMax : 100;

    if (item.isAttempted && item.scorePercentage !== null) {
        if (item.scorePercentage < minScore || item.scorePercentage > maxScore) {
            return false;
        }
    } else {
        // Exames por fazer têm score 0%
        if (0 < minScore || 0 > maxScore) {
            return false;
        }
    }

    return true;
}
