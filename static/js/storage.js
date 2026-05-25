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

export function saveLocalCadeiras(State) {
    localStorage.setItem('simulador_cadeiras_locais', JSON.stringify(State.localCadeiras));
}

export function saveLocalExames(State) {
    localStorage.setItem('simulador_exames_locais', JSON.stringify(State.localExames));
}
