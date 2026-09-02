"""
debug_tools/test_responsive_viewports.py
----------------------------------------
Testa a renderização do layout de exames e das duas barras laterais em diferentes resoluções:
1920x1080, 1600x900, 1440x900, 1366x768, 1280x800, 1024x768, 768x1024, 375x667.
Verifica se há sobreposição (overlap), corte (clipping) ou quebra de layout.
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
profile_dir = os.path.join(os.environ["TEMP"], "brave_resp_test_" + str(int(time.time())))

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

viewports = [
    (1920, 1080),
    (1680, 1050),
    (1600, 900),
    (1440, 900),
    (1366, 768),
    (1280, 800),
    (1024, 768),
    (768, 1024),
    (375, 667)
]

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
    ws_send(s, {"id": 3, "method": "Page.navigate", "params": {"url": "http://127.0.0.1:5000/"}})
    time.sleep(2)
    
    # Click first cadeira
    ws_send(s, {
        "id": 4,
        "method": "Runtime.evaluate",
        "params": {
            "expression": "document.querySelector('#cadeiras-grid .exam-list-row')?.click(); 'CLICKED'",
            "returnByValue": True
        }
    })
    time.sleep(1)
    
    msg_id = 100
    for w, h in viewports:
        msg_id += 1
        ws_send(s, {
            "id": msg_id,
            "method": "Emulation.setDeviceMetricsOverride",
            "params": {"width": w, "height": h, "deviceScaleFactor": 1, "mobile": (w < 768)}
        })
        time.sleep(0.3)
        
        msg_id += 1
        check_expr = f"""
        (() => {{
            const left = document.getElementById('exams-sidebar-filters')?.getBoundingClientRect();
            const right = document.getElementById('exams-sidebar-practice')?.getBoundingClientRect();
            const grid = document.getElementById('exams-grid')?.getBoundingClientRect();
            const hasHScroll = document.documentElement.scrollWidth > window.innerWidth;
            
            return JSON.stringify({{
                viewport: '{w}x{h}',
                leftX: Math.round(left?.x || 0),
                leftW: Math.round(left?.width || 0),
                rightX: Math.round(right?.x || 0),
                rightW: Math.round(right?.width || 0),
                gridX: Math.round(grid?.x || 0),
                gridW: Math.round(grid?.width || 0),
                hasHScroll: hasHScroll
            }});
        }})()
        """
        ws_send(s, {
            "id": msg_id,
            "method": "Runtime.evaluate",
            "params": {"expression": check_expr, "returnByValue": True}
        })
    
    start = time.time()
    while time.time() - start < 6:
        try:
            msg = ws_recv(s)
            if msg:
                m = json.loads(msg)
                mid = m.get("id")
                if mid and mid > 100 and mid % 2 == 0:
                    val = m.get("result", {}).get("result", {}).get("value")
                    if val:
                        d = json.loads(val)
                        print(f"[{d['viewport']:<10}] Left: x={d['leftX']}, w={d['leftW']} | Grid: x={d['gridX']}, w={d['gridW']} | Right: x={d['rightX']}, w={d['rightW']} | H-Scroll: {d['hasHScroll']}")
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
