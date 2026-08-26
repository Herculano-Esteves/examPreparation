/**
 * exams.js
 * --------
 * Manages fetching, rendering, and starting exams for the active cadeira.
 * Clean card layout with Title first, description underneath, and question count at the bottom.
 * Full WCAG 2.1 AA / EAA 2025 keyboard accessibility.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML, clampCardDescriptions, showToast } from './utils.js';
import { loadLocalData } from './storage.js';
import { transitionTo } from './navigation.js';
import { renderQuestion } from './question.js';
import { getExamQuestionTypes, getQuestionTypeInfo, renderQuestionTypeTagsHTML } from './questionTypes.js';

/**
 * Calculates the total and remaining active questions count after applying exclusions.
 *
 * @param {object} exam
 * @param {string[]} excludedTypes
 * @returns {{ totalCount: number, activeCount: number }}
 */
function getExamFilteredCount(exam, excludedTypes = []) {
    const totalCount = exam.perguntas
        ? exam.perguntas.length
        : (exam.perguntas_count || 0);

    if (!excludedTypes || excludedTypes.length === 0) {
        return { totalCount, activeCount: totalCount };
    }

    if (exam.tipos_contagem) {
        let excludedSum = 0;
        excludedTypes.forEach(t => {
            excludedSum += (exam.tipos_contagem[t] || 0);
        });
        return {
            totalCount,
            activeCount: Math.max(0, totalCount - excludedSum)
        };
    }

    if (Array.isArray(exam.perguntas)) {
        const active = exam.perguntas.filter(q => !excludedTypes.includes(getQuestionTypeInfo(q.tipo).id)).length;
        return { totalCount, activeCount: active };
    }

    return { totalCount, activeCount: totalCount };
}

/**
 * Updates the action counter and capsule button states for a specific exam row.
 *
 * @param {HTMLElement} row
 * @param {object} exam
 */
function updateExamRowUI(row, exam) {
    if (!State.examFilters) State.examFilters = {};
    const excluded = State.examFilters[exam.id] || [];
    const { totalCount, activeCount } = getExamFilteredCount(exam, excluded);

    const actionEl = row.querySelector('.exam-list-action');
    if (actionEl) {
        const totalLabel = totalCount === 1 ? '1 questão' : `${totalCount} questões`;
        if (activeCount === totalCount) {
            actionEl.innerHTML = `[ ${totalLabel} ]`;
        } else {
            const activeLabel = activeCount === 1 ? '1 questão' : `${activeCount} questões`;
            actionEl.innerHTML = `[ <s class="count-old">${totalCount}</s> <span class="count-new ${activeCount === 0 ? 'count-zero' : ''}">${activeLabel}</span> ]`;
        }
    }

    row.querySelectorAll('.exam-type-segment').forEach(btn => {
        const typeId = btn.getAttribute('data-type');
        const isExcluded = excluded.includes(typeId);
        const info = getQuestionTypeInfo(typeId);
        if (isExcluded) {
            btn.classList.add('type-excluded');
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('title', `Excluído: ${info.label} (Clique para incluir)`);
            btn.setAttribute('aria-label', `Excluído: ${info.label} (Clique para incluir)`);
        } else {
            btn.classList.remove('type-excluded');
            btn.setAttribute('aria-pressed', 'true');
            btn.setAttribute('title', `Incluído: ${info.label} (Clique para excluir)`);
            btn.setAttribute('aria-label', `Incluído: ${info.label} (Clique para excluir)`);
        }
    });
}

/**
 * Fetch exam list for the active cadeira from the server index file,
 * merge with any locally stored exams, and render the exams grid.
 *
 * @param {string} indexPath - Relative path to the cadeira's index.json
 */
