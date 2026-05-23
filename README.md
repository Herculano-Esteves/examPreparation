# Exam Preparation

This repository contains the static and modular version of the **Exam Simulator**, optimized to run directly on **GitHub Pages** (`github.io`).

---

## Current State and Future Vision

* **What we have today**: The project serves as an exam preparation platform, providing exams divided by specific parts/topics of the course material and exams.
* **What we want to achieve**:
  * **Explanations per question**: Add a detailed explanation section for each question, revealed along with the solution.
  * **Integrated Study Material**: Provide summaries, theoretical material, and supporting documents directly linked to the topics, allowing you to study without leaving the application.
  * **Multidisciplinary Expansion**: Keep adding exams and summaries for new courses by leveraging the modular dynamic loading system.

---

## Architecture

To enable hosting on GitHub Pages, the project is structured as follows:

* `index.html`: The main page of the application (SPA).
* `exames/cadeiras.json`: Automatically generated global configuration listing active courses.
* `static/`: Contains modern visual styles (`style.css`) and simulator logic (`app.js`).
* `exames/`: Root folder containing subfolders for each course (e.g., `exames/ssi/`).
  * `exames/<cadeira_id>/index.json`: Generated exam index for that specific course.
  * `exames/<cadeira_id>/cadeira.json`: Course metadata (Name, Abbreviation, Icon, Description).
  * `exames/<cadeira_id>/*.json`: Individual files containing exam questions.
* `run.py`: Auxiliary Python script that scans exam folders, validates structure, compiles indices, and enables local testing.

---

## How to Test Locally

You can test the simulator locally before committing and pushing to GitHub:

1. **Open the terminal** in the project folder:
   ```bash
   cd examPreparation
   ```

2. **Run the Python script**:
   ```bash
   ../venv/bin/python run.py
   ```
   *Note: The script only uses the Python standard library, requiring no external dependencies.*

3. **Access the simulator**:
   Open your browser at:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

4. **Compile JSON files only** (generate indices and `cadeiras.json` without starting the server):
   ```bash
   ../venv/bin/python run.py --build-only
   ```