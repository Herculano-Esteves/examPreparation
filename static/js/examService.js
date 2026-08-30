/**
 * examService.js
 * --------------
 * Dedicated service class and domain model for all exam data operations:
 * - Fetching and loading exams (remote index, full exam JSON, local storage)
 * - Normalization of multilingual fields and dual schema keys (English/Portuguese)
 * - Counting, filtering, searching and sorting of exams
 * - Option shuffling for all supported question types
 */

import { getLocalizedText, getLocalizedList } from './utils.js';
import { getQuestionTypeInfo } from './questionTypes.js';
import { QuestionStatus } from './storage.js';
import { getCurrentLanguage } from './i18n.js';
import { APP_CONFIG } from './config.js';

export class ExamService {
    /**
     * Extracts the localized title for an exam.
     * @param {object} exam
     * @param {string} [lang]
     * @returns {string}
     */
    static getTitle(exam, lang = null) {
        if (!exam) return '';
        return getLocalizedText(exam.title !== undefined ? exam.title : exam.titulo, lang);
    }

    /**
     * Extracts the localized description for an exam.
     * @param {object} exam
     * @param {string} [lang]
     * @returns {string}
     */
    static getDescription(exam, lang = null) {
        if (!exam) return '';
        return getLocalizedText(exam.description !== undefined ? exam.description : exam.descricao, lang);
    }

    /**
     * Extracts normalized supported languages array (e.g. ['en', 'pt'] or ['en']).
     * @param {object} exam
     * @returns {string[]}
     */
    static getLanguages(exam) {
        const defaultList = [APP_CONFIG.defaultLanguage];
        if (!exam) return defaultList;
        const raw = exam.languages !== undefined ? exam.languages : (exam.linguas !== undefined ? exam.linguas : (exam.lingua || exam.lang));
        if (Array.isArray(raw)) {
            const clean = raw.map(l => String(l).toLowerCase().trim()).filter(l => APP_CONFIG.supportedLanguages.includes(l));
            return clean.length > 0 ? clean : defaultList;
        }
        if (typeof raw === 'string') {
            const clean = raw.toLowerCase().trim();
            return APP_CONFIG.supportedLanguages.includes(clean) ? [clean] : defaultList;
        }
        return defaultList;
    }

    /**
     * Checks whether an exam supports a specific language.
     * @param {object} exam
     * @param {string} lang
     * @returns {boolean}
     */
    static isLanguageSupported(exam, lang = getCurrentLanguage()) {
        const langs = ExamService.getLanguages(exam);
        return langs.includes(lang);
    }

    /**
     * Returns the total number of questions in an exam.
     * @param {object} exam
     * @returns {number}
     */
    static getQuestionsCount(exam) {
        if (!exam) return 0;
        const questionsList = exam.questions || exam.perguntas;
        if (Array.isArray(questionsList)) {
            return questionsList.length;
        }
        if (typeof exam.questions_count === 'number') {
            return exam.questions_count;
        }
        if (typeof exam.perguntas_count === 'number') {
            return exam.perguntas_count;
        }
        return 0;
    }

    /**
     * Extracts question types count breakdown (e.g. { escrita: 7, boolean: 24 }).
     * @param {object} exam
     * @returns {object|null}
     */
    static getTypesCount(exam) {
        if (!exam) return null;
        if (exam.types_count && typeof exam.types_count === 'object') {
            return exam.types_count;
        }
        if (exam.tipos_contagem && typeof exam.tipos_contagem === 'object') {
            return exam.tipos_contagem;
        }
        const questionsList = exam.questions || exam.perguntas;
        if (Array.isArray(questionsList)) {
            const counts = {};
            questionsList.forEach(q => {
                const t = getQuestionTypeInfo(q.type || q.tipo).id;
                counts[t] = (counts[t] || 0) + 1;
            });
            return counts;
        }
        return null;
    }

    /**
     * Extracts the normalized list of unique question types in an exam.
     * @param {object} exam
     * @returns {string[]}
     */
    static getQuestionTypes(exam) {
        if (!exam) return ['escolha_multipla'];
        const typesList = exam.question_types || exam.tipos_perguntas;
        if (Array.isArray(typesList) && typesList.length > 0) {
            return [...new Set(typesList.map(t => getQuestionTypeInfo(t).id))];
        }
        const questionsList = exam.questions || exam.perguntas;
        if (Array.isArray(questionsList) && questionsList.length > 0) {
            return [...new Set(questionsList.map(q => getQuestionTypeInfo(q.type || q.tipo).id))];
        }
        return ['escolha_multipla'];
    }