export async function fetchExams(indexPath) {
    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
            <p>A carregar exames...</p>
        </div>
    `;

    try {
        const response = await fetch(indexPath);
        if (!response.ok) throw new Error('Não foi possível carregar os exames desta cadeira.');
        const serverExams = await response.json();

        loadLocalData(State);

        const currentCadeiraId = State.activeCadeira ? State.activeCadeira.id : null;
        const matchingLocalExams = State.localExames.filter(
            e => e.cadeira_id === currentCadeiraId
        );

        State.exams = [
            ...serverExams.map(e => ({ ...e, isLocal: false })),
            ...matchingLocalExams.map(e => ({ ...e, isLocal: true }))
        ];

        renderExamsMenu();
    } catch (error) {
        console.error('Error fetching exams:', error);
        elements.examsGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <h3>Erro ao carregar os exames</h3>
                <p>${escapeHTML(error.message)}</p>
                <button class="btn-control btn-primary" id="btn-retry-exams" style="margin-top: 1rem;">Tentar Novamente</button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-exams');
        if (retryBtn) retryBtn.addEventListener('click', () => fetchExams(indexPath));
    }
}

/**
 * Render the exams grid from State.exams.
 * Direct layout: Title on top, question type filter capsule, and description underneath.
 */
export function renderExamsMenu() {
    elements.examsGrid.innerHTML = '';
    if (!State.examFilters) State.examFilters = {};

    State.exams.forEach(exam => {
        const row = document.createElement('div');
        row.className = 'exam-list-row';
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `Iniciar exame ${exam.titulo}`);

        const excluded = State.examFilters[exam.id] || [];
        const questionTypes = getExamQuestionTypes(exam);
        const typesHTML = renderQuestionTypeTagsHTML(questionTypes, excluded);

        const { totalCount, activeCount } = getExamFilteredCount(exam, excluded);
        const totalLabel = totalCount === 1 ? '1 questão' : `${totalCount} questões`;
        let actionHTML = `[ ${totalLabel} ]`;

        if (activeCount < totalCount) {
            const activeLabel = activeCount === 1 ? '1 questão' : `${activeCount} questões`;
            actionHTML = `[ <s class="count-old">${totalCount}</s> <span class="count-new ${activeCount === 0 ? 'count-zero' : ''}">${activeLabel}</span> ]`;
        }

        row.innerHTML = `
            <div class="exam-list-header">
                <h4 class="exam-list-title">${escapeHTML(exam.titulo.toUpperCase())}${exam.isLocal ? ' <span class="badge-local">Local</span>' : ''}</h4>
                <span class="exam-list-action">${actionHTML}</span>
            </div>
            ${typesHTML}
            <p class="exam-list-desc">${escapeHTML(exam.descricao)}</p>
        `;

        // Interactivity for question type toggle buttons
        row.querySelectorAll('.exam-type-segment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid triggering exam start
                const typeId = btn.getAttribute('data-type');
                if (!State.examFilters[exam.id]) {
                    State.examFilters[exam.id] = [];
                }
                const idx = State.examFilters[exam.id].indexOf(typeId);
                if (idx > -1) {
                    State.examFilters[exam.id].splice(idx, 1);
                } else {
                    State.examFilters[exam.id].push(typeId);
                }
                updateExamRowUI(row, exam);
            });
        });

        const activate = () => {
            const currentExcluded = State.examFilters[exam.id] || [];
            const countInfo = getExamFilteredCount(exam, currentExcluded);
            if (countInfo.activeCount === 0) {
                showToast('Todas as perguntas estão excluídas. Ative pelo menos um tipo para iniciar.');
                row.classList.add('row-shake-error');
                setTimeout(() => row.classList.remove('row-shake-error'), 450);
                return;
            }
            startExam(exam.id);
        };

        row.addEventListener('click', activate);
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate();
            }
        });

        elements.examsGrid.appendChild(row);
    });
}

/**
 * Fisher-Yates shuffle of a multiple-choice question's options in-place.
 * Updates q.solucao indices to match the new option order.
 * No-op for 'escrita' and 'boolean' questions (they have no shuffleable options).
 *
 * @param {object} q - Question object (mutated in-place)
 */
export function shuffleQuestionOptions(q) {
    if (q.tipo === 'escrita' || q.tipo === 'boolean' || !q.opcoes || q.opcoes.length === 0) {
        return;
    }

    const mapped = q.opcoes.map((opcao, idx) => ({
        texto:    opcao,
        eCorreta: q.solucao.includes(idx)
    }));

    for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
    }

    q.opcoes  = mapped.map(item => item.texto);
    q.solucao = mapped
        .map((item, idx) => item.eCorreta ? idx : -1)
        .filter(idx => idx !== -1);
}

/**
 * Load a full exam's question data, filter out excluded types, shuffle options,
 * and transition to the exam screen.
 *
 * @param {string} examId - The exam's ID as defined in the cadeira's index.json
 */
export async function startExam(examId) {
    const examMeta = State.exams.find(e => e.id === examId);
    if (!examMeta) return;

    const excludedTypes = (State.examFilters && State.examFilters[examId]) || [];

    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
            <p>A carregar as perguntas do exame...</p>
        </div>
    `;

    try {
        let examData;
        if (examMeta.isLocal) {
            examData = examMeta;
        } else {
            const response = await fetch(examMeta.path);
            if (!response.ok) throw new Error('Não foi possível carregar as questões deste exame.');
            examData = await response.json();
        }

        // Apply question type filters
        let questionsToUse = examData.perguntas || [];
        if (excludedTypes.length > 0) {
            questionsToUse = questionsToUse.filter(q => {
                const t = getQuestionTypeInfo(q.tipo).id;
                return !excludedTypes.includes(t);
            });
        }

        if (questionsToUse.length === 0) {
            showToast('Todas as perguntas estão excluídas. Ative pelo menos um tipo para iniciar.');
            renderExamsMenu();
            return;
        }

        State.activeExam = {
            ...examMeta,
            perguntas: questionsToUse
        };

        State.activeExam.perguntas.forEach(q => shuffleQuestionOptions(q));

        // Inicializar armazenamento em memória da sessão de respostas do exame
        State.examAnswers = State.activeExam.perguntas.map(() => ({
            selectedOptions: [],
            writtenInput: '',
            revealed: false,
            isCorrect: null
        }));

        State.question.index              = 0;
        State.question.selectedOptions    = [];
        State.question.revealed           = false;
        State.question.firstAttemptCorrect = {};
        State.question.writtenInput       = '';

        elements.currentExamTitle.textContent = State.activeExam.titulo;

        if (State.activeCadeira && State.activeCadeira.icon) {
            const iconEl = document.getElementById('exam-subject-icon');
            if (iconEl) iconEl.className = `fa-solid ${State.activeCadeira.icon}`;
        }

        transitionTo('exam');

        try {
            renderQuestion();
        } catch (renderErr) {
            console.error('Erro ao renderizar a questão:', renderErr);
            if (elements.questionText) {
                elements.questionText.textContent =
                    '⚠️ Erro ao carregar a questão. Verifique a consola para detalhes.';
            }
            if (elements.optionsContainer) {
                elements.optionsContainer.innerHTML = `
                    <div class="error-state">
                        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                        <h3>Erro de renderização</h3>
                        <p>${escapeHTML(renderErr.message)}</p>
                    </div>`;
            }
        }

    } catch (error) {
        console.error('Error fetching exam questions:', error);
        renderExamsMenu();
        alert('Erro ao carregar o exame: ' + error.message);
    }
}
