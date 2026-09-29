/**
 * examBuilder.js
 * --------------
 * Dual-Pane Interactive Exam Builder coordinator module.
 * Provides live bi-directional synchronisation between the Visual Box Editor
 * (left pane) and the JSON Code Editor (right pane), supporting monolingual (PT/EN)
 * and seamless Bilingual (PT + EN) exam authoring for multiple-choice,
 * boolean (true/false), and written questions.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { validateExamJSON } from './validation.js';
import { t } from './i18n.js';
import { showToast, getLocalizedText, escapeHTML } from './utils.js';

import { getSelectedLanguages, isBilingualMode, createDefaultQuestion } from './builder/builderTemplates.js';
import { addQuestionBox } from './builder/builderQuestionBox.js';
import { getExamDataFromVisualBoxes, renderVisualBoxesFromData } from './builder/builderParser.js';

export {
    getSelectedLanguages,
    isBilingualMode,
    createDefaultQuestion,
    addQuestionBox,
    getExamDataFromVisualBoxes,
    renderVisualBoxesFromData
};

let isSyncing = false;

/**
 * Initializes the Exam Builder interface and event listeners
 */
export function initExamBuilder() {
    const btnAddQ = document.getElementById('btn-builder-add-question');
    const btnFormat = document.getElementById('btn-builder-format-json');
    const btnCopy = document.getElementById('btn-builder-copy-json');
    const btnClear = document.getElementById('btn-builder-clear');
    const editorInput = document.getElementById('editor-code-input');
    const editorLines = document.getElementById('editor-line-numbers');
    const langSelect = document.getElementById('builder-exam-lang');

    // Language selector change listener
    if (langSelect) {
        langSelect.addEventListener('change', () => {
            const currentData = getExamDataFromVisualBoxes();
            renderVisualBoxesFromData(currentData);
            handleVisualChange();
        });
    }

    // Initial render of metadata inputs
    renderMetadataInputs('', '');

    // Add question button (bottom of questions section)
    const handleAddQ = () => {
        addQuestionBox(createDefaultQuestion('escolha_multipla'));
        handleVisualChange();
        const visualBody = document.querySelector('.builder-visual-body');
        if (visualBody) {
            visualBody.scrollTop = visualBody.scrollHeight;
        }
    };

    if (btnAddQ) {
        btnAddQ.addEventListener('click', handleAddQ);
    }

    // Format JSON button
    if (btnFormat && editorInput) {
        btnFormat.addEventListener('click', () => {
            try {
                const parsed = JSON.parse(editorInput.value);
                editorInput.value = JSON.stringify(parsed, null, 2);
                updateLineNumbersAndValidation();
                showToast(t('toast_copied') ? 'JSON formatado!' : 'JSON formatted!', elements);
            } catch (e) {
                // Ignore if invalid
            }
        });
    }

    // Copy JSON button
    if (btnCopy && editorInput) {
        btnCopy.addEventListener('click', () => {
            if (!editorInput.value.trim()) return;
            navigator.clipboard.writeText(editorInput.value).then(() => {
                showToast(t('toast_copied'), elements);
            });
        });
    }

    // Clear form button
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            resetExamBuilder();
        });
    }

    // Code input listeners (code -> visual)
    if (editorInput) {
        editorInput.addEventListener('input', handleCodeChange);
        if (editorLines) {
            editorInput.addEventListener('scroll', () => {
                editorLines.scrollTop = editorInput.scrollTop;
            });
        }
    }
}

/**
 * Renders title and description input elements based on language mode (monolingual vs bilingual).
 * @param {string|object} titleData
 * @param {string|object} descData
 */
