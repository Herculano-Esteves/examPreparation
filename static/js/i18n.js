/**
 * i18n.js
 * -------
 * Centralized Internationalisation module supporting Portuguese (PT)
 * and British English (EN-GB).
 */

import { State } from './state.js';
import { APP_CONFIG, getInitialLanguage, persistLanguage, isLanguageSupported } from './config.js';

export const TRANSLATIONS = {
    pt: {
        // App Header
        app_title: 'Simulador de Exames',
        app_subtitle: 'SISTEMA DE EXAMES',
        app_subtitle_with_sigla: 'SISTEMA DE EXAMES | {sigla}',
        btn_settings: 'Definições',

        // Exam Top Bar
        question_counter: 'Questão {current} de {total}',
        loading_question: 'A carregar pergunta...',

        // Cadeiras Screen
        select_cadeira: 'Selecione uma Cadeira',
        search_cadeiras_placeholder: 'Pesquisar cadeira...',
        btn_add_cadeira: 'Adicionar Cadeira',
        loading_cadeiras: 'A carregar cadeiras...',
        exam_singular: '1 exame',
        exam_plural: '{count} exames',
        aria_select_cadeira: 'Selecionar cadeira {name}',
        empty_cadeiras_title: 'Nenhuma cadeira disponível',
        empty_cadeiras_desc: 'Adicione uma cadeira no botão acima ou configure o ficheiro \'exames/cadeiras.json\'.',
        empty_search_cadeiras_title: 'Nenhuma cadeira encontrada',
        empty_search_cadeiras_desc: 'Nenhuma cadeira corresponde à pesquisa "{query}".',
        btn_clear_search: 'Limpar Pesquisa',

        // Menu Screen (Exams list)
        btn_back_cadeiras: 'Voltar às Cadeiras',
        select_exame: 'Selecione um Exame',
        search_exams_placeholder: 'Pesquisar exame...',
        btn_add_exame: 'Adicionar Exame',
        loading_exams: 'A carregar exames...',

        // Sidebar Filters & Sort
        filter_sort: 'Ordenar',
        sort_default: 'Ordem Padrão',
        sort_score_desc: 'Melhor Classificação',
        sort_score_asc: 'Pior Classificação',
        sort_questions_desc: 'Maior nº de Questões',
        sort_questions_asc: 'Menor nº de Questões',
        sort_title_asc: 'A → Z',
        sort_title_desc: 'Z → A',
        filter_state: 'Estado',
        filter_state_completed: 'Exames Feitos',
        filter_state_pending: 'Exames Por Fazer',
        filter_types: 'Tipos de Pergunta',
        filter_reset: 'Repor',
        filter_num_questions: 'Nº de Questões',
        filter_score: 'Classificação (%)',
        filter_status_indicator: 'A mostrar {visible} de {total} exames',
        empty_filters_title: 'Nenhum exame encontrado',
        empty_filters_desc: 'Nenhum exame corresponde aos filtros e pesquisa selecionados. Tente ajustar os parâmetros.',
        btn_reset_all_filters: 'Repor Todos os Filtros',

        // Exam Cards
        question_singular: '1 questão',
        question_plural: '{count} questões',
        badge_local: 'Local',
        badge_score: 'Classificação',
        aria_start_exam: 'Iniciar exame {title}',
        flag_title_pt: 'Português',
        flag_title_en: 'Inglês (Reino Unido)',

        // Question Types
        type_escolha_multipla: 'Escolha Múltipla',
        type_escolha_multipla_short: 'Múltipla',
        type_escolha_multipla_desc: 'Questões com várias opções de seleção (alíneas A, B, C, D).',
        type_boolean: 'Verdadeiro / Falso',
        type_boolean_short: 'V / F',
        type_boolean_desc: 'Questões binárias de afirmações verdadeiras ou falsas.',
        type_escrita: 'Desenvolvimento',
        type_escrita_short: 'Escrita',
        type_escrita_desc: 'Questões abertas de redação e reflexão escrita com solução esperada.',

        // Copy Buttons
        btn_copy: 'Copiar',
        btn_copy_answer: '+ Resposta',
        title_copy_question: 'Copiar apenas a questão e opções',
        aria_copy_question: 'Copiar questão e opções',
        title_copy_answer: 'Copiar questão com a resposta e justificação',
        aria_copy_answer: 'Copiar questão com resposta',
        aria_copy_group: 'Opções de cópia da questão',
        copied_feedback: 'Copiado!',
        toast_question_copied: 'Questão Copiada!',
        toast_question_answer_copied: 'Questão + Resposta Copiadas!',

        // Clipboard Export Format
        clip_exam: 'Exame',
        clip_question: 'Questão {current} de {total}',
        clip_scenario: 'Cenário',
        clip_question_label: 'Pergunta',
        clip_options: 'Alíneas',
        clip_correct_answers: 'Resposta(s) Correta(s)',

        // Exam Solving Screen
        written_label: 'Escreva a sua resposta (opcional):',
        written_placeholder: 'Escreva aqui a sua resposta para estruturar as suas ideias...',
        btn_reveal_answer: 'Ver Resposta',
        btn_confirm_selection: 'Confirmar Seleção',
        btn_prev: 'Anterior',
        btn_next: 'Seguinte',
        btn_finish: 'Terminar Exame',
        btn_leave_exam: 'Sair do Exame',
        leave_exam_modal_title: 'Sair do Exame?',
        leave_exam_modal_desc: 'O progresso deste exame não será guardado se sair agora.',
        btn_cancel: 'Cancelar',
        btn_confirm_leave: 'Sair',

        // Feedback Banner
        feedback_expected_solution: 'Resposta Esperada / Resolução:',
        feedback_correct: 'Resposta Correta!',
        feedback_incorrect: 'Resposta Incorreta!',
        feedback_correct_single: 'A resposta correta é a Alínea <strong>{letters}</strong>.',
        feedback_correct_plural: 'As respostas corretas são as Alíneas: <strong>{letters}</strong>.',
        feedback_explanation: 'Explicação / Justificação',

        // Results Screen
        results_title: 'Resultados do Exame',
        results_score_label: 'Classificação Final',
        results_correct: 'Certas',
        results_incorrect: 'Erradas',
        results_unanswered: 'Por Responder',
        results_feedback_high: 'Excelente desempenho! Dominou esta matéria com distinção.',
        results_feedback_medium: 'Bom trabalho! Exame concluído com aproveitamento positivo.',
        results_feedback_low: 'Aproveitamento insuficiente. Reveja as matérias com mais dúvidas e tente novamente!',
        btn_retry_exam: 'Voltar ao Exame',
        btn_main_menu: 'Menu Principal',

        // Add Cadeira Screen
        add_cadeira_title: 'Adicionar Nova Cadeira',
        label_cadeira_nome: 'Nome da Cadeira',
        placeholder_cadeira_nome: 'Ex: Sistemas Operativos',
        label_cadeira_desc: 'Descrição / Subtítulo',
        placeholder_cadeira_desc: 'Ex: Escalonamento, Processos e I/O',
        label_cadeira_icon: 'Selecione um Ícone',
        btn_create_cadeira: 'Criar Cadeira',

        // Add Exam Screen
        add_exame_title: 'Adicionar Novo Exame',
        btn_json_instructions: 'Instruções de JSON',
        label_exame_titulo: 'Título do Exame (Lido do JSON)',
        placeholder_read_auto: 'Será preenchido automaticamente...',
        label_exame_desc: 'Descrição do Exame (Lido do JSON)',
        label_exame_lingua: 'Idioma do Exame',
        label_json_code: 'Código JSON do Exame',
        placeholder_json_code: 'Cole o JSON do seu exame aqui...',
        editor_empty_status: 'Editor vazio. Aguardando JSON...',
        btn_create_exame: 'Criar Exame',

        // Settings Screen
        settings_title: 'Definições do Sistema',
        settings_lang_title: 'Idioma / Language',
        settings_lang_desc: 'Escolha o idioma de apresentação da interface do simulador.',
        lang_pt: 'Português',
        lang_en: 'English (UK)',
        settings_storage_title: 'Armazenamento Local',
        settings_storage_desc: 'Todas as cadeiras e exames criados localmente são guardados apenas no seu browser. Não existem cookies de rastreio nem dados transmitidos para terceiros.',
        danger_zone_title: 'Zona de Perigo',
        danger_zone_desc: 'Esta ação é irreversível e irá apagar permanentemente todas as cadeiras e exames criados localmente.',
        btn_clear_storage: 'Apagar Todos os Dados Locais',
        btn_back: 'Voltar',

        // Footer
        footer_copyright: 'Simulador de Exames',
        footer_dev_by: 'Desenvolvido por',
        footer_dev_status: 'Ainda em desenvolvimento',

        // Toasts & Notifications
        toast_copied: 'Copiado com sucesso!',
        toast_storage_cleared: 'Todos os dados locais foram apagados!',
        toast_filters_reset: 'Filtros repostos com sucesso!',
        toast_cadeira_created: 'Cadeira criada com sucesso!',
        toast_exame_created: 'Exame criado com sucesso!',
        toast_error_all_excluded: 'Todas as perguntas deste exame estão excluídas pelos filtros. Ative pelo menos um tipo para iniciar.'
    },

    en: {
        // App Header
        app_title: 'Exam Simulator',
        app_subtitle: 'EXAM SYSTEM',
        app_subtitle_with_sigla: 'EXAM SYSTEM | {sigla}',
        btn_settings: 'Settings',

        // Exam Top Bar
        question_counter: 'Question {current} of {total}',
        loading_question: 'Loading question...',

        // Cadeiras Screen
        select_cadeira: 'Select a Subject',
        search_cadeiras_placeholder: 'Search subject...',
        btn_add_cadeira: 'Add Subject',
        loading_cadeiras: 'Loading subjects...',
        exam_singular: '1 exam',
        exam_plural: '{count} exams',
        aria_select_cadeira: 'Select subject {name}',
        empty_cadeiras_title: 'No subjects available',
        empty_cadeiras_desc: 'Add a subject using the button above or configure the \'exames/cadeiras.json\' file.',
        empty_search_cadeiras_title: 'No subjects found',
        empty_search_cadeiras_desc: 'No subjects match the search query "{query}".',
        btn_clear_search: 'Clear Search',

        // Menu Screen (Exams list)
        btn_back_cadeiras: 'Back to Subjects',
        select_exame: 'Select an Exam',
        search_exams_placeholder: 'Search exam...',
        btn_add_exame: 'Add Exam',
        loading_exams: 'Loading exams...',

        // Sidebar Filters & Sort
        filter_sort: 'Sort by',
        sort_default: 'Default Order',
        sort_score_desc: 'Highest Score',
        sort_score_asc: 'Lowest Score',
        sort_questions_desc: 'Most Questions',
        sort_questions_asc: 'Fewest Questions',
        sort_title_asc: 'A → Z',
        sort_title_desc: 'Z → A',
        filter_state: 'Status',
        filter_state_completed: 'Completed Exams',
        filter_state_pending: 'Pending Exams',
        filter_types: 'Question Types',
        filter_reset: 'Reset',
        filter_num_questions: 'Number of Questions',
        filter_score: 'Score Range (%)',
        filter_status_indicator: 'Showing {visible} of {total} exams',
        empty_filters_title: 'No exams found',
        empty_filters_desc: 'No exams match the selected filters and search criteria. Try adjusting the parameters.',
        btn_reset_all_filters: 'Reset All Filters',

        // Exam Cards
        question_singular: '1 question',
        question_plural: '{count} questions',
        badge_local: 'Local',
        badge_score: 'Score',
        aria_start_exam: 'Start exam {title}',
        flag_title_pt: 'Portuguese',
        flag_title_en: 'English (UK)',

        // Question Types
        type_escolha_multipla: 'Multiple Choice',
        type_escolha_multipla_short: 'Multiple',
        type_escolha_multipla_desc: 'Questions with multiple selectable options (options A, B, C, D).',
        type_boolean: 'True / False',
        type_boolean_short: 'T / F',
        type_boolean_desc: 'Binary questions with true or false statements.',
        type_escrita: 'Essay / Written',
        type_escrita_short: 'Written',
        type_escrita_desc: 'Open-ended essay and written reflection questions with model solutions.',

        // Copy Buttons
        btn_copy: 'Copy',
        btn_copy_answer: '+ Answer',
        title_copy_question: 'Copy question and options only',
        aria_copy_question: 'Copy question and options',
        title_copy_answer: 'Copy question with answer and explanation',
        aria_copy_answer: 'Copy question with answer',
        aria_copy_group: 'Question copy options',
        copied_feedback: 'Copied!',
        toast_question_copied: 'Question Copied!',
        toast_question_answer_copied: 'Question + Answer Copied!',

        // Clipboard Export Format
        clip_exam: 'Exam',
        clip_question: 'Question {current} of {total}',
        clip_scenario: 'Scenario',
        clip_question_label: 'Question',
        clip_options: 'Options',
        clip_correct_answers: 'Correct Answer(s)',

        // Exam Solving Screen
        written_label: 'Write your answer (optional):',
        written_placeholder: 'Write your answer here to structure your thoughts...',
        btn_reveal_answer: 'View Answer',
        btn_confirm_selection: 'Confirm Selection',
        btn_prev: 'Previous',
        btn_next: 'Next',
        btn_finish: 'Finish Exam',
        btn_leave_exam: 'Exit Exam',
        leave_exam_modal_title: 'Exit Exam?',
        leave_exam_modal_desc: 'Your progress in this exam will not be saved if you exit now.',
        btn_cancel: 'Cancel',
        btn_confirm_leave: 'Exit',

        // Feedback Banner
        feedback_expected_solution: 'Model Solution / Expected Answer:',
        feedback_correct: 'Correct Answer!',
        feedback_incorrect: 'Incorrect Answer!',
        feedback_correct_single: 'The correct answer is Option <strong>{letters}</strong>.',
        feedback_correct_plural: 'The correct answers are Options: <strong>{letters}</strong>.',
        feedback_explanation: 'Explanation / Rationale',

        // Results Screen
        results_title: 'Exam Results',
        results_score_label: 'Final Score',
        results_correct: 'Correct',
        results_incorrect: 'Incorrect',
        results_unanswered: 'Unanswered',
        results_feedback_high: 'Outstanding performance! You have mastered this subject with distinction.',
        results_feedback_medium: 'Good work! Exam completed with a passing grade.',
        results_feedback_low: 'Unsatisfactory result. Review the challenging topics and try again!',
        btn_retry_exam: 'Retry Exam',
        btn_main_menu: 'Main Menu',

        // Add Cadeira Screen
        add_cadeira_title: 'Add New Subject',
        label_cadeira_nome: 'Subject Name',
        placeholder_cadeira_nome: 'E.g. Operating Systems',
        label_cadeira_desc: 'Description / Subtitle',
        placeholder_cadeira_desc: 'E.g. Scheduling, Processes and I/O',
        label_cadeira_icon: 'Select an Icon',
        btn_create_cadeira: 'Create Subject',

        // Add Exam Screen
        add_exame_title: 'Add New Exam',
        btn_json_instructions: 'JSON Instructions',
        label_exame_titulo: 'Exam Title (Read from JSON)',
        placeholder_read_auto: 'Will be filled in automatically...',
        label_exame_desc: 'Exam Description (Read from JSON)',
        label_exame_lingua: 'Exam Language',
        label_json_code: 'Exam JSON Code',
        placeholder_json_code: 'Paste your exam JSON here...',
        editor_empty_status: 'Editor empty. Awaiting JSON...',
        btn_create_exame: 'Create Exam',

        // Settings Screen
        settings_title: 'System Settings',
        settings_lang_title: 'Language / Idioma',
        settings_lang_desc: 'Choose the display language for the simulator interface.',
        lang_pt: 'Português',
        lang_en: 'English (UK)',
        settings_storage_title: 'Local Storage',
        settings_storage_desc: 'All locally created subjects and exams are stored solely in your browser. There are no tracking cookies or third-party data transfers.',
        danger_zone_title: 'Danger Zone',
        danger_zone_desc: 'This action is irreversible and will permanently delete all locally created subjects and exams.',
        btn_clear_storage: 'Delete All Local Data',
        btn_back: 'Back',

        // Footer
        footer_copyright: 'Exam Simulator',
        footer_dev_by: 'Developed by',
        footer_dev_status: 'Still in development',

        // Toasts & Notifications
        toast_copied: 'Copied successfully!',
        toast_storage_cleared: 'All local data has been deleted!',
        toast_filters_reset: 'Filters reset successfully!',
        toast_cadeira_created: 'Subject created successfully!',
        toast_exame_created: 'Exam created successfully!',
        toast_error_all_excluded: 'All questions in this exam are excluded by your filters. Enable at least one type to start.'
    }
};

