"""
debug_tools/test_settings_screen_redesign.py
--------------------------------------------
Testa o novo ecrã de Definições:
1. Abertura do ecrã de definições a partir do menu.
2. Verificação do layout compacto em grelha de 2 cartões e altura sem scroll.
3. Teste dos botões de seleção de idioma dentro do novo layout.
4. Teste do botão 'Voltar' que regressa ao ecrã anterior.
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
profile_dir = os.path.join(os.environ["TEMP"], "brave_settings_redesign_" + str(int(time.time())))

cmd = [
    brave_path,
    "--headless=new",
    "--remote-debugging-port=9222",
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
        payload = bytes(payload[i] ^ mask[i % 4] for i in range(len(payload)))
    return payload.decode('utf-8', errors='ignore')

try:
    with urllib.request.urlopen("http://127.0.0.1:9222/json") as resp:
        tabs = json.loads(resp.read().decode('utf-8'))
    
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    path = ws_url.replace("ws://127.0.0.1:9222", "")
    
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("127.0.0.1", 9222))
    ws_handshake(s, "127.0.0.1", 9222, path)
    s.settimeout(3.0)
    
    ws_send(s, {"id": 1, "method": "Runtime.enable"})
    ws_send(s, {"id": 2, "method": "Page.enable"})
    ws_send(s, {"id": 3, "method": "Page.navigate", "params": {"url": "http://127.0.0.1:5000/"}})
    time.sleep(2)
    
    # Click Settings icon on top bar
    ws_send(s, {
        "id": 10,
        "method": "Runtime.evaluate",
        "params": {
            "expression": "document.querySelector('.btn-sticky-settings')?.click() || document.getElementById('btn-open-settings')?.click(); 'CLICKED'",
            "returnByValue": True
        }
    })
    time.sleep(1)
    
    # Step 1: Inspect Settings Screen layout, dimensions and elements
    ws_send(s, {
        "id": 20,
        "method": "Runtime.evaluate",
        "params": {
            "expression": """
            (() => {
                const screen = document.getElementById('screen-settings');
                const isVisible = screen && !screen.classList.contains('hidden') && getComputedStyle(screen).display !== 'none';
                const layout = screen?.querySelector('.settings-layout');
                const cardsCount = screen?.querySelectorAll('.settings-card').length;
                const rect = screen?.getBoundingClientRect();
                const backBtnInHeader = screen?.querySelector('.settings-header-bar #btn-back-settings') !== null;
                const langBtns = screen?.querySelectorAll('.btn-lang-option').length;

                return JSON.stringify({
                    stage: 'SETTINGS_SCREEN_INSPECTION',
                    isVisible,
                    cardsCount,
                    screenHeight: rect ? Math.round(rect.height) : 0,
                    backBtnInHeader,
                    langBtnsCount: langBtns
                });
            })()
            """,
            "returnByValue": True
        }
    })
    time.sleep(0.5)

    # Step 2: Click 'Voltar' and verify it transitions smoothly back to cadeiras
    ws_send(s, {
        "id": 30,
        "method": "Runtime.evaluate",
        "params": {
            "expression": """
            new Promise(resolve => {
                const backBtn = document.getElementById('btn-back-settings');
                backBtn?.click();

                setTimeout(() => {
                    const cadeirasScreen = document.getElementById('screen-cadeiras');
                    const isCadeirasVisible = cadeirasScreen && !cadeirasScreen.classList.contains('hidden') && getComputedStyle(cadeirasScreen).display !== 'none';

                    resolve(JSON.stringify({
                        stage: 'AFTER_CLICK_BACK',
                        isCadeirasVisible
                    }));
                }, 300);
            })
            """,
            "awaitPromise": True,
            "returnByValue": True
        }
    })

    start = time.time()
    while time.time() - start < 6:
        try:
            msg = ws_recv(s)
            if msg:
                m = json.loads(msg)
                mid = m.get("id")
                if mid in [20, 30]:
                    val = m.get("result", {}).get("result", {}).get("value")
                    print(f"=== RESULT STEP {mid} ===")
                    print(val)
        except socket.timeout:
            break
finally:
    try:
        proc.terminate()
    except Exception:
        pass
    if server_proc:
        try:
            server_proc.terminate()
        except Exception:
            pass
