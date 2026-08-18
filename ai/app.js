// Tab Switcher Logic
function switchTab(tabId) {
    // Hide all tab contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));

    // Deactivate all tab buttons
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Show active tab and button
    document.getElementById(tabId).classList.add('active');
    
    // Find matching button by its onclick function parameter
    const activeBtn = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
}

// Lab Steps Switcher Logic
function switchLabStep(stepNum) {
    const steps = document.querySelectorAll('.step-content');
    steps.forEach(step => step.classList.remove('active'));

    const buttons = document.querySelectorAll('.step-nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(`step-${stepNum}`).classList.add('active');
    
    // Activate nav button
    const activeBtn = buttons[stepNum - 1];
    if (activeBtn) activeBtn.classList.add('active');
}

// Simulator Playground Logic
function runSimulation() {
    const promptInput = document.getElementById('user-prompt').value.trim();
    if (!promptInput) {
        alert("Por favor, digite um prompt para simular!");
        return;
    }

    // Reset pipeline nodes
    const nodes = document.querySelectorAll('.pipeline-node');
    nodes.forEach(node => {
        node.classList.remove('active', 'success');
    });
    document.getElementById('node-4-output').style.display = 'none';

    // Verify if prompt matches the git-commit-helper skill
    const keywords = ['commit', 'git', 'salvar', 'alteracao', 'versao', 'conventional', 'helper'];
    const isMatch = keywords.some(keyword => promptInput.toLowerCase().includes(keyword));

    // Phase 1: Input Received
    const node1 = document.getElementById('node-1');
    node1.classList.add('active');
    document.getElementById('node-1-text').innerText = `Prompt recebido: "${promptInput}"`;

    setTimeout(() => {
        node1.classList.remove('active');
        node1.classList.add('success');

        // Phase 2: Intent Matching
        const node2 = document.getElementById('node-2');
        node2.classList.add('active');
        
        setTimeout(() => {
            node2.classList.remove('active');
            node2.classList.add('success');
            
            if (isMatch) {
                document.getElementById('node-2-text').innerText = "Match encontrado com a Skill: 'git-commit-helper'";
                
                // Phase 3: Loading Skill rules
                const node3 = document.getElementById('node-3');
                node3.classList.add('active');
                document.getElementById('node-3-text').innerText = "Carregando regras de SKILL.md e injetando diretrizes no prompt do sistema...";

                setTimeout(() => {
                    node3.classList.remove('active');
                    node3.classList.add('success');

                    // Phase 4: Script Execution
                    const node4 = document.getElementById('node-4');
                    node4.classList.add('active');
                    document.getElementById('node-4-text').innerText = "Executando script: validate_commit.js...";
                    
                    setTimeout(() => {
                        node4.classList.remove('active');
                        node4.classList.add('success');
                        
                        // Parse mock commit description
                        let mockCommit = "feat(auth): fix security vulnerability in pix endpoint";
                        if (promptInput.toLowerCase().includes("pix")) {
                            mockCommit = "fix(pix): resolve security vulnerability in endpoint";
                        } else if (promptInput.toLowerCase().includes("login")) {
                            mockCommit = "feat(auth): add login validation";
                        }
                        
                        const outputBox = document.getElementById('node-4-output');
                        outputBox.style.display = 'block';
                        outputBox.innerText = `$ node validate_commit.js "${mockCommit}"\n✅ Mensagem válida de acordo com Conventional Commits!\nProcess exited with code 0`;

                        // Phase 5: final output
                        const node5 = document.getElementById('node-5');
                        node5.classList.add('active');
                        document.getElementById('node-5-text').innerText = `Resultado da IA:\n\n[Mensagem gerada e validada]\n"${mockCommit}"\n\nA skill 'git-commit-helper' rodou com sucesso!`;

                        setTimeout(() => {
                            node5.classList.remove('active');
                            node5.classList.add('success');
                        }, 800);

                    }, 1200);

                }, 1000);

            } else {
                document.getElementById('node-2-text').innerText = "Nenhuma skill correspondente encontrada. Usando o modelo geral.";
                
                // Skip Node 3 & 4 or mark as bypassed
                const node3 = document.getElementById('node-3');
                node3.classList.add('active');
                document.getElementById('node-3-text').innerText = "Processando com base nos conhecimentos gerais do LLM...";

                setTimeout(() => {
                    node3.classList.remove('active');
                    node3.classList.add('success');
                    
                    const node5 = document.getElementById('node-5');
                    node5.classList.add('active');
                    document.getElementById('node-5-text').innerText = `Resposta da IA (Sem Skills adicionais):\n\n"Olá! Com base nas minhas diretrizes gerais, posso te ajudar a resolver sua dúvida. Por favor, forneça mais informações caso precise de comandos específicos."`;
                    
                    setTimeout(() => {
                        node5.classList.remove('active');
                        node5.classList.add('success');
                    }, 800);
                }, 1000);
            }

        }, 1200);

    }, 800);
}

// Quiz Data & State
const quizQuestions = [
    {
        question: "Qual arquivo é obrigatório para definir os metadados de uma Skill de IA?",
        options: [
            "config.json",
            "SKILL.md (com YAML frontmatter no topo)",
            "index.js",
            "readme.txt"
        ],
        answer: 1,
        explanation: "O arquivo SKILL.md com YAML frontmatter no topo é obrigatório. É por meio dele que o sistema lê informações cruciais como o nome (name) e a descrição (description) da Skill."
    },
    {
        question: "Como o agente de IA decide qual Skill deve ser ativada para responder ao prompt do usuário?",
        options: [
            "Através de uma lista fixa configurada no código-fonte principal",
            "Ele sempre executa todas as Skills ao mesmo tempo",
            "Fazendo um match de intenção do usuário contra as descrições declaradas nos metadados de cada Skill",
            "O usuário deve digitar obrigatoriamente o ID numérico da Skill"
        ],
        answer: 2,
        explanation: "O agente analisa semanticamente o prompt do usuário e o compara com a descrição (description) fornecida nas Skills cadastradas para encontrar a melhor correspondência."
    },
    {
        question: "Qual a finalidade de colocar um script (ex: validate_commit.js) dentro de uma Skill?",
        options: [
            "Apenas para embelezar a estrutura de diretórios",
            "Permitir que a IA execute rotinas programáticas e interaja com recursos externos/locais",
            "Substituir o modelo de linguagem por código fixo",
            "Nenhuma, scripts não rodam de dentro das Skills"
        ],
        answer: 1,
        explanation: "Scripts auxiliares estendem as habilidades da IA permitindo que ela execute rotinas de verificação, manipulação de arquivos ou requisições de API reais."
    }
];

let currentQuestionIndex = 0;
let userScore = 0;
let selectedOptionIndex = null;
let answerChecked = false;

function renderQuiz() {
    const quizContainer = document.getElementById('quiz-container');
    
    if (currentQuestionIndex >= quizQuestions.length) {
        // Show results
        quizContainer.innerHTML = `
            <div class="quiz-result-overlay">
                <h2>Parabéns! Você concluiu o Quiz</h2>
                <p>Sua pontuação foi de <strong>${userScore}</strong> de <strong>${quizQuestions.length}</strong> acertos.</p>
                <button class="btn" onclick="restartQuiz()">Reiniciar Quiz</button>
            </div>
        `;
        return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];
    
    let optionsHtml = '';
    currentQuestion.options.forEach((option, idx) => {
        let cardClass = 'option-card';
        if (selectedOptionIndex === idx) cardClass += ' selected';
        
        if (answerChecked) {
            if (idx === currentQuestion.answer) {
                cardClass += ' correct';
            } else if (selectedOptionIndex === idx) {
                cardClass += ' incorrect';
            }
        }

        optionsHtml += `
            <div class="${cardClass}" onclick="selectOption(${idx})">
                <div class="option-circle">
                    ${answerChecked && idx === currentQuestion.answer ? '✓' : ''}
                    ${answerChecked && idx !== currentQuestion.answer && selectedOptionIndex === idx ? '✗' : ''}
                </div>
                <span>${option}</span>
            </div>
        `;
    });

    let footerBtnHtml = '';
    if (!answerChecked) {
        footerBtnHtml = `<button class="btn" onclick="checkAnswer()" ${selectedOptionIndex === null ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Confirmar Resposta</button>`;
    } else {
        footerBtnHtml = `<button class="btn" onclick="nextQuestion()">Próxima Pergunta</button>`;
    }

    quizContainer.innerHTML = `
        <h2 class="card-title cyan">Testando Conhecimentos</h2>
        <div class="quiz-question-box">
            <div class="quiz-progress">Pergunta ${currentQuestionIndex + 1} de ${quizQuestions.length}</div>
            <p class="question-text">${currentQuestion.question}</p>
            <div class="options-grid">
                ${optionsHtml}
            </div>
            
            ${answerChecked ? `
                <div class="alert-info" style="margin-top: 1.5rem; border-left-color: ${selectedOptionIndex === currentQuestion.answer ? 'var(--success)' : 'var(--accent)'}">
                    <p><strong>${selectedOptionIndex === currentQuestion.answer ? 'Correto! 🎉' : 'Ops, incorreto! 💡'}</strong> ${currentQuestion.explanation}</p>
                </div>
            ` : ''}
        </div>
        <div class="quiz-footer">
            <div></div>
            ${footerBtnHtml}
        </div>
    `;
}

function selectOption(index) {
    if (answerChecked) return;
    selectedOptionIndex = index;
    renderQuiz();
}

function checkAnswer() {
    if (selectedOptionIndex === null || answerChecked) return;
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (selectedOptionIndex === currentQuestion.answer) {
        userScore++;
    }
    
    answerChecked = true;
    renderQuiz();
}

function nextQuestion() {
    currentQuestionIndex++;
    selectedOptionIndex = null;
    answerChecked = false;
    renderQuiz();
}

function restartQuiz() {
    currentQuestionIndex = 0;
    userScore = 0;
    selectedOptionIndex = null;
    answerChecked = false;
    renderQuiz();
}

// Initial Run
document.addEventListener('DOMContentLoaded', () => {
    renderQuiz();
});