/**
 * Returns the currently active language code from state or config.
 * @returns {string}
 */
export function getCurrentLanguage() {
    return State.language || getInitialLanguage();
}

/**
 * Translates a key according to the active language with dynamic fallback resolution.
 * Example: t('question_counter', { current: 1, total: 10 })
 *
 * @param {string} key
 * @param {object} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
    const lang = getCurrentLanguage();
    let str = null;

    // 1. Try active language
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key] !== undefined) {
        str = TRANSLATIONS[lang][key];
    } else {
        // 2. Try configured fallback languages in order
        for (const fallbackLang of APP_CONFIG.fallbackLanguages) {
            if (TRANSLATIONS[fallbackLang] && TRANSLATIONS[fallbackLang][key] !== undefined) {
                str = TRANSLATIONS[fallbackLang][key];
                break;
            }
        }
    }

    if (str === null || str === undefined) {
        str = key;
    }

    if (params && typeof params === 'object') {
        Object.keys(params).forEach(k => {
            str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
        });
    }

    return str;
}

/**
 * Updates the sort dropdown trigger label to reflect the current active sort and language.
 */
export function updateSortDropdownLabel() {
    const labelSpan = document.getElementById('sort-dropdown-selected-label');
    if (!labelSpan) return;

    const sortIcons = {
        default: 'fa-list-ol',
        score_desc: 'fa-trophy',
        score_asc: 'fa-trophy',
        questions_desc: 'fa-arrow-down-9-1',
        questions_asc: 'fa-arrow-up-1-9',
        title_asc: 'fa-arrow-down-a-z',
        title_desc: 'fa-arrow-up-z-a'
    };
    const sortKeys = {
        default: 'sort_default',
        score_desc: 'sort_score_desc',
        score_asc: 'sort_score_asc',
        questions_desc: 'sort_questions_desc',
        questions_asc: 'sort_questions_asc',
        title_asc: 'sort_title_asc',
        title_desc: 'sort_title_desc'
    };

    const currentSort = State.examSort || 'default';
    const icon = sortIcons[currentSort] || 'fa-list-ol';
    const key = sortKeys[currentSort] || 'sort_default';

    labelSpan.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i> <span>${t(key)}</span>`;
}

/**
 * Applies translations to all DOM elements bearing data-i18n attributes.
 */
export function applyTranslations() {
    const lang = getCurrentLanguage();

    // 1. Text Content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // 2. Input Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', t(key));
    });

    // 3. Titles / Tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });

    // 4. ARIA Labels
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        el.setAttribute('aria-label', t(key));
    });

    // 5. Update HTML lang attribute
    document.documentElement.lang = lang === 'en' ? 'en-GB' : 'pt-PT';

    // 6. Update Sort dropdown trigger label
    updateSortDropdownLabel();

    // 7. Update Language selector buttons UI in Settings
    document.querySelectorAll('.btn-lang-option').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        if (btnLang === lang) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
    });
}

/**
 * Sets the active language, persists it to storage, and updates UI.
 *
 * @param {string} lang - 'en' | 'pt'
 */
export function setLanguage(lang) {
    const targetLang = isLanguageSupported(lang) ? lang : APP_CONFIG.defaultLanguage;
    State.language = targetLang;
    persistLanguage(targetLang);
    applyTranslations();
}
