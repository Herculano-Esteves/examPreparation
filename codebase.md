# Codebase Map

## At a Glance

This is a static exam simulator served by GitHub Pages. `index.html` provides the single-page interface, browser modules in `static/js/` drive it, and JSON files in `exames/` provide course and exam content. `run.py` is the local development, validation, and index-building tool; it is not a production server dependency.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `index.html` | Page markup, UI containers, and the `static/js/main.js` module entry point. |
| `static/js/` | Browser behavior, split into ES modules. |
| `static/style.css`, `static/colors.css`, `static/typography.css` | Layout, color tokens, and typography. `static/fonts/` holds local font files. |
| `exames/<course-id>/cadeira.json` | Course name, abbreviation, icon, and description. Current IDs: `adi`, `ssi`, `tso`. |
| `exames/<course-id>/*.json` | Source exam questions and metadata. |
| `exames/<course-id>/index.json`, `exames/cadeiras.json` | Generated exam and course listings; rebuild with `python run.py --build-only`. |
| `tests/` | Maintained Python `unittest` checks for data building and frontend contracts. |
| `scripts/`, `scratch/`, `debug_tools/`, `Test/` | Utility and exploratory scripts; `Test/` is ignored by Git. |

## Browser Modules

- `main.js` initializes the app and wires events. `elements.js` centralizes DOM lookups; `events.js`, `navigation.js`, and `state.js` handle interaction and navigation state.
- `cadeiras.js`, `exams.js`, `examService.js`, `examCard.js`, and `examSorting.js` load and present course and exam listings.
- `examFilters.js`, `filterState.js`, `dualRangeSlider.js`, and `practiceHub.js` implement filtering and practice selection.
- `question.js`, `questionTypes.js`, and `renderer.js` render exam questions and results.
- `examBuilder.js`, `examSharing.js`, `zipService.js`, `validation.js`, and `storage.js` support local exam creation, import/export, validation, and browser persistence.
- `i18n.js` holds translations; `layout.js` and `settingsPopover.js` manage responsive layout and settings. `constants.js`, `config.js`, `utils.js`, and `notifications.js` provide shared values and helpers.

## Data Flow and Change Guide

The browser loads `exames/cadeiras.json`, then a selected course's `index.json`, then an individual exam JSON file. `run.py` scans source exams and rebuilds both index levels. For a new course or exam, follow `HOW_TO_USE.md` and `FORMATO_PERGUNTAS.md`, rebuild indexes, and run `python run.py --validate`. For UI changes, start at `index.html` and the relevant `static/js/` module; update matching styles in `static/`. Run `python -m unittest discover -s tests -p "test_*.py"` for maintained checks.
