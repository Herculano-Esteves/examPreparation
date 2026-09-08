/**
 * examBuilder.js
 * --------------
 * Dual-Pane Interactive Exam Builder module.
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

let isSyncing = false;

/**
 * Returns array of selected language codes (e.g. ['pt'], ['en'], or ['pt', 'en'])
 * @returns {string[]}
 */
export function getSelectedLanguages() {
    const langSelect = document.getElementById('builder-exam-lang');
    const val = langSelect ? langSelect.value : (State.language || 'pt');
    if (val === 'pt,en' || val === 'en,pt') {
        return ['pt', 'en'];
    }
    if (val === 'en') {
        return ['en'];
    }
    return ['pt'];
}

/**
 * Returns true if the builder is currently configured in bilingual (PT + EN) mode.
 * @returns {boolean}
 */
export function isBilingualMode() {
    return getSelectedLanguages().length > 1;
}

/**
 * Generates an empty default question item respecting active language mode
 * @param {string} type - 'escolha_multipla' | 'boolean' | 'escrita'
 * @returns {object}
 */
export function createDefaultQuestion(type = 'escolha_multipla') {
    const bilingual = isBilingualMode();

    if (type === 'boolean') {
        return {
            type: 'boolean',
            question: bilingual ? { pt: '', en: '' } : '',
            solution: 0,
            explanation: bilingual ? { pt: '', en: '' } : ''
        };
    }
    if (type === 'escrita') {
        return {
            type: 'escrita',
            question: bilingual ? { pt: '', en: '' } : '',
            solution: bilingual ? { pt: '', en: '' } : '',
            explanation: bilingual ? { pt: '', en: '' } : ''
        };
    }
    return {
        type: 'escolha_multipla',
        question: bilingual ? { pt: '', en: '' } : '',
        options: bilingual ? { pt: ['', '', '', ''], en: ['', '', '', ''] } : ['', '', '', ''],
        solution: [0],
        explanation: bilingual ? { pt: '', en: '' } : ''
    };
}

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
 * Reads visual inputs and creates an exam object, gracefully detecting whether DOM
 * fields are currently rendered in monolingual or bilingual mode.
 */
