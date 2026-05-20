import os
import json
import logging
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

EXAMS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exames')
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exames', 'index.json')

def build_exams_json():
    """Scans, validates and merges all exam metadata into exames/index.json."""
    loaded_exams = []
    
    if not os.path.exists(EXAMS_DIR):
        logging.error(f"Diretório de exames não encontrado em {EXAMS_DIR}")
        return False

    logging.info(f"A compilar metadados de exames em {EXAMS_DIR}...")
    
    import re
    def natural_sort_key(s):
        match = re.match(r'^(\d+)', s)
        return (0, int(match.group(1)), s) if match else (1, 0, s)

    for filename in sorted(os.listdir(EXAMS_DIR), key=natural_sort_key):
        # Ignorar o próprio index.json que estamos a criar nesta pasta
        if filename.endswith('.json') and filename != 'index.json':
            file_path = os.path.join(EXAMS_DIR, filename)
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
                        if 'pergunta' not in q or 'opcoes' not in q or 'solucao' not in q:
                            logging.warning(f"A saltar questão {idx} em {filename}: faltam campos obrigatórios")
                            continue
                        if not isinstance(q['opcoes'], list) or len(q['opcoes']) == 0:
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
                        "path": f"exames/{filename}",
                        "perguntas_count": len(valid_questions)
                    })
                    logging.info(f"Sucesso ao ler: '{data['titulo']}' com {len(valid_questions)} questões.")
            except Exception as e:
                logging.exception(f"Erro ao processar ficheiro {filename}: {e}")

    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(loaded_exams, f, ensure_ascii=False, indent=2)
        logging.info(f"Index de exames gerado com sucesso: {OUTPUT_FILE} ({len(loaded_exams)} exames)")
        return True
    except Exception as e:
        logging.error(f"Erro ao gravar {OUTPUT_FILE}: {e}")
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
            logging.info("Compilação concluída. Modo '--build-only' ativo. A terminar.")
        else:
            run_server()
    else:
        logging.error("Falha ao compilar exames. O servidor não foi iniciado.")
