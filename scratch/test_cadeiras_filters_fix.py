import unittest
import re
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML = os.path.join(PROJECT_ROOT, 'index.html')
STATIC_JS_DIR = os.path.join(PROJECT_ROOT, 'static', 'js')
STATIC_CSS = os.path.join(PROJECT_ROOT, 'static', 'style.css')

class TestCadeirasFiltersAestheticAndSync(unittest.TestCase):
    def test_reset_button_class_and_structure(self):
        with open(INDEX_HTML, 'r', encoding='utf-8') as f:
            html = f.read()

        # Both screen-cadeiras and screen-menu should use btn-filter-reset-link
        self.assertIn('id="btn-reset-cadeiras-filters"', html)
        self.assertIn('class="btn-filter-reset-link"', html)
        
        # Verify no bulky button at the bottom of cadeiras-sidebar-filters
        self.assertNotIn('id="btn-reset-all-cadeiras-filters"', html)

    def test_scoped_classes(self):
        with open(INDEX_HTML, 'r', encoding='utf-8') as f:
            html = f.read()

        # Cadeiras should use floating-origin-check-input and floating-avail-check-input
        self.assertIn('class="floating-origin-check-input"', html)
        self.assertIn('class="floating-avail-check-input"', html)

    def test_style_css_rules(self):
        with open(STATIC_CSS, 'r', encoding='utf-8') as f:
            css = f.read()

        self.assertIn('.floating-origin-check-input', css)
        self.assertIn('.floating-avail-check-input', css)

    def test_sync_function_in_cadeiras_js(self):
        with open(os.path.join(STATIC_JS_DIR, 'cadeiras.js'), 'r', encoding='utf-8') as f:
            code = f.read()

        self.assertIn('syncCadeirasInputsUI', code)

    def test_exam_filters_isolation(self):
        with open(os.path.join(STATIC_JS_DIR, 'examFilters.js'), 'r', encoding='utf-8') as f:
            code = f.read()

        # examFilters should NOT query global document without scoping
        self.assertIn('#exams-sidebar-filters .floating-state-check-input', code)

if __name__ == '__main__':
    unittest.main()
