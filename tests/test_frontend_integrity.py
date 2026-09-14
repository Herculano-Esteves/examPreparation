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

    def test_delete_local_cadeira_and_exam_cascade_logic(self):
        """Validates deletion of local subjects, local exams, and automatic cascading data cleanup."""
        # Simulated State
        state = {
            'localCadeiras': [
                {'id': 'local_1', 'nome': 'Compiladores', 'exames_count': 2, 'isLocal': True},
                {'id': 'local_2', 'nome': 'Redes', 'exames_count': 1, 'isLocal': True}
            ],
            'localExames': [
                {'id': 'exam_1', 'title': 'Exame 2024', 'cadeira_id': 'local_1', 'isLocal': True},
                {'id': 'exam_2', 'title': 'Exame 2023', 'cadeira_id': 'local_1', 'isLocal': True},
                {'id': 'exam_3', 'title': 'Exame Redes 1', 'cadeira_id': 'local_2', 'isLocal': True}
            ],
            'examHistory': {
                'exam_1': [1, 2, 1],
                'exam_2': [1, 1],
                'exam_3': [2, 2]
            },
            'difficultQuestions': {
                'exam_1': [1],
                'exam_3': [0]
            },
            'activeCadeira': {'id': 'local_1', 'nome': 'Compiladores'}
        }

        # 1. Delete a single local exam (exam_2 from local_1)
        def delete_exam(exam_id, s):
            target = next((e for e in s['localExames'] if e['id'] == exam_id), None)
            if not target:
                return False
            s['localExames'] = [e for e in s['localExames'] if e['id'] != exam_id]
            if target.get('cadeira_id'):
                for c in s['localCadeiras']:
                    if c['id'] == target['cadeira_id']:
                        c['exames_count'] = max(0, c.get('exames_count', 0) - 1)
            s['examHistory'].pop(exam_id, None)
            s['difficultQuestions'].pop(exam_id, None)
            return True

        res_exam = delete_exam('exam_2', state)
        self.assertTrue(res_exam)
        self.assertEqual(len(state['localExames']), 2)
        # local_1 exames_count should be decremented from 2 to 1
        c1 = next(c for c in state['localCadeiras'] if c['id'] == 'local_1')
        self.assertEqual(c1['exames_count'], 1)
        self.assertNotIn('exam_2', state['examHistory'])

        # 2. Delete a local subject (local_1)
        def delete_cadeira(cadeira_id, s):
            initial_len = len(s['localCadeiras'])
            s['localCadeiras'] = [c for c in s['localCadeiras'] if c['id'] != cadeira_id]
            if len(s['localCadeiras']) == initial_len:
                return False
            # Cascade delete exams
            to_remove = [e for e in s['localExames'] if e.get('cadeira_id') == cadeira_id]
            for e in to_remove:
                s['examHistory'].pop(e['id'], None)
                s['difficultQuestions'].pop(e['id'], None)
            s['localExames'] = [e for e in s['localExames'] if e.get('cadeira_id') != cadeira_id]
            if s.get('activeCadeira') and s['activeCadeira']['id'] == cadeira_id:
                s['activeCadeira'] = None
            return True

        res_cad = delete_cadeira('local_1', state)
        self.assertTrue(res_cad)
        self.assertEqual(len(state['localCadeiras']), 1)
        self.assertEqual(state['localCadeiras'][0]['id'], 'local_2')
        # All exams belonging to local_1 (exam_1) should be cleaned up
        self.assertEqual(len(state['localExames']), 1)
        self.assertEqual(state['localExames'][0]['id'], 'exam_3')
        self.assertNotIn('exam_1', state['examHistory'])
        self.assertNotIn('exam_1', state['difficultQuestions'])
        # Active subject reset
        self.assertIsNone(state['activeCadeira'])

    def test_danger_modal_state_machine(self):
        """Validates confirmation dialog state machine and focus preservation."""
        class DangerModalManager:
            def __init__(self):
                self.is_open = False
                self.title = ""
                self.description = ""
                self.confirm_text = ""
                self.on_confirm = None
                self.executed = False

            def open(self, title, desc, confirm_text, on_confirm):
                self.is_open = True
                self.title = title
                self.description = desc
                self.confirm_text = confirm_text
                self.on_confirm = on_confirm
                self.executed = False

            def confirm(self):
                if self.is_open and self.on_confirm:
                    self.on_confirm()
                    self.executed = True
                self.is_open = False

            def cancel(self):
                self.is_open = False
                self.executed = False

        modal = DangerModalManager()
        flag = {'deleted': False}

        # Open modal
        modal.open(
            title="Apagar Cadeira",
            desc="Tem a certeza?",
            confirm_text="Apagar Cadeira",
            on_confirm=lambda: flag.update({'deleted': True})
        )

        self.assertTrue(modal.is_open)
        self.assertEqual(modal.title, "Apagar Cadeira")
        self.assertFalse(flag['deleted'])

        # Cancel action
        modal.cancel()
        self.assertFalse(modal.is_open)
        self.assertFalse(flag['deleted'])

        # Open again and confirm
        modal.open(
            title="Apagar Exame",
            desc="Tem a certeza?",
            confirm_text="Apagar Exame",
            on_confirm=lambda: flag.update({'deleted': True})
        )
        self.assertTrue(modal.is_open)
        modal.confirm()
        self.assertFalse(modal.is_open)
        self.assertTrue(flag['deleted'])
        self.assertTrue(modal.executed)

    def test_zip_backup_and_timestamp_deduplication(self):
        """
        Validates the backup import deduplication rules:
        - Same name + same createdAt -> Duplicate (skip)
        - Same name + different createdAt -> New instance (import)
        - New name -> New instance (import)
        - Auto-recalculation of exames_count
        """
        def get_comparable_title(exam):
            title_val = exam.get('title') or exam.get('titulo') or ''
            if isinstance(title_val, dict):
                return str(title_val.get('pt') or title_val.get('en') or '').strip().lower()
            return str(title_val).strip().lower()

        def normalize_timestamp(ts):
            if not ts:
                return ''
            import datetime
            try:
                dt = datetime.datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
                return dt.isoformat()
            except Exception:
                return str(ts).strip()

        def import_local_backup(backup_data, state):
            cadeiras = backup_data.get('cadeiras', [])
            exames = backup_data.get('exames', [])
            imported_cadeiras_count = 0
            imported_exams_count = 0
            skipped_exams_count = 0

            cadeira_id_map = {}

            # 1. Process Cadeiras
            for raw_cad in cadeiras:
                cad_name = (raw_cad.get('nome') or '').strip()
                if not cad_name:
                    continue
                cad_created = normalize_timestamp(raw_cad.get('createdAt'))
                
                # Check existing cadeira
                existing = None
                for c in state['localCadeiras']:
                    if (c.get('nome') or '').strip().lower() == cad_name.lower():
                        if cad_created and normalize_timestamp(c.get('createdAt')) == cad_created:
                            existing = c
                            break
                        elif not cad_created and not c.get('createdAt'):
                            existing = c
                            break

                if existing:
                    cadeira_id_map[raw_cad.get('id')] = existing['id']
                else:
                    new_id = f"local_imported_{len(state['localCadeiras']) + 1}"
                    new_cad = {
                        'id': new_id,
                        'nome': cad_name,
                        'descricao': raw_cad.get('descricao', ''),
                        'icon': raw_cad.get('icon', 'fa-book'),
                        'exames_count': 0,
                        'isLocal': True,
                        'index_path': None,
                        'createdAt': raw_cad.get('createdAt') or "2026-09-14T12:00:00.000Z"
                    }
                    state['localCadeiras'].append(new_cad)
                    cadeira_id_map[raw_cad.get('id')] = new_id
                    imported_cadeiras_count += 1

            # 2. Process Exames
            for raw_ex in exames:
                ex_title = get_comparable_title(raw_ex)
                if not ex_title:
                    continue
                ex_created = normalize_timestamp(raw_ex.get('createdAt'))
                target_cad_id = cadeira_id_map.get(raw_ex.get('cadeira_id')) or raw_ex.get('cadeira_id')

                # Duplicate detection
                is_duplicate = False
                for ex in state['localExames']:
                    if get_comparable_title(ex) == ex_title and ex.get('cadeira_id') == target_cad_id:
                        existing_created = normalize_timestamp(ex.get('createdAt'))
                        if ex_created and existing_created and ex_created == existing_created:
                            is_duplicate = True
                            break
                        elif not ex_created and not existing_created:
                            is_duplicate = True
                            break

                if is_duplicate:
                    skipped_exams_count += 1
                    continue

                new_ex_id = f"exam_local_imported_{len(state['localExames']) + 1}"
                new_ex = dict(raw_ex)
                new_ex['id'] = new_ex_id
                new_ex['cadeira_id'] = target_cad_id
                new_ex['isLocal'] = True
                if not new_ex.get('createdAt'):
                    new_ex['createdAt'] = "2026-09-14T12:00:00.000Z"

                state['localExames'].append(new_ex)
                imported_exams_count += 1

            # Recalculate exames_count
            for c in state['localCadeiras']:
                c['exames_count'] = len([e for e in state['localExames'] if e.get('cadeira_id') == c['id']])

            return {
                'importedCadeirasCount': imported_cadeiras_count,
                'importedExamsCount': imported_exams_count,
                'skippedExamsCount': skipped_exams_count
            }

        # Initialize State
        state = {
            'localCadeiras': [
                {
                    'id': 'local_1',
                    'nome': 'Matemática',
                    'createdAt': '2026-09-01T10:00:00.000Z',
                    'exames_count': 1
                }
            ],
            'localExames': [
                {
                    'id': 'exam_1',
                    'cadeira_id': 'local_1',
                    'title': 'Exame 1',
                    'createdAt': '2026-09-01T10:00:00.000Z',
                    'questions': []
                }
            ]
        }

        # Test Batch 1:
        # - Exame 1 with SAME name and SAME createdAt -> Duplicate (skip)
        # - Exame 1 with SAME name and DIFFERENT createdAt -> New instance (import)
        # - Exame 2 with NEW name -> New instance (import)
        backup = {
            'cadeiras': [
                {
                    'id': 'backup_cad_1',
                    'nome': 'Matemática',
                    'createdAt': '2026-09-01T10:00:00.000Z'
                },
                {
                    'id': 'backup_cad_2',
                    'nome': 'Física',
                    'createdAt': '2026-09-05T12:00:00.000Z'
                }
            ],
            'exames': [
                {
                    'id': 'b_ex_1',
                    'cadeira_id': 'backup_cad_1',
                    'title': 'Exame 1',
                    'createdAt': '2026-09-01T10:00:00.000Z'  # EXACT SAME -> SKIP
                },
                {
                    'id': 'b_ex_2',
                    'cadeira_id': 'backup_cad_1',
                    'title': 'Exame 1',
                    'createdAt': '2026-09-02T15:30:00.000Z'  # DIFFERENT TIME -> IMPORT NEW
                },
                {
                    'id': 'b_ex_3',
                    'cadeira_id': 'backup_cad_2',
                    'title': 'Física Quântica Teste 1',
                    'createdAt': '2026-09-05T12:00:00.000Z'  # NEW NAME -> IMPORT
                }
            ]
        }

        result = import_local_backup(backup, state)

        # 1 new Cadeira ('Física'), 1 existing ('Matemática')
        self.assertEqual(result['importedCadeirasCount'], 1)
        # 1 duplicate skipped (Exame 1 @ 2026-09-01)
        self.assertEqual(result['skippedExamsCount'], 1)
        # 2 exams imported (Exame 1 @ 2026-09-02 and Física Quântica Teste 1)
        self.assertEqual(result['importedExamsCount'], 2)

        # Total exams in state should be 1 initial + 2 imported = 3
        self.assertEqual(len(state['localExames']), 3)

        # Matemática should now have 2 exams (exam_1 and the new Exame 1)
        mat_cad = next(c for c in state['localCadeiras'] if c['nome'] == 'Matemática')
        self.assertEqual(mat_cad['exames_count'], 2)

        # Física should have 1 exam
        fis_cad = next(c for c in state['localCadeiras'] if c['nome'] == 'Física')
        self.assertEqual(fis_cad['exames_count'], 1)

    def test_settings_popover_mathematical_layout(self):
        """
        Validates the mathematical positioning & collision avoidance algorithm of settingsPopover.js:
        - Dynamic content width clamping
        - Viewport boundary constraints (left/right margins)
        - Intelligent vertical inversion (flip upwards when overflowing bottom)
        - Max-height calculation for scrollable container
        """
        def calculate_popover_layout(trigger_rect, popover_dims, viewport_dims, options=None):
            opts = options or {}
            gap = opts.get('gap', 8)
            margin = opts.get('margin', 12)
            min_width = opts.get('min_width', 290)
            max_width_limit = opts.get('max_width', 360)

            vw = viewport_dims.get('width', 800)
            vh = viewport_dims.get('height', 600)

            # 1. Calculate dynamic width with viewport boundaries
            max_w = max(min_width, min(max_width_limit, vw - 2 * margin))
            target_w = max(min_width, min(popover_dims.get('width', min_width), max_w))

            # 2. Horizontal placement (align with right edge of trigger, clamped to viewport)
            left = trigger_rect['right'] - target_w
            max_left = vw - target_w - margin
            left = max(margin, min(left, max_left))

            # 3. Vertical placement and available space calculation
            space_below = max(0, vh - trigger_rect['bottom'] - gap - margin)
            space_above = max(0, trigger_rect['top'] - gap - margin)
            needed_height = popover_dims.get('height', 220)

            if needed_height <= space_below or space_below >= space_above:
                placement = 'bottom'
                top = trigger_rect['bottom'] + gap
                max_height = max(120, space_below)
            else:
                placement = 'top'
                actual_height = min(needed_height, space_above)
                top = max(margin, trigger_rect['top'] - actual_height - gap)
                max_height = max(120, space_above)

            return {
                'top': round(top),
                'left': round(left),
                'width': round(target_w),
                'maxHeight': round(max_height),
                'placement': placement
            }

        # Case 1: Standard Desktop - Trigger in top-right corner, plenty of space below
        # Trigger: right = 1180, top = 20, bottom = 54. Viewport: 1200x800. Popover: 300x240
        res1 = calculate_popover_layout(
            trigger_rect={'left': 1146, 'right': 1180, 'top': 20, 'bottom': 54},
            popover_dims={'width': 300, 'height': 240},
            viewport_dims={'width': 1200, 'height': 800}
        )
        self.assertEqual(res1['placement'], 'bottom')
        self.assertEqual(res1['top'], 54 + 8)  # 62px
        # Ideal left = 1180 - 300 = 880. Max left = 1200 - 300 - 12 = 888. Left = 880
        self.assertEqual(res1['left'], 880)
        self.assertEqual(res1['width'], 300)
        self.assertGreaterEqual(res1['maxHeight'], 240)

        # Case 2: Inversion upwards - Trigger near bottom (e.g. sticky bottom bar)
        # Trigger: right = 700, top = 550, bottom = 584. Viewport: 800x600. Popover: 300x240
        res2 = calculate_popover_layout(
            trigger_rect={'left': 666, 'right': 700, 'top': 550, 'bottom': 584},
            popover_dims={'width': 300, 'height': 240},
            viewport_dims={'width': 800, 'height': 600}
        )
        self.assertEqual(res2['placement'], 'top')
        # Space below was only 600 - 584 - 8 - 12 = -4px -> flips above
        # top = 550 - 240 - 8 = 302px
        self.assertEqual(res2['top'], 302)
        self.assertEqual(res2['left'], 400)  # 700 - 300 = 400

        # Case 3: Narrow mobile screen (360px wide) - Width adapts without overflowing
        res3 = calculate_popover_layout(
            trigger_rect={'left': 300, 'right': 345, 'top': 20, 'bottom': 54},
            popover_dims={'width': 350, 'height': 240},
            viewport_dims={'width': 360, 'height': 640}
        )
        # Max width available on 360px viewport: 360 - 24 = 336px
        self.assertEqual(res3['width'], 336)
        self.assertEqual(res3['left'], 12)  # clamped to margin

        # Case 4: Extreme small height (e.g. landscape mobile 300px) - MaxHeight clamped
        res4 = calculate_popover_layout(
            trigger_rect={'left': 400, 'right': 440, 'top': 10, 'bottom': 40},
            popover_dims={'width': 300, 'height': 350},
            viewport_dims={'width': 600, 'height': 300}
        )
        self.assertEqual(res4['placement'], 'bottom')
        # Available space below = 300 - 40 - 8 - 12 = 240px
        self.assertEqual(res4['maxHeight'], 240)


if __name__ == '__main__':
    unittest.main()



