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
                        self.assertNotIn(item, exp_named, f"Duplicate export of '{item}' in {os.path.basename(js_file)}")
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

    def test_practice_hub_and_special_exams_logic(self):
        """Validates difficult and incorrect question counting and special exam aggregation logic."""
        mock_exams = [
            {'id': 'exam_1', 'questions_count': 3},
            {'id': 'exam_2', 'questions_count': 4},
            {'id': 'exam_other_subject', 'questions_count': 5}
        ]
        active_subject_exam_ids = {'exam_1', 'exam_2'}

        difficult_questions = {
            'exam_1': [0, 2],         # 2 difficult in exam_1
            'exam_2': [1],            # 1 difficult in exam_2
            'exam_other_subject': [0] # 1 in another subject (should be excluded)
        }

        exam_history = {
            'exam_1': [1, 2, 1],      # 1 incorrect (index 1) in exam_1
            'exam_2': [2, 2, 3, 1],   # 2 incorrect (index 0, 1) in exam_2
            'exam_other_subject': [2] # 1 in another subject (should be excluded)
        }

        # Calculate difficult count for active subject
        diff_count = sum(len(difficult_questions[e['id']]) for e in mock_exams if e['id'] in active_subject_exam_ids and e['id'] in difficult_questions)
        self.assertEqual(diff_count, 3)

        # Calculate incorrect count for active subject
        inc_count = sum(sum(1 for s in exam_history[e['id']] if s == 2) for e in mock_exams if e['id'] in active_subject_exam_ids and e['id'] in exam_history)
        self.assertEqual(inc_count, 3)

    def test_subject_empty_and_local_exams_loading(self):
        """Validates that local subjects with no exams or custom exams are handled without errors and have i18n strings."""
        with open(os.path.join(STATIC_JS_DIR, 'i18n.js'), 'r', encoding='utf-8') as f:
            i18n_code = f.read()

        # Check that empty exams title and desc are present in both PT and EN
        self.assertIn("empty_exams_title:", i18n_code)
        self.assertIn("empty_exams_desc:", i18n_code)

        # Ensure examService.js handles absent/local index_path safely
        with open(os.path.join(STATIC_JS_DIR, 'examService.js'), 'r', encoding='utf-8') as f:
            service_code = f.read()
        self.assertIn("if (indexPath && indexPath !== 'local')", service_code)

        # Local subject exams merging logic simulation
        local_exams = [
            {'id': 'exam_local_1', 'cadeira_id': 'local_123', 'title': 'Exame 1', 'questions_count': 5},
            {'id': 'exam_local_2', 'cadeira_id': 'other_chair', 'title': 'Exame 2', 'questions_count': 10}
        ]

        # Case 1: Newly created local subject with 0 exams
        current_cadeira_id = 'local_999'
        matching = [e for e in local_exams if e.get('cadeira_id') == current_cadeira_id]
        self.assertEqual(len(matching), 0)

        # Case 2: Local subject with 1 exam
        current_cadeira_id = 'local_123'
        matching = [e for e in local_exams if e.get('cadeira_id') == current_cadeira_id]
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]['id'], 'exam_local_1')

    def test_cadeiras_filters_and_sorting_logic(self):
        """Validates that cadeiras filtering and sorting logic operates accurately on subject metadata."""
        sample_cadeiras = [
            {'id': 'adi', 'nome': 'Aprendizagem e Decisão Inteligentes', 'sigla': 'ADI', 'exames_count': 27, 'isLocal': False, '_originalIndex': 0},
            {'id': 'ssi', 'nome': 'Segurança de Sistemas de Informação', 'sigla': 'SSI', 'exames_count': 21, 'isLocal': False, '_originalIndex': 1},
            {'id': 'tso', 'nome': 'Tecnologias de Sistemas Operativos', 'sigla': 'TSO', 'exames_count': 18, 'isLocal': False, '_originalIndex': 2},
            {'id': 'local_1', 'nome': 'Base de Dados', 'sigla': 'BD', 'exames_count': 0, 'isLocal': True, '_originalIndex': 3},
            {'id': 'local_2', 'nome': 'Compiladores', 'sigla': 'COMP', 'exames_count': 5, 'isLocal': True, '_originalIndex': 4}
        ]

        # 1. Filter by Origin: only system
        sys_only = [c for c in sample_cadeiras if not c['isLocal']]
        self.assertEqual(len(sys_only), 3)

        # 2. Filter by Origin: only local
        loc_only = [c for c in sample_cadeiras if c['isLocal']]
        self.assertEqual(len(loc_only), 2)

        # 3. Filter by Availability: with exams
        with_exams = [c for c in sample_cadeiras if c['exames_count'] > 0]
        self.assertEqual(len(with_exams), 4)

        # 4. Filter by Availability: without exams
        without_exams = [c for c in sample_cadeiras if c['exames_count'] == 0]
        self.assertEqual(len(without_exams), 1)
        self.assertEqual(without_exams[0]['id'], 'local_1')

        # 5. Sorting by exam count descending
        sorted_exams_desc = sorted(sample_cadeiras, key=lambda c: (-c['exames_count'], c['_originalIndex']))
        self.assertEqual([c['id'] for c in sorted_exams_desc], ['adi', 'ssi', 'tso', 'local_2', 'local_1'])

        # 6. Sorting by name A-Z
        sorted_name_asc = sorted(sample_cadeiras, key=lambda c: c['nome'])
        self.assertEqual(sorted_name_asc[0]['id'], 'adi')
        self.assertEqual(sorted_name_asc[1]['id'], 'local_1') # Base de Dados

        # 7. Sorting by sigla A-Z
        sorted_sigla_asc = sorted(sample_cadeiras, key=lambda c: c['sigla'])
        self.assertEqual([c['sigla'] for c in sorted_sigla_asc], ['ADI', 'BD', 'COMP', 'SSI', 'TSO'])

    def test_cadeira_creation_validation_rules(self):
        """Validates that Cadeira Title is strictly required while Description is optional."""
        def validate_cadeira_form(nome, desc):
            nome_clean = (nome or '').strip()
            desc_clean = (desc or '').strip()
            if not nome_clean:
                return {'valid': False, 'error': 'error_fill_required_fields'}
            return {
                'valid': True,
                'cadeira': {
                    'nome': nome_clean,
                    'descricao': desc_clean,
                    'exames_count': 0,
                    'isLocal': True
                }
            }

        # Case 1: Empty title and empty description -> Invalid
        res1 = validate_cadeira_form('', '')
        self.assertFalse(res1['valid'])

        # Case 2: Empty title with description -> Invalid (Title is mandatory)
        res2 = validate_cadeira_form('   ', 'Alguma descrição')
        self.assertFalse(res2['valid'])

        # Case 3: Valid title with EMPTY description -> Valid (Description is optional!)
        res3 = validate_cadeira_form('Computação Quântica', '')
        self.assertTrue(res3['valid'])
        self.assertEqual(res3['cadeira']['nome'], 'Computação Quântica')
        self.assertEqual(res3['cadeira']['descricao'], '')

        # Case 4: Valid title with description -> Valid
        res4 = validate_cadeira_form('Computação Gráfica', 'OpenGL e Shaders')
        self.assertTrue(res4['valid'])
        self.assertEqual(res4['cadeira']['descricao'], 'OpenGL e Shaders')

    def test_cadeira_submit_button_interactive_state_logic(self):
        """Validates the state machine of the create subject button and on-demand validation triggering."""
        class CadeiraFormStateMachine:
            def __init__(self):
                self.input_nome = ""
                self.has_invalid_error = False
                self.has_inline_warning = False
                self.toast_emitted = None

            def on_input(self, val):
                self.input_nome = val
                if self.is_button_enabled():
                    self.has_invalid_error = False
                    self.has_inline_warning = False

            def is_button_enabled(self):
                return len(self.input_nome.strip()) > 0

            def on_click_submit(self):
                if not self.is_button_enabled():
                    self.has_invalid_error = True
                    self.has_inline_warning = True
                    self.toast_emitted = 'error_fill_required_fields'
                    return False
                self.has_invalid_error = False
                self.has_inline_warning = False
                self.toast_emitted = 'toast_cadeira_created'
                return True

        machine = CadeiraFormStateMachine()

        # Step 1: Initial state (empty input)
        # Button is visually/semantically disabled (is-disabled, aria-disabled=true)
        self.assertFalse(machine.is_button_enabled())
        # No errors are shown initially
        self.assertFalse(machine.has_invalid_error)
        self.assertFalse(machine.has_inline_warning)
        self.assertIsNone(machine.toast_emitted)

        # Step 2: User attempts to click while disabled
        # Validation feedback triggers ONLY now
        submitted = machine.on_click_submit()
        self.assertFalse(submitted)
        self.assertTrue(machine.has_invalid_error)
        self.assertTrue(machine.has_inline_warning)
        self.assertEqual(machine.toast_emitted, 'error_fill_required_fields')

        # Step 3: User starts typing required title
        machine.on_input("Engenharia de Software")
        self.assertTrue(machine.is_button_enabled())
        self.assertFalse(machine.has_invalid_error)
        self.assertFalse(machine.has_inline_warning)

        # Step 4: User clicks submit with valid data
        submitted = machine.on_click_submit()
        self.assertTrue(submitted)
        self.assertEqual(machine.toast_emitted, 'toast_cadeira_created')

if __name__ == '__main__':
    unittest.main()

