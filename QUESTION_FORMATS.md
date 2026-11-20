# Exam Simulator Question Formats

This document describes the three question formats supported by the Exam Simulator. All exams are dynamically loaded from JSON files located in the `exames/<course-id>/` directory.

---

## 1. Multiple Choice (`multiple_choice`)
The default format for multiple-choice questions. It supports both single-answer and multiple-answer (multi-select) questions. The alternative options are dynamically shuffled in the frontend upon each exam session initialization.

### JSON Structure:
```json
{
  "type": "multiple_choice",
  "question": "What is the bit width of each virtual register in the eBPF virtual machine?",
  "options": [
    "16 bits.",
    "32 bits.",
    "64 bits (R0 to R10).",
    "128 bits."
  ],
  "solution": [
    2
  ]
}
```

* **`type`** (string): `"multiple_choice"` (default if omitted; legacy `"escolha_multipla"` is also accepted).
* **`question`** (string or `{pt, en}` object): The question statement / prompt.
* **`options`** (array of strings or `{pt, en}` object): The list of choices presented to the user.
* **`solution`** (array of integers): Zero-based indices corresponding to the correct answer(s). In this example, `2` points to `"64 bits (R0 to R10)."`.

---

## 2. True or False (`boolean`)
Designed specifically for True or False questions. It does not require an `options` array in the JSON file, as options are generated implicitly by the browser. The presentation order ("True" on top, "False" on bottom, localized based on the active language) is never shuffled.

### JSON Structure:
```json
{
  "type": "boolean",
  "question": "Linux seccomp allows proactively restricting system calls (syscalls).",
  "solution": 0
}
```

* **`type`** (string): Must be `"boolean"`.
* **`question`** (string or `{pt, en}` object): The statement to be evaluated.
* **`solution`** (integer or array of integers): Defines the correct choice:
  * `0` for **True**
  * `1` for **False**

---

## 3. Written / Essay Response (`written`)
Designed for open-ended or theoretical explanation questions. The user can optionally type their answer in an interactive text field and submit to compare against the official expected answer for self-assessment.

### JSON Structure:
```json
{
  "type": "written",
  "question": "Explain the role of the eBPF Verifier in kernel security.",
  "solution": "The Verifier performs static analysis on the Control Flow Graph (CFG) to guarantee termination and simulates execution to track register and stack state..."
}
```

* **`type`** (string): Must be `"written"` (legacy `"escrita"` is also accepted).
* **`question`** (string or `{pt, en}` object): The open-ended question or problem statement.
* **`solution`** (string or `{pt, en}` object): The expected solution, explanation, or assessment criteria. Supports **Markdown** and **KaTeX/LaTeX** mathematical expressions (`$` for inline math, `$$` for block math).

---

## Common Optional Attributes

### 1. Context Headers (`cabecalho`)
Any of the three question types can include an optional **`cabecalho`** (string) field. When present, it is rendered in a highlighted callout container immediately above the question text. It is used to present problem scenarios, extended descriptions, code snippets, or monospace tables:
* Wrap terminal logs, code blocks, or ASCII tables inside triple backticks (\`\`\`) in the JSON string (with literal `\n` line breaks) to render them with monospaced typography and preserve whitespace alignment.

### 2. Answer Explanations (`explicacao`)
Any question type can include an optional **`explicacao`** (string) field. When the user confirms or reveals the solution, this explanation is displayed below the evaluation to provide pedagogical context. It supports both Markdown and KaTeX math formulas.
