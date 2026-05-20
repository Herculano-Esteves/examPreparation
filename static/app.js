// State Management
const State = {
    // Current active screen: 'menu' | 'exam' | 'results'
    currentScreen: 'menu',
    
    // Loaded list of exams
    exams: [],
    
    // Currently active exam
    activeExam: null,
    
    // Current question states
    question: {
        index: 0,
        selectedOptions: [],  // list of selected numbers (indices)
        revealed: false,      // true if option has been clicked
        firstAttemptCorrect: {} // tracks correct answers on first attempt: { questionIndex: boolean }
    },
    
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
        menu: document.getElementById('screen-menu'),
        exam: document.getElementById('screen-exam'),
        results: document.getElementById('screen-results')
    },
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
    scorePercentage: document.getElementById('score-percentage'),
    scoreDetail: document.getElementById('score-detail'),
    toast: document.getElementById('toast')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchExams();
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
}

// Fetch Exams List from Static JSON File
async function fetchExams() {
    try {
        const response = await fetch('exames.json');
        if (!response.ok) throw new Error('Não foi possível carregar os exames.');
        
        State.exams = await response.json();
        renderExamsMenu();
    } catch (error) {
        console.error('Error fetching exams:', error);
        elements.examsGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Erro ao carregar exames</h3>
                <p>${error.message}</p>
                <button class="btn-control btn-primary" onclick="fetchExams()" style="margin-top: 1rem;">Tentar Novamente</button>
            </div>
        `;
    }
}

// Render Exams Menu List
function renderExamsMenu() {
    if (State.exams.length === 0) {
        elements.examsGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-folder-open"></i>
                <h3>Nenhum exame disponível</h3>
                <p>Por favor, adicione ficheiros JSON na pasta 'exames'.</p>
            </div>
        `;
        return;
    }
    
    elements.examsGrid.innerHTML = '';
    
    State.exams.forEach(exam => {
        const card = document.createElement('div');
        card.className = 'exam-card';
        card.innerHTML = `
            <div class="exam-card-header">
                <div class="exam-icon-box">
                    <i class="fa-solid fa-file-invoice"></i>
                </div>
                <span class="question-count-badge">${exam.perguntas.length} Questões</span>
            </div>
            <h4>${escapeHTML(exam.titulo)}</h4>
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
}

// Start Simulated Exam
function startExam(examId) {
    const exam = State.exams.find(e => e.id === examId);
    if (!exam) return;
    
    // Set active exam and reset state
    State.activeExam = exam;
    State.question.index = 0;
    State.question.selectedOptions = [];
    State.question.revealed = false;
    State.question.firstAttemptCorrect = {};
    
    elements.currentExamTitle.textContent = exam.titulo;
    elements.currentExamDesc.textContent = exam.descricao;
    
    transitionTo('exam');
    renderQuestion();
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
    
    q.opcoes.forEach((opcao, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${String.fromCharCode(65 + idx)}) ${opcao}`;
        
        const isSelected = State.question.selectedOptions.includes(idx);
        const isCorrect = q.solucao.includes(idx);
        
        // If question already answered
        if (State.question.revealed) {
            btn.classList.add('disabled');
            
            if (isCorrect) {
                // Correct answer is always highlighted in green
                btn.classList.add('correct-highlight');
                if (isSelected) {
                    btn.classList.add('selected-correct');
                }
            } else if (isSelected) {
                // Incorrect selected answer gets highlighted in red
                btn.classList.add('selected-incorrect');
            }
        } else {
            // Interactive state
            if (isSelected) {
                btn.classList.add('selected-toggled');
            }
            btn.addEventListener('click', () => {
                selectOption(idx);
            });
        }
        
        elements.optionsContainer.appendChild(btn);
    });
    
    // Show confirm button for multiple-choice questions if not yet revealed
    if (q.solucao.length > 1 && !State.question.revealed) {
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-control btn-primary';
        confirmBtn.style.marginTop = '1.2rem';
        confirmBtn.style.width = '100%';
        confirmBtn.style.justifyContent = 'center';
        confirmBtn.innerHTML = `<span>Confirmar Respostas</span> <i class="fa-solid fa-square-check"></i>`;
        confirmBtn.disabled = State.question.selectedOptions.length === 0;
        confirmBtn.addEventListener('click', () => {
            confirmMultipleChoiceAnswer();
        });
        elements.optionsContainer.appendChild(confirmBtn);
    }
    
    // Render feedback banner
    if (State.question.revealed) {
        const selected = State.question.selectedOptions;
        const correct = q.solucao;
        const isCorrect = selected.length === correct.length && selected.every(val => correct.includes(val));
        
        elements.answerFeedback.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        elements.feedbackTitle.textContent = isCorrect ? 'Resposta Correta!' : 'Resposta Incorreta!';
        
        const letters = correct.map(val => String.fromCharCode(65 + val)).sort().join(', ');
        if (correct.length === 1) {
            elements.feedbackMessage.textContent = `A resposta correta é a Alínea ${letters}.`;
        } else {
            elements.feedbackMessage.textContent = `As respostas corretas são as Alíneas: ${letters}.`;
        }
    } else {
        elements.answerFeedback.className = 'answer-feedback hidden';
    }
    
    // Update Control Buttons
    elements.btnPrev.disabled = State.question.index === 0;
    
    // Permitir avançar a qualquer momento (mesmo sem responder)
    elements.btnNext.disabled = false;
    
    if (State.question.index === State.totalQuestions - 1) {
        elements.btnNext.innerHTML = `<span>Concluir Exame</span> <i class="fa-solid fa-flag-checkered"></i>`;
    } else {
        elements.btnNext.innerHTML = `<span>Avançar</span> <i class="fa-solid fa-chevron-right"></i>`;
    }
}

