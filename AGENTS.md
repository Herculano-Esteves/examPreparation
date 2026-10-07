# Repository Guidelines

## Project Structure & Module Organization

`index.html` is the entry point for the GitHub Pages app. Browser logic lives in ES modules under `static/js/`; styles and fonts live under `static/`. Exam content is organized by course in `exames/<course-id>/`: `cadeira.json` holds course metadata, individual JSON files hold exams, and `index.json` is a generated course index. `exames/cadeiras.json` is the generated global index. `run.py` builds and validates this data and serves the app locally. Maintained tests are in `tests/`; `scratch/`, `debug_tools/`, and the ignored `Test/` directory contain ad hoc development aids.

Use [codebase.md](codebase.md) as the maintained map of entry points, modules, data flow, and where to make common changes. Update it when the layout changes.

## Build, Test, and Development Commands

Run core tooling from the repository root with Python 3 using the standard library (use `python3` on Linux/macOS or `python` on Windows):

- `python3 run.py` rebuilds indexes and starts the local server at `http://127.0.0.1:5000`.
- `python3 run.py --build-only` regenerates `exames/*/index.json` and `exames/cadeiras.json` without serving.
- `python3 run.py --validate` checks exam JSON syntax, fields, and references.
- `python3 -m unittest discover -s tests -p "test_*.py"` runs the maintained standard library test suite.
- `python3 run.py --new-exam <course-id> <ExamName>` scaffolds a starter exam for a course.

### Exam Content & Index Hygiene Rule

Whenever creating, modifying, or deleting course or exam JSON files in `exames/`:
1. Rebuild indexes: `python3 run.py --build-only`
2. Validate integrity: `python3 run.py --validate`
3. Verify test suite: `python3 -m unittest discover -s tests -p "test_*.py"`
Always include generated manifest diffs (`index.json` and `cadeiras.json`) in the same commit.

### Python Virtual Environment (`.venv`) & E2E Testing with Playwright

**Rule:** The core repository tooling runs on Python standard library without external dependencies. Any external Python packages, browser automation tools, or test runners (such as Playwright, Pytest) **MUST** be installed and run inside a virtual environment (`.venv`). Do not install external packages into the global system Python.

1. Create the virtual environment:
   - Linux/macOS: `python3 -m venv .venv`
   - Windows: `python -m venv .venv`
2. Activate the virtual environment:
   - Linux/macOS: `source .venv/bin/activate`
   - Windows (PowerShell): `.\.venv\Scripts\Activate.ps1`
3. Install development/test dependencies:
   `pip install -r requirements-dev.txt`
4. Install Playwright browser binaries (Chromium headless):
   `playwright install chromium`
5. Run automated E2E headless tests:
   - Linux/macOS: `.venv/bin/pytest tests/e2e` (or `pytest tests/e2e` if activated)
   - Windows: `.\.venv\Scripts\pytest tests/e2e`

## Strict Architectural Invariants

### 1. Mandatory Legal & Regulatory Compliance
AI agents working on this codebase MUST strictly adhere to applicable European and international regulations, ensuring full legal compliance at all times:
- **GDPR / RGPD (EU 2016/679) & ePrivacy Directive (2002/58/EC)**:
  - The application must NEVER track users, collect personal identifiers, transmit telemetry/analytics, or set tracking cookies (`document.cookie`).
  - User progress and preferences must remain strictly local to the user's browser (`localStorage`).
  - To respect court rulings on unauthorized IP transmission (e.g. LG München Google Fonts ruling), no user IP address may ever be leaked to external CDNs or third-party servers.
  - Privacy notices and user data deletion controls (e.g., "Apagar Dados Locais") must always be maintained and kept transparent.
- **EU Directive 2000/31/EC (e-Commerce Directive / Portuguese DL n.º 7/2004, Art. 5.º)**:
  - Identification and direct contact information of the author (`herculano-esteves.github.io` and `PedroHerculano@proton.me`) must always remain prominently and legibly accessible in footers (`index.html`, `404.html`). Agents must never remove or obfuscate these credentials.
- **Intellectual Property & Open Source Licensing**:
  - Any imported library, icon set, font, or code snippet MUST be verified as legally compatible open-source software (e.g. MIT, SIL OFL 1.1, Apache 2.0, CC BY 4.0).
  - Agents MUST maintain and update [CREDITS.md](CREDITS.md) whenever any third-party dependency or asset is added, modified, or removed, preserving author attribution and copyright notices.
  - Proprietary, unlicensed, or restrictively copyrighted assets are strictly forbidden.
- **European Accessibility Act (EAA 2025) & WCAG 2.1**:
  - Semantic HTML, keyboard accessibility, accessible color contrast tokens, and screen reader labels must be preserved in all UI changes.

### 2. Privacy First, Offline Operation & Zero External CDNs
The application is a client-side Single Page Application (SPA) designed to function 100% offline with zero runtime backend dependencies:
- **NEVER insert external CDN links** (`<script>`, `<link rel="stylesheet">`, or web fonts from Google Fonts, unpkg, cdnjs, jsdelivr, etc.) into `index.html` or other documents.
- All fonts (`Inter`, `JetBrains Mono`) must be self-hosted locally in `static/fonts/`.
- All CSS, icons, and client scripts must reside locally under `static/`.

