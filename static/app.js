// State Management
const State = {
    // Current active screen: 'cadeiras' | 'menu' | 'exam' | 'results' | 'addCadeira' | 'addExame'
    currentScreen: 'cadeiras',

    // Loaded list of subjects (cadeiras)
    cadeiras: [],
    localCadeiras: [],

    // Selected subject
    activeCadeira: null,

    // Loaded list of exams for active subject
    exams: [],
    localExames: [],

    // Currently active exam
    activeExam: null,

    // Current question states
    question: {
        index: 0,
        selectedOptions: [],  // list of selected numbers (indices)
        revealed: false,      // true if option has been clicked
        firstAttemptCorrect: {} // tracks correct answers on first attempt: { questionIndex: boolean }
    },

    // JSON Validation state
    jsonValidationErrorLine: -1,
    validatedExamData: null,

    // Getters for convenience
    get totalQuestions() {
        return this.activeExam ? this.activeExam.perguntas.length : 0;
    },

    get currentQuestion() {
        if (!this.activeExam || !this.activeExam.perguntas) return null;
        return this.activeExam.perguntas[this.question.index];
    }
};

// DOM Elements
const elements = {
    screens: {
        cadeiras: document.getElementById('screen-cadeiras'),
        menu: document.getElementById('screen-menu'),
        exam: document.getElementById('screen-exam'),
        results: document.getElementById('screen-results'),
        addCadeira: document.getElementById('screen-add-cadeira'),
        addExame: document.getElementById('screen-add-exame'),
        settings: document.getElementById('screen-settings')
    },
    cadeirasGrid: document.getElementById('cadeiras-grid'),
    btnBackCadeiras: document.getElementById('btn-back-cadeiras'),
    examsGrid: document.getElementById('exams-grid'),
    currentExamTitle: document.getElementById('current-exam-title'),
    currentExamDesc: document.getElementById('current-exam-desc'),
    questionCounter: document.getElementById('question-counter'),
    progressPercentage: document.getElementById('progress-percentage'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    currentQNum: document.getElementById('current-q-num'),
    questionCabecalho: document.getElementById('question-cabecalho'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    answerFeedback: document.getElementById('answer-feedback'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackMessage: document.getElementById('feedback-message'),
    btnExit: document.getElementById('btn-exit'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnCopy: document.getElementById('btn-copy'),
    btnBackMenu: document.getElementById('btn-back-menu'),
    resultsExamTitle: document.getElementById('results-exam-title'),
    toast: document.getElementById('toast'),
    btnSettings: document.getElementById('btn-settings')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupLocalCreationListeners();
    loadLocalData();
    fetchCadeiras();
});

// Setup Events
function setupEventListeners() {
    // Navigation
    elements.btnExit.addEventListener('click', () => {
        if (confirm('Tem a certeza que deseja sair do exame? O seu progresso atual será perdido.')) {
            transitionTo('menu');
        }
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
                localStorage.removeItem('simulador_cadeiras_locais');
                localStorage.removeItem('simulador_exames_locais');
                
                State.localCadeiras = [];
                State.localExames = [];
                
                showToast('Todos os dados locais foram apagados!');
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
            // Ignore key events if the user is typing in a text field
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

// Fetch Cadeiras List from Static exames/cadeiras.json
async function fetchCadeiras() {
    try {
        const response = await fetch('exames/cadeiras.json');
        if (!response.ok) throw new Error('Não foi possível carregar as cadeiras.');

        State.cadeiras = await response.json();
        renderCadeirasMenu();
    } catch (error) {
        console.error('Error fetching cadeiras:', error);
        elements.cadeirasGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Erro ao carregar as cadeiras</h3>
                <p>${error.message}</p>
                <button class="btn-control btn-primary" onclick="fetchCadeiras()" style="margin-top: 1rem;">Tentar Novamente</button>
            </div>
        `;
    }
}

// Render Cadeiras Menu List
function renderCadeirasMenu() {
    loadLocalData();
    const combinedCadeiras = [...State.cadeiras, ...State.localCadeiras];

    if (combinedCadeiras.length === 0) {
        elements.cadeirasGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-folder-open"></i>
                <h3>Nenhuma cadeira disponível</h3>
                <p>Por favor, adicione uma cadeira local ou configure o ficheiro 'exames/cadeiras.json'.</p>
            </div>
        `;
        return;
    }

    elements.cadeirasGrid.innerHTML = '';

    combinedCadeiras.forEach(cadeira => {
        const card = document.createElement('div');
        card.className = 'exam-card';
        const sigla = cadeira.sigla || cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
        card.innerHTML = `
            <div class="exam-card-header">
                <div class="exam-icon-box">
                    <i class="fa-solid ${cadeira.icon || 'fa-graduation-cap'}"></i>
                </div>
                <span class="question-count-badge">${cadeira.exames_count || 0} Exames</span>
            </div>
            <h4>${escapeHTML(sigla)} ${cadeira.isLocal ? '<span class="badge-local">Local</span>' : ''}</h4>
            <p style="font-weight: 500; margin-bottom: 0.2rem; color: #ffffff;">${escapeHTML(cadeira.nome)}</p>
            <p>${escapeHTML(cadeira.descricao)}</p>
            <div class="exam-card-footer">
                <span>Ver Exames</span>
                <i class="fa-solid fa-circle-arrow-right"></i>
            </div>
        `;

        card.addEventListener('click', () => {
            selectCadeira(cadeira);
        });

        elements.cadeirasGrid.appendChild(card);
    });

    // Card para adicionar nova cadeira
    const addCard = document.createElement('div');
    addCard.className = 'exam-card add-card';
    addCard.innerHTML = `
        <div class="add-card-content">
            <i class="fa-solid fa-plus-circle add-icon"></i>
            <span class="add-text">Adicionar Cadeira</span>
        </div>
    `;
    addCard.addEventListener('click', () => {
        transitionTo('addCadeira');
    });
    elements.cadeirasGrid.appendChild(addCard);
}

// Select a Cadeira
function selectCadeira(cadeira) {
    State.activeCadeira = cadeira;

    // Update logo and headers based on selected subject
    if (cadeira.icon) {
        document.getElementById('app-logo-icon').className = `fa-solid ${cadeira.icon} app-logo-icon`;
    }
    document.getElementById('app-main-title').textContent = cadeira.nome;
    const sigla = cadeira.sigla || cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
    document.getElementById('app-subtitle').textContent = `Simulador de Exames (${sigla})`;

    transitionTo('menu');
}

// Fetch Exams List for Selected Cadeira
async function fetchExams(indexPath) {
    // Show loading spinner
    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <p>A carregar exames...</p>
        </div>
    `;

    let serverExams = [];

    // Only load from server if not a local cadeira
    if (State.activeCadeira && !State.activeCadeira.isLocal) {
        try {
            const response = await fetch(indexPath);
            if (!response.ok) throw new Error('Não foi possível carregar os exames do servidor.');
            serverExams = await response.json();
        } catch (error) {
            console.error('Error fetching exams from server:', error);
        }
    }

    // Load local exams for this active cadeira
    loadLocalData();
    const activeCadeiraId = State.activeCadeira ? State.activeCadeira.id : null;
    const filteredLocalExames = State.localExames.filter(e => e.cadeira_id === activeCadeiraId);

    // Combine
    State.exams = [...serverExams, ...filteredLocalExames];
    renderExamsMenu();
}

// Render Exams Menu List
function renderExamsMenu() {
    elements.examsGrid.innerHTML = '';

    State.exams.forEach(exam => {
        const card = document.createElement('div');
        card.className = 'exam-card';
        const qCount = exam.perguntas_count || (exam.perguntas ? exam.perguntas.length : 0);
        card.innerHTML = `
            <div class="exam-card-header">
                <div class="exam-icon-box">
                    <i class="fa-solid fa-file-invoice"></i>
                </div>
                <span class="question-count-badge">${qCount} Questões</span>
            </div>
            <h4>${escapeHTML(exam.titulo)} ${exam.isLocal ? '<span class="badge-local">Local</span>' : ''}</h4>
            <p>${escapeHTML(exam.descricao)}</p>
            <div class="exam-card-footer">
                <span>Começar Exame</span>
                <i class="fa-solid fa-circle-arrow-right"></i>
            </div>
        `;

        card.addEventListener('click', () => {
            startExam(exam.id);
        });

        elements.examsGrid.appendChild(card);
    });

    // Card to add local exam
    const addCard = document.createElement('div');
    addCard.className = 'exam-card add-card';
    addCard.innerHTML = `
        <div class="add-card-content">
            <i class="fa-solid fa-plus-circle add-icon"></i>
            <span class="add-text">Adicionar Exame</span>
        </div>
    `;
    addCard.addEventListener('click', () => {
        transitionTo('addExame');
    });
    elements.examsGrid.appendChild(addCard);
}

// Shuffle options of a multiple-choice question in place (client-side only)
function shuffleQuestionOptions(q) {
    if (q.tipo === 'escrita' || q.tipo === 'boolean' || !q.opcoes || q.opcoes.length === 0) return;

    // Map options to keep track of correctness
    const mapped = q.opcoes.map((opcao, idx) => {
        return {
            texto: opcao,
            eCorreta: q.solucao.includes(idx)
        };
    });

    // Fisher-Yates shuffle
    for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
    }

    // Reassign shuffled options and correct solution indices
    q.opcoes = mapped.map(item => item.texto);
    q.solucao = [];
    mapped.forEach((item, idx) => {
        if (item.eCorreta) {
            q.solucao.push(idx);
        }
    });
}

// Start Simulated Exam
async function startExam(examId) {
    const examMeta = State.exams.find(e => e.id === examId);
    if (!examMeta) return;

    // Show loading spinner
    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <p>A carregar as perguntas do exame...</p>
        </div>
    `;

    try {
        let examData;
        if (examMeta.isLocal) {
            // Local exam already has the preguntas
            examData = examMeta;
        } else {
            const response = await fetch(examMeta.path);
            if (!response.ok) throw new Error('Não foi possível carregar as questões deste exame.');
            examData = await response.json();
        }

        // Set active exam and reset state
        State.activeExam = {
            ...examMeta,
            perguntas: examData.perguntas
        };

        // Shuffle each question's options
        State.activeExam.perguntas.forEach(q => {
            shuffleQuestionOptions(q);
        });

        State.question.index = 0;
        State.question.selectedOptions = [];
        State.question.revealed = false;
        State.question.firstAttemptCorrect = {};

        elements.currentExamTitle.textContent = State.activeExam.titulo;
        elements.currentExamDesc.textContent = State.activeExam.descricao;

        transitionTo('exam');
        renderQuestion();
    } catch (error) {
        console.error('Error fetching exam questions:', error);
        renderExamsMenu(); // Restore menu grid
        alert('Erro ao carregar o exame: ' + error.message);
    }
}

// Render UI for written/essay questions
function renderWrittenQuestionUI(q) {
    const label = document.createElement('p');
    label.style.color = 'var(--text-secondary)';
    label.style.fontSize = '0.9rem';
    label.style.marginBottom = '0.5rem';
    label.innerHTML = `<i class="fa-regular fa-keyboard"></i> Escreva a sua resposta (<strong>opcional</strong>):`;
    elements.optionsContainer.appendChild(label);

    const textarea = document.createElement('textarea');
    textarea.id = 'written-answer-input';
    textarea.className = 'option-btn';
    textarea.placeholder = 'Escreva aqui a sua resposta para estruturar as suas ideias...';
    textarea.style.width = '100%';
    textarea.style.minHeight = '120px';
    textarea.style.cursor = 'text';
    textarea.style.backgroundColor = 'rgba(0, 0, 0, 0.15)';
    textarea.style.resize = 'vertical';

    if (State.question.writtenInput !== undefined) {
        textarea.value = State.question.writtenInput;
    }

    textarea.addEventListener('input', (e) => {
        State.question.writtenInput = e.target.value;
    });

    if (State.question.revealed) {
        textarea.disabled = true;
        textarea.style.opacity = '0.7';
    }

    elements.optionsContainer.appendChild(textarea);

    if (!State.question.revealed) {
        const btnReveal = document.createElement('button');
        btnReveal.className = 'btn-control btn-primary';
        btnReveal.style.marginTop = '1rem';
        btnReveal.style.width = '100%';
        btnReveal.style.justifyContent = 'center';
        btnReveal.innerHTML = `<span>Ver Resposta</span> <i class="fa-solid fa-eye"></i>`;
        btnReveal.addEventListener('click', () => {
            revealWrittenAnswer();
        });
        elements.optionsContainer.appendChild(btnReveal);
    }
}

// Render UI for multiple-choice and boolean questions
function renderChoiceQuestionUI(q) {
    const isBoolean = q.tipo === 'boolean';
    const optionsList = isBoolean ? ["Verdadeiro", "Falso"] : q.opcoes;
    const correctList = Array.isArray(q.solucao) ? q.solucao : [q.solucao];

    optionsList.forEach((opcao, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${String.fromCharCode(65 + idx)}) ${opcao}`;

        const isSelected = State.question.selectedOptions.includes(idx);
        const isCorrect = correctList.includes(idx);

        if (State.question.revealed) {
            btn.classList.add('disabled');
            if (isCorrect) {
                btn.classList.add('correct-highlight');
                if (isSelected) {
                    btn.classList.add('selected-correct');
                }
            } else if (isSelected) {
                btn.classList.add('selected-incorrect');
            }
        } else {
            if (isSelected) {
                btn.classList.add('selected-toggled');
            }
            btn.addEventListener('click', () => {
                selectOption(idx);
            });
        }

        elements.optionsContainer.appendChild(btn);
    });

    if (!State.question.revealed) {
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-control btn-primary';
        confirmBtn.style.marginTop = '1.2rem';
        confirmBtn.style.width = '100%';
        confirmBtn.style.justifyContent = 'center';
        confirmBtn.innerHTML = `<span>Confirmar Resposta(s)</span> <i class="fa-solid fa-square-check"></i>`;
        confirmBtn.disabled = State.question.selectedOptions.length === 0;
        confirmBtn.addEventListener('click', () => {
            confirmMultipleChoiceAnswer();
        });
        elements.optionsContainer.appendChild(confirmBtn);
    }
}

// Render the feedback banner under the question options/text
function renderFeedbackUI(q) {
    if (!State.question.revealed) {
        elements.answerFeedback.className = 'answer-feedback hidden';
        return;
    }

    if (q.tipo === 'escrita') {
        elements.answerFeedback.className = 'answer-feedback correct';
        elements.feedbackTitle.textContent = 'Resposta Esperada / Resolução:';
        elements.feedbackMessage.innerHTML = renderMarkdown(q.solucao);
    } else {
        const selected = State.question.selectedOptions;
        const correctList = Array.isArray(q.solucao) ? q.solucao : [q.solucao];
        const isCorrect = selected.length === correctList.length && selected.every(val => correctList.includes(val));

        elements.answerFeedback.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        elements.feedbackTitle.textContent = isCorrect ? 'Resposta Correta!' : 'Resposta Incorreta!';

        const letters = correctList.map(val => String.fromCharCode(65 + val)).sort().join(', ');
        if (correctList.length === 1) {
            elements.feedbackMessage.textContent = `A resposta correta é a Alínea ${letters}.`;
        } else {
            elements.feedbackMessage.textContent = `As respostas corretas são as Alíneas: ${letters}.`;
        }
    }
}

// Render Current Question
function renderQuestion() {
    const q = State.currentQuestion;
    if (!q) return;

    // Update labels and indicators
    elements.questionCounter.textContent = `Questão ${State.question.index + 1} de ${State.totalQuestions}`;
    elements.currentQNum.textContent = State.question.index + 1;
    elements.questionText.textContent = q.pergunta;

    // Render scenario header if present
    if (q.cabecalho) {
        elements.questionCabecalho.textContent = q.cabecalho;
        elements.questionCabecalho.classList.remove('hidden');
    } else {
        elements.questionCabecalho.textContent = '';
        elements.questionCabecalho.classList.add('hidden');
    }

    // Update progress bar
    const progressVal = ((State.question.index + 1) / State.totalQuestions) * 100;
    elements.progressPercentage.textContent = `${Math.round(progressVal)}%`;
    elements.progressBarFill.style.width = `${progressVal}%`;

    // Clear and build options
    elements.optionsContainer.innerHTML = '';

    if (q.tipo === 'escrita') {
        renderWrittenQuestionUI(q);
    } else {
        renderChoiceQuestionUI(q);
    }

    // Render feedback banner
    renderFeedbackUI(q);

    // Update Control Buttons
    elements.btnPrev.disabled = State.question.index === 0;

    // Permitir avançar a qualquer momento (mesmo sem responder)
    elements.btnNext.disabled = false;

    if (State.question.index === State.totalQuestions - 1) {
        elements.btnNext.innerHTML = `<span>Concluir Exame</span> <i class="fa-solid fa-flag-checkered"></i>`;
    } else {
        elements.btnNext.innerHTML = `<span>Avançar</span> <i class="fa-solid fa-chevron-right"></i>`;
    }

    // Render any mathematical equations in the question card using KaTeX auto-render
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.querySelector('.question-card'), {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
}

// User selects/toggles an option
function selectOption(optionIndex) {
    if (State.question.revealed) return; // Prevent double clicking

    const q = State.currentQuestion;
    if (!q) return;

    if (q.tipo === 'boolean') {
        // Single selection for boolean
        State.question.selectedOptions = [optionIndex];
    } else {
        // Toggle selection without revealing for all multiple-choice questions
        const pos = State.question.selectedOptions.indexOf(optionIndex);
        if (pos > -1) {
            State.question.selectedOptions.splice(pos, 1);
        } else {
            State.question.selectedOptions.push(optionIndex);
        }
    }
    renderQuestion();
}

// Confirm multiple choice answer
function confirmMultipleChoiceAnswer() {
    if (State.question.revealed) return;

    const q = State.currentQuestion;
    if (!q) return;

    State.question.revealed = true;

    const selected = State.question.selectedOptions;
    const correctList = Array.isArray(q.solucao) ? q.solucao : [q.solucao];
    const isCorrect = selected.length === correctList.length && selected.every(val => correctList.includes(val));

    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = isCorrect;
    }
    renderQuestion();
}

// Reveal written answer
function revealWrittenAnswer() {
    State.question.revealed = true;
    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = true;
    }
    renderQuestion();
}

// Go to next question
function nextQuestion() {
    if (State.question.index === State.totalQuestions - 1) {
        // Finalize Exam
        showResults();
    } else {
        State.question.index += 1;

        // Reset answer state for the new question page
        State.question.selectedOptions = [];
        State.question.writtenInput = '';
        State.question.revealed = false;

        renderQuestion();
    }
}

// Go to previous question (resetting answer state as per requirements)
function prevQuestion() {
    if (State.question.index > 0) {
        State.question.index -= 1;

        // "quando se volta para trás não é suposto guardar a resposta do utilizador"
        State.question.selectedOptions = [];
        State.question.writtenInput = '';
        State.question.revealed = false;

        renderQuestion();
    }
}

// Concludes exam and renders the results summary
function showResults() {
    elements.resultsExamTitle.textContent = State.activeExam.titulo;
    transitionTo('results');
}

// Copy Question to Clipboard formatted nicely
function copyQuestionToClipboard() {
    const q = State.currentQuestion;
    if (!q) return;

    let textToCopy = `Exame: ${State.activeExam.titulo}\nQuestão ${State.question.index + 1} de ${State.totalQuestions}\n`;

    if (q.cabecalho) {
        textToCopy += `\nCenário:\n${q.cabecalho}\n`;
    }

    textToCopy += `\nPergunta:\n${q.pergunta}\n`;

    if (q.tipo === 'escrita') {
        textToCopy += `\nResposta Esperada / Resolução:\n${q.solucao}`;
    } else {
        const isBoolean = q.tipo === 'boolean';
        const optionsList = isBoolean ? ["Verdadeiro", "Falso"] : q.opcoes;
        const correctList = Array.isArray(q.solucao) ? q.solucao : [q.solucao];

        // Build options string (using A, B, C, D)
        const optionsText = optionsList.map((opcao, idx) => {
            return `${String.fromCharCode(65 + idx)}) ${opcao}`;
        }).join('\n');

        const correctLetters = correctList.map(val => String.fromCharCode(65 + val)).sort().join(', ');

        textToCopy += `\nAlíneas:\n${optionsText}\n\nResposta(s) Correta(s):\n${correctLetters}`;
    }

    // Write to clipboard
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Copiado com sucesso!");
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers or permission denials
        fallbackCopyTextToClipboard(textToCopy);
    });
}

// Fallback clipboard method using temporary textarea
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  // Avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast("Copiado com sucesso!");
        } else {
            showToast("Erro ao copiar.");
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        showToast("Erro ao copiar.");
    }
    document.body.removeChild(textArea);
}

// Show temporary notification toast
function showToast(message) {
    elements.toast.querySelector('span').textContent = message;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2500);
}

// Transitions between screen sections with clean visual animation
function transitionTo(screenName) {
    const activeScreen = document.querySelector('.screen.active');
    const targetScreen = elements.screens[screenName];

    if (activeScreen) {
        activeScreen.classList.remove('active');
    }

    if (screenName === 'menu') {
        if (State.activeCadeira) {
            fetchExams(State.activeCadeira.index_path);
        } else {
            screenName = 'cadeiras';
        }
    } else if (screenName === 'cadeiras') {
        renderCadeirasMenu();
        // Reset logo and titles to default when returning to subject select
        document.getElementById('app-logo-icon').className = 'fa-solid fa-graduation-cap app-logo-icon';
        document.getElementById('app-main-title').textContent = 'Simulador de Exames';
        document.getElementById('app-subtitle').textContent = 'Ensino Superior';
    }

    const actualTargetScreen = elements.screens[screenName] || targetScreen;

    // Delay setting active slightly if there was an active screen to allow fading out
    setTimeout(() => {
        actualTargetScreen.classList.add('active');
        State.currentScreen = screenName;
        
        // Render any mathematical equations in the question card using KaTeX auto-render
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(document.querySelector('.question-card'), {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });
        }
    }, activeScreen ? 150 : 0);
}

// Render simple Markdown styling (bold, inline code) securely to HTML, preserving $ and $$ for KaTeX
function renderMarkdown(text) {
    if (!text) return "";
    let escaped = escapeHTML(text);
    
    // Replace **text** with <strong>text</strong>
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace `text` with <code>text</code>
    escaped = escaped.replace(/`(.*?)`/g, '<code>$1</code>');
    // Replace newlines with <br>
    escaped = escaped.replace(/\n/g, '<br>');
    return escaped;
}

// Simple HTML escaping helper
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// JSON Validation instructions template to be copied to clipboard
const JSON_INSTRUCTIONS = `Cria um exame no formato JSON seguindo este esquema exato:

{
  "titulo": "Título do Exame",
  "descricao": "Descrição detalhada do exame",
  "perguntas": [
    {
      "pergunta": "Texto da pergunta de escolha múltipla?",
      "opcoes": [
        "Opção A",
        "Opção B",
        "Opção C",
        "Opção D"
      ],
      "solucao": [0]
    },
    {
      "tipo": "boolean",
      "pergunta": "Texto da pergunta de Verdadeiro ou Falso?",
      "solucao": 0
    },
    {
      "tipo": "escrita",
      "pergunta": "Texto da pergunta de resposta aberta?",
      "solucao": "Resolução esperada em formato Markdown."
    }
  ]
}

Regras:
1. Para "tipo": "escolha_multipla" (padrão se omitido), a "solucao" é um array de índices de 0 a N (ex: [0] para A, [1] para B). Admite múltiplas opções corretas (ex: [0, 2]).
2. Para "tipo": "boolean", a "solucao" deve ser 0 (Verdadeiro) ou 1 (Falso). Não tem o campo "opcoes".
3. Para "tipo": "escrita", a "solucao" é uma string com a resposta explicada. Suporta formatação Markdown básica (**negrito**, \`código\` e equações em KaTeX $ ou $$). Não tem o campo "opcoes".

[adicionar tema e informação: xxx]`;

// Validate JSON code structure
function validateExamJSON(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        
        if (!parsed.titulo || typeof parsed.titulo !== 'string') {
            return { valid: false, message: "O JSON deve conter um campo 'titulo' do tipo string." };
        }
        if (!parsed.descricao || typeof parsed.descricao !== 'string') {
            return { valid: false, message: "O JSON deve conter um campo 'descricao' do tipo string." };
        }
        if (!parsed.perguntas || !Array.isArray(parsed.perguntas) || parsed.perguntas.length === 0) {
            return { valid: false, message: "O JSON deve conter um array 'perguntas' não vazio." };
        }
        
        for (let i = 0; i < parsed.perguntas.length; i++) {
            const p = parsed.perguntas[i];
            const qNum = i + 1;
            
            if (!p.pergunta || typeof p.pergunta !== 'string') {
                return { valid: false, message: `Pergunta #${qNum}: Falta o campo 'pergunta' do tipo string.` };
            }
            
            const tipo = p.tipo || 'escolha_multipla';
            if (tipo === 'escrita') {
                if (p.solucao === undefined || typeof p.solucao !== 'string') {
                    return { valid: false, message: `Pergunta #${qNum} (escrita): A 'solucao' deve ser uma string com a explicação.` };
                }
            } else if (tipo === 'boolean') {
                if (p.solucao === undefined || (p.solucao !== 0 && p.solucao !== 1)) {
                    return { valid: false, message: `Pergunta #${qNum} (boolean): A 'solucao' deve ser 0 (Verdadeiro) ou 1 (Falso).` };
                }
            } else if (tipo === 'escolha_multipla') {
                if (!p.opcoes || !Array.isArray(p.opcoes) || p.opcoes.length === 0) {
                    return { valid: false, message: `Pergunta #${qNum} (escolha múltipla): O campo 'opcoes' deve ser um array com as alternativas.` };
                }
                if (!p.solucao || !Array.isArray(p.solucao) || p.solucao.length === 0) {
                    return { valid: false, message: `Pergunta #${qNum} (escolha múltipla): O campo 'solucao' deve ser um array com os índices das respostas corretas.` };
                }
                for (let s of p.solucao) {
                    if (s < 0 || s >= p.opcoes.length) {
                        return { valid: false, message: `Pergunta #${qNum}: O índice da resposta ${s} está fora do limite das opções.` };
                    }
                }
            } else {
                return { valid: false, message: `Pergunta #${qNum}: Tipo '${tipo}' inválido. Use 'escolha_multipla', 'boolean' ou 'escrita'.` };
            }
        }
        return { valid: true, data: parsed };
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
            // Incremental fallback to detect lines
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

// Local Storage Integration
function loadLocalData() {
    try {
        const cadeirasRaw = localStorage.getItem('simulador_cadeiras_locais');
        State.localCadeiras = cadeirasRaw ? JSON.parse(cadeirasRaw) : [];
    } catch (e) {
        console.error('Erro ao ler cadeiras locais:', e);
        State.localCadeiras = [];
    }

    try {
        const examesRaw = localStorage.getItem('simulador_exames_locais');
        State.localExames = examesRaw ? JSON.parse(examesRaw) : [];
    } catch (e) {
        console.error('Erro ao ler exames locais:', e);
        State.localExames = [];
    }
}

function saveLocalCadeiras() {
    localStorage.setItem('simulador_cadeiras_locais', JSON.stringify(State.localCadeiras));
}

function saveLocalExames() {
    localStorage.setItem('simulador_exames_locais', JSON.stringify(State.localExames));
}

// Setup listeners for the local subject and exam creation forms
function setupLocalCreationListeners() {
    // Cadeira creation fields
    const btnCancelCadeira = document.getElementById('btn-cancel-cadeira');
    const btnSaveCadeira = document.getElementById('btn-save-cadeira');
    const inputCadeiraNome = document.getElementById('cadeira-nome');
    const inputCadeiraDesc = document.getElementById('cadeira-desc');
    const iconGrid = document.getElementById('cadeira-icon-grid');
    let selectedIcon = 'fa-laptop-code';

    // Handle icon select clicks
    if (iconGrid) {
        iconGrid.querySelectorAll('.icon-option').forEach(opt => {
            opt.addEventListener('click', () => {
                iconGrid.querySelector('.icon-option.selected').classList.remove('selected');
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
            saveLocalCadeiras();
            
            inputCadeiraNome.value = '';
            inputCadeiraDesc.value = '';
            showToast('Cadeira local criada com sucesso!');
            transitionTo('cadeiras');
        });
    }

    // Exame creation fields
    const btnCancelExame = document.getElementById('btn-cancel-exame');
    const btnSubmitExam = document.getElementById('btn-submit-exam');
    const btnCopyInst = document.getElementById('btn-copy-instructions');
    const editorInput = document.getElementById('editor-code-input');
    const editorLines = document.getElementById('editor-line-numbers');
    const statusDiv = document.getElementById('validation-status');

    if (btnCopyInst) {
        btnCopyInst.addEventListener('click', () => {
            navigator.clipboard.writeText(JSON_INSTRUCTIONS).then(() => {
                showToast('Instruções copiadas com sucesso!');
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
            saveLocalExames();

            // Update exam count for local cadeira if applicable
            if (State.activeCadeira.isLocal) {
                const idx = State.localCadeiras.findIndex(c => c.id === State.activeCadeira.id);
                if (idx !== -1) {
                    State.localCadeiras[idx].exames_count = (State.localCadeiras[idx].exames_count || 0) + 1;
                    saveLocalCadeiras();
                }
            }

            editorInput.value = '';
            statusDiv.innerHTML = 'Editor vazio. Aguardando JSON...';
            statusDiv.className = 'validation-status empty';
            State.jsonValidationErrorLine = -1;
            State.validatedExamData = null;
            if (editorLines) editorLines.innerHTML = '';

            showToast('Exame local criado com sucesso!');
            fetchExams(State.activeCadeira.index_path);
            transitionTo('menu');
        });
    }

    // Scroll synchronization and real-time syntax checking
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

            // Draw line numbers, highlight error line if any
            let html = '';
            for (let i = 1; i <= lineCount; i++) {
                const isError = (i === State.jsonValidationErrorLine);
                html += `<div class="line-number-item ${isError ? 'error-line' : ''}">${i}</div>`;
            }
            editorLines.innerHTML = html;
        });
    }
}
