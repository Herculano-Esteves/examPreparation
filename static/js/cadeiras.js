/**
 * cadeiras.js
 * -----------
 * Manages fetching, filtering, sorting, rendering, and selecting Cadeiras (university subjects).
 * Uses the EventBus to listen for screen transitions and language changes.
 * Full WCAG 2.1 AA / EAA 2025 keyboard accessibility.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML, safeAsync, showToast } from './utils.js';
import { transitionTo } from './navigation.js';
import { t, updateSortCadeirasDropdownLabel, getCurrentLanguage } from './i18n.js';
import { Events, APP_EVENTS } from './events.js';
import { ALL_QUESTION_TYPES } from './examFilters.js';

let renderTimer = null;
function scheduleRenderCadeirasMenu() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderCadeirasMenu, 25);
}

/**
 * Fetch the static cadeiras list from the server and render the menu.
 * Displays a retry button on failure.
 */
export async function fetchCadeiras() {
    await safeAsync(async () => {
        const response = await fetch('exames/cadeiras.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error('Não foi possível carregar as cadeiras.');
        State.cadeiras = await response.json();
        renderCadeirasMenu();
    }, {
        context: 'cadeiras',
        container: elements.cadeirasGrid,
        onRetry: fetchCadeiras
    });
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
            scheduleRenderCadeirasMenu();
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
            scheduleRenderCadeirasMenu();
        });
    }
}

let sortCadeirasDropdownInitialized = false;

/**
 * Initializes sort dropdown trigger, menu, keyboard navigation, and clicks for Cadeiras.
 * @param {Function} onSortChange - Callback invoked when sort option changes.
 */
export function initSortCadeirasDropdown(onSortChange) {
    if (sortCadeirasDropdownInitialized) return;
    sortCadeirasDropdownInitialized = true;

    const trigger = elements.sortCadeirasTrigger || document.getElementById('sort-cadeiras-trigger');
    const menu = elements.sortCadeirasMenu || document.getElementById('sort-cadeiras-menu');
    const dropdown = elements.sortCadeirasDropdown || document.getElementById('sort-cadeiras-dropdown');

    if (trigger && menu) {
        const toggleDropdown = (open) => {
            const isCurrentlyOpen = trigger.getAttribute('aria-expanded') === 'true';
            const shouldOpen = (typeof open === 'boolean') ? open : !isCurrentlyOpen;
            trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            menu.classList.toggle('open', shouldOpen);
            if (dropdown) dropdown.classList.toggle('open', shouldOpen);
        };

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });

        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                toggleDropdown(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
                toggleDropdown(false);
                trigger.focus();
            }
        });

        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = item.getAttribute('data-value');
                State.cadeiraSort = value;

                menu.querySelectorAll('.dropdown-item').forEach(i => {
                    const isSelected = i === item;
                    i.classList.toggle('active', isSelected);
                    i.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                });

                updateSortCadeirasDropdownLabel();
                toggleDropdown(false);
                if (onSortChange) onSortChange();
            });
        });
    }
}

let cadeirasSidebarFiltersInitialized = false;

/**
 * Initializes sidebar filter checkboxes and reset button for Cadeiras.
 * @param {Function} onFilterChange - Callback invoked when any filter changes.
 */
export function initCadeirasSidebarFilters(onFilterChange) {
    if (cadeirasSidebarFiltersInitialized) return;
    cadeirasSidebarFiltersInitialized = true;

    const originInputs = document.querySelectorAll('#cadeiras-sidebar-filters .floating-origin-check-input');
    originInputs.forEach(input => {
        input.addEventListener('change', () => {
            const active = [];
            originInputs.forEach(inp => {
                if (inp.checked) active.push(inp.value);
            });
            State.cadeiraOriginFilter = active;
            if (onFilterChange) onFilterChange();
        });
    });

    const availInputs = document.querySelectorAll('#cadeiras-sidebar-filters .floating-avail-check-input');
    availInputs.forEach(input => {
        input.addEventListener('change', () => {
            const active = [];
            availInputs.forEach(inp => {
                if (inp.checked) active.push(inp.value);
            });
            State.cadeiraAvailabilityFilter = active;
            if (onFilterChange) onFilterChange();
        });
    });

    // Reset Link in Header (exact same as exams sidebar)
    const btnReset = elements.btnResetCadeirasFilters || document.getElementById('btn-reset-cadeiras-filters');
    if (btnReset) {
        btnReset.addEventListener('click', (e) => {
            e.stopPropagation();
            resetAllCadeirasFilters(onFilterChange);
            showToast(t('toast_filters_reset'));
        });
    }
}

