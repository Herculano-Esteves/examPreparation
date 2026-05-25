/**
 * exams.js
 * --------
 * Manages fetching, rendering, and starting exams for the active cadeira.
 *
 * Circular import note: exams.js imports transitionTo from navigation.js, and
 * navigation.js imports fetchExams from exams.js. Safe in ES modules — see
 * navigation.js header for explanation.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML } from './utils.js';
import { loadLocalData } from './storage.js';
import { transitionTo } from './navigation.js';
import { renderQuestion } from './question.js';

/**
 * Fetch exam list for the active cadeira from the server index file,
 * merge with any locally stored exams, and render the exams grid.
 *
 * @param {string} indexPath - Relative path to the cadeira's index.json
 */
export async function fetchExams(indexPath) {
    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <p>A carregar exames...</p>
        </div>
    `;

    let serverExams = [];

    if (State.activeCadeira && !State.activeCadeira.isLocal) {
        try {
            const response = await fetch(indexPath);
            if (!response.ok) throw new Error('Não foi possível carregar os exames do servidor.');
            serverExams = await response.json();
        } catch (error) {
            console.error('Error fetching exams from server:', error);
        }
    }

    // Reload local exams from storage to ensure the list is up-to-date
    // after any add/delete operation performed in this session.
    loadLocalData(State);
    const activeCadeiraId    = State.activeCadeira ? State.activeCadeira.id : null;
    const filteredLocalExames = State.localExames.filter(e => e.cadeira_id === activeCadeiraId);

    State.exams = [...serverExams, ...filteredLocalExames];
    renderExamsMenu();
}

/**
 * Render the exams grid from State.exams.
 * Includes an "Adicionar Exame" card at the end.
 */
export function renderExamsMenu() {
    elements.examsGrid.innerHTML = '';

    State.exams.forEach(exam => {
        const card = document.createElement('div');
        card.className = 'exam-card';
        // Use perguntas_count from index.json if available; otherwise count array length.
        // Note: perguntas_count may be stale (DATA-01 issue) — runtime count is more accurate.
        const qCount = exam.perguntas
            ? exam.perguntas.length
            : (exam.perguntas_count || 0);

        card.innerHTML = `
            <div class="exam-card-header">
                <div class="exam-icon-box">
                    <i class="fa-solid fa-file-invoice"></i>
                </div>
                <span class="question-count-badge">${qCount} Questões</span>
            </div>
            <h4>${escapeHTML(exam.titulo)} ${exam.isLocal ? '<span class="badge-local">Local</span>' : ''}</h4>
            <p>${escapeHTML(exam.descricao)}</p>
            <div class="exam-card-footer">
                <span>Começar Exame</span>
                <i class="fa-solid fa-circle-arrow-right"></i>
            </div>
        `;

        card.addEventListener('click', () => startExam(exam.id));
        elements.examsGrid.appendChild(card);
    });

    // "Add exam" card
    const addCard = document.createElement('div');
    addCard.className = 'exam-card add-card';
    addCard.innerHTML = `
        <div class="add-card-content">
            <i class="fa-solid fa-plus-circle add-icon"></i>
            <span class="add-text">Adicionar Exame</span>
        </div>
    `;
    addCard.addEventListener('click', () => transitionTo('addExame'));
    elements.examsGrid.appendChild(addCard);
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

    // Pair each option with its correctness flag so we can track correct answers
    // through the shuffle without knowing which indices they map to afterwards.
    const mapped = q.opcoes.map((opcao, idx) => ({
        texto:    opcao,
        eCorreta: q.solucao.includes(idx)
    }));

    // Fisher-Yates in-place shuffle
    for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
    }

    // Rebuild options and solution indices from the shuffled mapping
    q.opcoes  = mapped.map(item => item.texto);
    q.solucao = mapped
        .map((item, idx) => item.eCorreta ? idx : -1)
        .filter(idx => idx !== -1);
}

/**
 * Load a full exam's question data, shuffle options, and transition to the exam screen.
 *
 * Flow:
 *  1. Show loading state in the exams grid
 *  2. Fetch the full exam JSON (or use the already-loaded local exam object)
 *  3. Initialise State for the new exam
 *  4. Populate the exam top bar (title, icon)
 *  5. Call transitionTo('exam') — this resets scroll and shows the top bar instantly
 *  6. Call renderQuestion() inside try/catch — any render error is shown in-UI
 *
 * @param {string} examId - The exam's ID as defined in the cadeira's index.json
 */
export async function startExam(examId) {
    const examMeta = State.exams.find(e => e.id === examId);
    if (!examMeta) return;

    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <p>A carregar as perguntas do exame...</p>
        </div>
    `;

    try {
        let examData;
        if (examMeta.isLocal) {
            // Local exams already have the full perguntas array in memory
            examData = examMeta;
        } else {
            const response = await fetch(examMeta.path);
            if (!response.ok) throw new Error('Não foi possível carregar as questões deste exame.');
            examData = await response.json();
        }

        State.activeExam = {
            ...examMeta,
            perguntas: examData.perguntas
        };

        // Shuffle multiple-choice options so repeated attempts feel different
        State.activeExam.perguntas.forEach(q => shuffleQuestionOptions(q));

        // Reset per-question state for the new exam session
        State.question.index              = 0;
        State.question.selectedOptions    = [];
        State.question.revealed           = false;
        State.question.firstAttemptCorrect = {};
        State.question.writtenInput       = '';

        // Populate the exam top bar BEFORE transitionTo so it has content
        // the instant it becomes visible (the top bar lives outside #screen-exam
        // and is shown synchronously by body.layout-exam CSS).
        elements.currentExamTitle.textContent = State.activeExam.titulo;

        if (State.activeCadeira && State.activeCadeira.icon) {
            const iconEl = document.getElementById('exam-subject-icon');
            if (iconEl) iconEl.className = `fa-solid ${State.activeCadeira.icon}`;
        }

        // transitionTo('exam'):
        //   • scrolls to y=0 (so exam-top-bar at y=0 is visible)
        //   • adds body.layout-exam (shows top bar via CSS)
        //   • uses RAF to activate #screen-exam (CSS fade-in)
        transitionTo('exam');

        // Render the first question — wrapped in try/catch so a bad JSON
        // structure never leaves the user on a silent blank screen.
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
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <h3>Erro de renderização</h3>
                        <p>${renderErr.message}</p>
                    </div>`;
            }
        }

    } catch (error) {
        console.error('Error fetching exam questions:', error);
        renderExamsMenu();
        alert('Erro ao carregar o exame: ' + error.message);
    }
}
