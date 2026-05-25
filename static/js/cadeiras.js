/**
 * cadeiras.js
 * -----------
 * Manages fetching, rendering, and selecting Cadeiras (university subjects).
 *
 * Circular import note: cadeiras.js imports transitionTo from navigation.js,
 * and navigation.js imports renderCadeirasMenu from cadeiras.js. This is safe
 * in ES modules because both sides export named functions (live bindings),
 * fully resolved before any code executes.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML } from './utils.js';
import { transitionTo } from './navigation.js';

/**
 * Fetch the static cadeiras list from the server and render the menu.
 * Displays a retry button on failure.
 */
export async function fetchCadeiras() {
    try {
        const response = await fetch('exames/cadeiras.json');
        if (!response.ok) throw new Error('Não foi possível carregar as cadeiras.');
        State.cadeiras = await response.json();
        renderCadeirasMenu();
    } catch (error) {
        console.error('Error fetching cadeiras:', error);
        elements.cadeirasGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Erro ao carregar as cadeiras</h3>
                <p>${error.message}</p>
                <button class="btn-control btn-primary" id="btn-retry-cadeiras" style="margin-top: 1rem;">Tentar Novamente</button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-cadeiras');
        if (retryBtn) retryBtn.addEventListener('click', () => fetchCadeiras());
    }
}

/**
 * Render the cadeiras grid from State.cadeiras + State.localCadeiras.
 *
 * IMPORTANT: Do NOT call loadLocalData() here. loadLocalData overwrites
 * State.localCadeiras from localStorage, discarding any in-memory changes
 * made after the last explicit save. Data is loaded on app startup and after
 * every explicit write operation (save / delete).
 */
export function renderCadeirasMenu() {
    const combinedCadeiras = [...State.cadeiras, ...State.localCadeiras];

    if (combinedCadeiras.length === 0) {
        elements.cadeirasGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-folder-open"></i>
                <h3>Nenhuma cadeira disponível</h3>
                <p>Por favor, adicione uma cadeira local ou configure o ficheiro 'exames/cadeiras.json'.</p>
            </div>
        `;
        return;
    }

    elements.cadeirasGrid.innerHTML = '';

    combinedCadeiras.forEach(cadeira => {
        const card = document.createElement('div');
        card.className = 'exam-card';
        const sigla = cadeira.sigla ||
            cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);

        card.innerHTML = `
            <div class="exam-card-header">
                <div class="exam-icon-box">
                    <i class="fa-solid ${cadeira.icon || 'fa-graduation-cap'}"></i>
                </div>
                <span class="question-count-badge">${cadeira.exames_count || 0} Exames</span>
            </div>
            <h4>${escapeHTML(sigla)} ${cadeira.isLocal ? '<span class="badge-local">Local</span>' : ''}</h4>
            <p class="cadeira-card-nome">${escapeHTML(cadeira.nome)}</p>
            <p>${escapeHTML(cadeira.descricao)}</p>
            <div class="exam-card-footer">
                <span>Ver Exames</span>
                <i class="fa-solid fa-circle-arrow-right"></i>
            </div>
        `;

        card.addEventListener('click', () => selectCadeira(cadeira));
        elements.cadeirasGrid.appendChild(card);
    });

    // "Add cadeira" card
    const addCard = document.createElement('div');
    addCard.className = 'exam-card add-card';
    addCard.innerHTML = `
        <div class="add-card-content">
            <i class="fa-solid fa-plus-circle add-icon"></i>
            <span class="add-text">Adicionar Cadeira</span>
        </div>
    `;
    addCard.addEventListener('click', () => transitionTo('addCadeira'));
    elements.cadeirasGrid.appendChild(addCard);
}

/**
 * Set the active cadeira and navigate to its exam list.
 * Updates the app header icon/title to reflect the selected subject.
 *
 * @param {object} cadeira - The cadeira object that was clicked
 */
export function selectCadeira(cadeira) {
    State.activeCadeira = cadeira;

    if (cadeira.icon) {
        document.getElementById('app-logo-icon').className =
            `fa-solid ${cadeira.icon} app-logo-icon`;
    }
    document.getElementById('app-main-title').textContent = cadeira.nome;
    const sigla = cadeira.sigla ||
        cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
    document.getElementById('app-subtitle').textContent =
        `Simulador de Exames (${sigla})`;

    transitionTo('menu');
}
