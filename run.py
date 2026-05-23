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
                        
                        # Strict validation of required fields
                        if 'titulo' not in data:
                            logging.error(f"Validação falhou para {filename}: Falta 'titulo'")
                            continue
                        if 'descricao' not in data:
                            logging.error(f"Validação falhou para {filename}: Falta 'descricao'")
                            continue
                        if 'perguntas' not in data or not isinstance(data['perguntas'], list):
                            logging.error(f"Validação falhou para {filename}: Falta ou lista de 'perguntas' inválida")
                            continue
                        
                        # Validate questions
                        valid_questions = []
                        for idx, q in enumerate(data['perguntas']):
                            if 'pergunta' not in q or 'solucao' not in q:
                                logging.warning(f"A saltar questão {idx} em {filename}: faltam campos obrigatórios")
                                continue
                            
                            tipo = q.get('tipo', 'escolha_multipla')
                            if tipo == 'escrita':
                                if not isinstance(q['solucao'], str):
                                    logging.warning(f"A saltar questão {idx} em {filename}: tipo 'escrita' requer 'solucao' como string")
                                    continue
                                q['opcoes'] = []
                            elif tipo == 'boolean':
                                sol = q.get('solucao')
                                if isinstance(sol, list):
                                    if len(sol) == 0 or sol[0] not in (0, 1):
                                        logging.warning(f"A saltar questão {idx} em {filename}: tipo 'boolean' requer 'solucao' 0 ou 1")
                                        continue
                                elif sol not in (0, 1):
                                    logging.warning(f"A saltar questão {idx} em {filename}: tipo 'boolean' requer 'solucao' 0 ou 1")
                                    continue
                                q['opcoes'] = []
                            else:
                                if 'opcoes' not in q or not isinstance(q['opcoes'], list) or len(q['opcoes']) == 0:
                                    logging.warning(f"A saltar questão {idx} em {filename}: lista de opções vazia ou inválida")
                                    continue
                                if not isinstance(q['solucao'], list) or len(q['solucao']) == 0:
                                    logging.warning(f"A saltar questão {idx} em {filename}: solução não é lista ou está vazia")
                                    continue
                                
                                # Validate that all items in the solution list are valid option indices
                                invalid_sol = False
                                for s in q['solucao']:
                                    if not isinstance(s, int) or s < 0 or s >= len(q['opcoes']):
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
                        loaded_exams.append({
                            "id": exam_id,
                            "titulo": data["titulo"],
                            "descricao": data["descricao"],
                            "path": f"exames/{cadeira_id}/{filename}",
                            "perguntas_count": len(valid_questions)
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
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server(port=5000):
    # Change working directory to the directory of this script to serve static files correctly
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    
    print("\n" + "=" * 60)
    print(" SIMULADOR DE EXAMES DE SSI PRONTO (MODO ESTÁTICO)!")
    print(" Clique no link abaixo para abrir o simulador localmente:")
    print(f" http://127.0.0.1:{port}")
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
