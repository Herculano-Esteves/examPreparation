/**
 * cadeiras.js
 * -----------
 * Manages fetching, rendering, and selecting Cadeiras (university subjects).
 * Uses the EventBus to listen for screen transitions and language changes.
 * Full WCAG 2.1 AA / EAA 2025 keyboard accessibility.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML, clampCardDescriptions } from './utils.js';
import { transitionTo } from './navigation.js';
import { t } from './i18n.js';
import { Events, APP_EVENTS } from './events.js';

/**
 * Fetch the static cadeiras list from the server and render the menu.
 * Displays a retry button on failure.
 */
export async function fetchCadeiras() {
    try {
        const response = await fetch('exames/cadeiras.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error('Não foi possível carregar as cadeiras.');
        State.cadeiras = await response.json();
        renderCadeirasMenu();
    } catch (error) {
        console.error('Error fetching cadeiras:', error);
        if (elements.cadeirasGrid) {
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
}

let cadeirasSearchInitialized = false;

/**
 * Initializes search input listeners on the Cadeiras screen.
 */
function initCadeirasSearch() {
    if (cadeirasSearchInitialized) return;
    cadeirasSearchInitialized = true;

    const searchInput = elements.searchCadeiras || document.getElementById('search-cadeiras');
    const clearBtn = elements.btnClearCadeiraSearch || document.getElementById('btn-clear-cadeira-search');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            State.cadeirasSearch = searchInput.value;
            if (clearBtn) {
                clearBtn.style.display = searchInput.value.trim() ? 'inline-flex' : 'none';
            }
            renderCadeirasMenu();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            State.cadeirasSearch = '';
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            clearBtn.style.display = 'none';
            renderCadeirasMenu();
        });
    }
}

/**
 * Render the cadeiras grid from State.cadeiras + State.localCadeiras, applying search filter.
 * Direct layout: Title on top, description underneath, exam count at the bottom.
 */
export function renderCadeirasMenu() {
    if (!elements.cadeirasGrid) return;
    initCadeirasSearch();

    const searchInput = elements.searchCadeiras || document.getElementById('search-cadeiras');
    const clearBtn = elements.btnClearCadeiraSearch || document.getElementById('btn-clear-cadeira-search');
    if (searchInput && searchInput.value !== (State.cadeirasSearch || '')) {
        searchInput.value = State.cadeirasSearch || '';
    }
    if (clearBtn) {
        clearBtn.style.display = (State.cadeirasSearch || '').trim() ? 'inline-flex' : 'none';
    }

    const combinedCadeiras = [...(State.cadeiras || []), ...(State.localCadeiras || [])];

    if (combinedCadeiras.length === 0) {
        elements.cadeirasGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-folder-open" aria-hidden="true"></i>
                <h3>${escapeHTML(t('empty_cadeiras_title'))}</h3>
                <p>${escapeHTML(t('empty_cadeiras_desc'))}</p>
            </div>
        `;
        return;
    }

    const query = (State.cadeirasSearch || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filteredCadeiras = combinedCadeiras.filter(c => {
        if (!query) return true;
        const nameNorm = (c.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const descNorm = (c.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const siglaNorm = (c.sigla || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameNorm.includes(query) || descNorm.includes(query) || siglaNorm.includes(query);
    });

    if (filteredCadeiras.length === 0) {
        elements.cadeirasGrid.innerHTML = `
            <div class="empty-filters-state">
                <i class="fa-solid fa-magnifying-glass empty-filters-main-icon" aria-hidden="true"></i>
                <h4>${escapeHTML(t('no_cadeiras_found_title'))}</h4>
                <p>${escapeHTML(t('no_cadeiras_found_desc'))}</p>
                <button type="button" class="btn-control btn-primary btn-sm" id="btn-reset-cadeiras-search">
                    <i class="fa-solid fa-rotate-left"></i> ${escapeHTML(t('btn_reset_all_filters'))}
                </button>
            </div>
        `;
        const resetBtn = document.getElementById('btn-reset-cadeiras-search');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                State.cadeirasSearch = '';
                if (searchInput) searchInput.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
                renderCadeirasMenu();
            });
        }
        return;
    }

    elements.cadeirasGrid.innerHTML = '';

    filteredCadeiras.forEach(cadeira => {
        const row = document.createElement('div');
        row.className = 'exam-list-row';
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', t('aria_select_cadeira', { name: cadeira.nome }));

        const sigla = (cadeira.sigla ||
            cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5)).toUpperCase();

        const exCount = cadeira.exames_count || 0;
        const countLabel = exCount === 1 ? t('exam_singular') : t('exam_plural', { count: exCount });
        const iconClass = cadeira.icon
            ? (cadeira.icon.startsWith('fa-') ? `fa-solid ${cadeira.icon}` : cadeira.icon)
            : 'fa-solid fa-graduation-cap';

        row.innerHTML = `
            <div class="exam-list-header">
                <h4 class="exam-list-title"><i class="${iconClass} cadeira-title-icon" aria-hidden="true"></i> ${escapeHTML(sigla)} - ${escapeHTML(cadeira.nome.toUpperCase())}${cadeira.isLocal ? ` <span class="badge-local">${escapeHTML(t('badge_local'))}</span>` : ''}</h4>
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

    document.querySelectorAll('.sticky-subject-icon').forEach(el => {
        if (cadeira.icon) el.className = `fa-solid ${cadeira.icon} sticky-subject-icon`;
    });
    
    const mainTitle = document.getElementById('app-main-title');
    if (mainTitle) mainTitle.textContent = cadeira.nome;

    const sigla = cadeira.sigla ||
        cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
    
    const subtitleEl = document.getElementById('app-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = t('app_subtitle_with_sigla', { sigla });
    }

    Events.emit(APP_EVENTS.CADEIRA_SELECTED, { cadeira });
    transitionTo('menu');
}

// ---------------------------------------------------------------------------
// EventBus Subscriptions
// ---------------------------------------------------------------------------
Events.on(APP_EVENTS.SCREEN_CHANGED, ({ to }) => {
    if (to === 'cadeiras') {
        const logoIcon = document.getElementById('app-logo-icon');
        if (logoIcon) logoIcon.className = 'fa-solid fa-graduation-cap app-logo-icon';

        document.querySelectorAll('.sticky-subject-icon').forEach(el => {
            el.className = 'fa-solid fa-graduation-cap sticky-subject-icon';
        });

        const mainTitle = document.getElementById('app-main-title');
        if (mainTitle) mainTitle.textContent = t('app_title');

        const subtitleEl = document.getElementById('app-subtitle');
        if (subtitleEl) subtitleEl.textContent = t('app_subtitle');

        renderCadeirasMenu();
    }
});

Events.on(APP_EVENTS.LANGUAGE_CHANGED, () => {
    if (State.currentScreen === 'cadeiras') {
        renderCadeirasMenu();
    }
});
