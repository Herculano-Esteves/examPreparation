# Repository Guidelines

## Project Structure & Module Organization

`index.html` is the entry point for the GitHub Pages app. Browser logic lives in ES modules under `static/js/`; styles and fonts live under `static/`. Exam content is organized by course in `exames/<course-id>/`: `cadeira.json` holds course metadata, individual JSON files hold exams, and `index.json` is a generated course index. `exames/cadeiras.json` is the generated global index. `run.py` builds and validates this data and serves the app locally. Maintained tests are in `tests/`; `scratch/`, `debug_tools/`, and the ignored `Test/` directory contain ad hoc development aids.

Use [codebase.md](codebase.md) as the maintained map of entry points, modules, data flow, and where to make common changes. Update it when the layout changes.

## Build, Test, and Development Commands

Run these from the repository root with Python 3; the main tooling uses the standard library.

- `python run.py` rebuilds indexes and starts the local server at `http://127.0.0.1:5000`.
- `python run.py --build-only` regenerates `exames/*/index.json` and `exames/cadeiras.json` without serving.
- `python run.py --validate` checks exam JSON syntax, fields, and references.
- `python -m unittest discover -s tests -p "test_*.py"` runs the maintained test suite.

When adding content, `python run.py --new-exam adi ExamName` can create a starter exam. Rebuild indexes after editing exam files and review the generated changes before committing.

## Coding Style & Naming Conventions

Follow the surrounding code: four-space indentation in Python and JavaScript, semicolons and single-quoted imports in JavaScript, and two-space indentation in JSON. Use `snake_case` for Python functions and test files, `camelCase` for JavaScript functions, and descriptive module names such as `examFilters.js`. Keep browser code in focused ES modules. No repository-wide formatter or linter is configured; avoid unrelated formatting changes. Use `FORMATO_PERGUNTAS.md` for question types and solution indexing.

## Testing Guidelines

Tests use Python's `unittest` and follow `tests/test_*.py` with `test_*` methods. Add or update a focused test when changing index generation, exam data rules, or frontend module contracts. Run `--validate` for content changes and the test suite before a pull request. There is no stated coverage threshold.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects prefixed `feat:` or `fix:`; follow that pattern, for example `fix: preserve exam filter selection`. Keep commits scoped. In a pull request, explain the user-facing change, list validation performed, link any relevant issue, and include screenshots for visual changes. Call out regenerated exam indexes when they are part of the diff.
