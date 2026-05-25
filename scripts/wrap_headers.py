import os
import json

subjects_dir = "/home/peter/Documents/projetos/ProjetoDeExames/examPreparation/exames"

def process_cabecalho(text):
    if not text:
        return text
    
    # If already contains triple backticks, leave it
    if "```" in text:
        return text
        
    lines = text.split('\n')
    
    # Check for ASCII tables / diagrams (e.g. +---)
    if any(line.strip().startswith('+') and '-' in line for line in lines):
        # Find first line starting with '+' and last line starting with '+'
        first_idx = -1
        last_idx = -1
        for idx, line in enumerate(lines):
            if line.strip().startswith('+') and '-' in line:
                if first_idx == -1:
                    first_idx = idx
                last_idx = idx
        
        if first_idx != -1 and last_idx != -1:
            # Wrap the table part in triple backticks
            before = lines[:first_idx]
            table = lines[first_idx:last_idx+1]
            after = lines[last_idx+1:]
            return '\n'.join(before) + '\n```\n' + '\n'.join(table) + '\n```\n' + '\n'.join(after)

    # Check for ls -l or docker run or cat /etc/group command sequences
    # They usually start with a "$ " or contain file listings like drwxr or -rw-r or permission structures
    is_terminal = False
    terminal_start_idx = -1
    for idx, line in enumerate(lines):
        # Detect start of terminal block: line starts with "$ " or "ls -l" or contains docker run
        if line.strip().startswith('$') or "ls -l" in line or "cat /etc" in line or "docker run" in line or line.strip().startswith('drwx') or line.strip().startswith('-rw-') or line.strip().startswith('-rwx') or line.strip().startswith('admin:x:') or line.strip().startswith('asi:x:') or line.strip().startswith('staff:x:') or line.strip().startswith('docker:x:'):
            is_terminal = True
            if terminal_start_idx == -1:
                terminal_start_idx = idx
                
    if is_terminal and terminal_start_idx != -1:
        # Wrap everything from terminal_start_idx to the end in triple backticks
        before = lines[:terminal_start_idx]
        code_block = lines[terminal_start_idx:]
        return '\n'.join(before) + '\n```\n' + '\n'.join(code_block) + '\n```'

    # Check for Alfabeto Limpo / Alfabeto Cifrado
    if any("Alfabeto Limpo:" in line or "Alfabeto Cifrado:" in line for line in lines):
        # Wrap the whole thing in triple backticks
        return "```\n" + text + "\n```"
        
    return text

def process_file(filepath):
    print(f"Processing: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    modified = False
    for q in data.get("perguntas", []):
        if "cabecalho" in q:
            original = q["cabecalho"]
            processed = process_cabecalho(original)
            if processed != original:
                q["cabecalho"] = processed
                modified = True
                
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  -> Updated {filepath}")
    else:
        print(f"  -> No changes needed")

# Traverse subjects
for subject in ['adi', 'ssi', 'tso']:
    subdir = os.path.join(subjects_dir, subject)
    if not os.path.exists(subdir):
        continue
    for filename in os.listdir(subdir):
        if filename.endswith('.json') and filename != 'index.json' and filename != 'cadeira.json':
            process_file(os.path.join(subdir, filename))
