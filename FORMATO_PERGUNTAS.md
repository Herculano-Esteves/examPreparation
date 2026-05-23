# Formato das Perguntas do Simulador de Exames

Este documento explica os três formatos de perguntas suportados pelo simulador de exames. Todos os exames são carregados dinamicamente a partir de ficheiros JSON na pasta `exames/`.

---

## 1. Escolha Múltipla (Normal)
Este é o formato padrão para perguntas de escolha múltipla. Suporta tanto uma única resposta correta como múltiplas respostas corretas (seleção múltipla). As opções são baralhadas dinamicamente no frontend a cada inicialização do exame.

### Estrutura JSON:
```json
{
  "pergunta": "Qual é a largura de bits de cada registador virtual da máquina virtual do eBPF?",
  "opcoes": [
    "16 bits.",
    "32 bits.",
    "64 bits (R0 a R10).",
    "128 bits."
  ],
  "solucao": [
    2
  ]
}
```

*   **`pergunta`** (string): O enunciado da pergunta.
*   **`opcoes`** (array de strings): A lista de alíneas apresentadas ao utilizador.
*   **`solucao`** (array de inteiros): Os índices (começando em `0`) correspondentes às respostas corretas. Neste exemplo, `2` corresponde à opção `"64 bits (R0 a R10)."`.

---

## 2. Verdadeiro ou Falso (`boolean`)
Este formato é otimizado para questões do tipo Verdadeiro/Falso. Não necessita do campo `opcoes` no JSON, sendo gerado implicitamente no browser. A ordem das opções ("Verdadeiro" em cima, "Falso" em baixo) nunca é baralhada.

### Estrutura JSON:
```json
{
  "tipo": "boolean",
  "pergunta": "O mecanismo seccomp no Linux permite restringir proativamente as chamadas de sistema (syscalls).",
  "solucao": 0
}
```

*   **`tipo`** (string): Deve ser igual a `"boolean"`.
*   **`pergunta`** (string): O enunciado da afirmação a validar.
*   **`solucao`** (inteiro ou array de inteiros): Define a resposta correta:
    *   `0` para **Verdadeiro**
    *   `1` para **Falso**

---

## 3. Resposta de Escrita/Desenvolvimento (`escrita`)
Este formato destina-se a perguntas abertas ou de desenvolvimento. O utilizador pode opcionalmente escrever a sua resposta num campo de texto e depois confirmar para comparar a sua resolução com a resposta oficial esperada.

### Estrutura JSON:
```json
{
  "tipo": "escrita",
  "pergunta": "Explique o papel do Verificador eBPF na segurança do kernel.",
  "solucao": "O Verificador realiza uma análise estática do Grafo de Fluxo de Controlo (CFG) para garantir terminação e simula a execução para rastrear o estado dos registadores e da stack..."
}
```

*   **`tipo`** (string): Deve ser igual a `"escrita"`.
*   **`pergunta`** (string): O enunciado da pergunta de desenvolvimento.
*   **`solucao`** (string): A resposta esperada ou resolução detalhada para efeitos de autoavaliação.

---

## Recursos Comuns (Opcionais)
Qualquer um dos três tipos de perguntas acima pode conter um campo **`cabecalho`** (string). Se presente, este campo é renderizado em destaque imediatamente acima da pergunta, servindo para introduzir cenários, enunciados extensos, excertos de código ou tabelas de contexto.
