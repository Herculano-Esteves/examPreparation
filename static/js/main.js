import { State } from './state.js';
import { elements } from './elements.js';
import { JSON_INSTRUCTIONS, getJsonInstructions } from './constants.js';
import { showToast, clampCardDescriptions, getLocalizedText } from './utils.js';
import { loadLocalData, saveLocalCadeiras, saveLocalExames, clearAllLocalData } from './storage.js';
import { validateExamJSON } from './validation.js';
import { transitionTo } from './navigation.js';
import { fetchCadeiras, renderCadeirasMenu } from './cadeiras.js';
import { fetchExams, renderExamsMenu } from './exams.js';
import { prevQuestion, nextQuestion, renderQuestion } from './question.js';
import { copyQuestionToClipboard } from './clipboard.js';
import { applyTranslations, setLanguage, t } from './i18n.js';
import { initExamLayout } from './layout.js';
import { isLanguageConfigured, setLanguageConfigured } from './config.js';

// Initialization
function initApp() {
    applyTranslations();
    setupEventListeners();
    setupLocalCreationListeners();
    loadLocalData(State);
    initExamLayout();
    fetchCadeiras();
    initLanguagePrompt();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (elements.cadeirasGrid) clampCardDescriptions(elements.cadeirasGrid);
            if (elements.examsGrid) clampCardDescriptions(elements.examsGrid);
        }, 100);
    });
}

