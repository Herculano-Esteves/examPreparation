import { State } from './state.js';
import { elements } from './elements.js';
import { JSON_INSTRUCTIONS } from './constants.js';
import { showToast } from './utils.js';
import { loadLocalData, saveLocalCadeiras, saveLocalExames, clearAllLocalData } from './storage.js';
import { validateExamJSON } from './validation.js';
import { transitionTo } from './navigation.js';
import { fetchCadeiras, renderCadeirasMenu } from './cadeiras.js';
import { fetchExams } from './exams.js';
import { prevQuestion, nextQuestion } from './question.js';
import { copyQuestionToClipboard } from './clipboard.js';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupLocalCreationListeners();
    loadLocalData(State);
    fetchCadeiras();
});

// Setup Events
function setupEventListeners() {
    // Navigation
    elements.btnExit.addEventListener('click', () => {
        transitionTo('menu');
    });

    elements.btnPrev.addEventListener('click', () => {
        prevQuestion();
    });

    elements.btnNext.addEventListener('click', () => {
        nextQuestion();
    });

    elements.btnCopy.addEventListener('click', () => {
        copyQuestionToClipboard();
    });

    elements.btnBackMenu.addEventListener('click', () => {
        transitionTo('menu');
    });

    elements.btnBackCadeiras.addEventListener('click', () => {
        transitionTo('cadeiras');
    });

    if (elements.btnSettings) {
        elements.btnSettings.addEventListener('click', () => {
            State.previousScreenBeforeSettings = State.currentScreen;
            transitionTo('settings');
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

    const btnClearStorage = document.getElementById('btn-clear-storage');
    if (btnClearStorage) {
        btnClearStorage.addEventListener('click', () => {
            if (confirm('Tem a certeza absoluta de que deseja apagar todas as cadeiras e exames criados localmente? Esta ação não pode ser desfeita.')) {
                clearAllLocalData(State);
                
                showToast('Todos os dados locais foram apagados!', elements);
                State.activeCadeira = null;
                
                document.getElementById('app-logo-icon').className = 'fa-solid fa-graduation-cap app-logo-icon';
                document.getElementById('app-main-title').textContent = 'Simulador de Exames';
                document.getElementById('app-subtitle').textContent = 'Ensino Superior';
                
                transitionTo('cadeiras');
                renderCadeirasMenu();
            }
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
                nextQuestion();
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
            opt.addEventListener('click', () => {
                const prevSel = iconGrid.querySelector('.icon-option.selected');
                if (prevSel) prevSel.classList.remove('selected');
                opt.classList.add('selected');
                selectedIcon = opt.getAttribute('data-icon');
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
            showToast('Cadeira local criada com sucesso!', elements);
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
            navigator.clipboard.writeText(JSON_INSTRUCTIONS).then(() => {
                showToast('Instruções copiadas com sucesso!', elements);
            }).catch(err => {
                console.error('Falha ao copiar:', err);
                alert('Erro ao copiar. Pode copiar manualmente da caixa de texto.');
            });
        });
    }

    if (btnCancelExame) {
        btnCancelExame.addEventListener('click', () => {
            editorInput.value = '';
            statusDiv.innerHTML = 'Editor vazio. Aguardando JSON...';
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

            const newExame = {
                ...State.validatedExamData,
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
            statusDiv.innerHTML = 'Editor vazio. Aguardando JSON...';
            statusDiv.className = 'validation-status empty';
            State.jsonValidationErrorLine = -1;
            State.validatedExamData = null;
            if (editorLines) editorLines.innerHTML = '';

            showToast('Exame local criado com sucesso!', elements);
            fetchExams(State.activeCadeira.index_path);
            transitionTo('menu');
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
                statusDiv.innerHTML = 'Editor vazio. Aguardando JSON...';
                statusDiv.className = 'validation-status empty';
                State.jsonValidationErrorLine = -1;
                btnSubmitExam.disabled = true;
                State.validatedExamData = null;
                document.getElementById('exame-titulo').value = '';
                document.getElementById('exame-desc').value = '';
            } else if (result.valid) {
                statusDiv.innerHTML = '<i class="fa-solid fa-circle-check"></i> JSON válido e estrutura correta!';
                statusDiv.className = 'validation-status valid';
                State.jsonValidationErrorLine = -1;
                btnSubmitExam.disabled = false;
                State.validatedExamData = result.data;
                document.getElementById('exame-titulo').value = result.data.titulo || '';
                document.getElementById('exame-desc').value = result.data.descricao || '';
            } else {
                let msg = result.message;
                if (result.line) {
                    msg += ` (Linha ${result.line})`;
                    State.jsonValidationErrorLine = result.line;
                } else {
                    State.jsonValidationErrorLine = -1;
                }
                statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${msg}`;
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
