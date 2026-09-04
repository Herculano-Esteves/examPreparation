/**
 * examCard.js
 * -----------
 * Renders individual exam card components, score badges, language flags,
 * question type segment buttons (capsules), and handles card-level events.
 */

import { State } from './state.js';
import { escapeHTML, showToast } from './utils.js';
import { QuestionStatus } from './storage.js';
import { getQuestionTypeInfo, renderQuestionTypeTagsHTML } from './questionTypes.js';
import { t, getCurrentLanguage } from './i18n.js';
import { ExamService } from './examService.js';
import { getEffectiveExcludedTypes } from './examFilters.js';

/**
 * Generates the score percentage badge HTML for an exam based on its saved question status array.
 *
 * @param {string} examId
 * @returns {string} HTML string of the score badge, or empty string if no questions answered
 */
export function renderExamScoreBadgeHTML(examId) {
    if (!State.examHistory) return '';
    let histArr = State.examHistory[examId];
    if (!histArr) return '';

    if (!Array.isArray(histArr) && typeof histArr === 'object' && Array.isArray(histArr.questions)) {
        histArr = histArr.questions.map(q => {
            if (q.status === 'correct' || q.isCorrect === true) return QuestionStatus.CORRECT;
            if (q.status === 'incorrect' || q.isCorrect === false) return QuestionStatus.INCORRECT;
            return QuestionStatus.UNANSWERED;
        });
        State.examHistory[examId] = histArr;
    }

    if (!Array.isArray(histArr) || histArr.length === 0) return '';

    const total = histArr.length;
    const correctCount = histArr.filter(s => s === QuestionStatus.CORRECT).length;
    const incorrectCount = histArr.filter(s => s === QuestionStatus.INCORRECT).length;
    const answeredCount = histArr.filter(s => s === QuestionStatus.ANSWERED).length;
    const unansweredCount = histArr.filter(s => s === QuestionStatus.UNANSWERED || s === 0 || !s).length;

    if (correctCount === 0 && incorrectCount === 0 && answeredCount === 0) return '';

    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    let badgeClass = 'score-badge-low';
    let iconClass = 'fa-circle-xmark';

    if (pct >= 70) {
        badgeClass = 'score-badge-high';
        iconClass = 'fa-circle-check';
    } else if (pct >= 50) {
        badgeClass = 'score-badge-medium';
        iconClass = 'fa-circle-exclamation';
    }

    let titleParts = [`${correctCount} corretas`, `${incorrectCount} erradas`];
    if (answeredCount > 0) {
        titleParts.push(`${answeredCount} respondidas (não avaliadas)`);
    }
    titleParts.push(`${unansweredCount} por fazer`);
    const title = `Aproveitamento: ${pct}% (${titleParts.join(', ')})`;

    return `
        <span class="exam-score-badge ${badgeClass}" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}">
            <i class="fa-solid ${iconClass}" aria-hidden="true"></i>
            <span>${pct}%</span>
        </span>
    `;
}

/**
 * Updates the action counter and capsule button states for a specific exam row.
 *
 * @param {HTMLElement} row
 * @param {object} exam
 */
export function updateExamRowUI(row, exam) {
    const excluded = getEffectiveExcludedTypes(exam);
    const { totalCount, activeCount } = ExamService.getFilteredCount(exam, excluded);

    const actionEl = row.querySelector('.exam-list-action');
    if (actionEl) {
        const totalLabel = totalCount === 1 ? t('question_singular') : t('question_plural', { count: totalCount });
        if (activeCount === totalCount) {
            actionEl.innerHTML = `[ ${totalLabel} ]`;
        } else {
            const activeLabel = activeCount === 1 ? t('question_singular') : t('question_plural', { count: activeCount });
            actionEl.innerHTML = `[ <s class="count-old">${totalCount}</s> <span class="count-new ${activeCount === 0 ? 'count-zero' : ''}">${activeLabel}</span> ]`;
        }
    }

    row.querySelectorAll('.exam-type-segment').forEach(btn => {
        const typeId = btn.getAttribute('data-type');
        const isExcluded = excluded.includes(typeId);
        const info = getQuestionTypeInfo(typeId);
        const label = info.shortLabel || info.label;

        const actionHTML = isExcluded
            ? `<span class="chip-action-bubble" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>`
            : `<span class="chip-action-bubble" aria-hidden="true"><i class="fa-solid fa-xmark"></i></span>`;

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

        btn.innerHTML = `
            <i class="fa-solid ${info.icon} chip-type-icon" aria-hidden="true"></i>
            <span class="type-segment-text">${escapeHTML(label)}</span>
            ${actionHTML}
        `;
    });
}