// Prompt inicial de seleção de idioma se ainda não configurado
function initLanguagePrompt() {
    if (!isLanguageConfigured()) {
        const modal = elements.languageModal;
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Setup Events
function setupEventListeners() {
    // Language prompt modal selection
    const handleModalLanguageChoice = (lang) => {
        setLanguage(lang);
        setLanguageConfigured(true);
        if (elements.languageModal) {
            elements.languageModal.classList.add('hidden');
        }

        const subtitleEl = document.getElementById('app-subtitle');
        const mainTitle = document.getElementById('app-main-title');
        if (subtitleEl) subtitleEl.textContent = t('app_subtitle');
        if (mainTitle) mainTitle.textContent = t('app_title');

        if (State.currentScreen === 'cadeiras') {
            renderCadeirasMenu();
        } else if (State.currentScreen === 'menu') {
            renderExamsMenu();
        }
    };

    if (elements.btnSelectLangPt) {
        elements.btnSelectLangPt.addEventListener('click', () => {
            handleModalLanguageChoice('pt');
        });
    }

    if (elements.btnSelectLangEn) {
        elements.btnSelectLangEn.addEventListener('click', () => {
            handleModalLanguageChoice('en');
        });
    }

    // Navigation
    if (elements.btnExit) {
        elements.btnExit.addEventListener('click', () => {
            transitionTo('menu');
        });
    }

    if (elements.btnPrev) {
        elements.btnPrev.addEventListener('click', () => {
            prevQuestion();
        });
    }

    if (elements.btnNext) {
        elements.btnNext.addEventListener('click', () => {
            nextQuestion();
        });
    }

    if (elements.btnCopy) {
        elements.btnCopy.addEventListener('click', () => {
            copyQuestionToClipboard(false);
        });
    }

    if (elements.btnCopyAnswer) {
        elements.btnCopyAnswer.addEventListener('click', () => {
            copyQuestionToClipboard(true);
        });
    }

    if (elements.btnResumeExam) {
        elements.btnResumeExam.addEventListener('click', () => {
            if (State.activeExam) {
                transitionTo('exam');
                renderQuestion();
            } else {
                transitionTo('menu');
            }
        });
    }

    if (elements.btnBackMenu) {
        elements.btnBackMenu.addEventListener('click', () => {
            transitionTo('menu');
        });
    }

    if (elements.btnBackCadeiras) {
        elements.btnBackCadeiras.addEventListener('click', () => {
            transitionTo('cadeiras');
        });
    }

    const settingsButtons = [
        elements.btnSettings,
        elements.btnExamSettings,
        ...document.querySelectorAll('.btn-sticky-settings')
    ].filter(Boolean);

    settingsButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            State.previousScreenBeforeSettings = State.currentScreen;
            transitionTo('settings');
        });
    });

    const appHeader = document.querySelector('.app-header');
    if (appHeader) {
        const headerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    document.body.classList.add('header-scrolled');
                } else {
                    document.body.classList.remove('header-scrolled');
                }
            });
        }, {
            threshold: 0,
            rootMargin: '-10px 0px 0px 0px'
        });
        headerObserver.observe(appHeader);
    }

    const btnAddCadeiraTop = document.getElementById('btn-add-cadeira-top');
    if (btnAddCadeiraTop) {
        btnAddCadeiraTop.addEventListener('click', () => {
            transitionTo('addCadeira');
        });
    }

    const btnAddExameTop = document.getElementById('btn-add-exame-top');
    if (btnAddExameTop) {
        btnAddExameTop.addEventListener('click', () => {
            transitionTo('addExame');
        });
    }

    const btnBackSettings = document.getElementById('btn-back-settings');
    if (btnBackSettings) {
        btnBackSettings.addEventListener('click', () => {
            const backTarget = State.previousScreenBeforeSettings || 'cadeiras';
            if (backTarget === 'settings') {
                transitionTo('cadeiras');
            } else {
                transitionTo(backTarget);
            }
        });
    }

    // Language selection buttons in settings
    document.querySelectorAll('.btn-lang-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
            setLanguageConfigured(true);

            // Synchronize header titles and active screen dynamically
            const subtitleEl = document.getElementById('app-subtitle');
            const mainTitle = document.getElementById('app-main-title');

            if (State.activeCadeira) {
                const sigla = State.activeCadeira.sigla ||
                    State.activeCadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
                if (subtitleEl) subtitleEl.textContent = t('app_subtitle_with_sigla', { sigla });
            } else {
                if (subtitleEl) subtitleEl.textContent = t('app_subtitle');
                if (mainTitle) mainTitle.textContent = t('app_title');
            }

            if (State.currentScreen === 'cadeiras' || State.previousScreenBeforeSettings === 'cadeiras') {
                renderCadeirasMenu();
            } else if (State.currentScreen === 'menu' || State.previousScreenBeforeSettings === 'menu') {
                renderExamsMenu();
            }
            
            if (State.currentScreen === 'exam' || State.previousScreenBeforeSettings === 'exam') {
                if (State.activeExam) {
                    if (elements.currentExamTitle) {
                        elements.currentExamTitle.textContent = getLocalizedText(State.activeExam.title || State.activeExam.titulo);
                    }
                    renderQuestion();
                }
            }
        });
    });

    const btnClearStorage = document.getElementById('btn-clear-storage');
    if (btnClearStorage) {
        btnClearStorage.addEventListener('click', () => {
            if (elements.dangerConfirmModal) {
                elements.dangerConfirmModal.classList.remove('hidden');
            }
        });
    }

    if (elements.btnCancelClearStorage) {
        elements.btnCancelClearStorage.addEventListener('click', () => {
            if (elements.dangerConfirmModal) {
                elements.dangerConfirmModal.classList.add('hidden');
            }
        });
    }

    if (elements.btnConfirmClearStorage) {
        elements.btnConfirmClearStorage.addEventListener('click', () => {
            if (elements.dangerConfirmModal) {
                elements.dangerConfirmModal.classList.add('hidden');
            }

            clearAllLocalData(State);

            showToast(t('toast_storage_cleared'), elements);
            State.activeCadeira = null;

            const logoIcon = document.getElementById('app-logo-icon');
            if (logoIcon) logoIcon.className = 'fa-solid fa-graduation-cap app-logo-icon';

            const mainTitle = document.getElementById('app-main-title');
            if (mainTitle) mainTitle.textContent = t('app_title');

            const subtitleEl = document.getElementById('app-subtitle');
            if (subtitleEl) {
                subtitleEl.textContent = t('app_subtitle');
            }

            transitionTo('cadeiras');
            renderCadeirasMenu();
            initLanguagePrompt();
        });
    }

    // Keyboard navigation (ArrowLeft / ArrowRight)
    document.addEventListener('keydown', (e) => {
        if (State.currentScreen === 'exam') {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                return;
            }
            if (e.key === 'ArrowRight') {
                nextQuestion(true);
            } else if (e.key === 'ArrowLeft') {
                prevQuestion();
            }
        }
    });
}

