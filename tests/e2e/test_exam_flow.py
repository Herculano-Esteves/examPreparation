"""
tests/e2e/test_exam_flow.py
---------------------------
E2E automated tests for solving exams, question types, feedback,
navigation controls, difficulty toggles, and the results screen.
"""

import re

try:
    import pytest
    from playwright.sync_api import Page, expect
except ImportError:
    import unittest
    raise unittest.SkipTest("Playwright and Pytest are installed inside .venv; run via .\\.venv\\Scripts\\pytest tests/e2e")


def test_solve_multiple_choice_question(page: Page, base_url: str):
    """
    Tests opening a course with multiple choice questions (TSO),
    launching an exam, selecting an option, confirming, and verifying feedback.
    """
    page.goto(base_url)

    # 1. Click TSO course card
    tso_card = page.locator("#cadeiras-grid .exam-list-row:has-text('TSO')")
    expect(tso_card).to_be_visible(timeout=5000)
    tso_card.click()

    # 2. Click the first exam in the list
    first_exam = page.locator("#exams-grid .exam-list-row").first
    expect(first_exam).to_be_visible(timeout=5000)
    first_exam.click()

    # 3. Verify exam screen is active
    expect(page.locator("#screen-exam")).to_be_visible()

    # 4. Locate multiple choice options
    options = page.locator(".option-btn")
    expect(options.first).to_be_visible()

    # 5. Select the first option
    options.first.click()
    expect(options.first).to_have_class(re.compile(r"selected-toggled"))

    # 6. Confirm the selection
    btn_confirm = page.locator(".btn-confirm-answer")
    expect(btn_confirm).to_be_enabled()
    btn_confirm.click()

    # 7. Verify answer feedback banner appears
    feedback = page.locator("#answer-feedback")
    expect(feedback).to_be_visible()
    expect(feedback).not_to_have_class(re.compile(r"\bhidden\b"))


def test_solve_boolean_question(page: Page, base_url: str):
    """
    Tests opening an exam with Boolean (True/False) questions in SSI (Exame Modelo 4),
    selecting V or F, confirming, and verifying feedback.
    """
    page.goto(base_url)

    # 1. Click SSI course card
    ssi_card = page.locator("#cadeiras-grid .exam-list-row:has-text('SSI')")
    expect(ssi_card).to_be_visible(timeout=5000)
    ssi_card.click()

    # 2. Click ExameModelo4 which starts with boolean questions
    ssi_exam = page.locator("#exams-grid .exam-list-row:has-text('Modelo 4')").first
    expect(ssi_exam).to_be_visible(timeout=5000)
    ssi_exam.click()


    # 3. Verify exam screen is active
    expect(page.locator("#screen-exam")).to_be_visible()

    # 4. Check for True / False buttons (V and F)
    options = page.locator(".option-btn")
    expect(options).to_have_count(2)

    # 5. Click the first option and confirm
    options.first.click()
    btn_confirm = page.locator(".btn-confirm-answer")
    expect(btn_confirm).to_be_enabled()
    btn_confirm.click()

    # 6. Feedback is shown
    expect(page.locator("#answer-feedback")).to_be_visible()



def test_solve_written_question(page: Page, base_url: str):
    """
    Tests answering an essay / cloze test (escrita) question,
    typing into the textarea, and revealing the expected answer.
    """
    page.goto(base_url)

    # 1. Click ADI course card
    adi_card = page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')")
    expect(adi_card).to_be_visible(timeout=5000)
    adi_card.click()

    # 2. Click ExameADI10 which is composed of escrita questions
    adi_exam = page.locator("#exams-grid .exam-list-row:has-text('Exame ADI 10')").first
    expect(adi_exam).to_be_visible(timeout=5000)
    adi_exam.click()

    expect(page.locator("#screen-exam")).to_be_visible()

    # 3. Verify written question textarea exists
    textarea = page.locator("#written-answer-input")
    expect(textarea).to_be_visible()
    textarea.fill("Regressão linear e hold-out")

    # 4. Click 'Ver Resposta' button to reveal solution
    btn_reveal = page.locator(".btn-reveal")
    expect(btn_reveal).to_be_visible()
    btn_reveal.click()

    # 5. Textarea should now be disabled and feedback visible
    expect(textarea).to_be_disabled()
    expect(page.locator("#answer-feedback")).to_be_visible()