export function renderMetadataInputs(titleData = '', descData = '') {
    const titleContainer = document.getElementById('builder-title-input-container');
    const descContainer = document.getElementById('builder-desc-input-container');
    if (!titleContainer || !descContainer) return;

    const bilingual = isBilingualMode();

    let titlePt = '';
    let titleEn = '';
    if (typeof titleData === 'object' && titleData !== null) {
        titlePt = titleData.pt || '';
        titleEn = titleData.en || '';
    } else {
        titlePt = titleData || '';
        titleEn = titleData || '';
    }

    let descPt = '';
    let descEn = '';
    if (typeof descData === 'object' && descData !== null) {
        descPt = descData.pt || '';
        descEn = descData.en || '';
    } else {
        descPt = descData || '';
        descEn = descData || '';
    }

    if (bilingual) {
        titleContainer.innerHTML = `
            <div class="builder-bilingual-stack">
                <div class="builder-input-with-tag">
                    <span class="builder-lang-tag tag-pt">🇵🇹 PT</span>
                    <input type="text" id="builder-exam-title" class="builder-title-pt form-control" placeholder="Ex: Exame 2024" value="${escapeHTML(titlePt)}" required>
                </div>
                <div class="builder-input-with-tag">
                    <span class="builder-lang-tag tag-en">🇬🇧 EN</span>
                    <input type="text" id="builder-exam-title-en" class="builder-title-en form-control" placeholder="E.g. Exam 2024" value="${escapeHTML(titleEn)}" required>
                </div>
            </div>
        `;

        descContainer.innerHTML = `
            <div class="builder-bilingual-stack">
                <div class="builder-input-with-tag">
                    <span class="builder-lang-tag tag-pt">🇵🇹 PT</span>
                    <input type="text" id="builder-exam-desc" class="builder-desc-pt form-control" placeholder="Ex: Questões de escolha múltipla e desenvolvimento..." value="${escapeHTML(descPt)}" required>
                </div>
                <div class="builder-input-with-tag">
                    <span class="builder-lang-tag tag-en">🇬🇧 EN</span>
                    <input type="text" id="builder-exam-desc-en" class="builder-desc-en form-control" placeholder="E.g. Multiple choice and open answer questions..." value="${escapeHTML(descEn)}" required>
                </div>
            </div>
        `;
    } else {
        const titlePlaceholder = t('builder_exam_title_placeholder') || 'Ex: Exame 2024';
        const descPlaceholder = t('builder_exam_desc_placeholder') || 'Ex: Questões de escolha múltipla e desenvolvimento...';
        const singleTitle = typeof titleData === 'object' ? getLocalizedText(titleData) : (titleData || '');
        const singleDesc = typeof descData === 'object' ? getLocalizedText(descData) : (descData || '');

        titleContainer.innerHTML = `
            <input type="text" id="builder-exam-title" class="form-control" placeholder="${escapeHTML(titlePlaceholder)}" value="${escapeHTML(singleTitle)}" required>
        `;

        descContainer.innerHTML = `
            <input type="text" id="builder-exam-desc" class="form-control" placeholder="${escapeHTML(descPlaceholder)}" value="${escapeHTML(singleDesc)}" required>
        `;
    }

    // Attach live sync input events to all title & desc inputs
    titleContainer.querySelectorAll('input').forEach(inp => inp.addEventListener('input', handleVisualChange));
    descContainer.querySelectorAll('input').forEach(inp => inp.addEventListener('input', handleVisualChange));
}

/**
 * Resets the Exam Builder to a clean initial state with 1 default question
 */
export function resetExamBuilder() {
    const langSelect = document.getElementById('builder-exam-lang');
    const listContainer = document.getElementById('builder-questions-list');

    if (langSelect) langSelect.value = State.language || 'pt';
    renderMetadataInputs('', '');
    if (listContainer) listContainer.innerHTML = '';

    // Add 1 default question
    addQuestionBox(createDefaultQuestion('escolha_multipla'));
    handleVisualChange();
}

/**
 * Triggered when user edits visual fields.
 * Updates the JSON text editor.
 */
export function handleVisualChange() {
    if (isSyncing) return;
    isSyncing = true;

    const data = getExamDataFromVisualBoxes();
    const editorInput = document.getElementById('editor-code-input');
    if (editorInput) {
        editorInput.value = JSON.stringify(data, null, 2);
    }

    updateLineNumbersAndValidation();
    isSyncing = false;
}

/**
 * Triggered when user edits the JSON text in the code editor.
 * If valid, updates the visual fields.
 */
export function handleCodeChange() {
    if (isSyncing) return;
    isSyncing = true;

    const editorInput = document.getElementById('editor-code-input');
    const validation = updateLineNumbersAndValidation();

    if (validation.valid && validation.data) {
        renderVisualBoxesFromData(validation.data);
    }

    isSyncing = false;
}

/**
 * Updates line numbers in the gutter and validates current JSON
 * @returns {object}
 */
export function updateLineNumbersAndValidation() {
    const editorInput = document.getElementById('editor-code-input');
    const editorLines = document.getElementById('editor-line-numbers');
    const statusDiv = document.getElementById('validation-status');
    const btnSubmit = document.getElementById('btn-submit-exam');

    if (!editorInput || !statusDiv) return { valid: false };

    const raw = editorInput.value;
    const lines = raw.split('\n');
    const lineCount = Math.max(lines.length, 1);

    const result = validateExamJSON(raw.trim());

    if (!raw.trim()) {
        statusDiv.innerHTML = `[ ... ] ${t('editor_empty_status')}`;
        statusDiv.className = 'validation-status empty';
        State.jsonValidationErrorLine = -1;
        State.validatedExamData = null;
        if (btnSubmit) btnSubmit.disabled = true;
    } else if (result.valid) {
        statusDiv.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> [OK] JSON válido e estrutura correta!';
        statusDiv.className = 'validation-status valid';
        State.jsonValidationErrorLine = -1;
        State.validatedExamData = result.data;
        if (btnSubmit) btnSubmit.disabled = false;
    } else {
        let msg = result.message;
        if (result.line) {
            msg += ` (Linha ${result.line})`;
            State.jsonValidationErrorLine = result.line;
        } else {
            State.jsonValidationErrorLine = -1;
        }
        statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> [ERRO] ${msg}`;
        statusDiv.className = 'validation-status invalid';
        State.validatedExamData = null;
        if (btnSubmit) btnSubmit.disabled = true;
    }

    if (editorLines) {
        let html = '';
        for (let i = 1; i <= lineCount; i++) {
            const isError = (i === State.jsonValidationErrorLine);
            html += `<div class="line-number-item ${isError ? 'error-line' : ''}">${i}</div>`;
        }
        editorLines.innerHTML = html;
    }

    return result;
}