/**
 * Creates and returns the DOM element for an exam row card.
 *
 * @param {object} exam - Prepared exam object with _questionTypes, _effectiveExcluded, _totalCount, _activeCount
 * @param {Function} onStartExam - Callback when user triggers start of the exam
 * @returns {HTMLElement}
 */
export function createExamCardElement(exam, onStartExam) {
    const row = document.createElement('div');
    row.className = 'exam-list-row';
    row.setAttribute('tabindex', '0');
    row.setAttribute('role', 'button');

    const settingsLang = getCurrentLanguage();
    const languages = ExamService.getLanguages(exam);

    // 1. Determina o idioma em que o exame está a ser apresentado
    let displayLang = settingsLang;
    if (State.examLanguageFilter?.length === 1) {
        displayLang = State.examLanguageFilter[0];
    } else if (!languages.includes(settingsLang)) {
        displayLang = languages[0] || 'pt';
    }

    // 2. Título e Descrição localizados
    const localizedTitle = ExamService.getTitle(exam, displayLang);
    const localizedDesc = ExamService.getDescription(exam, displayLang);
    row.setAttribute('aria-label', t('aria_start_exam', { title: localizedTitle }));

    const typesHTML = renderQuestionTypeTagsHTML(exam._questionTypes, exam._effectiveExcluded);

    const totalLabel = exam._totalCount === 1 ? t('question_singular') : t('question_plural', { count: exam._totalCount });
    let actionHTML = `[ ${totalLabel} ]`;

    if (exam._activeCount < exam._totalCount) {
        const activeLabel = exam._activeCount === 1 ? t('question_singular') : t('question_plural', { count: exam._activeCount });
        actionHTML = `[ <s class="count-old">${exam._totalCount}</s> <span class="count-new ${exam._activeCount === 0 ? 'count-zero' : ''}">${activeLabel}</span> ]`;
    }

    const scoreBadgeHTML = renderExamScoreBadgeHTML(exam.id);

    // 3. Regra da Bandeira: Se o que está à mostra é da língua das definições não aparece nada, se for outra aparece a bandeira dela
    let flagBadgeHTML = '';
    if (displayLang !== settingsLang) {
        const flagEmoji = displayLang === 'en' ? '🇬🇧' : '🇵🇹';
        const flagTitle = displayLang === 'en' ? t('flag_title_en') : t('flag_title_pt');
        flagBadgeHTML = `<span class="exam-lang-flag" title="${flagTitle}" aria-label="${flagTitle}">${flagEmoji}</span>`;
    }

    row.innerHTML = `
        <div class="exam-list-header">
            <h4 class="exam-list-title">${escapeHTML(localizedTitle.toUpperCase())}${exam.isLocal ? ` <span class="badge-local">${escapeHTML(t('badge_local'))}</span>` : ''}</h4>
            <div class="exam-list-header-right">
                ${scoreBadgeHTML}
                ${flagBadgeHTML}
                <span class="exam-list-action">${actionHTML}</span>
            </div>
        </div>
        ${typesHTML}
        <p class="exam-list-desc">${escapeHTML(localizedDesc)}</p>
    `;

    // Capsule toggle events
    row.querySelectorAll('.exam-type-segment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
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
        const currentExcluded = getEffectiveExcludedTypes(exam);
        const countInfo = ExamService.getFilteredCount(exam, currentExcluded);
        if (countInfo.activeCount === 0) {
            showToast(t('toast_error_all_excluded'));
            row.classList.add('row-shake-error');
            setTimeout(() => row.classList.remove('row-shake-error'), 450);
            return;
        }
        if (onStartExam) onStartExam(exam.id);
    };

    row.addEventListener('click', activate);
    row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
        }
    });

    return row;
}
