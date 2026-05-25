/**
 * utils.js
 * --------
 * Pure utility functions with no module-level side effects.
 * No DOM references, no State — importable from any module safely.
 *
 * JSON_INSTRUCTIONS was moved to constants.js (MOD-04) because it is a
 * static content string, not a utility function.
 */

/**
 * Escape special HTML characters to prevent XSS.
 * Returns an empty string for null / undefined input (BUG-05 fix).
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
 * Minimal Markdown renderer supporting:
 *  - Fenced code blocks (``` ... ```) → <pre><code>
 *  - **bold** → <strong>
 *  - `inline code` → <code>
 *  - Newlines → <br> (unless isPreformatted is true)
 *
 * Note: escapeHTML is applied BEFORE markdown substitution so that
 * `<` and `>` inside normal text are always escaped, while the HTML
 * tags injected by the regex replacements are trusted and safe.
 *
 * @param {string} text
 * @param {boolean} isPreformatted - If true, newlines are preserved as-is
 * @returns {string} HTML string
 */
export function renderMarkdown(text, isPreformatted = false) {
    if (!text) return '';

    const parts = text.split('```');
    let result = '';

    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
            // Inside a fenced code block — preserve whitespace, escape HTML
            result += '<pre class="code-block"><code>' + escapeHTML(parts[i].trim()) + '</code></pre>';
        } else {
            let partText = escapeHTML(parts[i]);
            partText = partText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            partText = partText.replace(/`(.*?)`/g, '<code>$1</code>');
            if (!isPreformatted) {
                partText = partText.replace(/\n/g, '<br>');
            }
            result += partText;
        }
    }
    return result;
}

/**
 * Display a brief toast notification.
 * The toast element is shown for 2.5 s then hidden automatically.
 *
 * @param {string} message
 * @param {{ toast: HTMLElement }} elements - Must contain a .toast element with a <span> child
 */
export function showToast(message, elements) {
    elements.toast.querySelector('span').textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2500);
}
