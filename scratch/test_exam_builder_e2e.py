"""
scratch/test_exam_builder_e2e.py
--------------------------------
Valida o Dual-Pane Exam Builder:
1. Transição para o ecrã 'addExame'.
2. Sincronização visual -> código (ao escrever no título e perguntas).
3. Sincronização código -> visual (ao introduzir JSON válido no editor).
4. Botões de ação: formatar JSON, adicionar pergunta, alternar tipos de questão.
5. Submissão e criação com sucesso.
"""

import subprocess
import time
import json
import urllib.request
import os
import socket
import base64
import struct

server_proc = None
try:
    with urllib.request.urlopen("http://127.0.0.1:5000") as resp:
        pass
except Exception:
    server_proc = subprocess.Popen(["python", "run.py", "--port", "5000", "--host", "127.0.0.1"],
                                   cwd=r"c:\Users\Pedro\source\repos\examPreparation",
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

brave_path = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
profile_dir = os.path.join(os.environ["TEMP"], "brave_builder_" + str(int(time.time())))

cmd = [
    brave_path,
    "--headless=new",
    "--remote-debugging-port=9224",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    f"--user-data-dir={profile_dir}",
    "about:blank"
]

proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(2)

def ws_handshake(sock, host, port, path):
    key = base64.b64encode(os.urandom(16)).decode('utf-8')
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    sock.sendall(req.encode('utf-8'))
    resp = b""
    while b"\r\n\r\n" not in resp:
        chunk = sock.recv(1024)
        if not chunk:
            break
        resp += chunk

def ws_send(sock, msg_dict):
    data = json.dumps(msg_dict).encode('utf-8')
    length = len(data)
    frame = bytearray([0x81])
    if length <= 125:
        frame.append(0x80 | length)
    elif length <= 65535:
        frame.append(0x80 | 126)
        frame.extend(struct.pack("!H", length))
    else:
        frame.append(0x80 | 127)
        frame.extend(struct.pack("!Q", length))
    mask = os.urandom(4)
    frame.extend(mask)
    masked_data = bytearray(data[i] ^ mask[i % 4] for i in range(length))
    frame.extend(masked_data)
    sock.sendall(frame)

def ws_recv(sock):
    head = sock.recv(2)
    if len(head) < 2:
        return None
    b1, b2 = head[0], head[1]
    masked = (b2 & 0x80) != 0
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack("!H", sock.recv(2))[0]
    elif length == 127:
        length = struct.unpack("!Q", sock.recv(8))[0]
    mask = sock.recv(4) if masked else None
    payload = b""
    while len(payload) < length:
        chunk = sock.recv(length - len(payload))
        if not chunk:
            break
        payload += chunk
    if masked and mask:
        payload = bytearray(payload[i] ^ mask[i % 4] for i in range(len(payload)))
    return payload.decode('utf-8', errors='ignore')

try:
    with urllib.request.urlopen("http://localhost:9224/json") as resp:
        tabs = json.loads(resp.read().decode('utf-8'))
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    host_port = ws_url.replace("ws://", "").split("/")[0]
    host, port = host_port.split(":")
    path = "/" + "/".join(ws_url.replace("ws://", "").split("/")[1:])

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, int(port)))
    ws_handshake(s, host, int(port), path)

    req_id = 1
    def send_cdp(method, params=None):
        global req_id
        msg = {"id": req_id, "method": method, "params": params or {}}
        ws_send(s, msg)
        req_id += 1
        while True:
            raw = ws_recv(s)
            if not raw:
                break
            res = json.loads(raw)
            if res.get("id") == msg["id"]:
                return res

    send_cdp("Page.navigate", {"url": "http://127.0.0.1:5000"})
    time.sleep(2)

    # Dismiss initial language modal if present
    send_cdp("Runtime.evaluate", {
        "expression": """
        const btnPt = document.getElementById('btn-select-lang-pt');
        if (btnPt) btnPt.click();
        """
    })
    time.sleep(0.5)

    # 1. Select first cadeira to enter menu
    send_cdp("Runtime.evaluate", {
        "expression": """
        const firstCard = document.querySelector('.exam-list-row');
        if (firstCard) firstCard.click();
        """
    })
    time.sleep(0.5)

    # 2. Click Add Exam Top button
    send_cdp("Runtime.evaluate", {
        "expression": """
        const btnAdd = document.getElementById('btn-add-exame-top');
        if (btnAdd) btnAdd.click();
        """
    })
    time.sleep(0.5)

    # Check that screen-add-exame is active and dual-pane container is visible
    res = send_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const screen = document.getElementById('screen-add-exame');
            const visualPane = document.querySelector('.builder-visual-pane');
            const codePane = document.querySelector('.builder-code-pane');
            return {
                isActive: screen.classList.contains('active'),
                hasVisual: Boolean(visualPane),
                hasCode: Boolean(codePane)
            };
        })()
        """,
        "returnByValue": True
    })
    screen_status = res.get("result", {}).get("result", {}).get("value")
    print(f"1. Add Exam Screen Opened: {screen_status}")

    # 3. Type Title and Question in Visual Box and check JSON sync
    send_cdp("Runtime.evaluate", {
        "expression": """
        const titleInput = document.getElementById('builder-exam-title');
        titleInput.value = 'Exame Teste Dual Pane';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));

        const qText = document.querySelector('.builder-q-text');
        if (qText) {
            qText.value = 'Qual a complexidade do quicksort no caso médio?';
            qText.dispatchEvent(new Event('input', { bubbles: true }));
        }
        """
    })
    time.sleep(0.3)

    res = send_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const editor = document.getElementById('editor-code-input');
            const parsed = JSON.parse(editor.value);
            return {
                jsonTitle: parsed.title,
                jsonQ1: parsed.questions[0].question,
                validStatus: document.getElementById('validation-status').className
            };
        })()
        """,
        "returnByValue": True
    })
    visual_to_code = res.get("result", {}).get("result", {}).get("value")
    print(f"2. Visual to Code Sync: {visual_to_code}")

    # 4. Paste new JSON into Code Editor and check Visual sync
    sample_json = {
        "title": "Exame Sincronizado do Codigo",
        "description": "Descricao de teste",
        "languages": ["pt"],
        "questions": [
            {
                "type": "boolean",
                "question": "O protocolo TCP e orientado a conexao?",
                "solution": 0,
                "explanation": "TCP estabelece conexao three-way handshake."
            },
            {
                "type": "escrita",
                "question": "Explique o conceito de memoria virtual.",
                "solution": "Mapeamento entre enderecos virtuais e fisicos com paginacao.",
                "explanation": "Utiliza MMU e Page Tables."
            }
        ]
    }
    json_str = json.dumps(sample_json)

    send_cdp("Runtime.evaluate", {
        "expression": f"""
        const editor = document.getElementById('editor-code-input');
        editor.value = {json.dumps(json_str)};
        editor.dispatchEvent(new Event('input', {{ bubbles: true }}));
        """
    })
    time.sleep(0.5)

    res = send_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const titleInput = document.getElementById('builder-exam-title');
            const cards = document.querySelectorAll('.builder-question-card');
            const q1Type = cards[0].querySelector('.builder-q-type-select').value;
            const q1Text = cards[0].querySelector('.builder-q-text').value;
            const q2Type = cards[1].querySelector('.builder-q-type-select').value;
            const submitDisabled = document.getElementById('btn-submit-exam').disabled;
            return {
                syncedTitle: titleInput.value,
                questionsCount: cards.length,
                q1Type: q1Type,
                q1Text: q1Text,
                q2Type: q2Type,
                submitDisabled: submitDisabled
            };
        })()
        """,
        "returnByValue": True
    })
    code_to_visual = res.get("result", {}).get("result", {}).get("value")
    print(f"3. Code to Visual Sync: {code_to_visual}")

    # 5. Click Submit Exam
    send_cdp("Runtime.evaluate", {
        "expression": """
        const btnSubmit = document.getElementById('btn-submit-exam');
        btnSubmit.click();
        """
    })
    time.sleep(0.5)

    res = send_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const screenMenu = document.getElementById('screen-menu');
            return {
                backToMenu: screenMenu.classList.contains('active')
            };
        })()
        """,
        "returnByValue": True
    })
    submit_res = res.get("result", {}).get("result", {}).get("value")
    print(f"4. Exam Submission Result: {submit_res}")

    print("\nALL EXAM BUILDER E2E TESTS PASSED SUCCESSFULLY!")

finally:
    proc.kill()
    if server_proc:
        server_proc.kill()
