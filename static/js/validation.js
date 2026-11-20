/**
 * validation.js
 * -------------
 * Validates and normalizes exam JSON definitions against the schema.
 * Supports English properties ('title', 'description', 'languages', 'questions', 'type',
 * 'question', 'options', 'solution', 'explanation', 'header') and multilingual field objects
 * (e.g., { pt: '...', en: '...' }), with full backwards-compatibility for legacy Portuguese keys.
 */

import { APP_CONFIG, resolveQuestionType } from './config.js';

export function validateExamJSON(jsonString) {
    try {
        const raw = JSON.parse(jsonString);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return { valid: false, message: "O JSON raiz deve ser um objeto {...}." };
        }

        const title = raw.title !== undefined ? raw.title : raw.titulo;
        if (!title || (typeof title !== 'string' && typeof title !== 'object')) {
            return { valid: false, message: "O JSON deve conter um campo 'title' (string ou objeto multilingue)." };
        }

        const description = raw.description !== undefined ? raw.description : raw.descricao;
        if (!description || (typeof description !== 'string' && typeof description !== 'object')) {
            return { valid: false, message: "O JSON deve conter um campo 'description' (string ou objeto multilingue)." };
        }

        // Normalize languages array
        let rawLanguages = raw.languages !== undefined ? raw.languages : (raw.linguas !== undefined ? raw.linguas : (raw.lingua || raw.lang));
        let languages = [APP_CONFIG.defaultLanguage];
        if (Array.isArray(rawLanguages)) {
            languages = rawLanguages.map(l => String(l).toLowerCase().trim()).filter(l => APP_CONFIG.supportedLanguages.includes(l));
            if (languages.length === 0) languages = [APP_CONFIG.defaultLanguage];
        } else if (typeof rawLanguages === 'string') {
            const l = rawLanguages.toLowerCase().trim();
            languages = APP_CONFIG.supportedLanguages.includes(l) ? [l] : [APP_CONFIG.defaultLanguage];
        }

        const isBilingual = languages.length > 1;

        const rawQuestions = raw.questions !== undefined ? raw.questions : raw.perguntas;
        if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
            return { valid: false, message: "O JSON deve conter um array 'questions' não vazio." };
        }

        const normalizedQuestions = [];

        for (let i = 0; i < rawQuestions.length; i++) {
            const p = rawQuestions[i];
            const qNum = i + 1;

            if (!p || typeof p !== 'object') {
                return { valid: false, message: `Questão #${qNum}: Deve ser um objeto {...}.` };
            }

            const rawType = p.type || p.tipo;
            const qType = resolveQuestionType(rawType);
            if (!qType) {
                return {
                    valid: false,
                    message: `Question #${qNum}: Invalid type '${rawType}'. Use '${APP_CONFIG.questionTypes.MULTIPLE_CHOICE}', '${APP_CONFIG.questionTypes.BOOLEAN}' or '${APP_CONFIG.questionTypes.WRITTEN}'.`
                };
            }
            const qText = p.question !== undefined ? p.question : p.pergunta;

            if (!qText) {
                return { valid: false, message: `Questão #${qNum}: Falta o campo 'question'.` };
            }

            if (typeof qText === 'object') {
                for (let lang of languages) {
                    if (!qText[lang] || typeof qText[lang] !== 'string') {
                        return { valid: false, message: `Questão #${qNum}: Falta o texto da pergunta no idioma '${lang}'.` };
                    }
                }
            } else if (typeof qText !== 'string') {
                return { valid: false, message: `Questão #${qNum}: O campo 'question' deve ser uma string ou objeto com os idiomas.` };
            }

            const qSolution = p.solution !== undefined ? p.solution : p.solucao;
            const qOptions = p.options !== undefined ? p.options : p.opcoes;
            const qExplanation = p.explanation !== undefined ? p.explanation : p.explicacao;
            const qHeader = p.header !== undefined ? p.header : p.cabecalho;

            const normalizedQ = {
                type: qType,
                question: qText
            };

            if (qHeader !== undefined) {
                normalizedQ.header = qHeader;
            }

            const { MULTIPLE_CHOICE, BOOLEAN, WRITTEN } = APP_CONFIG.questionTypes;

            if (qType === WRITTEN) {
                if (qSolution === undefined) {
                    return { valid: false, message: `Question #${qNum} (${WRITTEN}): 'solution' is required.` };
                }
                if (typeof qSolution === 'object') {
                    for (let lang of languages) {
                        if (!qSolution[lang] || typeof qSolution[lang] !== 'string') {
                            return { valid: false, message: `Question #${qNum} (${WRITTEN}): Missing expected solution for language '${lang}'.` };
                        }
                    }
                } else if (typeof qSolution !== 'string') {
                    return { valid: false, message: `Question #${qNum} (${WRITTEN}): 'solution' must be a string or an object of solutions per language.` };
                }
                normalizedQ.solution = qSolution;
            } else if (qType === BOOLEAN) {
                if (qSolution === undefined || (qSolution !== 0 && qSolution !== 1)) {
                    return { valid: false, message: `Question #${qNum} (${BOOLEAN}): 'solution' must be 0 (True) or 1 (False).` };
                }
                normalizedQ.solution = qSolution;
            } else if (qType === MULTIPLE_CHOICE) {
                if (!qOptions) {
                    return { valid: false, message: `Question #${qNum} (${MULTIPLE_CHOICE}): 'options' field is required.` };
                }

                let optLength = 0;
                if (Array.isArray(qOptions)) {
                    if (qOptions.length === 0) {
                        return { valid: false, message: `Question #${qNum}: 'options' array cannot be empty.` };
                    }
                    optLength = qOptions.length;
                } else if (typeof qOptions === 'object') {
                    for (let lang of languages) {
                        if (!Array.isArray(qOptions[lang]) || qOptions[lang].length === 0) {
                            return { valid: false, message: `Question #${qNum}: Missing 'options' array for language '${lang}'.` };
                        }
                    }
                    optLength = qOptions[languages[0]].length;
                } else {
                    return { valid: false, message: `Question #${qNum}: 'options' must be an array or an object of options per language.` };
                }

                normalizedQ.options = qOptions;

                if (!qSolution || !Array.isArray(qSolution) || qSolution.length === 0) {
                    return { valid: false, message: `Question #${qNum} (${MULTIPLE_CHOICE}): 'solution' must be an array of correct answer indices (e.g., [0]).` };
                }

                for (let s of qSolution) {
                    if (typeof s !== 'number' || s < 0 || s >= optLength) {
                        return { valid: false, message: `Question #${qNum}: Solution index ${s} is out of bounds for options (0 to ${optLength - 1}).` };
                    }
                }
                normalizedQ.solution = qSolution;
            }

            if (qExplanation !== undefined) {
                normalizedQ.explanation = qExplanation;
            }

            normalizedQuestions.push(normalizedQ);
        }

        const normalizedExam = {
            title: title,
            description: description,
            languages: languages,
            questions: normalizedQuestions
        };

        return { valid: true, data: normalizedExam };
    } catch (e) {
        let lineNum = 1;
        let charNum = 1;
        let position = -1;
        
        const posMatch = e.message.match(/position\s+(\d+)/i);
        const lineColMatch = e.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
        
        if (lineColMatch) {
            lineNum = parseInt(lineColMatch[1], 10);
            charNum = parseInt(lineColMatch[2], 10);
        } else if (posMatch) {
            position = parseInt(posMatch[1], 10);
            const lines = jsonString.slice(0, position).split('\n');
            lineNum = lines.length;
            charNum = lines[lines.length - 1].length + 1;
        } else {
            for (let i = 1; i <= jsonString.length; i++) {
                try {
                    JSON.parse(jsonString.slice(0, i));
                } catch (tempErr) {
                    if (!tempErr.message.includes('end of JSON') && !tempErr.message.includes('EOF')) {
                        const lines = jsonString.slice(0, i).split('\n');
                        lineNum = lines.length;
                        charNum = lines[lines.length - 1].length;
                        break;
                    }
                }
            }
        }
        
        return {
            valid: false,
            message: `Erro de sintaxe JSON: ${e.message}`,
            line: lineNum,
            column: charNum
        };
    }
}
