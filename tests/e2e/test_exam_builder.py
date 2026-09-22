"""
tests/e2e/test_exam_builder.py
------------------------------
E2E automated tests for the Dual-Pane Interactive Exam Builder:
- Navigation into and out of builder screen
- Visual-to-JSON editor synchronization
- Real-time syntax error validation
- JSON formatting button functionality
"""

import re

try:
    import pytest
    from playwright.sync_api import Page, expect
except ImportError:
    import unittest
    raise unittest.SkipTest("Playwright and Pytest are installed inside .venv; run via .\\.venv\\Scripts\\pytest tests/e2e")


def test_builder_open_and_cancel_navigation(page: Page, base_url: str):
    """
    Tests opening the Dual-Pane Exam Builder from the course exams menu
    and canceling to return to the catalog.
    """
    page.goto(base_url)

    # Enter ADI course
    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    expect(page.locator("#exams-grid .exam-list-row").first).to_be_visible(timeout=5000)

    # Click 'Adicionar Exame' button
    btn_add = page.locator("#btn-add-exame-top")
    expect(btn_add).to_be_visible()
    btn_add.click()

    # Verify Exam Builder screen and top bar
    builder_screen = page.locator("#screen-add-exame")
    expect(builder_screen).to_be_visible()

    top_bar = page.locator("#builder-top-bar")
    expect(top_bar).to_be_visible()

    # Cancel back to menu
    btn_cancel = page.locator("#btn-cancel-exame")
    expect(btn_cancel).to_be_visible()
    btn_cancel.click()

    expect(page.locator("#screen-menu")).to_be_visible()
    expect(builder_screen).not_to_be_visible()


def test_visual_to_json_synchronization(page: Page, base_url: str):
    """
    Tests typing a title in the visual editor and asserting that the JSON code
    editor textarea updates automatically in real time.
    """
    page.goto(base_url)

    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    page.locator("#btn-add-exame-top").click()
    expect(page.locator("#screen-add-exame")).to_be_visible()

    # Type title in visual form
    title_input = page.locator("#builder-exam-title")
    expect(title_input).to_be_visible()
    title_input.fill("Exame E2E Playwright")

    # Assert JSON code editor reflects the typed title
    editor = page.locator("#editor-code-input")
    expect(editor).to_be_visible()
    expect(editor).to_have_value(re.compile(r"Exame E2E Playwright"))


def test_json_syntax_error_indication(page: Page, base_url: str):
    """
    Tests typing malformed JSON into the code editor and verifying that the
    validation status badge turns into an error state.
    """
    page.goto(base_url)

    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    page.locator("#btn-add-exame-top").click()
    expect(page.locator("#screen-add-exame")).to_be_visible()

    editor = page.locator("#editor-code-input")
    expect(editor).to_be_visible()

    # Fill editor with completely broken JSON syntax
    editor.fill('{"title": "Unfinished JSON')

    # Verify status indicator shows error / invalid state
    status = page.locator("#validation-status")
    expect(status).to_be_visible()
    expect(status).to_have_class(re.compile(r"status-invalid|invalid|status-error"))


def test_format_json_button(page: Page, base_url: str):
    """
    Tests the 'Formatar JSON' button cleanly indents code in the editor.
    """
    page.goto(base_url)

    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    page.locator("#btn-add-exame-top").click()
    expect(page.locator("#screen-add-exame")).to_be_visible()

    editor = page.locator("#editor-code-input")

    # Supply valid minified JSON
    minified_json = '{"title":"Compact Title","questions":[]}'
    editor.fill(minified_json)

    # Click Format JSON button
    btn_format = page.locator("#btn-builder-format-json")
    expect(btn_format).to_be_visible()
    btn_format.click()

    # Verify formatted text has newlines
    expect(editor).to_have_value(re.compile(r"\n"))

