/**
 * renderer.js
 * -----------
 * Unified Rich Text, Markdown, Code Highlighting, and KaTeX Math Rendering Engine.
 * Provides atomic parsing and mathematical formula rendering across questions,
 * feedback banners, explanations, and headers.
 */

import { escapeHTML } from './utils.js';

/**
 * Standard KaTeX delimiter configuration.
 */
export const KATEX_CONFIG = Object.freeze({
    delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
    ],
    throwOnError: false,
    errorColor: '#ef4444'
});

export { parseMarkdown as renderMarkdown };

/**
 * Parses Markdown syntax into safe, semantic HTML:
 * - Fenced code blocks (```lang ... ```) with header label
 * - **bold** → <strong>
 * - *italic* → <em>
 * - `inline code` → <code class="inline-code">
 * - ~~strikethrough~~ → <del>
 * - > blockquotes → <blockquote>
 * - Preserves newlines safely as <br> outside code blocks
 *
 * @param {string} text - Raw markdown string
 * @param {boolean} [isPreformatted=false] - If true, newline conversion to <br> is skipped
 * @returns {string} Safe HTML string
 */
export function parseMarkdown(text, isPreformatted = false) {
    if (!text) return '';

    const parts = String(text).split('```');
    let result = '';

    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
            // Inside a fenced code block
            const blockContent = parts[i];
            const firstLineBreak = blockContent.indexOf('\n');
            let lang = '';
            let code = blockContent;

            if (firstLineBreak > -1) {
                const potentialLang = blockContent.substring(0, firstLineBreak).trim();
                // Check if the first line is a valid language token (e.g. python, bash, json, js, c, cpp)
                if (potentialLang && /^[a-zA-Z0-9_-]+$/.test(potentialLang)) {
                    lang = potentialLang;
                    code = blockContent.substring(firstLineBreak + 1);
                }
            }

            const headerHTML = lang
                ? `<div class="code-block-header"><span class="code-lang-label">${escapeHTML(lang.toLowerCase())}</span></div>`
                : '';

            result += `<pre class="code-block${lang ? ` lang-${escapeHTML(lang)}` : ''}">${headerHTML}<code>${escapeHTML(code.trim())}</code></pre>`;
        } else {
            let partText = escapeHTML(parts[i]);

            // **bold**
            partText = partText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // *italic*
            partText = partText.replace(/\*([^\*\n]+?)\*/g, '<em>$1</em>');

            // ~~strikethrough~~
            partText = partText.replace(/~~(.+?)~~/g, '<del>$1</del>');

            // `inline code`
            partText = partText.replace(/`([^`\n]+?)`/g, '<code class="inline-code">$1</code>');

            // > blockquotes (at start of line)
            partText = partText.replace(/(?:^|\n)&gt;\s?(.*?)(?=\n|$)/g, '\n<blockquote class="md-blockquote">$1</blockquote>');

            if (!isPreformatted) {
                partText = partText.replace(/\n/g, '<br>');
            }

            result += partText;
        }
    }

    return result;
}

/**
 * Safely renders mathematical equations using KaTeX auto-renderer on a target container.
 *
 * @param {HTMLElement|string} [target] - DOM element or CSS selector. Defaults to document.body.
 * @param {object} [customConfig] - Optional custom KaTeX delimiters or options.
 */
export function renderMath(target = null, customConfig = null) {
    if (typeof window === 'undefined' || typeof window.renderMathInElement !== 'function') {
        return;
    }

    let element = target;
    if (typeof target === 'string') {
        element = document.querySelector(target);
    } else if (!element) {
        element = document.querySelector('.exam-split-container') ||
                  document.querySelector('.question-card') ||
                  document.body;
    }

    if (!element) return;

    try {
        window.renderMathInElement(element, customConfig || KATEX_CONFIG);
    } catch (mathErr) {
        console.warn('[Renderer] KaTeX math rendering warning:', mathErr);
    }
}

/**
 * Atomically renders Rich Text Markdown into a DOM element and immediately applies KaTeX math.
 *
 * @param {string} rawText - Raw content with Markdown and/or LaTeX formulas ($...$ or $$...$$)
 * @param {HTMLElement} targetElement - DOM element receiving the parsed HTML
 * @param {object} [options]
 * @param {boolean} [options.isPreformatted=false] - Whether to preserve newlines as-is
 * @param {boolean} [options.renderMath=true] - Whether to trigger KaTeX after injecting HTML
 */
export function renderRichText(rawText, targetElement, options = {}) {
    if (!targetElement) return;

    const isPreformatted = options.isPreformatted || false;
    const shouldRenderMath = options.renderMath !== undefined ? options.renderMath : true;

    targetElement.innerHTML = parseMarkdown(rawText, isPreformatted);

    if (shouldRenderMath) {
        renderMath(targetElement);
    }
}
