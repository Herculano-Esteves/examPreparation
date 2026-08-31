/**
 * notifications.js
 * ----------------
 * Centralized Notification, Toast, Error Boundary & Error-State Rendering System.
 * Supports typed toasts (success, warning, error, info), retryable error state cards,
 * and safe asynchronous execution wrappers.
 *
 * Designed with zero circular dependencies (self-contained pure HTML escaper).
 */

import { Events, APP_EVENTS } from './events.js';

export const NotificationType = Object.freeze({
    SUCCESS: 'success',
    ERROR:   'error',
    WARNING: 'warning',
    INFO:    'info'
});

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

let toastTimeout = null;

/**
 * Displays a brief, modern toast notification on screen.
 *
 * @param {string} message - Notification text to display
 * @param {string} [type=NotificationType.SUCCESS] - 'success' | 'error' | 'warning' | 'info'
 * @param {number} [duration=2200] - Duration in ms before auto-dismiss
 * @param {object} [elementsRef] - Optional elements cache reference
 */
export function showToast(message, type = NotificationType.SUCCESS, duration = 2200, elementsRef = null) {
    if (!message) return;

    const toastEl = (elementsRef && elementsRef.toast) || document.getElementById('toast');
    if (!toastEl) return;

    const span = toastEl.querySelector('span') || document.getElementById('toast-message');
    const icon = toastEl.querySelector('i');

    // Auto-detect warning/error type from emoji or keywords if not explicitly passed
    let effectiveType = type;
    if (type === NotificationType.SUCCESS) {
        const lower = String(message).toLowerCase();
        if (message.includes('⚠️') || lower.includes('erro') || lower.includes('excluídas') || lower.includes('excluidas') || lower.includes('failed')) {
            effectiveType = NotificationType.WARNING;
        }
    }

    if (span) {
        // Strip duplicate emoji icons from message string so only FontAwesome icon shows
        span.textContent = String(message).replace(/^[\s⚠️!✅❌ℹ️\[]+|[\s\]]+$/g, '').trim();
    }

    // Reset modifier classes
    toastEl.classList.remove('toast-success', 'toast-warning', 'toast-error', 'toast-info');

    if (icon) {
        if (effectiveType === NotificationType.ERROR) {
            icon.className = 'fa-solid fa-circle-xmark';
            toastEl.classList.add('toast-error');
        } else if (effectiveType === NotificationType.WARNING) {
            icon.className = 'fa-solid fa-triangle-exclamation';
            toastEl.classList.add('toast-warning');
        } else if (effectiveType === NotificationType.INFO) {
            icon.className = 'fa-solid fa-circle-info';
            toastEl.classList.add('toast-info');
        } else {
            icon.className = 'fa-solid fa-circle-check';
            toastEl.classList.add('toast-success');
        }
    }

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toastEl.classList.add('show');

    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
    }, duration);
}

/**
 * Renders an accessible, styled error-state card inside a container element with an optional retry button.
 *
 * @param {HTMLElement} container - DOM element to render the error card in
 * @param {object} options
 * @param {string} [options.title='Erro'] - Main error title
 * @param {string} [options.message=''] - Detailed error description
 * @param {string} [options.icon='fa-triangle-exclamation'] - FontAwesome icon
 * @param {string} [options.retryText='Tentar Novamente'] - Text for the retry button
 * @param {Function} [options.onRetry=null] - Callback invoked when retry button is clicked
 */
export function renderErrorState(container, {
    title = 'Erro ao carregar',
    message = '',
    icon = 'fa-triangle-exclamation',
    retryText = 'Tentar Novamente',
    onRetry = null
} = {}) {
    if (!container) return;

    const retryBtnId = `btn-retry-${Math.random().toString(36).substring(2, 9)}`;

    container.innerHTML = `
        <div class="error-state" role="alert" aria-live="assertive">
            <i class="fa-solid ${escapeHTML(icon)}" aria-hidden="true"></i>
            <h3>${escapeHTML(title)}</h3>
            ${message ? `<p>${escapeHTML(message)}</p>` : ''}
            ${onRetry ? `<button class="btn-control btn-primary" id="${retryBtnId}" style="margin-top: 1rem;">${escapeHTML(retryText)}</button>` : ''}
        </div>
    `;

    if (onRetry) {
        const btn = document.getElementById(retryBtnId);
        if (btn) {
            btn.addEventListener('click', () => onRetry());
        }
    }
}

/**
 * Safely executes an asynchronous function, catching exceptions, displaying optional
 * error-state cards or toasts, and logging structured debug info.
 *
 * @template T
 * @param {() => Promise<T>} asyncFn - The async function to execute
 * @param {object} [options]
 * @param {string} [options.context=''] - Human-readable context for logs/errors
 * @param {HTMLElement} [options.container=null] - Optional container to render error card into on failure
 * @param {Function} [options.onRetry=null] - Optional retry handler passed to renderErrorState
 * @param {boolean} [options.toastOnError=false] - Whether to show a toast error on failure
 * @param {T} [options.fallbackValue=null] - Value returned if the async function throws
 * @returns {Promise<T>}
 */
export async function safeAsync(asyncFn, {
    context = 'Operação',
    container = null,
    onRetry = null,
    toastOnError = false,
    fallbackValue = null
} = {}) {
    try {
        return await asyncFn();
    } catch (error) {
        console.error(`[SafeAsync] Erro em "${context}":`, error);

        if (container && onRetry) {
            renderErrorState(container, {
                title: `Erro ao carregar ${context}`,
                message: error.message || 'Ocorreu um erro inesperado.',
                onRetry
            });
        }

        if (toastOnError) {
            showToast(error.message || `Falha na operação: ${context}`, NotificationType.ERROR);
        }

        return fallbackValue;
    }
}

// ---------------------------------------------------------------------------
// EventBus Subscriptions
// ---------------------------------------------------------------------------
Events.on(APP_EVENTS.NOTIFICATION, (data) => {
    if (!data) return;
    if (typeof data === 'string') {
        showToast(data);
    } else {
        showToast(data.message, data.type || NotificationType.SUCCESS, data.duration || 2200);
    }
});