// User selects/toggles an option
function selectOption(optionIndex) {
    if (State.question.revealed) return; // Prevent double clicking
    
    const q = State.currentQuestion;
    if (!q) return;
    
    if (q.solucao.length === 1) {
        // Single choice flow
        State.question.selectedOptions = [optionIndex];
        State.question.revealed = true;
        
        const isCorrect = q.solucao.includes(optionIndex);
        if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
            State.question.firstAttemptCorrect[State.question.index] = isCorrect;
        }
        renderQuestion();
    } else {
        // Multiple choice flow: toggle selection without revealing
        const pos = State.question.selectedOptions.indexOf(optionIndex);
        if (pos > -1) {
            State.question.selectedOptions.splice(pos, 1);
        } else {
            State.question.selectedOptions.push(optionIndex);
        }
        renderQuestion();
    }
}

// Confirm multiple choice answer
function confirmMultipleChoiceAnswer() {
    if (State.question.revealed) return;
    
    const q = State.currentQuestion;
    if (!q) return;
    
    State.question.revealed = true;
    
    const selected = State.question.selectedOptions;
    const correct = q.solucao;
    const isCorrect = selected.length === correct.length && selected.every(val => correct.includes(val));
    
    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = isCorrect;
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
        State.question.revealed = false;
        
        renderQuestion();
    }
}

// Concludes exam and renders the results summary
function showResults() {
    elements.resultsExamTitle.textContent = State.activeExam.titulo;
    
    // Calculate total correct questions on first attempt
    let correctCount = 0;
    for (let i = 0; i < State.totalQuestions; i++) {
        if (State.question.firstAttemptCorrect[i] === true) {
            correctCount++;
        }
    }
    
    const percentage = Math.round((correctCount / State.totalQuestions) * 100);
    elements.scorePercentage.textContent = `${percentage}%`;
    elements.scoreDetail.textContent = `Acertou em ${correctCount} de ${State.totalQuestions} perguntas na primeira tentativa!`;
    
    transitionTo('results');
}

// Copy Question to Clipboard formatted nicely
function copyQuestionToClipboard() {
    const q = State.currentQuestion;
    if (!q) return;
    
    // Build options string (using A, B, C, D)
    const optionsText = q.opcoes.map((opcao, idx) => {
        return `${String.fromCharCode(65 + idx)}) ${opcao}`;
    }).join('\n');
    
    const correctLetters = q.solucao.map(val => String.fromCharCode(65 + val)).sort().join(', ');
    const correctOptionsText = q.solucao.map(val => q.opcoes[val]).join(' | ');
    
    let textToCopy = `Exame: ${State.activeExam.titulo}
Questão ${State.question.index + 1} de ${State.totalQuestions}
`;

    if (q.cabecalho) {
        textToCopy += `\nCenário:\n${q.cabecalho}\n`;
    }

    textToCopy += `\nPergunta:\n${q.pergunta}
 
Alíneas:
${optionsText}
 
Resposta(s) Correta(s):
${correctOptionsText} (${correctLetters})`;

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
    
    // Delay setting active slightly if there was an active screen to allow fading out
    setTimeout(() => {
        targetScreen.classList.add('active');
        State.currentScreen = screenName;
    }, activeScreen ? 150 : 0);
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
