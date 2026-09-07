/**
 * examBuilder.js
 * --------------
 * Dual-Pane Interactive Exam Builder module.
 * Provides live bi-directional synchronisation between the Visual Box Editor
 * (left pane) and the JSON Code Editor (right pane), supporting multiple-choice,
 * boolean (true/false), and written questions.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { validateExamJSON } from './validation.js';
import { t } from './i18n.js';
import { showToast, getLocalizedText } from './utils.js';

let isSyncing = false;

/**
 * Generates an empty default question item
 * @param {string} type - 'escolha_multipla' | 'boolean' | 'escrita'
 */
export function createDefaultQuestion(type = 'escolha_multipla') {
    if (type === 'boolean') {
        return {
            type: 'boolean',
            question: '',
            solution: 0,
            explanation: ''
        };
    }
    if (type === 'escrita') {
        return {
            type: 'escrita',
            question: '',
            solution: '',
            explanation: ''
        };
    }
    return {
        type: 'escolha_multipla',
        question: '',
        options: ['', '', '', ''],
        solution: [0],
        explanation: ''
    };
}

/**
 * Initializes the Exam Builder interface and event listeners
 */
export function initExamBuilder() {
    const listContainer = document.getElementById('builder-questions-list');
    const btnAddQ = document.getElementById('btn-builder-add-question');
    const btnFormat = document.getElementById('btn-builder-format-json');
    const btnCopy = document.getElementById('btn-builder-copy-json');
    const btnClear = document.getElementById('btn-builder-clear');
    const editorInput = document.getElementById('editor-code-input');
    const editorLines = document.getElementById('editor-line-numbers');
    const statusDiv = document.getElementById('validation-status');
    const btnSubmit = document.getElementById('btn-submit-exam');

    const titleInput = document.getElementById('builder-exam-title');
    const descInput = document.getElementById('builder-exam-desc');
    const langSelect = document.getElementById('builder-exam-lang');

    // Input listeners on Metadata fields (visual -> code)
    if (titleInput) titleInput.addEventListener('input', handleVisualChange);
    if (descInput) descInput.addEventListener('input', handleVisualChange);
    if (langSelect) langSelect.addEventListener('change', handleVisualChange);

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
 * Resets the Exam Builder to a clean initial state with 1 default question
 */
export function resetExamBuilder() {
    const titleInput = document.getElementById('builder-exam-title');
    const descInput = document.getElementById('builder-exam-desc');
    const langSelect = document.getElementById('builder-exam-lang');
    const listContainer = document.getElementById('builder-questions-list');
    const editorInput = document.getElementById('editor-code-input');

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (langSelect) langSelect.value = State.language || 'pt';
    if (listContainer) listContainer.innerHTML = '';

    // Add 1 default question
    addQuestionBox(createDefaultQuestion('escolha_multipla'));
    handleVisualChange();
}

/**
 * Triggered when user edits visual fields.
 * Updates the JSON text editor.
 */
function handleVisualChange() {
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
function handleCodeChange() {
    if (isSyncing) return;
    isSyncing = true;

    const editorInput = document.getElementById('editor-code-input');
    const jsonStr = editorInput ? editorInput.value.trim() : '';

    const validation = updateLineNumbersAndValidation();

    if (validation.valid && validation.data) {
        renderVisualBoxesFromData(validation.data);
    }

    isSyncing = false;
}

/**
 * Updates line numbers in the gutter and validates current JSON
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

/**
 * Reads visual inputs and creates an exam object
 */
export function getExamDataFromVisualBoxes() {
    const titleInput = document.getElementById('builder-exam-title');
    const descInput = document.getElementById('builder-exam-desc');
    const langSelect = document.getElementById('builder-exam-lang');
    const listContainer = document.getElementById('builder-questions-list');

    const title = titleInput ? titleInput.value.trim() : '';
    const desc = descInput ? descInput.value.trim() : '';
    const lang = langSelect ? langSelect.value : (State.language || 'pt');

    const questions = [];
    if (listContainer) {
        const qCards = listContainer.querySelectorAll('.builder-question-card');
        qCards.forEach((card) => {
            const typeSelect = card.querySelector('.builder-q-type-select');
            const qType = typeSelect ? typeSelect.value : 'escolha_multipla';

            const textInput = card.querySelector('.builder-q-text');
            const qText = textInput ? textInput.value : '';

            const explInput = card.querySelector('.builder-q-explanation');
            const qExpl = explInput ? explInput.value.trim() : '';

            if (qType === 'boolean') {
                const checkedRadio = card.querySelector('input[type="radio"]:checked');
                const solution = checkedRadio ? parseInt(checkedRadio.value, 10) : 0;
                const qObj = {
                    type: 'boolean',
                    question: qText,
                    solution: solution
                };
                if (qExpl) qObj.explanation = qExpl;
                questions.push(qObj);
            } else if (qType === 'escrita') {
                const solutionInput = card.querySelector('.builder-q-written-solution');
                const solution = solutionInput ? solutionInput.value : '';
                const qObj = {
                    type: 'escrita',
                    question: qText,
                    solution: solution
                };
                if (qExpl) qObj.explanation = qExpl;
                questions.push(qObj);
            } else {
                // escolha_multipla
                const optInputs = card.querySelectorAll('.builder-opt-input');
                const options = [];
                optInputs.forEach(input => {
                    options.push(input.value);
                });

                const correctCheckboxes = card.querySelectorAll('.builder-opt-correct:checked');
                const solution = [];
                correctCheckboxes.forEach(cb => {
                    const optIdx = parseInt(cb.getAttribute('data-opt-index'), 10);
                    if (!isNaN(optIdx)) solution.push(optIdx);
                });

                const qObj = {
                    type: 'escolha_multipla',
                    question: qText,
                    options: options.length > 0 ? options : ['', ''],
                    solution: solution.length > 0 ? solution : [0]
                };
                if (qExpl) qObj.explanation = qExpl;
                questions.push(qObj);
            }
        });
    }

    return {
        title: title,
        description: desc,
        languages: [lang],
        questions: questions
    };
}

/**
 * Renders visual cards and fields from a valid data object
 * @param {object} examData
 */
export function renderVisualBoxesFromData(examData) {
    if (!examData) return;

    const titleInput = document.getElementById('builder-exam-title');
    const descInput = document.getElementById('builder-exam-desc');
    const langSelect = document.getElementById('builder-exam-lang');
    const listContainer = document.getElementById('builder-questions-list');

    if (titleInput) {
        titleInput.value = getLocalizedText(examData.title || examData.titulo || '');
    }
    if (descInput) {
        descInput.value = getLocalizedText(examData.description || examData.descricao || '');
    }
    if (langSelect) {
        const langs = examData.languages || (examData.linguas ? examData.linguas : [examData.lingua || 'pt']);
        langSelect.value = Array.isArray(langs) && langs.length > 0 ? langs[0] : 'pt';
    }

    if (!listContainer) return;
    listContainer.innerHTML = '';

    const questions = examData.questions || examData.perguntas || [];
    if (questions.length === 0) {
        listContainer.innerHTML = `<div class="builder-empty-notice">${t('builder_empty_questions')}</div>`;
        return;
    }

    questions.forEach((q) => {
        addQuestionBox(q, false);
    });

    updateQuestionNumbers();
}

/**
 * Creates and appends a visual question card
 * @param {object} qData
 * @param {boolean} triggerSync
 */
export function addQuestionBox(qData = {}, triggerSync = true) {
    const listContainer = document.getElementById('builder-questions-list');
    if (!listContainer) return;

    const emptyNotice = listContainer.querySelector('.builder-empty-notice');
    if (emptyNotice) emptyNotice.remove();

    const qIndex = listContainer.querySelectorAll('.builder-question-card').length;
    const qType = qData.type || 'escolha_multipla';
    const qText = typeof qData.question === 'object' ? getLocalizedText(qData.question) : (qData.question || qData.pergunta || '');
    const qExpl = typeof qData.explanation === 'object' ? getLocalizedText(qData.explanation) : (qData.explanation || qData.explicacao || '');

    const card = document.createElement('div');
    card.className = 'builder-question-card';
    card.setAttribute('data-q-index', qIndex);

    card.innerHTML = `
        <div class="builder-q-header">
            <div class="builder-q-header-left">
                <span class="builder-q-num-badge">Q${qIndex + 1}</span>
                <select class="builder-q-type-select" aria-label="Tipo de Questão">
                    <option value="escolha_multipla" ${qType === 'escolha_multipla' ? 'selected' : ''}>${t('builder_q_type_choice')}</option>
                    <option value="boolean" ${qType === 'boolean' ? 'selected' : ''}>${t('builder_q_type_boolean')}</option>
                    <option value="escrita" ${qType === 'escrita' ? 'selected' : ''}>${t('builder_q_type_written')}</option>
                </select>
            </div>
            <div class="builder-q-header-right">
                <button type="button" class="btn-builder-remove-q" title="Remover questão" aria-label="Remover questão">
                    <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                </button>
            </div>
        </div>

        <div class="builder-q-body">
            <div class="builder-field-group">
                <label class="builder-field-label">Enunciado</label>
                <textarea class="builder-q-text form-control" placeholder="${t('builder_q_text_placeholder')}" rows="2">${qText}</textarea>
            </div>

            <div class="builder-q-dynamic-area"></div>

            <div class="builder-field-group">
                <label class="builder-field-label">${t('builder_explanation_label')}</label>
                <input type="text" class="builder-q-explanation form-control" placeholder="${t('builder_explanation_placeholder')}" value="${qExpl}">
            </div>
        </div>
    `;

    const dynamicArea = card.querySelector('.builder-q-dynamic-area');
    renderDynamicArea(dynamicArea, qType, qData, qIndex);

    // Event Listeners
    const typeSelect = card.querySelector('.builder-q-type-select');
    typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        const currentText = card.querySelector('.builder-q-text').value;
        const currentExpl = card.querySelector('.builder-q-explanation').value;
        const freshQ = createDefaultQuestion(newType);
        freshQ.question = currentText;
        freshQ.explanation = currentExpl;
        renderDynamicArea(dynamicArea, newType, freshQ, parseInt(card.getAttribute('data-q-index'), 10));
        handleVisualChange();
    });

    const textInput = card.querySelector('.builder-q-text');
    textInput.addEventListener('input', handleVisualChange);

    const explInput = card.querySelector('.builder-q-explanation');
    explInput.addEventListener('input', handleVisualChange);

    const removeBtn = card.querySelector('.btn-builder-remove-q');
    removeBtn.addEventListener('click', () => {
        card.remove();
        updateQuestionNumbers();
        handleVisualChange();
    });

    listContainer.appendChild(card);
    updateQuestionNumbers();

    if (triggerSync) {
        handleVisualChange();
    }
}

