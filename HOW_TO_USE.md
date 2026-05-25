# How to Use and Extend the Exam Simulator

This guide explains how to add new subjects, write exams, and use the Python builder tool to compile and update the simulator automatically.

---

## 1. Overview & Automatic Compilation

The Exam Simulator is designed as a static Single Page Application (SPA) that runs entirely in the browser (perfect for GitHub Pages). All courses (subjects) and exams are defined inside the `exames/` directory as JSON files.

The Python script `run.py` at the root of the project handles the compilation automatically:
* It scans the `exames/` folder for subdirectories (each representing a subject).
* For each subject, it reads the course metadata (`cadeira.json`) and scans all its exam files (`*.json`).
* It automatically counts the questions, validates the structure of the files, compiles individual subject index files (`index.json`), and updates the global `cadeiras.json`.

**Rule of Thumb:** Whenever you add, delete, or modify any subject folder or exam file, simply run:
```bash
python3 run.py --build-only
```
This single command will rebuild all metadata, indices, and exam lists instantly.

---

## 2. Adding a New Subject

To add a new subject to the simulator, follow these steps:

1. **Create a new folder** inside the `exames/` directory. Use a short, lowercase folder name (this will be the subject's unique ID):
   ```
   exames/adi/
   ```

2. **Create a `cadeira.json` metadata file** inside that new folder:
   ```
   exames/adi/cadeira.json
   ```

3. **Fill the `cadeira.json` file** with the subject details:
   ```json
   {
     "nome": "Administração de Redes e Sistemas",
     "sigla": "ARS",
     "icon": "fa-network-wired",
     "descricao": "Gestão de servidores, automação, serviços de rede (DNS, DHCP, Mail) e monitorização de infraestruturas."
   }
   ```
   * **`nome`**: The full name of the subject.
   * **`sigla`**: The short abbreviation (e.g., ADI, TSO, SSI).
   * **`icon`**: A FontAwesome free solid icon class name (e.g., `fa-network-wired`, `fa-shield-halved`, `fa-laptop-code`, `fa-microchip`, `fa-database`).
   * **`descricao`**: A brief description of the syllabus.

---

## 3. Creating an Exam

To add an exam to an existing subject:

1. **Create a JSON file** inside the subject's folder (e.g., `exames/adi/Exame1.json`). You can use any name for the file.
2. **Structure the JSON** as follows:
   ```json
   {
     "titulo": "Exame do Capítulo 1: Introdução à Administração de Sistemas",
     "descricao": "Avaliação dos princípios de DevOps, gestão de configuração e automação de servidores.",
     "perguntas": [
       // Questions go here
     ]
   }
   ```

---

## 4. Question Formats

The simulator supports three types of questions inside the `"perguntas"` array:

### A. Multiple Choice (Normal)
Used for standard multiple-choice questions. It supports single or multiple correct answers. Options are shuffled dynamically at runtime.

```json
{
  "pergunta": "Qual das seguintes ferramentas é considerada uma solução declarativa de gestão de configuração?",
  "opcoes": [
    "Bash scripting.",
    "Ansible Playbooks.",
    "Comandos ad-hoc por SSH.",
    "Cron jobs manuais."
  ],
  "solucao": [
    1
  ]
}
```
* **`opcoes`**: Array of strings representing the alternatives.
* **`solucao`**: Array of integers (0-indexed) specifying the index of the correct alternative(s).

### B. True or False (`boolean`)
Designed specifically for True or False questions. It automatically generates the options "Verdadeiro" and "Falso" in the browser (always keeping True on top and False on bottom; they are never shuffled).

```json
{
  "tipo": "boolean",
  "pergunta": "O Ansible requer a instalação de um agente permanente em execução em cada nó administrado.",
  "solucao": 1
}
```
* **`tipo`**: Must be set to `"boolean"`.
* **`solucao`**: An integer indicating the correct choice:
  * `0` = Verdadeiro (True)
  * `1` = Falso (False)

### C. Written/Essay (`escrita`)
Used for open-ended or theoretical explanation questions. The user can type their answer and click to compare it with the expected official resolution.

```json
{
  "tipo": "escrita",
  "pergunta": "Explique a diferença fundamental entre as abordagens Push e Pull em ferramentas de gestão de configuração.",
  "solucao": "Na abordagem **Push** (ex: Ansible), o nó central inicia a ligação SSH e envia as configurações diretamente para os clientes. Na abordagem **Pull** (ex: Puppet/Chef), os nós clientes correm um agente local que contacta periodicamente o servidor central para descarregar e aplicar as políticas."
}
```
* **`tipo`**: Must be set to `"escrita"`.
* **`solucao`**: A string containing the detailed official explanation. It fully supports **Markdown** formatting (e.g. bold text, blockquotes) and **KaTeX/LaTeX** equations (`$` for inline math, `$$` for block math).

### Optional: Context Headers (`cabecalho`)
For any of the three question types above, you can optionally include a `"cabecalho"` field. It will display in a formatted, code-friendly box immediately above the question text. This is useful for terminal logs, code snippets, or configuration files:

```json
{
  "tipo": "boolean",
  "cabecalho": "$ ansible all -m ping\nnode1 | SUCCESS => {\n    \"changed\": false,\n    \"ping\": \"pong\"\n}",
  "pergunta": "O comando ad-hoc acima confirma que o Ansible conseguiu autenticar-se e interagir com o módulo ping no host 'node1'.",
  "solucao": 0
}
```

---

## 5. Development & Compilation Commands

Use the following commands with `run.py` to test and compile:

* **Compile and start local server**:
  ```bash
  python3 run.py
  ```
  This updates all json index files and starts a local web server at `http://127.0.0.1:5000`.

* **Compile only (without running a server)**:
  ```bash
  python3 run.py --build-only
  ```
  Useful if you are updating files before committing or if you are running your own local web server.
