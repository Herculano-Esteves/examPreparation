/**
 * settingsPopover.js
 * Modular Popover Manager for Settings Dropdown Menu
 * Provides mathematically adaptive positioning, collision avoidance, and viewport clamping.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { t, setLanguage, applyTranslations } from './i18n.js';
import { showToast, NotificationType, getLocalizedText } from './utils.js';
import { openDangerConfirmModal } from './confirmModal.js';
import { clearAllLocalData, importLocalDataFromBackup } from './storage.js';
import { createExamsZipBlob, readExamsZipBlob, downloadBlob } from './zipService.js';

/**
 * Pure mathematical layout calculation for the popover positioning and constraints.
 * 
 * @param {Object} triggerRect - { top, bottom, left, right, width, height }
 * @param {Object} popoverDims - { width, height }
 * @param {Object} viewportDims - { width, height }
 * @param {Object} [options] - { gap, margin, minWidth, maxWidth }
 * @returns {Object} { top, left, maxHeight, width, placement: 'bottom'|'top' }
 */
export function calculatePopoverLayout(triggerRect, popoverDims, viewportDims, options = {}) {
    const gap = options.gap !== undefined ? options.gap : 8;
    const margin = options.margin !== undefined ? options.margin : 12;
    const minWidth = options.minWidth || 290;
    const maxWidthLimit = options.maxWidth || 360;

    const vw = viewportDims.width || 800;
    const vh = viewportDims.height || 600;

    // 1. Calculate dynamic width with viewport boundaries
    const maxWidth = Math.max(minWidth, Math.min(maxWidthLimit, vw - 2 * margin));
    const targetWidth = Math.max(minWidth, Math.min(popoverDims.width || minWidth, maxWidth));

    // 2. Horizontal placement (align with right edge of trigger, clamped to viewport)
    let left = triggerRect.right - targetWidth;
    const maxLeft = vw - targetWidth - margin;
    left = Math.max(margin, Math.min(left, maxLeft));

    // 3. Vertical placement and available space calculation
    const spaceBelow = Math.max(0, vh - triggerRect.bottom - gap - margin);
    const spaceAbove = Math.max(0, triggerRect.top - gap - margin);
    const neededHeight = popoverDims.height || 220;

    let top = 0;
    let maxHeight = 0;
    let placement = 'bottom';

    if (neededHeight <= spaceBelow || spaceBelow >= spaceAbove) {
        // Place below trigger
        placement = 'bottom';
        top = triggerRect.bottom + gap;
        maxHeight = Math.max(120, spaceBelow);
    } else {
        // Flip above trigger
        placement = 'top';
        const actualHeight = Math.min(neededHeight, spaceAbove);
        top = Math.max(margin, triggerRect.top - actualHeight - gap);
        maxHeight = Math.max(120, spaceAbove);
    }

    return {
        top: Math.round(top),
        left: Math.round(left),
        width: Math.round(targetWidth),
        maxHeight: Math.round(maxHeight),
        placement
    };
}

let activeTriggerButton = null;
let popoverCallbacks = {};

/**
 * Positions the popover relative to a trigger element using mathematical layout.
 * @param {HTMLElement} triggerBtn 
 */
export function positionSettingsPopover(triggerBtn) {
    const popover = elements.settingsDropdownMenu;
    if (!popover || popover.classList.contains('hidden')) return;

    const btn = triggerBtn || activeTriggerButton;
    if (!btn) return;

    // Reset styles temporarily to measure intrinsic natural dimensions
    popover.style.maxHeight = 'none';
    popover.style.width = 'auto';

    const triggerRect = btn.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportDims = {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight
    };

    const layout = calculatePopoverLayout(
        triggerRect,
        { width: popoverRect.width || 300, height: popoverRect.height || 240 },
        viewportDims
    );

    popover.style.top = `${layout.top}px`;
    popover.style.left = `${layout.left}px`;
    popover.style.width = `${layout.width}px`;
    popover.style.maxHeight = `${layout.maxHeight}px`;

    // Ensure popover body scrollable container receives max-height constraint
    const popoverBody = popover.querySelector('.settings-popover-body');
    const headerEl = popover.querySelector('.settings-popover-header');
    if (popoverBody) {
        const headerHeight = headerEl ? headerEl.offsetHeight : 40;
        popoverBody.style.maxHeight = `${Math.max(80, layout.maxHeight - headerHeight)}px`;
    }
}

