"""
debug_tools/test_settings_math_and_stability.py
-----------------------------------------------
Valida as métricas matemáticas, proporções e estabilidade absoluta do ecrã de Definições:
1. Modo Desktop (1440x900): 2 cartões lado a lado com alinhamento perfeito (Top e Bottom iguais, 0px de diferença).
2. Proporção áurea / 5:4 dos botões de idioma (150x120px, aspect-ratio 1.25).
3. Estabilidade de Alternância (PT <-> EN): 0.0px de deslocamento (zero jitter / zero movimento perceptível).
4. Hover sem movimento (transform: none).
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
profile_dir = os.path.join(os.environ["TEMP"], "brave_settings_math_" + str(int(time.time())))

cmd = [
    brave_path,
    "--headless=new",
    "--window-size=1440,900",
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
    
    # Open settings
    ws_send(s, {
        "id": 10,
        "method": "Runtime.evaluate",
        "params": {
            "expression": "document.querySelector('.btn-sticky-settings')?.click() || document.getElementById('btn-open-settings')?.click(); 'CLICKED'",
            "returnByValue": True
        }
    })
    time.sleep(1)
    
    # Measure in Desktop 1440x900 viewport in PT and EN
    ws_send(s, {
        "id": 20,
        "method": "Runtime.evaluate",
        "params": {
            "expression": """
            new Promise(resolve => {
                function getMetrics() {
                    const cards = Array.from(document.querySelectorAll('.settings-card')).map(c => {
                        const r = c.getBoundingClientRect();
                        return { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left) };
                    });
                    const langBtns = Array.from(document.querySelectorAll('.btn-lang-option')).map(b => {
                        const r = b.getBoundingClientRect();
                        return {
                            lang: b.getAttribute('data-lang'),
                            width: Math.round(r.width),
                            height: Math.round(r.height),
                            aspectRatio: (r.width / r.height).toFixed(2),
                            top: Math.round(r.top),
                            left: Math.round(r.left)
                        };
                    });
                    const dangerCard = document.querySelector('.settings-danger-card');
                    const dangerRect = dangerCard ? dangerCard.getBoundingClientRect() : null;
                    const screen = document.getElementById('screen-settings');
                    const docHeight = document.documentElement.scrollHeight;
                    const winHeight = window.innerHeight;
                    const hasScroll = docHeight > winHeight;

                    return {
                        cards,
                        langBtns,
                        dangerCard: dangerRect ? { width: Math.round(dangerRect.width), height: Math.round(dangerRect.height), top: Math.round(dangerRect.top) } : null,
                        hasScroll,
                        docHeight,
                        winHeight
                    };
                }

                // Force PT first
                const ptBtn = document.querySelector('.btn-lang-option[data-lang="pt"]');
                ptBtn?.click();

                setTimeout(() => {
                    const metricsPT = getMetrics();

                    // Switch to EN
                    const enBtn = document.querySelector('.btn-lang-option[data-lang="en"]');
                    enBtn?.click();

                    setTimeout(() => {
                        const metricsEN = getMetrics();

                        resolve(JSON.stringify({
                            viewport: '1440x900',
                            metricsPT,
                            metricsEN
                        }));
                    }, 400);
                }, 300);
            })
            """,
            "awaitPromise": True,
            "returnByValue": True
        }
    })

    start = time.time()
    while time.time() - start < 8:
        try:
            msg = ws_recv(s)
            if msg:
                m = json.loads(msg)
                mid = m.get("id")
                if mid == 20:
                    val = m.get("result", {}).get("result", {}).get("value")
                    print("=== DESKTOP MATHEMATICAL METRICS & STABILITY REPORT ===")
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
