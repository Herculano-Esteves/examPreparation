"""
tests/e2e/test_navigation.py
----------------------------
Automated End-to-End (E2E) tests using Playwright.
Simulates real browser interactions (clicks, inputs, screen transitions)
completely headless without opening any windows on screen.
"""

try:
    import pytest
    from playwright.sync_api import Page, expect
except ImportError:
    import unittest
    raise unittest.SkipTest("Playwright and Pytest are installed inside .venv; run via .\\.venv\\Scripts\\pytest tests/e2e")



def test_page_loads_and_has_title(page: Page, base_url: str):
    """Verifies that the application loads properly and displays the main header."""
    page.goto(base_url)
    expect(page).to_have_title("Simulador de Exames")

    main_title = page.locator("#app-main-title")
    expect(main_title).to_be_visible()




def test_course_selection_and_back_navigation(page: Page, base_url: str):
    """
    Tests selecting a course card, entering its exam list screen,
    and returning back to the courses overview using the back button.
    """
    page.goto(base_url)

    # 1. Wait for courses to be loaded from cadeiras.json
    course_cards = page.locator("#cadeiras-grid .exam-list-row")
    expect(course_cards.first).to_be_visible(timeout=5000)

    # 2. Click the first available course card
    course_cards.first.click()

    # 3. Verify screen transition to the course exams menu
    menu_screen = page.locator("#screen-menu")
    expect(menu_screen).to_be_visible()

    cadeiras_screen = page.locator("#screen-cadeiras")
    expect(cadeiras_screen).not_to_be_visible()

    # 4. Click 'Voltar às Cadeiras' button
    btn_back = page.locator("#btn-back-cadeiras")
    expect(btn_back).to_be_visible()
    btn_back.click()

    # 5. Verify screen transition back to cadeiras view
    expect(cadeiras_screen).to_be_visible()
    expect(menu_screen).not_to_be_visible()


def test_settings_popover_toggle(page: Page, base_url: str):
    """
    Tests clicking the settings gear icon in the header,
    verifying the popover menu appears, and closing it.
    """
    page.goto(base_url)

    btn_settings = page.locator("#btn-settings")
    expect(btn_settings).to_be_visible()

    settings_menu = page.locator("#settings-dropdown-menu")
    expect(settings_menu).to_be_hidden()

    # Open settings popover
    btn_settings.click()
    expect(settings_menu).to_be_visible()

    # Close settings popover via close button or toggle
    btn_close = page.locator("#btn-close-settings-popover")
    if btn_close.is_visible():
        btn_close.click()
    else:
        btn_settings.click()

    expect(settings_menu).to_be_hidden()


def test_search_cadeiras_filter(page: Page, base_url: str):
    """
    Tests typing into the search input to filter courses in real time.
    """
    page.goto(base_url)

    course_cards = page.locator("#cadeiras-grid .exam-list-row")
    expect(course_cards.first).to_be_visible(timeout=5000)
    initial_count = course_cards.count()

    search_input = page.locator("#search-cadeiras")
    expect(search_input).to_be_visible()

    # Type a query unlikely to match everything or matching something specific
    search_input.fill("xyz_non_existent_search_query_999")

    # Visible cards should now be 0 or empty state shown
    visible_cards = page.locator("#cadeiras-grid .exam-list-row:visible")
    expect(visible_cards).to_have_count(0)

    # Clear the search input
    btn_clear = page.locator("#btn-clear-cadeira-search")
    if btn_clear.is_visible():
        btn_clear.click()
    else:
        search_input.fill("")

    # Cards should be restored
    expect(course_cards).to_have_count(initial_count)


def test_language_modal_first_visit(browser, base_url: str):
    """
    Verifies that a first-time visitor is prompted with the language modal,
    and selecting Portuguese closes the modal and configures the app.
    """
    context = browser.new_context()
    page = context.new_page()
    page.goto(base_url)

    modal = page.locator("#language-modal")
    expect(modal).to_be_visible()

    btn_pt = page.locator("#btn-select-lang-pt")
    expect(btn_pt).to_be_visible()
    btn_pt.click()

    expect(modal).to_be_hidden()
    context.close()