export function getExamDataFromVisualBoxes() {
    const bilingual = isBilingualMode();
    const selectedLangs = getSelectedLanguages();
    const listContainer = document.getElementById('builder-questions-list');

    // Title & Description detection
    const hasBilingualTitleInputs = !!document.getElementById('builder-exam-title-en');
    let titlePt = '';
    let titleEn = '';
    if (hasBilingualTitleInputs) {
        titlePt = document.getElementById('builder-exam-title')?.value || '';
        titleEn = document.getElementById('builder-exam-title-en')?.value || '';
    } else {
        titlePt = document.getElementById('builder-exam-title')?.value || '';
        titleEn = '';
    }

    const hasBilingualDescInputs = !!document.getElementById('builder-exam-desc-en');
    let descPt = '';
    let descEn = '';
    if (hasBilingualDescInputs) {
        descPt = document.getElementById('builder-exam-desc')?.value || '';
        descEn = document.getElementById('builder-exam-desc-en')?.value || '';
    } else {
        descPt = document.getElementById('builder-exam-desc')?.value || '';
        descEn = '';
    }

    let title;
    let desc;
    if (bilingual) {
        title = { pt: titlePt, en: titleEn };
        desc = { pt: descPt, en: descEn };
    } else {
        title = titlePt || titleEn || '';
        desc = descPt || descEn || '';
    }

    const questions = [];
    if (listContainer) {
        const qCards = listContainer.querySelectorAll('.builder-question-card');
        qCards.forEach((card) => {
            const typeSelect = card.querySelector('.builder-q-type-select');
            const qType = typeSelect ? typeSelect.value : 'escolha_multipla';

            // Question prompt detection
            let promptPt = '';
            let promptEn = '';
            const ptPromptInput = card.querySelector('.builder-q-text-pt');
            const enPromptInput = card.querySelector('.builder-q-text-en');
            const singlePromptInput = card.querySelector('.builder-q-text');

            if (ptPromptInput || enPromptInput) {
                promptPt = ptPromptInput ? ptPromptInput.value : '';
                promptEn = enPromptInput ? enPromptInput.value : '';
            } else if (singlePromptInput) {
                promptPt = singlePromptInput.value;
                promptEn = '';
            }

            let qPrompt;
            if (bilingual) {
                qPrompt = { pt: promptPt, en: promptEn };
            } else {
                qPrompt = promptPt || promptEn || '';
            }

            // Explanation detection
            let explPt = '';
            let explEn = '';
            const ptExplInput = card.querySelector('.builder-q-expl-pt');
            const enExplInput = card.querySelector('.builder-q-expl-en');
            const singleExplInput = card.querySelector('.builder-q-explanation');

            if (ptExplInput || enExplInput) {
                explPt = ptExplInput ? ptExplInput.value.trim() : '';
                explEn = enExplInput ? enExplInput.value.trim() : '';
            } else if (singleExplInput) {
                explPt = singleExplInput.value.trim();
                explEn = '';
            }

            let qExpl;
            if (bilingual) {
                if (explPt || explEn) {
                    qExpl = { pt: explPt, en: explEn };
                }
            } else {
                if (explPt || explEn) {
                    qExpl = explPt || explEn;
                }
            }

            if (qType === 'boolean') {
                const checkedRadio = card.querySelector('input[type="radio"]:checked');
                const solution = checkedRadio ? parseInt(checkedRadio.value, 10) : 0;
                const qObj = {
                    type: 'boolean',
                    question: qPrompt,
                    solution: solution
                };
                if (qExpl !== undefined) qObj.explanation = qExpl;
                questions.push(qObj);
            } else if (qType === 'escrita') {
                let solPt = '';
                let solEn = '';
                const ptSolInput = card.querySelector('.builder-q-written-pt');
                const enSolInput = card.querySelector('.builder-q-written-en');
                const singleSolInput = card.querySelector('.builder-q-written-solution');

                if (ptSolInput || enSolInput) {
                    solPt = ptSolInput ? ptSolInput.value : '';
                    solEn = enSolInput ? enSolInput.value : '';
                } else if (singleSolInput) {
                    solPt = singleSolInput.value;
                    solEn = '';
                }

                let solution;
                if (bilingual) {
                    solution = { pt: solPt, en: solEn };
                } else {
                    solution = solPt || solEn || '';
                }

                const qObj = {
                    type: 'escrita',
                    question: qPrompt,
                    solution: solution
                };
                if (qExpl !== undefined) qObj.explanation = qExpl;
                questions.push(qObj);
            } else {
                // escolha_multipla
                const correctCheckboxes = card.querySelectorAll('.builder-opt-correct:checked');
                const solution = [];
                correctCheckboxes.forEach(cb => {
                    const optIdx = parseInt(cb.getAttribute('data-opt-index'), 10);
                    if (!isNaN(optIdx)) solution.push(optIdx);
                });

                const ptOptInputs = card.querySelectorAll('.builder-opt-input-pt');
                const enOptInputs = card.querySelectorAll('.builder-opt-input-en');
                const singleOptInputs = card.querySelectorAll('.builder-opt-input');

                let options;
                if (ptOptInputs.length > 0 || enOptInputs.length > 0) {
                    const ptOpts = [];
                    const enOpts = [];
                    ptOptInputs.forEach(inp => ptOpts.push(inp.value));
                    enOptInputs.forEach(inp => enOpts.push(inp.value));

                    if (bilingual) {
                        options = {
                            pt: ptOpts.length > 0 ? ptOpts : ['', ''],
                            en: enOpts.length > 0 ? enOpts : ['', '']
                        };
                    } else {
                        options = ptOpts.length > 0 ? ptOpts : (enOpts.length > 0 ? enOpts : ['', '']);
                    }
                } else {
                    const singleOpts = [];
                    singleOptInputs.forEach(inp => singleOpts.push(inp.value));

                    if (bilingual) {
                        options = {
                            pt: singleOpts.length > 0 ? singleOpts : ['', ''],
                            en: singleOpts.map(() => '')
                        };
                    } else {
                        options = singleOpts.length > 0 ? singleOpts : ['', ''];
                    }
                }

                const qObj = {
                    type: 'escolha_multipla',
                    question: qPrompt,
                    options: options,
                    solution: solution.length > 0 ? solution : [0]
                };
                if (qExpl !== undefined) qObj.explanation = qExpl;
                questions.push(qObj);
            }
        });
    }

    return {
        title: title,
        description: desc,
        languages: selectedLangs,
        questions: questions
    };
}

