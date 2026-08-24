/**
 * exams.js
 * --------
 * Manages fetching, rendering, and starting exams for the active cadeira.
 * Clean card layout with Title first, description underneath, and question count at the bottom.
 * Full WCAG 2.1 AA / EAA 2025 keyboard accessibility.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { escapeHTML, clampCardDescriptions } from './utils.js';
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
            <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
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

    loadLocalData(State);
    const activeCadeiraId = State.activeCadeira ? State.activeCadeira.id : null;
    const filteredLocalExames = State.localExames.filter(e => e.cadeira_id === activeCadeiraId);

    State.exams = [...serverExams, ...filteredLocalExames];
    renderExamsMenu();
}

/**
 * Render the exams grid from State.exams.
 * Direct layout: Title on top, description underneath, badge/action at the bottom.
 */
export function renderExamsMenu() {
    elements.examsGrid.innerHTML = '';

    State.exams.forEach(exam => {
        const row = document.createElement('div');
        row.className = 'exam-list-row';
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `Iniciar exame ${exam.titulo}`);

        const qCount = exam.perguntas
            ? exam.perguntas.length
            : (exam.perguntas_count || 0);

        const countLabel = qCount === 1 ? '1 questão' : `${qCount} questões`;

        row.innerHTML = `
            <div class="exam-list-header">
                <h4 class="exam-list-title">${escapeHTML(exam.titulo.toUpperCase())}${exam.isLocal ? ' <span class="badge-local">Local</span>' : ''}</h4>
                <span class="exam-list-action">[ ${countLabel} ]</span>
            </div>
            <p class="exam-list-desc">${escapeHTML(exam.descricao)}</p>
        `;

        const activate = () => startExam(exam.id);
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
 * Load a full exam's question data, shuffle options, and transition to the exam screen.
 *
 * @param {string} examId - The exam's ID as defined in the cadeira's index.json
 */
export async function startExam(examId) {
    const examMeta = State.exams.find(e => e.id === examId);
    if (!examMeta) return;

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

        State.activeExam = {
            ...examMeta,
            perguntas: examData.perguntas
        };

        State.activeExam.perguntas.forEach(q => shuffleQuestionOptions(q));

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
