/**
 * modelo.js - Modelo de Dados dos Alunos e Vinculação de Responsáveis
 * Escola Estadual Antonio Reginato - Turmas 2B e 3A (Populado via alunos.txt)
 */

const NOMES_ALUNOS_TXT = [
  "ALEXANDRE DA SILVA OLIVEIRA",
  "ALLAN GABRIEL TENORIO DO SOUTO",
  "ALLYSSON GABRIEL DE PAULA LIMA",
  "ANA JULIA ALVES DA SILVA",
  "ANA JULYA MONTANHAL LIMA",
  "ANA LYVIA ROCHA RIBEIRO",
  "ANITA PAES BAPTISTA",
  "ANTONY ELIAS BARBOSA DE SOUZA DELPHINO",
  "BRYAN YOSHISADA SUZUKI BRASIL",
  "CAIO HENRIQUE PEREIRA FERREIRA",
  "CALEBE NUNES DE OLIVEIRA",
  "DANIEL AZEVEDO NELERO ORTEGA",
  "DANIELLE RIBEIRO DE ARAÚJO",
  "DEBORA GONCALVES DOS SANTOS",
  "DIEGO CREMA JERONIMO",
  "DIEGO DOMINGUES DE SOUZA",
  "EDUARDO MASSON CANGUSSU",
  "EZEQUIEL VICTOR BALDENEBRO LIMA",
  "FELIPPE SOARES RAMOS DE ANDRADE CARDAMONI RODRIGUES",
  "GABRIEL ALVES ANDRADE",
  "GABRIEL PERES DE OLIVEIRA",
  "GABRIEL SILVA CAMPOS",
  "GABRIEL STRAIOTTO FRUTUOSO",
  "GIOVANNA KARLA ROCHA DA SILVA",
  "GUILHERME DE OLIVEIRA BAHIANO",
  "GUILHERME HENRIQUE DOS SANTOS COSTA",
  "ISADORA CRISTHINE STRAIOTTO DE OLIVEIRA",
  "JIMMY JAHZEEL LASCANO ROMERO",
  "JOÃO PEDRO GONÇALVES BARRETO",
  "JOÃO VICTOR FERNET ANTUNES",
  "JÚLIA MOREIRA PRADO",
  "KAIQUE DE BRITO OLIVEIRA",
  "KAWE RODRIGUES CATARINO DE QUEIROZ",
  "LETÍCIA DOS SANTOS NOGUEIRA",
  "LORENA CARDOSO DE OLIVEIRA",
  "LUANA BEATRIZ NAGASHI MAXIMO",
  "LUCAS SOARES MOURA",
  "LYVIA CAROLINA BARROS GARCIA",
  "MANUELLA DOS SANTOS LIMA",
  "MARCELO FRANCISCO DE OLIVEIRA JUNIOR",
  "MARIA CLARA MAYUMI SHINZATO XAVIER",
  "MARIA JULIA BALDENEBRO DOS REIS",
  "MARIA JULIA DOS SANTOS RODRIGUES DA SILVA",
  "MATHEUS DE OLIVEIRA NOVAES",
  "MATHEUS FORNAZARI SABATINI",
  "MATHEUS ROCHA LOPES",
  "PABLO HENRIQUE MIGUEL XAVIER",
  "PEDRO HENRIQUE BALDICERA DA SILVA",
  "PEDRO HENRIQUE TORRES",
  "PIETRO BUENO GRANCIERE",
  "RAFAEL YUDI OKA",
  "RICHARD URAKAWA DE CAMARGO",
  "RYAN FERNANDES DA SILVA",
  "SARA DOS SANTOS PEREIRA",
  "SARAH DOS SANTOS YACOUB",
  "STHEFANY VICTÓRIA GOMES MIQUELIM",
  "THALES COELHO LOURENÇO",
  "VICENTE BARBOSA SANTOS GONÇALVES",
  "VICTOR HUGO FERREIRA BRITO",
  "VINICIUS ALVES PEREIRA",
  "VINICIUS MARQUES SOUZA",
  "VITÓRIA CAPUTI DE JESUS",
  "YGOR GUSTAVO PEREIRA"
];

const ModeloAlunos = {
  escola: "EE Antonio Reginato",
  turmas: ["2B", "3A"],

  // Converte a lista do alunos.txt em objetos estruturados
  alunos: NOMES_ALUNOS_TXT.map((nome, index) => {
    // Distribui os alunos proporcionalmente entre 2B e 3A
    const turma = index < 31 ? "2B" : "3A";
    const raNum = (10203000 + index + 1).toString();
    return {
      id: `aluno_${index + 1}`,
      ra: `${raNum}-${(index % 9) + 1}`,
      nome: nome,
      turma: turma,
      escola: "EE Antonio Reginato"
    };
  }),

  /**
   * Retorna a lista de turmas disponíveis
   */
  getTurmas() {
    return this.turmas;
  },

  /**
   * Retorna todos os 63 alunos
   */
  getTodosAlunos() {
    return this.alunos;
  },

  /**
   * Retorna os alunos de uma determinada turma
   * @param {string} turma - Ex: "2B", "3A" ou "TODAS"
   */
  getAlunosPorTurma(turma) {
    if (!turma || turma.toUpperCase() === "TODAS") {
      return this.alunos;
    }
    return this.alunos.filter(a => a.turma.toUpperCase() === turma.toUpperCase());
  },

  /**
   * Busca um aluno pelo seu ID
   * @param {string} id
   */
  getAlunoPorId(id) {
    return this.alunos.find(a => a.id === id) || null;
  },

  /**
   * Monta o payload final vinculando o aluno ao responsável para envio ao webhook n8n
   * @param {string} alunoId 
   * @param {Object} dadosResponsavel - { nome, tipo, telefone, isWhatsapp, email }
   * @param {string} ambiente - "producao" ou "teste"
   */
  vincularResponsavelPayload(alunoId, dadosResponsavel, ambiente = "teste") {
    const aluno = this.getAlunoPorId(alunoId);
    if (!aluno) {
      throw new Error("Aluno não encontrado para vinculação.");
    }

    return {
      ambiente: ambiente,
      timestamp: new Date().toISOString(),
      aluno: {
        id: aluno.id,
        nome: aluno.nome,
        ra: aluno.ra,
        turma: aluno.turma,
        escola: aluno.escola
      },
      responsavel: {
        nome: dadosResponsavel.nome ? dadosResponsavel.nome.trim() : "",
        tipo: dadosResponsavel.tipo || "Outro",
        telefone: dadosResponsavel.telefone ? dadosResponsavel.telefone.trim() : "",
        is_whatsapp: Boolean(dadosResponsavel.isWhatsapp),
        email: dadosResponsavel.email ? dadosResponsavel.email.trim() : ""
      }
    };
  }
};

// Exporta para escopo global e Node
if (typeof module !== "undefined" && module.exports) {
  module.exports = ModeloAlunos;
} else {
  window.ModeloAlunos = ModeloAlunos;
}