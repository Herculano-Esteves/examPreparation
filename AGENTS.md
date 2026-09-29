# Repository Guidelines

## Project Structure & Module Organization

`index.html` is the entry point for the GitHub Pages app. Browser logic lives in ES modules under `static/js/`; styles and fonts live under `static/`. Exam content is organized by course in `exames/<course-id>/`: `cadeira.json` holds course metadata, individual JSON files hold exams, and `index.json` is a generated course index. `exames/cadeiras.json` is the generated global index. `run.py` builds and validates this data and serves the app locally. Maintained tests are in `tests/`; `scratch/`, `debug_tools/`, and the ignored `Test/` directory contain ad hoc development aids.

Use [codebase.md](codebase.md) as the maintained map of entry points, modules, data flow, and where to make common changes. Update it when the layout changes.

## Build, Test, and Development Commands

Run core tooling from the repository root with Python 3 using the standard library:

- `python run.py` rebuilds indexes and starts the local server at `http://127.0.0.1:5000`.
- `python run.py --build-only` regenerates `exames/*/index.json` and `exames/cadeiras.json` without serving.
- `python run.py --validate` checks exam JSON syntax, fields, and references.
- `python -m unittest discover -s tests -p "test_*.py"` runs the maintained standard library test suite.

When adding content, `python run.py --new-exam adi ExamName` can create a starter exam. Rebuild indexes after editing exam files and review the generated changes before committing.

### Python Virtual Environment (`.venv`) & E2E Testing with Playwright

**Rule:** The core repository tooling runs on Python standard library without external dependencies. Any external Python packages, browser automation tools, or test runners (such as Playwright, Pytest) **MUST** be installed and run inside a virtual environment (`.venv`). Do not install external packages into the global system Python.

1. Create the virtual environment:
   ```powershell
   python -m venv .venv
   ```
2. Activate the virtual environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
3. Install development/test dependencies:
   ```powershell
   pip install -r requirements-dev.txt
   ```
4. Install Playwright browser binaries (Chromium headless):
   ```powershell
   playwright install chromium
   ```
5. Run automated E2E headless tests:
   ```powershell
   pytest tests/e2e
   ```
   Or without manual activation:
   ```powershell
   .\.venv\Scripts\pytest tests/e2e
   ```

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

- **Unit & Integrity Tests**: Maintained standard library tests use Python's `unittest` and follow `tests/test_*.py` with `test_*` methods. Add or update a focused test when changing index generation, exam data rules, or frontend module contracts. Run `--validate` for content changes and `python -m unittest discover -s tests -p "test_*.py"` before a pull request.
- **E2E & UI Automation**: Browser automation and interaction tests live under `tests/e2e/` and use Playwright with Pytest inside `.venv`. They validate user flows (navigation, button clicks, state transitions) in headless mode.

## Documentation & README Maintenance Guidelines

- **Evaluate `README.md` at the End of Every Feature**:
  - After completing a feature or significant functionality update, review `README.md` to determine whether the user-facing documentation or project description needs to be updated.
  - **When to update `README.md`**: Update it when adding or altering core features, architecture, public capabilities, or data formats (e.g., introducing a new question type, a new practice mode, new CLI commands, or new directory structures).
  - **When NOT to update `README.md`**: Do **not** modify `README.md` for minor bug fixes, internal refactorings, or cosmetic styling changes (e.g., adjusting button colors, hover effects, margins, or padding).

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects prefixed `feat:` or `fix:`; follow that pattern, for example `fix: preserve exam filter selection`. Keep commits scoped. In a pull request, explain the user-facing change, list validation performed, link any relevant issue, and include screenshots for visual changes. Call out regenerated exam indexes when they are part of the diff.
