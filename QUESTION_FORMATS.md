# Exam Simulator Question Formats

This document describes the three question formats supported by the Exam Simulator. All exams are dynamically loaded from JSON files located in the `exames/<course-id>/` directory.

---

## 1. Multiple Choice (Standard)
The default format for multiple-choice questions. It supports both single-answer and multiple-answer (multi-select) questions. The alternative options are dynamically shuffled in the frontend upon each exam session initialization.

### JSON Structure:
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

* **`pergunta`** (string): The question statement / prompt.
* **`opcoes`** (array of strings): The list of choices presented to the user.
* **`solucao`** (array of integers): Zero-based indices corresponding to the correct answer(s). In this example, `2` points to the option `"64 bits (R0 a R10)."`.

---

## 2. True or False (`boolean`)
Designed specifically for True or False questions. It does not require an `opcoes` array in the JSON file, as options are generated implicitly by the browser. The presentation order ("True" on top, "False" on bottom, localized based on the active language) is never shuffled.

### JSON Structure:
```json
{
  "tipo": "boolean",
  "pergunta": "O mecanismo seccomp no Linux permite restringir proativamente as chamadas de sistema (syscalls).",
  "solucao": 0
}
```

* **`tipo`** (string): Must be `"boolean"`.
* **`pergunta`** (string): The statement to be evaluated.
* **`solucao`** (integer or array of integers): Defines the correct choice:
  * `0` for **True** (`Verdadeiro`)
  * `1` for **False** (`Falso`)

---

## 3. Written / Essay Response (`escrita`)
Designed for open-ended or theoretical explanation questions. The user can optionally type their answer in an interactive text field and submit to compare against the official expected answer for self-assessment.

### JSON Structure:
```json
{
  "tipo": "escrita",
  "pergunta": "Explique o papel do Verificador eBPF na segurança do kernel.",
  "solucao": "O Verificador realiza uma análise estática do Grafo de Fluxo de Controlo (CFG) para garantir terminação e simula a execução para rastrear o estado dos registadores e da stack..."
}
```

* **`tipo`** (string): Must be `"escrita"`.
* **`pergunta`** (string): The open-ended question or problem statement.
* **`solucao`** (string): The expected solution, explanation, or assessment criteria. Supports **Markdown** and **KaTeX/LaTeX** mathematical expressions (`$` for inline math, `$$` for block math).

---

## Common Optional Attributes

### 1. Context Headers (`cabecalho`)
Any of the three question types can include an optional **`cabecalho`** (string) field. When present, it is rendered in a highlighted callout container immediately above the question text. It is used to present problem scenarios, extended descriptions, code snippets, or monospace tables:
* Wrap terminal logs, code blocks, or ASCII tables inside triple backticks (\`\`\`) in the JSON string (with literal `\n` line breaks) to render them with monospaced typography and preserve whitespace alignment.

### 2. Answer Explanations (`explicacao`)
Any question type can include an optional **`explicacao`** (string) field. When the user confirms or reveals the solution, this explanation is displayed below the evaluation to provide pedagogical context. It supports both Markdown and KaTeX math formulas.
