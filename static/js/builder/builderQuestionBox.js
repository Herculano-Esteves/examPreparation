/**
 * builderQuestionBox.js
 * ---------------------
 * Question Card DOM generation, dynamic options rendering, and question reordering.
 */

import { isBilingualMode, createDefaultQuestion } from './builderTemplates.js';
import { escapeHTML, getLocalizedText } from '../utils.js';
import { t } from '../i18n.js';
import { handleVisualChange } from '../examBuilder.js';

/**
 * Creates and appends a visual question card respecting bilingual or monolingual mode.
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
 * Renders the question options / answers depending on question type and bilingual mode.
 * @param {HTMLElement} container
 * @param {string} qType
 * @param {object} qData
 * @param {number} qIndex
 */
export function renderDynamicArea(container, qType, qData, qIndex) {
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
 * Re-indexes option rows data attributes after removal.
 * @param {HTMLElement} optList
 */
export function reindexOptionRows(optList) {
    if (!optList) return;
    const rows = optList.querySelectorAll('.builder-option-row');
    rows.forEach((row, idx) => {
        const cb = row.querySelector('.builder-opt-correct');
        if (cb) cb.setAttribute('data-opt-index', idx);
    });
}

/**
 * Updates badges (Q1, Q2, etc.) for all question cards and syncs visual status bar.
 */
export function updateQuestionNumbers() {
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