### 3. Internationalization (i18n) Mandate
The application supports bilingual localization (Portuguese and British English):
- **NO HARDCODED USER-FACING STRINGS**: Every user-visible text, placeholder, or tooltip in HTML must use `data-i18n="<key>"`.
- In JavaScript, dynamic text must be resolved via the translation engine (`t('<key>')` from `static/js/i18n.js`).
- When introducing or altering text, **always update both locale dictionaries simultaneously**:
  - `static/js/locales/pt.js` (Portuguese)
  - `static/js/locales/en.js` (British English)

### 4. Design System & CSS Tokens
- Do not introduce ad-hoc arbitrary hex colors or rogue font declarations.
- Reusable design tokens live in `static/colors.css` (semantic dark slate palette, accent purples, ambers, emeralds) and `static/typography.css` (root fluid scaling, typography tokens).
- Maintain responsive geometric proportion rules as documented in `codebase.md`.

## Coding Style & Naming Conventions

Follow the surrounding code: four-space indentation in Python and JavaScript, semicolons and single-quoted imports in JavaScript, and two-space indentation in JSON. Use `snake_case` for Python functions and test files, `camelCase` for JavaScript functions, and descriptive module names such as `examFilters.js`. Keep browser code in focused ES modules. No repository-wide formatter or linter is configured; avoid unrelated formatting changes. Use `QUESTION_FORMATS.md` for question types and solution indexing.

## Modularity & Feature Architecture Guidelines

To keep the codebase maintainable, readable, and scalable, **monolithic files are strictly forbidden**. All future additions and refactorings must adhere to these rules:

1. **File Size Guideline (< 400 Lines)**:
   - Keep files focused on a single responsibility.
   - When a module approaches or exceeds ~400 lines, or when it mixes multiple distinct concerns (e.g. DOM rendering, state parsing, event binding, calculation), it **must** be divided into smaller, focused modules inside a dedicated feature folder.

2. **Feature Folders (`static/js/<feature>/`)**:
   - Complex features must be grouped in dedicated subfolders:
     - `static/js/builder/`: Exam Builder submodules (`builderTemplates.js`, `builderParser.js`, `builderQuestionBox.js`).
     - `static/js/questions/`: Question solver submodules (`questionUI.js`, `questionEvaluation.js`, `questionResults.js`).
     - `static/js/locales/`: Localization dictionaries (`pt.js`, `en.js`), keeping `i18n.js` strictly as the translation engine.
   - For new multi-component features, create a new subfolder under `static/js/<feature-name>/`.

3. **Public Façades / Barrel Pattern**:
   - The top-level module (e.g. `static/js/question.js`, `static/js/examBuilder.js`) acts as the coordinator and entry point.
   - It re-exports symbols from internal feature submodules to preserve backwards compatibility with tests and callers (`main.js`, `exams.js`, E2E suites).

4. **Modular CSS (`static/css/`)**:
   - `static/style.css` is a master manifest importing modular stylesheets via `@import`.
   - Never dump general component styles into `static/style.css` directly. Add or edit styles in the respective domain file under `static/css/`:
     - `base.css`: resets, fonts, CSS variables, body layout, scrollbars.
     - `header.css`: top navigation, logo, sticky menu headers.
     - `catalog.css`: course grids, exam rows, floating sidebar filters, dual-range sliders.
     - `solver.css`: question split-pane, options, feedback banners, self-assessment.
     - `results.css`: results screen, dashboard metrics, review controls.
     - `forms.css`: form controls, custom course dialogs, icon picker grid.
     - `builder.css`: exam builder dual-pane layout, question cards, JSON editor.
     - `modals.css`: dialog backdrops, popovers, danger modals, toasts.
     - `responsive.css`: global media queries and screen breakpoint rules.

## Testing Guidelines

- **Unit & Integrity Tests**: Maintained standard library tests use Python's `unittest` and follow `tests/test_*.py` with `test_*` methods. Add or update a focused test when changing index generation, exam data rules, or frontend module contracts. Run `--validate` for content changes and `python3 -m unittest discover -s tests -p "test_*.py"` before a pull request.
- **E2E & UI Automation**: Browser automation and interaction tests live under `tests/e2e/` and use Playwright with Pytest inside `.venv`. They validate user flows (navigation, button clicks, state transitions) in headless mode.

## Documentation & README Maintenance Guidelines

- **Evaluate `README.md` at the End of Every Feature**:
  - After completing a feature or significant functionality update, review `README.md` to determine whether the user-facing documentation or project description needs to be updated.
  - **When to update `README.md`**: Update it when adding or altering core features, architecture, public capabilities, or data formats (e.g., introducing a new question type, a new practice mode, new CLI commands, or new directory structures).
  - **When NOT to update `README.md`**: Do **not** modify `README.md` for minor bug fixes, internal refactorings, or cosmetic styling changes (e.g., adjusting button colors, hover effects, margins, or padding).

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects prefixed `feat:` or `fix:`; follow that pattern, for example `fix: preserve exam filter selection`. Keep commits scoped. In a pull request, explain the user-facing change, list validation performed, link any relevant issue, and include screenshots for visual changes. Call out regenerated exam indexes when they are part of the diff.
