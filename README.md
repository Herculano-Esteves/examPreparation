# Exam Preparation

This repository contains the static and modular version of the **Exam Simulator**, optimized to run directly on **GitHub Pages** (`github.io`) with zero runtime backend dependencies.

---

## Current State and Vision

* **What we have today**: An interactive single-page exam preparation platform with multi-faceted filtering, dual-pane exam authoring, customizable practice sessions (targeting difficult and incorrect questions), local storage persistence, and native bilingual support (PT/EN).
* **Future enhancements**:
  * **Explanations per question**: Continue expanding detailed solution walk-throughs across all questions.
  * **Integrated Study Material**: Provide topic-specific summaries and theoretical references linked directly into practice sessions.
  * **Curriculum Expansion**: Add new university subjects and question types using the modular index-generation system.

---

## Architecture

To run entirely client-side on GitHub Pages, the application is structured as follows:

* `index.html`: Main single-page application (SPA) shell, top navigation bars, screen containers, and modal dialogs.
* `static/`:
  * `static/js/`: Focused native ES modules handling routing, state management, question rendering, filtering, and storage.
  * `static/fonts/`: Local, self-hosted WOFF2 web fonts (Inter, JetBrains Mono, Share Tech Mono) for strict privacy compliance.
  * `static/style.css`, `colors.css`, `typography.css`, `menu.css`: Design system tokens, responsive floating layouts, and dark theme styles.
* `exames/`: Course data and exam questions stored as JSON.
  * `exames/cadeiras.json`: Generated global catalog listing all active courses.
  * `exames/<course-id>/cadeira.json`: Course metadata (Name, Abbreviation, Icon, Description).
  * `exames/<course-id>/index.json`: Generated exam manifest for that specific course.
  * `exames/<course-id>/*.json`: Individual exam files containing questions, solutions, and explanations.
* `run.py`: Auxiliary Python CLI that compiles manifests, validates schema integrity, and serves the local development server.
* `tests/`:
  * `tests/test_*.py`: Python standard library unit and integrity tests (import/export coherence, schema verification, DOM contracts).
  * `tests/e2e/`: Automated End-to-End headless browser tests powered by Playwright and Pytest.
* `requirements-dev.txt`: Optional development dependencies for Playwright E2E browser automation.

---

## Local Development & Testing

### 1. Run the Local Development Server
The core application tooling runs with Python 3 using the **standard library** without external dependencies:

```bash
# Starts local server at http://127.0.0.1:5000 and watches for exam JSON changes
python run.py

# Recompile exam indexes and global catalog only (without starting the server)
python run.py --build-only

# Run strict schema and content validation on all JSON files
python run.py --validate
```

### 2. Run Standard Unit & Integrity Tests
```bash
python -m unittest discover -s tests -p "test_*.py"
```

---

## Automated E2E Testing with Playwright

Automated end-to-end tests simulate real user clicks, screen navigation, question solving, filters, and settings in **headless mode** (running invisibly in the background).

> **Note:** All external dependencies **must** be installed inside a Python virtual environment (`.venv`) to keep the global system Python clean.

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