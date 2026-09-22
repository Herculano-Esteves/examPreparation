"""
tests/e2e/test_exam_filters.py
------------------------------
E2E automated tests for filtering, searching, and sorting exams
in the course exams catalog screen (#screen-menu).
"""

import re

try:
    import pytest
    from playwright.sync_api import Page, expect
except ImportError:
    import unittest
    raise unittest.SkipTest("Playwright and Pytest are installed inside .venv; run via .\\.venv\\Scripts\\pytest tests/e2e")


def test_search_exams_in_course(page: Page, base_url: str):
    """
    Tests live search input in the exams catalog,
    asserting real-time filtering and search clearing.
    """
    page.goto(base_url)

    # Enter ADI course
    adi_card = page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')")
    adi_card.click()

    exam_cards = page.locator("#exams-grid .exam-list-row")
    expect(exam_cards.first).to_be_visible(timeout=5000)
    initial_count = exam_cards.count()
    assert initial_count > 1

    # Search for Exame ADI 10 specifically
    search_input = page.locator("#filter-exam-search")
    expect(search_input).to_be_visible()
    search_input.fill("Exame ADI 10")

    # Only matching exams should be visible
    visible_exams = page.locator("#exams-grid .exam-list-row:visible")
    expect(visible_exams).to_have_count(1)
    expect(visible_exams.first).to_contain_text("Exame ADI 10")

    # Clear search
    btn_clear = page.locator("#btn-clear-exam-search")
    if btn_clear.is_visible():
        btn_clear.click()
    else:
        search_input.fill("")

    # Verify all cards are restored
    expect(page.locator("#exams-grid .exam-list-row:visible")).to_have_count(initial_count)


def test_sort_exams_dropdown(page: Page, base_url: str):
    """
    Tests opening the sort dropdown and selecting a sorting option (e.g. Maior nº de Questões).
    """
    page.goto(base_url)

    # Enter ADI course
    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    expect(page.locator("#exams-grid .exam-list-row").first).to_be_visible(timeout=5000)

    trigger = page.locator("#sort-dropdown-trigger")
    expect(trigger).to_be_visible()
    trigger.click()

    # Dropdown menu should be visible
    menu = page.locator("#sort-dropdown-menu")
    expect(menu).to_be_visible()

    # Click 'Maior nº de Questões' (questions_desc)
    opt_questions = menu.locator("[data-value='questions_desc']")
    expect(opt_questions).to_be_visible()
    opt_questions.click()

    # Dropdown menu closes
    expect(menu).not_to_be_visible()

    # Trigger label updates to reflect new sort
    expect(page.locator("#sort-dropdown-selected-label")).to_contain_text("Maior nº de Questões")


def test_filter_by_question_types(page: Page, base_url: str):
    """
    Tests toggling question type checkboxes (e.g. escrita)
    and verifying catalog cards filter dynamically.
    """
    page.goto(base_url)

    # Enter ADI course
    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    expect(page.locator("#exams-grid .exam-list-row").first).to_be_visible(timeout=5000)

    # Locate escrita checkbox item and click to uncheck
    escrita_item = page.locator(".floating-checkbox-item[data-type='escrita']")
    expect(escrita_item).to_be_visible()
    escrita_item.click()

    # Exame ADI 10 (which is 100% escrita) should now be filtered out
    exam_adi10 = page.locator("#exams-grid .exam-list-row:has-text('Exame ADI 10')")
    expect(exam_adi10).to_have_count(0)

    # Click again to check back
    escrita_item.click()
    expect(page.locator("#exams-grid .exam-list-row:has-text('Exame ADI 10')")).to_have_count(1)



def test_reset_filters_button(page: Page, base_url: str):
    """
    Tests modifying filters and clicking 'Repor' (#btn-reset-global-filters)
    to restore initial filter state.
    """
    page.goto(base_url)

    page.locator("#cadeiras-grid .exam-list-row:has-text('ADI')").click()
    expect(page.locator("#exams-grid .exam-list-row").first).to_be_visible(timeout=5000)

    # Type something into search
    search_input = page.locator("#filter-exam-search")
    search_input.fill("test_query_to_reset")

    # Click reset button
    btn_reset = page.locator("#btn-reset-global-filters")
    expect(btn_reset).to_be_visible()
    btn_reset.click()

    # Verify search is reset to empty
    expect(search_input).to_have_value("")
