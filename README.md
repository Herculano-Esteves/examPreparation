<div align="center">

# 🎓 Exam Simulator

**Interactive, client-side exam preparation platform optimized for GitHub Pages with zero backend dependencies.**

<p align="center">
  <a href="https://herculano-esteves.github.io/examPreparation/">
    <img src="https://img.shields.io/badge/Exam%20Simulator-Live%20Demo-2ea44f?style=for-the-badge&logo=githubpages&logoColor=white" alt="Exam Simulator Live Demo" />
  </a>
</p>

[![License: AGPL v3](https://img.shields.io/badge/License-AGPLv3-blue.svg?style=flat-square)](LICENSE)
[![i18n: PT / EN](https://img.shields.io/badge/i18n-PT%20%7C%20EN-blueviolet.svg?style=flat-square)](#features)

<br />

[🚀 **Launch Simulator**](https://herculano-esteves.github.io/examPreparation/) • [📖 **User Guide**](HOW_TO_USE.md) • [📝 **Question Formats**](QUESTION_FORMATS.md) • [🗺️ **Codebase Map**](codebase.md)

</div>

---

## ✨ Features

- **🎯 Interactive Practice Modes**:
  - Full exam simulations or targeted practice sessions.
  - Multi-faceted filters: filter by subject, specific exam, question count, difficulty ranges, and review missed or unanswered questions.
  - Performance analytics and score tracking with local storage persistence.
- **📋 Multiple Question Formats**:
  - **Multiple Choice**: Single or multi-select with dynamic option shuffling.
  - **True or False (`boolean`)**: Clean binary format with fixed ordering.
  - **Open / Written Response (`escrita`)**: Text input with guided self-assessment against the official solution.
  - Contextual headers (`cabecalho` field) for code snippets, markdown, or scenario descriptions across any question type.
  - For full JSON schema definitions and formatting rules, see [QUESTION_FORMATS.md](QUESTION_FORMATS.md).
- **🛠️ Exam Builder & Course Management**:
  - Visual dual-pane editor to create, validate, and preview questions and exams in real time.
  - Import and export courses and exams as JSON or ZIP archives (persisted in browser storage).
- **🌍 Internationalization (i18n)**:
  - Native bilingual support for Portuguese and English (PT/EN), switchable on the fly.
- **🔒 Privacy & Performance**:
  - 100% client-side execution; all web fonts (Inter, JetBrains Mono, Share Tech Mono) are self-hosted with zero third-party tracking.

---

## 🗺️ Architecture & Codebase Map

The project is structured into focused ES modules, domain-specific modular stylesheets, and JSON-based exam data compiled via a standard library Python toolchain.

- For an in-depth breakdown of modules, entry points, and directory layout, see [codebase.md](codebase.md).
- For step-by-step instructions on adding new courses, creating exam JSON files, and rebuild commands, see [HOW_TO_USE.md](HOW_TO_USE.md).
- Development rules, modularity standards, and contribution guidelines are detailed in [AGENTS.md](AGENTS.md).

---

## 💻 Local Development & Testing

### 1. Local Tooling & Development Server
Core development tooling uses Python 3 standard library with zero external dependencies:

```bash
# Start local server at http://127.0.0.1:5000 and rebuild indexes
python run.py

# Recompile exam manifests and global catalog only (without starting the server)
python run.py --build-only

# Run strict schema and content validation on all exam files
python run.py --validate
```

### 2. Standard Unit & Integrity Tests
Run unit and integrity tests verifying schemas, import/export contracts, and DOM bindings:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

---

## 🧪 Automated E2E Testing with Playwright

Automated end-to-end tests simulate real user flows (navigation, question solving, filters, and state transitions) in **headless mode**.

> **Note:** External packages (such as Playwright and Pytest) must be installed inside a Python virtual environment (`.venv`) to keep the global system clean.

1. **Create and activate the virtual environment**:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. **Install testing dependencies and the Chromium browser**:
   ```powershell
   pip install -r requirements-dev.txt
   playwright install chromium
   ```

3. **Run the automated E2E test suite**:
   ```powershell
   pytest tests/e2e
   ```
   Or without manual activation:
   ```powershell
   .\.venv\Scripts\pytest tests/e2e
   ```