    /**
     * Calculates total questions and active questions after applying excluded types.
     * @param {object} exam
     * @param {string[]} [excludedTypes=[]]
     * @returns {{ totalCount: number, activeCount: number }}
     */
    static getFilteredCount(exam, excludedTypes = []) {
        const totalCount = ExamService.getQuestionsCount(exam);
        if (!excludedTypes || excludedTypes.length === 0) {
            return { totalCount, activeCount: totalCount };
        }

        const typesCount = ExamService.getTypesCount(exam);
        if (typesCount) {
            let excludedSum = 0;
            excludedTypes.forEach(t => {
                excludedSum += (typesCount[t] || 0);
            });
            return {
                totalCount,
                activeCount: Math.max(0, totalCount - excludedSum)
            };
        }

        const questionsList = exam.questions || exam.perguntas;
        if (Array.isArray(questionsList)) {
            const active = questionsList.filter(q => !excludedTypes.includes(getQuestionTypeInfo(q.type || q.tipo).id)).length;
            return { totalCount, activeCount: active };
        }

        return { totalCount, activeCount: totalCount };
    }

    /**
     * Fetches exams for a subject index file and merges with local user exams.
     * @param {string} indexPath
     * @param {string} currentCadeiraId
     * @param {object[]} localExams
     * @returns {Promise<object[]>}
     */
    static async fetchExamsForSubject(indexPath, currentCadeiraId, localExams = []) {
        const response = await fetch(indexPath, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error('Não foi possível carregar os exames desta cadeira.');
        }
        const serverExams = await response.json();
        const matchingLocal = (localExams || []).filter(e => e.cadeira_id === currentCadeiraId);

        return [
            ...serverExams.map(e => ({
                ...e,
                isLocal: false,
                languages: ExamService.getLanguages(e),
                questions_count: ExamService.getQuestionsCount(e),
                question_types: ExamService.getQuestionTypes(e),
                types_count: ExamService.getTypesCount(e)
            })),
            ...matchingLocal.map(e => ({
                ...e,
                isLocal: true,
                languages: ExamService.getLanguages(e),
                questions_count: ExamService.getQuestionsCount(e),
                question_types: ExamService.getQuestionTypes(e),
                types_count: ExamService.getTypesCount(e)
            }))
        ];
    }

    /**
     * Fetches or loads full exam question data.
     * @param {object} examMeta
     * @returns {Promise<object>}
     */
    static async loadFullExam(examMeta) {
        if (!examMeta) throw new Error('Exame não encontrado.');
        if (examMeta.isLocal) {
            return examMeta;
        }
        const response = await fetch(examMeta.path, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error('Não foi possível carregar as questões deste exame.');
        }
        const examData = await response.json();
        return {
            ...examData,
            title: examData.title !== undefined ? examData.title : examData.titulo,
            description: examData.description !== undefined ? examData.description : examData.descricao,
            languages: ExamService.getLanguages(examData),
            questions: examData.questions || examData.perguntas || []
        };
    }

    /**
     * Fisher-Yates shuffle of question options across all languages.
     * Updates solution indices in-place to preserve correctness.
     * @param {object} q
     */
    static shuffleOptions(q) {
        const qType = q.type || q.tipo;
        const opts = q.options || q.opcoes;
        const sol = q.solution !== undefined ? q.solution : q.solucao;

        if (qType === 'escrita' || qType === 'boolean' || !opts) {
            return;
        }

        if (Array.isArray(opts) && opts.length > 0) {
            const isCorrect = (idx) => Array.isArray(sol) ? sol.includes(idx) : sol === idx;
            const mapped = opts.map((opcao, idx) => ({
                texto: opcao,
                eCorreta: isCorrect(idx)
            }));

            for (let i = mapped.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
            }

            const newOpts = mapped.map(item => item.texto);
            if (q.options) q.options = newOpts;
            if (q.opcoes) q.opcoes = newOpts;

            const newSol = mapped
                .map((item, idx) => item.eCorreta ? idx : -1)
                .filter(idx => idx !== -1);

            if (q.solution !== undefined) q.solution = newSol;
            if (q.solucao !== undefined) q.solucao = newSol;
        } else if (typeof opts === 'object') {
            const langKeys = Object.keys(opts);
            const firstLang = langKeys[0];
            const len = opts[firstLang] ? opts[firstLang].length : 0;
            if (len === 0) return;

            const isCorrect = (idx) => Array.isArray(sol) ? sol.includes(idx) : sol === idx;
            const indices = Array.from({ length: len }, (_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }

            langKeys.forEach(k => {
                if (Array.isArray(opts[k])) {
                    opts[k] = indices.map(origIdx => opts[k][origIdx]);
                }
            });

            const newSol = indices
                .map((origIdx, newIdx) => isCorrect(origIdx) ? newIdx : -1)
                .filter(idx => idx !== -1);

            if (q.solution !== undefined) q.solution = newSol;
            if (q.solucao !== undefined) q.solucao = newSol;
        }
    }
}
