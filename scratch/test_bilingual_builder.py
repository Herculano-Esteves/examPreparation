import os
import time
import subprocess
import urllib.request
from playwright.sync_api import sync_playwright

def main():
    # Start python http server
    proc = subprocess.Popen(['python', '-m', 'http.server', '8080'], cwd=r'c:\Users\Pedro\source\repos\examPreparation')
    time.sleep(1)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1400, 'height': 900})
            page.goto('http://localhost:8080')
            page.wait_for_timeout(1000)

            # Dismiss privacy modal if present
            btn_start = page.locator('#btn-start-app')
            if btn_start.is_visible():
                btn_start.click()
                page.wait_for_timeout(500)

            # Click on ADI subject card to go to exams list
            page.locator('.cadeira-card').first.click()
            page.wait_for_timeout(500)

            # Click on "+ Adicionar Exame" button
            page.locator('#btn-add-exame-from-menu').click()
            page.wait_for_timeout(500)

            # Take screenshot of default builder (PT monolingual)
            page.screenshot(path=r'c:\Users\Pedro\.gemini\antigravity-ide\brain\55df47b7-2f59-4d54-8df6-417779e0f26d\scratch\builder_monolingual.png')
            print("Captured monolingual screenshot")

            # Select Bilingual in language dropdown
            lang_select = page.locator('#builder-exam-lang')
            lang_select.select_option('pt,en')
            page.wait_for_timeout(500)

            # Fill in Title
            page.locator('#builder-exam-title').fill('Exame de Teste Bilingue')
            page.locator('#builder-exam-title-en').fill('Bilingual Test Exam')

            # Fill in Description
            page.locator('#builder-exam-desc').fill('Descrição do exame em português')
            page.locator('#builder-exam-desc-en').fill('Exam description in English')

            # Fill in Question 1 (Escolha múltipla)
            page.locator('.builder-q-text-pt').fill('Qual é a resposta correta?')
            page.locator('.builder-q-text-en').fill('What is the correct answer?')

            # Fill in Option 1
            page.locator('.builder-opt-input-pt').nth(0).fill('Primeira opção')
            page.locator('.builder-opt-input-en').nth(0).fill('First option')

            # Fill in Option 2
            page.locator('.builder-opt-input-pt').nth(1).fill('Segunda opção')
            page.locator('.builder-opt-input-en').nth(1).fill('Second option')

            # Fill in Explanation
            page.locator('.builder-q-expl-pt').fill('Explicação da opção correta.')
            page.locator('.builder-q-expl-en').fill('Explanation of the correct option.')

            # Add Written Question
            page.locator('#btn-builder-add-question').click()
            page.wait_for_timeout(300)

            # Change second question type to 'escrita'
            page.locator('.builder-question-card').nth(1).locator('.builder-q-type-select').select_option('escrita')
            page.wait_for_timeout(300)

            # Fill written question
            page.locator('.builder-question-card').nth(1).locator('.builder-q-text-pt').fill('Explique o algoritmo KNN.')
            page.locator('.builder-question-card').nth(1).locator('.builder-q-text-en').fill('Explain the KNN algorithm.')

            page.locator('.builder-question-card').nth(1).locator('.builder-q-written-pt').fill('O KNN calcula a distância...')
            page.locator('.builder-question-card').nth(1).locator('.builder-q-written-en').fill('KNN calculates the distance...')

            page.wait_for_timeout(500)

            # Take screenshot of bilingual builder
            page.screenshot(path=r'c:\Users\Pedro\.gemini\antigravity-ide\brain\55df47b7-2f59-4d54-8df6-417779e0f26d\scratch\builder_bilingual.png')
            print("Captured bilingual screenshot")

            # Get JSON editor value
            json_val = page.locator('#editor-code-input').input_value()
            print("Generated JSON snippet:")
            print(json_val[:400])

            # Verify JSON status
            status_text = page.locator('#validation-status').inner_text()
            print("Validation Status:", status_text)

            browser.close()
    finally:
        proc.terminate()

if __name__ == '__main__':
    main()
