import { State, elements } from './state.js';
import { escapeHTML, renderMarkdown, showToast } from './utils.js';
import { loadLocalData } from './storage.js';

// Transitions between screens with visual fade-out/fade-in
export function transitionTo(screenName) {
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
        document.getElementById('app-logo-icon').className = 'fa-solid fa-graduation-cap app-logo-icon';
        document.getElementById('app-main-title').textContent = 'Simulador de Exames';
        document.getElementById('app-subtitle').textContent = 'Ensino Superior';
    }

    // Toggle layout class for split-pane design when on the exam screen
    if (screenName === 'exam') {
        document.body.classList.add('layout-exam');
    } else {
        document.body.classList.remove('layout-exam');
    }

    const actualTargetScreen = elements.screens[screenName] || targetScreen;

    setTimeout(() => {
        if (actualTargetScreen) {
            actualTargetScreen.classList.add('active');
        }
        State.currentScreen = screenName;
        
        // Render mathematical equations
        if (typeof renderMathInElement === 'function') {
            const container = document.querySelector('.exam-split-container') || document.querySelector('.question-card') || document.body;
            renderMathInElement(container, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });
        }
    }, activeScreen ? 150 : 0);
}

// Fetch Cadeiras List from Static exames/cadeiras.json
export async function fetchCadeiras() {
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
                <button class="btn-control btn-primary" id="btn-retry-cadeiras" style="margin-top: 1rem;">Tentar Novamente</button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-cadeiras');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => fetchCadeiras());
        }
    }
}