/**
 * Opens the settings popover anchored to the specified trigger button.
 * @param {HTMLElement} triggerBtn 
 */
export function openSettingsPopover(triggerBtn) {
    const popover = elements.settingsDropdownMenu;
    if (!popover) return;

    activeTriggerButton = triggerBtn || null;
    popover.classList.remove('hidden');

    // Update active language button state inside popover
    updateLanguageButtonsState();

    // Position mathematically
    positionSettingsPopover(triggerBtn);

    // Announce/Focus management for accessibility
    const closeBtn = elements.btnCloseSettingsPopover;
    if (closeBtn) {
        closeBtn.focus();
    }
}

/**
 * Closes the settings popover.
 */
export function closeSettingsPopover() {
    const popover = elements.settingsDropdownMenu;
    if (popover) {
        popover.classList.add('hidden');
    }
    activeTriggerButton = null;
}

/**
 * Toggles the settings popover open/closed state.
 * @param {HTMLElement} triggerBtn 
 */
export function toggleSettingsPopover(triggerBtn) {
    const popover = elements.settingsDropdownMenu;
    if (!popover) return;
    if (popover.classList.contains('hidden')) {
        openSettingsPopover(triggerBtn);
    } else {
        closeSettingsPopover();
    }
}

/**
 * Updates the active visual state of language buttons in the popover.
 */
