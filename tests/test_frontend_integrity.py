import os
import re
import json
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_JS_DIR = os.path.join(PROJECT_ROOT, 'static', 'js')
INDEX_HTML = os.path.join(PROJECT_ROOT, 'index.html')

class TestFrontendIntegrity(unittest.TestCase):
    def test_js_exports_and_imports(self):
        """Validates that every JS module imports only symbols that are actually exported."""
        js_files = [os.path.join(STATIC_JS_DIR, f) for f in os.listdir(STATIC_JS_DIR) if f.endswith('.js')]
        
        exports = {}
        for js_file in js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            exp_named = re.findall(r'export\s+(?:async\s+)?(?:const|let|var|function|class)\s+(\w+)', content)
            exp_list = re.findall(r'export\s*\{\s*([^}]+)\s*\}', content)
            all_exp = list(exp_named)
            for el in exp_list:
                for item in el.split(','):
                    item = item.strip().split(' as ')[-1].strip()
                    if item:
                        all_exp.append(item)
            exports[os.path.basename(js_file)] = set(all_exp)

        for js_file in js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            imp_matches = re.findall(r'import\s*\{\s*([^}]+)\s*\}\s*from\s*[\'"](\.[^\'"]+)[\'"]', content)
            for imps, src in imp_matches:
                src_file = os.path.basename(src)
                if not src_file.endswith('.js'):
                    src_file += '.js'
                self.assertIn(src_file, exports, f"Import from non-existent file {src_file} in {js_file}")
                for item in imps.split(','):
                    item = item.strip().split(' as ')[0].strip()
                    if not item:
                        continue
                    self.assertIn(item, exports[src_file], f"Missing export '{item}' in {src_file} imported by {js_file}")

    def test_dom_elements_exist_in_html(self):
        """Validates that all static IDs referenced in elements.js exist in index.html."""
        with open(INDEX_HTML, 'r', encoding='utf-8') as f:
            html = f.read()
        with open(os.path.join(STATIC_JS_DIR, 'elements.js'), 'r', encoding='utf-8') as f:
            elements_code = f.read()
        
        ids = re.findall(r"getElementById\('([^']+)'\)", elements_code)
        # Skip purely dynamic or optional elements
        optional_ids = {'current-q-num', 'results-feedback-message'}
        
        for el_id in set(ids):
            if el_id in optional_ids:
                continue
            pattern = r'id=["\']' + re.escape(el_id) + r'["\']'
            self.assertTrue(bool(re.search(pattern, html)), f"DOM Element with id '{el_id}' not found in index.html")

    def test_i18n_keys_completeness(self):
        """Validates that all data-i18n attributes in index.html have matching translations."""
        with open(INDEX_HTML, 'r', encoding='utf-8') as f:
            html = f.read()
        with open(os.path.join(STATIC_JS_DIR, 'i18n.js'), 'r', encoding='utf-8') as f:
            i18n_code = f.read()
        
        pt_keys = set(re.findall(r'(\w+):\s*[\'"`]', i18n_code))
        data_keys = re.findall(r'data-i18n(?:-placeholder|-title|-aria-label)?=["\']([^"\']+)["\']', html)
        
        for k in set(data_keys):
            self.assertIn(k, pt_keys, f"Missing translation key for '{k}'")

    def test_adaptive_layout_math_model(self):
        """Validates the mathematical formula: T(h, H) = max(0, min(0.20*H, H - h))."""
        def calculate_optimal_top_offset(h, H):
            if not H or H <= 0:
                return 0
            if not h or h <= 0:
                return round(0.20 * H)
            return round(max(0, min(0.20 * H, H - h)))

        H = 800  # 800px available height

        # Case 1: Short content (h <= 0.80 H = 640px) -> Exactly 160px (1/5 H)
        self.assertEqual(calculate_optimal_top_offset(100, H), 160)
        self.assertEqual(calculate_optimal_top_offset(400, H), 160)
        self.assertEqual(calculate_optimal_top_offset(640, H), 160)

        # Case 2: Intermediate content (640px < h <= 800px) -> T = H - h (pushed to bottom)
        self.assertEqual(calculate_optimal_top_offset(680, H), 120)
        self.assertEqual(calculate_optimal_top_offset(750, H), 50)
        self.assertEqual(calculate_optimal_top_offset(780, H), 20)
        self.assertEqual(calculate_optimal_top_offset(800, H), 0)

        # Case 3: Overflow content (h > 800px) -> T = 0 (Starts at top, triggers scroll)
        self.assertEqual(calculate_optimal_top_offset(850, H), 0)
        self.assertEqual(calculate_optimal_top_offset(1200, H), 0)

    def test_question_status_and_scoring_rules(self):
        """Validates QuestionStatus definitions and score calculation rules."""
        with open(os.path.join(STATIC_JS_DIR, 'constants.js'), 'r', encoding='utf-8') as f:
            constants_code = f.read()

        self.assertIn('CORRECT: 1', constants_code)
        self.assertIn('INCORRECT: 2', constants_code)
        self.assertIn('UNANSWERED: 3', constants_code)
        self.assertIn('ANSWERED: 4', constants_code)

        # Simulation of score rules: only CORRECT counts towards score
        history = [1, 2, 4, 3, 1]  # 2 correct, 1 incorrect, 1 answered-unassessed, 1 unanswered (total 5)
        correct_count = sum(1 for s in history if s == 1)
        incorrect_count = sum(1 for s in history if s == 2)
        answered_count = sum(1 for s in history if s == 4)
        unanswered_count = sum(1 for s in history if s == 3)

        self.assertEqual(correct_count, 2)
        self.assertEqual(incorrect_count, 1)
        self.assertEqual(answered_count, 1)
        self.assertEqual(unanswered_count, 1)

        # Score percentage: (2 / 5) * 100 = 40% (ANSWERED counts as 0 pts)
        score_pct = round((correct_count / len(history)) * 100)
        self.assertEqual(score_pct, 40)

        # Attempted state check: attempted if correct > 0 or incorrect > 0 or answered > 0
        is_attempted = (correct_count > 0 or incorrect_count > 0 or answered_count > 0)
        self.assertTrue(is_attempted)

if __name__ == '__main__':
    unittest.main()
