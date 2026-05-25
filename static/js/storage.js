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

/**
 * Load locally-stored cadeiras and exames into State.
 * Gracefully handles corrupted JSON (resets to empty arrays).
 *
 * @param {object} State
 */
export function loadLocalData(State) {
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
 * Delete all locally-created cadeiras and exames from localStorage and
 * reset the corresponding State arrays (MOD-02).
 *
 * Note: this function intentionally does NOT touch the DOM — resetting
 * the header icon/title is the caller's responsibility (main.js).
 *
 * @param {object} State
 */
export function clearAllLocalData(State) {
    try {
        localStorage.removeItem('simulador_cadeiras_locais');
        localStorage.removeItem('simulador_exames_locais');
    } catch (e) {
        console.error('Erro ao limpar dados locais:', e);
    }
    State.localCadeiras = [];
    State.localExames   = [];
}
