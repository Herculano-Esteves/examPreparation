import { APP_CONFIG } from './config.js';

export const JSON_INSTRUCTIONS = {
    pt: `Cria um exame no formato JSON seguindo rigorosamente a especificação técnica e o esquema abaixo:

================================================================================
1. TIPOS DE PERGUNTA SUPORTADOS ("type")
================================================================================
Existem exatamente 3 tipos de perguntas suportadas pelo simulador:

1. "escolha_multipla" (Escolha Múltipla):
   - "options": Obrigatório. Lista com as opções de resposta (alíneas A, B, C, D...).
   - "solution": Obrigatório. Array com os índices (base 0) da(s) resposta(s) correta(s).
     Exemplo: [0] para a 1ª opção, [1] para a 2ª opção, ou [0, 2] se existirem múltiplas opções corretas.

2. "boolean" (Verdadeiro ou Falso):
   - "options": NÃO se usa este campo (é gerado automaticamente pelo simulador).
   - "solution": Obrigatório. Inteiro com o valor da verdade:
     * 0 = Verdadeiro (True)
     * 1 = Falso (False)

3. "escrita" (Desenvolvimento / Resposta Aberta):
   - "options": NÃO se usa este campo.
   - "solution": Obrigatório. Texto detalhado com a resolução modelo e critérios de correção.

Campos Opcionais (comuns a qualquer tipo):
- "header": Código de exemplo, comandos de terminal ou enunciado introdutório (suporta Markdown).
- "explanation": Justificação teórica exibida após o utilizador responder.

================================================================================
2. FORMATO 1: EXAME MONOLÍNGUE (SIMPLES)
================================================================================
{
  "title": "Exame de Sistemas Operativos 2024",
  "description": "Exame sobre processos, memória virtual e escalonamento.",
  "languages": ["pt"],
  "questions": [
    {
      "type": "escolha_multipla",
      "header": "\`\`\`c\\nint pid = fork();\\nif (pid == 0) { printf(\\"Filho\\"); }\\n\`\`\`",
      "question": "Qual é a saída do processo filho?",
      "options": [
        "Imprime 'Filho'",
        "Imprime 'Pai'",
        "Retorna erro -1",
        "O processo termina imediatamente"
      ],
      "solution": [0],
      "explanation": "No processo filho, o fork() retorna 0, executando o bloco if."
    },
    {
      "type": "boolean",
      "header": "\`\`\`bash\\n$ ls -la /var/log\\n\`\`\`",
      "question": "O comando acima lista ficheiros no formato longo incluindo ficheiros ocultos.",
      "solution": 0,
      "explanation": "A flag -a mostra ficheiros iniciados por '.' e -l usa formato longo."
    },
    {
      "type": "escrita",
      "question": "Explique a diferença entre paginação e segmentação de memória.",
      "solution": "A **paginação** divide a memória em blocos de tamanho fixo (frames/páginas).\\nA **segmentação** divide em blocos de tamanho variável com base na estrutura lógica.",
      "explanation": "Critérios: referir tamanho fixo vs variável e fragmentação externa vs interna."
    }
  ]
}

================================================================================
3. FORMATO 2: EXAME BILÍNGUE (ESTRUTURA COMPLETA)
================================================================================
Em exames bilingues ("languages": ["pt", "en"]), todos os campos de texto tornam-se objetos {"pt": "...", "en": "..."}.
Em "options", cada idioma deve ter um array com a mesma quantidade de opções e a mesma ordem exata:

{
  "title": {
    "pt": "Exame de Aprendizagem e Decisão Inteligentes",
    "en": "Intelligent Learning and Decision Exam"
  },
  "description": {
    "pt": "Exame cobrindo regressão, árvores de decisão e redes neuronais.",
    "en": "Exam covering regression, decision trees, and neural networks."
  },
  "languages": ["pt", "en"],
  "questions": [
    {
      "type": "escolha_multipla",
      "question": {
        "pt": "Qual das seguintes métricas penaliza fortemente outliers na regressão?",
        "en": "Which of the following metrics heavily penalises outliers in regression?"
      },
      "options": {
        "pt": ["MAE (Erro Médio Absoluto)", "MSE (Erro Médio Quadrático)", "Acurácia", "F1-Score"],
        "en": ["MAE (Mean Absolute Error)", "MSE (Mean Squared Error)", "Accuracy", "F1-Score"]
      },
      "solution": [1],
      "explanation": {
        "pt": "O MSE eleva os erros ao quadrado, penalizando fortemente erros de maior magnitude.",
        "en": "MSE squares the errors, heavily penalising larger magnitude deviations."
      }
    },
    {
      "type": "boolean",
      "question": {
        "pt": "Num problema de classificação binária, o atributo target é contínuo.",
        "en": "In a binary classification problem, the target attribute is continuous."
      },
      "solution": 1,
      "explanation": {
        "pt": "Falso. Na classificação o target é discreto/categórico. Targets contínuos correspondem a regressão.",
        "en": "False. In classification the target is discrete/categorical. Continuous targets correspond to regression."
      }
    },
    {
      "type": "escrita",
      "question": {
        "pt": "Explique as consequências de aplicar discretização de igual largura num atributo com assimetria positiva.",
        "en": "Explain the consequences of applying equal width binning to an attribute with positive skewness."
      },
      "solution": {
        "pt": "Devido à cauda longa à direita, a maioria dos registos concentrar-se-á nos primeiros intervalos à esquerda, deixando os intervalos à direita quase vazios.",
        "en": "Due to the long right tail, the vast majority of records will fall into the first few bins on the left, leaving the rightmost bins nearly empty."
      }
    }
  ]
}

================================================================================
4. DIRETRIZES DE FORMATAÇÃO
================================================================================
- Markdown e LaTeX: Todos os textos suportam formatação Markdown (negrito, itálico, listas, tabelas) e fórmulas matemáticas KaTeX ($inline$ ou $$display$$).
- Escape de Caracteres: Em strings JSON, use sempre escape em quebras de linha (\\n), aspas internas (\\") e barras de LaTeX (\\\\frac{a}{b}).
- Saída: Devolva EXCLUSIVAMENTE o código JSON puro e válido, sem blocos de código Markdown (\`\`\`json) ou texto de conversa.

--------------------------------------------------------------------------------
Sabendo as instruções anteriores quero que faça um exame segundo o que o utilizador pede:
(Agora faça aqui o pedido do tipo de exame ou matérias que quer, pode adicionar ficheiros à parte para a sua inteligência artificial ler)`,

    en: `Create an exam in JSON format following strictly the technical specifications and schema below:

================================================================================
1. SUPPORTED QUESTION TYPES ("type")
================================================================================
There are exactly 3 question types supported by the simulator:

1. "escolha_multipla" (Multiple Choice):
   - "options": Required. Array of answer choices (options A, B, C, D...).
   - "solution": Required. Array of 0-based indices corresponding to the correct answer(s).
     Example: [0] for the 1st option, [1] for the 2nd option, or [0, 2] for multiple correct answers.

2. "boolean" (True or False):
   - "options": DO NOT include this field (automatically rendered by the simulator).
   - "solution": Required. Integer representing the truth value:
     * 0 = True (Verdadeiro)
     * 1 = False (Falso)

3. "escrita" (Open / Written Response):
   - "options": DO NOT include this field.
   - "solution": Required. Detailed model answer and grading criteria.

Optional Fields (applicable to any question type):
- "header": Code snippet, terminal output, or introductory context (supports Markdown).
- "explanation": Rationale/justification displayed after the user answers.

================================================================================
2. FORMAT 1: MONOLINGUAL EXAM (SIMPLE)
================================================================================
{
  "title": "Operating Systems Exam 2024",
  "description": "Exam covering processes, virtual memory, and CPU scheduling.",
  "languages": ["en"],
  "questions": [
    {
      "type": "escolha_multipla",
      "header": "\`\`\`c\\nint pid = fork();\\nif (pid == 0) { printf(\\"Child\\"); }\\n\`\`\`",
      "question": "What is the output of the child process?",
      "options": [
        "Prints 'Child'",
        "Prints 'Parent'",
        "Returns error -1",
        "Process terminates immediately"
      ],
      "solution": [0],
      "explanation": "In the child process, fork() returns 0, executing the if block."
    },
    {
      "type": "boolean",
      "header": "\`\`\`bash\\n$ ls -la /var/log\\n\`\`\`",
      "question": "The command above lists files in long format including hidden files.",
      "solution": 0,
      "explanation": "The -a flag lists entries starting with '.' and -l uses long format."
    },
    {
      "type": "escrita",
      "question": "Explain the difference between memory paging and segmentation.",
      "solution": "**Paging** divides memory into fixed-size blocks (pages/frames).\\n**Segmentation** divides memory into variable-sized logical blocks.",
      "explanation": "Grading criteria: mention fixed vs variable block size and internal vs external fragmentation."
    }
  ]
}

================================================================================
3. FORMAT 2: BILINGUAL EXAM (FULL SPECIFICATION)
================================================================================
In bilingual exams ("languages": ["en", "pt"]), all text fields become objects {"en": "...", "pt": "..."}.
In "options", each language must contain an array with identical option count and 1-to-1 order:

{
  "title": {
    "en": "Intelligent Learning and Decision Exam",
    "pt": "Exame de Aprendizagem e Decisão Inteligentes"
  },
  "description": {
    "en": "Exam covering regression, decision trees, and neural networks.",
    "pt": "Exame cobrindo regressão, árvores de decisão e redes neuronais."
  },
  "languages": ["en", "pt"],
  "questions": [
    {
      "type": "escolha_multipla",
      "question": {
        "en": "Which of the following metrics heavily penalises outliers in regression?",
        "pt": "Qual das seguintes métricas penaliza fortemente outliers na regressão?"
      },
      "options": {
        "en": ["MAE (Mean Absolute Error)", "MSE (Mean Squared Error)", "Accuracy", "F1-Score"],
        "pt": ["MAE (Erro Médio Absoluto)", "MSE (Erro Médio Quadrático)", "Acurácia", "F1-Score"]
      },
      "solution": [1],
      "explanation": {
        "en": "MSE squares the errors, heavily penalising larger magnitude deviations.",
        "pt": "O MSE eleva os erros ao quadrado, penalizando fortemente erros de maior magnitude."
      }
    },
    {
      "type": "boolean",
      "question": {
        "en": "In a binary classification problem, the target attribute is continuous.",
        "pt": "Num problema de classificação binária, o atributo target é contínuo."
      },
      "solution": 1,
      "explanation": {
        "en": "False. In classification the target is discrete/categorical. Continuous targets correspond to regression.",
        "pt": "Falso. Na classificação o target é discreto/categórico. Targets contínuos correspondem a regressão."
      }
    },
    {
      "type": "escrita",
      "question": {
        "en": "Explain the consequences of applying equal width binning to an attribute with positive skewness.",
        "pt": "Explique as consequências de aplicar discretização de igual largura num atributo com assimetria positiva."
      },
      "solution": {
        "en": "Due to the long right tail, the vast majority of records will fall into the first few bins on the left, leaving the rightmost bins nearly empty.",
        "pt": "Devido à cauda longa à direita, a maioria dos registos concentrar-se-á nos primeiros intervalos à esquerda, deixando os intervalos à direita quase vazios."
      }
    }
  ]
}

================================================================================
4. FORMATTING GUIDELINES
================================================================================
- Markdown & LaTeX: All text fields support Markdown formatting (bold, italics, lists, tables) and KaTeX math notation ($inline$ or $$display$$).
- Character Escaping: In JSON strings, always escape newlines (\\n), internal quotes (\\"), and LaTeX backslashes (\\\\frac{a}{b}).
- Output: Return EXCLUSIVELY raw, valid JSON with no markdown code fences (\`\`\`json) or conversational preamble.

--------------------------------------------------------------------------------
Based on the instructions above, please generate an exam according to what the user requests:
(Now write here your prompt with the exam topics, subject, or attach files for your AI to read)`
};

/**
 * Returns the JSON instructions template matching the requested or active language.
 * @param {string} [lang]
 * @returns {string}
 */
export function getJsonInstructions(lang = null) {
    const activeLang = lang || APP_CONFIG.defaultLanguage;
    return JSON_INSTRUCTIONS[activeLang] || JSON_INSTRUCTIONS.en || JSON_INSTRUCTIONS.pt;
}

/**
 * Question resolution status enum for exam history and progress tracking.
 * 1: CORRECT (Acertei / Correta - 1 ponto no score)
 * 2: INCORRECT (Errei / Incorreta - 0 pontos no score)
 * 3: UNANSWERED (Por responder - 0 pontos no score)
 * 4: ANSWERED (Respondida / Revelada sem autoavaliação - 0 pontos no score)
 */
export const QuestionStatus = Object.freeze({
    CORRECT: 1,
    INCORRECT: 2,
    UNANSWERED: 3,
    ANSWERED: 4
});
