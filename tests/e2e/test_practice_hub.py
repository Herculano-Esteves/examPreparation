"""
tests/e2e/test_practice_hub.py
------------------------------
E2E automated tests for the Subject Practice Hub:
- Zero state display
- Launching targeted sessions for Difficult Questions
- Launching targeted sessions for Incorrect Questions
"""

import json
import re

try:
    import pytest
    from playwright.sync_api import Page, expect
except ImportError:
    import unittest
    raise unittest.SkipTest("Playwright and Pytest are installed inside .venv; run via .\\.venv\\Scripts\\pytest tests/e2e")


def test_practice_hub_zero_state(page: Page, base_url: str):
    """
    Verifies that when no questions are flagged as difficult or incorrect,
    the Practice Hub displays 0 count and disabled buttons.
    """
    page.goto(base_url)

    # Enter ADI course
    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    expect(page.locator("#exams-grid .exam-list-row").first).to_be_visible(timeout=5000)

    # Difficult questions counter
    diff_count = page.locator("#practice-difficult-count-text")
    expect(diff_count).to_contain_text("0")

    # Incorrect questions counter
    inc_count = page.locator("#practice-incorrect-count-text")
    expect(inc_count).to_contain_text("0")

    # Launch buttons should be disabled
    btn_diff = page.locator("#btn-practice-difficult")
    expect(btn_diff).to_be_disabled()

    btn_inc = page.locator("#btn-practice-incorrect")
    expect(btn_inc).to_be_disabled()




def test_practice_difficult_questions_session(page: Page, base_url: str):
    """
    Tests pre-flagging a difficult question in localStorage,
    asserting the Practice Hub counter displays 1, launching the session,
    and verifying the exam solver loads only that question.
    """
    page.goto(base_url)

    # Pre-configure 1 difficult question for ADI ExameADI1
    page.evaluate("""() => {
        localStorage.setItem('simulador_perguntas_dificeis', JSON.stringify({
            'ExameADI1': [0]
        }));
    }""")

    # Reload and navigate into ADI
    page.goto(base_url)
    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    expect(page.locator("#exams-grid .exam-list-row").first).to_be_visible(timeout=5000)

    # Verify Difficult count is 1
    diff_count = page.locator("#practice-difficult-count-text")
    expect(diff_count).to_contain_text("1")

    # Launch practice session
    btn_diff = page.locator("#btn-practice-difficult")
    expect(btn_diff).not_to_have_class(re.compile(r"btn-practice-disabled"))
    btn_diff.click()

    # Verify session solver is active
    expect(page.locator("#screen-exam")).to_be_visible()
    expect(page.locator("#question-counter")).to_contain_text("Questão 1 de 1")


def test_practice_incorrect_questions_session(page: Page, base_url: str):
    """
    Tests pre-configuring an incorrect answer in localStorage,
    asserting the Incorrect counter displays 1, and launching the corrective session.
    """
    page.goto(base_url)

    # Pre-configure QuestionStatus.INCORRECT (value = 2) for ExameADI1 question 0
    page.evaluate("""() => {
        localStorage.setItem('simulador_historico_exames', JSON.stringify({
            'ExameADI1': [2]
        }));
    }""")

    page.goto(base_url)
    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    expect(page.locator("#exams-grid .exam-list-row").first).to_be_visible(timeout=5000)

    # Verify Incorrect count is 1
    inc_count = page.locator("#practice-incorrect-count-text")
    expect(inc_count).to_contain_text("1")

    # Launch incorrect practice session
    btn_inc = page.locator("#btn-practice-incorrect")
    expect(btn_inc).not_to_have_class(re.compile(r"btn-practice-disabled"))
    btn_inc.click()


    # Verify session solver is active
    expect(page.locator("#screen-exam")).to_be_visible()
    expect(page.locator("#question-counter")).to_contain_text("Questão 1 de 1")