/**
 * Synchronizes the DOM input elements with State.
 */
export function syncCadeirasInputsUI() {
    const searchInput = elements.searchCadeiras || document.getElementById('search-cadeiras');
    const clearBtn = elements.btnClearCadeiraSearch || document.getElementById('btn-clear-cadeira-search');
    if (searchInput && searchInput.value !== (State.cadeirasSearch || '')) {
        searchInput.value = State.cadeirasSearch || '';
    }
    if (clearBtn) {
        clearBtn.style.display = (State.cadeirasSearch || '').trim() ? 'inline-flex' : 'none';
    }

    const originFilter = State.cadeiraOriginFilter || ['system', 'local'];
    document.querySelectorAll('#cadeiras-sidebar-filters .floating-origin-check-input').forEach(chk => {
        chk.checked = originFilter.includes(chk.value);
    });

    const availFilter = State.cadeiraAvailabilityFilter || ['with_exams', 'without_exams'];
    document.querySelectorAll('#cadeiras-sidebar-filters .floating-avail-check-input').forEach(chk => {
        chk.checked = availFilter.includes(chk.value);
    });

    const currentSort = State.cadeiraSort || 'default';
    const sortMenu = elements.sortCadeirasMenu || document.getElementById('sort-cadeiras-menu');
    if (sortMenu) {
        sortMenu.querySelectorAll('.dropdown-item').forEach(item => {
            const isSelected = item.getAttribute('data-value') === currentSort;
            item.classList.toggle('active', isSelected);
            item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        });
    }

    updateSortCadeirasDropdownLabel();
}

/**
 * Resets all Cadeira filters and sorting back to default.
 * @param {Function} [onResetCallback]
 */
export function resetAllCadeirasFilters(onResetCallback) {
    State.cadeirasSearch = '';
    State.cadeiraSort = 'default';
    State.cadeiraOriginFilter = ['system', 'local'];
    State.cadeiraAvailabilityFilter = ['with_exams', 'without_exams'];

    syncCadeirasInputsUI();

    if (onResetCallback) onResetCallback();
}

/**
 * Sorts an array of cadeira objects according to sortMode and language.
 *
 * @param {object[]} cadeirasList
 * @param {string} [sortMode='default']
 * @param {string} [lang]
 * @returns {object[]}
 */
export function sortCadeiras(cadeirasList, sortMode = 'default', lang = null) {
    const currentLang = lang || getCurrentLanguage();

    return cadeirasList.sort((a, b) => {
        if (sortMode === 'name_asc') {
            const nameA = a.nome || '';
            const nameB = b.nome || '';
            return nameA.localeCompare(nameB, currentLang, { numeric: true, sensitivity: 'base' });
        }
        if (sortMode === 'name_desc') {
            const nameA = a.nome || '';
            const nameB = b.nome || '';
            return nameB.localeCompare(nameA, currentLang, { numeric: true, sensitivity: 'base' });
        }
        if (sortMode === 'sigla_asc') {
            const siglaA = (a.sigla || a.nome || '').toUpperCase();
            const siglaB = (b.sigla || b.nome || '').toUpperCase();
            return siglaA.localeCompare(siglaB, currentLang, { numeric: true, sensitivity: 'base' });
        }
        if (sortMode === 'exams_desc') {
            const countA = a.exames_count || 0;
            const countB = b.exames_count || 0;
            return (countB - countA) || (a._originalIndex - b._originalIndex);
        }
        if (sortMode === 'exams_asc') {
            const countA = a.exames_count || 0;
            const countB = b.exames_count || 0;
            return (countA - countB) || (a._originalIndex - b._originalIndex);
        }
        return a._originalIndex - b._originalIndex;
    });
}

