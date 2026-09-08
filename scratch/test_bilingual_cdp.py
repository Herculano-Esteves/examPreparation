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
profile_dir = os.path.join(os.environ["TEMP"], "brave_bilingual_" + str(int(time.time())))

cmd = [
    brave_path,
    "--headless=new",
    "--remote-debugging-port=9225",
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

def send_ws_json(sock, data):
    payload = json.dumps(data).encode('utf-8')
    length = len(payload)
    frame = bytearray([0x81])
    if length <= 125:
        frame.append(0x80 | length)
    elif length <= 65535:
        frame.append(0x80 | 126)
        frame.extend(struct.pack('>H', length))
    else:
        frame.append(0x80 | 127)
        frame.extend(struct.pack('>Q', length))
    mask = os.urandom(4)
    frame.extend(mask)
    masked = bytearray(length)
    for i in range(length):
        masked[i] = payload[i] ^ mask[i % 4]
    frame.extend(masked)
    sock.sendall(frame)

def recv_ws_json(sock):
    head = sock.recv(2)
    if not head:
        return None
    length = head[1] & 0x7F
    if length == 126:
        ext = sock.recv(2)
        length = struct.unpack('>H', ext)[0]
    elif length == 127:
        ext = sock.recv(8)
        length = struct.unpack('>Q', ext)[0]
    payload = bytearray()
    while len(payload) < length:
        chunk = sock.recv(min(4096, length - len(payload)))
        if not chunk:
            break
        payload.extend(chunk)
    return json.loads(payload.decode('utf-8'))

try:
    tabs = json.loads(urllib.request.urlopen("http://127.0.0.1:9225/json").read())
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    parts = ws_url.replace("ws://", "").split("/")
    host_port = parts[0].split(":")
    path = "/" + "/".join(parts[1:])

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host_port[0], int(host_port[1])))
    ws_handshake(s, host_port[0], host_port[1], path)

    msg_id = 1
    def call_cdp(method, params=None):
        global msg_id
        msg = {"id": msg_id, "method": method, "params": params or {}}
        msg_id += 1
        send_ws_json(s, msg)
        while True:
            res = recv_ws_json(s)
            if res and res.get("id") == msg["id"]:
                return res

    call_cdp("Emulation.setDeviceMetricsOverride", {
        "width": 1440,
        "height": 900,
        "deviceScaleFactor": 1,
        "mobile": False
    })

    call_cdp("Page.navigate", {"url": "http://127.0.0.1:5000"})
    time.sleep(2)

    # Dismiss language modal
    call_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const btn = document.getElementById('btn-select-lang-pt');
            if (btn) btn.click();
        })()
        """
    })
    time.sleep(1)

    # Click on first cadeira
    call_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const card = document.querySelector('.cadeira-card');
            if (card) card.click();
        })()
        """
    })
    time.sleep(0.5)

    # Click "+ Adicionar Exame" button
    call_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const btn = document.getElementById('btn-add-exame-top');
            if (btn) btn.click();
        })()
        """
    })
    time.sleep(1)

    # Switch language to bilingual
    res = call_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const select = document.getElementById('builder-exam-lang');
            select.value = 'pt,en';
            select.dispatchEvent(new Event('change'));
            
            // Fill title & description
            const titlePt = document.getElementById('builder-exam-title');
            const titleEn = document.getElementById('builder-exam-title-en');
            if (titlePt) titlePt.value = 'Exame Bilingue 2024';
            if (titleEn) titleEn.value = 'Bilingual Exam 2024';
            if (titlePt) titlePt.dispatchEvent(new Event('input'));
            
            const descPt = document.getElementById('builder-exam-desc');
            const descEn = document.getElementById('builder-exam-desc-en');
            if (descPt) descPt.value = 'Exame com questões em Português e Inglês';
            if (descEn) descEn.value = 'Exam with questions in Portuguese and English';
            if (descPt) descPt.dispatchEvent(new Event('input'));

            // Fill question 1
            const qPt = document.querySelector('.builder-q-text-pt');
            const qEn = document.querySelector('.builder-q-text-en');
            if (qPt) qPt.value = 'Qual é a complexidade do algoritmo?';
            if (qEn) qEn.value = 'What is the algorithm complexity?';
            if (qPt) qPt.dispatchEvent(new Event('input'));

            // Fill options
            const optPt = document.querySelectorAll('.builder-opt-input-pt');
            const optEn = document.querySelectorAll('.builder-opt-input-en');
            if (optPt[0]) optPt[0].value = 'O(1) Constante';
            if (optEn[0]) optEn[0].value = 'O(1) Constant';
            if (optPt[1]) optPt[1].value = 'O(n) Linear';
            if (optEn[1]) optEn[1].value = 'O(n) Linear';
            if (optPt[0]) optPt[0].dispatchEvent(new Event('input'));

            // Explanation
            const explPt = document.querySelector('.builder-q-expl-pt');
            const explEn = document.querySelector('.builder-q-expl-en');
            if (explPt) explPt.value = 'Acesso direto por índice é O(1).';
            if (explEn) explEn.value = 'Direct index access is O(1).';
            if (explPt) explPt.dispatchEvent(new Event('input'));

            return {
                json: document.getElementById('editor-code-input').value,
                status: document.getElementById('validation-status').innerText
            };
        })()
        """,
        "returnByValue": True
    })

    eval_val = res.get("result", {}).get("result", {}).get("value", {})
    print("STATUS:", eval_val.get("status"))
    print("JSON OUTPUT:")
    print(eval_val.get("json"))

    # Reset scroll body to 0 for metadata overview
    call_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const body = document.querySelector('.builder-visual-body');
            if (body) body.scrollTop = 0;
        })()
        """
    })
    time.sleep(0.5)

    # Capture screenshot
    screenshot_res = call_cdp("Page.captureScreenshot", {"format": "png"})
    img_data = base64.b64decode(screenshot_res["result"]["data"])
    screenshot_path = r"c:\Users\Pedro\.gemini\antigravity-ide\brain\55df47b7-2f59-4d54-8df6-417779e0f26d\scratch\builder_reordered_fields.png"
    with open(screenshot_path, "wb") as f:
        f.write(img_data)
    print("Screenshot saved to", screenshot_path)

    s.close()
finally:
    proc.terminate()
    if server_proc:
        server_proc.terminate()
