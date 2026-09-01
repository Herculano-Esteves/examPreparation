/**
 * navigation.js
 * -------------
 * Controls screen transitions for the Single-Page Application.
 * Emits APP_EVENTS.SCREEN_CHANGED via the Event Bus so screens self-initialize
 * without creating circular dependencies between navigation, exams, and cadeiras.
 */

import { State } from './state.js';
import { elements } from './elements.js';
import { clampCardDescriptions } from './utils.js';
import { renderMath } from './renderer.js';
import { Events, APP_EVENTS } from './events.js';

/**
 * Transition to a named screen, handling layout class changes and scroll reset.
 *
 * @param {'cadeiras'|'menu'|'exam'|'results'|'addCadeira'|'addExame'|'settings'} screenName
 */
export function transitionTo(screenName) {
    const previousScreen = State.currentScreen;
    const activeScreen = document.querySelector('.screen.active');
    const leavingExam = document.body.classList.contains('layout-exam');
    const examTopBar = document.getElementById('exam-top-bar');
    const examSubBar = document.getElementById('exam-sub-bar');

    // Fallback if menu is requested without an active subject
    if (screenName === 'menu' && !State.activeCadeira) {
        screenName = 'cadeiras';
    }

    if (activeScreen) {
        activeScreen.classList.remove('active');
    }

    if (screenName === 'exam') {
        window.scrollTo(0, 0);
        document.body.classList.add('layout-exam');
        if (examTopBar) examTopBar.removeAttribute('aria-hidden');
        if (examSubBar) examSubBar.removeAttribute('aria-hidden');
    } else {
        document.body.classList.remove('layout-exam');
        if (examTopBar) examTopBar.setAttribute('aria-hidden', 'true');
        if (examSubBar) examSubBar.setAttribute('aria-hidden', 'true');
        if (leavingExam) {
            window.scrollTo(0, 0);
        }
    }

    const actualTargetScreen = elements.screens[screenName];
    if (actualTargetScreen) {
        actualTargetScreen.classList.add('active');
    }
    State.currentScreen = screenName;

    // Notify all subscribers of the screen transition synchronously
    Events.emit(APP_EVENTS.SCREEN_CHANGED, { from: previousScreen, to: screenName });

    // Defer visual measurements and KaTeX rendering to next animation frame
    requestAnimationFrame(() => {
        if (screenName === 'cadeiras' && elements.cadeirasGrid) {
            clampCardDescriptions(elements.cadeirasGrid);
        } else if (screenName === 'menu' && elements.examsGrid) {
            clampCardDescriptions(elements.examsGrid);
        }

        renderMath();
    });
}
