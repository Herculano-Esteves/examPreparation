# Exam Preparation

This repository contains the static and modular version of the **Information Systems Security (ISS) Theory Exam Simulator**, optimized to run directly on **GitHub Pages** (`github.io`).

## Static and Modular Architecture

To enable hosting on GitHub Pages (which only supports static files such as HTML, CSS, and JavaScript), the project uses the following structure:

- `index.html`: The main page of the simulator (uses relative paths for resources).
- `static/`: Contains visually rich styles (`style.css`) and frontend interaction logic (`app.js`).
- `exames/`: Folder where individual JSON files for each exam are added (e.g., `ExameModelo.json`, etc.).
- `exames.json`: Automatically generated consolidated file that contains all validated exams ready to be consumed by the frontend.
- `run.py`: Auxiliary Python script for local development. It validates all exam files, generates the consolidated `exames.json`, and starts a local server.

---

## How to Test Locally

You can test the site locally before committing and pushing to GitHub:

1. **Open the terminal** in the project folder:
   ```bash
   cd examPreparation
   ```

2. **Run the Python script**:
   ```bash
   python run.py
   ```
   *Note: The script uses only the Python standard library, so no additional dependencies (such as Flask) are required.*

3. **Access the simulator**:
   Open your browser and go to the link shown in the terminal:
   ```text
   http://127.0.0.1:5000
   ```

4. **Compilation-only mode** (if you only want to regenerate `exames.json` without starting the server):
   ```bash
   python run.py --build-only
   ```

---

## Adding New Exams

To add new exams or questions:
1. Create or edit a `.json` file inside the `exames/` folder.
2. Ensure the format follows the expected structure (including `titulo`, `descricao`, and a list of `perguntas` containing `pergunta`, `opcoes`, and `solucao` as indices of the correct answer).
3. Run the `run.py` script locally to validate the changes and update the `exames.json` file.