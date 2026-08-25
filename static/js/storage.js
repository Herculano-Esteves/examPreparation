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
            localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
            if (State) {
                State.localCadeiras = [];
                State.localExames   = [];
            }
        }
    } catch (e) {
        console.error('Erro na verificação de versão do localStorage:', e);
    }
}

/**
 * Load locally-stored cadeiras and exames into State.
 * Gracefully handles corrupted JSON (resets to empty arrays).
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