/**
 * Renders visual cards and fields from a valid data object
 * @param {object} examData
 */
export function renderVisualBoxesFromData(examData) {
    if (!examData) return;

    const langSelect = document.getElementById('builder-exam-lang');
    const listContainer = document.getElementById('builder-questions-list');

    // Detect language configuration
    const rawLangs = examData.languages || (examData.linguas ? examData.linguas : [examData.lingua || 'pt']);
    const langArray = Array.isArray(rawLangs) ? rawLangs : [rawLangs];

    if (langSelect) {
        if (langArray.includes('pt') && langArray.includes('en')) {
            langSelect.value = 'pt,en';
        } else if (langArray.includes('en')) {
            langSelect.value = 'en';
        } else {
            langSelect.value = 'pt';
        }
    }

    // Render metadata
    renderMetadataInputs(examData.title || examData.titulo || '', examData.description || examData.descricao || '');

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
 * Creates and appends a visual question card respecting bilingual or monolingual mode
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
    const bilingual = isBilingualMode();

    const card = document.createElement('div');
    card.className = 'builder-question-card';
    card.setAttribute('data-q-index', qIndex);

    let promptHtml = '';
    let explHtml = '';

    if (bilingual) {
        const qTextPt = typeof qData.question === 'object' && qData.question !== null ? (qData.question.pt || '') : (qData.question || qData.pergunta || '');
        const qTextEn = typeof qData.question === 'object' && qData.question !== null ? (qData.question.en || '') : '';

        promptHtml = `
            <div class="builder-bilingual-stack">
                <div class="builder-input-with-tag">
                    <span class="builder-lang-tag tag-pt">🇵🇹 PT</span>
                    <textarea class="builder-q-text-pt form-control" placeholder="Enunciado da pergunta em português..." rows="2">${escapeHTML(qTextPt)}</textarea>
                </div>
                <div class="builder-input-with-tag">
                    <span class="builder-lang-tag tag-en">🇬🇧 EN</span>
                    <textarea class="builder-q-text-en form-control" placeholder="Question prompt in English..." rows="2">${escapeHTML(qTextEn)}</textarea>
                </div>
            </div>
        `;

        const qExplPt = typeof qData.explanation === 'object' && qData.explanation !== null ? (qData.explanation.pt || '') : (qData.explanation || qData.explicacao || '');
        const qExplEn = typeof qData.explanation === 'object' && qData.explanation !== null ? (qData.explanation.en || '') : '';

        explHtml = `
            <div class="builder-bilingual-stack">
                <div class="builder-input-with-tag">
                    <span class="builder-lang-tag tag-pt">🇵🇹 PT</span>
                    <input type="text" class="builder-q-expl-pt form-control" placeholder="Explicação da resposta em português..." value="${escapeHTML(qExplPt)}">
                </div>
                <div class="builder-input-with-tag">
                    <span class="builder-lang-tag tag-en">🇬🇧 EN</span>
                    <input type="text" class="builder-q-expl-en form-control" placeholder="Answer explanation in English..." value="${escapeHTML(qExplEn)}">
                </div>
            </div>
        `;
    } else {
        const qText = typeof qData.question === 'object' ? getLocalizedText(qData.question) : (qData.question || qData.pergunta || '');
        promptHtml = `
            <textarea class="builder-q-text form-control" placeholder="${t('builder_q_text_placeholder') || 'Escreva o enunciado da pergunta...'}" rows="2">${escapeHTML(qText)}</textarea>
        `;

        const qExpl = typeof qData.explanation === 'object' ? getLocalizedText(qData.explanation) : (qData.explanation || qData.explicacao || '');
        explHtml = `
            <input type="text" class="builder-q-explanation form-control" placeholder="${t('builder_explanation_placeholder') || 'Explicação para a resposta correta...'}" value="${escapeHTML(qExpl)}">
        `;
    }

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
                ${promptHtml}
            </div>

            <div class="builder-q-dynamic-area"></div>

            <div class="builder-field-group">
                <label class="builder-field-label">${t('builder_explanation_label')}</label>
                ${explHtml}
            </div>
        </div>
    `;

    const dynamicArea = card.querySelector('.builder-q-dynamic-area');
    renderDynamicArea(dynamicArea, qType, qData, qIndex);

    // Event Listeners for Question Type switch
    const typeSelect = card.querySelector('.builder-q-type-select');
    typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        const freshQ = createDefaultQuestion(newType);

        if (bilingual) {
            freshQ.question = {
                pt: card.querySelector('.builder-q-text-pt')?.value || '',
                en: card.querySelector('.builder-q-text-en')?.value || ''
            };
            freshQ.explanation = {
                pt: card.querySelector('.builder-q-expl-pt')?.value || '',
                en: card.querySelector('.builder-q-expl-en')?.value || ''
            };
        } else {
            freshQ.question = card.querySelector('.builder-q-text')?.value || '';
            freshQ.explanation = card.querySelector('.builder-q-explanation')?.value || '';
        }

        renderDynamicArea(dynamicArea, newType, freshQ, parseInt(card.getAttribute('data-q-index'), 10));
        handleVisualChange();
    });

    // Event Listeners for typing in prompts and explanations
    card.querySelectorAll('.builder-q-text, .builder-q-text-pt, .builder-q-text-en, .builder-q-explanation, .builder-q-expl-pt, .builder-q-expl-en').forEach(inp => {
        inp.addEventListener('input', handleVisualChange);
    });

    // Remove question button
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
 * Renders the question options / answers depending on question type and bilingual mode
 */
function renderDynamicArea(container, qType, qData, qIndex) {
    container.innerHTML = '';
    const bilingual = isBilingualMode();

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
        if (bilingual) {
            const solPt = typeof qData.solution === 'object' && qData.solution !== null ? (qData.solution.pt || '') : (qData.solution || '');
            const solEn = typeof qData.solution === 'object' && qData.solution !== null ? (qData.solution.en || '') : '';

            container.innerHTML = `
                <div class="builder-field-group">
                    <label class="builder-field-label">${t('builder_written_solution_label')}</label>
                    <div class="builder-bilingual-stack">
                        <div class="builder-input-with-tag">
                            <span class="builder-lang-tag tag-pt">🇵🇹 PT</span>
                            <textarea class="builder-q-written-pt form-control" placeholder="Critérios de resolução ou pontos-chave em português..." rows="2">${escapeHTML(solPt)}</textarea>
                        </div>
                        <div class="builder-input-with-tag">
                            <span class="builder-lang-tag tag-en">🇬🇧 EN</span>
                            <textarea class="builder-q-written-en form-control" placeholder="Grading criteria or model solution in English..." rows="2">${escapeHTML(solEn)}</textarea>
                        </div>
                    </div>
                </div>
            `;
            container.querySelectorAll('.builder-q-written-pt, .builder-q-written-en').forEach(inp => {
                inp.addEventListener('input', handleVisualChange);
            });
        } else {
            const solText = typeof qData.solution === 'object' ? getLocalizedText(qData.solution) : (qData.solution || '');
            container.innerHTML = `
                <div class="builder-field-group">
                    <label class="builder-field-label">${t('builder_written_solution_label')}</label>
                    <textarea class="builder-q-written-solution form-control" placeholder="${t('builder_written_solution_placeholder') || 'Escreva os pontos-chave ou a resolução modelo...'}" rows="2">${escapeHTML(solText)}</textarea>
                </div>
            `;
            const solInput = container.querySelector('.builder-q-written-solution');
            if (solInput) solInput.addEventListener('input', handleVisualChange);
        }
    } else {
        // escolha_multipla
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

        if (bilingual) {
            let ptOpts = [];
            let enOpts = [];
            if (typeof qData.options === 'object' && qData.options !== null && !Array.isArray(qData.options)) {
                ptOpts = Array.isArray(qData.options.pt) ? qData.options.pt : [];
                enOpts = Array.isArray(qData.options.en) ? qData.options.en : [];
            } else if (Array.isArray(qData.options)) {
                ptOpts = qData.options;
                enOpts = qData.options.map(() => '');
            }

            const rowCount = Math.max(ptOpts.length, enOpts.length, 2);

            const renderBilingualOptionRow = (optPtVal, optEnVal, optIdx) => {
                const isCorrect = solution.includes(optIdx);
                const row = document.createElement('div');
                row.className = 'builder-option-row builder-option-row-bilingual';
                row.innerHTML = `
                    <label class="builder-opt-correct-label" title="Marcar como correta">
                        <input type="checkbox" class="builder-opt-correct" data-opt-index="${optIdx}" ${isCorrect ? 'checked' : ''}>
                    </label>
                    <div class="builder-opt-inputs-pair">
                        <div class="builder-input-with-tag">
                            <span class="builder-lang-tag tag-pt">🇵🇹 PT</span>
                            <input type="text" class="builder-opt-input-pt form-control" placeholder="Opção em português..." value="${escapeHTML(optPtVal || '')}">
                        </div>
                        <div class="builder-input-with-tag">
                            <span class="builder-lang-tag tag-en">🇬🇧 EN</span>
                            <input type="text" class="builder-opt-input-en form-control" placeholder="Option in English..." value="${escapeHTML(optEnVal || '')}">
                        </div>
                    </div>
                    <button type="button" class="btn-builder-remove-opt" title="Remover opção" aria-label="Remover opção">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;

                row.querySelector('.builder-opt-correct').addEventListener('change', handleVisualChange);
                row.querySelector('.builder-opt-input-pt').addEventListener('input', handleVisualChange);
                row.querySelector('.builder-opt-input-en').addEventListener('input', handleVisualChange);
                row.querySelector('.btn-builder-remove-opt').addEventListener('click', () => {
                    row.remove();
                    reindexOptionRows(optList);
                    handleVisualChange();
                });

                optList.appendChild(row);
            };

            for (let i = 0; i < rowCount; i++) {
                renderBilingualOptionRow(ptOpts[i] || '', enOpts[i] || '', i);
            }

            addOptBtn.addEventListener('click', () => {
                const newIdx = optList.querySelectorAll('.builder-option-row').length;
                renderBilingualOptionRow('', '', newIdx);
                handleVisualChange();
            });
        } else {
            const options = Array.isArray(qData.options) ? qData.options : (qData.options ? [qData.options] : ['', '', '', '']);

            const renderOptionRow = (optText, optIdx) => {
                const isCorrect = solution.includes(optIdx);
                const row = document.createElement('div');
                row.className = 'builder-option-row';
                const textVal = typeof optText === 'object' ? getLocalizedText(optText) : (optText || '');
                row.innerHTML = `
                    <label class="builder-opt-correct-label" title="Marcar como correta">
                        <input type="checkbox" class="builder-opt-correct" data-opt-index="${optIdx}" ${isCorrect ? 'checked' : ''}>
                    </label>
                    <input type="text" class="builder-opt-input form-control" placeholder="${t('builder_option_placeholder') || 'Texto da opção...'}" value="${escapeHTML(textVal)}">
                    <button type="button" class="btn-builder-remove-opt" title="Remover opção" aria-label="Remover opção">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;

                row.querySelector('.builder-opt-correct').addEventListener('change', handleVisualChange);
                row.querySelector('.builder-opt-input').addEventListener('input', handleVisualChange);
                row.querySelector('.btn-builder-remove-opt').addEventListener('click', () => {
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
