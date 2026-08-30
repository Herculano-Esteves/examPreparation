import os
import json
import logging
import sys
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Set up logging
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')

EXAMS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exames')
CADEIRAS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exames', 'cadeiras.json')

def natural_sort_key(s):
    match = re.match(r'^(\d+)', s)
    return (0, int(match.group(1)), s) if match else (1, 0, s)

def build_exams_json():
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

    # Scan for directories inside exames/
    subdirs = []
    for name in os.listdir(EXAMS_DIR):
        path = os.path.join(EXAMS_DIR, name)
        if os.path.isdir(path):
            subdirs.append(name)
            
    # Sort subdirectories alphabetically
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

        # Print the start of subject processing in English
        print(f"Starting {cadeira_meta['sigla']}")

        # Scan exams in this folder
        loaded_exams = []
        for filename in sorted(os.listdir(cadeira_path), key=natural_sort_key):
            # Ignore index.json and cadeira.json
            if filename.endswith('.json') and filename not in ('index.json', 'cadeira.json'):
                file_path = os.path.join(cadeira_path, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        
                        # Flexible validation of required fields (English + legacy Portuguese keys)
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
                        
                        # Validate questions
                        valid_questions = []
                        for idx, q in enumerate(questions_list):
                            q_text = q.get('question', q.get('pergunta'))
                            q_sol = q.get('solution', q.get('solucao'))
                            if q_text is None or q_sol is None:
                                logging.warning(f"A saltar questão {idx} em {filename}: faltam campos obrigatórios (question/solution)")
                                continue
                            
                            tipo = q.get('type', q.get('tipo', 'escolha_multipla'))
                            if tipo == 'escrita':
                                if not isinstance(q_sol, (str, dict)):
                                    logging.warning(f"A saltar questão {idx} em {filename}: tipo 'escrita' requer 'solution' como string ou dicionário de idiomas")
                                    continue
                            elif tipo == 'boolean':
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
                                
                                # Validate that all items in the solution list are valid option indices
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
            
            # Print compiled exams count for the subject in English
            print(f"{len(loaded_exams)} exams")
            
            # Update the global Cadeira metadata
            cadeira_meta["exames_count"] = len(loaded_exams)
            cadeira_meta["index_path"] = f"exames/{cadeira_id}/index.json"
            cadeiras_list.append(cadeira_meta)
        except Exception as e:
            logging.error(f"Error writing index for {cadeira_id}: {e}")

    # Write global exames/cadeiras.json
    try:
        with open(CADEIRAS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cadeiras_list, f, ensure_ascii=False, indent=2)
        print(f"All {len(cadeiras_list)} subjects compiled successfully!")
        return True
    except Exception as e:
        logging.error(f"Error writing {CADEIRAS_FILE}: {e}")
        return False

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

def run_server(preferred_port=5000):
    # Change working directory to the directory of this script to serve static files correctly
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
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
        print(f"Erro: Todas as portas {ports_to_try} estão ocupadas.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print(" SIMULADOR DE EXAMES PRONTO (MODO ESTÁTICO)!")
    print(" Clique no link abaixo para abrir o simulador no browser:")
    print(f" http://127.0.0.1:{active_port}")
    print("=" * 60 + "\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado pelo utilizador.")
        sys.exit(0)

if __name__ == '__main__':
    # Build the static json first
    if build_exams_json():
        if len(sys.argv) > 1 and sys.argv[1] == '--build-only':
            pass
        else:
            run_server()
    else:
        logging.error("Falha ao compilar exames. O servidor não foi iniciado.")
