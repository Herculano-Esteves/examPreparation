import os
import json
import unittest
import sys

# Add project root to sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from run import build_exams_json, EXAMS_DIR, CADEIRAS_FILE

class TestExamSchemasAndBuild(unittest.TestCase):
    def test_build_exams_json(self):
        """Tests that build_exams_json compiles all subjects and exams without errors."""
        result = build_exams_json()
        self.assertTrue(result, "build_exams_json() should return True")
        
        self.assertTrue(os.path.exists(CADEIRAS_FILE), "cadeiras.json must exist")
        with open(CADEIRAS_FILE, 'r', encoding='utf-8') as f:
            cadeiras = json.load(f)
        
        self.assertGreater(len(cadeiras), 0, "cadeiras.json should contain subjects")
        
        for cadeira in cadeiras:
            self.assertIn("id", cadeira)
            self.assertIn("nome", cadeira)
            self.assertIn("sigla", cadeira)
            self.assertIn("index_path", cadeira)
            self.assertGreater(cadeira.get("exames_count", 0), 0, f"Cadeira {cadeira['id']} should have exams")
            
            index_path = os.path.join(PROJECT_ROOT, cadeira["index_path"])
            self.assertTrue(os.path.exists(index_path), f"Index file {index_path} must exist")
            
            with open(index_path, 'r', encoding='utf-8') as f:
                exams = json.load(f)
            
            self.assertEqual(len(exams), cadeira["exames_count"], f"Exams count mismatch for {cadeira['id']}")
            
            for exam in exams:
                self.assertIn("id", exam)
                self.assertTrue("title" in exam or "titulo" in exam)
                self.assertTrue("description" in exam or "descricao" in exam)
                self.assertIn("languages", exam)
                self.assertIn("questions_count", exam)
                self.assertGreater(exam["questions_count"], 0)
                
                # Check individual exam JSON
                exam_path = os.path.join(PROJECT_ROOT, exam["path"])
                self.assertTrue(os.path.exists(exam_path), f"Exam file {exam_path} must exist")
                with open(exam_path, 'r', encoding='utf-8') as ef:
                    exam_data = json.load(ef)
                
                questions = exam_data.get("questions", exam_data.get("perguntas", []))
                self.assertEqual(len(questions), exam["questions_count"])

if __name__ == '__main__':
    unittest.main()