// Render Cadeiras Menu List
export function renderCadeirasMenu() {
    loadLocalData(State);
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

    // Add local subject creation card
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
export function selectCadeira(cadeira) {
    State.activeCadeira = cadeira;

    if (cadeira.icon) {
        document.getElementById('app-logo-icon').className = `fa-solid ${cadeira.icon} app-logo-icon`;
    }
    document.getElementById('app-main-title').textContent = cadeira.nome;
    const sigla = cadeira.sigla || cadeira.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
    document.getElementById('app-subtitle').textContent = `Simulador de Exames (${sigla})`;

    transitionTo('menu');
}

// Fetch Exams List for Selected Cadeira
export async function fetchExams(indexPath) {
    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <p>A carregar exames...</p>
        </div>
    `;

    let serverExams = [];

    if (State.activeCadeira && !State.activeCadeira.isLocal) {
        try {
            const response = await fetch(indexPath);
            if (!response.ok) throw new Error('Não foi possível carregar os exames do servidor.');
            serverExams = await response.json();
        } catch (error) {
            console.error('Error fetching exams from server:', error);
        }
    }

    loadLocalData(State);
    const activeCadeiraId = State.activeCadeira ? State.activeCadeira.id : null;
    const filteredLocalExames = State.localExames.filter(e => e.cadeira_id === activeCadeiraId);

    State.exams = [...serverExams, ...filteredLocalExames];
    renderExamsMenu();
}

// Render Exams Menu List
export function renderExamsMenu() {
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

    // Add local exam card
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

// Shuffle options of a multiple-choice question in place
export function shuffleQuestionOptions(q) {
    if (q.tipo === 'escrita' || q.tipo === 'boolean' || !q.opcoes || q.opcoes.length === 0) return;

    const mapped = q.opcoes.map((opcao, idx) => {
        return {
            texto: opcao,
            eCorreta: q.solucao.includes(idx)
        };
    });

    for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
    }

    q.opcoes = mapped.map(item => item.texto);
    q.solucao = [];
    mapped.forEach((item, idx) => {
        if (item.eCorreta) {
            q.solucao.push(idx);
        }
    });
}

// Start Simulated Exam
export async function startExam(examId) {
    const examMeta = State.exams.find(e => e.id === examId);
    if (!examMeta) return;

    elements.examsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <p>A carregar as perguntas do exame...</p>
        </div>
    `;

    try {
        let examData;
        if (examMeta.isLocal) {
            examData = examMeta;
        } else {
            const response = await fetch(examMeta.path);
            if (!response.ok) throw new Error('Não foi possível carregar as questões deste exame.');
            examData = await response.json();
        }

        State.activeExam = {
            ...examMeta,
            perguntas: examData.perguntas
        };

        State.activeExam.perguntas.forEach(q => {
            shuffleQuestionOptions(q);
        });

        State.question.index = 0;
        State.question.selectedOptions = [];
        State.question.revealed = false;
        State.question.firstAttemptCorrect = {};
        State.question.writtenInput = '';

        elements.currentExamTitle.textContent = State.activeExam.titulo;
        if (elements.currentExamDesc) {
            elements.currentExamDesc.textContent = State.activeExam.descricao;
        }

        if (State.activeCadeira && State.activeCadeira.icon) {
            const iconEl = document.getElementById('exam-subject-icon');
            if (iconEl) {
                iconEl.className = `fa-solid ${State.activeCadeira.icon}`;
            }
        }

        transitionTo('exam');
        renderQuestion();
    } catch (error) {
        console.error('Error fetching exam questions:', error);
        renderExamsMenu();
        alert('Erro ao carregar o exame: ' + error.message);
    }
}

// Render UI for written/essay questions
export function renderWrittenQuestionUI(q) {
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
export function renderChoiceQuestionUI(q) {
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
export function renderFeedbackUI(q) {
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
        let msg = '';
        if (correctList.length === 1) {
            msg = `A resposta correta é a Alínea ${letters}.`;
        } else {
            msg = `As respostas corretas são as Alíneas: ${letters}.`;
        }

        if (q.explicacao) {
            msg += `<br><br><strong>Explicação / Justificação:</strong><br>${renderMarkdown(q.explicacao)}`;
        }
        elements.feedbackMessage.innerHTML = msg;
    }
}

// Render Current Question
export function renderQuestion() {
    const q = State.currentQuestion;
    if (!q) return;

    elements.questionCounter.textContent = `Questão ${State.question.index + 1} de ${State.totalQuestions}`;
    elements.currentQNum.textContent = State.question.index + 1;
    elements.questionText.textContent = q.pergunta;

    if (q.cabecalho) {
        elements.questionCabecalho.innerHTML = renderMarkdown(q.cabecalho, true);
        elements.questionCabecalho.classList.remove('hidden');
    } else {
        elements.questionCabecalho.innerHTML = '';
        elements.questionCabecalho.classList.add('hidden');
    }

    const progressVal = ((State.question.index + 1) / State.totalQuestions) * 100;
    elements.progressPercentage.textContent = `${Math.round(progressVal)}%`;
    elements.progressBarFill.style.width = `${progressVal}%`;

    elements.optionsContainer.innerHTML = '';

    if (q.tipo === 'escrita') {
        renderWrittenQuestionUI(q);
    } else {
        renderChoiceQuestionUI(q);
    }

    renderFeedbackUI(q);

    elements.btnPrev.disabled = State.question.index === 0;
    elements.btnNext.disabled = false;

    if (State.question.index === State.totalQuestions - 1) {
        elements.btnNext.innerHTML = `<span>Concluir Exame</span> <i class="fa-solid fa-flag-checkered"></i>`;
    } else {
        elements.btnNext.innerHTML = `<span>Avançar</span> <i class="fa-solid fa-chevron-right"></i>`;
    }

    if (typeof renderMathInElement === 'function') {
        const container = document.querySelector('.exam-split-container') || document.querySelector('.question-card') || document.body;
        renderMathInElement(container, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
}

// User selects/toggles an option
export function selectOption(optionIndex) {
    if (State.question.revealed) return;

    const q = State.currentQuestion;
    if (!q) return;

    if (q.tipo === 'boolean') {
        State.question.selectedOptions = [optionIndex];
    } else {
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
export function confirmMultipleChoiceAnswer() {
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
export function revealWrittenAnswer() {
    State.question.revealed = true;
    if (State.question.firstAttemptCorrect[State.question.index] === undefined) {
        State.question.firstAttemptCorrect[State.question.index] = true;
    }
    renderQuestion();
}

// Go to next question
export function nextQuestion() {
    if (State.question.index === State.totalQuestions - 1) {
        showResults();
    } else {
        State.question.index += 1;
        State.question.selectedOptions = [];
        State.question.writtenInput = '';
        State.question.revealed = false;
        renderQuestion();
    }
}

// Go to previous question
export function prevQuestion() {
    if (State.question.index > 0) {
        State.question.index -= 1;
        State.question.selectedOptions = [];
        State.question.writtenInput = '';
        State.question.revealed = false;
        renderQuestion();
    }
}

// Concludes exam and renders the results summary
export function showResults() {
    elements.resultsExamTitle.textContent = State.activeExam.titulo;
    transitionTo('results');
}

// Copy Question to Clipboard
export function copyQuestionToClipboard() {
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

        const optionsText = optionsList.map((opcao, idx) => {
            return `${String.fromCharCode(65 + idx)}) ${opcao}`;
        }).join('\n');

        const correctLetters = correctList.map(val => String.fromCharCode(65 + val)).sort().join(', ');

        textToCopy += `\nAlíneas:\n${optionsText}\n\nResposta(s) Correta(s):\n${correctLetters}`;
    }

    if (q.explicacao) {
        textToCopy += `\n\nExplicação / Justificação:\n${q.explicacao}`;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        triggerCopyButtonFeedback();
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        fallbackCopyTextToClipboard(textToCopy);
    });
}

// Visual feedback for Copy Question button
export function triggerCopyButtonFeedback() {
    const btn = document.getElementById('btn-copy');
    if (!btn) return;
    
    const originalHTML = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Copiado!</span>`;
    
    setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = originalHTML;
    }, 1500);
}

// Fallback clipboard copy
export function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            triggerCopyButtonFeedback();
        } else {
            showToast("Erro ao copiar.", elements);
        }
    } catch (err) {
        console.error('Fallback error:', err);
        showToast("Erro ao copiar.", elements);
    }
    document.body.removeChild(textArea);
}
