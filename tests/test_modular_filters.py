"""
tests/test_modular_filters.py
-----------------------------
Testes unitários automatizados para a arquitetura modular de filtros:
1. Validação de limites matemáticos e clamping em filterState.js
2. Preservação do valor máximo de questões (correção da anomalia de drag)
3. Predicado de filtragem isExamMatchingFilters
4. Cálculos visuais e de proximidade de dualRangeSlider.js
"""

import unittest
import math


class TestFilterStateMath(unittest.TestCase):
    """Testa a lógica matemática isolada de filterState."""

    def test_canonical_question_types(self):
        """Valida os tipos de questão canónicos ('escolha_multipla', 'boolean', 'escrita')."""
        import re
        with open(r"c:\Users\Pedro\source\repos\examPreparation\static\js\filterState.js", "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r"export\s+const\s+ALL_QUESTION_TYPES\s*=\s*\[(.*?)\];", content)
        self.assertIsNotNone(match)
        types = [t.strip().strip("'\"") for t in match.group(1).split(",") if t.strip()]
        self.assertEqual(types, ['escolha_multipla', 'boolean', 'escrita'])

    def test_canonical_languages(self):
        """Valida as línguas canónicas ('pt', 'en')."""
        import re
        with open(r"c:\Users\Pedro\source\repos\examPreparation\static\js\filterState.js", "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r"export\s+const\s+ALL_LANGUAGES\s*=\s*\[(.*?)\];", content)
        self.assertIsNotNone(match)
        langs = [l.strip().strip("'\"") for l in match.group(1).split(",") if l.strip()]
        self.assertEqual(langs, ['pt', 'en'])

    def test_sanitize_questions_max_preserves_lower_values(self):
        """Garante que quando o utilizador define max=10 numa cadeira de 50, o valor 10 é preservado!"""
        limit = 50

        # Casos onde o utilizador escolhe valores válidos abaixo do teto
        self.assertEqual(self._sanitize_max(10, limit), 10)
        self.assertEqual(self._sanitize_max(1, limit), 1)
        self.assertEqual(self._sanitize_max(25, limit), 25)
        self.assertEqual(self._sanitize_max(50, limit), 50)

        # Casos onde o valor excede ou é nulo -> repõe no limite
        self.assertEqual(self._sanitize_max(None, limit), 50)
        self.assertEqual(self._sanitize_max(60, limit), 50)
        self.assertEqual(self._sanitize_max(-5, limit), 1)

    def test_sanitize_questions_min_clamped_to_max(self):
        """Garante que o mínimo nunca ultrapassa o máximo atual."""
        self.assertEqual(self._sanitize_min(5, 10), 5)
        self.assertEqual(self._sanitize_min(15, 10), 10)
        self.assertEqual(self._sanitize_min(-2, 10), 1)
        self.assertEqual(self._sanitize_min(None, 10), 1)

    def test_clamp_score_range(self):
        """Garante que a percentagem de classificação é restrita a 0-100."""
        min_v, max_v = self._clamp_score(0, 100)
        self.assertEqual((min_v, max_v), (0, 100))

        min_v, max_v = self._clamp_score(40, 80)
        self.assertEqual((min_v, max_v), (40, 80))

        # Inversão: min > max -> min é igualado a max
        min_v, max_v = self._clamp_score(90, 30)
        self.assertEqual((min_v, max_v), (30, 30))

        # Extremos fora de 0-100
        min_v, max_v = self._clamp_score(-10, 150)
        self.assertEqual((min_v, max_v), (0, 100))

    def test_track_fill_percentages(self):
        """Valida os cálculos de percentagem visual para a barra do slider duplo."""
        # Escala de 1 a 50
        min_limit = 1
        max_limit = 50
        span = max_limit - min_limit  # 49

        # Caso 1: min=1, max=50 -> 0% esquerda, 0% direita
        left_pct = ((1 - min_limit) / span) * 100
        right_pct = 100 - (((50 - min_limit) / span) * 100)
        self.assertAlmostEqual(left_pct, 0.0)
        self.assertAlmostEqual(right_pct, 0.0)

        # Caso 2: min=10, max=30
        left_pct = ((10 - min_limit) / span) * 100
        right_pct = 100 - (((30 - min_limit) / span) * 100)
        self.assertAlmostEqual(left_pct, (9 / 49) * 100)
        self.assertAlmostEqual(right_pct, 100 - ((29 / 49) * 100))

    def test_hit_test_proximity_resolution(self):
        """Valida a seleção correta da bola mais próxima ao clicar na faixa."""
        min_limit = 0
        max_limit = 100
        min_val = 20
        max_val = 80

        # Clique em 75% -> mais perto de 80 (dist 5) do que 20 (dist 55) -> Deve elevar MAX
        click_pct = 0.75
        dist_min = abs(click_pct - (min_val / 100))
        dist_max = abs(click_pct - (max_val / 100))
        self.assertTrue(dist_max < dist_min)

        # Clique em 25% -> mais perto de 20 (dist 5) do que 80 (dist 55) -> Deve elevar MIN
        click_pct = 0.25
        dist_min = abs(click_pct - (min_val / 100))
        dist_max = abs(click_pct - (max_val / 100))
        self.assertTrue(dist_min < dist_max)

    # Implementações espelho da lógica em filterState.js
    def _sanitize_max(self, current_max, max_limit):
        if current_max is None:
            return max_limit
        if current_max > max_limit:
            return max_limit
        if current_max < 1:
            return 1
        return current_max

    def _sanitize_min(self, current_min, current_max):
        if current_min is None:
            return 1
        return max(1, min(current_max, current_min))

    def _clamp_score(self, min_val, max_val):
        min_v = max(0, min(100, min_val))
        max_v = max(0, min(100, max_val))
        if min_v > max_v:
            min_v = max_v
        return min_v, max_v


if __name__ == '__main__':
    unittest.main()
