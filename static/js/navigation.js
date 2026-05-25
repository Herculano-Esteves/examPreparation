/**
 * navigation.js
 * -------------
 * Controls all screen transitions for the single-page application.
 *
 * Design decisions:
 * - layout-exam is applied SYNCHRONOUSLY (before RAF) so the exam-top-bar
 *   (which lives outside #screen-exam in the DOM) appears via CSS the instant
 *   the class is set — no timer dependency.
 * - window.scrollTo(0, 0) is called BEFORE body.layout-exam is applied when
 *   entering exam mode. overflow:hidden blocks future scroll but does NOT
 *   reset the current scroll offset; without this reset, the exam-top-bar
 *   (at y=0) would be above the viewport if the page was scrolled down.
 * - requestAnimationFrame (not setTimeout) is used for the .active class
 *   toggle so it is always synchronised with the browser's render pipeline.
 * - KaTeX rendering is wrapped in try/catch so a bad equation never crashes
 *   the whole navigation flow.
 *
 * Circular imports: navigation.js ↔ cadeiras.js and navigation.js ↔ exams.js.
 * This is intentional and safe in ES modules because both sides export named
 * functions (live bindings), which are always resolved before any code runs.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { fetchExams } from './exams.js';
import { renderCadeirasMenu } from './cadeiras.js';

/**
 * Transition to a named screen, handling layout class changes and scroll reset.
 *
 * @param {'cadeiras'|'menu'|'exam'|'results'|'addCadeira'|'addExame'|'settings'} screenName
 */
export function transitionTo(screenName) {
    const activeScreen = document.querySelector('.screen.active');
    const leavingExam  = document.body.classList.contains('layout-exam');
    const examTopBar   = document.getElementById('exam-top-bar');

    // Deactivate the current screen immediately (CSS transition handles fade-out)
    if (activeScreen) {
        activeScreen.classList.remove('active');
    }

    // --- Resolve final screenName ---
    // 'menu' redirects to 'cadeiras' when no cadeira is selected.
    if (screenName === 'menu') {
        if (State.activeCadeira) {
            fetchExams(State.activeCadeira.index_path);
        } else {
            screenName = 'cadeiras';
        }
    } else if (screenName === 'cadeiras') {
        renderCadeirasMenu();
        document.getElementById('app-logo-icon').className = 'fa-solid fa-graduation-cap app-logo-icon';
        document.getElementById('app-main-title').textContent = 'Simulador de Exames';
        document.getElementById('app-subtitle').textContent = 'Ensino Superior';
    }

    // --- Apply / remove layout-exam class SYNCHRONOUSLY ---
    if (screenName === 'exam') {
        // CRITICAL: reset scroll BEFORE applying layout-exam.
        // overflow:hidden blocks future scrolling but does NOT move the viewport
        // back to y=0. Without this, the exam-top-bar (at y=0 in the DOM) is
        // invisible when the user opens an exam with the page scrolled down.
        window.scrollTo(0, 0);

        document.body.classList.add('layout-exam');
        if (examTopBar) examTopBar.removeAttribute('aria-hidden');
    } else {
        document.body.classList.remove('layout-exam');
        if (examTopBar) examTopBar.setAttribute('aria-hidden', 'true');
        // Restore scroll position after leaving exam (body had overflow:hidden)
        if (leavingExam) {
            window.scrollTo(0, 0);
        }
    }

    // Resolve the target screen AFTER screenName may have been rewritten above
    const actualTargetScreen = elements.screens[screenName];

    // --- Activate target screen via requestAnimationFrame ---
    // RAF fires before the next browser paint, guaranteeing the CSS
    // opacity/transform transition triggers correctly after the display change.
    requestAnimationFrame(() => {
        if (actualTargetScreen) {
            actualTargetScreen.classList.add('active');
        }
        State.currentScreen = screenName;

        // Re-render KaTeX equations on the newly visible screen
        if (typeof renderMathInElement === 'function') {
            try {
                const container =
                    document.querySelector('.exam-split-container') ||
                    document.querySelector('.question-card') ||
                    document.body;
                renderMathInElement(container, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$',  right: '$',  display: false }
                    ],
                    throwOnError: false
                });
            } catch (mathErr) {
                console.error('Erro ao renderizar equações matemáticas:', mathErr);
            }
        }
    });
}