def test_exam_navigation_controls_and_progress(page: Page, base_url: str):
    """
    Tests question navigation (Anterior / Seguinte),
    progress bar updates, and the exit button.
    """
    page.goto(base_url)

    # Enter TSO first exam
    tso_card = page.locator("#cadeiras-grid .exam-list-row:has-text('TSO')")
    tso_card.click()
    page.locator("#exams-grid .exam-list-row").first.click()
    expect(page.locator("#screen-exam")).to_be_visible()

    # Question counter check
    counter = page.locator("#question-counter")
    expect(counter).to_contain_text("Questão 1 de")

    # Click Next (Seguinte)
    btn_next = page.locator("#btn-next")
    expect(btn_next).to_be_visible()
    btn_next.click()

    expect(counter).to_contain_text("Questão 2 de")

    # Click Previous (Anterior)
    btn_prev = page.locator("#btn-prev")
    expect(btn_prev).to_be_visible()
    btn_prev.click()

    expect(counter).to_contain_text("Questão 1 de")

    # Click Exit (Sair) button to return to menu
    btn_exit = page.locator("#btn-exit")
    expect(btn_exit).to_be_visible()
    btn_exit.click()

    expect(page.locator("#screen-menu")).to_be_visible()
    expect(page.locator("#screen-exam")).not_to_be_visible()


def test_toggle_difficult_question(page: Page, base_url: str):
    """
    Tests marking and unmarking a question as difficult using #btn-toggle-difficult.
    """
    page.goto(base_url)

    tso_card = page.locator("#cadeiras-grid .exam-list-row:has-text('TSO')")
    tso_card.click()
    page.locator("#exams-grid .exam-list-row").first.click()
    expect(page.locator("#screen-exam")).to_be_visible()

    btn_diff = page.locator("#btn-toggle-difficult")
    expect(btn_diff).to_be_visible()

    # Toggle to marked (difficult)
    btn_diff.click()
    expect(btn_diff).to_have_class(re.compile(r"is-difficult"))

    # Toggle to unmarked
    btn_diff.click()
    expect(btn_diff).not_to_have_class(re.compile(r"is-difficult"))



def test_exam_completion_and_results_screen(page: Page, base_url: str):
    """
    Tests completing an exam and verifying the results screen metrics,
    score percentage, and returning to the menu.
    """
    page.goto(base_url)

    tso_card = page.locator("#cadeiras-grid .exam-list-row:has-text('TSO')")
    tso_card.click()
    page.locator("#exams-grid .exam-list-row").first.click()
    expect(page.locator("#screen-exam")).to_be_visible()

    # Advance to the last question via script evaluation for fast deterministic test
    page.evaluate("""() => {
        window.__jumpToLastQuestion = function() {
            const { State } = window;
            // Import State from module or trigger via navigation
            State.question.index = State.totalQuestions - 1;
        };
    }""")
    # Or trigger nextQuestion until the last question
    page.evaluate("""async () => {
        const { nextQuestion, renderQuestion } = await import('./static/js/question.js');
        const { State } = await import('./static/js/state.js');
        State.question.index = State.totalQuestions - 1;
        renderQuestion();
    }""")

    # Confirm we are on the last question
    btn_next = page.locator("#btn-next")
    btn_next.click()

    # Verify results screen is displayed
    results_screen = page.locator("#screen-results")
    expect(results_screen).to_be_visible()

    # Verify score percentage and counters exist
    expect(page.locator("#results-score-percentage")).to_be_visible()
    expect(page.locator("#results-correct-count")).to_be_visible()
    expect(page.locator("#results-incorrect-count")).to_be_visible()

    # Click Back to Menu from results
    btn_back_menu = page.locator("#btn-back-menu")
    expect(btn_back_menu).to_be_visible()
    btn_back_menu.click()

    expect(page.locator("#screen-menu")).to_be_visible()
    expect(results_screen).not_to_be_visible()
