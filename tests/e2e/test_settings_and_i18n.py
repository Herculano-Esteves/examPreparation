"""
tests/e2e/test_settings_and_i18n.py
-----------------------------------
E2E automated tests for Settings, Real-time Language Switching (i18n),
and Danger Modal Confirmation workflows.
"""

import re

try:
    import pytest
    from playwright.sync_api import Page, expect
except ImportError:
    import unittest
    raise unittest.SkipTest("Playwright and Pytest are installed inside .venv; run via .\\.venv\\Scripts\\pytest tests/e2e")


def test_realtime_language_switching(page: Page, base_url: str):
    """
    Tests opening settings, switching between PT and EN,
    and verifying UI text translates immediately without full page reload.
    """
    page.goto(base_url)

    # Ensure app initialization is fully complete
    expect(page.locator("#cadeiras-grid .exam-list-row").first).to_be_visible(timeout=5000)

    # Initial state should be Portuguese
    subtitle = page.locator("#app-subtitle")
    expect(subtitle).to_contain_text("SISTEMA DE EXAMES")

    # Open Settings Popover
    btn_settings = page.locator("#btn-settings")
    btn_settings.click()
    popover = page.locator("#settings-dropdown-menu")
    expect(popover).to_be_visible()

    # Switch to English (EN)
    btn_en = popover.locator(".btn-lang-option[data-lang='en']")
    expect(btn_en).to_be_visible()
    btn_en.click()

    # Verify subtitle switched to English
    expect(subtitle).to_contain_text("EXAM SYSTEM")

    # Switch back to Portuguese (PT)
    if not popover.is_visible():
        btn_settings.click()
    btn_pt = popover.locator(".btn-lang-option[data-lang='pt']")
    expect(btn_pt).to_be_visible()
    btn_pt.click()

    # Verify subtitle switched back to Portuguese
    expect(subtitle).to_contain_text("SISTEMA DE EXAMES")



def test_danger_modal_clear_storage_cancel(page: Page, base_url: str):
    """
    Tests opening settings, clicking the clear storage trigger,
    verifying the Danger Confirmation Modal opens, and canceling it.
    """
    page.goto(base_url)

    # Open Settings Popover
    page.locator("#btn-settings").click()
    popover = page.locator("#settings-dropdown-menu")
    expect(popover).to_be_visible()

    # Click 'Limpar Dados' button
    btn_clear = page.locator("#btn-clear-storage")
    expect(btn_clear).to_be_visible()
    btn_clear.click()

    # Danger Modal should appear
    danger_modal = page.locator("#danger-confirm-modal")
    expect(danger_modal).to_be_visible()
    expect(danger_modal).not_to_have_class(re.compile(r"\bhidden\b"))

    # Click Cancel button
    btn_cancel = page.locator("#btn-cancel-clear-storage")
    expect(btn_cancel).to_be_visible()
    btn_cancel.click()

    # Danger Modal should be hidden
    expect(danger_modal).to_have_class(re.compile(r"\bhidden\b"))
