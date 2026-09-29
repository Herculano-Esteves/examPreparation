/**
 * builderParser.js
 * ----------------
 * Bi-directional parser between the Visual Box DOM and Exam JSON schema.
 */

import { isBilingualMode, getSelectedLanguages } from './builderTemplates.js';
import { addQuestionBox, updateQuestionNumbers } from './builderQuestionBox.js';
import { renderMetadataInputs } from '../examBuilder.js';
import { t } from '../i18n.js';

/**
 * Reads visual inputs and creates an exam object, gracefully detecting whether DOM
 * fields are currently rendered in monolingual or bilingual mode.
 * @returns {object}
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
