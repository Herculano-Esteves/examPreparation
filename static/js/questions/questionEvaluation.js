/**
 * questionEvaluation.js
 * --------------------
 * Handles option selection toggles, answer confirmation, score evaluation,
 * and written self-assessment.
 */

import { State } from '../state.js';
import { QuestionStatus, updateQuestionStatus } from '../storage.js';
import { showToast, NotificationType } from '../utils.js';
import { t } from '../i18n.js';
import { renderQuestion } from '../question.js';

/**
 * Toggle selection of an option for multiple-choice / boolean questions.
 * @param {number} optionIndex
 */
export function selectOption(optionIndex) {
    if (State.question.revealed) return;
    const q = State.currentQuestion;
    if (!q) return;

    if ((q.type || q.tipo) === 'boolean') {
        State.question.selectedOptions = [optionIndex];
    } else {
        const pos = State.question.selectedOptions.indexOf(optionIndex);
        if (pos > -1) {
            State.question.selectedOptions.splice(pos, 1);
        } else {
            State.question.selectedOptions.push(optionIndex);
        }
    }

    // Guardar seleção em memória
    if (State.examAnswers && State.examAnswers[State.question.index]) {
        State.examAnswers[State.question.index].selectedOptions = [...State.question.selectedOptions];
    }

    renderQuestion();
}

/**
 * Confirm the selected answer(s) for a multiple-choice / boolean question.
 */
export function confirmMultipleChoiceAnswer() {
    if (State.question.revealed) return;
    const q = State.currentQuestion;
    if (!q) return;

    State.question.revealed = true;

    const selected    = State.question.selectedOptions;
    const rawSolution = q.solution !== undefined ? q.solution : q.solucao;
    const correctList = Array.isArray(rawSolution) ? rawSolution : [rawSolution];
    const isCorrect   = selected.length === correctList.length &&
                        selected.every(val => correctList.includes(val));

    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = isCorrect;
    }

    // Guardar estado de confirmação e resultado em memória
    if (State.examAnswers && State.examAnswers[State.question.index]) {
        State.examAnswers[State.question.index].revealed = true;
        State.examAnswers[State.question.index].isCorrect = isCorrect;
        State.examAnswers[State.question.index].selectedOptions = [...selected];
    }

    // Atualizar resultado desta pergunta em tempo real no localStorage
    if (State.activeExam && State.activeExam.id) {
        const targetExamId = q._sourceExamId || State.activeExam.id;
        const origIdx = (q._origIndex !== undefined) ? q._origIndex : State.question.index;
        const status = isCorrect ? QuestionStatus.CORRECT : QuestionStatus.INCORRECT;
        updateQuestionStatus(targetExamId, origIdx, status, State, State.totalQuestions);
    }

    renderQuestion();
}

/**
 * Reveal the expected answer for an essay question.
 */
export function revealWrittenAnswer() {
    State.question.revealed = true;
    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = null;
    }

    if (State.examAnswers && State.examAnswers[State.question.index]) {
        State.examAnswers[State.question.index].revealed = true;
        if (State.examAnswers[State.question.index].isCorrect === undefined) {
            State.examAnswers[State.question.index].isCorrect = null;
        }
    }

    // Atualizar resultado desta pergunta aberta em tempo real no localStorage como ANSWERED (4)
    if (State.activeExam && State.activeExam.id) {
        const q = State.currentQuestion;
        const targetExamId = (q && q._sourceExamId) ? q._sourceExamId : State.activeExam.id;
        const origIdx = (q && q._origIndex !== undefined) ? q._origIndex : State.question.index;
        const ans = State.examAnswers ? State.examAnswers[State.question.index] : null;
        let status = QuestionStatus.ANSWERED;
        if (ans && ans.isCorrect === true) status = QuestionStatus.CORRECT;
        else if (ans && ans.isCorrect === false) status = QuestionStatus.INCORRECT;

        updateQuestionStatus(targetExamId, origIdx, status, State, State.totalQuestions);
    }

    renderQuestion();
}

/**
 * Self-assess a written question answer as correct (true) or incorrect (false).
 * @param {boolean} isCorrect
 */
export function assessWrittenAnswer(isCorrect) {
    if (!State.activeExam) return;
    const q = State.currentQuestion;
    if (!q) return;

    if (State.examAnswers && State.examAnswers[State.question.index]) {
        State.examAnswers[State.question.index].isCorrect = isCorrect;
    }

    if (State.question.firstAttemptCorrect[State.question.index] === undefined || State.question.firstAttemptCorrect[State.question.index] === null) {
        State.question.firstAttemptCorrect[State.question.index] = isCorrect;
    }

    const targetExamId = q._sourceExamId || State.activeExam.id;
    const origIdx = (q._origIndex !== undefined) ? q._origIndex : State.question.index;
    const status = isCorrect ? QuestionStatus.CORRECT : QuestionStatus.INCORRECT;
    updateQuestionStatus(targetExamId, origIdx, status, State, State.totalQuestions);

    if (isCorrect) {
        showToast(t('toast_assessed_correct'), NotificationType.SUCCESS);
    } else {
        showToast(t('toast_assessed_incorrect'), NotificationType.INFO);
    }

    renderQuestion();
}