export function updateLanguageButtonsState() {
    const popover = elements.settingsDropdownMenu;
    if (!popover) return;

    const langButtons = popover.querySelectorAll('.btn-lang-option');
    langButtons.forEach(btn => {
        const lang = btn.dataset.lang;
        const isActive = lang === State.language;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

let settingsPopoverInitialized = false;

/**
 * Initializes the Settings Popover component and hooks up all listeners.
 * 
 * @param {Object} [callbacks] - Optional application callbacks:
 *   - onLanguageChange(lang)
 *   - onStorageCleared()
 *   - onBackupImported(result)
 */
export function initSettingsPopover(callbacks = {}) {
    popoverCallbacks = callbacks;

    if (settingsPopoverInitialized) return;
    settingsPopoverInitialized = true;

    const popover = elements.settingsDropdownMenu;
    if (!popover) return;

    // Trigger buttons (header main settings button, exam top bar, builder top bar, and sticky buttons)
    const getSettingsButtons = () => Array.from(new Set([
        elements.btnSettings,
        elements.btnExamSettings,
        elements.btnBuilderSettings,
        ...document.querySelectorAll('.btn-sticky-settings')
    ].filter(Boolean)));

    getSettingsButtons().forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSettingsPopover(btn);
        });
    });

    // Close button (X)
    if (elements.btnCloseSettingsPopover) {
        elements.btnCloseSettingsPopover.addEventListener('click', (e) => {
            e.stopPropagation();
            closeSettingsPopover();
        });
    }

    // Language selection buttons
    const langButtons = popover.querySelectorAll('.btn-lang-option');
    langButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = btn.dataset.lang;
            if (lang && lang !== State.language) {
                setLanguage(lang);
                updateLanguageButtonsState();
                if (popoverCallbacks.onLanguageChange) {
                    popoverCallbacks.onLanguageChange(lang);
                }
                // Re-position after potential text-length changes
                requestAnimationFrame(() => {
                    positionSettingsPopover();
                });
            }
        });
    });

    // Clear local storage button
    const btnClearStorage = document.getElementById('btn-clear-storage');
    if (btnClearStorage) {
        btnClearStorage.addEventListener('click', () => {
            closeSettingsPopover();
            openDangerConfirmModal({
                title: t('modal_danger_title'),
                descriptionHTML: t('modal_danger_desc'),
                confirmText: t('btn_confirm_delete'),
                cancelText: t('btn_cancel'),
                onConfirm: () => {
                    clearAllLocalData(State);
                    showToast(t('toast_storage_cleared'), elements);
                    if (popoverCallbacks.onStorageCleared) {
                        popoverCallbacks.onStorageCleared();
                    }
                }
            });
        });
    }

    // Export Backup (.zip) button
    const btnExportZip = document.getElementById('btn-export-zip');
    if (btnExportZip) {
        btnExportZip.addEventListener('click', () => {
            closeSettingsPopover();
            if ((!State.localCadeiras || State.localCadeiras.length === 0) &&
                (!State.localExames || State.localExames.length === 0)) {
                showToast(t('toast_export_empty'), NotificationType.INFO);
                return;
            }

            try {
                const zipBlob = createExamsZipBlob(State.localCadeiras || [], State.localExames || []);
                const dateStr = new Date().toISOString().slice(0, 10);
                downloadBlob(zipBlob, `simulador_exames_backup_${dateStr}.zip`);
                showToast(t('toast_export_success'), NotificationType.SUCCESS);
            } catch (err) {
                console.error('[settingsPopover] Erro ao exportar ZIP:', err);
                showToast(t('toast_import_error'), NotificationType.ERROR);
            }
        });
    }

    // Import Backup (.zip) button & hidden file input
    const btnImportZip = document.getElementById('btn-import-zip');
    const inputImportZip = document.getElementById('input-import-zip');
    if (btnImportZip && inputImportZip) {
        btnImportZip.addEventListener('click', () => {
            inputImportZip.value = '';
            inputImportZip.click();
        });

        inputImportZip.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            closeSettingsPopover();

            try {
                const arrayBuffer = await file.arrayBuffer();
                const parsedData = readExamsZipBlob(arrayBuffer);
                const result = importLocalDataFromBackup(parsedData, State);

                if (result.importedExamsCount > 0 || result.importedCadeirasCount > 0) {
                    showToast(t('toast_import_success', {
                        importedExams: result.importedExamsCount,
                        importedCadeiras: result.importedCadeirasCount,
                        skippedExams: result.skippedExamsCount
                    }), NotificationType.SUCCESS);
                } else {
                    showToast(t('toast_import_nothing_new'), NotificationType.INFO);
                }

                if (popoverCallbacks.onBackupImported) {
                    popoverCallbacks.onBackupImported(result);
                }
            } catch (err) {
                console.error('[settingsPopover] Erro ao importar ZIP:', err);
                showToast(t('toast_import_error'), NotificationType.ERROR);
            }
        });
    }

    // Dismiss popover when clicking outside
    document.addEventListener('click', (e) => {
        if (!popover.classList.contains('hidden')) {
            const isClickInside = popover.contains(e.target);
            const isClickOnTrigger = getSettingsButtons().some(btn => btn && btn.contains(e.target));
            if (!isClickInside && !isClickOnTrigger) {
                closeSettingsPopover();
            }
        }
    });

    // Dismiss popover on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !popover.classList.contains('hidden')) {
            closeSettingsPopover();
            if (activeTriggerButton) {
                activeTriggerButton.focus();
            }
        }
    });

    // Re-position or close gracefully on resize/scroll
    window.addEventListener('resize', () => {
        if (!popover.classList.contains('hidden')) {
            positionSettingsPopover();
        }
    });

    window.addEventListener('scroll', () => {
        if (!popover.classList.contains('hidden')) {
            positionSettingsPopover();
        }
    }, { passive: true });
}
