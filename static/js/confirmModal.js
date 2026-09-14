/**
 * confirmModal.js
 * ---------------
 * Modular, accessible Danger Confirmation Modal component (GitHub-styled).
 * Manages modal visibility, dynamic title/description, focus management,
 * keyboard accessibility (Esc/Enter), and executing confirmation callbacks.
 */

import { elements } from './elements.js';
import { t } from './i18n.js';

let activeConfirmCallback = null;
let activeCancelCallback = null;
let previousActiveElement = null;
let isInitialized = false;

/**
 * Initializes listeners for the Danger Confirmation Modal.
 * Called once at application boot.
 */
export function initDangerConfirmModal() {
    if (isInitialized) return;
    isInitialized = true;

    const modal = elements.dangerConfirmModal;
    const btnCancel = elements.btnCancelClearStorage;
    const btnConfirm = elements.btnConfirmClearStorage;

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            closeDangerConfirmModal(false);
        });
    }

    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            const cb = activeConfirmCallback;
            closeDangerConfirmModal(true);
            if (typeof cb === 'function') {
                cb();
            }
        });
    }

    // Close on backdrop click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDangerConfirmModal(false);
            }
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            e.preventDefault();
            closeDangerConfirmModal(false);
        }
    });
}

/**
 * Opens the Danger Confirmation Modal with custom title, description, and action button labels.
 *
 * @param {object} options
 * @param {string} options.title - Header title text
 * @param {string} options.descriptionHTML - HTML string for description (supports highlighted names)
 * @param {string} [options.confirmText] - Label for the danger confirm button
 * @param {string} [options.cancelText] - Label for the cancel button
 * @param {Function} options.onConfirm - Callback executed when user confirms deletion
 * @param {Function} [options.onCancel] - Optional callback executed when user cancels
 */
export function openDangerConfirmModal({
    title,
    descriptionHTML,
    confirmText,
    cancelText,
    onConfirm,
    onCancel
}) {
    initDangerConfirmModal();

    const modal = elements.dangerConfirmModal;
    const titleEl = elements.dangerModalTitle;
    const descEl = elements.dangerModalDesc;
    const btnCancel = elements.btnCancelClearStorage;
    const btnConfirm = elements.btnConfirmClearStorage;

    if (!modal) return;

    previousActiveElement = document.activeElement;
    activeConfirmCallback = onConfirm || null;
    activeCancelCallback = onCancel || null;

    if (titleEl) {
        titleEl.textContent = title || t('modal_danger_title');
    }

    if (descEl) {
        descEl.innerHTML = descriptionHTML || t('modal_danger_desc');
    }

    if (btnCancel) {
        btnCancel.textContent = cancelText || t('btn_cancel');
    }

    if (btnConfirm) {
        btnConfirm.textContent = confirmText || t('btn_confirm_delete');
    }

    modal.classList.remove('hidden');

    // Focus cancel button for safe default
    if (btnCancel) {
        btnCancel.focus();
    }
}

/**
 * Closes the Danger Confirmation Modal and restores previous keyboard focus.
 * @param {boolean} [confirmed=false]
 */
export function closeDangerConfirmModal(confirmed = false) {
    const modal = elements.dangerConfirmModal;
    if (modal) {
        modal.classList.add('hidden');
    }

    if (!confirmed && typeof activeCancelCallback === 'function') {
        activeCancelCallback();
    }

    activeConfirmCallback = null;
    activeCancelCallback = null;

    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        try {
            previousActiveElement.focus();
        } catch (e) {
            // Ignore focus error if element no longer exists in DOM
        }
        previousActiveElement = null;
    }
}
