/**
 * navigation.js
 * -------------
 * Controls all screen transitions for the single-page application.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { fetchExams } from './exams.js';
import { renderCadeirasMenu } from './cadeiras.js';
import { clampCardDescriptions } from './utils.js';

/**
 * Transition to a named screen, handling layout class changes and scroll reset.
 *
 * @param {'cadeiras'|'menu'|'exam'|'results'|'addCadeira'|'addExame'|'settings'} screenName
 */
export function transitionTo(screenName) {
    const activeScreen = document.querySelector('.screen.active');
    const leavingExam = document.body.classList.contains('layout-exam');
    const examTopBar = document.getElementById('exam-top-bar');

    if (activeScreen) {
        activeScreen.classList.remove('active');
    }

    if (screenName === 'menu') {
        if (State.activeCadeira) {
            fetchExams(State.activeCadeira.index_path);
        } else {
            screenName = 'cadeiras';
        }
    } else if (screenName === 'cadeiras') {
        renderCadeirasMenu();
        const logoIcon = document.getElementById('app-logo-icon');
        if (logoIcon) logoIcon.className = 'fa-solid fa-graduation-cap app-logo-icon';

        const mainTitle = document.getElementById('app-main-title');
        if (mainTitle) mainTitle.textContent = 'Simulador de Exames';

        const subtitleEl = document.getElementById('app-subtitle');
        if (subtitleEl) {
            subtitleEl.innerHTML = `<span class="status-dot" aria-hidden="true"></span> SISTEMA DE EXAMES`;
        }
    }

    if (screenName === 'exam') {
        window.scrollTo(0, 0);
        document.body.classList.add('layout-exam');
        if (examTopBar) examTopBar.removeAttribute('aria-hidden');
    } else {
        document.body.classList.remove('layout-exam');
        if (examTopBar) examTopBar.setAttribute('aria-hidden', 'true');
        if (leavingExam) {
            window.scrollTo(0, 0);
        }
    }

    const actualTargetScreen = elements.screens[screenName];

    requestAnimationFrame(() => {
        if (actualTargetScreen) {
            actualTargetScreen.classList.add('active');
        }
        State.currentScreen = screenName;

        if (screenName === 'cadeiras') {
            clampCardDescriptions(elements.cadeirasGrid);
        } else if (screenName === 'menu') {
            clampCardDescriptions(elements.examsGrid);
        }

        if (typeof renderMathInElement === 'function') {
            try {
                const container =
                    document.querySelector('.exam-split-container') ||
                    document.querySelector('.question-card') ||
                    document.body;
                renderMathInElement(container, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false }
                    ],
                    throwOnError: false
                });
            } catch (mathErr) {
                console.error('Erro ao renderizar equações matemáticas:', mathErr);
            }
        }
    });
}
