#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simulador de Exames - Backend & Developer CLI Tool
--------------------------------------------------
Provides commands for:
  - Compiling exam indexes (index.json & cadeiras.json)
  - Live file watcher (hot reload / auto-rebuild on JSON changes)
  - Strict CI/CD schema and data validator (--validate)
  - Exam boilerplate generator (--new-exam)
  - Subject creator (--new-cadeira)
  - Local HTTP server with CORS, UTF-8 headers, and custom 404 routing.
"""

import os
import json
import logging
import sys
import re
import time
import threading
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Set up logging
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
EXAMS_DIR = os.path.join(ROOT_DIR, 'exames')
CADEIRAS_FILE = os.path.join(EXAMS_DIR, 'cadeiras.json')

def natural_sort_key(s):
    match = re.match(r'^(\d+)', s)
    return (0, int(match.group(1)), s) if match else (1, 0, s)

def build_exams_json(silent=False):
    """
    Scans subdirectories in exames/. For each directory:
      - Validates and compiles all exam files into that directory's index.json.
      - Reads metadata from cadeira.json.
    Finally, generates the global exames/cadeiras.json file.
    """
    if not os.path.exists(EXAMS_DIR):
        logging.error(f"Exams directory not found at {EXAMS_DIR}")
        return False

    cadeiras_list = []

    subdirs = []
    for name in os.listdir(EXAMS_DIR):
        path = os.path.join(EXAMS_DIR, name)
        if os.path.isdir(path):
            subdirs.append(name)
            
    subdirs.sort()

    for cadeira_id in subdirs:
        cadeira_path = os.path.join(EXAMS_DIR, cadeira_id)

        # Load cadeira.json config if exists
        config_file = os.path.join(cadeira_path, 'cadeira.json')
        cadeira_meta = {
            "id": cadeira_id,
            "nome": cadeira_id.replace('_', ' ').title(),
            "sigla": cadeira_id.upper(),
            "icon": "fa-graduation-cap",
            "descricao": f"Exames para a cadeira {cadeira_id}."
        }

        if os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                    cadeira_meta["nome"] = config_data.get("nome", cadeira_meta["nome"])
                    cadeira_meta["sigla"] = config_data.get("sigla", cadeira_meta["sigla"])
                    cadeira_meta["icon"] = config_data.get("icon", cadeira_meta["icon"])
                    cadeira_meta["descricao"] = config_data.get("descricao", cadeira_meta["descricao"])
            except Exception as e:
                logging.error(f"Error reading configuration cadeira.json for {cadeira_id}: {e}")

        if not silent:
            print(f"Starting {cadeira_meta['sigla']}")

        loaded_exams = []
        for filename in sorted(os.listdir(cadeira_path), key=natural_sort_key):
            if filename.endswith('.json') and filename not in ('index.json', 'cadeira.json'):
                file_path = os.path.join(cadeira_path, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        
                        title = data.get('title', data.get('titulo'))
                        if not title:
                            logging.error(f"Validação falhou para {filename}: Falta 'title' / 'titulo'")
                            continue

                        description = data.get('description', data.get('descricao'))
                        if not description:
                            logging.error(f"Validação falhou para {filename}: Falta 'description' / 'descricao'")
                            continue

                        raw_languages = data.get('languages', data.get('linguas', data.get('lingua', data.get('lang', ['pt']))))
                        if isinstance(raw_languages, str):
                            languages = [raw_languages.lower().strip()]
                        elif isinstance(raw_languages, list):
                            languages = [str(l).lower().strip() for l in raw_languages if str(l).strip()]
                        else:
                            languages = ['pt']
                        if not languages:
                            languages = ['pt']

                        questions_list = data.get('questions', data.get('perguntas'))
                        if not questions_list or not isinstance(questions_list, list):
                            logging.error(f"Validação falhou para {filename}: Falta ou lista de 'questions' / 'perguntas' inválida")
                            continue
                        
                        valid_questions = []
                        for idx, q in enumerate(questions_list):
                            q_text = q.get('question', q.get('pergunta'))
                            q_sol = q.get('solution', q.get('solucao'))
                            if q_text is None or q_sol is None:
                                logging.warning(f"A saltar questão {idx} em {filename}: faltam campos obrigatórios (question/solution)")
                                continue
                            
                            tipo = q.get('type', q.get('tipo', 'escolha_multipla'))
                            if tipo in ('escrita', 'written', 'desenvolvimento'):
                                if not isinstance(q_sol, (str, dict)):
                                    logging.warning(f"A saltar questão {idx} em {filename}: tipo 'escrita' requer 'solution' como string ou dicionário de idiomas")
                                    continue
                            elif tipo in ('boolean', 'true_false', 'verdadeiro_falso'):
                                if isinstance(q_sol, list):
                                    if len(q_sol) == 0 or q_sol[0] not in (0, 1):
                                        logging.warning(f"A saltar questão {idx} em {filename}: tipo 'boolean' requer 'solution' 0 ou 1")
                                        continue
                                elif q_sol not in (0, 1):
                                    logging.warning(f"A saltar questão {idx} em {filename}: tipo 'boolean' requer 'solution' 0 ou 1")
                                    continue
                            else:
                                q_opts = q.get('options', q.get('opcoes'))
                                if not q_opts:
                                    logging.warning(f"A saltar questão {idx} em {filename}: lista de opções ausente")
                                    continue
                                
                                opt_len = 0
                                if isinstance(q_opts, list):
                                    if len(q_opts) == 0:
                                        logging.warning(f"A saltar questão {idx} em {filename}: lista de opções vazia")
                                        continue
                                    opt_len = len(q_opts)
                                elif isinstance(q_opts, dict):
                                    first_list = next((v for v in q_opts.values() if isinstance(v, list)), [])
                                    opt_len = len(first_list)
                                    if opt_len == 0:
                                        logging.warning(f"A saltar questão {idx} em {filename}: lista de opções multilingue vazia")
                                        continue
                                else:
                                    logging.warning(f"A saltar questão {idx} em {filename}: formato de opções inválido")
                                    continue

                                if not isinstance(q_sol, list) or len(q_sol) == 0:
                                    logging.warning(f"A saltar questão {idx} em {filename}: solução não é lista ou está vazia")
                                    continue
                                
                                invalid_sol = False
                                for s in q_sol:
                                    if not isinstance(s, int) or s < 0 or s >= opt_len:
                                        invalid_sol = True
                                        break
                                if invalid_sol:
                                    logging.warning(f"A saltar questão {idx} em {filename}: índice da solução fora de intervalo")
                                    continue
                            
                            valid_questions.append(q)
                        
                        if not valid_questions:
                            logging.error(f"Nenhuma questão válida encontrada em {filename}")
                            continue
                        
                        exam_id = os.path.splitext(filename)[0]
                        types_counts = {}
                        for q in valid_questions:
                            t = q.get('type', q.get('tipo', 'escolha_multipla'))
                            types_counts[t] = types_counts.get(t, 0) + 1
                        
                        question_types = sorted(list(types_counts.keys()))
                        loaded_exams.append({
                            "id": exam_id,
                            "title": title,
                            "description": description,
                            "languages": languages,
                            "questions_count": len(valid_questions),
                            "question_types": question_types,
                            "types_count": types_counts,
                            "path": f"exames/{cadeira_id}/{filename}"
                        })
                except Exception as e:
                    logging.exception(f"Erro ao processar ficheiro {filename}: {e}")

        # Write this subject's index.json
        subj_index_file = os.path.join(cadeira_path, 'index.json')
        try:
            with open(subj_index_file, 'w', encoding='utf-8') as f:
                json.dump(loaded_exams, f, ensure_ascii=False, indent=2)
            
            if not silent:
                print(f"{len(loaded_exams)} exams")
            
            cadeira_meta["exames_count"] = len(loaded_exams)
            cadeira_meta["index_path"] = f"exames/{cadeira_id}/index.json"
            cadeiras_list.append(cadeira_meta)
        except Exception as e:
            logging.error(f"Error writing index for {cadeira_id}: {e}")

    # Write global exames/cadeiras.json
    try:
        with open(CADEIRAS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cadeiras_list, f, ensure_ascii=False, indent=2)
        if not silent:
            print(f"All {len(cadeiras_list)} subjects compiled successfully!")
        return True
    except Exception as e:
        logging.error(f"Error writing {CADEIRAS_FILE}: {e}")
        return False

def validate_all_exams():
    """
    Validates all JSON files against schema constraints and prints a formatted report.
    Returns 0 if all clean, 1 if errors were detected.
    """
    print("\n🔍 A iniciar validação rigorosa de esquemas e integridade...")
    total_subjects = 0
    total_exams = 0
    total_questions = 0
    errors_count = 0
    warnings_count = 0

    if not os.path.exists(EXAMS_DIR):
        print(f"❌ Diretório '{EXAMS_DIR}' não encontrado.")
        return 1

    subdirs = sorted([d for d in os.listdir(EXAMS_DIR) if os.path.isdir(os.path.join(EXAMS_DIR, d))])
    
    for cadeira_id in subdirs:
        total_subjects += 1
        cadeira_path = os.path.join(EXAMS_DIR, cadeira_id)
        config_path = os.path.join(cadeira_path, 'cadeira.json')

        if not os.path.exists(config_path):
            print(f"  ⚠️  [{cadeira_id}] Ficheiro cadeira.json ausente.")
            warnings_count += 1

        for filename in sorted(os.listdir(cadeira_path), key=natural_sort_key):
            if filename.endswith('.json') and filename not in ('index.json', 'cadeira.json'):
                total_exams += 1
                filepath = os.path.join(cadeira_path, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                except Exception as e:
                    print(f"  ❌ [{cadeira_id}/{filename}] Erro de sintaxe JSON: {e}")
                    errors_count += 1
                    continue

                title = data.get('title', data.get('titulo'))
                if not title:
                    print(f"  ❌ [{cadeira_id}/{filename}] Falta campo obrigatório 'title'/'titulo'")
                    errors_count += 1

                description = data.get('description', data.get('descricao'))
                if not description:
                    print(f"  ❌ [{cadeira_id}/{filename}] Falta campo obrigatório 'description'/'descricao'")
                    errors_count += 1

                questions = data.get('questions', data.get('perguntas'))
                if not isinstance(questions, list) or len(questions) == 0:
                    print(f"  ❌ [{cadeira_id}/{filename}] 'questions' deve ser uma lista não-vazia")
                    errors_count += 1
                    continue

                for q_idx, q in enumerate(questions):
                    total_questions += 1
                    q_text = q.get('question', q.get('pergunta'))
                    q_sol = q.get('solution', q.get('solucao'))

                    if not q_text:
                        print(f"  ❌ [{cadeira_id}/{filename}] Questão #{q_idx+1}: Enunciado ausente")
                        errors_count += 1
                    if q_sol is None:
                        print(f"  ❌ [{cadeira_id}/{filename}] Questão #{q_idx+1}: Solução ausente")
                        errors_count += 1

                    q_type = q.get('type', q.get('tipo', 'escolha_multipla'))
                    if q_type in ('escolha_multipla', 'multiple_choice', 'multipla'):
                        opts = q.get('options', q.get('opcoes'))
                        if not opts:
                            print(f"  ❌ [{cadeira_id}/{filename}] Questão #{q_idx+1}: Opções ausentes")
                            errors_count += 1
                        elif not isinstance(q_sol, list):
                            print(f"  ❌ [{cadeira_id}/{filename}] Questão #{q_idx+1}: Solução deve ser uma lista de índices [0, ...]")
                            errors_count += 1

    print("\n" + "=" * 50)
    print(f"📊 Resumo da Validação:")
    print(f"   • Cadeiras:  {total_subjects}")
    print(f"   • Exames:    {total_exams}")
    print(f"   • Questões:  {total_questions}")
    print(f"   • Avisos:    {warnings_count}")
    print(f"   • Erros:     {errors_count}")
    print("=" * 50)

    if errors_count == 0:
        print("✅ Todos os exames e esquemas estão 100% válidos e conformes!\n")
        return 0
    else:
        print(f"❌ Foram encontrados {errors_count} erro(s). Corrija-os para garantir a integridade.\n")
        return 1

def create_new_exam_template(cadeira_id, exam_name=None):
    """
    Creates a new boilerplate exam JSON file ready for editing.
    """
    cadeira_dir = os.path.join(EXAMS_DIR, cadeira_id.lower())
    if not os.path.exists(cadeira_dir):
        os.makedirs(cadeira_dir, exist_ok=True)
        # Create default cadeira.json if not present
        config_path = os.path.join(cadeira_dir, 'cadeira.json')
        if not os.path.exists(config_path):
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "nome": cadeira_id.upper(),
                    "sigla": cadeira_id.upper(),
                    "icon": "fa-graduation-cap",
                    "descricao": f"Exames para a cadeira {cadeira_id.upper()}."
                }, f, ensure_ascii=False, indent=2)

    existing_files = [f for f in os.listdir(cadeira_dir) if f.endswith('.json') and f not in ('index.json', 'cadeira.json')]
    next_num = len(existing_files) + 1

    file_slug = exam_name if exam_name else f"Exame{cadeira_id.upper()}{next_num}"
    if not file_slug.endswith('.json'):
        file_slug += '.json'

    target_file = os.path.join(cadeira_dir, file_slug)
    if os.path.exists(target_file):
        print(f"⚠️ O ficheiro '{file_slug}' já existe em '{cadeira_dir}'. Escolha outro nome.")
        return False

    template = {
        "title": {
            "pt": f"Exame {next_num} - {cadeira_id.upper()}",
            "en": f"Exam {next_num} - {cadeira_id.upper()}"
        },
        "description": {
            "pt": f"Exame de preparação para {cadeira_id.upper()} com questões de escolha múltipla, verdadeiro/falso e escrita.",
            "en": f"Preparation exam for {cadeira_id.upper()} with multiple choice, true/false, and written questions."
        },
        "languages": ["pt", "en"],
        "questions": [
            {
                "question": {
                    "pt": "Qual é a principal função de um sistema operativo?",
                    "en": "What is the primary purpose of an operating system?"
                },
                "type": "escolha_multipla",
                "options": {
                    "pt": [
                        "Gerir recursos de hardware e fornecer uma abstração ao utilizador.",
                        "Compilar código-fonte diretamente para hardware.",
                        "Substituir a memória RAM fisicamente.",
                        "Nenhuma das opções anteriores."
                    ],
                    "en": [
                        "Manage hardware resources and provide an abstraction layer for users.",
                        "Compile source code directly into hardware.",
                        "Physically replace RAM memory.",
                        "None of the above."
                    ]
                },
                "solution": [0],
                "explanation": {
                    "pt": "O sistema operativo gere o hardware (CPU, memória, I/O) e oferece interfaces simplificadas.",
                    "en": "The operating system manages hardware (CPU, memory, I/O) and provides simplified interfaces."
                }
            },
            {
                "question": {
                    "pt": "A memória virtual permite que o espaço de endereçamento de um processo exceda a memória física disponível.",
                    "en": "Virtual memory allows a process address space to exceed physically available RAM."
                },
                "type": "boolean",
                "solution": 1,
                "explanation": {
                    "pt": "Verdadeiro. A memória virtual utiliza técnicas como paginação e swap para criar um espaço alargado.",
                    "en": "True. Virtual memory utilizes paging and swap to create an extended address space."
                }
            },
            {
                "question": {
                    "pt": "Explique brevemente a diferença entre um processo e uma thread.",
                    "en": "Briefly explain the difference between a process and a thread."
                },
                "type": "escrita",
                "solution": {
                    "pt": "Um processo possui o seu próprio espaço de memória isolado, enquanto threads do mesmo processo partilham memória e recursos.",
                    "en": "A process has its own isolated memory space, whereas threads within the same process share memory and resources."
                }
            }
        ]
    }

    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(template, f, ensure_ascii=False, indent=2)

    print(f"✨ Novo exame criado com sucesso em: {target_file}")
    build_exams_json()
    return True

def create_new_cadeira(cadeira_id, nome=None, sigla=None):
    """
    Creates a new subject directory with its cadeira.json file.
    """
    cadeira_dir = os.path.join(EXAMS_DIR, cadeira_id.lower())
    os.makedirs(cadeira_dir, exist_ok=True)
    config_path = os.path.join(cadeira_dir, 'cadeira.json')

    data = {
        "nome": nome if nome else cadeira_id.replace('_', ' ').title(),
        "sigla": sigla if sigla else cadeira_id.upper(),
        "icon": "fa-graduation-cap",
        "descricao": f"Exames para a cadeira {nome or cadeira_id}."
    }

    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✨ Nova cadeira criada com sucesso em: {cadeira_dir}")
    build_exams_json()
    return True

def get_exams_mtimes():
    """
    Returns a dict mapping filepaths in exames/ to their last modification timestamp.
    Excludes generated index.json and cadeiras.json to prevent rebuild loops.
    """
    mtimes = {}
    if not os.path.exists(EXAMS_DIR):
        return mtimes

    for root, _, files in os.walk(EXAMS_DIR):
        for f in files:
            if f.endswith('.json') and f not in ('index.json', 'cadeiras.json'):
                path = os.path.join(root, f)
                try:
                    mtimes[path] = os.path.getmtime(path)
                except OSError:
                    pass
    return mtimes

def start_file_watcher():
    """
    Watches the exames/ directory for file creation, edits, or deletions,
    automatically triggering build_exams_json() on changes.
    """
    def _watch_loop():
        last_mtimes = get_exams_mtimes()
        while True:
            time.sleep(1.0)
            current_mtimes = get_exams_mtimes()
            if current_mtimes != last_mtimes:
                print("\n[Watcher] ⚡ Alterações detetadas em exames/. A recompilar índices...")
                build_exams_json(silent=True)
                print("[Watcher] ✅ Índices atualizados com sucesso!\n")
                last_mtimes = current_mtimes

    watcher_thread = threading.Thread(target=_watch_loop, daemon=True)
    watcher_thread.start()

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def guess_type(self, path):
        ctype = super().guess_type(path)
        if ctype.startswith('text/') or ctype in ('application/json', 'application/javascript'):
            return f"{ctype}; charset=utf-8"
        return ctype

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        """Map /teste and /teste/ cleanly to /teste.html."""
        if self.path in ('/teste', '/teste/'):
            self.path = '/teste.html'
        super().do_GET()

    def send_error(self, code, message=None, explain=None):
        """Serve the custom 404.html page for 404 errors if it exists."""
        if code == 404 and os.path.exists('404.html'):
            try:
                with open('404.html', 'rb') as f:
                    content = f.read()
                self.send_response(404, "Not Found")
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except Exception as e:
                logging.error(f"Error serving custom 404.html: {e}")
        super().send_error(code, message, explain)

def run_server(preferred_port=5000, enable_watch=True):
    os.chdir(ROOT_DIR)
    
    ports_to_try = [preferred_port, 5001, 8000, 8080]
    httpd = None
    active_port = None
    
    for port in ports_to_try:
        try:
            server_address = ('127.0.0.1', port)
            httpd = HTTPServer(server_address, CORSRequestHandler)
            active_port = port
            break
        except OSError as e:
            if getattr(e, 'winerror', None) == 10048 or 'address already in use' in str(e).lower():
                continue
            raise e

    if not httpd:
        print(f"❌ Erro: Todas as portas {ports_to_try} estão ocupadas.")
        sys.exit(1)
    
    if enable_watch:
        start_file_watcher()

    print("\n" + "=" * 60)
    print(" 🚀 SIMULADOR DE EXAMES PRONTO!")
    print(" • Servidor Local:    http://127.0.0.1:" + str(active_port))
    print(" • Auto-Recompilação: Ativa (--watch)")
    print(" • Codificação:       UTF-8 com no-cache")
    print("=" * 60 + "\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado pelo utilizador.")
        sys.exit(0)

def main():
    parser = argparse.ArgumentParser(
        description="Simulador de Exames - Ferramenta de Servidor e Gestão de Exames CLI"
    )
    parser.add_argument('--build', '--build-only', dest='build_only', action='store_true',
                        help="Compila os índices index.json e cadeiras.json e termina.")
    parser.add_argument('--validate', action='store_true',
                        help="Executa validação rigorosa de sintaxe, campos e integridade de todos os exames.")
    parser.add_argument('--watch', action='store_true',
                        help="Inicia o observador de ficheiros em modo interativo.")
    parser.add_argument('--new-exam', nargs='+', metavar='ARG',
                        help="Gera um novo modelo bilingue de exame JSON. Exemplo: --new-exam adi ExameADI_Teste")
    parser.add_argument('--new-cadeira', nargs='+', metavar='ARG',
                        help="Cria uma nova cadeira. Exemplo: --new-cadeira rc 'Redes de Computadores' RC")
    parser.add_argument('--port', type=int, default=5000,
                        help="Porta preferencial para o servidor HTTP (predefinição: 5000).")

    args = parser.parse_args()

    if args.validate:
        sys.exit(validate_all_exams())

    if args.new_exam:
        cadeira_id = args.new_exam[0]
        exam_name = args.new_exam[1] if len(args.new_exam) > 1 else None
        create_new_exam_template(cadeira_id, exam_name)
        sys.exit(0)

    if args.new_cadeira:
        c_id = args.new_cadeira[0]
        c_name = args.new_cadeira[1] if len(args.new_cadeira) > 1 else None
        c_sigla = args.new_cadeira[2] if len(args.new_cadeira) > 2 else None
        create_new_cadeira(c_id, c_name, c_sigla)
        sys.exit(0)

    # Standard build
    build_ok = build_exams_json()
    if not build_ok:
        logging.error("Falha ao compilar exames.")
        sys.exit(1)

    if args.build_only:
        sys.exit(0)

    run_server(preferred_port=args.port, enable_watch=True)

if __name__ == '__main__':
    main()
