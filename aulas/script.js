document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================
     1. NAVIGATION TABS LOGIC
     ========================================== */
  const navButtons = document.querySelectorAll('.nav-btn');
  const moduleSections = document.querySelectorAll('.module-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      
      // Update active nav button
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active module section
      moduleSections.forEach(section => {
        if (section.id === targetId) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });

      // Re-trigger MathJax rendering if switching tabs
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise();
      }
    });
  });

  /* ==========================================
     2. SUBNET CALCULATOR ENGINE
     ========================================== */
  const inputIp = document.getElementById('input-ip');
  const selectCidr = document.getElementById('select-cidr');
  const btnCalcular = document.getElementById('btn-calcular');
  const calcOutput = document.getElementById('calc-output');

  function calculateSubnet() {
    const ipStr = inputIp.value.trim();
    const cidr = parseInt(selectCidr.value, 10);

    // Validate IP format
    const ipParts = ipStr.split('.');
    if (ipParts.length !== 4 || ipParts.some(p => isNaN(p) || p === '' || p < 0 || p > 255)) {
      calcOutput.innerHTML = `<div class="quiz-feedback wrong-fb">⚠️ Por favor, insira um endereço IPv4 válido no formato xxx.xxx.xxx.xxx (ex: 192.168.1.0).</div>`;
      return;
    }

    const o1 = parseInt(ipParts[0], 10);
    const o2 = parseInt(ipParts[1], 10);
    const o3 = parseInt(ipParts[2], 10);
    const o4 = parseInt(ipParts[3], 10);

    // Calculate Host bits and Subnet mask
    const hostBits = 32 - cidr;
    const totalAddresses = Math.pow(2, hostBits);
    const usableHosts = totalAddresses >= 2 ? totalAddresses - 2 : 0;

    // Generate Subnet Mask decimal and binary
    let maskBinaryStr = '';
    for (let i = 0; i < 32; i++) {
      if (i > 0 && i % 8 === 0) maskBinaryStr += '.';
      maskBinaryStr += (i < cidr) ? '1' : '0';
    }

    const maskOctets = maskBinaryStr.split('.').map(b => parseInt(b, 2));
    const maskDecStr = maskOctets.join('.');

    // Calculate number of subnets if borrowing from /24 (when prefix >= 24)
    let numSubnetsFrom24 = cidr >= 24 ? Math.pow(2, cidr - 24) : 1;
    let blockSize = cidr >= 24 ? totalAddresses : 256;

    // Build Subnets Table
    let tableRowsHtml = '';
    if (cidr >= 24) {
      let currentOctet4 = 0;
      const countToDisplay = Math.min(numSubnetsFrom24, 16); // limit display to 16 rows if /30

      for (let s = 0; s < countToDisplay; s++) {
        let netAddr = `${o1}.${o2}.${o3}.${currentOctet4}`;
        let firstHost = `${o1}.${o2}.${o3}.${currentOctet4 + 1}`;
        let lastHost = `${o1}.${o2}.${o3}.${currentOctet4 + totalAddresses - 2}`;
        let bcAddr = `${o1}.${o2}.${o3}.${currentOctet4 + totalAddresses - 1}`;

        tableRowsHtml += `
          <tr>
            <td><strong class="sub-num">Sub-rede ${s + 1}</strong></td>
            <td><code class="code-net">${netAddr}/${cidr}</code></td>
            <td><code class="code-host">${firstHost}</code></td>
            <td><code class="code-host">${lastHost}</code></td>
            <td><code class="code-bc">${bcAddr}</code></td>
          </tr>
        `;
        currentOctet4 += totalAddresses;
      }
    }

    // Render Calculator HTML
    calcOutput.innerHTML = `
      <div class="breakdown-grid">
        <div class="bd-item">
          <span class="bd-label">Prefixo / Máscara</span>
          <span class="bd-val">/${cidr} (${maskDecStr})</span>
        </div>
        <div class="bd-item">
          <span class="bd-label">Bits de Host ($n$)</span>
          <span class="bd-val">32 - ${cidr} = ${hostBits} bits</span>
        </div>
        <div class="bd-item">
          <span class="bd-label">Endereços por Bloco</span>
          <span class="bd-val">2<sup>${hostBits}</sup> = ${totalAddresses} IPs</span>
        </div>
        <div class="bd-item">
          <span class="bd-label">Hosts Utilizáveis</span>
          <span class="bd-val">${usableHosts} dispositivos</span>
        </div>
      </div>

      <div class="card" style="background: rgba(0,0,0,0.3); margin-top: 1rem;">
        <h4>Representação Binária da Máscara:</h4>
        <div class="binary-mask-display" style="font-size: 1rem; margin-top: 0.5rem;">
          ${maskBinaryStr.split('.').map((oct, idx) => {
            const isFullNet = (idx + 1) * 8 <= cidr;
            const isPartNet = idx * 8 < cidr && (idx + 1) * 8 > cidr;
            if (isFullNet) return `<span class="net-bits">${oct}</span>`;
            if (isPartNet) {
              const netLen = cidr - idx * 8;
              return `<span class="net-bits">${oct.slice(0, netLen)}</span><span class="host-bits">${oct.slice(netLen)}</span>`;
            }
            return `<span class="host-bits">${oct}</span>`;
          }).join('.')}
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem;">
          <span style="color: var(--primary);">■ Bits 1 (Rede)</span> &nbsp;|&nbsp; 
          <span style="color: #c084fc;">■ Bits 0 (Host)</span>
        </p>
      </div>

      ${cidr >= 24 ? `
        <h4 class="sub-heading-table">Divisão em Sub-redes (${numSubnetsFrom24} sub-redes geradas com bloco de ${totalAddresses} IPs):</h4>
        <div class="table-responsive">
          <table class="custom-table table-striped">
            <thead>
              <tr>
                <th>Sub-rede</th>
                <th>Endereço de Rede</th>
                <th>Primeiro IP Válido</th>
                <th>Último IP Válido</th>
                <th>Endereço de Broadcast</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;

    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise();
    }
  }

  btnCalcular.addEventListener('click', calculateSubnet);
  // Auto calculate initial state
  calculateSubnet();


  /* ==========================================
     3. INTERACTIVE QUIZ ENGINE
     ========================================== */
  const questions = [
    {
      question: "Quantos hosts válidos (utilizáveis) existem em uma rede IPv4 com prefixo /27?",
      options: ["32", "30", "62", "14"],
      correct: 1,
      explanation: "Em uma rede /27, restam 32 - 27 = 5 bits para host. Total de endereços = 2⁵ = 32. Descontando 1 de rede e 1 de broadcast (32 - 2), restam 30 hosts válidos. (Slide 19 do Material)."
    },
    {
      question: "Ao dividir uma rede /24 em quatro sub-redes iguais, qual será o novo prefixo CIDR?",
      options: ["/25", "/26", "/27", "/28"],
      correct: 1,
      explanation: "Para gerar 4 sub-redes iguais, precisamos de 2² = 4. Emprestamos 2 bits da parte de host. Assim, o novo prefixo passa de /24 para /24 + 2 = /26. (Slide 14 do Material)."
    },
    {
      question: "Qual é a máscara de sub-rede em formato decimal pontuado correspondente ao prefixo /26?",
      options: ["255.255.255.128", "255.255.255.192", "255.255.255.224", "255.255.255.240"],
      correct: 1,
      explanation: "O prefixo /26 possui 26 bits 1. O quarto octeto possui 2 bits 1 (11000000 em binário), que equivale em decimal a 128 + 64 = 192. Logo, a máscara é 255.255.255.192."
    },
    {
      question: "Na sub-rede 192.168.1.64/26, qual é o endereço de Broadcast?",
      options: ["192.168.1.65", "192.168.1.126", "192.168.1.127", "192.168.1.128"],
      correct: 2,
      explanation: "O bloco de uma rede /26 possui 64 endereços. A sub-rede começa em 192.168.1.64. O último endereço do bloco (64 + 64 - 1 = 127) é o broadcast: 192.168.1.127."
    },
    {
      question: "Por que subtraímos 2 na fórmula de hosts utilizáveis (2ⁿ - 2)?",
      options: [
        "Porque 2 bits são perdidos devido à conversão binária.",
        "Porque o primeiro endereço identifica a REDE e o último é o BROADCAST.",
        "Porque 2 endereços são sempre reservados para o Roteador Gateway.",
        "Porque a notação CIDR exige um número par de dispositivos."
      ],
      correct: 1,
      explanation: "O primeiro endereço do bloco identifica a própria sub-rede e o último envia mensagens para todos os dispositivos (broadcast). Nenhum desses dois pode ser atribuído a um computador."
    },
    {
      question: "Qual das alternativas indica um motivo principal para realizar o Subnetting em uma empresa?",
      options: [
        "Aumentar a velocidade física dos cabos de rede.",
        "Isolar departamentos, reduzir o domínio de broadcast e melhorar a segurança.",
        "Substituir totalmente a necessidade de usar roteadores.",
        "Converter automaticamente endereços IPv4 em IPv6."
      ],
      correct: 1,
      explanation: "O subnetting permite dividir a rede em domínios menores, diminuindo o tráfego desnecessário de broadcast, aumentando a segurança (controles de firewall por setor) e melhorando o gerenciamento."
    }
  ];

  let currentQuestionIndex = 0;
  let score = 0;
  let userAnswers = new Array(questions.length).fill(null);

  const quizContainer = document.getElementById('quiz-container');
  const quizProgressFill = document.getElementById('quiz-progress-fill');
  const quizResultBox = document.getElementById('quiz-result');

  function renderQuestion() {
    const q = questions[currentQuestionIndex];
    const progressPct = ((currentQuestionIndex) / questions.length) * 100;
    quizProgressFill.style.width = `${progressPct}%`;

    const isAnswered = userAnswers[currentQuestionIndex] !== null;
    const selectedOpt = userAnswers[currentQuestionIndex];

    let optionsHtml = q.options.map((opt, idx) => {
      let optClass = 'quiz-opt-btn';
      if (isAnswered) {
        if (idx === q.correct) optClass += ' correct';
        else if (idx === selectedOpt) optClass += ' wrong';
      }

      return `
        <button class="${optClass}" data-idx="${idx}" ${isAnswered ? 'disabled' : ''}>
          <span class="opt-prefix">${String.fromCharCode(65 + idx)}</span>
          <span>${opt}</span>
        </button>
      `;
    }).join('');

    let feedbackHtml = '';
    if (isAnswered) {
      const isCorrect = selectedOpt === q.correct;
      feedbackHtml = `
        <div class="quiz-feedback ${isCorrect ? 'correct-fb' : 'wrong-fb'}">
          <strong>${isCorrect ? '🎉 Resposta Correta!' : '❌ Resposta Incorreta.'}</strong><br>
          ${q.explanation}
        </div>
      `;
    }

    quizContainer.innerHTML = `
      <div class="quiz-question-header">
        <span class="quiz-q-num">Questão ${currentQuestionIndex + 1} de ${questions.length}</span>
      </div>
      <h3 class="quiz-q-title">${q.question}</h3>
      <div class="quiz-options">
        ${optionsHtml}
      </div>
      ${feedbackHtml}
      <div class="quiz-actions">
        ${isAnswered ? `
          <button id="btn-next-q" class="btn-primary">
            ${currentQuestionIndex < questions.length - 1 ? 'Próxima Questão ➔' : 'Ver Resultado Final 🏆'}
          </button>
        ` : ''}
      </div>
    `;

    // Attach option click listeners
    const optButtons = quizContainer.querySelectorAll('.quiz-opt-btn');
    optButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const chosenIdx = parseInt(btn.getAttribute('data-idx'), 10);
        userAnswers[currentQuestionIndex] = chosenIdx;
        if (chosenIdx === q.correct) score++;
        renderQuestion();
      });
    });

    // Next question button
    const btnNext = quizContainer.querySelector('#btn-next-q');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (currentQuestionIndex < questions.length - 1) {
          currentQuestionIndex++;
          renderQuestion();
        } else {
          showResults();
        }
      });
    }
  }

  function showResults() {
    quizProgressFill.style.width = '100%';
    quizContainer.classList.add('hidden');
    quizResultBox.classList.remove('hidden');

    const pct = Math.round((score / questions.length) * 100);
    let title = '';
    let message = '';

    if (pct === 100) {
      title = '🏆 Excelente! Domínio Perfeito!';
      message = 'Você acertou todas as questões! Você dominou a estrutura IPv4, CIDR e o cálculo de sub-redes.';
    } else if (pct >= 70) {
      title = '👏 Muito Bom!';
      message = 'Você demonstrou ótimo conhecimento sobre cálculo de sub-redes e notação CIDR.';
    } else {
      title = '📚 Vamos Revisar?';
      message = 'Você pode revisar os Módulos 1, 2 e 3 para reforçar as fórmulas e a matemática das sub-redes!';
    }

    quizResultBox.innerHTML = `
      <h2>${title}</h2>
      <div class="quiz-score-badge">${score} / ${questions.length}</div>
      <p style="font-size: 1.1rem; color: var(--text-light); margin-bottom: 1rem;">Aproveitamento: <strong>${pct}%</strong></p>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${message}</p>
      <button id="btn-restart-quiz" class="btn-primary">Refazer Avaliação 🔄</button>
    `;

    document.getElementById('btn-restart-quiz').addEventListener('click', () => {
      currentQuestionIndex = 0;
      score = 0;
      userAnswers = new Array(questions.length).fill(null);
      quizResultBox.classList.add('hidden');
      quizContainer.classList.remove('hidden');
      renderQuestion();
    });
  }

  // Initial Quiz Render
  renderQuestion();

});
