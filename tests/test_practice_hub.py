import unittest
import os
import json

class TestPracticeHubLogic(unittest.TestCase):
    """
    Validates the subject-scoping mathematical model, UI state mappings,
    and state transitions for the Practice Hub (difficult & incorrect questions).
    """

    def get_subject_difficult_count(self, state):
        if not state or not state.get('exams') or not isinstance(state.get('exams'), list) or not state.get('difficultQuestions'):
            return 0
        current_exam_ids = {e['id'] for e in state['exams'] if 'id' in e}
        count = 0
        for exam_id, arr in state['difficultQuestions'].items():
            if exam_id in current_exam_ids and isinstance(arr, list):
                count += len(arr)
        return count

    def get_subject_incorrect_count(self, state, incorrect_status=2):
        if not state or not state.get('exams') or not isinstance(state.get('exams'), list) or not state.get('examHistory'):
            return 0
        current_exam_ids = {e['id'] for e in state['exams'] if 'id' in e}
        count = 0
        for exam_id, arr in state['examHistory'].items():
            if exam_id in current_exam_ids and isinstance(arr, list):
                count += sum(1 for s in arr if s == incorrect_status)
        return count

    def compute_practice_hub_ui_state(self, state):
        """
        Mathematical model of the UI state:
        Returns:
            sidebar_display: '' (always visible in DOM)
            btn_difficult_disabled: bool
            btn_incorrect_disabled: bool
            count_difficult_text: str
            count_incorrect_text: str
        """
        diff_count = self.get_subject_difficult_count(state)
        inc_count = self.get_subject_incorrect_count(state)

        return {
            'sidebar_display': '',
            'btn_difficult_disabled': (diff_count == 0),
            'btn_incorrect_disabled': (inc_count == 0),
            'count_difficult_text': str(diff_count),
            'count_incorrect_text': str(inc_count)
        }

    def test_empty_subject_returns_zero(self):
        """When switching to a subject with 0 exams, count is strictly 0 and buttons are disabled."""
        state = {
            'activeCadeira': {'id': 'empty_sub', 'nome': 'Empty Subject'},
            'exams': [],
            'difficultQuestions': {
                'other_exam_1': [0, 1, 2],
                'other_exam_2': [4]
            },
            'examHistory': {
                'other_exam_1': [1, 2, 2, 1], # 2 incorrect
                'other_exam_2': [2, 2]        # 2 incorrect
            }
        }
        self.assertEqual(self.get_subject_difficult_count(state), 0)
        self.assertEqual(self.get_subject_incorrect_count(state), 0)

        ui = self.compute_practice_hub_ui_state(state)
        self.assertEqual(ui['sidebar_display'], '')
        self.assertTrue(ui['btn_difficult_disabled'])
        self.assertTrue(ui['btn_incorrect_disabled'])
        self.assertEqual(ui['count_difficult_text'], '0')
        self.assertEqual(ui['count_incorrect_text'], '0')

    def test_null_state_and_safety(self):
        """Null or malformed state safely returns 0 without crashing."""
        for empty_val in [None, {}, {'exams': None}, {'activeCadeira': None}]:
            self.assertEqual(self.get_subject_difficult_count(empty_val), 0)
            self.assertEqual(self.get_subject_incorrect_count(empty_val), 0)
            ui = self.compute_practice_hub_ui_state(empty_val)
            self.assertEqual(ui['sidebar_display'], '')
            self.assertTrue(ui['btn_difficult_disabled'])
            self.assertTrue(ui['btn_incorrect_disabled'])
            self.assertEqual(ui['count_difficult_text'], '0')
            self.assertEqual(ui['count_incorrect_text'], '0')

    def test_strict_subject_scoping_difficult(self):
        """Only counts difficult questions from exams belonging to the active subject."""
        state = {
            'activeCadeira': {'id': 'sub_a', 'nome': 'Subject A'},
            'exams': [
                {'id': 'sub_a_exam_1'},
                {'id': 'sub_a_exam_2'}
            ],
            'difficultQuestions': {
                'sub_a_exam_1': [0, 3],        # 2
                'sub_a_exam_2': [1],           # 1
                'sub_b_exam_1': [0, 1, 2, 3],  # 4 (should be ignored!)
                'sub_c_exam_9': [99]           # 1 (should be ignored!)
            }
        }
        self.assertEqual(self.get_subject_difficult_count(state), 3)

        ui = self.compute_practice_hub_ui_state(state)
        self.assertEqual(ui['sidebar_display'], '')
        self.assertFalse(ui['btn_difficult_disabled'])
        self.assertEqual(ui['count_difficult_text'], '3')

    def test_strict_subject_scoping_incorrect(self):
        """Only counts incorrect questions from exams belonging to the active subject."""
        # Status enum: 1=CORRECT, 2=INCORRECT, 3=UNANSWERED, 4=ANSWERED
        state = {
            'activeCadeira': {'id': 'sub_a', 'nome': 'Subject A'},
            'exams': [
                {'id': 'sub_a_exam_1'},
                {'id': 'sub_a_exam_2'}
            ],
            'examHistory': {
                'sub_a_exam_1': [1, 2, 1, 2, 3],  # 2 incorrect
                'sub_a_exam_2': [2, 1, 1],        # 1 incorrect
                'sub_b_exam_1': [2, 2, 2, 2],     # 4 incorrect (should be ignored!)
                'sub_c_exam_1': [2]               # 1 incorrect (should be ignored!)
            }
        }
        self.assertEqual(self.get_subject_incorrect_count(state), 3)

        ui = self.compute_practice_hub_ui_state(state)
        self.assertEqual(ui['sidebar_display'], '')
        self.assertFalse(ui['btn_incorrect_disabled'])
        self.assertEqual(ui['count_incorrect_text'], '3')

    def test_subject_transition_lifecycle(self):
        """
        Mathematical proof of state transition sequence:
        State 1: Subject A (has 2 diff, 1 inc) -> Boxes visible with '2' and '1', buttons enabled
        State 2: Subject B (0 exams) -> Boxes visible with '0' and '0', buttons disabled
        State 3: Subject C (has exams, but 0 diff, 0 inc) -> Boxes visible with '0' and '0', buttons disabled
        State 4: Subject A restored -> Boxes visible with '2' and '1', buttons enabled
        """
        global_difficult = {
            'exam_a_1': [0, 2],
            'exam_b_1': [5]
        }
        global_history = {
            'exam_a_1': [1, 2, 1],
            'exam_c_1': [1, 1, 1]
        }

        # Step 1: Active Subject A
        state_a = {
            'activeCadeira': {'id': 'cad_a'},
            'exams': [{'id': 'exam_a_1'}],
            'difficultQuestions': global_difficult,
            'examHistory': global_history
        }
        ui_a = self.compute_practice_hub_ui_state(state_a)
        self.assertEqual(ui_a['sidebar_display'], '')
        self.assertEqual(ui_a['count_difficult_text'], '2')
        self.assertEqual(ui_a['count_incorrect_text'], '1')
        self.assertFalse(ui_a['btn_difficult_disabled'])
        self.assertFalse(ui_a['btn_incorrect_disabled'])

        # Step 2: Switch to Empty Subject B
        state_b = {
            'activeCadeira': {'id': 'cad_b'},
            'exams': [],
            'difficultQuestions': global_difficult,
            'examHistory': global_history
        }
        ui_b = self.compute_practice_hub_ui_state(state_b)
        self.assertEqual(ui_b['sidebar_display'], '')
        self.assertEqual(ui_b['count_difficult_text'], '0')
        self.assertEqual(ui_b['count_incorrect_text'], '0')
        self.assertTrue(ui_b['btn_difficult_disabled'])
        self.assertTrue(ui_b['btn_incorrect_disabled'])

        # Step 3: Switch to Subject C (exams exist, 0 diff/inc)
        state_c = {
            'activeCadeira': {'id': 'cad_c'},
            'exams': [{'id': 'exam_c_1'}],
            'difficultQuestions': global_difficult,
            'examHistory': global_history
        }
        ui_c = self.compute_practice_hub_ui_state(state_c)
        self.assertEqual(ui_c['sidebar_display'], '')
        self.assertEqual(ui_c['count_difficult_text'], '0')
        self.assertEqual(ui_c['count_incorrect_text'], '0')
        self.assertTrue(ui_c['btn_difficult_disabled'])
        self.assertTrue(ui_c['btn_incorrect_disabled'])

        # Step 4: Return to Subject A
        ui_a_restored = self.compute_practice_hub_ui_state(state_a)
        self.assertEqual(ui_a_restored['sidebar_display'], '')
        self.assertEqual(ui_a_restored['count_difficult_text'], '2')
        self.assertEqual(ui_a_restored['count_incorrect_text'], '1')
        self.assertFalse(ui_a_restored['btn_difficult_disabled'])
        self.assertFalse(ui_a_restored['btn_incorrect_disabled'])

if __name__ == '__main__':
    unittest.main()
