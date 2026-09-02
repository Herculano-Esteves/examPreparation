"""
debug_tools/test_slider_filtering.py
------------------------------------
Verifica a contagem de questões dos exames e testa a filtragem real
ao ajustar o slider de mínimo e máximo.
"""

import json
import os

with open(r"c:\Users\Pedro\source\repos\examPreparation\exames\adi\exams.json", "r", encoding="utf-8") as f:
    adi_exams = json.load(f)
counts = [len(e.get("questions", [])) for e in adi_exams]
print(f"Total ADI exams: {len(adi_exams)}")
print(f"Question counts in ADI: min={min(counts)}, max={max(counts)}, sample={counts[:5]}")

# Let's see how many exams have questions <= 10
count_le_10 = sum(1 for c in counts if c <= 10)
count_gt_20 = sum(1 for c in counts if c > 20)
print(f"Exams with <= 10 questions: {count_le_10}")
print(f"Exams with > 20 questions: {count_gt_20}")