// Setup listeners for local creation panels
function setupLocalCreationListeners() {
    const btnCancelCadeira = document.getElementById('btn-cancel-cadeira');
    const btnSaveCadeira = document.getElementById('btn-save-cadeira');
    const inputCadeiraNome = document.getElementById('cadeira-nome');
    const inputCadeiraDesc = document.getElementById('cadeira-desc');
    const iconGrid = document.getElementById('cadeira-icon-grid');
    let selectedIcon = 'fa-laptop-code';

    if (iconGrid) {
        iconGrid.querySelectorAll('.icon-option').forEach(opt => {
            const selectIconOpt = () => {
                const prevSel = iconGrid.querySelector('.icon-option.selected');
                if (prevSel) prevSel.classList.remove('selected');
                opt.classList.add('selected');
                selectedIcon = opt.getAttribute('data-icon');
            };

            opt.addEventListener('click', selectIconOpt);
            opt.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectIconOpt();
                }
            });
        });
    }

    if (btnCancelCadeira) {
        btnCancelCadeira.addEventListener('click', () => {
            inputCadeiraNome.value = '';
            inputCadeiraDesc.value = '';
            transitionTo('cadeiras');
        });
    }

    if (btnSaveCadeira) {
        btnSaveCadeira.addEventListener('click', () => {
            const nome = inputCadeiraNome.value.trim();
            const desc = inputCadeiraDesc.value.trim();
            if (!nome || !desc) {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            const newCadeira = {
                id: 'local_' + Date.now(),
                nome: nome,
                descricao: desc,
                icon: selectedIcon,
                exames_count: 0,
                isLocal: true,
                index_path: 'local'
            };

            State.localCadeiras.push(newCadeira);
            saveLocalCadeiras(State);

            inputCadeiraNome.value = '';
            inputCadeiraDesc.value = '';
            showToast(t('toast_cadeira_created'), elements);
            transitionTo('cadeiras');
        });
    }

    const btnCancelExame = document.getElementById('btn-cancel-exame');
    const btnSubmitExam = document.getElementById('btn-submit-exam');
    const btnCopyInst = document.getElementById('btn-copy-instructions');
    const editorInput = document.getElementById('editor-code-input');
    const editorLines = document.getElementById('editor-line-numbers');
    const statusDiv = document.getElementById('validation-status');

    if (btnCopyInst) {
        btnCopyInst.addEventListener('click', () => {
            const instructionsText = getJsonInstructions(State.language);
            navigator.clipboard.writeText(instructionsText).then(() => {
                showToast(t('toast_copied'), elements);
            }).catch(err => {
                console.error('Falha ao copiar:', err);
                alert('Erro ao copiar. Pode copiar manualmente da caixa de texto.');
            });
        });
    }

    if (btnCancelExame) {
        btnCancelExame.addEventListener('click', () => {
            editorInput.value = '';
            statusDiv.innerHTML = `[ ... ] ${t('editor_empty_status')}`;
            statusDiv.className = 'validation-status empty';
            State.jsonValidationErrorLine = -1;
            State.validatedExamData = null;
            if (editorLines) editorLines.innerHTML = '';
            transitionTo('menu');
        });
    }

    if (btnSubmitExam) {
        btnSubmitExam.addEventListener('click', () => {
            if (!State.validatedExamData) return;
            if (!State.activeCadeira) {
                alert('Erro: Nenhuma cadeira ativa selecionada.');
                return;
            }

            const exameLinguaSelect = document.getElementById('exame-lingua');
            const selectedLingua = (exameLinguaSelect ? exameLinguaSelect.value : null) || State.language || 'en';

            const newExame = {
                ...State.validatedExamData,
                languages: State.validatedExamData.languages || [selectedLingua],
                id: 'exam_local_' + Date.now(),
                cadeira_id: State.activeCadeira.id,
                isLocal: true
            };

            State.localExames.push(newExame);
            saveLocalExames(State);

            if (State.activeCadeira.isLocal) {
                const idx = State.localCadeiras.findIndex(c => c.id === State.activeCadeira.id);
                if (idx !== -1) {
                    State.localCadeiras[idx].exames_count = (State.localCadeiras[idx].exames_count || 0) + 1;
                    saveLocalCadeiras(State);
                }
            }

            editorInput.value = '';
            statusDiv.innerHTML = `[ ... ] ${t('editor_empty_status')}`;
            statusDiv.className = 'validation-status empty';
            State.jsonValidationErrorLine = -1;
            State.validatedExamData = null;
            if (editorLines) editorLines.innerHTML = '';
            if (exameLinguaSelect) exameLinguaSelect.value = State.language || 'en';

            showToast(t('toast_exame_created'), elements);
            fetchExams(State.activeCadeira.index_path);
            transitionTo('menu');
        });
    }

    const exameLinguaSelect = document.getElementById('exame-lingua');
    if (exameLinguaSelect) {
        exameLinguaSelect.addEventListener('change', () => {
            if (State.validatedExamData) {
                State.validatedExamData.languages = [exameLinguaSelect.value];
            }
        });
    }

    if (editorInput && editorLines) {
        editorInput.addEventListener('scroll', () => {
            editorLines.scrollTop = editorInput.scrollTop;
        });

        editorInput.addEventListener('input', () => {
            const lines = editorInput.value.split('\n');
            const lineCount = Math.max(lines.length, 1);

            const result = validateExamJSON(editorInput.value.trim());
            if (!editorInput.value.trim()) {
                statusDiv.innerHTML = `[ ... ] ${t('editor_empty_status')}`;
                statusDiv.className = 'validation-status empty';
                State.jsonValidationErrorLine = -1;
                btnSubmitExam.disabled = true;
                State.validatedExamData = null;
                document.getElementById('exame-titulo').value = '';
                document.getElementById('exame-desc').value = '';
                if (exameLinguaSelect) exameLinguaSelect.value = State.language || 'en';
            } else if (result.valid) {
                statusDiv.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> [OK] JSON válido e estrutura correta!';
                statusDiv.className = 'validation-status valid';
                State.jsonValidationErrorLine = -1;
                btnSubmitExam.disabled = false;
                State.validatedExamData = result.data;
                document.getElementById('exame-titulo').value = getLocalizedText(result.data.title || result.data.titulo);
                document.getElementById('exame-desc').value = getLocalizedText(result.data.description || result.data.descricao);
                if (exameLinguaSelect) {
                    const langs = result.data.languages || ['en'];
                    if (langs.includes('en') && !langs.includes('pt')) {
                        exameLinguaSelect.value = 'en';
                    } else if (langs.includes('pt') && !langs.includes('en')) {
                        exameLinguaSelect.value = 'pt';
                    } else {
                        exameLinguaSelect.value = State.language || 'en';
                    }
                }
            } else {
                let msg = result.message;
                if (result.line) {
                    msg += ` (Linha ${result.line})`;
                    State.jsonValidationErrorLine = result.line;
                } else {
                    State.jsonValidationErrorLine = -1;
                }
                statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> [ERRO] ${msg}`;
                statusDiv.className = 'validation-status invalid';
                btnSubmitExam.disabled = true;
                State.validatedExamData = null;
                document.getElementById('exame-titulo').value = '';
                document.getElementById('exame-desc').value = '';
            }

            let html = '';
            for (let i = 1; i <= lineCount; i++) {
                const isError = (i === State.jsonValidationErrorLine);
                html += `<div class="line-number-item ${isError ? 'error-line' : ''}">${i}</div>`;
            }
            editorLines.innerHTML = html;
        });
    }
}
