/**
 * cadeiras.js
 * -----------
 * Manages fetching, rendering, and selecting Cadeiras (university subjects).
 * Clean card layout with Title first, description underneath, and exam count at the bottom.
 * Full WCAG 2.1 AA / EAA 2025 keyboard accessibility.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML, clampCardDescriptions } from './utils.js';
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
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <h3>Erro ao carregar as cadeiras</h3>
                <p>${escapeHTML(error.message)}</p>
                <button class="btn-control btn-primary" id="btn-retry-cadeiras" style="margin-top: 1rem;">Tentar Novamente</button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-cadeiras');
        if (retryBtn) retryBtn.addEventListener('click', () => fetchCadeiras());
    }
}

/**
 * Render the cadeiras grid from State.cadeiras + State.localCadeiras.
 * Direct layout: Title on top, description underneath, exam count at the bottom.
 */
export function renderCadeirasMenu() {
    const combinedCadeiras = [...State.cadeiras, ...State.localCadeiras];

    if (combinedCadeiras.length === 0) {
        elements.cadeirasGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-folder-open" aria-hidden="true"></i>
                <h3>Nenhuma cadeira disponível</h3>
                <p>Adicione uma cadeira no botão acima ou configure o ficheiro 'exames/cadeiras.json'.</p>
            </div>
        `;
        return;
    }

    elements.cadeirasGrid.innerHTML = '';

    combinedCadeiras.forEach(cadeira => {
        const row = document.createElement('div');
        row.className = 'exam-list-row';
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `Selecionar cadeira ${cadeira.nome}`);

        const sigla = (cadeira.sigla ||
            cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5)).toUpperCase();

        const exCount = cadeira.exames_count || 0;
        const countLabel = exCount === 1 ? '1 exame' : `${exCount} exames`;
        const iconClass = cadeira.icon
            ? (cadeira.icon.startsWith('fa-') ? `fa-solid ${cadeira.icon}` : cadeira.icon)
            : 'fa-solid fa-graduation-cap';

        row.innerHTML = `
            <div class="exam-list-header">
                <h4 class="exam-list-title"><i class="${iconClass} cadeira-title-icon" aria-hidden="true"></i> ${escapeHTML(sigla)} - ${escapeHTML(cadeira.nome.toUpperCase())}${cadeira.isLocal ? ' <span class="badge-local">Local</span>' : ''}</h4>
                <span class="exam-list-action">[ ${countLabel} ]</span>
            </div>
            <p class="exam-list-desc">${escapeHTML(cadeira.descricao)}</p>
        `;

        const activate = () => selectCadeira(cadeira);
        row.addEventListener('click', activate);
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate();
            }
        });

        elements.cadeirasGrid.appendChild(row);
    });
}

/**
 * Set the active cadeira and navigate to its exam list.
 * Updates the app header icon/title to reflect the selected subject.
 *
 * @param {object} cadeira - The cadeira object that was clicked
 */
export function selectCadeira(cadeira) {
    State.activeCadeira = cadeira;

    const iconEl = document.getElementById('app-logo-icon');
    if (iconEl && cadeira.icon) {
        iconEl.className = `fa-solid ${cadeira.icon} app-logo-icon`;
    }
    
    document.getElementById('app-main-title').textContent = cadeira.nome;
    const sigla = cadeira.sigla ||
        cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
    
    const subtitleEl = document.getElementById('app-subtitle');
    if (subtitleEl) {
        subtitleEl.innerHTML = `<span class="status-dot" aria-hidden="true"></span> SISTEMA DE EXAMES | ${escapeHTML(sigla)}`;
    }

    transitionTo('menu');
}
