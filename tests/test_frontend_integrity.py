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

if __name__ == '__main__':
    unittest.main()
