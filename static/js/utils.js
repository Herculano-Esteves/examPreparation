/**
 * utils.js
 * --------
 * Pure utility functions with no module-level side effects.
 * No DOM references, no State — importable from any module safely.
 */

import { APP_CONFIG, getInitialLanguage } from './config.js';

/**
 * Escape special HTML characters to prevent XSS.
 * Returns an empty string for null / undefined input.
 *
 * @param {*} str
 * @returns {string}
 */
export function escapeHTML(str) {
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

/**
 * Extracts the appropriate string for the given language from a field that can either
 * be a plain string or a multilingual object like { pt: '...', en: '...' }.
 *
 * @param {string|object} field
 * @param {string} [lang]
 * @returns {string}
 */
export function getLocalizedText(field, lang = null) {
    if (field === null || field === undefined) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object') {
        const activeLang = lang || getInitialLanguage();
        if (field[activeLang] !== undefined && field[activeLang] !== null) {
            return String(field[activeLang]);
        }
        for (const fbLang of APP_CONFIG.fallbackLanguages) {
            if (field[fbLang] !== undefined && field[fbLang] !== null) {
                return String(field[fbLang]);
            }
        }
        const firstVal = Object.values(field)[0];
        return firstVal !== undefined && firstVal !== null ? String(firstVal) : '';
    }
    return String(field);
}

/**
 * Extracts an array of options/items for the given language from a field that can
 * either be an array or a multilingual object like { pt: [...], en: [...] }.
 *
 * @param {Array|object} field
 * @param {string} [lang]
 * @returns {Array}
 */
export function getLocalizedList(field, lang = null) {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'object') {
        const activeLang = lang || getInitialLanguage();
        if (Array.isArray(field[activeLang])) return field[activeLang];
        for (const fbLang of APP_CONFIG.fallbackLanguages) {
            if (Array.isArray(field[fbLang])) return field[fbLang];
        }
        const firstVal = Object.values(field).find(v => Array.isArray(v));
        return firstVal || [];
    }
    return [];
}

import { parseMarkdown, renderMath, renderRichText } from './renderer.js';

export { parseMarkdown, renderMath, renderRichText };

/**
 * Backward-compatible Markdown renderer delegating to renderer.js parseMarkdown.
 *
 * @param {string} text
 * @param {boolean} [isPreformatted=false]
 * @returns {string} HTML string
 */
export function renderMarkdown(text, isPreformatted = false) {
    return parseMarkdown(text, isPreformatted);
}

import { showToast, renderErrorState, safeAsync, NotificationType } from './notifications.js';

export { showToast, renderErrorState, safeAsync, NotificationType };

let cardResizeObserver = null;

/**
 * Dynamically calculate the exact integer number of full lines of description
 * that fit in each card without any half-cut line, and format ellipsis cleanly:
 * - No trailing punctuation before '...' (e.g. no ',...' or ';...' or ' -...')
 * - Attached directly to the word (e.g. 'palavra...' and not 'palavra ...')
 *
 * @param {HTMLElement} container
 */
export function clampCardDescriptions(container) {
    if (!container) return;

    const runClamp = () => {
        const cards = container.querySelectorAll('.exam-card');
        cards.forEach(card => {
            const desc = card.querySelector('.card-desc');
            const footer = card.querySelector('.exam-card-footer');
            if (!desc || !footer) return;

            if (!desc.dataset.fullText) {
                desc.dataset.fullText = desc.textContent.trim();
            }
            const fullText = desc.dataset.fullText;

            // Reset display temporarily to get natural unconstrained geometry
            desc.style.display = 'block';
            desc.style.webkitLineClamp = 'unset';
            desc.textContent = fullText;

            const descRect = desc.getBoundingClientRect();
            const footerRect = footer.getBoundingClientRect();

            // If card is hidden, skip until visible
            if (descRect.height <= 0 || footerRect.top <= 0) return;

            const availableHeight = footerRect.top - descRect.top - 8;
            const computed = window.getComputedStyle(desc);
            const lineHeight = parseFloat(computed.lineHeight) || (parseFloat(computed.fontSize) * 1.45) || 22;

            // Compute exact integer number of complete lines that fit
            const maxLines = Math.max(1, Math.floor(availableHeight / lineHeight));
            const maxHeight = maxLines * lineHeight;

            desc.style.display = '-webkit-box';
            desc.style.webkitBoxOrient = 'vertical';
            desc.style.webkitLineClamp = String(maxLines);
            desc.style.overflow = 'hidden';

            // If the full text fits naturally without overflowing, keep it clean
            if (desc.scrollHeight <= maxHeight + 3) {
                desc.textContent = fullText;
                return;
            }

            // Binary search to find the maximum words that fit with clean ellipsis
            const words = fullText.split(/\s+/);
            let low = 1;
            let high = words.length;
            let bestText = '';

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const candidateWords = words.slice(0, mid).join(' ');
                
                // Clean any trailing punctuation and spaces before appending '...'
                const cleaned = candidateWords.replace(/[\s,;:\-_/\\(.]+$/, '');
                const candidate = cleaned ? cleaned + '...' : '';

                desc.textContent = candidate;

                if (desc.scrollHeight <= maxHeight + 3) {
                    bestText = candidate;
                    low = mid + 1; // Try to fit more text
                } else {
                    high = mid - 1; // Overflowed, reduce words
                }
            }

            const fallbackCleaned = words[0].replace(/[\s,;:\-_/\\(.]+$/, '');
            const finalClamped = bestText || (fallbackCleaned ? fallbackCleaned + '...' : '...');
            desc.textContent = finalClamped;

            desc.dataset.isClamped = 'true';
            desc.dataset.clampedText = finalClamped;
            desc.dataset.clampedLines = String(maxLines);

            // Configure hover / focus expansion to reveal full text over cards below
            if (!card.dataset.hasHoverExpand) {
                card.dataset.hasHoverExpand = 'true';

                const onEnter = () => {
                    if (desc.dataset.isClamped === 'true' && desc.dataset.fullText) {
                        desc.textContent = desc.dataset.fullText;
                        desc.style.webkitLineClamp = 'unset';
                        desc.style.display = 'block';
                        card.classList.add('is-expanded');
                    }
                };

                const onLeave = () => {
                    if (desc.dataset.isClamped === 'true' && desc.dataset.clampedText) {
                        desc.style.display = '-webkit-box';
                        desc.style.webkitBoxOrient = 'vertical';
                        desc.style.webkitLineClamp = desc.dataset.clampedLines || '4';
                        desc.textContent = desc.dataset.clampedText;
                        card.classList.remove('is-expanded');
                    }
                };

                card.addEventListener('mouseenter', onEnter);
                card.addEventListener('mouseleave', onLeave);
                card.addEventListener('focusin', onEnter);
                card.addEventListener('focusout', onLeave);
            }
        });
    };

    // Run on next animation frame
    requestAnimationFrame(runClamp);

    // Setup ResizeObserver on container so it recalculates automatically on visibility/resize
    if (typeof ResizeObserver !== 'undefined' && container && !container.dataset.hasCardObserver) {
        container.dataset.hasCardObserver = 'true';
        if (!cardResizeObserver) {
            cardResizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.target.clientHeight > 0) {
                        clampCardDescriptions(entry.target);
                    }
                }
            });
        }
        cardResizeObserver.observe(container);
    }
}