/**
 * Render the cadeiras grid from State.cadeiras + State.localCadeiras, applying search, origin, availability, and sort filters.
 */
export function renderCadeirasMenu() {
    if (!elements.cadeirasGrid) return;
    initCadeirasSearch();
    initSortCadeirasDropdown(scheduleRenderCadeirasMenu);
    initCadeirasSidebarFilters(scheduleRenderCadeirasMenu);
    syncCadeirasInputsUI();

    const combinedCadeiras = [...(State.cadeiras || []), ...(State.localCadeiras || [])];

    if (combinedCadeiras.length === 0) {
        elements.cadeirasGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-folder-open" aria-hidden="true"></i>
                <h3>${escapeHTML(t('empty_cadeiras_title'))}</h3>
                <p>${escapeHTML(t('empty_cadeiras_desc'))}</p>
            </div>
        `;
        const countStatus = elements.cadeirasFilterCountText || document.getElementById('cadeiras-filter-count-text');
        if (countStatus) countStatus.textContent = '';
        return;
    }

    // Update count badges in sidebar
    const countSystem = combinedCadeiras.filter(c => !c.isLocal).length;
    const countLocal = combinedCadeiras.filter(c => c.isLocal).length;
    const countWithExams = combinedCadeiras.filter(c => (c.exames_count || 0) > 0).length;
    const countWithoutExams = combinedCadeiras.filter(c => (c.exames_count || 0) === 0).length;

    const elCountSys = elements.countOriginSystem || document.getElementById('count-origin-system');
    const elCountLoc = elements.countOriginLocal || document.getElementById('count-origin-local');
    const elCountWith = elements.countAvailWith || document.getElementById('count-avail-with');
    const elCountWithout = elements.countAvailWithout || document.getElementById('count-avail-without');

    if (elCountSys) elCountSys.textContent = String(countSystem);
    if (elCountLoc) elCountLoc.textContent = String(countLocal);
    if (elCountWith) elCountWith.textContent = String(countWithExams);
    if (elCountWithout) elCountWithout.textContent = String(countWithoutExams);

    // Filter cadeiras
    const query = (State.cadeirasSearch || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const allowedOrigins = State.cadeiraOriginFilter || ['system', 'local'];
    const allowedAvail = State.cadeiraAvailabilityFilter || ['with_exams', 'without_exams'];

    const preparedCadeiras = combinedCadeiras.map((c, idx) => ({ ...c, _originalIndex: idx }));

    const filteredCadeiras = preparedCadeiras.filter(c => {
        // Origin filter
        if (c.isLocal && !allowedOrigins.includes('local')) return false;
        if (!c.isLocal && !allowedOrigins.includes('system')) return false;

        // Availability filter
        const hasExams = (c.exames_count || 0) > 0;
        if (hasExams && !allowedAvail.includes('with_exams')) return false;
        if (!hasExams && !allowedAvail.includes('without_exams')) return false;

        // Search query
        if (query) {
            const nameNorm = (c.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const descNorm = (c.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const siglaNorm = (c.sigla || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (!nameNorm.includes(query) && !descNorm.includes(query) && !siglaNorm.includes(query)) {
                return false;
            }
        }

        return true;
    });

    // Sort filtered cadeiras
    sortCadeiras(filteredCadeiras, State.cadeiraSort || 'default', getCurrentLanguage());

    // Update count indicator
    const statusEl = elements.cadeirasFilterCountText || document.getElementById('cadeiras-filter-count-text');
    if (statusEl) {
        statusEl.textContent = t('filter_status_indicator', {
            visible: filteredCadeiras.length,
            total: combinedCadeiras.length
        });
    }

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
                resetAllCadeirasFilters(scheduleRenderCadeirasMenu);
                showToast(t('toast_filters_reset'));
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
    State.exams = null;
    State.examSearch = '';
    State.examQuestionsMin = 1;
    State.examQuestionsMax = null;
    State.examScoreMin = 0;
    State.examScoreMax = 100;
    State.examStateFilter = ['completed', 'pending'];
    State.globalQuestionTypes = [...ALL_QUESTION_TYPES];
    State.examFilters = {};

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
