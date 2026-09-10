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
import { initExamBuilder, resetExamBuilder } from './examBuilder.js';

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
        elements.btnBuilderSettings,
        ...document.querySelectorAll('.btn-sticky-settings')
    ].filter(Boolean);

    function openSettingsPopover(triggerBtn) {
        const popover = elements.settingsDropdownMenu;
        if (!popover) return;

        popover.classList.remove('hidden');

        if (triggerBtn) {
            const rect = triggerBtn.getBoundingClientRect();
            const popoverWidth = popover.offsetWidth || 280;
            const popoverHeight = popover.offsetHeight || 200;

            // Align popover right edge with trigger button right edge
            let left = rect.right - popoverWidth;
            const maxLeft = window.innerWidth - popoverWidth - 12;
            left = Math.max(12, Math.min(left, maxLeft));

            // Default position: directly below the button; flip upwards if overflowing window bottom
            let top = rect.bottom + 8;
            if (top + popoverHeight > window.innerHeight - 12) {
                top = Math.max(12, rect.top - popoverHeight - 8);
            }

            popover.style.top = `${Math.round(top)}px`;
            popover.style.left = `${Math.round(left)}px`;
        }
    }

    function closeSettingsPopover() {
        const popover = elements.settingsDropdownMenu;
        if (popover) {
            popover.classList.add('hidden');
        }
    }

    function toggleSettingsPopover(triggerBtn) {
        const popover = elements.settingsDropdownMenu;
        if (!popover) return;
        if (popover.classList.contains('hidden')) {
            openSettingsPopover(triggerBtn);
        } else {
            closeSettingsPopover();
        }
    }

    settingsButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSettingsPopover(btn);
        });
    });

    if (elements.btnCloseSettingsPopover) {
        elements.btnCloseSettingsPopover.addEventListener('click', (e) => {
            e.stopPropagation();
            closeSettingsPopover();
        });
    }

    // Dismiss popover when clicking outside
    document.addEventListener('click', (e) => {
        const popover = elements.settingsDropdownMenu;
        if (popover && !popover.classList.contains('hidden')) {
            const isClickInside = popover.contains(e.target);
            const isClickOnTrigger = settingsButtons.some(btn => btn.contains(e.target));
            if (!isClickInside && !isClickOnTrigger) {
                closeSettingsPopover();
            }
        }
    });

    // Dismiss popover on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSettingsPopover();
        }
    });

    // Close popover on window resize to avoid detached floating menus
    window.addEventListener('resize', () => {
        closeSettingsPopover();
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
            resetExamBuilder();
            transitionTo('addExame');
        });
    }

    // Language selection buttons in settings popover
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

            if (State.currentScreen === 'cadeiras') {
                renderCadeirasMenu();
            } else if (State.currentScreen === 'menu') {
                renderExamsMenu();
            } else if (State.currentScreen === 'exam') {
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
            closeSettingsPopover();
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

    initExamBuilder();

    const btnCancelExame = document.getElementById('btn-cancel-exame');
    const btnSubmitExam = document.getElementById('btn-submit-exam');
    const btnCopyInst = document.getElementById('btn-copy-instructions');
    const btnPasteInst = document.getElementById('btn-paste-instructions');
    const btnAiPanelToggle = document.getElementById('btn-ai-panel-toggle');

    // Copy Instructions button — appends the user's exam description at the end of the JSON schema
    if (btnCopyInst) {
        btnCopyInst.addEventListener('click', () => {
            const baseInstructions = getJsonInstructions(State.language);
            const descInput = document.getElementById('builder-ai-description');
            const userDesc = descInput ? descInput.value.trim() : '';

            let instructionsText = baseInstructions;
            if (userDesc) {
                // Replace the placeholder closing line with the actual user request
                // (each language template has its own placeholder string)
                const placeholder = State.language === 'en'
                    ? '(Now write here your prompt with the exam topics, subject, or attach files for your AI to read)'
                    : '(Agora faça aqui o pedido do tipo de exame ou matérias que quer, pode adicionar ficheiros à parte para a sua inteligência artificial ler)';
                instructionsText = baseInstructions.replace(placeholder, userDesc);
            }

            navigator.clipboard.writeText(instructionsText).then(() => {
                showToast(t('toast_copied'), elements);
                // Visual feedback on the button
                const icon = btnCopyInst.querySelector('i');
                if (icon) { icon.className = 'fa-solid fa-check'; }
                setTimeout(() => { if (icon) { icon.className = 'fa-solid fa-copy'; } }, 2000);
            }).catch(err => {
                console.error('Falha ao copiar:', err);
                alert('Erro ao copiar. Pode copiar manualmente da caixa de texto.');
            });
        });
    }

    // Paste AI Response button — reads clipboard JSON into the editor textarea and triggers sync
    if (btnPasteInst) {
        btnPasteInst.addEventListener('click', () => {
            navigator.clipboard.readText().then(text => {
                const editorInput = document.getElementById('editor-code-input');
                if (!editorInput) return;
                editorInput.value = text.trim();
                editorInput.dispatchEvent(new Event('input', { bubbles: true }));
                showToast(t('toast_copied'), elements);
                // Scroll the editor into view
                editorInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                // Visual feedback
                const icon = btnPasteInst.querySelector('i');
                if (icon) { icon.className = 'fa-solid fa-check'; }
                setTimeout(() => { if (icon) { icon.className = 'fa-solid fa-paste'; } }, 2000);
            }).catch(err => {
                console.error('Falha ao ler clipboard:', err);
                alert('Não foi possível ler o clipboard. Cole o JSON diretamente no editor abaixo.');
            });
        });
    }

    // Toggle AI panel collapse/expand
    if (btnAiPanelToggle) {
        btnAiPanelToggle.addEventListener('click', () => {
            const panelBody = document.getElementById('builder-ai-panel-body');
            if (!panelBody) return;
            const isCollapsed = panelBody.classList.toggle('collapsed');
            btnAiPanelToggle.classList.toggle('collapsed', isCollapsed);
            btnAiPanelToggle.setAttribute('aria-expanded', String(!isCollapsed));
        });
    }

    if (btnCancelExame) {
        btnCancelExame.addEventListener('click', () => {
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

            const builderLangSelect = document.getElementById('builder-exam-lang');
            const selectedLingua = (builderLangSelect ? builderLangSelect.value : null) || State.language || 'pt';

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

            showToast(t('toast_exame_created'), elements);
            fetchExams(State.activeCadeira.index_path);
            transitionTo('menu');
        });
    }
}
