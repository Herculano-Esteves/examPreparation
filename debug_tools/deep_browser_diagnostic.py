"""
debug_tools/deep_browser_diagnostic.py
--------------------------------------
Inicia o servidor e o browser headless (Brave/Chrome) com DevTools Protocol.
Inspeciona profundamente o DOM, geometria (getBoundingClientRect), estilos computados,
erros de consola, transições de ecrã e renderização de exames e barras laterais.
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
profile_dir = os.path.join(os.environ["TEMP"], "brave_deep_diag_" + str(int(time.time())))

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
    s.settimeout(2.0)
    
    ws_send(s, {"id": 1, "method": "Runtime.enable"})
    ws_send(s, {"id": 2, "method": "Page.enable"})
    ws_send(s, {"id": 3, "method": "Emulation.setDeviceMetricsOverride", "params": {"width": 1920, "height": 1080, "deviceScaleFactor": 1, "mobile": False}})
    ws_send(s, {"id": 4, "method": "Page.navigate", "params": {"url": "http://127.0.0.1:5000/"}})
    
    time.sleep(2)
    
    # Evaluate initial Cadeiras state
    ws_send(s, {
        "id": 10,
        "method": "Runtime.evaluate",
        "params": {
            "expression": """
            (() => {
                const screenCadeiras = document.getElementById('screen-cadeiras');
                const screenMenu = document.getElementById('screen-menu');
                const cadeirasRows = document.querySelectorAll('#cadeiras-grid .exam-list-row');
                return JSON.stringify({
                    stage: 'INITIAL_LOAD',
                    activeScreen: document.querySelector('.screen.active')?.id,
                    cadeirasCount: cadeirasRows.length,
                    screenCadeirasDisplay: screenCadeiras ? window.getComputedStyle(screenCadeiras).display : null,
                    screenMenuDisplay: screenMenu ? window.getComputedStyle(screenMenu).display : null
                });
            })()
            """,
            "returnByValue": True
        }
    })
    
    time.sleep(1)
    
    # Click on first cadeira row to trigger menu
    ws_send(s, {
        "id": 20,
        "method": "Runtime.evaluate",
        "params": {
            "expression": """
            (() => {
                const firstRow = document.querySelector('#cadeiras-grid .exam-list-row');
                if (!firstRow) return JSON.stringify({ error: 'No cadeira row found' });
                firstRow.click();
                return JSON.stringify({ clicked: true, title: firstRow.querySelector('.exam-list-title')?.textContent });
            })()
            """,
            "returnByValue": True
        }
    })
    
    time.sleep(1.5)
    
    # Deep inspect screen-menu geometry, computed styles, sidebars, cards
    ws_send(s, {
        "id": 30,
        "method": "Runtime.evaluate",
        "params": {
            "expression": """
            (() => {
                const screenMenu = document.getElementById('screen-menu');
                const layout = document.querySelector('.exams-screen-layout');
                const leftSidebar = document.getElementById('exams-sidebar-filters');
                const rightSidebar = document.getElementById('exams-sidebar-practice');
                const examsGrid = document.getElementById('exams-grid');
                const examCards = document.querySelectorAll('#exams-grid .exam-list-row');
                
                const getGeom = (el) => {
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const s = window.getComputedStyle(el);
                    return {
                        x: Math.round(r.x),
                        y: Math.round(r.y),
                        width: Math.round(r.width),
                        height: Math.round(r.height),
                        display: s.display,
                        visibility: s.visibility,
                        opacity: s.opacity,
                        zIndex: s.zIndex,
                        position: s.position,
                        float: s.float
                    };
                };

                return JSON.stringify({
                    stage: 'AFTER_CADEIRA_CLICK',
                    activeScreen: document.querySelector('.screen.active')?.id,
                    screenMenuGeom: getGeom(screenMenu),
                    layoutGeom: getGeom(layout),
                    leftSidebarGeom: getGeom(leftSidebar),
                    rightSidebarGeom: getGeom(rightSidebar),
                    examsGridGeom: getGeom(examsGrid),
                    examCardsCount: examCards.length,
                    firstCardTitle: examCards[0]?.querySelector('.exam-list-title')?.textContent,
                    firstCardGeom: getGeom(examCards[0])
                }, null, 2);
            })()
            """,
            "returnByValue": True
        }
    })

    start = time.time()
    while time.time() - start < 5:
        try:
            msg = ws_recv(s)
            if msg:
                m = json.loads(msg)
                mid = m.get("id")
                if mid in [10, 20, 30]:
                    val = m.get("result", {}).get("result", {}).get("value")
                    print(f"=== DIAGNOSTIC STEP {mid} ===")
                    print(val)
                elif m.get("method") == "Runtime.exceptionThrown":
                    print("RUNTIME EXCEPTION:", json.dumps(m, indent=2))
                elif m.get("method") == "Runtime.consoleAPICalled":
                    args = [a.get("value") for a in m.get("params", {}).get("args", [])]
                    print("CONSOLE:", m.get("params", {}).get("type"), args)
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