/**
 * Renders the question options / answers depending on question type
 */
function renderDynamicArea(container, qType, qData, qIndex) {
    container.innerHTML = '';

    if (qType === 'boolean') {
        const solution = qData.solution !== undefined ? qData.solution : 0;
        const groupName = `bool_sol_${qIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        container.innerHTML = `
            <div class="builder-field-group">
                <label class="builder-field-label">${t('builder_correct_answer_label')}</label>
                <div class="builder-boolean-options">
                    <label class="builder-bool-label">
                        <input type="radio" name="${groupName}" value="0" ${solution === 0 ? 'checked' : ''}>
                        <span><i class="fa-solid fa-check"></i> Verdadeiro / True</span>
                    </label>
                    <label class="builder-bool-label">
                        <input type="radio" name="${groupName}" value="1" ${solution === 1 ? 'checked' : ''}>
                        <span><i class="fa-solid fa-xmark"></i> Falso / False</span>
                    </label>
                </div>
            </div>
        `;
        container.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', handleVisualChange);
        });
    } else if (qType === 'escrita') {
        const solText = typeof qData.solution === 'object' ? getLocalizedText(qData.solution) : (qData.solution || '');
        container.innerHTML = `
            <div class="builder-field-group">
                <label class="builder-field-label">${t('builder_written_solution_label')}</label>
                <textarea class="builder-q-written-solution form-control" placeholder="${t('builder_written_solution_placeholder')}" rows="2">${solText}</textarea>
            </div>
        `;
        const solInput = container.querySelector('.builder-q-written-solution');
        solInput.addEventListener('input', handleVisualChange);
    } else {
        // escolha_multipla
        const options = Array.isArray(qData.options) ? qData.options : (qData.options ? [qData.options] : ['', '', '', '']);
        const solution = Array.isArray(qData.solution) ? qData.solution : [0];

        container.innerHTML = `
            <div class="builder-field-group">
                <div class="builder-field-header-row">
                    <label class="builder-field-label">${t('builder_options_label')}</label>
                    <button type="button" class="btn-builder-add-opt">
                        <i class="fa-solid fa-plus"></i> ${t('builder_add_option')}
                    </button>
                </div>
                <div class="builder-options-list"></div>
            </div>
        `;

        const optList = container.querySelector('.builder-options-list');
        const addOptBtn = container.querySelector('.btn-builder-add-opt');

        const renderOptionRow = (optText, optIdx) => {
            const isCorrect = solution.includes(optIdx);
            const row = document.createElement('div');
            row.className = 'builder-option-row';
            row.innerHTML = `
                <label class="builder-opt-correct-label" title="Marcar como correta">
                    <input type="checkbox" class="builder-opt-correct" data-opt-index="${optIdx}" ${isCorrect ? 'checked' : ''}>
                </label>
                <input type="text" class="builder-opt-input form-control" placeholder="${t('builder_option_placeholder')}" value="${typeof optText === 'object' ? getLocalizedText(optText) : (optText || '')}">
                <button type="button" class="btn-builder-remove-opt" title="Remover opção" aria-label="Remover opção">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;

            const cb = row.querySelector('.builder-opt-correct');
            cb.addEventListener('change', handleVisualChange);

            const inp = row.querySelector('.builder-opt-input');
            inp.addEventListener('input', handleVisualChange);

            const rm = row.querySelector('.btn-builder-remove-opt');
            rm.addEventListener('click', () => {
                row.remove();
                reindexOptionRows(optList);
                handleVisualChange();
            });

            optList.appendChild(row);
        };

        options.forEach((opt, idx) => {
            renderOptionRow(opt, idx);
        });

        addOptBtn.addEventListener('click', () => {
            const newIdx = optList.querySelectorAll('.builder-option-row').length;
            renderOptionRow('', newIdx);
            handleVisualChange();
        });
    }
}

