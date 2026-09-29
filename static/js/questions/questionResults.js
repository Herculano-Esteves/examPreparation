/**
 * questionResults.js
 * -------------------
 * Calculates exam statistics, score percentages, updates final status in storage,
 * and handles transitions to the results screen.
 */

import { State } from '../state.js';
import { elements } from '../elements.js';
import { QuestionStatus, updateQuestionStatus } from '../storage.js';
import { transitionTo } from '../navigation.js';
import { Events, APP_EVENTS } from '../events.js';

/**
 * End the exam, calculate percentage and breakdown, and transition to the results screen.
 */
export function showResults() {
    elements.resultsExamTitle.textContent = State.activeExam ? State.activeExam.titulo : '';

    const total = State.totalQuestions;
    const answers = State.examAnswers || [];

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (let i = 0; i < total; i++) {
        const ans = answers[i];
        if (!ans || !ans.revealed) {
            unanswered++;
        } else if (ans.isCorrect === true) {
            correct++;
        } else {
            incorrect++;
        }
    }

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Atualizar visualização da percentagem
    if (elements.resultsScorePercentage) {
        elements.resultsScorePercentage.textContent = `${percentage}%`;
        elements.resultsScorePercentage.className = 'results-score-percentage';
        if (percentage >= 70) {
            elements.resultsScorePercentage.classList.add('score-high');
        } else if (percentage >= 50) {
            elements.resultsScorePercentage.classList.add('score-medium');
        } else {
            elements.resultsScorePercentage.classList.add('score-low');
        }
    }

    // Atualizar contadores
    if (elements.resultsCorrectCount) elements.resultsCorrectCount.textContent = correct;
    if (elements.resultsIncorrectCount) elements.resultsIncorrectCount.textContent = incorrect;
    if (elements.resultsUnansweredCount) elements.resultsUnansweredCount.textContent = unanswered;

    // Sincronizar array de respostas do exame completo no localStorage
    const questionsList = State.activeExam ? (State.activeExam.questions || State.activeExam.perguntas || []) : [];
    if (State.activeExam && State.activeExam.id && Array.isArray(questionsList)) {
        questionsList.forEach((q, idx) => {
            const ans = answers[idx];
            const origIdx = (q._origIndex !== undefined) ? q._origIndex : idx;
            let status = QuestionStatus.UNANSWERED;
            if (ans && ans.revealed) {
                if (ans.isCorrect === true) status = QuestionStatus.CORRECT;
                else if (ans.isCorrect === false) status = QuestionStatus.INCORRECT;
                else status = QuestionStatus.ANSWERED;
            }
            const targetExamId = q._sourceExamId || State.activeExam.id;
            updateQuestionStatus(targetExamId, origIdx, status, State, State.totalQuestions);
        });
    }

    Events.emit(APP_EVENTS.EXAM_FINISHED, {
        exam: State.activeExam,
        results: { total, correct, incorrect, unanswered, percentage }
    });

    transitionTo('results');
}