/**
 * Re-indexes option rows data attributes after removal
 */
function reindexOptionRows(optList) {
    if (!optList) return;
    const rows = optList.querySelectorAll('.builder-option-row');
    rows.forEach((row, idx) => {
        const cb = row.querySelector('.builder-opt-correct');
        if (cb) cb.setAttribute('data-opt-index', idx);
    });
}

/**
 * Updates badges (Q1, Q2, etc.) for all question cards and syncs visual status bar
 */
function updateQuestionNumbers() {
    const listContainer = document.getElementById('builder-questions-list');
    const statusText = document.getElementById('builder-visual-status-text');
    if (!listContainer) return;
    const cards = listContainer.querySelectorAll('.builder-question-card');
    const count = cards.length;
    cards.forEach((card, idx) => {
        card.setAttribute('data-q-index', idx);
        const badge = card.querySelector('.builder-q-num-badge');
        if (badge) badge.textContent = `Q${idx + 1}`;
    });

    if (statusText) {
        if (count === 0) {
            statusText.textContent = t('builder_visual_status_empty') || 'Nenhuma pergunta configurada';
        } else if (count === 1) {
            statusText.textContent = t('builder_visual_status_single') || '1 pergunta configurada';
        } else {
            const template = t('builder_visual_status_count') || '{count} perguntas configuradas';
            statusText.textContent = template.replace('{count}', count);
        }
    }
}
